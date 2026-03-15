// ─── modules/storage.js ───
// localStorage persistence layer — storage keys, CRUD helpers, draft/export registration.

import { state } from './state.js';
import { importantMissingFields } from './analytics.js';

/* ── Storage key definitions ── */

export function exportHistoryStorageKey() { return 'daleelyReviewExports'; }
export function editorialDraftsStorageKey() { return 'daleelyEditorialDrafts'; }
export function patchConsoleStorageKey() { return 'daleelyPatchConsole'; }
export function importConsoleStorageKey() { return 'daleelyImportConsole'; }
export function evidenceLabStorageKey() { return 'daleelyEvidenceLab'; }
export function verificationSessionStorageKey() { return 'daleelyVerificationSessions'; }
export function verificationDecisionStorageKey() { return 'daleelyVerificationDecisions'; }
export function agentDraftStorageKey() { return 'daleelyAgentDrafts'; }
export function verificationDraftStorageKey() { return 'daleelyVerificationDrafts'; }
export function agentRunHistoryStorageKey() { return 'daleelyAgentRuns'; }
export function savedAgentBatchStorageKey() { return 'daleelySavedAgentBatches'; }
export function missionRegistryStorageKey() { return 'daleelyMissionRegistry'; }
export function missionSessionStorageKey() { return 'daleelyMissionSessions'; }

/* ── Core CRUD helpers ── */

export function getStoredList(key) {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function saveStoredList(key, items = []) {
  localStorage.setItem(key, JSON.stringify(items.slice(0, 40)));
}

export function upsertStoredItem(key, item, idField = 'id') {
  const list = getStoredList(key);
  const index = list.findIndex(entry => entry[idField] === item[idField]);
  if (index >= 0) list[index] = { ...list[index], ...item };
  else list.unshift(item);
  saveStoredList(key, list);
}

/* ── Export history ── */

export function getExportHistory() { return getStoredList(exportHistoryStorageKey()); }

export function saveExportHistory(items = []) {
  localStorage.setItem(exportHistoryStorageKey(), JSON.stringify(items.slice(0, 30)));
}

/* ── Entity helpers ── */

export function getEntity(slug) {
  return state.records.find(r => r.slug === slug);
}

export function emptyNewCafeRecord() {
  return {
    slug: 'new-cafe-draft', name: '', alternate_name: '', district: '', short_address: '',
    google_maps_url: '', reference_url: '', official_instagram: '', google_rating: '',
    google_reviews_count: '', confidence: 'low', status: 'discovered', sector: 'cafes',
    specialty_coffee: 'unknown', desserts: 'unknown', work_friendly: 'unknown',
    group_friendly: 'unknown', late_night: 'unknown', family_friendly: 'unknown',
    indoor_seating: 'unknown', outdoor_seating: 'unknown', parking: 'unknown',
    editorial_summary: '', place_personality: '', why_choose_it: '', not_for_whom: '',
    source_notes: '', last_verified_at: '', last_updated_at: '',
  };
}

/* ── Draft management ── */

export function draftKey(slug) { return `daleelyDraft:${slug}`; }

export function getDraft(slug) {
  try { return JSON.parse(localStorage.getItem(draftKey(slug)) || 'null'); }
  catch { return null; }
}

export function saveDraft(slug, payload, meta = {}) {
  localStorage.setItem(draftKey(slug), JSON.stringify(payload));
  registerDraftSnapshot(slug, payload, meta);
}

/* ── Editorial readiness ── */

export function editorialReadiness(payload = {}) {
  const missing = importantMissingFields(payload);
  if (!String(payload.name || '').trim()) return { key: 'not-ready', label: 'غير جاهزة', note: 'ما زالت تفتقد اسمًا أو أساسيات أولية.' };
  if (missing.length >= 3) return { key: 'needs-completion', label: 'تحتاج إكمال', note: `ينقصها: ${missing.join('، ')}` };
  if (missing.length === 0) return { key: 'export-ready', label: 'جاهزة للتصدير', note: 'الأساسيات مكتملة ويمكن تجهيز patch أو متابعة تنفيذية.' };
  if (missing.length <= 2) return { key: 'review-ready', label: 'جاهزة للمراجعة', note: `بقي عليها: ${missing.join('، ')}` };
  return { key: 'draft-only', label: 'مسودة فقط', note: 'ما زالت في مرحلة تحرير أولية.' };
}

export function editorialStatusTone(status = '') {
  return ({
    'draft-only': 'muted', 'review-ready': 'queue', 'follow-up-needed': 'warning',
    'export-ready': 'success', 'not-ready': 'warning', 'needs-completion': 'gold',
    'queued': 'queue', 'imported-to-form': 'success', 'fallback-exported': 'warning',
  }[status] || 'muted');
}

/* ── Draft/export registration ──
   NOTE: registerDraftSnapshot calls entityQueueReasons from queues.js.
   To avoid circular imports, entityQueueReasons is injected lazily via setQueueReasonsProvider(). */

let _entityQueueReasons = () => [];

export function setQueueReasonsProvider(fn) {
  _entityQueueReasons = fn;
}

export function registerDraftSnapshot(slug, payload = {}, meta = {}) {
  const readiness = editorialReadiness(payload);
  const baseEntity = getEntity(slug) || {};
  upsertStoredItem(editorialDraftsStorageKey(), {
    id: slug, slug, name: payload.name || baseEntity.name || 'مسودة بلا اسم',
    updatedAt: new Date().toISOString(), status: meta.status || readiness.key,
    statusLabel: meta.statusLabel || readiness.label, readiness: readiness.key,
    readinessLabel: readiness.label, note: meta.note || readiness.note,
    missing: importantMissingFields(payload),
    queueTitles: _entityQueueReasons({ ...baseEntity, ...payload, slug }).map(item => item.title),
    source: meta.source || 'manual-edit',
  }, 'id');
}

export function registerPatchExportRecord(item = {}) {
  upsertStoredItem(patchConsoleStorageKey(), {
    id: item.id, slug: item.slug, name: item.name,
    exportedAt: item.exportedAt || new Date().toISOString(),
    mode: item.mode || 'update', changeCount: item.changeCount || 0,
    readiness: item.readiness || 'export-ready', note: item.note || '',
    status: item.status || 'pending-review',
  }, 'id');
}

export function registerImportRecord(item = {}) {
  upsertStoredItem(importConsoleStorageKey(), {
    id: item.id, slug: item.slug || '', name: item.name || '',
    createdAt: item.createdAt || new Date().toISOString(),
    type: item.type || 'request', status: item.status || 'queued',
    note: item.note || '', source: item.source || 'editorial-workbench',
  }, 'id');
}

/* ── Entry accessors ── */

export function editorialDraftEntries() { return getStoredList(editorialDraftsStorageKey()); }
export function patchConsoleEntries() { return getStoredList(patchConsoleStorageKey()); }
export function importConsoleEntries() { return getStoredList(importConsoleStorageKey()); }

export function agentDraftEntries() {
  return getStoredList(agentDraftStorageKey())
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
}

export function verificationDraftEntries() {
  return getStoredList(verificationDraftStorageKey())
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

export function agentRunHistoryEntries() {
  return getStoredList(agentRunHistoryStorageKey())
    .sort((a, b) => String(b.startedAt || '').localeCompare(String(a.startedAt || '')));
}

export function savedAgentBatchEntries() {
  return getStoredList(savedAgentBatchStorageKey())
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

/* ── Mission storage accessors ── */

export function missionEntries() {
  return getStoredList(missionRegistryStorageKey())
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

export function missionSessions() {
  return getStoredList(missionSessionStorageKey())
    .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
}

/* ── Mission label helpers ── */

export function missionSessionStatusLabel(status = '') {
  return ({
    open: 'مفتوحة', active: 'جارية', blocked: 'متوقفة',
    handoff: 'بانتظار تسليم', completed: 'مكتملة',
  }[status] || 'قيد العمل');
}

export function missionSessionStatusTone(status = '') {
  return ({
    open: 'muted', active: 'queue', blocked: 'warning',
    handoff: 'gold', completed: 'success',
  }[status] || 'muted');
}

export function missionAttemptOutcomeLabel(outcome = '') {
  return ({
    success: 'نجحت', partial: 'جزئية', blocked: 'تعذرت',
    followup: 'تحتاج متابعة', unresolved: 'غير محسومة',
  }[outcome] || 'غير محددة');
}

export function missionAttemptOutcomeTone(outcome = '') {
  return ({
    success: 'success', partial: 'queue', blocked: 'warning',
    followup: 'gold', unresolved: 'muted',
  }[outcome] || 'muted');
}

export function missionStatusLabel(status = '') {
  return ({
    open: 'مفتوحة', in_progress: 'قيد التنفيذ', blocked: 'متوقفة',
    ready_to_close: 'جاهزة للإغلاق', handoff: 'تحتاج تسليمًا', closed: 'مغلقة',
  }[status] || 'قيد العمل');
}

export function missionStatusTone(status = '') {
  return ({
    open: 'muted', in_progress: 'queue', blocked: 'warning',
    ready_to_close: 'success', handoff: 'gold', closed: 'success',
  }[status] || 'muted');
}
