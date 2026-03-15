// ─── modules/sector-ops.js ───
// Sector operations layer: scoring, readiness, district analysis, ops-filter logic.
// All helpers are profile-aware — pass a profile from getSectorProfile() for custom behavior.

import { importantMissingFields } from './analytics.js';
import { getSectorProfile } from './sector-profiles.js';

/* ── Ops filter definitions ──
   Each key maps to a predicate function on a record.
   Used by both the filter buttons and the inline filter logic. */

export const OPS_FILTERS = {
  'no-phone':    { label: 'ناقص هاتف',     test: r => !String(r.phone || '').trim() },
  'no-insta':    { label: 'ناقص إنستغرام',  test: r => !String(r.official_instagram || '').trim() },
  'no-ref':      { label: 'ناقص مصدر',      test: r => !String(r.reference_url || '').trim() },
  'needs-review':{ label: 'يحتاج مراجعة',   test: r => ['needs_review', 'stub', 'discovered'].includes(r.status) },
  'low-conf':    { label: 'ثقة منخفضة',     test: r => String(r.confidence || '').toLowerCase() === 'low' },
  'no-district': { label: 'بدون حي',        test: r => { const d = String(r.district || '').trim(); return !d || d === 'غير متحقق'; } },
  'verified':    { label: 'متحقق منه',      test: r => r.status === 'verified' || r.status === 'active' },
  'specialty':   { label: 'قهوة مختصة',     test: r => r._norm?.specialty_coffee === 'yes' },
};

/* ── Apply ops filter to a records array ── */

export function applyOpsFilter(records, opsFilterKey) {
  if (!opsFilterKey || !OPS_FILTERS[opsFilterKey]) return records;
  return records.filter(OPS_FILTERS[opsFilterKey].test);
}

/* ── Ops counters: how many records match each ops filter ──
   profile.opsFilters controls which filters are counted. */

export function opsFilterCounts(records, profile) {
  const counts = {};
  const activeFilters = profile ? profile.opsFilters : Object.keys(OPS_FILTERS);
  for (const key of activeFilters) {
    if (OPS_FILTERS[key]) counts[key] = records.filter(OPS_FILTERS[key].test).length;
  }
  return counts;
}

/* ── Basic sector metrics ── */

export function sectorMetrics(records) {
  const total = records.length;
  const verified = records.filter(r => r.status === 'verified' || r.status === 'active').length;
  const profiled = records.filter(r => r.status === 'profiled').length;
  const hasPhone = records.filter(r => String(r.phone || '').trim()).length;
  const hasInstagram = records.filter(r => String(r.official_instagram || '').trim()).length;
  const hasRefUrl = records.filter(r => String(r.reference_url || '').trim()).length;
  const lowConf = records.filter(r => String(r.confidence || '').toLowerCase() === 'low').length;
  const needsReview = records.filter(r => ['needs_review', 'stub', 'discovered'].includes(r.status)).length;
  const missingDistrict = records.filter(OPS_FILTERS['no-district'].test).length;
  return { total, verified, profiled, hasPhone, hasInstagram, hasRefUrl, lowConf, needsReview, missingDistrict };
}

/* ── Smart priority scoring ──
   Each entity gets a score; higher = more urgently needs work.
   Uses profile.priorityWeights for sector-specific scoring.
   Returns sorted array of { record, score, tags }. */

export function scoredPriority(records, limit = 8, profile) {
  const w = profile ? profile.priorityWeights : {
    noContact: 3, singleContact: 1, lowConf: 2, unverified: 2, noDistrict: 2, noRef: 1, perMissingField: 1,
  };
  const scored = records.map(r => {
    let score = 0;
    const noPhone = !String(r.phone || '').trim();
    const noInsta = !String(r.official_instagram || '').trim();
    const noRef = !String(r.reference_url || '').trim();
    const noDistrict = OPS_FILTERS['no-district'].test(r);
    const isLowConf = String(r.confidence || '').toLowerCase() === 'low';
    const isUnverified = ['needs_review', 'stub', 'discovered'].includes(r.status);
    // Contact gap scoring — respect contactRelevance
    const cr = profile ? profile.contactRelevance : { phone: true, instagram: true };
    const phoneRelevant = cr.phone;
    const instaRelevant = cr.instagram;
    const phoneMissing = phoneRelevant && noPhone;
    const instaMissing = instaRelevant && noInsta;
    if (phoneMissing && instaMissing) score += w.noContact;
    else if (phoneMissing || instaMissing) score += w.singleContact;
    if (isLowConf) score += w.lowConf;
    if (isUnverified) score += w.unverified;
    if (noDistrict) score += w.noDistrict;
    if (noRef) score += w.noRef;
    const missing = importantMissingFields(r);
    score += missing.length * w.perMissingField;
    return { record: r, score, missing, noPhone, noInsta, noRef, noDistrict, isLowConf, isUnverified };
  });
  return scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

/* ── District breakdown with quality stats ──
   Returns sorted array of [districtName, { count, verified, hasMissing }]. */

export function districtOpsBreakdown(records) {
  const stats = {};
  records.forEach(r => {
    const d = r.district || 'غير محدد';
    if (!stats[d]) stats[d] = { count: 0, verified: 0, hasMissing: 0 };
    stats[d].count++;
    if (r.status === 'verified' || r.status === 'active') stats[d].verified++;
    if (importantMissingFields(r).length) stats[d].hasMissing++;
  });
  return Object.entries(stats).sort((a, b) => b[1].count - a[1].count);
}

/* ── Sector extraction readiness ──
   Uses profile.readinessWeights and profile.blockerThresholds for custom scoring.
   Returns { score, label, tone, bars, blockers, nextStep }. */

export function sectorReadiness(metrics, profile) {
  const { total, verified, hasPhone, hasRefUrl, lowConf, missingDistrict } = metrics;
  if (!total) return { score: 0, label: 'غير جاهز', tone: 'danger', bars: [], blockers: ['لا توجد كيانات'], nextStep: 'أضف كيانات أولاً' };

  const rw = profile ? profile.readinessWeights : {
    district: 0.25, reference: 0.20, confidence: 0.20, verification: 0.15, phone: 0.10, volume: 0.10,
  };
  const bt = profile ? profile.blockerThresholds : {
    district: 80, reference: 50, phone: 20, confidence: 70, verification: 10, minEntities: 10,
  };
  const volumeTarget = profile ? profile.readinessVolumeTarget : 30;

  const pctVerified = Math.round(verified / total * 100);
  const pctHasPhone = Math.round(hasPhone / total * 100);
  const pctHasRef = Math.round(hasRefUrl / total * 100);
  const pctHasDistrict = Math.round((total - missingDistrict) / total * 100);
  const pctHighConf = Math.round((total - lowConf) / total * 100);

  // Composite: weighted average of axes + volume bonus
  const score = Math.round(
    pctHasDistrict * rw.district + pctHasRef * rw.reference + pctHighConf * rw.confidence +
    pctVerified * rw.verification + pctHasPhone * rw.phone +
    Math.min(total, volumeTarget) / volumeTarget * 100 * rw.volume
  );

  const label = score >= 75 ? 'جاهز للاستخراج'
    : score >= 50 ? 'قابل للاستخراج بشروط'
    : score >= 25 ? 'يحتاج عملاً كبيرًا'
    : 'غير جاهز';
  const tone = score >= 75 ? 'success' : score >= 50 ? 'warning' : 'danger';

  // Build bars — skip phone bar if weight is 0
  const bars = [
    { label: 'الأحياء',  pct: pctHasDistrict },
    { label: 'المراجع',  pct: pctHasRef },
    { label: 'الثقة',    pct: pctHighConf },
    { label: 'التحقق',   pct: pctVerified },
  ];
  if (rw.phone > 0) bars.push({ label: 'الهاتف', pct: pctHasPhone });

  // Auto-detect blockers using profile thresholds
  const blockers = [];
  if (pctHasDistrict < bt.district) blockers.push(`${missingDistrict} كيان بدون حي محسوم`);
  if (pctHasRef < bt.reference) blockers.push(`${total - hasRefUrl} كيان بدون رابط مرجعي`);
  if (bt.phone > 0 && pctHasPhone < bt.phone) blockers.push(`${total - hasPhone} كيان بدون هاتف`);
  if (pctHighConf < bt.confidence) blockers.push(`${lowConf} كيان بثقة منخفضة`);
  if (pctVerified < bt.verification) blockers.push(`نسبة التحقق ${pctVerified}% فقط`);
  if (total < bt.minEntities) blockers.push(`عدد الكيانات قليل (${total})`);
  const topBlockers = blockers.slice(0, 3);

  const nextStep = topBlockers.length
    ? `ركّز على: ${topBlockers[0]}`
    : 'القطاع في حالة جيدة — راجع الكيانات المعلقة';

  return { score, label, tone, bars, blockers: topBlockers, nextStep };
}

/* ── Sector-specific fourth metric ──
   Uses profile.fourthMetric for the 4th KPI card.
   Returns { count, label }. */

export function sectorFourthMetric(sectorKey, records, profile) {
  const rule = profile ? profile.fourthMetric : { filter: r => r._norm?.parking === 'yes', label: 'يتوفر موقف', opsKey: '' };
  return { count: records.filter(rule.filter).length, label: rule.label, opsKey: rule.opsKey || '' };
}

/* ── Sector descriptions ──
   Uses profile.description if available, falls back to static lookup. */

const STATIC_DESCRIPTIONS = {
  cafes: 'أفضل مدخل لاكتشاف الكوفيهات داخل بريدة حسب الحي والحالة وطبيعة التجربة.',
  restaurants: 'اكتشف المطاعم في بريدة — كبسة ومندي وحنيذ وشاورما ومشويات وفطور شعبي ومطابخ ولائم وأكثر.',
  bakeries: 'مخابز وحلويات بريدة — من الخبز الطازج إلى الكيك الفاخر والحلويات الشرقية.',
  groceries: 'سوبرماركات وبقالات ومتاجر بريدة — كل ما تحتاجه للتسوق اليومي.',
  roasteries: 'محامص القهوة في بريدة — من البن العربي التقليدي إلى القهوة المختصة الفاخرة.',
  'real-estate-offices': 'المكاتب والشركات العقارية في بريدة — بيع وشراء وتأجير العقارات.',
  'apartments-hotels': 'فنادق وشقق مفروشة ووحدات سكنية في بريدة — من الفاخر إلى الاقتصادي.',
  clinics: 'مستشفيات وعيادات ومراكز طبية في بريدة — خدمات صحية متنوعة.',
  pharmacies: 'صيدليات بريدة — سلاسل وطنية ومحلية لكل احتياجاتك الصحية.',
  salons: 'صالونات حلاقة وتجميل في بريدة — رجالية ونسائية بخدمات متنوعة.',
  schools: 'مدارس بريدة الأهلية والعالمية — تعليم متميز بمناهج متعددة.',
  institutes: 'معاهد تدريب وتعليم في بريدة — دورات مهنية ولغات وحاسب.',
  'training-centers': 'مراكز تدريب وكليات تقنية في بريدة — تأهيل مهني وتطوير.',
  'wedding-halls': 'قاعات أفراح ومناسبات في بريدة — من الراقي إلى المتوسط.',
  'event-planning': 'خدمات تنظيم مناسبات وديكور وورد في بريدة.',
  photography: 'استوديوهات تصوير في بريدة — فوتوغرافي وفيديو للمناسبات.',
  'car-services': 'خدمات سيارات في بريدة — غسيل وتلميع وصيانة.',
  maintenance: 'خدمات صيانة منزلية في بريدة — سباكة وكهرباء ومكيفات.',
  transport: 'خدمات نقل وتوصيل في بريدة — نقل عفش وتوصيل طرود.',
  'general-services': 'خدمات متنوعة في بريدة — خياطة وطباعة ومشاتل وغيرها.',
  chocolates: 'محلات الشوكولاتة في بريدة — فاخرة ومحلية وحرفية وتمور بالشوكولاتة وهدايا.',
  'women-salons': 'المشاغل النسائية في بريدة — تجميل وعرائس وحناء وعناية بالبشرة والشعر.',
  gyms: 'النوادي الرياضية في بريدة — لياقة وحديد وسباحة وفنون قتالية ونوادي نسائية.',
  parks: 'الحدائق والمتنزهات في بريدة — حدائق أحياء ومنتزهات عائلية وممشى رياضي.',
  libraries: 'مكتبات بريدة — عامة وتجارية وثقافية ومقاهي كتب للقراءة والمطالعة.',
  museums: 'متاحف بريدة ومعالمها التراثية — تاريخ القصيم وتراثها العريق.',
  // ── قطاعات جديدة (بنيوية — جاهزة لاستقبال البيانات) ──
  'juice-icecream': 'محلات العصائر الطازجة والآيس كريم في بريدة — فروع محلية وسلاسل معروفة.',
  catering: 'خدمات الضيافة والبوفيهات في بريدة — ولائم ومناسبات وتجهيز طعام.',
  fashion: 'محلات الملابس والأزياء في بريدة — رجالية ونسائية وأطفال ومحلات ثوب.',
  jewelry: 'محلات المجوهرات والذهب في بريدة — ذهب وألماس وساعات ومصوغات.',
  perfumes: 'محلات العطور والبخور في بريدة — عطور عربية وعالمية وبخور ودهن عود.',
  electronics: 'محلات الإلكترونيات والجوالات في بريدة — هواتف وأجهزة وصيانة وإكسسوارات.',
  furniture: 'محلات الأثاث والمفروشات في بريدة — أثاث منزلي ومكتبي ومطابخ وستائر.',
  'baby-stores': 'محلات مستلزمات الأطفال والأمومة في بريدة — ملابس وألعاب ومعدات أطفال.',
  malls: 'المولات والمراكز التجارية في بريدة — تسوق وترفيه ومطاعم تحت سقف واحد.',
  banks: 'البنوك وفروعها في بريدة — بنوك محلية وعالمية وخدمات مصرفية.',
  'gov-services': 'الخدمات الحكومية في بريدة — جوازات وأحوال ومرور وبلدية وخدمات إلكترونية.',
  'car-dealers': 'معارض السيارات في بريدة — وكالات رسمية ومعارض مستعمل وتمويل.',
  'car-rental': 'شركات تأجير السيارات في بريدة — تأجير يومي وشهري وسياحي.',
  'gas-stations': 'محطات الوقود في بريدة — بنزين وديزل وخدمات مرافقة.',
  optical: 'محلات النظارات والبصريات في بريدة — نظارات طبية وشمسية وعدسات لاصقة.',
  entertainment: 'مراكز الترفيه والألعاب في بريدة — ملاهي وألعاب إلكترونية وبولينج وتسلية.',
  'kids-activities': 'أماكن وأنشطة الأطفال في بريدة — مناطق لعب وورش إبداعية وحضانات ترفيهية.',
  'traditional-markets': 'الأسواق الشعبية والتراثية في بريدة — سوق الخضار وسوق التمور وأسواق تقليدية.',
  handicrafts: 'الحرف اليدوية والمنتجات المحلية في بريدة — سدو ونسيج وفخار ومنتجات تراثية.',
  travel: 'وكالات السفر والسياحة في بريدة — حجوزات طيران وفنادق ورحلات عمرة وسياحة.',
  recruitment: 'مكاتب الاستقدام في بريدة — استقدام عمالة منزلية ومهنية وخدمات تأشيرات.',
  'media-printing': 'شركات الإعلام والمطابع في بريدة — تصميم وطباعة وتسويق رقمي ولوحات إعلانية.',
  factories: 'المصانع والمنشآت الصناعية في بريدة — المدينة الصناعية ومصانع الأغذية والبلاستيك والحديد والأثاث.',
  'building-materials': 'محلات مواد البناء والمقاولات في بريدة — حديد وإسمنت وسيراميك ورخام وأدوات صحية وكهربائية.',
};

export function sectorDescription(sectorKey, profile) {
  if (profile && profile.description) return profile.description;
  return STATIC_DESCRIPTIONS[sectorKey] || '';
}

// Legacy export — kept for backward compatibility
export const SECTOR_DESCRIPTIONS = STATIC_DESCRIPTIONS;
