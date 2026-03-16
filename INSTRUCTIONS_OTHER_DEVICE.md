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

## 2. السكربت الرئيسي للجلب

- **الملف:** `scripts/scrape-gmaps.py`
- **الوظيفة:** جلب بيانات الكافيهات من Google Maps (بدون API): هاتف، ساعات، تقييم، عنوان، حي، رابط المكان، إنستغرام، خصائص، تعليقان، صورتان، **كل الروابط التي يمر عليها** (`all_links`)، **حسابات التواصل الاجتماعي** (`social_links`)، وصف الازدحام إن وُجد (`crowd_summary`).
- **المتطلبات:**
  ```bash
  pip3 install playwright beautifulsoup4
  python3 -m playwright install chromium
  ```
- **التشغيل:**
  - كل الكافيهات النشطة (254):  
    `python3 scripts/scrape-gmaps.py --headless`
  - تجربة على عدد محدود:  
    `python3 scripts/scrape-gmaps.py --limit 10 --headless`
  - كافيهات محددة:  
    `python3 scripts/scrape-gmaps.py --slugs slug1,slug2 --headless`
  - استئناف بعد انقطاع:  
    `python3 scripts/scrape-gmaps.py --headless --resume`
  - ناقص هاتف فقط:  
    `python3 scripts/scrape-gmaps.py --missing phone --headless`
  - **إذا كنت على جهاز 2:** استخدم دائماً `--device-id device-2` لإنزال المخرجات في `outputs/device-2/` وتجنب التضارب:
    `python scripts/scrape-gmaps.py --device-id device-2 --limit 5 --headless`

---

## 3. المخرجات

- **المجلد:** `outputs/` (أو `outputs/device-2/` عند استخدام `--device-id device-2` على جهاز 2).
- **الملفات المهمة:**
  - `scrape-results-YYYY-MM-DD.json` — النتائج الكاملة لكل كافيه.
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

- إذا وُجد **رابط مكان** (`reference_url` يحتوي `/maps/place/`): يفتح الرابط مباشرة ثم يستخرج الحقول.
- إذا لم يُوجد: يبحث بالاسم + "بريدة" وينقر أول نتيجة (أقل نجاحاً).
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

- **مجلد مخرجاتك:** `outputs/device-2/` — استخدم دائماً: `--device-id device-2` عند تشغيل `scrape-gmaps.py`.
- **سجل عملك:** حدّث ملف `DEVICE2_WORKLOG.md` بعد كل جلسة (ما شغّلته، ما عدّلته، ملاحظات للدمج).
- **للفهم المشترك:** اقرأ `docs/DEVICES_SETUP.md` لمعرفة تنسيق العمل بين الأجهزة.

---

*آخر تحديث: إضافة all_links و social_links، خيار --device-id، ومجلد جهاز 2 والتوثيق.*
