#!/usr/bin/env python3
"""
سكربت دمج بيانات السكرابنج — يدمج مخرجات scrape-gmaps.py في master.json

الاستخدام:
  python3 scripts/merge-scraped.py outputs/scrape-merge-ready-2026-03-16.json
  python3 scripts/merge-scraped.py outputs/scrape-merge-ready-2026-03-16.json --dry-run
  python3 scripts/merge-scraped.py outputs/scrape-merge-ready-2026-03-16.json --overwrite rating

الفرق عن merge-contacts.py:
  - يدعم كل الحقول (هاتف، ساعات، تقييم، عنوان، حي، مصدر، خصائص...)
  - fill-only افتراضياً (لا يكتب فوق القيم الموجودة)
  - --overwrite يسمح بالكتابة فوق حقول محددة
  - --dry-run لمعاينة التغييرات بدون حفظ
"""

import json, sys, os, argparse
from datetime import date

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SCRIPT_DIR)
MASTER = os.path.join(ROOT, "master.json")
CAFES = os.path.join(ROOT, "daleely-buraidah-site", "data", "cafes.json")
TODAY = str(date.today())

# All mergeable fields from the scraper
MERGEABLE_FIELDS = [
    'phone', 'official_instagram', 'hours_summary',
    'google_rating', 'google_reviews_count', 'price_level',
    'short_address', 'district', 'reference_url',
    'outdoor_seating', 'indoor_seating', 'wifi',
    'parking', 'family_friendly', 'desserts',
]

# Numeric fields (treat 0 as empty)
NUMERIC_FIELDS = {'google_rating', 'google_reviews_count'}

# Feature fields (treat 'unknown' as empty)
FEATURE_FIELDS = {'outdoor_seating', 'indoor_seating', 'wifi', 'parking', 'family_friendly', 'desserts'}


def is_empty(val, field=""):
    """Check if a value should be considered empty/missing"""
    if val is None:
        return True
    if isinstance(val, str) and val.strip() in ('', 'unknown'):
        return True
    if field in NUMERIC_FIELDS and (val == 0 or val == '0'):
        return True
    return False


def count_filled(rec):
    """Count filled fields for confidence calculation"""
    fields = ["phone", "official_instagram", "hours_summary", "google_rating",
              "google_reviews_count", "price_level", "outdoor_seating", "work_friendly",
              "group_friendly", "late_night", "specialty_coffee", "desserts",
              "quietness", "crowd_level", "place_personality", "best_visit_time",
              "why_choose_it", "not_for_whom", "editorial_summary", "short_address",
              "district", "reference_url"]
    return sum(1 for f in fields if f in rec and not is_empty(rec[f], f) and rec[f] != "unknown" and rec[f] != 0)


def calc_conf(c):
    if c < 5: return "low"
    elif c <= 9: return "medium"
    return "high"


def sync_cafes(master):
    """Sync cafes.json (same as merge-contacts.py)"""
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
            "id": r.get("slug", ""), "name": r.get("name", ""),
            "nameEn": r.get("alternate_name", "") or r.get("canonical_name_en", ""),
            "district": r.get("district", ""), "category": r.get("category", ""),
            "rating": float(rating) if rating else 0, "reviewsCount": int(reviews) if reviews else 0,
            "priceLevel": r.get("price_level", "") or "", "address": r.get("short_address", "") or "",
            "phone": r.get("phone", "") or "", "instagram": r.get("official_instagram", "") or "",
            "hours": r.get("hours_summary", "") or "", "summary": r.get("editorial_summary", "") or "",
            "status": r.get("status", ""), "confidence": r.get("confidence", ""),
            "referenceUrl": r.get("reference_url", "") or "",
            "features": {
                "wifi": r.get("wifi", "unknown") or "unknown",
                "outdoorSeating": r.get("outdoor_seating", "unknown") or "unknown",
                "indoorSeating": r.get("indoor_seating", "unknown") or "unknown",
                "parking": r.get("parking", "unknown") or "unknown",
                "familyFriendly": r.get("family_friendly", "unknown") or "unknown",
                "specialtyCoffee": r.get("specialty_coffee", "unknown") or "unknown",
                "desserts": r.get("desserts", "unknown") or "unknown",
                "lateNight": r.get("late_night", "unknown") or "unknown",
                "groupFriendly": r.get("group_friendly", "unknown") or "unknown",
            },
            "personality": r.get("place_personality", "") or "",
            "bestTime": r.get("best_visit_time", "") or "",
            "whyChoose": r.get("why_choose_it", "") or "",
            "notFor": r.get("not_for_whom", "") or "",
            "quietness": q if q in ("high", "medium", "low") else qm.get(q, q),
            "crowdLevel": c if c in ("high", "medium", "low") else cm.get(c, c),
        })
    return cafes


def main():
    parser = argparse.ArgumentParser(description="دمج بيانات السكرابنج في master.json")
    parser.add_argument("input", help="ملف JSON من السكرابر")
    parser.add_argument("--dry-run", action="store_true", help="معاينة فقط بدون حفظ")
    parser.add_argument("--overwrite", default="", help="حقول يُسمح بالكتابة فوقها (مفصولة بفاصلة)")
    args = parser.parse_args()

    overwrite_fields = set(s.strip() for s in args.overwrite.split(",") if s.strip())

    with open(args.input, 'r', encoding='utf-8') as f:
        batch = json.load(f)

    with open(MASTER, 'r', encoding='utf-8') as f:
        master = json.load(f)

    slug_index = {r['slug']: i for i, r in enumerate(master['records'])}

    # Track changes per field
    changes = {f: 0 for f in MERGEABLE_FIELDS}
    skipped = {f: 0 for f in MERGEABLE_FIELDS}
    not_found = 0
    updated_slugs = 0

    print(f"\n📦 دمج {len(batch)} سجل من السكرابر...")
    if args.dry_run:
        print("   ⚠️ وضع المعاينة — لن يتم الحفظ")
    if overwrite_fields:
        print(f"   🔄 الكتابة فوق: {', '.join(overwrite_fields)}")

    for entry in batch:
        slug = entry['slug']
        if slug not in slug_index:
            print(f"  ⚠️ {slug}: غير موجود في master!")
            not_found += 1
            continue

        rec = master['records'][slug_index[slug]]
        rec_changed = False

        for field in MERGEABLE_FIELDS:
            new_val = entry.get(field)
            if is_empty(new_val, field):
                continue

            old_val = rec.get(field)
            can_write = is_empty(old_val, field) or field in overwrite_fields

            if can_write:
                # Cast numeric fields
                if field in NUMERIC_FIELDS:
                    try:
                        new_val = float(new_val) if field == 'google_rating' else int(new_val)
                    except (ValueError, TypeError):
                        continue

                rec[field] = new_val
                changes[field] += 1
                rec_changed = True
                if args.dry_run:
                    old_display = repr(old_val)[:30] if old_val else '(فارغ)'
                    print(f"  📝 {slug}.{field}: {old_display} → {repr(new_val)[:40]}")
            else:
                skipped[field] += 1

        if rec_changed:
            rec['confidence'] = calc_conf(count_filled(rec))
            rec['last_updated_at'] = TODAY
            updated_slugs += 1

    # Summary
    print(f"\n📊 ملخص التغييرات:")
    total_changes = 0
    for field in MERGEABLE_FIELDS:
        c = changes[field]
        s = skipped[field]
        if c or s:
            print(f"  {field}: +{c} جديد, {s} تخطي")
            total_changes += c

    print(f"\n  📍 سجلات محدّثة: {updated_slugs}")
    print(f"  📝 حقول جديدة: {total_changes}")
    print(f"  ⚠️ غير موجود: {not_found}")

    if args.dry_run:
        print(f"\n⚠️ وضع المعاينة — لم يتم الحفظ!")
        print(f"   أزل --dry-run للحفظ الفعلي")
        return

    # Save
    with open(MASTER, 'w', encoding='utf-8') as f:
        json.dump(master, f, ensure_ascii=False, indent=2)
    print(f"\n💾 تم حفظ master.json")

    cafes = sync_cafes(master)
    with open(CAFES, 'w', encoding='utf-8') as f:
        json.dump(cafes, f, ensure_ascii=False, indent=2)
    print(f"💾 تم حفظ cafes.json ({len(cafes)} سجل)")

    print(f"\n✅ تم الدمج بنجاح!")


if __name__ == "__main__":
    main()
