// ─── modules/ui-helpers.js ───
// Sidebar navigation, DOM helpers, download utilities, data loading, and misc UI functions.

import { state } from './state.js';
import { DATA_URL } from './state.js';
import { esc, normalizeRecord, uniq } from './utils.js';
import { displayText, badge, displayConfidence, displayFlag } from './display.js';
import { sidebar, sidebarOverlay, sidebarToggle, sidebarClose, navSubtrees, searchInput } from './dom.js';
import { STATUS_AR } from './constants.js';
import {
  getEntity, getDraft, getExportHistory, saveExportHistory,
  upsertStoredItem, editorialDraftEntries, registerPatchExportRecord,
} from './storage.js';
import { attentionQueues, queueHref, entityHref, parseHashRoute, queueViewState, queueTitleByKey, queuePriorityBadge } from './queues.js';
import { importantMissingFields, avgRating } from './analytics.js';
import { bulkWorkspaceState, bulkDecisionValue, bulkDecisionLabel } from './bulk-review.js';

export function isMobileViewport() {
  return window.matchMedia('(max-width: 720px)').matches;
}


export function setSidebarOpen(isOpen) {
  if (!sidebar || !sidebarToggle || !sidebarOverlay) return;
  const open = Boolean(isOpen) && isMobileViewport();
  document.body.classList.toggle('sidebar-open', open);
  sidebar.classList.toggle('is-open', open);
  sidebarToggle.setAttribute('aria-expanded', String(open));
  sidebarOverlay.hidden = !open;
}


export function closeSidebar() {
  setSidebarOpen(false);
}


export function openSidebar() {
  setSidebarOpen(true);
}


export function bindSidebar() {
  sidebarToggle?.addEventListener('click', () => {
    setSidebarOpen(!document.body.classList.contains('sidebar-open'));
  });
  sidebarClose?.addEventListener('click', closeSidebar);
  sidebarOverlay?.addEventListener('click', closeSidebar);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.body.classList.contains('sidebar-open')) closeSidebar();
  });
  sidebar?.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      if (isMobileViewport()) closeSidebar();
    });
  });
  window.addEventListener('resize', () => {
    if (!isMobileViewport()) closeSidebar();
    syncMobileNavSections();
  });
}


export function subtreeMatchesHash(tree, hash = location.hash || '#/dashboard') {
  return Array.from(tree.querySelectorAll('a')).some(link => hash.startsWith(link.getAttribute('href')));
}


export function setSubtreeOpen(tree, open) {
  const isOpen = Boolean(open);
  tree.classList.toggle('collapsed', !isOpen);
  tree.classList.toggle('is-collapsed', !isOpen);
  const toggle = tree.querySelector('.nav-parent');
  toggle?.setAttribute('aria-expanded', String(isOpen));
}


export function relevantSubtree() {
  const hash = location.hash || '#/dashboard';
  const directMatch = navSubtrees.find(tree => subtreeMatchesHash(tree, hash));
  if (directMatch) return directMatch;
  if (hash.startsWith('#/sectors')) return navSubtrees[0] || null;
  return null;
}


export function syncMobileNavSections() {
  if (!navSubtrees.length) return;
  const activeTree = relevantSubtree();
  // Auto-expand only the subtree matching the current route; collapse the rest
  navSubtrees.forEach(tree => setSubtreeOpen(tree, tree === activeTree));
}


export function bindMobileNavSections() {
  navSubtrees.forEach((tree, index) => {
    const parent = tree.querySelector('.nav-parent');
    if (!parent) return;
    tree.dataset.subtreeId = `subtree-${index + 1}`;
    tree.id = tree.dataset.subtreeId;
    parent.setAttribute('role', 'button');
    parent.setAttribute('tabindex', '0');
    parent.setAttribute('aria-controls', tree.dataset.subtreeId);
    parent.classList.add('nav-parent-toggle');
    const toggleTree = () => {
      const willOpen = tree.classList.contains('collapsed');
      navSubtrees.forEach(item => setSubtreeOpen(item, item === tree ? willOpen : false));
    };
    parent.addEventListener('click', toggleTree);
    parent.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTree();
      }
    });
  });
  syncMobileNavSections();
}


export function topRatedRecords(records = state.records, limit = 3) {
  return [...records]
    .filter(r => !Number.isNaN(Number(r.google_rating)))
    .sort((a, b) => {
      const ratingDiff = Number(b.google_rating) - Number(a.google_rating);
      if (ratingDiff !== 0) return ratingDiff;
      return Number(b.google_reviews_count || 0) - Number(a.google_reviews_count || 0);
    })
    .slice(0, limit);
}


export function topDistrictGroups(records = state.records, limit = 4) {
  return uniq(records.map(r => (r.district || '').trim()).filter(name => name && name !== 'غير متحقق'))
    .map(name => {
      const items = records.filter(r => (r.district || '').trim() === name);
      return {
        name,
        count: items.length,
        avg: avgRating(items),
        verified: items.filter(r => r.status === 'verified').length,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}


export function entityValueLink(slug, content, className = 'entity-cell-link') {
  return `<a href="#/entities/${esc(slug)}" class="${esc(className)}">${content}</a>`;
}


export function districtHref(district = '') {
  return `#/districts/${encodeURIComponent(district)}`;
}


export function districtLink(district = '', label = '') {
  const value = String(district || '').trim() || 'حي غير محدد';
  return `<a href="${districtHref(value)}" class="entity-cell-link district-link">${esc(label || value)}</a>`;
}


export function entitiesTable(records) {
  return `
    <div class="table-wrap">
      <table class="table table-entities">
        <thead>
          <tr>
            <th>الاسم</th><th>الحالة</th><th>الحي</th><th>الثقة</th><th>التقييم</th><th>المراجعات</th><th>العمل</th><th>الجلسات</th><th>السهر</th>
          </tr>
        </thead>
        <tbody>
          ${records.map(r => `
            <tr class="entity-row">
              <td>${entityValueLink(r.slug, `<span class="button entity-link">${esc(r.name)}</span><div class="note">${esc(r.alternate_name || '')}</div>`, 'entity-name-link')}</td>
              <td>${entityValueLink(r.slug, badge(r.status))}</td>
              <td>${entityValueLink(r.slug, esc(r.district || 'غير متحقق'))}</td>
              <td>${entityValueLink(r.slug, esc(displayConfidence(r.confidence)))}</td>
              <td>${entityValueLink(r.slug, esc(r.google_rating))}</td>
              <td>${entityValueLink(r.slug, esc(r.google_reviews_count))}</td>
              <td>${entityValueLink(r.slug, esc(displayFlag(r._norm.work_friendly)))}</td>
              <td>${entityValueLink(r.slug, esc(displayFlag(r._norm.group_friendly)))}</td>
              <td>${entityValueLink(r.slug, esc(displayFlag(r._norm.late_night)))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}


export function diffRecord(original, updated) {
  const patch = {};
  Object.keys(updated).forEach(key => {
    if (updated[key] !== original[key]) patch[key] = updated[key];
  });
  return patch;
}


export function editableField(label, name, value, type = 'text') {
  if (type === 'textarea') {
    return `<label class="edit-field"><span>${esc(label)}</span><textarea class="field" name="${esc(name)}">${esc(value || '')}</textarea></label>`;
  }
  return `<label class="edit-field"><span>${esc(label)}</span><input class="field" type="${esc(type)}" name="${esc(name)}" value="${esc(value || '')}" /></label>`;
}


export function cleanGoogleMapsName(text = '') {
  return decodeURIComponent(String(text || ''))
    .replace(/^.*\/place\//, '')
    .replace(/\/.*$/, '')
    .replace(/\+/g, ' ')
    .replace(/\s*\|\s*/g, ' | ')
    .trim();
}


export function normalizeSpaces(text = '') {
  return String(text || '').replace(/\s+/g, ' ').trim();
}


export function extractGoogleMapsDraft(urlInput, rawTextInput = '') {
  const url = String(urlInput || '').trim();
  const rawText = String(rawTextInput || '').trim();
  const combined = `${url}\n${rawText}`.trim();
  if (!combined) return {};

  const draft = {};
  if (url) draft.reference_url = url;

  const nameMatch = url.match(/\/place\/([^/?#]+)/i);
  if (nameMatch) {
    const parsedName = cleanGoogleMapsName(nameMatch[1]);
    if (parsedName) draft.name = parsedName;
  }

  const rawLines = rawText.split(/\r?\n/).map(normalizeSpaces).filter(Boolean);
  if (!draft.name && rawLines.length) {
    const firstUsefulLine = rawLines.find(line => line.length > 2 && !/(review|reviews|مراجعة|تقييم|open|يغلق|يفتح|الاتجاهات)/i.test(line));
    if (firstUsefulLine) draft.name = firstUsefulLine;
  }

  const ratingMatch = combined.match(/(?:^|[^\d])(\d\.\d)(?:[^\d]|$)/);
  if (ratingMatch) draft.google_rating = ratingMatch[1];

  const reviewsMatch = combined.match(/([\d,]{1,6})\s*(?:review|reviews|مراجعة|مراجعات|تقييم|تقييمات)/i);
  if (reviewsMatch) draft.google_reviews_count = reviewsMatch[1].replace(/,/g, '');

  const priceMatch = combined.match(/(\$\$\$\$|\$\$\$|\$\$|\$|رخيص|متوسط السعر|مرتفع|باهظ)/i);
  if (priceMatch) draft.price_level = priceMatch[1];

  const plusCodeMatch = combined.match(/([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4})/i);
  if (plusCodeMatch) {
    draft.short_address = plusCodeMatch[1];
  } else if (rawLines.length > 1) {
    const addressLine = rawLines.find(line => /(طريق|شارع|حي|بريدة|النهضة|الريان|البساتين|الصفراء|سلطانة|قرطبة)/.test(line));
    if (addressLine) draft.short_address = addressLine;
  }

  return draft;
}


export function applyImportedDraftToForm(form, imported) {
  Object.entries(imported).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (field && value) field.value = value;
  });
}


export function collectFormData(form) {
  return Object.fromEntries(new FormData(form).entries());
}


export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


export function downloadText(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}


export function exportableBatchPayload(queueKey = 'needs-review') {
  const workspace = bulkWorkspaceState(queueKey);
  return {
    queue: queueKey,
    title: workspace.queueTitle,
    exported_at: new Date().toISOString(),
    finished_at: workspace.session.finishedAt || '',
    counts: workspace.counts,
    summary: workspace.summary,
    decisions: workspace.items.map(item => ({
      slug: item.slug,
      name: item.name,
      district: displayText(item.district),
      reason: attentionQueues()[queueKey].reason(item),
      missing: importantMissingFields(item),
      priority: queuePriorityBadge(item, queueKey),
      decision: bulkDecisionValue(workspace.session, item.slug)?.decision || '',
      decision_label: bulkDecisionLabel(bulkDecisionValue(workspace.session, item.slug)?.decision),
      execution_status: bulkDecisionValue(workspace.session, item.slug)?.executionStatus || '',
      next_action: bulkDecisionValue(workspace.session, item.slug)?.nextAction || '',
      note: bulkDecisionValue(workspace.session, item.slug)?.note || '',
      updated_at: bulkDecisionValue(workspace.session, item.slug)?.updatedAt || '',
    })),
  };
}


export function exportableBatchCsv(queueKey = 'needs-review') {
  const payload = exportableBatchPayload(queueKey);
  const lines = [
    ['slug', 'name', 'district', 'reason', 'missing', 'priority', 'decision', 'execution_status', 'next_action', 'note', 'updated_at'].join(','),
    ...payload.decisions.map(item => [
      item.slug,
      item.name,
      item.district,
      item.reason,
      item.missing.join(' | '),
      item.priority,
      item.decision_label,
      item.execution_status,
      item.next_action,
      item.note,
      item.updated_at,
    ].map(value => `"${String(value || '').replace(/"/g, '""')}"`).join(',')),
  ];
  return lines.join('\n');
}


export function exportableBatchSummary(queueKey = 'needs-review') {
  const payload = exportableBatchPayload(queueKey);
  return [
    `جلسة: ${payload.title}`,
    `تاريخ التصدير: ${payload.exported_at}`,
    `انتهت الجلسة: ${payload.finished_at || 'لم تُنهَ بعد'}`,
    `إجمالي الدفعة: ${payload.counts.total}`,
    `تمت المعالجة: ${payload.summary.decisionCounts.done}`,
    `يحتاج إكمالًا: ${payload.summary.decisionCounts.completion}`,
    `جاهز للمتابعة لاحقًا: ${payload.summary.decisionCounts.followup}`,
    `مؤجل: ${payload.summary.decisionCounts.defer}`,
    `مراجعة أعمق: ${payload.summary.decisionCounts.deep}`,
    '',
    `Resolved in session: ${payload.summary.followup.resolved.map(item => item.name).join('، ') || 'لا يوجد'}`,
    `Needs deeper review: ${payload.summary.followup.deep_review.map(item => item.name).join('، ') || 'لا يوجد'}`,
    `Needs source work: ${payload.summary.followup.needs_source.map(item => item.name).join('، ') || 'لا يوجد'}`,
    `Needs district work: ${payload.summary.followup.needs_district.map(item => item.name).join('، ') || 'لا يوجد'}`,
    `Needs completion: ${payload.summary.followup.needs_completion.map(item => item.name).join('، ') || 'لا يوجد'}`,
  ].join('\n');
}


export function pushExportHistoryEntry(queueKey = 'needs-review', format = 'json') {
  const payload = exportableBatchPayload(queueKey);
  const history = getExportHistory();
  history.unshift({
    id: `${queueKey}-${format}-${Date.now()}`,
    queueKey,
    label: payload.title,
    format,
    exportedAt: payload.exported_at,
    total: payload.counts.total,
    summary: `أُنجز ${payload.summary.decisionCounts.done} • مؤجل ${payload.summary.decisionCounts.defer} • أعمق ${payload.summary.decisionCounts.deep}`,
  });
  saveExportHistory(history);
}


export function queueFileRelativePath() {
  return '../agent_queue/import_queue.json';
}


export function makeQueueRequest(payload = {}) {
  return {
    id: `import-${Date.now()}`,
    created_at: new Date().toISOString(),
    status: 'queued',
    maps_url: String(payload.maps_url || '').trim(),
    raw_text: String(payload.raw_text || '').trim(),
    requested_action: 'import_new_cafe_from_maps',
    notes: String(payload.notes || 'Created from New Cafe in wiki').trim()
  };
}


export async function appendQueueRequestToProject(request) {
  if (!window.showOpenFilePicker) throw new Error('file-system-access-unavailable');
  const [fileHandle] = await window.showOpenFilePicker({
    multiple: false,
    excludeAcceptAllOption: false,
    suggestedName: 'import_queue.json',
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }]
  });
  const file = await fileHandle.getFile();
  const text = await file.text();
  const queue = JSON.parse(text || '{}');
  if (!Array.isArray(queue.requests)) queue.requests = [];
  queue.updated_at = new Date().toISOString();
  queue.requests.push(request);
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(queue, null, 2));
  await writable.close();
}


export function queueContextForEntity(entity) {
  const { query } = parseHashRoute();
  const queueKey = query.get('queue');
  if (!queueKey || !attentionQueues()[queueKey]) return null;
  const priority = query.get('priority') || state.queuePriority;
  const sort = query.get('sort') || state.queueSort;
  const view = queueViewState(queueKey, { priority, sort });
  const items = view.activeGroup.items;
  const index = items.findIndex(item => item.slug === entity.slug);
  if (index === -1) return null;
  return {
    queueKey,
    queueTitle: queueTitleByKey(queueKey),
    priority: view.activePriority,
    priorityLabel: view.activeGroup.label,
    sort: view.sortMode,
    items,
    index,
    prev: items[index - 1] || null,
    next: items[index + 1] || null,
    reason: attentionQueues()[queueKey].reason(entity),
    returnHref: queueHref(queueKey, { priority: view.activePriority, sort: view.sortMode }),
  };
}


export async function loadData() {
  const res = await fetch(DATA_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load ${DATA_URL}`);
  state.raw = await res.json();
  const records = Array.isArray(state.raw.records) ? state.raw.records : [];
  state.records = records.map(normalizeRecord);
}


export async function refreshAgentRuntimeInfo() {
  try {
    const res = await fetch('./api/runtime/health', { cache: 'no-store' });
    if (!res.ok) throw new Error('runtime unavailable');
    state.agentRuntime = await res.json();
  } catch (error) {
    state.agentRuntime = {
      ok: false,
      available: false,
      mode: 'unavailable',
      label: 'غير متاح',
      note: 'لا يوجد proxy runtime نشط حاليًا، وسيبقى الوكيل على الوضع المحلي فقط.',
    };
  }
}

