// ─── modules/filters.js ───
// Record filtering, active filter display, and result rendering helpers.

import { state } from './state.js';
import { STATUS_AR } from './constants.js';
import { esc } from './utils.js';
import { displayFlag, displayConfidence, badge } from './display.js';

/* ── Core filter function ── */

export function filterRecords(records = state.records) {
  return records.filter(r => {
    if (state.filters.status && r.status !== state.filters.status) return false;
    if (state.filters.district && r.district !== state.filters.district) return false;
    if (state.filters.confidence && r.confidence !== state.filters.confidence) return false;
    if (state.filters.specialty && r._norm.specialty_coffee !== state.filters.specialty) return false;
    if (state.filters.desserts && r._norm.desserts !== state.filters.desserts) return false;
    if (state.filters.work && r._norm.work_friendly !== state.filters.work) return false;
    if (state.filters.groups && r._norm.group_friendly !== state.filters.groups) return false;
    if (state.filters.late && r._norm.late_night !== state.filters.late) return false;
    return true;
  });
}

/* ── Active filters summary ── */

export function activeFilterEntries() {
  const labels = {
    status: 'الحالة', district: 'الحي', confidence: 'الثقة',
    specialty: 'قهوة مختصة', desserts: 'حلويات',
    work: 'مناسب للعمل', groups: 'مناسب للجلسات', late: 'مناسب للسهر',
  };
  return Object.entries(state.filters)
    .filter(([, value]) => value)
    .map(([key, value]) => ({
      key,
      label: labels[key] || key,
      value: key === 'status' ? (STATUS_AR[value] || value)
        : key === 'confidence' ? displayConfidence(value)
        : displayFlag(value),
      raw: value,
    }))
    .map(item => ({
      ...item,
      value: item.key === 'district' ? item.raw : item.value,
    }));
}

/* ── Render active filters UI ── */

export function renderActiveFilters() {
  const active = activeFilterEntries();
  if (!active.length) return '';
  return `
    <div class="active-filters">
      <div class="active-filters-head">
        <strong>الفلاتر النشطة</strong>
        <button class="button subtle" type="button" data-action="clear-filters">مسح الكل</button>
      </div>
      <div class="active-filter-list">
        ${active.map(item => `<button class="filter-chip" type="button" data-action="clear-filter" data-filter-key="${esc(item.key)}">${esc(item.label)}: ${esc(item.value)} <span aria-hidden="true">×</span></button>`).join('')}
      </div>
    </div>
  `;
}

/* ── Empty state and result cards ── */

export function resultEmptyState(title = 'لا توجد نتائج', note = 'جرّب تغيير البحث أو الفلاتر.') {
  return `<div class="empty empty-rich"><strong>${esc(title)}</strong><p>${esc(note)}</p></div>`;
}

export function resultCards(records) {
  return `
    <div class="results-grid">
      ${records.map(r => `
        <a href="#/entities/${esc(r.slug)}" class="result-card">
          <div class="result-card-top">
            <div>
              <h4>${esc(r.name)}</h4>
              <p>${esc(r.alternate_name || r.short_address || 'داخل بريدة')}</p>
            </div>
            ${badge(r.status)}
          </div>
          <div class="result-card-meta">
            ${r.google_rating ? `<span>${esc(r.google_rating)} ★</span>` : ''}
            ${r.district ? `<span>${esc(r.district)}</span>` : ''}
          </div>
        </a>
      `).join('')}
    </div>
  `;
}
