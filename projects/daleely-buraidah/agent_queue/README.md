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
- OpenClaw يمكنه لاحقًا قراءة `import_queue.json` ومعالجة الطلبات ثم حفظ النتائج في `import_results/`
