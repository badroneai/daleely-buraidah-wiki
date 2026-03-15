const DATA_URL = './master.json';

const state = {
  raw: null,
  records: [],
  filters: {
    status: '',
    district: '',
    confidence: '',
    specialty: '',
    desserts: '',
    work: '',
    groups: '',
    late: '',
  },
  issues: [],
  editMode: false,
  currentSlug: null,
  draftMessage: '',
  agentRunState: null,
  agentBatchState: null,
  agentRuntime: null,
  importDraftText: '',
  importRawText: '',
  isNewCafe: false,
  queueMessage: '',
  queueSort: 'default',
  queuePriority: 'default'
};

const STATUS_AR = {
  discovered: 'مكتشف',
  profiled: 'ملف أولي',
  partially_verified: 'موثق جزئيًا',
  verified: 'معتمد',
  needs_review: 'يحتاج مراجعة',
  branch_conflict: 'تعارض فروع',
  duplicate: 'مكرر',
  archived: 'مؤرشف',
};

const FLAG_AR = {
  yes: 'نعم',
  no: 'لا',
  partial: 'جزئي',
  unknown: 'غير متحقق',
};

const CONFIDENCE_AR = {
  low: 'منخفضة',
  medium: 'متوسطة',
  high: 'عالية',
};

const LEVEL_AR = {
  low: 'منخفض',
  medium: 'متوسط',
  high: 'مرتفع',
};

const PRICE_AR = {
  '$': 'اقتصادي',
  '$$': 'متوسط',
  '$$$': 'مرتفع',
  '$$$$': 'فاخر',
};

const app = document.getElementById('app');
const pageTitle = document.getElementById('pageTitle');
const breadcrumbs = document.getElementById('breadcrumbs');
const searchInput = document.getElementById('globalSearch');
const searchButton = document.getElementById('globalSearchButton');
const sidebar = document.getElementById('appSidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarClose = document.getElementById('sidebarClose');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const navSubtrees = Array.from(document.querySelectorAll('.nav-subtree'));

function isMobileViewport() {
  return window.matchMedia('(max-width: 720px)').matches;
}

function setSidebarOpen(isOpen) {
  if (!sidebar || !sidebarToggle || !sidebarOverlay) return;
  const open = Boolean(isOpen) && isMobileViewport();
  document.body.classList.toggle('sidebar-open', open);
  sidebar.classList.toggle('is-open', open);
  sidebarToggle.setAttribute('aria-expanded', String(open));
  sidebarOverlay.hidden = !open;
}

function closeSidebar() {
  setSidebarOpen(false);
}

function openSidebar() {
  setSidebarOpen(true);
}

function bindSidebar() {
  sidebarToggle?.addEventListener('click', () => {
    setSidebarOpen(!document.body.classList.contains('sidebar-open'));
  });
  sidebarClose?.addEventListener('click', closeSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) closeSidebar();
  });
  sidebar?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (isMobileViewport()) closeSidebar();
    });
  });
  window.addEventListener('resize', () => {
    if (!isMobileViewport()) closeSidebar();
    syncMobileNavSections();
  });
}

function subtreeMatchesHash(tree, hash = location.hash || '#/dashboard') {
  return Array.from(tree.querySelectorAll('a')).some(link => hash.startsWith(link.getAttribute('href')));
}

function setSubtreeOpen(tree, open) {
  const isOpen = Boolean(open);
  tree.classList.toggle('is-collapsed', !isOpen);
  const toggle = tree.querySelector('.nav-parent');
  toggle?.setAttribute('aria-expanded', String(isOpen));
}

function relevantSubtree() {
  const hash = location.hash || '#/dashboard';
  const directMatch = navSubtrees.find(tree => subtreeMatchesHash(tree, hash));
  if (directMatch) return directMatch;
  if (hash.startsWith('#/sectors')) return navSubtrees[0] || null;
  return null;
}

function syncMobileNavSections() {
  if (!navSubtrees.length) return;
  if (!isMobileViewport()) {
    navSubtrees.forEach(tree => setSubtreeOpen(tree, true));
    return;
  }
  const activeTree = relevantSubtree();
  navSubtrees.forEach(tree => setSubtreeOpen(tree, tree === activeTree));
}

function bindMobileNavSections() {
  navSubtrees.forEach((tree, index) => {
    const parent = tree.querySelector('.nav-parent');
    if (!parent) return;
    tree.dataset.subtreeId = `subtree-${index + 1}`;
    tree.id = tree.dataset.subtreeId;
    parent.setAttribute('role', 'button');
    parent.setAttribute('tabindex', '0');
    parent.setAttribute('aria-controls', tree.dataset.subtreeId);
    parent.classList.add('nav-parent-toggle');
    const toggleTree = () => {
      if (!isMobileViewport()) return;
      const willOpen = tree.classList.contains('is-collapsed');
      navSubtrees.forEach(item => setSubtreeOpen(item, item === tree ? willOpen : false));
    };
    parent.addEventListener('click', toggleTree);
    parent.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTree();
      }
    });
  });
  syncMobileNavSections();
}

function esc(v = '') {
  return String(v).replace(/[&<>"']/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}

function uniq(arr) { return [...new Set(arr)]; }

function normalizeFlag(value, fieldName = '') {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw || raw === 'unknown') return 'unknown';
  if (['yes', 'true'].includes(raw)) return 'yes';
  if (['no', 'false'].includes(raw)) return 'no';
  if (['partial', 'mixed'].includes(raw)) return 'partial';
  state.issues.push(`normalize:${fieldName}:${value}`);
  return 'unknown';
}

function normalizeRecord(record) {
  const normalized = {
    ...record,
    _norm: {
      work_friendly: normalizeFlag(record.work_friendly, 'work_friendly'),
      group_friendly: normalizeFlag(record.group_friendly, 'group_friendly'),
      late_night: normalizeFlag(record.late_night, 'late_night'),
      specialty_coffee: normalizeFlag(record.specialty_coffee, 'specialty_coffee'),
      desserts: normalizeFlag(record.desserts, 'desserts'),
      family_friendly: normalizeFlag(record.family_friendly, 'family_friendly'),
      indoor_seating: normalizeFlag(record.indoor_seating, 'indoor_seating'),
      outdoor_seating: normalizeFlag(record.outdoor_seating, 'outdoor_seating'),
      parking: normalizeFlag(record.parking, 'parking'),
    }
  };
  return normalized;
}

async function loadData() {
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}`);
  state.raw = await res.json();
  const records = Array.isArray(state.raw.records) ? state.raw.records : [];
  state.records = records.map(normalizeRecord);
}

async function refreshAgentRuntimeInfo() {
  try {
    const res = await fetch('./api/runtime/health', { cache: 'no-store' });
    if (!res.ok) throw new Error('runtime unavailable');
    state.agentRuntime = await res.json();
  } catch (error) {
    state.agentRuntime = {
      ok: false,
      available: false,
      mode: 'unavailable',
      label: 'غير متاح',
      note: 'لا يوجد proxy runtime نشط حاليًا، وسيبقى الوكيل على الوضع المحلي فقط.',
    };
  }
}

function setMeta(title, trail) {
  pageTitle.textContent = title;
  breadcrumbs.textContent = trail;
  document.querySelectorAll('.nav-group a').forEach(a => {
    a.classList.toggle('active', location.hash.startsWith(a.getAttribute('href')));
  });
}

function badge(status) {
  return `<span class="badge ${esc(status)}">${esc(STATUS_AR[status] || status)}</span>`;
}

function chip(label, value) {
  return `<span class="chip"><strong>${esc(label)}:</strong> ${esc(value)}</span>`;
}

function displayFlag(value) {
  return FLAG_AR[value] || value || '—';
}

function displayConfidence(value) {
  return CONFIDENCE_AR[value] || value || '—';
}

function displayLevel(value) {
  return LEVEL_AR[String(value || '').trim().toLowerCase()] || value || 'غير متحقق';
}

function displayPrice(value) {
  return PRICE_AR[String(value || '').trim()] || value || 'غير متحقق';
}

function displayText(value, fallback = 'غير متحقق') {
  return String(value || '').trim() || fallback;
}

function topRatedRecords(records = state.records, limit = 3) {
  return [...records]
    .filter(r => !Number.isNaN(Number(r.google_rating)))
    .sort((a, b) => {
      const ratingDiff = Number(b.google_rating) - Number(a.google_rating);
      if (ratingDiff !== 0) return ratingDiff;
      return Number(b.google_reviews_count || 0) - Number(a.google_reviews_count || 0);
    })
    .slice(0, limit);
}

function topDistrictGroups(records = state.records, limit = 4) {
  return uniq(records.map(r => (r.district || '').trim()).filter(name => name && name !== 'غير متحقق'))
    .map(name => {
      const items = records.filter(r => (r.district || '').trim() === name);
      return {
        name,
        count: items.length,
        avg: avgRating(items),
        verified: items.filter(r => r.status === 'verified').length,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function sourceVerificationState(record) {
  const hasReference = String(record.reference_url || '').trim();
  const hasOfficial = String(record.official_instagram || '').trim();
  const hasNotes = String(record.source_notes || '').trim();
  const hasConflict = record.status === 'branch_conflict' || /conflict|تعارض/i.test(String(record.source_notes || ''));
  if (hasConflict) return { key: 'conflicting', label: 'متعارض', reason: 'يوجد تعارض في الدليل أو الملاحظات المصدرية.', next: 'حسم المرجع الأوثق' };
  if (hasReference && hasOfficial && hasNotes) return { key: 'verified', label: 'موثق', reason: 'يوجد مرجع واضح مع إشارات داعمة إضافية.', next: 'لا يحتاج تدخلاً فوريًا' };
  if (!hasReference && !hasOfficial) return { key: 'missing', label: 'ناقص', reason: 'لا يوجد مرجع مباشر أو حساب رسمي واضح.', next: 'إضافة مرجع أو حساب موثوق' };
  if (hasReference && !hasOfficial) return { key: 'review', label: 'يحتاج مراجعة', reason: 'يوجد مرجع مباشر لكن ما زالت طبقة التحقق ضعيفة.', next: 'تعزيز المصدر بحساب رسمي أو ملاحظة تحقق' };
  return { key: 'weak', label: 'ضعيف', reason: 'الإسناد الحالي غير كافٍ لإغلاق التحقق بثقة.', next: 'تثبيت المصدر' };
}

function districtVerificationState(record) {
  const district = String(record.district || '').trim();
  const address = String(record.short_address || '').trim();
  if (district && district !== 'غير متحقق' && /حي|طريق|شارع|بريدة/.test(address)) {
    return { key: 'verified', label: 'موثق', reason: 'الحي ظاهر بوضوح مع عنوان داعم.', next: 'لا يحتاج تدخلاً فوريًا' };
  }
  if (!district || district === 'غير متحقق') {
    if (address && /طريق|شارع|بريدة/.test(address)) {
      return { key: 'needs-review', label: 'يحتاج مراجعة', reason: 'يوجد عنوان جزئي يمكن أن يقود لتحديد الحي.', next: 'تأكيد الحي من العنوان أو المرجع' };
    }
    return { key: 'unresolved', label: 'غير محسوم', reason: 'لا يوجد حي واضح ولا عنوان كافٍ للحسم.', next: 'جمع دليل مكاني إضافي' };
  }
  if (/غير متحقق|قرب|جهة|مجاور|placeholder/i.test(`${district} ${address}`)) {
    return { key: 'weak', label: 'إشاري/ضعيف', reason: 'الحي أو العنوان الحاليان أقرب لوصف إرشادي من توثيق مكاني.', next: 'استبدالهما ببيان حي أدق' };
  }
  return { key: 'needs-review', label: 'يحتاج مراجعة', reason: 'الحي موجود لكنه يحتاج تثبيتًا مكانيًا أوضح.', next: 'مراجعة الحي مقابل المرجع' };
}

function confidenceVerificationState(record) {
  const sourceState = sourceVerificationState(record);
  const districtState = districtVerificationState(record);
  const confidence = String(record.confidence || '').trim().toLowerCase();
  if (confidence === 'high' && sourceState.key === 'verified' && districtState.key === 'verified') {
    return { key: 'stable', label: 'مرتفعة/مستقرة', reason: 'الثقة مرتفعة ومدعومة بتحقق مكاني ومصدري.', next: 'لا يحتاج تصعيدًا' };
  }
  if (confidence === 'low' && (sourceState.key === 'missing' || districtState.key === 'unresolved')) {
    return { key: 'blocked', label: 'منخفضة/معلقة', reason: 'الثقة منخفضة بسبب نقص المصدر أو عدم حسم الحي.', next: 'رفع الثقة يبدأ بحل النقص الأساسي' };
  }
  if (confidence === 'low') {
    return { key: 'escalate', label: 'منخفضة/تحتاج رفع', reason: 'الثقة الحالية لا تكفي لاعتماد السجل.', next: 'تقوية المصدر أو الحي أو مراجعة أعمق' };
  }
  if (confidence === 'medium') {
    return { key: 'review', label: 'متوسطة/قابلة للرفع', reason: 'السجل قريب من الاعتماد لكنه ما زال يحتاج تثبيتًا.', next: 'إضافة دليل داعم لرفعها' };
  }
  return { key: 'review', label: 'قيد التقييم', reason: 'الثقة الحالية تحتاج تفسيرًا تشغيليًا أوضح.', next: 'مراجعة أدلة السجل' };
}

function verificationQueues() {
  return {
    'source-review': {
      title: 'مراجعة المصدر',
      note: 'السجلات التي تحتاج فحصًا أو تقوية في المصدر.',
      records: () => state.records.filter(r => ['review', 'weak', 'missing', 'conflicting'].includes(sourceVerificationState(r).key)),
      reason: r => sourceVerificationState(r).reason,
    },
    'district-review': {
      title: 'مراجعة الحي',
      note: 'السجلات التي لا يزال الحي فيها غير محسوم أو غير كافٍ.',
      records: () => state.records.filter(r => ['needs-review', 'unresolved', 'weak'].includes(districtVerificationState(r).key)),
      reason: r => districtVerificationState(r).reason,
    },
    'confidence-review': {
      title: 'الثقة المنخفضة',
      note: 'السجلات التي تحتاج رفع ثقة أو تصعيد تحقق.',
      records: () => state.records.filter(r => ['blocked', 'escalate', 'review'].includes(confidenceVerificationState(r).key)),
      reason: r => confidenceVerificationState(r).reason,
    },
    'conflicting-evidence': {
      title: 'أدلة متعارضة',
      note: 'السجلات التي يظهر فيها تعارض يحتاج حسمًا.',
      records: () => state.records.filter(r => sourceVerificationState(r).key === 'conflicting' || r.status === 'branch_conflict'),
      reason: r => sourceVerificationState(r).reason,
    },
    'unresolved-verification': {
      title: 'تحقق غير محسوم',
      note: 'السجلات التي ما زالت عالقة بين ضعف المصدر والحي والثقة.',
      records: () => state.records.filter(r => sourceVerificationState(r).key === 'missing' || districtVerificationState(r).key === 'unresolved' || confidenceVerificationState(r).key === 'blocked'),
      reason: r => `${sourceVerificationState(r).label} • ${districtVerificationState(r).label} • ${confidenceVerificationState(r).label}`,
    },
  };
}

function featuredStatuses() {
  return [
    { key: 'verified', label: 'معتمد', count: statCount('verified') },
    { key: 'needs_review', label: 'قيد المراجعة', count: statCount('needs_review') },
    { key: 'duplicate', label: 'مكرر', count: statCount('duplicate') },
    { key: 'archived', label: 'مؤرشف', count: statCount('archived') },
  ];
}

function importantMissingFields(record) {
  const missing = [];
  if (!String(record.district || '').trim() || String(record.district).trim() === 'غير متحقق') missing.push('الحي');
  if (!String(record.reference_url || '').trim()) missing.push('المرجع');
  if (!String(record.short_address || '').trim()) missing.push('العنوان');
  if (!String(record.google_rating || '').trim()) missing.push('التقييم');
  if (!String(record.google_reviews_count || '').trim()) missing.push('المراجعات');
  return missing;
}

function recordsMissingImportant(limit = 8) {
  return state.records
    .map(record => ({ record, missing: importantMissingFields(record) }))
    .filter(item => item.missing.length)
    .sort((a, b) => b.missing.length - a.missing.length)
    .slice(0, limit);
}

function lowConfidenceRecords(limit = 8) {
  return state.records
    .filter(r => String(r.confidence || '').trim().toLowerCase() === 'low')
    .slice(0, limit);
}

function recentVerifiedRecords(limit = 8) {
  return [...state.records]
    .filter(r => r.last_verified_at)
    .sort((a, b) => String(b.last_verified_at).localeCompare(String(a.last_verified_at)))
    .slice(0, limit);
}

function newlyAddedRecords(limit = 8) {
  return state.records
    .filter(r => ['discovered', 'profiled', 'partially_verified'].includes(r.status))
    .slice(0, limit);
}

function todayVerifiedCount() {
  return state.records.filter(r => r.last_verified_at === '2026-03-12').length;
}

function queueHref(key = 'needs-review', options = {}) {
  const params = new URLSearchParams();
  if (options.priority) params.set('priority', options.priority);
  if (options.sort && options.sort !== 'default') params.set('sort', options.sort);
  const query = params.toString();
  return `#/ops/${encodeURIComponent(key)}${query ? `?${query}` : ''}`;
}

function entityHref(slug = '', options = {}) {
  const params = new URLSearchParams();
  if (options.queue) params.set('queue', options.queue);
  if (options.priority) params.set('priority', options.priority);
  if (options.sort && options.sort !== 'default') params.set('sort', options.sort);
  if (Number.isInteger(options.index)) params.set('index', String(options.index));
  if (options.edit) params.set('edit', '1');
  const query = params.toString();
  return `#/entities/${encodeURIComponent(slug)}${query ? `?${query}` : ''}`;
}

function parseHashRoute(hash = location.hash || '#/dashboard') {
  const cleaned = hash.replace(/^#\//, '');
  const [pathPart, queryPart = ''] = cleaned.split('?');
  const parts = pathPart.split('/');
  return {
    parts,
    query: new URLSearchParams(queryPart),
  };
}

function queueViewState(queueKey = 'needs-review', options = {}) {
  const sortMode = options.sort || state.queueSort;
  const priorityKey = options.priority || state.queuePriority;
  const queueMap = attentionQueues();
  const queue = queueMap[queueKey] || queueMap['needs-review'];
  const items = [...queue.records()];
  let sorted = items;
  if (sortMode === 'alpha') {
    sorted = items.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'));
  } else if (sortMode === 'district') {
    sorted = items.sort((a, b) => String(a.district || '').localeCompare(String(b.district || ''), 'ar'));
  } else if (sortMode === 'status') {
    sorted = items.sort((a, b) => String(a.status || '').localeCompare(String(b.status || ''), 'ar'));
  } else {
    sorted = queue.sort ? items.sort(queue.sort) : items;
  }
  const groups = queuePriorityGroups(queueKey, sorted);
  const allowedKeys = new Set(groups.map(group => group.key));
  const activePriority = allowedKeys.has(priorityKey) ? priorityKey : (groups[0]?.key || 'default');
  const activeGroup = groups.find(group => group.key === activePriority) || groups[0] || { key: 'all', label: 'كل السجلات', items: sorted };
  return {
    items: sorted,
    groups,
    activePriority,
    activeGroup,
    sortMode,
  };
}

function queueActionLabel(queueKey = 'needs-review') {
  const labels = {
    'needs-review': 'فتح للمراجعة',
    'missing-district': 'تحديد الحي',
    'new-incomplete': 'إكمال السجل',
    'low-confidence': 'رفع الثقة',
    'missing-source': 'إضافة مرجع',
    'missing-address': 'إكمال العنوان',
    'quick-complete': 'إنهاء سريع',
  };
  return labels[queueKey] || 'فتح السجل';
}

function parseDateValue(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const timestamp = Date.parse(raw);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function recentnessScore(record) {
  return Math.max(parseDateValue(record.last_updated_at), parseDateValue(record.last_verified_at));
}

function operationalValue(record) {
  const reviews = Number(record.google_reviews_count || 0);
  const rating = Number(record.google_rating || 0);
  const statusBoost = ({ verified: 18, partially_verified: 14, needs_review: 12, profiled: 8, discovered: 6 }[record.status] || 0);
  return reviews + (rating * 120) + statusBoost;
}

function completionGap(record) {
  return importantMissingFields(record).length;
}

function queuePriorityScore(record, queueKey = 'needs-review') {
  const missing = completionGap(record);
  const value = operationalValue(record);
  const recent = recentnessScore(record);
  switch (queueKey) {
    case 'needs-review':
      return value + recent + (record.status === 'branch_conflict' ? 25000 : 0) + (record.status === 'needs_review' ? 18000 : 0) - (missing * 500);
    case 'new-incomplete':
      return recent + value - (missing * 900);
    case 'quick-complete':
      return value + (missing === 1 ? 14000 : 7000) + recent;
    case 'missing-district':
      return value + (String(record.short_address || '').trim() ? 10000 : 0) + (String(record.reference_url || '').trim() ? 6000 : 0);
    case 'missing-source':
      return value + (String(record.official_instagram || '').trim() ? 9000 : 0) + (String(record.short_address || '').trim() ? 4000 : 0);
    case 'missing-address':
      return value + (String(record.reference_url || '').trim() ? 9000 : 0) + (String(record.district || '').trim() && String(record.district).trim() !== 'غير متحقق' ? 5000 : 0);
    case 'low-confidence':
      return value + (String(record.reference_url || '').trim() ? 7000 : 0) + (String(record.short_address || '').trim() ? 4000 : 0) + recent;
    default:
      return value + recent - (missing * 500);
  }
}

function queuePriorityBadge(record, queueKey = 'needs-review') {
  const score = queuePriorityScore(record, queueKey);
  if (score >= 30000) return 'عالية';
  if (score >= 15000) return 'متوسطة';
  return 'عادية';
}

function queueExpectedAction(record, queueKey = 'needs-review') {
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

function queuePriorityGroups(queueKey = 'needs-review', records = []) {
  const groupsByQueue = {
    'needs-review': [
      {
        key: 'urgent',
        label: 'الأكثر حاجة للتدخل الآن',
        pick: record => record.status === 'branch_conflict' || queuePriorityScore(record, queueKey) >= 30000,
      },
      {
        key: 'fast',
        label: 'الأسرع للمراجعة',
        pick: record => record.status === 'needs_review' && completionGap(record) <= 2,
      },
      {
        key: 'follow-up',
        label: 'متابعة لاحقة',
        pick: () => true,
      },
    ],
    'new-incomplete': [
      {
        key: 'close',
        label: 'الأقرب للإنهاء',
        pick: record => completionGap(record) <= 2,
      },
      {
        key: 'recent',
        label: 'المضاف حديثًا',
        pick: record => recentnessScore(record) >= parseDateValue('2026-03-11'),
      },
      {
        key: 'build',
        label: 'الأكثر نقصًا',
        pick: () => true,
      },
    ],
    'quick-complete': [
      {
        key: 'one-step',
        label: 'خطوة واحدة',
        pick: record => completionGap(record) === 1,
      },
      {
        key: 'high-value',
        label: 'الأعلى قيمة تشغيلية',
        pick: record => operationalValue(record) >= 2000,
      },
      {
        key: 'two-step',
        label: 'يحتاج لمستين',
        pick: () => true,
      },
    ],
    'missing-district': [
      {
        key: 'easy',
        label: 'الأسرع للحسم',
        pick: record => String(record.short_address || '').trim() || String(record.reference_url || '').trim(),
      },
      {
        key: 'high-value',
        label: 'الأعلى قيمة تشغيلية',
        pick: record => operationalValue(record) >= 2200,
      },
      {
        key: 'deep',
        label: 'يحتاج تتبعًا أعمق',
        pick: () => true,
      },
    ],
    'missing-source': [
      {
        key: 'easy',
        label: 'الأسرع للإكمال',
        pick: record => String(record.official_instagram || '').trim() || String(record.short_address || '').trim(),
      },
      {
        key: 'high-value',
        label: 'الأعلى قيمة تشغيلية',
        pick: record => operationalValue(record) >= 2200,
      },
      {
        key: 'deep',
        label: 'يحتاج بحثًا إضافيًا',
        pick: () => true,
      },
    ],
    'missing-address': [
      {
        key: 'easy',
        label: 'الأسرع للإكمال',
        pick: record => String(record.reference_url || '').trim() || String(record.district || '').trim(),
      },
      {
        key: 'recent',
        label: 'المضاف حديثًا',
        pick: record => recentnessScore(record) >= parseDateValue('2026-03-11'),
      },
      {
        key: 'deep',
        label: 'يحتاج تتبعًا',
        pick: () => true,
      },
    ],
    'low-confidence': [
      {
        key: 'high-value',
        label: 'الأعلى قيمة تشغيلية',
        pick: record => operationalValue(record) >= 2200,
      },
      {
        key: 'fast',
        label: 'الأسرع لرفع الثقة',
        pick: record => String(record.reference_url || '').trim() && String(record.short_address || '').trim(),
      },
      {
        key: 'research',
        label: 'يحتاج تدخلًا أعمق',
        pick: () => true,
      },
    ],
  };

  const configs = groupsByQueue[queueKey] || [
    { key: 'focus', label: 'الأولوية الآن', pick: () => true },
    { key: 'all', label: 'كل السجلات', pick: () => true },
  ];

  const remaining = [...records];
  const groups = configs.map((config, index) => {
    let items = [];
    if (index === configs.length - 1) {
      items = [...remaining];
    } else {
      items = remaining.filter(config.pick);
    }
    items.forEach(item => {
      const at = remaining.indexOf(item);
      if (at >= 0) remaining.splice(at, 1);
    });
    return { ...config, items };
  }).filter(group => group.items.length);

  return groups.length ? groups : [{ key: 'all', label: 'كل السجلات', items: records }];
}

function attentionQueues() {
  return {
    'needs-review': {
      title: 'يحتاج مراجعة',
      note: 'السجلات التي تحتاج قرارًا أو فحصًا مباشرًا.',
      records: () => state.records.filter(r => ['needs_review', 'branch_conflict', 'partially_verified'].includes(r.status)),
      reason: r => r.status === 'branch_conflict' ? 'تعارض فروع' : (STATUS_AR[r.status] || r.status),
      sort: (a, b) => {
        const rank = value => ({ needs_review: 0, branch_conflict: 1, partially_verified: 2 }[value] ?? 9);
        return rank(a.status) - rank(b.status);
      },
    },
    'missing-district': {
      title: 'ناقص الحي',
      note: 'سجلات لا يظهر فيها الحي بشكل واضح أو ما زالت غير متحققة.',
      records: () => state.records.filter(r => !String(r.district || '').trim() || String(r.district).trim() === 'غير متحقق'),
      reason: () => 'بحاجة إلى تحديد الحي',
      sort: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'),
    },
    'new-incomplete': {
      title: 'جديد / غير مكتمل',
      note: 'سجلات جديدة أو ما زالت في بداية التجهيز.',
      records: () => state.records.filter(r => ['discovered', 'profiled', 'partially_verified'].includes(r.status)),
      reason: r => STATUS_AR[r.status] || r.status,
      sort: (a, b) => {
        const rank = value => ({ discovered: 0, profiled: 1, partially_verified: 2 }[value] ?? 9);
        return rank(a.status) - rank(b.status);
      },
    },
    'low-confidence': {
      title: 'ثقة منخفضة',
      note: 'سجلات تحتاج تثبيتًا أو توثيقًا أقوى.',
      records: () => state.records.filter(r => String(r.confidence || '').trim().toLowerCase() === 'low'),
      reason: () => 'درجة الثقة منخفضة',
      sort: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'),
    },
    'missing-source': {
      title: 'ناقص المصدر',
      note: 'سجلات لا تحتوي على رابط مرجعي واضح.',
      records: () => state.records.filter(r => !String(r.reference_url || '').trim()),
      reason: () => 'لا يوجد مرجع واضح',
      sort: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'),
    },
    'missing-address': {
      title: 'ناقص العنوان',
      note: 'سجلات تحتاج عنوانًا مختصرًا أو أوضح.',
      records: () => state.records.filter(r => !String(r.short_address || '').trim()),
      reason: () => 'العنوان غير مكتمل',
      sort: (a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'ar'),
    },
    'quick-complete': {
      title: 'إكمال سريع',
      note: 'سجلات ينقصها عدد قليل من الحقول الأساسية ويمكن إنهاؤها بسرعة.',
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

function queueRecords(queueKey = 'needs-review') {
  return queueViewState(queueKey).items;
}

function visibleQueueRecords(queueKey = 'needs-review') {
  const view = queueViewState(queueKey);
  state.queuePriority = view.activePriority;
  return {
    items: view.items,
    groups: view.groups,
    activeGroup: view.activeGroup,
  };
}

function queueSummary(record, queueKey = 'needs-review') {
  const pieces = [
    displayText(record.district),
    STATUS_AR[record.status] || record.status || 'غير متحقق',
  ];
  if (queueKey !== 'low-confidence' && record.confidence) pieces.push(`الثقة ${displayConfidence(record.confidence)}`);
  if (record.google_rating) pieces.push(`${record.google_rating} من 5`);
  return pieces.filter(Boolean).join(' • ');
}

function queueTitleByKey(queueKey = 'needs-review') {
  return (attentionQueues()[queueKey] || attentionQueues()['needs-review']).title;
}

function renderQueueSwitcher(activeKey = 'needs-review') {
  const queueMap = attentionQueues();
  return `
    <div class="queue-switcher">
      ${Object.entries(queueMap).map(([key, queue]) => `
        <a href="${queueHref(key)}" class="queue-tab ${key === activeKey ? 'is-active' : ''}">
          <strong>${queue.title}</strong>
          <span>${queue.records().length} سجل</span>
        </a>
      `).join('')}
    </div>
  `;
}

function renderQueueSortBar(activeKey = 'needs-review') {
  const sortOptions = [
    { key: 'default', label: 'حسب الأولوية' },
    { key: 'alpha', label: 'أبجديًا' },
    { key: 'district', label: 'حسب الحي' },
    { key: 'status', label: 'حسب الحالة' },
  ];
  return `
    <div class="queue-toolbar">
      <div class="results-count">الصف الحالي: ${queueTitleByKey(activeKey)}</div>
      <div class="queue-sort-group">
        ${sortOptions.map(option => `
          <button class="button subtle queue-sort-button ${state.queueSort === option.key ? 'is-active' : ''}" type="button" data-action="queue-sort" data-sort="${option.key}">
            ${option.label}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}

function renderQueuePriorityBar(activeKey = 'needs-review', groups = [], activeGroupKey = '') {
  return `
    <div class="queue-priority-bar">
      ${groups.map(group => `
        <button class="queue-priority-chip ${group.key === activeGroupKey ? 'is-active' : ''}" type="button" data-action="queue-priority" data-queue="${activeKey}" data-priority="${group.key}">
          <strong>${group.label}</strong>
          <span>${group.items.length} سجل</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderQueueList(queueKey = 'needs-review', records = []) {
  if (!records.length) {
    return `
      <div class="empty empty-rich">
        <strong>لا توجد سجلات في هذا الصف الآن</strong>
        <p>انتقل إلى صف آخر أو ارجع إلى لوحة التشغيل لمتابعة صفوف مختلفة.</p>
      </div>
    `;
  }

  return `
    <div class="queue-list">
      ${records.map((record, index) => `
        <article class="queue-row">
          <div class="queue-row-main">
            <div class="queue-row-top">
              <h4><a href="${entityHref(record.slug, { queue: queueKey, priority: state.queuePriority, sort: state.queueSort, index })}">${esc(record.name || 'سجل بلا اسم')}</a></h4>
              <div class="queue-badges">
                <span class="queue-priority-level ${queuePriorityBadge(record, queueKey) === 'عالية' ? 'is-high' : queuePriorityBadge(record, queueKey) === 'متوسطة' ? 'is-medium' : ''}">أولوية ${esc(queuePriorityBadge(record, queueKey))}</span>
                <span class="queue-reason">${esc(attentionQueues()[queueKey].reason(record))}</span>
              </div>
            </div>
            <p>${esc(record.editorial_summary || record.why_choose_it || record.place_personality || 'سجل يحتاج استكمالًا أو مراجعة سريعة.')}</p>
            <div class="queue-meta">
              <span>${esc(queueSummary(record, queueKey))}</span>
              <span>${esc(displayText(record.short_address, 'عنوان مختصر غير متوفر'))}</span>
              <span>${esc(queueExpectedAction(record, queueKey))}</span>
            </div>
          </div>
          <div class="queue-row-actions">
            <a class="button queue" href="${entityHref(record.slug, { queue: queueKey, priority: state.queuePriority, sort: state.queueSort, index })}">${queueActionLabel(queueKey)}</a>
          </div>
        </article>
      `).join('')}
    </div>
  `;
}

function renderAttentionQueuePage(queueKey = 'needs-review') {
  const queueMap = attentionQueues();
  const activeKey = queueMap[queueKey] ? queueKey : 'needs-review';
  const queue = queueMap[activeKey];
  const { items, groups, activeGroup } = visibleQueueRecords(activeKey);
  const queueStats = [
    { label: 'عدد السجلات', value: items.length },
    { label: 'بلا حي', value: items.filter(r => !String(r.district || '').trim() || String(r.district).trim() === 'غير متحقق').length },
    { label: 'بلا مرجع', value: items.filter(r => !String(r.reference_url || '').trim()).length },
    { label: 'بلا عنوان', value: items.filter(r => !String(r.short_address || '').trim()).length },
  ];
  return `
    <div class="hero hero-compact page-hero operator-hero">
      <div class="section-kicker">صفوف العمل</div>
      <h3>${queue.title}</h3>
      <p>${queue.note}</p>
      <div class="hero-actions">
        <a href="#/dashboard" class="button">العودة إلى لوحة التشغيل</a>
        <a href="#/entities" class="button">كل السجلات</a>
        <a href="#/bulk/${activeKey}?priority=${encodeURIComponent(activeGroup.key)}&sort=${encodeURIComponent(state.queueSort)}" class="button primary">فتح bulk review</a>
        <a href="#/review" class="button">المراجعة العامة</a>
      </div>
    </div>
    <div class="queue-shell section">
      ${renderQueueSwitcher(activeKey)}
      <div class="queue-summary-grid">
        ${queueStats.map(item => `<div class="card mini-panel"><div class="metric">${item.value}</div><div class="metric-sub">${item.label}</div></div>`).join('')}
      </div>
      ${renderQueuePriorityBar(activeKey, groups, activeGroup.key)}
      ${renderQueueSortBar(activeKey)}
      <div class="section-header">
        <h3>${activeGroup.label}</h3>
        <div class="results-count">${activeGroup.items.length} سجل معروض</div>
      </div>
      ${renderQueueList(activeKey, activeGroup.items)}
    </div>
  `;
}

function statCount(status) {
  return state.records.filter(r => r.status === status).length;
}

function currentSector() {
  return uniq(state.records.map(r => r.sector).filter(Boolean));
}

function sectorLabelByKey(key = '') {
  const entry = sectorTree()
    .flatMap(group => group.children)
    .find(child => child.key === key);
  return entry?.title || key;
}

function avgRating(records) {
  const nums = records.map(r => Number(r.google_rating)).filter(n => !Number.isNaN(n));
  if (!nums.length) return '—';
  return (nums.reduce((a,b)=>a+b,0) / nums.length).toFixed(2);
}

function filterRecords(records = state.records) {
  return records.filter(r => {
    if (state.filters.status && r.status !== state.filters.status) return false;
    if (state.filters.district && r.district !== state.filters.district) return false;
    if (state.filters.confidence && r.confidence !== state.filters.confidence) return false;
    if (state.filters.specialty && r._norm.specialty_coffee !== state.filters.specialty) return false;
    if (state.filters.desserts && r._norm.desserts !== state.filters.desserts) return false;
    if (state.filters.work && r._norm.work_friendly !== state.filters.work) return false;
    if (state.filters.groups && r._norm.group_friendly !== state.filters.groups) return false;
    if (state.filters.late && r._norm.late_night !== state.filters.late) return false;
    return true;
  });
}

function activeFilterEntries() {
  const labels = {
    status: 'الحالة',
    district: 'الحي',
    confidence: 'الثقة',
    specialty: 'قهوة مختصة',
    desserts: 'حلويات',
    work: 'مناسب للعمل',
    groups: 'مناسب للجلسات',
    late: 'مناسب للسهر',
  };
  return Object.entries(state.filters)
    .filter(([, value]) => value)
    .map(([key, value]) => ({
      key,
      label: labels[key] || key,
      value: key === 'status' ? (STATUS_AR[value] || value)
        : key === 'confidence' ? displayConfidence(value)
        : displayFlag(value),
      raw: value,
    }))
    .map(item => ({
      ...item,
      value: item.key === 'district' ? item.raw : item.value,
    }));
}

function renderActiveFilters() {
  const active = activeFilterEntries();
  if (!active.length) return '';
  return `
    <div class="active-filters">
      <div class="active-filters-head">
        <strong>الفلاتر النشطة</strong>
        <button class="button subtle" type="button" data-action="clear-filters">مسح الكل</button>
      </div>
      <div class="active-filter-list">
        ${active.map(item => `<button class="filter-chip" type="button" data-action="clear-filter" data-filter-key="${esc(item.key)}">${esc(item.label)}: ${esc(item.value)} <span aria-hidden="true">×</span></button>`).join('')}
      </div>
    </div>
  `;
}

function resultEmptyState(title = 'لا توجد نتائج', note = 'جرّب تغيير البحث أو الفلاتر.') {
  return `<div class="empty empty-rich"><strong>${esc(title)}</strong><p>${esc(note)}</p></div>`;
}

function resultCards(records) {
  return `
    <div class="results-grid">
      ${records.map(r => `
        <a href="#/entities/${esc(r.slug)}" class="result-card">
          <div class="result-card-top">
            <div>
              <h4>${esc(r.name)}</h4>
              <p>${esc(r.alternate_name || r.short_address || 'داخل بريدة')}</p>
            </div>
            ${badge(r.status)}
          </div>
          <div class="result-card-meta">
            <span>${esc(displayText(r.district))}</span>
            <span>${esc(displayConfidence(r.confidence))}</span>
            <span>${esc(r.google_rating || '—')} تقييم</span>
          </div>
          <div class="result-card-tags">
            <span class="mini-tag">${esc(displayFlag(r._norm.work_friendly))} للعمل</span>
            <span class="mini-tag">${esc(displayFlag(r._norm.group_friendly))} للجلسات</span>
            <span class="mini-tag">${esc(displayFlag(r._norm.late_night))} للسهر</span>
          </div>
        </a>
      `).join('')}
    </div>
  `;
}

function renderResultsSection(records, options = {}) {
  const {
    title = 'النتائج',
    note = '',
    emptyTitle = 'لا توجد نتائج',
    emptyNote = 'جرّب تغيير البحث أو الفلاتر.',
    showTable = true,
  } = options;
  return `
    <div class="results-section">
      <div class="section-header">
        <div>
          <h3>${esc(title)}</h3>
          ${note ? `<p class="section-lead">${esc(note)}</p>` : ''}
        </div>
        <div class="results-count">${records.length} نتيجة</div>
      </div>
      ${renderActiveFilters()}
      ${records.length ? `
        ${resultCards(records)}
        ${showTable ? `<div class="results-table">${entitiesTable(records)}</div>` : ''}
      ` : resultEmptyState(emptyTitle, emptyNote)}
    </div>
  `;
}

function renderFilterBar() {
  const districts = uniq(state.records.map(r => r.district).filter(Boolean)).sort((a,b)=>a.localeCompare(b,'ar'));
  const confidences = uniq(state.records.map(r => r.confidence).filter(Boolean));
  const tri = [['yes','نعم'],['partial','جزئي'],['no','لا'],['unknown','غير متحقق']];
  return `
    <div class="filters filters-wide">
      <select data-filter="status"><option value="">كل الحالات</option>${Object.keys(STATUS_AR).map(s=>`<option value="${s}" ${state.filters.status===s?'selected':''}>${STATUS_AR[s]}</option>`).join('')}</select>
      <select data-filter="district"><option value="">كل الأحياء</option>${districts.map(d=>`<option value="${esc(d)}" ${state.filters.district===d?'selected':''}>${esc(d)}</option>`).join('')}</select>
      <select data-filter="confidence"><option value="">كل مستويات الثقة</option>${confidences.map(c=>`<option value="${esc(c)}" ${state.filters.confidence===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
      <select data-filter="specialty"><option value="">القهوة المختصة: الكل</option>${tri.map(([v,l])=>`<option value="${v}" ${state.filters.specialty===v?'selected':''}>${l}</option>`).join('')}</select>
      <select data-filter="desserts"><option value="">الحلويات: الكل</option>${tri.map(([v,l])=>`<option value="${v}" ${state.filters.desserts===v?'selected':''}>${l}</option>`).join('')}</select>
      <select data-filter="work"><option value="">مناسب للعمل: الكل</option>${tri.map(([v,l])=>`<option value="${v}" ${state.filters.work===v?'selected':''}>${l}</option>`).join('')}</select>
      <select data-filter="groups"><option value="">مناسب للجلسات: الكل</option>${tri.map(([v,l])=>`<option value="${v}" ${state.filters.groups===v?'selected':''}>${l}</option>`).join('')}</select>
      <select data-filter="late"><option value="">مناسب للسهر: الكل</option>${tri.map(([v,l])=>`<option value="${v}" ${state.filters.late===v?'selected':''}>${l}</option>`).join('')}</select>
    </div>
  `;
}

function bindFilters() {
  document.querySelectorAll('[data-filter]').forEach(el => {
    el.addEventListener('change', () => {
      state.filters[el.getAttribute('data-filter')] = el.value;
      router();
    });
  });
  document.querySelectorAll('[data-action="clear-filter"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.filters[btn.dataset.filterKey] = '';
      router();
    });
  });
  document.querySelectorAll('[data-action="clear-filters"]').forEach(btn => {
    btn.addEventListener('click', () => {
      Object.keys(state.filters).forEach(key => { state.filters[key] = ''; });
      router();
    });
  });
}

function entityValueLink(slug, content, className = 'entity-cell-link') {
  return `<a href="#/entities/${esc(slug)}" class="${esc(className)}">${content}</a>`;
}

function districtHref(district = '') {
  return `#/districts/${encodeURIComponent(district)}`;
}

function districtLink(district = '', label = '') {
  const value = String(district || '').trim() || 'حي غير محدد';
  return `<a href="${districtHref(value)}" class="entity-cell-link district-link">${esc(label || value)}</a>`;
}

function entitiesTable(records) {
  return `
    <div class="table-wrap">
      <table class="table table-entities">
        <thead>
          <tr>
            <th>الاسم</th><th>الحالة</th><th>الحي</th><th>الثقة</th><th>التقييم</th><th>المراجعات</th><th>العمل</th><th>الجلسات</th><th>السهر</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(r => `
            <tr class="entity-row">
              <td>${entityValueLink(r.slug, `<span class="button entity-link">${esc(r.name)}</span><div class="note">${esc(r.alternate_name || '')}</div>`, 'entity-name-link')}</td>
              <td>${entityValueLink(r.slug, badge(r.status))}</td>
              <td>${entityValueLink(r.slug, esc(r.district || 'غير متحقق'))}</td>
              <td>${entityValueLink(r.slug, esc(displayConfidence(r.confidence)))}</td>
              <td>${entityValueLink(r.slug, esc(r.google_rating))}</td>
              <td>${entityValueLink(r.slug, esc(r.google_reviews_count))}</td>
              <td>${entityValueLink(r.slug, esc(displayFlag(r._norm.work_friendly)))}</td>
              <td>${entityValueLink(r.slug, esc(displayFlag(r._norm.group_friendly)))}</td>
              <td>${entityValueLink(r.slug, esc(displayFlag(r._norm.late_night)))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}


function sectorTree() {
  return [
    {
      key: 'food-beverage',
      title: 'الأغذية والمشروبات',
      note: 'قطاعات قريبة من الاستخدام اليومي والبحث المحلي.',
      children: [
        { key: 'cafes', title: 'الكوفيهات', status: 'active', note: 'القسم المتاح الآن داخل الدليل.' },
        { key: 'restaurants', title: 'المطاعم', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'bakeries', title: 'المخابز والحلويات', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'groceries', title: 'البقالات والسوبرماركت', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'roasteries', title: 'محامص القهوة', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' }
      ]
    },
    {
      key: 'real-estate-housing',
      title: 'العقار والسكن',
      note: 'أقسام يمكن إضافتها لاحقًا داخل الدليل.',
      children: [
        { key: 'real-estate-offices', title: 'المكاتب العقارية', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'apartments-hotels', title: 'الشقق والفنادق', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' }
      ]
    },
    {
      key: 'health-beauty',
      title: 'الصحة والجمال',
      note: 'خدمات مرتبطة بالاحتياج المحلي اليومي.',
      children: [
        { key: 'clinics', title: 'العيادات', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'pharmacies', title: 'الصيدليات', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'salons', title: 'الصالونات', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' }
      ]
    },
    {
      key: 'education-services',
      title: 'التعليم والخدمات',
      note: 'أقسام تعليمية وخدمية قابلة للإضافة لاحقًا.',
      children: [
        { key: 'schools', title: 'المدارس', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'nurseries', title: 'الحضانات', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'bookstores', title: 'المكتبات', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'training-centers', title: 'مراكز التدريب', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' }
      ]
    },
    {
      key: 'events-local-services',
      title: 'المناسبات والخدمات المحلية',
      note: 'خدمات مرتبطة بالمناسبات والاحتياج المحلي.',
      children: [
        { key: 'halls', title: 'القاعات', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'event-organizers', title: 'منظمو الفعاليات', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'photography', title: 'التصوير', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'hospitality', title: 'الضيافة', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' }
      ]
    },
    {
      key: 'retail-daily-services',
      title: 'التجزئة والخدمات اليومية',
      note: 'أقسام يومية يمكن إضافتها مع توسع الدليل.',
      children: [
        { key: 'laundries', title: 'المغاسل', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'fuel-stations', title: 'محطات الوقود', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'workshops', title: 'الورش', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'telecom', title: 'الاتصالات', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' },
        { key: 'shipping', title: 'الشحن', status: 'planned', note: 'مهيأ لاحقًا ولم يبدأ بعد.' }
      ]
    }
  ];
}

function renderBlueprintPage() {
  return `
    <div class="hero page-hero">
      <div class="section-kicker">فكرة الدليل</div>
      <h3>كيف نرتب المعلومات داخل الدليل</h3>
      <p>كل صفحة في الدليل مبنية لتقودك من الصورة العامة إلى التفاصيل: قطاع، ثم حي، ثم كيان.</p>
    </div>
    <div class="grid cards-3 section">
      <div class="card spotlight-card"><h3>1. جمع واضح</h3><p class="note">تبدأ المعلومات من سجل موحد بدل توزيعها بين ملفات كثيرة.</p></div>
      <div class="card spotlight-card"><h3>2. عرض مفهوم</h3><p class="note">تظهر الكيانات عبر قطاعات وأحياء وحالات يسهل فهمها بسرعة.</p></div>
      <div class="card spotlight-card"><h3>3. تحديث متدرج</h3><p class="note">تتطور الصفحات مع نضج المعلومات من دون تغيير تجربة التصفح الأساسية.</p></div>
    </div>
    <div class="section grid cards-2">
      <div class="card">
        <div class="section-kicker">المستويات</div>
        <h3>من الأعلى إلى التفاصيل</h3>
        <ul class="feature-list">
          <li>الصفحة الرئيسية: مدخل سريع لأهم المسارات.</li>
          <li>القطاعات: نظرة أوسع على نوع النشاط.</li>
          <li>الأحياء: ربط المحتوى بالموقع داخل بريدة.</li>
          <li>صفحة الكيان: التفاصيل المختصرة والسريعة.</li>
        </ul>
      </div>
      <div class="card">
        <div class="section-kicker">النتيجة</div>
        <h3>تجربة أقرب للدليل</h3>
        <p class="note">الهدف هو أن يصل الزائر إلى المعلومة بسرعة، من دون أن يضيع بين تفاصيل داخلية أو مصطلحات ثقيلة.</p>
      </div>
    </div>
  `;
}

function renderSectorsIndexPage() {
  const tree = sectorTree();
  const activeGroup = tree.find(group => group.children.some(child => child.status === 'active'));
  const plannedCount = tree.reduce((sum, group) => sum + group.children.filter(child => child.status !== 'active').length, 0);
  return `
    <div class="hero page-hero">
      <div class="section-kicker">استكشف القطاعات</div>
      <h3>القطاعات داخل الدليل</h3>
      <p>ابدأ بالقطاع المتاح الآن، ثم تصفح الأقسام القادمة التي ستتوسع لاحقًا داخل دليل بريدة.</p>
      <div class="hero-actions">
        <a href="#/sector/cafes" class="button primary">الانتقال إلى الكوفيهات</a>
        <a href="#/districts" class="button">تصفح الأحياء</a>
      </div>
    </div>
    <div class="grid cards-3 section">
      <div class="card mini-panel"><div class="metric">${tree.length}</div><div class="metric-sub">مجموعات رئيسية</div></div>
      <div class="card mini-panel"><div class="metric">1</div><div class="metric-sub">قسم متاح الآن</div></div>
      <div class="card mini-panel"><div class="metric">${plannedCount}</div><div class="metric-sub">أقسام قادمة</div></div>
    </div>
    <div class="section grid cards-2">
      <div class="card">
        <div class="section-kicker">متاح الآن</div>
        <h3>${esc(activeGroup?.children.find(child => child.status === 'active')?.title || 'الكوفيهات')}</h3>
        <p class="note">القسم النشط حاليًا داخل الدليل، ويحتوي على السجلات المتاحة للتصفح والبحث.</p>
        <div class="hero-actions">
          <a href="#/sector/cafes" class="button primary">فتح القسم</a>
          <a href="#/entities" class="button">كل الكيانات</a>
        </div>
      </div>
      <div class="card">
        <div class="section-kicker">قريبًا</div>
        <h3>أقسام يتم تجهيزها</h3>
        <p class="note">تتوسع الأقسام تدريجيًا كلما أصبحت بياناتها جاهزة للعرض داخل الدليل.</p>
      </div>
    </div>
    <div class="section sectors-tree">
      ${tree.map(group => `
        <div class="tree-root card">
          <div class="tree-node tree-node-root">
            <div>
              <h3>${esc(group.title)}</h3>
              <p class="note">${esc(group.note)}</p>
            </div>
            <span class="pill muted">قسم رئيسي</span>
          </div>
          <div class="tree-children">
            ${group.children.map(child => `
              <div class="tree-node tree-node-child">
                <div>
                  <div class="tree-title">${child.key === 'cafes' ? `<a href="#/sector/cafes">${esc(child.title)}</a>` : `<a href="#/sector/${esc(child.key)}">${esc(child.title)}</a>`}</div>
                  <div class="note">${esc(child.note)}</div>
                </div>
                <span class="pill ${child.status === 'active' ? 'success' : 'muted'}">${child.status === 'active' ? 'نشط الآن' : 'مهيأ لاحقًا'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSectorPage(sectorKey = 'cafes') {
  if (sectorKey !== 'cafes') {
    return `
      <div class="hero">
        <h3>هذا القسم غير متاح بعد</h3>
        <p>سيظهر هنا محتوى هذا القسم عند إضافته إلى الدليل.</p>
      </div>
      <div class="card">
        <h3>قريبًا</h3>
        <p class="note">هذا القسم مهيأ للإضافة لاحقًا.</p>
      </div>
    `;
  }

  const items = filterRecords(state.records.filter(r => r.sector === 'cafes'));
  const topPicks = topRatedRecords(items, 3);
  const topDistricts = topDistrictGroups(items, 4);
  return `
    <div class="hero page-hero">
      <div class="section-kicker">قطاع نشط</div>
      <h3>قطاع الكوفيهات</h3>
      <p>أفضل مدخل لاكتشاف الكوفيهات داخل بريدة حسب الحي والحالة وطبيعة التجربة.</p>
      <div class="hero-actions">
        <a href="#/districts" class="button primary">تصفح الأحياء</a>
        <a href="#/entities" class="button">كل الكيانات</a>
      </div>
    </div>
    <div class="grid cards-4">
      <div class="card mini-panel"><div class="metric">${items.length}</div><div class="metric-sub">إجمالي الكيانات</div></div>
      <div class="card mini-panel"><div class="metric">${uniq(items.map(r=>r.district)).length}</div><div class="metric-sub">أحياء مغطاة</div></div>
      <div class="card mini-panel"><div class="metric">${items.filter(r=>r._norm.specialty_coffee==='yes').length}</div><div class="metric-sub">قهوة مختصة</div></div>
      <div class="card mini-panel"><div class="metric">${items.filter(r=>r._norm.work_friendly==='yes').length}</div><div class="metric-sub">مناسب للعمل</div></div>
    </div>
    <div class="section grid cards-2">
      <div class="card">
        <div class="section-kicker">مختارات سريعة</div>
        <h3>أعلى تقييمًا</h3>
        ${topPicks.length ? `<div class="stack-list">${topPicks.map(item => `
          <a href="#/entities/${esc(item.slug)}" class="stack-item">
            <strong>${esc(item.name)}</strong>
            <span>${esc(item.district || 'غير متحقق')} • ${esc(item.google_rating || '—')} من 5</span>
          </a>
        `).join('')}</div>` : '<div class="empty">لا توجد ترشيحات ظاهرة حاليًا.</div>'}
      </div>
      <div class="card">
        <div class="section-kicker">أحياء بارزة</div>
        <h3>الأكثر حضورًا</h3>
        <div class="district-badges">
          ${topDistricts.map(group => `<a href="${districtHref(group.name)}" class="district-badge"><strong>${esc(group.name)}</strong><span>${group.count} كيانات</span></a>`).join('')}
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-header">
        <h3>ابحث داخل القطاع</h3>
      </div>
      <p class="section-lead">استخدم الفلاتر للوصول بسرعة إلى النوع المناسب من الكوفيهات.</p>
      ${renderFilterBar()}
    </div>
    <div class="section">${renderResultsSection(items, {
      title: 'نتائج الكوفيهات',
      note: 'البطاقات تعطي نظرة أسرع، ويمكنك استخدام الجدول للمقارنة التفصيلية.',
      emptyTitle: 'لا توجد نتائج في هذا القطاع',
      emptyNote: 'جرّب تغيير الفلاتر أو العودة لعرض كل الكوفيهات.',
    })}</div>
  `;
}

function renderPipelinePage() {
  return `
    <div class="hero page-hero"><div class="section-kicker">من أين تأتي المعلومات؟</div><h3>كيف تصل المعلومات إلى الدليل</h3><p>ملخص بسيط يوضح رحلة المعلومة من الجمع إلى الظهور داخل الصفحات.</p></div>
    <div class="grid cards-4 section">
      <div class="card"><h3>1) جمع المعلومات</h3><p class="note">تبدأ المعلومات من البحث أو من المصادر المحلية.</p></div>
      <div class="card"><h3>2) تجهيز أولي</h3><p class="note">تُرتب المعلومات في صيغة أولية قابلة للمراجعة.</p></div>
      <div class="card"><h3>3) مراجعة</h3><p class="note">تُراجع البيانات وتُصحح قبل اعتمادها.</p></div>
      <div class="card"><h3>4) نشر داخل الدليل</h3><p class="note">بعد الاعتماد تظهر المعلومات داخل الصفحات العامة.</p></div>
    </div>
  `;
}

function renderGovernancePage() {
  return `
    <div class="hero page-hero"><div class="section-kicker">مبادئ العمل</div><h3>معايير تنظيم الدليل</h3><p>مبادئ مختصرة تساعد على إبقاء المعلومات واضحة ومتسقة وقابلة للتوسع.</p></div>
    <div class="grid cards-3 section">
      <div class="card"><h3>مرجع واضح</h3><p class="note">كل تعديل معتمد ينعكس في نفس المصدر داخل الدليل.</p></div>
      <div class="card"><h3>مراجعة قبل النشر</h3><p class="note">السجلات غير المكتملة تبقى مميزة حتى تكتمل مراجعتها.</p></div>
      <div class="card"><h3>توسع متدرج</h3><p class="note">تُضاف الأقسام الجديدة عندما تكون بياناتها جاهزة.</p></div>
    </div>
  `;
}

function renderDashboard() {
  const filtered = filterRecords();
  const sectors = currentSector();
  const branchConflict = state.records.filter(r => r.status === 'branch_conflict');
  const needsReview = state.records.filter(r => r.status === 'needs_review');
  const districtsCount = uniq(filtered.map(r => r.district).filter(Boolean)).length;
  const topPicks = topRatedRecords(filtered, 3);
  const districtHighlights = topDistrictGroups(filtered, 4);
  const statuses = featuredStatuses();
  const missingImportant = recordsMissingImportant(6);
  const lowConfidence = lowConfidenceRecords(6);
  const recentVerified = recentVerifiedRecords(6);
  const newQueue = newlyAddedRecords(6);
  const queueMap = attentionQueues();
  const unverifiedCount = state.records.filter(r => ['discovered','profiled','partially_verified'].includes(r.status)).length;
  const missingDistrictCount = state.records.filter(r => !String(r.district || '').trim() || String(r.district).trim() === 'غير متحقق').length;
  const missingReferenceCount = state.records.filter(r => !String(r.reference_url || '').trim()).length;
  return `
    <div class="hero hero-compact page-hero operator-hero">
      <div class="section-kicker">مركز القيادة</div>
      <h3>لوحة التشغيل اليومية</h3>
      <p>أسرع نقطة دخول لمراجعة السجلات الجديدة، العناصر الناقصة، وما يحتاج انتباهًا مباشرًا اليوم.</p>
      <div class="hero-actions">
        <a href="#/ops-hub" class="button gold">مركز تشغيل المراجعة</a>
        <a href="#/editorial-hub" class="button">مركز التحكم التحريري</a>
        <a href="#/verification/source-review" class="button">نظام التحقق</a>
        <a href="#/verification-program" class="button primary">مركز عمليات التحقق والمهام</a>
        <a href="#/agent-ops" class="button">عمليات الوكلاء</a>
        <a href="#/agent-drafts" class="button">مسودات الوكلاء</a>
        <a href="#/release-readiness" class="button">مركز الجاهزية</a>
        <a href="#/review" class="button primary">فتح قائمة المراجعة</a>
        <a href="#/entities" class="button">كل السجلات</a>
        <a href="#/sector/cafes" class="button">قطاع الكوفيهات</a>
        <a href="#/districts" class="button">الأحياء</a>
      </div>
    </div>
    <div class="operator-kpi-grid section">
      <div class="card mini-panel emphasis-panel"><div class="metric">${needsReview.length + branchConflict.length}</div><div class="metric-sub">بحاجة انتباه الآن</div></div>
      <div class="card mini-panel"><div class="metric">${unverifiedCount}</div><div class="metric-sub">غير مكتمل أو غير معتمد</div></div>
      <div class="card mini-panel"><div class="metric">${missingDistrictCount}</div><div class="metric-sub">سجلات بلا حي واضح</div></div>
      <div class="card mini-panel"><div class="metric">${todayVerifiedCount()}</div><div class="metric-sub">تحديثات اليوم</div></div>
      <div class="card mini-panel"><div class="metric">${missingReferenceCount}</div><div class="metric-sub">بلا مرجع</div></div>
      <div class="card mini-panel"><div class="metric">${districtsCount}</div><div class="metric-sub">أحياء ظاهرة</div></div>
    </div>
    <div class="section operator-shortcuts">
      <div class="section-header">
        <h3>صفوف العمل السريعة</h3>
      </div>
      <div class="shortcut-grid">
        <a class="shortcut-card" href="${queueHref('needs-review')}"><strong>يحتاج مراجعة</strong><span>${queueMap['needs-review'].records().length} سجل</span></a>
        <a class="shortcut-card" href="${queueHref('new-incomplete')}"><strong>جديد / غير مكتمل</strong><span>${queueMap['new-incomplete'].records().length} سجل</span></a>
        <a class="shortcut-card" href="${queueHref('missing-district')}"><strong>ناقص الحي</strong><span>${missingDistrictCount} سجل</span></a>
        <a class="shortcut-card" href="${queueHref('low-confidence')}"><strong>ثقة منخفضة</strong><span>${queueMap['low-confidence'].records().length} سجل</span></a>
        <a class="shortcut-card" href="${queueHref('missing-source')}"><strong>ناقص المصدر</strong><span>${queueMap['missing-source'].records().length} سجل</span></a>
        <a class="shortcut-card" href="${queueHref('quick-complete')}"><strong>إكمال سريع</strong><span>${queueMap['quick-complete'].records().length} سجل</span></a>
      </div>
    </div>
    <div class="section operator-columns">
      <div class="card">
        <div class="section-kicker">أولوية اليوم</div>
        <h3>ما يحتاج انتباهك الآن</h3>
        <div class="stack-list compact-stack">
          ${needsReview.slice(0,4).map(r => `<a href="#/entities/${esc(r.slug)}" class="stack-item"><strong>${esc(r.name)}</strong><span>${esc(r.editorial_summary || 'يحتاج مراجعة مختصرة')}</span></a>`).join('')}
          ${branchConflict.slice(0,3).map(r => `<a href="#/entities/${esc(r.slug)}" class="stack-item"><strong>${esc(r.name)}</strong><span>تعارض فروع: ${esc(r.branch_group || 'غير محدد')}</span></a>`).join('')}
          ${(!needsReview.length && !branchConflict.length) ? '<div class="empty">لا توجد عناصر حرجة الآن.</div>' : ''}
        </div>
      </div>
      <div class="card">
        <div class="section-kicker">سجلات ناقصة</div>
        <h3>أقرب العناصر لتحسين سريع</h3>
        ${missingImportant.length ? `<div class="stack-list compact-stack">${missingImportant.map(item => `
          <a href="#/entities/${esc(item.record.slug)}" class="stack-item">
            <strong>${esc(item.record.name)}</strong>
            <span>ناقص: ${esc(item.missing.join('، '))}</span>
          </a>
        `).join('')}</div>` : '<div class="empty">لا توجد سجلات ناقصة ضمن الحقول الأساسية.</div>'}
      </div>
    </div>
    <div class="section operator-columns">
      <div class="card">
        <div class="section-kicker">الدفعة الجديدة</div>
        <h3>سجلات جديدة أو غير مكتملة</h3>
        ${newQueue.length ? `<div class="stack-list compact-stack">${newQueue.map(r => `
          <a href="#/entities/${esc(r.slug)}" class="stack-item">
            <strong>${esc(r.name)}</strong>
            <span>${esc(STATUS_AR[r.status] || r.status)} • ${esc(displayText(r.district))}</span>
          </a>
        `).join('')}</div>` : '<div class="empty">لا توجد دفعة جديدة ظاهرة الآن.</div>'}
      </div>
      <div class="card">
        <div class="section-kicker">آخر تحديثات</div>
        <h3>آخر ما تم التحقق منه</h3>
        ${recentVerified.length ? `<div class="stack-list compact-stack">${recentVerified.map(r => `
          <a href="#/entities/${esc(r.slug)}" class="stack-item">
            <strong>${esc(r.name)}</strong>
            <span>${esc(r.last_verified_at)} • ${esc(STATUS_AR[r.status] || r.status)}</span>
          </a>
        `).join('')}</div>` : '<div class="empty">لا توجد تحديثات حديثة ظاهرة.</div>'}
      </div>
    </div>
    <div class="section home-spotlight-grid">
      <div class="card spotlight-card spotlight-card-large">
        <div class="section-kicker">نقاط الدخول</div>
        <h3>مداخل التشغيل الأساسية</h3>
        <div class="home-links">
          <a href="#/ops-hub" class="home-link-card"><strong>مركز تشغيل المراجعة</strong><span>الجلسات والدفعات والتصديرات والمتابعة في مكان واحد.</span></a>
          <a href="#/editorial-hub" class="home-link-card"><strong>مركز التحكم التحريري</strong><span>المسودات وpatches وطلبات الاستيراد في مكان واحد.</span></a>
          <a href="#/verification/source-review" class="home-link-card"><strong>نظام التحقق</strong><span>المصدر والحي والثقة في مسار تشغيل مستقل.</span></a>
          <a href="#/verification-program" class="home-link-card"><strong>مركز عمليات التحقق والمهام</strong><span>التحقق والمهمات والأدلة والتوسع في مكان واحد.</span></a>
          <a href="#/agent-ops" class="home-link-card"><strong>عمليات الوكلاء</strong><span>تشغيلات batch وسجل نتائج مجمعة للوكلاء.</span></a>
          <a href="#/agent-drafts" class="home-link-card"><strong>مسودات الوكلاء</strong><span>اقتراحات آمنة تبقى كمسودات فقط حتى تراجعها.</span></a>
          <a href="#/release-readiness" class="home-link-card"><strong>مركز الجاهزية</strong><span>ما هو الجاهز للاعتماد أو التصدير أو النشر الآن.</span></a>
          <a href="${queueHref('needs-review')}" class="home-link-card"><strong>صف المراجعة</strong><span>قرار سريع على السجلات التي تتطلب فحصًا مباشرًا.</span></a>
          <a href="${queueHref('missing-district')}" class="home-link-card"><strong>صف الحي الناقص</strong><span>الوصول المباشر إلى السجلات التي تحتاج تحديد الحي.</span></a>
        </div>
      </div>
      <div class="card mini-panel">
        <div class="section-kicker">أحياء تحتاج متابعة</div>
        <h3 class="home-card-title">الأكثر حضورًا</h3>
        <div class="district-badges">
          ${districtHighlights.map(group => `<a href="${districtHref(group.name)}" class="district-badge"><strong>${esc(group.name)}</strong><span>${group.count} سجل • ${group.avg}</span></a>`).join('')}
        </div>
      </div>
    </div>
    <div class="section grid cards-2">
      <div class="card">
        <div class="section-kicker">مؤشرات عامة</div>
        <h3>صورة سريعة</h3>
        <div class="stack-list compact-stack">
          ${statuses.map(item => `<div class="stack-item static-item"><strong>${item.label}</strong><span>${item.count} سجل</span></div>`).join('')}
          <div class="stack-item static-item"><strong>قطاعات ظاهرة</strong><span>${sectors.length} قطاع</span></div>
        </div>
      </div>
      <div class="card">
        <div class="section-kicker">مختارات مفيدة</div>
        <h3>أفضل نقاط الدخول</h3>
        <div class="stack-list compact-stack">
          <a href="${queueHref('missing-address')}" class="stack-item">
            <strong>ناقص العنوان</strong>
            <span>${queueMap['missing-address'].records().length} سجل يحتاج عنوانًا أوضح</span>
          </a>
          <a href="${queueHref('missing-source')}" class="stack-item">
            <strong>ناقص المصدر</strong>
            <span>${queueMap['missing-source'].records().length} سجل بلا مرجع واضح</span>
          </a>
          ${topPicks.length ? topPicks.map(item => `
          <a href="#/entities/${esc(item.slug)}" class="stack-item">
            <strong>${esc(item.name)}</strong>
            <span>${esc(item.district || 'غير متحقق')} • ${esc(item.google_rating || '—')} من 5</span>
          </a>
        `).join('') : '<div class="stack-item static-item"><strong>لا توجد مختارات تقييم ظاهرة</strong><span>يمكنك التركيز على صفوف التشغيل الحالية.</span></div>'}
        </div>
      </div>
    </div>
  `;
}

function renderEntitiesPage() {
  const items = filterRecords();
  return `
    <div class="hero page-hero">
      <div class="section-kicker">كل الكيانات</div>
      <h3>سجل الكيانات</h3>
      <p>تصفح كل الكيانات المتاحة داخل الدليل، واستخدم البحث أو الفلاتر لتضييق النتائج.</p>
    </div>
    ${renderFilterBar()}
    <div class="section-header"><h3>النتائج</h3><div class="actions"><a href="#/entities/__new__" class="button primary">إضافة كيان جديد</a></div></div>
    <div class="section">${renderResultsSection(items, {
      title: 'الكيانات المتاحة',
      note: 'استعرض النتائج كبطاقات سريعة أو عبر الجدول المفصل.',
      emptyTitle: 'لا توجد كيانات مطابقة',
      emptyNote: 'جرّب مسح الفلاتر أو تعديل البحث.',
    })}</div>
  `;
}

function kv(label, value) {
  const finalValue = displayText(value);
  const missing = finalValue === 'غير متحقق' || finalValue === '—';
  return `<div class="kv-item ${missing ? 'is-missing' : ''}"><div class="label">${esc(label)}</div><div class="value">${esc(finalValue)}</div></div>`;
}

function entityChecklist(entity) {
  const groups = [
    {
      label: 'الأساسيات',
      total: 5,
      done: [
        String(entity.district || '').trim() && String(entity.district).trim() !== 'غير متحقق',
        String(entity.short_address || '').trim(),
        String(entity.reference_url || '').trim(),
        String(entity.google_rating || '').trim(),
        String(entity.google_reviews_count || '').trim(),
      ].filter(Boolean).length,
    },
    {
      label: 'المصدر والثقة',
      total: 4,
      done: [
        String(entity.reference_url || '').trim(),
        String(entity.official_instagram || '').trim(),
        String(entity.confidence || '').trim() && entity.confidence !== 'low',
        String(entity.last_verified_at || '').trim(),
      ].filter(Boolean).length,
    },
    {
      label: 'التجربة والوصف',
      total: 4,
      done: [
        String(entity.editorial_summary || '').trim(),
        String(entity.place_personality || '').trim(),
        String(entity.why_choose_it || '').trim(),
        String(entity.not_for_whom || '').trim(),
      ].filter(Boolean).length,
    },
  ];
  return groups.map(group => ({ ...group, ratio: `${group.done}/${group.total}` }));
}

function entityQueueReasons(entity) {
  return Object.entries(attentionQueues())
    .map(([key, queue]) => ({ key, title: queue.title, matched: queue.records().find(item => item.slug === entity.slug), queue }))
    .filter(item => item.matched)
    .map(item => ({
      key: item.key,
      title: item.title,
      reason: item.queue.reason(item.matched),
      action: queueExpectedAction(item.matched, item.key),
    }));
}

function entityTriage(entity) {
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
  const confidenceHint = entity.confidence === 'high'
    ? 'الثقة مرتفعة حاليًا.'
    : entity.confidence === 'medium'
      ? 'الثقة متوسطة وتحتاج تثبيتًا إضافيًا عند الإمكان.'
      : 'الثقة منخفضة وتحتاج مرجعًا أو مراجعة أقوى.';

  const nextAction = districtMissing ? 'ابدأ بتحديد الحي'
    : sourceMissing ? 'أضف مرجعًا مباشرًا'
    : addressMissing ? 'أكمل العنوان المختصر'
    : entity.status === 'needs_review' ? 'راجع السجل تمهيدًا للاعتماد'
    : entity.status === 'branch_conflict' ? 'احسم تعارض الفروع'
    : entity.confidence === 'low' ? 'ارفع مستوى الثقة'
    : 'السجل صالح للمتابعة الخفيفة فقط';

  const quickItems = [
    districtMissing ? 'تحديد الحي' : '',
    sourceMissing ? 'إضافة المرجع' : '',
    addressMissing ? 'إكمال العنوان' : '',
    !String(entity.editorial_summary || '').trim() ? 'إضافة نبذة مختصرة' : '',
    !String(entity.source_notes || '').trim() ? 'إضافة ملاحظة مصدر' : '',
  ].filter(Boolean);

  const qualityHints = [
    !String(entity.google_rating || '').trim() ? 'التقييم غير ظاهر بعد.' : '',
    !String(entity.google_reviews_count || '').trim() ? 'عدد المراجعات غير ظاهر.' : '',
    !String(entity.why_choose_it || '').trim() ? 'سبب الاختيار غير مكتمل.' : '',
    !String(entity.not_for_whom || '').trim() ? 'قسم “لمن لا يناسب” غير مكتمل.' : '',
  ].filter(Boolean);

  return {
    missing,
    queueReasons,
    readiness,
    sourceStatus,
    districtStatus,
    confidenceHint,
    nextAction,
    quickItems,
    qualityHints,
    checklist: entityChecklist(entity),
  };
}

function editorialReadiness(payload = {}) {
  const missing = importantMissingFields(payload);
  if (!String(payload.name || '').trim()) return { key: 'not-ready', label: 'غير جاهزة', note: 'ما زالت تفتقد اسمًا أو أساسيات أولية.' };
  if (missing.length >= 3) return { key: 'needs-completion', label: 'تحتاج إكمال', note: `ينقصها: ${missing.join('، ')}` };
  if (missing.length === 0) return { key: 'export-ready', label: 'جاهزة للتصدير', note: 'الأساسيات مكتملة ويمكن تجهيز patch أو متابعة تنفيذية.' };
  if (missing.length <= 2) return { key: 'review-ready', label: 'جاهزة للمراجعة', note: `بقي عليها: ${missing.join('، ')}` };
  return { key: 'draft-only', label: 'مسودة فقط', note: 'ما زالت في مرحلة تحرير أولية.' };
}

function editorialStatusTone(status = '') {
  return ({
    'draft-only': 'muted',
    'review-ready': 'queue',
    'follow-up-needed': 'warning',
    'export-ready': 'success',
    'not-ready': 'warning',
    'needs-completion': 'gold',
    'queued': 'queue',
    'imported-to-form': 'success',
    'fallback-exported': 'warning',
  }[status] || 'muted');
}

function registerDraftSnapshot(slug, payload = {}, meta = {}) {
  const readiness = editorialReadiness(payload);
  const baseEntity = getEntity(slug) || {};
  upsertStoredItem(editorialDraftsStorageKey(), {
    id: slug,
    slug,
    name: payload.name || baseEntity.name || 'مسودة بلا اسم',
    updatedAt: new Date().toISOString(),
    status: meta.status || readiness.key,
    statusLabel: meta.statusLabel || readiness.label,
    readiness: readiness.key,
    readinessLabel: readiness.label,
    note: meta.note || readiness.note,
    missing: importantMissingFields(payload),
    queueTitles: entityQueueReasons({ ...baseEntity, ...payload, slug }).map(item => item.title),
    source: meta.source || 'manual-edit',
  }, 'id');
}

function registerPatchExportRecord(item = {}) {
  upsertStoredItem(patchConsoleStorageKey(), {
    id: item.id,
    slug: item.slug,
    name: item.name,
    exportedAt: item.exportedAt || new Date().toISOString(),
    mode: item.mode || 'update',
    changeCount: item.changeCount || 0,
    readiness: item.readiness || 'export-ready',
    note: item.note || '',
    status: item.status || 'pending-review',
  }, 'id');
}

function registerImportRecord(item = {}) {
  upsertStoredItem(importConsoleStorageKey(), {
    id: item.id,
    slug: item.slug || '',
    name: item.name || '',
    createdAt: item.createdAt || new Date().toISOString(),
    type: item.type || 'request',
    status: item.status || 'queued',
    note: item.note || '',
    source: item.source || 'editorial-workbench',
  }, 'id');
}

function editorialDraftEntries() {
  return getStoredList(editorialDraftsStorageKey());
}

function patchConsoleEntries() {
  return getStoredList(patchConsoleStorageKey());
}

function importConsoleEntries() {
  return getStoredList(importConsoleStorageKey());
}

function agentDraftStorageKey() {
  return 'daleelyAgentDrafts';
}

function verificationDraftStorageKey() {
  return 'daleelyVerificationDrafts';
}

function agentDraftEntries() {
  return getStoredList(agentDraftStorageKey())
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

function verificationDraftEntries() {
  return getStoredList(verificationDraftStorageKey())
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

function agentRunHistoryStorageKey() {
  return 'daleelyAgentRuns';
}

function agentRunHistoryEntries() {
  return getStoredList(agentRunHistoryStorageKey())
    .sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')));
}

function savedAgentBatchStorageKey() {
  return 'daleelySavedAgentBatches';
}

function savedAgentBatchEntries() {
  return getStoredList(savedAgentBatchStorageKey())
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

function agentProposalStatusLabel(status = '') {
  return ({
    new: 'جديد',
    in_review: 'قيد المراجعة',
    accepted: 'مقبول',
    rejected: 'مرفوض',
    deferred: 'مؤجل',
  }[status] || 'جديد');
}

function agentProposalStatusTone(status = '') {
  return ({
    new: 'queue',
    in_review: 'gold',
    accepted: 'success',
    rejected: 'warning',
    deferred: 'muted',
  }[status] || 'queue');
}

function agentConfidenceLabel(value = '') {
  return ({
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
  }[value] || 'متوسطة');
}

function agentAllowedFieldLabel(field = '') {
  return ({
    short_address: 'العنوان المختصر',
    hours_summary: 'ساعات العمل',
    phone: 'رقم التواصل',
    official_instagram: 'الحساب/الموقع',
    editorial_summary: 'الخلاصة التحريرية',
    verification_rationale: 'مبرر التحقق',
    source_candidate: 'مرشح مصدر',
    conflict_hypothesis: 'فرضية التعارض',
    confidence_recommendation: 'توصية الثقة',
    next_action_draft: 'الخطوة التالية',
  }[field] || field);
}

function agentProposalTypeLabel(type = '') {
  return ({
    completion: 'استكمال السجل',
    verification: 'دعم التحقق',
  }[type] || 'اقتراح مساعد');
}

function agentProposalHandoffLabel(target = '') {
  return ({
    editorial_draft: 'draft التحرير',
    verification_draft: 'draft التحقق',
  }[target] || 'draft محلية');
}

function agentRunStatusLabel(status = '') {
  return ({
    queued: 'قيد الإعداد',
    running: 'قيد التشغيل',
    completed: 'اكتمل',
    completed_with_issues: 'اكتمل مع ملاحظات',
    failed: 'فشل',
  }[status] || 'قيد التشغيل');
}

function agentRunStatusTone(status = '') {
  return ({
    queued: 'muted',
    running: 'gold',
    completed: 'success',
    completed_with_issues: 'warning',
    failed: 'warning',
  }[status] || 'muted');
}

function agentScopeKindLabel(kind = '') {
  return ({
    all: 'كل السجلات',
    queue: 'صف عمل',
    verification_queue: 'صف تحقق',
    district: 'حي',
    sector: 'قطاع',
    status: 'حالة',
    readiness: 'جاهزية',
    saved: 'دفعة محفوظة',
  }[kind] || 'نطاق');
}

function queueAgentRecommendation(queueKey = '') {
  return ({
    'quick-complete': 'completion',
    'new-incomplete': 'completion',
    'missing-address': 'completion',
    'missing-source': 'verification',
    'missing-district': 'verification',
    'low-confidence': 'verification',
    'needs-review': 'verification',
  }[queueKey] || 'completion');
}

function scopeAgentRecommendation(scope = {}) {
  if (scope.kind === 'queue') return queueAgentRecommendation(scope.key);
  if (scope.kind === 'verification_queue') return 'verification';
  if (scope.kind === 'readiness') return ['not-ready', 'review-ready'].includes(scope.key) ? 'completion' : 'verification';
  if (scope.kind === 'status') return ['discovered', 'profiled'].includes(scope.key) ? 'completion' : 'verification';
  if (scope.kind === 'district') return 'completion';
  if (scope.kind === 'sector') return scope.key === 'cafes' ? 'completion' : 'verification';
  return 'completion';
}

function extractPhoneCandidate(text = '') {
  const match = String(text || '').match(/(?:\+?966|0)?5\d{8}/);
  if (!match) return '';
  const digits = match[0].replace(/[^\d+]/g, '');
  return digits.startsWith('966') ? `+${digits}` : digits;
}

function extractInstagramCandidate(record = {}) {
  const sources = [
    String(record.reference_url || ''),
    String(record.source_notes || ''),
    String(record.editorial_summary || ''),
  ];
  for (const source of sources) {
    const urlMatch = source.match(/https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9._-]+/i);
    if (urlMatch) return urlMatch[0];
    const handleMatch = source.match(/@([A-Za-z0-9._]{3,})/);
    if (handleMatch) return `https://instagram.com/${handleMatch[1]}`;
  }
  return '';
}

function extractHoursCandidate(record = {}) {
  const sources = [
    String(record.hours_summary || ''),
    String(record.source_notes || ''),
    String(record.best_visit_time || ''),
  ];
  for (const source of sources) {
    const match = source.match(/(?:يفتح|من|من الساعة)?\s*\d{1,2}(?::\d{2})?\s*(?:ص|م|AM|PM)?\s*(?:-|إلى|حتى)\s*\d{1,2}(?::\d{2})?\s*(?:ص|م|AM|PM)?/i);
    if (match) return normalizeSpaces(match[0]);
  }
  return '';
}

function generatedEditorialSummary(record = {}) {
  const parts = [
    record.category ? `${record.category}` : 'مكان محلي',
    record.place_personality ? `${record.place_personality}` : '',
    record.google_rating ? `بتقييم ${record.google_rating}` : '',
    record.google_reviews_count ? `ومراجعات ${record.google_reviews_count}` : '',
    record.district ? `في ${record.district}` : '',
  ].filter(Boolean);
  if (!parts.length) return '';
  return `${record.name || 'هذا المكان'} ${parts.join(' ')}.`.replace(/\s+/g, ' ').trim();
}

function proposalBasis(record = {}, field = '', suggestion = '') {
  if (field === 'short_address') return record.district ? `اعتمادًا على الحي الظاهر: ${record.district}` : 'استكمال عرضي للسجل.';
  if (field === 'hours_summary') return 'استُخرجت من ملاحظات المصدر أو وقت الزيارة إن وجد.';
  if (field === 'phone') return 'استُخرج من النصوص الحالية المرتبطة بالسجل.';
  if (field === 'official_instagram') return 'استُخرج من الرابط المرجعي أو من ملاحظات السجل.';
  if (field === 'editorial_summary') return suggestion ? 'صيغت من معلومات السجل الحالية لتكون أوضح عرضًا.' : '';
  if (field === 'verification_rationale') return 'مستخلصة من حالة المصدر والحي والثقة مع الأدلة الحالية.';
  if (field === 'source_candidate') return 'مرشح مبني على المراجع أو الحسابات الموجودة حاليًا داخل السجل.';
  if (field === 'conflict_hypothesis') return 'صياغة أولية لشرح موضع التعارض قبل الحسم النهائي.';
  if (field === 'confidence_recommendation') return 'اقتراح عملي يوضح ما الذي يرفع الثقة وما الذي يبقيها معلقة.';
  if (field === 'next_action_draft') return 'مبني على الخطوة التشغيلية الأنسب بحسب حالة التحقق الحالية.';
  return '';
}

function verificationDraftPayload(record = {}, draft = {}) {
  return {
    id: draft.id,
    proposalId: draft.proposalId,
    recordId: record.slug,
    recordName: record.name || record.slug,
    targetField: draft.targetField,
    targetLabel: agentAllowedFieldLabel(draft.targetField),
    suggestedValue: draft.suggestedValue || '',
    reason: draft.reason || '',
    evidence: draft.evidence || '',
    confidence: draft.confidence || 'medium',
    agentName: draft.agentName || 'Verification Support Agent',
    status: draft.status || 'draft-only',
    updatedAt: new Date().toISOString(),
    sourceState: sourceVerificationState(record).label,
    districtState: districtVerificationState(record).label,
    confidenceState: confidenceVerificationState(record).label,
    latestDecision: latestVerificationDecisionForSlug(record.slug)?.decision || '',
  };
}

function buildRecordCompletionProposals(record = null) {
  if (!record) return [];
  const draft = getDraft(record.slug) || {};
  const current = { ...record, ...draft };
  const proposals = [];

  if (!String(current.short_address || '').trim() && String(current.district || '').trim() && String(current.district || '').trim() !== 'غير متحقق') {
    proposals.push({
      targetField: 'short_address',
      currentValue: current.short_address || '',
      suggestedValue: `حي ${current.district}، بريدة`,
      reason: 'السجل يفتقد عنوانًا مختصرًا مقروءًا للمراجعة والعرض.',
      confidence: 'medium',
    });
  }

  if (!String(current.phone || '').trim()) {
    const phone = extractPhoneCandidate(`${current.source_notes || ''}\n${current.editorial_summary || ''}`);
    if (phone) {
      proposals.push({
        targetField: 'phone',
        currentValue: current.phone || '',
        suggestedValue: phone,
        reason: 'تم العثور على رقم يمكن استخدامه كاقتراح أولي داخل نصوص السجل الحالية.',
        confidence: 'high',
      });
    }
  }

  if (!String(current.hours_summary || '').trim()) {
    const hours = extractHoursCandidate(current);
    if (hours) {
      proposals.push({
        targetField: 'hours_summary',
        currentValue: current.hours_summary || '',
        suggestedValue: hours,
        reason: 'تم العثور على ساعات عمل أو نمط وقت زيارة قابل للتحويل إلى صياغة عرضية.',
        confidence: 'medium',
      });
    }
  }

  if (!String(current.official_instagram || '').trim()) {
    const instagram = extractInstagramCandidate(current);
    if (instagram) {
      proposals.push({
        targetField: 'official_instagram',
        currentValue: current.official_instagram || '',
        suggestedValue: instagram,
        reason: 'يوجد رابط أو handle يمكن تحويله إلى حساب عرضي مقترح.',
        confidence: 'high',
      });
    }
  }

  if (!String(current.editorial_summary || '').trim() || String(current.editorial_summary || '').trim().length < 40) {
    const summary = generatedEditorialSummary(current);
    if (summary && summary !== String(current.editorial_summary || '').trim()) {
      proposals.push({
        targetField: 'editorial_summary',
        currentValue: current.editorial_summary || '',
        suggestedValue: summary,
        reason: 'الخلاصة الحالية ناقصة أو قصيرة ويمكن تحسينها لصياغة أوضح للمراجعة والعرض.',
        confidence: String(current.google_rating || '').trim() && String(current.district || '').trim() ? 'medium' : 'low',
      });
    }
  }

  return proposals.map(item => ({
    id: `agent-proposal:${record.slug}:${item.targetField}`,
    agentName: 'Record Completion Agent',
    agentVersion: 'v1',
    proposalType: 'completion',
    handoffTarget: 'editorial_draft',
    recordId: record.slug,
    recordName: record.name || record.slug,
    targetField: item.targetField,
    currentValue: String(item.currentValue || ''),
    suggestedValue: String(item.suggestedValue || ''),
    reason: item.reason,
    evidence: proposalBasis(current, item.targetField, item.suggestedValue),
    confidence: item.confidence,
    mode: 'draft-only',
    status: 'new',
    createdAt: new Date().toISOString(),
    sessionContext: 'read → analyze → propose',
  })).filter(item => item.suggestedValue && item.suggestedValue !== item.currentValue);
}

function buildVerificationSupportProposals(record = null) {
  if (!record) return [];
  const draft = getDraft(record.slug) || {};
  const current = { ...record, ...draft };
  const source = sourceVerificationState(current);
  const district = districtVerificationState(current);
  const confidence = confidenceVerificationState(current);
  const latestDecision = latestVerificationDecisionForSlug(record.slug);
  const evidence = evidenceForSlug(record.slug);
  const relatedMission = missionPlan().missions.find(item => item.recordSlugs.includes(record.slug));
  const relatedSession = missionSessions().find(item => (item.recordSlugs || []).includes(record.slug));
  const proposals = [];

  const rationale = [
    source.key !== 'verified' ? `المصدر: ${source.reason}` : '',
    district.key !== 'verified' ? `الحي: ${district.reason}` : '',
    confidence.key !== 'stable' ? `الثقة: ${confidence.reason}` : '',
    latestDecision?.note ? `آخر قرار: ${latestDecision.note}` : '',
    evidence.length ? `يوجد ${evidence.length} دليل مسجل حتى الآن.` : 'لا يوجد evidence trail كافٍ حتى الآن.',
  ].filter(Boolean).join(' ');
  if (rationale) {
    proposals.push({
      targetField: 'verification_rationale',
      currentValue: latestDecision?.note || '',
      suggestedValue: rationale,
      reason: 'صياغة مختصرة تشرح لماذا ما زال السجل داخل مسار التحقق الآن.',
      confidence: ['conflicting', 'blocked'].includes(source.key) || ['blocked', 'escalate'].includes(confidence.key) ? 'high' : 'medium',
    });
  }

  const sourceCandidate = String(current.reference_url || current.official_instagram || '').trim();
  if (source.key !== 'verified' && sourceCandidate) {
    proposals.push({
      targetField: 'source_candidate',
      currentValue: '',
      suggestedValue: sourceCandidate,
      reason: 'يوجد مرجع أو حساب ظاهر يمكن رفعه كمرشح تحقق بدل ترك السجل بلا نقطة انطلاق واضحة.',
      confidence: current.reference_url ? 'high' : 'medium',
    });
  }

  if (source.key === 'conflicting' || current.status === 'branch_conflict') {
    proposals.push({
      targetField: 'conflict_hypothesis',
      currentValue: latestDecision?.blockers || '',
      suggestedValue: `يبدو أن التعارض الحالي مرتبط بتعدد الفروع أو بتضارب المرجع مع بيانات السجل الحالية، ويحتاج حسم المرجع الأوثق قبل أي اعتماد.`,
      reason: 'اقتراح أولي لشرح موضع التعارض قبل تصعيده أو حسمه يدويًا.',
      confidence: 'medium',
    });
  }

  if (confidence.key !== 'stable') {
    const blockers = [
      source.key !== 'verified' ? source.next : '',
      district.key !== 'verified' ? district.next : '',
      confidence.next || '',
    ].filter(Boolean);
    proposals.push({
      targetField: 'confidence_recommendation',
      currentValue: String(current.confidence || ''),
      suggestedValue: `الثقة الحالية ${displayConfidence(current.confidence)}، والأقرب لرفعها الآن هو: ${uniq(blockers).slice(0, 2).join(' ثم ')}.`,
      reason: 'توصية تشغيلية تشرح ما الذي يرفع الثقة وما الذي يبقي السجل معلقًا.',
      confidence: 'medium',
    });
  }

  const nextAction = latestDecision?.nextAction
    || relatedMission?.whatToClose
    || relatedSession?.resultSummary
    || district.next
    || source.next
    || confidence.next;
  if (nextAction) {
    proposals.push({
      targetField: 'next_action_draft',
      currentValue: latestDecision?.nextAction || '',
      suggestedValue: nextAction,
      reason: 'تلخيص للخطوة التشغيلية التالية حتى لا يبقى السجل عالقًا بين evidence والقرار والمتابعة.',
      confidence: 'medium',
    });
  }

  return proposals.map(item => ({
    id: `agent-proposal:verification:${record.slug}:${item.targetField}`,
    agentName: 'Verification Support Agent',
    agentVersion: 'v1',
    proposalType: 'verification',
    handoffTarget: 'verification_draft',
    recordId: record.slug,
    recordName: record.name || record.slug,
    targetField: item.targetField,
    currentValue: String(item.currentValue || ''),
    suggestedValue: String(item.suggestedValue || ''),
    reason: item.reason,
    evidence: proposalBasis(current, item.targetField, item.suggestedValue),
    confidence: item.confidence,
    mode: 'draft-only',
    status: 'new',
    createdAt: new Date().toISOString(),
    sessionContext: 'read → analyze → propose',
  })).filter(item => item.suggestedValue && item.suggestedValue !== item.currentValue);
}

function runRecordCompletionAgentLocal(slug = '') {
  const record = getEntity(slug);
  if (!record) {
    return {
      ok: false,
      status: 'error',
      proposals: [],
      slug,
      message: 'حدث خطأ أثناء تشغيل الوكيل.',
      diagnostics: {
        runtimeBacked: false,
        runtimeSource: 'local-only',
        fallbackUsed: false,
        validationRejected: 0,
        providerError: 'missing record',
      },
    };
  }
  const proposals = buildRecordCompletionProposals(record);
  proposals.forEach(item => upsertStoredItem(agentDraftStorageKey(), item, 'id'));
  if (!proposals.length) {
    return {
      ok: true,
      status: 'empty',
      proposals: [],
      slug,
      message: 'هذا السجل لا يحتوي حقولًا ضمن نطاق وكيل الاستكمال الحالي.',
      diagnostics: {
        runtimeBacked: false,
        runtimeSource: 'local-only',
        fallbackUsed: false,
        validationRejected: 0,
        providerError: '',
      },
    };
  }
  return {
    ok: true,
    status: 'success',
    proposals,
    slug,
    message: proposals.length === 1
      ? 'تم إنشاء مسودة وكيل لهذا السجل.'
      : `تم إنشاء ${proposals.length} مسودات وكيل لهذا السجل.`,
    diagnostics: {
      runtimeBacked: false,
      runtimeSource: 'local-only',
      fallbackUsed: false,
      validationRejected: 0,
      providerError: '',
    },
  };
}

async function runRecordCompletionAgent(slug = '') {
  const record = getEntity(slug);
  if (!record) {
    return {
      ok: false,
      status: 'error',
      proposals: [],
      slug,
      message: 'حدث خطأ أثناء تشغيل الوكيل.',
    };
  }
  try {
    const res = await fetch('./api/agents/record-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        record,
        draft: getDraft(slug) || null,
      }),
    });
    if (!res.ok) throw new Error('runtime failed');
    const payload = await res.json();
    const proposals = Array.isArray(payload.proposals) ? payload.proposals : [];
    proposals.forEach(item => upsertStoredItem(agentDraftStorageKey(), item, 'id'));
    return {
      ok: Boolean(payload.ok),
      status: payload.status || 'error',
      proposals,
      slug,
      message: payload.message || 'حدث خطأ أثناء تشغيل الوكيل.',
      diagnostics: {
        runtimeBacked: true,
        runtimeSource: payload.diagnostics?.runtimeSource || 'runtime',
        fallbackUsed: Boolean(payload.diagnostics?.fallbackUsed),
        validationRejected: Number(payload.diagnostics?.validationRejected || 0),
        providerError: payload.diagnostics?.providerError || '',
        requestErrors: payload.diagnostics?.requestErrors || [],
      },
    };
  } catch (error) {
    const fallback = runRecordCompletionAgentLocal(slug);
    return {
      ...fallback,
      diagnostics: {
        ...(fallback.diagnostics || {}),
        runtimeBacked: true,
        runtimeSource: 'local-fallback',
        fallbackUsed: true,
        validationRejected: Number(fallback.diagnostics?.validationRejected || 0),
        providerError: error.message || 'runtime failed',
      },
    };
  }
}

function buildVerificationRuntimeContext(slug = '') {
  const latestDecision = latestVerificationDecisionForSlug(slug);
  const relatedMission = missionPlan().missions.find(item => item.recordSlugs.includes(slug)) || null;
  const relatedSession = missionSessions().find(item => (item.recordSlugs || []).includes(slug)) || null;
  return {
    evidenceCount: evidenceForSlug(slug).length,
    latestDecision: latestDecision ? {
      decision: latestDecision.decision || '',
      note: latestDecision.note || '',
      blockers: latestDecision.blockers || '',
      nextAction: latestDecision.nextAction || '',
    } : null,
    relatedMission: relatedMission ? {
      id: relatedMission.id,
      title: relatedMission.title,
      type: relatedMission.type,
      whyOpened: relatedMission.whyOpened,
      whatToClose: relatedMission.whatToClose,
    } : null,
    relatedSession: relatedSession ? {
      id: relatedSession.id,
      missionId: relatedSession.missionId,
      status: relatedSession.status,
      resultSummary: relatedSession.resultSummary || '',
    } : null,
  };
}

function runVerificationSupportAgentLocal(slug = '') {
  const record = getEntity(slug);
  if (!record) {
    return {
      ok: false,
      status: 'error',
      proposals: [],
      slug,
      message: 'حدث خطأ أثناء تشغيل وكيل التحقق.',
      diagnostics: {
        runtimeBacked: false,
        runtimeSource: 'local-only',
        fallbackUsed: false,
        validationRejected: 0,
        providerError: 'missing record',
      },
    };
  }
  const proposals = buildVerificationSupportProposals(record);
  proposals.forEach(item => upsertStoredItem(agentDraftStorageKey(), item, 'id'));
  if (!proposals.length) {
    return {
      ok: true,
      status: 'empty',
      proposals: [],
      slug,
      message: 'هذا السجل لا يحتاج اقتراحات ضمن نطاق وكيل دعم التحقق الحالي.',
      diagnostics: {
        runtimeBacked: false,
        runtimeSource: 'local-only',
        fallbackUsed: false,
        validationRejected: 0,
        providerError: '',
      },
    };
  }
  return {
    ok: true,
    status: 'success',
    proposals,
    slug,
    message: proposals.length === 1
      ? 'تم إنشاء مسودة تحقق لهذا السجل.'
      : `تم إنشاء ${proposals.length} مسودات تحقق لهذا السجل.`,
    diagnostics: {
      runtimeBacked: false,
      runtimeSource: 'local-only',
      fallbackUsed: false,
      validationRejected: 0,
      providerError: '',
    },
  };
}

async function runVerificationSupportAgent(slug = '') {
  const record = getEntity(slug);
  if (!record) {
    return {
      ok: false,
      status: 'error',
      proposals: [],
      slug,
      message: 'حدث خطأ أثناء تشغيل وكيل التحقق.',
    };
  }
  try {
    const res = await fetch('./api/agents/verification-support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        record,
        draft: getDraft(slug) || null,
        verificationContext: buildVerificationRuntimeContext(slug),
      }),
    });
    if (!res.ok) throw new Error('runtime failed');
    const payload = await res.json();
    const proposals = Array.isArray(payload.proposals) ? payload.proposals : [];
    proposals.forEach(item => upsertStoredItem(agentDraftStorageKey(), item, 'id'));
    return {
      ok: Boolean(payload.ok),
      status: payload.status || 'error',
      proposals,
      slug,
      message: payload.message || 'حدث خطأ أثناء تشغيل وكيل التحقق.',
      diagnostics: {
        runtimeBacked: true,
        runtimeSource: payload.diagnostics?.runtimeSource || 'runtime',
        fallbackUsed: Boolean(payload.diagnostics?.fallbackUsed),
        validationRejected: Number(payload.diagnostics?.validationRejected || 0),
        providerError: payload.diagnostics?.providerError || '',
        requestErrors: payload.diagnostics?.requestErrors || [],
      },
    };
  } catch (error) {
    const fallback = runVerificationSupportAgentLocal(slug);
    return {
      ...fallback,
      diagnostics: {
        ...(fallback.diagnostics || {}),
        runtimeBacked: true,
        runtimeSource: 'local-fallback',
        fallbackUsed: true,
        validationRejected: Number(fallback.diagnostics?.validationRejected || 0),
        providerError: error.message || 'runtime failed',
      },
    };
  }
}

function summarizeAgentBatchResults(results = []) {
  return {
    total: results.length,
    generated: results.filter(item => item.status === 'success').length,
    noEligible: results.filter(item => item.status === 'empty').length,
    failed: results.filter(item => item.status === 'error').length,
    proposals: results.reduce((acc, item) => acc + (item.proposalCount || 0), 0),
    manualReview: results.filter(item => item.status === 'success' && item.proposalCount > 0).length,
    editorialHandoff: results.reduce((acc, item) => acc + (item.editorialHandoff || 0), 0),
    verificationHandoff: results.reduce((acc, item) => acc + (item.verificationHandoff || 0), 0),
    runtimeBacked: results.filter(item => item.runtimeBacked).length,
    runtimeDirect: results.filter(item => item.runtimeBacked && !item.fallbackUsed && item.runtimeSource !== 'local-only').length,
    fallbackUsed: results.filter(item => item.fallbackUsed).length,
    validationRejected: results.reduce((acc, item) => acc + (item.validationRejected || 0), 0),
    runtimeFailed: results.filter(item => item.status === 'error' && item.runtimeBacked).length,
    localOnly: results.filter(item => !item.runtimeBacked || item.runtimeSource === 'local-only').length,
  };
}

function runtimeBatchScopeLabel(scope = null, total = 0) {
  if (scope?.label) return `${agentScopeKindLabel(scope.kind)}: ${scope.label}`;
  return `دفعة تشغيل (${total})`;
}

function buildRuntimeBatchItems(agentKey = 'completion', records = []) {
  return records.map(record => {
    const item = {
      slug: record.slug,
      record,
      draft: getDraft(record.slug) || null,
    };
    if (agentKey === 'verification') item.verificationContext = buildVerificationRuntimeContext(record.slug);
    return item;
  });
}

function normalizeBatchResultItem(item = {}, fallbackRecord = {}) {
  const record = item.record || fallbackRecord || {};
  const proposals = Array.isArray(item.proposals) ? item.proposals : [];
  return {
    slug: item.slug || record.slug || '',
    name: item.name || record.name || record.slug || '',
    status: item.status || 'error',
    proposalCount: proposals.length || Number(item.proposalCount || 0),
    message: item.message || 'حدث خطأ أثناء تشغيل الوكيل على هذا السجل.',
    editorialHandoff: proposals.filter(entry => entry.handoffTarget === 'editorial_draft').length || Number(item.editorialHandoff || 0),
    verificationHandoff: proposals.filter(entry => entry.handoffTarget === 'verification_draft').length || Number(item.verificationHandoff || 0),
    runtimeBacked: item.runtimeBacked ?? true,
    runtimeSource: item.runtimeSource || item.diagnostics?.runtimeSource || 'unknown',
    fallbackUsed: Boolean(item.fallbackUsed ?? item.diagnostics?.fallbackUsed),
    validationRejected: Number(item.validationRejected ?? item.diagnostics?.validationRejected ?? 0),
    providerError: item.providerError || item.diagnostics?.providerError || '',
    requestErrors: item.requestErrors || item.diagnostics?.requestErrors || [],
  };
}

async function runAgentBatchLocally(agentKey = 'completion', records = [], scope = null) {
  const definition = agentDefinitionByKey(agentKey);
  const startedAt = new Date().toISOString();
  const results = [];
  for (const record of records) {
    try {
      const response = await Promise.resolve(definition.run(record.slug));
      const proposals = response.proposals || [];
      const diagnostics = response.diagnostics || {};
      results.push({
        slug: record.slug,
        name: record.name || record.slug,
        status: response.status,
        proposalCount: proposals.length,
        message: response.message || '',
        editorialHandoff: proposals.filter(item => item.handoffTarget === 'editorial_draft').length,
        verificationHandoff: proposals.filter(item => item.handoffTarget === 'verification_draft').length,
        runtimeBacked: Boolean(diagnostics.runtimeBacked),
        runtimeSource: diagnostics.runtimeSource || 'unknown',
        fallbackUsed: Boolean(diagnostics.fallbackUsed),
        validationRejected: Number(diagnostics.validationRejected || 0),
        providerError: diagnostics.providerError || '',
        requestErrors: diagnostics.requestErrors || [],
      });
    } catch (error) {
      results.push({
        slug: record.slug,
        name: record.name || record.slug,
        status: 'error',
        proposalCount: 0,
        message: 'حدث خطأ أثناء تشغيل الوكيل على هذا السجل.',
        editorialHandoff: 0,
        verificationHandoff: 0,
        runtimeBacked: true,
        runtimeSource: 'runtime-error',
        fallbackUsed: false,
        validationRejected: 0,
        providerError: error.message || 'runtime batch failure',
        requestErrors: [],
      });
    }
  }
  return {
    id: `agent-run:${agentKey}:${scope ? `${scope.kind}:${scope.key}:` : ''}${Date.now()}`,
    agentKey,
    agentName: definition.name,
    title: definition.title,
    scope: scope || undefined,
    scopeLabel: runtimeBatchScopeLabel(scope, records.length),
    startedAt,
    finishedAt: new Date().toISOString(),
    status: summarizeAgentBatchResults(results).failed ? 'completed_with_issues' : 'completed',
    recordSlugs: records.map(item => item.slug),
    summary: summarizeAgentBatchResults(results),
    results,
  };
}

async function runAgentBatchRuntime(agentKey = 'completion', records = [], scope = null) {
  const definition = agentDefinitionByKey(agentKey);
  const payload = {
    scope: scope || null,
    scopeLabel: runtimeBatchScopeLabel(scope, records.length),
    items: buildRuntimeBatchItems(agentKey, records),
  };
  const startedAt = new Date().toISOString();
  const res = await fetch(agentBatchEndpoint(agentKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('runtime batch failed');
  const batch = await res.json();
  const results = (Array.isArray(batch.results) ? batch.results : []).map((item, index) => {
    (item.proposals || []).forEach(proposal => upsertStoredItem(agentDraftStorageKey(), proposal, 'id'));
    return normalizeBatchResultItem(item, records[index]);
  });
  const summary = batch.summary && typeof batch.summary === 'object'
    ? {
        total: Number(batch.summary.total || results.length),
        generated: Number(batch.summary.generated || 0),
        noEligible: Number(batch.summary.noEligible || 0),
        failed: Number(batch.summary.failed || 0),
        proposals: Number(batch.summary.proposals || 0),
        manualReview: Number(batch.summary.manualReview || 0),
        editorialHandoff: Number(batch.summary.editorialHandoff || results.reduce((acc, item) => acc + item.editorialHandoff, 0)),
        verificationHandoff: Number(batch.summary.verificationHandoff || results.reduce((acc, item) => acc + item.verificationHandoff, 0)),
        runtimeBacked: results.filter(item => item.runtimeBacked).length,
        runtimeDirect: Number(batch.summary.runtimeDirect || results.filter(item => item.runtimeBacked && !item.fallbackUsed && item.runtimeSource !== 'local-only').length),
        fallbackUsed: Number(batch.summary.fallbackUsed || 0),
        validationRejected: Number(batch.summary.validationRejected || 0),
        runtimeFailed: Number(batch.summary.runtimeFailed || 0),
        localOnly: results.filter(item => !item.runtimeBacked || item.runtimeSource === 'local-only').length,
      }
    : summarizeAgentBatchResults(results);
  return {
    id: `agent-run:${agentKey}:${scope ? `${scope.kind}:${scope.key}:` : ''}${Date.now()}`,
    agentKey,
    agentName: definition.name,
    title: definition.title,
    scope: scope || undefined,
    scopeLabel: payload.scopeLabel,
    startedAt,
    finishedAt: new Date().toISOString(),
    status: batch.status || (summary.failed ? 'completed_with_issues' : 'completed'),
    recordSlugs: records.map(item => item.slug),
    summary,
    results,
    runtimeBatch: true,
  };
}

function agentDraftSummary() {
  const items = agentDraftEntries();
  return {
    items,
    completion: items.filter(item => item.proposalType !== 'verification'),
    verification: items.filter(item => item.proposalType === 'verification'),
    new: items.filter(item => item.status === 'new'),
    inReview: items.filter(item => item.status === 'in_review'),
    accepted: items.filter(item => item.status === 'accepted'),
    rejected: items.filter(item => item.status === 'rejected'),
    deferred: items.filter(item => item.status === 'deferred'),
  };
}

function updateAgentProposalStatus(id = '', status = 'in_review') {
  const current = agentDraftEntries().find(item => item.id === id);
  if (!current) return null;
  const next = { ...current, status, reviewedAt: new Date().toISOString() };
  upsertStoredItem(agentDraftStorageKey(), next, 'id');
  return next;
}

function acceptAgentProposalToDraft(id = '') {
  const proposal = agentDraftEntries().find(item => item.id === id);
  if (!proposal) return null;
  if (proposal.handoffTarget === 'verification_draft') {
    const record = getEntity(proposal.recordId);
    if (!record) return null;
    const nextDraft = {
      id: `verification-draft:${proposal.id}`,
      proposalId: proposal.id,
      createdAt: proposal.createdAt,
      ...verificationDraftPayload(record, proposal),
    };
    upsertStoredItem(verificationDraftStorageKey(), nextDraft, 'id');
    const next = {
      ...proposal,
      status: 'accepted',
      reviewedAt: new Date().toISOString(),
      acceptedToDraftAt: new Date().toISOString(),
    };
    upsertStoredItem(agentDraftStorageKey(), next, 'id');
    return next;
  }
  const record = getEntity(proposal.recordId);
  const draft = getDraft(proposal.recordId) || {};
  const payload = { ...(record || {}), ...draft, [proposal.targetField]: proposal.suggestedValue };
  saveDraft(proposal.recordId, payload, {
    source: 'agent-completion',
    note: `قاد هذا القبول اقتراح "${agentAllowedFieldLabel(proposal.targetField)}" من ${proposal.agentName} إلى draft التحرير.`,
  });
  const next = {
    ...proposal,
    status: 'accepted',
    reviewedAt: new Date().toISOString(),
    acceptedToDraftAt: new Date().toISOString(),
  };
  upsertStoredItem(agentDraftStorageKey(), next, 'id');
  return next;
}

function agentDefinitions() {
  const history = agentRunHistoryEntries();
  return [
    {
      key: 'completion',
      name: 'Record Completion Agent',
      title: 'وكيل استكمال السجل',
      description: 'يكمل الحقول النصية والمعلوماتية منخفضة المخاطر مثل العنوان المختصر والوصف وساعات العمل.',
      outputLabel: 'اقتراحات استكمال آمنة',
      run: runRecordCompletionAgent,
      eligibleRecords: () => state.records.filter(record => buildRecordCompletionProposals(record).length),
      batchRecords: () => state.records,
      lastRun: history.find(item => item.agentKey === 'completion') || null,
    },
    {
      key: 'verification',
      name: 'Verification Support Agent',
      title: 'وكيل دعم التحقق',
      description: 'يبني rationale drafts وsource candidates وnext actions من سياق التحقق الحالي من دون أي قرار نهائي.',
      outputLabel: 'اقتراحات تحقق draft only',
      run: runVerificationSupportAgent,
      eligibleRecords: () => state.records.filter(record => buildVerificationSupportProposals(record).length),
      batchRecords: () => state.records,
      lastRun: history.find(item => item.agentKey === 'verification') || null,
    },
  ];
}

function agentDefinitionByKey(key = 'completion') {
  return agentDefinitions().find(item => item.key === key) || agentDefinitions()[0];
}

function recordsForSectorScope(sectorKey = 'cafes') {
  return state.records.filter(record => {
    const sector = String(record.sector || '').trim();
    const category = String(record.category || '').trim();
    if (sector && sector === sectorKey) return true;
    if (sectorKey === 'cafes') return /كافيه|قهوة|coffee|cafe/i.test(category);
    return category.includes(sectorLabelByKey(sectorKey));
  });
}

function recordsForAgentScope(scope = { kind: 'all', key: 'eligible' }) {
  if (!scope) return state.records;
  switch (scope.kind) {
    case 'queue':
      return attentionQueues()[scope.key]?.records() || [];
    case 'verification_queue':
      return verificationQueues()[scope.key]?.records() || [];
    case 'district':
      return state.records.filter(record => String(record.district || '').trim() === scope.key);
    case 'sector':
      return recordsForSectorScope(scope.key);
    case 'status':
      return state.records.filter(record => record.status === scope.key);
    case 'readiness':
      return state.records.filter(record => recordReadiness(record).key === scope.key);
    case 'saved': {
      const saved = savedAgentBatchEntries().find(item => item.id === scope.key);
      return saved ? recordsForAgentScope(saved.scope) : [];
    }
    case 'all':
    default:
      return state.records;
  }
}

function saveAgentBatchTemplate(item = {}) {
  const scope = item.scope || { kind: 'queue', key: 'quick-complete', label: 'إكمال سريع' };
  const next = {
    id: item.id || `saved-agent-batch:${scope.kind}:${scope.key}`,
    title: item.title || `${agentScopeKindLabel(scope.kind)}: ${scope.label}`,
    agentKey: item.agentKey || scopeAgentRecommendation(scope),
    scope,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  upsertStoredItem(savedAgentBatchStorageKey(), next, 'id');
  return next;
}

function derivedAgentScopes() {
  const districtCounts = {};
  state.records.forEach(record => {
    const district = String(record.district || '').trim();
    if (!district || district === 'غير متحقق') return;
    districtCounts[district] = (districtCounts[district] || 0) + 1;
  });
  const topDistricts = Object.entries(districtCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  return {
    queueScopes: Object.entries(attentionQueues()).map(([key, queue]) => ({
      kind: 'queue',
      key,
      label: queue.title,
      count: queue.records().length,
      recommendedAgent: queueAgentRecommendation(key),
      note: queue.note,
    })),
    verificationScopes: Object.entries(verificationQueues()).map(([key, queue]) => ({
      kind: 'verification_queue',
      key,
      label: queue.title,
      count: queue.records().length,
      recommendedAgent: 'verification',
      note: queue.note,
    })),
    readinessScopes: ['not-ready', 'review-ready', 'needs-follow-up', 'export-ready'].map(key => ({
      kind: 'readiness',
      key,
      label: readinessLabel(key),
      count: state.records.filter(record => recordReadiness(record).key === key).length,
      recommendedAgent: scopeAgentRecommendation({ kind: 'readiness', key }),
      note: 'نطاق مبني على جاهزية السجل الحالية.',
    })),
    sectorScopes: ['cafes'].map(key => ({
      kind: 'sector',
      key,
      label: sectorLabelByKey(key),
      count: recordsForSectorScope(key).length,
      recommendedAgent: scopeAgentRecommendation({ kind: 'sector', key }),
      note: 'نطاق قطاعي لتشغيلات الوكلاء على قطاع محدد.',
    })),
    districtScopes: topDistricts.map(([key, count]) => ({
      kind: 'district',
      key,
      label: key,
      count,
      recommendedAgent: scopeAgentRecommendation({ kind: 'district', key }),
      note: 'حي متكرر يمكن إعادة تشغيله يوميًا كدفعة مستقلة.',
    })),
    statusScopes: ['discovered', 'profiled', 'needs_review', 'partially_verified'].map(key => ({
      kind: 'status',
      key,
      label: STATUS_AR[key] || key,
      count: state.records.filter(record => record.status === key).length,
      recommendedAgent: scopeAgentRecommendation({ kind: 'status', key }),
      note: 'نطاق مبني على الحالة التشغيلية الحالية.',
    })),
  };
}

async function runAgentBatch(agentKey = 'completion', recordSlugs = []) {
  const definition = agentDefinitionByKey(agentKey);
  const records = (recordSlugs.length
    ? recordSlugs.map(slug => getEntity(slug)).filter(Boolean)
    : definition.batchRecords())
    .filter(Boolean);
  let entry;
  try {
    entry = await runAgentBatchRuntime(agentKey, records, null);
  } catch {
    entry = await runAgentBatchLocally(agentKey, records, null);
  }
  upsertStoredItem(agentRunHistoryStorageKey(), entry, 'id');
  return entry;
}

async function runAgentBatchScoped(agentKey = 'completion', scope = { kind: 'all', key: 'eligible', label: 'كل السجلات المؤهلة' }) {
  const records = recordsForAgentScope(scope);
  let entry;
  try {
    entry = await runAgentBatchRuntime(agentKey, records, scope);
  } catch {
    entry = await runAgentBatchLocally(agentKey, records, scope);
  }
  upsertStoredItem(agentRunHistoryStorageKey(), entry, 'id');
  return entry;
}

function renderEditorialControlCenter() {
  const drafts = editorialDraftEntries();
  const patches = patchConsoleEntries();
  const imports = importConsoleEntries();
  const agent = agentDraftSummary();
  const verificationDrafts = verificationDraftEntries();
  const readinessCounts = {
    new: drafts.filter(item => item.status === 'draft-only').length,
    reviewReady: drafts.filter(item => item.status === 'review-ready').length,
    completion: drafts.filter(item => item.status === 'needs-completion').length,
    exportReady: drafts.filter(item => item.status === 'export-ready').length,
    deferred: drafts.filter(item => item.status === 'follow-up-needed' || item.status === 'not-ready').length,
  };

  return `
    <div class="hero hero-compact page-hero operator-hero">
      <div class="section-kicker">التحكم التحريري</div>
      <h3>مركز التحكم التحريري</h3>
      <p>مكان واحد للمسودات وطلبات الاستيراد والتعديلات المصدّرة والعناصر الجاهزة للمتابعة أو التطبيق لاحقًا.</p>
      <div class="hero-actions">
        <a href="#/dashboard" class="button">لوحة التشغيل</a>
        <a href="#/agent-ops" class="button">عمليات الوكلاء</a>
        <a href="#/editorial-hub" class="button gold">مركز التحكم التحريري</a>
        <a href="#/ops-hub" class="button">مركز المراجعة</a>
        <a href="#/verification/source-review" class="button">نظام التحقق</a>
        <a href="#/verification-program" class="button">مركز عمليات التحقق والمهام</a>
        <a href="#/agent-drafts" class="button">مسودات الوكلاء</a>
        <a href="#/release-readiness" class="button primary">مركز الجاهزية</a>
        <a href="#/entities/__new__" class="button primary">مسودة جديدة</a>
      </div>
    </div>
    <div class="editorial-shell section">
      <div class="editorial-kpis">
        <div class="card mini-panel emphasis-panel"><div class="metric">${drafts.length}</div><div class="metric-sub">كل المسودات</div></div>
        <div class="card mini-panel"><div class="metric">${patches.length}</div><div class="metric-sub">Patch exports</div></div>
        <div class="card mini-panel"><div class="metric">${imports.length}</div><div class="metric-sub">Import items</div></div>
        <div class="card mini-panel"><div class="metric">${agent.items.length}</div><div class="metric-sub">مسودات الوكلاء</div></div>
        <div class="card mini-panel"><div class="metric">${verificationDrafts.length}</div><div class="metric-sub">Verification drafts</div></div>
        <div class="card mini-panel"><div class="metric">${readinessCounts.exportReady}</div><div class="metric-sub">جاهزة للتصدير</div></div>
      </div>
      <div class="editorial-grid">
        <div class="card">
          <div class="section-kicker">إدارة المسودات</div>
          <h3>المسودات</h3>
          ${drafts.length ? `
            <div class="editorial-list">
              ${drafts.map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.name)}</strong>
                      <span>${esc(item.slug)}</span>
                    </div>
                    <span class="pill ${editorialStatusTone(item.status)}">${esc(item.readinessLabel || item.statusLabel || 'مسودة')}</span>
                  </div>
                  <p>${esc(item.note || 'لا توجد ملاحظة تحريرية إضافية.')}</p>
                  <div class="ops-session-meta">
                    <span>آخر تحديث ${esc(item.updatedAt || '—')}</span>
                    <span>ناقص ${item.missing?.length || 0}</span>
                    <span>${esc((item.queueTitles || []).join('، ') || 'بلا صفوف مرتبطة')}</span>
                    <span>المصدر: ${esc(item.source || 'manual-edit')}</span>
                  </div>
                  <div class="actions">
                    <a class="button" href="${entityHref(item.slug, { edit: true })}">فتح السجل</a>
                    <a class="button subtle" href="#/ops-hub">المراجعة</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد مسودات محفوظة بعد.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">لوحة الـ patch</div>
          <h3>التعديلات المصدّرة</h3>
          ${patches.length ? `
            <div class="editorial-list">
              ${patches.map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.name)}</strong>
                      <span>${esc(item.mode)} • ${item.changeCount} تغييرات</span>
                    </div>
                    <span class="pill ${editorialStatusTone(item.readiness)}">${esc(item.status === 'ready-for-follow-up' ? 'جاهز للمتابعة' : 'قيد المراجعة')}</span>
                  </div>
                  <p>${esc(item.note || 'لا توجد ملاحظة إضافية.')}</p>
                  <div class="ops-session-meta">
                    <span>${esc(item.exportedAt || '—')}</span>
                    <span>${esc(item.slug)}</span>
                  </div>
                  <div class="actions">
                    <a class="button" href="${entityHref(item.slug, { edit: true })}">فتح السجل</a>
                    <a class="button subtle" href="#/ops-hub">متابعة التنفيذ</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد patch exports محفوظة بعد.</div>'}
        </div>
      </div>
      <div class="editorial-grid">
        <div class="card">
          <div class="section-kicker">طلبات ونتائج الاستيراد</div>
          <h3>طلبات ونتائج الاستيراد</h3>
          ${imports.length ? `
            <div class="editorial-list">
              ${imports.map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.name || item.slug || item.id)}</strong>
                      <span>${esc(item.type)} • ${esc(item.source)}</span>
                    </div>
                    <span class="pill ${editorialStatusTone(item.status)}">${esc(item.status)}</span>
                  </div>
                  <p>${esc(item.note || 'لا توجد ملاحظة إضافية.')}</p>
                  <div class="ops-session-meta">
                    <span>${esc(item.createdAt || '—')}</span>
                    <span>${esc(item.slug || 'غير مرتبط بسجل')}</span>
                  </div>
                  <div class="actions">
                    ${item.slug ? `<a class="button" href="${entityHref(item.slug, { edit: true })}">فتح السجل</a>` : ''}
                    <a class="button subtle" href="#/entities/__new__">مسودة جديدة</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد import items محفوظة بعد.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">مسودات الوكلاء</div>
          <h3>مسودات الوكلاء</h3>
          <div class="ops-followup-grid">
            <div class="triage-list-item"><strong>جديد</strong><span>${agent.new.length} اقتراح</span></div>
            <div class="triage-list-item"><strong>قيد المراجعة</strong><span>${agent.inReview.length} اقتراح</span></div>
            <div class="triage-list-item"><strong>مقبول</strong><span>${agent.accepted.length} اقتراح</span></div>
            <div class="triage-list-item"><strong>مؤجل/مرفوض</strong><span>${agent.deferred.length + agent.rejected.length} اقتراح</span></div>
          </div>
          ${agent.items.length ? `
            <div class="editorial-list">
              ${agent.items.slice(0, 4).map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.recordName)}</strong>
                      <span>${esc(agentAllowedFieldLabel(item.targetField))} • ${esc(agentProposalTypeLabel(item.proposalType))} • ${esc(agentConfidenceLabel(item.confidence))}</span>
                    </div>
                    <span class="pill ${agentProposalStatusTone(item.status)}">${esc(agentProposalStatusLabel(item.status))}</span>
                  </div>
                  <p>${esc(item.reason)}${item.status === 'accepted' ? ` • تم تحويله إلى ${agentProposalHandoffLabel(item.handoffTarget)}.` : ''}</p>
                  <div class="actions">
                    <a class="button" href="${entityHref(item.recordId, { edit: true })}">فتح السجل</a>
                    <a class="button subtle" href="#/agent-drafts">كل الاقتراحات</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد اقتراحات محفوظة من الوكيل بعد.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">Verification drafts</div>
          <h3>handoff التحقق المقبول</h3>
          ${verificationDrafts.length ? `
            <div class="editorial-list">
              ${verificationDrafts.slice(0, 4).map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.recordName)}</strong>
                      <span>${esc(item.targetLabel)} • ${esc(agentConfidenceLabel(item.confidence))}</span>
                    </div>
                    <span class="pill queue">draft التحقق</span>
                  </div>
                  <p>${esc(item.suggestedValue)}</p>
                  <div class="ops-session-meta">
                    <span>المصدر: ${esc(item.sourceState)}</span>
                    <span>الحي: ${esc(item.districtState)}</span>
                    <span>الثقة: ${esc(item.confidenceState)}</span>
                  </div>
                  <div class="actions">
                    <a class="button" href="${entityHref(item.recordId, { edit: true })}">فتح السجل</a>
                    <a class="button subtle" href="#/verification-program">مركز التحقق</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد verification drafts مقبولة بعد.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">الجاهزية والتسليم</div>
          <h3>جاهزية التحرير</h3>
          <div class="ops-followup-grid">
            <div class="triage-list-item"><strong>مسودة فقط</strong><span>${readinessCounts.new} مسودة</span></div>
            <div class="triage-list-item"><strong>جاهزة للمراجعة</strong><span>${readinessCounts.reviewReady} مسودة</span></div>
            <div class="triage-list-item"><strong>تحتاج إكمالًا</strong><span>${readinessCounts.completion} مسودة</span></div>
            <div class="triage-list-item"><strong>جاهزة للتصدير</strong><span>${readinessCounts.exportReady} مسودة</span></div>
            <div class="triage-list-item"><strong>تحتاج متابعة</strong><span>${readinessCounts.deferred} عنصر</span></div>
          </div>
          <div class="triage-list">
            <div class="triage-list-item"><strong>من أين جاءت المسودة؟</strong><span>تحرير يدوي، استيراد أولي، أو patch export محفوظ محليًا.</span></div>
            <div class="triage-list-item"><strong>ما التالي؟</strong><span>افتح السجل، أكمل النواقص، ثم صدّر patch أو حوّله إلى متابعة داخل المراجعة.</span></div>
            <div class="triage-list-item"><strong>التسليم التالي</strong><span>العناصر الجاهزة للتصدير هي الأقرب للمتابعة أو التطبيق لاحقًا.</span></div>
          </div>
          <div class="home-links">
            <a href="#/entities/__new__" class="home-link-card"><strong>إنشاء مسودة</strong><span>بدء سجل جديد من مركز التحكم مباشرة.</span></a>
            <a href="#/verification/source-review" class="home-link-card"><strong>التحقق من المصدر والحي</strong><span>الانتقال إلى طبقة التحقق المستقلة.</span></a>
            <a href="#/ops-hub" class="home-link-card"><strong>الرجوع للمراجعة</strong><span>الانتقال إلى دورة المراجعة والتنفيذ والمتابعة.</span></a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderAgentDraftsHub() {
  const agent = agentDraftSummary();
  const verificationDrafts = verificationDraftEntries();
  return `
    <div class="hero hero-compact page-hero operator-hero">
      <div class="section-kicker">مسودات مساعدة</div>
      <h3>مركز مسودات الوكلاء</h3>
      <p>طبقة آمنة تعرض اقتراحات الوكيل كمسودات فقط: قراءة وتحليل واقتراح ثم حفظ مسودة ومراجعة بشرية قبل أي تصدير لاحق.</p>
      <div class="hero-actions">
        <a href="#/dashboard" class="button">لوحة التشغيل</a>
        <a href="#/agent-ops" class="button primary">عمليات الوكلاء</a>
        <a href="#/editorial-hub" class="button gold">مركز التحرير</a>
        <a href="#/ops-hub" class="button">مركز المراجعة</a>
        <a href="#/verification-program" class="button">مركز التحقق والمهام</a>
      </div>
    </div>
    <div class="editorial-shell section">
      <div class="editorial-kpis">
        <div class="card mini-panel emphasis-panel"><div class="metric">${agent.items.length}</div><div class="metric-sub">كل الاقتراحات</div></div>
        <div class="card mini-panel"><div class="metric">${agent.completion.length}</div><div class="metric-sub">استكمال السجل</div></div>
        <div class="card mini-panel"><div class="metric">${agent.verification.length}</div><div class="metric-sub">دعم التحقق</div></div>
        <div class="card mini-panel"><div class="metric">${agent.new.length}</div><div class="metric-sub">جديد</div></div>
        <div class="card mini-panel"><div class="metric">${agent.inReview.length}</div><div class="metric-sub">قيد المراجعة</div></div>
        <div class="card mini-panel"><div class="metric">${agent.accepted.length}</div><div class="metric-sub">مقبول</div></div>
        <div class="card mini-panel"><div class="metric">${agent.rejected.length + agent.deferred.length}</div><div class="metric-sub">مؤجل / مرفوض</div></div>
      </div>
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-kicker">طبقة مراجعة مسودات الوكيل</div>
            <h3>اقتراحات الوكلاء</h3>
          </div>
          <div class="results-count">${agent.items.length} اقتراح</div>
        </div>
        ${agent.items.length ? `
          <div class="verification-list">
            ${agent.items.map(item => `
              <article class="verification-item">
                <div class="verification-item-top">
                  <div>
                    <strong>${esc(item.recordName)}</strong>
                    <span>${esc(agentAllowedFieldLabel(item.targetField))} • ${esc(item.agentName)} • ${esc(item.runtimeSource || item.agentVersion || agentProposalTypeLabel(item.proposalType))}</span>
                  </div>
                  <div class="queue-badges">
                    <span class="pill ${agentProposalStatusTone(item.status)}">${esc(agentProposalStatusLabel(item.status))}</span>
                    <span class="pill muted">ثقة ${esc(agentConfidenceLabel(item.confidence))}</span>
                  </div>
                </div>
                <div class="queue-meta">
                  <span>الحالي: ${esc(displayText(item.currentValue, 'فارغ'))}</span>
                  <span>المقترح: ${esc(displayText(item.suggestedValue, '—'))}</span>
                </div>
                <div class="queue-meta">
                  <span>لماذا؟ ${esc(item.reason)}</span>
                  <span>الأساس: ${esc(item.evidence || 'استدلال من بيانات السجل الحالية')}</span>
                </div>
                <div class="verification-decision-strip">
                  <span class="pill queue">مسودة فقط</span>
                  <span>handoff: ${esc(agentProposalHandoffLabel(item.handoffTarget))}</span>
                  <span>${esc(item.sessionContext || 'read → analyze → propose')}</span>
                </div>
                <div class="verification-decision-actions">
                  <button class="button" type="button" data-action="agent-proposal-status" data-proposal-id="${esc(item.id)}" data-status="in_review">بدء مراجعة</button>
                  <button class="button queue" type="button" data-action="agent-proposal-accept" data-proposal-id="${esc(item.id)}">${esc(item.handoffTarget === 'verification_draft' ? 'قبول إلى draft التحقق' : 'قبول إلى draft التحرير')}</button>
                  <button class="button subtle" type="button" data-action="agent-proposal-status" data-proposal-id="${esc(item.id)}" data-status="deferred">تأجيل</button>
                  <button class="button subtle" type="button" data-action="agent-proposal-status" data-proposal-id="${esc(item.id)}" data-status="rejected">رفض</button>
                </div>
                <div class="actions">
                  <a class="button" href="${entityHref(item.recordId, { edit: true })}">فتح السجل</a>
                  <a class="button subtle" href="${item.handoffTarget === 'verification_draft' ? '#/verification-program' : '#/editorial-hub'}">${item.handoffTarget === 'verification_draft' ? 'التحقق' : 'التحرير'}</a>
                </div>
              </article>
            `).join('')}
          </div>
        ` : '<div class="empty">لا توجد اقتراحات من الوكيل بعد. شغّل الوكيل من صفحة سجل لمعالجة النواقص.</div>'}
      </div>
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-kicker">Verification draft handoff</div>
            <h3>المقبول إلى طبقة التحقق</h3>
          </div>
          <div class="results-count">${verificationDrafts.length} draft</div>
        </div>
        ${verificationDrafts.length ? `
          <div class="verification-list">
            ${verificationDrafts.map(item => `
              <article class="verification-item">
                <div class="verification-item-top">
                  <div>
                    <strong>${esc(item.recordName)}</strong>
                    <span>${esc(item.targetLabel)} • ${esc(item.agentName)}</span>
                  </div>
                  <div class="queue-badges">
                    <span class="pill queue">draft التحقق</span>
                    <span class="pill muted">ثقة ${esc(agentConfidenceLabel(item.confidence))}</span>
                  </div>
                </div>
                <div class="queue-meta">
                  <span>${esc(item.suggestedValue)}</span>
                  <span>${esc(item.sourceState)} • ${esc(item.districtState)} • ${esc(item.confidenceState)}</span>
                </div>
                <div class="actions">
                  <a class="button" href="${entityHref(item.recordId, { edit: true })}">فتح السجل</a>
                  <a class="button subtle" href="#/verification-program">مركز التحقق</a>
                </div>
              </article>
            `).join('')}
          </div>
        ` : '<div class="empty">لا توجد verification drafts مقبولة بعد.</div>'}
      </div>
    </div>
  `;
}

function renderAgentOpsConsole(selectedRunId = '') {
  const agents = agentDefinitions();
  const history = agentRunHistoryEntries();
  const scopeSets = derivedAgentScopes();
  const savedBatches = savedAgentBatchEntries();
  const runtime = state.agentRuntime || { available: false, mode: 'unknown', label: 'غير معروف', note: 'لم يتم فحص حالة runtime بعد.' };
  const selectedRun = history.find(item => item.id === selectedRunId) || history[0] || null;
  const totalEligible = agents.reduce((acc, item) => acc + item.eligibleRecords().length, 0);
  const totalGenerated = history.reduce((acc, item) => acc + (item.summary?.proposals || 0), 0);
  return `
    <div class="hero hero-compact page-hero operator-hero">
      <div class="section-kicker">عمليات الوكلاء</div>
      <h3>Agent Ops Console</h3>
      <p>مركز تشغيل آمن للوكلاء يطلق دفعات كاملة، ويحفظ تاريخ التشغيل، ويعرض النتائج المجمعة للمراجعة من دون أي apply نهائي.</p>
      <div class="hero-actions">
        <a href="#/agent-ops" class="button primary">مركز عمليات الوكلاء</a>
        <a href="#/agent-drafts" class="button">مسودات الوكلاء</a>
        <a href="#/editorial-hub" class="button gold">مركز التحرير</a>
        <a href="#/verification-program" class="button">مركز التحقق والمهام</a>
        <a href="#/ops-hub" class="button">مركز المراجعة</a>
      </div>
    </div>
    <div class="verification-program-shell section">
      <div class="verification-program-kpis">
        <div class="card mini-panel emphasis-panel"><div class="metric">${agents.length}</div><div class="metric-sub">وكلاء متاحون</div></div>
        <div class="card mini-panel"><div class="metric">${totalEligible}</div><div class="metric-sub">سجلات مؤهلة الآن</div></div>
        <div class="card mini-panel"><div class="metric">${history.length}</div><div class="metric-sub">تشغيلات محفوظة</div></div>
        <div class="card mini-panel"><div class="metric">${totalGenerated}</div><div class="metric-sub">إجمالي proposals</div></div>
        <div class="card mini-panel"><div class="metric">${agentDraftSummary().items.length}</div><div class="metric-sub">Drafts جاهزة للمراجعة</div></div>
        <div class="card mini-panel"><div class="metric">${verificationDraftEntries().length}</div><div class="metric-sub">Verification drafts</div></div>
      </div>
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-kicker">Runtime integration</div>
            <h3>حالة الـ proxy والوكيل الخارجي</h3>
          </div>
          <span class="pill ${runtime.available ? 'success' : 'warning'}">${esc(runtime.label || runtime.mode || 'غير متاح')}</span>
        </div>
        <div class="triage-list">
          <div class="triage-list-item"><strong>المدخل الآمن</strong><span>واجهة الويب → backend/proxy → runtime agent → drafts/review layer</span></div>
          <div class="triage-list-item"><strong>الوضع الحالي</strong><span>${esc(runtime.note || 'لا توجد ملاحظة إضافية.')}</span></div>
          <div class="triage-list-item"><strong>الوكلاء runtime الفعليون</strong><span>Record Completion Agent v2 + Verification Support Agent v2</span></div>
          <div class="triage-list-item"><strong>آخر نداء</strong><span>${esc(runtime.diagnostics?.lastCall ? `${runtime.diagnostics.lastCall.scope} • ${runtime.diagnostics.lastCall.outcome}` : 'لا يوجد بعد')}</span></div>
          <div class="triage-list-item"><strong>fallback usage</strong><span>${runtime.diagnostics?.counts?.fallback || 0} مرة</span></div>
          <div class="triage-list-item"><strong>validation rejects</strong><span>${runtime.diagnostics?.counts?.validationRejected || 0} اقتراح مرفوض</span></div>
        </div>
      </div>
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-kicker">Runtime Audit Trail</div>
            <h3>سجل التشغيل والتشخيص</h3>
          </div>
          <div class="results-count">${runtime.diagnostics?.recentCalls?.length || 0} نداء</div>
        </div>
        ${runtime.diagnostics?.recentCalls?.length ? `
          <div class="editorial-list">
            ${runtime.diagnostics.recentCalls.map(item => `
              <article class="editorial-item">
                <div class="editorial-item-top">
                  <div>
                    <strong>${esc(item.agent)}</strong>
                    <span>${esc(item.scope)} • ${esc(item.startedAt)}</span>
                  </div>
                  <span class="pill ${item.outcome === 'success' ? 'success' : item.outcome === 'rejected' ? 'gold' : 'warning'}">${esc(item.outcome)}</span>
                </div>
                <p>${item.proposalCount} proposal • ${item.fallbackUsed ? 'fallback' : 'direct'} • ${item.runtimeSource}</p>
                <div class="ops-session-meta">
                  <span>validation rejected: ${item.validationRejected || 0}</span>
                  <span>${esc(item.error || 'بدون خطأ مسجل')}</span>
                </div>
              </article>
            `).join('')}
          </div>
        ` : '<div class="empty">لا يوجد audit trail runtime بعد.</div>'}
      </div>
      <div class="verification-grid">
        ${agents.map(agent => {
          const eligible = agent.eligibleRecords();
          const lastRun = agent.lastRun;
          return `
            <div class="card">
              <div class="section-kicker">وكيل متاح</div>
              <h3>${esc(agent.title)}</h3>
              <p>${esc(agent.description)}</p>
              <div class="ops-followup-grid">
                <div class="triage-list-item"><strong>يعالج</strong><span>${esc(agent.outputLabel)}</span></div>
                <div class="triage-list-item"><strong>مؤهل الآن</strong><span>${eligible.length} سجل</span></div>
                <div class="triage-list-item"><strong>آخر تشغيل</strong><span>${esc(lastRun?.startedAt || 'لم يُشغّل بعد')}</span></div>
              </div>
              <div class="triage-list">
                <div class="triage-list-item"><strong>آخر نتيجة</strong><span>${lastRun ? `${agentRunStatusLabel(lastRun.status)} • ${lastRun.summary.generated} سجلات ولّدت proposals • ${lastRun.summary.noEligible} بلا أهلية` : 'لا توجد نتائج محفوظة بعد.'}</span></div>
                <div class="triage-list-item"><strong>runtime behavior</strong><span>${lastRun ? `${lastRun.summary.runtimeDirect || 0} direct • ${lastRun.summary.fallbackUsed || 0} fallback • ${lastRun.summary.validationRejected || 0} rejected` : 'سيظهر بعد أول تشغيل.'}</span></div>
                <div class="triage-list-item"><strong>سلامة التشغيل</strong><span>draft only • human review required • no direct apply</span></div>
              </div>
              <div class="actions">
                <button class="button ${agent.key === 'completion' ? 'gold' : 'queue'}" type="button" data-action="agent-batch-run" data-agent-key="${esc(agent.key)}">تشغيل batch</button>
                <a class="button subtle" href="#/agent-drafts">مراجعة النتائج</a>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Queue-aware runs</div>
              <h3>تشغيلات مبنية على صفوف العمل</h3>
            </div>
          </div>
          <div class="editorial-list">
            ${scopeSets.queueScopes.concat(scopeSets.verificationScopes).map(scope => `
              <article class="editorial-item">
                <div class="editorial-item-top">
                  <div>
                    <strong>${esc(scope.label)}</strong>
                    <span>${esc(agentScopeKindLabel(scope.kind))} • ${scope.count} سجل</span>
                  </div>
                  <span class="pill ${scope.recommendedAgent === 'verification' ? 'queue' : 'gold'}">${esc(agentDefinitionByKey(scope.recommendedAgent).title)}</span>
                </div>
                <p>${esc(scope.note)}</p>
                <div class="actions">
                  <button class="button ${scope.recommendedAgent === 'verification' ? 'queue' : 'gold'}" type="button" data-action="agent-scope-run" data-agent-key="${esc(scope.recommendedAgent)}" data-scope-kind="${esc(scope.kind)}" data-scope-key="${esc(scope.key)}" data-scope-label="${esc(scope.label)}">تشغيل على هذا الصف</button>
                  <button class="button subtle" type="button" data-action="agent-scope-save" data-agent-key="${esc(scope.recommendedAgent)}" data-scope-kind="${esc(scope.kind)}" data-scope-key="${esc(scope.key)}" data-scope-label="${esc(scope.label)}">حفظ كدفعة</button>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Scoped Batch Builder</div>
              <h3>النطاقات الذكية للتشغيل</h3>
            </div>
          </div>
          <div class="editorial-list">
            ${[...scopeSets.readinessScopes, ...scopeSets.districtScopes, ...scopeSets.sectorScopes, ...scopeSets.statusScopes].map(scope => `
              <article class="editorial-item">
                <div class="editorial-item-top">
                  <div>
                    <strong>${esc(scope.label)}</strong>
                    <span>${esc(agentScopeKindLabel(scope.kind))} • ${scope.count} سجل</span>
                  </div>
                  <span class="pill ${scope.recommendedAgent === 'verification' ? 'queue' : 'gold'}">${esc(agentDefinitionByKey(scope.recommendedAgent).title)}</span>
                </div>
                <p>${esc(scope.note)}</p>
                <div class="actions">
                  <button class="button ${scope.recommendedAgent === 'verification' ? 'queue' : 'gold'}" type="button" data-action="agent-scope-run" data-agent-key="${esc(scope.recommendedAgent)}" data-scope-kind="${esc(scope.kind)}" data-scope-key="${esc(scope.key)}" data-scope-label="${esc(scope.label)}">تشغيل scoped batch</button>
                  <button class="button subtle" type="button" data-action="agent-scope-save" data-agent-key="${esc(scope.recommendedAgent)}" data-scope-kind="${esc(scope.kind)}" data-scope-key="${esc(scope.key)}" data-scope-label="${esc(scope.label)}">حفظ النطاق</button>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Saved Agent Batches</div>
              <h3>الدفعات المحفوظة</h3>
            </div>
            <div class="results-count">${savedBatches.length} دفعة</div>
          </div>
          ${savedBatches.length ? `
            <div class="editorial-list">
              ${savedBatches.map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.title)}</strong>
                      <span>${esc(agentScopeKindLabel(item.scope.kind))} • ${esc(item.scope.label)}</span>
                    </div>
                    <span class="pill ${item.agentKey === 'verification' ? 'queue' : 'gold'}">${esc(agentDefinitionByKey(item.agentKey).title)}</span>
                  </div>
                  <p>عدد السجلات الحالي داخل هذا النطاق: ${recordsForAgentScope(item.scope).length}</p>
                  <div class="actions">
                    <button class="button ${item.agentKey === 'verification' ? 'queue' : 'gold'}" type="button" data-action="saved-agent-batch-run" data-batch-id="${esc(item.id)}">إعادة التشغيل</button>
                    <a class="button subtle" href="#/agent-ops">عمليات الوكلاء</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد دفعات محفوظة بعد. احفظ أي queue أو نطاق من البطاقات أعلاه.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">Queue-to-Agent Mapping</div>
          <h3>أي وكيل يناسب أي نقص؟</h3>
          <div class="triage-list">
            ${scopeSets.queueScopes.concat(scopeSets.verificationScopes).slice(0, 10).map(scope => `
              <div class="triage-list-item">
                <strong>${esc(scope.label)}</strong>
                <span>${esc(agentDefinitionByKey(scope.recommendedAgent).title)} • ${scope.count} سجل • ${esc(scope.note)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      ${state.agentBatchState ? `
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Batch context</div>
              <h3>التشغيل الحالي</h3>
            </div>
            <span class="pill ${agentRunStatusTone(state.agentBatchState.status)}">${esc(agentRunStatusLabel(state.agentBatchState.status))}</span>
          </div>
          <div class="triage-list">
            <div class="triage-list-item"><strong>الوكيل</strong><span>${esc(state.agentBatchState.title || '')}</span></div>
            <div class="triage-list-item"><strong>النطاق</strong><span>${esc(state.agentBatchState.scopeLabel || '')}</span></div>
            <div class="triage-list-item"><strong>التقدم</strong><span>${state.agentBatchState.summary ? `${state.agentBatchState.summary.generated}/${state.agentBatchState.summary.total} مع proposals` : 'جارٍ التشغيل...'}</span></div>
            <div class="triage-list-item"><strong>handoff</strong><span>${state.agentBatchState.summary ? `${state.agentBatchState.summary.editorialHandoff} إلى التحرير • ${state.agentBatchState.summary.verificationHandoff} إلى التحقق` : 'بانتظار النتائج...'}</span></div>
            <div class="triage-list-item"><strong>runtime</strong><span>${state.agentBatchState.summary ? `${state.agentBatchState.summary.runtimeDirect || 0} direct • ${state.agentBatchState.summary.fallbackUsed || 0} fallback • ${state.agentBatchState.summary.localOnly || 0} local-only` : 'بانتظار النتائج...'}</span></div>
          </div>
        </div>
      ` : ''}
      <div class="verification-grid">
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Batch Results Review</div>
              <h3>مراجعة نتائج الدفعة</h3>
            </div>
            <div class="results-count">${selectedRun ? selectedRun.summary.total : 0} سجل</div>
          </div>
          ${selectedRun ? `
            <div class="ops-followup-grid">
              <div class="triage-list-item"><strong>proposals generated</strong><span>${selectedRun.summary.generated} سجل</span></div>
              <div class="triage-list-item"><strong>no eligible</strong><span>${selectedRun.summary.noEligible} سجل</span></div>
              <div class="triage-list-item"><strong>failed</strong><span>${selectedRun.summary.failed} سجل</span></div>
              <div class="triage-list-item"><strong>runtime direct</strong><span>${selectedRun.summary.runtimeDirect || 0} سجل</span></div>
              <div class="triage-list-item"><strong>fallback used</strong><span>${selectedRun.summary.fallbackUsed || 0} سجل</span></div>
              <div class="triage-list-item"><strong>validation rejected</strong><span>${selectedRun.summary.validationRejected || 0} اقتراح</span></div>
              <div class="triage-list-item"><strong>runtime failed</strong><span>${selectedRun.summary.runtimeFailed || 0} سجل</span></div>
              <div class="triage-list-item"><strong>needs manual review</strong><span>${selectedRun.summary.manualReview} سجل</span></div>
              <div class="triage-list-item"><strong>handoff للتحرير</strong><span>${selectedRun.summary.editorialHandoff} proposal</span></div>
              <div class="triage-list-item"><strong>handoff للتحقق</strong><span>${selectedRun.summary.verificationHandoff} proposal</span></div>
            </div>
            <div class="verification-list">
              ${selectedRun.results.slice(0, 16).map(item => `
                <article class="verification-item">
                  <div class="verification-item-top">
                    <div>
                      <strong>${esc(item.name)}</strong>
                      <span>${esc(item.slug)} • ${esc(selectedRun.title)}</span>
                    </div>
                    <div class="queue-badges">
                      <span class="pill ${agentRunStatusTone(item.status === 'success' ? 'completed' : item.status === 'empty' ? 'queued' : 'failed')}">${esc(item.status === 'success' ? 'ولّد proposals' : item.status === 'empty' ? 'غير مؤهل' : 'فشل')}</span>
                      <span class="pill muted">${item.proposalCount} proposal</span>
                      <span class="pill muted">${esc(item.runtimeSource || 'unknown')}</span>
                    </div>
                  </div>
                  <p>${esc(item.message)}</p>
                  <div class="queue-meta">
                    <span>${item.fallbackUsed ? 'استُخدم fallback' : item.runtimeBacked ? 'runtime-backed' : 'local-only'}</span>
                    <span>validation rejected: ${item.validationRejected || 0}</span>
                  </div>
                  ${item.providerError ? `<div class="queue-meta"><span>runtime issue: ${esc(item.providerError)}</span></div>` : ''}
                  <div class="actions">
                    <a class="button" href="${entityHref(item.slug, { edit: true })}">فتح السجل</a>
                    <a class="button subtle" href="#/agent-drafts">مراجعة draft</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد تشغيلات batch محفوظة بعد.</div>'}
        </div>
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Agent Run History</div>
              <h3>سجل تشغيلات الوكلاء</h3>
            </div>
            <div class="results-count">${history.length} تشغيل</div>
          </div>
          ${history.length ? `
            <div class="editorial-list">
              ${history.map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.title)}</strong>
                      <span>${esc(item.scopeLabel)} • ${esc(item.startedAt)}</span>
                    </div>
                    <span class="pill ${agentRunStatusTone(item.status)}">${esc(agentRunStatusLabel(item.status))}</span>
                  </div>
                  <p>${item.summary.generated} سجلات أنتجت proposals • ${item.summary.noEligible} غير مؤهلة • ${item.summary.failed} فشل • ${item.summary.proposals} proposal</p>
                  <div class="actions">
                    <a class="button" href="#/agent-ops?run=${encodeURIComponent(item.id)}">فتح النتائج</a>
                    <a class="button subtle" href="#/agent-drafts">مسودات الوكلاء</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا يوجد سجل تشغيل batch بعد.</div>'}
        </div>
      </div>
    </div>
  `;
}

function renderVerificationWorkspace(queueKey = 'source-review') {
  const queueMap = verificationQueues();
  const activeKey = queueMap[queueKey] ? queueKey : 'source-review';
  const active = queueMap[activeKey];
  const items = active.records();
  const session = startOrOpenVerificationSession({
    scopeType: 'queue',
    scopeKey: activeKey,
    queueKey: activeKey,
    title: active.title,
    recordSlugs: items.map(item => item.slug),
    persist: false,
  });
  const sessionSummary = verificationSessionSummary(session);
  const sourceStats = {
    verified: state.records.filter(r => sourceVerificationState(r).key === 'verified').length,
    review: state.records.filter(r => sourceVerificationState(r).key === 'review').length,
    weak: state.records.filter(r => sourceVerificationState(r).key === 'weak').length,
    missing: state.records.filter(r => sourceVerificationState(r).key === 'missing').length,
    conflicting: state.records.filter(r => sourceVerificationState(r).key === 'conflicting').length,
  };
  const districtStats = {
    verified: state.records.filter(r => districtVerificationState(r).key === 'verified').length,
    review: state.records.filter(r => districtVerificationState(r).key === 'needs-review').length,
    unresolved: state.records.filter(r => districtVerificationState(r).key === 'unresolved').length,
    weak: state.records.filter(r => districtVerificationState(r).key === 'weak').length,
  };
  const confidenceStats = {
    stable: state.records.filter(r => confidenceVerificationState(r).key === 'stable').length,
    review: state.records.filter(r => confidenceVerificationState(r).key === 'review').length,
    escalate: state.records.filter(r => confidenceVerificationState(r).key === 'escalate').length,
    blocked: state.records.filter(r => confidenceVerificationState(r).key === 'blocked').length,
  };

  return `
    <div class="hero hero-compact page-hero operator-hero">
      <div class="section-kicker">طبقة التحقق</div>
      <h3>نظام التحقق</h3>
      <p>مسار مستقل لإدارة تحقق المصدر والحي والثقة، وربطه مباشرة بالمراجعة والتحرير والتنفيذ.</p>
      <div class="hero-actions">
        <a href="#/dashboard" class="button">لوحة التشغيل</a>
        <a href="#/ops-hub" class="button">مركز المراجعة</a>
        <a href="#/editorial-hub" class="button gold">مركز التحرير</a>
        <a href="#/verification-program" class="button primary">مركز عمليات التحقق والمهام</a>
        <a href="#/release-readiness" class="button">مركز الجاهزية</a>
      </div>
    </div>
    <div class="verification-shell section">
      <div class="verification-switcher">
        ${Object.entries(queueMap).map(([key, queue]) => `
          <a href="#/verification/${key}" class="queue-tab ${key === activeKey ? 'is-active' : ''}">
            <strong>${queue.title}</strong>
            <span>${queue.records().length} سجل</span>
          </a>
        `).join('')}
      </div>
      <div class="verification-kpis">
        <div class="card mini-panel emphasis-panel"><div class="metric">${sourceStats.verified}</div><div class="metric-sub">مصدر موثق</div></div>
        <div class="card mini-panel"><div class="metric">${sourceStats.missing + sourceStats.weak}</div><div class="metric-sub">مشكلة مصدر</div></div>
        <div class="card mini-panel"><div class="metric">${districtStats.unresolved + districtStats.weak}</div><div class="metric-sub">مشكلة حي</div></div>
        <div class="card mini-panel"><div class="metric">${confidenceStats.escalate + confidenceStats.blocked}</div><div class="metric-sub">ثقة منخفضة</div></div>
        <div class="card mini-panel"><div class="metric">${sourceStats.conflicting}</div><div class="metric-sub">أدلة متعارضة</div></div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">ملخص التحقق</div>
          <h3>جاهزية القرار التالي</h3>
          <div class="ops-followup-grid">
            <div class="triage-list-item"><strong>المصدر</strong><span>موثق ${sourceStats.verified} • مراجعة ${sourceStats.review} • ناقص ${sourceStats.missing}</span></div>
            <div class="triage-list-item"><strong>الحي</strong><span>موثق ${districtStats.verified} • مراجعة ${districtStats.review} • غير محسوم ${districtStats.unresolved}</span></div>
            <div class="triage-list-item"><strong>الثقة</strong><span>مستقرة ${confidenceStats.stable} • قابلة للرفع ${confidenceStats.review} • منخفضة ${confidenceStats.escalate + confidenceStats.blocked}</span></div>
          </div>
          <div class="triage-list">
            <div class="triage-list-item"><strong>أين تبدأ المشكلة؟</strong><span>ابدأ بالمصدر إذا كان ناقصًا، وبالحي إذا كان غير محسوم، ثم ارفع الثقة بعد تثبيت أحدهما أو كليهما.</span></div>
            <div class="triage-list-item"><strong>أين تنتهي؟</strong><span>تنتهي عندما يصبح المصدر موثقًا، والحي محسومًا، وتصبح الثقة قابلة للاعتماد.</span></div>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">الجلسة الحالية</div>
          <h3>${active.title}</h3>
          <p class="note">${active.note}</p>
          <div class="triage-list">
            <div class="triage-list-item"><strong>حالة الجلسة</strong><span>${verificationSessionStatusLabel(session.status)} • ${sessionSummary.progressLabel}</span></div>
            <div class="triage-list-item"><strong>القرارات المسجلة</strong><span>${sessionSummary.touched} سجلًا لُمست • ${sessionSummary.deeper} تحتاج تصعيدًا • ${sessionSummary.followup} جاهزة للتسليم</span></div>
            <div class="triage-list-item"><strong>المخرج المتوقع</strong><span>تحويل كل محاولة تحقق هنا إلى قرار موثق مع سبب وخطوة تالية واضحة.</span></div>
          </div>
          <div class="actions">
            <button class="button primary" type="button" data-action="verification-session-start" data-session-type="queue" data-session-scope="${esc(activeKey)}" data-session-title="${esc(active.title)}">تحديث الجلسة</button>
            <a class="button" href="#/verification-program">مركز العمليات</a>
            <a class="button" href="#/ops-hub">مركز المراجعة</a>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-kicker">صف التحقق</div>
            <h3>${active.title}</h3>
          </div>
          <div class="results-count">${items.length} سجل</div>
        </div>
        <div class="verification-queue-toolbar">
          <label class="edit-field verification-note-field">
            <span>ملاحظة القرار</span>
            <textarea id="verificationDecisionNote" class="field" placeholder="اكتب لماذا تتخذ هذا القرار، وما الذي منعه أو حسمه، وما الخطوة التالية."></textarea>
          </label>
          <div class="verification-action-hint">
            <strong>التدفق التشغيلي</strong>
            <span>إسناد → مراجعة → تحقق أو تصعيد → تسليم أو إغلاق.</span>
          </div>
        </div>
        ${items.length ? `
          <div class="verification-list">
            ${items.map(item => {
              const source = sourceVerificationState(item);
              const district = districtVerificationState(item);
              const confidence = confidenceVerificationState(item);
              const latestDecision = verificationDecisionEntries().find(entry => entry.slug === item.slug && entry.sessionId === session.id) || latestVerificationDecisionForSlug(item.slug);
              return `
                <article class="verification-item">
                  <div class="verification-item-top">
                    <div>
                      <strong>${esc(item.name)}</strong>
                      <span>${esc(active.reason(item))}</span>
                    </div>
                    <div class="queue-badges">
                      <span class="pill ${editorialStatusTone(source.key === 'verified' ? 'export-ready' : source.key === 'conflicting' ? 'follow-up-needed' : 'review-ready')}">المصدر: ${esc(source.label)}</span>
                      <span class="pill ${editorialStatusTone(district.key === 'verified' ? 'export-ready' : district.key === 'unresolved' ? 'needs-completion' : 'review-ready')}">الحي: ${esc(district.label)}</span>
                      <span class="pill ${editorialStatusTone(confidence.key === 'stable' ? 'export-ready' : confidence.key === 'blocked' ? 'follow-up-needed' : 'review-ready')}">الثقة: ${esc(confidence.label)}</span>
                    </div>
                  </div>
                  <div class="queue-meta">
                    <span>${esc(source.reason)}</span>
                    <span>${esc(district.reason)}</span>
                    <span>${esc(confidence.reason)}</span>
                  </div>
                  <div class="queue-meta">
                    <span>التالي: ${esc(source.next)}</span>
                    <span>التالي: ${esc(district.next)}</span>
                    <span>التالي: ${esc(confidence.next)}</span>
                  </div>
                  ${latestDecision ? `
                    <div class="verification-decision-strip">
                      <span class="pill ${verificationDecisionTone(latestDecision.decision)}">${esc(latestDecision.decisionLabel)}</span>
                      <span class="pill ${verificationResolutionTone(latestDecision.resolution)}">${esc(verificationResolutionLabel(latestDecision.resolution))}</span>
                      <span>${esc(latestDecision.reason || latestDecision.blockedBy || 'لا توجد ملاحظة إضافية.')}</span>
                    </div>
                  ` : `
                    <div class="verification-decision-strip">
                      <span class="pill muted">لا يوجد قرار موثق بعد</span>
                      <span>ابدأ بإسناد السجل أو مراجعته لتنتقل المحاولة من evidence إلى قرار تشغيلي.</span>
                    </div>
                  `}
                  <div class="verification-decision-actions">
                    <button class="button subtle" type="button" data-action="verification-decision" data-session-type="queue" data-session-scope="${esc(activeKey)}" data-queue="${esc(activeKey)}" data-slug="${esc(item.slug)}" data-decision="assign" data-note-id="verificationDecisionNote">إسناد</button>
                    <button class="button" type="button" data-action="verification-decision" data-session-type="queue" data-session-scope="${esc(activeKey)}" data-queue="${esc(activeKey)}" data-slug="${esc(item.slug)}" data-decision="review" data-note-id="verificationDecisionNote">مراجعة</button>
                    <button class="button queue" type="button" data-action="verification-decision" data-session-type="queue" data-session-scope="${esc(activeKey)}" data-queue="${esc(activeKey)}" data-slug="${esc(item.slug)}" data-decision="verify" data-note-id="verificationDecisionNote">تحقق</button>
                    <button class="button gold" type="button" data-action="verification-decision" data-session-type="queue" data-session-scope="${esc(activeKey)}" data-queue="${esc(activeKey)}" data-slug="${esc(item.slug)}" data-decision="handoff" data-note-id="verificationDecisionNote">تسليم</button>
                    <button class="button subtle" type="button" data-action="verification-decision" data-session-type="queue" data-session-scope="${esc(activeKey)}" data-queue="${esc(activeKey)}" data-slug="${esc(item.slug)}" data-decision="escalate" data-note-id="verificationDecisionNote">تصعيد</button>
                    <button class="button subtle" type="button" data-action="verification-decision" data-session-type="queue" data-session-scope="${esc(activeKey)}" data-queue="${esc(activeKey)}" data-slug="${esc(item.slug)}" data-decision="close" data-note-id="verificationDecisionNote">إغلاق</button>
                  </div>
                  <div class="actions">
                    <a class="button" href="${entityHref(item.slug, { edit: true })}">فتح السجل</a>
                    <a class="button subtle" href="#/editorial-hub">التحرير</a>
                    <a class="button subtle" href="#/ops-hub">المراجعة</a>
                  </div>
                </article>
              `;
            }).join('')}
          </div>
        ` : '<div class="empty">لا توجد سجلات داخل هذا الصف التحققي الآن.</div>'}
      </div>
    </div>
  `;
}

function renderVerificationProgramHub() {
  const control = verificationControlSnapshot();
  const evidence = evidenceEntries();
  const followup = verificationFollowupBuckets();
  const coverage = coverageExpansionPlanner();
  const missions = missionPlan();
  const execution = missionExecutionSnapshot();
  const agent = agentDraftSummary();
  const verificationDrafts = verificationDraftEntries();
  return `
    <div class="hero hero-compact page-hero operator-hero">
      <div class="section-kicker">مركز عمليات التحقق والمهام</div>
      <h3>نظام تنفيذ التحقق والمصادر والتغطية</h3>
      <p>طبقة موحدة تنقل القرار من جلسات التحقق إلى مهام متابعة وتنفيذ وتوسع قابلة للإدارة داخل نفس النظام.</p>
      <div class="hero-actions">
        <a href="#/verification/source-review" class="button primary">صفوف التحقق</a>
        <a href="#/agent-ops" class="button">عمليات الوكلاء</a>
        <a href="#/ops-hub" class="button">مركز المراجعة</a>
        <a href="#/editorial-hub" class="button gold">مركز التحرير</a>
        <a href="#/agent-drafts" class="button">مسودات الوكلاء</a>
        <a href="#/release-readiness" class="button">مركز الجاهزية</a>
      </div>
    </div>
    <div class="verification-program-shell section">
      <div class="verification-program-kpis">
        <div class="card mini-panel emphasis-panel"><div class="metric">${missions.byStatus.open.length + missions.byStatus.in_progress.length}</div><div class="metric-sub">مهام مفتوحة</div></div>
        <div class="card mini-panel"><div class="metric">${execution.active.length}</div><div class="metric-sub">جلسات تنفيذ جارية</div></div>
        <div class="card mini-panel"><div class="metric">${execution.blocked.length}</div><div class="metric-sub">جلسات متوقفة</div></div>
        <div class="card mini-panel"><div class="metric">${execution.handoff.length + missions.byStatus.handoff.length}</div><div class="metric-sub">تحتاج تسليمًا</div></div>
        <div class="card mini-panel"><div class="metric">${execution.completed.length + missions.byStatus.ready_to_close.length}</div><div class="metric-sub">جاهزة للإغلاق</div></div>
        <div class="card mini-panel"><div class="metric">${coverage.weakDistricts.length}</div><div class="metric-sub">أحياء أولوية للتوسع</div></div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">مركز المهمات</div>
          <h3>لوحة قيادة المهمات</h3>
          <div class="ops-followup-grid">
            <div class="triage-list-item"><strong>جمع المصادر</strong><span>${missions.byLane.source.length} مهمة</span></div>
            <div class="triage-list-item"><strong>مهام التحقق</strong><span>${missions.byLane.verification.length} مهمة</span></div>
            <div class="triage-list-item"><strong>مهام التغطية</strong><span>${missions.byLane.coverage.length} مهمة</span></div>
          </div>
          <div class="triage-list">
            <div class="triage-list-item"><strong>لماذا فُتحت؟</strong><span>كل مهمة هنا خرجت مباشرة من حالات المصدر أو قرارات التحقق أو فجوات التغطية.</span></div>
            <div class="triage-list-item"><strong>ما الذي يغلقها؟</strong><span>إما قرار تحقق نهائي، أو handoff واضح، أو انخفاض الفجوة التي فتحت المهمة أصلًا.</span></div>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">الحالة التشغيلية</div>
          <h3>ما الذي يحتاجك الآن؟</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>مفتوحة</strong><span>${missions.byStatus.open.length} مهمة بانتظار البدء</span></div>
            <div class="triage-list-item"><strong>قيد التنفيذ</strong><span>${execution.active.length} جلسة نشطة</span></div>
            <div class="triage-list-item"><strong>متوقفة</strong><span>${execution.blocked.length} جلسة تحتاج تدخلًا أو تصعيدًا</span></div>
            <div class="triage-list-item"><strong>جاهزة للتسليم أو الإغلاق</strong><span>${execution.handoff.length + execution.completed.length} جلسة</span></div>
          </div>
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">Verification Support Agent</div>
          <h3>مسودات دعم التحقق</h3>
          <div class="ops-followup-grid">
            <div class="triage-list-item"><strong>اقتراحات التحقق</strong><span>${agent.verification.length} اقتراح</span></div>
            <div class="triage-list-item"><strong>قيد المراجعة</strong><span>${agent.verification.filter(item => item.status === 'in_review').length} اقتراح</span></div>
            <div class="triage-list-item"><strong>مقبول إلى draft</strong><span>${verificationDrafts.length} draft</span></div>
          </div>
          <div class="triage-list">
            <div class="triage-list-item"><strong>وظيفته الآن</strong><span>تلخيص rationale، ترشيح مصدر، اقتراح فرضية تعارض، وتوضيح الخطوة التالية من دون أي قرار نهائي.</span></div>
            <div class="triage-list-item"><strong>الحالة</strong><span>كل المخرجات تبقى draft only حتى تراجعها وتسلّمها يدويًا داخل مسار التحقق.</span></div>
          </div>
          <div class="actions">
            <a class="button" href="#/agent-drafts">مراجعة الاقتراحات</a>
            <a class="button subtle" href="#/editorial-hub">مركز التحرير</a>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">handoff</div>
          <h3>ما الذي وصل إلى draft التحقق؟</h3>
          ${verificationDrafts.length ? `
            <div class="triage-list">
              ${verificationDrafts.slice(0, 5).map(item => `<div class="triage-list-item"><strong>${esc(item.recordName)}</strong><span>${esc(item.targetLabel)} • ${esc(displayText(item.suggestedValue, '—'))}</span></div>`).join('')}
            </div>
          ` : '<div class="empty">لا توجد verification drafts مقبولة بعد.</div>'}
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">Execution Control Center</div>
          <h3>الجلسات التنفيذية المفتوحة</h3>
          ${execution.sessions.length ? `
            <div class="editorial-list">
              ${execution.sessions.slice(0, 8).map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.mission?.title || item.missionTitle)}</strong>
                      <span>${esc(missionSessionStatusLabel(item.status))} • ${item.summary.touched}/${item.summary.total}</span>
                    </div>
                    <span class="pill ${missionSessionStatusTone(item.status)}">${esc(missionSessionStatusLabel(item.status))}</span>
                  </div>
                  <p>بدأت ${esc(item.startedAt || '—')} • ${item.summary.updated} نتائج مفيدة • ${item.summary.unresolved} غير محسوم • ${item.summary.followup} متابعة.</p>
                  <div class="actions">
                    <button class="button" type="button" data-action="mission-session-start" data-mission-id="${esc(item.missionId)}">استكمال الجلسة</button>
                    <button class="button subtle" type="button" data-action="mission-session-export" data-mission-id="${esc(item.missionId)}" data-format="summary">ملخص</button>
                    <a class="button subtle" href="${item.mission?.scopeKind === 'record' ? entityHref(item.mission.scopeKey, { edit: true }) : '#/verification-program'}">فتح النطاق</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد جلسات تنفيذ مفتوحة بعد. ابدأ جلسة من أي مهمة أدناه.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">نتائج التنفيذ</div>
          <h3>ماذا خرج من الجلسات؟</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>محدّثات مفهومية</strong><span>${execution.sessions.reduce((acc, item) => acc + item.summary.updated, 0)} محاولة نجحت أو كانت جزئية</span></div>
            <div class="triage-list-item"><strong>عناصر غير محسومة</strong><span>${execution.sessions.reduce((acc, item) => acc + item.summary.unresolved, 0)} عنصر</span></div>
            <div class="triage-list-item"><strong>Follow-up</strong><span>${execution.sessions.reduce((acc, item) => acc + item.summary.followup, 0)} عنصر</span></div>
            <div class="triage-list-item"><strong>التوصيات التالية</strong><span>${uniq(execution.sessions.flatMap(item => item.summary.recommendations)).slice(0, 3).join(' • ') || 'لا توجد توصيات مسجلة بعد.'}</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-kicker">المهمات التنفيذية</div>
            <h3>دفعات المصدر والتحقق والتغطية</h3>
          </div>
          <div class="results-count">${missions.missions.length} مهمة</div>
        </div>
        <div class="verification-list">
          ${missions.missions.map(item => {
            const session = missionSessionForMission(item.id);
            const summary = session ? missionSessionSummary(session) : null;
            const primarySlug = item.recordSlugs[0] || '';
            return `
            <article class="verification-item">
              <div class="verification-item-top">
                <div>
                  <strong>${esc(item.title)}</strong>
                  <span>${esc(missionTypeLabel(item.type))} • ${esc(missionScopeTitle(item.scopeKind, item.scopeKey))} • ${item.recordSlugs.length} سجل</span>
                </div>
                <div class="queue-badges">
                  <span class="pill ${missionPriorityTone(item.priority)}">أولوية: ${esc(missionPriorityLabel(item.priority))}</span>
                  <span class="pill ${missionStatusTone(item.status)}">الحالة: ${esc(missionStatusLabel(item.status))}</span>
                </div>
              </div>
              <div class="queue-meta">
                <span>لماذا فُتحت: ${esc(item.whyOpened)}</span>
                <span>المتوقع: ${esc(item.expectedOutcome)}</span>
              </div>
              <div class="queue-meta">
                <span>الإغلاق: ${esc(item.closesWhen)}</span>
                <span>المخرجات الحالية: ${esc(missionOutputSummary(item))}</span>
              </div>
              <div class="verification-decision-strip">
                <span class="pill ${missionStatusTone(item.status)}">${esc(missionStatusLabel(item.status))}</span>
                <span>${esc(item.note || 'لا توجد ملاحظة تشغيلية إضافية بعد.')}</span>
                <span>${esc(item.recordNames.join(' • ') || 'لا توجد سجلات مرتبطة ظاهرة.')}</span>
              </div>
              ${session ? `
                <div class="verification-decision-strip">
                  <span class="pill ${missionSessionStatusTone(session.status)}">الجلسة: ${esc(missionSessionStatusLabel(session.status))}</span>
                  <span>${summary ? `محاولات ${summary.attempts.length} • لمس ${summary.touched}/${summary.total} • متابعة ${summary.followup}` : 'لا توجد نتائج بعد.'}</span>
                </div>
              ` : `
                <div class="verification-decision-strip">
                  <span class="pill muted">لا توجد جلسة تنفيذ بعد</span>
                  <span>ابدأ جلسة لهذه المهمة لتوثيق المحاولات والنتائج والتصدير.</span>
                </div>
              `}
              <div class="verification-queue-toolbar">
                <label class="edit-field verification-note-field">
                  <span>ملاحظة محاولة التنفيذ</span>
                  <textarea id="missionAttemptNote-${esc(item.id)}" class="field" placeholder="دوّن ما الذي جُرّب، وما الذي نجح أو فشل، وما المتابعة التالية."></textarea>
                </label>
                <div class="verification-action-hint">
                  <strong>سجل المحاولات</strong>
                  <span>كل محاولة هنا تُسجل كنتيجة جلسة يمكن الرجوع لها وتصديرها لاحقًا.</span>
                </div>
              </div>
              <div class="verification-decision-actions">
                <button class="button" type="button" data-action="mission-session-start" data-mission-id="${esc(item.id)}">${session ? 'استكمال session' : 'فتح session'}</button>
                <button class="button queue" type="button" data-action="mission-attempt" data-mission-id="${esc(item.id)}" data-slug="${esc(primarySlug)}" data-outcome="success" data-note-id="missionAttemptNote-${esc(item.id)}">نجحت</button>
                <button class="button" type="button" data-action="mission-attempt" data-mission-id="${esc(item.id)}" data-slug="${esc(primarySlug)}" data-outcome="partial" data-note-id="missionAttemptNote-${esc(item.id)}">جزئية</button>
                <button class="button gold" type="button" data-action="mission-attempt" data-mission-id="${esc(item.id)}" data-slug="${esc(primarySlug)}" data-outcome="followup" data-note-id="missionAttemptNote-${esc(item.id)}">تحتاج متابعة</button>
                <button class="button subtle" type="button" data-action="mission-attempt" data-mission-id="${esc(item.id)}" data-slug="${esc(primarySlug)}" data-outcome="blocked" data-note-id="missionAttemptNote-${esc(item.id)}">تعذرت</button>
              </div>
              ${session?.attempts?.length ? `
                <div class="triage-list">
                  ${session.attempts.slice(0, 3).map(attempt => `<div class="triage-list-item"><strong>${esc(attempt.name || attempt.slug || item.title)} • ${esc(missionAttemptOutcomeLabel(attempt.outcome))}</strong><span>${esc(attempt.note || attempt.reason || 'لا توجد ملاحظة')} • التالي: ${esc(attempt.nextStep || '—')}</span></div>`).join('')}
                </div>
              ` : ''}
              <div class="verification-decision-actions">
                <button class="button" type="button" data-action="mission-status" data-mission-id="${esc(item.id)}" data-status="in_progress">بدء التنفيذ</button>
                <button class="button gold" type="button" data-action="mission-session-status" data-mission-id="${esc(item.id)}" data-status="handoff">تسليم الجلسة</button>
                <button class="button subtle" type="button" data-action="mission-session-status" data-mission-id="${esc(item.id)}" data-status="blocked">إيقاف الجلسة</button>
                <button class="button queue" type="button" data-action="mission-session-status" data-mission-id="${esc(item.id)}" data-status="completed">إنهاء الجلسة</button>
                <button class="button subtle" type="button" data-action="mission-status" data-mission-id="${esc(item.id)}" data-status="closed">إغلاق المهمة</button>
              </div>
              ${session ? `
                <div class="verification-decision-actions">
                  <button class="button subtle" type="button" data-action="mission-session-export" data-mission-id="${esc(item.id)}" data-format="json">JSON</button>
                  <button class="button subtle" type="button" data-action="mission-session-export" data-mission-id="${esc(item.id)}" data-format="csv">CSV</button>
                  <button class="button subtle" type="button" data-action="mission-session-export" data-mission-id="${esc(item.id)}" data-format="summary">Summary</button>
                </div>
              ` : ''}
              <div class="actions">
                <a class="button" href="${item.scopeKind === 'district' ? districtHref(item.scopeKey) : item.scopeKind === 'sector' ? `#/sector/${encodeURIComponent(item.scopeKey)}` : item.scopeKind === 'record' ? entityHref(item.scopeKey, { edit: true }) : item.scopeKey === 'district-review' ? '#/verification/district-review' : item.scopeKey === 'confidence-review' ? '#/verification/confidence-review' : item.scopeKey === 'conflicting-evidence' ? '#/verification/conflicting-evidence' : '#/verification/source-review'}">فتح النطاق</a>
                <a class="button subtle" href="#/ops-hub">المراجعة</a>
                <a class="button subtle" href="#/editorial-hub">التحرير</a>
              </div>
            </article>
          `;}).join('')}
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">تنسيق الجلسات</div>
          <h3>الجلسات المفتوحة والمنتهية</h3>
          ${control.sessions.length ? `
            <div class="editorial-list">
              ${control.sessions.slice(0, 8).map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.title)}</strong>
                      <span>${item.type === 'queue' ? 'جلسة صف تحقق' : 'جلسة سجل'} • ${item.summary.progressLabel}</span>
                    </div>
                    <span class="pill ${verificationSessionStatusTone(item.status)}">${verificationSessionStatusLabel(item.status)}</span>
                  </div>
                  <p>بدأت ${esc(item.startedAt || '—')} • آخر تحديث ${esc(item.updatedAt || '—')} • ${item.summary.unresolved} غير محسوم • ${item.summary.deeper} يحتاج مراجعة أعمق.</p>
                  <div class="actions">
                    <a class="button" href="${item.type === 'queue' ? `#/verification/${encodeURIComponent(item.scopeKey)}` : entityHref(item.scopeKey, { edit: true })}">${item.type === 'queue' ? 'استئناف الجلسة' : 'فتح السجل'}</a>
                    <a class="button subtle" href="#/ops-hub">المراجعة</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد جلسات تحقق مسجلة بعد.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">سجل القرارات</div>
          <h3>آخر قرارات التحقق</h3>
          ${control.decisions.length ? `
            <div class="editorial-list">
              ${control.decisions.slice(0, 10).map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.name)}</strong>
                      <span>${esc(item.decisionLabel)} • ${esc(verificationResolutionLabel(item.resolution))}</span>
                    </div>
                    <span class="pill ${verificationDecisionTone(item.decision)}">${esc(item.confidence || 'غير محدد')}</span>
                  </div>
                  <p>${esc(item.reason || item.blockedBy || 'لا توجد مبررات إضافية.')} • التالي: ${esc(item.nextAction || '—')}</p>
                  <div class="actions">
                    <a class="button" href="${entityHref(item.slug, { edit: true })}">فتح السجل</a>
                    <a class="button subtle" href="${item.sessionType === 'queue' ? `#/verification/${encodeURIComponent(item.scopeKey)}` : '#/verification-program'}">السياق التحققي</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد قرارات تحقق موثقة بعد.</div>'}
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">التصعيد والتسليم والإغلاق</div>
          <h3>مخارج دورة التحقق والمهام</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>غير محسوم</strong><span>${control.closure.unresolved} قرار</span></div>
            <div class="triage-list-item"><strong>يحتاج مراجعة أعمق</strong><span>${control.closure.deeper} قرار</span></div>
            <div class="triage-list-item"><strong>جاهز للمتابعة</strong><span>${control.closure.followup} قرار</span></div>
            <div class="triage-list-item"><strong>جاهز للتحرير</strong><span>${control.closure.editorial} قرار</span></div>
            <div class="triage-list-item"><strong>مغلق الآن</strong><span>${control.closure.closed} قرار</span></div>
          </div>
          <div class="home-links">
            <a href="#/verification/source-review" class="home-link-card"><strong>مسار المصدر</strong><span>ابدأ بالسجلات التي ينقصها أو يضعف فيها المصدر.</span></a>
            <a href="#/verification/district-review" class="home-link-card"><strong>مسار الحي</strong><span>ابدأ بالسجلات التي ما زال الحي فيها غير محسوم.</span></a>
            <a href="#/editorial-hub" class="home-link-card"><strong>التسليم للتحرير</strong><span>انقل السجلات الجاهزة أو التي تحتاج متابعة تحريريًا.</span></a>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">طبقة التحكم</div>
          <h3>أين تتعطل العملية؟</h3>
          <div class="editorial-list">
            ${control.bottlenecks.map(item => `
              <article class="editorial-item">
                <div class="editorial-item-top">
                  <div>
                    <strong>${esc(item.label)}</strong>
                    <span>${item.count} سجل</span>
                  </div>
                  <span class="pill warning">عنق زجاجة</span>
                </div>
                <p>هذا المسار يستهلك الحيز الأكبر من وقت التحقق الآن، ويحتاج تدخلًا مباشرًا.</p>
                <div class="actions">
                  <a class="button" href="${item.href}">فتح المسار</a>
                  <a class="button subtle" href="#/ops-hub">المراجعة</a>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">سجل الأدلة</div>
          <h3>آخر الأدلة</h3>
          ${evidence.length ? `
            <div class="editorial-list">
              ${evidence.slice(0, 6).map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.name || item.slug)}</strong>
                      <span>${esc(evidenceCategoryLabel(item.category))} • ${esc(evidenceOutcomeLabel(item.outcome))}</span>
                    </div>
                    <span class="pill ${editorialStatusTone(item.outcome === 'confirmed' ? 'export-ready' : item.outcome === 'failed' ? 'follow-up-needed' : 'review-ready')}">${esc(item.createdAt)}</span>
                  </div>
                  <p>${esc(item.note || item.rationale || 'لا توجد ملاحظة إضافية.')}</p>
                  <div class="actions">
                    <a class="button" href="${entityHref(item.slug, { edit: true })}">فتح السجل</a>
                    <a class="button subtle" href="#/verification/source-review">التحقق</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد أدلة مسجلة بعد.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">مخطط التوسع</div>
          <h3>الأحياء الأضعف تغطية</h3>
          <div class="editorial-list">
            ${coverage.weakDistricts.map(item => `
              <article class="editorial-item">
                <div class="editorial-item-top">
                  <div>
                    <strong>${esc(item.name)}</strong>
                    <span>${item.total} سجل</span>
                  </div>
                  <span class="pill warning">درجة أولوية ${item.score}</span>
                </div>
                <p>${item.weak} مشكلة حي • ${item.source} مشكلة مصدر • ${item.confidence} ثقة تحتاج رفع</p>
                <div class="actions">
                  <a class="button" href="${item.name !== 'غير متحقق' ? districtHref(item.name) : '#/verification/district-review'}">فتح المسار</a>
                  <a class="button subtle" href="#/bulk/missing-district?priority=easy&sort=default">دفعة الحي</a>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">التوسع التالي</div>
          <h3>الدفعات الأنسب لاحقًا</h3>
          <div class="triage-list">
            ${coverage.nextBatch.map(item => `<div class="triage-list-item"><strong>${esc(item.title)}</strong><span>${esc(item.note)}</span></div>`).join('') || '<div class="triage-list-item"><strong>لا توجد دفعات واضحة بعد</strong><span>ابدأ بتسجيل أدلة أكثر لتظهر أولوية التوسع التالية.</span></div>'}
          </div>
          <div class="section-kicker">القطاعات</div>
          <div class="triage-list">
            ${coverage.sectorMap.slice(0, 6).map(item => `<div class="triage-list-item"><strong>${esc(item.title)}</strong><span>${item.records} سجل • ${item.weakCount} نقطة ضعف • ${item.status === 'active' ? 'نشط' : 'غير مفعل بعد'}</span></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">المتابعة اللاحقة</div>
          <h3>ما الذي ينتظر handoff؟</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>يحتاج دليلًا جديدًا</strong><span>${followup.needs_new_evidence.length} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج مراجعة بشرية</strong><span>${followup.human_review.length} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج مصدر</strong><span>${followup.needs_source.length} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج حسم حي</strong><span>${followup.needs_district.length} سجل</span></div>
            <div class="triage-list-item"><strong>جاهز لاحقًا</strong><span>${followup.ready_later.length} سجل</span></div>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">الرؤية التشغيلية</div>
          <h3>السجلات الدائرة والقريبة من الحسم</h3>
          ${control.looping.length ? `
            <div class="triage-list">
              ${control.looping.map(item => `<div class="triage-list-item"><strong>${esc(item.record.name)}</strong><span>${item.evidenceCount} أدلة • ${esc(item.latest ? verificationResolutionLabel(item.latest.resolution) : 'لا يوجد قرار أخير')}</span></div>`).join('')}
            </div>
          ` : '<div class="empty">لا توجد حلقات تحقق واضحة الآن.</div>'}
          <div class="section-kicker" style="margin-top:16px;">قريبة من الحسم</div>
          ${control.nearResolution.length ? `
            <div class="triage-list">
              ${control.nearResolution.map(item => `<div class="triage-list-item"><strong>${esc(item.record.name)}</strong><span>${esc(item.source.label)} • ${esc(item.district.label)} • ${esc(item.confidence.label)}</span></div>`).join('')}
            </div>
          ` : '<div class="empty">لا توجد سجلات قريبة من الحسم حاليًا.</div>'}
        </div>
      </div>
    </div>
  `;
}

function renderReleaseReadinessHub() {
  const readiness = readinessSnapshot();
  const packs = releasePackPlan();
  const resolution = resolutionImpactSnapshot();
  const finalPatch = finalPatchReviewSnapshot();
  const simulation = patchApplySimulationSnapshot();
  return `
    <div class="hero hero-compact page-hero operator-hero">
      <div class="section-kicker">الجاهزية والاعتماد</div>
      <h3>مركز الجاهزية والاعتماد</h3>
      <p>طبقة موحدة تحدد ما هو الجاهز فعلًا للاعتماد أو التصدير أو النشر، وما الذي ما زال عالقًا قبل الإخراج النهائي.</p>
      <div class="hero-actions">
        <a href="#/dashboard" class="button">لوحة التشغيل</a>
        <a href="#/ops-hub" class="button">مركز المراجعة</a>
        <a href="#/editorial-hub" class="button gold">مركز التحرير</a>
        <a href="#/verification-program" class="button primary">مركز التحقق والمهام</a>
      </div>
    </div>
    <div class="verification-program-shell section">
      <div class="verification-program-kpis">
        <div class="card mini-panel emphasis-panel"><div class="metric">${readiness.counts.publishReady}</div><div class="metric-sub">جاهزة للنشر</div></div>
        <div class="card mini-panel"><div class="metric">${readiness.counts.exportReady}</div><div class="metric-sub">جاهزة للتصدير</div></div>
        <div class="card mini-panel"><div class="metric">${readiness.counts.reviewReady}</div><div class="metric-sub">قريبة من الجاهزية</div></div>
        <div class="card mini-panel"><div class="metric">${readiness.counts.needsFollowup}</div><div class="metric-sub">تحتاج متابعة</div></div>
        <div class="card mini-panel"><div class="metric">${readiness.counts.hold + readiness.counts.notReady}</div><div class="metric-sub">غير جاهزة / hold</div></div>
      </div>
      <div class="verification-program-kpis">
        <div class="card mini-panel emphasis-panel"><div class="metric">${resolution.improvedCount}</div><div class="metric-sub">سجلات تحسنت فعليًا</div></div>
        <div class="card mini-panel"><div class="metric">${resolution.patchReadyCount}</div><div class="metric-sub">مرشحة patch الآن</div></div>
        <div class="card mini-panel"><div class="metric">${resolution.nearReadyCount}</div><div class="metric-sub">قريبة من patch-ready</div></div>
        <div class="card mini-panel"><div class="metric">${patchConsoleEntries().length}</div><div class="metric-sub">Patch candidates محفوظة</div></div>
        <div class="card mini-panel"><div class="metric">${editorialDraftEntries().filter(item => ['review-ready', 'export-ready'].includes(item.readiness)).length}</div><div class="metric-sub">Editorial-ready</div></div>
        <div class="card mini-panel"><div class="metric">${verificationDraftEntries().length}</div><div class="metric-sub">Verification-cleared outputs</div></div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">Resolution Dashboard</div>
          <h3>الأثر الفعلي على البيانات</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>سجلات تحسنت</strong><span>${resolution.improvedCount} سجل دخل في مخرج تحريري أو تحققي أو patch candidate.</span></div>
            <div class="triage-list-item"><strong>اقتربت من الجاهزية</strong><span>${resolution.nearReadyCount} سجل أصبح في review-ready أو patch-ready.</span></div>
            <div class="triage-list-item"><strong>أصبحت ready فعليًا</strong><span>${resolution.patchReadyCount} سجل يمكن وضعه داخل حزمة patch مرشحة الآن.</span></div>
            <div class="triage-list-item"><strong>المتعثر الآن</strong><span>${resolution.stuck.map(item => `${item.label} (${item.count})`).join(' • ') || 'لا توجد بؤر تعثر كبيرة ظاهرة الآن.'}</span></div>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">أنواع النقص المحلولة</div>
          <h3>أكثر ما حُلّ حتى الآن</h3>
          <div class="triage-list">
            ${resolution.solvedTypes.length
              ? resolution.solvedTypes.map(item => `<div class="triage-list-item"><strong>${esc(item.label)}</strong><span>${item.count} مخرجًا</span></div>`).join('')
              : '<div class="triage-list-item"><strong>لا يوجد بعد</strong><span>ستظهر هنا أكثر أنواع النقص التي خرجت من draft إلى مخرج فعلي.</span></div>'}
          </div>
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">لوحة الجاهزية</div>
          <h3>ما الذي يمكن إخراجه الآن؟</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>جاهز للنشر</strong><span>${readiness.counts.publishReady} سجل</span></div>
            <div class="triage-list-item"><strong>جاهز للتصدير</strong><span>${readiness.counts.exportReady} سجل</span></div>
            <div class="triage-list-item"><strong>قريب من الجاهزية</strong><span>${readiness.counts.reviewReady} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج متابعة</strong><span>${readiness.counts.needsFollowup} سجل</span></div>
            <div class="triage-list-item"><strong>جاهز كـ patch</strong><span>${resolution.patchReadyCount} سجل</span></div>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">أكبر العوائق</div>
          <h3>أين يتعطل الإخراج؟</h3>
          <div class="triage-list">
            ${readiness.blockers.map(item => `<div class="triage-list-item"><strong>${esc(item.label)}</strong><span>${item.count} سجل</span></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">Draft to Patch Flow</div>
          <h3>من draft إلى patch-ready</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>Agent / Verification drafts</strong><span>${agentDraftEntries().length} اقتراحات + ${verificationDraftEntries().length} verification drafts</span></div>
            <div class="triage-list-item"><strong>Editorial drafts</strong><span>${editorialDraftEntries().length} مسودة تحريرية محفوظة</span></div>
            <div class="triage-list-item"><strong>Review-ready</strong><span>${editorialDraftEntries().filter(item => item.readiness === 'review-ready').length} مسودة تحتاج مرورًا أخيرًا</span></div>
            <div class="triage-list-item"><strong>Patch-ready</strong><span>${resolution.patchReadyCount} سجل أصبح مرشحًا واضحًا للـ patch</span></div>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">Queue Resolution</div>
          <h3>تحويل صفوف العمل إلى نتائج</h3>
          <div class="triage-list">
            ${resolution.queueImpact.map(item => `
              <div class="triage-list-item">
                <strong>${esc(item.title)}</strong>
                <span>${item.resolved} patch-ready • ${item.improved} review-ready • ${item.blocked} ما زالت عالقة</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">Final patch review</div>
          <h3>القرار النهائي على السجلات المرشحة</h3>
          <div class="ops-followup-grid">
            <div class="triage-list-item"><strong>Approved</strong><span>${finalPatch.approved.length} سجل</span></div>
            <div class="triage-list-item"><strong>Hold</strong><span>${finalPatch.held.length} سجل</span></div>
            <div class="triage-list-item"><strong>Excluded</strong><span>${finalPatch.excluded.length} سجل</span></div>
            <div class="triage-list-item"><strong>Needs re-review</strong><span>${finalPatch.rereview.length} سجل</span></div>
            <div class="triage-list-item"><strong>Unresolved</strong><span>${finalPatch.unresolved.length} سجل</span></div>
          </div>
          <div class="actions" style="margin-top:14px;">
            <button class="button queue" type="button" data-action="final-patch-export" data-format="json">JSON</button>
            <button class="button subtle" type="button" data-action="final-patch-export" data-format="csv">CSV</button>
            <button class="button subtle" type="button" data-action="final-patch-export" data-format="summary">Summary</button>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">Patch apply simulation</div>
          <h3>محاكاة التطبيق والتوقيع النهائي</h3>
          <div class="ops-followup-grid">
            <div class="triage-list-item"><strong>Ready for sign-off</strong><span>${simulation.validation.readyForSignoff} سجل</span></div>
            <div class="triage-list-item"><strong>Signed-off</strong><span>${simulation.validation.signedOff} سجل</span></div>
            <div class="triage-list-item"><strong>Hold before apply</strong><span>${simulation.validation.held} سجل</span></div>
            <div class="triage-list-item"><strong>Needs final re-review</strong><span>${simulation.validation.rereview} سجل</span></div>
            <div class="triage-list-item"><strong>Valid for final bundle</strong><span>${simulation.validation.validForBundle} سجل</span></div>
          </div>
          <div class="actions" style="margin-top:14px;">
            <button class="button queue" type="button" data-action="patch-signoff-export" data-kind="simulation" data-format="json">Simulation JSON</button>
            <button class="button subtle" type="button" data-action="patch-signoff-export" data-kind="signoff" data-format="summary">Sign-off Report</button>
            <button class="button subtle" type="button" data-action="patch-signoff-export" data-kind="approved" data-format="json">Approved Bundle</button>
            <button class="button subtle" type="button" data-action="patch-signoff-export" data-kind="blocked" data-format="summary">Blocked Report</button>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">ما الذي بقي يمنع التطبيق؟</div>
          <h3>العوائق النهائية قبل apply المنضبط</h3>
          <div class="triage-list">
            ${simulation.blocked.length
              ? simulation.blocked.slice(0, 8).map(item => `<div class="triage-list-item"><strong>${esc(item.record.name)}</strong><span>${esc((item.signoff.blockers || []).join(' • ') || item.signoff.reason)}</span></div>`).join('')
              : '<div class="triage-list-item"><strong>لا توجد عوائق بارزة</strong><span>السجلات الحالية الواضحة انتقلت إلى final review decision.</span></div>'}
          </div>
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">Bundle validation</div>
          <h3>فحص الحزمة قبل apply</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>سجلات دخلت simulation</strong><span>${simulation.validation.total} سجل</span></div>
            <div class="triage-list-item"><strong>صالحة للحزمة النهائية</strong><span>${simulation.validation.validForBundle} سجل signed-off بلا blockers</span></div>
            <div class="triage-list-item"><strong>ما زال معطلاً</strong><span>${simulation.validation.blocked} سجل لم يجتز الفحص النهائي بعد</span></div>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">Blockers summary</div>
          <h3>ما الذي يمنع الحزمة من أن تصبح clean؟</h3>
          <div class="triage-list">
            ${simulation.validation.blockers.length
              ? simulation.validation.blockers.map(item => `<div class="triage-list-item"><strong>${esc(item.label)}</strong><span>${item.count} سجل</span></div>`).join('')
              : '<div class="triage-list-item"><strong>لا توجد blockers واضحة</strong><span>يمكن تمرير الحزمة إلى التوقيع النهائي المنضبط.</span></div>'}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-kicker">Patch Review Layer</div>
            <h3>مراجعة نهائية للسجلات المرشحة</h3>
          </div>
          <div class="results-count">${simulation.items.length} سجل</div>
        </div>
        ${simulation.items.length ? `
          <div class="verification-list">
            ${simulation.items.map(item => `
              <article class="verification-item">
                <div class="verification-item-top">
                  <div>
                    <strong>${esc(item.record.name)}</strong>
                    <span>${esc(patchReadinessLabel(item.patch.key))} • ${item.changeSet.length} تغييرات • ${item.verificationDrafts.length} verification drafts</span>
                  </div>
                  <div class="queue-badges">
                    <span class="pill ${patchReadinessTone(item.patch.key)}">${esc(patchReadinessLabel(item.patch.key))}</span>
                    <span class="pill ${finalPatchDecisionTone(item.review.decision)}">${esc(finalPatchDecisionLabel(item.review.decision))}</span>
                    <span class="pill ${patchSignoffTone(item.signoff.decision)}">${esc(patchSignoffLabel(item.signoff.decision))}</span>
                  </div>
                </div>
                <p>${esc(item.patch.reason)}</p>
                <div class="queue-meta">
                  <span>التغييرات: ${item.changeSet.length ? item.changeSet.map(change => `${change.label}`).join(' • ') : 'لا توجد تغييرات تحريرية مباشرة بعد'}</span>
                  <span>${item.caution.length ? `حذر: ${item.caution.join(' • ')}` : 'لا توجد ملاحظات حذر بارزة'}</span>
                </div>
                ${item.changeSet.length ? `
                  <div class="triage-list">
                    ${item.changeSet.slice(0, 4).map(change => `<div class="triage-list-item"><strong>${esc(change.label)}</strong><span>${esc(change.currentValue)} ← ${esc(change.suggestedValue)}</span></div>`).join('')}
                  </div>
                ` : ''}
                <div class="verification-decision-strip">
                  <span class="pill muted">القرار الحالي: ${esc(finalPatchDecisionLabel(item.review.decision))}</span>
                  <span>السبب: ${esc(item.review.reason || item.patch.reason)}</span>
                  <span>${esc(item.review.note || 'بدون ملاحظة إضافية')}</span>
                </div>
                <div class="verification-decision-strip">
                  <span class="pill ${patchSignoffTone(item.signoff.decision)}">${esc(patchSignoffLabel(item.signoff.decision))}</span>
                  <span>${esc(item.signoff.reason || 'لا يوجد سبب إضافي')}</span>
                  <span>${esc(item.signoff.blockers.length ? `Blockers: ${item.signoff.blockers.join(' • ')}` : 'اجتاز الفحص النهائي ويمكن توقيعه')}</span>
                </div>
                <textarea id="finalPatchNote-${esc(item.slug)}" class="field" placeholder="دوّن سبب القرار النهائي أو أي ملاحظة قبل إدخال السجل في الحزمة أو تعليقه.">${esc(item.review.note || '')}</textarea>
                <div class="verification-decision-actions">
                  <button class="button queue" type="button" data-action="final-patch-decision" data-slug="${esc(item.slug)}" data-decision="approve" data-note-id="finalPatchNote-${esc(item.slug)}">Approve</button>
                  <button class="button gold" type="button" data-action="final-patch-decision" data-slug="${esc(item.slug)}" data-decision="hold" data-note-id="finalPatchNote-${esc(item.slug)}">Hold</button>
                  <button class="button subtle" type="button" data-action="final-patch-decision" data-slug="${esc(item.slug)}" data-decision="rereview" data-note-id="finalPatchNote-${esc(item.slug)}">Needs re-review</button>
                  <button class="button subtle" type="button" data-action="final-patch-decision" data-slug="${esc(item.slug)}" data-decision="exclude" data-note-id="finalPatchNote-${esc(item.slug)}">Exclude</button>
                </div>
                <textarea id="patchSignoffNote-${esc(item.slug)}" class="field" placeholder="سبب التوقيع أو الإيقاف قبل apply أو المراجعة الأخيرة.">${esc(item.signoff.note || '')}</textarea>
                <div class="verification-decision-actions">
                  <button class="button queue" type="button" data-action="patch-signoff-decision" data-slug="${esc(item.slug)}" data-decision="ready-for-signoff" data-note-id="patchSignoffNote-${esc(item.slug)}">Ready for sign-off</button>
                  <button class="button primary" type="button" data-action="patch-signoff-decision" data-slug="${esc(item.slug)}" data-decision="signed-off" data-note-id="patchSignoffNote-${esc(item.slug)}">Signed-off</button>
                  <button class="button gold" type="button" data-action="patch-signoff-decision" data-slug="${esc(item.slug)}" data-decision="hold-before-apply" data-note-id="patchSignoffNote-${esc(item.slug)}">Hold before apply</button>
                  <button class="button subtle" type="button" data-action="patch-signoff-decision" data-slug="${esc(item.slug)}" data-decision="needs-final-rereview" data-note-id="patchSignoffNote-${esc(item.slug)}">Needs final re-review</button>
                </div>
                <div class="actions">
                  <a class="button" href="${entityHref(item.slug, { edit: true })}">فتح السجل</a>
                  <a class="button subtle" href="#/editorial-hub">التحرير</a>
                  <a class="button subtle" href="#/verification-program">التحقق</a>
                </div>
              </article>
            `).join('')}
          </div>
        ` : '<div class="empty">لا توجد سجلات مرشحة للدخول في final patch review بعد.</div>'}
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">سجلات مرشحة</div>
          <h3>أقرب السجلات للاعتماد</h3>
          ${readiness.nearReady.length ? `
            <div class="editorial-list">
              ${readiness.nearReady.map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.record.name)}</strong>
                      <span>${esc(readinessLabel(item.readiness.key))}</span>
                    </div>
                    <span class="pill ${readinessTone(item.readiness.key)}">${esc(readinessLabel(item.readiness.key))}</span>
                  </div>
                  <p>${esc(item.readiness.reason)}</p>
                  <div class="actions">
                    <a class="button" href="${entityHref(item.record.slug, { edit: true })}">فتح السجل</a>
                    <a class="button subtle" href="#/verification-program">التحقق والمهام</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد سجلات قريبة من الجاهزية الآن.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">Patch readiness</div>
          <h3>مرشحو patch الفعليون</h3>
          ${resolution.patchReady.length ? `
            <div class="editorial-list">
              ${resolution.patchReady.map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.record.name)}</strong>
                      <span>${item.patch.changeCount} تغييرات واضحة</span>
                    </div>
                    <span class="pill ${patchReadinessTone(item.patch.key)}">${esc(patchReadinessLabel(item.patch.key))}</span>
                  </div>
                  <p>${esc(item.patch.reason)}</p>
                  <div class="actions">
                    <a class="button" href="${entityHref(item.record.slug, { edit: true })}">فتح السجل</a>
                    <a class="button subtle" href="#/editorial-hub">التحرير</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد بعد سجلات patch-ready بشكل واضح.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">جاهزة الآن</div>
          <h3>جاهزة للنشر الآن</h3>
          ${readiness.readyNow.length ? `
            <div class="editorial-list">
              ${readiness.readyNow.map(item => `
                <article class="editorial-item">
                  <div class="editorial-item-top">
                    <div>
                      <strong>${esc(item.record.name)}</strong>
                      <span>${esc(displayText(item.record.district))} • ${esc(displayConfidence(item.record.confidence))}</span>
                    </div>
                    <span class="pill success">جاهزة للنشر</span>
                  </div>
                  <p>${esc(item.readiness.reason)}</p>
                  <div class="actions">
                    <a class="button" href="${entityHref(item.record.slug, { edit: true })}">فتح السجل</a>
                    <a class="button subtle" href="#/editorial-hub">التحرير</a>
                  </div>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد حاليًا سجلات مكتملة كفاية للنشر المباشر.</div>'}
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">ما الذي يمنع الـ apply المنضبط؟</div>
          <h3>العوائق الحالية قبل التطبيق</h3>
          ${resolution.followup.length ? `
            <div class="triage-list">
              ${resolution.followup.map(item => `<div class="triage-list-item"><strong>${esc(item.record.name)}</strong><span>${esc(item.patch.reason)}</span></div>`).join('')}
            </div>
          ` : '<div class="empty">لا توجد عوائق follow-up بارزة ضمن الدفعة الحالية.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">Controlled outputs</div>
          <h3>ما يمكن تسليمه الآن</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>Patch candidates</strong><span>${resolution.patchReadyCount} سجل</span></div>
            <div class="triage-list-item"><strong>Editorial-ready records</strong><span>${editorialDraftEntries().filter(item => ['review-ready', 'export-ready'].includes(item.readiness)).length} سجل</span></div>
            <div class="triage-list-item"><strong>Verification-cleared outputs</strong><span>${verificationDraftEntries().length} مخرج</span></div>
            <div class="triage-list-item"><strong>Follow-up-needed records</strong><span>${resolution.followup.length} سجل ضمن العينة الأوضح</span></div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-kicker">حزم الاعتماد</div>
            <h3>حزم الاعتماد والتسليم</h3>
          </div>
          <div class="results-count">${packs.length} حزم</div>
        </div>
        <div class="verification-list">
          ${packs.map(pack => `
            <article class="verification-item">
              <div class="verification-item-top">
                <div>
                  <strong>${esc(pack.title)}</strong>
                  <span>${esc(pack.summary)}</span>
                </div>
                <div class="queue-badges">
                  <span class="pill ${releasePackStatusTone(pack.status)}">${esc(releasePackStatusLabel(pack.status))}</span>
                  <span class="pill muted">${pack.itemIds.length} عنصر</span>
                </div>
              </div>
              <div class="queue-meta">
                <span>Workflow: review → verification → decision → mission → session → readiness → release pack</span>
                <span>التالي: ${esc(pack.nextStep)}</span>
              </div>
              <div class="verification-decision-actions">
                <button class="button subtle" type="button" data-action="release-pack-export" data-pack-id="${esc(pack.id)}" data-format="json">JSON</button>
                <button class="button subtle" type="button" data-action="release-pack-export" data-pack-id="${esc(pack.id)}" data-format="csv">CSV</button>
                <button class="button subtle" type="button" data-action="release-pack-export" data-pack-id="${esc(pack.id)}" data-format="summary">Summary</button>
                <a class="button" href="#/verification-program">الرجوع للتشغيل</a>
              </div>
            </article>
          `).join('')}
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">التأجيل والإيقاف</div>
          <h3>ما الذي يجب تأجيله؟</h3>
          ${readiness.blocked.length ? `
            <div class="triage-list">
              ${readiness.blocked.map(item => `<div class="triage-list-item"><strong>${esc(item.record.name)}</strong><span>${esc(readinessLabel(item.readiness.key))} • ${esc(item.readiness.reason)}</span></div>`).join('')}
            </div>
          ` : '<div class="empty">لا توجد عناصر حرجة مؤجلة بوضوح الآن.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">تكامل الطبقات</div>
          <h3>من أين تأتي الجاهزية؟</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>المراجعة</strong><span>تحدد أوليًا ما يمر وما يتوقف.</span></div>
            <div class="triage-list-item"><strong>التحقق والقرارات</strong><span>تزيل الغموض من المصدر والحي والثقة.</span></div>
            <div class="triage-list-item"><strong>المهمات والجلسات</strong><span>تحوّل القرار إلى تنفيذ ونتائج قابلة للتسليم.</span></div>
            <div class="triage-list-item"><strong>الجاهزية</strong><span>تحسم ما يخرج الآن وما يؤجل وما يعود للمتابعة.</span></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function queueContextForEntity(entity) {
  const { query } = parseHashRoute();
  const queueKey = query.get('queue');
  if (!queueKey || !attentionQueues()[queueKey]) return null;
  const priority = query.get('priority') || state.queuePriority;
  const sort = query.get('sort') || state.queueSort;
  const view = queueViewState(queueKey, { priority, sort });
  const items = view.activeGroup.items;
  const index = items.findIndex(item => item.slug === entity.slug);
  if (index === -1) return null;
  return {
    queueKey,
    queueTitle: queueTitleByKey(queueKey),
    priority: view.activePriority,
    priorityLabel: view.activeGroup.label,
    sort: view.sortMode,
    items,
    index,
    prev: items[index - 1] || null,
    next: items[index + 1] || null,
    reason: attentionQueues()[queueKey].reason(entity),
    returnHref: queueHref(queueKey, { priority: view.activePriority, sort: view.sortMode }),
  };
}

function reviewSessionStorageKey(queueKey = 'needs-review') {
  return `daleelyBulkReview:${queueKey}`;
}

function exportHistoryStorageKey() {
  return 'daleelyReviewExports';
}

function editorialDraftsStorageKey() {
  return 'daleelyEditorialDrafts';
}

function patchConsoleStorageKey() {
  return 'daleelyPatchConsole';
}

function importConsoleStorageKey() {
  return 'daleelyImportConsole';
}

function evidenceLabStorageKey() {
  return 'daleelyEvidenceLab';
}

function verificationSessionStorageKey() {
  return 'daleelyVerificationSessions';
}

function verificationDecisionStorageKey() {
  return 'daleelyVerificationDecisions';
}

function missionRegistryStorageKey() {
  return 'daleelyMissionRegistry';
}

function missionSessionStorageKey() {
  return 'daleelyMissionSessions';
}

function getExportHistory() {
  return getStoredList(exportHistoryStorageKey());
}

function saveExportHistory(items = []) {
  localStorage.setItem(exportHistoryStorageKey(), JSON.stringify(items.slice(0, 30)));
}

function getStoredList(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function saveStoredList(key, items = []) {
  localStorage.setItem(key, JSON.stringify(items.slice(0, 40)));
}

function agentBatchEndpoint(agentKey = 'completion') {
  return agentKey === 'verification'
    ? './api/agents/verification-support/batch'
    : './api/agents/record-completion/batch';
}

function upsertStoredItem(key, item, idField = 'id') {
  const list = getStoredList(key);
  const index = list.findIndex(entry => entry[idField] === item[idField]);
  if (index >= 0) list[index] = { ...list[index], ...item };
  else list.unshift(item);
  saveStoredList(key, list);
}

function evidenceEntries() {
  return getStoredList(evidenceLabStorageKey());
}

function evidenceForSlug(slug = '') {
  return evidenceEntries().filter(item => item.slug === slug).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function evidenceCategoryLabel(category = '') {
  return ({
    source: 'المصدر',
    district: 'الحي',
    confidence: 'الثقة',
    followup: 'المتابعة',
    general: 'عام',
  }[category] || 'عام');
}

function evidenceOutcomeLabel(outcome = '') {
  return ({
    confirmed: 'تم التأكيد',
    blocked: 'معلق',
    failed: 'فشل',
    pending: 'بانتظار متابعة',
    needs_source: 'يحتاج مصدر',
    needs_district: 'يحتاج حسم حي',
    ready_later: 'جاهز لاحقًا',
  }[outcome] || 'غير محدد');
}

function addEvidenceEntry(entry = {}) {
  const item = {
    id: entry.id || `evidence-${Date.now()}`,
    slug: entry.slug || '',
    name: entry.name || getEntity(entry.slug || '')?.name || '',
    category: entry.category || 'general',
    outcome: entry.outcome || 'pending',
    note: String(entry.note || '').trim(),
    rationale: String(entry.rationale || '').trim(),
    createdAt: entry.createdAt || new Date().toISOString(),
    sourceState: entry.sourceState || '',
    districtState: entry.districtState || '',
    confidenceState: entry.confidenceState || '',
  };
  upsertStoredItem(evidenceLabStorageKey(), item, 'id');
  return item;
}

function verificationSessions() {
  return getStoredList(verificationSessionStorageKey());
}

function saveVerificationSessions(items = []) {
  saveStoredList(verificationSessionStorageKey(), items);
}

function verificationDecisionEntries() {
  return getStoredList(verificationDecisionStorageKey())
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

function saveVerificationDecisionEntries(items = []) {
  saveStoredList(verificationDecisionStorageKey(), items);
}

function verificationSessionStatusLabel(status = '') {
  return ({
    new: 'جديدة',
    review: 'قيد التحقق',
    escalated: 'مصعدة',
    handoff: 'بانتظار تسليم',
    closure: 'قريبة من الإغلاق',
    closed: 'مغلقة',
  }[status] || 'قيد العمل');
}

function verificationSessionStatusTone(status = '') {
  return ({
    new: 'muted',
    review: 'queue',
    escalated: 'warning',
    handoff: 'gold',
    closure: 'success',
    closed: 'success',
  }[status] || 'muted');
}

function verificationDecisionLabel(decision = '') {
  return ({
    assign: 'إسناد',
    review: 'مراجعة',
    verify: 'تم التحقق',
    escalate: 'تصعيد',
    handoff: 'تسليم',
    close: 'إغلاق مؤقت',
  }[decision] || 'قيد القرار');
}

function verificationDecisionTone(decision = '') {
  return ({
    assign: 'muted',
    review: 'queue',
    verify: 'success',
    escalate: 'warning',
    handoff: 'gold',
    close: 'muted',
  }[decision] || 'muted');
}

function verificationResolutionLabel(resolution = '') {
  return ({
    unresolved: 'غير محسوم',
    needs_deeper_review: 'يحتاج مراجعة أعمق',
    ready_for_followup: 'جاهز للمتابعة',
    ready_for_editorial_action: 'جاهز للتحرير',
    closed_for_now: 'مغلق الآن',
  }[resolution] || 'قيد العمل');
}

function verificationResolutionTone(resolution = '') {
  return ({
    unresolved: 'muted',
    needs_deeper_review: 'warning',
    ready_for_followup: 'gold',
    ready_for_editorial_action: 'success',
    closed_for_now: 'muted',
  }[resolution] || 'muted');
}

function verificationActionMeta(action = 'review', record = null) {
  const source = sourceVerificationState(record || {});
  const district = districtVerificationState(record || {});
  const confidence = confidenceVerificationState(record || {});
  const blockers = [
    source.key !== 'verified' ? `المصدر: ${source.label}` : '',
    district.key !== 'verified' ? `الحي: ${district.label}` : '',
    !['stable'].includes(confidence.key) ? `الثقة: ${confidence.label}` : '',
  ].filter(Boolean);
  const defaults = {
    assign: {
      resolution: 'unresolved',
      nextAction: 'بدء مراجعة الدليل الحالي وتحديد أول محاولة تحقق.',
      sessionStatus: 'review',
    },
    review: {
      resolution: 'unresolved',
      nextAction: 'تسجيل نتيجة المراجعة التالية أو إضافة دليل جديد.',
      sessionStatus: 'review',
    },
    verify: {
      resolution: 'ready_for_editorial_action',
      nextAction: 'تسليم السجل للتحرير أو الإغلاق بعد تثبيت الحقول.',
      sessionStatus: 'closure',
    },
    escalate: {
      resolution: 'needs_deeper_review',
      nextAction: 'تصعيد السجل إلى مراجعة أعمق أو فحص يدوي.',
      sessionStatus: 'escalated',
    },
    handoff: {
      resolution: 'ready_for_followup',
      nextAction: 'إحالته إلى المتابعة أو التحرير حسب نوع النقص.',
      sessionStatus: 'handoff',
    },
    close: {
      resolution: 'closed_for_now',
      nextAction: 'إغلاق السجل مؤقتًا حتى وصول إشارة جديدة.',
      sessionStatus: 'closed',
    },
  };
  const meta = defaults[action] || defaults.review;
  return {
    ...meta,
    blockers,
    settledBy: action === 'verify' ? [`المصدر: ${source.label}`, `الحي: ${district.label}`, `الثقة: ${confidence.label}`].join(' • ') : '',
    confidence: confidence.label,
  };
}

function verificationSessionId(scopeType = 'queue', scopeKey = 'source-review') {
  return `verification-session:${scopeType}:${scopeKey}`;
}

function decisionsForVerificationSession(sessionId = '') {
  return verificationDecisionEntries().filter(item => item.sessionId === sessionId);
}

function verificationSessionSummary(session = {}) {
  const decisions = decisionsForVerificationSession(session.id || '');
  const latestBySlug = new Map();
  decisions.forEach(item => {
    if (!latestBySlug.has(item.slug)) latestBySlug.set(item.slug, item);
  });
  const items = Array.from(latestBySlug.values());
  const total = Math.max((session.recordSlugs || []).length, items.length, 0);
  const done = items.filter(item => ['verify', 'handoff', 'close', 'escalate'].includes(item.decision)).length;
  return {
    total,
    touched: items.length,
    done,
    unresolved: items.filter(item => item.resolution === 'unresolved').length,
    deeper: items.filter(item => item.resolution === 'needs_deeper_review').length,
    followup: items.filter(item => item.resolution === 'ready_for_followup').length,
    editorial: items.filter(item => item.resolution === 'ready_for_editorial_action').length,
    closed: items.filter(item => item.resolution === 'closed_for_now').length,
    decisions: items,
    progressLabel: total ? `${items.length}/${total}` : '0/0',
  };
}

function startOrOpenVerificationSession({
  scopeType = 'queue',
  scopeKey = 'source-review',
  title = '',
  queueKey = '',
  recordSlugs = [],
  persist = true,
} = {}) {
  const list = verificationSessions();
  const id = verificationSessionId(scopeType, scopeKey);
  const index = list.findIndex(item => item.id === id);
  const session = {
    id,
    type: scopeType,
    scopeKey,
    queueKey: queueKey || (scopeType === 'queue' ? scopeKey : ''),
    title: title || (scopeType === 'queue' ? (verificationQueues()[scopeKey]?.title || 'جلسة تحقق') : (getEntity(scopeKey)?.name || scopeKey)),
    recordSlugs: recordSlugs.length ? uniq(recordSlugs) : (scopeType === 'queue' ? verificationQueues()[scopeKey]?.records().map(item => item.slug) || [] : [scopeKey]),
    status: 'new',
    startedAt: index >= 0 ? list[index].startedAt || new Date().toISOString() : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: index >= 0 ? (list[index].completedAt || '') : '',
  };
  const merged = index >= 0 ? { ...list[index], ...session } : session;
  if (!persist) return merged;
  if (index >= 0) list[index] = merged;
  else list.unshift(merged);
  saveVerificationSessions(list);
  return merged;
}

function latestVerificationDecisionForSlug(slug = '') {
  return verificationDecisionEntries().find(item => item.slug === slug) || null;
}

function verificationSessionForSlug(slug = '') {
  return verificationSessions().find(session => (session.recordSlugs || []).includes(slug) && session.status !== 'closed') || null;
}

function registerVerificationDecision({
  scopeType = 'queue',
  scopeKey = 'source-review',
  slug = '',
  decision = 'review',
  note = '',
  queueKey = '',
} = {}) {
  const record = getEntity(slug);
  if (!record) return null;
  const session = startOrOpenVerificationSession({
    scopeType,
    scopeKey,
    queueKey,
    title: scopeType === 'queue' ? (verificationQueues()[scopeKey]?.title || 'جلسة تحقق') : record.name,
    recordSlugs: scopeType === 'queue' ? (verificationQueues()[scopeKey]?.records().map(item => item.slug) || []) : [slug],
  });
  const meta = verificationActionMeta(decision, record);
  const entry = {
    id: `verification-decision:${session.id}:${slug}`,
    sessionId: session.id,
    sessionTitle: session.title,
    sessionType: session.type,
    scopeKey: session.scopeKey,
    queueKey: session.queueKey,
    slug,
    name: record.name,
    decision,
    decisionLabel: verificationDecisionLabel(decision),
    reason: String(note || '').trim() || (verificationQueues()[queueKey || scopeKey]?.reason(record) || meta.blockers.join(' • ') || 'قرار تحققي جديد.'),
    note: String(note || '').trim(),
    resolution: meta.resolution,
    nextAction: meta.nextAction,
    settledBy: meta.settledBy,
    blockedBy: meta.blockers.join(' • '),
    confidence: meta.confidence,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  upsertStoredItem(verificationDecisionStorageKey(), entry, 'id');

  const sessions = verificationSessions();
  const sessionIndex = sessions.findIndex(item => item.id === session.id);
  const refreshed = {
    ...session,
    status: meta.sessionStatus,
    updatedAt: new Date().toISOString(),
    completedAt: decision === 'close' ? new Date().toISOString() : '',
  };
  if (sessionIndex >= 0) sessions[sessionIndex] = refreshed;
  else sessions.unshift(refreshed);
  saveVerificationSessions(sessions);
  return entry;
}

function verificationControlSnapshot() {
  const sessions = verificationSessions()
    .map(session => ({ ...session, summary: verificationSessionSummary(session) }))
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  const open = sessions.filter(session => session.status !== 'closed');
  const stalled = open.filter(session => session.summary.touched === 0 || session.summary.unresolved >= Math.max(2, Math.ceil(session.summary.total / 3)));
  const decisions = verificationDecisionEntries();
  const latestBySlug = new Map();
  decisions.forEach(item => {
    if (!latestBySlug.has(item.slug)) latestBySlug.set(item.slug, item);
  });
  const looping = state.records
    .map(record => {
      const evidenceCount = evidenceForSlug(record.slug).length;
      const latest = latestBySlug.get(record.slug);
      return { record, evidenceCount, latest };
    })
    .filter(item => item.evidenceCount >= 3 && (!item.latest || ['unresolved', 'needs_deeper_review'].includes(item.latest.resolution)))
    .slice(0, 6);
  const nearResolution = state.records
    .map(record => ({
      record,
      source: sourceVerificationState(record),
      district: districtVerificationState(record),
      confidence: confidenceVerificationState(record),
      latest: latestBySlug.get(record.slug),
    }))
    .filter(item => item.source.key !== 'missing' && item.district.key !== 'unresolved' && item.confidence.key !== 'blocked')
    .slice(0, 6);
  const bottlenecks = [
    { key: 'source', label: 'نقص المصدر', count: state.records.filter(record => ['missing', 'weak', 'review'].includes(sourceVerificationState(record).key)).length, href: '#/verification/source-review' },
    { key: 'district', label: 'حسم الحي', count: state.records.filter(record => ['unresolved', 'weak', 'needs-review'].includes(districtVerificationState(record).key)).length, href: '#/verification/district-review' },
    { key: 'confidence', label: 'رفع الثقة', count: state.records.filter(record => ['blocked', 'escalate', 'review'].includes(confidenceVerificationState(record).key)).length, href: '#/verification/confidence-review' },
    { key: 'conflict', label: 'الأدلة المتعارضة', count: state.records.filter(record => sourceVerificationState(record).key === 'conflicting').length, href: '#/verification/conflicting-evidence' },
  ].sort((a, b) => b.count - a.count);
  const closure = {
    unresolved: decisions.filter(item => item.resolution === 'unresolved').length,
    deeper: decisions.filter(item => item.resolution === 'needs_deeper_review').length,
    followup: decisions.filter(item => item.resolution === 'ready_for_followup').length,
    editorial: decisions.filter(item => item.resolution === 'ready_for_editorial_action').length,
    closed: decisions.filter(item => item.resolution === 'closed_for_now').length,
  };
  return { sessions, open, stalled, decisions, looping, nearResolution, bottlenecks, closure };
}

function missionEntries() {
  return getStoredList(missionRegistryStorageKey())
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

function missionSessions() {
  return getStoredList(missionSessionStorageKey())
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

function missionSessionStatusLabel(status = '') {
  return ({
    open: 'مفتوحة',
    active: 'جارية',
    blocked: 'متوقفة',
    handoff: 'بانتظار تسليم',
    completed: 'مكتملة',
  }[status] || 'قيد العمل');
}

function missionSessionStatusTone(status = '') {
  return ({
    open: 'muted',
    active: 'queue',
    blocked: 'warning',
    handoff: 'gold',
    completed: 'success',
  }[status] || 'muted');
}

function missionAttemptOutcomeLabel(outcome = '') {
  return ({
    success: 'نجحت',
    partial: 'جزئية',
    blocked: 'تعذرت',
    followup: 'تحتاج متابعة',
    unresolved: 'غير محسومة',
  }[outcome] || 'غير محددة');
}

function missionAttemptOutcomeTone(outcome = '') {
  return ({
    success: 'success',
    partial: 'queue',
    blocked: 'warning',
    followup: 'gold',
    unresolved: 'muted',
  }[outcome] || 'muted');
}

function missionStatusLabel(status = '') {
  return ({
    open: 'مفتوحة',
    in_progress: 'قيد التنفيذ',
    blocked: 'متوقفة',
    ready_to_close: 'جاهزة للإغلاق',
    handoff: 'تحتاج تسليمًا',
    closed: 'مغلقة',
  }[status] || 'قيد العمل');
}

function missionStatusTone(status = '') {
  return ({
    open: 'muted',
    in_progress: 'queue',
    blocked: 'warning',
    ready_to_close: 'success',
    handoff: 'gold',
    closed: 'success',
  }[status] || 'muted');
}

function missionPriorityLabel(priority = '') {
  return ({
    urgent: 'عالية جدًا',
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
  }[priority] || 'متوسطة');
}

function missionPriorityTone(priority = '') {
  return ({
    urgent: 'warning',
    high: 'gold',
    medium: 'queue',
    low: 'muted',
  }[priority] || 'muted');
}

function missionTypeLabel(type = '') {
  return ({
    source_collection: 'جمع مصادر',
    verification: 'مهمة تحقق',
    coverage: 'توسع تغطية',
    record_followup: 'متابعة سجل',
  }[type] || 'مهمة تشغيلية');
}

function missionStatusRecommendation(mission = {}, progress = {}) {
  if (progress.resolved && progress.total && progress.resolved >= progress.total) return 'ready_to_close';
  if (progress.blocked >= Math.max(1, Math.ceil(progress.total / 3))) return 'blocked';
  if (progress.handoff > 0 || progress.editorial > 0) return 'handoff';
  if (progress.touched > 0) return 'in_progress';
  return mission.status || 'open';
}

function missionProgressSummary(recordSlugs = []) {
  const latestDecisionBySlug = new Map();
  verificationDecisionEntries().forEach(item => {
    if (!latestDecisionBySlug.has(item.slug)) latestDecisionBySlug.set(item.slug, item);
  });
  const total = recordSlugs.length;
  const touched = recordSlugs.filter(slug => evidenceForSlug(slug).length || latestDecisionBySlug.has(slug)).length;
  const resolved = recordSlugs.filter(slug => ['ready_for_editorial_action', 'ready_for_followup', 'closed_for_now'].includes(latestDecisionBySlug.get(slug)?.resolution)).length;
  const blocked = recordSlugs.filter(slug => latestDecisionBySlug.get(slug)?.resolution === 'needs_deeper_review').length;
  const unresolved = Math.max(total - resolved, 0);
  const handoff = recordSlugs.filter(slug => latestDecisionBySlug.get(slug)?.resolution === 'ready_for_followup').length;
  const editorial = recordSlugs.filter(slug => latestDecisionBySlug.get(slug)?.resolution === 'ready_for_editorial_action').length;
  return { total, touched, resolved, blocked, unresolved, handoff, editorial };
}

function missionRecordSummary(recordSlugs = [], limit = 5) {
  return recordSlugs
    .map(slug => getEntity(slug))
    .filter(Boolean)
    .slice(0, limit)
    .map(record => record.name);
}

function missionScopeTitle(scopeKind = '', scopeKey = '') {
  if (scopeKind === 'district') return scopeKey;
  if (scopeKind === 'sector') return sectorLabelByKey(scopeKey);
  if (scopeKind === 'record') return getEntity(scopeKey)?.name || scopeKey;
  return scopeKey;
}

function derivedMissionTemplates() {
  const followup = verificationFollowupBuckets();
  const coverage = coverageExpansionPlanner();
  const sourceMissing = state.records.filter(record => sourceVerificationState(record).key === 'missing');
  const sourceWeak = state.records.filter(record => ['weak', 'review'].includes(sourceVerificationState(record).key));
  const sourceConflict = state.records.filter(record => sourceVerificationState(record).key === 'conflicting');
  const districtUnresolved = state.records.filter(record => ['unresolved', 'weak', 'needs-review'].includes(districtVerificationState(record).key));
  const confidenceBlocked = state.records.filter(record => ['blocked', 'escalate', 'review'].includes(confidenceVerificationState(record).key));

  const base = [
    {
      id: 'mission-source-missing',
      type: 'source_collection',
      title: 'دفعة جمع المصادر الناقصة',
      scopeKind: 'queue',
      scopeKey: 'source-review',
      recordSlugs: sourceMissing.map(record => record.slug),
      priority: sourceMissing.length > 12 ? 'urgent' : 'high',
      whyOpened: 'هناك سجلات بلا مرجع واضح أو حساب رسمي يمكن الاعتماد عليه.',
      expectedOutcome: 'إضافة مصدر موثوق أو حساب رسمي أو رابط مرجعي لكل سجل.',
      closesWhen: 'ينخفض عدد السجلات بلا مصدر مباشر أو تنتقل إلى حالة تحقق قابلة للحسم.',
      lane: 'source',
    },
    {
      id: 'mission-source-weak',
      type: 'source_collection',
      title: 'دفعة تقوية المصادر الضعيفة',
      scopeKind: 'queue',
      scopeKey: 'source-review',
      recordSlugs: sourceWeak.map(record => record.slug),
      priority: 'high',
      whyOpened: 'المرجع الحالي موجود لكنه لا يكفي للحسم أو ما زال ضعيف الإسناد.',
      expectedOutcome: 'تعزيز المصدر بمؤشر داعم أو توثيق يرفع الثقة.',
      closesWhen: 'تتحول السجلات الضعيفة إلى موثقة أو جاهزة لتسليم تحريري.',
      lane: 'source',
    },
    {
      id: 'mission-source-conflict',
      type: 'source_collection',
      title: 'حسم تعارضات المصدر',
      scopeKind: 'queue',
      scopeKey: 'conflicting-evidence',
      recordSlugs: sourceConflict.map(record => record.slug),
      priority: sourceConflict.length ? 'urgent' : 'medium',
      whyOpened: 'هناك سجلات تتعارض فيها الأدلة أو الملاحظات المصدرية.',
      expectedOutcome: 'حسم المرجع الأوثق وتوثيق سبب استبعاد الإشارات الأخرى.',
      closesWhen: 'ينتهي التعارض أو يتحول إلى تصعيد واضح.',
      lane: 'source',
    },
    {
      id: 'mission-evidence-gap',
      type: 'source_collection',
      title: 'مهمة سد فجوة الأدلة',
      scopeKind: 'queue',
      scopeKey: 'unresolved-verification',
      recordSlugs: followup.needs_new_evidence.map(record => record.slug),
      priority: 'high',
      whyOpened: 'السجلات العالقة لم تبدأ فيها محاولات دليل كافية بعد.',
      expectedOutcome: 'تسجيل محاولات أدلة أولية ومبررات واضحة لكل سجل.',
      closesWhen: 'لكل سجل أثر دليل أو قرار أولي موثق.',
      lane: 'source',
    },
    {
      id: 'mission-verify-district',
      type: 'verification',
      title: 'مهمة حسم الأحياء',
      scopeKind: 'queue',
      scopeKey: 'district-review',
      recordSlugs: districtUnresolved.map(record => record.slug),
      priority: districtUnresolved.length > 10 ? 'high' : 'medium',
      whyOpened: 'عدد من السجلات ما زال حيها غير محسوم أو إرشاديًا فقط.',
      expectedOutcome: 'تثبيت الحي أو تحويل السجلات التي تحتاج تصعيدًا مكانيًا.',
      closesWhen: 'ينخفض عدم الحسم المكاني وتصبح السجلات جاهزة لرفع الثقة.',
      lane: 'verification',
    },
    {
      id: 'mission-verify-source',
      type: 'verification',
      title: 'مهمة تحقق المصدر',
      scopeKind: 'queue',
      scopeKey: 'source-review',
      recordSlugs: uniq([...sourceMissing, ...sourceWeak, ...sourceConflict].map(record => record.slug)),
      priority: 'high',
      whyOpened: 'المصدر ما زال يمنع اعتماد دفعة كبيرة من السجلات.',
      expectedOutcome: 'تسجيل قرارات تحقق أو handoff واضح لكل سجل متعلق بالمصدر.',
      closesWhen: 'تخرج السجلات من حالة التحقق غير المحسوم في المصدر.',
      lane: 'verification',
    },
    {
      id: 'mission-verify-confidence',
      type: 'verification',
      title: 'مهمة رفع الثقة',
      scopeKind: 'queue',
      scopeKey: 'confidence-review',
      recordSlugs: confidenceBlocked.map(record => record.slug),
      priority: 'medium',
      whyOpened: 'الثقة الحالية منخفضة أو غير مستقرة رغم وجود بيانات جزئية.',
      expectedOutcome: 'رفع الثقة أو تفسير بقاء السجل معلقًا مع قرار واضح.',
      closesWhen: 'تصبح السجلات مستقرة أو تتحول إلى follow-up محدد.',
      lane: 'verification',
    },
    {
      id: 'mission-verify-conflict',
      type: 'verification',
      title: 'مهمة حسم التعارضات التحققية',
      scopeKind: 'queue',
      scopeKey: 'conflicting-evidence',
      recordSlugs: sourceConflict.map(record => record.slug),
      priority: 'urgent',
      whyOpened: 'تعارض الأدلة يمنع الإغلاق أو handoff ويستهلك وقتًا تحققيًا متكررًا.',
      expectedOutcome: 'قرار حسم أو تصعيد أعمق لكل سجل متعارض.',
      closesWhen: 'لا تبقى سجلات في حالة تضارب غير موثق القرار.',
      lane: 'verification',
    },
  ];

  coverage.weakDistricts.slice(0, 3).forEach((item, index) => {
    const records = state.records.filter(record => displayText(record.district) === item.name);
    base.push({
      id: `mission-coverage-district-${index + 1}`,
      type: 'coverage',
      title: `مهمة تغطية ${item.name}`,
      scopeKind: 'district',
      scopeKey: item.name,
      recordSlugs: records.map(record => record.slug),
      priority: index === 0 ? 'urgent' : 'high',
      whyOpened: 'هذا الحي يجمع أعلى فجوة تغطية بين ضعف الحي والمصدر والثقة.',
      expectedOutcome: 'إغلاق أكبر عدد من نقاط الضعف أو تحويلها إلى دفعات متابعة واضحة.',
      closesWhen: 'تنخفض نقاط الضعف في الحي أو تتوزع على مهام تحقق ومصدر مستقلة.',
      lane: 'coverage',
    });
  });

  coverage.sectorMap.filter(item => item.weakCount > 0).slice(0, 2).forEach((item, index) => {
    const records = state.records.filter(record => record.sector === item.key);
    base.push({
      id: `mission-coverage-sector-${item.key}`,
      type: 'coverage',
      title: `مهمة تغطية قطاع ${item.title}`,
      scopeKind: 'sector',
      scopeKey: item.key,
      recordSlugs: records.map(record => record.slug),
      priority: index === 0 ? 'high' : 'medium',
      whyOpened: 'هذا القطاع يجمع عددًا مرتفعًا من السجلات الضعيفة أو غير المحسومة.',
      expectedOutcome: 'تحديد الدفعة التالية للتوسع أو تنظيف الضعف القائم داخل القطاع.',
      closesWhen: 'تنخفض نقاط الضعف أو تتشكل مهام حي/مصدر أوضح من هذه الدفعة.',
      lane: 'coverage',
    });
  });

  return base.filter(item => item.recordSlugs.length);
}

function missionPlan() {
  const stored = missionEntries();
  const storedById = new Map(stored.map(item => [item.id, item]));
  const derived = derivedMissionTemplates().map(base => {
    const stored = storedById.get(base.id) || {};
    const progress = missionProgressSummary(base.recordSlugs);
    const status = missionStatusRecommendation(stored.status ? { ...base, ...stored } : base, progress);
    return {
      ...base,
      ...stored,
      progress,
      status: stored.status === 'closed' ? 'closed' : status,
      updatedAt: stored.updatedAt || new Date().toISOString(),
      createdAt: stored.createdAt || new Date().toISOString(),
      recordNames: missionRecordSummary(base.recordSlugs),
    };
  });

  const custom = stored
    .filter(item => !derived.some(base => base.id === item.id))
    .map(item => {
      const progress = missionProgressSummary(item.recordSlugs || []);
      return {
        ...item,
        progress,
        status: item.status || missionStatusRecommendation(item, progress),
        recordNames: missionRecordSummary(item.recordSlugs || []),
      };
    });

  const missions = [...derived, ...custom].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    const statusOrder = { open: 0, in_progress: 1, blocked: 2, handoff: 3, ready_to_close: 4, closed: 5 };
    return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9)
      || (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      || b.recordSlugs.length - a.recordSlugs.length;
  });

  const byStatus = {
    open: missions.filter(item => item.status === 'open'),
    in_progress: missions.filter(item => item.status === 'in_progress'),
    blocked: missions.filter(item => item.status === 'blocked'),
    ready_to_close: missions.filter(item => item.status === 'ready_to_close'),
    handoff: missions.filter(item => item.status === 'handoff'),
    closed: missions.filter(item => item.status === 'closed'),
  };
  const byLane = {
    source: missions.filter(item => item.lane === 'source'),
    verification: missions.filter(item => item.lane === 'verification'),
    coverage: missions.filter(item => item.lane === 'coverage'),
  };
  return { missions, byStatus, byLane };
}

function missionOutputSummary(mission = {}) {
  const progress = mission.progress || missionProgressSummary(mission.recordSlugs || []);
  return `${progress.touched}/${progress.total} بدأت • ${progress.resolved} قريبة من الإغلاق • ${progress.blocked} متوقفة`;
}

function updateMissionState({
  missionId = '',
  status = 'in_progress',
  note = '',
} = {}) {
  const plan = missionPlan();
  const mission = plan.missions.find(item => item.id === missionId);
  if (!mission) return null;
  const entry = {
    id: mission.id,
    status,
    note: String(note || '').trim(),
    updatedAt: new Date().toISOString(),
    createdAt: mission.createdAt || new Date().toISOString(),
  };
  upsertStoredItem(missionRegistryStorageKey(), entry, 'id');
  return { ...mission, ...entry };
}

function suggestedRecordMissions(record = null) {
  if (!record) return [];
  const source = sourceVerificationState(record);
  const district = districtVerificationState(record);
  const confidence = confidenceVerificationState(record);
  const suggestions = [];
  if (['missing', 'weak', 'review', 'conflicting'].includes(source.key)) {
    suggestions.push({
      id: `record-source-${record.slug}`,
      type: source.key === 'conflicting' ? 'verification' : 'source_collection',
      title: source.key === 'conflicting' ? `حسم تعارض ${record.name}` : `جمع مصدر لـ ${record.name}`,
      scopeKind: 'record',
      scopeKey: record.slug,
      recordSlugs: [record.slug],
      priority: source.key === 'conflicting' ? 'urgent' : 'high',
      whyOpened: source.reason,
      expectedOutcome: source.next,
      closesWhen: 'يتحول وضع المصدر إلى موثق أو قرار تحقق واضح.',
      lane: source.key === 'conflicting' ? 'verification' : 'source',
    });
  }
  if (['unresolved', 'weak', 'needs-review'].includes(district.key)) {
    suggestions.push({
      id: `record-district-${record.slug}`,
      type: 'verification',
      title: `حسم حي ${record.name}`,
      scopeKind: 'record',
      scopeKey: record.slug,
      recordSlugs: [record.slug],
      priority: 'high',
      whyOpened: district.reason,
      expectedOutcome: district.next,
      closesWhen: 'يتحول الحي إلى موثق أو يتصعد القرار مكانيًا.',
      lane: 'verification',
    });
  }
  if (['blocked', 'escalate', 'review'].includes(confidence.key)) {
    suggestions.push({
      id: `record-confidence-${record.slug}`,
      type: 'verification',
      title: `رفع ثقة ${record.name}`,
      scopeKind: 'record',
      scopeKey: record.slug,
      recordSlugs: [record.slug],
      priority: 'medium',
      whyOpened: confidence.reason,
      expectedOutcome: confidence.next,
      closesWhen: 'تتحول الثقة إلى مستقرة أو يظهر سبب تعليق نهائي واضح.',
      lane: 'verification',
    });
  }
  return suggestions;
}

function seedMissionFromSuggestion(suggestion = {}) {
  if (!suggestion.id) return null;
  const entry = {
    ...suggestion,
    status: 'open',
    note: '',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    recordNames: missionRecordSummary(suggestion.recordSlugs || []),
  };
  upsertStoredItem(missionRegistryStorageKey(), entry, 'id');
  return entry;
}

function missionSessionId(missionId = '') {
  return `mission-session:${missionId}`;
}

function missionSessionForMission(missionId = '') {
  return missionSessions().find(item => item.missionId === missionId) || null;
}

function deriveMissionSessionStatus(session = {}) {
  const attempts = session.attempts || [];
  if (session.status === 'completed') return 'completed';
  if (attempts.some(item => item.outcome === 'followup')) return 'handoff';
  if (attempts.some(item => item.outcome === 'blocked')) return 'blocked';
  if (attempts.length) return 'active';
  return session.status || 'open';
}

function missionSessionSummary(session = {}) {
  const attempts = session.attempts || [];
  const total = (session.recordSlugs || []).length;
  const touched = uniq(attempts.map(item => item.slug).filter(Boolean)).length;
  const updated = attempts.filter(item => ['success', 'partial'].includes(item.outcome)).length;
  const unresolved = attempts.filter(item => ['blocked', 'unresolved', 'followup'].includes(item.outcome)).length;
  const followup = attempts.filter(item => item.outcome === 'followup').length;
  const recommendations = uniq(attempts.map(item => item.nextStep).filter(Boolean)).slice(0, 4);
  return {
    total,
    touched,
    updated,
    unresolved,
    followup,
    attempts,
    recommendations,
  };
}

function startOrOpenMissionSession(missionId = '') {
  const mission = missionPlan().missions.find(item => item.id === missionId);
  if (!mission) return null;
  const current = missionSessionForMission(missionId);
  const session = {
    id: current?.id || missionSessionId(missionId),
    missionId,
    missionTitle: mission.title,
    missionType: mission.type,
    scopeKind: mission.scopeKind,
    scopeKey: mission.scopeKey,
    recordSlugs: mission.recordSlugs,
    createdAt: current?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startedAt: current?.startedAt || new Date().toISOString(),
    completedAt: current?.completedAt || '',
    status: current?.status || 'open',
    attempts: current?.attempts || [],
    exports: current?.exports || [],
  };
  upsertStoredItem(missionSessionStorageKey(), session, 'id');
  return session;
}

function defaultAttemptTypeForMission(mission = {}) {
  if (mission.type === 'source_collection') return 'جمع مصدر';
  if (mission.type === 'coverage') return 'توسع تغطية';
  if (mission.scopeKey === 'district-review') return 'تحقق حي';
  if (mission.scopeKey === 'conflicting-evidence') return 'حسم تعارض';
  return 'تحقق';
}

function addMissionAttempt({
  missionId = '',
  slug = '',
  note = '',
  outcome = 'partial',
  attemptType = '',
} = {}) {
  const mission = missionPlan().missions.find(item => item.id === missionId);
  if (!mission) return null;
  const session = startOrOpenMissionSession(missionId);
  if (!session) return null;
  const record = getEntity(slug) || getEntity((mission.recordSlugs || [])[0] || '');
  const source = sourceVerificationState(record || {});
  const district = districtVerificationState(record || {});
  const confidence = confidenceVerificationState(record || {});
  const nextStep = outcome === 'success'
    ? 'تابع السجل التالي أو جهّز handoff إذا اكتملت الدفعة.'
    : outcome === 'followup'
      ? 'أضف هذا السجل إلى follow-up أو سلّمه للتحرير/المراجعة.'
      : outcome === 'blocked'
        ? 'صعّد المهمة أو غيّر مسار التنفيذ.'
        : 'أكمل بمحاولة جديدة أو ثبّت الملاحظة التالية.';
  const attempt = {
    id: `attempt:${missionId}:${slug || 'mission'}:${Date.now()}`,
    slug: slug || '',
    name: record?.name || mission.title,
    attemptType: attemptType || defaultAttemptTypeForMission(mission),
    outcome,
    reason: note || [source.reason, district.reason, confidence.reason].filter(Boolean).join(' • '),
    note: note || '',
    succeeded: outcome === 'success' ? [source.label, district.label, confidence.label].join(' • ') : '',
    failed: ['blocked', 'unresolved'].includes(outcome) ? [source.label, district.label, confidence.label].join(' • ') : '',
    followup: outcome === 'followup' ? 'يحتاج متابعة لاحقة أو handoff.' : '',
    nextStep,
    createdAt: new Date().toISOString(),
  };
  const attempts = [attempt, ...(session.attempts || [])].slice(0, 120);
  const status = deriveMissionSessionStatus({ ...session, attempts });
  const updatedSession = {
    ...session,
    attempts,
    status,
    updatedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? (session.completedAt || new Date().toISOString()) : session.completedAt,
  };
  upsertStoredItem(missionSessionStorageKey(), updatedSession, 'id');
  updateMissionState({
    missionId,
    status: status === 'active' ? 'in_progress' : status === 'handoff' ? 'handoff' : status === 'blocked' ? 'blocked' : status === 'completed' ? 'ready_to_close' : 'in_progress',
    note: attempt.nextStep,
  });
  return attempt;
}

function setMissionSessionStatus(missionId = '', status = 'active') {
  const session = startOrOpenMissionSession(missionId);
  if (!session) return null;
  const next = {
    ...session,
    status,
    updatedAt: new Date().toISOString(),
    completedAt: status === 'completed' ? new Date().toISOString() : session.completedAt,
  };
  upsertStoredItem(missionSessionStorageKey(), next, 'id');
  updateMissionState({
    missionId,
    status: status === 'active' ? 'in_progress' : status === 'handoff' ? 'handoff' : status === 'blocked' ? 'blocked' : status === 'completed' ? 'ready_to_close' : 'open',
  });
  return next;
}

function exportableMissionSessionPayload(missionId = '') {
  const mission = missionPlan().missions.find(item => item.id === missionId);
  const session = missionSessionForMission(missionId);
  if (!mission || !session) return null;
  const summary = missionSessionSummary(session);
  return {
    mission: {
      id: mission.id,
      title: mission.title,
      type: mission.type,
      priority: mission.priority,
      status: mission.status,
      scopeKind: mission.scopeKind,
      scopeKey: mission.scopeKey,
      recordSlugs: mission.recordSlugs,
    },
    session: {
      id: session.id,
      status: session.status,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      updatedAt: session.updatedAt,
      summary: {
        totalRecords: summary.total,
        touchedRecords: summary.touched,
        conceptuallyUpdated: summary.updated,
        unresolvedItems: summary.unresolved,
        followupItems: summary.followup,
        recommendations: summary.recommendations,
      },
      attempts: session.attempts || [],
    },
  };
}

function exportableMissionSessionCsv(missionId = '') {
  const payload = exportableMissionSessionPayload(missionId);
  if (!payload) return '';
  const rows = [
    ['slug', 'name', 'attempt_type', 'outcome', 'reason', 'note', 'next_step', 'created_at'],
    ...payload.session.attempts.map(item => [
      item.slug || '',
      item.name || '',
      item.attemptType || '',
      item.outcome || '',
      item.reason || '',
      item.note || '',
      item.nextStep || '',
      item.createdAt || '',
    ]),
  ];
  return rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
}

function exportableMissionSessionSummary(missionId = '') {
  const payload = exportableMissionSessionPayload(missionId);
  if (!payload) return '';
  const summary = payload.session.summary;
  return [
    `Mission: ${payload.mission.title}`,
    `Type: ${payload.mission.type}`,
    `Status: ${payload.session.status}`,
    `Touched: ${summary.touchedRecords}/${summary.totalRecords}`,
    `Conceptually updated: ${summary.conceptuallyUpdated}`,
    `Unresolved: ${summary.unresolvedItems}`,
    `Follow-up: ${summary.followupItems}`,
    '',
    'Recommendations:',
    ...summary.recommendations.map(item => `- ${item}`),
  ].join('\n');
}

function exportMissionSession(missionId = '', format = 'json') {
  const session = missionSessionForMission(missionId);
  const mission = missionPlan().missions.find(item => item.id === missionId);
  if (!session || !mission) return false;
  if (format === 'csv') {
    downloadText(`${mission.id}-session.csv`, exportableMissionSessionCsv(missionId), 'text/csv;charset=utf-8');
  } else if (format === 'summary') {
    downloadText(`${mission.id}-session-summary.txt`, exportableMissionSessionSummary(missionId));
  } else {
    downloadJson(`${mission.id}-session.json`, exportableMissionSessionPayload(missionId));
  }
  const updated = {
    ...session,
    updatedAt: new Date().toISOString(),
    exports: [{ format, createdAt: new Date().toISOString() }, ...(session.exports || [])].slice(0, 20),
  };
  upsertStoredItem(missionSessionStorageKey(), updated, 'id');
  return true;
}

function missionExecutionSnapshot() {
  const sessions = missionSessions().map(session => ({
    ...session,
    summary: missionSessionSummary(session),
    mission: missionPlan().missions.find(item => item.id === session.missionId) || null,
  }));
  return {
    sessions,
    open: sessions.filter(item => item.status === 'open'),
    active: sessions.filter(item => item.status === 'active'),
    blocked: sessions.filter(item => item.status === 'blocked'),
    handoff: sessions.filter(item => item.status === 'handoff'),
    completed: sessions.filter(item => item.status === 'completed'),
  };
}

function releasePackStorageKey() {
  return 'daleelyReleasePacks';
}

function finalPatchReviewStorageKey() {
  return 'daleelyFinalPatchReviews';
}

function patchSignoffStorageKey() {
  return 'daleelyPatchSignoffReviews';
}

function readinessLabel(key = '') {
  return ({
    'not-ready': 'غير جاهز',
    'needs-follow-up': 'يحتاج متابعة',
    'review-ready': 'جاهز للمراجعة',
    'export-ready': 'جاهز للتصدير',
    'publish-ready': 'جاهز للنشر',
    hold: 'معلّق',
  }[key] || 'غير مصنف');
}

function readinessTone(key = '') {
  return ({
    'not-ready': 'warning',
    'needs-follow-up': 'gold',
    'review-ready': 'queue',
    'export-ready': 'success',
    'publish-ready': 'success',
    hold: 'muted',
  }[key] || 'muted');
}

function patchReadinessLabel(key = '') {
  return ({
    'not-ready': 'غير جاهز كـ patch',
    'follow-up-needed': 'يحتاج متابعة قبل patch',
    'review-ready': 'جاهز لمراجعة أخيرة',
    'patch-ready': 'جاهز كمرشح patch',
    hold: 'يُستبعد الآن',
  }[key] || 'غير مصنف');
}

function patchReadinessTone(key = '') {
  return ({
    'not-ready': 'warning',
    'follow-up-needed': 'gold',
    'review-ready': 'queue',
    'patch-ready': 'success',
    hold: 'muted',
  }[key] || 'muted');
}

function finalPatchDecisionLabel(key = '') {
  return ({
    approve: 'موافق عليه',
    hold: 'معلّق',
    exclude: 'مستبعد',
    rereview: 'يحتاج مراجعة جديدة',
  }[key] || 'لم يُحسم');
}

function finalPatchDecisionTone(key = '') {
  return ({
    approve: 'success',
    hold: 'gold',
    exclude: 'muted',
    rereview: 'queue',
  }[key] || 'warning');
}

function patchSignoffLabel(key = '') {
  return ({
    'ready-for-signoff': 'جاهز للتوقيع',
    'signed-off': 'موقّع عليه',
    'hold-before-apply': 'موقوف قبل apply',
    'needs-final-rereview': 'يحتاج مراجعة أخيرة',
  }[key] || 'لم يُحسم');
}

function patchSignoffTone(key = '') {
  return ({
    'ready-for-signoff': 'queue',
    'signed-off': 'success',
    'hold-before-apply': 'gold',
    'needs-final-rereview': 'warning',
  }[key] || 'muted');
}

function patchFieldLabel(key = '') {
  return ({
    short_address: 'العنوان المختصر',
    hours_summary: 'ساعات العمل',
    phone: 'الهاتف',
    official_instagram: 'إنستغرام',
    editorial_summary: 'النبذة التحريرية',
  }[key] || key || 'حقل');
}

function recordReadiness(record = null) {
  if (!record) return { key: 'not-ready', reason: 'لا يوجد سجل صالح.', blockers: ['السجل غير موجود'] };
  const editorial = editorialReadiness(record);
  const source = sourceVerificationState(record);
  const district = districtVerificationState(record);
  const confidence = confidenceVerificationState(record);
  const latestDecision = latestVerificationDecisionForSlug(record.slug);
  const relatedMissions = missionPlan().missions.filter(item => item.recordSlugs.includes(record.slug));
  const relatedSessions = missionSessions().filter(item => (item.recordSlugs || []).includes(record.slug));
  const blockedMission = relatedMissions.find(item => item.status === 'blocked');
  const blockedSession = relatedSessions.find(item => item.status === 'blocked');
  const latestSession = relatedSessions[0] || null;
  const blockers = [
    editorial.key === 'not-ready' ? 'ينقصه أساسيات أولية' : '',
    editorial.key === 'needs-completion' ? editorial.note : '',
    source.key === 'missing' ? 'المصدر ناقص' : '',
    source.key === 'conflicting' ? 'المصدر متعارض' : '',
    district.key === 'unresolved' ? 'الحي غير محسوم' : '',
    confidence.key === 'blocked' ? 'الثقة منخفضة/معلقة' : '',
    latestDecision?.resolution === 'needs_deeper_review' ? 'قرار التحقق يحتاج مراجعة أعمق' : '',
    blockedMission ? `المهمة "${blockedMission.title}" متوقفة` : '',
    blockedSession ? `جلسة التنفيذ "${blockedSession.missionTitle}" متوقفة` : '',
  ].filter(Boolean);

  if (['duplicate', 'archived'].includes(record.status) || source.key === 'conflicting') {
    return { key: 'hold', reason: 'السجل معلق حاليًا ولا يصلح كجزء من مخرج نهائي.', blockers: blockers.length ? blockers : ['تعارض أو تعليق تشغيلي'] };
  }
  if (editorial.key === 'not-ready' || editorial.key === 'draft-only') {
    return { key: 'not-ready', reason: editorial.note, blockers: blockers.length ? blockers : ['السجل ما زال في مرحلة أولية'] };
  }
  if (blockers.length) {
    return { key: 'needs-follow-up', reason: blockers[0], blockers };
  }
  if (editorial.key === 'review-ready' || latestDecision?.resolution === 'unresolved') {
    return { key: 'review-ready', reason: 'السجل قريب من الجاهزية لكنه يحتاج مرور مراجعة أخير.', blockers: ['مراجعة أخيرة قبل الاعتماد'] };
  }
  if (editorial.key === 'export-ready' && ['ready_for_editorial_action', 'ready_for_followup', 'closed_for_now'].includes(latestDecision?.resolution || '') && latestSession) {
    if (source.key === 'verified' && district.key === 'verified' && confidence.key === 'stable' && ['completed', 'handoff'].includes(latestSession.status)) {
      return { key: 'publish-ready', reason: 'السجل مكتمل تحريريًا وتحققيًا وتنفيذيًا.', blockers: [] };
    }
    return { key: 'export-ready', reason: 'السجل جاهز كمخرج نظيف أو handoff منظّم.', blockers: [] };
  }
  if (editorial.key === 'export-ready') {
    return { key: 'review-ready', reason: 'التحرير مكتمل تقريبًا لكن الإخراج النهائي ما زال يحتاج ربطًا تشغيليًا أو تحققيًا.', blockers: ['تأكيد readiness النهائية'] };
  }
  return { key: 'needs-follow-up', reason: 'ما زال هناك شيء يمنع الجاهزية النهائية.', blockers };
}

function recordPatchReadiness(record = null) {
  if (!record) return { key: 'not-ready', reason: 'لا يوجد سجل صالح.', blockers: ['السجل غير موجود'], changeCount: 0 };
  const draftEntry = editorialDraftEntries().find(item => item.slug === record.slug) || null;
  const patchEntries = patchConsoleEntries().filter(item => item.slug === record.slug);
  const verificationDrafts = verificationDraftEntries().filter(item => item.recordId === record.slug);
  const acceptedAgent = agentDraftEntries().filter(item => item.recordId === record.slug && item.status === 'accepted');
  const draftPayload = getDraft(record.slug);
  const merged = draftPayload ? { ...record, ...draftPayload } : record;
  const editorial = draftPayload ? editorialReadiness(merged) : null;
  const changeCount = draftPayload ? Object.keys(diffRecord(record, merged)).length : 0;
  const source = sourceVerificationState(merged);
  const district = districtVerificationState(merged);
  const confidence = confidenceVerificationState(merged);
  const latestDecision = latestVerificationDecisionForSlug(record.slug);
  const blockers = [];

  if (['duplicate', 'archived'].includes(record.status)) {
    return { key: 'hold', reason: 'السجل مؤرشف أو مكرر، لذلك لا يدخل في patch الآن.', blockers: ['السجل ليس ضمن نطاق التطبيق الحالي'], changeCount };
  }
  if (source.key === 'conflicting') blockers.push('المصدر متعارض');
  if (district.key === 'unresolved') blockers.push('الحي غير محسوم');
  if (confidence.key === 'blocked') blockers.push('الثقة منخفضة أو معلقة');
  if (latestDecision?.resolution === 'needs_deeper_review') blockers.push('قرار التحقق يحتاج مراجعة أعمق');
  if (editorial?.key === 'needs-completion') blockers.push(editorial.note);
  if (editorial?.key === 'not-ready') blockers.push('المسودة الحالية لا تزال ناقصة جدًا');

  if (!draftEntry && !draftPayload && !verificationDrafts.length && !acceptedAgent.length && !patchEntries.length) {
    return { key: 'not-ready', reason: 'لا توجد مسودة أو مخرج تحريري/تحققي يمكن تحويله إلى patch بعد.', blockers: ['ابدأ بمسودة أو handoff من الوكيل/التحقق'], changeCount };
  }
  if (source.key === 'conflicting') {
    return { key: 'hold', reason: 'السجل ما يزال في وضع لا ينبغي أن يدخل في patch الآن.', blockers, changeCount };
  }
  if (blockers.length) {
    return { key: 'follow-up-needed', reason: blockers[0], blockers, changeCount };
  }
  if (draftPayload && changeCount > 0 && editorial?.key === 'export-ready') {
    return {
      key: 'patch-ready',
      reason: patchEntries.length
        ? 'السجل يملك تغييرات واضحة ومخرج patch مرشحًا للمراجعة.'
        : 'التغييرات التحريرية مكتملة ويمكن تجهيزها كمرشح patch منضبط.',
      blockers: [],
      changeCount,
    };
  }
  if ((draftPayload && changeCount > 0) || verificationDrafts.length || acceptedAgent.length) {
    return {
      key: 'review-ready',
      reason: 'هناك تغييرات أو handoff واضحة، لكنها تحتاج مراجعة أخيرة قبل ضمها إلى patch candidate.',
      blockers: [],
      changeCount,
    };
  }
  return { key: 'not-ready', reason: 'لا توجد تغييرات فعلية كافية لإنتاج patch candidate الآن.', blockers: ['لا يوجد change set واضح'], changeCount };
}

function readinessSnapshot() {
  const records = state.records.map(record => ({ record, readiness: recordReadiness(record) }));
  const counts = {
    notReady: records.filter(item => item.readiness.key === 'not-ready').length,
    needsFollowup: records.filter(item => item.readiness.key === 'needs-follow-up').length,
    reviewReady: records.filter(item => item.readiness.key === 'review-ready').length,
    exportReady: records.filter(item => item.readiness.key === 'export-ready').length,
    publishReady: records.filter(item => item.readiness.key === 'publish-ready').length,
    hold: records.filter(item => item.readiness.key === 'hold').length,
  };
  const nearReady = records.filter(item => ['review-ready', 'export-ready'].includes(item.readiness.key)).slice(0, 8);
  const readyNow = records.filter(item => item.readiness.key === 'publish-ready').slice(0, 8);
  const blocked = records.filter(item => ['needs-follow-up', 'hold', 'not-ready'].includes(item.readiness.key)).slice(0, 8);
  const blockers = [
    { label: 'المصدر', count: records.filter(item => item.readiness.blockers.some(text => /المصدر/.test(text))).length },
    { label: 'الحي', count: records.filter(item => item.readiness.blockers.some(text => /الحي/.test(text))).length },
    { label: 'الثقة', count: records.filter(item => item.readiness.blockers.some(text => /الثقة/.test(text))).length },
    { label: 'المهمات/الجلسات', count: records.filter(item => item.readiness.blockers.some(text => /المهمة|جلسة التنفيذ/.test(text))).length },
  ].sort((a, b) => b.count - a.count);
  return { records, counts, nearReady, readyNow, blocked, blockers };
}

function resolutionImpactSnapshot() {
  const trackedQueues = [
    { key: 'quick-complete', title: 'إكمال سريع' },
    { key: 'missing-source', title: 'ناقص المصدر' },
    { key: 'low-confidence', title: 'ثقة منخفضة' },
    { key: 'needs-review', title: 'يحتاج مراجعة' },
    { key: 'missing-district', title: 'مشاكل الحي' },
  ];
  const records = state.records.map(record => {
    const patch = recordPatchReadiness(record);
    const readiness = recordReadiness(record);
    const draft = editorialDraftEntries().find(item => item.slug === record.slug) || null;
    const verificationDrafts = verificationDraftEntries().filter(item => item.recordId === record.slug);
    const acceptedAgent = agentDraftEntries().filter(item => item.recordId === record.slug && item.status === 'accepted');
    const patches = patchConsoleEntries().filter(item => item.slug === record.slug);
    return {
      record,
      patch,
      readiness,
      hasOutcome: Boolean(draft || verificationDrafts.length || acceptedAgent.length || patches.length),
      patches,
      verificationDrafts,
      acceptedAgent,
    };
  });
  const improved = records.filter(item => item.hasOutcome);
  const patchReady = records.filter(item => item.patch.key === 'patch-ready');
  const nearReady = records.filter(item => ['review-ready', 'patch-ready'].includes(item.patch.key));
  const solvedTypeMap = new Map();
  agentDraftEntries().filter(item => item.status === 'accepted').forEach(item => {
    const key = agentAllowedFieldLabel(item.targetField);
    solvedTypeMap.set(key, (solvedTypeMap.get(key) || 0) + 1);
  });
  verificationDraftEntries().forEach(item => {
    const key = item.targetLabel || agentAllowedFieldLabel(item.targetField);
    solvedTypeMap.set(key, (solvedTypeMap.get(key) || 0) + 1);
  });
  const solvedTypes = [...solvedTypeMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const queueImpact = trackedQueues.map(queue => {
    const items = attentionQueues()[queue.key]?.records() || [];
    const matched = items.map(item => records.find(entry => entry.record.slug === item.slug)).filter(Boolean);
    return {
      ...queue,
      total: matched.length,
      resolved: matched.filter(item => item.patch.key === 'patch-ready').length,
      improved: matched.filter(item => item.patch.key === 'review-ready').length,
      blocked: matched.filter(item => ['follow-up-needed', 'hold', 'not-ready'].includes(item.patch.key)).length,
    };
  });
  const stuck = queueImpact
    .map(item => ({ label: item.title, count: item.blocked }))
    .filter(item => item.count)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    improvedCount: improved.length,
    patchReadyCount: patchReady.length,
    nearReadyCount: nearReady.length,
    solvedTypes,
    queueImpact,
    stuck,
    patchReady: patchReady.slice(0, 8),
    nearReady: nearReady.slice(0, 8),
    followup: records.filter(item => item.patch.key === 'follow-up-needed').slice(0, 8),
  };
}

function finalPatchReviewEntries() {
  return getStoredList(finalPatchReviewStorageKey())
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

function finalPatchReviewBySlug(slug = '') {
  return finalPatchReviewEntries().find(item => item.slug === slug) || null;
}

function recordPatchChangeSet(record = null) {
  if (!record) return [];
  const draft = getDraft(record.slug);
  if (!draft) return [];
  const merged = { ...record, ...draft };
  const patch = diffRecord(record, merged);
  return Object.keys(patch).map(field => ({
    field,
    label: patchFieldLabel(field),
    currentValue: displayText(record[field]),
    suggestedValue: displayText(patch[field]),
  }));
}

function finalPatchReviewSnapshot() {
  const resolution = resolutionImpactSnapshot();
  const verificationDraftList = verificationDraftEntries();
  const verificationMap = new Map();
  verificationDraftList.forEach(item => {
    const list = verificationMap.get(item.recordId) || [];
    list.push(item);
    verificationMap.set(item.recordId, list);
  });
  const patchMap = new Map(patchConsoleEntries().map(item => [item.slug, item]));
  const candidates = resolution.improvedCount ? state.records
    .map(record => {
      const patch = recordPatchReadiness(record);
      const changeSet = recordPatchChangeSet(record);
      const verificationDrafts = verificationMap.get(record.slug) || [];
      const patchExport = patchMap.get(record.slug) || null;
      const acceptedAgentCount = agentDraftEntries().filter(item => item.recordId === record.slug && item.status === 'accepted').length;
      const hasMaterial = changeSet.length || verificationDrafts.length || patchExport || acceptedAgentCount;
      if (!hasMaterial) return null;
      const review = finalPatchReviewBySlug(record.slug);
      const caution = [
        ...(patch.blockers || []),
        verificationDrafts.length ? `${verificationDrafts.length} verification drafts ما زالت مؤثرة على قرار الحزمة` : '',
        patch.changeCount > 4 ? 'عدد التغييرات مرتفع ويستحق مرورًا أخيرًا' : '',
      ].filter(Boolean);
      const suggestedDecision = patch.key === 'patch-ready'
        ? 'approve'
        : patch.key === 'review-ready'
          ? 'rereview'
          : patch.key === 'follow-up-needed'
            ? 'hold'
            : 'exclude';
      return {
        slug: record.slug,
        record,
        patch,
        changeSet,
        verificationDrafts,
        patchExport,
        acceptedAgentCount,
        caution,
        review: review || {
          slug: record.slug,
          decision: suggestedDecision,
          reason: '',
          note: '',
          updatedAt: '',
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const order = { 'patch-ready': 0, 'review-ready': 1, 'follow-up-needed': 2, hold: 3, 'not-ready': 4 };
      return (order[a.patch.key] || 9) - (order[b.patch.key] || 9);
    })
    : [];
  const approved = candidates.filter(item => item.review.decision === 'approve');
  const held = candidates.filter(item => item.review.decision === 'hold');
  const excluded = candidates.filter(item => item.review.decision === 'exclude');
  const rereview = candidates.filter(item => item.review.decision === 'rereview');
  const unresolved = candidates.filter(item => item.patch.key !== 'patch-ready' || (item.patch.blockers || []).length);
  return { candidates, approved, held, excluded, rereview, unresolved };
}

function patchSignoffEntries() {
  return getStoredList(patchSignoffStorageKey())
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}

function patchSignoffForSlug(slug = '') {
  return patchSignoffEntries().find(item => item.slug === slug) || null;
}

function derivePatchSignoff(item = null) {
  if (!item) {
    return {
      decision: 'needs-final-rereview',
      reason: 'لا يوجد سجل صالح للتوقيع.',
      note: '',
      blockers: ['السجل غير موجود'],
      ready: false,
      updatedAt: '',
    };
  }
  const stored = patchSignoffForSlug(item.slug);
  const blockers = [
    item.review.decision !== 'approve' ? `قرار final review الحالي هو ${finalPatchDecisionLabel(item.review.decision)}` : '',
    item.patch.key !== 'patch-ready' ? `حالة patch الحالية: ${patchReadinessLabel(item.patch.key)}` : '',
    !item.changeSet.length ? 'لا توجد تغييرات نهائية واضحة داخل الحزمة' : '',
    ...(item.patch.blockers || []),
  ].filter(Boolean);
  const defaultDecision = item.review.decision === 'approve'
    ? (blockers.length ? 'needs-final-rereview' : 'ready-for-signoff')
    : ['hold', 'exclude'].includes(item.review.decision)
      ? 'hold-before-apply'
      : 'needs-final-rereview';
  return {
    slug: item.slug,
    recordName: item.record.name || item.slug,
    decision: stored?.decision || defaultDecision,
    reason: stored?.reason || item.review.reason || item.patch.reason,
    note: stored?.note || '',
    blockers,
    ready: !blockers.length,
    updatedAt: stored?.updatedAt || '',
  };
}

function patchApplySimulationSnapshot() {
  const review = finalPatchReviewSnapshot();
  const items = review.candidates.map(item => {
    const signoff = derivePatchSignoff(item);
    return {
      ...item,
      signoff,
      simulatedChanges: item.changeSet.map(change => ({
        ...change,
        preview: `${change.currentValue} ← ${change.suggestedValue}`,
      })),
      affectedFields: item.changeSet.map(change => change.field),
      affectedCount: item.changeSet.length,
    };
  });
  const readyForSignoff = items.filter(item => item.signoff.decision === 'ready-for-signoff');
  const signedOff = items.filter(item => item.signoff.decision === 'signed-off');
  const held = items.filter(item => item.signoff.decision === 'hold-before-apply');
  const rereview = items.filter(item => item.signoff.decision === 'needs-final-rereview');
  const approvedBundle = signedOff.filter(item => item.signoff.ready);
  const blocked = items.filter(item => !item.signoff.ready || item.signoff.decision !== 'signed-off');
  const blockersMap = new Map();
  blocked.forEach(item => {
    (item.signoff.blockers.length ? item.signoff.blockers : [patchSignoffLabel(item.signoff.decision)]).forEach(text => {
      blockersMap.set(text, (blockersMap.get(text) || 0) + 1);
    });
  });
  return {
    items,
    readyForSignoff,
    signedOff,
    held,
    rereview,
    approvedBundle,
    blocked,
    validation: {
      total: items.length,
      signedOff: signedOff.length,
      readyForSignoff: readyForSignoff.length,
      held: held.length,
      rereview: rereview.length,
      validForBundle: approvedBundle.length,
      blocked: blocked.length,
      blockers: [...blockersMap.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8),
    },
  };
}

function saveFinalPatchDecision({ slug = '', decision = 'rereview', reason = '', note = '' } = {}) {
  const record = getEntity(slug);
  if (!record) return null;
  const patch = recordPatchReadiness(record);
  const entry = {
    id: `final-patch-review:${slug}`,
    slug,
    recordName: record.name || slug,
    decision,
    reason: reason || patch.reason,
    note: note || '',
    patchKey: patch.key,
    updatedAt: new Date().toISOString(),
  };
  upsertStoredItem(finalPatchReviewStorageKey(), entry, 'id');
  return entry;
}

function savePatchSignoffDecision({ slug = '', decision = 'ready-for-signoff', reason = '', note = '' } = {}) {
  const record = getEntity(slug);
  if (!record) return null;
  const reviewItem = finalPatchReviewSnapshot().candidates.find(item => item.slug === slug);
  if (!reviewItem) return null;
  const signoff = derivePatchSignoff(reviewItem);
  const entry = {
    id: `patch-signoff:${slug}`,
    slug,
    recordName: record.name || slug,
    decision,
    reason: reason || signoff.reason,
    note: note || '',
    blockers: signoff.blockers,
    updatedAt: new Date().toISOString(),
  };
  upsertStoredItem(patchSignoffStorageKey(), entry, 'id');
  return entry;
}

function releasePackEntries() {
  return getStoredList(releasePackStorageKey());
}

function releasePackStatusLabel(status = '') {
  return ({
    draft: 'مسودة حزمة',
    review: 'بانتظار اعتماد',
    exportable: 'قابلة للتسليم',
    candidate: 'مرشحة للنشر',
    hold: 'مؤجلة',
  }[status] || 'مسودة حزمة');
}

function releasePackStatusTone(status = '') {
  return ({
    draft: 'muted',
    review: 'queue',
    exportable: 'success',
    candidate: 'success',
    hold: 'warning',
  }[status] || 'muted');
}

function derivedReleasePacks() {
  const readiness = readinessSnapshot();
  const decisions = verificationDecisionEntries();
  const execution = missionExecutionSnapshot();
  const resolution = resolutionImpactSnapshot();
  return [
    {
      id: 'pack-patch-candidates',
      title: 'مرشحو patch الجاهزون',
      kind: 'patch',
      itemIds: resolution.patchReady.map(item => item.record.slug),
      status: resolution.patchReady.length ? 'exportable' : 'draft',
      summary: 'سجلات تملك change set واضحًا ويمكن عرضها كمرشحين للتطبيق المنضبط لاحقًا.',
      nextStep: 'مراجعة الحزمة تحريريًا ثم اعتمادها كـ patch candidate bundle.',
    },
    {
      id: 'pack-editorial-ready',
      title: 'سجلات جاهزة تحريريًا',
      kind: 'editorial',
      itemIds: resolution.nearReady.map(item => item.record.slug),
      status: resolution.nearReady.length ? 'review' : 'draft',
      summary: 'سجلات خرجت من طور التشغيل إلى طور الجاهزية التحريرية/المراجعة الأخيرة.',
      nextStep: 'مرور أخير على التناسق ثم ترقية ما يصلح إلى patch-ready.',
    },
    {
      id: 'pack-verification-cleared',
      title: 'مخرجات تحقق قابلة للتسليم',
      kind: 'verification',
      itemIds: verificationDraftEntries().map(item => item.id),
      status: verificationDraftEntries().length ? 'exportable' : 'draft',
      summary: 'مخرجات تحقق تم handoff لها وأصبحت قابلة للمراجعة ضمن الحزم.',
      nextStep: 'راجع verification drafts ثم حوّل المناسب منها إلى drafts تحريرية أو follow-up.',
    },
    {
      id: 'pack-followup-needed-records',
      title: 'سجلات ما زالت تحتاج متابعة',
      kind: 'followup',
      itemIds: resolution.followup.map(item => item.record.slug),
      status: resolution.followup.length ? 'hold' : 'draft',
      summary: 'عناصر ما زالت تحتاج حسمًا قبل أن تدخل أي patch مرشحة.',
      nextStep: 'استكمال المصدر/الحي/الثقة أو إغلاق العوائق قبل التفكير في التطبيق.',
    },
    {
      id: 'pack-records-ready',
      title: 'سجلات قريبة من الاعتماد',
      kind: 'records',
      itemIds: readiness.nearReady.map(item => item.record.slug),
      status: readiness.nearReady.length ? 'review' : 'draft',
      summary: 'السجلات الأقرب للتحول إلى مخرج فعلي بعد مرور قصير.',
      nextStep: 'مراجعة سريعة ثم اعتماد أو رفع إلى publish-ready.',
    },
    {
      id: 'pack-review-decisions',
      title: 'قرارات جاهزة للتسليم',
      kind: 'decisions',
      itemIds: decisions.filter(item => ['ready_for_editorial_action', 'ready_for_followup'].includes(item.resolution)).map(item => item.id),
      status: decisions.some(item => ['ready_for_editorial_action', 'ready_for_followup'].includes(item.resolution)) ? 'exportable' : 'draft',
      summary: 'قرارات تحقق ناضجة يمكن تسليمها أو ضمها إلى حزمة اعتماد.',
      nextStep: 'تسليمها للتحرير أو follow-up بحسب نوع القرار.',
    },
    {
      id: 'pack-followup-outputs',
      title: 'مخرجات تنفيذ قابلة للتسليم',
      kind: 'sessions',
      itemIds: execution.sessions.filter(item => ['handoff', 'completed'].includes(item.status)).map(item => item.id),
      status: execution.sessions.some(item => ['handoff', 'completed'].includes(item.status)) ? 'exportable' : 'draft',
      summary: 'مخرجات sessions التي أصبحت قابلة للتصدير أو handoff.',
      nextStep: 'تصدير الحزمة أو إلحاقها بمتابعة تحريرية/تشغيلية.',
    },
    {
      id: 'pack-candidate-release',
      title: 'حزمة مرشحة للنشر',
      kind: 'publish',
      itemIds: readiness.readyNow.map(item => item.record.slug),
      status: readiness.readyNow.length ? 'candidate' : 'draft',
      summary: 'السجلات الأكثر جاهزية للإخراج النهائي الآن.',
      nextStep: 'مراجعة نهائية ثم اعتمادها كحزمة نشر أولية.',
    },
  ];
}

function releasePackPlan() {
  const storedById = new Map(releasePackEntries().map(item => [item.id, item]));
  return derivedReleasePacks().map(pack => ({ ...pack, ...(storedById.get(pack.id) || {}), updatedAt: storedById.get(pack.id)?.updatedAt || new Date().toISOString() }));
}

function exportableReleasePackPayload(packId = '') {
  const pack = releasePackPlan().find(item => item.id === packId);
  if (!pack) return null;
  return {
    id: pack.id,
    title: pack.title,
    kind: pack.kind,
    status: pack.status,
    summary: pack.summary,
    nextStep: pack.nextStep,
    itemIds: pack.itemIds,
    updatedAt: new Date().toISOString(),
  };
}

function exportReleasePack(packId = '', format = 'json') {
  const payload = exportableReleasePackPayload(packId);
  if (!payload) return false;
  if (format === 'summary') {
    downloadText(`${packId}-summary.txt`, [`Pack: ${payload.title}`, `Status: ${payload.status}`, `Items: ${payload.itemIds.length}`, `Summary: ${payload.summary}`, `Next: ${payload.nextStep}`].join('\n'));
  } else if (format === 'csv') {
    downloadText(`${packId}.csv`, ['item_id', ...payload.itemIds].join('\n'), 'text/csv;charset=utf-8');
  } else {
    downloadJson(`${packId}.json`, payload);
  }
  upsertStoredItem(releasePackStorageKey(), { id: packId, updatedAt: new Date().toISOString(), status: payload.status }, 'id');
  return true;
}

function exportableFinalPatchBundle() {
  const review = finalPatchReviewSnapshot();
  return {
    id: `final-patch-bundle:${Date.now()}`,
    title: 'Final Patch Candidate Bundle',
    exportedAt: new Date().toISOString(),
    approved: review.approved.map(item => ({
      slug: item.slug,
      name: item.record.name,
      patchReadiness: item.patch.key,
      reason: item.review.reason || item.patch.reason,
      note: item.review.note || '',
      changes: item.changeSet.map(change => ({
        field: change.field,
        label: change.label,
        currentValue: change.currentValue,
        suggestedValue: change.suggestedValue,
      })),
    })),
    held: review.held.map(item => ({
      slug: item.slug,
      name: item.record.name,
      reason: item.review.reason || item.patch.reason,
      note: item.review.note || '',
      blockers: item.caution,
    })),
    excluded: review.excluded.map(item => ({
      slug: item.slug,
      name: item.record.name,
      reason: item.review.reason || item.patch.reason,
      note: item.review.note || '',
    })),
    rereview: review.rereview.map(item => ({
      slug: item.slug,
      name: item.record.name,
      reason: item.review.reason || item.patch.reason,
      note: item.review.note || '',
    })),
    unresolved: review.unresolved.map(item => ({
      slug: item.slug,
      name: item.record.name,
      blockers: item.patch.blockers || [],
    })),
    summary: {
      approved: review.approved.length,
      held: review.held.length,
      excluded: review.excluded.length,
      rereview: review.rereview.length,
      unresolved: review.unresolved.length,
    },
  };
}

function exportableFinalPatchBundleCsv() {
  const payload = exportableFinalPatchBundle();
  const lines = [
    ['slug', 'name', 'decision', 'reason', 'note', 'change_count', 'changes'].join(','),
    ...[
      ...payload.approved.map(item => [item.slug, item.name, 'approve', item.reason, item.note, item.changes.length, item.changes.map(change => `${change.label}: ${change.suggestedValue}`).join(' | ')]),
      ...payload.held.map(item => [item.slug, item.name, 'hold', item.reason, item.note, 0, item.blockers.join(' | ')]),
      ...payload.excluded.map(item => [item.slug, item.name, 'exclude', item.reason, item.note, 0, '']),
      ...payload.rereview.map(item => [item.slug, item.name, 'rereview', item.reason, item.note, 0, '']),
    ].map(row => row.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')),
  ];
  return lines.join('\n');
}

function exportableFinalPatchBundleSummary() {
  const payload = exportableFinalPatchBundle();
  return [
    `Bundle: ${payload.title}`,
    `Exported: ${payload.exportedAt}`,
    `Approved: ${payload.summary.approved}`,
    `Held: ${payload.summary.held}`,
    `Excluded: ${payload.summary.excluded}`,
    `Needs re-review: ${payload.summary.rereview}`,
    `Unresolved blockers: ${payload.summary.unresolved}`,
    '',
    `Approved slugs: ${payload.approved.map(item => item.slug).join('، ') || 'لا يوجد'}`,
    `Held slugs: ${payload.held.map(item => item.slug).join('، ') || 'لا يوجد'}`,
    `Excluded slugs: ${payload.excluded.map(item => item.slug).join('، ') || 'لا يوجد'}`,
  ].join('\n');
}

function exportFinalPatchBundle(format = 'json') {
  const payload = exportableFinalPatchBundle();
  if (format === 'csv') {
    downloadText('final-patch-bundle.csv', exportableFinalPatchBundleCsv(), 'text/csv;charset=utf-8');
  } else if (format === 'summary') {
    downloadText('final-patch-bundle-summary.txt', exportableFinalPatchBundleSummary());
  } else {
    downloadJson('final-patch-bundle.json', payload);
  }
  upsertStoredItem(releasePackStorageKey(), {
    id: 'final-patch-bundle',
    updatedAt: new Date().toISOString(),
    status: payload.summary.approved ? 'exportable' : 'draft',
    summary: `Approved ${payload.summary.approved} • Held ${payload.summary.held} • Excluded ${payload.summary.excluded}`,
  }, 'id');
  return true;
}

function exportablePatchApplySimulation() {
  const simulation = patchApplySimulationSnapshot();
  return {
    id: `patch-apply-simulation:${Date.now()}`,
    title: 'Patch Apply Simulation Summary',
    exportedAt: new Date().toISOString(),
    summary: simulation.validation,
    signedOff: simulation.signedOff.map(item => ({
      slug: item.slug,
      name: item.record.name,
      status: item.signoff.decision,
      reason: item.signoff.reason,
      note: item.signoff.note,
      affectedFields: item.affectedFields,
      changes: item.simulatedChanges,
    })),
    readyForSignoff: simulation.readyForSignoff.map(item => ({
      slug: item.slug,
      name: item.record.name,
      status: item.signoff.decision,
      reason: item.signoff.reason,
      blockers: item.signoff.blockers,
    })),
    blocked: simulation.blocked.map(item => ({
      slug: item.slug,
      name: item.record.name,
      status: item.signoff.decision,
      reason: item.signoff.reason,
      blockers: item.signoff.blockers,
    })),
  };
}

function exportablePatchSignoffReport() {
  const simulation = patchApplySimulationSnapshot();
  return {
    id: `patch-signoff-report:${Date.now()}`,
    title: 'Patch Sign-off Report',
    exportedAt: new Date().toISOString(),
    summary: simulation.validation,
    signedOff: simulation.signedOff.map(item => ({
      slug: item.slug,
      name: item.record.name,
      reason: item.signoff.reason,
      note: item.signoff.note,
      changes: item.simulatedChanges.length,
    })),
    hold: simulation.held.map(item => ({
      slug: item.slug,
      name: item.record.name,
      reason: item.signoff.reason,
      note: item.signoff.note,
      blockers: item.signoff.blockers,
    })),
    rereview: simulation.rereview.map(item => ({
      slug: item.slug,
      name: item.record.name,
      reason: item.signoff.reason,
      note: item.signoff.note,
      blockers: item.signoff.blockers,
    })),
  };
}

function exportableFinalApprovedPatchBundle() {
  const simulation = patchApplySimulationSnapshot();
  return {
    id: `final-approved-patch-bundle:${Date.now()}`,
    title: 'Final Approved Patch Bundle',
    exportedAt: new Date().toISOString(),
    records: simulation.approvedBundle.map(item => ({
      slug: item.slug,
      name: item.record.name,
      reason: item.signoff.reason,
      note: item.signoff.note,
      changes: item.simulatedChanges.map(change => ({
        field: change.field,
        label: change.label,
        currentValue: change.currentValue,
        suggestedValue: change.suggestedValue,
      })),
    })),
    summary: {
      records: simulation.approvedBundle.length,
      fields: simulation.approvedBundle.reduce((sum, item) => sum + item.affectedCount, 0),
    },
  };
}

function exportablePatchBlockedReport() {
  const simulation = patchApplySimulationSnapshot();
  return {
    id: `patch-blocked-report:${Date.now()}`,
    title: 'Hold / Blocked Items Report',
    exportedAt: new Date().toISOString(),
    blocked: simulation.blocked.map(item => ({
      slug: item.slug,
      name: item.record.name,
      signoff: item.signoff.decision,
      reason: item.signoff.reason,
      blockers: item.signoff.blockers,
      caution: item.caution,
    })),
    summary: simulation.validation,
  };
}

function exportPatchSignoffOutput(kind = 'simulation', format = 'json') {
  const payload = kind === 'signoff'
    ? exportablePatchSignoffReport()
    : kind === 'approved'
      ? exportableFinalApprovedPatchBundle()
      : kind === 'blocked'
        ? exportablePatchBlockedReport()
        : exportablePatchApplySimulation();
  const baseName = ({
    simulation: 'patch-apply-simulation',
    signoff: 'patch-signoff-report',
    approved: 'final-approved-patch-bundle',
    blocked: 'patch-blocked-report',
  }[kind] || 'patch-apply-simulation');
  if (format === 'summary') {
    const lines = [
      `Report: ${payload.title}`,
      `Exported: ${payload.exportedAt}`,
      ...Object.entries(payload.summary || {}).map(([key, value]) => `${key}: ${value}`),
    ];
    if (Array.isArray(payload.records)) lines.push('', `Records: ${payload.records.map(item => item.slug).join('، ') || 'لا يوجد'}`);
    if (Array.isArray(payload.blocked)) lines.push('', `Blocked: ${payload.blocked.map(item => item.slug).join('، ') || 'لا يوجد'}`);
    if (Array.isArray(payload.signedOff)) lines.push('', `Signed-off: ${payload.signedOff.map(item => item.slug).join('، ') || 'لا يوجد'}`);
    downloadText(`${baseName}-summary.txt`, lines.join('\n'));
  } else if (format === 'csv') {
    const rows = Array.isArray(payload.records)
      ? payload.records.map(item => [item.slug, item.name, item.reason, item.note || '', item.changes?.length || 0])
      : Array.isArray(payload.blocked)
        ? payload.blocked.map(item => [item.slug, item.name, item.signoff || '', item.reason, (item.blockers || []).join(' | ')])
        : Array.isArray(payload.signedOff)
          ? payload.signedOff.map(item => [item.slug, item.name, item.reason, item.note || '', item.changes || item.affectedFields?.length || 0])
          : [];
    const csv = [
      ['slug', 'name', 'status_or_reason', 'note_or_reason', 'extra'].join(','),
      ...rows.map(row => row.map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')),
    ].join('\n');
    downloadText(`${baseName}.csv`, csv, 'text/csv;charset=utf-8');
  } else {
    downloadJson(`${baseName}.json`, payload);
  }
  return true;
}

function verificationFollowupBuckets() {
  const buckets = {
    needs_new_evidence: [],
    human_review: [],
    needs_source: [],
    needs_district: [],
    ready_later: [],
  };
  state.records.forEach(record => {
    const source = sourceVerificationState(record);
    const district = districtVerificationState(record);
    const confidence = confidenceVerificationState(record);
    const evidence = evidenceForSlug(record.slug);
    const hasAttempt = evidence.length > 0;
    if (source.key === 'missing' || source.key === 'weak') buckets.needs_source.push(record);
    if (district.key === 'unresolved' || district.key === 'weak') buckets.needs_district.push(record);
    if (source.key === 'conflicting' || confidence.key === 'blocked') buckets.human_review.push(record);
    if (!hasAttempt && (source.key !== 'verified' || district.key !== 'verified')) buckets.needs_new_evidence.push(record);
    if (hasAttempt && ['review', 'escalate'].includes(confidence.key)) buckets.ready_later.push(record);
  });
  return buckets;
}

function coverageExpansionPlanner() {
  const districtMap = {};
  state.records.forEach(record => {
    const districtName = displayText(record.district);
    if (!districtMap[districtName]) {
      districtMap[districtName] = { name: districtName, total: 0, weak: 0, source: 0, confidence: 0 };
    }
    districtMap[districtName].total += 1;
    if (['unresolved', 'weak', 'needs-review'].includes(districtVerificationState(record).key)) districtMap[districtName].weak += 1;
    if (['missing', 'weak', 'review', 'conflicting'].includes(sourceVerificationState(record).key)) districtMap[districtName].source += 1;
    if (['blocked', 'escalate', 'review'].includes(confidenceVerificationState(record).key)) districtMap[districtName].confidence += 1;
  });
  const weakDistricts = Object.values(districtMap)
    .map(item => ({ ...item, score: (item.weak * 3) + (item.source * 2) + item.confidence }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  const sectorMap = sectorTree().flatMap(group => group.children).map(child => {
    const records = state.records.filter(record => record.sector === child.key);
    const weakCount = records.filter(record => ['missing', 'weak', 'review', 'conflicting'].includes(sourceVerificationState(record).key) || ['unresolved', 'weak', 'needs-review'].includes(districtVerificationState(record).key) || ['blocked', 'escalate', 'review'].includes(confidenceVerificationState(record).key)).length;
    return {
      key: child.key,
      title: child.title,
      status: child.status,
      records: records.length,
      weakCount,
    };
  }).sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (a.status !== 'active' && b.status === 'active') return 1;
    return b.weakCount - a.weakCount;
  });

  const nextBatch = weakDistricts.slice(0, 3).map(item => ({
    title: item.name,
    note: `${item.weak} مشكلة حي • ${item.source} مشكلة مصدر • ${item.confidence} ثقة تحتاج رفع`,
  }));

  return { weakDistricts, sectorMap, nextBatch };
}

function getReviewSession(queueKey = 'needs-review') {
  try {
    const raw = JSON.parse(localStorage.getItem(reviewSessionStorageKey(queueKey)) || 'null');
    if (raw && typeof raw === 'object') {
      raw.decisions ||= {};
      Object.entries(raw.decisions).forEach(([slug, value]) => {
        if (typeof value === 'string') {
          raw.decisions[slug] = {
            decision: value,
            reason: '',
            note: '',
            executionStatus: 'pending_export',
            nextAction: '',
            updatedAt: new Date().toISOString(),
          };
        }
      });
      raw.startedAt ||= '';
      return raw;
    }
  } catch {}
  return { currentSlug: '', decisions: {}, startedAt: '', finishedAt: '', exportedAt: '' };
}

function saveReviewSession(queueKey = 'needs-review', session = {}) {
  localStorage.setItem(reviewSessionStorageKey(queueKey), JSON.stringify(session));
}

function sessionLifecycleLabel(status = '') {
  return ({
    new: 'جديدة',
    in_progress: 'قيد المراجعة',
    completed: 'اكتملت',
    followup: 'تحتاج متابعة',
    exported: 'تم تصديرها',
  }[status] || 'غير مصنفة');
}

function sessionLifecycleTone(status = '') {
  return ({
    new: 'muted',
    in_progress: 'queue',
    completed: 'success',
    followup: 'warning',
    exported: 'success',
  }[status] || 'muted');
}

function bulkBatchKeys() {
  return ['needs-review', 'missing-district', 'missing-source', 'quick-complete', 'new-incomplete'];
}

function bulkDecisionLabel(decision = '') {
  return ({
    done: 'تمت المعالجة',
    skip: 'تم التخطي',
    defer: 'تم التأجيل',
    deep: 'مراجعة أعمق',
    completion: 'يحتاج إكمالًا',
    followup: 'جاهز للمتابعة لاحقًا',
  }[decision] || 'قيد العمل');
}

function bulkDecisionTone(decision = '') {
  return ({
    done: 'success',
    skip: 'muted',
    defer: 'warning',
    deep: 'queue',
    completion: 'gold',
    followup: 'muted',
  }[decision] || 'muted');
}

function bulkExecutionMeta(decision = '', record = null, queueKey = 'needs-review') {
  const defaults = {
    done: { nextAction: 'لا يوجد إجراء فوري، جاهز للتصدير', followup: 'resolved' },
    skip: { nextAction: 'ترك السجل داخل الدفعة الحالية بدون تنفيذ', followup: 'remaining' },
    defer: { nextAction: 'إرجاعه إلى قائمة المتابعة اللاحقة', followup: 'deferred' },
    deep: { nextAction: 'نقله إلى مراجعة أعمق أو تحقق إضافي', followup: 'deep_review' },
    completion: { nextAction: 'تجهيزه في قائمة الإكمال السريع', followup: 'needs_completion' },
    followup: { nextAction: 'مراجعته لاحقًا ضمن دفعة متابعة', followup: 'ready_later' },
  };
  const meta = defaults[decision] || defaults.skip;
  const missing = record ? importantMissingFields(record) : [];
  const executionStatus = decision === 'skip' ? 'not_executed' : 'ready_for_export';
  return {
    ...meta,
    executionStatus,
    reason: record ? attentionQueues()[queueKey].reason(record) : '',
    missing,
  };
}

function bulkDecisionEntry(record, queueKey = 'needs-review', decision = 'done', note = '') {
  const meta = bulkExecutionMeta(decision, record, queueKey);
  return {
    decision,
    reason: meta.reason,
    note: String(note || '').trim(),
    executionStatus: meta.executionStatus,
    nextAction: meta.nextAction,
    followup: meta.followup,
    updatedAt: new Date().toISOString(),
  };
}

function bulkDecisionValue(session = {}, slug = '') {
  return session.decisions?.[slug] || null;
}

function bulkSessionFollowup(workspace) {
  const buckets = {
    resolved: [],
    deferred: [],
    deep_review: [],
    needs_source: [],
    needs_district: [],
    needs_completion: [],
    ready_later: [],
  };
  workspace.items.forEach(item => {
    const entry = bulkDecisionValue(workspace.session, item.slug);
    if (!entry) return;
    if (entry.followup === 'resolved') buckets.resolved.push(item);
    if (entry.followup === 'deferred') buckets.deferred.push(item);
    if (entry.followup === 'deep_review') buckets.deep_review.push(item);
    if (entry.followup === 'needs_completion') buckets.needs_completion.push(item);
    if (entry.followup === 'ready_later') buckets.ready_later.push(item);
    if (!String(item.reference_url || '').trim()) buckets.needs_source.push(item);
    if (!String(item.district || '').trim() || String(item.district).trim() === 'غير متحقق') buckets.needs_district.push(item);
  });
  return buckets;
}

function bulkSessionSummary(workspace) {
  const followup = bulkSessionFollowup(workspace);
  const decisionCounts = {
    done: workspace.items.filter(item => bulkDecisionValue(workspace.session, item.slug)?.decision === 'done').length,
    skip: workspace.items.filter(item => bulkDecisionValue(workspace.session, item.slug)?.decision === 'skip').length,
    defer: workspace.items.filter(item => bulkDecisionValue(workspace.session, item.slug)?.decision === 'defer').length,
    deep: workspace.items.filter(item => bulkDecisionValue(workspace.session, item.slug)?.decision === 'deep').length,
    completion: workspace.items.filter(item => bulkDecisionValue(workspace.session, item.slug)?.decision === 'completion').length,
    followup: workspace.items.filter(item => bulkDecisionValue(workspace.session, item.slug)?.decision === 'followup').length,
  };
  return { decisionCounts, followup };
}

function reviewSessionRegistry() {
  return bulkBatchKeys().map(queueKey => {
    const session = getReviewSession(queueKey);
    const workspace = bulkWorkspaceState(queueKey);
    const decisionsCount = Object.keys(session.decisions || {}).length;
    let status = 'new';
    if (session.exportedAt) status = 'exported';
    else if (workspace.summary.followup.deferred.length || workspace.summary.followup.deep_review.length || workspace.summary.followup.needs_completion.length) status = 'followup';
    else if (session.finishedAt) status = 'completed';
    else if (decisionsCount) status = 'in_progress';
    return {
      id: `${queueKey}-${session.startedAt || 'draft'}`,
      queueKey,
      queueTitle: queueTitleByKey(queueKey),
      startedAt: session.startedAt || '',
      updatedAt: Object.values(session.decisions || {}).map(item => item.updatedAt).sort().pop() || session.finishedAt || session.exportedAt || '',
      status,
      total: workspace.counts.total,
      done: workspace.counts.done,
      deferred: workspace.counts.defer,
      deep: workspace.counts.deep,
      completion: workspace.counts.completion,
      followup: workspace.counts.followup,
      remaining: workspace.counts.remaining,
      finishedAt: session.finishedAt || '',
      exportedAt: session.exportedAt || '',
      priority: workspace.view.activePriority,
      sort: workspace.view.sortMode,
      followupSummary: workspace.summary.followup,
    };
  });
}

function bulkWorkspaceState(queueKey = 'needs-review') {
  const view = queueViewState(queueKey);
  const items = view.activeGroup.items;
  const session = getReviewSession(queueKey);
  const currentSlug = items.some(item => item.slug === session.currentSlug) ? session.currentSlug : (items[0]?.slug || '');
  const currentIndex = items.findIndex(item => item.slug === currentSlug);
  const current = items[currentIndex] || null;
  const counts = {
    total: items.length,
    done: items.filter(item => bulkDecisionValue(session, item.slug)?.decision === 'done').length,
    defer: items.filter(item => bulkDecisionValue(session, item.slug)?.decision === 'defer').length,
    deep: items.filter(item => bulkDecisionValue(session, item.slug)?.decision === 'deep').length,
    completion: items.filter(item => bulkDecisionValue(session, item.slug)?.decision === 'completion').length,
    followup: items.filter(item => bulkDecisionValue(session, item.slug)?.decision === 'followup').length,
    remaining: items.filter(item => !bulkDecisionValue(session, item.slug)).length,
  };
  const summary = bulkSessionSummary({ items, session });
  return {
    queueKey,
    queueTitle: queueTitleByKey(queueKey),
    view,
    items,
    session: { ...session, currentSlug },
    currentIndex,
    current,
    counts,
    summary,
  };
}

function renderBulkBatchPicker(activeKey = 'needs-review') {
  return `
    <div class="bulk-batch-grid">
      ${bulkBatchKeys().map(key => {
        const view = queueViewState(key);
        return `
          <a href="#/bulk/${key}?priority=${encodeURIComponent(view.activePriority)}&sort=${encodeURIComponent(view.sortMode)}" class="bulk-batch-card ${key === activeKey ? 'is-active' : ''}">
            <strong>${queueTitleByKey(key)}</strong>
            <span>${view.activeGroup.items.length} سجل في الدفعة الحالية</span>
          </a>
        `;
      }).join('')}
    </div>
  `;
}

function renderBulkWorkspace(queueKey = 'needs-review') {
  const queueMap = attentionQueues();
  const activeKey = queueMap[queueKey] ? queueKey : 'needs-review';
  const workspace = bulkWorkspaceState(activeKey);
  const current = workspace.current;
  const currentDecision = current ? bulkDecisionValue(workspace.session, current.slug) : null;
  return `
    <div class="hero hero-compact page-hero operator-hero">
      <div class="section-kicker">جلسة مراجعة جماعية</div>
      <h3>${workspace.queueTitle}</h3>
      <p>مساحة عمل واحدة لمراجعة دفعة كاملة بسرعة، مع تقدم واضح وتنقل متتابع وقرارات سريعة لكل سجل.</p>
      <div class="hero-actions">
        <a href="${queueHref(activeKey, { priority: workspace.view.activePriority, sort: workspace.view.sortMode })}" class="button">العودة إلى الصف</a>
        <a href="#/dashboard" class="button">لوحة التشغيل</a>
        ${current ? `<a href="${entityHref(current.slug, { queue: activeKey, priority: workspace.view.activePriority, sort: workspace.view.sortMode, edit: true })}" class="button primary">فتح السجل في workbench</a>` : ''}
      </div>
    </div>
    <div class="bulk-shell section">
      ${renderBulkBatchPicker(activeKey)}
      ${renderQueuePriorityBar(activeKey, workspace.view.groups, workspace.view.activePriority)}
      ${renderQueueSortBar(activeKey)}
      <div class="bulk-progress-grid">
        <div class="card mini-panel emphasis-panel"><div class="metric">${workspace.counts.total}</div><div class="metric-sub">إجمالي الدفعة</div></div>
        <div class="card mini-panel"><div class="metric">${workspace.counts.done}</div><div class="metric-sub">تمت معالجته</div></div>
        <div class="card mini-panel"><div class="metric">${workspace.counts.defer}</div><div class="metric-sub">مؤجل</div></div>
        <div class="card mini-panel"><div class="metric">${workspace.counts.deep}</div><div class="metric-sub">مراجعة أعمق</div></div>
        <div class="card mini-panel"><div class="metric">${workspace.counts.remaining}</div><div class="metric-sub">متبقٍ</div></div>
      </div>
      <div class="bulk-execution-panel">
        <div class="card">
          <div class="section-header">
            <div>
          <div class="section-kicker">التنفيذ</div>
          <h3>لوحة تنفيذ الدفعة</h3>
            </div>
            <div class="actions">
              <button class="button gold" type="button" data-action="bulk-finish" data-queue="${activeKey}">إنهاء الجلسة</button>
              <button class="button" type="button" data-action="bulk-export" data-queue="${activeKey}" data-format="json">تصدير JSON</button>
              <button class="button" type="button" data-action="bulk-export" data-queue="${activeKey}" data-format="csv">تصدير CSV</button>
              <button class="button primary" type="button" data-action="bulk-export" data-queue="${activeKey}" data-format="summary">تصدير الملخص</button>
            </div>
          </div>
          <div class="bulk-summary-grid">
            <div class="triage-list-item"><strong>تمت المعالجة</strong><span>${workspace.summary.decisionCounts.done} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج إكمالًا</strong><span>${workspace.summary.decisionCounts.completion} سجل</span></div>
            <div class="triage-list-item"><strong>جاهز للمتابعة لاحقًا</strong><span>${workspace.summary.decisionCounts.followup} سجل</span></div>
            <div class="triage-list-item"><strong>مؤجل</strong><span>${workspace.summary.decisionCounts.defer} سجل</span></div>
            <div class="triage-list-item"><strong>مراجعة أعمق</strong><span>${workspace.summary.decisionCounts.deep} سجل</span></div>
            <div class="triage-list-item"><strong>اكتملت الجلسة؟</strong><span>${workspace.session.finishedAt ? `نعم • ${workspace.session.finishedAt}` : 'ليس بعد'}</span></div>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">المتابعة</div>
          <h3>ما بعد الجلسة</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>تم حسمه داخل الجلسة</strong><span>${workspace.summary.followup.resolved.length} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج مراجعة أعمق</strong><span>${workspace.summary.followup.deep_review.length} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج عملًا على المصدر</strong><span>${workspace.summary.followup.needs_source.length} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج عملًا على الحي</strong><span>${workspace.summary.followup.needs_district.length} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج إكمالًا</strong><span>${workspace.summary.followup.needs_completion.length} سجل</span></div>
          </div>
        </div>
      </div>
      ${current ? `
        <div class="bulk-layout">
          <div class="bulk-main">
            <div class="card bulk-current-card">
              <div class="section-header">
                <div>
                  <div class="section-kicker">العنصر الحالي</div>
                  <h3>${esc(current.name)}</h3>
                  <p class="note">${esc(current.editorial_summary || current.why_choose_it || 'سجل يحتاج قرارًا سريعًا داخل هذه الجلسة.')}</p>
                </div>
                <div class="actions">
                  <span class="queue-priority-level ${queuePriorityBadge(current, activeKey) === 'عالية' ? 'is-high' : queuePriorityBadge(current, activeKey) === 'متوسطة' ? 'is-medium' : ''}">أولوية ${esc(queuePriorityBadge(current, activeKey))}</span>
                  <span class="queue-reason">${esc(attentionQueues()[activeKey].reason(current))}</span>
                </div>
              </div>
              <div class="bulk-current-grid">
                <div class="triage-list">
                  <div class="triage-list-item"><strong>سبب وجوده هنا</strong><span>${esc(attentionQueues()[activeKey].reason(current))}</span></div>
                  <div class="triage-list-item"><strong>ما ينقصه</strong><span>${esc(importantMissingFields(current).join('، ') || 'لا توجد نواقص أساسية مباشرة')}</span></div>
                  <div class="triage-list-item"><strong>الإجراء المتوقع</strong><span>${esc(queueExpectedAction(current, activeKey))}</span></div>
                </div>
                <div class="triage-list">
                  <div class="triage-list-item"><strong>أهم الحقول</strong><span>${esc(queueSummary(current, activeKey))}</span></div>
                  <div class="triage-list-item"><strong>العنوان</strong><span>${esc(displayText(current.short_address, 'عنوان مختصر غير متوفر'))}</span></div>
                  <div class="triage-list-item"><strong>حالة الجلسة</strong><span>${esc(currentDecision ? bulkDecisionLabel(currentDecision.decision) : 'قيد العمل')}</span></div>
                </div>
              </div>
              <div class="bulk-decision-note">
                <label class="edit-field">
                  <span>سبب القرار / ملاحظة التنفيذ</span>
                  <textarea id="bulkDecisionNote" class="field" placeholder="اكتب سبب القرار أو أي ملاحظة متابعة لهذا السجل">${esc(currentDecision?.note || currentDecision?.reason || '')}</textarea>
                </label>
              </div>
              <div class="bulk-actions">
                <button class="button queue" type="button" data-action="bulk-decision" data-queue="${activeKey}" data-slug="${esc(current.slug)}" data-decision="done">تمت المعالجة</button>
                <button class="button" type="button" data-action="bulk-decision" data-queue="${activeKey}" data-slug="${esc(current.slug)}" data-decision="skip">تخطي</button>
                <button class="button gold" type="button" data-action="bulk-decision" data-queue="${activeKey}" data-slug="${esc(current.slug)}" data-decision="defer">تأجيل</button>
                <button class="button" type="button" data-action="bulk-decision" data-queue="${activeKey}" data-slug="${esc(current.slug)}" data-decision="deep">يحتاج مراجعة أعمق</button>
                <button class="button" type="button" data-action="bulk-decision" data-queue="${activeKey}" data-slug="${esc(current.slug)}" data-decision="completion">يحتاج إكمالًا</button>
                <button class="button" type="button" data-action="bulk-decision" data-queue="${activeKey}" data-slug="${esc(current.slug)}" data-decision="followup">جاهز للمتابعة لاحقًا</button>
                <a class="button primary" href="${entityHref(current.slug, { queue: activeKey, priority: workspace.view.activePriority, sort: workspace.view.sortMode, edit: true })}">فتح السجل</a>
              </div>
              <div class="bulk-nav">
                <button class="button subtle" type="button" data-action="bulk-nav" data-queue="${activeKey}" data-direction="prev" ${workspace.currentIndex <= 0 ? 'disabled' : ''}>السابق</button>
                <div class="results-count">${workspace.currentIndex + 1} / ${workspace.items.length}</div>
                <button class="button subtle" type="button" data-action="bulk-nav" data-queue="${activeKey}" data-direction="next" ${workspace.currentIndex >= workspace.items.length - 1 ? 'disabled' : ''}>التالي</button>
              </div>
            </div>
          </div>
          <aside class="bulk-side">
            <div class="card">
              <div class="section-kicker">قائمة الدفعة</div>
              <h3>السجلات القادمة</h3>
              <div class="bulk-list">
                ${workspace.items.map((item, index) => `
                  <button class="bulk-list-item ${item.slug === current.slug ? 'is-active' : ''}" type="button" data-action="bulk-select" data-queue="${activeKey}" data-slug="${esc(item.slug)}">
                    <div>
                      <strong>${esc(item.name)}</strong>
                      <span>${esc(attentionQueues()[activeKey].reason(item))}</span>
                    </div>
                    <span class="pill ${bulkDecisionTone(bulkDecisionValue(workspace.session, item.slug)?.decision)}">${esc(bulkDecisionLabel(bulkDecisionValue(workspace.session, item.slug)?.decision))}</span>
                  </button>
                `).join('')}
              </div>
            </div>
            <div class="card">
              <div class="section-kicker">معاينة التصدير</div>
              <h3>ماذا سيخرج من الجلسة؟</h3>
              <div class="triage-list">
                <div class="triage-list-item"><strong>تم حسمه داخل الجلسة</strong><span>${workspace.summary.followup.resolved.slice(0, 3).map(item => item.name).join('، ') || 'لا يوجد'}</span></div>
                <div class="triage-list-item"><strong>قائمة المتابعة</strong><span>${workspace.summary.followup.deferred.concat(workspace.summary.followup.deep_review).slice(0, 3).map(item => item.name).join('، ') || 'لا يوجد'}</span></div>
                <div class="triage-list-item"><strong>عمل إضافي على المصدر</strong><span>${workspace.summary.followup.needs_source.slice(0, 3).map(item => item.name).join('، ') || 'لا يوجد'}</span></div>
              </div>
            </div>
          </aside>
        </div>
      ` : '<div class="empty empty-rich"><strong>لا توجد سجلات داخل هذه الدفعة الآن</strong><p>اختر دفعة أخرى أو غيّر مجموعة الأولوية الحالية.</p></div>'}
    </div>
  `;
}

function renderReviewOperationsHub() {
  const sessions = reviewSessionRegistry();
  const exports = getExportHistory();
  const agent = agentDraftSummary();
  const openSessions = sessions.filter(item => ['in_progress', 'followup'].includes(item.status));
  const completedSessions = sessions.filter(item => ['completed', 'exported'].includes(item.status));
  const followupCounts = sessions.reduce((acc, session) => {
    acc.deferred += session.followupSummary.deferred.length;
    acc.deep += session.followupSummary.deep_review.length;
    acc.source += session.followupSummary.needs_source.length;
    acc.district += session.followupSummary.needs_district.length;
    acc.completion += session.followupSummary.needs_completion.length;
    return acc;
  }, { deferred: 0, deep: 0, source: 0, district: 0, completion: 0 });

  return `
    <div class="hero hero-compact page-hero operator-hero">
      <div class="section-kicker">مركز التشغيل</div>
      <h3>مركز تشغيل المراجعة</h3>
      <p>واجهة موحدة تربط الجلسات والدفعات والتصديرات والمتابعة في دورة تشغيل واحدة واضحة من المراجعة حتى الإغلاق.</p>
      <div class="hero-actions">
        <a href="#/dashboard" class="button">لوحة التشغيل</a>
        <a href="#/editorial-hub" class="button gold">التحرير والمتابعات</a>
        <a href="#/verification/source-review" class="button">نظام التحقق</a>
        <a href="#/verification-program" class="button primary">مركز عمليات التحقق والمهام</a>
        <a href="#/agent-ops" class="button">عمليات الوكلاء</a>
        <a href="#/agent-drafts" class="button">مسودات الوكلاء</a>
        <a href="#/release-readiness" class="button">مركز الجاهزية</a>
        <a href="#/bulk/needs-review?priority=urgent&sort=default" class="button primary">فتح جلسة مراجعة</a>
        <a href="#/review" class="button">قائمة المتابعة</a>
      </div>
    </div>
    <div class="ops-hub section">
      <div class="ops-hub-kpis">
        <div class="card mini-panel emphasis-panel"><div class="metric">${openSessions.length}</div><div class="metric-sub">جلسات مفتوحة</div></div>
        <div class="card mini-panel"><div class="metric">${completedSessions.length}</div><div class="metric-sub">جلسات مكتملة/مصدرة</div></div>
        <div class="card mini-panel"><div class="metric">${exports.length}</div><div class="metric-sub">آخر التصديرات</div></div>
        <div class="card mini-panel"><div class="metric">${followupCounts.deep + followupCounts.deferred}</div><div class="metric-sub">تحتاج عودة</div></div>
        <div class="card mini-panel"><div class="metric">${followupCounts.source + followupCounts.district + followupCounts.completion}</div><div class="metric-sub">عمل متابعة مباشر</div></div>
        <div class="card mini-panel"><div class="metric">${agent.new.length + agent.inReview.length}</div><div class="metric-sub">مسودات الوكلاء تنتظر قرارًا</div></div>
      </div>
      <div class="ops-hub-grid">
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">سجل الجلسات</div>
              <h3>الجلسات الحالية</h3>
            </div>
          </div>
          <div class="ops-session-list">
            ${sessions.map(session => `
              <article class="ops-session-item">
                <div class="ops-session-top">
                  <div>
                    <strong>${esc(session.queueTitle)}</strong>
                    <span>${esc(session.id)}</span>
                  </div>
                  <span class="pill ${sessionLifecycleTone(session.status)}">${sessionLifecycleLabel(session.status)}</span>
                </div>
                <div class="ops-session-meta">
                  <span>إجمالي ${session.total}</span>
                  <span>أُنجز ${session.done}</span>
                  <span>مؤجل ${session.deferred}</span>
                  <span>أعمق ${session.deep}</span>
                </div>
                <div class="ops-session-meta">
                  <span>بدأت ${esc(session.startedAt || '—')}</span>
                  <span>آخر تحديث ${esc(session.updatedAt || '—')}</span>
                </div>
                <div class="actions">
                  <a class="button" href="#/bulk/${session.queueKey}?priority=${encodeURIComponent(session.priority)}&sort=${encodeURIComponent(session.sort)}">فتح الجلسة</a>
                  <a class="button subtle" href="${queueHref(session.queueKey, { priority: session.priority, sort: session.sort })}">فتح الدفعة</a>
                </div>
              </article>
            `).join('')}
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">حياة الدفعات</div>
          <h3>حياة الدفعات</h3>
          <div class="ops-lifecycle-grid">
            <div class="triage-list-item"><strong>جديدة</strong><span>${sessions.filter(item => item.status === 'new').length} دفعة</span></div>
            <div class="triage-list-item"><strong>قيد المراجعة</strong><span>${sessions.filter(item => item.status === 'in_progress').length} دفعة</span></div>
            <div class="triage-list-item"><strong>تحتاج متابعة</strong><span>${sessions.filter(item => item.status === 'followup').length} دفعة</span></div>
            <div class="triage-list-item"><strong>اكتملت</strong><span>${sessions.filter(item => item.status === 'completed').length} دفعة</span></div>
            <div class="triage-list-item"><strong>تم تصديرها</strong><span>${sessions.filter(item => item.status === 'exported').length} دفعة</span></div>
          </div>
          <div class="triage-list">
            ${sessions.map(session => `
              <div class="triage-list-item">
                <strong>${session.queueTitle}</strong>
                <span>${sessionLifecycleLabel(session.status)} • التالي: ${session.status === 'followup' ? 'متابعة العناصر المؤجلة والعميقة' : session.status === 'exported' ? 'إغلاق الدفعة أو بدء دفعة جديدة' : session.status === 'completed' ? 'تصدير النتائج' : session.status === 'in_progress' ? 'استكمال الجلسة الحالية' : 'بدء المراجعة'}</span>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
      <div class="ops-hub-grid">
        <div class="card">
          <div class="section-kicker">سجل التصدير</div>
          <h3>آخر التصديرات</h3>
          ${exports.length ? `
            <div class="ops-export-list">
              ${exports.map(item => `
                <article class="ops-export-item">
                  <strong>${esc(item.label)}</strong>
                  <span>${esc(item.format.toUpperCase())} • ${esc(item.exportedAt)} • ${item.total} سجل</span>
                  <p>${esc(item.summary)}</p>
                </article>
              `).join('')}
            </div>
          ` : '<div class="empty">لا توجد تصديرات محفوظة بعد.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">المتابعة</div>
          <h3>العناصر التي تحتاج متابعة</h3>
          <div class="ops-followup-grid">
            <div class="triage-list-item"><strong>مؤجل</strong><span>${followupCounts.deferred} سجل</span></div>
            <div class="triage-list-item"><strong>مراجعة أعمق</strong><span>${followupCounts.deep} سجل</span></div>
            <div class="triage-list-item"><strong>عمل على المصدر</strong><span>${followupCounts.source} سجل</span></div>
            <div class="triage-list-item"><strong>عمل على الحي</strong><span>${followupCounts.district} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج إكمالًا</strong><span>${followupCounts.completion} سجل</span></div>
          </div>
          <div class="home-links">
            <a href="#/verification/source-review" class="home-link-card"><strong>متابعة المصدر</strong><span>الانتقال إلى مسار تحقق المصدر.</span></a>
            <a href="#/verification/district-review" class="home-link-card"><strong>متابعة الحي</strong><span>الانتقال إلى مسار تحقق الحي.</span></a>
            <a href="#/verification/confidence-review" class="home-link-card"><strong>متابعة الثقة</strong><span>الانتقال إلى مسار رفع أو خفض الثقة.</span></a>
            <a href="#/bulk/missing-source?priority=easy&sort=default" class="home-link-card"><strong>متابعة المصدر</strong><span>الانتقال مباشرة إلى دفعة ناقص المصدر.</span></a>
            <a href="#/bulk/missing-district?priority=easy&sort=default" class="home-link-card"><strong>متابعة الحي</strong><span>الانتقال مباشرة إلى دفعة ناقص الحي.</span></a>
            <a href="#/bulk/quick-complete?priority=one-step&sort=default" class="home-link-card"><strong>متابعة الإكمال السريع</strong><span>فتح دفعة الإكمال الأقرب للحسم.</span></a>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getEntity(slug) { return state.records.find(r => r.slug === slug); }
function emptyNewCafeRecord() {
  return {
    slug: 'new-cafe-draft',
    name: '',
    alternate_name: '',
    canonical_name_ar: '',
    canonical_name_en: '',
    city: 'بريدة',
    district: '',
    short_address: '',
    reference_url: '',
    official_instagram: '',
    phone: '',
    hours_summary: '',
    category: 'كافيه / مقهى',
    google_rating: '',
    google_reviews_count: '',
    price_level: '',
    status: 'discovered',
    confidence: 'low',
    place_personality: '',
    best_visit_time: '',
    why_choose_it: '',
    not_for_whom: '',
    editorial_summary: '',
    source_notes: '',
    branch_group: '',
    branch_label: '',
    duplicate_of: '',
    archive_reason: ''
  };
}
function draftKey(slug) { return `daleelyDraft:${slug}`; }
function getDraft(slug) {
  try { return JSON.parse(localStorage.getItem(draftKey(slug)) || 'null'); }
  catch { return null; }
}
function saveDraft(slug, payload, meta = {}) {
  localStorage.setItem(draftKey(slug), JSON.stringify(payload));
  registerDraftSnapshot(slug, payload, {
    source: meta.source || 'local-draft',
    status: meta.status || editorialReadiness(payload).key,
    statusLabel: meta.statusLabel || editorialReadiness(payload).label,
    note: meta.note || '',
  });
}
function diffRecord(original, updated) {
  const patch = {};
  Object.keys(updated).forEach(key => {
    if (updated[key] !== original[key]) patch[key] = updated[key];
  });
  return patch;
}
function editableField(label, name, value, type = 'text') {
  if (type === 'textarea') {
    return `<label class="edit-field"><span>${esc(label)}</span><textarea class="field" name="${esc(name)}">${esc(value || '')}</textarea></label>`;
  }
  return `<label class="edit-field"><span>${esc(label)}</span><input class="field" type="${esc(type)}" name="${esc(name)}" value="${esc(value || '')}" /></label>`;
}
function renderEditSection(title, kicker, note, fields, options = {}) {
  return `
    <details class="edit-section-card" ${options.open === false ? '' : 'open'}>
      <summary>
        <div>
          <div class="section-kicker">${esc(kicker)}</div>
          <strong>${esc(title)}</strong>
          <span>${esc(note)}</span>
        </div>
      </summary>
      <div class="edit-section-grid">
        ${fields.join('')}
      </div>
    </details>
  `;
}
function cleanGoogleMapsName(text = '') {
  return decodeURIComponent(String(text || ''))
    .replace(/^.*\/place\//, '')
    .replace(/\/.*$/, '')
    .replace(/\+/g, ' ')
    .replace(/\s*\|\s*/g, ' | ')
    .trim();
}
function normalizeSpaces(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}
function extractGoogleMapsDraft(urlInput, rawTextInput = '') {
  const url = String(urlInput || '').trim();
  const rawText = String(rawTextInput || '').trim();
  const combined = `${url}\n${rawText}`.trim();
  if (!combined) return {};

  const draft = {};
  if (url) draft.reference_url = url;

  const nameMatch = url.match(/\/place\/([^/?#]+)/i);
  if (nameMatch) {
    const parsedName = cleanGoogleMapsName(nameMatch[1]);
    if (parsedName) draft.name = parsedName;
  }

  const rawLines = rawText.split(/\r?\n/).map(normalizeSpaces).filter(Boolean);
  if (!draft.name && rawLines.length) {
    const firstUsefulLine = rawLines.find(line => line.length > 2 && !/(review|reviews|مراجعة|تقييم|open|يغلق|يفتح|الاتجاهات)/i.test(line));
    if (firstUsefulLine) draft.name = firstUsefulLine;
  }

  const ratingMatch = combined.match(/(?:^|[^\d])(\d\.\d)(?:[^\d]|$)/);
  if (ratingMatch) draft.google_rating = ratingMatch[1];

  const reviewsMatch = combined.match(/([\d,]{1,6})\s*(?:review|reviews|مراجعة|مراجعات|تقييم|تقييمات)/i);
  if (reviewsMatch) draft.google_reviews_count = reviewsMatch[1].replace(/,/g, '');

  const priceMatch = combined.match(/(\$\$\$\$|\$\$\$|\$\$|\$|رخيص|متوسط السعر|مرتفع|باهظ)/i);
  if (priceMatch) draft.price_level = priceMatch[1];

  const plusCodeMatch = combined.match(/([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4})/i);
  if (plusCodeMatch) {
    draft.short_address = plusCodeMatch[1];
  } else if (rawLines.length > 1) {
    const addressLine = rawLines.find(line => /(طريق|شارع|حي|بريدة|النهضة|الريان|البساتين|الصفراء|سلطانة|قرطبة)/.test(line));
    if (addressLine) draft.short_address = addressLine;
  }

  return draft;
}
function applyImportedDraftToForm(form, imported) {
  Object.entries(imported).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field && value) field.value = value;
  });
}
function renderEditForm(e) {
  const draft = getDraft(e.slug) || {};
  const current = { ...e, ...draft };
  const isNewCafe = e.slug === 'new-cafe-draft';
  const triage = entityTriage(current);
  const essentialFields = [
    editableField('الاسم المعتمد', 'name', current.name),
    editableField('الحي', 'district', current.district),
    editableField('العنوان المختصر', 'short_address', current.short_address),
    editableField('الرابط المرجعي', 'reference_url', current.reference_url, 'url'),
    editableField('التقييم', 'google_rating', current.google_rating),
    editableField('عدد المراجعات', 'google_reviews_count', current.google_reviews_count),
    editableField('الحالة', 'status', current.status),
    editableField('الثقة', 'confidence', current.confidence),
  ];
  const qualityFields = [
    editableField('الفئة', 'category', current.category),
    editableField('مستوى السعر', 'price_level', current.price_level),
    editableField('الحساب الرسمي', 'official_instagram', current.official_instagram, 'url'),
    editableField('رقم التواصل', 'phone', current.phone),
    editableField('ساعات العمل', 'hours_summary', current.hours_summary),
    editableField('الخلاصة التحريرية', 'editorial_summary', current.editorial_summary, 'textarea'),
    editableField('ملاحظات المصادر', 'source_notes', current.source_notes, 'textarea'),
  ];
  const optionalFields = [
    editableField('الاسم البديل', 'alternate_name', current.alternate_name),
    editableField('الاسم العربي المعياري', 'canonical_name_ar', current.canonical_name_ar),
    editableField('الاسم الإنجليزي المعياري', 'canonical_name_en', current.canonical_name_en),
    editableField('شخصية المكان', 'place_personality', current.place_personality, 'textarea'),
    editableField('أفضل وقت', 'best_visit_time', current.best_visit_time, 'textarea'),
    editableField('لماذا قد يختاره الزائر', 'why_choose_it', current.why_choose_it, 'textarea'),
    editableField('لمن قد لا يكون مناسبًا', 'not_for_whom', current.not_for_whom, 'textarea'),
  ];
  return `
    <div class="section">
      <div class="card edit-workbench">
        <div class="section-header">
          <div>
            <div class="section-kicker">مساحة العمل</div>
            <h3>${isNewCafe ? 'إضافة كوفي جديد' : 'تحرير السجل'}</h3>
          </div>
          <div class="actions">
            ${isNewCafe ? '' : `<button class="button" data-action="cancel-edit" data-slug="${esc(e.slug)}">إلغاء</button>`}
            <button class="button gold" data-action="save-draft" data-slug="${esc(e.slug)}">${isNewCafe ? 'إنشاء مسودة' : 'حفظ المسودة'}</button>
            ${isNewCafe ? `<button class="button queue" data-action="queue-import" data-slug="${esc(e.slug)}">إرسال للاستيراد</button>` : ''}
            <button class="button primary" data-action="export-patch" data-slug="${esc(e.slug)}">تصدير التعديل</button>
          </div>
        </div>
        <div class="edit-workbench-top">
          <div class="triage-list">
            <div class="triage-list-item"><strong>الإجراء التالي</strong><span>${triage.nextAction}</span></div>
            <div class="triage-list-item"><strong>الأساسيات الناقصة</strong><span>${triage.missing.length ? triage.missing.join('، ') : 'لا توجد نواقص أساسية الآن.'}</span></div>
          </div>
          <div class="triage-list">
            ${triage.quickItems.length ? triage.quickItems.slice(0, 3).map(item => `<div class="triage-list-item"><strong>إكمال سريع</strong><span>${item}</span></div>`).join('') : '<div class="triage-list-item"><strong>الإكمال السريع</strong><span>لا توجد عناصر سريعة واضحة الآن.</span></div>'}
          </div>
        </div>
        <div class="import-box import-box-wide ${isNewCafe ? 'new-cafe-import-box' : ''}">
          <label class="edit-field import-field">
            <span>رابط Google Maps</span>
            <input id="googleMapsImport" class="field" type="url" value="${esc(state.importDraftText || '')}" placeholder="ألصق رابط Google Maps هنا" />
          </label>
          <label class="edit-field import-field import-raw-field">
            <span>نص خام (اختياري)</span>
            <textarea id="googleMapsRawText" class="field" placeholder="ألصق أي نص خام من Google Maps أو وصف المكان هنا">${esc(state.importRawText || '')}</textarea>
          </label>
          <button class="button primary" data-action="import-draft" data-slug="${esc(e.slug)}">${isNewCafe ? 'جلب البيانات الأساسية' : 'استيراد مسودة'}</button>
        </div>
        ${isNewCafe ? '<div class="note">ألصق الرابط ثم اضغط جلب البيانات الأساسية لتعبئة الحقول الأولية، أو استخدم إرسال للاستيراد لإنشاء طلب مستقل داخل agent_queue بدون الكتابة إلى master.</div>' : ''}
        <form id="editForm" class="edit-workbench-form" data-slug="${esc(e.slug)}">
          ${renderEditSection('الأساسيات', 'Essentials', 'ابدأ من الحقول التي تغيّر الجاهزية وظهور السجل في الصفوف.', essentialFields)}
          ${renderEditSection('تحسين الجودة', 'Quality', 'حقول ترفع وضوح السجل وسرعة المراجعة لاحقًا.', qualityFields)}
          ${renderEditSection('حقول إضافية', 'Optional', 'تفاصيل مفيدة ولكن يمكن تأجيلها إذا كانت الأولوية للإكمال السريع.', optionalFields, { open: false })}
        </form>
        <div class="note">الحفظ هنا محلي داخل المتصفح فقط. استخدم Export Patch لتوليد ملف تغييرات يمكن تطبيقه على البيانات الأصلية.</div>
        ${state.draftMessage ? `<div class="draft-message">${esc(state.draftMessage)}</div>` : ''}
        ${state.queueMessage ? `<div class="queue-message">${esc(state.queueMessage)}</div>` : ''}
      </div>
    </div>
  `;
}

function renderEntityPage(slug) {
  const { query } = parseHashRoute();
  const isNewCafe = slug === '__new__';
  const e = isNewCafe ? emptyNewCafeRecord() : getEntity(slug);
  if (!e) return '<div class="empty">لم يتم العثور على السجل.</div>';
  const effectiveSlug = isNewCafe ? e.slug : slug;
  const draft = getDraft(effectiveSlug);
  const draftBadge = draft ? `<span class="pill warning">مسودة محفوظة</span>` : '';
  const title = isNewCafe ? 'كيان جديد' : e.name;
  const summary = isNewCafe ? 'ابدأ سجلًا جديدًا ثم أكمل معلوماته خطوة بخطوة.' : e.editorial_summary;

  if (isNewCafe) {
    return `
      <div class="hero">
        <div class="chips">
          ${badge(e.status)}
          ${chip('الثقة', displayConfidence(e.confidence))}
          ${draftBadge}
        </div>
        <div class="section-header">
          <div>
            <h3>${esc(title)}</h3>
            <p>${esc(summary)}</p>
          </div>
        </div>
      </div>
      ${renderEditForm(e)}
    `;
  }

  const quickFacts = [
    { label: 'التقييم', value: displayText(e.google_rating, '—') },
    { label: 'المراجعات', value: displayText(e.google_reviews_count, '—') },
    { label: 'السعر', value: displayPrice(e.price_level) },
    { label: 'الحي', value: displayText(e.district) },
  ];
  const triage = entityTriage(e);
  const queueContext = queueContextForEntity(e);
  const evidenceLog = evidenceForSlug(e.slug);
  const readiness = recordReadiness(e);
  const agentProposals = agentDraftEntries().filter(item => item.recordId === e.slug);
  const completionAgentProposals = agentProposals.filter(item => item.proposalType !== 'verification');
  const verificationAgentProposals = agentProposals.filter(item => item.proposalType === 'verification');
  const verificationDraftsForRecord = verificationDraftEntries().filter(item => item.recordId === e.slug);
  const completionAgentRunState = state.agentRunState && state.agentRunState.slug === e.slug && state.agentRunState.agentType === 'completion' ? state.agentRunState : null;
  const verificationAgentRunState = state.agentRunState && state.agentRunState.slug === e.slug && state.agentRunState.agentType === 'verification' ? state.agentRunState : null;
  const linkedMissions = missionPlan().missions.filter(item => item.recordSlugs.includes(e.slug));
  const missionSuggestions = suggestedRecordMissions(e).filter(item => !linkedMissions.some(existing => existing.id === item.id));
  const linkedSessions = missionSessions().filter(item => (item.recordSlugs || []).includes(e.slug));
  const verificationSession = startOrOpenVerificationSession({
    scopeType: 'record',
    scopeKey: e.slug,
    title: e.name,
    recordSlugs: [e.slug],
    persist: false,
  });
  const verificationSummary = verificationSessionSummary(verificationSession);
  const latestDecision = latestVerificationDecisionForSlug(e.slug);
  const autoEdit = query.get('edit') === '1';
  if (autoEdit && !isNewCafe) {
    state.editMode = true;
    state.currentSlug = effectiveSlug;
  }

  return `
    <div class="hero page-hero entity-hero">
      <div class="chips">
        ${badge(e.status)}
        ${chip('الثقة', displayConfidence(e.confidence))}
        ${chip('الفئة', displayText(e.category, '—'))}
        ${chip('الحي', displayText(e.district, '—'))}
        ${draftBadge}
      </div>
      <div class="section-header">
        <div>
          <h3>${esc(title)}</h3>
          <p>${esc(summary || 'معلومات مختصرة عن هذا الكيان داخل الدليل.')}</p>
        </div>
        <div class="actions">
          <button class="button primary" data-action="toggle-edit" data-slug="${esc(effectiveSlug)}">تحرير</button>
          ${queueContext ? `<a class="button" href="${queueContext.returnHref}">العودة إلى ${esc(queueContext.queueTitle)}</a>` : ''}
          ${e.reference_url ? `<a class="button" href="${esc(e.reference_url)}" target="_blank" rel="noreferrer">فتح المرجع</a>` : ''}
        </div>
      </div>
    </div>
    ${queueContext ? `
      <div class="card record-context-bar section">
        <div class="record-context-copy">
          <div class="section-kicker">سياق المراجعة</div>
          <strong>جئت من صف: ${esc(queueContext.queueTitle)}</strong>
          <span>${esc(queueContext.reason)} • ضمن مجموعة "${esc(queueContext.priorityLabel)}"</span>
        </div>
        <div class="record-context-actions">
          ${queueContext.prev ? `<a class="button" href="${entityHref(queueContext.prev.slug, { queue: queueContext.queueKey, priority: queueContext.priority, sort: queueContext.sort })}">السجل السابق</a>` : ''}
          ${queueContext.next ? `<a class="button queue" href="${entityHref(queueContext.next.slug, { queue: queueContext.queueKey, priority: queueContext.priority, sort: queueContext.sort })}">السجل التالي</a>` : ''}
        </div>
      </div>
    ` : ''}
    <div class="section entity-triage-layout">
      <div class="entity-triage-main">
        <div class="card entity-triage-summary">
          <div class="section-kicker">ملخص triage</div>
          <h3>وضع السجل الآن</h3>
          <div class="entity-triage-grid">
            <div class="triage-highlight">
              <span>الجاهزية</span>
              <strong>${triage.readiness.label}</strong>
              <p>${triage.readiness.note}</p>
            </div>
            <div class="triage-highlight">
              <span>الإجراء التالي</span>
              <strong>${triage.nextAction}</strong>
              <p>${triage.missing.length ? `ينقصه الآن: ${triage.missing.join('، ')}` : 'لا توجد نواقص أساسية ظاهرة.'}</p>
            </div>
            <div class="triage-highlight">
              <span>سبب دخوله في الصفوف</span>
              <strong>${triage.queueReasons.length ? triage.queueReasons[0].title : 'غير ظاهر في صف عمل خاص'}</strong>
              <p>${triage.queueReasons.length ? triage.queueReasons[0].reason : 'السجل لا يظهر الآن في صف تشغيل مباشر.'}</p>
            </div>
          </div>
        </div>
        <div class="card workbench-actions-card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Workbench</div>
              <h3>إجراءات العمل السريعة</h3>
            </div>
            <div class="actions">
              <button class="button primary" data-action="toggle-edit" data-slug="${esc(effectiveSlug)}">${state.editMode && state.currentSlug === effectiveSlug ? 'التحرير مفتوح' : 'فتح التحرير'}</button>
              <button class="button gold" type="button" data-action="run-record-agent" data-slug="${esc(e.slug)}">تشغيل الوكيل</button>
              <button class="button queue" type="button" data-action="run-verification-agent" data-slug="${esc(e.slug)}">وكيل التحقق</button>
              ${e.reference_url ? `<a class="button" href="${esc(e.reference_url)}" target="_blank" rel="noreferrer">فحص المصدر</a>` : ''}
              ${queueContext ? `<a class="button" href="${queueContext.returnHref}">العودة للصف</a>` : '<a class="button" href="#/dashboard">لوحة التشغيل</a>'}
            </div>
          </div>
          <div class="triage-list workbench-actions-list">
            <div class="triage-list-item"><strong>التالي المقترح</strong><span>${triage.nextAction}</span></div>
            <div class="triage-list-item"><strong>هل يحتاج مراجعة؟</strong><span>${triage.queueReasons.some(item => item.key === 'needs-review') ? 'نعم، يظهر داخل صف يحتاج مراجعة.' : 'ليس ضمن صف المراجعة المباشر حاليًا.'}</span></div>
            <div class="triage-list-item"><strong>هل يمكن إكماله بسرعة؟</strong><span>${triage.quickItems.length ? `نعم، أقرب عنصر: ${triage.quickItems[0]}` : 'لا يوجد إكمال سريع واضح الآن.'}</span></div>
          </div>
        </div>
        <div class="entity-triage-checklist grid cards-3">
          ${triage.checklist.map(item => `
            <div class="card mini-panel triage-check-card">
              <div class="metric">${item.ratio}</div>
              <div class="metric-sub">${item.label}</div>
            </div>
          `).join('')}
        </div>
        <div class="grid cards-2">
          <div class="card">
            <div class="section-kicker">ما ينقص الآن</div>
            <h3>الأساسيات الناقصة</h3>
            ${triage.missing.length ? `<div class="triage-list">${triage.missing.map(item => `<div class="triage-list-item"><strong>${item}</strong><span>عنصر أساسي مؤثر على الجاهزية.</span></div>`).join('')}</div>` : '<div class="empty">الأساسيات الأساسية مكتملة حاليًا.</div>'}
          </div>
          <div class="card">
            <div class="section-kicker">إكمال سريع</div>
            <h3>عناصر يمكن حسمها بسرعة</h3>
            ${triage.quickItems.length ? `<div class="triage-list">${triage.quickItems.map(item => `<div class="triage-list-item"><strong>${item}</strong><span>يمكن إكماله مباشرة من نفس الصفحة أو عبر المرجع.</span></div>`).join('')}</div>` : '<div class="empty">لا توجد عناصر سريعة واضحة الآن.</div>'}
          </div>
        </div>
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Agent Drafts</div>
              <h3>اقتراحات وكيل استكمال السجل</h3>
            </div>
            <div class="actions">
              <button class="button gold" type="button" data-action="run-record-agent" data-slug="${esc(e.slug)}">تحليل السجل</button>
              <a class="button subtle" href="#/agent-drafts">كل الاقتراحات</a>
            </div>
          </div>
          <div class="note">وضع runtime الحالي: ${esc(state.agentRuntime?.label || 'غير متاح')} • ${esc(state.agentRuntime?.diagnostics?.lastCall?.fallbackUsed ? 'آخر نداء استخدم fallback' : 'آخر نداء بدون fallback')}</div>
          ${completionAgentRunState ? `
            <div class="agent-run-feedback ${esc(`is-${completionAgentRunState.status}`)}">
              <strong>${esc(
                completionAgentRunState.status === 'loading'
                  ? 'جارٍ تشغيل الوكيل'
                  : completionAgentRunState.status === 'success'
                    ? 'تم إنشاء مسودة وكيل'
                    : completionAgentRunState.status === 'empty'
                      ? 'لا توجد حقول مؤهلة لهذا السجل'
                      : 'حدث خطأ أثناء تشغيل الوكيل'
              )}</strong>
              <span>${esc(completionAgentRunState.message || '')}</span>
            </div>
          ` : ''}
          ${completionAgentProposals.length ? `
            <div class="triage-list">
              ${completionAgentProposals.slice(0, 5).map(item => `<div class="triage-list-item"><strong>${esc(agentAllowedFieldLabel(item.targetField))}</strong><span>${esc(agentProposalStatusLabel(item.status))} • ${esc(displayText(item.suggestedValue, '—'))}${item.status === 'accepted' ? ' • تم تحويله إلى draft التحرير' : ''}</span></div>`).join('')}
            </div>
          ` : '<div class="empty">لا توجد اقتراحات وكيل لهذا السجل بعد.</div>'}
        </div>
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Verification Agent</div>
              <h3>اقتراحات وكيل دعم التحقق</h3>
            </div>
            <div class="actions">
              <button class="button queue" type="button" data-action="run-verification-agent" data-slug="${esc(e.slug)}">تشغيل وكيل التحقق</button>
              <a class="button subtle" href="#/verification-program">مركز التحقق</a>
            </div>
          </div>
          ${verificationAgentRunState ? `
            <div class="agent-run-feedback ${esc(`is-${verificationAgentRunState.status}`)}">
              <strong>${esc(
                verificationAgentRunState.status === 'loading'
                  ? 'جارٍ تشغيل وكيل التحقق'
                  : verificationAgentRunState.status === 'success'
                    ? 'تم إنشاء مسودة تحقق'
                    : verificationAgentRunState.status === 'empty'
                      ? 'لا توجد اقتراحات تحقق لهذا السجل'
                      : 'حدث خطأ أثناء تشغيل وكيل التحقق'
              )}</strong>
              <span>${esc(verificationAgentRunState.message || '')}</span>
            </div>
          ` : ''}
          ${verificationAgentProposals.length ? `
            <div class="triage-list">
              ${verificationAgentProposals.slice(0, 5).map(item => `<div class="triage-list-item"><strong>${esc(agentAllowedFieldLabel(item.targetField))}</strong><span>${esc(agentProposalStatusLabel(item.status))} • ${esc(displayText(item.suggestedValue, '—'))}${item.status === 'accepted' ? ' • تم تحويله إلى draft التحقق' : ''}</span></div>`).join('')}
            </div>
          ` : '<div class="empty">لا توجد اقتراحات تحقق محفوظة لهذا السجل بعد.</div>'}
          ${verificationDraftsForRecord.length ? `
            <div class="triage-list" style="margin-top:16px;">
              ${verificationDraftsForRecord.slice(0, 3).map(item => `<div class="triage-list-item"><strong>${esc(item.targetLabel)}</strong><span>draft التحقق • ${esc(displayText(item.suggestedValue, '—'))}</span></div>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">Evidence Lab</div>
              <h3>سجل الأدلة</h3>
            </div>
            <div class="actions">
              <a class="button subtle" href="#/verification-program">مركز عمليات التحقق والمهام</a>
            </div>
          </div>
          <div class="edit-grid">
            <label class="edit-field">
              <span>نوع الدليل</span>
              <select id="evidenceCategory" class="field">
                <option value="source">المصدر</option>
                <option value="district">الحي</option>
                <option value="confidence">الثقة</option>
                <option value="followup">المتابعة</option>
                <option value="general">عام</option>
              </select>
            </label>
            <label class="edit-field">
              <span>النتيجة</span>
              <select id="evidenceOutcome" class="field">
                <option value="confirmed">تم التأكيد</option>
                <option value="pending">بانتظار متابعة</option>
                <option value="needs_source">يحتاج مصدر</option>
                <option value="needs_district">يحتاج حسم حي</option>
                <option value="ready_later">جاهز لاحقًا</option>
                <option value="blocked">معلق</option>
                <option value="failed">فشل</option>
              </select>
            </label>
          </div>
          <label class="edit-field">
            <span>ملاحظة الدليل / rationale</span>
            <textarea id="evidenceNote" class="field" placeholder="دوّن ما الذي جُرّب، وما الذي نجح أو فشل، وما الذي بقي معلقًا."></textarea>
          </label>
          <div class="actions">
            <button class="button queue" type="button" data-action="add-evidence" data-slug="${esc(e.slug)}">إضافة دليل</button>
          </div>
          ${evidenceLog.length ? `
            <div class="triage-list">
              ${evidenceLog.slice(0, 6).map(item => `<div class="triage-list-item"><strong>${esc(evidenceCategoryLabel(item.category))} • ${esc(evidenceOutcomeLabel(item.outcome))}</strong><span>${esc(item.note || item.rationale || 'لا توجد ملاحظة')} • ${esc(item.createdAt)}</span></div>`).join('')}
            </div>
          ` : '<div class="empty">لا يوجد evidence trail لهذا السجل بعد.</div>'}
        </div>
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">المهمات المرتبطة</div>
              <h3>من القرار إلى التنفيذ</h3>
            </div>
            <div class="actions">
              <a class="button subtle" href="#/verification-program">مركز عمليات التحقق والمهام</a>
            </div>
          </div>
          ${linkedMissions.length ? `
            <div class="triage-list">
              ${linkedMissions.map(item => `<div class="triage-list-item"><strong>${esc(item.title)}</strong><span>${esc(missionStatusLabel(item.status))} • ${esc(missionTypeLabel(item.type))} • ${esc(missionOutputSummary(item))}</span></div>`).join('')}
            </div>
          ` : '<div class="empty">لا توجد مهمة تنفيذية مرتبطة بهذا السجل بعد.</div>'}
          ${missionSuggestions.length ? `
            <div class="triage-list" style="margin-top:16px;">
              ${missionSuggestions.map(item => `<div class="triage-list-item"><strong>${esc(item.title)}</strong><span>${esc(item.whyOpened)} • <button class="button subtle" type="button" data-action="mission-seed" data-slug="${esc(e.slug)}" data-mission-id="${esc(item.id)}">فتح المهمة</button></span></div>`).join('')}
            </div>
          ` : ''}
        </div>
        <div class="card">
          <div class="section-header">
            <div>
              <div class="section-kicker">جلسات التنفيذ</div>
              <h3>سجل العمل الفعلي</h3>
            </div>
            <div class="actions">
              <a class="button subtle" href="#/verification-program">مركز العمليات</a>
            </div>
          </div>
          ${linkedSessions.length ? `
            <div class="triage-list">
              ${linkedSessions.slice(0, 4).map(item => {
                const summary = missionSessionSummary(item);
                return `<div class="triage-list-item"><strong>${esc(item.missionTitle)}</strong><span>${esc(missionSessionStatusLabel(item.status))} • ${summary.attempts.length} محاولة • ${summary.followup} متابعة</span></div>`;
              }).join('')}
            </div>
          ` : '<div class="empty">لا توجد جلسات تنفيذ مرتبطة بهذا السجل بعد.</div>'}
        </div>
      </div>
      <aside class="entity-triage-side">
        <div class="card">
          <div class="section-kicker">الجاهزية</div>
          <h3>${esc(readinessLabel(readiness.key))}</h3>
          <p class="note">${esc(readiness.reason)}</p>
          <div class="triage-list">
            ${(readiness.blockers || []).slice(0, 3).map(item => `<div class="triage-list-item"><strong>مانع</strong><span>${esc(item)}</span></div>`).join('') || '<div class="triage-list-item"><strong>الوضع</strong><span>لا توجد موانع ظاهرة الآن.</span></div>'}
          </div>
          <div class="actions">
            <a class="button subtle" href="#/release-readiness">مركز الجاهزية</a>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">جلسة التحقق</div>
          <h3>${verificationSessionStatusLabel(verificationSession.status)}</h3>
          <p class="note">هذه هي جلسة التحقق الخاصة بهذا السجل، وتلخص القرار الحالي وما إذا كان يحتاج تصعيدًا أو تسليمًا أو إغلاقًا.</p>
          <div class="triage-list">
            <div class="triage-list-item"><strong>التقدم</strong><span>${verificationSummary.progressLabel}</span></div>
            <div class="triage-list-item"><strong>آخر قرار</strong><span>${latestDecision ? `${latestDecision.decisionLabel} • ${verificationResolutionLabel(latestDecision.resolution)}` : 'لا يوجد قرار موثق بعد'}</span></div>
            <div class="triage-list-item"><strong>الخطوة التالية</strong><span>${latestDecision?.nextAction || 'ابدأ بمراجعة الدليل الحالي أو سجل أول قرار تحقق.'}</span></div>
          </div>
          <label class="edit-field">
            <span>ملاحظة القرار التحققي</span>
            <textarea id="recordVerificationNote" class="field" placeholder="اكتب لماذا هذا السجل عالق أو ماذا حسمه وما الجهة التالية له."></textarea>
          </label>
          <div class="verification-decision-actions">
            <button class="button subtle" type="button" data-action="verification-session-start" data-session-type="record" data-session-scope="${esc(e.slug)}" data-session-title="${esc(e.name)}">فتح الجلسة</button>
            <button class="button" type="button" data-action="verification-decision" data-session-type="record" data-session-scope="${esc(e.slug)}" data-slug="${esc(e.slug)}" data-decision="review" data-note-id="recordVerificationNote">مراجعة</button>
            <button class="button queue" type="button" data-action="verification-decision" data-session-type="record" data-session-scope="${esc(e.slug)}" data-slug="${esc(e.slug)}" data-decision="verify" data-note-id="recordVerificationNote">تحقق</button>
            <button class="button gold" type="button" data-action="verification-decision" data-session-type="record" data-session-scope="${esc(e.slug)}" data-slug="${esc(e.slug)}" data-decision="handoff" data-note-id="recordVerificationNote">تسليم</button>
            <button class="button subtle" type="button" data-action="verification-decision" data-session-type="record" data-session-scope="${esc(e.slug)}" data-slug="${esc(e.slug)}" data-decision="escalate" data-note-id="recordVerificationNote">تصعيد</button>
            <button class="button subtle" type="button" data-action="verification-decision" data-session-type="record" data-session-scope="${esc(e.slug)}" data-slug="${esc(e.slug)}" data-decision="close" data-note-id="recordVerificationNote">إغلاق</button>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">حالة المصدر</div>
          <h3>${triage.sourceStatus.label}</h3>
          <p class="note">${triage.sourceStatus.note}</p>
          <div class="chips">${e.reference_url ? `<a class="chip" href="${esc(e.reference_url)}" target="_blank" rel="noreferrer">فتح المرجع</a>` : '<span class="chip">لا يوجد مرجع</span>'}</div>
        </div>
        <div class="card">
          <div class="section-kicker">حالة الحي</div>
          <h3>${triage.districtStatus.label}</h3>
          <p class="note">${triage.districtStatus.note}</p>
        </div>
        <div class="card">
          <div class="section-kicker">الثقة والجودة</div>
          <h3>مؤشرات سريعة</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>الثقة</strong><span>${triage.confidenceHint}</span></div>
            ${triage.qualityHints.map(item => `<div class="triage-list-item"><strong>تنبيه جودة</strong><span>${item}</span></div>`).join('') || '<div class="triage-list-item"><strong>الجودة</strong><span>لا توجد ملاحظات جودة بارزة الآن.</span></div>'}
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">صفوف العمل</div>
          <h3>سبب الظهور</h3>
          ${triage.queueReasons.length ? `<div class="triage-list">${triage.queueReasons.map(item => `<div class="triage-list-item"><strong>${item.title}</strong><span>${item.reason} • ${item.action}</span></div>`).join('')}</div>` : '<div class="empty">السجل غير موجود حاليًا في صف عمل خاص.</div>'}
        </div>
        ${latestDecision ? `
          <div class="card">
            <div class="section-kicker">قرار التحقق</div>
            <h3>${esc(latestDecision.decisionLabel)}</h3>
            <p class="note">${esc(latestDecision.reason || latestDecision.blockedBy || 'لا توجد ملاحظة إضافية.')}</p>
            <div class="triage-list">
              <div class="triage-list-item"><strong>الحسم الحالي</strong><span>${esc(verificationResolutionLabel(latestDecision.resolution))}</span></div>
              <div class="triage-list-item"><strong>المستوى</strong><span>${esc(latestDecision.confidence || 'غير محدد')}</span></div>
              <div class="triage-list-item"><strong>التالي</strong><span>${esc(latestDecision.nextAction || '—')}</span></div>
            </div>
          </div>
        ` : ''}
      </aside>
    </div>
    <div class="grid cards-4">
      ${quickFacts.map(item => `<div class="card mini-panel"><div class="metric">${esc(item.value)}</div><div class="metric-sub">${esc(item.label)}</div></div>`).join('')}
    </div>
    ${state.editMode && state.currentSlug === effectiveSlug ? renderEditForm(e) : ''}
    <div class="grid cards-2">
      <div class="card">
        <div class="section-kicker">المهم أولًا</div>
        <h3>بيانات أساسية</h3>
        <div class="kv">
          ${kv('الاسم المعتمد', e.name)}
          ${kv('الاسم البديل', e.alternate_name)}
          ${kv('الاسم العربي المعياري', e.canonical_name_ar)}
          ${kv('الاسم الإنجليزي المعياري', e.canonical_name_en)}
          ${kv('المدينة', e.city)}
          ${kv('الحي', e.district)}
          ${kv('العنوان المختصر', e.short_address)}
          ${kv('الرابط المرجعي', e.reference_url)}
          ${kv('الحساب الرسمي', e.official_instagram)}
          ${kv('رقم التواصل', e.phone)}
          ${kv('ساعات العمل', e.hours_summary)}
          ${kv('الفئة', e.category)}
        </div>
      </div>
      <div class="card">
        <div class="section-kicker">التجربة والمكان</div>
        <h3>ملامح المكان</h3>
        <div class="kv">
          ${kv('مناسب للعمل', displayFlag(e._norm.work_friendly))}
          ${kv('مناسب للجلسات', displayFlag(e._norm.group_friendly))}
          ${kv('مناسب للسهر', displayFlag(e._norm.late_night))}
          ${kv('مناسب للعوائل', displayFlag(e._norm.family_friendly))}
          ${kv('جلسات داخلية', displayFlag(e._norm.indoor_seating))}
          ${kv('جلسات خارجية', displayFlag(e._norm.outdoor_seating))}
          ${kv('المواقف', displayFlag(e._norm.parking))}
          ${kv('الهدوء', displayLevel(e.quietness))}
          ${kv('الازدحام', displayLevel(e.crowd_level))}
          ${kv('القهوة المختصة', displayFlag(e._norm.specialty_coffee))}
          ${kv('الحلويات', displayFlag(e._norm.desserts))}
          ${kv('مستوى السعر', displayPrice(e.price_level))}
        </div>
      </div>
    </div>
    <div class="section grid cards-2">
      <div class="card">
        <div class="section-kicker">وصف وتوجيه</div>
        <h3>نبذة سريعة</h3>
        <ul class="list-clean">
          <li><strong>شخصية المكان:</strong> ${esc(displayText(e.place_personality))}</li>
          <li><strong>أفضل وقت:</strong> ${esc(displayText(e.best_visit_time))}</li>
          <li><strong>لماذا قد يختاره الزائر:</strong> ${esc(displayText(e.why_choose_it))}</li>
          <li><strong>لمن قد لا يكون مناسبًا:</strong> ${esc(displayText(e.not_for_whom))}</li>
        </ul>
      </div>
      <div class="card">
        <div class="section-kicker">المراجعة والجودة</div>
        <h3>معلومات إضافية</h3>
        <div class="kv">
          ${kv('الحالة', STATUS_AR[e.status] || e.status)}
          ${kv('السجل المكرر المرجعي', e.duplicate_of || '—')}
          ${kv('سبب الأرشفة', e.archive_reason || '—')}
          ${kv('آخر تحقق', e.last_verified_at)}
          ${kv('ملاحظات المصادر', e.source_notes)}
        </div>
      </div>
    </div>
  `;
}

function renderStatusPage() {
  const statuses = state.raw?.status_enum || Object.keys(STATUS_AR);
  return `
    <div class="grid cards-4">
      ${statuses.map(s => `<div class="card"><h3>${esc(STATUS_AR[s] || s)}</h3><div class="metric">${statCount(s)}</div><div class="note">${esc(s)}</div></div>`).join('')}
    </div>
    <div class="section">
      ${renderFilterBar()}
      ${renderResultsSection(filterRecords(), {
        title: 'السجلات حسب الحالة',
        note: 'يمكنك التصفية حسب الحالة والحي والثقة للوصول بسرعة.',
        emptyTitle: 'لا توجد سجلات مطابقة',
        emptyNote: 'جرّب تغيير الفلاتر الحالية.',
      })}
    </div>
  `;
}

function renderDistrictsPage(selectedDistrict = '') {
  const groups = uniq(state.records.map(r => (r.district || '').trim()).filter(Boolean)).sort((a,b)=>a.localeCompare(b,'ar'));
  if (selectedDistrict) {
    const items = filterRecords(state.records.filter(r => r.district === selectedDistrict));
    const topPicks = topRatedRecords(items, 3);
    return `
      <div class="hero page-hero"><div class="section-kicker">الأحياء</div><h3>\u062d\u064a ${esc(selectedDistrict)}</h3><p>\u0623\u0647\u0645 \u0627\u0644\u0643\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u0631\u062a\u0628\u0637\u0629 \u0628\u0647\u0630\u0627 \u0627\u0644\u062d\u064a \u062f\u0627\u062e\u0644 \u0627\u0644\u062f\u0644\u064a\u0644.</p></div>
      <div class="grid cards-4 section">
        <div class="card mini-panel"><div class="metric">${items.length}</div><div class="metric-sub">\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0643\u064a\u0627\u0646\u0627\u062a</div></div>
        <div class="card mini-panel"><div class="metric">${avgRating(items)}</div><div class="metric-sub">\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u062a\u0642\u064a\u064a\u0645</div></div>
        <div class="card mini-panel"><div class="metric">${items.filter(r=>r.status==='verified').length}</div><div class="metric-sub">\u0645\u0639\u062a\u0645\u062f</div></div>
        <div class="card mini-panel"><div class="metric">${items.filter(r=>r.status==='needs_review').length}</div><div class="metric-sub">\u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629</div></div>
      </div>
      <div class="section grid cards-2">
        <div class="card">
          <div class="section-kicker">\u0645\u062e\u062a\u0627\u0631\u0627\u062a</div>
          <h3>\u0623\u0628\u0631\u0632 \u0627\u0644\u0643\u064a\u0627\u0646\u0627\u062a</h3>
          ${topPicks.length ? `<div class="stack-list">${topPicks.map(item => `
            <a href="#/entities/${esc(item.slug)}" class="stack-item">
              <strong>${esc(item.name)}</strong>
              <span>${esc(item.google_rating || '—')} من 5 • ${displayConfidence(item.confidence)}</span>
            </a>
          `).join('')}</div>` : '<div class="empty">\u0644\u0627 \u062a\u0648\u062c\u062f \u0645\u062e\u062a\u0627\u0631\u0627\u062a \u0638\u0627\u0647\u0631\u0629 \u062d\u0627\u0644\u064a\u064b\u0627.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">\u0627\u0644\u0627\u0633\u062a\u0643\u0634\u0627\u0641</div>
          <h3>\u0628\u0631\u0646\u0627\u0645\u062c \u0633\u0631\u064a\u0639</h3>
          <p class="note">\u0627\u0628\u062f\u0623 \u0628\u0627\u0644\u0643\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0623\u0643\u062b\u0631 \u062a\u0642\u064a\u064a\u0645\u064b\u0627 \u0623\u0648 \u0639\u062f \u0644\u0644\u0623\u062d\u064a\u0627\u0621 \u0644\u0627\u0633\u062a\u0643\u0645\u0627\u0644 \u0627\u0644\u062a\u0635\u0641\u062d.</p>
        </div>
      </div>
      <div class="section-header"><h3>\u0643\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u064a</h3><div class="actions"><a href="#/districts" class="button">\u0627\u0644\u0639\u0648\u062f\u0629 \u0644\u0644\u0623\u062d\u064a\u0627\u0621</a></div></div>
      <div class="section">${renderResultsSection(items, {
        title: 'كيانات الحي',
        note: 'نتائج الحي تظهر كبطاقات سريعة ثم جدول للمقارنة.',
        emptyTitle: 'لا توجد كيانات في هذا الحي',
        emptyNote: 'قد تتم إضافة كيانات جديدة هنا لاحقًا.',
      })}</div>
    `;
  }
  const districtHighlights = topDistrictGroups(state.records, 6);
  return `
    <div class="hero page-hero"><div class="section-kicker">\u062a\u0635\u0641\u062d \u062d\u0633\u0628 \u0627\u0644\u0645\u0648\u0642\u0639</div><h3>\u0627\u0644\u0623\u062d\u064a\u0627\u0621</h3><p>\u062a\u0635\u0641\u062d \u0623\u062d\u064a\u0627\u0621 \u0628\u0631\u064a\u062f\u0629 \u0648\u0627\u0641\u062a\u062d \u0635\u0641\u062d\u0629 \u0643\u0644 \u062d\u064a \u0645\u0628\u0627\u0634\u0631\u0629.</p></div>
    <div class="section">
      <div class="district-badges district-badges-large">
        ${districtHighlights.map(group => `<a href="${districtHref(group.name)}" class="district-badge"><strong>${esc(group.name)}</strong><span>${group.count} كيانات • ${group.avg}</span></a>`).join('')}
      </div>
    </div>
    <div class="table-wrap"><table class="table"><thead><tr><th>\u0627\u0644\u062d\u064a</th><th>\u0639\u062f\u062f \u0627\u0644\u0633\u062c\u0644\u0627\u062a</th><th>\u0645\u062a\u0648\u0633\u0637 \u0627\u0644\u062a\u0642\u064a\u064a\u0645</th><th>\u0645\u0639\u062a\u0645\u062f</th><th>\u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629</th></tr></thead><tbody>
      ${groups.map(g => {
        const items = state.records.filter(r => r.district === g);
        return `<tr><td>${districtLink(g)}</td><td>${items.length}</td><td>${avgRating(items)}</td><td>${items.filter(r=>r.status==='verified').length}</td><td>${items.filter(r=>r.status==='needs_review').length}</td></tr>`;
      }).join('')}
    </tbody></table></div>
  `;
}

function renderFiltersPage() {
  const items = filterRecords();
  return `${renderFilterBar()}<div class="section grid cards-4">
    <div class="card"><div class="metric">${items.filter(r=>r._norm.specialty_coffee==='yes').length}</div><div class="metric-sub">مختصة</div></div>
    <div class="card"><div class="metric">${items.filter(r=>r._norm.desserts==='yes').length}</div><div class="metric-sub">حلويات</div></div>
    <div class="card"><div class="metric">${items.filter(r=>r._norm.work_friendly==='yes').length}</div><div class="metric-sub">مناسب للعمل</div></div>
    <div class="card"><div class="metric">${items.filter(r=>r._norm.late_night==='yes').length}</div><div class="metric-sub">مناسب للسهر</div></div>
  </div><div class="section">${renderResultsSection(items, {
    title: 'نتائج الفلاتر',
    note: 'يمكنك تغيير أكثر من فلتر لتضييق النتائج بدقة أكبر.',
    emptyTitle: 'لا توجد نتائج لهذه الفلاتر',
    emptyNote: 'خفف عدد الفلاتر أو امسحها لعرض نتائج أوسع.',
  })}</div>`;
}

function renderDiscoveryPage() {
  const items = filterRecords(state.records.filter(r => ['discovered','profiled'].includes(r.status)));
  return `${renderFilterBar()}<div class="card"><h3>الاكتشاف</h3><p class="note">سجلات أولية ما زالت في مرحلة الجمع أو الإعداد.</p></div><div class="section">${renderResultsSection(items, {
    title: 'السجلات الأولية',
    note: 'هذه السجلات ما زالت في بداية رحلتها داخل الدليل.',
    emptyTitle: 'لا توجد سجلات أولية حاليًا',
    emptyNote: 'قد تظهر هنا سجلات جديدة مع توسع الدليل.',
  })}</div>`;
}

function renderReviewPage() {
  const items = filterRecords(state.records.filter(r => ['needs_review','branch_conflict','partially_verified'].includes(r.status)));
  return `${renderFilterBar()}<div class="grid cards-2"><div class="card"><h3>يحتاج مراجعة</h3><div class="metric">${state.records.filter(r=>r.status==='needs_review').length}</div></div><div class="card"><h3>تعارض فروع</h3><div class="metric">${state.records.filter(r=>r.status==='branch_conflict').length}</div></div></div><div class="section">${renderResultsSection(items, {
    title: 'السجلات التي تحتاج متابعة',
    note: 'هذه النتائج تحتاج مراجعة أو توحيد قبل أن تصبح أكثر استقرارًا.',
    emptyTitle: 'لا توجد سجلات تحتاج متابعة',
    emptyNote: 'الوضع الحالي يبدو مستقرًا في هذه الصفحة.',
  })}</div>`;
}

function renderSearch(term) {
  const q = term.toLowerCase();
  const items = state.records.filter(r => [r.name,r.alternate_name,r.district,r.editorial_summary,r.short_address].join(' ').toLowerCase().includes(q));
  return `
    <div class="hero page-hero">
      <div class="section-kicker">نتائج البحث</div>
      <h3>البحث عن: ${esc(term || '—')}</h3>
      <p>تصفح النتائج المطابقة مباشرة، أو عدّل البحث من القائمة الجانبية.</p>
    </div>
    ${renderResultsSection(items, {
      title: 'النتائج المطابقة',
      note: term ? `عرض النتائج المرتبطة بعبارة: ${term}` : 'أدخل كلمة بحث لعرض النتائج.',
      emptyTitle: 'لا توجد نتائج مطابقة',
      emptyNote: 'جرّب كلمة أخرى أو ابحث باسم حي أو كيان.',
    })}
  `;
}

function collectFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}
function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function downloadText(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportableBatchPayload(queueKey = 'needs-review') {
  const workspace = bulkWorkspaceState(queueKey);
  return {
    queue: queueKey,
    title: workspace.queueTitle,
    exported_at: new Date().toISOString(),
    finished_at: workspace.session.finishedAt || '',
    counts: workspace.counts,
    summary: workspace.summary,
    decisions: workspace.items.map(item => ({
      slug: item.slug,
      name: item.name,
      district: displayText(item.district),
      reason: attentionQueues()[queueKey].reason(item),
      missing: importantMissingFields(item),
      priority: queuePriorityBadge(item, queueKey),
      decision: bulkDecisionValue(workspace.session, item.slug)?.decision || '',
      decision_label: bulkDecisionLabel(bulkDecisionValue(workspace.session, item.slug)?.decision),
      execution_status: bulkDecisionValue(workspace.session, item.slug)?.executionStatus || '',
      next_action: bulkDecisionValue(workspace.session, item.slug)?.nextAction || '',
      note: bulkDecisionValue(workspace.session, item.slug)?.note || '',
      updated_at: bulkDecisionValue(workspace.session, item.slug)?.updatedAt || '',
    })),
  };
}

function exportableBatchCsv(queueKey = 'needs-review') {
  const payload = exportableBatchPayload(queueKey);
  const lines = [
    ['slug', 'name', 'district', 'reason', 'missing', 'priority', 'decision', 'execution_status', 'next_action', 'note', 'updated_at'].join(','),
    ...payload.decisions.map(item => [
      item.slug,
      item.name,
      item.district,
      item.reason,
      item.missing.join(' | '),
      item.priority,
      item.decision_label,
      item.execution_status,
      item.next_action,
      item.note,
      item.updated_at,
    ].map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')),
  ];
  return lines.join('\n');
}

function exportableBatchSummary(queueKey = 'needs-review') {
  const payload = exportableBatchPayload(queueKey);
  return [
    `جلسة: ${payload.title}`,
    `تاريخ التصدير: ${payload.exported_at}`,
    `انتهت الجلسة: ${payload.finished_at || 'لم تُنهَ بعد'}`,
    `إجمالي الدفعة: ${payload.counts.total}`,
    `تمت المعالجة: ${payload.summary.decisionCounts.done}`,
    `يحتاج إكمالًا: ${payload.summary.decisionCounts.completion}`,
    `جاهز للمتابعة لاحقًا: ${payload.summary.decisionCounts.followup}`,
    `مؤجل: ${payload.summary.decisionCounts.defer}`,
    `مراجعة أعمق: ${payload.summary.decisionCounts.deep}`,
    '',
    `Resolved in session: ${payload.summary.followup.resolved.map(item => item.name).join('، ') || 'لا يوجد'}`,
    `Needs deeper review: ${payload.summary.followup.deep_review.map(item => item.name).join('، ') || 'لا يوجد'}`,
    `Needs source work: ${payload.summary.followup.needs_source.map(item => item.name).join('، ') || 'لا يوجد'}`,
    `Needs district work: ${payload.summary.followup.needs_district.map(item => item.name).join('، ') || 'لا يوجد'}`,
    `Needs completion: ${payload.summary.followup.needs_completion.map(item => item.name).join('، ') || 'لا يوجد'}`,
  ].join('\n');
}

function pushExportHistoryEntry(queueKey = 'needs-review', format = 'json') {
  const payload = exportableBatchPayload(queueKey);
  const history = getExportHistory();
  history.unshift({
    id: `${queueKey}-${format}-${Date.now()}`,
    queueKey,
    label: payload.title,
    format,
    exportedAt: payload.exported_at,
    total: payload.counts.total,
    summary: `أُنجز ${payload.summary.decisionCounts.done} • مؤجل ${payload.summary.decisionCounts.defer} • أعمق ${payload.summary.decisionCounts.deep}`,
  });
  saveExportHistory(history);
}
function queueFileRelativePath() {
  return '../agent_queue/import_queue.json';
}
function makeQueueRequest(payload = {}) {
  return {
    id: `import-${Date.now()}`,
    created_at: new Date().toISOString(),
    status: 'queued',
    maps_url: String(payload.maps_url || '').trim(),
    raw_text: String(payload.raw_text || '').trim(),
    requested_action: 'import_new_cafe_from_maps',
    notes: String(payload.notes || 'Created from New Cafe in wiki').trim()
  };
}
async function appendQueueRequestToProject(request) {
  if (!window.showOpenFilePicker) throw new Error('file-system-access-unavailable');
  const [fileHandle] = await window.showOpenFilePicker({
    multiple: false,
    excludeAcceptAllOption: false,
    suggestedName: 'import_queue.json',
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
  });
  const file = await fileHandle.getFile();
  const text = await file.text();
  const queue = JSON.parse(text || '{}');
  if (!Array.isArray(queue.requests)) queue.requests = [];
  queue.updated_at = new Date().toISOString();
  queue.requests.push(request);
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(queue, null, 2));
  await writable.close();
}
function bindEditorActions() {
  document.querySelectorAll('[data-action="toggle-edit"]').forEach(btn => btn.addEventListener('click', () => {
    state.editMode = true;
    state.currentSlug = btn.dataset.slug;
    state.draftMessage = '';
    router();
  }));
  document.querySelectorAll('[data-action="cancel-edit"]').forEach(btn => btn.addEventListener('click', () => {
    state.editMode = false;
    state.currentSlug = null;
    state.draftMessage = '';
    router();
  }));
  document.querySelectorAll('[data-action="import-draft"]').forEach(btn => btn.addEventListener('click', () => {
    const form = document.getElementById('editForm');
    const input = document.getElementById('googleMapsImport');
    const rawInput = document.getElementById('googleMapsRawText');
    state.importDraftText = input?.value || '';
    state.importRawText = rawInput?.value || '';
    const imported = extractGoogleMapsDraft(state.importDraftText, state.importRawText);
    applyImportedDraftToForm(form, imported);
    registerImportRecord({
      id: `import-result-${btn.dataset.slug}-${Date.now()}`,
      slug: btn.dataset.slug,
      name: imported.name || getEntity(btn.dataset.slug)?.name || '',
      type: 'result',
      status: Object.keys(imported).length ? 'imported-to-form' : 'follow-up-needed',
      note: Object.keys(imported).length ? 'تمت تعبئة draft أولي داخل النموذج.' : 'لم تُستخرج حقول كافية من المدخلات الحالية.',
      source: 'maps-parse',
    });
    state.draftMessage = Object.keys(imported).length
      ? (btn.dataset.slug === 'new-cafe-draft' ? 'تم جلب البيانات الأساسية الأولية داخل النموذج.' : 'تم تعبئة draft أولي من الرابط والنص الخام داخل النموذج.')
      : 'لم أستخرج حقولًا كافية من المدخلات الحالية.';
  }));
  document.querySelectorAll('[data-action="queue-import"]').forEach(btn => btn.addEventListener('click', async () => {
    const form = document.getElementById('editForm');
    const payload = collectFormData(form);
    const request = makeQueueRequest({
      maps_url: document.getElementById('googleMapsImport')?.value || payload.reference_url || '',
      raw_text: document.getElementById('googleMapsRawText')?.value || '',
      notes: `New Cafe draft: ${payload.name || 'unnamed'}`
    });
    try {
      await appendQueueRequestToProject(request);
      registerImportRecord({
        id: request.id,
        slug: btn.dataset.slug,
        name: payload.name || '',
        type: 'request',
        status: 'queued',
        note: 'تمت إضافة طلب الاستيراد إلى queue محلية.',
        source: 'new-cafe-workbench',
      });
      state.queueMessage = `Queued successfully: ${request.id} -> agent_queue/import_queue.json`;
    } catch (err) {
      downloadJson(`${request.id}.queue-request.json`, request);
      registerImportRecord({
        id: request.id,
        slug: btn.dataset.slug,
        name: payload.name || '',
        type: 'request',
        status: 'fallback-exported',
        note: `تعذرت الكتابة المباشرة، وتم تنزيل ملف يمكن إضافته لاحقًا إلى ${queueFileRelativePath()}`,
        source: 'new-cafe-workbench',
      });
      state.queueMessage = `Direct write unavailable. Downloaded JSON request; add it later to ${queueFileRelativePath()}`;
    }
  }));
  document.querySelectorAll('[data-action="save-draft"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug;
    const form = document.getElementById('editForm');
    const payload = collectFormData(form);
    saveDraft(slug, payload);
    state.draftMessage = 'تم حفظ الـ draft محليًا على هذا الجهاز.';
    router();
  }));
  document.querySelectorAll('[data-action="export-patch"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug;
    const form = document.getElementById('editForm');
    const entity = getEntity(slug);
    const payload = collectFormData(form);
    const isNew = !entity && slug === 'new-cafe-draft';
    const patch = isNew ? payload : diffRecord(entity, payload);
    downloadJson(`${slug}.patch.json`, {
      slug,
      exported_at: new Date().toISOString(),
      mode: isNew ? 'create_draft' : 'update',
      patch
    });
    registerPatchExportRecord({
      id: `patch-${slug}-${Date.now()}`,
      slug,
      name: payload.name || entity?.name || slug,
      exportedAt: new Date().toISOString(),
      mode: isNew ? 'create_draft' : 'update',
      changeCount: Object.keys(patch).length,
      readiness: editorialReadiness(payload).key,
      note: Object.keys(patch).length ? `يتضمن ${Object.keys(patch).length} تغييرًا.` : 'لا توجد تغييرات جوهرية واضحة في التصدير الحالي.',
      status: editorialReadiness(payload).key === 'export-ready' ? 'ready-for-follow-up' : 'pending-review',
    });
    state.draftMessage = `تم تصدير patch للسجل ${slug}.`;
    saveDraft(slug, payload);
    router();
  }));
  document.querySelectorAll('[data-action="verification-session-start"]').forEach(btn => btn.addEventListener('click', () => {
    const scopeType = btn.dataset.sessionType || 'queue';
    const scopeKey = btn.dataset.sessionScope || 'source-review';
    const recordSlugs = scopeType === 'queue'
      ? (verificationQueues()[scopeKey]?.records().map(item => item.slug) || [])
      : [scopeKey];
    startOrOpenVerificationSession({
      scopeType,
      scopeKey,
      title: btn.dataset.sessionTitle || '',
      queueKey: scopeType === 'queue' ? scopeKey : '',
      recordSlugs,
    });
    state.draftMessage = scopeType === 'queue'
      ? 'تم فتح أو تحديث جلسة التحقق لهذا الصف.'
      : 'تم فتح أو تحديث جلسة التحقق لهذا السجل.';
    router();
  }));
  document.querySelectorAll('[data-action="verification-decision"]').forEach(btn => btn.addEventListener('click', () => {
    const noteId = btn.dataset.noteId || '';
    const note = noteId ? (document.getElementById(noteId)?.value || '') : '';
    const entry = registerVerificationDecision({
      scopeType: btn.dataset.sessionType || 'queue',
      scopeKey: btn.dataset.sessionScope || 'source-review',
      queueKey: btn.dataset.queue || '',
      slug: btn.dataset.slug || '',
      decision: btn.dataset.decision || 'review',
      note,
    });
    state.draftMessage = entry
      ? `تم تسجيل قرار تحقق: ${entry.decisionLabel}.`
      : 'تعذر تسجيل قرار التحقق لهذا السجل.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-status"]').forEach(btn => btn.addEventListener('click', () => {
    const mission = updateMissionState({
      missionId: btn.dataset.missionId || '',
      status: btn.dataset.status || 'in_progress',
    });
    state.draftMessage = mission
      ? `تم تحديث المهمة إلى: ${missionStatusLabel(mission.status)}.`
      : 'تعذر تحديث المهمة الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-session-start"]').forEach(btn => btn.addEventListener('click', () => {
    const session = startOrOpenMissionSession(btn.dataset.missionId || '');
    state.draftMessage = session
      ? 'تم فتح أو استكمال جلسة التنفيذ لهذه المهمة.'
      : 'تعذر فتح جلسة التنفيذ الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-attempt"]').forEach(btn => btn.addEventListener('click', () => {
    const noteId = btn.dataset.noteId || '';
    const note = noteId ? (document.getElementById(noteId)?.value || '') : '';
    const attempt = addMissionAttempt({
      missionId: btn.dataset.missionId || '',
      slug: btn.dataset.slug || '',
      outcome: btn.dataset.outcome || 'partial',
      note,
    });
    state.draftMessage = attempt
      ? `تم تسجيل محاولة تنفيذ: ${missionAttemptOutcomeLabel(attempt.outcome)}.`
      : 'تعذر تسجيل محاولة التنفيذ الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-session-status"]').forEach(btn => btn.addEventListener('click', () => {
    const session = setMissionSessionStatus(btn.dataset.missionId || '', btn.dataset.status || 'active');
    state.draftMessage = session
      ? `تم تحديث الجلسة إلى: ${missionSessionStatusLabel(session.status)}.`
      : 'تعذر تحديث حالة الجلسة الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-session-export"]').forEach(btn => btn.addEventListener('click', () => {
    const ok = exportMissionSession(btn.dataset.missionId || '', btn.dataset.format || 'json');
    state.draftMessage = ok
      ? 'تم تصدير مخرجات الجلسة الحالية.'
      : 'تعذر تصدير مخرجات الجلسة الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="release-pack-export"]').forEach(btn => btn.addEventListener('click', () => {
    const ok = exportReleasePack(btn.dataset.packId || '', btn.dataset.format || 'json');
    state.draftMessage = ok
      ? 'تم تصدير حزمة الجاهزية الحالية.'
      : 'تعذر تصدير حزمة الجاهزية الحالية.';
    router();
  }));
  document.querySelectorAll('[data-action="final-patch-decision"]').forEach(btn => btn.addEventListener('click', () => {
    const note = document.getElementById(btn.dataset.noteId || '')?.value || '';
    const entry = saveFinalPatchDecision({
      slug: btn.dataset.slug || '',
      decision: btn.dataset.decision || 'rereview',
      note,
    });
    state.draftMessage = entry
      ? `تم تحديث القرار النهائي للسجل إلى: ${finalPatchDecisionLabel(entry.decision)}.`
      : 'تعذر تحديث قرار final patch لهذا السجل.';
    router();
  }));
  document.querySelectorAll('[data-action="final-patch-export"]').forEach(btn => btn.addEventListener('click', () => {
    const ok = exportFinalPatchBundle(btn.dataset.format || 'json');
    state.draftMessage = ok
      ? 'تم تصدير Final Patch Candidate Bundle الحالية.'
      : 'تعذر تصدير Final Patch Candidate Bundle.';
    router();
  }));
  document.querySelectorAll('[data-action="patch-signoff-decision"]').forEach(btn => btn.addEventListener('click', () => {
    const note = document.getElementById(btn.dataset.noteId || '')?.value || '';
    const entry = savePatchSignoffDecision({
      slug: btn.dataset.slug || '',
      decision: btn.dataset.decision || 'ready-for-signoff',
      note,
    });
    state.draftMessage = entry
      ? `تم تحديث حالة التوقيع إلى: ${patchSignoffLabel(entry.decision)}.`
      : 'تعذر تحديث حالة التوقيع النهائي لهذا السجل.';
    router();
  }));
  document.querySelectorAll('[data-action="patch-signoff-export"]').forEach(btn => btn.addEventListener('click', () => {
    const ok = exportPatchSignoffOutput(btn.dataset.kind || 'simulation', btn.dataset.format || 'json');
    state.draftMessage = ok
      ? 'تم تصدير مخرجات simulation / sign-off الحالية.'
      : 'تعذر تصدير مخرجات simulation / sign-off.';
    router();
  }));
  document.querySelectorAll('[data-action="run-record-agent"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug || '';
    state.agentRunState = {
      slug,
      agentType: 'completion',
      status: 'loading',
      message: 'جارٍ تشغيل وكيل استكمال السجل وتحليل الحقول المؤهلة...',
    };
    router();
    window.setTimeout(async () => {
      try {
        const result = await runRecordCompletionAgent(slug);
        await refreshAgentRuntimeInfo();
        state.agentRunState = {
          slug,
          agentType: 'completion',
          status: result.status,
          message: result.message,
        };
        state.draftMessage = result.message;
      } catch (error) {
        state.agentRunState = {
          slug,
          agentType: 'completion',
          status: 'error',
          message: 'حدث خطأ أثناء تشغيل الوكيل.',
        };
        state.draftMessage = 'حدث خطأ أثناء تشغيل الوكيل.';
      }
      router();
    }, 120);
  }));
  document.querySelectorAll('[data-action="run-verification-agent"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug || '';
    state.agentRunState = {
      slug,
      agentType: 'verification',
      status: 'loading',
      message: 'جارٍ تشغيل وكيل دعم التحقق وتحليل سياق الأدلة والقرار الحالي...',
    };
    router();
    window.setTimeout(async () => {
      try {
        const result = await runVerificationSupportAgent(slug);
        await refreshAgentRuntimeInfo();
        state.agentRunState = {
          slug,
          agentType: 'verification',
          status: result.status,
          message: result.message,
        };
        state.draftMessage = result.message;
      } catch (error) {
        state.agentRunState = {
          slug,
          agentType: 'verification',
          status: 'error',
          message: 'حدث خطأ أثناء تشغيل وكيل التحقق.',
        };
        state.draftMessage = 'حدث خطأ أثناء تشغيل وكيل التحقق.';
      }
      router();
    }, 120);
  }));
  document.querySelectorAll('[data-action="agent-batch-run"]').forEach(btn => btn.addEventListener('click', () => {
    const agentKey = btn.dataset.agentKey || 'completion';
    const agent = agentDefinitionByKey(agentKey);
    const eligibleCount = agent.eligibleRecords().length;
    const batchCount = agent.batchRecords().length;
    state.agentBatchState = {
      agentKey,
      title: agent.title,
      scopeLabel: `دفعة تشغيل (${batchCount})`,
      status: 'running',
      summary: null,
    };
    state.draftMessage = `جارٍ تشغيل ${agent.title} على ${batchCount} سجلًا، منها ${eligibleCount} مؤهلة مبدئيًا.`;
    router();
    window.setTimeout(async () => {
      try {
        const run = await runAgentBatch(agentKey);
        await refreshAgentRuntimeInfo();
        state.agentBatchState = run;
        state.draftMessage = `اكتمل تشغيل ${agent.title}: ${run.summary.generated} سجلات أنتجت proposals، و${run.summary.noEligible} بلا أهلية، و${run.summary.failed} فشلت.`;
        location.hash = `#/agent-ops?run=${encodeURIComponent(run.id)}`;
        return;
      } catch (error) {
        state.agentBatchState = {
          agentKey,
          title: agent.title,
          scopeLabel: 'دفعة السجلات المؤهلة',
          status: 'failed',
          summary: { total: batchCount, generated: 0, noEligible: 0, failed: batchCount, proposals: 0, manualReview: 0 },
        };
        state.draftMessage = `فشل تشغيل ${agent.title} على الدفعة الحالية.`;
      }
      router();
    }, 120);
  }));
  document.querySelectorAll('[data-action="agent-scope-save"]').forEach(btn => btn.addEventListener('click', () => {
    const scope = {
      kind: btn.dataset.scopeKind || 'queue',
      key: btn.dataset.scopeKey || 'quick-complete',
      label: btn.dataset.scopeLabel || 'دفعة محفوظة',
    };
    const batch = saveAgentBatchTemplate({
      agentKey: btn.dataset.agentKey || scopeAgentRecommendation(scope),
      scope,
      title: `${agentDefinitionByKey(btn.dataset.agentKey || scopeAgentRecommendation(scope)).title} • ${scope.label}`,
    });
    state.draftMessage = `تم حفظ دفعة وكيل جديدة: ${batch.title}.`;
    router();
  }));
  document.querySelectorAll('[data-action="agent-scope-run"]').forEach(btn => btn.addEventListener('click', () => {
    const scope = {
      kind: btn.dataset.scopeKind || 'queue',
      key: btn.dataset.scopeKey || 'quick-complete',
      label: btn.dataset.scopeLabel || 'دفعة scoped',
    };
    const agentKey = btn.dataset.agentKey || scopeAgentRecommendation(scope);
    const agent = agentDefinitionByKey(agentKey);
    const scopedRecords = recordsForAgentScope(scope);
    state.agentBatchState = {
      agentKey,
      title: agent.title,
      scopeLabel: `${agentScopeKindLabel(scope.kind)}: ${scope.label}`,
      status: 'running',
      summary: null,
    };
    state.draftMessage = `جارٍ تشغيل ${agent.title} على نطاق ${scope.label} (${scopedRecords.length} سجل).`;
    router();
    window.setTimeout(async () => {
      try {
        const run = await runAgentBatchScoped(agentKey, scope);
        await refreshAgentRuntimeInfo();
        state.agentBatchState = run;
        state.draftMessage = `اكتمل تشغيل ${agent.title} على ${scope.label}: ${run.summary.generated} سجلات أنتجت proposals، و${run.summary.noEligible} بلا أهلية، و${run.summary.failed} فشلت.`;
        location.hash = `#/agent-ops?run=${encodeURIComponent(run.id)}`;
        return;
      } catch (error) {
        state.agentBatchState = {
          agentKey,
          title: agent.title,
          scopeLabel: `${agentScopeKindLabel(scope.kind)}: ${scope.label}`,
          status: 'failed',
          summary: { total: scopedRecords.length, generated: 0, noEligible: 0, failed: scopedRecords.length, proposals: 0, manualReview: 0, editorialHandoff: 0, verificationHandoff: 0 },
        };
        state.draftMessage = `فشل تشغيل ${agent.title} على نطاق ${scope.label}.`;
      }
      router();
    }, 120);
  }));
  document.querySelectorAll('[data-action="saved-agent-batch-run"]').forEach(btn => btn.addEventListener('click', () => {
    const batch = savedAgentBatchEntries().find(item => item.id === (btn.dataset.batchId || ''));
    if (!batch) {
      state.draftMessage = 'تعذر العثور على الدفعة المحفوظة.';
      router();
      return;
    }
    const agent = agentDefinitionByKey(batch.agentKey);
    const scopedRecords = recordsForAgentScope(batch.scope);
    state.agentBatchState = {
      agentKey: batch.agentKey,
      title: agent.title,
      scopeLabel: `${agentScopeKindLabel(batch.scope.kind)}: ${batch.scope.label}`,
      status: 'running',
      summary: null,
    };
    state.draftMessage = `جارٍ إعادة تشغيل ${agent.title} على الدفعة المحفوظة "${batch.title}" (${scopedRecords.length} سجل).`;
    router();
    window.setTimeout(async () => {
      try {
        const run = await runAgentBatchScoped(batch.agentKey, batch.scope);
        await refreshAgentRuntimeInfo();
        state.agentBatchState = run;
        state.draftMessage = `اكتمل تشغيل الدفعة المحفوظة "${batch.title}".`;
        location.hash = `#/agent-ops?run=${encodeURIComponent(run.id)}`;
        return;
      } catch (error) {
        state.agentBatchState = {
          agentKey: batch.agentKey,
          title: agent.title,
          scopeLabel: `${agentScopeKindLabel(batch.scope.kind)}: ${batch.scope.label}`,
          status: 'failed',
          summary: { total: scopedRecords.length, generated: 0, noEligible: 0, failed: scopedRecords.length, proposals: 0, manualReview: 0, editorialHandoff: 0, verificationHandoff: 0 },
        };
        state.draftMessage = `فشل تشغيل الدفعة المحفوظة "${batch.title}".`;
      }
      router();
    }, 120);
  }));
  document.querySelectorAll('[data-action="agent-proposal-status"]').forEach(btn => btn.addEventListener('click', () => {
    const proposal = updateAgentProposalStatus(btn.dataset.proposalId || '', btn.dataset.status || 'in_review');
    state.draftMessage = proposal
      ? `تم تحديث الاقتراح إلى: ${agentProposalStatusLabel(proposal.status)}.`
      : 'تعذر تحديث حالة الاقتراح.';
    router();
  }));
  document.querySelectorAll('[data-action="agent-proposal-accept"]').forEach(btn => btn.addEventListener('click', () => {
    const proposal = acceptAgentProposalToDraft(btn.dataset.proposalId || '');
    state.draftMessage = proposal
      ? proposal.handoffTarget === 'verification_draft'
        ? 'تم قبول الاقتراح وحفظه داخل draft التحقق فقط.'
        : 'تم قبول الاقتراح وحفظه داخل draft التحريرية فقط.'
      : 'تعذر قبول الاقتراح الحالي.';
    router();
  }));
  document.querySelectorAll('[data-action="mission-seed"]').forEach(btn => btn.addEventListener('click', () => {
    const record = getEntity(btn.dataset.slug || state.currentSlug || '');
    const suggestion = suggestedRecordMissions(record).find(item => item.id === btn.dataset.missionId);
    const seeded = seedMissionFromSuggestion(suggestion || {});
    state.draftMessage = seeded
      ? 'تم فتح مهمة جديدة لهذا السجل.'
      : 'تعذر فتح مهمة جديدة لهذا السجل.';
    router();
  }));
  document.querySelectorAll('[data-action="add-evidence"]').forEach(btn => btn.addEventListener('click', () => {
    const slug = btn.dataset.slug || '';
    const record = getEntity(slug);
    addEvidenceEntry({
      slug,
      name: record?.name || slug,
      category: document.getElementById('evidenceCategory')?.value || 'general',
      outcome: document.getElementById('evidenceOutcome')?.value || 'pending',
      note: document.getElementById('evidenceNote')?.value || '',
      rationale: document.getElementById('evidenceNote')?.value || '',
      sourceState: sourceVerificationState(record || {}).key,
      districtState: districtVerificationState(record || {}).key,
      confidenceState: confidenceVerificationState(record || {}).key,
    });
    state.draftMessage = 'تمت إضافة دليل جديد إلى evidence trail لهذا السجل.';
    router();
  }));
}

function applyDashboardPreset(preset = '') {
  Object.keys(state.filters).forEach(key => { state.filters[key] = ''; });
  switch (preset) {
    case 'review':
      location.hash = queueHref('needs-review');
      return;
    case 'unverified':
      location.hash = queueHref('new-incomplete');
      return;
    case 'missing-district':
      location.hash = queueHref('missing-district');
      return;
    case 'low-confidence':
      location.hash = queueHref('low-confidence');
      return;
    default:
      return;
  }
}

function bindDashboardActions() {
  document.querySelectorAll('[data-action="dashboard-preset"]').forEach(btn => {
    btn.addEventListener('click', () => {
      applyDashboardPreset(btn.dataset.preset);
    });
  });
  document.querySelectorAll('[data-action="queue-sort"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.queueSort = btn.dataset.sort || 'default';
      const { parts } = parseHashRoute();
      const [, queueId] = parts;
      if (parts[0] === 'ops') {
        location.hash = queueHref(decodeURIComponent(queueId || 'needs-review'), { priority: state.queuePriority, sort: state.queueSort });
        return;
      }
      if (parts[0] === 'bulk') {
        location.hash = `#/bulk/${encodeURIComponent(decodeURIComponent(queueId || 'needs-review'))}?priority=${encodeURIComponent(state.queuePriority)}&sort=${encodeURIComponent(state.queueSort)}`;
        return;
      }
      router();
    });
  });
  document.querySelectorAll('[data-action="queue-priority"]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.queuePriority = btn.dataset.priority || 'default';
      const { parts } = parseHashRoute();
      const [, queueId] = parts;
      if (parts[0] === 'ops') {
        location.hash = queueHref(decodeURIComponent(queueId || 'needs-review'), { priority: state.queuePriority, sort: state.queueSort });
        return;
      }
      if (parts[0] === 'bulk') {
        location.hash = `#/bulk/${encodeURIComponent(decodeURIComponent(queueId || 'needs-review'))}?priority=${encodeURIComponent(state.queuePriority)}&sort=${encodeURIComponent(state.queueSort)}`;
        return;
      }
      router();
    });
  });
  document.querySelectorAll('[data-action="bulk-select"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const queueKey = btn.dataset.queue || 'needs-review';
      const session = getReviewSession(queueKey);
      session.currentSlug = btn.dataset.slug || '';
      session.startedAt ||= new Date().toISOString();
      saveReviewSession(queueKey, session);
      router();
    });
  });
  document.querySelectorAll('[data-action="bulk-nav"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const queueKey = btn.dataset.queue || 'needs-review';
      const workspace = bulkWorkspaceState(queueKey);
      if (!workspace.items.length) return;
      const nextIndex = btn.dataset.direction === 'prev'
        ? Math.max(workspace.currentIndex - 1, 0)
        : Math.min(workspace.currentIndex + 1, workspace.items.length - 1);
      const session = getReviewSession(queueKey);
      session.startedAt ||= new Date().toISOString();
      session.currentSlug = workspace.items[nextIndex]?.slug || session.currentSlug;
      saveReviewSession(queueKey, session);
      router();
    });
  });
  document.querySelectorAll('[data-action="bulk-decision"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const queueKey = btn.dataset.queue || 'needs-review';
      const slug = btn.dataset.slug || '';
      const decision = btn.dataset.decision || 'done';
      const workspace = bulkWorkspaceState(queueKey);
      const record = workspace.items.find(item => item.slug === slug);
      const session = getReviewSession(queueKey);
      session.decisions ||= {};
      session.startedAt ||= new Date().toISOString();
      const note = document.getElementById('bulkDecisionNote')?.value || '';
      session.decisions[slug] = bulkDecisionEntry(record, queueKey, decision, note);
      const currentIndex = workspace.items.findIndex(item => item.slug === slug);
      const nextIndex = Math.min(currentIndex + 1, Math.max(workspace.items.length - 1, 0));
      session.currentSlug = workspace.items[nextIndex]?.slug || slug;
      saveReviewSession(queueKey, session);
      router();
    });
  });
  document.querySelectorAll('[data-action="bulk-finish"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const queueKey = btn.dataset.queue || 'needs-review';
      const session = getReviewSession(queueKey);
      session.startedAt ||= new Date().toISOString();
      session.finishedAt = new Date().toISOString();
      saveReviewSession(queueKey, session);
      router();
    });
  });
  document.querySelectorAll('[data-action="bulk-export"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const queueKey = btn.dataset.queue || 'needs-review';
      const format = btn.dataset.format || 'json';
      const session = getReviewSession(queueKey);
      session.startedAt ||= new Date().toISOString();
      session.exportedAt = new Date().toISOString();
      saveReviewSession(queueKey, session);
      if (format === 'csv') {
        downloadText(`${queueKey}-bulk-review.csv`, exportableBatchCsv(queueKey), 'text/csv;charset=utf-8');
      } else if (format === 'summary') {
        downloadText(`${queueKey}-review-summary.txt`, exportableBatchSummary(queueKey));
      } else {
        downloadJson(`${queueKey}-batch-decisions.json`, exportableBatchPayload(queueKey));
      }
      pushExportHistoryEntry(queueKey, format);
      router();
    });
  });
}

function router() {
  const hash = location.hash || '#/dashboard';
  const { parts, query } = parseHashRoute(hash);
  const [section, id] = parts;
  let html = '';
  switch(section) {
    case 'dashboard': setMeta('الرئيسية', 'دليل بريدة / الرئيسية'); html = renderDashboard(); break;
    case 'blueprint': setMeta('طريقة التنظيم', 'الرئيسية / طريقة التنظيم'); html = renderBlueprintPage(); break;
    case 'sectors': setMeta('شجرة القطاعات', 'المعرفة / شجرة القطاعات'); html = renderSectorsIndexPage(); break;
    case 'sector': {
      const sectorTitle = sectorLabelByKey(decodeURIComponent(id || 'cafes'));
      setMeta(id === 'cafes' ? 'قطاع الكوفيهات' : sectorTitle, id ? `القطاعات / ${sectorTitle}` : 'القطاعات');
      html = renderSectorPage(id || 'cafes');
      break;
    }
    case 'entities':
      if (id) {
        const entitySlug = decodeURIComponent(id);
        const entity = getEntity(entitySlug);
        setMeta(entity?.name || 'صفحة الكيان', `الكيانات / ${entity?.name || entitySlug}`);
        html = renderEntityPage(entitySlug);
      }
      else { setMeta('الكيانات', 'المعرفة / الكيانات'); html = renderEntitiesPage(); }
      break;
    case 'districts': setMeta(id ? `حي ${decodeURIComponent(id)}` : 'الأحياء', id ? `الأحياء / ${decodeURIComponent(id)}` : 'المعرفة / الأحياء'); html = renderDistrictsPage(id ? decodeURIComponent(id) : ''); break;
    case 'filters': setMeta('الفلاتر الأولية', 'المعرفة / الفلاتر'); html = renderFiltersPage(); break;
    case 'pipeline': setMeta('وصول المعلومات', 'الدليل / وصول المعلومات'); html = renderPipelinePage(); break;
    case 'discovery': setMeta('الاكتشاف', 'التشغيل / الاكتشاف'); html = renderDiscoveryPage(); break;
    case 'ops-hub': setMeta('مركز تشغيل المراجعة', 'التشغيل / مركز المراجعة'); html = renderReviewOperationsHub(); break;
    case 'editorial-hub': setMeta('مركز التحكم التحريري', 'التشغيل / مركز التحرير'); html = renderEditorialControlCenter(); break;
    case 'agent-drafts': setMeta('مسودات الوكلاء', 'التشغيل / مسودات الوكلاء'); html = renderAgentDraftsHub(); break;
    case 'agent-ops': setMeta('مركز عمليات الوكلاء', 'التشغيل / عمليات الوكلاء'); html = renderAgentOpsConsole(query.get('run') || ''); break;
    case 'verification-program': setMeta('مركز عمليات التحقق والمهام', 'التشغيل / مركز عمليات التحقق والمهام'); html = renderVerificationProgramHub(); break;
    case 'release-readiness': setMeta('مركز الجاهزية', 'التشغيل / الجاهزية / الاعتماد'); html = renderReleaseReadinessHub(); break;
    case 'verification':
      setMeta('نظام التحقق', `التشغيل / التحقق / ${verificationQueues()[decodeURIComponent(id || 'source-review')]?.title || 'نظام التحقق'}`);
      html = renderVerificationWorkspace(decodeURIComponent(id || 'source-review'));
      break;
    case 'ops':
      state.queueSort = query.get('sort') || state.queueSort || 'default';
      state.queuePriority = query.get('priority') || state.queuePriority || 'default';
      setMeta(queueTitleByKey(decodeURIComponent(id || 'needs-review')), `التشغيل / ${queueTitleByKey(decodeURIComponent(id || 'needs-review'))}`);
      html = renderAttentionQueuePage(decodeURIComponent(id || 'needs-review'));
      break;
    case 'bulk':
      state.queueSort = query.get('sort') || state.queueSort || 'default';
      state.queuePriority = query.get('priority') || state.queuePriority || 'default';
      setMeta(`جلسة ${queueTitleByKey(decodeURIComponent(id || 'needs-review'))}`, `التشغيل / bulk review / ${queueTitleByKey(decodeURIComponent(id || 'needs-review'))}`);
      html = renderBulkWorkspace(decodeURIComponent(id || 'needs-review'));
      break;
    case 'review': setMeta('المراجعة', 'التشغيل / المراجعة'); html = renderReviewPage(); break;
    case 'sources': setMeta('الحالات', 'المعرفة / الحالات'); html = renderStatusPage(); break;
    case 'governance': setMeta('معايير التنظيم', 'الدليل / معايير التنظيم'); html = renderGovernancePage(); break;
    case 'search': setMeta('نتائج البحث', 'البحث'); html = renderSearch(decodeURIComponent(id || '')); break;
    default: setMeta('الرئيسية', 'دليل بريدة / الرئيسية'); html = renderDashboard(); break;
  }
  app.innerHTML = html;
  bindFilters();
  bindEditorActions();
  bindDashboardActions();
  syncMobileNavSections();
}

searchInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    location.hash = `#/search/${encodeURIComponent(searchInput.value.trim())}`;
  }
});
searchButton?.addEventListener('click', () => {
  location.hash = `#/search/${encodeURIComponent(searchInput.value.trim())}`;
});

window.addEventListener('hashchange', () => {
  closeSidebar();
  router();
});

(async function init(){
  try {
    await loadData();
    await refreshAgentRuntimeInfo();
    bindSidebar();
    bindMobileNavSections();
    router();
  } catch (err) {
    app.innerHTML = `<div class="empty">فشل تحميل master.json مباشرة. افتح الواجهة عبر خادم محلي بسيط بدل فتح الملف مباشرة من النظام.<br><br>${esc(err.message)}</div>`;
  }
})();
