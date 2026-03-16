#!/usr/bin/env python3
"""
دمج روابط الخرائط (من find-maps-links.py) في master.json

الاستخدام:
  python scripts/merge-reference-urls.py outputs/maps-links-found-2026-03-16.json
  python scripts/merge-reference-urls.py outputs/maps-links-found-2026-03-16.json --dry-run
  python scripts/merge-reference-urls.py outputs/device-1/maps-links-found-2026-03-16.json
"""

import json
import argparse
from pathlib import Path
from datetime import date

SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT = SCRIPT_DIR.parent
MASTER = ROOT / "master.json"


def main():
    parser = argparse.ArgumentParser(description="دمج reference_url من ملف روابط الخرائط في master.json")
    parser.add_argument("links_file", help="مسار ملف maps-links-found-YYYY-MM-DD.json")
    parser.add_argument("--dry-run", action="store_true", help="عرض التغييرات دون الحفظ")
    args = parser.parse_args()

    links_path = Path(args.links_file)
    if not links_path.is_absolute():
        links_path = ROOT / links_path
    if not links_path.exists():
        print(f"الملف غير موجود: {links_path}")
        return 1

    with open(links_path, "r", encoding="utf-8") as f:
        links = json.load(f)
    if not isinstance(links, dict):
        print("المحتوى يجب أن يكون قاموساً slug -> url")
        return 1

    with open(MASTER, "r", encoding="utf-8") as f:
        data = json.load(f)

    slug_to_index = {}
    for i, rec in enumerate(data["records"]):
        slug_to_index[rec.get("slug")] = i

    updated = 0
    for slug, url in links.items():
        if slug not in slug_to_index:
            continue
        idx = slug_to_index[slug]
        rec = data["records"][idx]
        old = rec.get("reference_url") or ""
        if old == url:
            continue
        rec["reference_url"] = url
        if rec.get("last_updated_at"):
            rec["last_updated_at"] = date.today().isoformat()
        updated += 1
        if args.dry_run:
            print(f"  {slug}: {url[:60]}...")

    print(f"عدد السجلات المحدّثة: {updated}")
    if args.dry_run:
        print("(جاف — لم يُحفظ)")
        return 0
    if updated:
        with open(MASTER, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"تم حفظ master.json")
    return 0


if __name__ == "__main__":
    exit(main())
