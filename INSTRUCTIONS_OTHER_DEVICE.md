# تعليمات العمل من الجهاز الآخر — دليل بريدة الشامل

> افتح هذا الملف عندما تعمل على المشروع من جهازك الآخر. انسخ محتواه (أو أرفق الملف) للذكاء الاصطناعي هناك ليستمر العمل بناءً على نفس السياق.

**عند فتح المشروع على أي جهاز آخر:** نفّذ أولاً `git pull origin main` (أو `git pull`) لجلب آخر التحديثات من GitHub حتى تظهر الملفات والتعديلات الجديدة.

---

## 1. المشروع

- **الاسم:** دليل بريدة الشامل (Daleely Buraidah Wiki)
- **المسار المحلي:** `daleely-buraidah-wiki-main` (نفس المستودع من GitHub أو نسخة محلية).
- **المستودع:** https://github.com/badroneai/daleely-buraidah-wiki  
- **المعاينة:** https://badroneai.github.io/daleely-buraidah-wiki/

---

## 2. السكربت الرئيسي للجلب (قالب عام — كل القطاعات)

- **الملف:** `scripts/scrape-gmaps.py`
- **الوظيفة:** سكربت **واحد لجميع القطاعات** (كافيهات، مطاعم، أو أي قطاع في master.json). جلب بيانات من Google Maps: هاتف، ساعات، تقييم، عنوان، حي، رابط المكان، إنستغرام، خصائص، تعليقات، صور، **all_links**, **social_links**, crowd_summary. القطاع يُحدد بـ `--sector`.
- **التفاصيل والأوامر لجميع الأجهزة:** اقرأ **`docs/SCRAPER_GENERAL_TEMPLATE.md`**.
- **المتطلبات:**
  ```bash
  pip3 install playwright beautifulsoup4
  python3 -m playwright install chromium
  ```
- **التشغيل — كافيهات (مثل المطاعم، نفس الخيارات):**
  - كل الكافيهات:  
    `python scripts/scrape-gmaps.py --sector cafes --headless`
  - كل الكافيهات + بحث ويب عند "غير موجود":  
    `python scripts/scrape-gmaps.py --sector cafes --headless --web-fallback`
  - تجربة:  
    `python scripts/scrape-gmaps.py --sector cafes --limit 10 --headless`
  - فقط من لديهم رابط خريطة:  
    `python scripts/scrape-gmaps.py --sector cafes --only-with-place-url --headless`
- **التشغيل — مطاعم:**
  - كل المطاعم + بحث ويب عند غير موجود:  
    `python scripts/scrape-gmaps.py --sector restaurants --headless --web-fallback`
  - تجربة:  
    `python scripts/scrape-gmaps.py --sector restaurants --limit 10 --headless --web-fallback`
- **أي قطاع آخر:** استبدل `cafes` أو `restaurants` بقيمة حقل `sector` في master.json (مثلاً `bakeries`, `pharmacies`).
- **عام:** كافيهات محددة `--slugs slug1,slug2`، استئناف `--resume`، ناقص حقل `--missing phone`. كلها تعمل مع أي `--sector`.
- **إذا كنت على جهاز 2:** أضف `--device-id device-2` (أو استخدم `.\scripts\run-scrape-device2.ps1 -Sector cafes` أو `-Sector restaurants -WebFallback`).

---

## 3. المخرجات

- **المجلد:** `outputs/` (أو `outputs/device-2/` عند استخدام `--device-id device-2`).
- **الملفات المهمة (نفسها لأي قطاع):**
  - `scrape-results-YYYY-MM-DD.json` — النتائج الكاملة.
  - `scrape-merge-ready-YYYY-MM-DD.json` — **جاهز لتسليم المختص للدمج** (fill-only في merge).
  - `scrape-not-found-YYYY-MM-DD.json` — الكافيهات التي لم تُعثر لها على صفحة مكان.
  - `scrape-progress.json` — التقدم (يُحذف بعد انتهاء التشغيل).
- **الحقول في المخرجات (منها):** phone, official_instagram, hours_summary, google_rating, google_reviews_count, price_level, short_address, district, reference_url, wifi, parking, desserts, outdoor_seating, family_friendly, review_snippets, photo_urls, crowd_summary, **all_links**, **social_links**.

---

## 4. الدمج

- **السكربت:** `scripts/merge-scraped.py` (الدمج عند المختص).
- **مثال:**  
  `python3 scripts/merge-scraped.py outputs/scrape-merge-ready-YYYY-MM-DD.json --dry-run`  
  ثم بدون `--dry-run` للحفظ. الخيار `--overwrite` يسمح بالكتابة فوق حقول محددة.

---

## 5. بيانات المشروع

- **مصدر الحقيقة:** `master.json` — لا يُعدّل إلا عبر الدمج أو المختص.
- **قطاع الكافيهات النشط:** 254 سجلاً (بدون archived, duplicate, …).
- **منهم 42** لديهم `reference_url` من نوع `/maps/place/` (الفتح المباشر أنجح وأسرع). الباقي يعتمد البحث بالاسم وقد يعطي "غير موجود".

---

## 6. سلوك السكربت (مهم)

- **الأساس:** السكربت يعتمد على **رابط Google Maps للمكان** (`reference_url` يحتوي `/maps/place/`).
- إذا وُجد **رابط المكان** في السجل: يفتح الرابط مباشرة ثم يستخرج الحقول → **أنسب وأسرع** (عادة ينجح).
- إذا **لم يُوجد** الرابط: يبحث بالاسم + "بريدة" وينقر أول نتيجة → **أقل نجاحاً** (كثير يظهر "غير موجود" أو نتيجة خاطئة).
- **عند "غير موجود":** استخدم **`--web-fallback`** فيبحث السكربت في **الويب (جوجل)** ويستخرج من النتائج **هاتف، إنستغرام، تيك توك** ويدرجها في المخرجات للدمج.
- للعمل على السجلات الموثوقة فقط: استخدم **`--only-with-place-url`** (يعمل فقط على من لديهم رابط خريطة).
- التفاصيل الكاملة: اقرأ **`docs/SCRAPER_LOGIC_AND_USAGE.md`** — ما يعمل وماذا تفعل حسب توفر الرابط.
- يحفظ التقدم في `outputs/scrape-progress.json`؛ عند الانقطاع شغّل مع `--resume`.

---

## 7. ما يمكن طلبه من الذكاء الاصطناعي على الجهاز الآخر

- تشغيل السكربت بتوليفة معينة (مثلاً `--limit 5 --headless`).
- إضافة خيار لتشغيل **الـ 42 فقط** (الذين لديهم رابط مكان) لتوفير وقت.
- تحليل مخرجات `scrape-merge-ready-*.json` أو `scrape-results-*.json`.
- تعديلات على السكربت (مثلاً حقول إضافية، فلترة، أو دعم عاملين بمخرجات منفصلة).
- إعداد تعليمات دمج أو توثيق للحقول الجديدة (all_links, social_links) للمختص.

---

## 8. سكربت احترافي (عاملين / استئناف)

- **الملف:** `scripts/scrape-gmaps-pro.py`
- يدعم `--worker-id`, `--shard-count`, `--shard-index` للتشغيل على جهازين بدون تعارض.
- المخرجات لكل عامل في: `outputs/gmaps-pro/<worker-id>/`.

---

## 9. نسخ هذا الملف للذكاء الاصطناعي

عند فتح المشروع على الجهاز الآخر، إما:
- تفتح `INSTRUCTIONS_OTHER_DEVICE.md` وتلصق محتواه في المحادثة، أو
- تقول: "اقرأ ملف INSTRUCTIONS_OTHER_DEVICE.md في المشروع واعمل بناءً عليه [وصف المطلوب]".

---

---

## 10. إذا كنت على جهاز 2

- **مجلد مخرجاتك:** `outputs/device-2/` — استخدم دائماً `--device-id device-2` أو سكربت PowerShell.
- **سكربت جهاز 2 (قالب عام):**  
  `.\scripts\run-scrape-device2.ps1 -Sector cafes` أو `-Sector restaurants -WebFallback` أو `-Sector restaurants -Limit 10 -WebFallback`.
- **سجل عملك:** حدّث ملف `DEVICE2_WORKLOG.md` بعد كل جلسة.
- **للفهم المشترك:** اقرأ `docs/DEVICES_SETUP.md` و `docs/SCRAPER_GENERAL_TEMPLATE.md`.

---

*آخر تحديث: سكربت واحد لجميع القطاعات (قالب عام)، توثيق docs/SCRAPER_GENERAL_TEMPLATE.md، run-scrape-device2.ps1 يدعم -Sector و -WebFallback.*
