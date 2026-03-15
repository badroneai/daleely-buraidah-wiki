// ─── modules/display.js ───
// Display helper functions for badges, chips, and formatted values.

import { STATUS_AR, FLAG_AR, CONFIDENCE_AR, LEVEL_AR, PRICE_AR } from './constants.js';
import { pageTitle, breadcrumbs } from './dom.js';
import { esc } from './utils.js';

export function setMeta(title, trail) {
  pageTitle.textContent = title;
  breadcrumbs.textContent = trail;
  document.querySelectorAll('.nav-group a').forEach(a => {
    a.classList.toggle('active', location.hash.startsWith(a.getAttribute('href')));
  });
}

export function badge(status) {
  return `<span class="badge ${esc(status)}">${esc(STATUS_AR[status] || status)}</span>`;
}

export function chip(label, value) {
  return `<span class="chip"><strong>${esc(label)}:</strong> ${esc(value)}</span>`;
}

export function displayFlag(value) {
  return FLAG_AR[value] || value || '—';
}

export function displayConfidence(value) {
  return CONFIDENCE_AR[value] || value || '—';
}

export function displayLevel(value) {
  return LEVEL_AR[String(value || '').trim().toLowerCase()] || value || 'غير متحقق';
}

export function displayPrice(value) {
  return PRICE_AR[String(value || '').trim()] || value || 'غير متحقق';
}

export function displayText(value, fallback = 'غير متحقق') {
  return String(value || '').trim() || fallback;
}
