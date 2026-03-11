# Patch Apply Tool — Minimal Version

## الهدف
تطبيق ملفات `patch.json` الناتجة من الويكي على:
- `data/master.json`
- `data/master.csv`

بدون دمج يدوي.

## صيغة patch المدعومة
```json
{
  "slug": "samraa-cafe",
  "exported_at": "2026-03-11T22:00:00.000Z",
  "patch": {
    "district": "النهضة",
    "official_instagram": "https://instagram.com/example"
  }
}
```

ويمكن بدل `slug` استخدام:
```json
{
  "match": {
    "canonical_name_en": "Samraa Cafe",
    "branch_label": "main"
  },
  "patch": {
    "district": "النهضة"
  }
}
```

## التشغيل
من داخل `projects/daleely-buraidah`:

```powershell
python apply_patch.py path\to\record.patch.json
```

مع معاينة فقط بدون كتابة:

```powershell
python apply_patch.py path\to\record.patch.json --dry-run
```

## ماذا يفعل
1. يقرأ ملف `patch.json`
2. يطابق السجل عبر `slug` أو `match`
3. يطبق الحقول المعدلة فقط
4. يحدّث `data/master.json`
5. يعيد توليد `data/master.csv`

## ملاحظات
- إذا لم يجد السجل سيتوقف
- إذا كان `match` يطابق أكثر من سجل سيتوقف
- لا يضيف سجلات جديدة
- لا يغير schema
