import { createServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { readFile, writeFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '..');
const PORT = Number(process.env.PORT || 4173);
const ALLOWED_COMPLETION_FIELDS = new Set(['short_address', 'hours_summary', 'phone', 'official_instagram', 'editorial_summary']);
const ALLOWED_VERIFICATION_FIELDS = new Set(['verification_rationale', 'source_candidate', 'conflict_hypothesis', 'confidence_recommendation', 'next_action_draft']);
const AUDIT_FILE = join(ROOT, '.runtime-audit.json');
const RUNTIME_TIMEOUT_MS = Number(process.env.AGENT_RUNTIME_TIMEOUT_MS || 12000);
const RUNTIME_RETRIES = Number(process.env.AGENT_RUNTIME_RETRIES || 1);
const ALLOW_RUNTIME_FALLBACK = process.env.AGENT_RUNTIME_ALLOW_FALLBACK !== 'false';
let auditWriteQueue = Promise.resolve();

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function runtimeMode() {
  return process.env.AGENT_RUNTIME_URL ? 'external-http' : 'mock-proxy';
}

function runtimeHealth() {
  const mode = runtimeMode();
  return {
    ok: true,
    available: true,
    mode,
    label: mode === 'external-http' ? 'Runtime خارجي متصل' : 'Proxy محلي تجريبي',
    note: mode === 'external-http'
      ? 'الواجهة تتحدث مع backend/proxy ثم runtime خارجي، من دون أي API key داخل المتصفح.'
      : 'لا يوجد runtime خارجي مضبوط حاليًا، لذلك يستخدم الـ proxy adapter محلية للاختبار مع الحفاظ على نفس مسار الأمان.',
  };
}

function allowedFieldsForTask(task = 'record-completion') {
  return task === 'verification-support'
    ? ALLOWED_VERIFICATION_FIELDS
    : ALLOWED_COMPLETION_FIELDS;
}

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function text(v = '') {
  return String(v || '').trim();
}

async function readAuditTrail() {
  try {
    const raw = await readFile(AUDIT_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeAuditTrail(entries = []) {
  await writeFile(AUDIT_FILE, JSON.stringify(entries.slice(0, 200), null, 2));
}

async function appendAuditEntry(entry = {}) {
  auditWriteQueue = auditWriteQueue.then(async () => {
    const items = await readAuditTrail();
    items.unshift(entry);
    await writeAuditTrail(items);
    return entry;
  });
  return auditWriteQueue;
}

function auditOutcome(result = {}) {
  return result.ok ? (result.status === 'empty' ? 'rejected' : 'success') : 'failed';
}

async function appendRuntimeAudit({
  id = `runtime-call:${Date.now()}`,
  startedAt = new Date().toISOString(),
  agent = '',
  requestType = '',
  scope = 'unknown',
  result = {},
  extra = {},
} = {}) {
  await appendAuditEntry({
    id,
    startedAt,
    finishedAt: new Date().toISOString(),
    agent,
    requestType,
    scope,
    runtimeMode: runtimeMode(),
    runtimeSource: result.diagnostics?.runtimeSource || runtimeMode(),
    fallbackUsed: Boolean(result.diagnostics?.fallbackUsed),
    validationRejected: Number(result.diagnostics?.validationRejected || 0),
    proposalCount: Array.isArray(result.proposals) ? result.proposals.length : 0,
    outcome: auditOutcome(result),
    error: result.diagnostics?.providerError || result.diagnostics?.requestErrors?.join(' • ') || '',
    ...extra,
  });
}

async function runtimeDiagnostics() {
  const items = await readAuditTrail();
  const lastCall = items[0] || null;
  return {
    recentCalls: items.slice(0, 8),
    counts: {
      total: items.length,
      success: items.filter(item => item.outcome === 'success').length,
      failed: items.filter(item => item.outcome === 'failed').length,
      rejected: items.filter(item => item.outcome === 'rejected').length,
      fallback: items.filter(item => item.fallbackUsed).length,
      validationRejected: items.reduce((acc, item) => acc + (item.validationRejected || 0), 0),
    },
    lastCall,
    lastError: items.find(item => item.error)?.error || '',
  };
}

function extractPhoneCandidate(textValue = '') {
  const match = String(textValue || '').match(/(?:\+?966|0)?5\d{8}/);
  if (!match) return '';
  const digits = match[0].replace(/[^\d+]/g, '');
  return digits.startsWith('966') ? `+${digits}` : digits;
}

function extractInstagramCandidate(record = {}) {
  const sources = [
    text(record.reference_url),
    text(record.source_notes),
    text(record.editorial_summary),
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
    text(record.hours_summary),
    text(record.source_notes),
    text(record.best_visit_time),
  ];
  for (const source of sources) {
    const match = source.match(/(?:يفتح|من|من الساعة)?\s*\d{1,2}(?::\d{2})?\s*(?:ص|م|AM|PM)?\s*(?:-|إلى|حتى)\s*\d{1,2}(?::\d{2})?\s*(?:ص|م|AM|PM)?/i);
    if (match) return match[0].replace(/\s+/g, ' ').trim();
  }
  return '';
}

function generatedEditorialSummary(record = {}) {
  const parts = [
    text(record.category) || 'مكان محلي',
    text(record.place_personality),
    text(record.google_rating) ? `بتقييم ${text(record.google_rating)}` : '',
    text(record.google_reviews_count) ? `ومراجعات ${text(record.google_reviews_count)}` : '',
    text(record.district) ? `في ${text(record.district)}` : '',
  ].filter(Boolean);
  if (!parts.length) return '';
  return `${text(record.name) || 'هذا المكان'} ${parts.join(' ')}.`.replace(/\s+/g, ' ').trim();
}

function proposalBasis(record = {}, field = '', suggestion = '') {
  if (field === 'short_address') return text(record.district) ? `اعتمادًا على الحي الظاهر: ${text(record.district)}` : 'استكمال عرضي للسجل.';
  if (field === 'hours_summary') return 'استُخرجت من ملاحظات المصدر أو وقت الزيارة إن وجد.';
  if (field === 'phone') return 'استُخرج من النصوص الحالية المرتبطة بالسجل.';
  if (field === 'official_instagram') return 'استُخرج من الرابط المرجعي أو من ملاحظات السجل.';
  if (field === 'editorial_summary') return suggestion ? 'صيغت من معلومات السجل الحالية لتكون أوضح عرضًا.' : '';
  if (field === 'verification_rationale') return 'استنادًا إلى حالة المصدر والحي والثقة وسجل الأدلة الحالي.';
  if (field === 'source_candidate') return 'مرشح مصدر مستخرج من روابط ومراجع السجل الحالية.';
  if (field === 'conflict_hypothesis') return 'فرضية أولية لشرح موضع التعارض قبل الحسم اليدوي.';
  if (field === 'confidence_recommendation') return 'توصية تشغيلية توضح ما الذي يرفع الثقة وما الذي يبقيها معلقة.';
  if (field === 'next_action_draft') return 'تلخيص للخطوة التشغيلية التالية بناءً على القرار والأدلة والمهام المرتبطة.';
  return '';
}

function sourceVerificationState(record = {}) {
  if (!text(record.reference_url)) return { key: 'missing', reason: 'لا يوجد مرجع واضح حتى الآن.', next: 'أضف أو ابحث عن مصدر مباشر.' };
  if (text(record.status) === 'branch_conflict') return { key: 'conflicting', reason: 'السجل داخل تعارض فروع أو مراجع.', next: 'احسم المرجع الأوثق أولًا.' };
  if (text(record.source_quality) === 'weak' || text(record.source_strength) === 'weak') return { key: 'weak', reason: 'المصدر الحالي ضعيف أو غير كافٍ.', next: 'ابحث عن مصدر أقوى أو أوضح.' };
  if (text(record.reference_url)) return { key: 'verified', reason: 'يوجد مرجع ظاهر يمكن البناء عليه.', next: 'وثّق الرابط أو ثبّته في المراجعة.' };
  return { key: 'needs_review', reason: 'تحتاج حالة المصدر مراجعة بشرية.', next: 'راجع وضوح المرجع الحالي.' };
}

function districtVerificationState(record = {}) {
  const district = text(record.district);
  if (!district || district === 'غير متحقق') return { key: 'unresolved', reason: 'الحي غير محسوم بعد.', next: 'احسم الحي من الوصف أو المرجع.' };
  if (/قريب|اتجاه|ناحية|شمال|جنوب|شرق|غرب/.test(district)) return { key: 'directional', reason: 'الحي الحالي وصفي أو اتجاهي أكثر من كونه حيًا محسومًا.', next: 'استبدله باسم حي واضح.' };
  return { key: 'verified', reason: 'الحي الحالي واضح وقابل للاستخدام.', next: 'لا يحتاج إجراءً فوريًا.' };
}

function confidenceVerificationState(record = {}) {
  const value = text(record.confidence || '').toLowerCase();
  if (['high', 'stable', 'verified'].includes(value)) return { key: 'stable', reason: 'الثقة الحالية مستقرة نسبيًا.', next: 'يمكن الاكتفاء بالمراجعة الدورية.' };
  if (['low', 'weak'].includes(value)) return { key: 'blocked', reason: 'الثقة الحالية منخفضة وتحتاج رفعًا.', next: 'أضف مصدرًا أو حسّن حسم الحي.' };
  if (['medium', 'partial'].includes(value)) return { key: 'review', reason: 'الثقة متوسطة وما زالت تحتاج ما يدعمها.', next: 'أكمل الدليل أو راجع التضارب.' };
  return { key: 'review', reason: 'لا توجد قيمة ثقة صريحة، لذا يبقى السجل قيد المراجعة.', next: 'سجّل ما يرفع الثقة أو ما يعطلها.' };
}

function buildMockCompletionProposals(record = {}, draft = {}) {
  const current = { ...record, ...draft };
  const proposals = [];

  if (!text(current.short_address) && text(current.district) && text(current.district) !== 'غير متحقق') {
    proposals.push({
      targetField: 'short_address',
      currentValue: text(current.short_address),
      suggestedValue: `حي ${text(current.district)}، بريدة`,
      reason: 'السجل يفتقد عنوانًا مختصرًا مقروءًا للمراجعة والعرض.',
      confidence: 'medium',
    });
  }

  if (!text(current.phone)) {
    const phone = extractPhoneCandidate(`${text(current.source_notes)}\n${text(current.editorial_summary)}`);
    if (phone) {
      proposals.push({
        targetField: 'phone',
        currentValue: text(current.phone),
        suggestedValue: phone,
        reason: 'تم العثور على رقم يمكن استخدامه كاقتراح أولي داخل نصوص السجل الحالية.',
        confidence: 'high',
      });
    }
  }

  if (!text(current.hours_summary)) {
    const hours = extractHoursCandidate(current);
    if (hours) {
      proposals.push({
        targetField: 'hours_summary',
        currentValue: text(current.hours_summary),
        suggestedValue: hours,
        reason: 'تم العثور على ساعات عمل أو نمط وقت زيارة قابل للتحويل إلى صياغة عرضية.',
        confidence: 'medium',
      });
    }
  }

  if (!text(current.official_instagram)) {
    const instagram = extractInstagramCandidate(current);
    if (instagram) {
      proposals.push({
        targetField: 'official_instagram',
        currentValue: text(current.official_instagram),
        suggestedValue: instagram,
        reason: 'يوجد رابط أو handle يمكن تحويله إلى حساب عرضي مقترح.',
        confidence: 'high',
      });
    }
  }

  if (!text(current.editorial_summary) || text(current.editorial_summary).length < 40) {
    const summary = generatedEditorialSummary(current);
    if (summary && summary !== text(current.editorial_summary)) {
      proposals.push({
        targetField: 'editorial_summary',
        currentValue: text(current.editorial_summary),
        suggestedValue: summary,
        reason: 'الخلاصة الحالية ناقصة أو قصيرة ويمكن تحسينها لصياغة أوضح للمراجعة والعرض.',
        confidence: text(current.google_rating) && text(current.district) ? 'medium' : 'low',
      });
    }
  }

  return proposals
    .filter(item => ALLOWED_COMPLETION_FIELDS.has(item.targetField))
    .filter(item => text(item.suggestedValue) && text(item.suggestedValue) !== text(item.currentValue));
}

function buildMockVerificationProposals(input = {}) {
  const record = input.record || {};
  const draft = input.draft || {};
  const current = { ...record, ...draft };
  const context = input.verificationContext || {};
  const source = sourceVerificationState(current);
  const district = districtVerificationState(current);
  const confidence = confidenceVerificationState(current);
  const evidenceCount = Number(context.evidenceCount || 0);
  const latestDecision = context.latestDecision || {};
  const relatedMission = context.relatedMission || {};
  const relatedSession = context.relatedSession || {};
  const proposals = [];

  const rationale = [
    source.key !== 'verified' ? `المصدر: ${source.reason}` : '',
    district.key !== 'verified' ? `الحي: ${district.reason}` : '',
    confidence.key !== 'stable' ? `الثقة: ${confidence.reason}` : '',
    text(latestDecision.note) ? `آخر قرار: ${text(latestDecision.note)}` : '',
    evidenceCount ? `يوجد ${evidenceCount} دليل مسجل حتى الآن.` : 'لا يوجد evidence trail كافٍ حتى الآن.',
  ].filter(Boolean).join(' ');
  if (rationale) {
    proposals.push({
      targetField: 'verification_rationale',
      currentValue: text(latestDecision.note),
      suggestedValue: rationale,
      reason: 'صياغة مختصرة تشرح لماذا ما زال السجل داخل مسار التحقق الآن.',
      confidence: ['conflicting', 'blocked'].includes(source.key) || ['blocked', 'escalate'].includes(confidence.key) ? 'high' : 'medium',
    });
  }

  const sourceCandidate = text(current.reference_url || current.official_instagram);
  if (source.key !== 'verified' && sourceCandidate) {
    proposals.push({
      targetField: 'source_candidate',
      currentValue: '',
      suggestedValue: sourceCandidate,
      reason: 'يوجد مرجع أو حساب ظاهر يمكن رفعه كمرشح تحقق بدل ترك السجل بلا نقطة انطلاق واضحة.',
      confidence: text(current.reference_url) ? 'high' : 'medium',
    });
  }

  if (source.key === 'conflicting' || text(current.status) === 'branch_conflict') {
    proposals.push({
      targetField: 'conflict_hypothesis',
      currentValue: text(latestDecision.blockers),
      suggestedValue: 'يبدو أن التعارض الحالي مرتبط بتعدد الفروع أو بتضارب المرجع مع بيانات السجل الحالية، ويحتاج حسم المرجع الأوثق قبل أي اعتماد.',
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
      currentValue: text(current.confidence),
      suggestedValue: `الثقة الحالية ${text(current.confidence) || 'غير محددة'}، والأقرب لرفعها الآن هو: ${[...new Set(blockers)].slice(0, 2).join(' ثم ')}.`,
      reason: 'توصية تشغيلية تشرح ما الذي يرفع الثقة وما الذي يبقي السجل معلقًا.',
      confidence: 'medium',
    });
  }

  const nextAction = text(latestDecision.nextAction)
    || text(relatedMission.whatToClose)
    || text(relatedSession.resultSummary)
    || district.next
    || source.next
    || confidence.next;
  if (nextAction) {
    proposals.push({
      targetField: 'next_action_draft',
      currentValue: text(latestDecision.nextAction),
      suggestedValue: nextAction,
      reason: 'تلخيص للخطوة التشغيلية التالية حتى لا يبقى السجل عالقًا بين evidence والقرار والمتابعة.',
      confidence: 'medium',
    });
  }

  return proposals
    .filter(item => ALLOWED_VERIFICATION_FIELDS.has(item.targetField))
    .filter(item => text(item.suggestedValue) && text(item.suggestedValue) !== text(item.currentValue));
}

function sanitizeRuntimeProposal(proposal = {}, record = {}, source = runtimeMode(), task = 'record-completion') {
  const allowedFields = allowedFieldsForTask(task);
  const field = text(proposal.targetField);
  if (!allowedFields.has(field)) return null;
  const suggestedValue = text(proposal.suggestedValue);
  const currentValue = text(proposal.currentValue ?? record[field]);
  if (!suggestedValue || suggestedValue === currentValue) return null;
  const isVerification = task === 'verification-support';
  return {
    id: `agent-proposal:${isVerification ? 'verification:' : ''}${text(record.slug)}:${field}`,
    agentName: isVerification ? 'Verification Support Agent' : 'Record Completion Agent',
    agentVersion: 'v2-runtime',
    proposalType: isVerification ? 'verification' : 'completion',
    handoffTarget: isVerification ? 'verification_draft' : 'editorial_draft',
    runtimeSource: source,
    recordId: text(record.slug),
    recordName: text(record.name) || text(record.slug),
    targetField: field,
    currentValue,
    suggestedValue,
    reason: text(proposal.reason) || 'اقتراح runtime ضمن الحقول الآمنة المسموح بها.',
    evidence: text(proposal.evidence || proposal.basis) || proposalBasis(record, field, suggestedValue),
    confidence: ['high', 'medium', 'low'].includes(text(proposal.confidence).toLowerCase()) ? text(proposal.confidence).toLowerCase() : 'medium',
    mode: 'draft-only',
    status: 'new',
    createdAt: new Date().toISOString(),
    sessionContext: 'read → analyze → propose',
  };
}

function validateRuntimeRequest(input = {}) {
  const errors = [];
  const task = text(input.task || 'record-completion');
  const record = input.record || {};
  if (!record || typeof record !== 'object') errors.push('missing record payload');
  if (!text(record.slug)) errors.push('missing record slug');
  if (text(input.mode || 'draft-only') !== 'draft-only') errors.push('mode must remain draft-only');
  const allowedFields = Array.isArray(input.allowedFields) ? input.allowedFields : [];
  const whitelist = allowedFieldsForTask(task);
  if (allowedFields.some(field => !whitelist.has(field))) errors.push('request contains non-whitelisted fields');
  return { ok: errors.length === 0, errors };
}

function summarizeBatchResults(results = []) {
  return {
    total: results.length,
    generated: results.filter(item => item.status === 'success').length,
    noEligible: results.filter(item => item.status === 'empty').length,
    failed: results.filter(item => item.status === 'error').length,
    proposals: results.reduce((acc, item) => acc + (item.proposals?.length || 0), 0),
    manualReview: results.filter(item => item.status === 'success' && (item.proposals?.length || 0) > 0).length,
    fallbackUsed: results.filter(item => item.diagnostics?.fallbackUsed).length,
    validationRejected: results.reduce((acc, item) => acc + Number(item.diagnostics?.validationRejected || 0), 0),
    runtimeDirect: results.filter(item => !item.diagnostics?.fallbackUsed && ['external-http', 'mock-proxy'].includes(item.diagnostics?.runtimeSource)).length,
    runtimeFailed: results.filter(item => item.status === 'error').length,
  };
}

async function batchRuntimeResults(items = [], resolver = async () => ({})) {
  const results = [];
  for (const item of items) {
    try {
      results.push(await resolver(item));
    } catch (error) {
      results.push({
        ok: false,
        status: 'error',
        proposals: [],
        message: 'حدث خطأ أثناء تشغيل الدفعة على هذا السجل.',
        diagnostics: {
          requestErrors: [],
          validationRejected: 0,
          fallbackUsed: false,
          runtimeSource: 'runtime-batch-error',
          providerError: error.message || 'runtime batch failed',
        },
        record: item?.record || null,
      });
    }
  }
  return {
    ok: true,
    status: results.some(item => item.status === 'error') ? 'completed_with_issues' : 'completed',
    results,
    summary: summarizeBatchResults(results),
    message: 'اكتمل تشغيل الدفعة.',
  };
}

async function callExternalRuntime(payload) {
  let lastError = null;
  for (let attempt = 0; attempt <= RUNTIME_RETRIES; attempt += 1) {
    try {
      const url = new URL(process.env.AGENT_RUNTIME_URL);
      const body = JSON.stringify(payload);
      const data = await new Promise((resolve, reject) => {
        const transport = url.protocol === 'https:' ? httpsRequest : httpRequest;
        const req = transport(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
            ...(process.env.AGENT_RUNTIME_BEARER ? { Authorization: `Bearer ${process.env.AGENT_RUNTIME_BEARER}` } : {}),
          },
        }, res => {
          let raw = '';
          res.on('data', chunk => { raw += chunk; });
          res.on('end', () => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
              reject(new Error(`external runtime failed: ${res.statusCode}`));
              return;
            }
            try {
              resolve(JSON.parse(raw || '{}'));
            } catch (error) {
              reject(new Error('invalid runtime response'));
            }
          });
        });
        req.setTimeout(RUNTIME_TIMEOUT_MS, () => req.destroy(new Error('runtime timeout')));
        req.on('error', reject);
        req.write(body);
        req.end();
      });
      return data;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('external runtime failed');
}

async function recordCompletionRuntimeResult(input = {}) {
  const record = input.record || {};
  const draft = input.draft || {};
  const payload = {
    task: 'record-completion',
    mode: 'draft-only',
    record,
    draft,
    allowedFields: [...ALLOWED_COMPLETION_FIELDS],
  };
  const requestValidation = validateRuntimeRequest(payload);
  if (!requestValidation.ok) {
    return {
      ok: false,
      status: 'error',
      proposals: [],
      message: 'تم رفض طلب runtime لأنه لا يطابق قيود الأمان الحالية.',
      diagnostics: {
        requestErrors: requestValidation.errors,
        validationRejected: 0,
        fallbackUsed: false,
        runtimeSource: runtimeMode(),
      },
    };
  }

  let rawProposals = [];
  let runtimeSource = runtimeMode();
  let fallbackUsed = false;
  let errorMessage = '';
  if (runtimeMode() === 'external-http') {
    try {
      const result = await callExternalRuntime(payload);
      rawProposals = Array.isArray(result.proposals) ? result.proposals : [];
      if (!Array.isArray(result.proposals)) {
        throw new Error('invalid runtime response');
      }
    } catch (error) {
      errorMessage = error.message || 'runtime provider unavailable';
      if (!ALLOW_RUNTIME_FALLBACK) {
        return {
          ok: false,
          status: 'error',
          proposals: [],
          message: 'تعذر الوصول إلى runtime الخارجي ولا يسمح هذا الوضع بالـ fallback.',
          diagnostics: {
            requestErrors: [],
            validationRejected: 0,
            fallbackUsed: false,
            runtimeSource: 'external-http',
            providerError: errorMessage,
          },
        };
      }
      rawProposals = buildMockCompletionProposals(record, draft);
      runtimeSource = 'mock-fallback';
      fallbackUsed = true;
    }
  } else {
    rawProposals = buildMockCompletionProposals(record, draft);
  }

  const validationRejected = rawProposals.length;
  const proposals = rawProposals
    .map(item => sanitizeRuntimeProposal(item, record, runtimeSource, 'record-completion'))
    .filter(Boolean);
  const rejectedCount = validationRejected - proposals.length;

  if (!proposals.length) {
    return {
      ok: true,
      status: 'empty',
      proposals: [],
      message: 'هذا السجل لا يحتوي حقولًا ضمن نطاق وكيل الاستكمال الحالي.',
      diagnostics: {
        requestErrors: [],
        validationRejected: rejectedCount,
        fallbackUsed,
        runtimeSource,
        providerError: errorMessage,
      },
    };
  }

  return {
    ok: true,
    status: 'success',
    proposals,
    message: proposals.length === 1
      ? 'تم إنشاء مسودة وكيل لهذا السجل.'
      : `تم إنشاء ${proposals.length} مسودات وكيل لهذا السجل.`,
    diagnostics: {
      requestErrors: [],
      validationRejected: rejectedCount,
      fallbackUsed,
      runtimeSource,
      providerError: errorMessage,
    },
  };
}

async function verificationSupportRuntimeResult(input = {}) {
  const record = input.record || {};
  const draft = input.draft || {};
  const verificationContext = input.verificationContext || {};
  const payload = {
    task: 'verification-support',
    mode: 'draft-only',
    record,
    draft,
    verificationContext,
    allowedFields: [...ALLOWED_VERIFICATION_FIELDS],
  };
  const requestValidation = validateRuntimeRequest(payload);
  if (!requestValidation.ok) {
    return {
      ok: false,
      status: 'error',
      proposals: [],
      message: 'تم رفض طلب runtime لأنه لا يطابق قيود الأمان الحالية.',
      diagnostics: {
        requestErrors: requestValidation.errors,
        validationRejected: 0,
        fallbackUsed: false,
        runtimeSource: runtimeMode(),
      },
    };
  }

  let rawProposals = [];
  let runtimeSource = runtimeMode();
  let fallbackUsed = false;
  let errorMessage = '';
  if (runtimeMode() === 'external-http') {
    try {
      const result = await callExternalRuntime(payload);
      rawProposals = Array.isArray(result.proposals) ? result.proposals : [];
      if (!Array.isArray(result.proposals)) throw new Error('invalid runtime response');
    } catch (error) {
      errorMessage = error.message || 'runtime provider unavailable';
      if (!ALLOW_RUNTIME_FALLBACK) {
        return {
          ok: false,
          status: 'error',
          proposals: [],
          message: 'تعذر الوصول إلى runtime الخارجي ولا يسمح هذا الوضع بالـ fallback.',
          diagnostics: {
            requestErrors: [],
            validationRejected: 0,
            fallbackUsed: false,
            runtimeSource: 'external-http',
            providerError: errorMessage,
          },
        };
      }
      rawProposals = buildMockVerificationProposals({ record, draft, verificationContext });
      runtimeSource = 'mock-fallback';
      fallbackUsed = true;
    }
  } else {
    rawProposals = buildMockVerificationProposals({ record, draft, verificationContext });
  }

  const validationRejected = rawProposals.length;
  const proposals = rawProposals
    .map(item => sanitizeRuntimeProposal(item, record, runtimeSource, 'verification-support'))
    .filter(Boolean);
  const rejectedCount = validationRejected - proposals.length;

  if (!proposals.length) {
    return {
      ok: true,
      status: 'empty',
      proposals: [],
      message: 'هذا السجل لا يحتاج اقتراحات ضمن نطاق وكيل دعم التحقق الحالي.',
      diagnostics: {
        requestErrors: [],
        validationRejected: rejectedCount,
        fallbackUsed,
        runtimeSource,
        providerError: errorMessage,
      },
    };
  }

  return {
    ok: true,
    status: 'success',
    proposals,
    message: proposals.length === 1
      ? 'تم إنشاء مسودة تحقق لهذا السجل.'
      : `تم إنشاء ${proposals.length} مسودات تحقق لهذا السجل.`,
    diagnostics: {
      requestErrors: [],
      validationRejected: rejectedCount,
      fallbackUsed,
      runtimeSource,
      providerError: errorMessage,
    },
  };
}

async function recordCompletionBatchRuntimeResult(input = {}) {
  const items = Array.isArray(input.items) ? input.items.slice(0, 120) : [];
  if (!items.length) {
    return {
      ok: false,
      status: 'error',
      results: [],
      summary: summarizeBatchResults([]),
      message: 'لا توجد سجلات داخل الدفعة الحالية.',
    };
  }
  return batchRuntimeResults(items, async item => ({
    ...(await recordCompletionRuntimeResult(item)),
    record: item.record || null,
  }));
}

async function verificationSupportBatchRuntimeResult(input = {}) {
  const items = Array.isArray(input.items) ? input.items.slice(0, 120) : [];
  if (!items.length) {
    return {
      ok: false,
      status: 'error',
      results: [],
      summary: summarizeBatchResults([]),
      message: 'لا توجد سجلات داخل الدفعة الحالية.',
    };
  }
  return batchRuntimeResults(items, async item => ({
    ...(await verificationSupportRuntimeResult(item)),
    record: item.record || null,
  }));
}

async function serveStatic(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
  const cleanPath = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
  const filePath = normalize(resolve(ROOT, cleanPath));
  if (!filePath.startsWith(ROOT) || !existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    if (req.method === 'GET' && url.pathname === '/api/runtime/health') {
      json(res, 200, { ...runtimeHealth(), diagnostics: await runtimeDiagnostics() });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/runtime/logs') {
      json(res, 200, { ok: true, items: await readAuditTrail() });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/agents/record-completion') {
      const body = await readJsonBody(req);
      const recordSlug = text(body?.record?.slug || body?.slug);
      const startedAt = new Date().toISOString();
      const result = await recordCompletionRuntimeResult(body);
      await appendRuntimeAudit({
        id: `runtime-call:${recordSlug || 'unknown'}:${Date.now()}`,
        startedAt,
        agent: 'Record Completion Agent',
        requestType: 'record-completion',
        scope: recordSlug || 'unknown',
        result,
      });
      json(res, 200, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/agents/record-completion/batch') {
      const body = await readJsonBody(req);
      const startedAt = new Date().toISOString();
      const result = await recordCompletionBatchRuntimeResult(body);
      await appendRuntimeAudit({
        id: `runtime-batch:completion:${Date.now()}`,
        startedAt,
        agent: 'Record Completion Agent',
        requestType: 'record-completion-batch',
        scope: text(body.scopeLabel || body.scope?.label || `batch:${(body.items || []).length}`),
        result: {
          ok: result.ok,
          status: result.status,
          proposals: Array.from({ length: result.summary?.proposals || 0 }),
          diagnostics: {
            runtimeSource: runtimeMode(),
            fallbackUsed: Boolean(result.summary?.fallbackUsed),
            validationRejected: Number(result.summary?.validationRejected || 0),
          },
        },
        extra: {
          batchSize: Array.isArray(body.items) ? body.items.length : 0,
          generated: result.summary?.generated || 0,
          noEligible: result.summary?.noEligible || 0,
          failedItems: result.summary?.failed || 0,
        },
      });
      json(res, 200, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/agents/verification-support') {
      const body = await readJsonBody(req);
      const recordSlug = text(body?.record?.slug || body?.slug);
      const startedAt = new Date().toISOString();
      const result = await verificationSupportRuntimeResult(body);
      await appendRuntimeAudit({
        id: `runtime-call:verification:${recordSlug || 'unknown'}:${Date.now()}`,
        startedAt,
        agent: 'Verification Support Agent',
        requestType: 'verification-support',
        scope: recordSlug || 'unknown',
        result,
      });
      json(res, 200, result);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/agents/verification-support/batch') {
      const body = await readJsonBody(req);
      const startedAt = new Date().toISOString();
      const result = await verificationSupportBatchRuntimeResult(body);
      await appendRuntimeAudit({
        id: `runtime-batch:verification:${Date.now()}`,
        startedAt,
        agent: 'Verification Support Agent',
        requestType: 'verification-support-batch',
        scope: text(body.scopeLabel || body.scope?.label || `batch:${(body.items || []).length}`),
        result: {
          ok: result.ok,
          status: result.status,
          proposals: Array.from({ length: result.summary?.proposals || 0 }),
          diagnostics: {
            runtimeSource: runtimeMode(),
            fallbackUsed: Boolean(result.summary?.fallbackUsed),
            validationRejected: Number(result.summary?.validationRejected || 0),
          },
        },
        extra: {
          batchSize: Array.isArray(body.items) ? body.items.length : 0,
          generated: result.summary?.generated || 0,
          noEligible: result.summary?.noEligible || 0,
          failedItems: result.summary?.failed || 0,
        },
      });
      json(res, 200, result);
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    json(res, 500, { ok: false, status: 'error', message: 'runtime proxy error' });
  }
});

server.listen(PORT, () => {
  process.stdout.write(`Daleely runtime proxy listening on http://127.0.0.1:${PORT}\n`);
});
