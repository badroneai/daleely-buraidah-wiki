// ─── modules/missions.js ───
// Mission registry, templates, plans, sessions, and execution tracking.

import { state } from './state.js';
import { uniq } from './utils.js';
import { displayText } from './display.js';
import {
  getEntity, upsertStoredItem, getStoredList,
  missionEntries, missionSessions, missionRegistryStorageKey, missionSessionStorageKey,
} from './storage.js';
import {
  sourceVerificationState, districtVerificationState, confidenceVerificationState,
  verificationDecisionEntries, evidenceForSlug,
} from './verification.js';
import { sectorLabelByKey } from './analytics.js';
import { verificationFollowupBuckets, coverageExpansionPlanner } from './patches.js';
import { downloadText, downloadJson } from './ui-helpers.js';

export function missionPriorityLabel(priority = '') {
  return ({
    urgent: 'عالية جدًا',
    high: 'عالية',
    medium: 'متوسطة',
    low: 'منخفضة',
  }[priority] || 'متوسطة');
}


export function missionPriorityTone(priority = '') {
  return ({
    urgent: 'warning',
    high: 'gold',
    medium: 'queue',
    low: 'muted',
  }[priority] || 'muted');
}


export function missionTypeLabel(type = '') {
  return ({
    source_collection: 'جمع مصادر',
    verification: 'مهمة تحقق',
    coverage: 'توسع تغطية',
    record_followup: 'متابعة سجل',
  }[type] || 'مهمة تشغيلية');
}


export function missionStatusRecommendation(mission = {}, progress = {}) {
  if (progress.resolved && progress.total && progress.resolved >= progress.total) return 'ready_to_close';
  if (progress.blocked >= Math.max(1, Math.ceil(progress.total / 3))) return 'blocked';
  if (progress.handoff > 0 || progress.editorial > 0) return 'handoff';
  if (progress.touched > 0) return 'in_progress';
  return mission.status || 'open';
}


export function missionProgressSummary(recordSlugs = []) {
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


export function missionRecordSummary(recordSlugs = [], limit = 5) {
  return recordSlugs
    .map(slug => getEntity(slug))
    .filter(Boolean)
    .slice(0, limit)
    .map(record => record.name);
}


export function missionScopeTitle(scopeKind = '', scopeKey = '') {
  if (scopeKind === 'district') return scopeKey;
  if (scopeKind === 'sector') return sectorLabelByKey(scopeKey);
  if (scopeKind === 'record') return getEntity(scopeKey)?.name || scopeKey;
  return scopeKey;
}


export function derivedMissionTemplates() {
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


export function missionPlan() {
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


export function missionOutputSummary(mission = {}) {
  const progress = mission.progress || missionProgressSummary(mission.recordSlugs || []);
  return `${progress.touched}/${progress.total} بدأت • ${progress.resolved} قريبة من الإغلاق • ${progress.blocked} متوقفة`;
}


export function updateMissionState({
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


export function suggestedRecordMissions(record = null) {
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


export function seedMissionFromSuggestion(suggestion = {}) {
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


export function missionSessionId(missionId = '') {
  return `mission-session:${missionId}`;
}


export function missionSessionForMission(missionId = '') {
  return missionSessions().find(item => item.missionId === missionId) || null;
}


export function deriveMissionSessionStatus(session = {}) {
  const attempts = session.attempts || [];
  if (session.status === 'completed') return 'completed';
  if (attempts.some(item => item.outcome === 'followup')) return 'handoff';
  if (attempts.some(item => item.outcome === 'blocked')) return 'blocked';
  if (attempts.length) return 'active';
  return session.status || 'open';
}


export function missionSessionSummary(session = {}) {
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


export function startOrOpenMissionSession(missionId = '') {
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


export function defaultAttemptTypeForMission(mission = {}) {
  if (mission.type === 'source_collection') return 'جمع مصدر';
  if (mission.type === 'coverage') return 'توسع تغطية';
  if (mission.scopeKey === 'district-review') return 'تحقق حي';
  if (mission.scopeKey === 'conflicting-evidence') return 'حسم تعارض';
  return 'تحقق';
}


export function addMissionAttempt({
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


export function setMissionSessionStatus(missionId = '', status = 'active') {
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


export function exportableMissionSessionPayload(missionId = '') {
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


export function exportableMissionSessionCsv(missionId = '') {
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


export function exportableMissionSessionSummary(missionId = '') {
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


export function exportMissionSession(missionId = '', format = 'json') {
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


export function missionExecutionSnapshot() {
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

