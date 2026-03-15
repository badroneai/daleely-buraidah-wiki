// ─── modules/sector-profiles.js ───
// Sector Profile System v1: per-sector configuration that shapes
// ops behavior, readiness scoring, priority logic, and displayed filters.
//
// Design: each profile overrides specific keys from DEFAULT_PROFILE.
// Sectors without a custom profile get the default automatically.

/* ── Default profile (used as fallback for all sectors) ── */

export const DEFAULT_PROFILE = {
  // ── Which ops-filter buttons to show (ordered) ──
  opsFilters: ['no-phone', 'no-insta', 'no-ref', 'needs-review', 'low-conf', 'no-district'],

  // ── Priority scoring weights ──
  priorityWeights: {
    noContact: 3,
    singleContact: 1,
    lowConf: 2,
    unverified: 2,
    noDistrict: 2,
    noRef: 1,
    perMissingField: 1,
  },

  // ── Readiness scoring (weights sum to ~1.0) ──
  readinessWeights: {
    district: 0.25,
    reference: 0.20,
    confidence: 0.20,
    verification: 0.15,
    phone: 0.10,
    volume: 0.10,
  },
  readinessVolumeTarget: 30,

  // ── Blocker thresholds (below = flagged as blocker) ──
  blockerThresholds: {
    district: 80,
    reference: 50,
    phone: 20,
    confidence: 70,
    verification: 10,
    minEntities: 10,
  },

  // ── Fourth KPI metric ──
  fourthMetric: { filter: r => r._norm?.parking === 'yes', label: 'يتوفر موقف' },

  // ── Contact relevance ──
  contactRelevance: { phone: true, instagram: true },

  // ── Focus label: what matters most for this sector ──
  focusLabel: '',

  // ── Description ──
  description: '',
};


/* ── Custom profiles ──
   7 priority sectors chosen by data analysis:
   - cafes (307): only sector with references & instagram, high review need
   - restaurants (100): full districts, zero refs, pure food-service pattern
   - clinics (69): phone-critical, health-service pattern
   - bakeries (100): similar to restaurants but different quality gaps
   - pharmacies (40): chain coverage pattern, district spread matters
   - real-estate-offices (50): contact-critical, confidence issues
   - wedding-halls (50): social/event pattern, wide district spread
*/

const SECTOR_PROFILES = {

  // ──────────── cafes (307 records) ────────────
  // Unique: only sector with reference_url (67%), instagram (7%), high review need (74%), low confidence (16%)
  // Ops focus: close reference gaps, verify stubs, build confidence
  cafes: {
    description: 'أفضل مدخل لاكتشاف الكوفيهات داخل بريدة حسب الحي والحالة وطبيعة التجربة.',
    focusLabel: 'التركيز: المراجع والتحقق',
    fourthMetric: { filter: r => r._norm?.specialty_coffee === 'yes', label: 'قهوة مختصة' },
    // All 6 filters — cafes is the only sector where instagram matters
    priorityWeights: {
      noContact: 2, singleContact: 1, lowConf: 2, unverified: 2,
      noDistrict: 2, noRef: 2, perMissingField: 1,
    },
    readinessWeights: {
      district: 0.15, reference: 0.25, confidence: 0.20,
      verification: 0.20, phone: 0.05, volume: 0.15,
    },
    blockerThresholds: {
      district: 80, reference: 60, phone: 5,
      confidence: 70, verification: 10, minEntities: 10,
    },
  },

  // ──────────── restaurants (100 records) ────────────
  // Pattern: full districts (100%), full ratings (100%), zero refs, zero insta, 17% review
  // Ops focus: add reference sources, reduce review backlog
  restaurants: {
    description: 'اكتشف المطاعم في بريدة — كبسة ومندي وحنيذ وشاورما ومشويات وفطور شعبي ومطابخ ولائم وأكثر.',
    focusLabel: 'التركيز: المصادر والمراجعة',
    fourthMetric: { filter: r => r._norm?.family_friendly === 'yes', label: 'مناسب للعائلات' },
    opsFilters: ['no-ref', 'needs-review', 'low-conf', 'no-district', 'no-phone'],
    contactRelevance: { phone: true, instagram: false },
    priorityWeights: {
      noContact: 1, singleContact: 0, lowConf: 2, unverified: 2,
      noDistrict: 2, noRef: 3, perMissingField: 1,
    },
    readinessWeights: {
      district: 0.30, reference: 0.25, confidence: 0.20,
      verification: 0.15, phone: 0.00, volume: 0.10,
    },
    blockerThresholds: {
      district: 80, reference: 30, phone: 0,
      confidence: 70, verification: 10, minEntities: 10,
    },
  },

  // ──────────── clinics (69 records) ────────────
  // Pattern: phone critical (patients call), zero refs/insta, clean districts/ratings
  // Ops focus: collect phone numbers, verify accuracy
  clinics: {
    description: 'مستشفيات وعيادات ومراكز طبية في بريدة — خدمات صحية متنوعة.',
    focusLabel: 'التركيز: الهاتف والدقة',
    fourthMetric: { filter: r => String(r.category || '').includes('مستشفى'), label: 'مستشفيات' },
    opsFilters: ['no-phone', 'no-ref', 'needs-review', 'low-conf', 'no-district'],
    contactRelevance: { phone: true, instagram: false },
    priorityWeights: {
      noContact: 3, singleContact: 2, lowConf: 2, unverified: 2,
      noDistrict: 2, noRef: 1, perMissingField: 1,
    },
    readinessWeights: {
      district: 0.20, reference: 0.15, confidence: 0.20,
      verification: 0.15, phone: 0.20, volume: 0.10,
    },
    blockerThresholds: {
      district: 80, reference: 50, phone: 30,
      confidence: 70, verification: 10, minEntities: 10,
    },
  },

  // ──────────── bakeries (100 records) ────────────
  // Pattern: identical to restaurants (full districts/ratings, zero refs/insta)
  // BUT: 7% low confidence (vs 1% restaurants), 17% review needed
  // Ops focus: fix low-confidence records, add references
  bakeries: {
    description: 'مخابز وحلويات بريدة — من الخبز الطازج إلى الكيك الفاخر والحلويات الشرقية.',
    focusLabel: 'التركيز: الثقة والمصادر',
    fourthMetric: { filter: r => r._norm?.family_friendly === 'yes', label: 'مناسب للعائلات' },
    opsFilters: ['low-conf', 'no-ref', 'needs-review', 'no-district', 'no-phone'],
    contactRelevance: { phone: true, instagram: false },
    priorityWeights: {
      noContact: 1, singleContact: 0, lowConf: 3, unverified: 2,
      noDistrict: 1, noRef: 2, perMissingField: 1,
    },
    readinessWeights: {
      district: 0.25, reference: 0.20, confidence: 0.30,
      verification: 0.15, phone: 0.00, volume: 0.10,
    },
    blockerThresholds: {
      district: 80, reference: 30, phone: 0,
      confidence: 80, verification: 10, minEntities: 10,
    },
  },

  // ──────────── pharmacies (40 records) ────────────
  // Pattern: clean chain data (100% districts/ratings), zero everything else
  // Unique: chain business = district COVERAGE is the operational priority
  // Ops focus: ensure even distribution across districts, identify gaps
  pharmacies: {
    description: 'صيدليات بريدة — سلاسل وطنية ومحلية لكل احتياجاتك الصحية.',
    focusLabel: 'التركيز: التغطية الجغرافية',
    fourthMetric: { filter: r => String(r.name || '').includes('النهدي') || String(r.name || '').includes('الدواء'), label: 'سلاسل كبرى' },
    opsFilters: ['no-district', 'no-phone', 'low-conf', 'needs-review', 'no-ref'],
    contactRelevance: { phone: true, instagram: false },
    priorityWeights: {
      noContact: 1, singleContact: 0, lowConf: 2, unverified: 1,
      noDistrict: 3, noRef: 1, perMissingField: 1,
    },
    readinessWeights: {
      district: 0.35, reference: 0.10, confidence: 0.20,
      verification: 0.10, phone: 0.10, volume: 0.15,
    },
    readinessVolumeTarget: 40, // pharmacies: want good coverage
    blockerThresholds: {
      district: 90, reference: 20, phone: 10,
      confidence: 80, verification: 5, minEntities: 15,
    },
  },

  // ──────────── real-estate-offices (50 records) ────────────
  // Pattern: phone critical (4% — highest after cafes/clinics), 6% low confidence
  // Unique: B2B sector where phone is THE primary contact method
  // Ops focus: phone collection, confidence, verification
  'real-estate-offices': {
    description: 'المكاتب والشركات العقارية في بريدة — بيع وشراء وتأجير العقارات.',
    focusLabel: 'التركيز: الهاتف والتحقق',
    fourthMetric: { filter: r => String(r.category || '').includes('تأجير') || String(r.category || '').includes('إيجار'), label: 'مكاتب تأجير' },
    opsFilters: ['no-phone', 'low-conf', 'needs-review', 'no-district', 'no-ref'],
    contactRelevance: { phone: true, instagram: false },
    priorityWeights: {
      noContact: 3, singleContact: 2, lowConf: 3, unverified: 2,
      noDistrict: 1, noRef: 1, perMissingField: 1,
    },
    readinessWeights: {
      district: 0.15, reference: 0.10, confidence: 0.25,
      verification: 0.20, phone: 0.20, volume: 0.10,
    },
    blockerThresholds: {
      district: 80, reference: 20, phone: 25,
      confidence: 80, verification: 15, minEntities: 10,
    },
  },

  // ──────────── wedding-halls (50 records) ────────────
  // Pattern: social/event sector, wide spread (24 districts), 2% phone, 2% insta
  // Unique: district coverage + social presence both matter (people search by area AND reputation)
  // Ops focus: district spread, social links, basic verification
  'wedding-halls': {
    description: 'قاعات أفراح ومناسبات في بريدة — من الراقي إلى المتوسط.',
    focusLabel: 'التركيز: الانتشار والتواصل',
    fourthMetric: { filter: r => r._norm?.parking === 'yes', label: 'يتوفر موقف' },
    opsFilters: ['no-district', 'no-phone', 'no-insta', 'needs-review', 'low-conf', 'no-ref'],
    contactRelevance: { phone: true, instagram: true },
    priorityWeights: {
      noContact: 3, singleContact: 1, lowConf: 2, unverified: 2,
      noDistrict: 3, noRef: 1, perMissingField: 1,
    },
    readinessWeights: {
      district: 0.30, reference: 0.10, confidence: 0.15,
      verification: 0.15, phone: 0.15, volume: 0.15,
    },
    blockerThresholds: {
      district: 85, reference: 20, phone: 15,
      confidence: 70, verification: 10, minEntities: 10,
    },
  },
};


/* ── Profile resolver ── */

export function getSectorProfile(sectorKey) {
  const custom = SECTOR_PROFILES[sectorKey];
  if (!custom) return { ...DEFAULT_PROFILE };
  return {
    ...DEFAULT_PROFILE,
    ...custom,
    priorityWeights: custom.priorityWeights || DEFAULT_PROFILE.priorityWeights,
    readinessWeights: custom.readinessWeights || DEFAULT_PROFILE.readinessWeights,
    blockerThresholds: custom.blockerThresholds || DEFAULT_PROFILE.blockerThresholds,
    contactRelevance: custom.contactRelevance || DEFAULT_PROFILE.contactRelevance,
  };
}

/* ── Check if a sector has a custom profile ── */

export function hasCustomProfile(sectorKey) {
  return sectorKey in SECTOR_PROFILES;
}
