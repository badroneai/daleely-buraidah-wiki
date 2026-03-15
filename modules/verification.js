// ─── modules/verification.js ───
// Verification state machine — source, district, confidence dimensions,
// verification queues, evidence lab, sessions, and decision tracking.

import { state } from './state.js';
import { uniq, isCanonicalDistrict } from './utils.js';
import {
  getStoredList, saveStoredList, upsertStoredItem,
  evidenceLabStorageKey, verificationSessionStorageKey, verificationDecisionStorageKey,
  getEntity,
} from './storage.js';

/* ══════════════════════════════════════════════════════════════
   Verification state functions (three dimensions)
   ══════════════════════════════════════════════════════════════ */

export function sourceVerificationState(record) {
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

export function districtVerificationState(record) {
  const district = String(record.district || '').trim();
  const address = String(record.short_address || '').trim();
  const canonical = isCanonicalDistrict(district);
  // حي رسمي معتمد مع عنوان داعم = موثق بالكامل
  if (canonical && address) {
    return { key: 'verified', label: 'موثق', reason: 'الحي من القائمة الرسمية المعتمدة مع عنوان داعم.', next: 'لا يحتاج تدخلاً فوريًا' };
  }
  // حي رسمي بدون عنوان = موثق لكن يحتاج عنوان
  if (canonical && !address) {
    return { key: 'verified', label: 'موثق', reason: 'الحي من القائمة الرسمية المعتمدة لكن العنوان ناقص.', next: 'إضافة عنوان تفصيلي' };
  }
  // لا يوجد حي أو "غير متحقق"
  if (!district || district === 'غير متحقق') {
    if (address && /طريق|شارع|بريدة/.test(address)) {
      return { key: 'needs-review', label: 'يحتاج مراجعة', reason: 'يوجد عنوان جزئي يمكن أن يقود لتحديد الحي.', next: 'تأكيد الحي من العنوان أو المرجع' };
    }
    return { key: 'unresolved', label: 'غير محسوم', reason: 'لا يوجد حي واضح ولا عنوان كافٍ للحسم.', next: 'جمع دليل مكاني إضافي' };
  }
  if (/غير متحقق|قرب|جهة|مجاور|placeholder/i.test(`${district} ${address}`)) {
    return { key: 'weak', label: 'إشاري/ضعيف', reason: 'الحي أو العنوان الحاليان أقرب لوصف إرشادي من توثيق مكاني.', next: 'استبدالهما ببيان حي أدق' };
  }
  // حي غير رسمي (طريق/اتجاه) = يحتاج مراجعة
  return { key: 'needs-review', label: 'يحتاج مراجعة', reason: 'الحي غير موجود في القائمة الرسمية المعتمدة — قد يكون طريقًا أو وصفًا إرشاديًا.', next: 'تحديد الحي الرسمي من القائمة المعتمدة' };
}

export function confidenceVerificationState(record) {
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

/* ══════════════════════════════════════════════════════════════
   Verification queues (based on state dimensions)
   ══════════════════════════════════════════════════════════════ */

export function verificationQueues() {
  return {
    'source-review': {
      title: 'مراجعة المصدر',
      note: 'السجلات التي لا يُعتمد مصدرها بشكل كافٍ.',
      records: () => state.records.filter(r => ['review', 'weak', 'missing', 'conflicting'].includes(sourceVerificationState(r).key)),
      reason: r => sourceVerificationState(r).reason,
    },
    'district-review': {
      title: 'مراجعة الحي',
      note: 'السجلات التي لم يُحسم فيها الموقع الجغرافي.',
      records: () => state.records.filter(r => ['needs-review', 'weak', 'unresolved'].includes(districtVerificationState(r).key)),
      reason: r => districtVerificationState(r).reason,
    },
    'confidence-review': {
      title: 'مراجعة الثقة',
      note: 'السجلات ذات مستوى ثقة يحتاج تصعيدًا أو تثبيتًا.',
      records: () => state.records.filter(r => ['escalate', 'blocked', 'review'].includes(confidenceVerificationState(r).key)),
      reason: r => confidenceVerificationState(r).reason,
    },
    'conflicting-evidence': {
      title: 'تعارض أدلة',
      note: 'السجلات التي يظهر فيها تضارب مصدري واضح.',
      records: () => state.records.filter(r => sourceVerificationState(r).key === 'conflicting'),
      reason: () => 'يوجد تعارض مصدري يحتاج حسمًا.',
    },
    'unresolved-verification': {
      title: 'تحقق معلق',
      note: 'السجلات التي لم يُغلق فيها بُعد تحقق واحد على الأقل.',
      records: () => state.records.filter(r => {
        const s = sourceVerificationState(r);
        const d = districtVerificationState(r);
        const c = confidenceVerificationState(r);
        return [s.key, d.key, c.key].some(k => ['missing', 'unresolved', 'blocked', 'escalate'].includes(k));
      }),
      reason: () => 'يوجد بُعد تحقق واحد على الأقل لم يُحسم بعد.',
    },
  };
}

/* ══════════════════════════════════════════════════════════════
   Evidence lab
   ══════════════════════════════════════════════════════════════ */

export function evidenceEntries() { return getStoredList(evidenceLabStorageKey()); }

export function evidenceForSlug(slug = '') {
  return evidenceEntries()
    .filter(item => item.slug === slug)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function evidenceCategoryLabel(category = '') {
  return ({ source: 'المصدر', district: 'الحي', confidence: 'الثقة', followup: 'المتابعة', general: 'عام' }[category] || 'عام');
}

export function evidenceOutcomeLabel(outcome = '') {
  return ({
    confirmed: 'تم التأكيد', blocked: 'معلق', failed: 'فشل',
    pending: 'بانتظار متابعة', needs_source: 'يحتاج مصدر',
    needs_district: 'يحتاج حسم حي', ready_later: 'جاهز لاحقًا',
  }[outcome] || 'غير محدد');
}

export function addEvidenceEntry(entry = {}) {
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

/* ══════════════════════════════════════════════════════════════
   Verification sessions
   ══════════════════════════════════════════════════════════════ */

export function verificationSessions() { return getStoredList(verificationSessionStorageKey()); }
export function saveVerificationSessions(items = []) { saveStoredList(verificationSessionStorageKey(), items); }

export function verificationDecisionEntries() {
  return getStoredList(verificationDecisionStorageKey())
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

export function saveVerificationDecisionEntries(items = []) {
  saveStoredList(verificationDecisionStorageKey(), items);
}

/* ── Session / decision label helpers ── */

export function verificationSessionStatusLabel(status = '') {
  return ({
    new: 'جديدة', review: 'قيد التحقق', escalated: 'مصعدة',
    handoff: 'بانتظار تسليم', closure: 'قريبة من الإغلاق', closed: 'مغلقة',
  }[status] || 'قيد العمل');
}

export function verificationSessionStatusTone(status = '') {
  return ({
    new: 'muted', review: 'queue', escalated: 'warning',
    handoff: 'gold', closure: 'success', closed: 'success',
  }[status] || 'muted');
}

export function verificationDecisionLabel(decision = '') {
  return ({
    assign: 'إسناد', review: 'مراجعة', verify: 'تم التحقق',
    escalate: 'تصعيد', handoff: 'تسليم', close: 'إغلاق مؤقت',
  }[decision] || 'قيد القرار');
}

export function verificationDecisionTone(decision = '') {
  return ({
    assign: 'muted', review: 'queue', verify: 'success',
    escalate: 'warning', handoff: 'gold', close: 'muted',
  }[decision] || 'muted');
}

export function verificationResolutionLabel(resolution = '') {
  return ({
    unresolved: 'غير محسوم', needs_deeper_review: 'يحتاج مراجعة أعمق',
    ready_for_followup: 'جاهز للمتابعة', ready_for_editorial_action: 'جاهز للتحرير',
    closed_for_now: 'مغلق الآن',
  }[resolution] || 'قيد العمل');
}

export function verificationResolutionTone(resolution = '') {
  return ({
    unresolved: 'muted', needs_deeper_review: 'warning',
    ready_for_followup: 'gold', ready_for_editorial_action: 'success',
    closed_for_now: 'muted',
  }[resolution] || 'muted');
}

/* ── Verification action meta ── */

export function verificationActionMeta(action = 'review', record = null) {
  const source = sourceVerificationState(record || {});
  const district = districtVerificationState(record || {});
  const confidence = confidenceVerificationState(record || {});
  const blockers = [
    source.key !== 'verified' ? `المصدر: ${source.label}` : '',
    district.key !== 'verified' ? `الحي: ${district.label}` : '',
    !['stable'].includes(confidence.key) ? `الثقة: ${confidence.label}` : '',
  ].filter(Boolean);
  const defaults = {
    assign: { resolution: 'unresolved', nextAction: 'بدء مراجعة الدليل الحالي وتحديد أول محاولة تحقق.', sessionStatus: 'review' },
    review: { resolution: 'unresolved', nextAction: 'تسجيل نتيجة المراجعة التالية أو إضافة دليل جديد.', sessionStatus: 'review' },
    verify: { resolution: 'ready_for_editorial_action', nextAction: 'تسليم السجل للتحرير أو الإغلاق بعد تثبيت الحقول.', sessionStatus: 'closure' },
    escalate: { resolution: 'needs_deeper_review', nextAction: 'تصعيد السجل إلى مراجعة أعمق أو فحص يدوي.', sessionStatus: 'escalated' },
    handoff: { resolution: 'ready_for_followup', nextAction: 'إحالته إلى المتابعة أو التحرير حسب نوع النقص.', sessionStatus: 'handoff' },
    close: { resolution: 'closed_for_now', nextAction: 'إغلاق السجل مؤقتًا حتى وصول إشارة جديدة.', sessionStatus: 'closed' },
  };
  const meta = defaults[action] || defaults.review;
  return {
    ...meta,
    blockers,
    settledBy: action === 'verify' ? [`المصدر: ${source.label}`, `الحي: ${district.label}`, `الثقة: ${confidence.label}`].join(' • ') : '',
    confidence: confidence.label,
  };
}

/* ── Session management ── */

export function verificationSessionId(scopeType = 'queue', scopeKey = 'source-review') {
  return `verification-session:${scopeType}:${scopeKey}`;
}

export function decisionsForVerificationSession(sessionId = '') {
  return verificationDecisionEntries().filter(item => item.sessionId === sessionId);
}

export function verificationSessionSummary(session = {}) {
  const decisions = decisionsForVerificationSession(session.id || '');
  const latestBySlug = new Map();
  decisions.forEach(item => {
    if (!latestBySlug.has(item.slug)) latestBySlug.set(item.slug, item);
  });
  const items = Array.from(latestBySlug.values());
  const total = Math.max((session.recordSlugs || []).length, items.length, 0);
  const done = items.filter(item => ['verify', 'handoff', 'close', 'escalate'].includes(item.decision)).length;
  return {
    total, touched: items.length, done,
    unresolved: items.filter(item => item.resolution === 'unresolved').length,
    deeper: items.filter(item => item.resolution === 'needs_deeper_review').length,
    followup: items.filter(item => item.resolution === 'ready_for_followup').length,
    editorial: items.filter(item => item.resolution === 'ready_for_editorial_action').length,
    closed: items.filter(item => item.resolution === 'closed_for_now').length,
    decisions: items,
    progressLabel: total ? `${items.length}/${total}` : '0/0',
  };
}

export function startOrOpenVerificationSession({
  scopeType = 'queue', scopeKey = 'source-review', title = '',
  queueKey = '', recordSlugs = [], persist = true,
} = {}) {
  const list = verificationSessions();
  const id = verificationSessionId(scopeType, scopeKey);
  const index = list.findIndex(item => item.id === id);
  const session = {
    id, type: scopeType, scopeKey,
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

export function latestVerificationDecisionForSlug(slug = '') {
  return verificationDecisionEntries().find(item => item.slug === slug) || null;
}

export function verificationSessionForSlug(slug = '') {
  return verificationSessions().find(session => (session.recordSlugs || []).includes(slug) && session.status !== 'closed') || null;
}

export function registerVerificationDecision({
  scopeType = 'queue', scopeKey = 'source-review', slug = '',
  decision = 'review', note = '', queueKey = '',
} = {}) {
  const record = getEntity(slug);
  if (!record) return null;
  const session = startOrOpenVerificationSession({
    scopeType, scopeKey, queueKey,
    title: scopeType === 'queue' ? (verificationQueues()[scopeKey]?.title || 'جلسة تحقق') : record.name,
    recordSlugs: scopeType === 'queue' ? (verificationQueues()[scopeKey]?.records().map(item => item.slug) || []) : [slug],
  });
  const meta = verificationActionMeta(decision, record);
  const entry = {
    id: `verification-decision:${session.id}:${slug}`,
    sessionId: session.id, sessionTitle: session.title, sessionType: session.type,
    scopeKey: session.scopeKey, queueKey: session.queueKey,
    slug, name: record.name, decision,
    decisionLabel: verificationDecisionLabel(decision),
    reason: String(note || '').trim() || (verificationQueues()[queueKey || scopeKey]?.reason(record) || meta.blockers.join(' • ') || 'قرار تحققي جديد.'),
    note: String(note || '').trim(),
    resolution: meta.resolution, nextAction: meta.nextAction,
    settledBy: meta.settledBy, blockedBy: meta.blockers.join(' • '),
    confidence: meta.confidence,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  upsertStoredItem(verificationDecisionStorageKey(), entry, 'id');

  const sessions = verificationSessions();
  const sessionIndex = sessions.findIndex(item => item.id === session.id);
  const refreshed = {
    ...session, status: meta.sessionStatus,
    updatedAt: new Date().toISOString(),
    completedAt: decision === 'close' ? new Date().toISOString() : '',
  };
  if (sessionIndex >= 0) sessions[sessionIndex] = refreshed;
  else sessions.unshift(refreshed);
  saveVerificationSessions(sessions);
  return entry;
}

/* ── Verification control snapshot ── */

export function verificationControlSnapshot() {
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
