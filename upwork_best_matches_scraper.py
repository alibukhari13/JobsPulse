# upwork_best_matches_scraper.py
import setuptools
import os
import sys
import time
import re
import random
import logging
from datetime import datetime
from supabase import create_client
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

# --- SUPABASE CONFIG ---
SUPABASE_URL = "https://mktrthxggufposxyubuh.supabase.co"
SUPABASE_KEY = "sb_publishable_hlO_nQq2lkuXACKh9awggg_7X0opSBf"

# SUPABASE_URL = "https://zpgcldllammzlxkktpfv.supabase.co"
# SUPABASE_KEY = "sb_publishable_GT0CtQWcAdRGNfGGPd5GVg_zubsqSyy"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- LOGGING SETUP ---
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
formatter = logging.Formatter('[%(levelname)s] %(asctime)s: %(message)s')
ch = logging.StreamHandler()
ch.setFormatter(formatter)
logger.addHandler(ch)

def bypass_captcha(driver):
    """Cloudflare 'Verify you are human' checkbox ko auto-click karna"""
    try:
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        for frame in iframes:
            src = frame.get_attribute("src")
            if src and ("cloudflare" in src or "turnstile" in src):
                logger.warning("Captcha detected! Attempting auto-bypass...")
                driver.switch_to.frame(frame)
                time.sleep(2)
                checkbox = driver.find_element(By.CSS_SELECTOR, "input[type='checkbox'], #challenge-stage")
                ActionChains(driver).move_to_element(checkbox).pause(1).click().perform()
                driver.switch_to.default_content()
                time.sleep(3)
                return True
    except:
        driver.switch_to.default_content()
    return False

def perform_upwork_login(driver, email, password):
    """Fully Automated Stealth Login with 'Keep me logged in'"""
    try:
        wait = WebDriverWait(driver, 30)
        driver.get('https://www.upwork.com/ab/account-security/login')
        time.sleep(5)
        bypass_captcha(driver)

        # 1. Email
        email_field = wait.until(EC.element_to_be_clickable((By.ID, "login_username")))
        for char in email:
            email_field.send_keys(char)
            time.sleep(random.uniform(0.05, 0.15))
        email_field.send_keys(Keys.ENTER)
        
        # 2. Password
        time.sleep(6)
        bypass_captcha(driver)
        password_field = wait.until(EC.element_to_be_clickable((By.ID, "login_password")))
        for char in password:
            password_field.send_keys(char)
            time.sleep(random.uniform(0.05, 0.15))
        
        # Keep me logged in logic
        driver.execute_script("let cb = document.querySelector('input#login_remember'); if (cb && !cb.checked) cb.click();")
        password_field.send_keys(Keys.ENTER)
        
        logger.info("Login credentials submitted.")
        time.sleep(12)
    except Exception as e:
        logger.error(f"Auto-login failed: {e}")

def scrape_cycle():
    driver = None
    try:
        # 1. Fetch Dynamic Settings & Auth from Cloud
        auth_res = supabase.table('upwork_auth').select('*').eq('id', 1).execute()
        settings_res = supabase.table('settings').select('*').eq('id', 1).execute()
        
        if not auth_res.data:
            logger.warning("STOPPED: No account connected in Dashboard.")
            return

        creds = auth_res.data[0]
        batch_limit = settings_res.data[0]['batch_limit'] if settings_res.data else 3
        batch_limit = min(10, max(1, batch_limit))

        logger.info(f'--- STARTING CYCLE (Batches: {batch_limit}) ---')
        options = uc.ChromeOptions()
        options.add_argument('--start-maximized')
        profile_path = os.path.abspath("automation_profile")
        options.add_argument(f'--user-data-dir={profile_path}')
        
        driver = uc.Chrome(options=options, version_main=146)

        if driver:
            driver.get('https://www.upwork.com/nx/find-work/')
            time.sleep(8)
            bypass_captcha(driver)
            
            if "login" in driver.current_url:
                perform_upwork_login(driver, creds['email'], creds['password'])

            # 3. Hard Reload with Cache Buster
            timestamp = int(time.time())
            driver.get(f'https://www.upwork.com/nx/find-work/?t={timestamp}')
            logger.info("Page opening... Waiting 35 seconds.")
            time.sleep(35) 

            try:
                feed_tab = driver.find_element(By.XPATH, "//button[contains(., 'My Feed')]")
                driver.execute_script("arguments[0].click();", feed_tab)
                logger.info("My Feed Tab clicked.")
                
                time.sleep(1) 
                logger.info("Performing hard reload 1s before scraping...")
                driver.get(driver.current_url) 
                time.sleep(15) 
            except: pass

            load_count = 1
            all_cycle_jobs = [] 
            seen_urls = set()

            while load_count <= batch_limit:
                logger.info(f"--- Scraping Batch {load_count}/{batch_limit} ---")
                for _ in range(10):
                    driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.PAGE_DOWN)
                    time.sleep(1.2)

                sniffer_js = """
                function sniff() {
                    let results = [];
                    let links = document.querySelectorAll('a[href*="/jobs/"], a[href*="/details/"]');
                    links.forEach(l => {
                        let art = l.closest('article') || l.closest('section') || l.parentElement.parentElement.parentElement;
                        if (art && art.innerText.length > 100) {
                            let fullText = art.innerText;
                            
                            // ROBUST VERIFIED DETECTION
                            let verified = "Unverified";
                            let vBadge = art.querySelector('[data-test="payment-verified"]');
                            let vIcon = art.querySelector('.air3-icon-verified');
                            let vSvg = art.querySelector('svg title')?.innerHTML?.toLowerCase()?.includes('verified');
                            if (vBadge || vIcon || vSvg || fullText.includes("Payment verified")) {
                                verified = "Verified";
                            }

                            let skillElements = art.querySelectorAll('[data-test="skill"], .air3-token, .job-tile-skills .up-skill-badge');
                            let tags = Array.from(skillElements).map(s => s.innerText.trim()).filter(s => s.length > 0).join(', ');
                            let location = art.querySelector('[data-test="client-country"], .job-tile-location')?.innerText || "Unknown";
                            let spent = art.querySelector('[data-test="client-spendings"]')?.innerText || "$0 spent";
                            
                            let budgetType = art.querySelector('[data-test="job-type"]')?.innerText || "";
                            let budgetVal = art.querySelector('[data-test="budget"], [data-test="hourly-rate"]')?.innerText || "";
                            let finalBudget = budgetType + (budgetVal ? ": " + budgetVal : "");

                            let duration = art.querySelector('[data-test="duration"]')?.innerText || "";
                            let hours = art.querySelector('[data-test="hours-per-week"]')?.innerText || "";
                            let finalDuration = duration + (hours ? ", " + hours : "");

                            let expLevel = fullText.includes("Expert") ? "Expert" : fullText.includes("Intermediate") ? "Intermediate" : "Entry Level";
                            let proposals = art.querySelector('[data-test="proposals"]')?.innerText || "N/A";
                            let timeElement = art.querySelector('[data-test="posted-on"]') || Array.from(art.querySelectorAll('span, small')).find(s => s.innerText.toLowerCase().includes('posted'));
                            
                            results.push({
                                url: l.href.split('?')[0],
                                title: l.innerText.trim(),
                                text: art.querySelector('[data-test="job-description-text"]')?.innerText || fullText,
                                location: location, spent: spent, verified: verified, budget: finalBudget || "N/A",
                                experience: expLevel, duration: finalDuration || "N/A", proposals: proposals,
                                tags: tags || "Web Development", exact_time: timeElement ? timeElement.innerText.replace('Posted', '').trim() : "Recently"
                            });
                        }
                    });
                    return results;
                }
                return sniff();
                """
                raw_data = driver.execute_script(sniffer_js)
                
                if raw_data:
                    for item in raw_data:
                        if item['url'] not in seen_urls:
                            all_cycle_jobs.append(item); seen_urls.add(item['url'])

                if load_count < batch_limit:
                    try:
                        more_btn = driver.execute_script("return Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('More') || b.innerText.includes('Learn'))")
                        if more_btn:
                            driver.execute_script("arguments[0].click();", more_btn)
                            load_count += 1; time.sleep(8)
                        else: break
                    except: break
                else: break
                
            new_saved = 0
            for item in reversed(all_cycle_jobs):
                job_id = item['url'].split('~')[-1].strip('/')
                if any(k in (item['title'] + item['text']).lower() for k in ['web', 'dev', 'html', 'js', 'react', 'api', 'node', 'php', 'laravel', 'shopify', 'wordpress', 'figma']):
                    try:
                        exists = supabase.table('jobs').select('id').eq('job_id', job_id).execute()
                        if not exists.data:
                            logger.info(f"CLOUD SAVING: {item['title'][:35]} | {item['verified']}")
                            supabase.table('jobs').insert({
                                "job_id": job_id, "job_url": item['url'], "job_title": item['title'],
                                "posted_date": item['exact_time'], "job_description": item['text'],
                                "job_tags": item['tags'], "job_proposals": item['proposals'],
                                "client_location": item['location'], "client_spent": item['spent'],
                                "is_verified": item['verified'], "budget": item['budget'], 
                                "experience_level": item['experience'], "project_duration": item['duration']
                            }).execute()
                            new_saved += 1
                    except: pass

            logger.info(f"Cycle Done. New Jobs: {new_saved}")
            driver.quit()
    except Exception as e:
        logger.error(f"Global Error: {e}")
        if driver: driver.quit()

if __name__ == '__main__':
    while True:
        scrape_cycle()
        logger.info("Waiting 20s for next fresh reload...")
        time.sleep(20)