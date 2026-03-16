#!/usr/bin/env python3
"""
استيراد روابط/إحداثيات من ملف KML (خرائط جوجل My Maps) ومطابقتها مع كافيهات master.json
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

يقرأ ملف KML ويستخرج <Placemark> مع <name> و <coordinates> (lon,lat,0).
يطابق الأسماء مع سجلات الكافيهات ويبني رابط خرائط: ?q=lat,lon
(فتح الموقع على الخريطة — قد يساعد السكربت أو المستخدم في الوصول لصفحة المكان).

الاستخدام:
  python scripts/import-kml-maps-links.py "path/to/place.kml"
  python scripts/import-kml-maps-links.py مكان.kml --dry-run
  python scripts/import-kml-maps-links.py مكان.kml --output outputs/kml-links.json
"""

import json
import re
import argparse
import unicodedata
from pathlib import Path
from xml.etree import ElementTree as ET

SCRIPT_DIR = Path(__file__).parent.resolve()
ROOT = SCRIPT_DIR.parent
MASTER = ROOT / "master.json"
OUTPUT_DIR = ROOT / "outputs"


def normalize_name(s):
    """تطبيع الاسم للمقارنة: إزالة تشكيل، مسافات زائدة، توحيد الألف."""
    if not s or not isinstance(s, str):
        return ""
    s = s.strip()
    s = re.sub(r"\s*\|\s*.*$", "", s)  # إزالة | والجزء بعده أحياناً
    s = re.sub(r"\s*-\s*.*$", "", s)
    s = re.sub(r"\s+", " ", s)
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return s.strip().lower()


def parse_kml(kml_path):
    """استخراج قائمة (name, lon, lat) من KML. الإحداثيات في KML: lon,lat,0."""
    tree = ET.parse(kml_path)
    root = tree.getroot()
    ns = {"kml": "http://www.opengis.net/kml/2.2"}
    placemarks = root.findall(".//kml:Placemark", ns)
    if not placemarks:
        placemarks = root.findall(".//{http://www.opengis.net/kml/2.2}Placemark")
    if not placemarks:
        placemarks = root.findall(".//Placemark")
    skip_names = {"عنوان القهوة", "مكان", "makan-map", "طبقة بلا عنوان"}
    out = []
    for pm in placemarks:
        name_el = pm.find("kml:name", ns)
        if name_el is None:
            name_el = pm.find("name")
        if name_el is None:
            name_el = pm.find("{http://www.opengis.net/kml/2.2}name")
        if name_el is None:
            continue
        name = (name_el.text or "").strip()
        if not name:
            continue
        if name in skip_names:
            continue
        coords_el = pm.find(".//kml:coordinates", ns)
        if coords_el is None:
            coords_el = pm.find(".//coordinates")
        if coords_el is None:
            coords_el = pm.find(".//{http://www.opengis.net/kml/2.2}coordinates")
        if coords_el is None or not (coords_el.text or "").strip():
            continue
        parts = coords_el.text.strip().replace(",", " ").split()
        if len(parts) >= 2:
            try:
                lon, lat = float(parts[0]), float(parts[1])
                out.append((name, lon, lat))
            except ValueError:
                pass
    return out


def build_maps_url(lat, lon):
    """رابط يفتح الموقع على خرائط جوجل."""
    return f"https://www.google.com/maps?q={lat},{lon}"


def main():
    parser = argparse.ArgumentParser(description="استيراد أسماء وإحداثيات من KML ومطابقتها مع الكافيهات")
    parser.add_argument("kml_file", help="مسار ملف KML")
    parser.add_argument("--output", default="", help="ملف المخرجات (افتراضي: outputs/kml-maps-links-YYYY-MM-DD.json)")
    parser.add_argument("--dry-run", action="store_true", help="عرض المطابقات فقط دون حفظ")
    args = parser.parse_args()

    kml_path = Path(args.kml_file)
    if not kml_path.is_absolute():
        kml_path = ROOT / kml_path
    if not kml_path.exists():
        print(f"الملف غير موجود: {kml_path}")
        return 1

    places = parse_kml(kml_path)
    print(f"عدد المواقع في KML (بعد تصفية): {len(places)}")

    with open(MASTER, "r", encoding="utf-8") as f:
        data = json.load(f)
    excl = {"permanently_closed", "duplicate", "archived", "branch_conflict"}
    cafes = [
        r for r in data["records"]
        if r.get("sector") == "cafes" and r.get("status", "") not in excl
    ]
    # بناء قاموس اسم مطابق -> slug (أول تطابق)
    name_to_slug = {}
    for c in cafes:
        slug = c.get("slug", "")
        for key in ("name", "canonical_name_ar", "alternate_name", "canonical_name_en"):
            val = (c.get(key) or "").strip()
            if not val:
                continue
            n = normalize_name(val)
            if n and n not in name_to_slug:
                name_to_slug[n] = slug
        # اسم مركب من كلمتين أساسيتين
        name_ar = (c.get("name") or c.get("canonical_name_ar") or "").strip()
        if name_ar:
            parts = name_ar.replace("|", " ").replace("-", " ").split()
            if len(parts) >= 2:
                short = " ".join(parts[:2])
                n = normalize_name(short)
                if n and n not in name_to_slug:
                    name_to_slug[n] = slug

    results = {}
    matched_names = set()
    for name, lon, lat in places:
        n = normalize_name(name)
        if not n:
            continue
        slug = name_to_slug.get(n)
        if not slug:
            for key in name_to_slug:
                if n in key or key in n or n[:4] == key[:4]:
                    slug = name_to_slug[key]
                    break
        if slug:
            url = build_maps_url(lat, lon)
            if slug not in results:
                results[slug] = url
            matched_names.add(name)
        elif args.dry_run and len(matched_names) < 30:
            pass  # سنطبع قائمة غير متطابقة لاحقاً

    print(f"عدد المطابقات (slug -> رابط): {len(results)}")

    if args.dry_run:
        for slug, url in list(results.items())[:20]:
            print(f"  {slug}: {url[:55]}...")
        return 0

    out_file = args.output
    if not out_file:
        from datetime import date
        out_file = OUTPUT_DIR / f"kml-maps-links-{date.today()}.json"
    else:
        out_file = Path(out_file)
        if not out_file.is_absolute():
            out_file = ROOT / out_file
    out_file.parent.mkdir(parents=True, exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"تم الحفظ: {out_file}")
    print("لدمج الروابط في master (كـ reference_url أو حقل منفصل) استخدم merge-reference-urls أو دمج يدوي.")
    return 0


if __name__ == "__main__":
    exit(main())
