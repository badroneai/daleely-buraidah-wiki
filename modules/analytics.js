// ─── modules/analytics.js ───
// Statistics, analytics helpers, and record-quality inspection.

import { state } from './state.js';
import { STATUS_AR } from './constants.js';
import { uniq, isCanonicalDistrict } from './utils.js';

/* ── Stat helpers ── */

export function statCount(status) {
  return state.records.filter(r => r.status === status).length;
}

export function avgRating(records = state.records) {
  const nums = records.map(r => Number(r.google_rating)).filter(n => !Number.isNaN(n));
  if (!nums.length) return '—';
  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
}

export function featuredStatuses() {
  return [
    { key: 'verified', label: 'معتمد', count: statCount('verified') },
    { key: 'needs_review', label: 'قيد المراجعة', count: statCount('needs_review') },
    { key: 'duplicate', label: 'مكرر', count: statCount('duplicate') },
    { key: 'archived', label: 'مؤرشف', count: statCount('archived') },
  ];
}

/* ── Missing-fields inspection (critical dependency for queues & storage) ── */

export function importantMissingFields(record) {
  const missing = [];
  const districtVal = String(record.district || '').trim();
  if (!districtVal || districtVal === 'غير متحقق' || !isCanonicalDistrict(districtVal)) missing.push('الحي');
  if (!String(record.reference_url || '').trim()) missing.push('المرجع');
  if (!String(record.short_address || '').trim()) missing.push('العنوان');
  if (!String(record.google_rating || '').trim()) missing.push('التقييم');
  if (!String(record.google_reviews_count || '').trim()) missing.push('المراجعات');
  return missing;
}

/* ── Record lists ── */

export function recordsMissingImportant(limit = 8) {
  return state.records
    .map(record => ({ record, missing: importantMissingFields(record) }))
    .filter(item => item.missing.length)
    .sort((a, b) => b.missing.length - a.missing.length)
    .slice(0, limit);
}

export function lowConfidenceRecords(limit = 8) {
  return state.records
    .filter(r => String(r.confidence || '').trim().toLowerCase() === 'low')
    .slice(0, limit);
}

export function recentVerifiedRecords(limit = 8) {
  return [...state.records]
    .filter(r => r.last_verified_at)
    .sort((a, b) => String(b.last_verified_at).localeCompare(String(a.last_verified_at)))
    .slice(0, limit);
}

export function newlyAddedRecords(limit = 8) {
  return state.records
    .filter(r => ['stub', 'discovered', 'profiled', 'partially_verified'].includes(r.status))
    .slice(0, limit);
}

export function todayVerifiedCount() {
  const today = new Date().toISOString().slice(0, 10);
  return state.records.filter(r => r.last_verified_at === today).length;
}

/* ── Sector tree ── */

export function sectorTree() {
  return [
    {
      key: 'food-beverage',
      title: 'الأغذية والمشروبات',
      note: 'قطاعات قريبة من الاستخدام اليومي والبحث المحلي.',
      children: [
        { key: 'cafes', title: 'الكوفيهات', status: 'active', note: 'القسم المتاح الآن داخل الدليل.' },
        { key: 'restaurants', title: 'المطاعم', status: 'active', note: '100 مطعم — أكلات سعودية وقصيمية، مشويات، شاورما، فطور شعبي، برجر محلي، مطابخ ولائم.' },
        { key: 'bakeries', title: 'المخابز والحلويات', status: 'active', note: '100 مخبز وحلويات — خبز طازج، معجنات، كيك، حلويات شرقية، تمور وكليجا، دونات ووافل، آيس كريم، أسر منتجة.' },
        { key: 'juice-icecream', title: 'العصائر والآيس كريم', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'catering', title: 'الضيافة والبوفيهات', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'groceries', title: 'البقالات والسوبرماركت', status: 'active', note: 'بيانات أولية.' },
        { key: 'roasteries', title: 'محامص القهوة', status: 'active', note: 'بيانات أولية.' },
        { key: 'chocolates', title: 'الشوكولاتة', status: 'active', note: 'محلات شوكولاتة — فاخرة ومحلية وأسر منتجة.' },
      ],
    },
    {
      key: 'shopping',
      title: 'التسوق والتجزئة',
      note: 'محلات ملابس ومجوهرات وعطور وأثاث ومولات في بريدة.',
      children: [
        { key: 'fashion', title: 'الملابس والأزياء', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'jewelry', title: 'المجوهرات والذهب', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'perfumes', title: 'العطور والبخور', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'electronics', title: 'الإلكترونيات والجوالات', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'furniture', title: 'الأثاث والمفروشات', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'baby-stores', title: 'مستلزمات الأطفال', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'malls', title: 'المولات والمراكز التجارية', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
      ],
    },
    {
      key: 'real-estate-housing',
      title: 'العقار والسكن',
      note: 'مكاتب عقارية وفنادق وشقق مفروشة في بريدة.',
      children: [
        { key: 'real-estate-offices', title: 'المكاتب العقارية', status: 'active', note: 'بيانات أولية.' },
        { key: 'apartments-hotels', title: 'الشقق والفنادق', status: 'active', note: 'بيانات أولية.' },
      ],
    },
    {
      key: 'health-beauty',
      title: 'الصحة والجمال',
      note: 'مستشفيات وعيادات وصيدليات وصالونات وبصريات في بريدة.',
      children: [
        { key: 'clinics', title: 'العيادات والمستشفيات', status: 'active', note: 'بيانات أولية.' },
        { key: 'pharmacies', title: 'الصيدليات', status: 'active', note: 'بيانات أولية.' },
        { key: 'optical', title: 'النظارات والبصريات', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'salons', title: 'الصالونات', status: 'active', note: 'بيانات أولية.' },
        { key: 'women-salons', title: 'المشاغل النسائية', status: 'active', note: 'بيانات أولية.' },
      ],
    },
    {
      key: 'education',
      title: 'التعليم والتدريب',
      note: 'مدارس ومعاهد ومراكز تدريب في بريدة.',
      children: [
        { key: 'schools', title: 'المدارس', status: 'active', note: 'بيانات أولية.' },
        { key: 'institutes', title: 'المعاهد', status: 'active', note: 'بيانات أولية.' },
        { key: 'training-centers', title: 'مراكز التدريب', status: 'active', note: 'بيانات أولية.' },
      ],
    },
    {
      key: 'events',
      title: 'المناسبات والأفراح',
      note: 'قاعات أفراح وتنظيم مناسبات وتصوير في بريدة.',
      children: [
        { key: 'wedding-halls', title: 'قاعات الأفراح', status: 'active', note: 'بيانات أولية.' },
        { key: 'event-planning', title: 'تنظيم المناسبات', status: 'active', note: 'بيانات أولية.' },
        { key: 'photography', title: 'التصوير', status: 'active', note: 'بيانات أولية.' },
      ],
    },
    {
      key: 'services',
      title: 'الخدمات',
      note: 'خدمات سيارات وصيانة ونقل وسفر واستقدام في بريدة.',
      children: [
        { key: 'car-services', title: 'خدمات السيارات', status: 'active', note: 'بيانات أولية.' },
        { key: 'maintenance', title: 'الصيانة', status: 'active', note: 'بيانات أولية.' },
        { key: 'transport', title: 'النقل والتوصيل', status: 'active', note: 'بيانات أولية.' },
        { key: 'general-services', title: 'خدمات متنوعة', status: 'active', note: 'بيانات أولية.' },
        { key: 'travel', title: 'وكالات السفر والسياحة', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'recruitment', title: 'مكاتب الاستقدام', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'media-printing', title: 'الإعلام والمطابع', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
      ],
    },
    {
      key: 'automotive',
      title: 'السيارات والنقل',
      note: 'معارض سيارات ومحطات وقود وتأجير سيارات في بريدة.',
      children: [
        { key: 'car-dealers', title: 'معارض السيارات', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'car-rental', title: 'تأجير السيارات', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'gas-stations', title: 'محطات الوقود', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
      ],
    },
    {
      key: 'finance-gov',
      title: 'المالية والحكومية',
      note: 'بنوك وخدمات حكومية في بريدة.',
      children: [
        { key: 'banks', title: 'البنوك', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'gov-services', title: 'الخدمات الحكومية', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
      ],
    },
    {
      key: 'lifestyle',
      title: 'الرياضة والترفيه',
      note: 'نوادي رياضية وحدائق ومتنزهات ومرافق ترفيهية في بريدة.',
      children: [
        { key: 'gyms', title: 'النوادي الرياضية', status: 'active', note: 'لياقة وحديد وسباحة وفنون قتالية.' },
        { key: 'parks', title: 'الحدائق والمتنزهات', status: 'active', note: 'حدائق أحياء ومنتزهات عامة وممشى.' },
        { key: 'entertainment', title: 'مراكز الترفيه', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'kids-activities', title: 'أنشطة الأطفال', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
      ],
    },
    {
      key: 'industry',
      title: 'الصناعة ومواد البناء',
      note: 'مصانع المدينة الصناعية ومحلات مواد البناء والمقاولات في بريدة.',
      children: [
        { key: 'factories', title: 'المصانع والمدينة الصناعية', status: 'active', note: 'مصانع بلاستيك وحديد وأغذية وأثاث ومطابع في المدينة الصناعية ببريدة.' },
        { key: 'building-materials', title: 'مواد البناء والمقاولات', status: 'active', note: 'محلات حديد وإسمنت وسيراميك وأدوات صحية ومقاولات عامة.' },
      ],
    },
    {
      key: 'culture',
      title: 'الثقافة والتراث',
      note: 'مكتبات ومتاحف وأسواق شعبية وحرف يدوية في بريدة.',
      children: [
        { key: 'libraries', title: 'المكتبات', status: 'active', note: 'عامة وتجارية وثقافية ومقاهي كتب.' },
        { key: 'museums', title: 'المتاحف', status: 'active', note: 'متاحف ومعالم تراثية.' },
        { key: 'traditional-markets', title: 'الأسواق الشعبية', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
        { key: 'handicrafts', title: 'الحرف اليدوية', status: 'active', note: 'قطاع بنيوي — جاهز لاستقبال البيانات.' },
      ],
    },
  ];
}

export function currentSector() {
  return uniq(state.records.map(r => r.sector).filter(Boolean));
}

export function sectorLabelByKey(key = '') {
  const entry = sectorTree()
    .flatMap(group => group.children)
    .find(child => child.key === key);
  return entry?.title || key;
}
