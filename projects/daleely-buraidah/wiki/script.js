const DATA_URL = location.protocol === 'file:'
  ? '../data/master.json'
  : (location.hostname.includes('github.io') ? './master.json' : '../data/master.json');

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
  draftMessage: ''
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

const app = document.getElementById('app');
const pageTitle = document.getElementById('pageTitle');
const breadcrumbs = document.getElementById('breadcrumbs');
const searchInput = document.getElementById('globalSearch');

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

function statCount(status) {
  return state.records.filter(r => r.status === status).length;
}

function currentSector() {
  return uniq(state.records.map(r => r.sector).filter(Boolean));
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
}

function entityValueLink(slug, content, className = 'entity-cell-link') {
  return `<a href="#/entities/${esc(slug)}" class="${esc(className)}">${content}</a>`;
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
              <td>${entityValueLink(r.slug, esc(r.confidence || '—'))}</td>
              <td>${entityValueLink(r.slug, esc(r.google_rating))}</td>
              <td>${entityValueLink(r.slug, esc(r.google_reviews_count))}</td>
              <td>${entityValueLink(r.slug, esc(r._norm.work_friendly))}</td>
              <td>${entityValueLink(r.slug, esc(r._norm.group_friendly))}</td>
              <td>${entityValueLink(r.slug, esc(r._norm.late_night))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderDashboard() {
  const filtered = filterRecords();
  const sectors = currentSector();
  const branchConflict = state.records.filter(r => r.status === 'branch_conflict');
  const needsReview = state.records.filter(r => r.status === 'needs_review');
  return `
    <div class="hero">
      <h3>لوحة القيادة التشغيلية</h3>
      <p>هذه الواجهة تقرأ الآن مباشرة من <code>master.json</code> كمصدر الحقيقة الوحيد للمشروع، مع طبقة تطبيع خفيفة داخل الواجهة فقط للفلاتر والعرض.</p>
      <div class="chips">
        ${chip('المرحلة', state.raw?.project_phase || '—')}
        ${chip('إصدار schema', state.raw?.schema_version || '—')}
        ${chip('عدد السجلات', filtered.length)}
        ${chip('القطاعات', sectors.join(', ') || '—')}
      </div>
    </div>
    ${renderFilterBar()}
    <div class="grid cards-4">
      <div class="card"><div class="metric">${filtered.length}</div><div class="metric-sub">سجلات معروضة حاليًا</div></div>
      <div class="card"><div class="metric">${statCount('verified')}</div><div class="metric-sub">معتمد</div></div>
      <div class="card"><div class="metric">${statCount('partially_verified')}</div><div class="metric-sub">موثق جزئيًا</div></div>
      <div class="card"><div class="metric">${avgRating(filtered)}</div><div class="metric-sub">متوسط التقييم</div></div>
    </div>
    <div class="grid cards-4 section">
      <div class="card"><div class="metric">${statCount('needs_review')}</div><div class="metric-sub">يحتاج مراجعة</div></div>
      <div class="card"><div class="metric">${statCount('branch_conflict')}</div><div class="metric-sub">تعارض فروع</div></div>
      <div class="card"><div class="metric">${statCount('duplicate')}</div><div class="metric-sub">مكرر</div></div>
      <div class="card"><div class="metric">${statCount('archived')}</div><div class="metric-sub">مؤرشف</div></div>
    </div>
    <div class="section grid cards-2">
      <div class="card">
        <h3>تنبيه الفروع المتعارضة</h3>
        ${branchConflict.length ? `<ul class="list-clean">${branchConflict.map(r=>`<li><a href="#/entities/${esc(r.slug)}">${esc(r.name)}</a><div class="note">${esc(r.branch_group)} / ${esc(r.branch_label)}</div></li>`).join('')}</ul>` : '<div class="empty">لا توجد سجلات branch_conflict حاليًا.</div>'}
      </div>
      <div class="card">
        <h3>قائمة المتابعة</h3>
        ${needsReview.length ? `<ul class="list-clean">${needsReview.map(r=>`<li><a href="#/entities/${esc(r.slug)}">${esc(r.name)}</a><div class="note">${esc(r.editorial_summary)}</div></li>`).join('')}</ul>` : '<div class="empty">لا توجد سجلات needs_review حاليًا.</div>'}
      </div>
    </div>
  `;
}

function renderSectorPage() {
  const items = filterRecords(state.records.filter(r => r.sector === 'cafes'));
  return `
    <div class="hero"><h3>قطاع الكوفيهات</h3><p>عرض قطاعي حي يعتمد على البيانات الحقيقية الحالية من master.json.</p></div>
    ${renderFilterBar()}
    <div class="grid cards-4">
      <div class="card"><div class="metric">${items.length}</div><div class="metric-sub">إجمالي السجلات</div></div>
      <div class="card"><div class="metric">${uniq(items.map(r=>r.district)).length}</div><div class="metric-sub">الأحياء/المواقع</div></div>
      <div class="card"><div class="metric">${items.filter(r=>r._norm.specialty_coffee==='yes').length}</div><div class="metric-sub">قهوة مختصة</div></div>
      <div class="card"><div class="metric">${items.filter(r=>r._norm.work_friendly==='yes').length}</div><div class="metric-sub">مناسب للعمل</div></div>
    </div>
    <div class="section">${entitiesTable(items)}</div>
  `;
}

function renderEntitiesPage() {
  const items = filterRecords();
  return `${renderFilterBar()}<div class="section">${entitiesTable(items)}</div>`;
}

function kv(label, value) {
  return `<div class="kv-item"><div class="label">${esc(label)}</div><div class="value">${esc(value || 'غير متحقق')}</div></div>`;
}

function getEntity(slug) { return state.records.find(r => r.slug === slug); }
function draftKey(slug) { return `daleelyDraft:${slug}`; }
function getDraft(slug) {
  try { return JSON.parse(localStorage.getItem(draftKey(slug)) || 'null'); }
  catch { return null; }
}
function saveDraft(slug, payload) {
  localStorage.setItem(draftKey(slug), JSON.stringify(payload));
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
function renderEditForm(e) {
  const draft = getDraft(e.slug) || {};
  const current = { ...e, ...draft };
  return `
    <div class="section">
      <div class="card">
        <div class="section-header">
          <h3>تحرير السجل</h3>
          <div class="actions">
            <button class="button" data-action="cancel-edit" data-slug="${esc(e.slug)}">إلغاء</button>
            <button class="button gold" data-action="save-draft" data-slug="${esc(e.slug)}">Save Draft</button>
            <button class="button primary" data-action="export-patch" data-slug="${esc(e.slug)}">Export Patch</button>
          </div>
        </div>
        <form id="editForm" class="edit-grid" data-slug="${esc(e.slug)}">
          ${editableField('الاسم المعتمد', 'name', current.name)}
          ${editableField('الاسم البديل', 'alternate_name', current.alternate_name)}
          ${editableField('الاسم العربي المعياري', 'canonical_name_ar', current.canonical_name_ar)}
          ${editableField('الاسم الإنجليزي المعياري', 'canonical_name_en', current.canonical_name_en)}
          ${editableField('الحي', 'district', current.district)}
          ${editableField('العنوان المختصر', 'short_address', current.short_address)}
          ${editableField('الرابط المرجعي', 'reference_url', current.reference_url, 'url')}
          ${editableField('الحساب الرسمي', 'official_instagram', current.official_instagram, 'url')}
          ${editableField('رقم التواصل', 'phone', current.phone)}
          ${editableField('ساعات العمل', 'hours_summary', current.hours_summary)}
          ${editableField('الفئة', 'category', current.category)}
          ${editableField('الحالة', 'status', current.status)}
          ${editableField('الثقة', 'confidence', current.confidence)}
          ${editableField('شخصية المكان', 'place_personality', current.place_personality, 'textarea')}
          ${editableField('أفضل وقت', 'best_visit_time', current.best_visit_time, 'textarea')}
          ${editableField('لماذا قد يختاره الزائر', 'why_choose_it', current.why_choose_it, 'textarea')}
          ${editableField('لمن قد لا يكون مناسبًا', 'not_for_whom', current.not_for_whom, 'textarea')}
          ${editableField('الخلاصة التحريرية', 'editorial_summary', current.editorial_summary, 'textarea')}
          ${editableField('ملاحظات المصادر', 'source_notes', current.source_notes, 'textarea')}
        </form>
        <div class="note">الحفظ هنا محلي داخل المتصفح فقط. استخدم Export Patch لتوليد ملف تغييرات يمكن تطبيقه على البيانات الأصلية.</div>
        ${state.draftMessage ? `<div class="draft-message">${esc(state.draftMessage)}</div>` : ''}
      </div>
    </div>
  `;
}

function renderEntityPage(slug) {
  const e = getEntity(slug);
  if (!e) return '<div class="empty">لم يتم العثور على السجل.</div>';
  const draft = getDraft(slug);
  const draftBadge = draft ? `<span class="pill warning">يوجد Draft محلي</span>` : '';
  return `
    <div class="hero">
      <div class="chips">
        ${badge(e.status)}
        ${chip('الثقة', e.confidence)}
        ${chip('المجموعة الفرعية', e.branch_group || '—')}
        ${chip('الفرع', e.branch_label || '—')}
        ${draftBadge}
      </div>
      <div class="section-header">
        <div>
          <h3>${esc(e.name)}</h3>
          <p>${esc(e.editorial_summary)}</p>
        </div>
        <div class="actions">
          <button class="button primary" data-action="toggle-edit" data-slug="${esc(e.slug)}">Edit</button>
        </div>
      </div>
    </div>
    ${state.editMode && state.currentSlug === slug ? renderEditForm(e) : ''}
    <div class="grid cards-2">
      <div class="card">
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
        <h3>تشغيل وتوصيف</h3>
        <div class="kv">
          ${kv('مناسب للعمل', e._norm.work_friendly)}
          ${kv('مناسب للجلسات', e._norm.group_friendly)}
          ${kv('مناسب للسهر', e._norm.late_night)}
          ${kv('مناسب للعوائل', e._norm.family_friendly)}
          ${kv('جلسات داخلية', e._norm.indoor_seating)}
          ${kv('جلسات خارجية', e._norm.outdoor_seating)}
          ${kv('المواقف', e._norm.parking)}
          ${kv('الهدوء', e.quietness)}
          ${kv('الازدحام', e.crowd_level)}
          ${kv('القهوة المختصة', e._norm.specialty_coffee)}
          ${kv('الحلويات', e._norm.desserts)}
          ${kv('مستوى السعر', e.price_level)}
        </div>
      </div>
    </div>
    <div class="section grid cards-2">
      <div class="card">
        <h3>الخلاصة التحريرية</h3>
        <ul class="list-clean">
          <li><strong>شخصية المكان:</strong> ${esc(e.place_personality)}</li>
          <li><strong>أفضل وقت:</strong> ${esc(e.best_visit_time)}</li>
          <li><strong>لماذا قد يختاره الزائر:</strong> ${esc(e.why_choose_it)}</li>
          <li><strong>لمن قد لا يكون مناسبًا:</strong> ${esc(e.not_for_whom)}</li>
        </ul>
      </div>
      <div class="card">
        <h3>إدارة السجل</h3>
        <div class="kv">
          ${kv('الحالة', STATUS_AR[e.status] || e.status)}
          ${kv('duplicate_of', e.duplicate_of || '—')}
          ${kv('archive_reason', e.archive_reason || '—')}
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
    <div class="section">${renderFilterBar()}${entitiesTable(filterRecords())}</div>
  `;
}

function renderDistrictsPage() {
  const groups = uniq(state.records.map(r => r.district)).sort((a,b)=>a.localeCompare(b,'ar'));
  return `
    <div class="table-wrap"><table class="table"><thead><tr><th>الحي</th><th>عدد السجلات</th><th>متوسط التقييم</th><th>معتمد</th><th>تعارض فروع</th></tr></thead><tbody>
      ${groups.map(g => {
        const items = state.records.filter(r => r.district === g);
        return `<tr><td>${esc(g)}</td><td>${items.length}</td><td>${avgRating(items)}</td><td>${items.filter(r=>r.status==='verified').length}</td><td>${items.filter(r=>r.status==='branch_conflict').length}</td></tr>`;
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
  </div><div class="section">${entitiesTable(items)}</div>`;
}

function renderDiscoveryPage() {
  const items = filterRecords(state.records.filter(r => ['discovered','profiled'].includes(r.status)));
  return `${renderFilterBar()}<div class="card"><h3>الاكتشاف</h3><p class="note">السجلات الأولية قبل النضج. في الحالة الحالية لا توجد سجلات discovered/profiled كثيرة لأن المشروع في مرحلة إعادة تنظيم.</p></div><div class="section">${items.length ? entitiesTable(items) : '<div class="empty">لا توجد سجلات اكتشاف أولي حاليًا.</div>'}</div>`;
}

function renderReviewPage() {
  const items = filterRecords(state.records.filter(r => ['needs_review','branch_conflict','partially_verified'].includes(r.status)));
  return `${renderFilterBar()}<div class="grid cards-2"><div class="card"><h3>يحتاج مراجعة</h3><div class="metric">${state.records.filter(r=>r.status==='needs_review').length}</div></div><div class="card"><h3>تعارض فروع</h3><div class="metric">${state.records.filter(r=>r.status==='branch_conflict').length}</div></div></div><div class="section">${entitiesTable(items)}</div>`;
}

function renderSearch(term) {
  const q = term.toLowerCase();
  const items = state.records.filter(r => [r.name,r.alternate_name,r.district,r.editorial_summary,r.short_address].join(' ').toLowerCase().includes(q));
  return items.length ? entitiesTable(items) : '<div class="empty">لا توجد نتائج مطابقة.</div>';
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
    const patch = diffRecord(entity, payload);
    downloadJson(`${slug}.patch.json`, {
      slug,
      exported_at: new Date().toISOString(),
      patch
    });
    state.draftMessage = `تم تصدير patch للسجل ${slug}.`;
    saveDraft(slug, payload);
    router();
  }));
}

function router() {
  const hash = location.hash || '#/dashboard';
  const parts = hash.replace(/^#\//,'').split('/');
  const [section, id] = parts;
  let html = '';
  switch(section) {
    case 'dashboard': setMeta('لوحة القيادة', 'الرئيسية / لوحة القيادة'); html = renderDashboard(); break;
    case 'sectors': setMeta('قطاع الكوفيهات', 'المعرفة / قطاع الكوفيهات'); html = renderSectorPage(); break;
    case 'entities':
      if (id) { setMeta('صفحة كيان', `الكيانات / ${id}`); html = renderEntityPage(id); }
      else { setMeta('الكيانات', 'المعرفة / الكيانات'); html = renderEntitiesPage(); }
      break;
    case 'districts': setMeta('الأحياء', 'المعرفة / الأحياء'); html = renderDistrictsPage(); break;
    case 'filters': setMeta('الفلاتر الأولية', 'المعرفة / الفلاتر'); html = renderFiltersPage(); break;
    case 'discovery': setMeta('الاكتشاف', 'التشغيل / الاكتشاف'); html = renderDiscoveryPage(); break;
    case 'review': setMeta('المراجعة', 'التشغيل / المراجعة'); html = renderReviewPage(); break;
    case 'sources': setMeta('الحالات والمصدر المركزي', 'المعرفة / الحالات'); html = renderStatusPage(); break;
    case 'search': setMeta('نتائج البحث', 'البحث'); html = renderSearch(decodeURIComponent(id || '')); break;
    default: setMeta('لوحة القيادة', 'الرئيسية / لوحة القيادة'); html = renderDashboard(); break;
  }
  app.innerHTML = html;
  bindFilters();
  bindEditorActions();
}

searchInput?.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    location.hash = `#/search/${encodeURIComponent(searchInput.value.trim())}`;
  }
});

window.addEventListener('hashchange', router);

(async function init(){
  try {
    await loadData();
    router();
  } catch (err) {
    app.innerHTML = `<div class="empty">فشل تحميل master.json مباشرة. افتح الواجهة عبر خادم محلي بسيط بدل فتح الملف مباشرة من النظام.<br><br>${esc(err.message)}</div>`;
  }
})();
