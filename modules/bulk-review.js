// ─── modules/bulk-review.js ───
// Bulk review sessions, workspace state, and batch decision management.

import { state } from './state.js';
import { getStoredList, saveStoredList, getEntity } from './storage.js';
import { attentionQueues, queueViewState, completionGap, queueTitleByKey } from './queues.js';
import { importantMissingFields } from './analytics.js';

export function reviewSessionStorageKey(queueKey = 'needs-review') {
  return `daleelyBulkReview:${queueKey}`;
}


export function getReviewSession(queueKey = 'needs-review') {
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


export function saveReviewSession(queueKey = 'needs-review', session = {}) {
  localStorage.setItem(reviewSessionStorageKey(queueKey), JSON.stringify(session));
}


export function sessionLifecycleLabel(status = '') {
  return ({
    new: 'جديدة',
    in_progress: 'قيد المراجعة',
    completed: 'اكتملت',
    followup: 'تحتاج متابعة',
    exported: 'تم تصديرها',
  }[status] || 'غير مصنفة');
}


export function sessionLifecycleTone(status = '') {
  return ({
    new: 'muted',
    in_progress: 'queue',
    completed: 'success',
    followup: 'warning',
    exported: 'success',
  }[status] || 'muted');
}


export function bulkBatchKeys() {
  return ['needs-review', 'missing-district', 'missing-source', 'quick-complete', 'new-incomplete'];
}


export function bulkDecisionLabel(decision = '') {
  return ({
    done: 'تمت المعالجة',
    skip: 'تم التخطي',
    defer: 'تم التأجيل',
    deep: 'مراجعة أعمق',
    completion: 'يحتاج إكمالًا',
    followup: 'جاهز للمتابعة لاحقًا',
  }[decision] || 'قيد العمل');
}


export function bulkDecisionTone(decision = '') {
  return ({
    done: 'success',
    skip: 'muted',
    defer: 'warning',
    deep: 'queue',
    completion: 'gold',
    followup: 'muted',
  }[decision] || 'muted');
}


export function bulkExecutionMeta(decision = '', record = null, queueKey = 'needs-review') {
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


export function bulkDecisionEntry(record, queueKey = 'needs-review', decision = 'done', note = '') {
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


export function bulkDecisionValue(session = {}, slug = '') {
  return session.decisions?.[slug] || null;
}


export function bulkSessionFollowup(workspace) {
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


export function bulkSessionSummary(workspace) {
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


export function reviewSessionRegistry() {
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


export function bulkWorkspaceState(queueKey = 'needs-review') {
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

