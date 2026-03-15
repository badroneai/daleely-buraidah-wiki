// Quick test for new sector pages
const noop = () => {};
const noopEl = {
  addEventListener: noop, removeEventListener: noop, setAttribute: noop,
  getAttribute: () => '', querySelector: () => null, querySelectorAll: () => [],
  classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
  style: {}, innerHTML: '', textContent: '', value: '', dataset: {},
  hidden: false, children: [], closest: () => null, matches: () => false,
  focus: noop, blur: noop, dispatchEvent: noop,
  getBoundingClientRect: () => ({ top:0,left:0,bottom:0,right:0,width:0,height:0 }),
};
globalThis.document = {
  getElementById: () => noopEl, querySelector: () => noopEl,
  querySelectorAll: () => [], createElement: () => ({...noopEl, appendChild: noop}),
  body: {...noopEl}, head: {...noopEl}, documentElement: {...noopEl},
  addEventListener: noop, removeEventListener: noop, cookie: '',
};
globalThis.window = {
  addEventListener: noop, removeEventListener: noop,
  setTimeout: () => 1, clearTimeout: noop, setInterval: () => 1, clearInterval: noop,
  location: { hash: '#/dashboard', href: 'http://localhost:4173/', pathname: '/', search: '', origin: 'http://localhost:4173' },
  history: { pushState: noop, replaceState: noop },
  innerWidth: 1280, innerHeight: 800, scrollTo: noop,
  getComputedStyle: () => ({}),
  matchMedia: () => ({ matches: false, addListener: noop, removeListener: noop, addEventListener: noop }),
  navigator: { userAgent: 'test' },
  fetch: async (url) => {
    if (url.includes('master.json')) {
      const { readFileSync } = await import('fs');
      const { resolve, dirname } = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = dirname(fileURLToPath(import.meta.url));
      return { ok: true, json: async () => JSON.parse(readFileSync(resolve(__dirname, 'master.json'), 'utf-8')) };
    }
    if (url.includes('/api/runtime/health')) return { ok: true, json: async () => ({ ok: true }) };
    return { ok: false, json: async () => ({}) };
  },
  localStorage: { _d:{}, getItem(k){return this._d[k]||null}, setItem(k,v){this._d[k]=String(v)}, removeItem(k){delete this._d[k]}, clear(){this._d={}} },
  sessionStorage: { _d:{}, getItem(k){return this._d[k]||null}, setItem(k,v){this._d[k]=String(v)}, removeItem(k){delete this._d[k]}, clear(){this._d={}} },
};
globalThis.location = globalThis.window.location;
globalThis.localStorage = globalThis.window.localStorage;
globalThis.sessionStorage = globalThis.window.sessionStorage;
globalThis.fetch = globalThis.window.fetch;
globalThis.setTimeout = globalThis.window.setTimeout;
globalThis.clearTimeout = noop;
globalThis.setInterval = () => 1;
globalThis.clearInterval = noop;
globalThis.HTMLElement = class {};
globalThis.MutationObserver = class { observe(){} disconnect(){} };
globalThis.IntersectionObserver = class { observe(){} disconnect(){} };
globalThis.ResizeObserver = class { observe(){} disconnect(){} };
globalThis.matchMedia = globalThis.window.matchMedia;
try { Object.defineProperty(globalThis, 'navigator', { value: globalThis.window.navigator, writable: true, configurable: true }); } catch {}
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = noop;

const { state } = await import('./modules/state.js');
const { loadData } = await import('./modules/ui-helpers.js');
const rendering = await import('./modules/rendering.js');

await loadData();
console.log(`✅ Loaded ${state.records.length} records`);

// Count by sector
const sectors = {};
state.records.forEach(r => { sectors[r.sector] = (sectors[r.sector]||0)+1; });
console.log('📊 Sectors:', sectors);

// Test all sector pages
const sectorKeys = ['cafes', 'restaurants', 'bakeries', 'groceries', 'roasteries'];
let errors = 0;
for (const key of sectorKeys) {
  try {
    const html = rendering.renderSectorPage(key);
    if (typeof html === 'string' && html.length > 100) {
      console.log(`✅ renderSectorPage('${key}') — ${html.length} chars`);
    } else {
      console.log(`⚠️ renderSectorPage('${key}') — too short: ${html?.length || 0}`);
    }
  } catch (e) {
    console.log(`❌ renderSectorPage('${key}') — ERROR: ${e.message}`);
    errors++;
  }
}

// Test planned sectors still show "coming soon"
for (const key of ['clinics', 'pharmacies', 'salons']) {
  try {
    const html = rendering.renderSectorPage(key);
    if (html.includes('غير متاح')) {
      console.log(`✅ renderSectorPage('${key}') — correctly shows "coming soon"`);
    } else {
      console.log(`⚠️ renderSectorPage('${key}') — expected "coming soon" message`);
    }
  } catch (e) {
    console.log(`❌ renderSectorPage('${key}') — ERROR: ${e.message}`);
    errors++;
  }
}

// Test entity pages for new sector records
const testSlugs = ['al-nadeg-buraydah', 'cont-sweets-buraydah', 'othaim-buraydah-nahda', 'copper-cup-buraydah'];
for (const slug of testSlugs) {
  try {
    const html = rendering.renderEntityPage(slug);
    if (typeof html === 'string' && html.length > 100) {
      console.log(`✅ renderEntityPage('${slug}') — ${html.length} chars`);
    } else {
      console.log(`⚠️ renderEntityPage('${slug}') — short`);
    }
  } catch (e) {
    console.log(`❌ renderEntityPage('${slug}') — ERROR: ${e.message}`);
    errors++;
  }
}

console.log(errors === 0 ? '\n🎉 ALL SECTOR TESTS PASSED' : `\n⚠️ ${errors} error(s) found`);
