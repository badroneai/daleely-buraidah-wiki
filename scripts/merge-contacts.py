#!/usr/bin/env python3
"""
سكربت دمج بيانات الاتصال — يُشغَّل من الطرفية مباشرة.

الاستخدام:
  python3 scripts/merge-contacts.py batch4.json
  python3 scripts/merge-contacts.py batch4.json --closed rest-cafe-abu-bakr,nistro-cafe
  python3 scripts/merge-contacts.py batch4.json --temp-closed copper-cup-buraidah-rayyan

المدخل: ملف JSON بنفس الصيغة التي يرسلها الباحث:
  [{"slug": "xxx", "phone": "...", "official_instagram": "..."}, ...]

يقوم السكربت بـ:
  1. دمج الهواتف والانستقرام (fill-only — لا يكتب فوق القيم الموجودة)
  2. تحديث الثقة
  3. مزامنة cafes.json
"""

import json, sys, os, argparse
from datetime import date

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
MASTER = os.path.join(ROOT, "master.json")
CAFES = os.path.join(ROOT, "daleely-buraidah-site", "data", "cafes.json")
TODAY = str(date.today())

def is_empty(val):
    return val is None or (isinstance(val, str) and val.strip() == "")

def count_filled(rec):
    fields = ["phone","official_instagram","hours_summary","google_rating",
              "google_reviews_count","price_level","outdoor_seating","work_friendly",
              "group_friendly","late_night","specialty_coffee","desserts",
              "quietness","crowd_level","place_personality","best_visit_time",
              "why_choose_it","not_for_whom","editorial_summary","short_address",
              "district","reference_url"]
    return sum(1 for f in fields if f in rec and not is_empty(rec[f]) and rec[f] != "unknown" and rec[f] != 0)

def calc_conf(c):
    if c < 5: return "low"
    elif c <= 9: return "medium"
    return "high"

def sync_cafes(master):
    EXCLUDED = {"permanently_closed", "duplicate", "archived", "branch_conflict"}
    qm = {"هادئ": "high", "متوسط": "medium", "صاخب": "low", "unknown": "unknown", "": "unknown"}
    cm = {"مرتفع": "high", "متوسط": "medium", "منخفض": "low", "unknown": "unknown", "": "unknown"}

    cafe_recs = [r for r in master['records'] if r.get('sector') == 'cafes' and r.get('status', '') not in EXCLUDED]
    cafes = []
    for r in cafe_recs:
        q = r.get("quietness", "unknown") or "unknown"
        c = r.get("crowd_level", "unknown") or "unknown"
        rating = r.get("google_rating", 0)
        if rating is None or rating == "" or rating == "unknown": rating = 0
        reviews = r.get("google_reviews_count", 0)
        if reviews is None or reviews == "" or reviews == "unknown": reviews = 0
        cafes.append({
            "id": r.get("slug",""), "name": r.get("name",""),
            "nameEn": r.get("alternate_name","") or r.get("canonical_name_en",""),
            "district": r.get("district",""), "category": r.get("category",""),
            "rating": float(rating) if rating else 0, "reviewsCount": int(reviews) if reviews else 0,
            "priceLevel": r.get("price_level","") or "", "address": r.get("short_address","") or "",
            "phone": r.get("phone","") or "", "instagram": r.get("official_instagram","") or "",
            "hours": r.get("hours_summary","") or "", "summary": r.get("editorial_summary","") or "",
            "status": r.get("status",""), "confidence": r.get("confidence",""),
            "referenceUrl": r.get("reference_url","") or "",
            "features": {
                "wifi": r.get("wifi","unknown") or "unknown", "outdoorSeating": r.get("outdoor_seating","unknown") or "unknown",
                "indoorSeating": r.get("indoor_seating","unknown") or "unknown", "parking": r.get("parking","unknown") or "unknown",
                "familyFriendly": r.get("family_friendly","unknown") or "unknown", "specialtyCoffee": r.get("specialty_coffee","unknown") or "unknown",
                "desserts": r.get("desserts","unknown") or "unknown", "lateNight": r.get("late_night","unknown") or "unknown",
                "groupFriendly": r.get("group_friendly","unknown") or "unknown",
            },
            "personality": r.get("place_personality","") or "", "bestTime": r.get("best_visit_time","") or "",
            "whyChoose": r.get("why_choose_it","") or "", "notFor": r.get("not_for_whom","") or "",
            "quietness": q if q in ("high","medium","low") else qm.get(q, q),
            "crowdLevel": c if c in ("high","medium","low") else cm.get(c, c),
        })
    return cafes


def main():
    parser = argparse.ArgumentParser(description="دمج بيانات الاتصال في master.json")
    parser.add_argument("input", help="ملف JSON من الباحث")
    parser.add_argument("--closed", default="", help="slugs مغلقة نهائياً (مفصولة بفاصلة)")
    parser.add_argument("--temp-closed", default="", help="slugs مغلقة مؤقتاً (مفصولة بفاصلة)")
    args = parser.parse_args()

    closed_set = set(s.strip() for s in args.closed.split(",") if s.strip())
    temp_set = set(s.strip() for s in args.temp_closed.split(",") if s.strip())

    with open(args.input, 'r', encoding='utf-8') as f:
        batch = json.load(f)

    with open(MASTER, 'r', encoding='utf-8') as f:
        master = json.load(f)

    slug_index = {r['slug']: i for i, r in enumerate(master['records'])}

    new_phones = 0
    new_instas = 0
    closed_count = 0
    temp_count = 0

    print(f"\n📱 دمج {len(batch)} سجل...")

    for entry in batch:
        slug = entry['slug']
        if slug not in slug_index:
            print(f"  ⚠️ {slug}: غير موجود!")
            continue

        rec = master['records'][slug_index[slug]]

        if slug in closed_set and rec.get('status') != 'permanently_closed':
            rec['status'] = 'permanently_closed'
            rec['source_notes'] = (rec.get('source_notes','') + "; مغلق نهائياً (أفاد الباحث)").strip('; ')
            rec['last_updated_at'] = TODAY
            closed_count += 1
            print(f"  🚫 {slug}: → permanently_closed")
            continue

        if slug in temp_set and rec.get('status') != 'temporarily_closed':
            rec['status'] = 'temporarily_closed'
            rec['source_notes'] = (rec.get('source_notes','') + "; مغلق مؤقتاً (أفاد الباحث)").strip('; ')
            temp_count += 1
            print(f"  ⏸️ {slug}: → temporarily_closed")

        phone = entry.get('phone', '').strip()
        if phone and is_empty(rec.get('phone', '')):
            rec['phone'] = phone
            new_phones += 1
            print(f"  📞 {slug}: {phone}")

        insta = entry.get('official_instagram', '').strip()
        if insta and is_empty(rec.get('official_instagram', '')):
            rec['official_instagram'] = insta
            new_instas += 1
            print(f"  📸 {slug}: {insta}")

        rec['confidence'] = calc_conf(count_filled(rec))
        rec['last_updated_at'] = TODAY

    # Save
    with open(MASTER, 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)

    cafes = sync_cafes(master)
    with open(CAFES, 'w', encoding='utf-8') as f:
        json.dump(cafes, f, ensure_ascii=False, indent=2)

    print(f"\n✅ تم!")
    print(f"  📞 هواتف جديدة: {new_phones}")
    print(f"  📸 انستقرام جديد: {new_instas}")
    print(f"  🚫 مغلق نهائياً: {closed_count}")
    print(f"  ⏸️ مغلق مؤقتاً: {temp_count}")
    print(f"  📊 cafes.json: {len(cafes)} سجل")


if __name__ == "__main__":
    main()
