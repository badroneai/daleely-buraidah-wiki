// ─── modules/utils.js ───
// Pure-ish utility helpers. normalizeFlag writes to state.issues as a side-effect.

import { state } from './state.js';
import { CANONICAL_DISTRICTS, DISTRICT_ALIASES } from './constants.js';

export function esc(v = '') {
  return String(v).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]),
  );
}

export function uniq(arr) {
  return [...new Set(arr)];
}

// ─── توحيد اسم الحي إلى الاسم الرسمي المعتمد ───
export function normalizeDistrict(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return '';
  return DISTRICT_ALIASES[trimmed] || trimmed;
}

export function isCanonicalDistrict(name) {
  return CANONICAL_DISTRICTS.includes(normalizeDistrict(name));
}

export function normalizeFlag(value, fieldName = '') {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw || raw === 'unknown') return 'unknown';
  if (['yes', 'true'].includes(raw)) return 'yes';
  if (['no', 'false'].includes(raw)) return 'no';
  if (['partial', 'mixed'].includes(raw)) return 'partial';
  state.issues.push(`normalize:${fieldName}:${value}`);
  return 'unknown';
}

export function normalizeRecord(record) {
  const normalized = {
    ...record,
    _norm: {
      work_friendly: normalizeFlag(record.work_friendly, 'work_friendly'),
      group_friendly: normalizeFlag(record.group_friendly, 'group_friendly'),
      late_night: normalizeFlag(record.late_night, 'late_night'),
      specialty_coffee: normalizeFlag(record.specialty_coffee, 'specialty_coffee'),
      desserts: normalizeFlag(record.desserts, 'desserts'),
      family_friendly: normalizeFlag(record.family_friendly, 'family_friendly'),
      indoor_seating: normalizeFlag(record.indoor_seating, 'indoor_seating'),
      outdoor_seating: normalizeFlag(record.outdoor_seating, 'outdoor_seating'),
      parking: normalizeFlag(record.parking, 'parking'),
    },
  };
  return normalized;
}
