# تجربة 20 كافيه بدون رابط خريطة (بحث بالاسم + ويب)

> عينة من الكوفيهات التي **ليس لديها reference_url** (أو الرابط غير صالح) — لمعاينة الفروقات عند الاعتماد على البحث بالاسم و**بحث الويب** عند "غير موجود".

---

## 1. الـ 20 كافيه (بدون خريطة في master)

| # | الاسم | slug |
|---|--------|------|
| 1 | سمراء كافيه | samraa-cafe |
| 2 | بريدج | bridge-cafe |
| 3 | تورا | tora-cafe |
| 4 | برين | brain-cafe |
| 5 | دينيز كافيه | diniz-cafe |
| 6 | بِد | bid-cafe |
| 7 | رتم | rtm-cafe |
| 8 | قصال كافيه | qisal-cafe-abdulaziz-fahd-al-rashoudi |
| 9 | قصال كافيه | qisal-cafe-abdulaziz-bin-musaed-bin-jalawi |
| 10 | نهروان كافيه | nahrawan-cafe |
| 11 | المنتصف | al-montasaf-cafe |
| 12 | كورنر كوفي | corner-coffee-safra |
| 13 | سيجما كافيه | sigma-caffe-safra |
| 14 | أرابيكا ستار | arabica-star |
| 15 | خضير | khudair-cafe |
| 16 | قهوة باش المختصة | qahwat-bash-specialty |
| 17 | EIGHTY + | eighty-plus-uthman |
| 18 | هاف مليون | half-million-buraidah |
| 19 | دانكن | dunkin-king-salman-buraidah |
| 20 | فنجان كافيه | fan-jan-cafe-buraidah |

---

## 2. الأمر الذي تم تشغيله

```bash
python scripts/scrape-gmaps.py --sector cafes --slugs "samraa-cafe,bridge-cafe,..." --headless --device-id device-2 --web-fallback
```

(الـ 20 slug كما في الجدول أعلاه.)

---

## 3. أين النتائج بعد انتهاء التشغيل

- **النتائج الكاملة:** `outputs/device-2/scrape-results-YYYY-MM-DD.json`
- **جاهز للدمج:** `outputs/device-2/scrape-merge-ready-YYYY-MM-DD.json`
- **غير موجود:** `outputs/device-2/scrape-not-found-YYYY-MM-DD.json`

**ملاحظة:** إذا كان تاريخ اليوم نفسه قد شُغّل فيه تجربة سابقة، الملفات ستُستبدل بنتائج هذه التجربة (الـ 20 كافيه بدون خريطة).

---

## 4. كيف تعاين الفروقات

1. **قبل:** بيانات الـ 20 في **master.json** (هاتف، إنستغرام، ساعات، إلخ) — كثير منها قد يكون فارغاً لأنهم بدون رابط خريطة.
2. **بعد:** ما خرج في **scrape-results-*.json** و **scrape-merge-ready-*.json** من:
   - **من الخريطة** (✅): إن وُجد بالبحث بالاسم — هاتف، ساعات، تقييم، عنوان، reference_url، إلخ.
   - **من الويب** (🌐): إن لم يُوجد على الخريطة — هاتف، إنستغرام، تيك توك من بحث جوجل.
3. **المقارنة:** قارن لكل slug الحقول في master قبل الدمج مع الحقول في ملف النتائج؛ لاحظ كم حصل على بيانات من الخريطة وكم من الويب فقط.

---

## 5. الطرفية أثناء التشغيل

- **من الخريطة:** يظهر `✅ (N حقل)`.
- **من الويب فقط:** يظهر `🌐 من الويب (هاتف/إنستغرام/تيك توك)`.
- **غير موجود ولا ويب:** يظهر `❌ غير موجود`.

بعد انتهاء التشغيل ستظهر في الطرفية ملخص (تم السكرابنج، غير موجود) ومسارات الملفات.

---

*تاريخ التجربة: 2026-03-16*
