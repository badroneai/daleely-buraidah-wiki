#!/usr/bin/env python3
"""
سكربت البحث في جوجل لملء روابط خرائط الكافيهات التي لا تملك reference_url
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

يبحث عن "اسم الكافيه بريدة خرائط" ويستخرج أول رابط Google Maps ويحفظه.

المتطلبات: playwright (مثبت مسبقاً مع scrape-gmaps.py)

الاستخدام:
  python scripts/find-maps-links.py --headless
  python scripts/find-maps-links.py --limit 20 --headless
  python scripts/find-maps-links.py --device-id device-1 --headless

المخرجات:
  outputs/maps-links-found-YYYY-MM-DD.json  (أو outputs/device-1/ إن وُجد --device-id)
  ثم دمج reference_url في master عبر merge-scraped أو سكربت مخصّص.
"""

import json
import re
import sys
import time
import argparse
import random
from datetime import date
from pathlib import Path
from urllib.parse import unquote, urlparse, parse_qs, quote

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("Install playwright: pip install playwright && playwright install chromium")
    sys.exit(1)

SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT = SCRIPT_DIR.parent
MASTER = ROOT / "master.json"
OUTPUT_DIR = ROOT / "outputs"
TODAY = str(date.today())
DELAY_MIN = 2
DELAY_MAX = 5
TIMEOUT = 15000


def is_maps_place_url(url):
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    return "/maps/place/" in url and "google.com" in url


def extract_maps_url_from_href(href):
    """استخراج رابط خرائط من href (قد يكون عبر redirect جوجل)."""
    if not href or "maps" not in href.lower():
        return None
    try:
        if "google.com/url" in href:
            parsed = urlparse(href)
            q = parse_qs(parsed.query)
            u = q.get("q", q.get("url", []))
            if u:
                href = u[0]
        if "goo.gl" in href:
            return href  # سيعيد التوجيه لاحقاً
        if is_maps_place_url(href):
            return href.split("?")[0].strip()
        if "google.com/maps" in href:
            return href.split("?")[0].strip()
    except Exception:
        pass
    return None


def search_maps_for_place_link(page, cafe_name, alternate_name="", headless=True):
    """بحث في خرائط جوجل (نفس منطق scrape-gmaps) وإرجاع رابط صفحة المكان."""
    city = "بريدة"
    queries = []
    if alternate_name:
        queries.append(f"{alternate_name} {city}")
        queries.append(f"{cafe_name} {alternate_name} {city}")
    queries.append(f"{cafe_name} {city}")
    queries.append(f"{cafe_name} كوفي {city}")

    for query in queries:
        try:
            url = "https://www.google.com/maps/search/" + quote(query)
            page.goto(url, wait_until="domcontentloaded", timeout=TIMEOUT)
            time.sleep(3)
            if "/maps/place/" in page.url:
                return page.url.split("?")[0]
            results = page.query_selector_all('a[href*="/maps/place/"]')
            if results:
                first = results[0]
                href = first.get_attribute("href") or ""
                if href and "/place/" in href:
                    clean = href.split("?")[0]
                    if is_maps_place_url(clean):
                        return clean
                first.click()
                page.wait_for_load_state("domcontentloaded", timeout=TIMEOUT)
                time.sleep(2.5)
                if "/maps/place/" in page.url:
                    return page.url.split("?")[0]
        except Exception as e:
            if not headless:
                print(f"      خطأ: {e}")
            continue
    return None


def main():
    parser = argparse.ArgumentParser(description="البحث في جوجل لملء روابط خرائط الكافيهات")
    parser.add_argument("--limit", type=int, default=0, help="حد أقصى لعدد الكافيهات")
    parser.add_argument("--headless", action="store_true", help="تشغيل بدون واجهة")
    parser.add_argument("--device-id", default="", help="مجلد المخرجات outputs/<device-id>/")
    args = parser.parse_args()

    with open(MASTER, "r", encoding="utf-8") as f:
        data = json.load(f)

    EXCLUDED = {"permanently_closed", "duplicate", "archived", "branch_conflict"}
    cafes = [
        r for r in data["records"]
        if r.get("sector") == "cafes" and r.get("status", "") not in EXCLUDED
    ]
    missing = [
        c for c in cafes
        if not (c.get("reference_url") and "/maps/place/" in (c.get("reference_url") or ""))
    ]
    print(f"كافيهات بدون رابط خريطة: {len(missing)}")

    if args.limit:
        missing = missing[: args.limit]
        print(f"حد أقصى: {args.limit}")

    device_id = (args.device_id or "").strip()
    if device_id:
        device_id = re.sub(r"[^\w\-]", "-", device_id).strip("-") or "device"
    out_dir = (ROOT / "outputs" / device_id) if device_id else OUTPUT_DIR
    out_dir.mkdir(parents=True, exist_ok=True)
    out_file = out_dir / f"maps-links-found-{TODAY}.json"

    results = {}  # فقط روابط تحتوي /maps/place/ تُحفظ
    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=args.headless,
            args=["--disable-blink-features=AutomationControlled", "--no-sandbox", "--lang=ar-SA,ar"],
        )
        context = browser.new_context(
            locale="ar-SA",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        )
        page = context.new_page()
        try:
            page.goto("https://www.google.com/maps", wait_until="domcontentloaded", timeout=TIMEOUT)
            time.sleep(2)
            accept = page.query_selector('button[aria-label*="Accept"], button[aria-label*="قبول"], button:has-text("Accept")')
            if accept:
                accept.click()
                time.sleep(1)
        except Exception:
            pass

        for i, cafe in enumerate(missing):
            slug = cafe["slug"]
            name = cafe.get("name") or cafe.get("canonical_name_ar") or slug
            alt = cafe.get("alternate_name") or cafe.get("canonical_name_en") or ""
            print(f"  [{i+1}/{len(missing)}] {name[:40]} ({slug}) ...", end=" ", flush=True)
            url = search_maps_for_place_link(page, name, alt, headless=args.headless)
            if url and is_maps_place_url(url):
                results[slug] = url
                print("OK")
            else:
                print("—")
            delay = random.uniform(DELAY_MIN, DELAY_MAX)
            time.sleep(delay)

        browser.close()

    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nتم حفظ {len(results)} رابط في: {out_file}")
    print("لدمج reference_url في master.json استخدم سكربت الدمج أو merge-reference-urls.")
    return 0


if __name__ == "__main__":
    main()
