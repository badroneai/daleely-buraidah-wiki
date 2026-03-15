// ─── modules/sidebar.js ───
// Sidebar open/close logic and mobile nav section accordion.

import {
  sidebar,
  sidebarToggle,
  sidebarClose,
  sidebarOverlay,
  navSubtrees,
} from './dom.js';

/* ── viewport helper ── */
export function isMobileViewport() {
  return window.innerWidth < 900;
}

/* ── sidebar open / close ── */
export function setSidebarOpen(isOpen) {
  sidebar.classList.toggle('open', isOpen);
  sidebarOverlay.hidden = !isOpen;
  sidebarToggle.setAttribute('aria-expanded', String(isOpen));
  document.body.classList.toggle('sidebar-open', isOpen);
}

export function closeSidebar() {
  setSidebarOpen(false);
}

export function openSidebar() {
  setSidebarOpen(true);
}

export function bindSidebar() {
  sidebarToggle.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('open');
    setSidebarOpen(!isOpen);
  });
  sidebarClose.addEventListener('click', closeSidebar);
  sidebarOverlay.addEventListener('click', closeSidebar);
}

/* ── nav-subtree accordion (works on both mobile and desktop) ── */
function subtreeMatchesHash(tree, hash) {
  return Array.from(tree.querySelectorAll('a.nav-child')).some(a =>
    hash.startsWith(a.getAttribute('href')),
  );
}

function setSubtreeOpen(tree, open) {
  tree.classList.toggle('collapsed', !open);
  tree.classList.toggle('expanded', open);
  const toggle = tree.querySelector('.nav-parent-toggle');
  if (toggle) toggle.setAttribute('aria-expanded', String(open));
}

function relevantSubtree() {
  const hash = location.hash || '#/dashboard';
  return navSubtrees.find(t => subtreeMatchesHash(t, hash)) || null;
}

export function syncMobileNavSections() {
  const active = relevantSubtree();
  // On mobile: collapse all except active. On desktop: only auto-expand active.
  if (isMobileViewport()) {
    navSubtrees.forEach(t => setSubtreeOpen(t, t === active));
  } else {
    // On desktop, auto-expand the relevant subtree if collapsed
    if (active && active.classList.contains('collapsed')) {
      setSubtreeOpen(active, true);
    }
  }
}

export function bindMobileNavSections() {
  navSubtrees.forEach(tree => {
    const parent = tree.querySelector('.nav-parent-toggle');
    if (!parent) return;
    parent.addEventListener('click', (e) => {
      e.preventDefault();
      const isOpen = tree.classList.contains('expanded');
      // On mobile: only one can be open. On desktop: toggle individually.
      if (isMobileViewport()) {
        navSubtrees.forEach(t => setSubtreeOpen(t, false));
        if (!isOpen) setSubtreeOpen(tree, true);
      } else {
        setSubtreeOpen(tree, !isOpen);
      }
    });
  });
  window.addEventListener('hashchange', syncMobileNavSections);
}
