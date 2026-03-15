# دليل بريدة الشامل — توثيق البنية التقنية

> إعادة الهيكلة مكتملة (4 مراحل). توثيق شامل لكل module JS و CSS والعلاقات بينها.

---

## نظرة عامة

دليل بريدة الشامل هو تطبيق SPA (صفحة واحدة) لإدارة دليل محلي شامل لمدينة بريدة. يجمع بين نظام تحرير للسجلات، نظام تحقق متعدد المحاور، وكلاء ذكاء اصطناعي لإكمال البيانات، ونظام مراجعة دفعية. التطبيق مبني بالكامل بـ Vanilla JavaScript بدون أطر عمل خارجية، ويُخدم عبر Node.js.

### المكدس التقني
- **الواجهة:** HTML5 + CSS3 + Vanilla JavaScript (ES Modules)
- **الخادم:** Node.js (ES Modules)، HTTP server أصلي بدون أطر
- **البيانات:** `master.json` (ملف JSON واحد)
- **الاعتماديات:** لا توجد — صفر حزم خارجية
- **الاتجاه:** RTL (من اليمين لليسار) — واجهة عربية بالكامل

---

## هيكل الملفات

```
daleely-buraidah-wiki-main/
├── index.html              ← نقطة الدخول (HTML)
├── main.js                 ← نقطة الدخول (JS module) — يستورد modules/router.js
├── script.js               ← النسخة الأصلية الأحادية (8,665 سطر) — مرجع
├── script.original.js      ← نسخة احتياطية من script.js الأصلي
├── styles.css              ← نقطة الدخول (CSS) — يستورد من css/
├── styles.original.css     ← النسخة الأصلية قبل التقسيم
├── server.mjs              ← الخادم + proxy الوكلاء
├── master.json             ← بيانات السجلات الرئيسية
├── package.json            ← تهيئة المشروع (type: module)
├── modules/                ← 19 ES module
│   ├── constants.js
│   ├── state.js
│   ├── dom.js
│   ├── utils.js
│   ├── display.js
│   ├── data.js
│   ├── sidebar.js
│   ├── analytics.js
│   ├── storage.js
│   ├── verification.js
│   ├── queues.js
│   ├── filters.js
│   ├── agents.js
│   ├── missions.js
│   ├── patches.js
│   ├── bulk-review.js
│   ├── ui-helpers.js
│   ├── rendering.js
│   └── router.js
└── css/                    ← 12 ملف CSS
    ├── variables.css
    ├── layout.css
    ├── sidebar.css
    ├── components.css
    ├── hero.css
    ├── queue.css
    ├── bulk-review.css
    ├── ops-editorial.css
    ├── verification.css
    ├── entity.css
    ├── utilities.css
    └── responsive.css
```

---

## تدفق التطبيق

```
المتصفح يحمّل index.html
    ↓
يحمّل styles.css (يستورد 12 ملف CSS)
    ↓
يحمّل main.js (ES module → يستورد modules/router.js → يستورد كل الوحدات)
    ↓
التهيئة:
  1. ربط الشريط الجانبي (bindSidebar)
  2. ربط أقسام التنقل المحمولة (bindMobileNavSections)
  3. تحميل master.json (loadData)
  4. فحص صحة وكيل الذكاء الاصطناعي (refreshAgentRuntimeInfo)
  5. تشغيل الموجه (router)
    ↓
المستخدم يتنقل عبر hash routes (#/dashboard, #/entities, إلخ)
    ↓
router() يقرأ location.hash → يعرض الصفحة المناسبة → يربط الأحداث
    ↓
عند طلب وكيل ذكاء اصطناعي:
  Frontend → POST /api/agents/{endpoint} → Server يتحقق → Runtime خارجي أو محلي → إرجاع الاقتراحات
```

---

## نقاط الدخول

### `index.html`
- اللغة: العربية RTL (`lang="ar" dir="rtl"`)
- يحمّل `styles.css` و `main.js` (كـ ES module)
- الهيكل:
  - **الشريط الجانبي** (`#appSidebar`): التنقل، البحث، أقسام القطاعات
  - **المنطقة الرئيسية** (`.main-area`): الشريط العلوي + حاوية التطبيق (`#app`)
- التوجيه: `<section id="app">` هو المكان الذي تُحقن فيه كل العروض ديناميكيًا

### `main.js`
- نقطة الدخول للجافاسكربت (ES module) — يستورد `modules/router.js`
- يبدأ تنفيذ التطبيق عند تحميل الصفحة عبر IIFE في router.js
- يحل محل `script.js` الأصلي (المحفوظ في `script.original.js`)

### `server.mjs` (890 سطر)
- خادم HTTP أصلي على المنفذ 4173
- نمط Proxy: يتوسط بين الواجهة والـ runtime الخارجي للوكلاء
- نقاط النهاية:
  - `GET /api/runtime/health` — حالة الـ runtime
  - `GET /api/runtime/logs` — سجل المراجعة
  - `POST /api/agents/record-completion` — إكمال سجل واحد
  - `POST /api/agents/record-completion/batch` — إكمال دفعي (حد أقصى 120)
  - `POST /api/agents/verification-support` — دعم تحقق واحد
  - `POST /api/agents/verification-support/batch` — دعم تحقق دفعي (حد أقصى 120)
- نظام Whitelist: الحقول المسموحة للإكمال (`short_address`, `hours_summary`, `phone`, `official_instagram`, `editorial_summary`) وللتحقق (`verification_rationale`, `source_candidate`, `conflict_hypothesis`, `confidence_recommendation`, `next_action_draft`)
- سجل مراجعة: كل استدعاء يُسجل في `.runtime-audit.json`
- Fallback: إذا لم يتوفر `AGENT_RUNTIME_URL`، يستخدم مقترحات محلية

---

## وحدات JavaScript — modules/

### الطبقة الأساسية (بدون اعتماديات أو اعتماديات بسيطة)

---

### 1. `constants.js`
**الغرض:** جداول الترجمة والقيم الثابتة للواجهة العربية.

**الصادرات:**

| الاسم | النوع | الوصف |
|---|---|---|
| `STATUS_AR` | Object | ترجمة 8 حالات (discovered, profiled, partially_verified, verified, needs_review, branch_conflict, duplicate, archived) |
| `FLAG_AR` | Object | ترجمة العلامات (yes, no, partial, unknown) |
| `CONFIDENCE_AR` | Object | ترجمة مستويات الثقة (low, medium, high) |
| `LEVEL_AR` | Object | ترجمة المستويات (low, medium, high) |
| `PRICE_AR` | Object | ترجمة نطاقات الأسعار ($, $$, $$$, $$$$) |

**الاعتماديات:** لا يوجد — بيانات صرفة.

---

### 2. `state.js`
**الغرض:** الحالة العامة القابلة للتغيير ورابط البيانات.

**الصادرات:**

| الاسم | النوع | الوصف |
|---|---|---|
| `DATA_URL` | String | مسار `./master.json` |
| `state` | Object | كائن الحالة العامة الوحيد |

**خصائص `state`:**
- `raw` — البيانات الخام من master.json
- `records` — مصفوفة السجلات بعد التطبيع
- `filters` — مرشحات البحث (status, district, confidence, specialty, desserts, work, groups, late)
- `issues` — مشاكل التطبيع المكتشفة
- `editMode` / `currentSlug` / `draftMessage` — حالة التحرير
- `agentRunState` / `agentBatchState` / `agentRuntime` — حالة الوكلاء
- `importDraftText` / `importRawText` / `isNewCafe` — حالة الاستيراد
- `queueMessage` / `queueSort` / `queuePriority` — حالة الصفوف

**الاعتماديات:** لا يوجد.

---

### 3. `dom.js`
**الغرض:** تخزين مراجع عناصر DOM المتكررة لتجنب الاستعلام المتكرر.

**الصادرات:**

| الاسم | النوع | الوصف |
|---|---|---|
| `app` | Element | حاوية التطبيق الرئيسية `#app` |
| `pageTitle` | Element | عنوان الصفحة |
| `breadcrumbs` | Element | مسار التنقل |
| `searchInput` | Element | حقل البحث العام |
| `searchButton` | Element | زر البحث |
| `sidebar` | Element | الشريط الجانبي |
| `sidebarToggle` | Element | زر تبديل الشريط الجانبي |
| `sidebarClose` | Element | زر إغلاق الشريط الجانبي |
| `sidebarOverlay` | Element | الخلفية المعتمة |
| `navSubtrees` | Array | أقسام التنقل الفرعية |

**الاعتماديات:** لا يوجد.

---

### 4. `utils.js`
**الغرض:** دوال مساعدة للهروب من HTML، العمليات على المصفوفات، وتطبيع البيانات.

**الصادرات:**

| الاسم | التوقيع | الوصف |
|---|---|---|
| `esc(v)` | `string → string` | هروب HTML (يمنع XSS) |
| `uniq(arr)` | `array → array` | إزالة التكرارات باستخدام Set |
| `normalizeFlag(value, fieldName)` | `(string, string) → string` | تحويل قيم العلامات إلى صيغة قياسية (yes/no/partial/unknown) |
| `normalizeRecord(record)` | `object → object` | تطبيع كل حقول العلامات في سجل (9 حقول: work_friendly, group_friendly, late_night, specialty_coffee, desserts, family_friendly, indoor_seating, outdoor_seating, parking) |

**الاعتماديات:** `state` من `./state.js`

---

### 5. `display.js`
**الغرض:** دوال تنسيق العرض وتوليد HTML للعناصر المرئية.

**الصادرات:**

| الاسم | التوقيع | الوصف |
|---|---|---|
| `setMeta(title, trail)` | `(string, array) → void` | تحديث عنوان الصفحة ومسار التنقل وتفعيل رابط التنقل المطابق |
| `badge(status)` | `string → string` | توليد شارة HTML مع ترجمة الحالة |
| `chip(label, value)` | `(string, string) → string` | توليد وسم HTML |
| `displayFlag(value)` | `string → string` | ترجمة قيمة علامة إلى العربية |
| `displayConfidence(value)` | `string → string` | ترجمة مستوى الثقة |
| `displayLevel(value)` | `string → string` | ترجمة المستوى |
| `displayPrice(value)` | `string → string` | ترجمة نطاق السعر |
| `displayText(value, fallback)` | `(any, string) → string` | عرض نص آمن مع قيمة بديلة |

**الاعتماديات:** `constants.js`, `dom.js`, `utils.js`

---

### الطبقة الوسطى (منطق الأعمال الأساسي)

---

### 6. `data.js`
**الغرض:** تحميل البيانات من master.json ومراقبة صحة الـ runtime.

**الصادرات:**

| الاسم | التوقيع | الوصف |
|---|---|---|
| `loadData()` | `async () → void` | جلب master.json وتطبيع كل سجل وتعبئة state |
| `refreshAgentRuntimeInfo()` | `async () → void` | فحص `/api/runtime/health` وتحديث `state.agentRuntime` |

**الاعتماديات:** `state.js`, `utils.js`

> **ملاحظة:** هذا الملف موجود أيضًا لكنه مُكرر وظيفيًا في `ui-helpers.js` (الدالتان `loadData` و `refreshAgentRuntimeInfo` موجودتان في كلا الملفين). الملف المُستخدم فعليًا هو `ui-helpers.js` عبر `router.js`.

---

### 7. `sidebar.js`
**الغرض:** التحكم بالشريط الجانبي وتنقل الأكورديون على المحمول.

**الصادرات:**

| الاسم | التوقيع | الوصف |
|---|---|---|
| `isMobileViewport()` | `() → boolean` | هل العرض أقل من 900px |
| `setSidebarOpen(isOpen)` | `boolean → void` | ضبط حالة الفتح/الإغلاق مع ARIA |
| `closeSidebar()` | `() → void` | إغلاق الشريط الجانبي |
| `openSidebar()` | `() → void` | فتح الشريط الجانبي |
| `bindSidebar()` | `() → void` | ربط مستمعات الأحداث (نقر، Escape، resize) |
| `syncMobileNavSections()` | `() → void` | مزامنة أقسام الأكورديون حسب الـ hash الحالي |
| `bindMobileNavSections()` | `() → void` | ربط أحداث الأكورديون وتعيين ARIA |

**الاعتماديات:** `dom.js`

> **ملاحظة:** مكرر وظيفيًا في `ui-helpers.js`. الملف المُستخدم فعليًا هو `ui-helpers.js`.

---

### 8. `analytics.js`
**الغرض:** إحصائيات وتحليلات وفحص جودة السجلات.

**الصادرات:**

| الاسم | التوقيع | الوصف |
|---|---|---|
| `statCount(key, value)` | `(string, string) → number` | عدد السجلات المطابقة لحقل/قيمة |
| `avgRating()` | `(records?) → number` | متوسط تقييم Google |
| `featuredStatuses()` | `() → array` | توزيع الحالات البارزة |
| `importantMissingFields(payload)` | `object → array` | الحقول المهمة الناقصة في سجل |
| `recordsMissingImportant()` | `() → array` | السجلات ذات الحقول المهمة الناقصة |
| `lowConfidenceRecords()` | `() → array` | سجلات الثقة المنخفضة |
| `recentVerifiedRecords(days)` | `number → array` | سجلات تم التحقق منها مؤخرًا |
| `newlyAddedRecords(days)` | `number → array` | سجلات مضافة حديثًا |
| `todayVerifiedCount()` | `() → number` | عدد السجلات المتحقق منها اليوم |
| `sectorTree()` | `() → array` | شجرة القطاعات الهرمية |
| `currentSector()` | `() → object` | القطاع الحالي من الـ hash |
| `sectorLabelByKey(key)` | `string → string` | التسمية العربية للقطاع |

**الاعتماديات:** `state.js`, `constants.js`, `utils.js`

---

### 9. `storage.js`
**الغرض:** طبقة localStorage مع CRUD ومسودات وتقييم الجاهزية التحريرية.

**الصادرات (ملخص — أكثر من 30 دالة):**

**مفاتيح التخزين:** `exportHistoryStorageKey()`, `editorialDraftsStorageKey()`, `patchConsoleStorageKey()`, `importConsoleStorageKey()`, `evidenceLabStorageKey()`, `verificationSessionStorageKey()`, `verificationDecisionStorageKey()`, `agentDraftStorageKey()`, `verificationDraftStorageKey()`, `agentRunHistoryStorageKey()`, `savedAgentBatchStorageKey()`, `missionRegistryStorageKey()`, `missionSessionStorageKey()`

**عمليات CRUD:**
- `getStoredList(key)` / `saveStoredList(key, items)` — قراءة/كتابة قوائم
- `upsertStoredItem(key, item, idField)` — إدراج أو تحديث عنصر

**المسودات:**
- `getDraft(slug)` / `saveDraft(slug, payload, meta)` — إدارة المسودات
- `editorialReadiness(payload)` — تقييم الجاهزية التحريرية (not-ready, draft-only, needs-completion, review-ready, export-ready)
- `editorialStatusTone(status)` — لون الحالة التحريرية

**التسجيل:**
- `registerDraftSnapshot(slug, payload, meta)` — تسجيل لقطة مسودة
- `registerPatchExportRecord(item)` / `registerImportRecord(item)` — تسجيل التصدير/الاستيراد

**وصولات البيانات:**
- `editorialDraftEntries()`, `patchConsoleEntries()`, `importConsoleEntries()`, `agentDraftEntries()`, `verificationDraftEntries()`, `agentRunHistoryEntries()`, `savedAgentBatchEntries()`, `missionEntries()`, `missionSessions()`

**الكيانات:**
- `getEntity(slug)` — جلب كيان من state حسب الـ slug
- `emptyNewCafeRecord()` — قالب سجل مقهى فارغ

**تفادي التبعيات الدائرية:** يستخدم نمط `setQueueReasonsProvider()` لحقن دالة من `queues.js` في وقت لاحق.

**الاعتماديات:** `state.js`, `analytics.js`

---

### 10. `verification.js`
**الغرض:** آلة حالة التحقق بثلاثة محاور مستقلة (المصدر، الحي، الثقة).

**الصادرات (ملخص — أكثر من 25 دالة):**

**حالة التحقق:**
- `sourceVerificationState(record)` — حالة تحقق المصدر (verified, strong, review, weak, missing, conflicting)
- `districtVerificationState(record)` — حالة تحقق الحي (verified, resolved, weak, unresolved, needs-review)
- `confidenceVerificationState(record)` — حالة تحقق الثقة (stable, acceptable, review, escalate, blocked)

**صفوف التحقق:**
- `verificationQueues()` — 5 صفوف: source-review, district-review, confidence-review, conflicting-evidence, unresolved-verification
- `verificationQueueTitles()` — عناوين الصفوف

**الأدلة:**
- `evidenceEntries()` / `addEvidenceEntry(entry)` — إدارة الأدلة
- `evidenceForSlug(slug)` — أدلة سجل معين
- `evidenceLabTitle(type)` — عنوان نوع الدليل

**الجلسات:**
- `startOrOpenVerificationSession(sessionId, scenario)` — بدء/فتح جلسة تحقق
- `verificationSessions()` — كل الجلسات
- `registerVerificationDecision(sessionId, decisions)` — تسجيل قرار

**القرارات:**
- `verificationDecisions()` / `verificationDecisionEntries()` — كل القرارات
- `latestVerificationDecisionForSlug(slug)` — آخر قرار لسجل
- `decisionHasChanges(sessionId)` — هل القرار يحمل تغييرات

**اللقطات:**
- `verificationControlSnapshot()` — لقطة شاملة لحالة التحقق

**الاعتماديات:** `state.js`, `utils.js`, `storage.js`

---

### 11. `queues.js`
**الغرض:** نظام صفوف الانتباه مع تسجيل الأولوية والتوجيه وتصنيف الكيانات.

**الصادرات (ملخص — أكثر من 25 دالة):**

**التوجيه:**
- `queueHref(queueKey, params)` — رابط hash لصف معين
- `entityHref(slug)` — رابط hash لكيان
- `parseHashRoute(hash)` — تحليل الـ hash إلى أجزاء

**الأولوية:**
- `operationalValue(record)` — قيمة تشغيلية (وزن الحالة × النوع)
- `completionGap(record)` — فجوة الاكتمال
- `queuePriorityScore(record)` — نتيجة الأولوية المركبة
- `queuePriorityBadge(record)` — شارة الأولوية (عاجل، مرتفع، عادي، منخفض)
- `priorityGroups()` — 4 مجموعات أولوية

**الصفوف:**
- `attentionQueues()` — مصفوفة تكوينات الصفوف (needs-review, missing-district, missing-source, quick-complete, new-incomplete, low-confidence)
- `entityQueueReasons(record)` — لماذا هذا الكيان في هذا الصف
- `queueViewState(queueKey)` — حالة عرض الصف مع الترتيب والترشيح
- `recordsForQueue(queueKey)` / `visibleQueueRecords(queueKey)` — سجلات صف معين

**التصنيف:**
- `entityChecklist(record)` — قائمة فحص الكيان
- `entityTriage(record)` — تصنيف الكيان (ماذا يحتاج)

**حل التبعية الدائرية:** يربط `setQueueReasonsProvider()` في نهاية الملف.

**الاعتماديات:** `state.js`, `constants.js`, `utils.js`, `display.js`, `analytics.js`, `storage.js`

---

### 12. `filters.js`
**الغرض:** ترشيح السجلات وعرض المرشحات النشطة وبطاقات النتائج.

**الصادرات:**

| الاسم | التوقيع | الوصف |
|---|---|---|
| `filterRecords(records)` | `array → array` | ترشيح حسب الحالة، الحي، الثقة، و5 خصائص (specialty, desserts, work, group, late_night) |
| `activeFilterEntries()` | `() → array` | المرشحات النشطة مع تسمياتها |
| `renderActiveFilters()` | `() → string` | قالب HTML للمرشحات النشطة مع أزرار مسح |
| `resultEmptyState(title, note)` | `(string, string) → string` | قالب حالة فارغة |
| `resultCards(records)` | `array → string` | قالب HTML لشبكة بطاقات النتائج |

**الاعتماديات:** `state.js`, `constants.js`, `utils.js`, `display.js`

---

### الطبقة العليا (الأنظمة المتقدمة)

---

### 13. `agents.js`
**الغرض:** نظام وكلاء الذكاء الاصطناعي لتوليد المقترحات وإدارة الدفعات.

**نوعان من الوكلاء:**
1. **وكيل إكمال السجل** (Record Completion) — يملأ الحقول الناقصة
2. **وكيل دعم التحقق** (Verification Support) — يبني مسودات تحققية

**الصادرات (ملخص — أكثر من 30 دالة):**

**التسميات:**
- `agentProposalStatusLabel(status)`, `agentConfidenceLabel(confidence)`, `agentProposalSourceLabel(source)`, `agentBatchStatusLabel(status)`, `agentProposalTypeLabel(type)`, وتسميات الألوان المقابلة

**بناء المقترحات:**
- `buildRecordCompletionProposals(scope, options)` — بناء مقترحات إكمال محلية
- `buildVerificationSupportProposals(scope, options)` — بناء مقترحات تحقق محلية

**التشغيل:**
- `runRecordCompletionAgent(scope, options)` / `runVerificationSupportAgent(scope, options)` — تشغيل متزامن
- `runRecordCompletionAgentAsync(scope, options)` / `runVerificationSupportAgentAsync(scope, options)` — تشغيل غير متزامن
- `runAgentBatch(batchId, specs, options)` / `runAgentBatchScoped(scope, count, options)` — تشغيل دفعي

**النمط:** يحاول API أولًا ثم يرجع للتنفيذ المحلي JavaScript (fallback).

**المسودات:**
- `upsertAgentProposal(proposal)` — حفظ/تحديث مقترح
- `agentProposalEntries()` — كل المقترحات
- `updateAgentProposalStatus(id, status)` — تحديث حالة (pending, accepted, dismissed)
- `acceptAgentProposalToDraft(id)` — قبول مقترح وتحويله لمسودة

**الاعتماديات:** `state.js`, `constants.js`, `utils.js`, `display.js`, `storage.js`, `verification.js`, `queues.js`, `analytics.js`

---

### 14. `missions.js`
**الغرض:** سجل المهام، القوالب، الخطط، الجلسات، وتتبع التنفيذ.

**الصادرات (ملخص — أكثر من 25 دالة):**

**التسميات:**
- `missionPriorityLabel(priority)` — عالية جدًا / عالية / متوسطة / منخفضة
- `missionTypeLabel(type)` — جمع مصادر / مهمة تحقق / توسع تغطية / متابعة سجل

**القوالب المشتقة:**
- `derivedMissionTemplates()` — يولّد مهام تلقائية بناءً على حالة التحقق:
  - مهام جمع المصادر الناقصة/الضعيفة/المتعارضة
  - مهام سد فجوة الأدلة
  - مهام حسم الأحياء والمصدر والثقة والتعارضات
  - مهام توسع التغطية (أضعف الأحياء والقطاعات)

**الخطة:**
- `missionPlan()` — الخطة الكاملة: مهام مشتقة + مخصصة، مرتبة حسب الأولوية ثم الحالة
- `missionProgressSummary(recordSlugs)` — ملخص التقدم (total, touched, resolved, blocked, handoff, editorial)
- `missionStatusRecommendation(mission, progress)` — توصية بالحالة

**الجلسات:**
- `startOrOpenMissionSession(missionId)` — بدء أو فتح جلسة تنفيذ
- `addMissionAttempt({missionId, slug, note, outcome, attemptType})` — تسجيل محاولة
- `setMissionSessionStatus(missionId, status)` — تغيير حالة الجلسة
- `missionSessionSummary(session)` — ملخص الجلسة

**التصدير:**
- `exportMissionSession(missionId, format)` — تصدير (JSON/CSV/ملخص نصي)
- `exportableMissionSessionPayload(missionId)` — بيانات قابلة للتصدير

**اقتراحات لسجل:**
- `suggestedRecordMissions(record)` — مهام مقترحة لسجل بناءً على حالة تحققه
- `seedMissionFromSuggestion(suggestion)` — تحويل اقتراح لمهمة فعلية

**الاعتماديات:** `state.js`, `utils.js`, `display.js`, `storage.js`, `verification.js`, `analytics.js`

---

### 15. `patches.js`
**الغرض:** جاهزية الترقيع (Patch)، حزم الإصدار، المراجعة النهائية، التوقيع، وخطوط التصدير.

**الصادرات (ملخص — أكثر من 40 دالة):**

**جاهزية السجلات:**
- `recordReadiness(record)` — تقييم جاهزية شامل (not-ready, needs-follow-up, review-ready, export-ready, publish-ready, hold) يجمع بين الجاهزية التحريرية والتحققية والتنفيذية
- `recordPatchReadiness(record)` — جاهزية كمرشح patch (not-ready, follow-up-needed, review-ready, patch-ready, hold)
- `readinessSnapshot()` — لقطة شاملة لجاهزية كل السجلات

**المراجعة النهائية:**
- `finalPatchReviewSnapshot()` — لقطة مرشحي patch مع قرارات المراجعة
- `saveFinalPatchDecision({slug, decision, reason, note})` — حفظ قرار (approve/hold/exclude/rereview)
- `resolutionImpactSnapshot()` — تأثير القرارات على الصفوف

**التوقيع:**
- `derivePatchSignoff(item)` — اشتقاق حالة التوقيع
- `savePatchSignoffDecision({slug, decision, reason, note})` — حفظ قرار التوقيع
- `patchApplySimulationSnapshot()` — محاكاة التطبيق

**حزم الإصدار:**
- `derivedReleasePacks()` — 8 حزم مشتقة تلقائيًا:
  1. مرشحو patch الجاهزون
  2. سجلات جاهزة تحريريًا
  3. مخرجات تحقق قابلة للتسليم
  4. سجلات تحتاج متابعة
  5. سجلات قريبة من الاعتماد
  6. قرارات جاهزة للتسليم
  7. مخرجات تنفيذ قابلة للتسليم
  8. حزمة مرشحة للنشر
- `releasePackPlan()` — خطة الحزم
- `exportReleasePack(packId, format)` — تصدير حزمة

**التصدير:**
- `exportFinalPatchBundle(format)` — تصدير حزمة الترقيعات النهائية
- `exportPatchSignoffOutput(kind, format)` — تصدير تقارير التوقيع
- يدعم 3 صيغ: JSON, CSV, ملخص نصي

**مساعدات أخرى:**
- `verificationFollowupBuckets()` — تصنيف السجلات للمتابعة
- `coverageExpansionPlanner()` — مخطط توسع التغطية (أضعف الأحياء والقطاعات)

**الاعتماديات:** `state.js`, `utils.js`, `display.js`, `storage.js`, `verification.js`, `queues.js`, `analytics.js`

---

### 16. `bulk-review.js`
**الغرض:** جلسات المراجعة الدفعية وإدارة القرارات بالجملة.

**الصادرات:**

| الاسم | التوقيع | الوصف |
|---|---|---|
| `reviewSessionStorageKey(queueKey)` | `string → string` | مفتاح تخزين الجلسة |
| `getReviewSession(queueKey)` | `string → object` | جلب الجلسة من localStorage |
| `saveReviewSession(queueKey, session)` | `(string, object) → void` | حفظ الجلسة |
| `sessionLifecycleLabel(status)` | `string → string` | تسمية دورة حياة الجلسة |
| `bulkBatchKeys()` | `() → array` | مفاتيح الدفعات الخمس |
| `bulkDecisionLabel(decision)` | `string → string` | تسمية القرار (تمت المعالجة، تم التخطي، تم التأجيل، مراجعة أعمق، يحتاج إكمالًا، جاهز للمتابعة) |
| `bulkExecutionMeta(decision, record, queueKey)` | `(string, object, string) → object` | بيانات تنفيذ القرار |
| `bulkDecisionEntry(record, queueKey, decision, note)` | `(...) → object` | إنشاء قيد قرار |
| `bulkDecisionValue(session, slug)` | `(object, string) → object\|null` | قراءة قرار |
| `bulkSessionFollowup(workspace)` | `object → object` | تصنيف المتابعة |
| `bulkSessionSummary(workspace)` | `object → object` | ملخص الجلسة |
| `reviewSessionRegistry()` | `() → array` | سجل كل الجلسات مع حالاتها |
| `bulkWorkspaceState(queueKey)` | `string → object` | حالة مساحة العمل الكاملة |

**الاعتماديات:** `state.js`, `storage.js`, `queues.js`, `analytics.js`

---

### طبقة الواجهة (العرض والتوجيه)

---

### 17. `ui-helpers.js`
**الغرض:** دوال مساعدة للواجهة — الشريط الجانبي، التنزيل، تحميل البيانات، ومعالجة النماذج.

**الصادرات (ملخص — أكثر من 30 دالة):**

**الشريط الجانبي:** `isMobileViewport()`, `setSidebarOpen()`, `closeSidebar()`, `openSidebar()`, `bindSidebar()`, `syncMobileNavSections()`, `bindMobileNavSections()` — نسخة موحدة من `sidebar.js` مع دوال إضافية.

**عرض البيانات:**
- `topRatedRecords(records, limit)` — أعلى السجلات تقييمًا
- `topDistrictGroups(records, limit)` — أبرز الأحياء
- `entityValueLink(slug, content, className)` — رابط كيان
- `districtHref(district)` / `districtLink(district, label)` — رابط حي
- `entitiesTable(records)` — جدول HTML كامل للكيانات

**التحرير:**
- `diffRecord(original, updated)` — حساب الفرق بين نسختين
- `editableField(label, name, value, type)` — حقل تحرير
- `collectFormData(form)` — جمع بيانات النموذج
- `extractGoogleMapsDraft(urlInput, rawTextInput)` — استخلاص مسودة من بيانات Google Maps
- `applyImportedDraftToForm(form, imported)` — تطبيق مسودة مستوردة

**التنزيل:**
- `downloadJson(filename, payload)` — تنزيل ملف JSON
- `downloadText(filename, content, mime)` — تنزيل ملف نصي

**التصدير الدفعي:**
- `exportableBatchPayload(queueKey)` / `exportableBatchCsv(queueKey)` / `exportableBatchSummary(queueKey)` — تصدير دفعة
- `pushExportHistoryEntry(queueKey, format)` — تسجيل التصدير

**صف الاستيراد:**
- `makeQueueRequest(payload)` — إنشاء طلب استيراد
- `appendQueueRequestToProject(request)` — إلحاق طلب بملف import_queue.json (File System Access API)
- `queueContextForEntity(entity)` — سياق الصف للكيان

**البيانات:**
- `loadData()` / `refreshAgentRuntimeInfo()` — تحميل البيانات وفحص الـ runtime

**الاعتماديات:** `state.js`, `utils.js`, `display.js`, `dom.js`, `constants.js`, `storage.js`, `queues.js`, `analytics.js`

---

### 18. `rendering.js` (3,168 سطر — أكبر ملف)
**الغرض:** كل دوال العرض — مولدات قوالب HTML لكل مسار في التطبيق.

**الصادرات (31 دالة render):**

| الدالة | الوصف |
|---|---|
| `renderDashboard()` | لوحة المعلومات الرئيسية — إحصائيات، KPIs، أبرز السجلات |
| `renderAttentionQueuePage(queueKey)` | صفحة صف الانتباه مع الترتيب والترشيح |
| `renderQueueSortBar(activeKey)` | شريط الترتيب |
| `renderQueuePriorityBar(activeKey, groups, activeGroupKey)` | شريط الأولويات |
| `renderQueueList(queueKey, records)` | قائمة عناصر الصف |
| `renderResultsSection(records, options)` | قسم النتائج مع المرشحات |
| `renderFilterBar()` | شريط المرشحات |
| `renderBlueprintPage()` | صفحة المخطط |
| `renderSectorsIndexPage()` | فهرس القطاعات |
| `renderSectorPage(sectorKey)` | صفحة قطاع واحد |
| `renderPipelinePage()` | صفحة خط الأنابيب |
| `renderGovernancePage()` | صفحة الحوكمة |
| `renderEntitiesPage()` | صفحة الكيانات |
| `renderEntityPage(slug)` | صفحة كيان مفصلة — عرض/تحرير |
| `renderEditSection(title, kicker, note, fields, options)` | قسم تحرير |
| `renderEditForm(entity)` | نموذج التحرير الكامل |
| `renderEditorialControlCenter()` | مركز التحكم التحريري |
| `renderAgentDraftsHub()` | مركز مسودات الوكلاء |
| `renderAgentOpsConsole(selectedRunId)` | لوحة تشغيل الوكلاء |
| `renderVerificationWorkspace(queueKey)` | مساحة عمل التحقق |
| `renderVerificationProgramHub()` | مركز برنامج التحقق |
| `renderReleaseReadinessHub()` | مركز جاهزية الإصدار |
| `renderBulkBatchPicker(activeKey)` | منتقي الدفعات |
| `renderBulkWorkspace(queueKey)` | مساحة المراجعة الدفعية |
| `renderReviewOperationsHub()` | مركز عمليات المراجعة |
| `renderStatusPage()` | صفحة الحالة |
| `renderDistrictsPage(selectedDistrict)` | صفحة الأحياء |
| `renderFiltersPage()` | صفحة المرشحات |
| `renderDiscoveryPage()` | صفحة الاستكشاف |
| `renderReviewPage()` | صفحة المراجعة |
| `renderSearch(term)` | صفحة البحث |

**الاعتماديات:** يستورد من **كل** الوحدات الأخرى تقريبًا — هذا هو المُجمّع المركزي للعرض.

---

### 19. `router.js` (763 سطر)
**الغرض:** موجه التطبيق الرئيسي، ربط الأحداث، والتهيئة.

**الصادرات:**

| الاسم | التوقيع | الوصف |
|---|---|---|
| `bindFilters()` | `() → void` | ربط أحداث المرشحات (change, clear) |
| `bindEditorActions()` | `() → void` | ربط أحداث التحرير (toggle-edit, cancel-edit, import-draft, save-draft, submit-queue, إلخ) |
| `applyDashboardPreset(preset)` | `string → void` | تطبيق إعدادات مسبقة للوحة المعلومات |
| `bindDashboardActions()` | `() → void` | ربط كل أحداث الأزرار والنقر في كل الصفحات |
| `router()` | `() → void` | **الدالة المركزية** — يقرأ `location.hash` ويوجه إلى دالة العرض المناسبة |

**المسارات المدعومة:**

| النمط | دالة العرض |
|---|---|
| `#/dashboard` أو `#/` | `renderDashboard()` |
| `#/sectors` | `renderSectorsIndexPage()` |
| `#/sectors/:key` | `renderSectorPage(key)` |
| `#/entities` | `renderEntitiesPage()` |
| `#/entities/:slug` | `renderEntityPage(slug)` |
| `#/districts` أو `#/districts/:name` | `renderDistrictsPage(name)` |
| `#/status` | `renderStatusPage()` |
| `#/blueprint` | `renderBlueprintPage()` |
| `#/pipeline` | `renderPipelinePage()` |
| `#/governance` | `renderGovernancePage()` |
| `#/filters` | `renderFiltersPage()` |
| `#/sources` | `renderDiscoveryPage()` |
| `#/queue/:key` | `renderAttentionQueuePage(key)` |
| `#/review` | `renderReviewPage()` |
| `#/ops` | `renderReviewOperationsHub()` |
| `#/editorial` | `renderEditorialControlCenter()` |
| `#/agent-drafts` | `renderAgentDraftsHub()` |
| `#/agent-ops` | `renderAgentOpsConsole()` |
| `#/verification` | `renderVerificationWorkspace()` |
| `#/verification-program` | `renderVerificationProgramHub()` |
| `#/release` | `renderReleaseReadinessHub()` |
| `#/bulk/:key` | `renderBulkWorkspace(key)` |
| `#/search?q=...` | `renderSearch(q)` |

**التهيئة** (أسفل الملف): يستدعي `bindSidebar()` و `bindMobileNavSections()` ثم `loadData()` → `refreshAgentRuntimeInfo()` → `router()`. يستمع لـ `hashchange` لإعادة التوجيه.

**الاعتماديات:** يستورد من **كل** الوحدات الأخرى — هذا هو المنسق المركزي.

---

## مخطط الاعتماديات بين وحدات JS

```
constants ─────────────────────────────────────────────────────┐
state ─────────────────────────────────────────────────────────┤
dom ───────────────────────────────────────────────────────────┤
                                                               │
utils ←── state                                                │
display ←── constants, dom, utils                              │
                                                               │
analytics ←── state, constants, utils                          ├──→ rendering ──→ router
storage ←── state, analytics                                   │
verification ←── state, utils, storage                         │
queues ←── state, constants, utils, display, analytics, storage│
filters ←── state, constants, utils, display                   │
                                                               │
agents ←── state, constants, utils, display, storage,          │
           verification, queues, analytics                     │
missions ←── state, utils, display, storage, verification,     │
             analytics                                         │
patches ←── state, utils, display, storage, verification,      │
            queues, analytics                                  │
bulk-review ←── state, storage, queues, analytics              │
ui-helpers ←── state, utils, display, dom, constants, storage, │
               queues, analytics                               ┘
```

**ملاحظة:** التبعية الدائرية بين `storage.js` و `queues.js` مُحلّة عبر نمط `setQueueReasonsProvider()` (حقن متأخر).

---

## ملفات CSS — css/

### ترتيب الاستيراد في `styles.css`

```css
@import 'css/variables.css';     /* 1 — أساسي */
@import 'css/layout.css';        /* 2 — هيكل */
@import 'css/sidebar.css';       /* 3 — تنقل */
@import 'css/components.css';    /* 4 — مكونات عامة */
@import 'css/hero.css';          /* 5 — أقسام بارزة */
@import 'css/queue.css';         /* 6 — صفوف المراجعة */
@import 'css/bulk-review.css';   /* 7 — مراجعة دفعية */
@import 'css/ops-editorial.css'; /* 8 — عمليات وتحرير */
@import 'css/verification.css';  /* 9 — تحقق */
@import 'css/entity.css';        /* 10 — كيانات */
@import 'css/utilities.css';     /* 11 — أدوات مساعدة */
@import 'css/responsive.css';    /* 12 — استجابة — آخر ملف */
```

---

### 1. `variables.css`
**الغرض:** نظام التصميم — لوحة الألوان والمتغيرات الأساسية.

**المتغيرات المُعرّفة (`:root`):**

| المتغير | القيمة | الوصف |
|---|---|---|
| `--bg` | `#0b1220` | خلفية أساسية داكنة |
| `--panel` | `#121a2b` | خلفية اللوحة |
| `--panel-2` | `#182235` | لوحة أفتح |
| `--panel-3` | `#1d2940` | لوحة متوسطة |
| `--soft` | `#1f2d47` | خلفية ناعمة |
| `--text` | `#edf2f7` | لون النص الأساسي |
| `--muted` | `#aab6cb` | نص ثانوي |
| `--line` | `#253450` | حدود/فواصل |
| `--gold` | `#b8a76a` | لون مميز ذهبي |
| `--green` | `#26a269` | نجاح |
| `--yellow` | `#c88800` | تحذير |
| `--red` | `#d94c4c` | خطأ |
| `--blue` | `#3b82f6` | معلومات |
| `--shadow` | `0 10px 30px rgba(0,0,0,.28)` | ظل عام |

**المحددات:** `*` (box-sizing), `html, body` (منع التمرير الأفقي), `body` (خلفية متدرجة radial + خط).

---

### 2. `layout.css`
**الغرض:** هيكل الصفحة الأساسي بـ CSS Grid و Flexbox.

**المحددات الرئيسية:**
- `.app-shell` — شبكة عمودين (320px شريط جانبي + مرن رئيسي)
- `.main-area` — المنطقة الرئيسية (padding: 24px)
- `.topbar` — الشريط العلوي (flexbox, تدرج, ظل)
- `.topbar-tag` — وسم ذهبي
- `.breadcrumbs` — مسار التنقل
- `.topbar-actions` — أزرار الشريط العلوي
- `.section` / `.section-header` — أقسام المحتوى

---

### 3. `sidebar.css`
**الغرض:** الشريط الجانبي والتنقل الشجري.

**المحددات الرئيسية:**
- `.sidebar-toggle` — زر القائمة المحمولة (مخفي افتراضيًا)
- `.sidebar-overlay` — خلفية شفافة للمحمول
- `.sidebar` — شريط جانبي ثابت (sticky, 100vh)
- `.brand` — الشعار والعنوان
- `.sidebar-search` — حقل البحث
- `.nav-group` / `.nav-title` — مجموعات التنقل مع عناوين ذهبية
- `.nav-subtree` / `.nav-child` — تنقل متداخل مع حد أيسر
- `.nav-parent-toggle` — أقسام قابلة للطي مع حركة دوران (180ms)

---

### 4. `components.css`
**الغرض:** المكونات القابلة لإعادة الاستخدام.

**المكونات:**
- `.pill` — حبوب ملونة (success, muted, warning, danger, info)
- `.grid` — شبكة متجاوبة (cards-4, cards-3, cards-2)
- `.card` / `.metric` / `.metric-sub` — بطاقات مع أرقام كبيرة
- `.table-wrap` / `.table` — جدول متجاوب (min-width: 800px)
- `.badge` — شارات الحالة (discovered, profiled, partially_verified, verified, needs_review, branch_conflict)
- `.kv` / `.kv-item` — أزواج مفتاح-قيمة
- `.button` — أزرار بمتغيرات (primary, gold, queue, subtle) مع hover translateY(-1px)
- `.filters` — شبكة مرشحات 4 أعمدة
- `.empty` — حالة فارغة
- `.results-section` / `.result-card` — قسم النتائج
- `.import-box` — صندوق الاستيراد

---

### 5. `hero.css`
**الغرض:** الأقسام البارزة والصفحات الرئيسية.

**المحددات الرئيسية:**
- `.hero` / `.page-hero` / `.hero-compact` — أقسام بارزة بتدرجات
- `.home-hero` / `.operator-hero` — متغيرات خاصة
- `.home-grid` — تخطيط 1.2fr/0.8fr
- `.spotlight-card` — بطاقة مع تدرج pseudo-element
- `.mini-stats` — بطاقات إحصائيات صغيرة
- `.operator-kpi-grid` — شبكة KPI 6 أعمدة
- `.shortcut-grid` — شبكة اختصارات 3 أعمدة

---

### 6. `queue.css`
**الغرض:** نظام صفوف المراجعة.

**المحددات الرئيسية:**
- `.queue-shell` — الحاوية (gap: 18px)
- `.queue-switcher` — مبدل التبويبات (4 أعمدة)
- `.queue-tab` — تبويب مع حالة active
- `.queue-summary-grid` — شبكة ملخص 4 أعمدة
- `.queue-priority-bar` / `.queue-priority-chip` — شريط/رقاقات الأولوية
- `.queue-toolbar` — شريط أدوات مع ترتيب
- `.queue-list` / `.queue-row` — قائمة العناصر (2 أعمدة)
- `.queue-reason` — سبب بتلوين أزرق
- `.queue-priority-level` — مؤشر الأولوية (high, medium)

---

### 7. `bulk-review.css`
**الغرض:** واجهة المراجعة الدفعية.

**المحددات الرئيسية:**
- `.bulk-shell` — الحاوية
- `.bulk-batch-grid` — شبكة دفعات 5 أعمدة
- `.bulk-batch-card` — بطاقة دفعة مع حالة active
- `.bulk-progress-grid` — شبكة تقدم 5 أعمدة
- `.bulk-execution-panel` — لوحة تنفيذ (عمودين)
- `.bulk-layout` — تخطيط رئيسي/جانبي (1.2fr/0.8fr)
- `.bulk-current-card` / `.bulk-actions` — بطاقة العنصر الحالي وأزرار

---

### 8. `ops-editorial.css`
**الغرض:** لوحة العمليات ومركز التحرير.

**المحددات الرئيسية:**
- `.ops-hub` — مركز العمليات
- `.ops-hub-kpis` — شبكة KPI 5 أعمدة
- `.ops-hub-grid` — شبكة محتوى (عمودين)
- `.ops-session-list` / `.ops-session-item` — قائمة الجلسات
- `.editorial-shell` — مركز التحرير
- `.editorial-kpis` — شبكة KPI 5 أعمدة
- `.editorial-grid` — شبكة محتوى (عمودين)
- `.editorial-list` / `.editorial-item` — قائمة العناصر التحريرية

---

### 9. `verification.css`
**الغرض:** واجهة التحقق واتخاذ القرارات.

**المحددات الرئيسية:**
- `.verification-shell` — الحاوية
- `.verification-switcher` — مبدل 5 تبويبات
- `.verification-kpis` — شبكة KPI 5 أعمدة
- `.verification-grid` — شبكة (عمودين)
- `.verification-queue-toolbar` — شريط أدوات (1.6fr/0.9fr)
- `.verification-action-hint` — تلميح الإجراء
- `.verification-item` — عنصر تحقق
- `.verification-decision-strip` — شريط القرار
- `.verification-decision-actions` — أزرار القرار
- `.verification-program-shell` / `.verification-program-kpis` — برنامج التحقق

---

### 10. `entity.css`
**الغرض:** صفحات تفاصيل الكيانات والتحرير والتصنيف.

**المحددات الرئيسية:**
- `.sectors-tree` / `.tree-root` / `.tree-node` / `.tree-children` — شجرة القطاعات
- `.district-badges` / `.district-badge` — شارات الأحياء (3 أعمدة)
- `.edit-grid` / `.edit-workbench` — مساحة التحرير (عمودين)
- `.edit-section-card` — قسم قابل للطي (`<details>`)
- `.edit-field` — حقل تحرير مع تسمية
- `.draft-message` — مؤشر حالة المسودة
- `.agent-run-feedback` — ملاحظات الوكيل (loading, success, empty, error)
- `.record-context-bar` — شريط السياق
- `.entity-triage-layout` — تخطيط التصنيف (1.35fr/0.65fr)
- `.triage-highlight` / `.triage-check-card` / `.triage-list` — عناصر التصنيف

---

### 11. `utilities.css`
**الغرض:** مكونات مساعدة صغيرة.

**المحددات الرئيسية:**
- `.timeline` / `.timeline-item` — خط زمني بحد ذهبي أيسر
- `.chips` / `.chip` — وسوم صغيرة
- `.list-clean` — قائمة بدون تنسيق
- `.note` — نص صغير خافت
- `.stack-list` / `.stack-item` / `.compact-stack` — قائمة مكدسة
- `.search-results` / `.search-hit` — نتائج البحث

---

### 12. `responsive.css`
**الغرض:** الاستجابة والتكيف مع أحجام الشاشات.

**نقاط القطع:**

**`max-width: 1100px`:**
- `.app-shell` يتحول لعمود واحد
- `.sidebar` يصبح relative
- الشبكات المتعددة الأعمدة تتقلص (3→2 أو 1)
- `.topbar` يتحول لـ flex-column
- شبكات KPI تتقلص من 5-6 إلى 3 أعمدة

**`max-width: 720px`:**
- `.app-shell` يصبح block
- padding ينخفض (24px → 16px)
- أحجام الخطوط تنخفض
- كل الشبكات تصبح عمود واحد
- الأزرار تصبح بعرض كامل
- `.sidebar` يصبح fixed خارج الشاشة (translateX(110%))
  - العرض: `min(88vw, 360px)`
  - حركة انزلاق (220ms ease)
- أهداف اللمس تزداد (46-52px minimum height)
- `touch-action: manipulation` للعناصر التفاعلية

---

## العلاقة بين CSS و JS

| ملف CSS | الوحدة JS المقابلة | ملاحظات |
|---|---|---|
| `variables.css` | — | أساسي لكل الملفات |
| `layout.css` | `dom.js`, `display.js` | هيكل الصفحة |
| `sidebar.css` | `sidebar.js`, `ui-helpers.js` | التنقل |
| `components.css` | `display.js`, `filters.js`, `ui-helpers.js` | مكونات مشتركة |
| `hero.css` | `rendering.js` | الأقسام البارزة |
| `queue.css` | `queues.js`, `rendering.js` | صفوف الانتباه |
| `bulk-review.css` | `bulk-review.js`, `rendering.js` | المراجعة الدفعية |
| `ops-editorial.css` | `rendering.js` | العمليات والتحرير |
| `verification.css` | `verification.js`, `rendering.js` | التحقق |
| `entity.css` | `rendering.js`, `agents.js` | تفاصيل الكيانات |
| `utilities.css` | عدة وحدات | أدوات مساعدة |
| `responsive.css` | `sidebar.js`, `ui-helpers.js` | الاستجابة |

---

## أنماط تصميم بارزة

1. **Hash-Based Routing** — لا توجيه على الخادم؛ كل العروض تتحدد بـ `location.hash`
2. **Client-Side Rendering** — SPA مع تلاعب DOM ديناميكي
3. **Runtime Proxy** — طبقة أمان بين الواجهة ووكلاء الذكاء الاصطناعي
4. **Whitelisted Fields** — قيود أمنية على الحقول القابلة للتعديل بواسطة الوكلاء
5. **Fallback Architecture** — تطبيقات محلية تسمح بالعمل بدون اتصال
6. **Audit Trail** — كل استدعاء للوكلاء يُسجل للمراجعة
7. **Lazy Injection** — حل التبعيات الدائرية عبر `setQueueReasonsProvider()`
8. **Three-Axis Verification** — نظام تحقق بثلاثة محاور مستقلة (مصدر، حي، ثقة)
9. **Dark Theme** — سمة داكنة مع لمسات ذهبية
10. **RTL-First** — تصميم من اليمين لليسار أولًا

---

> **سجل إعادة الهيكلة (4 مراحل — مكتملة):**
>
> ~~المرحلة 1 — JS~~ ✅ تقسيم script.js (8,665 سطر) إلى 19 ES module في مجلد `modules/`
>
> ~~المرحلة 2 — CSS~~ ✅ تقسيم styles.css (1,751 سطر) إلى 12 ملف CSS في مجلد `css/`
>
> ~~المرحلة 3 — التوثيق~~ ✅ كتابة ARCHITECTURE.md (987 سطر) يغطي كل الوحدات والعلاقات
>
> ~~المرحلة 4 — التكامل والاستقرار~~ ✅ تحديث index.html لاستخدام ES modules، إنشاء main.js كنقطة دخول، إصلاح ~40 استيراد مفقود عبر 7 ملفات، حفظ script.js الأصلي كنسخة احتياطية
