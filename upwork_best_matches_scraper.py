import os
import time
import random
import logging
import threading
from supabase import create_client
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

try:
    from webdriver_manager.chrome import ChromeDriverManager
    USE_WEBDRIVER_MANAGER = True
except ImportError:
    USE_WEBDRIVER_MANAGER = False

# --- SUPABASE CONFIG ---
SUPABASE_URL = "https://mktrthxggufposxyubuh.supabase.co"
SUPABASE_KEY = "sb_publishable_hlO_nQq2lkuXACKh9awggg_7X0opSBf"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- LOGGING SETUP ---
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
formatter = logging.Formatter('[%(levelname)s] %(asctime)s: %(message)s')
ch = logging.StreamHandler()
ch.setFormatter(formatter)
logger.addHandler(ch)

active_threads = {}

def supabase_execute_with_retry(query_func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return query_func()
        except Exception as e:
            if "Temporary failure" in str(e) or "ConnectError" in str(e):
                logger.warning(f"Supabase network error, retry {attempt+1}/{max_retries}")
                time.sleep(5)
                continue
            raise
    raise Exception("Supabase query failed after retries")

def bypass_cloudflare(driver, timeout=30):
    try:
        time.sleep(3)
        page_text = driver.page_source.lower()
        if "verify you are human" not in page_text and "cloudflare" not in page_text:
            return True

        logger.info("Cloudflare challenge detected. Attempting to solve...")
        start_time = time.time()

        try:
            iframes = driver.find_elements(By.TAG_NAME, "iframe")
            for frame in iframes:
                src = frame.get_attribute("src") or ""
                if "turnstile" in src or "challenge" in src or "cloudflare" in src:
                    driver.switch_to.frame(frame)
                    checkbox = WebDriverWait(driver, 10).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, "div[role='checkbox'], input[type='checkbox']"))
                    )
                    ActionChains(driver).move_to_element(checkbox).click().perform()
                    driver.switch_to.default_content()
                    logger.info("Clicked Cloudflare checkbox inside iframe.")
                    time.sleep(5)
                    break
        except Exception as e:
            logger.warning(f"Iframe checkbox click failed: {e}")
            driver.switch_to.default_content()

        while time.time() - start_time < timeout:
            if "verify you are human" not in driver.page_source.lower():
                logger.info("Cloudflare challenge solved.")
                return True
            time.sleep(1)

        logger.warning("Cloudflare challenge timed out.")
        return False
    except Exception as e:
        logger.error(f"Cloudflare error: {e}")
        return False

def perform_upwork_login(driver, email, password):
    try:
        wait = WebDriverWait(driver, 30)
        driver.get('https://www.upwork.com/ab/account-security/login')
        time.sleep(5)

        if not bypass_cloudflare(driver):
            driver.refresh()
            time.sleep(5)
            bypass_cloudflare(driver)

        email_field = wait.until(EC.element_to_be_clickable((By.ID, "login_username")))
        email_field.clear()
        for char in email:
            email_field.send_keys(char)
            time.sleep(random.uniform(0.05, 0.1))
        email_field.send_keys(Keys.ENTER)
        logger.info(f"[{email}] Email submitted.")
        time.sleep(5)

        bypass_cloudflare(driver)

        password_field = wait.until(EC.element_to_be_clickable((By.ID, "login_password")))
        password_field.clear()
        for char in password:
            password_field.send_keys(char)
            time.sleep(random.uniform(0.05, 0.1))

        try:
            driver.find_element(By.ID, "login_remember").click()
        except:
            pass

        password_field.send_keys(Keys.ENTER)
        logger.info(f"[{email}] Login submitted.")
        time.sleep(12)
        return True
    except Exception as e:
        logger.error(f"[{email}] Login failed: {repr(e)}")
        return False

def create_driver(profile_path, email):
    options = Options()
    options.add_argument('--start-maximized')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    options.add_argument(f'--user-data-dir={profile_path}')
    options.add_argument('--lang=en-US')

    if USE_WEBDRIVER_MANAGER:
        service = Service(ChromeDriverManager().install())
    else:
        service = Service()
    driver = webdriver.Chrome(service=service, options=options)
    driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
    return driver

def ensure_settings_exist(user_id, email):
    try:
        existing = supabase_execute_with_retry(
            lambda: supabase.table('settings').select('user_id').eq('user_id', user_id).execute()
        )
        if not existing.data:
            supabase_execute_with_retry(
                lambda: supabase.table('settings').insert({
                    'user_id': user_id, 'expiry_minutes': 360, 'batch_limit': 3, 'force_scrape': False
                }).execute()
            )
    except:
        pass

def scrape_for_user_continuous(user_id, email, password):
    delay = random.uniform(5, 15)
    logger.info(f"[{email}] Waiting {delay:.1f}s before first cycle...")
    time.sleep(delay)

    while True:
        driver = None
        try:
            settings_res = supabase_execute_with_retry(
                lambda: supabase.table('settings').select('batch_limit, force_scrape').eq('user_id', user_id).execute()
            )
            batch_limit = settings_res.data[0].get('batch_limit', 3) if settings_res.data else 3
            force_scrape = settings_res.data[0].get('force_scrape', False) if settings_res.data else False

            if not force_scrape:
                logger.info(f"[{email}] Normal cycle. Waiting 30s...")
                time.sleep(30)

            logger.info(f"[{email}] Starting cycle (Batches: {batch_limit})")
            profile_path = os.path.abspath(f"automation_profile_{user_id[:8]}")
            os.makedirs(profile_path, exist_ok=True)
            driver = create_driver(profile_path, email)

            driver.get('https://www.upwork.com/nx/find-work/')
            time.sleep(8)
            bypass_cloudflare(driver)

            if "login" in driver.current_url:
                if not perform_upwork_login(driver, email, password):
                    driver.quit()
                    time.sleep(60)
                    continue

            driver.get(f'https://www.upwork.com/nx/find-work/?t={int(time.time())}')
            time.sleep(15)
            bypass_cloudflare(driver)

            try:
                feed_btn = WebDriverWait(driver, 15).until(
                    EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'My Feed') or contains(., 'Most Recent')]"))
                )
                driver.execute_script("arguments[0].click();", feed_btn)
                logger.info(f"[{email}] Feed tab clicked.")
                time.sleep(10)
            except:
                pass

            load_count = 1
            all_cycle_jobs = []
            seen_urls = set()

            while load_count <= batch_limit:
                logger.info(f"[{email}] Batch {load_count}/{batch_limit}")
                for _ in range(10):
                    driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.PAGE_DOWN)
                    time.sleep(0.8)

                sniffer_js = r"""
                function sniff() {
                    let results = [];
                    let jobLinks = document.querySelectorAll('a[href*="/jobs/"], a[href*="/details/"]');
                    
                    jobLinks.forEach(link => {
                        let card = link.closest('article') || link.closest('section') || link.parentElement.parentElement.parentElement;
                        if (!card || card.innerText.length < 150) return;
                        
                        let url = link.href.split('?')[0];
                        let title = link.innerText.trim();
                        if (!title || title.length < 5) return;

                        let fullText = card.innerText;
                        
                        let budget = "N/A";
                        let budgetMatch = fullText.match(/(\$\d+(?:,\d+)?(?:\.\d+)?)/);
                        if (budgetMatch) budget = budgetMatch[0];
                        if (fullText.includes("Hourly")) budget = "Hourly" + (budget !== "N/A" ? ": " + budget : "");
                        else if (fullText.includes("Fixed-price")) budget = "Fixed" + (budget !== "N/A" ? ": " + budget : "");

                        let verified = fullText.includes("Payment verified") ? "Verified" : "Unverified";
                        
                        let location = "Unknown";
                        let locMatch = fullText.match(/(?:Location|Country):\s*([A-Za-z\s]+)/i);
                        if (locMatch) location = locMatch[1].trim();
                        else {
                            let locEl = card.querySelector('[data-test="client-country"], .job-tile-location');
                            if (locEl) location = locEl.innerText.trim();
                        }

                        let spent = "$0 spent";
                        let spentMatch = fullText.match(/\$\d+k?\+?\s*spent/i);
                        if (spentMatch) spent = spentMatch[0];

                        let proposals = "N/A";
                        let propEl = card.querySelector('[data-test="proposals"]');
                        if (propEl) {
                            proposals = propEl.innerText.trim();
                        } else {
                            let propMatch = fullText.match(/Proposals?:?\s*([A-Za-z0-9\s\-+to]+?)(?:\n|$|\s{2,})/i);
                            if (propMatch) proposals = propMatch[1].trim();
                        }

                        let duration = "N/A";
                        let durEl = card.querySelector('[data-test="duration"]');
                        if (durEl) duration = durEl.innerText.trim();
                        if (duration === "N/A") {
                            let durMatch = fullText.match(/(?:(?:less|more) than\s*\d+\s*(?:hour|day|week|month)s?|\d+(?:-\d+)?\s*(?:hours|days|weeks|months))/i);
                            if (durMatch) duration = durMatch[0];
                        }
                        let hoursEl = card.querySelector('[data-test="hours-per-week"], .hours-per-week');
                        if (hoursEl) {
                            let hours = hoursEl.innerText.trim();
                            if (hours) duration = duration === 'N/A' ? hours : duration + ', ' + hours;
                        }

                        let posted = "Recently";
                        let timeEl = card.querySelector('[data-test="posted-on"], .posted-on, time');
                        if (timeEl) posted = timeEl.innerText.trim();
                        if (posted === "Recently") {
                            let timeMatch = fullText.match(/(\d+\s+(?:second|minute|hour|day|week)s?\s+ago)/i);
                            if (timeMatch) posted = timeMatch[0];
                        }

                        let skills = Array.from(card.querySelectorAll('[data-test="skill"], .air3-token, .up-skill-badge'))
                                          .map(s => s.innerText.trim()).join(', ') || "Web Development";

                        let expLevel = "Entry Level";
                        if (fullText.includes("Expert")) expLevel = "Expert";
                        else if (fullText.includes("Intermediate")) expLevel = "Intermediate";

                        results.push({
                            url: url, title: title, text: fullText.substring(0, 500) + "...",
                            location: location, spent: spent, verified: verified, budget: budget,
                            duration: duration, proposals: proposals, tags: skills, exact_time: posted,
                            experience: expLevel
                        });
                    });
                    return results;
                }
                return sniff();
                """
                raw_data = driver.execute_script(sniffer_js)

                if raw_data:
                    logger.info(f"[{email}] Sniffer found {len(raw_data)} items.")
                    for item in raw_data:
                        if item['url'] not in seen_urls:
                            all_cycle_jobs.append(item)
                            seen_urls.add(item['url'])

                if load_count < batch_limit:
                    try:
                        more_btn = driver.find_element(By.XPATH, "//button[contains(., 'Load more') or contains(., 'More')]")
                        driver.execute_script("arguments[0].click();", more_btn)
                        load_count += 1
                        time.sleep(8)
                    except:
                        break
                else:
                    break

            new_saved = 0
            for item in reversed(all_cycle_jobs):
                job_id = item['url'].split('~')[-1].strip('/')
                try:
                    exists = supabase_execute_with_retry(
                        lambda: supabase.table('jobs').select('id').eq('job_id', job_id).eq('user_id', user_id).execute()
                    )
                    if not exists.data:
                        supabase_execute_with_retry(
                            lambda: supabase.table('jobs').insert({
                                "job_id": job_id,
                                "job_url": item['url'],
                                "job_title": item['title'],
                                "posted_date": item['exact_time'],
                                "job_description": item['text'],
                                "job_tags": item['tags'],
                                "job_proposals": item['proposals'],
                                "project_duration": item['duration'],
                                "client_location": item['location'],
                                "client_spent": item['spent'],
                                "is_verified": item['verified'],
                                "budget": item['budget'],
                                "experience_level": item.get('experience', 'Entry Level'),
                                "user_id": user_id
                            }).execute()
                        )
                        new_saved += 1
                except:
                    pass

            logger.info(f"[{email}] Cycle done. New: {new_saved}")
            supabase.table('settings').update({'force_scrape': False}).eq('user_id', user_id).execute()
            driver.quit()
        except Exception as e:
            logger.error(f"[{email}] Global Error: {e}")
            if driver:
                driver.quit()
            time.sleep(60)

def manage_threads():
    while True:
        try:
            auths_res = supabase.table('upwork_auth').select('user_id, email, password').execute()
            if auths_res.data:
                for auth in auths_res.data:
                    uid = auth['user_id']
                    if uid not in active_threads or not active_threads[uid].is_alive():
                        t = threading.Thread(target=scrape_for_user_continuous, args=(uid, auth['email'], auth['password']), daemon=True)
                        t.start()
                        active_threads[uid] = t
                        logger.info(f"Started thread for {auth['email']}")
            for uid in list(active_threads.keys()):
                if not active_threads[uid].is_alive():
                    del active_threads[uid]
        except:
            pass
        time.sleep(30)

if __name__ == '__main__':
    manager_thread = threading.Thread(target=manage_threads, daemon=True)
    manager_thread.start()
    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        logger.info("Shutting down...")