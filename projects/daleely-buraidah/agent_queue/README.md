# Agent Import Queue

أبسط Queue عملية لطلبات الاستيراد من الويكي.

## الملفات
- `import_queue.json`: قائمة طلبات import التي أنشأها الويكي
- `import_results/`: مكان مخرجات المعالجة اللاحقة بواسطة OpenClaw

## شكل الطلب
كل طلب يحتوي على الأقل على:
- `id`
- `created_at`
- `status`
- `maps_url`
- `raw_text`
- `requested_action`
- `notes`

## الحالة الحالية
- الويكي لا يكتب إلى `master.json` مباشرة
- الزر `Queue for Agent Import` ينشئ طلب queue مستقل
- المعالج الأدنى الحالي: `process_import_queue.py`
- المعالج يقرأ الطلبات ذات الحالة `queued` ثم يولّد:
  - result منظم داخل `import_results/`
  - proposed patch داخل `import_results/patches/` عند الإمكان
  - تحديث حالة الطلب داخل `import_queue.json`
