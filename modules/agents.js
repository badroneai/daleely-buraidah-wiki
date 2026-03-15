// ─── modules/agents.js ───
// Agent system: proposals, runtime, batch operations, draft management.

import { state } from './state.js';
import { STATUS_AR } from './constants.js';
import { uniq } from './utils.js';
import { displayConfidence, displayText } from './display.js';
import {
  getEntity, getDraft, saveDraft, upsertStoredItem,
  agentDraftStorageKey, agentDraftEntries, agentRunHistoryEntries,
  savedAgentBatchEntries, savedAgentBatchStorageKey, agentRunHistoryStorageKey,
  verificationDraftStorageKey, verificationDraftEntries,
  missionSessions,
} from './storage.js';
import {
  sourceVerificationState, districtVerificationState, confidenceVerificationState,
  latestVerificationDecisionForSlug, evidenceForSlug, verificationQueues,
} from './verification.js';
import { attentionQueues, queueViewState, queueTitleByKey } from './queues.js';
import { importantMissingFields, sectorLabelByKey } from './analytics.js';
import { normalizeSpaces } from './ui-helpers.js';
import { missionPlan } from './missions.js';
import { recordReadiness, readinessLabel } from './patches.js';

export function agentProposalStatusLabel(status = '') {
  return ({
    new: 'جديد',
    in_review: 'قيد المراجعة',
    accepted: 'مقبول',
    rejected: 'مرفوض',
    deferred: 'مؤجل',
  }[status] || 'جديد');
}


export function agentProposalStatusTone(status = '') {
  return ({
    new: 'queue',
    in_review: 'gold',
    accepted: 'success',
    rejected: 'warning',
    deferred: 'muted',
  }[status] || 'queue');
}


export function agentConfidenceLabel(value = '') {
  return ({
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
  }[value] || 'متوسطة');
}


export function agentAllowedFieldLabel(field = '') {
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


export function agentProposalTypeLabel(type = '') {
  return ({
    completion: 'استكمال السجل',
    verification: 'دعم التحقق',
  }[type] || 'اقتراح مساعد');
}


export function agentProposalHandoffLabel(target = '') {
  return ({
    editorial_draft: 'draft التحرير',
    verification_draft: 'draft التحقق',
  }[target] || 'draft محلية');
}


export function agentRunStatusLabel(status = '') {
  return ({
    queued: 'قيد الإعداد',
    running: 'قيد التشغيل',
    completed: 'اكتمل',
    completed_with_issues: 'اكتمل مع ملاحظات',
    failed: 'فشل',
  }[status] || 'قيد التشغيل');
}


export function agentRunStatusTone(status = '') {
  return ({
    queued: 'muted',
    running: 'gold',
    completed: 'success',
    completed_with_issues: 'warning',
    failed: 'warning',
  }[status] || 'muted');
}


export function agentScopeKindLabel(kind = '') {
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


export function queueAgentRecommendation(queueKey = '') {
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


export function scopeAgentRecommendation(scope = {}) {
  if (scope.kind === 'queue') return queueAgentRecommendation(scope.key);
  if (scope.kind === 'verification_queue') return 'verification';
  if (scope.kind === 'readiness') return ['not-ready', 'review-ready'].includes(scope.key) ? 'completion' : 'verification';
  if (scope.kind === 'status') return ['discovered', 'profiled'].includes(scope.key) ? 'completion' : 'verification';
  if (scope.kind === 'district') return 'completion';
  if (scope.kind === 'sector') return scope.key === 'cafes' ? 'completion' : 'verification';
  return 'completion';
}


export function extractPhoneCandidate(text = '') {
  const match = String(text || '').match(/(?:\+?966|0)?5\d{8}/);
  if (!match) return '';
  const digits = match[0].replace(/[^\d+]/g, '');
  return digits.startsWith('966') ? `+${digits}` : digits;
}


export function extractInstagramCandidate(record = {}) {
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


export function extractHoursCandidate(record = {}) {
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


export function generatedEditorialSummary(record = {}) {
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


export function proposalBasis(record = {}, field = '', suggestion = '') {
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


export function verificationDraftPayload(record = {}, draft = {}) {
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


export function buildRecordCompletionProposals(record = null) {
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


export function buildVerificationSupportProposals(record = null) {
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


export function runRecordCompletionAgentLocal(slug = '') {
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


export async function runRecordCompletionAgent(slug = '') {
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


export function buildVerificationRuntimeContext(slug = '') {
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


export function runVerificationSupportAgentLocal(slug = '') {
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


export async function runVerificationSupportAgent(slug = '') {
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


export function summarizeAgentBatchResults(results = []) {
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


export function runtimeBatchScopeLabel(scope = null, total = 0) {
  if (scope?.label) return `${agentScopeKindLabel(scope.kind)}: ${scope.label}`;
  return `دفعة تشغيل (${total})`;
}


export function buildRuntimeBatchItems(agentKey = 'completion', records = []) {
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


export function normalizeBatchResultItem(item = {}, fallbackRecord = {}) {
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


export async function runAgentBatchLocally(agentKey = 'completion', records = [], scope = null) {
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


export async function runAgentBatchRuntime(agentKey = 'completion', records = [], scope = null) {
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


export function agentDraftSummary() {
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


export function updateAgentProposalStatus(id = '', status = 'in_review') {
  const current = agentDraftEntries().find(item => item.id === id);
  if (!current) return null;
  const next = { ...current, status, reviewedAt: new Date().toISOString() };
  upsertStoredItem(agentDraftStorageKey(), next, 'id');
  return next;
}


export function acceptAgentProposalToDraft(id = '') {
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


export function agentDefinitions() {
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


export function agentDefinitionByKey(key = 'completion') {
  return agentDefinitions().find(item => item.key === key) || agentDefinitions()[0];
}


export function recordsForSectorScope(sectorKey = 'cafes') {
  return state.records.filter(record => {
    const sector = String(record.sector || '').trim();
    const category = String(record.category || '').trim();
    if (sector && sector === sectorKey) return true;
    if (sectorKey === 'cafes') return /كافيه|قهوة|coffee|cafe/i.test(category);
    return category.includes(sectorLabelByKey(sectorKey));
  });
}


export function recordsForAgentScope(scope = { kind: 'all', key: 'eligible' }) {
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


export function saveAgentBatchTemplate(item = {}) {
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


export function derivedAgentScopes() {
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


export async function runAgentBatch(agentKey = 'completion', recordSlugs = []) {
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


export async function runAgentBatchScoped(agentKey = 'completion', scope = { kind: 'all', key: 'eligible', label: 'كل السجلات المؤهلة' }) {
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


export function agentBatchEndpoint(agentKey = 'completion') {
  return agentKey === 'verification'
    ? './api/agents/verification-support/batch'
    : './api/agents/record-completion/batch';
}

