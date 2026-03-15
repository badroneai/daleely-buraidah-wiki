// ─── modules/rendering.js ───
// All page rendering functions — HTML template generators for each route.
// This is the largest module and contains UI-heavy code.

import { state } from './state.js';
import { STATUS_AR, CANONICAL_DISTRICTS } from './constants.js';
import { esc, uniq, normalizeDistrict, isCanonicalDistrict } from './utils.js';
import { badge, chip, displayFlag, displayConfidence, displayLevel, displayPrice, displayText, setMeta } from './display.js';
import { app } from './dom.js';
import {
  getEntity, getDraft, saveDraft, emptyNewCafeRecord,
  editorialReadiness, editorialStatusTone, editorialDraftEntries,
  patchConsoleEntries, importConsoleEntries, agentDraftEntries,
  verificationDraftEntries, agentRunHistoryEntries, savedAgentBatchEntries,
  registerPatchExportRecord, registerImportRecord,
  missionStatusLabel, missionStatusTone,
  missionSessionStatusLabel, missionSessionStatusTone, missionAttemptOutcomeLabel,
  getExportHistory, missionSessions,
} from './storage.js';
import {
  sourceVerificationState, districtVerificationState, confidenceVerificationState,
  verificationQueues, evidenceEntries, evidenceForSlug, evidenceCategoryLabel,
  evidenceOutcomeLabel, addEvidenceEntry,
  verificationSessions, verificationDecisionEntries,
  verificationSessionStatusLabel, verificationSessionStatusTone,
  verificationDecisionLabel, verificationDecisionTone,
  verificationResolutionLabel, verificationResolutionTone,
  verificationControlSnapshot, registerVerificationDecision,
  latestVerificationDecisionForSlug, startOrOpenVerificationSession,
  verificationSessionSummary,
} from './verification.js';
import {
  attentionQueues, queueHref, entityHref, parseHashRoute,
  queueViewState, visibleQueueRecords, queueRecords,
  queueSummary, queueTitleByKey, renderQueueSwitcher,
  queuePriorityBadge, queueExpectedAction, queueActionLabel,
  entityChecklist, entityQueueReasons, entityTriage, kv,
} from './queues.js';
import {
  statCount, avgRating, featuredStatuses,
  importantMissingFields, recordsMissingImportant,
  lowConfidenceRecords, recentVerifiedRecords, newlyAddedRecords,
  todayVerifiedCount, sectorTree, currentSector, sectorLabelByKey,
} from './analytics.js';
import {
  OPS_FILTERS, applyOpsFilter, opsFilterCounts,
  sectorMetrics, scoredPriority, districtOpsBreakdown,
  sectorReadiness, sectorFourthMetric, sectorDescription,
} from './sector-ops.js';
import { getSectorProfile, hasCustomProfile } from './sector-profiles.js';
import { filterRecords, activeFilterEntries, renderActiveFilters, resultEmptyState, resultCards } from './filters.js';
import {
  agentProposalStatusLabel, agentProposalStatusTone, agentConfidenceLabel,
  agentAllowedFieldLabel, agentProposalTypeLabel, agentProposalHandoffLabel,
  agentRunStatusLabel, agentRunStatusTone, agentScopeKindLabel,
  agentDraftSummary, agentDefinitions, derivedAgentScopes,
  agentDefinitionByKey, recordsForAgentScope,
} from './agents.js';
import {
  missionPlan, missionOutputSummary, missionPriorityLabel, missionPriorityTone, missionTypeLabel,
  missionExecutionSnapshot, missionSessionForMission, missionSessionSummary, missionScopeTitle,
  suggestedRecordMissions,
} from './missions.js';
import {
  readinessLabel, readinessTone, readinessSnapshot, resolutionImpactSnapshot,
  recordReadiness, recordPatchReadiness, finalPatchReviewSnapshot, patchApplySimulationSnapshot,
  patchReadinessLabel, patchReadinessTone, finalPatchDecisionLabel, patchSignoffLabel,
  verificationFollowupBuckets, coverageExpansionPlanner, releasePackPlan,
  finalPatchDecisionTone, patchSignoffTone, releasePackStatusTone, releasePackStatusLabel,
} from './patches.js';
import {
  bulkWorkspaceState, reviewSessionRegistry, bulkDecisionLabel, bulkDecisionTone,
  sessionLifecycleLabel, sessionLifecycleTone, bulkBatchKeys, bulkDecisionValue,
} from './bulk-review.js';
import {
  entitiesTable, topRatedRecords, topDistrictGroups, districtHref,
  editableField, queueContextForEntity, districtLink,
} from './ui-helpers.js';

export function renderQueueSortBar(activeKey = 'needs-review') {
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


export function renderQueuePriorityBar(activeKey = 'needs-review', groups = [], activeGroupKey = '') {
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


export function renderQueueList(queueKey = 'needs-review', records = []) {
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


export function renderAttentionQueuePage(queueKey = 'needs-review') {
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


export function renderResultsSection(records, options = {}) {
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


export function renderFilterBar() {
  const otherDistricts = uniq(state.records.map(r => (r.district || '').trim()).filter(d => d && d !== 'غير متحقق' && !CANONICAL_DISTRICTS.includes(d))).sort((a,b)=>a.localeCompare(b,'ar'));
  const districtOptions = [...CANONICAL_DISTRICTS, ...(otherDistricts.length ? ['—', ...otherDistricts] : [])];
  const confidences = uniq(state.records.map(r => r.confidence).filter(Boolean));
  const tri = [['yes','نعم'],['partial','جزئي'],['no','لا'],['unknown','غير متحقق']];
  return `
    <div class="filters filters-wide">
      <select data-filter="status"><option value="">كل الحالات</option>${Object.keys(STATUS_AR).map(s=>`<option value="${s}" ${state.filters.status===s?'selected':''}>${STATUS_AR[s]}</option>`).join('')}</select>
      <select data-filter="district"><option value="">كل الأحياء</option>${districtOptions.map(d=> d === '—' ? '<option disabled>── أخرى ──</option>' : `<option value="${esc(d)}" ${state.filters.district===d?'selected':''}>${esc(d)}</option>`).join('')}</select>
      <select data-filter="confidence"><option value="">كل مستويات الثقة</option>${confidences.map(c=>`<option value="${esc(c)}" ${state.filters.confidence===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
      <select data-filter="specialty"><option value="">القهوة المختصة: الكل</option>${tri.map(([v,l])=>`<option value="${v}" ${state.filters.specialty===v?'selected':''}>${l}</option>`).join('')}</select>
      <select data-filter="desserts"><option value="">الحلويات: الكل</option>${tri.map(([v,l])=>`<option value="${v}" ${state.filters.desserts===v?'selected':''}>${l}</option>`).join('')}</select>
      <select data-filter="work"><option value="">مناسب للعمل: الكل</option>${tri.map(([v,l])=>`<option value="${v}" ${state.filters.work===v?'selected':''}>${l}</option>`).join('')}</select>
      <select data-filter="groups"><option value="">مناسب للجلسات: الكل</option>${tri.map(([v,l])=>`<option value="${v}" ${state.filters.groups===v?'selected':''}>${l}</option>`).join('')}</select>
      <select data-filter="late"><option value="">مناسب للسهر: الكل</option>${tri.map(([v,l])=>`<option value="${v}" ${state.filters.late===v?'selected':''}>${l}</option>`).join('')}</select>
    </div>
  `;
}


export function renderBlueprintPage() {
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


export function renderSectorsIndexPage() {
  const tree = sectorTree();
  const activeChildren = tree.flatMap(g => g.children.filter(c => c.status === 'active'));
  const plannedChildren = tree.flatMap(g => g.children.filter(c => c.status !== 'active'));
  const totalSectors = tree.reduce((s, g) => s + g.children.length, 0);
  return `
    <div class="hero page-hero hero-compact">
      <h3>فهرس القطاعات</h3>
      <p>اختر القطاع الذي تريد تصفحه. القطاعات النشطة تحتوي على بيانات جاهزة، والباقي قيد التجهيز.</p>
    </div>
    <div class="grid cards-3 section">
      <div class="card mini-panel"><div class="metric">${totalSectors}</div><div class="metric-sub">قطاع في الدليل</div></div>
      <div class="card mini-panel"><div class="metric">${activeChildren.length}</div><div class="metric-sub">نشط الآن</div></div>
      <div class="card mini-panel"><div class="metric">${plannedChildren.length}</div><div class="metric-sub">قيد التجهيز</div></div>
    </div>
    <div class="section sectors-grid">
      ${tree.map(group => `
        <div class="sector-group">
          <div class="sector-group-header">${esc(group.title)}</div>
          <div class="sector-group-items">
            ${group.children.map(child => `
              <a href="#/sector/${esc(child.key)}" class="sector-entry ${child.status === 'active' ? 'sector-active' : 'sector-planned'}">
                <div class="sector-entry-title">${esc(child.title)}</div>
                <div class="sector-entry-note">${esc(child.note)}</div>
                <span class="pill ${child.status === 'active' ? 'success' : 'muted'}">${child.status === 'active' ? 'نشط' : 'قريبًا'}</span>
              </a>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}


export function renderSectorPage(sectorKey = 'cafes') {
  const profile = getSectorProfile(sectorKey);
  const sectorMeta = sectorTree().flatMap(g => g.children).find(c => c.key === sectorKey);
  const sectorTitle = sectorMeta?.title || sectorKey;
  const sectorStatus = sectorMeta?.status || 'planned';

  const allSectorItems = state.records.filter(r => r.sector === sectorKey);
  const items = filterRecords(allSectorItems);

  if (sectorStatus === 'planned' && items.length === 0) {
    return `
      <div class="hero"><h3>هذا القسم غير متاح بعد</h3>
        <p>سيظهر هنا محتوى قسم "${esc(sectorTitle)}" عند إضافته إلى الدليل.</p>
      </div>
      <div class="card"><h3>قريبًا</h3><p class="note">هذا القسم مهيأ للإضافة لاحقًا.</p></div>
    `;
  }

  // ── Ops-filter (quick-action buttons) ──
  const opsFilter = state._opsFilter;
  const displayItems = applyOpsFilter(items, opsFilter);

  // ── Compute all sector data via profile-aware helpers ──
  const metrics = sectorMetrics(items);
  const counts = opsFilterCounts(items, profile);
  const priority = scoredPriority(items, 8, profile);
  const districts = districtOpsBreakdown(items);
  const readiness = sectorReadiness(metrics, profile);
  const topPicks = topRatedRecords(items, 3);
  const fourth = sectorFourthMetric(sectorKey, items, profile);
  const sectorDistricts = uniq(items.map(r => r.district).filter(Boolean));
  const desc = sectorDescription(sectorKey, profile);

  return `
    <div class="sector-page" data-sector="${esc(sectorKey)}">
      <div class="hero page-hero hero-compact">
        <div class="sector-breadcrumb"><a href="#/sectors">القطاعات</a> ← ${esc(sectorTitle)}</div>
        <h3>${esc(sectorTitle)}</h3>
        ${desc ? `<p class="sector-desc">${esc(desc)}</p>` : ''}
        ${profile.focusLabel ? '<div class="sector-focus-label">' + esc(profile.focusLabel) + '</div>' : ''}
        <p>${metrics.total} كيان في ${sectorDistricts.length} حي • ${metrics.verified} متحقق • ${metrics.needsReview} يحتاج مراجعة${opsFilter ? ` • عرض: ${displayItems.length}` : ''}</p>
      </div>

      <div class="grid cards-4 section">
        <div class="card mini-panel emphasis-panel"><div class="metric">${metrics.total}</div><div class="metric-sub">إجمالي الكيانات</div></div>
        <div class="card mini-panel"><div class="metric">${metrics.verified}</div><div class="metric-sub">متحقق منه</div></div>
        <div class="card mini-panel"><div class="metric">${fourth.count}</div><div class="metric-sub">${esc(fourth.label)}</div></div>
        <div class="card mini-panel"><div class="metric">${metrics.lowConf}</div><div class="metric-sub">ثقة منخفضة</div></div>
      </div>

      <div class="section">
        <div class="section-kicker">اختصارات تشغيلية</div>
        <div class="ops-toolbar">
          ${profile.opsFilters.map(key => {
            const def = OPS_FILTERS[key];
            if (!def) return '';
            return '<button type="button" class="ops-btn' + (opsFilter === key ? ' ops-btn-active' : '') + '" data-action="ops-filter" data-ops-key="' + key + '">' + def.label + ' <span class="ops-count">' + (counts[key] || 0) + '</span></button>';
          }).join('')}
          ${opsFilter ? '<button type="button" class="ops-btn ops-btn-clear" data-action="ops-filter" data-ops-key="clear">إزالة الفلتر ×</button>' : ''}
        </div>
      </div>

      <div class="section grid cards-2">
        <div class="card">
          <div class="section-kicker">أعلى أولوية للإكمال</div>
          ${priority.length ? `<div class="stack-list">${priority.map(item => `
            <a href="${entityHref(item.record.slug)}" class="stack-item">
              <strong>${esc(item.record.name)}</strong>
              <span class="ops-tags">${item.noPhone && item.noInsta ? 'بدون تواصل' : item.noPhone ? 'بدون هاتف' : item.noInsta ? 'بدون إنستغرام' : ''}${item.isLowConf ? ' • ثقة↓' : ''}${item.noDistrict ? ' • بدون حي' : ''}${item.noRef ? ' • بدون مصدر' : ''}${item.missing.length ? ` • ${item.missing.length}✖` : ''}</span>
            </a>
          `).join('')}</div>` : '<div class="empty">لا توجد نواقص بارزة.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">حالة القطاع</div>
          <div class="triage-list">
            <div class="triage-list-item"><strong>متحقق</strong><span>${metrics.verified} كيان</span></div>
            <div class="triage-list-item"><strong>معرّف</strong><span>${metrics.profiled} كيان</span></div>
            <div class="triage-list-item"><strong>يحتاج مراجعة</strong><span>${metrics.needsReview} كيان</span></div>
            <div class="triage-list-item"><strong>بدون حي</strong><span>${metrics.missingDistrict} كيان</span></div>
          </div>
        </div>
      </div>

      <div class="section grid cards-2">
        <div class="card card-readiness">
          <div class="section-kicker">جاهزية استخراج القطاع</div>
          <div class="readiness-score ${readiness.tone}">
            <div class="metric">${readiness.score}%</div>
            <div class="metric-sub">${readiness.label}</div>
          </div>
          <div class="readiness-bars">
            ${readiness.bars.map(b => `<div class="readiness-row"><span>${esc(b.label)}</span><div class="bar"><div class="bar-fill" style="width:${b.pct}%"></div></div><span>${b.pct}%</span></div>`).join('')}
          </div>
          ${readiness.blockers.length ? `<div class="readiness-blockers">
            <strong>أهم العوائق:</strong>
            ${readiness.blockers.map(b => `<div class="blocker-item">⚠ ${esc(b)}</div>`).join('')}
          </div>` : ''}
          <div class="readiness-next"><strong>الخطوة التالية:</strong> ${esc(readiness.nextStep)}</div>
        </div>
        <div class="card">
          <div class="section-kicker">الأعلى تقييمًا</div>
          ${topPicks.length ? `<div class="stack-list">${topPicks.map(item => `
            <a href="#/entities/${esc(item.slug)}" class="stack-item">
              <strong>${esc(item.name)}</strong>
              <span>${esc(item.district || 'غير محدد')} · ${esc(item.google_rating || '—')} من 5</span>
            </a>
          `).join('')}</div>` : '<div class="empty">لا توجد ترشيحات.</div>'}
        </div>
      </div>

      <div class="section">
        <div class="section-kicker">توزيع الأحياء</div>
        <div class="district-ops-grid">
          ${districts.slice(0, 10).map(([name, st]) => `
            <div class="district-ops-item">
              <div class="district-ops-name">${esc(name)}</div>
              <div class="district-ops-stats">
                <span class="district-ops-count">${st.count}</span>
                ${st.verified ? `<span class="district-ops-verified">✓${st.verified}</span>` : ''}
                ${st.hasMissing ? `<span class="district-ops-gap">⚠${st.hasMissing}</span>` : ''}
              </div>
            </div>
          `).join('')}
          ${districts.length > 10 ? `<div class="district-ops-item district-ops-more"><span>أحياء أخرى: ${districts.length - 10} حي</span></div>` : ''}
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <h3>تصفية نتائج ${esc(sectorTitle)}</h3>
        </div>
        ${renderFilterBar()}
      </div>
      <div class="section">${renderResultsSection(displayItems, {
        title: esc(sectorTitle) + ' — ' + displayItems.length + ' كيان',
        note: '',
        emptyTitle: 'لا توجد نتائج حاليًا',
        emptyNote: 'جرّب تغيير الفلاتر.',
      })}</div>
    </div>
  `;
}


export function renderSectorDecisionBoard() {
  const groups = sectorTree();
  const allSectors = groups.flatMap(g => g.children);

  // Build data for every sector
  const board = allSectors.map(sec => {
    const records = state.records.filter(r => r.sector === sec.key);
    if (!records.length) return null;
    const profile = getSectorProfile(sec.key);
    const custom = hasCustomProfile(sec.key);
    const metrics = sectorMetrics(records);
    const readiness = sectorReadiness(metrics, profile);
    const priority = scoredPriority(records, 3, profile);

    // Gap score: how much work is needed (inverse of readiness, weighted by size)
    const gapScore = Math.round((100 - readiness.score) * Math.log2(metrics.total + 1));

    // Quick-win: high readiness + few blockers OR profiled sector with moderate readiness
    const quickWin = (readiness.score >= 55 && readiness.blockers.length <= 2)
      || (custom && readiness.score >= 50 && readiness.blockers.length <= 3)
      ? readiness.score + Math.min(metrics.total, 50)
      : 0;

    // Tier classification — based on actual data distribution (49-70% range)
    let tier, tierLabel, tierTone;
    if (readiness.score >= 60) { tier = 1; tierLabel = 'جاهز نسبيًا'; tierTone = 'success'; }
    else if (readiness.score >= 53) { tier = 2; tierLabel = 'واعد — يحتاج استكمال'; tierTone = 'warning'; }
    else { tier = 3; tierLabel = 'يحتاج عمل تأسيسي'; tierTone = 'danger'; }

    return {
      key: sec.key, title: sec.title, status: sec.status,
      metrics, readiness, priority, profile, custom,
      gapScore, quickWin, tier, tierLabel, tierTone,
    };
  }).filter(Boolean);

  // Sort helpers
  const byReadiness = [...board].sort((a, b) => b.readiness.score - a.readiness.score);
  const bySize = [...board].sort((a, b) => b.metrics.total - a.metrics.total);
  const byGap = [...board].sort((a, b) => b.gapScore - a.gapScore);
  const quickWins = board.filter(s => s.quickWin > 0).sort((a, b) => b.quickWin - a.quickWin);

  // Tier groups
  const tier1 = board.filter(s => s.tier === 1).sort((a, b) => b.readiness.score - a.readiness.score);
  const tier2 = board.filter(s => s.tier === 2).sort((a, b) => b.readiness.score - a.readiness.score);
  const tier3 = board.filter(s => s.tier === 3).sort((a, b) => b.readiness.score - a.readiness.score);

  // Summary stats
  const totalEntities = board.reduce((s, x) => s + x.metrics.total, 0);
  const profiledCount = board.filter(s => s.custom).length;
  const avgReadiness = Math.round(board.reduce((s, x) => s + x.readiness.score, 0) / board.length);

  function sectorRow(s) {
    const focusBadge = s.profile.focusLabel
      ? `<span class="db-focus">${esc(s.profile.focusLabel.replace('التركيز: ', ''))}</span>`
      : '';
    const profileBadge = s.custom
      ? '<span class="db-badge db-badge-profile">مخصص</span>'
      : '<span class="db-badge db-badge-default">افتراضي</span>';
    const tierDot = `<span class="db-tier-dot db-tier-${s.tierTone}"></span>`;
    const blockers = s.readiness.blockers.length
      ? s.readiness.blockers.slice(0, 2).map(b => `<span class="db-blocker">${esc(b)}</span>`).join('')
      : '<span class="db-no-blocker">لا عوائق رئيسية</span>';
    return `
      <tr class="db-row" data-tier="${s.tier}">
        <td class="db-cell-name">
          ${tierDot}
          <a href="#/sector/${esc(s.key)}">${esc(s.title)}</a>
          <div class="db-row-badges">${profileBadge}${focusBadge}</div>
        </td>
        <td class="db-cell-num">${s.metrics.total}</td>
        <td class="db-cell-readiness">
          <div class="db-readiness-bar"><div class="db-readiness-fill db-readiness-${s.readiness.tone}" style="width:${s.readiness.score}%"></div></div>
          <span class="db-readiness-num">${s.readiness.score}%</span>
        </td>
        <td class="db-cell-tier"><span class="db-tier-label db-tier-${s.tierTone}">${esc(s.tierLabel)}</span></td>
        <td class="db-cell-blockers">${blockers}</td>
      </tr>`;
  }

  function tierSection(label, tone, sectors) {
    if (!sectors.length) return '';
    return `
      <div class="db-tier-section">
        <div class="db-tier-header db-tier-${tone}">${esc(label)} <span class="db-tier-count">(${sectors.length})</span></div>
        <table class="db-table">
          <thead><tr>
            <th>القطاع</th><th>كيانات</th><th>الجاهزية</th><th>التصنيف</th><th>أهم العوائق</th>
          </tr></thead>
          <tbody>${sectors.map(sectorRow).join('')}</tbody>
        </table>
      </div>`;
  }

  return `
    <div class="decision-board">
      <div class="hero page-hero hero-compact">
        <div class="sector-breadcrumb"><a href="#/dashboard">الرئيسية</a> ← لوحة قرار القطاعات</div>
        <h3>لوحة قرار القطاعات</h3>
        <p>${board.length} قطاع • ${totalEntities} كيان • متوسط الجاهزية ${avgReadiness}% • ${profiledCount} بملف مخصص</p>
      </div>

      <div class="grid cards-4 section">
        <div class="card mini-panel emphasis-panel"><div class="metric">${board.length}</div><div class="metric-sub">قطاع نشط</div></div>
        <div class="card mini-panel"><div class="metric">${avgReadiness}%</div><div class="metric-sub">متوسط الجاهزية</div></div>
        <div class="card mini-panel"><div class="metric">${tier1.length}</div><div class="metric-sub">جاهز نسبيًا</div></div>
        <div class="card mini-panel"><div class="metric">${tier3.length}</div><div class="metric-sub">يحتاج تأسيس</div></div>
      </div>

      ${tier1.length ? tierSection('جاهز نسبيًا — يمكن فصله كمشروع', 'success', tier1) : ''}
      ${tier2.length ? tierSection('واعد — يحتاج استكمال مركّز', 'warning', tier2) : ''}
      ${tier3.length ? tierSection('يحتاج عمل تأسيسي', 'danger', tier3) : ''}

      ${quickWins.length ? `
        <div class="section">
          <div class="section-kicker">أسرع القطاعات للتحسين</div>
          <p class="note">قطاعات قريبة من الجاهزية وعوائقها قليلة — أعلى عائد لأقل جهد.</p>
          <div class="db-quickwins">
            ${quickWins.slice(0, 5).map(s => `
              <a href="#/sector/${esc(s.key)}" class="db-quickwin-card">
                <div class="db-qw-name">${esc(s.title)}</div>
                <div class="db-qw-score">${s.readiness.score}%</div>
                <div class="db-qw-detail">${s.metrics.total} كيان • ${s.readiness.blockers.length} عائق</div>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-kicker">ترتيب حسب حجم الفجوات</div>
        <p class="note">القطاعات التي تحتاج أكبر حجم عمل — الأكبر حجمًا والأبعد عن الجاهزية.</p>
        <div class="db-gap-list">
          ${byGap.slice(0, 8).map((s, i) => `
            <div class="db-gap-item">
              <span class="db-gap-rank">${i + 1}</span>
              <a href="#/sector/${esc(s.key)}">${esc(s.title)}</a>
              <span class="db-gap-detail">${s.metrics.total} كيان • ${s.readiness.score}% جاهزية • ${100 - s.readiness.score}% فجوة</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-kicker">جميع القطاعات — ترتيب حسب الجاهزية</div>
        <table class="db-table db-table-full">
          <thead><tr>
            <th>القطاع</th><th>كيانات</th><th>الجاهزية</th><th>التصنيف</th><th>أهم العوائق</th>
          </tr></thead>
          <tbody>${byReadiness.map(sectorRow).join('')}</tbody>
        </table>
      </div>
    </div>
  `;
}


export function renderExecutionQueue() {
  const groups = sectorTree();
  const allSectors = groups.flatMap(g => g.children);
  const eqFilter = state._eqFilter || 'all';
  const eqType = state._eqType || 'all';

  // ── Gather cross-sector priority items ──
  const crossItems = [];
  const sectorSnapshots = [];

  allSectors.forEach(sec => {
    const records = state.records.filter(r => r.sector === sec.key);
    if (!records.length) return;
    const profile = getSectorProfile(sec.key);
    const custom = hasCustomProfile(sec.key);
    const metrics = sectorMetrics(records);
    const readiness = sectorReadiness(metrics, profile);

    // Quick impact simulation
    const simRef = sectorReadiness({ ...metrics, hasRefUrl: metrics.total }, profile);
    const simPhone = sectorReadiness({ ...metrics, hasPhone: metrics.total }, profile);
    const simDist = sectorReadiness({ ...metrics, missingDistrict: 0 }, profile);
    const simConf = sectorReadiness({ ...metrics, lowConf: 0 }, profile);
    const impacts = [
      { action: 'ref', gain: simRef.score - readiness.score, label: 'إضافة المصادر' },
      { action: 'phone', gain: simPhone.score - readiness.score, label: 'جمع الهواتف' },
      { action: 'district', gain: simDist.score - readiness.score, label: 'تعيين الأحياء' },
      { action: 'confidence', gain: simConf.score - readiness.score, label: 'رفع الثقة' },
    ].filter(i => i.gain > 0).sort((a, b) => b.gain - a.gain);

    sectorSnapshots.push({
      key: sec.key, title: sec.title, custom, metrics, readiness, impacts,
      topImpact: impacts[0] || null,
    });

    // Top 8 per sector with cross-sector boosting
    const top = scoredPriority(records, 8, profile);
    top.forEach(item => {
      const boost = (custom ? 2 : 0) + Math.max(0, Math.round((70 - readiness.score) / 10));
      const effectiveScore = item.score + boost;

      // Classify issue type
      let issueType = 'mixed';
      if (item.noRef && !item.isLowConf && !item.noDistrict) issueType = 'ref';
      else if ((item.noPhone || item.noInsta) && !item.noRef && !item.isLowConf) issueType = 'contact';
      else if (item.isLowConf && !item.noRef && !item.noDistrict) issueType = 'confidence';
      else if (item.noDistrict && !item.noRef && !item.isLowConf) issueType = 'district';
      else if (item.isUnverified && item.score <= 4) issueType = 'verify';

      crossItems.push({
        ...item,
        sector: sec.key,
        sectorTitle: sec.title,
        sectorReadiness: readiness.score,
        custom,
        effectiveScore,
        issueType,
      });
    });
  });

  crossItems.sort((a, b) => b.effectiveScore - a.effectiveScore);

  // ── Apply filters ──
  let filtered = crossItems;
  if (eqFilter !== 'all') {
    filtered = filtered.filter(x => x.sector === eqFilter);
  }
  if (eqType !== 'all') {
    filtered = filtered.filter(x => x.issueType === eqType);
  }

  // ── Top daily items (first 15) ──
  const daily = filtered.slice(0, 15);

  // ── Quick impact sectors: which sector + action gives biggest readiness bump ──
  const quickImpacts = sectorSnapshots
    .filter(s => s.topImpact && s.topImpact.gain >= 5)
    .sort((a, b) => b.topImpact.gain - a.topImpact.gain)
    .slice(0, 6);

  // ── Issue breakdown summary ──
  const issueBreakdown = {};
  filtered.forEach(item => {
    issueBreakdown[item.issueType] = (issueBreakdown[item.issueType] || 0) + 1;
  });

  // ── Sector filter options ──
  const sectorOptions = [...new Set(crossItems.map(x => x.sector))].sort();

  // Stats
  const totalItems = filtered.length;
  const profSectors = sectorSnapshots.filter(s => s.custom).length;
  const avgScore = totalItems ? Math.round(filtered.reduce((s, x) => s + x.effectiveScore, 0) / totalItems) : 0;

  const ISSUE_LABELS = {
    ref: 'ناقص مصدر',
    contact: 'ناقص تواصل',
    confidence: 'ثقة منخفضة',
    district: 'بدون حي',
    verify: 'يحتاج تحقق',
    mixed: 'مشاكل متعددة',
    all: 'الكل',
  };

  function issueTag(type) {
    const toneMap = { ref: 'eq-tag-ref', contact: 'eq-tag-contact', confidence: 'eq-tag-conf', district: 'eq-tag-dist', verify: 'eq-tag-verify', mixed: 'eq-tag-mixed' };
    return `<span class="eq-tag ${toneMap[type] || 'eq-tag-mixed'}">${ISSUE_LABELS[type] || type}</span>`;
  }

  function itemRow(item, i) {
    const r = item.record;
    const issues = [];
    if (item.noPhone && item.noInsta) issues.push('بدون تواصل');
    else if (item.noPhone) issues.push('بدون هاتف');
    else if (item.noInsta) issues.push('بدون إنستغرام');
    if (item.isLowConf) issues.push('ثقة↓');
    if (item.noDistrict) issues.push('بدون حي');
    if (item.noRef) issues.push('بدون مصدر');
    if (item.isUnverified) issues.push('غير متحقق');

    return `
      <div class="eq-item" data-sector="${esc(item.sector)}" data-type="${item.issueType}">
        <div class="eq-rank">${i + 1}</div>
        <div class="eq-body">
          <div class="eq-name-row">
            <a href="#/focus/${esc(r.slug)}?eqFilter=${encodeURIComponent(eqFilter)}&eqType=${encodeURIComponent(eqType)}" class="eq-name">${esc(r.name)}</a>
            <a href="#/sector/${esc(item.sector)}" class="eq-sector-link">${esc(item.sectorTitle)}</a>
          </div>
          <div class="eq-meta">
            ${esc(r.district || 'غير محدد')} · ${issueTag(item.issueType)} · ${issues.map(i => `<span class="eq-issue">${i}</span>`).join(' ')}
          </div>
        </div>
        <div class="eq-score-col">
          <div class="eq-score">${item.effectiveScore}</div>
          <div class="eq-score-sub">أولوية</div>
        </div>
      </div>`;
  }

  return `
    <div class="exec-queue">
      <div class="hero page-hero hero-compact">
        <div class="sector-breadcrumb"><a href="#/dashboard">الرئيسية</a> ← قائمة التنفيذ اليومي</div>
        <h3>قائمة التنفيذ اليومي</h3>
        <p>${totalItems} عنصر عبر ${sectorOptions.length} قطاع • متوسط الأولوية ${avgScore} • ${profSectors} قطاع بملف مخصص</p>
      </div>

      <div class="section eq-filters-bar">
        <div class="eq-filter-group">
          <span class="eq-filter-label">القطاع:</span>
          <button class="eq-filter-btn${eqFilter === 'all' ? ' eq-active' : ''}" data-action="eq-sector" data-eq-val="all">الكل</button>
          ${sectorSnapshots.filter(s => s.custom).map(s =>
            `<button class="eq-filter-btn${eqFilter === s.key ? ' eq-active' : ''}" data-action="eq-sector" data-eq-val="${esc(s.key)}">${esc(s.title)}</button>`
          ).join('')}
        </div>
        <div class="eq-filter-group">
          <span class="eq-filter-label">نوع المشكلة:</span>
          <button class="eq-filter-btn${eqType === 'all' ? ' eq-active' : ''}" data-action="eq-type" data-eq-val="all">الكل</button>
          ${Object.entries(issueBreakdown).sort((a,b) => b[1]-a[1]).map(([type, count]) =>
            `<button class="eq-filter-btn${eqType === type ? ' eq-active' : ''}" data-action="eq-type" data-eq-val="${type}">${ISSUE_LABELS[type] || type} <span class="eq-count">${count}</span></button>`
          ).join('')}
        </div>
      </div>

      ${quickImpacts.length ? `
        <div class="section">
          <div class="section-kicker">أسرع رفع للجاهزية</div>
          <p class="note">إجراء واحد مركّز في هذه القطاعات يرفع الجاهزية أكثر من أي شيء آخر.</p>
          <div class="eq-impacts-grid">
            ${quickImpacts.map(s => `
              <a href="#/sector/${esc(s.key)}" class="eq-impact-card">
                <div class="eq-impact-sector">${esc(s.title)}</div>
                <div class="eq-impact-action">${esc(s.topImpact.label)}</div>
                <div class="eq-impact-gain">+${s.topImpact.gain}%</div>
                <div class="eq-impact-from">${s.readiness.score}% → ${s.readiness.score + s.topImpact.gain}%</div>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <div class="section">
        <div class="section-kicker">أعلى أولويات اليوم</div>
        <p class="note">الكيانات الأكثر حاجة للعمل — مرتبة بالأولوية الفعلية عبر جميع القطاعات.</p>
        <div class="eq-list">
          ${daily.length ? daily.map((item, i) => itemRow(item, i)).join('') : '<div class="empty">لا توجد عناصر تطابق الفلتر.</div>'}
        </div>
        ${filtered.length > 15 ? `<div class="eq-more-note">${filtered.length - 15} عنصر إضافي لم يظهر</div>` : ''}
      </div>

      <div class="section grid cards-2">
        <div class="card">
          <div class="section-kicker">توزيع المشاكل</div>
          <div class="eq-breakdown">
            ${Object.entries(issueBreakdown).sort((a,b) => b[1]-a[1]).map(([type, count]) => {
              const pct = Math.round(count / totalItems * 100);
              return `<div class="eq-break-row">
                ${issueTag(type)}
                <div class="eq-break-bar"><div class="eq-break-fill" style="width:${pct}%"></div></div>
                <span class="eq-break-num">${count} (${pct}%)</span>
              </div>`;
            }).join('')}
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">أين أركز اليوم؟</div>
          <div class="eq-focus-advice">
            ${quickImpacts.length ? `
              <div class="eq-advice-item eq-advice-top">
                <strong>أعلى عائد:</strong> ${esc(quickImpacts[0].topImpact.label)} في ${esc(quickImpacts[0].title)} (+${quickImpacts[0].topImpact.gain}% جاهزية)
              </div>
            ` : ''}
            ${(() => {
              const topType = Object.entries(issueBreakdown).sort((a,b) => b[1]-a[1])[0];
              return topType ? `<div class="eq-advice-item"><strong>أكثر مشكلة:</strong> ${ISSUE_LABELS[topType[0]] || topType[0]} (${topType[1]} كيان)</div>` : '';
            })()}
            ${(() => {
              const topSector = Object.entries(crossItems.reduce((acc, x) => { acc[x.sectorTitle] = (acc[x.sectorTitle] || 0) + x.effectiveScore; return acc; }, {})).sort((a,b) => b[1]-a[1])[0];
              return topSector ? `<div class="eq-advice-item"><strong>أعلى قطاع حاجة:</strong> ${esc(topSector[0])}</div>` : '';
            })()}
          </div>
        </div>
      </div>

      ${filtered.length > 15 ? `
        <div class="section">
          <div class="section-kicker">باقي القائمة</div>
          <div class="eq-list eq-list-compact">
            ${filtered.slice(15, 40).map((item, i) => itemRow(item, i + 15)).join('')}
          </div>
          ${filtered.length > 40 ? `<div class="eq-more-note">${filtered.length - 40} عنصر إضافي</div>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}


/* ── Cross-sector execution queue computation (shared) ── */

function computeExecutionQueue(eqFilter, eqType) {
  const groups = sectorTree();
  const allSectors = groups.flatMap(g => g.children);
  const crossItems = [];

  allSectors.forEach(sec => {
    const records = state.records.filter(r => r.sector === sec.key);
    if (!records.length) return;
    const profile = getSectorProfile(sec.key);
    const custom = hasCustomProfile(sec.key);
    const metrics = sectorMetrics(records);
    const readiness = sectorReadiness(metrics, profile);

    const top = scoredPriority(records, 8, profile);
    top.forEach(item => {
      const boost = (custom ? 2 : 0) + Math.max(0, Math.round((70 - readiness.score) / 10));
      const effectiveScore = item.score + boost;

      let issueType = 'mixed';
      if (item.noRef && !item.isLowConf && !item.noDistrict) issueType = 'ref';
      else if ((item.noPhone || item.noInsta) && !item.noRef && !item.isLowConf) issueType = 'contact';
      else if (item.isLowConf && !item.noRef && !item.noDistrict) issueType = 'confidence';
      else if (item.noDistrict && !item.noRef && !item.isLowConf) issueType = 'district';
      else if (item.isUnverified && item.score <= 4) issueType = 'verify';

      crossItems.push({
        ...item,
        sector: sec.key,
        sectorTitle: sec.title,
        sectorReadiness: readiness.score,
        custom,
        effectiveScore,
        issueType,
      });
    });
  });

  crossItems.sort((a, b) => b.effectiveScore - a.effectiveScore);

  let filtered = crossItems;
  if (eqFilter && eqFilter !== 'all') filtered = filtered.filter(x => x.sector === eqFilter);
  if (eqType && eqType !== 'all') filtered = filtered.filter(x => x.issueType === eqType);

  return filtered;
}


/* ── Focused Execution Workbench with Rapid Update Assist ── */

function ruaFieldsForIssueType(issueType, gaps) {
  // Returns the prioritized list of fields to show based on issue type
  const fieldDefs = {
    phone:         { key: 'phone',             label: '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641',        type: 'tel',    placeholder: '05xxxxxxxx',   search: 'phone' },
    instagram:     { key: 'official_instagram', label: '\u062d\u0633\u0627\u0628 \u0625\u0646\u0633\u062a\u063a\u0631\u0627\u0645',     type: 'text',   placeholder: '@account',     search: 'instagram' },
    reference_url: { key: 'reference_url',      label: '\u0631\u0627\u0628\u0637 \u0645\u0631\u062c\u0639\u064a',        type: 'url',    placeholder: 'https://...',  search: 'url' },
    district:      { key: 'district',           label: '\u0627\u0644\u062d\u064a',              type: 'text',   placeholder: '\u0627\u0633\u0645 \u0627\u0644\u062d\u064a',        search: 'map' },
    confidence:    { key: 'confidence',         label: '\u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u062b\u0642\u0629',     type: 'select', options: ['high', 'medium', 'low'], search: null },
    status:        { key: 'status',             label: '\u0627\u0644\u062d\u0627\u0644\u0629',            type: 'select', options: ['verified','partially_verified','needs_review','stub'], search: null },
    short_address: { key: 'short_address',      label: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u062e\u062a\u0635\u0631',    type: 'text',   placeholder: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646...',       search: 'map' },
    source_notes:  { key: 'source_notes',       label: '\u0645\u0644\u0627\u062d\u0638\u0627\u062a \u0627\u0644\u0645\u0635\u062f\u0631',    type: 'text',   placeholder: '\u0645\u0644\u0627\u062d\u0638\u0629...',      search: null },
  };

  // Gap fields first (these are why the entity is in the queue)
  const gapKeys = gaps.map(g => g.field).filter(k => fieldDefs[k]);

  // Issue-type priority ordering for additional context fields
  const issueExtras = {
    ref:        ['reference_url', 'source_notes'],
    contact:    ['phone', 'instagram'],
    confidence: ['confidence', 'status', 'source_notes'],
    district:   ['district', 'short_address'],
    verify:     ['status', 'confidence', 'source_notes'],
    mixed:      ['reference_url', 'phone', 'instagram', 'district', 'confidence'],
  };

  const extras = (issueExtras[issueType] || issueExtras.mixed).filter(k => !gapKeys.includes(k));
  const allKeys = [...new Set([...gapKeys, ...extras])].slice(0, 5); // max 5 fields

  return allKeys.map(k => fieldDefs[k]).filter(Boolean);
}

function ruaImpactEstimate(entity, field, profile) {
  // Estimate readiness impact if this field is filled
  const rw = profile.readinessWeights || {};
  const impacts = {
    phone:             { weight: Math.round((rw.phone || 0) * 100),      label: '\u062a\u0648\u0627\u0635\u0644' },
    official_instagram:{ weight: Math.round((rw.phone || 0) * 50),       label: '\u062a\u0648\u0627\u0635\u0644' },
    reference_url:     { weight: Math.round((rw.reference || 0) * 100),  label: '\u0645\u0631\u0627\u062c\u0639' },
    district:          { weight: Math.round((rw.district || 0) * 100),   label: '\u0645\u0648\u0642\u0639' },
    confidence:        { weight: Math.round((rw.confidence || 0) * 100), label: '\u062b\u0642\u0629' },
    status:            { weight: Math.round((rw.verification || 0) * 50),label: '\u062d\u0627\u0644\u0629' },
    short_address:     { weight: 2,                                      label: '\u0639\u0646\u0648\u0627\u0646' },
    source_notes:      { weight: 1,                                      label: '\u062a\u0648\u062b\u064a\u0642' },
  };
  return impacts[field] || { weight: 0, label: '' };
}

function ruaSearchUrl(entity, fieldType) {
  const name = encodeURIComponent(entity.name || '');
  const city = encodeURIComponent('\u0628\u0631\u064a\u062f\u0629');
  switch (fieldType) {
    case 'phone': return `https://www.google.com/search?q=${name}+${city}+%D8%B1%D9%82%D9%85+%D8%A7%D9%84%D9%87%D8%A7%D8%AA%D9%81`;
    case 'instagram': return `https://www.google.com/search?q=${name}+${city}+instagram`;
    case 'url': return `https://www.google.com/search?q=${name}+${city}`;
    case 'map': return `https://www.google.com/maps/search/${name}+${city}`;
    default: return null;
  }
}

export function renderFocusWorkbench(slug) {
  const { query } = parseHashRoute();
  const eqFilter = query.get('eqFilter') || state._eqFilter || 'all';
  const eqType = query.get('eqType') || state._eqType || 'all';

  const e = getEntity(slug);
  if (!e) return '<div class="empty">\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0627\u0644\u0643\u064a\u0627\u0646.</div>';

  // Compute queue and find position
  const queue = computeExecutionQueue(eqFilter, eqType);
  const queueIdx = queue.findIndex(x => x.record.slug === slug);
  const queueItem = queueIdx >= 0 ? queue[queueIdx] : null;
  const prevItem = queueIdx > 0 ? queue[queueIdx - 1] : null;
  const nextItem = queueIdx < queue.length - 1 ? queue[queueIdx + 1] : null;

  // Build focus href with preserved context
  const focusParams = `eqFilter=${encodeURIComponent(eqFilter)}&eqType=${encodeURIComponent(eqType)}`;
  const focusHref = (s) => `#/focus/${encodeURIComponent(s)}?${focusParams}`;

  // Entity data
  const sectorTitle = sectorLabelByKey(e.sector || '');
  const profile = getSectorProfile(e.sector || '');

  // Check for existing draft
  const draft = getDraft(slug);
  const hasDraft = draft && Object.keys(draft).length > 0;

  // Build "what's missing" list
  const gaps = [];
  if (!String(e.phone || '').trim()) gaps.push({ field: 'phone', label: '\u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641', critical: profile.contactRelevance.phone });
  if (!String(e.official_instagram || '').trim()) gaps.push({ field: 'instagram', label: '\u062d\u0633\u0627\u0628 \u0625\u0646\u0633\u062a\u063a\u0631\u0627\u0645', critical: profile.contactRelevance.instagram });
  if (!String(e.reference_url || '').trim()) gaps.push({ field: 'reference_url', label: '\u0631\u0627\u0628\u0637 \u0645\u0631\u062c\u0639\u064a', critical: true });
  if (!String(e.district || '').trim() || e.district === '\u063a\u064a\u0631 \u0645\u062a\u062d\u0642\u0642') gaps.push({ field: 'district', label: '\u0627\u0644\u062d\u064a', critical: true });
  if (String(e.confidence || '').toLowerCase() === 'low') gaps.push({ field: 'confidence', label: '\u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u062b\u0642\u0629', critical: true });
  if (['needs_review', 'stub', 'discovered'].includes(e.status)) gaps.push({ field: 'status', label: '\u0627\u0644\u062d\u0627\u0644\u0629 \u2014 \u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629', critical: true });
  if (!String(e.short_address || '').trim()) gaps.push({ field: 'address', label: '\u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u062e\u062a\u0635\u0631', critical: false });
  if (!e.google_rating) gaps.push({ field: 'rating', label: '\u0627\u0644\u062a\u0642\u064a\u064a\u0645', critical: false });
  if (!e.google_reviews_count) gaps.push({ field: 'reviews', label: '\u0639\u062f\u062f \u0627\u0644\u0645\u0631\u0627\u062c\u0639\u0627\u062a', critical: false });

  const criticalGaps = gaps.filter(g => g.critical);
  const minorGaps = gaps.filter(g => !g.critical);

  // Why is this entity a priority?
  const reasons = [];
  if (queueItem) {
    if (queueItem.noPhone && queueItem.noInsta) reasons.push('\u0628\u062f\u0648\u0646 \u0623\u064a \u0648\u0633\u064a\u0644\u0629 \u062a\u0648\u0627\u0635\u0644');
    else if (queueItem.noPhone) reasons.push('\u0628\u062f\u0648\u0646 \u0647\u0627\u062a\u0641');
    if (queueItem.isLowConf) reasons.push('\u062b\u0642\u0629 \u0645\u0646\u062e\u0641\u0636\u0629');
    if (queueItem.isUnverified) reasons.push('\u063a\u064a\u0631 \u0645\u062a\u062d\u0642\u0642');
    if (queueItem.noDistrict) reasons.push('\u0628\u062f\u0648\u0646 \u062d\u064a');
    if (queueItem.noRef) reasons.push('\u0628\u062f\u0648\u0646 \u0645\u0635\u062f\u0631');
    if (queueItem.missing.length) reasons.push(`${queueItem.missing.length} \u062d\u0642\u0648\u0644 \u0645\u0647\u0645\u0629 \u0646\u0627\u0642\u0635\u0629`);
  }

  // Next logical step
  let nextStep = '\u0631\u0627\u062c\u0639 \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0643\u064a\u0627\u0646';
  if (criticalGaps.length) {
    const topGap = criticalGaps[0];
    if (topGap.field === 'reference_url') nextStep = '\u0627\u0628\u062d\u062b \u0639\u0646 \u0631\u0627\u0628\u0637 \u0645\u0631\u062c\u0639\u064a (\u062c\u0648\u062c\u0644 \u0645\u0627\u0628\u0632\u060c \u0645\u0648\u0642\u0639 \u0631\u0633\u0645\u064a\u060c \u0625\u0646\u0633\u062a\u063a\u0631\u0627\u0645)';
    else if (topGap.field === 'phone') nextStep = '\u0627\u0628\u062d\u062b \u0639\u0646 \u0631\u0642\u0645 \u0627\u0644\u0647\u0627\u062a\u0641 (\u062c\u0648\u062c\u0644 \u0645\u0627\u0628\u0632\u060c \u0627\u0644\u0645\u0648\u0642\u0639 \u0627\u0644\u0631\u0633\u0645\u064a)';
    else if (topGap.field === 'district') nextStep = '\u062d\u062f\u062f \u0627\u0644\u062d\u064a \u0645\u0646 \u0627\u0644\u0639\u0646\u0648\u0627\u0646 \u0623\u0648 \u0627\u0644\u062e\u0631\u064a\u0637\u0629';
    else if (topGap.field === 'confidence') nextStep = '\u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0648\u0627\u0631\u0641\u0639 \u0645\u0633\u062a\u0648\u0649 \u0627\u0644\u062b\u0642\u0629';
    else if (topGap.field === 'status') nextStep = '\u0631\u0627\u062c\u0639 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0648\u062d\u062f\u0651\u062b \u0627\u0644\u062d\u0627\u0644\u0629';
  }

  // Available links
  const links = [];
  if (e.reference_url) links.push({ label: '\u0627\u0644\u0645\u0631\u062c\u0639', url: e.reference_url });
  if (e.official_instagram) links.push({ label: '\u0625\u0646\u0633\u062a\u063a\u0631\u0627\u0645', url: e.official_instagram.startsWith('http') ? e.official_instagram : `https://instagram.com/${e.official_instagram.replace('@', '')}` });
  if (e.google_maps_url) links.push({ label: '\u062e\u0631\u0627\u0626\u0637 \u062c\u0648\u062c\u0644', url: e.google_maps_url });

  const ISSUE_LABELS = {
    ref: '\u0646\u0627\u0642\u0635 \u0645\u0635\u062f\u0631', contact: '\u0646\u0627\u0642\u0635 \u062a\u0648\u0627\u0635\u0644', confidence: '\u062b\u0642\u0629 \u0645\u0646\u062e\u0641\u0636\u0629',
    district: '\u0628\u062f\u0648\u0646 \u062d\u064a', verify: '\u064a\u062d\u062a\u0627\u062c \u062a\u062d\u0642\u0642', mixed: '\u0645\u0634\u0627\u0643\u0644 \u0645\u062a\u0639\u062f\u062f\u0629',
  };
  const issueType = queueItem ? queueItem.issueType : 'mixed';

  // ── RUA: Rapid Update Assist fields ──
  const ruaFields = ruaFieldsForIssueType(issueType, gaps);
  const ruaFieldsHtml = ruaFields.map(fd => {
    const currentVal = (draft && draft[fd.key]) ? draft[fd.key] : (e[fd.key] || '');
    const isMissing = !String(currentVal).trim();
    const impact = ruaImpactEstimate(e, fd.key, profile);
    const searchUrl = fd.search ? ruaSearchUrl(e, fd.search) : null;

    let inputHtml = '';
    if (fd.type === 'select') {
      const opts = fd.options.map(o => `<option value="${esc(o)}" ${currentVal === o ? 'selected' : ''}>${esc(o)}</option>`).join('');
      inputHtml = `<select name="${esc(fd.key)}" class="rua-input">${opts}</select>`;
    } else {
      inputHtml = `<input type="${fd.type}" name="${esc(fd.key)}" value="${esc(currentVal)}" placeholder="${esc(fd.placeholder || '')}" class="rua-input" ${fd.type === 'tel' ? 'dir="ltr"' : ''} />`;
    }

    return `
      <div class="rua-field ${isMissing ? 'rua-field-missing' : 'rua-field-filled'}">
        <div class="rua-field-header">
          <label class="rua-label">${esc(fd.label)}</label>
          <div class="rua-field-tools">
            ${impact.weight > 0 ? `<span class="rua-impact" title="\u0623\u062b\u0631 \u0627\u0644\u0627\u0633\u062a\u0643\u0645\u0627\u0644 \u0639\u0644\u0649 \u0627\u0644\u062c\u0627\u0647\u0632\u064a\u0629">+${impact.weight} ${esc(impact.label)}</span>` : ''}
            ${searchUrl ? `<a href="${searchUrl}" target="_blank" rel="noreferrer" class="rua-search-btn" title="\u0627\u0628\u062d\u062b \u0639\u0646 \u0647\u0630\u0627 \u0627\u0644\u062d\u0642\u0644">\u0628\u062d\u062b \u2197</a>` : ''}
            ${!isMissing ? `<button type="button" class="rua-copy-btn" data-copy="${esc(currentVal)}" title="\u0646\u0633\u062e">\u0646\u0633\u062e</button>` : ''}
          </div>
        </div>
        ${inputHtml}
        ${isMissing ? '<div class="rua-status rua-status-missing">\u2716 \u0646\u0627\u0642\u0635</div>' : '<div class="rua-status rua-status-filled">\u2714 \u0645\u0648\u062c\u0648\u062f</div>'}
      </div>`;
  }).join('');

  return `
    <div class="focus-workbench">
      <div class="fw-topbar">
        <a href="#/exec-queue" class="fw-back">\u2190 \u0642\u0627\u0626\u0645\u0629 \u0627\u0644\u062a\u0646\u0641\u064a\u0630</a>
        <div class="fw-nav">
          ${prevItem ? `<a href="${focusHref(prevItem.record.slug)}" class="fw-nav-btn">\u2192 \u0627\u0644\u0633\u0627\u0628\u0642</a>` : '<span class="fw-nav-btn fw-nav-disabled">\u2192 \u0627\u0644\u0633\u0627\u0628\u0642</span>'}
          <span class="fw-pos">${queueIdx >= 0 ? `${queueIdx + 1} / ${queue.length}` : '\u2014'}</span>
          ${nextItem ? `<a href="${focusHref(nextItem.record.slug)}" class="fw-nav-btn">\u0627\u0644\u062a\u0627\u0644\u064a \u2190</a>` : '<span class="fw-nav-btn fw-nav-disabled">\u0627\u0644\u062a\u0627\u0644\u064a \u2190</span>'}
        </div>
      </div>

      <div class="fw-header">
        <div class="fw-header-main">
          <h3 class="fw-title">${esc(e.name)}</h3>
          <div class="fw-meta">
            <a href="#/sector/${esc(e.sector || '')}" class="fw-sector">${esc(sectorTitle)}</a>
            <span class="fw-district">${esc(e.district || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f')}</span>
            ${queueItem ? `<span class="fw-score">\u0623\u0648\u0644\u0648\u064a\u0629: ${queueItem.effectiveScore}</span>` : ''}
            <span class="eq-tag eq-tag-${issueType === 'ref' ? 'ref' : issueType === 'contact' ? 'contact' : issueType === 'confidence' ? 'conf' : issueType === 'district' ? 'dist' : issueType === 'verify' ? 'verify' : 'mixed'}">${ISSUE_LABELS[issueType] || issueType}</span>
          </div>
        </div>
        <div class="fw-header-actions">
          <a href="#/entities/${esc(e.slug)}" class="button">\u0627\u0644\u0635\u0641\u062d\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629</a>
        </div>
      </div>

      ${reasons.length ? `
        <div class="fw-reason-bar">
          <strong>\u0644\u0645\u0627\u0630\u0627 \u0647\u0630\u0627 \u0627\u0644\u0643\u064a\u0627\u0646 \u0623\u0648\u0644\u0648\u064a\u0629:</strong>
          ${reasons.map(r => `<span class="fw-reason-tag">${r}</span>`).join('')}
        </div>
      ` : ''}

      <div class="fw-next-step">
        <div class="fw-next-icon">\u25b6</div>
        <div class="fw-next-text">
          <strong>\u0627\u0644\u062e\u0637\u0648\u0629 \u0627\u0644\u062a\u0627\u0644\u064a\u0629:</strong>
          <span>${esc(nextStep)}</span>
        </div>
      </div>

      <!-- ── Rapid Update Assist ── -->
      <div class="rua-section">
        <div class="rua-header">
          <div class="section-kicker">\u062a\u062d\u062f\u064a\u062b \u0633\u0631\u064a\u0639</div>
          ${hasDraft ? '<span class="rua-draft-badge">\u064a\u0648\u062c\u062f \u0645\u0633\u0648\u062f\u0629 \u0645\u062d\u0641\u0648\u0638\u0629</span>' : ''}
        </div>
        <form id="ruaForm" class="rua-form" data-slug="${esc(slug)}">
          ${ruaFieldsHtml}
          <div class="rua-actions">
            <button type="button" data-action="rua-save-draft" data-slug="${esc(slug)}" class="button primary rua-save-btn">\u062d\u0641\u0638 \u0643\u0645\u0633\u0648\u062f\u0629</button>
            <button type="button" data-action="rua-export-patch" data-slug="${esc(slug)}" class="button rua-export-btn">\u062a\u0635\u062f\u064a\u0631 patch</button>
            <button type="button" data-action="rua-skip" class="button rua-skip-btn">${nextItem ? '\u062a\u062e\u0637\u0651 \u2192 \u0627\u0644\u062a\u0627\u0644\u064a' : '\u062a\u062e\u0637\u0651'}</button>
          </div>
        </form>
        <div class="rua-tip">\u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u0645\u0639\u0631\u0648\u0636\u0629 \u0645\u062e\u062a\u0627\u0631\u0629 \u0628\u0646\u0627\u0621\u064b \u0639\u0644\u0649 \u0646\u0648\u0639 \u0627\u0644\u0645\u0634\u0643\u0644\u0629: <strong>${ISSUE_LABELS[issueType] || issueType}</strong></div>
      </div>

      <div class="fw-body grid cards-2">
        <div class="card">
          <div class="section-kicker">\u0645\u0627 \u0627\u0644\u0630\u064a \u064a\u0646\u0642\u0635</div>
          ${criticalGaps.length ? `
            <div class="fw-gaps">
              ${criticalGaps.map(g => `<div class="fw-gap fw-gap-critical"><span class="fw-gap-dot fw-gap-dot-critical"></span>${esc(g.label)}</div>`).join('')}
            </div>
          ` : '<div class="fw-no-gaps">\u0644\u0627 \u0646\u0648\u0627\u0642\u0635 \u062d\u0631\u062c\u0629</div>'}
          ${minorGaps.length ? `
            <div class="fw-gaps fw-gaps-minor">
              ${minorGaps.map(g => `<div class="fw-gap"><span class="fw-gap-dot"></span>${esc(g.label)}</div>`).join('')}
            </div>
          ` : ''}
        </div>

        <div class="card">
          <div class="section-kicker">\u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u0645\u062a\u0648\u0641\u0631\u0629</div>
          <div class="fw-facts">
            <div class="fw-fact"><strong>\u0627\u0644\u062d\u0627\u0644\u0629:</strong> ${esc(e.status || '\u2014')}</div>
            <div class="fw-fact"><strong>\u0627\u0644\u062b\u0642\u0629:</strong> ${esc(e.confidence || '\u2014')}</div>
            <div class="fw-fact"><strong>\u0627\u0644\u062a\u0642\u064a\u064a\u0645:</strong> ${esc(e.google_rating || '\u2014')} (${esc(e.google_reviews_count || '0')} \u0645\u0631\u0627\u062c\u0639\u0629)</div>
            <div class="fw-fact"><strong>\u0627\u0644\u0641\u0626\u0629:</strong> ${esc(e.category || '\u2014')}</div>
            <div class="fw-fact"><strong>\u0627\u0644\u0639\u0646\u0648\u0627\u0646:</strong> ${esc(e.short_address || '\u2014')}</div>
            ${e.phone ? `<div class="fw-fact"><strong>\u0627\u0644\u0647\u0627\u062a\u0641:</strong> <span dir="ltr">${esc(e.phone)}</span></div>` : ''}
            ${e.hours_summary ? `<div class="fw-fact"><strong>\u0627\u0644\u0633\u0627\u0639\u0627\u062a:</strong> ${esc(e.hours_summary)}</div>` : ''}
          </div>
          ${links.length ? `
            <div class="fw-links">
              ${links.map(l => `<a href="${esc(l.url)}" target="_blank" rel="noreferrer" class="fw-link">${esc(l.label)} \u2197</a>`).join('')}
            </div>
          ` : ''}
        </div>
      </div>

      ${profile.focusLabel ? `
        <div class="fw-profile-note">
          <span class="sector-focus-label">${esc(profile.focusLabel)}</span>
          \u0647\u0630\u0627 \u0627\u0644\u0642\u0637\u0627\u0639 \u0644\u0647 \u0645\u0644\u0641 \u062a\u0634\u063a\u064a\u0644\u064a \u0645\u062e\u0635\u0635.
        </div>
      ` : ''}

      ${nextItem ? `
        <div class="fw-next-entity">
          <span>\u0627\u0644\u062a\u0627\u0644\u064a \u0641\u064a \u0627\u0644\u0642\u0627\u0626\u0645\u0629:</span>
          <a href="${focusHref(nextItem.record.slug)}"><strong>${esc(nextItem.record.name)}</strong> \u2014 ${esc(nextItem.sectorTitle)} \u2014 ${ISSUE_LABELS[nextItem.issueType] || nextItem.issueType}</a>
        </div>
      ` : ''}
    </div>
  `;
}


export function renderPipelinePage() {
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


export function renderGovernancePage() {
  return `
    <div class="hero page-hero"><div class="section-kicker">مبادئ العمل</div><h3>معايير تنظيم الدليل</h3><p>مبادئ مختصرة تساعد على إبقاء المعلومات واضحة ومتسقة وقابلة للتوسع.</p></div>
    <div class="grid cards-3 section">
      <div class="card"><h3>مرجع واضح</h3><p class="note">كل تعديل معتمد ينعكس في نفس المصدر داخل الدليل.</p></div>
      <div class="card"><h3>مراجعة قبل النشر</h3><p class="note">السجلات غير المكتملة تبقى مميزة حتى تكتمل مراجعتها.</p></div>
      <div class="card"><h3>توسع متدرج</h3><p class="note">تُضاف الأقسام الجديدة عندما تكون بياناتها جاهزة.</p></div>
    </div>
  `;
}


export function renderDashboard() {
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
    <div class="hero hero-compact page-hero">
      <h3>نظرة عامة</h3>
      <p>ابدأ من هنا — تصفح القطاعات أو راجع ما يحتاج انتباهك اليوم.</p>
      <div class="hero-actions">
        <a href="#/sectors" class="button primary">فهرس القطاعات</a>
        <a href="#/districts" class="button">تصفح بالأحياء</a>
        <a href="#/filters" class="button">بحث متقدم</a>
      </div>
    </div>
    <div class="grid cards-4 section">
      <div class="card mini-panel emphasis-panel"><div class="metric">${needsReview.length + branchConflict.length}</div><div class="metric-sub">بحاجة انتباه</div></div>
      <div class="card mini-panel"><div class="metric">${filtered.length}</div><div class="metric-sub">إجمالي السجلات</div></div>
      <div class="card mini-panel"><div class="metric">${districtsCount}</div><div class="metric-sub">حي مغطى</div></div>
      <div class="card mini-panel"><div class="metric">${sectors.length}</div><div class="metric-sub">قطاع</div></div>
    </div>
    <div class="section operator-shortcuts">
      <div class="section-header">
        <h3>صفوف العمل</h3>
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
          ${needsReview.slice(0,4).map(r => `<a href="#/entities/${esc(r.slug)}" class="stack-item"><strong>${esc(r.name)}</strong><span>${esc(r.editorial_summary || 'يحتاج مراجعة')}</span></a>`).join('')}
          ${branchConflict.slice(0,3).map(r => `<a href="#/entities/${esc(r.slug)}" class="stack-item"><strong>${esc(r.name)}</strong><span>تعارض فروع: ${esc(r.branch_group || 'غير محدد')}</span></a>`).join('')}
          ${(!needsReview.length && !branchConflict.length) ? '<div class="empty">لا توجد عناصر حرجة الآن.</div>' : ''}
        </div>
      </div>
      <div class="card">
        <div class="section-kicker">سجلات ناقصة</div>
        <h3>أقرب فرص التحسين</h3>
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
        <div class="section-kicker">آخر المستجدات</div>
        <h3>سجلات جديدة أو محدّثة</h3>
        ${newQueue.length ? `<div class="stack-list compact-stack">${newQueue.map(r => `
          <a href="#/entities/${esc(r.slug)}" class="stack-item">
            <strong>${esc(r.name)}</strong>
            <span>${esc(STATUS_AR[r.status] || r.status)} · ${esc(displayText(r.district))}</span>
          </a>
        `).join('')}</div>` : '<div class="empty">لا توجد مستجدات الآن.</div>'}
      </div>
      <div class="card">
        <div class="section-kicker">أحياء بارزة</div>
        <h3>الأكثر تغطية</h3>
        <div class="district-badges">
          ${districtHighlights.map(group => `<a href="${districtHref(group.name)}" class="district-badge"><strong>${esc(group.name)}</strong><span>${group.count} سجل</span></a>`).join('')}
        </div>
      </div>
    </div>
    <div class="section grid cards-2">
      <div class="card">
        <div class="section-kicker">مؤشرات عامة</div>
        <h3>صورة سريعة</h3>
        <div class="stack-list compact-stack">
          ${statuses.map(item => `<div class="stack-item static-item"><strong>${item.label}</strong><span>${item.count} سجل</span></div>`).join('')}
        </div>
      </div>
      <div class="card">
        <div class="section-kicker">أدوات الإدارة</div>
        <h3>نقاط دخول سريعة</h3>
        <div class="stack-list compact-stack">
          <a href="#/ops-hub" class="stack-item"><strong>مركز المراجعة</strong><span>جلسات ودفعات وتصديرات</span></a>
          <a href="#/editorial-hub" class="stack-item"><strong>مركز التحرير</strong><span>مسودات وpatches واستيراد</span></a>
          <a href="#/verification-program" class="stack-item"><strong>عمليات التحقق</strong><span>تحقق ومهمات وأدلة</span></a>
          <a href="#/release-readiness" class="stack-item"><strong>الجاهزية للنشر</strong><span>ما هو جاهز للاعتماد</span></a>
        </div>
      </div>
    </div>
  `;
}


export function renderEntitiesPage() {
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


export function renderEditorialControlCenter() {
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
      <p>المسودات والتعديلات والاستيراد.</p>
      <div class="hero-actions">
        <a href="#/entities/__new__" class="button primary">مسودة جديدة</a>
        <a href="#/agent-drafts" class="button">مسودات الوكلاء</a>
        <a href="#/release-readiness" class="button">الجاهزية للنشر</a>
      </div>
    </div>
    <div class="editorial-shell section">
      <div class="editorial-kpis">
        <div class="card mini-panel emphasis-panel"><div class="metric">${drafts.length}</div><div class="metric-sub">كل المسودات</div></div>
        <div class="card mini-panel"><div class="metric">${patches.length}</div><div class="metric-sub">تعديلات مصدّرة</div></div>
        <div class="card mini-panel"><div class="metric">${readinessCounts.exportReady}</div><div class="metric-sub">جاهزة للتصدير</div></div>
        <div class="card mini-panel"><div class="metric">${readinessCounts.completion}</div><div class="metric-sub">تحتاج إكمالًا</div></div>
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
          <div class="section-kicker">التعديلات المصدّرة</div>
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
          ` : '<div class="empty">لا توجد تعديلات مصدّرة بعد.</div>'}
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
          ` : '<div class="empty">لا توجد عناصر استيراد محفوظة بعد.</div>'}
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
          <div class="section-kicker">مسودات التحقق</div>
          <h3>مسودات التحقق المقبولة</h3>
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
          ` : '<div class="empty">لا توجد مسودات تحقق مقبولة بعد.</div>'}
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


export function renderAgentDraftsHub() {
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
            <div class="section-kicker">تسليم مسودات التحقق</div>
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
        ` : '<div class="empty">لا توجد مسودات تحقق مقبولة بعد.</div>'}
      </div>
    </div>
  `;
}


export function renderAgentOpsConsole(selectedRunId = '') {
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


export function renderVerificationWorkspace(queueKey = 'source-review') {
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
        <a href="#/verification-program" class="button primary">مركز العمليات</a>
        <a href="#/editorial-hub" class="button">التحرير</a>
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


export function renderVerificationProgramHub() {
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
      <p>المهام والجلسات والتغطية والمتابعة.</p>
      <div class="hero-actions">
        <a href="#/verification/source-review" class="button primary">صفوف التحقق</a>
        <a href="#/release-readiness" class="button">الجاهزية</a>
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
          <div class="section-kicker">دعم التحقق</div>
          <h3>مسودات دعم التحقق</h3>
          <div class="ops-followup-grid">
            <div class="triage-list-item"><strong>اقتراحات التحقق</strong><span>${agent.verification.length} اقتراح</span></div>
            <div class="triage-list-item"><strong>قيد المراجعة</strong><span>${agent.verification.filter(item => item.status === 'in_review').length} اقتراح</span></div>
            <div class="triage-list-item"><strong>مقبول إلى draft</strong><span>${verificationDrafts.length} draft</span></div>
          </div>

          <div class="actions">
            <a class="button" href="#/agent-drafts">مراجعة الاقتراحات</a>
            <a class="button subtle" href="#/editorial-hub">مركز التحرير</a>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">التسليم</div>
          <h3>ما الذي وصل إلى draft التحقق؟</h3>
          ${verificationDrafts.length ? `
            <div class="triage-list">
              ${verificationDrafts.slice(0, 5).map(item => `<div class="triage-list-item"><strong>${esc(item.recordName)}</strong><span>${esc(item.targetLabel)} • ${esc(displayText(item.suggestedValue, '—'))}</span></div>`).join('')}
            </div>
          ` : '<div class="empty">لا توجد مسودات تحقق مقبولة بعد.</div>'}
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">مركز التنفيذ</div>
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
            <div class="triage-list-item"><strong>متابعة</strong><span>${execution.sessions.reduce((acc, item) => acc + item.summary.followup, 0)} عنصر</span></div>
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
          ${missions.missions.slice(0, 5).map(item => {
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
                  <span class="pill muted">لا توجد جلسة بعد</span>
                </div>
              `}
              <div class="verification-queue-toolbar">
                <label class="edit-field verification-note-field">
                  <span>ملاحظة محاولة التنفيذ</span>
                  <textarea id="missionAttemptNote-${esc(item.id)}" class="field" placeholder="دوّن ما الذي جُرّب، وما الذي نجح أو فشل، وما المتابعة التالية."></textarea>
                </label>

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
                  <button class="button subtle" type="button" data-action="mission-session-export" data-mission-id="${esc(item.id)}" data-format="summary">ملخص</button>
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
              ${control.decisions.slice(0, 5).map(item => `
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
              ${evidence.slice(0, 3).map(item => `
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


export function renderReleaseReadinessHub() {
  const readiness = readinessSnapshot();
  const packs = releasePackPlan();
  const resolution = resolutionImpactSnapshot();
  const finalPatch = finalPatchReviewSnapshot();
  const simulation = patchApplySimulationSnapshot();
  return `
    <div class="hero hero-compact page-hero operator-hero">
      <div class="section-kicker">الجاهزية والاعتماد</div>
      <h3>مركز الجاهزية والاعتماد</h3>
      <p>الجاهز وغير الجاهز والعوائق والقرار التالي.</p>
      <div class="hero-actions">
        <a href="#/verification-program" class="button primary">التحقق والمهام</a>
        <a href="#/editorial-hub" class="button">التحرير</a>
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

      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">لوحة الأثر</div>
          <h3>الأثر الفعلي على البيانات</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>سجلات تحسنت</strong><span>${resolution.improvedCount} سجل</span></div>
            <div class="triage-list-item"><strong>اقتربت من الجاهزية</strong><span>${resolution.nearReadyCount} سجل</span></div>
            <div class="triage-list-item"><strong>أصبحت ready فعليًا</strong><span>${resolution.patchReadyCount} سجل</span></div>
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
          <div class="section-kicker">أكبر العوائق</div>
          <h3>أين يتعطل الإخراج؟</h3>
          <div class="triage-list">
            ${readiness.blockers.map(item => `<div class="triage-list-item"><strong>${esc(item.label)}</strong><span>${item.count} سجل</span></div>`).join('')}
          </div>
        </div>
      </div>
      <div class="verification-grid">
        <div class="card">
          <div class="section-kicker">من المسودة إلى التعديل</div>
          <h3>من draft إلى patch-ready</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>مسودات الوكيل / التحقق</strong><span>${agentDraftEntries().length} اقتراحات + ${verificationDraftEntries().length} verification drafts</span></div>
            <div class="triage-list-item"><strong>مسودات تحريرية</strong><span>${editorialDraftEntries().length} مسودة</span></div>
            <div class="triage-list-item"><strong>جاهزة للمراجعة</strong><span>${editorialDraftEntries().filter(item => item.readiness === 'review-ready').length} مسودة</span></div>
            <div class="triage-list-item"><strong>جاهزة للتعديل</strong><span>${resolution.patchReadyCount} سجل</span></div>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">حسم الصفوف</div>
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
          <div class="section-kicker">المراجعة النهائية</div>
          <h3>القرار النهائي على السجلات المرشحة</h3>
          <div class="ops-followup-grid">
            <div class="triage-list-item"><strong>موافق عليه</strong><span>${finalPatch.approved.length} سجل</span></div>
            <div class="triage-list-item"><strong>معلّق</strong><span>${finalPatch.held.length} سجل</span></div>
            <div class="triage-list-item"><strong>مستبعد</strong><span>${finalPatch.excluded.length} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج إعادة مراجعة</strong><span>${finalPatch.rereview.length} سجل</span></div>
            <div class="triage-list-item"><strong>غير محسوم</strong><span>${finalPatch.unresolved.length} سجل</span></div>
          </div>
          <div class="actions" style="margin-top:14px;">
            <button class="button queue" type="button" data-action="final-patch-export" data-format="json">JSON</button>
            <button class="button subtle" type="button" data-action="final-patch-export" data-format="csv">CSV</button>
            <button class="button subtle" type="button" data-action="final-patch-export" data-format="summary">ملخص</button>
          </div>
        </div>
        <div class="card">
          <div class="section-kicker">محاكاة التطبيق</div>
          <h3>محاكاة التطبيق والتوقيع النهائي</h3>
          <div class="ops-followup-grid">
            <div class="triage-list-item"><strong>جاهز للتوقيع</strong><span>${simulation.validation.readyForSignoff} سجل</span></div>
            <div class="triage-list-item"><strong>موقّع</strong><span>${simulation.validation.signedOff} سجل</span></div>
            <div class="triage-list-item"><strong>معلّق قبل التطبيق</strong><span>${simulation.validation.held} سجل</span></div>
            <div class="triage-list-item"><strong>يحتاج مراجعة أخيرة</strong><span>${simulation.validation.rereview} سجل</span></div>
            <div class="triage-list-item"><strong>صالح للحزمة</strong><span>${simulation.validation.validForBundle} سجل</span></div>
          </div>
          <div class="actions" style="margin-top:14px;">
            <button class="button queue" type="button" data-action="patch-signoff-export" data-kind="simulation" data-format="json">محاكاة JSON</button>
            <button class="button subtle" type="button" data-action="patch-signoff-export" data-kind="signoff" data-format="summary">تقرير التوقيع</button>
            <button class="button subtle" type="button" data-action="patch-signoff-export" data-kind="approved" data-format="json">الحزمة الموافقة</button>
            <button class="button subtle" type="button" data-action="patch-signoff-export" data-kind="blocked" data-format="summary">تقرير المعطل</button>
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
          <div class="section-kicker">فحص الحزمة</div>
          <h3>حالة الحزمة النهائية</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>صالحة للحزمة</strong><span>${simulation.validation.validForBundle} / ${simulation.validation.total} سجل</span></div>
            <div class="triage-list-item"><strong>معطلة</strong><span>${simulation.validation.blocked} سجل</span></div>
            ${simulation.validation.blockers.length
              ? simulation.validation.blockers.map(item => `<div class="triage-list-item"><strong>${esc(item.label)}</strong><span>${item.count} سجل</span></div>`).join('')
              : ''}
          </div>
        </div>
      </div>
      <div class="card">
        <div class="section-header">
          <div>
            <div class="section-kicker">طبقة المراجعة</div>
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
                  <span>${esc(item.signoff.blockers.length ? `عوائق: ${item.signoff.blockers.join(' • ')}` : 'اجتاز الفحص النهائي ويمكن توقيعه')}</span>
                </div>
                <textarea id="finalPatchNote-${esc(item.slug)}" class="field" placeholder="دوّن سبب القرار النهائي أو أي ملاحظة قبل إدخال السجل في الحزمة أو تعليقه.">${esc(item.review.note || '')}</textarea>
                <div class="verification-decision-actions">
                  <button class="button queue" type="button" data-action="final-patch-decision" data-slug="${esc(item.slug)}" data-decision="approve" data-note-id="finalPatchNote-${esc(item.slug)}">موافقة</button>
                  <button class="button gold" type="button" data-action="final-patch-decision" data-slug="${esc(item.slug)}" data-decision="hold" data-note-id="finalPatchNote-${esc(item.slug)}">تعليق</button>
                  <button class="button subtle" type="button" data-action="final-patch-decision" data-slug="${esc(item.slug)}" data-decision="rereview" data-note-id="finalPatchNote-${esc(item.slug)}">إعادة مراجعة</button>
                  <button class="button subtle" type="button" data-action="final-patch-decision" data-slug="${esc(item.slug)}" data-decision="exclude" data-note-id="finalPatchNote-${esc(item.slug)}">استبعاد</button>
                </div>
                <textarea id="patchSignoffNote-${esc(item.slug)}" class="field" placeholder="سبب التوقيع أو الإيقاف قبل apply أو المراجعة الأخيرة.">${esc(item.signoff.note || '')}</textarea>
                <div class="verification-decision-actions">
                  <button class="button queue" type="button" data-action="patch-signoff-decision" data-slug="${esc(item.slug)}" data-decision="ready-for-signoff" data-note-id="patchSignoffNote-${esc(item.slug)}">جاهز للتوقيع</button>
                  <button class="button primary" type="button" data-action="patch-signoff-decision" data-slug="${esc(item.slug)}" data-decision="signed-off" data-note-id="patchSignoffNote-${esc(item.slug)}">تم التوقيع</button>
                  <button class="button gold" type="button" data-action="patch-signoff-decision" data-slug="${esc(item.slug)}" data-decision="hold-before-apply" data-note-id="patchSignoffNote-${esc(item.slug)}">تعليق قبل التطبيق</button>
                  <button class="button subtle" type="button" data-action="patch-signoff-decision" data-slug="${esc(item.slug)}" data-decision="needs-final-rereview" data-note-id="patchSignoffNote-${esc(item.slug)}">مراجعة أخيرة</button>
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
          <div class="section-kicker">جاهزية التعديل</div>
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
          <div class="section-kicker">المخرجات الجاهزة</div>
          <h3>ما يمكن تسليمه الآن</h3>
          <div class="triage-list">
            <div class="triage-list-item"><strong>مرشحة للتعديل</strong><span>${resolution.patchReadyCount} سجل</span></div>
            <div class="triage-list-item"><strong>جاهزة تحريريًا</strong><span>${editorialDraftEntries().filter(item => ['review-ready', 'export-ready'].includes(item.readiness)).length} سجل</span></div>
            <div class="triage-list-item"><strong>مخرجات التحقق</strong><span>${verificationDraftEntries().length} مخرج</span></div>
            <div class="triage-list-item"><strong>تحتاج متابعة</strong><span>${resolution.followup.length} سجل ضمن العينة الأوضح</span></div>
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
                <span>المسار: مراجعة → تحقق → قرار → مهمة → جلسة → جاهزية → حزمة</span>
                <span>التالي: ${esc(pack.nextStep)}</span>
              </div>
              <div class="verification-decision-actions">
                <button class="button subtle" type="button" data-action="release-pack-export" data-pack-id="${esc(pack.id)}" data-format="json">JSON</button>
                <button class="button subtle" type="button" data-action="release-pack-export" data-pack-id="${esc(pack.id)}" data-format="csv">CSV</button>
                <button class="button subtle" type="button" data-action="release-pack-export" data-pack-id="${esc(pack.id)}" data-format="summary">ملخص</button>
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


export function renderBulkBatchPicker(activeKey = 'needs-review') {
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


export function renderBulkWorkspace(queueKey = 'needs-review') {
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


export function renderReviewOperationsHub() {
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
        <a href="#/bulk/needs-review?priority=urgent&sort=default" class="button primary">فتح جلسة مراجعة</a>
        <a href="#/review" class="button">قائمة المتابعة</a>
      </div>
    </div>
    <div class="ops-hub section">
      <div class="ops-hub-kpis">
        <div class="card mini-panel emphasis-panel"><div class="metric">${openSessions.length}</div><div class="metric-sub">جلسات مفتوحة</div></div>
        <div class="card mini-panel"><div class="metric">${completedSessions.length}</div><div class="metric-sub">جلسات مكتملة/مصدرة</div></div>
        <div class="card mini-panel"><div class="metric">${followupCounts.deep + followupCounts.deferred}</div><div class="metric-sub">تحتاج عودة</div></div>
        <div class="card mini-panel"><div class="metric">${followupCounts.source + followupCounts.district + followupCounts.completion}</div><div class="metric-sub">عمل متابعة مباشر</div></div>
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
            <a href="#/bulk/missing-source?priority=easy&sort=default" class="home-link-card"><strong>دفعة المصدر</strong><span>سجلات تنقصها مصادر موثقة.</span></a>
            <a href="#/bulk/missing-district?priority=easy&sort=default" class="home-link-card"><strong>دفعة الحي</strong><span>سجلات تحتاج حسم الحي.</span></a>
            <a href="#/bulk/quick-complete?priority=one-step&sort=default" class="home-link-card"><strong>إكمال سريع</strong><span>الأقرب للحسم بخطوة واحدة.</span></a>
          </div>
        </div>
      </div>
    </div>
  `;
}


export function renderEditSection(title, kicker, note, fields, options = {}) {
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


export function renderEditForm(e) {
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


export function renderEntityPage(slug) {
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

  // Build sector back-link and prev/next navigation
  const entitySector = e.sector || 'cafes';
  const entitySectorTitle = sectorLabelByKey(entitySector);
  const sectorSiblings = state.records.filter(r => r.sector === entitySector);
  const currentIndex = sectorSiblings.findIndex(r => r.slug === e.slug);
  const prevEntity = currentIndex > 0 ? sectorSiblings[currentIndex - 1] : null;
  const nextEntity = currentIndex < sectorSiblings.length - 1 ? sectorSiblings[currentIndex + 1] : null;

  return `
    <div class="hero page-hero entity-hero">
      <a href="#/sector/${esc(entitySector)}" class="entity-sector-back">← ${esc(entitySectorTitle)}</a>
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
    ${!queueContext && (prevEntity || nextEntity) ? `
      <div class="entity-sector-nav section">
        ${prevEntity ? `<a class="entity-nav-link entity-nav-prev" href="#/entities/${esc(prevEntity.slug)}">← ${esc(prevEntity.name)}</a>` : '<span></span>'}
        <span class="entity-nav-pos">${currentIndex + 1} / ${sectorSiblings.length}</span>
        ${nextEntity ? `<a class="entity-nav-link entity-nav-next" href="#/entities/${esc(nextEntity.slug)}">${esc(nextEntity.name)} →</a>` : '<span></span>'}
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


export function renderStatusPage() {
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


export function renderDistrictsPage(selectedDistrict = '') {
  const otherNames = uniq(state.records.map(r => (r.district || '').trim()).filter(d => d && d !== 'غير متحقق' && !CANONICAL_DISTRICTS.includes(d))).sort((a,b)=>a.localeCompare(b,'ar'));
  const allDistricts = [...CANONICAL_DISTRICTS, ...otherNames];

  // ── صفحة حي مفرد ──
  if (selectedDistrict) {
    const items = filterRecords(state.records.filter(r => r.district === selectedDistrict));
    const topPicks = topRatedRecords(filteredItems, 3);
    const sectorCounts = {};
    items.forEach(r => { const s = r.sector || 'other'; sectorCounts[s] = (sectorCounts[s] || 0) + 1; });
    const sectorEntries = Object.entries(sectorCounts).sort((a,b) => b[1] - a[1]).slice(0, 5);

    return `
      <div class="hero page-hero hero-compact">
        <a href="#/districts" class="entity-sector-back">\u2190 كل الأحياء</a>
        <h3>حي ${esc(selectedDistrict)}</h3>
        <p>الكيانات المسجلة في هذا الحي داخل الدليل.</p>
      </div>
      <div class="grid cards-4 section">
        <div class="card mini-panel"><div class="metric">${items.length}</div><div class="metric-sub">كيان</div></div>
        <div class="card mini-panel"><div class="metric">${avgRating(items)}</div><div class="metric-sub">متوسط التقييم</div></div>
        <div class="card mini-panel"><div class="metric">${items.filter(r=>r.status==='verified').length}</div><div class="metric-sub">معتمد</div></div>
        <div class="card mini-panel"><div class="metric">${Object.keys(sectorCounts).length}</div><div class="metric-sub">قطاع</div></div>
      </div>
      <div class="section grid cards-2">
        <div class="card">
          <div class="section-kicker">الأعلى تقييمًا في ${esc(selectedDistrict)}</div>
          ${topPicks.length ? `<div class="stack-list">${topPicks.map(item => `
            <a href="#/entities/${esc(item.slug)}" class="stack-item">
              <strong>${esc(item.name)}</strong>
              <span>${esc(item.google_rating || '\u2014')} من 5 \u00b7 ${esc(sectorLabelByKey(item.sector || 'cafes'))}</span>
            </a>
          `).join('')}</div>` : '<div class="empty">لا توجد مختارات بعد.</div>'}
        </div>
        <div class="card">
          <div class="section-kicker">القطاعات في هذا الحي</div>
          ${sectorEntries.length ? `<div class="stack-list">${sectorEntries.map(([key, count]) => `
            <a href="#/sector/${esc(key)}" class="stack-item">
              <strong>${esc(sectorLabelByKey(key))}</strong>
              <span>${count} كيان</span>
            </a>
          `).join('')}</div>` : '<div class="empty">لا توجد قطاعات مسجلة.</div>'}
        </div>
      </div>
      <div class="section">${renderResultsSection(items, {
        title: 'كيانات حي ' + esc(selectedDistrict),
        note: '',
        emptyTitle: 'لا توجد كيانات في هذا الحي',
        emptyNote: 'قد تتم إضافة كيانات جديدة لاحقًا.',
      })}</div>
    `;
  }

  // ── فهرس الأحياء ──
  const districtData = allDistricts.map(name => {
    const items = state.records.filter(r => r.district === name);
    return { name, count: items.length, avg: avgRating(items) };
  }).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
  const totalDistricts = districtData.length;
  const totalEntities = districtData.reduce((s, d) => s + d.count, 0);

  return `
    <div class="hero page-hero hero-compact">
      <h3>تصفح بالأحياء</h3>
      <p>اختر حيًا لعرض الكيانات المسجلة فيه. الأحياء مرتبة حسب عدد الكيانات.</p>
    </div>
    <div class="grid cards-3 section">
      <div class="card mini-panel"><div class="metric">${totalDistricts}</div><div class="metric-sub">حي مسجّل</div></div>
      <div class="card mini-panel"><div class="metric">${totalEntities}</div><div class="metric-sub">كيان مغطى</div></div>
      <div class="card mini-panel"><div class="metric">${avgRating(state.records)}</div><div class="metric-sub">متوسط التقييم العام</div></div>
    </div>
    <div class="section districts-grid">
      ${districtData.map(d => `
        <a href="${districtHref(d.name)}" class="district-card">
          <strong>${esc(d.name)}</strong>
          <span>${d.count} كيان \u00b7 ${d.avg} تقييم</span>
        </a>
      `).join('')}
    </div>
  `;
}


export function renderFiltersPage() {
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


export function renderDiscoveryPage() {
  const items = filterRecords(state.records.filter(r => ['discovered','profiled'].includes(r.status)));
  return `${renderFilterBar()}<div class="card"><h3>الاكتشاف</h3><p class="note">سجلات أولية ما زالت في مرحلة الجمع أو الإعداد.</p></div><div class="section">${renderResultsSection(items, {
    title: 'السجلات الأولية',
    note: 'هذه السجلات ما زالت في بداية رحلتها داخل الدليل.',
    emptyTitle: 'لا توجد سجلات أولية حاليًا',
    emptyNote: 'قد تظهر هنا سجلات جديدة مع توسع الدليل.',
  })}</div>`;
}


export function renderReviewPage() {
  const items = filterRecords(state.records.filter(r => ['needs_review','branch_conflict','partially_verified'].includes(r.status)));
  return `${renderFilterBar()}<div class="grid cards-2"><div class="card"><h3>يحتاج مراجعة</h3><div class="metric">${state.records.filter(r=>r.status==='needs_review').length}</div></div><div class="card"><h3>تعارض فروع</h3><div class="metric">${state.records.filter(r=>r.status==='branch_conflict').length}</div></div></div><div class="section">${renderResultsSection(items, {
    title: 'السجلات التي تحتاج متابعة',
    note: 'هذه النتائج تحتاج مراجعة أو توحيد قبل أن تصبح أكثر استقرارًا.',
    emptyTitle: 'لا توجد سجلات تحتاج متابعة',
    emptyNote: 'الوضع الحالي يبدو مستقرًا في هذه الصفحة.',
  })}</div>`;
}


export function renderSearch(term) {
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

