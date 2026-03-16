# تشغيل السكربت لملء نواقص الهواتف والإنستغرام (كل الكوفيهات)

## أمر واحد — كل الكوفيهات + بحث ويب عند "غير موجود"

```powershell
cd c:\Users\pc\daleely-buraidah-wiki
$env:PYTHONIOENCODING='utf-8'
python scripts/scrape-gmaps.py --sector cafes --headless --web-fallback --device-id device-2
```

- **--sector cafes**: كل الـ 254 كافيه.
- **--web-fallback**: عند عدم وجود المكان على الخريطة يُستخرج هاتف/إنستغرام/تيك توك من بحث الويب.
- **--device-id device-2**: المخرجات في `outputs/device-2/`.

الدمج لاحقاً (fill-only) يملأ **الهاتف** و**الإنستغرام** (وباقي الحقول) فقط حيث تكون فارغة في master، ولا يمسح أي قيمة موجودة.

---

## بعد انتهاء السكربت — الدمج

```powershell
$env:PYTHONIOENCODING='utf-8'
python scripts/merge-scraped.py outputs/device-2/scrape-merge-ready-YYYY-MM-DD.json --dry-run
python scripts/merge-scraped.py outputs/device-2/scrape-merge-ready-YYYY-MM-DD.json
```

(استبدل `YYYY-MM-DD` بتاريخ اليوم الذي انتهى فيه التشغيل.)

---

## استئناف عند الانقطاع

```powershell
python scripts/scrape-gmaps.py --sector cafes --headless --web-fallback --device-id device-2 --resume
```

---

*2026-03-16*
