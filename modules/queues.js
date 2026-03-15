// ─── modules/queues.js ───
// Attention queues, priority scoring, grouping, view state, and entity triage.

import { state } from './state.js';
import { STATUS_AR } from './constants.js';
import { esc } from './utils.js';
import { displayText, displayConfidence } from './display.js';
import { importantMissingFields } from './analytics.js';
import { setQueueReasonsProvider } from './storage.js';

/* ══════════════════════════════════════════════════════════════
   Routing helpers
   ══════════════════════════════════════════════════════════════ */

export function queueHref(key = 'needs-review', options = {}) {
  const params = new URLSearchParams();
  if (options.priority) params.set('priority', options.priority);
  if (options.sort && options.sort !== 'default') params.set('sort', options.sort);
  const query = params.toString();
  return `#/ops/${encodeURIComponent(key)}${query ? `?${query}` : ''}`;
}

export function entityHref(slug = '', options = {}) {
  const params = new URLSearchParams();
  if (options.queue) params.set('queue', options.queue);
  if (options.priority) params.set('priority', options.priority);
  if (options.sort && options.sort !== 'default') params.set('sort', options.sort);
  if (Number.isInteger(options.index)) params.set('index', String(options.index));
  if (options.edit) params.set('edit', '1');
  const query = params.toString();
  return `#/entities/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`;
}

export function parseHashRoute(hash = location.hash || '#/dashboard') {
  const cleaned = hash.replace(/^#\//, '');
  const [pathPart, queryPart = ''] = cleaned.split('?');
  const parts = pathPart.split('/');
  return { parts, query: new URLSearchParams(queryPart) };
}

/* ══════════════════════════════════════════════════════════════
   Priority scoring
   ══════════════════════════════════════════════════════════════ */

function parseDateValue(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const timestamp = Date.parse(raw);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function recentnessScore(record) {
  return Math.max(parseDateValue(record.last_updated_at), parseDateValue(record.last_verified_at));
}

export function operationalValue(record) {
  const reviews = Number(record.google_reviews_count || 0);
  const rating = Number(record.google_rating || 0);
  const statusBoost = ({
    verified: 18, partially_verified: 14, needs_review: 12, profiled: 8, discovered: 6, stub: 4,
  }[record.status] || 0);
  return reviews + (rating * 120) + statusBoost;
}

export function completionGap(record) {
  return importantMissingFields(record).length;
}

export function queuePriorityScore(record, queueKey = 'needs-review') {
  const missing = completionGap(record);
  const value = operationalValue(record);
  const recent = recentnessScore(record);
  switch (queueKey) {
    case 'needs-review': return value + recent + (record.status === 'branch_conflict' ? 25000 : 0) + (record.status === 'needs_review' ? 18000 : 0) - (missing * 500);
    case 'new-incomplete': return recent + value - (missing * 900);
    case 'quick-complete': return value + (missing === 1 ? 14000 : 7000) + recent;
    case 'missing-district': return value + (String(record.short_address || '').trim() ? 10000 : 0) + (String(record.reference_url || '').trim() ? 6000 : 0);
    case 'missing-source': return value + (String(record.official_instagram || '').trim() ? 9000 : 0) + (String(record.short_address || '').trim() ? 4000 : 0);
    case 'missing-address': return value + (String(record.reference_url || '').trim() ? 9000 : 0) + (String(record.district || '').trim() && String(record.district).trim() !== 'غير متحقق' ? 5000 : 0);
    case 'low-confidence': return value + (String(record.reference_url || '').trim() ? 7000 : 0) + (String(record.short_address || '').trim() ? 4000 : 0) + recent;
    default: return value + recent - (missing * 500);
  }
}

export function queuePriorityBadge(record, queueKey = 'needs-review') {
  const score = queuePriorityScore(record, queueKey);
  if (score >= 30000) return 'عالية';
  if (score >= 15000) return 'متوسطة';
  return 'عادية';
}

export function queueExpectedAction(record, queueKey = 'needs-review') {
  const actions = {
    'needs-review': record.status === 'branch_conflict' ? 'حسم التعارض' : 'مراجعة واعتماد',
    'new-incomplete': completionGap(record) <= 2 ? 'إكمال سريع' : 'استكمال البيانات',
    'quick-complete': completionGap(record) === 1 ? 'إغلاق النقص الأخير' : 'إكمال حقلين',
    'missing-district': 'تحديد الحي',
    'missing-source': 'إضافة مرجع',
    'missing-address': 'إضافة عنوان مختصر',
    'low-confidence': 'رفع الثقة',
  };
  return actions[queueKey] || 'فتح السجل';
}

export function queueActionLabel(queueKey = 'needs-review') {
  const labels = {
    'needs-review': 'فتح للمراجعة', 'missing-district': 'تحديد الحي',
    'new-incomplete': 'إكمال السجل', 'low-confidence': 'رفع الثقة',
    'missing-source': 'إضافة مرجع', 'missing-address': 'إكمال العنوان',
    'quick-complete': 'إنهاء سريع',
  };
  return labels[queueKey] || 'فتح السجل';
}

/* ══════════════════════════════════════════════════════════════
   Priority groups
   ══════════════════════════════════════════════════════════════ */

export function queuePriorityGroups(queueKey = 'needs-review', records = []) {
  const groupsByQueue = {
    'needs-review': [
      { key: 'urgent', label: 'الأكثر حاجة للتدخل الآن', pick: record => record.status === 'branch_conflict' || queuePriorityScore(record, queueKey) >= 30000 },
      { key: 'fast', label: 'الأسرع للمراجعة', pick: record => record.status === 'needs_review' && completionGap(record) <= 2 },
      { key: 'follow-up', label: 'متابعة لاحقة', pick: () => true },
    ],
    'new-incomplete': [
      { key: 'close', label: 'الأقرب للإنهاء', pick: record => completionGap(record) <= 2 },
      { key: 'recent', label: 'المضاف حديثًا', pick: record => recentnessScore(record) >= parseDateValue('2026-03-11') },
      { key: 'build', label: 'الأكثر نقصًا', pick: () => true },
    ],
    'quick-complete': [
      { key: 'one-step', label: 'خطوة واحدة', pick: record => completionGap(record) === 1 },
      { key: 'high-value', label: 'الأعلى قيمة تشغيلية', pick: record => operationalValue(record) >= 2000 },
      { key: 'two-step', label: 'يحتاج لمستين', pick: () => true },
    ],
    'missing-district': [
      { key: 'easy', label: 'الأسرع للحسم', pick: record => String(record.short_address || '').trim() || String(record.reference_url || '').trim() },
      { key: 'high-value', label: 'الأعلى قيمة تشغيلية', pick: record => operationalValue(record) >= 2200 },
      { key: 'deep', label: 'يحتاج تتبعًا أعمق', pick: () => true },
    ],
    'missing-source': [
      { key: 'easy', label: 'الأسرع للإكمال', pick: record => String(record.official_instagram || '').trim() || String(record.short_address || '').trim() },
      { key: 'high-value', label: 'الأعلى قيمة تشغيلية', pick: record => operationalValue(record) >= 2200 },
      { key: 'deep', label: 'يحتاج بحثًا إضافيًا', pick: () => true },
    ],
    'missing-address': [
      { key: 'easy', label: 'الأسرع للإكمال', pick: record => String(record.reference_url || '').trim() || String(record.district || '').trim() },
      { key: 'recent', label: 'المضاف حديثًا', pick: record => recentnessScore(record) >= parseDateValue('2026-03-11') },
      { key: 'deep', label: 'يحتاج تتبعًا', pick: () => true },
    ],
    'low-confidence': [
      { key: 'high-value', label: 'الأعلى قيمة تشغيلية', pick: record => operationalValue(record) >= 2200 },
      { key: 'fast', label: 'الأسرع لرفع الثقة', pick: record => String(record.reference_url || '').trim() && String(record.short_address || '').trim() },
      { key: 'research', label: 'يحتاج تدخلًا أعمق', pick: () => true },
    ],
  };
  const configs = groupsByQueue[queueKey] || [
    { key: 'focus', label: 'الأولوية الآن', pick: () => true },
    { key: 'all', label: 'كل السجلات', pick: () => true },
  ];
  const remaining = [...records];
  const groups = configs.map((config, index) => {
    let items = [];
    if (index === configs.length - 1) { items = [...remaining]; }
    else { items = remaining.filter(config.pick); }
    items.forEach(item => { const at = remaining.indexOf(item); if (at >= 0) remaining.splice(at, 1); });
    return { ...config, items };
  }).filter(group => group.items.length);
  return groups.length ? groups : [{ key: 'all', label: 'كل السجلات', items: records }];
}

/* ══════════════════════════════════════════════════════════════
   Attention queues
   ══════════════════════════════════════════════════════════════ */

export function attentionQueues() {
  return {
    'needs-review': {
      title: 'يحتاج مراجعة', note: 'السجلات التي تحتاج قرارًا أو فحصًا مباشرًا.',
      records: () => state.records.filter(r => ['needs_review', 'branch_conflict', 'partially_verified'].includes(r.status)),
      reason: r => r.status === 'branch_conflict' ? 'تعارض فروع' : (STATUS_AR[r.status] || r.status),
      sort: (a, b) => { const rank = value => ({ needs_review: 0, branch_conflict: 1, partially_verified: 2 }[value] ?? 9); return rank(a.status) - rank(b.status); },
    },
    'missing-district': {
      title: 'ناقص الحي', note: 'سجلات لا يظهر فيها الحي بشكل واضح أو ما زالت غير متحققة.',
      records: () => state.records.filter(r => !String(r.district || '').trim() || String(r.district).trim() === 'غير متحقق'),
      reason: () => 'بحاجة إلى تحديد الحي',
      sort: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'),
    },
    'new-incomplete': {
      title: 'جديد / غير مكتمل', note: 'سجلات جديدة أو ما زالت في بداية التجهيز.',
      records: () => state.records.filter(r => ['stub', 'discovered', 'profiled', 'partially_verified'].includes(r.status)),
      reason: r => STATUS_AR[r.status] || r.status,
      sort: (a, b) => { const rank = value => ({ stub: 0, discovered: 1, profiled: 2, partially_verified: 3 }[value] ?? 9); return rank(a.status) - rank(b.status); },
    },
    'low-confidence': {
      title: 'ثقة منخفضة', note: 'سجلات تحتاج تثبيتًا أو توثيقًا أقوى.',
      records: () => state.records.filter(r => String(r.confidence || '').trim().toLowerCase() === 'low'),
      reason: () => 'درجة الثقة منخفضة',
      sort: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'),
    },
    'missing-source': {
      title: 'ناقص المصدر', note: 'سجلات لا تحتوي على رابط مرجعي واضح.',
      records: () => state.records.filter(r => !String(r.reference_url || '').trim()),
      reason: () => 'لا يوجد مرجع واضح',
      sort: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'),
    },
    'missing-address': {
      title: 'ناقص العنوان', note: 'سجلات تحتاج عنوانًا مختصرًا أو أوضح.',
      records: () => state.records.filter(r => !String(r.short_address || '').trim()),
      reason: () => 'العنوان غير مكتمل',
      sort: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'),
    },
    'quick-complete': {
      title: 'إكمال سريع', note: 'سجلات ينقصها عدد قليل من الحقول الأساسية ويمكن إنهاؤها بسرعة.',
      records: () => state.records
        .map(record => ({ record, missing: importantMissingFields(record) }))
        .filter(item => item.missing.length > 0 && item.missing.length <= 2)
        .sort((a, b) => a.missing.length - b.missing.length)
        .map(item => ({ ...item.record, _missingFields: item.missing })),
      reason: r => `ناقص: ${(r._missingFields || importantMissingFields(r)).join('، ')}`,
      sort: (a, b) => (a._missingFields?.length || importantMissingFields(a).length) - (b._missingFields?.length || importantMissingFields(b).length),
    },
  };
}

/* ══════════════════════════════════════════════════════════════
   Queue view state
   ══════════════════════════════════════════════════════════════ */

export function queueViewState(queueKey = 'needs-review', options = {}) {
  const sortMode = options.sort || state.queueSort;
  const priorityKey = options.priority || state.queuePriority;
  const queueMap = attentionQueues();
  const queue = queueMap[queueKey] || queueMap['needs-review'];
  const items = [...queue.records()];
  let sorted = items;
  if (sortMode === 'alpha') { sorted = items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar')); }
  else if (sortMode === 'district') { sorted = items.sort((a, b) => String(a.district || '').localeCompare(String(b.district || ''), 'ar')); }
  else if (sortMode === 'status') { sorted = items.sort((a, b) => String(a.status || '').localeCompare(String(b.status || ''), 'ar')); }
  else { sorted = queue.sort ? items.sort(queue.sort) : items; }
  const groups = queuePriorityGroups(queueKey, sorted);
  const allowedKeys = new Set(groups.map(group => group.key));
  const activePriority = allowedKeys.has(priorityKey) ? priorityKey : (groups[0]?.key || 'default');
  const activeGroup = groups.find(group => group.key === activePriority) || groups[0] || { key: 'all', label: 'كل السجلات', items: sorted };
  return { items: sorted, groups, activePriority, activeGroup, sortMode };
}

export function queueRecords(queueKey = 'needs-review') { return queueViewState(queueKey).items; }

export function visibleQueueRecords(queueKey = 'needs-review') {
  const view = queueViewState(queueKey);
  state.queuePriority = view.activePriority;
  return { items: view.items, groups: view.groups, activeGroup: view.activeGroup };
}

/* ══════════════════════════════════════════════════════════════
   Queue display helpers
   ══════════════════════════════════════════════════════════════ */

export function queueSummary(record, queueKey = 'needs-review') {
  const pieces = [displayText(record.district), STATUS_AR[record.status] || record.status || 'غير متحقق'];
  if (queueKey !== 'low-confidence' && record.confidence) pieces.push(`الثقة ${displayConfidence(record.confidence)}`);
  if (record.google_rating) pieces.push(`${record.google_rating} من 5`);
  return pieces.filter(Boolean).join(' • ');
}

export function queueTitleByKey(queueKey = 'needs-review') {
  return (attentionQueues()[queueKey] || attentionQueues()['needs-review']).title;
}

export function renderQueueSwitcher(activeKey = 'needs-review') {
  const queueMap = attentionQueues();
  return `<div class="queue-switcher">${Object.entries(queueMap).map(([key, queue]) => `
    <a href="${queueHref(key)}" class="queue-tab ${key === activeKey ? 'is-active' : ''}">
      <strong>${queue.title}</strong><span>${queue.records().length} سجل</span>
    </a>`).join('')}</div>`;
}

/* ══════════════════════════════════════════════════════════════
   Entity triage and checklist
   ══════════════════════════════════════════════════════════════ */

export function kv(label, value) {
  const finalValue = displayText(value);
  const missing = finalValue === 'غير متحقق' || finalValue === '—';
  return `<div class="kv-item ${missing ? 'is-missing' : ''}"><div class="label">${esc(label)}</div><div class="value">${esc(finalValue)}</div></div>`;
}

export function entityChecklist(entity) {
  const groups = [
    { label: 'الأساسيات', total: 5, done: [
        String(entity.district || '').trim() && String(entity.district).trim() !== 'غير متحقق',
        String(entity.short_address || '').trim(),
        String(entity.reference_url || '').trim(),
        String(entity.google_rating || '').trim(),
        String(entity.google_reviews_count || '').trim(),
      ].filter(Boolean).length },
    { label: 'المصدر والثقة', total: 4, done: [
        String(entity.reference_url || '').trim(),
        String(entity.official_instagram || '').trim(),
        String(entity.confidence || '').trim() && entity.confidence !== 'low',
        String(entity.last_verified_at || '').trim(),
      ].filter(Boolean).length },
    { label: 'التجربة والوصف', total: 4, done: [
        String(entity.editorial_summary || '').trim(),
        String(entity.place_personality || '').trim(),
        String(entity.why_choose_it || '').trim(),
        String(entity.not_for_whom || '').trim(),
      ].filter(Boolean).length },
  ];
  return groups.map(group => ({ ...group, ratio: `${group.done}/${group.total}` }));
}

export function entityQueueReasons(entity) {
  return Object.entries(attentionQueues())
    .map(([key, queue]) => ({ key, title: queue.title, matched: queue.records().find(item => item.slug === entity.slug), queue }))
    .filter(item => item.matched)
    .map(item => ({ key: item.key, title: item.title, reason: item.queue.reason(item.matched), action: queueExpectedAction(item.matched, item.key) }));
}

export function entityTriage(entity) {
  const missing = importantMissingFields(entity);
  const queueReasons = entityQueueReasons(entity);
  const readiness = missing.length === 0 && entity.status === 'verified'
    ? { label: 'جاهز', note: 'الأساسيات مكتملة والسجل معتمد.' }
    : missing.length <= 2 && ['verified', 'partially_verified', 'needs_review'].includes(entity.status)
      ? { label: 'قريب من الجاهزية', note: 'ينقصه عدد محدود من العناصر قبل أن يصبح أوضح وأكمل.' }
      : { label: 'يحتاج عملًا', note: 'ما زالت هناك نواقص أو مراجعات تمنع اعتباره جاهزًا.' };
  const districtMissing = !String(entity.district || '').trim() || String(entity.district).trim() === 'غير متحقق';
  const sourceMissing = !String(entity.reference_url || '').trim();
  const addressMissing = !String(entity.short_address || '').trim();
  const sourceStatus = sourceMissing
    ? { label: 'المصدر ناقص', note: 'أضف مرجعًا واضحًا حتى تصبح المعلومة أسهل في التحقق.' }
    : { label: 'المصدر موجود', note: 'هناك رابط مرجعي متاح ويمكن الرجوع إليه مباشرة.' };
  const districtStatus = districtMissing
    ? { label: 'الحي غير واضح', note: 'تحديد الحي سيرفع جودة السجل ووضوحه في التصفح.' }
    : { label: 'الحي محدد', note: `الحي الحالي: ${displayText(entity.district)}` };
  const confidenceHint = entity.confidence === 'high' ? 'الثقة مرتفعة حاليًا.'
    : entity.confidence === 'medium' ? 'الثقة متوسطة وتحتاج تثبيتًا إضافيًا عند الإمكان.'
    : 'الثقة منخفضة وتحتاج مرجعًا أو مراجعة أقوى.';
  const nextAction = districtMissing ? 'ابدأ بتحديد الحي' : sourceMissing ? 'أضف مرجعًا مباشرًا'
    : addressMissing ? 'أكمل العنوان المختصر' : entity.status === 'needs_review' ? 'راجع السجل تمهيدًا للاعتماد'
    : entity.status === 'branch_conflict' ? 'احسم تعارض الفروع' : entity.confidence === 'low' ? 'ارفع مستوى الثقة'
    : 'السجل صالح للمتابعة الخفيفة فقط';
  const quickItems = [
    districtMissing ? 'تحديد الحي' : '', sourceMissing ? 'إضافة المرجع' : '',
    addressMissing ? 'إكمال العنوان' : '',
    !String(entity.editorial_summary || '').trim() ? 'إضافة نبذة مختصرة' : '',
    !String(entity.source_notes || '').trim() ? 'إضافة ملاحظة مصدر' : '',
  ].filter(Boolean);
  const qualityHints = [
    !String(entity.google_rating || '').trim() ? 'التقييم غير ظاهر بعد.' : '',
    !String(entity.google_reviews_count || '').trim() ? 'عدد المراجعات غير ظاهر.' : '',
    !String(entity.why_choose_it || '').trim() ? 'سبب الاختيار غير مكتمل.' : '',
    !String(entity.not_for_whom || '').trim() ? 'قسم "لمن لا يناسب" غير مكتمل.' : '',
  ].filter(Boolean);
  return { missing, queueReasons, readiness, sourceStatus, districtStatus, confidenceHint, nextAction, quickItems, qualityHints, checklist: entityChecklist(entity) };
}

/* ══════════════════════════════════════════════════════════════
   Wire up the circular dependency: storage.js needs entityQueueReasons
   ══════════════════════════════════════════════════════════════ */

setQueueReasonsProvider(entityQueueReasons);
