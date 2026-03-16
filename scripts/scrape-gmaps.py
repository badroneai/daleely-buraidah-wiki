#!/usr/bin/env python3
"""
سكربت سكرابنج عام من Google Maps (بدون API) — قالب لجميع القطاعات
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• قالب عام: لا يقتصر على كافيهات أو مطاعم. القطاع يُحدد بـ --sector (قيمة حقل
  sector في master.json: cafes, restaurants, أو أي قطاع آخر).
• لاستجلاب قطاع معين: شغّل مع --sector <القطاع>. لتعديل سلوك البحث أو المدينة
  أو الحقول، راجع القسم "إعدادات قابلة للتعديل" أدناه وملف docs/SCRAPER_GENERAL_TEMPLATE.md.

المتطلبات:
  pip install playwright beautifulsoup4
  playwright install chromium

الاستخدام:
  # سكرابنج كل الكافيهات الناقصة
  python3 scripts/scrape-gmaps.py

  # سكرابنج كافيهات محددة
  python3 scripts/scrape-gmaps.py --slugs samraa-cafe,booq-roastery-cafe

  # سكرابنج أول 20 كافيه فقط (للتجربة)
  python3 scripts/scrape-gmaps.py --limit 20

  # سكرابنج الكافيهات التي ينقصها هاتف فقط
  python3 scripts/scrape-gmaps.py --missing phone

  # استئناف من آخر نقطة توقف
  python3 scripts/scrape-gmaps.py --resume

  # مخرجات جهاز معيّن (لتجنب التضارب عند العمل من أكثر من جهاز)
  python3 scripts/scrape-gmaps.py --device-id device-1 --headless
  python3 scripts/scrape-gmaps.py --device-id device-2 --headless

  # سكرابنج قطاع المطاعم (نفس منطق الكافيهات)
  python3 scripts/scrape-gmaps.py --sector restaurants --limit 20 --headless

  # فقط السجلات التي لديها رابط خريطة (أنسب — يعتمد على reference_url)
  python3 scripts/scrape-gmaps.py --only-with-place-url --headless

  # عند "غير موجود" على الخريطة: بحث ويب (جوجل) عن هاتف وإنستغرام وتيك توك
  python3 scripts/scrape-gmaps.py --sector restaurants --limit 10 --headless --web-fallback

  # سكرابنج قطاع المخابز
  python3 scripts/scrape-gmaps.py --sector bakeries --headless
  # سكرابنج المحامص أو الشوكولاتة
  python3 scripts/scrape-gmaps.py --sector roasteries --headless
  python3 scripts/scrape-gmaps.py --sector chocolates --headless
  # تشغيل عدة قطاعات معاً (كل واحد بمجلد مخرجات خاص لتجنب التضارب):
  python3 scripts/scrape-gmaps.py --sector bakeries --device-id bakeries --headless
  python3 scripts/scrape-gmaps.py --sector roasteries --device-id roasteries --headless
  python3 scripts/scrape-gmaps.py --sector chocolates --device-id chocolates --headless

المخرجات:
  بدون --device-id: outputs/
  مع --device-id:    outputs/<device-id>/  (مثلاً outputs/device-1/)
  الملفات: scrape-results-YYYY-MM-DD.json, scrape-merge-ready-*.json, scrape-not-found-*.json
"""

import json, sys, os, re, time, argparse, random, traceback
from datetime import date, datetime
from pathlib import Path
from urllib.parse import quote_plus

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout
except ImportError:
    print("❌ يجب تثبيت playwright أولاً:")
    print("   pip install playwright && playwright install chromium")
    sys.exit(1)

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("❌ يجب تثبيت beautifulsoup4:")
    print("   pip install beautifulsoup4")
    sys.exit(1)


# ─── Paths ───
SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT = SCRIPT_DIR.parent
MASTER = ROOT / "master.json"
OUTPUT_DIR = ROOT / "outputs"
TODAY = str(date.today())

# ═══ قالب عام — إعدادات قابلة للتعديل (لأي قطاع/مدينة) ═══
# عند استجلاب قطاع أو مدينة أخرى: عدّل هنا ثم شغّل مع --sector <القطاع>
SEARCH_BASE = "https://www.google.com/maps/search/"
PLACE_BASE = "https://www.google.com/maps/place/"
CITY_SUFFIX = "بريدة"   # يُضاف لاستعلام البحث لتحديد المدينة (عدّله لمدينة أخرى)
DEFAULT_SECTOR = "cafes"  # القطاع الافتراضي إن لم يُمرّر --sector (يجب أن يكون موجوداً في master.json)

# ─── Config (تأخير، مهلات) ───
DELAY_MIN = 3  # ثواني تأخير بين الطلبات (أقل حد)
DELAY_MAX = 7  # ثواني تأخير بين الطلبات (أعلى حد)
MAX_RETRIES = 2
TIMEOUT = 15000  # مهلة انتظار العناصر (مللي ثانية)


# ─── Field extractors ───

def extract_name(page):
    """استخراج اسم المكان"""
    sels = ['h1.DUwDvf', 'h1[data-attrid]', 'div.lMbq3e h1', 'h1']
    for sel in sels:
        try:
            el = page.query_selector(sel)
            if el:
                txt = el.inner_text().strip()
                if txt:
                    return txt
        except:
            pass
    return ""


def extract_rating_reviews(page):
    """استخراج التقييم وعدد المراجعات"""
    rating = 0
    reviews = 0
    try:
        # Rating: look for the star rating value
        for sel in ['div.F7nice span[aria-hidden="true"]', 'span.ceNzKf', 'div.F7nice span']:
            el = page.query_selector(sel)
            if el:
                txt = el.inner_text().strip().replace('٫', '.').replace(',', '.')
                m = re.search(r'(\d+\.?\d*)', txt)
                if m:
                    rating = float(m.group(1))
                    break

        # Reviews count
        for sel in ['button[jsaction*="reviews"] span', 'span[aria-label*="review"]', 'div.F7nice span:nth-child(2)']:
            el = page.query_selector(sel)
            if el:
                txt = el.inner_text().strip()
                # Handle Arabic/English parenthesized count: (4,052) or (٤٬٠٥٢)
                txt = txt.replace('(', '').replace(')', '').replace(',', '').replace('٬', '')
                # Convert Arabic numerals
                for ar, en in zip('٠١٢٣٤٥٦٧٨٩', '0123456789'):
                    txt = txt.replace(ar, en)
                m = re.search(r'(\d+)', txt)
                if m:
                    reviews = int(m.group(1))
                    break

        # Fallback: aria-label on rating section
        if not rating or not reviews:
            el = page.query_selector('[aria-label*="نجوم"], [aria-label*="stars"]')
            if el:
                label = el.get_attribute('aria-label') or ''
                m_r = re.search(r'([\d.٫]+)\s*(?:نجوم|stars)', label)
                m_c = re.search(r'([\d,٬]+)\s*(?:مراجع|review)', label)
                if m_r and not rating:
                    rating = float(m_r.group(1).replace('٫', '.'))
                if m_c and not reviews:
                    reviews = int(m_c.group(1).replace(',', '').replace('٬', ''))
    except:
        pass
    return rating, reviews


def extract_phone(page):
    """استخراج رقم الهاتف"""
    try:
        # Method 1: aria-label
        el = page.query_selector('button[data-tooltip="نسخ رقم الهاتف"], button[aria-label*="هاتف"], button[aria-label*="phone"], a[data-tooltip*="هاتف"]')
        if el:
            label = el.get_attribute('aria-label') or ''
            txt = el.inner_text().strip()
            phone = label if 'هاتف' in label or 'phone' in label.lower() else txt
            # Clean: extract phone pattern
            phone = phone.replace('هاتف:', '').replace('Phone:', '').strip()
            m = re.search(r'[\+\d\s\-\(\)]{7,}', phone)
            if m:
                return m.group(0).strip()

        # Method 2: look for phone icon row
        rows = page.query_selector_all('div[data-attrid*="phone"], div.rogA2c')
        for row in rows:
            txt = row.inner_text().strip()
            m = re.search(r'[\+\d\s\-\(\)]{7,}', txt)
            if m:
                return m.group(0).strip()

        # Method 3: search entire sidebar text for Saudi phone patterns
        content = page.query_selector('div[role="main"]')
        if content:
            txt = content.inner_text()
            # Saudi patterns: +966, 05xx, 06xx, 013xxx
            patterns = [
                r'\+966[\s\-]?\d[\s\-]?\d{3}[\s\-]?\d{4}',
                r'05\d[\s\-]?\d{3}[\s\-]?\d{4}',
                r'06\d[\s\-]?\d{3}[\s\-]?\d{4}',
                r'013[\s\-]?\d{3}[\s\-]?\d{4}',
                r'016[\s\-]?\d{3}[\s\-]?\d{4}',
            ]
            for pat in patterns:
                m = re.search(pat, txt)
                if m:
                    return m.group(0).strip()
    except:
        pass
    return ""


def extract_address(page):
    """استخراج العنوان"""
    try:
        for sel in [
            'button[data-item-id="address"] div.fontBodyMedium',
            'button[aria-label*="عنوان"]',
            'button[data-tooltip="نسخ العنوان"]',
            'div[data-attrid*="address"]',
        ]:
            el = page.query_selector(sel)
            if el:
                txt = (el.get_attribute('aria-label') or el.inner_text()).strip()
                txt = txt.replace('العنوان:', '').replace('Address:', '').strip()
                if txt and len(txt) > 5:
                    return txt
    except:
        pass
    return ""


def extract_hours(page):
    """استخراج ساعات العمل"""
    try:
        # Try clicking the hours row to expand
        hours_btn = page.query_selector('button[data-item-id*="hour"], button[aria-label*="ساعات"], div.o0Svhf button')
        if hours_btn:
            txt = hours_btn.inner_text().strip()
            label = hours_btn.get_attribute('aria-label') or ''
            if label and len(label) > len(txt):
                txt = label

            # Extract meaningful part
            # Remove "ساعات العمل" prefix
            txt = re.sub(r'^ساعات العمل\s*[:\-]?\s*', '', txt)
            txt = re.sub(r'^Hours\s*[:\-]?\s*', '', txt, flags=re.I)

            if txt and len(txt) > 3:
                # Simplify if too long — take first line
                lines = txt.split('\n')
                if len(lines) > 1:
                    # Look for today or a summary line
                    for line in lines:
                        if any(w in line for w in ['مفتوح', 'مغلق', 'Open', 'Closed', 'يفتح', 'يغلق']):
                            return line.strip()
                    return lines[0].strip()
                return txt
    except:
        pass
    return ""


def extract_website(page):
    """استخراج رابط الموقع"""
    try:
        for sel in [
            'a[data-item-id="authority"]',
            'a[aria-label*="موقع"]',
            'a[aria-label*="website"]',
            'button[data-tooltip*="موقع"]',
        ]:
            el = page.query_selector(sel)
            if el:
                href = el.get_attribute('href') or ''
                if href and 'google' not in href:
                    return href
                label = el.get_attribute('aria-label') or el.inner_text()
                label = label.replace('الموقع الإلكتروني:', '').replace('Website:', '').strip()
                if label and '.' in label:
                    return label
    except:
        pass
    return ""


def extract_category(page):
    """استخراج التصنيف"""
    try:
        for sel in ['button[jsaction*="category"]', 'span.DkEaL']:
            el = page.query_selector(sel)
            if el:
                txt = el.inner_text().strip()
                if txt:
                    return txt
    except:
        pass
    return ""


def extract_price_level(page):
    """استخراج مستوى الأسعار"""
    try:
        content = page.query_selector('div[role="main"]')
        if content:
            txt = content.inner_text()
            # Google shows $ symbols or ‏
            m = re.search(r'([\$]{1,4}|[﷼]{1,4})', txt)
            if m:
                return '$' * len(m.group(1))
            # Or look for price indicator
            if '·' in txt:
                parts = txt.split('·')
                for p in parts:
                    p = p.strip()
                    if re.match(r'^[\$﷼]+$', p):
                        return '$' * len(p)
                    if p in ('‏$', '‏$$', '‏$$$', '‏$$$$'):
                        return p.replace('‏', '')
    except:
        pass
    return ""


def extract_features(page):
    """استخراج الخصائص (جلسات خارجية، واي فاي، مواقف، إلخ)"""
    features = {
        'outdoor_seating': 'unknown',
        'indoor_seating': 'unknown',
        'wifi': 'unknown',
        'parking': 'unknown',
        'family_friendly': 'unknown',
        'desserts': 'unknown',
    }
    try:
        # Google Maps shows features in the "About" tab or inline
        # Try to find feature/amenity indicators
        content = page.query_selector('div[role="main"]')
        if not content:
            return features
        txt = content.inner_text().lower()

        # Outdoor seating
        if any(w in txt for w in ['جلسات خارجية', 'outdoor seating', 'خارجي', 'تراس', 'terrace', 'patio']):
            features['outdoor_seating'] = 'yes'

        # Wi-Fi
        if any(w in txt for w in ['واي فاي', 'wifi', 'wi-fi', 'إنترنت', 'internet']):
            features['wifi'] = 'yes'

        # Family
        if any(w in txt for w in ['عائلات', 'family', 'عائلي', 'أطفال', 'kids']):
            features['family_friendly'] = 'yes'

        # Parking
        if any(w in txt for w in ['مواقف', 'parking', 'موقف سيارات']):
            features['parking'] = 'yes'

        # Desserts
        if any(w in txt for w in ['حلويات', 'dessert', 'كيك', 'cake', 'حلا', 'sweet']):
            features['desserts'] = 'yes'

        # Also try the "About" / accessibility section
        about_items = page.query_selector_all('div[aria-label*="إمكانية"], div[aria-label*="amenities"], li.hpLkke')
        for item in about_items:
            item_txt = item.inner_text().lower()
            if 'خارج' in item_txt or 'outdoor' in item_txt:
                features['outdoor_seating'] = 'yes'
            if 'wifi' in item_txt or 'واي' in item_txt:
                features['wifi'] = 'yes'
            if 'عائل' in item_txt or 'family' in item_txt:
                features['family_friendly'] = 'yes'
    except:
        pass
    return features


def extract_crowd_summary(page):
    """استخراج وصف الازدحام / أوقات شعبية إن وُجد"""
    try:
        main = page.query_selector('div[role="main"]')
        if not main:
            return ""
        txt = main.inner_text()
        # أنماط شائعة: "عادة هادئ"، "مزدحم الآن"، "أوقات شعبية"، "Popular times"
        patterns = [
            r'(?:عادة|عادةً)\s*(?:ليس\s+)?(?:مزدحماً?|هادئاً?|هادئ)\s*',
            r'(?:Usually|Typically)\s*(?:not\s+)?(?:busy|quiet|crowded)',
            r'مزدحم\s+(?:الآن|مساءً|صباحاً)',
            r'Busy\s+(?:now|at\s+\d)',
            r'أوقات شعبية[:\s]*([^\n]+)',
            r'Popular times[:\s]*([^\n]+)',
        ]
        for pat in patterns:
            m = re.search(pat, txt, re.I | re.UNICODE)
            if m:
                s = (m.group(1) if m.lastindex else m.group(0)).strip()
                if len(s) > 2 and len(s) < 120:
                    return s
        # بحث نصي بسيط
        for phrase in ['عادة هادئ', 'عادة مزدحم', 'Usually not too busy', 'Busy at', 'مزدحم الآن']:
            if phrase in txt:
                start = txt.find(phrase)
                snippet = txt[start:start + 80].split('\n')[0].strip()
                if snippet:
                    return snippet
    except Exception:
        pass
    return ""


def extract_review_snippets(page, max_snippets=2):
    """استخراج أول تعليقين ظاهرين في الشريط الجانبي (بدون فتح تبويب المراجعات)"""
    snippets = []
    try:
        # عناصر قد تحتوي نصوص مراجعات في الصفحة الرئيسية
        selectors = [
            'div[data-review-id] span',
            'div.section-review-content span',
            'div.MyEned',
            'div[aria-label*="مراجعة"]',
            'div[aria-label*="review"]',
            'span.wiI7pd',  # class شائع لنص المراجعة
            'button[jsaction*="review"] span',
        ]
        seen = set()
        for sel in selectors:
            els = page.query_selector_all(sel)
            for el in els:
                if len(snippets) >= max_snippets:
                    return snippets
                try:
                    t = el.inner_text().strip()
                    if not t or len(t) < 15 or len(t) > 500:
                        continue
                    if t in seen:
                        continue
                    # تجنب أرقام أو واجهة فقط
                    if re.match(r'^[\d\.\s\%]+$', t):
                        continue
                    seen.add(t)
                    snippets.append(t[:400])
                except Exception:
                    continue
    except Exception:
        pass
    return snippets


def extract_photo_urls(page, max_photos=2):
    """استخراج روابط أول صورتين مصغرتين للمكان إن وُجدتا"""
    urls = []
    try:
        # صور من Google Maps غالباً من googleusercontent أو gstatic
        imgs = page.query_selector_all('img[src*="googleusercontent"], img[src*="gstatic"], img[data-src*="google"]')
        for img in imgs:
            if len(urls) >= max_photos:
                break
            try:
                src = img.get_attribute('src') or img.get_attribute('data-src')
                if not src or 'google' not in src:
                    continue
                if 'avatar' in src or 'logo' in src or 'favicon' in src:
                    continue
                if src in urls:
                    continue
                urls.append(src)
            except Exception:
                continue
    except Exception:
        pass
    return urls


# نطاقات التواصل الاجتماعي والمواقع الشائعة — نستخرج أي شيء قد يفيد الآن أو لاحقاً
SOCIAL_DOMAINS = {
    'instagram': ['instagram.com', 'instagr.am'],
    'twitter': ['twitter.com', 'x.com'],
    'snapchat': ['snapchat.com', 'snap.add'],
    'tiktok': ['tiktok.com', 'vm.tiktok.com'],
    'facebook': ['facebook.com', 'fb.com', 'fb.me', 'fb.watch', 'm.facebook.com'],
    'youtube': ['youtube.com', 'youtu.be'],
    'linkedin': ['linkedin.com'],
    'whatsapp': ['wa.me', 'whatsapp.com', 'api.whatsapp.com'],
    'telegram': ['t.me', 'telegram.me', 't.co'],
    'pinterest': ['pinterest.com'],
    'threads': ['threads.net'],
}


def extract_social_username(url, domain_key):
    """استخراج اسم المستخدم أو الرابط الكامل حسب النطاق"""
    if not url:
        return ''
    url = url.strip().split('?')[0].rstrip('/')
    if domain_key == 'instagram':
        m = re.search(r'instagram\.com/([A-Za-z0-9_.]+)', url, re.I)
        return m.group(1) if m else (url if 'instagram' in url else '')
    if domain_key in ('twitter', 'twitter/x'):
        m = re.search(r'(?:twitter|x)\.com/([A-Za-z0-9_]+)', url, re.I)
        return m.group(1) if m else (url if ('twitter' in url or 'x.com' in url) else '')
    if domain_key == 'snapchat':
        m = re.search(r'snapchat\.com/add/([A-Za-z0-9_.]+)', url, re.I)
        if m:
            return m.group(1)
        m = re.search(r'snap\.add/([A-Za-z0-9_.]+)', url, re.I)
        return m.group(1) if m else (url if 'snap' in url else '')
    if domain_key == 'tiktok':
        m = re.search(r'tiktok\.com/@([A-Za-z0-9_.]+)', url, re.I)
        return ('@' + m.group(1)) if m else (url if 'tiktok' in url else '')
    if domain_key == 'whatsapp':
        m = re.search(r'wa\.me/([0-9]+)', url)
        return m.group(1) if m else (url if 'wa.me' in url or 'whatsapp' in url else '')
    if domain_key == 'telegram':
        m = re.search(r't\.me/([A-Za-z0-9_]+)', url, re.I)
        return m.group(1) if m else (url if 't.me' in url else '')
    # للباقي نعيد الرابط كاملاً
    return url


def _is_google_policy_or_support_url(url):
    """استبعاد روابط سياسات/دعم جوجل — ليست خاصة بالمكان."""
    if not url or not isinstance(url, str):
        return True
    u = url.lower().strip()
    skip_hosts = (
        'support.google.com',
        'policies.google.com',
        'www.google.com/intl/',
    )
    return any(h in u for h in skip_hosts)


def extract_all_links(page, max_links=150):
    """
    استخراج كل الروابط التي نمر عليها في منطقة المحتوى الرئيسي.
    أي شيء يُعرض — مفيد الآن أو قد يُستفاد منه لاحقاً.
    روابط سياسات/دعم جوجل تُستبعد تلقائياً.
    يُرجع: قائمة { "url": "...", "text": "..." }
    """
    seen = set()
    out = []
    try:
        main = page.query_selector('div[role="main"]')
        root = main if main else page
        for a in root.query_selector_all('a[href]'):
            if len(out) >= max_links:
                break
            try:
                href = (a.get_attribute('href') or '').strip()
                if not href or href.startswith('#') or href == 'javascript:void(0)':
                    continue
                if _is_google_policy_or_support_url(href):
                    continue
                if href in seen:
                    continue
                text = (a.inner_text() or '').strip()[:200]
                seen.add(href)
                out.append({'url': href[:500], 'text': text})
            except Exception:
                continue
    except Exception:
        pass
    return out


def social_from_links(links):
    """
    من قائمة كل الروابط نستخرج حسابات التواصل الاجتماعي المعروفة.
    يُرجع: dict مفاتيحه (instagram, twitter, snapchat, ...) وقيمته الرابط أو اسم المستخدم.
    """
    social = {}
    for item in links:
        url = (item.get('url') or '').lower()
        if not url:
            continue
        for key, domains in SOCIAL_DOMAINS.items():
            if key in social:
                continue
            for d in domains:
                if d in url:
                    val = extract_social_username(item.get('url', ''), key)
                    if val:
                        social[key] = val
                    break
    return social


def extract_instagram_from_website(website_url):
    """محاولة استخراج حساب الانستقرام من الموقع الإلكتروني"""
    if not website_url:
        return ""
    # Direct instagram link
    m = re.search(r'instagram\.com/([A-Za-z0-9_.]+)', website_url)
    if m:
        return m.group(1)
    # Linktree or similar
    if 'linktr.ee' in website_url or 'linkin.bio' in website_url:
        return ""  # Would need additional scraping
    return ""


def extract_place_url(page):
    """استخراج رابط المكان على Google Maps"""
    try:
        url = page.url
        if '/maps/place/' in url:
            return url.split('?')[0]  # Clean URL
    except:
        pass
    return ""


def clean_hours_summary(raw):
    """إزالة نصوص زائدة من ساعات العمل (مثل نسخ ساعات العمل)"""
    if not raw or not isinstance(raw, str):
        return raw
    s = raw.strip()
    for suffix in ('،نسخ ساعات العمل', ',نسخ ساعات العمل', '، نسخ ساعات العمل'):
        if s.endswith(suffix):
            s = s[:-len(suffix)].strip().rstrip('،').rstrip(',').strip()
    return s


def infer_district_from_address(address):
    """محاولة استخراج اسم الحي من العنوان"""
    if not address:
        return ""
    # Common Buraidah districts
    districts = [
        'الصفراء', 'النهضة', 'الخليج', 'السالمية', 'الريان', 'المنتزه',
        'الإسكان', 'الفايزية', 'الحمر', 'الأخضر', 'النقع', 'الشماس',
        'الهلالية', 'الوادي', 'العليا', 'الغدير', 'البصيرة', 'الرحمانية',
        'المروج', 'الراشدية', 'قرطبة', 'الطرفية', 'الجردة', 'الأمل',
        'المعالي', 'سلطانة', 'الفيحاء', 'الربيعية', 'الريحانة', 'الجامعيين',
        'النخيل', 'الموطأ', 'الجراد', 'الأثيرية', 'المحمدية',
    ]
    for d in districts:
        if d in address:
            return d
    return ""


# ─── بحث ويب (عند عدم العثور على الخريطة) ───

GOOGLE_SEARCH_BASE = "https://www.google.com/search?q="
PHONE_PATTERNS = [
    re.compile(r'05\d{8}'),           # جوال سعودي
    re.compile(r'011\d{7}'),           # بريدة ثابت
    re.compile(r'\+966\s*5\d{8}'),
    re.compile(r'\+966\s*11\d{7}'),
    re.compile(r'966\s*5\d{8}'),
]


def search_web_for_place(page, place_name, alternate_name=""):
    """
    عند عدم العثور على المكان في الخريطة: بحث ويب (جوجل) لاستخراج هاتف، إنستغرام، تيك توك.
    يُرجع dict: phone, official_instagram, social_links (instagram, tiktok, ...), website.
    """
    out = {'phone': '', 'official_instagram': '', 'website': '', 'social_links': {}}
    queries = [f"{place_name} {CITY_SUFFIX}"]
    if alternate_name:
        queries.append(f"{alternate_name} Buraidah")
    all_links = []
    all_text = ""

    for query in queries[:2]:
        try:
            url = GOOGLE_SEARCH_BASE + quote_plus(query.strip())
            page.goto(url, wait_until='domcontentloaded', timeout=TIMEOUT * 2)
            time.sleep(2.5)
            # جمع الروابط من النتائج
            for a in page.query_selector_all('a[href]'):
                try:
                    href = (a.get_attribute('href') or '').strip()
                    if not href or href.startswith('/search') or 'google.com' in href and 'search' in href:
                        continue
                    if 'instagram.com' in href or 'tiktok.com' in href or 'wa.me' in href or 'tel:' in href:
                        all_links.append(href)
                    if 'instagram.com' in href:
                        m = re.search(r'instagram\.com/([A-Za-z0-9_.]+)', href, re.I)
                        if m and not out['official_instagram']:
                            out['official_instagram'] = m.group(1).strip()
                except Exception:
                    continue
            # نص الصفحة للبحث عن أرقام
            try:
                body = page.query_selector('body')
                if body:
                    all_text += (body.inner_text() or '') + ' '
            except Exception:
                pass
        except Exception:
            continue

    # استخراج هاتف من النص والروابط
    for href in all_links:
        if 'tel:' in href:
            num = re.sub(r'[^\d+]', '', href.replace('tel:', ''))
            if len(num) >= 9 and ('966' in num or num.startswith('05') or num.startswith('011')):
                out['phone'] = num[-9:] if num.startswith('966') else num
                break
    if not out['phone']:
        for pat in PHONE_PATTERNS:
            m = pat.search(all_text)
            if m:
                out['phone'] = m.group(0).replace(' ', '').strip()
                break

    # إنستغرام من الروابط إن لم يُستخرج بعد
    if not out['official_instagram']:
        for href in all_links:
            if 'instagram.com' in href:
                m = re.search(r'instagram\.com/([A-Za-z0-9_.]+)', href, re.I)
                if m:
                    out['official_instagram'] = m.group(1).strip()
                    break

    # تيك توك وحسابات أخرى
    for href in all_links:
        if 'tiktok.com' in href:
            m = re.search(r'tiktok\.com/@([A-Za-z0-9_.]+)', href, re.I)
            if m:
                out['social_links']['tiktok'] = '@' + m.group(1).strip()
                break
    for item in [{'url': u} for u in all_links]:
        extracted = social_from_links([item])
        for k, v in extracted.items():
            if v and k not in out['social_links']:
                out['social_links'][k] = v
    if out['official_instagram'] and 'instagram' not in out['social_links']:
        out['social_links']['instagram'] = out['official_instagram']

    return out


# ─── Main scraper logic ───

def is_maps_place_url(url):
    """التحقق من أن الرابط يشير لصفحة مكان على Google Maps"""
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    return '/maps/place/' in url and 'google.com' in url


def goto_place_by_url(page, reference_url):
    """
    الذهاب مباشرة لصفحة المكان عبر الرابط.
    يُرجع True إذا تم تحميل صفحة مكان بنجاح.
    """
    if not is_maps_place_url(reference_url):
        return False
    try:
        # إزالة أي جزء استعلام زائد قد يسبب إعادة توجيه
        clean_url = reference_url.split('?')[0]
        if '/place/' not in clean_url:
            return False
        page.goto(clean_url, wait_until='domcontentloaded', timeout=TIMEOUT * 2)
        time.sleep(3)  # إعطاء وقت للمحتوى الديناميكي
        if '/maps/place/' in page.url:
            return True
    except PwTimeout:
        pass
    except Exception:
        pass
    return False


def wait_for_place_ready(page, timeout_ms=20000):
    """انتظار ظهور محتوى صفحة المكان قبل الاستخراج"""
    for sel in ['h1', 'h1.DUwDvf', 'div[role="main"]', 'div.F7nice']:
        try:
            page.wait_for_selector(sel, timeout=timeout_ms)
            time.sleep(1.5)
            return True
        except Exception:
            continue
    time.sleep(2)
    return False


def search_place_on_maps(page, place_name, alternate_name="", sector="cafes"):
    """
    البحث عن مكان (مطعم/كافيه) على Google Maps والانتقال لصفحته.
    يُرجع True إذا تم العثور على صفحة المكان.
    """
    # بناء استعلامات البحث حسب القطاع — الأكثر تحديداً أولاً
    queries = []
    if sector == "restaurants":
        if alternate_name:
            queries.append(f"{alternate_name} {CITY_SUFFIX}")
            queries.append(f"{place_name} {alternate_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} مطعم {CITY_SUFFIX}")
        if alternate_name:
            queries.append(f"{alternate_name} مطعم {CITY_SUFFIX}")
    elif sector == "bakeries":
        if alternate_name:
            queries.append(f"{alternate_name} {CITY_SUFFIX}")
            queries.append(f"{place_name} {alternate_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} مخبز {CITY_SUFFIX}")
        if alternate_name:
            queries.append(f"{alternate_name} مخبز {CITY_SUFFIX}")
        queries.append(f"{place_name} bakery {CITY_SUFFIX}")
    elif sector == "roasteries":
        if alternate_name:
            queries.append(f"{alternate_name} {CITY_SUFFIX}")
            queries.append(f"{place_name} {alternate_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} محمصة {CITY_SUFFIX}")
        queries.append(f"{place_name} محامص {CITY_SUFFIX}")
        if alternate_name:
            queries.append(f"{alternate_name} محمصة {CITY_SUFFIX}")
        queries.append(f"{place_name} roastery {CITY_SUFFIX}")
    elif sector == "chocolates":
        if alternate_name:
            queries.append(f"{alternate_name} {CITY_SUFFIX}")
            queries.append(f"{place_name} {alternate_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} شوكولاته {CITY_SUFFIX}")
        queries.append(f"{place_name} شوكولاتة {CITY_SUFFIX}")
        if alternate_name:
            queries.append(f"{alternate_name} شوكولاته {CITY_SUFFIX}")
        queries.append(f"{place_name} chocolate {CITY_SUFFIX}")
    elif sector == "juice-icecream":
        if alternate_name:
            queries.append(f"{alternate_name} {CITY_SUFFIX}")
            queries.append(f"{place_name} {alternate_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} عصير {CITY_SUFFIX}")
        queries.append(f"{place_name} آيس كريم {CITY_SUFFIX}")
        if alternate_name:
            queries.append(f"{alternate_name} عصير {CITY_SUFFIX}")
        queries.append(f"{place_name} juice {CITY_SUFFIX}")
    elif sector == "catering":
        if alternate_name:
            queries.append(f"{alternate_name} {CITY_SUFFIX}")
            queries.append(f"{place_name} {alternate_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} كاترينج {CITY_SUFFIX}")
        queries.append(f"{place_name} تقديم طعام {CITY_SUFFIX}")
        if alternate_name:
            queries.append(f"{alternate_name} كاترينج {CITY_SUFFIX}")
        queries.append(f"{place_name} catering {CITY_SUFFIX}")
    elif sector == "apartments-hotels":
        if alternate_name:
            queries.append(f"{alternate_name} {CITY_SUFFIX}")
            queries.append(f"{place_name} {alternate_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} شقق {CITY_SUFFIX}")
        queries.append(f"{place_name} فندق {CITY_SUFFIX}")
        if alternate_name:
            queries.append(f"{alternate_name} فندق {CITY_SUFFIX}")
        queries.append(f"{place_name} hotel {CITY_SUFFIX}")
        queries.append(f"{place_name} apartments {CITY_SUFFIX}")
    elif sector == "real-estate-offices":
        if alternate_name:
            queries.append(f"{alternate_name} {CITY_SUFFIX}")
            queries.append(f"{place_name} {alternate_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} مكتب عقاري {CITY_SUFFIX}")
        queries.append(f"{place_name} مكاتب عقارية {CITY_SUFFIX}")
        if alternate_name:
            queries.append(f"{alternate_name} مكتب عقاري {CITY_SUFFIX}")
        queries.append(f"{place_name} real estate {CITY_SUFFIX}")
    else:
        # cafes أو أي قطاع آخر
        if alternate_name:
            queries.append(f"{alternate_name} {CITY_SUFFIX}")
            queries.append(f"{place_name} {alternate_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} {CITY_SUFFIX}")
        queries.append(f"{place_name} كوفي {CITY_SUFFIX}")

    for query in queries:
        try:
            encoded = quote_plus(query.strip())
            url = f"{SEARCH_BASE}{encoded}"
            page.goto(url, wait_until='domcontentloaded', timeout=TIMEOUT * 2)
            time.sleep(4)  # انتظار تحميل نتائج البحث (زيادة للمطاعم/البحث العربي)

            if '/maps/place/' in page.url:
                wait_for_place_ready(page)
                return True

            # انتظار ظهور قائمة النتائج ثم النقر على أول نتيجة مكان
            try:
                page.wait_for_selector('a[href*="/maps/place/"]', timeout=12000)
            except Exception:
                pass
            time.sleep(1.5)

            # تفضيل الروابط داخل قائمة النتائج (role=feed) إن وُجدت
            results = page.query_selector_all('div[role="feed"] a[href*="/maps/place/"]')
            if not results:
                results = page.query_selector_all('a[href*="/maps/place/"]')
            if not results:
                continue

            first = results[0]
            href = first.get_attribute('href') or ''
            if '/maps/place/' not in href:
                continue
            first.click()
            for _ in range(10):
                page.wait_for_load_state('domcontentloaded', timeout=3000)
                time.sleep(1)
                if '/maps/place/' in page.url:
                    wait_for_place_ready(page)
                    return True
            if '/maps/place/' in page.url:
                wait_for_place_ready(page)
                return True
        except PwTimeout:
            continue
        except Exception:
            continue

    return False


def scrape_single_cafe(page, cafe_record, use_web_fallback=False):
    """استخراج بيانات كافيه/مطعم واحد — يُرجع dict بالبيانات المستخرجة. use_web_fallback: عند عدم العثور على الخريطة يبحث بالويب (جوجل) عن هاتف وإنستغرام وتيك توك."""
    slug = cafe_record['slug']
    name = cafe_record['name']
    alt_name = cafe_record.get('alternate_name', '') or cafe_record.get('canonical_name_en', '')

    result = {
        'slug': slug,
        'scraped_name': '',
        'phone': '',
        'hours_summary': '',
        'google_rating': 0,
        'google_reviews_count': 0,
        'price_level': '',
        'short_address': '',
        'district': '',
        'reference_url': '',
        'official_instagram': '',
        'website': '',
        'category': '',
        'outdoor_seating': 'unknown',
        'indoor_seating': 'unknown',
        'wifi': 'unknown',
        'parking': 'unknown',
        'family_friendly': 'unknown',
        'desserts': 'unknown',
        'crowd_summary': '',
        'review_snippets': [],
        'photo_urls': [],
        'all_links': [],
        'social_links': {},
        '_found': False,
        '_scraped_at': datetime.now().isoformat(),
        '_web_fallback_used': False,
    }

    # 1) إن وُجد رابط المكان في السجل، الذهاب مباشرة (أدق وأسرع)
    ref_url = (cafe_record.get('reference_url') or '').strip()
    if is_maps_place_url(ref_url):
        if goto_place_by_url(page, ref_url):
            wait_for_place_ready(page)
            result['_found'] = True
    # 2) إن لم يُفتح بالرابط، البحث بالاسم (منطق البحث يعتمد على القطاع)
    if not result['_found']:
        sector = cafe_record.get('sector', 'cafes')
        found = search_place_on_maps(page, name, alt_name, sector=sector)
        if not found:
            # خيار البحث بالويب (جوجل + إنستغرام/تيك توك من النتائج) عند "غير موجود"
            if use_web_fallback:
                web_data = search_web_for_place(page, name, alt_name)
                if web_data.get('phone'):
                    result['phone'] = web_data['phone']
                if web_data.get('official_instagram'):
                    result['official_instagram'] = web_data['official_instagram']
                if web_data.get('social_links'):
                    result['social_links'] = web_data['social_links']
                if web_data.get('website'):
                    result['website'] = web_data['website']
                result['_web_fallback_used'] = True
            return result
        result['_found'] = True

    time.sleep(1)

    # Extract all fields
    result['scraped_name'] = extract_name(page)
    result['phone'] = extract_phone(page)
    result['hours_summary'] = clean_hours_summary(extract_hours(page))

    rating, reviews = extract_rating_reviews(page)
    result['google_rating'] = rating
    result['google_reviews_count'] = reviews

    result['price_level'] = extract_price_level(page)
    result['short_address'] = extract_address(page)
    result['category'] = extract_category(page)
    result['reference_url'] = extract_place_url(page)

    website = extract_website(page)
    result['website'] = website
    result['official_instagram'] = extract_instagram_from_website(website)

    features = extract_features(page)
    result.update(features)

    result['crowd_summary'] = extract_crowd_summary(page)
    result['review_snippets'] = extract_review_snippets(page, max_snippets=2)
    result['photo_urls'] = extract_photo_urls(page, max_photos=2)

    # كل الروابط التي نمر عليها — لأي استفادة الآن أو لاحقاً
    result['all_links'] = extract_all_links(page, max_links=150)
    result['social_links'] = social_from_links(result['all_links'])
    if not result['official_instagram'] and result['social_links'].get('instagram'):
        result['official_instagram'] = result['social_links']['instagram']

    # Try to infer district from address
    addr = result['short_address']
    existing_district = cafe_record.get('district', '')
    if not existing_district or existing_district == 'غير متحقق':
        result['district'] = infer_district_from_address(addr)
    else:
        result['district'] = ''  # Don't overwrite existing

    # Try to click "About" tab for more features
    try:
        about_tab = page.query_selector('button[aria-label*="نبذة"], button[aria-label*="About"]')
        if about_tab:
            about_tab.click()
            time.sleep(2)
            features2 = extract_features(page)
            # Merge: only overwrite 'unknown' values
            for k, v in features2.items():
                if result.get(k) == 'unknown' and v != 'unknown':
                    result[k] = v
    except:
        pass

    return result


def load_progress(progress_file):
    """تحميل التقدم السابق"""
    if progress_file.exists():
        with open(progress_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'done_slugs': [], 'results': []}


def save_progress(progress_file, progress):
    """حفظ التقدم"""
    with open(progress_file, 'w', encoding='utf-8') as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def main():
    parser = argparse.ArgumentParser(description="سكرابنج بيانات الكوفيهات من Google Maps")
    parser.add_argument('--slugs', default='', help='كافيهات محددة (slug1,slug2,...)')
    parser.add_argument('--limit', type=int, default=0, help='حد أقصى لعدد الكافيهات')
    parser.add_argument('--missing', default='', help='سكرابنج الكافيهات التي ينقصها حقل محدد (phone, hours, etc)')
    parser.add_argument('--resume', action='store_true', help='استئناف من آخر نقطة توقف')
    parser.add_argument('--headless', action='store_true', help='تشغيل بدون واجهة (مخفي)')
    parser.add_argument('--delay', type=float, default=0, help='تأخير إضافي بين الطلبات (ثواني)')
    parser.add_argument('--device-id', default='', help='معرّف الجهاز (مثلاً device-1, device-2)؛ المخرجات في outputs/<device-id>/')
    parser.add_argument('--sector', default=DEFAULT_SECTOR, help='قطاع السجلات من master.json (cafes, restaurants, bakeries, roasteries, chocolates, ...) — افتراضي: %s' % DEFAULT_SECTOR)
    parser.add_argument('--only-with-place-url', action='store_true', help='تشغيل السجلات التي لديها reference_url (رابط خريطة) فقط — أنجح وأسرع')
    parser.add_argument('--web-fallback', action='store_true', help='عند "غير موجود" على الخريطة: بحث ويب (جوجل) لاستخراج هاتف وإنستغرام وتيك توك')
    args = parser.parse_args()

    # Load master data
    sector = (args.sector or 'cafes').strip().lower()
    _labels = {'restaurants': ('مطعم', 'مطاعم'), 'bakeries': ('مخبز', 'مخابز'), 'roasteries': ('محمصة', 'محامص'), 'chocolates': ('شوكولاته', 'شوكولاتة'), 'juice-icecream': ('عصير/آيس كريم', 'عصائر وآيس كريم'), 'catering': ('كاترينج', 'كاترينج'), 'apartments-hotels': ('شقق/فندق', 'شقق وفنادق'), 'real-estate-offices': ('مكتب عقاري', 'مكاتب عقارية'), 'cafes': ('كافيه', 'كافيهات')}
    sector_label, sector_plural = _labels.get(sector, ('سجل', 'سجلات'))
    print(f"📂 تحميل master.json...")
    with open(MASTER, 'r', encoding='utf-8') as f:
        master = json.load(f)

    EXCLUDED = {'permanently_closed', 'duplicate', 'archived', 'branch_conflict'}
    cafes = [r for r in master['records']
             if r.get('sector') == sector and r.get('status', '') not in EXCLUDED]
    print(f"   {len(cafes)} {sector_label} نشط (قطاع: {sector})")

    # Filter by slugs
    if args.slugs:
        slug_set = set(s.strip() for s in args.slugs.split(','))
        cafes = [c for c in cafes if c['slug'] in slug_set]
        print(f"   ⏩ تصفية: {len(cafes)} {sector_label} محدد")

    # Filter by missing field
    if args.missing:
        field = args.missing.strip()
        cafes = [c for c in cafes
                 if not c.get(field) or c.get(field) == 'unknown' or c.get(field) == 0]
        print(f"   ⏩ ناقص {field}: {len(cafes)} {sector_label}")

    # Filter: فقط من لديهم رابط مكان (الاعتماد عليه أنجح)
    if args.only_with_place_url:
        cafes = [c for c in cafes if is_maps_place_url((c.get('reference_url') or '').strip())]
        print(f"   ⏩ فقط من لديهم رابط خريطة: {len(cafes)} {sector_label}")
        if not cafes:
            print(f"   ⚠️ لا يوجد {sector_plural} لديها reference_url في master — شغّل بدون --only-with-place-url للاعتماد على البحث بالاسم (أقل نجاحاً).")
            return

    # Setup output dir (جهاز معيّن → outputs/device-1/ أو outputs/device-2/)
    device_id = (args.device_id or '').strip()
    if device_id:
        device_id = re.sub(r'[^\w\-]', '-', device_id).strip('-') or 'device'
    effective_output = (ROOT / "outputs" / device_id) if device_id else OUTPUT_DIR
    effective_output.mkdir(parents=True, exist_ok=True)
    progress_file = effective_output / "scrape-progress.json"
    if device_id:
        print(f"   📂 مخرجات الجهاز: {effective_output}")

    # Resume logic
    progress = load_progress(progress_file) if args.resume else {'done_slugs': [], 'results': []}
    done_set = set(progress['done_slugs'])
    if args.resume and done_set:
        cafes = [c for c in cafes if c['slug'] not in done_set]
        print(f"   ⏩ استئناف: تخطي {len(done_set)} مكتمل، باقي {len(cafes)}")

    # Apply limit
    if args.limit:
        cafes = cafes[:args.limit]
        print(f"   ⏩ حد أقصى: {args.limit} {sector_label}")

    if not cafes:
        print(f"✅ لا يوجد {sector_plural} للسكرابنج!")
        return

    print(f"\n🚀 بدء السكرابنج: {len(cafes)} {sector_label}...")
    print(f"   ⏱️ الوقت المقدر: {len(cafes) * (DELAY_MIN + DELAY_MAX) // 2 // 60} - {len(cafes) * DELAY_MAX // 60} دقيقة")
    print(f"   {'👻 وضع مخفي' if args.headless else '🖥️ وضع مرئي'}")
    print()

    results = progress['results']
    not_found = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=args.headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--lang=ar-SA,ar',
            ]
        )
        context = browser.new_context(
            locale='ar-SA',
            timezone_id='Asia/Riyadh',
            viewport={'width': 1280, 'height': 900},
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        )
        page = context.new_page()

        # Accept cookies if shown
        try:
            page.goto('https://www.google.com/maps', wait_until='networkidle', timeout=TIMEOUT * 2)
            time.sleep(2)
            accept_btn = page.query_selector('button[aria-label*="Accept"], button[aria-label*="قبول"], button:has-text("Accept all")')
            if accept_btn:
                accept_btn.click()
                time.sleep(1)
        except:
            pass

        for i, cafe in enumerate(cafes):
            slug = cafe['slug']
            name = cafe['name']
            alt = cafe.get('alternate_name', '') or ''

            print(f"  [{i+1}/{len(cafes)}] {name} ({slug})", end=' ... ', flush=True)

            try:
                result = scrape_single_cafe(page, cafe, use_web_fallback=args.web_fallback)

                if result['_found']:
                    filled = sum(1 for k, v in result.items()
                                 if k not in ('slug', 'scraped_name', '_found', '_scraped_at', 'website')
                                 and v and v != 'unknown' and v != 0)
                    print(f"✅ ({filled} حقل)")
                    results.append(result)
                else:
                    if result.get('_web_fallback_used') and (result.get('phone') or result.get('official_instagram') or result.get('social_links')):
                        print("🌐 من الويب (هاتف/إنستغرام/تيك توك)")
                        results.append(result)
                    else:
                        print("❌ غير موجود")
                    not_found.append({'slug': slug, 'name': name, 'alternate_name': alt})

                # Update progress
                progress['done_slugs'].append(slug)
                progress['results'] = results
                save_progress(progress_file, progress)

            except Exception as e:
                print(f"⚠️ خطأ: {str(e)[:60]}")
                traceback.print_exc()
                not_found.append({'slug': slug, 'name': name, 'error': str(e)[:100]})

            # Random delay to be polite
            delay = random.uniform(DELAY_MIN, DELAY_MAX) + args.delay
            time.sleep(delay)

        browser.close()

    # ─── Generate outputs ───
    print(f"\n📊 النتائج:")
    print(f"   ✅ تم السكرابنج: {len(results)}")
    print(f"   ❌ غير موجود: {len(not_found)}")

    # Full results
    results_file = effective_output / f"scrape-results-{TODAY}.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"   📁 النتائج الكاملة: {results_file}")

    # Merge-ready output (compatible with merge-contacts.py)
    merge_ready = []
    extra_fields = ['crowd_summary', 'review_snippets', 'photo_urls', 'all_links', 'social_links']
    for r in results:
        # تضمين: وُجد على الخريطة، أو لدينا بيانات من البحث بالويب (--web-fallback)
        if not r['_found']:
            if not r.get('_web_fallback_used'):
                continue
            if not (r.get('phone') or r.get('official_instagram') or (r.get('social_links') and len(r.get('social_links', {})) > 0)):
                continue
        entry = {'slug': r['slug']}
        # Only include non-empty fields
        for field in ['phone', 'official_instagram', 'hours_summary', 'google_rating',
                      'google_reviews_count', 'price_level', 'short_address', 'district',
                      'reference_url', 'outdoor_seating', 'indoor_seating', 'wifi',
                      'parking', 'family_friendly', 'desserts']:
            val = r.get(field)
            if val and val != 'unknown' and val != 0:
                entry[field] = val
        for field in extra_fields:
            val = r.get(field)
            if val and (
                (isinstance(val, list) and len(val) > 0) or
                (isinstance(val, str) and val.strip()) or
                (isinstance(val, dict) and len(val) > 0)
            ):
                entry[field] = val
        if len(entry) > 1:  # Has data beyond slug
            merge_ready.append(entry)

    merge_file = effective_output / f"scrape-merge-ready-{TODAY}.json"
    with open(merge_file, 'w', encoding='utf-8') as f:
        json.dump(merge_ready, f, ensure_ascii=False, indent=2)
    print(f"   📁 جاهز للدمج: {merge_file}")

    # Not found
    if not_found:
        nf_file = effective_output / f"scrape-not-found-{TODAY}.json"
        with open(nf_file, 'w', encoding='utf-8') as f:
            json.dump(not_found, f, ensure_ascii=False, indent=2)
        print(f"   📁 غير موجود: {nf_file}")

    # Stats summary
    print(f"\n📈 ملخص الحقول المستخرجة:")
    field_counts = {}
    for r in results:
        for k, v in r.items():
            if k.startswith('_') or k in ('slug', 'scraped_name', 'website'):
                continue
            if v and v != 'unknown' and v != 0:
                field_counts[k] = field_counts.get(k, 0) + 1
    for field, cnt in sorted(field_counts.items(), key=lambda x: -x[1]):
        print(f"   {field}: {cnt}/{len(results)} ({cnt * 100 // max(len(results), 1)}%)")

    # Clean up progress file
    if progress_file.exists():
        progress_file.unlink()

    # توثيق اكتمال الجلسة في سجل جهاز 1 (للمراجعة عند العودة)
    if device_id == 'device-1' and results:
        try:
            worklog = ROOT / "DEVICE1_WORKLOG.md"
            if worklog.exists():
                with open(worklog, 'r', encoding='utf-8') as f:
                    content = f.read()
                new_line = f"\n| {TODAY} | جلسة اكتملت تلقائياً: {len(results)} {sector_label} مُجلَب. ملف الدمج: `outputs/device-1/scrape-merge-ready-{TODAY}.json` |\n"
                if new_line.strip() not in content:
                    with open(worklog, 'a', encoding='utf-8') as f:
                        f.write(new_line)
        except Exception:
            pass

    print(f"\n💡 للدمج:")
    try:
        merge_path = merge_file.relative_to(ROOT)
    except ValueError:
        merge_path = merge_file
    print(f"   python3 scripts/merge-scraped.py {merge_path}")
    print()


if __name__ == "__main__":
    main()
