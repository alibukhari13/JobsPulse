import os
import time
import random
import logging
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
                checkbox = driver.find_element(
                    By.CSS_SELECTOR, "input[type='checkbox'], #challenge-stage"
                )
                ActionChains(driver).move_to_element(checkbox).pause(1).click().perform()
                driver.switch_to.default_content()
                time.sleep(3)
                return True
    except:
        driver.switch_to.default_content()
    return False


def perform_upwork_login(driver, email, password):
    """Fully Automated Stealth Login with multiple fallback selectors and screenshot on error."""
    try:
        wait = WebDriverWait(driver, 30)
        driver.get('https://www.upwork.com/ab/account-security/login')
        time.sleep(5)
        bypass_captcha(driver)

        # 1. Email field – try multiple selectors
        email_selectors = [
            (By.ID, "login_username"),
            (By.NAME, "login[username]"),
            (By.CSS_SELECTOR, "input[type='email']"),
            (By.XPATH, "//input[@name='login[username]']")
        ]
        email_field = None
        for by, value in email_selectors:
            try:
                email_field = wait.until(EC.element_to_be_clickable((by, value)))
                break
            except:
                continue
        if not email_field:
            raise Exception("Email field not found")

        email_field.clear()
        for char in email:
            email_field.send_keys(char)
            time.sleep(random.uniform(0.05, 0.15))
        email_field.send_keys(Keys.ENTER)
        logger.info("Email submitted, waiting for password field...")
        time.sleep(4)

        # 2. Password field – try multiple selectors
        password_selectors = [
            (By.ID, "login_password"),
            (By.NAME, "login[password]"),
            (By.CSS_SELECTOR, "input[type='password']"),
            (By.XPATH, "//input[@name='login[password]']")
        ]
        password_field = None
        for by, value in password_selectors:
            try:
                password_field = wait.until(EC.element_to_be_clickable((by, value)))
                break
            except:
                continue
        if not password_field:
            # Sometimes Upwork shows a "Continue" button after email
            try:
                continue_btn = driver.find_element(By.XPATH, "//button[contains(text(),'Continue')]")
                continue_btn.click()
                time.sleep(2)
                for by, value in password_selectors:
                    try:
                        password_field = wait.until(EC.element_to_be_clickable((by, value)))
                        break
                    except:
                        continue
            except:
                pass
        if not password_field:
            raise Exception("Password field not found")

        password_field.clear()
        for char in password:
            password_field.send_keys(char)
            time.sleep(random.uniform(0.05, 0.15))

        # Keep me logged in checkbox
        try:
            remember = driver.find_element(By.ID, "login_remember")
            if not remember.is_selected():
                remember.click()
        except:
            pass

        password_field.send_keys(Keys.ENTER)
        logger.info(f"Login credentials submitted for {email}")
        time.sleep(12)
        return True

    except Exception as e:
        logger.error(f"Auto-login failed for {email}: {repr(e)}")
        # Save screenshot for debugging
        try:
            screenshot_name = f"login_error_{email.replace('@', '_')}.png"
            driver.save_screenshot(screenshot_name)
            logger.info(f"Screenshot saved as {screenshot_name}")
        except:
            pass
        return False


def scrape_for_user(user_id, email, password):
    """Scrape jobs for a single user using their own credentials and batch limit."""
    driver = None
    try:
        # Fetch settings for this specific user
        settings_res = supabase.table('settings').select('batch_limit, force_scrape') \
            .eq('user_id', user_id).eq('id', 1).execute()
        if not settings_res.data:
            batch_limit = 3
            force_scrape = False
        else:
            batch_limit = settings_res.data[0].get('batch_limit', 3)
            force_scrape = settings_res.data[0].get('force_scrape', False)

        batch_limit = min(10, max(1, batch_limit))

        # Wait logic: if not forced, wait 5s; otherwise start immediately
        if not force_scrape:
            logger.info(f"User {email}: Normal cycle. Waiting 5s before starting...")
            time.sleep(5)
        else:
            logger.info(f"User {email}: ⚡ Force scrape triggered! Starting immediately...")

        logger.info(f'--- Starting cycle for {email} (User: {user_id}, Batches: {batch_limit}) ---')
        options = uc.ChromeOptions()
        options.add_argument('--start-maximized')
        # Use separate profile per user to avoid session conflicts
        profile_path = os.path.abspath(f"automation_profile_{user_id[:8]}")
        options.add_argument(f'--user-data-dir={profile_path}')

        driver = uc.Chrome(options=options, version_main=146)

        driver.get('https://www.upwork.com/nx/find-work/')
        time.sleep(8)
        bypass_captcha(driver)

        if "login" in driver.current_url:
            if not perform_upwork_login(driver, email, password):
                driver.quit()
                return

        # Hard reload with cache buster
        timestamp = int(time.time())
        driver.get(f'https://www.upwork.com/nx/find-work/?t={timestamp}')
        logger.info("Page opening... Waiting 35 seconds.")
        time.sleep(35)

        try:
            feed_tab = driver.find_element(By.XPATH, "//button[contains(., 'My Feed')]")
            driver.execute_script("arguments[0].click();", feed_tab)
            logger.info("My Feed Tab clicked.")
            time.sleep(1)
            driver.get(driver.current_url)
            time.sleep(15)
        except:
            pass

        load_count = 1
        all_cycle_jobs = []
        seen_urls = set()

        while load_count <= batch_limit:
            logger.info(f"--- Scraping Batch {load_count}/{batch_limit} for {email} ---")
            # Scroll to load currently visible jobs
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
                        let verified = "Unverified";
                        let vBadge = art.querySelector('[data-test="payment-verified"]');
                        let vIcon = art.querySelector('.air3-icon-verified');
                        let vSvg = art.querySelector('svg title')?.innerHTML?.toLowerCase()?.includes('verified');
                        if (vBadge || vIcon || vSvg || fullText.includes("Payment verified")) verified = "Verified";

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
                        all_cycle_jobs.append(item)
                        seen_urls.add(item['url'])

            # If we have more batches to do, try to click "More" / "Load more"
            if load_count < batch_limit:
                clicked = False
                # Multiple methods to find the button
                try:
                    # Method 1: By visible text
                    more_btn = driver.find_element(
                        By.XPATH, "//button[contains(text(),'More') or contains(text(),'Load more')]"
                    )
                    driver.execute_script("arguments[0].click();", more_btn)
                    clicked = True
                except:
                    try:
                        # Method 2: By data-test attribute (Upwork specific)
                        more_btn = driver.find_element(By.CSS_SELECTOR, "[data-test='load-more']")
                        driver.execute_script("arguments[0].click();", more_btn)
                        clicked = True
                    except:
                        try:
                            # Method 3: Generic button with aria-label
                            more_btn = driver.find_element(By.XPATH, "//button[@aria-label='Load more jobs']")
                            driver.execute_script("arguments[0].click();", more_btn)
                            clicked = True
                        except:
                            logger.warning(f"No 'More' button found for batch {load_count}. Assuming end of jobs.")
                            break   # No more jobs to load, exit loop

                if clicked:
                    load_count += 1
                    logger.info("Clicked 'More' button. Waiting for jobs to load...")
                    time.sleep(6)  # Wait for new jobs to render
                    # Additional scroll to trigger lazy load
                    for _ in range(5):
                        driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.PAGE_DOWN)
                        time.sleep(0.8)
            else:
                break

        new_saved = 0
        for item in reversed(all_cycle_jobs):
            job_id = item['url'].split('~')[-1].strip('/')
            if any(k in (item['title'] + item['text']).lower() for k in
                   ['web', 'dev', 'html', 'js', 'react', 'api', 'node', 'php', 'laravel', 'shopify', 'wordpress', 'figma']):
                try:
                    exists = supabase.table('jobs').select('id') \
                        .eq('job_id', job_id).eq('user_id', user_id).execute()
                    if not exists.data:
                        logger.info(f"CLOUD SAVING for {email}: {item['title'][:35]} | {item['verified']}")
                        supabase.table('jobs').insert({
                            "job_id": job_id, "job_url": item['url'], "job_title": item['title'],
                            "posted_date": item['exact_time'], "job_description": item['text'],
                            "job_tags": item['tags'], "job_proposals": item['proposals'],
                            "client_location": item['location'], "client_spent": item['spent'],
                            "is_verified": item['verified'], "budget": item['budget'],
                            "experience_level": item['experience'], "project_duration": item['duration'],
                            "user_id": user_id
                        }).execute()
                        new_saved += 1
                except Exception as e:
                    logger.error(f"Failed to save job: {e}")

        logger.info(f"Cycle Done for {email}. New Jobs: {new_saved}")

        # Reset force_scrape flag for this user
        supabase.table('settings').update({'force_scrape': False}) \
            .eq('user_id', user_id).eq('id', 1).execute()

        driver.quit()
    except Exception as e:
        logger.error(f"Global Error for user {email}: {e}")
        if driver:
            driver.quit()
        # Attempt to reset flag even on error
        try:
            supabase.table('settings').update({'force_scrape': False}) \
                .eq('user_id', user_id).eq('id', 1).execute()
        except:
            pass


def main_loop():
    """Infinite loop to continuously scrape for all connected users."""
    while True:
        # Fetch all users who have connected Upwork accounts
        auths_res = supabase.table('upwork_auth').select('user_id, email, password').execute()
        if not auths_res.data:
            logger.info("No Upwork accounts connected. Waiting 30s...")
            time.sleep(30)
            continue

        for auth in auths_res.data:
            user_id = auth['user_id']
            email = auth['email']
            password = auth['password']
            scrape_for_user(user_id, email, password)
            # Wait a bit between users to avoid rate limiting
            time.sleep(10)

        logger.info("Completed a full round for all users. Waiting 60s before next round...")
        time.sleep(60)


if __name__ == '__main__':
    main_loop()