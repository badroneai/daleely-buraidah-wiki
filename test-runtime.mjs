// Minimal DOM shim for testing modules that use document/window
const noop = () => {};
const noopEl = {
  addEventListener: noop,
  removeEventListener: noop,
  setAttribute: noop,
  getAttribute: () => '',
  querySelector: () => null,
  querySelectorAll: () => [],
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  style: {},
  innerHTML: '',
  textContent: '',
  value: '',
  dataset: {},
  checked: false,
  hidden: false,
  children: [],
  parentElement: null,
  closest: () => null,
  matches: () => false,
  focus: noop,
  blur: noop,
  click: noop,
  dispatchEvent: noop,
  getBoundingClientRect: () => ({ top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }),
  offsetWidth: 0,
  offsetHeight: 0,
  scrollTop: 0,
  scrollLeft: 0,
};

globalThis.document = {
  getElementById: () => noopEl,
  querySelector: () => noopEl,
  querySelectorAll: () => [],
  createElement: (tag) => ({ ...noopEl, tagName: tag.toUpperCase(), appendChild: noop, removeChild: noop }),
  createTextNode: () => noopEl,
  body: { ...noopEl, appendChild: noop },
  head: { ...noopEl, appendChild: noop },
  documentElement: { ...noopEl },
  addEventListener: noop,
  removeEventListener: noop,
  createDocumentFragment: () => ({ ...noopEl, appendChild: noop }),
  cookie: '',
};

globalThis.window = {
  addEventListener: noop,
  removeEventListener: noop,
  setTimeout: (fn) => { /* don't execute */ return 1; },
  clearTimeout: noop,
  setInterval: (fn) => 1,
  clearInterval: noop,
  location: { hash: '#/dashboard', href: 'http://localhost:4173/#/dashboard', pathname: '/', search: '', origin: 'http://localhost:4173', assign: noop, replace: noop },
  history: { pushState: noop, replaceState: noop, back: noop, forward: noop },
  innerWidth: 1280,
  innerHeight: 800,
  scrollTo: noop,
  getComputedStyle: () => ({}),
  matchMedia: () => ({ matches: false, addListener: noop, removeListener: noop, addEventListener: noop }),
  navigator: { userAgent: 'test' },
  fetch: async (url) => {
    // Mock fetch for master.json
    if (url.includes('master.json')) {
      const { readFileSync } = await import('fs');
      const { resolve, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const data = readFileSync(resolve(__dirname, 'master.json'), 'utf-8');
      return { ok: true, json: async () => JSON.parse(data) };
    }
    if (url.includes('/api/runtime/health')) {
      return { ok: true, json: async () => ({ ok: true, available: true, mode: 'mock-proxy' }) };
    }
    return { ok: false, json: async () => ({}) };
  },
  localStorage: {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = String(value); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; },
  },
  sessionStorage: {
    _data: {},
    getItem(key) { return this._data[key] || null; },
    setItem(key, value) { this._data[key] = String(value); },
    removeItem(key) { delete this._data[key]; },
    clear() { this._data = {}; },
  },
  URL: globalThis.URL,
  Blob: class Blob { constructor() {} },
};

globalThis.location = globalThis.window.location;
globalThis.localStorage = globalThis.window.localStorage;
globalThis.sessionStorage = globalThis.window.sessionStorage;
globalThis.fetch = globalThis.window.fetch;
globalThis.setTimeout = globalThis.window.setTimeout;
globalThis.clearTimeout = globalThis.window.clearTimeout;
globalThis.setInterval = globalThis.window.setInterval;
globalThis.clearInterval = globalThis.window.clearInterval;
globalThis.HTMLElement = class HTMLElement {};
globalThis.MutationObserver = class MutationObserver { constructor() {} observe() {} disconnect() {} };
globalThis.IntersectionObserver = class IntersectionObserver { constructor() {} observe() {} disconnect() {} };
globalThis.ResizeObserver = class ResizeObserver { constructor() {} observe() {} disconnect() {} };
globalThis.matchMedia = globalThis.window.matchMedia;
try { Object.defineProperty(globalThis, 'navigator', { value: globalThis.window.navigator, writable: true, configurable: true }); } catch {}
try { Object.defineProperty(globalThis, 'getComputedStyle', { value: globalThis.window.getComputedStyle, writable: true, configurable: true }); } catch {}
globalThis.requestAnimationFrame = (fn) => 1;
globalThis.cancelAnimationFrame = noop;

// Now import all modules
const errors = [];

// chdir not needed

try {
  // Import base modules
  const constants = await import('./modules/constants.js');
  console.log('✅ constants.js — exports:', Object.keys(constants).length);

  const state = await import('./modules/state.js');
  console.log('✅ state.js — exports:', Object.keys(state).length);

  const dom = await import('./modules/dom.js');
  console.log('✅ dom.js — exports:', Object.keys(dom).length);

  const utils = await import('./modules/utils.js');
  console.log('✅ utils.js — exports:', Object.keys(utils).length);

  const display = await import('./modules/display.js');
  console.log('✅ display.js — exports:', Object.keys(display).length);

  const analytics = await import('./modules/analytics.js');
  console.log('✅ analytics.js — exports:', Object.keys(analytics).length);

  const storage = await import('./modules/storage.js');
  console.log('✅ storage.js — exports:', Object.keys(storage).length);

  const verification = await import('./modules/verification.js');
  console.log('✅ verification.js — exports:', Object.keys(verification).length);

  const queues = await import('./modules/queues.js');
  console.log('✅ queues.js — exports:', Object.keys(queues).length);

  const filters = await import('./modules/filters.js');
  console.log('✅ filters.js — exports:', Object.keys(filters).length);

  const agents = await import('./modules/agents.js');
  console.log('✅ agents.js — exports:', Object.keys(agents).length);

  const missions = await import('./modules/missions.js');
  console.log('✅ missions.js — exports:', Object.keys(missions).length);

  const patches = await import('./modules/patches.js');
  console.log('✅ patches.js — exports:', Object.keys(patches).length);

  const bulkReview = await import('./modules/bulk-review.js');
  console.log('✅ bulk-review.js — exports:', Object.keys(bulkReview).length);

  const uiHelpers = await import('./modules/ui-helpers.js');
  console.log('✅ ui-helpers.js — exports:', Object.keys(uiHelpers).length);

  const rendering = await import('./modules/rendering.js');
  console.log('✅ rendering.js — exports:', Object.keys(rendering).length);

  // Test that loadData works
  await uiHelpers.loadData();
  console.log('✅ loadData() — records loaded:', state.state.records?.length || 0);

  // Test rendering functions
  const testRoutes = [
    ['renderDashboard', () => rendering.renderDashboard()],
    ['renderEntitiesPage', () => rendering.renderEntitiesPage()],
    ['renderFiltersPage', () => rendering.renderFiltersPage()],
    ['renderStatusPage', () => rendering.renderStatusPage()],
    ['renderDistrictsPage', () => rendering.renderDistrictsPage('')],
    ['renderBlueprintPage', () => rendering.renderBlueprintPage()],
    ['renderSectorsIndexPage', () => rendering.renderSectorsIndexPage()],
    ['renderSectorPage', () => rendering.renderSectorPage('cafes')],
    ['renderPipelinePage', () => rendering.renderPipelinePage()],
    ['renderGovernancePage', () => rendering.renderGovernancePage()],
    ['renderDiscoveryPage', () => rendering.renderDiscoveryPage()],
    ['renderReviewPage', () => rendering.renderReviewPage()],
    ['renderEditorialControlCenter', () => rendering.renderEditorialControlCenter()],
    ['renderAgentDraftsHub', () => rendering.renderAgentDraftsHub()],
    ['renderAgentOpsConsole', () => rendering.renderAgentOpsConsole('')],
    ['renderVerificationProgramHub', () => rendering.renderVerificationProgramHub()],
    ['renderReleaseReadinessHub', () => rendering.renderReleaseReadinessHub()],
    ['renderReviewOperationsHub', () => rendering.renderReviewOperationsHub()],
    ['renderSearch', () => rendering.renderSearch('test')],
  ];

  // Test entity page with actual slugs
  if (state.state.records?.length) {
    const firstSlug = state.state.records[0].slug;
    testRoutes.push(['renderEntityPage', () => rendering.renderEntityPage(firstSlug)]);
  }

  // Test verification workspace
  testRoutes.push(['renderVerificationWorkspace', () => rendering.renderVerificationWorkspace('source-review')]);

  // Test attention queue pages
  const queueKeys = ['needs-review', 'missing-district', 'missing-source', 'quick-complete', 'new-incomplete', 'low-confidence'];
  for (const key of queueKeys) {
    testRoutes.push([`renderAttentionQueuePage(${key})`, () => rendering.renderAttentionQueuePage(key)]);
  }

  // Test bulk workspace
  testRoutes.push(['renderBulkWorkspace', () => rendering.renderBulkWorkspace('needs-review')]);

  for (const [name, fn] of testRoutes) {
    try {
      const html = fn();
      if (typeof html === 'string' && html.length > 0) {
        console.log(`✅ ${name} — rendered ${html.length} chars`);
      } else {
        console.log(`⚠️ ${name} — returned empty or non-string`);
      }
    } catch (err) {
      console.log(`❌ ${name} — ERROR: ${err.message}`);
      errors.push({ name, error: err.message, stack: err.stack?.split('\n').slice(0, 3).join('\n') });
    }
  }

} catch (err) {
  console.log(`❌ Module import failed: ${err.message}`);
  console.log(err.stack?.split('\n').slice(0, 5).join('\n'));
  errors.push({ name: 'module-import', error: err.message });
}

console.log('\n' + '='.repeat(60));
if (errors.length === 0) {
  console.log('🎉 ALL TESTS PASSED — No JavaScript errors detected');
} else {
  console.log(`⚠️ ${errors.length} ERROR(S) FOUND:`);
  for (const e of errors) {
    console.log(`\n--- ${e.name} ---`);
    console.log(e.error);
    if (e.stack) console.log(e.stack);
  }
}
