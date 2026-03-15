// ─── modules/dom.js ───
// Cached DOM element references used across the application.

export const app = document.getElementById('app');
export const pageTitle = document.getElementById('pageTitle');
export const breadcrumbs = document.getElementById('breadcrumbs');
export const searchInput = document.getElementById('globalSearch');
export const searchButton = document.getElementById('globalSearchButton');
export const sidebar = document.getElementById('appSidebar');
export const sidebarToggle = document.getElementById('sidebarToggle');
export const sidebarClose = document.getElementById('sidebarClose');
export const sidebarOverlay = document.getElementById('sidebarOverlay');
export const navSubtrees = Array.from(document.querySelectorAll('.nav-subtree'));
