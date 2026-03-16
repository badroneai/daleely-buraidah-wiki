# السكربت العام للجلب — قالب لجميع القطاعات

> **الملف:** `scripts/scrape-gmaps.py`  
> سكربت واحد لاستجلاب بيانات أي قطاع من Google Maps (ومعه بحث ويب عند "غير موجود"). يعمل على **الجهاز الأساسي، جهاز 1، وجهاز 2** بنفس الطريقة.

---

## 1. مبدأ العمل

- **السكربت غير مخصص لقطاع واحد:** القطاع يُحدد من سطر الأوامر بـ `--sector`.
- **مصدر القائمة:** `master.json` — السجلات التي فيها `sector == <القطاع>` (مثلاً `cafes` أو `restaurants`).
- **نفس الخيارات لجميع القطاعات:** `--limit`, `--device-id`, `--web-fallback`, `--only-with-place-url`, `--resume`, إلخ.

---

## 2. أوامر موحدة — كافيهات، مطاعم، أي قطاع

### كافيهات (الافتراضي)

```bash
# كل الكافيهات
python scripts/scrape-gmaps.py --sector cafes --headless

# مع بحث ويب عند "غير موجود"
python scripts/scrape-gmaps.py --sector cafes --headless --web-fallback

# من جهاز 2
python scripts/scrape-gmaps.py --sector cafes --device-id device-2 --headless --web-fallback
```

### مطاعم

```bash
# كل المطاعم + بحث ويب عند غير موجود
python scripts/scrape-gmaps.py --sector restaurants --headless --web-fallback

# من جهاز 2
python scripts/scrape-gmaps.py --sector restaurants --device-id device-2 --headless --web-fallback
```

### أي قطاع آخر (من master.json)

استبدل `cafes` أو `restaurants` بقيمة حقل `sector` في master، مثلاً:  
`bakeries`, `pharmacies`, `restaurants`, `cafes`, إلخ.

```bash
python scripts/scrape-gmaps.py --sector <اسم_القطاع> --headless [--web-fallback] [--device-id device-2]
```

---

## 3. أين تعدّل في السكربت عند استجلاب شيء معين

عندما تريد تغيير سلوك السكربت (مدينة، لغة بحث، قطاع افتراضي)، راجع الملف `scripts/scrape-gmaps.py` في المواضع التالية:

| ما تريد تغييره | أين في السكربت |
|-----------------|-----------------|
| **المدينة** المضافة لاستعلام البحث | ثابت `CITY_SUFFIX` (قسم "قالب عام — إعدادات قابلة للتعديل") |
| **القطاع الافتراضي** عند عدم تمرير `--sector` | ثابت `DEFAULT_SECTOR` في نفس القسم |
| **روابط البحث (جوجل ماب)** | `SEARCH_BASE`, `PLACE_BASE` في نفس القسم |
| **صياغة استعلامات البحث** (مثلاً إضافة "مطعم" أو "كافيه") | دالة `search_place_on_maps` — قائمة `queries` حسب `sector` |
| **الحقول المستخرجة** من صفحة المكان | دالة `scrape_single_cafe` و `extract_*` (هاتف، ساعات، تقييم، إلخ) |
| **الحقول التي تُكتب في ملف "جاهز للدمج"** | في `main()` قسم "Merge-ready output" — قائمة `extra_fields` والحقول في الحلقة |

بعد التعديل احفظ الملف وشغّل السكربت كما في القسم 2؛ لا حاجة لتغيير الأمر على الأجهزة الأخرى إذا كان القطاع يُمرّر بـ `--sector`.

---

## 4. الخيارات المشتركة (كل الأجهزة)

| الخيار | المعنى |
|--------|--------|
| `--sector X` | القطاع من master.json (cafes, restaurants, ...) |
| `--limit N` | حد أقصى N سجل (للتجربة) |
| `--device-id device-2` | حفظ المخرجات في `outputs/device-2/` (لجهاز 2) |
| `--only-with-place-url` | تشغيل السجلات التي لديها `reference_url` فقط |
| `--web-fallback` | عند "غير موجود" على الخريطة: بحث ويب (هاتف، إنستغرام، تيك توك) |
| `--resume` | استئناف من آخر نقطة توقف |
| `--headless` | تشغيل بدون نافذة متصفح |

---

## 5. انعكاس على الأجهزة (الأساسي، جهاز 1، جهاز 2)

- **الجهاز الأساسي / جهاز 1:**  
  تشغيل من جذر المشروع بدون `--device-id` (المخرجات في `outputs/`).  
  أو مع `--device-id device-2` إذا كان التشغيل نيابة عن جهاز 2.

- **جهاز 2:**  
  استخدم دائماً `--device-id device-2` حتى تكون المخرجات في `outputs/device-2/` ولا تتضارب مع الجهاز الرئيسي.

- **الجميع:**  
  نفس الأمر ونفس السكربت؛ الفرق فقط في `--device-id` واختيار `--sector`.  
  راجع أيضاً `INSTRUCTIONS_OTHER_DEVICE.md` و `docs/DEVICES_SETUP.md`.

---

## 6. الدمج بعد الجلب

بعد انتهاء السكربت (على أي جهاز):

```bash
# معاينة
python scripts/merge-scraped.py outputs/scrape-merge-ready-YYYY-MM-DD.json --dry-run
# أو من جهاز 2:
python scripts/merge-scraped.py outputs/device-2/scrape-merge-ready-YYYY-MM-DD.json --dry-run

# تنفيذ الدمج
python scripts/merge-scraped.py outputs/device-2/scrape-merge-ready-YYYY-MM-DD.json
```

---

*آخر تحديث: 2026-03-16*
