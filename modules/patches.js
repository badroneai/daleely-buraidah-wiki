// ─── modules/patches.js ───
// Patch readiness, release packs, final review, signoff, and export pipelines.

import { state } from './state.js';
import { uniq } from './utils.js';
import { displayText } from './display.js';
import {
  getEntity, getDraft, getStoredList, upsertStoredItem,
  editorialReadiness, editorialDraftEntries, patchConsoleEntries,
  agentDraftEntries, verificationDraftEntries, missionSessions,
} from './storage.js';
import {
  sourceVerificationState, districtVerificationState, confidenceVerificationState,
  latestVerificationDecisionForSlug, verificationDecisionEntries, evidenceForSlug,
} from './verification.js';
import { attentionQueues } from './queues.js';
import { sectorLabelByKey, importantMissingFields, sectorTree } from './analytics.js';
import { missionPlan, missionExecutionSnapshot } from './missions.js';
import { diffRecord, downloadText, downloadJson } from './ui-helpers.js';
import { agentAllowedFieldLabel } from './agents.js';

export function releasePackStorageKey() {
  return 'daleelyReleasePacks';
}


export function finalPatchReviewStorageKey() {
  return 'daleelyFinalPatchReviews';
}


export function patchSignoffStorageKey() {
  return 'daleelyPatchSignoffReviews';
}


export function readinessLabel(key = '') {
  return ({
    'not-ready': 'غير جاهز',
    'needs-follow-up': 'يحتاج متابعة',
    'review-ready': 'جاهز للمراجعة',
    'export-ready': 'جاهز للتصدير',
    'publish-ready': 'جاهز للنشر',
    hold: 'معلّق',
  }[key] || 'غير مصنف');
}


export function readinessTone(key = '') {
  return ({
    'not-ready': 'warning',
    'needs-follow-up': 'gold',
    'review-ready': 'queue',
    'export-ready': 'success',
    'publish-ready': 'success',
    hold: 'muted',
  }[key] || 'muted');
}


export function patchReadinessLabel(key = '') {
  return ({
    'not-ready': 'غير جاهز كـ patch',
    'follow-up-needed': 'يحتاج متابعة قبل patch',
    'review-ready': 'جاهز لمراجعة أخيرة',
    'patch-ready': 'جاهز كمرشح patch',
    hold: 'يُستبعد الآن',
  }[key] || 'غير مصنف');
}


export function patchReadinessTone(key = '') {
  return ({
    'not-ready': 'warning',
    'follow-up-needed': 'gold',
    'review-ready': 'queue',
    'patch-ready': 'success',
    hold: 'muted',
  }[key] || 'muted');
}


export function finalPatchDecisionLabel(key = '') {
  return ({
    approve: 'موافق عليه',
    hold: 'معلّق',
    exclude: 'مستبعد',
    rereview: 'يحتاج مراجعة جديدة',
  }[key] || 'لم يُحسم');
}


export function finalPatchDecisionTone(key = '') {
  return ({
    approve: 'success',
    hold: 'gold',
    exclude: 'muted',
    rereview: 'queue',
  }[key] || 'warning');
}


export function patchSignoffLabel(key = '') {
  return ({
    'ready-for-signoff': 'جاهز للتوقيع',
    'signed-off': 'موقّع عليه',
    'hold-before-apply': 'موقوف قبل apply',
    'needs-final-rereview': 'يحتاج مراجعة أخيرة',
  }[key] || 'لم يُحسم');
}


export function patchSignoffTone(key = '') {
  return ({
    'ready-for-signoff': 'queue',
    'signed-off': 'success',
    'hold-before-apply': 'gold',
    'needs-final-rereview': 'warning',
  }[key] || 'muted');
}


export function patchFieldLabel(key = '') {
  return ({
    short_address: 'العنوان المختصر',
    hours_summary: 'ساعات العمل',
    phone: 'الهاتف',
    official_instagram: 'إنستغرام',
    editorial_summary: 'النبذة التحريرية',
  }[key] || key || 'حقل');
}


export function recordReadiness(record = null) {
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


export function recordPatchReadiness(record = null) {
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


export function readinessSnapshot() {
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


export function resolutionImpactSnapshot() {
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


export function finalPatchReviewEntries() {
  return getStoredList(finalPatchReviewStorageKey())
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}


export function finalPatchReviewBySlug(slug = '') {
  return finalPatchReviewEntries().find(item => item.slug === slug) || null;
}


export function recordPatchChangeSet(record = null) {
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


export function finalPatchReviewSnapshot() {
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


export function patchSignoffEntries() {
  return getStoredList(patchSignoffStorageKey())
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
}


export function patchSignoffForSlug(slug = '') {
  return patchSignoffEntries().find(item => item.slug === slug) || null;
}


export function derivePatchSignoff(item = null) {
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


export function patchApplySimulationSnapshot() {
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


export function saveFinalPatchDecision({ slug = '', decision = 'rereview', reason = '', note = '' } = {}) {
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


export function savePatchSignoffDecision({ slug = '', decision = 'ready-for-signoff', reason = '', note = '' } = {}) {
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


export function releasePackEntries() {
  return getStoredList(releasePackStorageKey());
}


export function releasePackStatusLabel(status = '') {
  return ({
    draft: 'مسودة حزمة',
    review: 'بانتظار اعتماد',
    exportable: 'قابلة للتسليم',
    candidate: 'مرشحة للنشر',
    hold: 'مؤجلة',
  }[status] || 'مسودة حزمة');
}


export function releasePackStatusTone(status = '') {
  return ({
    draft: 'muted',
    review: 'queue',
    exportable: 'success',
    candidate: 'success',
    hold: 'warning',
  }[status] || 'muted');
}


export function derivedReleasePacks() {
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


export function releasePackPlan() {
  const storedById = new Map(releasePackEntries().map(item => [item.id, item]));
  return derivedReleasePacks().map(pack => ({ ...pack, ...(storedById.get(pack.id) || {}), updatedAt: storedById.get(pack.id)?.updatedAt || new Date().toISOString() }));
}


export function exportableReleasePackPayload(packId = '') {
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


export function exportReleasePack(packId = '', format = 'json') {
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


export function exportableFinalPatchBundle() {
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


export function exportableFinalPatchBundleCsv() {
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


export function exportableFinalPatchBundleSummary() {
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


export function exportFinalPatchBundle(format = 'json') {
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


export function exportablePatchApplySimulation() {
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


export function exportablePatchSignoffReport() {
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


export function exportableFinalApprovedPatchBundle() {
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


export function exportablePatchBlockedReport() {
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


export function exportPatchSignoffOutput(kind = 'simulation', format = 'json') {
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


export function verificationFollowupBuckets() {
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


export function coverageExpansionPlanner() {
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

