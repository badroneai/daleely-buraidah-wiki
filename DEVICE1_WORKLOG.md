# سجل عمل جهاز 1 (Device 1)

> هذا الملف يوثّق ما ينجزه **جهاز 1** وما يغيّره في المشروع. حدّثه بعد كل جلسة عمل ليفهم الجهاز الرئيسي وجهاز 2 الوضع دون تضارب.

---

## تعريف جهاز 1

- **المجلد الخاص بالمخرجات:** `outputs/device-1/`
- **جلسة مستمرة (بدون متابعة):** شغّل مرة واحدة واترك الجهاز يعمل؛ عند أي انقطاع شغّله مرة أخرى فيستأنف تلقائياً:  
  `.\scripts\run-full-session-device1.ps1`
- **تشغيل عادي:**  
  `python scripts/scrape-gmaps.py --device-id device-1 --headless` أو `.\scripts\run-scrape-device1.ps1`
- **سجل التغييرات:** يُحدَّث في هذا الملف (وعند اكتمال الجلسة الكاملة يُضاف سطر تلقائياً).

---

## سجل التغييرات

| التاريخ | ماذا تم |
|---------|---------|
| 2026-03-16 | إعداد جهاز 1: إنشاء مجلد `outputs/device-1/` مع .gitkeep و README. |
| 2026-03-16 | إضافة خيار `--device-id` في `scripts/scrape-gmaps.py`؛ عند استخدام `--device-id device-1` تُكتب كل المخرجات في `outputs/device-1/`. |
| 2026-03-16 | إنشاء `DEVICE1_WORKLOG.md` و `docs/DEVICES_SETUP.md` و `scripts/run-scrape-device1.ps1`. |
| 2026-03-16 | تحديث `INSTRUCTIONS_OTHER_DEVICE.md` بقسم جهاز 1 وجهاز 2 ومرجعية التوثيق. |
| 2026-03-16 | (سابقاً على جهاز 1) استبعاد روابط سياسات/دعم جوجل من `all_links` في السكربت. |
| 2026-03-16 | تنظيف نص ساعات العمل (إزالة "نسخ ساعات العمل")؛ إضافة خيار `--has-place-url` للجلب السريع للـ 42 كافيه ذات رابط مكان. |
| 2026-03-16 | سكربت جلسة مستمرة: `run-full-session-device1.ps1` — يستأنف تلقائياً عند إعادة التشغيل، ويحدّث هذا السجل عند اكتمال الجلب. |

---

## أوامر التشغيل الموصى بها (جهاز 1)

```powershell
# جلسة مستمرة — شغّله واتركه (يستأنف تلقائياً إذا أعدت التشغيل لاحقاً)
.\scripts\run-full-session-device1.ps1

# تشغيل عادي أو تجربة
.\scripts\run-scrape-device1.ps1
.\scripts\run-scrape-device1.ps1 -Limit 10
.\scripts\run-scrape-device1.ps1 -Resume
```

أو مباشرة:

```bash
python scripts/scrape-gmaps.py --device-id device-1 --headless
python scripts/scrape-gmaps.py --device-id device-1 --limit 10 --headless
python scripts/scrape-gmaps.py --device-id device-1 --headless --resume
```

---

## تذكير

**بعد كل جلسة عمل على جهاز 1:** حدّث جدول "سجل التغييرات" أعلاه (تاريخ + وصف مختصر) حتى يعرف الجهاز الرئيسي وجهاز 2 ما تم وأين توجد المخرجات.

---

*راجع `docs/DEVICES_SETUP.md` لفهم توزيع الأجهزة والدمج.*

| 2026-03-16 | جلسة اكتملت تلقائياً: 2 كافيه مُجلَب. ملف الدمج: `outputs/device-1/scrape-merge-ready-2026-03-16.json` |

| 2026-03-16 | جلسة اكتملت تلقائياً: 42 كافيه مُجلَب. ملف الدمج: `outputs/device-1/scrape-merge-ready-2026-03-16.json` |
