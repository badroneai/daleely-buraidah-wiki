# قائمة الكوفيهات التي تحتاج إثراء - دليل بريدة الشامل

> **إجمالي:** 306 كوفيه من 307 تحتاج بيانات إضافية
> **عدد الدفعات:** 11
> **المدينة:** بريدة، القصيم، السعودية

---

## الحقول المطلوبة وشرحها

| # | الحقل | الشرح | مثال |
|---|-------|-------|------|
| 1 | phone | رقم الهاتف (صيغة سعودية) | 0163XXXXXX أو 05XXXXXXXX |
| 2 | official_instagram | حساب الانستقرام بدون @ | coffeeshop_buraydah |
| 3 | hours_summary | ملخص ساعات العمل | يومياً 6ص-12م أو السبت-الخميس 7ص-11م |
| 4 | reference_url | رابط خرائط قوقل أو موقع رسمي | https://maps.app.goo.gl/xxx |
| 5 | google_rating | تقييم قوقل (1.0-5.0) | 4.3 |
| 6 | google_reviews_count | عدد مراجعات قوقل | 250 |
| 7 | price_level | مستوى السعر | رخيص / متوسط / غالي / فاخر |
| 8 | outdoor_seating | جلسات خارجية | yes / no |
| 9 | work_friendly | مناسب للعمل/الدراسة | yes / no |
| 10 | group_friendly | مناسب للمجموعات | yes / no |
| 11 | late_night | يفتح لوقت متأخر (بعد 12م) | yes / no |
| 12 | specialty_coffee | يقدم قهوة مختصة | yes / no |
| 13 | desserts | يقدم حلويات/معجنات | yes / no |
| 14 | quietness | مستوى الهدوء | هادئ / متوسط / صاخب |
| 15 | crowd_level | مستوى الازدحام | منخفض / متوسط / مرتفع |
| 16 | place_personality | شخصية المكان (جملة قصيرة) | كافيه عصري بأجواء مريحة |
| 17 | best_visit_time | أفضل وقت للزيارة | الصباح الباكر / المساء / عطلة نهاية الأسبوع |
| 18 | why_choose_it | لماذا تختار هذا المكان | قهوة مختصة ممتازة وأجواء هادئة للعمل |
| 19 | not_for_whom | غير مناسب لمن | يبحث عن أكل متنوع / العائلات الكبيرة |

---

## صيغة الإرجاع المطلوبة

أرجع النتائج بصيغة JSON كالتالي:

```json
[
  {
    "slug": "cafe-slug-here",
    "phone": "05XXXXXXXX",
    "official_instagram": "account_name",
    "hours_summary": "يومياً 6ص-12م",
    "google_rating": 4.3,
    "google_reviews_count": 250,
    "price_level": "متوسط",
    "outdoor_seating": "yes",
    "work_friendly": "yes",
    "specialty_coffee": "yes"
  }
]
```

**قواعد مهمة:**
- اترك الحقل فارغاً `""` إذا لم تجد معلومة مؤكدة
- لا تخمن — فقط البيانات المؤكدة من مصادر موثوقة
- أرقام الهواتف بالصيغة السعودية فقط
- حساب الانستقرام بدون @
- حقول yes/no فقط yes أو no

---

## الدفعة 1 من 11 (30 كوفيه)

### 1. جينوفيت كافيه
- **slug:** `ginovetti-cafe-buraidah`
- **الحي:** الصفراء
- **الثقة الحالية:** low
- **الحقول الناقصة (19):** phone، official_instagram، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 2. كِفه كافيه
- **slug:** `kifa-cafe-buraidah`
- **الحي:** المركز
- **الثقة الحالية:** low
- **الحقول الناقصة (19):** phone، official_instagram، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 3. ليبرتي كافيه
- **slug:** `liberty-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** low
- **الحقول الناقصة (19):** phone، official_instagram، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 4. كاثا كافيه
- **slug:** `katha-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** low
- **الحقول الناقصة (19):** phone، official_instagram، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 5. كوفي كنن
- **slug:** `kin-coffee-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** low
- **الحقول الناقصة (19):** phone، official_instagram، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 6. جاب كافيه
- **slug:** `gap-cafe-buraidah`
- **الحي:** المركز
- **الثقة الحالية:** low
- **الحقول الناقصة (19):** phone، official_instagram، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 7. بيور دايموند كافيه
- **slug:** `pure-diamond-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** low
- **الحقول الناقصة (19):** phone، official_instagram، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 8. كوفي آن
- **slug:** `coffee-an-buraidah`
- **الحي:** المركز
- **الثقة الحالية:** low
- **الحقول الناقصة (19):** phone، official_instagram، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 9. Footing cafe
- **slug:** `footing-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 10. خضير
- **slug:** `khudair-cafe`
- **الحي:** السالمية
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 11. ريست كافيه
- **slug:** `rest-cafe-abu-bakr`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 12. نيسترو
- **slug:** `nistro-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 13. مقهى ألوان
- **slug:** `maqha-alwan`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 14. قست كافيه
- **slug:** `guest-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 15. راوند كافيه
- **slug:** `round-cafe-qurtubah-buraidah`
- **الحي:** قرطبة
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 16. ذكرى كافيه
- **slug:** `thekra-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 17. سيمبري كافية
- **slug:** `simpri-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** low
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 18. فيض كافيه
- **slug:** `fayd-cafe-buraidah-rayyan`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 19. كفي آن
- **slug:** `kefi-an-buraidah-rahab`
- **الحي:** الرحاب
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 20. دار كيف
- **slug:** `dar-keif-buraidah-ufuq`
- **الحي:** الأفق
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 21. وي كافيه
- **slug:** `way-cafe-buraidah-ufuq`
- **الحي:** الأفق
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 22. T Twin Cafe
- **slug:** `ttwin-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 23. باي مربّع
- **slug:** `murabba-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 24. مستر سول
- **slug:** `mrsul-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 25. باربوكا
- **slug:** `barbuca-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 26. أتراكتف
- **slug:** `attractive-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 27. بُرهة كافيه
- **slug:** `barhah-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 28. Pause Cafe
- **slug:** `pause-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 29. ثُلة كافيه
- **slug:** `thulah-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 30. افيكتو
- **slug:** `eficto-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

---

## الدفعة 2 من 11 (30 كوفيه)

### 31. بروسل
- **slug:** `brosel-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 32. سلة الزهور
- **slug:** `basket-flowers-buraidah`
- **الحي:** الصفراء
- **الثقة الحالية:** medium
- **الحقول الناقصة (18):** phone، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 33. كوفي رمد
- **slug:** `rmd-coffee`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 34. قهوة لاح
- **slug:** `lah-coffee`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 35. ناي كافيه نسائي
- **slug:** `nai-women-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 36. زونيس
- **slug:** `zonice-buraidah-1`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 37. زونيس
- **slug:** `zonice-buraidah-2`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 38. زونيس
- **slug:** `zonice-buraidah-3`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 39. قهوة باش المختصة
- **slug:** `qahwat-bash-specialty`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 40. بوردقا
- **slug:** `bordga-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 41. مزار
- **slug:** `mazar-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 42. كوب القهوة
- **slug:** `kob-alqahwa-1`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 43. كوب القهوة
- **slug:** `kob-alqahwa-2`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 44. فن. جن. كيف
- **slug:** `fan-jan-kaif-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 45. بلي
- **slug:** `ble-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 46. أڤار كافيه
- **slug:** `avar-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 47. خور كافيه
- **slug:** `khawr-cafe-buraidah`
- **الحي:** الإسكان
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 48. ANOTHERSIDE CAFE
- **slug:** `another-side-cafe-buraidah`
- **الحي:** المونسية
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 49. فيلوتشي
- **slug:** `vellucci-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 50. قهوة أرتال
- **slug:** `artal-cafe-buraidah`
- **الحي:** السلطانة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 51. فايند آن
- **slug:** `find-ann-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 52. حوار كافيه
- **slug:** `hiwar-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 53. بريو كافيه
- **slug:** `brio-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 54. لابيوما كافيه
- **slug:** `labioma-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 55. برت
- **slug:** `berrt-cafe-qurtubah-buraidah`
- **الحي:** قرطبة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 56. مدوّر
- **slug:** `mudawwar-cafeteria-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 57. أود
- **slug:** `ode-caffe-buraidah-rayyan`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 58. كوفيكا
- **slug:** `koffiqa-buraidah-rayyan`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 59. FUZT
- **slug:** `fuzt-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 60. إلكت
- **slug:** `elct-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

---

## الدفعة 3 من 11 (30 كوفيه)

### 61. قهوة عبارة
- **slug:** `ebarah-coffee-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 62. نَدر كافية
- **slug:** `nadr-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 63. قهوة أسو
- **slug:** `aso-coffee-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 64. وودز
- **slug:** `woods-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 65. نبا كافيه
- **slug:** `naba-cafe-buraidah`
- **الحي:** شمال بريدة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 66. إمز
- **slug:** `ems-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 67. كافيه مدينتي الجديدة
- **slug:** `new-city-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 68. نوى
- **slug:** `nawa-cafe-sultanah-buraidah`
- **الحي:** السلطانة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 69. Salire Roastery
- **slug:** `salire-roastery-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 70. بونك
- **slug:** `bonak-coffee-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 71. بيد كافيه
- **slug:** `bid-cafe-opening-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 72. ليتس بيك كافيه
- **slug:** `lets-bake-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 73. سيلكا
- **slug:** `silka-coffee-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 74. نخلا
- **slug:** `nakhla-cafe-buraidah`
- **الحي:** جنوب بريدة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 75. بيك رول
- **slug:** `bakeroll-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 76. أكمي
- **slug:** `akmi-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 77. Luxury Picks
- **slug:** `luxury-picks-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** low
- **الحقول الناقصة (17):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 78. فناة كافيه
- **slug:** `fanaa-cafe-buraidah`
- **الحي:** السلطانة
- **الثقة الحالية:** medium
- **الحقول الناقصة (17):** phone، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 79. كافيه فان هوت
- **slug:** `cafe-van-houtte-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 80. استكنان كافيه
- **slug:** `estknan-coffee-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 81. علياء كافيه
- **slug:** `alia-caffee-buraidah`
- **الحي:** الأفق
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 82. ELEVEN CAFE
- **slug:** `eleven-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 83. ڤيو كافيه
- **slug:** `view-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، hours_summary، google_rating، google_reviews_count، price_level، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 84. لوستير كافيه
- **slug:** `luster-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، google_rating، google_reviews_count، price_level، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 85. آبي
- **slug:** `appy-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 86. ابريس كافيه
- **slug:** `apres-cafe-buraidah-nahdah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 87. تاوة زمان
- **slug:** `tawat-zaman-buraidah-rayyan`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time، why_choose_it، not_for_whom

### 88. رانسي
- **slug:** `ranci-buraidah-rayyan`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 89. جِوار
- **slug:** `jewar-cafe-buraidah-rayyan`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 90. متش
- **slug:** `match-cafe-buraidah-rahab`
- **الحي:** الرحاب
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

---

## الدفعة 4 من 11 (30 كوفيه)

### 91. كورنر كوفي
- **slug:** `corner-coffee-safra-2`
- **الحي:** الصفراء
- **الثقة الحالية:** low
- **الحقول الناقصة (16):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 92. بيرنر
- **slug:** `burner-cafe-west-buraidah`
- **الحي:** غرب بريدة
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 93. فيلوتشي كافيه
- **slug:** `veloce-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 94. XOXO Cafe Roastery
- **slug:** `xoxo-cafe-roastery-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 95. SUM Cafe
- **slug:** `sum-cafe-qurtubah-buraidah-2`
- **الحي:** قرطبة
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، work_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 96. أورفيل
- **slug:** `orvel-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 97. أوان
- **slug:** `awan-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 98. كوزيت
- **slug:** `cosette-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 99. بلسم الأفق
- **slug:** `balsam-alufuq-buraidah`
- **الحي:** الأفق
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 100. جراي كافيه
- **slug:** `gray-cafe-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** low
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 101. جويا
- **slug:** `joya-cafe-buraidah`
- **الحي:** السلطانة
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 102. اتش اند ايه
- **slug:** `ha-cafe-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 103. اتش اند ايه
- **slug:** `ha-cafe-buraidah-2`
- **الحي:** غير محدد
- **الثقة الحالية:** low
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 104. حزة كافيه
- **slug:** `hazza-cafe-buraidah`
- **الحي:** قرطبة
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 105. سدرة كافيه
- **slug:** `sidra-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 106. كأس الشاي
- **slug:** `kaas-alshai-buraidah`
- **الحي:** المنار
- **الثقة الحالية:** medium
- **الحقول الناقصة (16):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 107. بانتري
- **slug:** `pantry-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 108. كريد
- **slug:** `creed-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 109. أي بلس
- **slug:** `a-plus-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 110. إم دي
- **slug:** `md-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 111. ريبل كافية
- **slug:** `ripple-cafe`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 112. كنن كافيه
- **slug:** `kanan-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 113. بيرسون
- **slug:** `person-cafe`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 114. رحبة
- **slug:** `rahbah-cafe`
- **الحي:** الرحاب
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 115. كافيه بيت السلطانة
- **slug:** `bait-alsultanah-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 116. EIGHTY +
- **slug:** `eighty-plus-uthman`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 117. هاف مليون
- **slug:** `half-million-buraidah-2`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 118. هاف مليون
- **slug:** `half-million-buraidah-3`
- **الحي:** شمال غرب بريدة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 119. بنتي كافيه
- **slug:** `bentte-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 120. Copper Cup
- **slug:** `copper-cup-buraidah-rayyan`
- **الحي:** الريان
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

---

## الدفعة 5 من 11 (30 كوفيه)

### 121. تروبيكانو كافيه
- **slug:** `tropicano-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 122. ليبيرتا
- **slug:** `liberta-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 123. مقهى البطريق الأسود
- **slug:** `black-penguin-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 124. كرتة Breakfast & more
- **slug:** `krtah-rayyan-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 125. هاف مليون
- **slug:** `half-million-rahab-omar-buraidah`
- **الحي:** الرحاب
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 126. سيجما كافيه
- **slug:** `sigma-caffe-safra-2`
- **الحي:** الصفراء
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 127. EIGHTY +
- **slug:** `eighty-cafe-uthman-buraidah-2`
- **الحي:** النهضة
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 128. هاف مليون
- **slug:** `half-million-rahab-2022-link`
- **الحي:** الرحاب
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 129. EIGHTY +
- **slug:** `eighty-plus-ufuq-buraidah`
- **الحي:** الأفق
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 130. هڤن كافية
- **slug:** `heaven-cafe-qurtubah`
- **الحي:** قرطبة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 131. اجاي
- **slug:** `ajai-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 132. كافيه حنطه
- **slug:** `hintah-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 133. كافيه فيرن
- **slug:** `fern-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 134. كافي اودي
- **slug:** `audi-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 135. جومو كافيه
- **slug:** `jomo-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 136. MLT Cafe
- **slug:** `mlt-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 137. M Dee Cafe
- **slug:** `m-dee-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 138. IMS Cafe
- **slug:** `ims-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 139. Olow Cafe
- **slug:** `olow-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 140. صحب كافيه
- **slug:** `sahb-cafe-alnahdah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 141. ذا فيلد
- **slug:** `the-field-alnahdah`
- **الحي:** النهضة
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 142. جي قلاس
- **slug:** `g-glass-cafe-alnahdah`
- **الحي:** النهضة
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 143. كافية شدو
- **slug:** `shadow-cafe-alnahdah`
- **الحي:** النهضة
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 144. كافية جينوفا
- **slug:** `genova-cafe-alnahdah`
- **الحي:** النهضة
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 145. فولتن كافيه Vol.10
- **slug:** `vol10-cafe-alrayan`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 146. كافيه الغريب
- **slug:** `algharib-cafe-alrayan`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 147. تريت كافيه
- **slug:** `treat-cafe-alrayan`
- **الحي:** الريان
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 148. ليفانتي
- **slug:** `levanti-cafe-alrayan`
- **الحي:** الريان
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، best_visit_time

### 149. شيك كوفي
- **slug:** `chic-coffee-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 150. لاباسيون
- **slug:** `lapassion-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

---

## الدفعة 6 من 11 (30 كوفيه)

### 151. بلكونة
- **slug:** `balcona-cafe-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، reference_url، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 152. وليف
- **slug:** `waleef-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 153. سوذنق
- **slug:** `soothing-cafe-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 154. لو باقل
- **slug:** `le-bagel-cafe-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** low
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 155. قطوف وحلا
- **slug:** `qutoof-wa-hala-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 156. شاهي رحيب
- **slug:** `shahi-raheeb-buraidah`
- **الحي:** السلطانة
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 157. وي كوفي (الأفق)
- **slug:** `wee-coffee-buraidah`
- **الحي:** الأفق
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 158. ديلي كب
- **slug:** `daily-cup-king-fahd-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 159. كيان كوفي شوب
- **slug:** `kayan-coffee-shop-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** medium
- **الحقول الناقصة (15):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 160. لاونج هوكا رمادي
- **slug:** `ramadi-hookah-lounge`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 161. نورا كافي
- **slug:** `nora-coffee`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 162. يازين كافيه
- **slug:** `yazeen-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (14):** official_instagram، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 163. تورا
- **slug:** `tora-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، official_instagram، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 164. أولقا
- **slug:** `olga-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (14):** phone، official_instagram، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 165. دينيز كافيه
- **slug:** `diniz-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** official_instagram، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 166. بِد
- **slug:** `bid-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، official_instagram، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 167. قصال كافيه
- **slug:** `qisal-cafe-abdulaziz-bin-musaed-bin-jalawi`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (14):** phone، official_instagram، price_level، outdoor_seating، work_friendly، group_friendly، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 168. نهروان كافيه
- **slug:** `nahrawan-cafe`
- **الحي:** الصفراء
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، official_instagram، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 169. تاتلي كافيه
- **slug:** `tatli-cafe-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، best_visit_time، not_for_whom

### 170. كوفي الرمله
- **slug:** `al-ramlah-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، best_visit_time

### 171. كوفي عذبه
- **slug:** `athbah-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، best_visit_time

### 172. كوفي أثر
- **slug:** `athar-cafe-sultanah`
- **الحي:** السلطانة
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، best_visit_time

### 173. قهوة ندر
- **slug:** `nadr-cafe-sultanah`
- **الحي:** السلطانة
- **الثقة الحالية:** low
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، best_visit_time

### 174. تموج القهوة
- **slug:** `tamawuj-alqahwah-alnahdah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، best_visit_time

### 175. قهوة أبيات المختصة
- **slug:** `abyat-specialty-coffee-alnahdah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، best_visit_time

### 176. قهوة أوش
- **slug:** `oush-coffee-alnahdah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، best_visit_time

### 177. فيروز ديزرت كافيه
- **slug:** `fairouz-dessert-cafe-alrayan`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، quietness، crowd_level، best_visit_time

### 178. دوبليه
- **slug:** `du-ble-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 179. سِلْم كافية
- **slug:** `slm-coffee-souq-dhahab-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** medium
- **الحقول الناقصة (14):** phone، hours_summary، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 180. بوليفارد سلطانة
- **slug:** `boulevard-sultanah-cafes-buraidah`
- **الحي:** السلطانة
- **الثقة الحالية:** low
- **الحقول الناقصة (14):** phone، official_instagram، hours_summary، reference_url، work_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

---

## الدفعة 7 من 11 (30 كوفيه)

### 181. بريدج
- **slug:** `bridge-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (13):** official_instagram، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 182. محمصة تلو كافيه
- **slug:** `tlo-cafe-roastery`
- **الحي:** غير متحقق
- **الثقة الحالية:** high
- **الحقول الناقصة (13):** official_instagram، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 183. رتم
- **slug:** `rtm-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (13):** official_instagram، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 184. قصال كافيه
- **slug:** `qisal-cafe-abdulaziz-fahd-al-rashoudi`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (13):** phone، official_instagram، outdoor_seating، work_friendly، group_friendly، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 185. محامص الجربوع
- **slug:** `mahames-aljarbou`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (13):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، best_visit_time

### 186. بارد
- **slug:** `pard-rahab-buraidah`
- **الحي:** الرحاب
- **الثقة الحالية:** medium
- **الحقول الناقصة (13):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، best_visit_time، not_for_whom

### 187. كافي سورا
- **slug:** `sora-cafe-albasiriyah`
- **الحي:** البصيرية
- **الثقة الحالية:** low
- **الحقول الناقصة (13):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، best_visit_time

### 188. خلّة كافيه
- **slug:** `khallah-cafe`
- **الحي:** التغيرة
- **الثقة الحالية:** medium
- **الحقول الناقصة (12):** phone، hours_summary، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 189. كوفي وي
- **slug:** `coffee-way`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (12):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level

### 190. برين
- **slug:** `brain-cafe`
- **الحي:** الحزم
- **الثقة الحالية:** medium
- **الحقول الناقصة (12):** official_instagram، outdoor_seating، work_friendly، group_friendly، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 191. تربيعة بلوت
- **slug:** `tarbeeat-baloot-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (12):** phone، official_instagram، outdoor_seating، work_friendly، specialty_coffee، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 192. كورنر كوفي
- **slug:** `corner-coffee-safra`
- **الحي:** الصفراء
- **الثقة الحالية:** medium
- **الحقول الناقصة (12):** phone، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 193. سيجما كافيه
- **slug:** `sigma-caffe-safra`
- **الحي:** الصفراء
- **الثقة الحالية:** medium
- **الحقول الناقصة (12):** phone، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 194. صن رايز كوفي
- **slug:** `sunrise-coffee-buraidah`
- **الحي:** المركز
- **الثقة الحالية:** medium
- **الحقول الناقصة (12):** phone، official_instagram، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، group_friendly، late_night، quietness، crowd_level

### 195. بريستل
- **slug:** `prestel-cafe-buraidah`
- **الحي:** المركز
- **الثقة الحالية:** medium
- **الحقول الناقصة (12):** phone، official_instagram، hours_summary، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، crowd_level

### 196. أرابيكا ستار
- **slug:** `arabica-star`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (11):** phone، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 197. هاف مليون
- **slug:** `half-million-buraidah`
- **الحي:** شمال غرب بريدة
- **الثقة الحالية:** medium
- **الحقول الناقصة (11):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level

### 198. أرابيكا ستار
- **slug:** `arabica-star-king-fahd-2`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (11):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level

### 199. لِز
- **slug:** `luzz-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (11):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، crowd_level

### 200. ليون كافيه
- **slug:** `leon-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** hours_summary، work_friendly، group_friendly، late_night، quietness، crowd_level، place_personality، best_visit_time، why_choose_it، not_for_whom

### 201. دانكن
- **slug:** `dunkin-king-salman-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، late_night، quietness، crowd_level

### 202. كانتو كافيه
- **slug:** `canto-cafe-south-buraidah`
- **الحي:** جنوب بريدة
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، group_friendly، late_night، quietness، crowd_level

### 203. دانكن
- **slug:** `dunkin-buraidah-south-1`
- **الحي:** جنوب بريدة
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، late_night، quietness، crowd_level

### 204. دانكن
- **slug:** `dunkin-buraidah-east-1`
- **الحي:** شرق بريدة
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، late_night، quietness، crowd_level

### 205. دانكن
- **slug:** `dunkin-buraidah-northwest-1`
- **الحي:** شمال غرب بريدة
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، late_night، quietness، crowd_level

### 206. دانكن
- **slug:** `dunkin-buraidah-central-1`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، late_night، quietness، crowd_level

### 207. دانكن
- **slug:** `dunkin-buraidah-south-2`
- **الحي:** جنوب بريدة
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، late_night، quietness، crowd_level

### 208. دانكن
- **slug:** `dunkin-buraidah-0865`
- **الحي:** شرق بريدة
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، late_night، quietness، crowd_level

### 209. دانكن
- **slug:** `dunkin-buraidah-3929`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، official_instagram، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، late_night، quietness، crowd_level

### 210. سِلْم | كافية
- **slug:** `slm-coffee-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، group_friendly، late_night، desserts، crowd_level

---

## الدفعة 8 من 11 (30 كوفيه)

### 211. دوز كافيه
- **slug:** `dose-cafe-buraidah-rayyan`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، late_night، quietness، crowd_level

### 212. خلة كافيه
- **slug:** `khla-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، hours_summary، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level

### 213. كانتو للقهوة المختصة
- **slug:** `canto-alnahdah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، group_friendly، late_night، quietness، crowd_level

### 214. منقية للقهوة المختصة
- **slug:** `manqiyah-specialty-coffee`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، official_instagram، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level، best_visit_time

### 215. كوفي أوجن
- **slug:** `ojn-coffee-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (10):** phone، official_instagram، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، late_night

### 216. المنتصف
- **slug:** `al-montasaf-cafe`
- **الحي:** الصفراء
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، outdoor_seating، work_friendly، group_friendly، late_night، desserts، quietness، crowd_level

### 217. رشف كافيه
- **slug:** `rashf-cafe-rahab-qurtubah`
- **الحي:** قرطبة
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، quietness، crowd_level

### 218. ذا كوفي بين آند تي ليف
- **slug:** `coffee-bean-tea-leaf-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (9):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، late_night، quietness، crowd_level

### 219. ذا كوفي بين آند تي ليف
- **slug:** `coffee-bean-tea-leaf-jedai-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، late_night، quietness، crowd_level

### 220. رشف كافيه
- **slug:** `rashf-cafe-second-branch-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، quietness، crowd_level

### 221. Kthp Cafe
- **slug:** `kthp-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (9):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، group_friendly، late_night، crowd_level

### 222. قونيش كافيه
- **slug:** `qonish-cafe-buraidah`
- **الحي:** الصفراء
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 223. سايد كيك كافيه
- **slug:** `side-kick-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 224. يارد كافيه
- **slug:** `yard-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 225. ناحية كافيه
- **slug:** `naheya-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 226. مسرة كافيه
- **slug:** `masarah-cafe-buraidah`
- **الحي:** الإسكان
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 227. سليل كافيه
- **slug:** `salil-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 228. فلير هاوس كافيه
- **slug:** `flair-house-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 229. تيبل إيه
- **slug:** `table-a-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 230. ميد بوينت كافيه
- **slug:** `mid-point-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 231. فريز كافيه
- **slug:** `freeze-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 232. فنجن كافيه
- **slug:** `fanjan-cafe-buraidah`
- **الحي:** الصفراء
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 233. جولدن هيلز كافيه
- **slug:** `golden-hills-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 234. أو دي كافيه
- **slug:** `od-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 235. كافيه إتش آي
- **slug:** `handi-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 236. باريستا كافيه
- **slug:** `barista-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 237. بارد كافيه
- **slug:** `barred-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 238. كوب آند ليف
- **slug:** `cup-and-leaf-buraidah`
- **الحي:** البساتين
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 239. روفان كافيه
- **slug:** `rovan-cafe-buraidah`
- **الحي:** الصفراء
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

### 240. كيان أفنيوز كافيه
- **slug:** `kayan-avenues-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee، desserts

---

## الدفعة 9 من 11 (30 كوفيه)

### 241. جوي كافيه
- **slug:** `jowy-cafe-buraidah`
- **الحي:** السلطانة
- **الثقة الحالية:** medium
- **الحقول الناقصة (9):** phone، reference_url، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، late_night، crowd_level

### 242. sum cafe
- **slug:** `sum-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (8):** phone، official_instagram، outdoor_seating، work_friendly، specialty_coffee، desserts، quietness، crowd_level

### 243. PARD CAFE
- **slug:** `pard-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (8):** outdoor_seating، work_friendly، group_friendly، late_night، quietness، crowd_level، best_visit_time، not_for_whom

### 244. قدح كافيه
- **slug:** `qadh-coffee-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، google_rating، google_reviews_count، price_level، outdoor_seating، work_friendly، group_friendly، crowd_level

### 245. ليون كافيه
- **slug:** `lion-coffee-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** low
- **الحقول الناقصة (8):** hours_summary، google_rating، google_reviews_count، price_level، group_friendly، late_night، quietness، crowd_level

### 246. نمق كافيه
- **slug:** `namq-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، group_friendly، late_night

### 247. نمق كافيه
- **slug:** `namq-cafe-buraidah-2`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، hours_summary، google_rating، google_reviews_count، price_level، outdoor_seating، group_friendly، late_night

### 248. كهف ثمانية
- **slug:** `cave-eight-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 249. كوفي إس تو
- **slug:** `s2-coffee-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 250. باترن كافيه
- **slug:** `pattern-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 251. زوي كافيه
- **slug:** `zoy-coffee-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 252. ديلي كب
- **slug:** `daily-cup-buraidah`
- **الحي:** الفايزية
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 253. أديوما كافي
- **slug:** `adioma-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 254. كافي ثري أكتوبر
- **slug:** `cafe-3-october-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 255. كفي رفق
- **slug:** `rifq-coffee-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 256. XV كافيه
- **slug:** `xv-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 257. كافيه أوريليا
- **slug:** `aurelia-cafe-buraidah`
- **الحي:** الصفراء
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، specialty_coffee

### 258. كثب كافيه
- **slug:** `kothob-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 259. كوفي كفه
- **slug:** `coffee-kaffa-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 260. زيرو ديفكت كوفي
- **slug:** `zero-defect-coffee-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 261. رفق كوفي
- **slug:** `rafq-coffee-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 262. كافيه 3 أكتوبر
- **slug:** `cafe-3-october-nahdah-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (8):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night، desserts

### 263. بيكولو
- **slug:** `piccolo-roastery-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** high
- **الحقول الناقصة (8):** phone، hours_summary، outdoor_seating، group_friendly، late_night، desserts، quietness، crowd_level

### 264. سمراء كافيه
- **slug:** `samraa-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (7):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، specialty_coffee، desserts

### 265. كانتو للقهوة المختصة
- **slug:** `canto-ali-bin-abi-talib`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (7):** phone، hours_summary، outdoor_seating، group_friendly، late_night، quietness، crowd_level

### 266. صبار كافيه
- **slug:** `sabbar-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (7):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night

### 267. كنافة كافيه
- **slug:** `konafa-coffee-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (7):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night

### 268. ديار بيكري كافيه
- **slug:** `diyar-bakery-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (7):** phone، official_instagram، reference_url، outdoor_seating، work_friendly، group_friendly، late_night

### 269. ذا كوفي بين آند تي ليف
- **slug:** `coffee-bean-tea-leaf-nakheel-mall-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** medium
- **الحقول الناقصة (7):** phone، hours_summary، reference_url، outdoor_seating، late_night، quietness، crowd_level

### 270. ذا كوفي بين آند تي ليف
- **slug:** `coffee-bean-tea-leaf-judai-mall-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** medium
- **الحقول الناقصة (7):** phone، hours_summary، reference_url، outdoor_seating، late_night، quietness، crowd_level

---

## الدفعة 10 من 11 (30 كوفيه)

### 271. قلو كافيه
- **slug:** `glo-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (6):** phone، official_instagram، outdoor_seating، work_friendly، specialty_coffee، desserts

### 272. كافي بيني
- **slug:** `caffe-bene-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (6):** phone، official_instagram، reference_url، outdoor_seating، group_friendly، late_night

### 273. غلوريا جينز كوفيز
- **slug:** `gloria-jeans-coffees-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (6):** phone، official_instagram، reference_url، outdoor_seating، group_friendly، late_night

### 274. بلت لاونج
- **slug:** `belt-lounge-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (6):** phone، official_instagram، reference_url، work_friendly، specialty_coffee، desserts

### 275. ذا لاونج كافيه
- **slug:** `the-lounge-cafe-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (6):** phone، official_instagram، reference_url، work_friendly، specialty_coffee، desserts

### 276. دكتور كافيه V12
- **slug:** `dr-cafe-v12-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** medium
- **الحقول الناقصة (6):** hours_summary، outdoor_seating، group_friendly، late_night، quietness، crowd_level

### 277. ستاربكس النخيل مول
- **slug:** `starbucks-nakheel-mall-buraidah`
- **الحي:** غير محدد
- **الثقة الحالية:** medium
- **الحقول الناقصة (6):** phone، hours_summary، outdoor_seating، late_night، quietness، crowd_level

### 278. هانم
- **slug:** `hanim-cafe`
- **الحي:** الرحاب
- **الثقة الحالية:** high
- **الحقول الناقصة (5):** phone، official_instagram، outdoor_seating، specialty_coffee، desserts

### 279. كوفا كافيه
- **slug:** `kova-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (5):** phone، reference_url، outdoor_seating، group_friendly، late_night

### 280. لو غورميه كافيه
- **slug:** `le-gourmet-cafe-buraidah`
- **الحي:** الصفراء
- **الثقة الحالية:** medium
- **الحقول الناقصة (5):** phone، official_instagram، outdoor_seating، group_friendly، late_night

### 281. بارنيز كافيه
- **slug:** `barnies-coffee-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (5):** phone، outdoor_seating، work_friendly، group_friendly، late_night

### 282. كول دونات
- **slug:** `cool-donuts-buraidah-uthman`
- **الحي:** المركز
- **الثقة الحالية:** high
- **الحقول الناقصة (5):** reference_url، google_rating، google_reviews_count، price_level، outdoor_seating

### 283. لوفت
- **slug:** `loft-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** high
- **الحقول الناقصة (5):** official_instagram، hours_summary، google_rating، google_reviews_count، price_level

### 284. كول دونات - الفاخرية
- **slug:** `cool-donuts-fakhiriyah-buraidah`
- **الحي:** الفاخرية
- **الثقة الحالية:** high
- **الحقول الناقصة (5):** reference_url، google_rating، google_reviews_count، price_level، outdoor_seating

### 285. كول دونات - الصفراء
- **slug:** `cool-donuts-safra-buraidah`
- **الحي:** الصفراء
- **الثقة الحالية:** high
- **الحقول الناقصة (5):** reference_url، google_rating، google_reviews_count، price_level، outdoor_seating

### 286. كول دونات - الإسكان
- **slug:** `cool-donuts-iskan-buraidah`
- **الحي:** الإسكان
- **الثقة الحالية:** high
- **الحقول الناقصة (5):** reference_url، google_rating، google_reviews_count، price_level، outdoor_seating

### 287. كول دونات - البصيرية
- **slug:** `cool-donuts-basiriyah-buraidah`
- **الحي:** البصيرية
- **الثقة الحالية:** high
- **الحقول الناقصة (5):** reference_url، google_rating، google_reviews_count، price_level، outdoor_seating

### 288. كول دونات - طريق الملك فهد
- **slug:** `cool-donuts-king-fahd-buraidah`
- **الحي:** المركز
- **الثقة الحالية:** high
- **الحقول الناقصة (5):** reference_url، google_rating، google_reviews_count، price_level، outdoor_seating

### 289. كول دونات - النخيل مول
- **slug:** `cool-donuts-nakheel-mall-buraidah`
- **الحي:** المركز
- **الثقة الحالية:** high
- **الحقول الناقصة (5):** reference_url، google_rating، google_reviews_count، price_level، outdoor_seating

### 290. كول دونات - العثيم مول
- **slug:** `cool-donuts-othaim-mall-buraidah`
- **الحي:** المركز
- **الثقة الحالية:** high
- **الحقول الناقصة (5):** reference_url، google_rating، google_reviews_count، price_level، outdoor_seating

### 291. فكت كافيه
- **slug:** `vekt-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** high
- **الحقول الناقصة (4):** phone، official_instagram، outdoor_seating، specialty_coffee

### 292. رتل كافيه
- **slug:** `ratel-cafe`
- **الحي:** غير متحقق
- **الثقة الحالية:** high
- **الحقول الناقصة (4):** phone، official_instagram، outdoor_seating، desserts

### 293. عنوان القهوة
- **slug:** `coffee-title`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (4):** phone، official_instagram، outdoor_seating، desserts

### 294. فنجان كافيه
- **slug:** `fan-jan-cafe-buraidah`
- **الحي:** غير متحقق
- **الثقة الحالية:** medium
- **الحقول الناقصة (4):** hours_summary، google_reviews_count، price_level، late_night

### 295. كاميلا كافيه
- **slug:** `camila-cafe-buraidah`
- **الحي:** النهضة
- **الثقة الحالية:** medium
- **الحقول الناقصة (4):** phone، outdoor_seating، work_friendly، late_night

### 296. دكتور كافيه
- **slug:** `dr-cafe-coffee-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (4):** outdoor_seating، work_friendly، group_friendly، late_night

### 297. أيل كافيه
- **slug:** `ayl-cafe`
- **الحي:** البساتين
- **الثقة الحالية:** high
- **الحقول الناقصة (3):** phone، outdoor_seating، specialty_coffee

### 298. يول
- **slug:** `yol-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (3):** phone، outdoor_seating، work_friendly

### 299. ستاربكس بريدة
- **slug:** `starbucks-buraydah-buraidah`
- **الحي:** الصفراء
- **الثقة الحالية:** medium
- **الحقول الناقصة (3):** phone، outdoor_seating، late_night

### 300. ستاربكس العثيم مول
- **slug:** `starbucks-othaim-mall-buraidah`
- **الحي:** الريان
- **الثقة الحالية:** medium
- **الحقول الناقصة (3):** phone، outdoor_seating، late_night

---

## الدفعة 11 من 11 (6 كوفيه)

### 301. مقهى ومحمصة بوق
- **slug:** `booq-roastery-cafe`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (2):** phone، outdoor_seating

### 302. رمادي لاونج
- **slug:** `ramadi-lounge`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (2):** phone، specialty_coffee

### 303. كانتو للقهوة المختصة
- **slug:** `canto-specialty-coffee-prince-sultan`
- **الحي:** الريان
- **الثقة الحالية:** high
- **الحقول الناقصة (2):** phone، outdoor_seating

### 304. أدهم
- **slug:** `adham-specialty-coffee`
- **الحي:** غير متحقق
- **الثقة الحالية:** high
- **الحقول الناقصة (2):** phone، outdoor_seating

### 305. كانتو
- **slug:** `canto-abu-bakr`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (2):** phone، outdoor_seating

### 306. أوريكس كافية
- **slug:** `oryx-coffee`
- **الحي:** النهضة
- **الثقة الحالية:** high
- **الحقول الناقصة (2):** phone، outdoor_seating

---

## ملخص الدفعات

| الدفعة | عدد الكوفيهات | الحقول الناقصة | الأولوية |
|--------|--------------|----------------|----------|
| 1 | 30 | 548 | عالية (confidence: low) |
| 2 | 30 | 512 | عالية (confidence: low) |
| 3 | 30 | 498 | عالية (confidence: low) |
| 4 | 30 | 466 | متوسطة |
| 5 | 30 | 450 | متوسطة |
| 6 | 30 | 429 | متوسطة |
| 7 | 30 | 341 | عادية |
| 8 | 30 | 275 | عادية |
| 9 | 30 | 234 | عادية |
| 10 | 30 | 143 | عادية |
| 11 | 6 | 12 | عادية |

---

## أكثر الحقول نقصاً

| الحقل | عدد السجلات الناقصة | النسبة |
|-------|-------------------|--------|
| outdoor_seating | 291 | 95% |
| phone | 283 | 92% |
| late_night | 270 | 88% |
| work_friendly | 255 | 83% |
| group_friendly | 255 | 83% |
| crowd_level | 231 | 75% |
| official_instagram | 224 | 73% |
| quietness | 224 | 73% |
| hours_summary | 202 | 66% |
| best_visit_time | 196 | 64% |
| desserts | 194 | 63% |
| price_level | 187 | 61% |
| google_reviews_count | 183 | 60% |
| google_rating | 181 | 59% |
| not_for_whom | 166 | 54% |
| why_choose_it | 163 | 53% |
| place_personality | 162 | 53% |
| specialty_coffee | 150 | 49% |
| reference_url | 91 | 30% |
