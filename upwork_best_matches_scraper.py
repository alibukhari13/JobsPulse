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

def bypass_cloudflare(driver, timeout=35):
    try:
        time.sleep(2)
        page_source = driver.page_source.lower()
        if "verify you are human" not in page_source and "cloudflare" not in page_source:
            return True

        logger.info("Cloudflare challenge present, attempting to resolve...")
        start = time.time()
        try:
            iframes = driver.find_elements(By.TAG_NAME, "iframe")
            for frame in iframes:
                src = frame.get_attribute("src") or ""
                if "turnstile" in src or "challenge" in src:
                    driver.switch_to.frame(frame)
                    checkbox = WebDriverWait(driver, 10).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, "div[role='checkbox'], input[type='checkbox']"))
                    )
                    ActionChains(driver).move_to_element(checkbox).click().perform()
                    driver.switch_to.default_content()
                    logger.info("Clicked Turnstile checkbox.")
                    break
        except:
            driver.switch_to.default_content()

        while time.time() - start < timeout:
            if "verify" not in driver.page_source.lower():
                logger.info("Cloudflare challenge passed.")
                return True
            time.sleep(1)

        logger.warning("Cloudflare challenge timed out.")
        return False
    except Exception as e:
        logger.error(f"Cloudflare bypass error: {e}")
        try:
            driver.switch_to.default_content()
        except:
            pass
        return False

def perform_upwork_login(driver, email, password):
    try:
        wait = WebDriverWait(driver, 30)
        driver.get('https://www.upwork.com/ab/account-security/login')
        time.sleep(5)
        bypass_cloudflare(driver)

        email_field = wait.until(EC.element_to_be_clickable((By.ID, "login_username")))
        email_field.clear()
        email_field.send_keys(email)
        time.sleep(random.uniform(0.5, 1.0))
        email_field.send_keys(Keys.ENTER)
        logger.info(f"[{email}] Email submitted.")
        time.sleep(4)

        password_field = wait.until(EC.element_to_be_clickable((By.ID, "login_password")))
        password_field.clear()
        password_field.send_keys(password)
        time.sleep(random.uniform(0.5, 1.0))

        try:
            remember = driver.find_element(By.ID, "login_remember")
            if not remember.is_selected():
                remember.click()
        except:
            pass

        password_field.send_keys(Keys.ENTER)
        logger.info(f"[{email}] Login submitted.")
        time.sleep(12)
        return True
    except Exception as e:
        logger.error(f"[{email}] Login failed: {repr(e)}")
        try:
            driver.save_screenshot(f"login_error_{email.replace('@','_')}.png")
        except:
            pass
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
    options.add_argument('--lang=en-US,en;q=0.9')

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
                    'user_id': user_id,
                    'expiry_minutes': 360,
                    'batch_limit': 3,
                    'force_scrape': False,
                    'updated_at': 'now()'
                }).execute()
            )
            logger.info(f"[{email}] Created default settings.")
    except Exception as e:
        logger.warning(f"[{email}] Settings init error: {e}")

def scrape_for_user_continuous(user_id, email, password):
    delay = random.uniform(3, 10)
    logger.info(f"[{email}] Waiting {delay:.1f}s before first cycle...")
    time.sleep(delay)
    logger.info(f"[{email}] Dedicated thread started.")

    while True:
        driver = None
        try:
            settings_res = supabase_execute_with_retry(
                lambda: supabase.table('settings').select('batch_limit, force_scrape').eq('user_id', user_id).execute()
            )
            if not settings_res.data:
                ensure_settings_exist(user_id, email)
                batch_limit = 3
                force_scrape = False
            else:
                batch_limit = settings_res.data[0].get('batch_limit', 3)
                force_scrape = settings_res.data[0].get('force_scrape', False)
            batch_limit = min(10, max(1, batch_limit))

            if not force_scrape:
                logger.info(f"[{email}] Normal cycle. Waiting 30s...")
                time.sleep(30)
            else:
                logger.info(f"[{email}] ⚡ Force scrape triggered!")

            logger.info(f"[{email}] Starting cycle (Batches: {batch_limit})")

            profile_path = os.path.abspath(f"automation_profile_{user_id[:8]}")
            os.makedirs(profile_path, exist_ok=True)
            driver = create_driver(profile_path, email)

            logger.info(f"[{email}] Navigating to Upwork...")
            driver.get('https://www.upwork.com/nx/find-work/')
            time.sleep(5)
            if not bypass_cloudflare(driver):
                logger.warning("Cloudflare on find-work, refreshing...")
                driver.refresh()
                time.sleep(5)
                bypass_cloudflare(driver)

            if "login" in driver.current_url:
                logger.info(f"[{email}] Login required.")
                if not perform_upwork_login(driver, email, password):
                    driver.quit()
                    time.sleep(60)
                    continue
            else:
                logger.info(f"[{email}] Already logged in.")

            # Additional wait after login / already logged in
            time.sleep(8)
            timestamp = int(time.time())
            driver.get(f'https://www.upwork.com/nx/find-work/?t={timestamp}')
            logger.info(f"[{email}] Waiting for feed...")
            time.sleep(25)  # increased wait

            try:
                feed_tab = driver.find_element(By.XPATH, "//button[contains(., 'My Feed')]")
                driver.execute_script("arguments[0].click();", feed_tab)
                time.sleep(3)
                driver.get(driver.current_url)
                time.sleep(12)
            except:
                pass

            load_count = 1
            all_cycle_jobs = []
            seen_urls = set()

            while load_count <= batch_limit:
                logger.info(f"[{email}] Batch {load_count}/{batch_limit}")
                for _ in range(12):  # more scrolls
                    driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.PAGE_DOWN)
                    time.sleep(0.8)

                sniffer_js = """
                function sniff() {
                    let results = [];
                    let seenUrls = new Set();
                    let links = document.querySelectorAll('a[href*="/jobs/"]');
                    links.forEach(link => {
                        let href = link.href;
                        if (!href.includes('/jobs/') || href.includes('/search/')) return;
                        if (seenUrls.has(href)) return;
                        seenUrls.add(href);
                        
                        let container = link.closest('article, section, div[class*="tile"], div[class*="card"]');
                        if (!container) {
                            let parent = link.parentElement;
                            for (let i=0; i<3; i++) {
                                if (parent && parent.innerText.length > 100) {
                                    container = parent;
                                    break;
                                }
                                parent = parent?.parentElement;
                            }
                        }
                        if (!container) return;
                        
                        let fullText = container.innerText;
                        let title = link.innerText.trim();
                        if (!title) title = container.querySelector('h2, h3, .job-title, [data-test="job-title"]')?.innerText.trim() || '';
                        if (!title || title.length < 3) return;
                        
                        let verified = "Unverified";
                        if (container.querySelector('[data-test="payment-verified"], .air3-icon-verified') || fullText.includes("Payment verified")) {
                            verified = "Verified";
                        }
                        
                        let skillElements = container.querySelectorAll('[data-test="skill"], .air3-token, .skill-token, .badge');
                        let tags = Array.from(skillElements).map(s => s.innerText.trim()).filter(s => s).join(', ');
                        if (!tags) tags = "Web Development";
                        
                        let location = container.querySelector('[data-test="client-country"], .client-location, .location')?.innerText.trim() || "Unknown";
                        let spent = container.querySelector('[data-test="client-spendings"], .client-spent')?.innerText.trim() || "$0 spent";
                        let budgetType = container.querySelector('[data-test="job-type"]')?.innerText.trim() || "";
                        let budgetVal = container.querySelector('[data-test="budget"], [data-test="hourly-rate"]')?.innerText.trim() || "";
                        let budget = budgetType + (budgetVal ? ": " + budgetVal : "");
                        if (!budget) budget = "N/A";
                        
                        let duration = container.querySelector('[data-test="duration"]')?.innerText.trim() || "";
                        let hours = container.querySelector('[data-test="hours-per-week"]')?.innerText.trim() || "";
                        let finalDuration = duration + (hours ? ", " + hours : "");
                        if (!finalDuration) finalDuration = "N/A";
                        
                        let expLevel = "Entry Level";
                        if (fullText.includes("Expert")) expLevel = "Expert";
                        else if (fullText.includes("Intermediate")) expLevel = "Intermediate";
                        
                        let proposals = container.querySelector('[data-test="proposals"], .proposals')?.innerText.trim() || "N/A";
                        let timeElement = container.querySelector('[data-test="posted-on"], .posted-on, time, small');
                        let posted = timeElement ? timeElement.innerText.replace('Posted', '').trim() : "Recently";
                        let descEl = container.querySelector('[data-test="job-description"], .job-description, .description, p');
                        let description = descEl ? descEl.innerText.trim() : fullText;
                        
                        results.push({
                            url: href.split('?')[0],
                            title: title,
                            text: description,
                            location: location,
                            spent: spent,
                            verified: verified,
                            budget: budget,
                            experience: expLevel,
                            duration: finalDuration,
                            proposals: proposals,
                            tags: tags,
                            exact_time: posted
                        });
                    });
                    return results;
                }
                return sniff();
                """
                raw_data = driver.execute_script(sniffer_js)
                current_batch_count = len(raw_data) if raw_data else 0
                logger.info(f"[{email}] Sniffer found {current_batch_count} items.")
                
                if current_batch_count == 0:
                    driver.save_screenshot(f"no_jobs_{email.replace('@','_')}_{load_count}_{int(time.time())}.png")
                    logger.warning(f"[{email}] No jobs found in batch {load_count}. Screenshot saved.")
                
                if raw_data:
                    for item in raw_data:
                        if item['url'] not in seen_urls:
                            all_cycle_jobs.append(item)
                            seen_urls.add(item['url'])

                if load_count < batch_limit:
                    # Try to click "More" even if count didn't increase (give page more time)
                    clicked = False
                    try:
                        more_btn = driver.find_element(By.XPATH, "//button[contains(text(),'More') or contains(text(),'Load more')]")
                        driver.execute_script("arguments[0].click();", more_btn)
                        clicked = True
                    except:
                        try:
                            more_btn = driver.find_element(By.CSS_SELECTOR, "[data-test='load-more']")
                            driver.execute_script("arguments[0].click();", more_btn)
                            clicked = True
                        except:
                            pass
                    if clicked:
                        logger.info(f"[{email}] Clicked 'More', waiting...")
                        time.sleep(8)  # generous wait
                        for _ in range(6):
                            driver.find_element(By.TAG_NAME, 'body').send_keys(Keys.PAGE_DOWN)
                            time.sleep(0.7)
                        load_count += 1
                    else:
                        logger.info(f"[{email}] No 'More' button found.")
                        break
                else:
                    break

            new_saved = 0
            for item in reversed(all_cycle_jobs):
                job_id = item['url'].split('~')[-1].strip('/')
                if not job_id or job_id.startswith('http') or len(job_id) < 5:
                    job_id = item['url'].split('/')[-1].split('?')[0]
                if not job_id:
                    continue
                    
                if any(k in (item['title'] + item['text']).lower() for k in ['web', 'dev', 'html', 'js', 'react', 'api', 'node', 'php', 'laravel', 'shopify', 'wordpress', 'figma']):
                    try:
                        exists = supabase_execute_with_retry(
                            lambda: supabase.table('jobs').select('id').eq('job_id', job_id).eq('user_id', user_id).execute()
                        )
                        if not exists.data:
                            logger.info(f"[{email}] SAVED: {item['title'][:35]}")
                            supabase_execute_with_retry(
                                lambda: supabase.table('jobs').insert({
                                    "job_id": job_id,
                                    "job_url": item['url'],
                                    "job_title": item['title'],
                                    "posted_date": item['exact_time'],
                                    "job_description": item['text'],
                                    "job_tags": item['tags'],
                                    "job_proposals": item['proposals'],
                                    "client_location": item['location'],
                                    "client_spent": item['spent'],
                                    "is_verified": item['verified'],
                                    "budget": item['budget'],
                                    "experience_level": item['experience'],
                                    "project_duration": item['duration'],
                                    "user_id": user_id
                                }).execute()
                            )
                            new_saved += 1
                    except Exception as e:
                        logger.error(f"[{email}] Save error: {e}")

            logger.info(f"[{email}] Cycle done. New: {new_saved}")

            try:
                supabase_execute_with_retry(
                    lambda: supabase.table('settings').update({'force_scrape': False}).eq('user_id', user_id).execute()
                )
            except:
                pass

            driver.quit()
            logger.info(f"[{email}] Chrome closed.")
        except Exception as e:
            logger.error(f"[{email}] Global Error: {e}", exc_info=True)
            if driver:
                try:
                    driver.quit()
                except:
                    pass
            try:
                supabase_execute_with_retry(
                    lambda: supabase.table('settings').update({'force_scrape': False}).eq('user_id', user_id).execute()
                )
            except:
                pass
            time.sleep(60)

def manage_threads():
    while True:
        try:
            auths_res = supabase_execute_with_retry(
                lambda: supabase.table('upwork_auth').select('user_id, email, password').execute()
            )
            current_users = set()
            if auths_res.data:
                for auth in auths_res.data:
                    user_id = auth['user_id']
                    email = auth['email']
                    password = auth['password']
                    if not email or not password:
                        continue
                    current_users.add(user_id)
                    if user_id not in active_threads or not active_threads[user_id].is_alive():
                        t = threading.Thread(
                            target=scrape_for_user_continuous,
                            args=(user_id, email, password),
                            daemon=True,
                            name=f"Scraper-{email}"
                        )
                        t.start()
                        active_threads[user_id] = t
                        logger.info(f"Started thread for {email}")

            for uid in list(active_threads.keys()):
                if not active_threads[uid].is_alive():
                    del active_threads[uid]

        except Exception as e:
            logger.error(f"Manager thread error: {e}")
        time.sleep(30)

if __name__ == '__main__':
    manager_thread = threading.Thread(target=manage_threads, daemon=True)
    manager_thread.start()
    try:
        while True:
            time.sleep(10)
    except KeyboardInterrupt:
        logger.info("Shutting down...")