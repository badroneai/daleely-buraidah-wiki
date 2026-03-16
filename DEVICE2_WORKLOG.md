# سجل عمل الجهاز رقم 2 — Device 2 Work Log

> **الغرض:** توثيق ما ينجزه الجهاز 2 والتعديلات التي يقوم بها، حتى يفهم الجهاز 1 والجهاز الأساسي السياق ويتجنب التضارب.

---

## تعريف الجهاز 2

- **الدور:** جهاز ثانوي للتشغيل/السكرابنج أو المهام الموازية.
- **مجلد المخرجات الخاص:** `outputs/device-2/`
- **طريقة التشغيل:** استخدم دائماً `--device-id device-2` عند تشغيل `scrape-gmaps.py` من هذا الجهاز.

---

## سجل التغييرات والعمل

### 2026-03-16

- **ما تم:**
  - تثبيت المتطلبات على الجهاز 2: `playwright`, `beautifulsoup4`, و `python -m playwright install chromium`.
  - تجربة السكربت على 5 كافيهات بنجاح (`--limit 5 --headless`). النتيجة: 4 نجح، 1 غير موجود (سمراء كافيه).
  - إضافة خيار `--device-id` لسكربت `scripts/scrape-gmaps.py` بحيث يمكن توجيه المخرجات إلى مجلد فرعي مثل `outputs/device-2/`.
  - إنشاء مجلد `outputs/device-2/` لمخرجات هذا الجهاز فقط.
  - إنشاء هذا الملف `DEVICE2_WORKLOG.md` وملف `docs/DEVICES_SETUP.md` لتنسيق العمل بين الأجهزة.

- **ما تم تعديله في الكود (للمراجعة قبل الدمج):**
  - **`scripts/scrape-gmaps.py`:**
    - إضافة وسيط سطر أوامر: `--device-id` (قيمة مثال: `device-2`).
    - عند تحديد `--device-id` تُكتب جميع المخرجات في `outputs/<device-id>/` بدلاً من `outputs/`:
      - `scrape-results-YYYY-MM-DD.json`
      - `scrape-merge-ready-YYYY-MM-DD.json`
      - `scrape-not-found-YYYY-MM-DD.json`
      - `scrape-progress.json` (مؤقت).
    - تحديث رسالة "للدمج" في نهاية التشغيل لتعرض المسار الصحيح لملف الدمج.

- **ملاحظات للجهاز 1/الرئيسي:**
  - المخرجات من تجربة الـ 5 كافيهات الأولى وُضعت في `outputs/` (بدون device-id) لأن الخيار أُضيف لاحقاً. أي تشغيل قادم من الجهاز 2 يجب أن يستخدم `--device-id device-2`.
  - عند الدمج: يمكن دمج ملفات من `outputs/device-2/scrape-merge-ready-*.json` بنفس طريقة `outputs/scrape-merge-ready-*.json` عبر `merge-scraped.py` أو `merge-contacts.py`.

---

## أوامر التشغيل الموصى بها (الجهاز 2)

**طريقة سريعة (PowerShell):** من جذر المشروع:
```powershell
.\scripts\run-scrape-device2.ps1              # تشغيل كامل headless
.\scripts\run-scrape-device2.ps1 -Limit 5      # تجربة 5 كافيهات
.\scripts\run-scrape-device2.ps1 -Resume       # استئناف
```

**أوامر يدوية:**
```powershell
$env:PYTHONIOENCODING = "utf-8"

python scripts/scrape-gmaps.py --device-id device-2 --limit 5 --headless
python scripts/scrape-gmaps.py --device-id device-2 --headless
python scripts/scrape-gmaps.py --device-id device-2 --headless --resume
```

---

## تحديث هذا السجل

عند كل جلسة عمل على الجهاز 2، أضف تحت "سجل التغييرات والعمل":

- التاريخ.
- ما تم تنفيذه (تشغيل سكربت، تحليل، إلخ).
- أي تعديلات على الملفات (مع أسماء الملفات وملخص التعديل).
- ملاحظات للجهاز 1 أو الرئيسي (مثلاً: ملفات جاهزة للدمج، تحذيرات).

---

*آخر تحديث: 2026-03-16*
