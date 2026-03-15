const fs = require('fs');

const groupKeys = ['food-beverage','real-estate-housing','health-beauty','education','events','services','lifestyle','culture','shopping','automotive','finance-gov'];

// 1. analytics.js sectors
const analyticsContent = fs.readFileSync('modules/analytics.js', 'utf8');
const sectorKeys = [...analyticsContent.matchAll(/key:\s*'([^']+)',\s*title:/g)]
  .map(m => m[1])
  .filter(k => groupKeys.indexOf(k) === -1);

// 2. index.html sidebar
const htmlContent = fs.readFileSync('index.html', 'utf8');
const sidebarKeys = [...htmlContent.matchAll(/href="#\/sector\/([^"]+)"/g)].map(m => m[1]);

// 3. sector-ops.js descriptions
const opsContent = fs.readFileSync('modules/sector-ops.js', 'utf8');
const descBlock = opsContent.match(/STATIC_DESCRIPTIONS\s*=\s*\{([\s\S]*?)\};/);
const descKeys = descBlock ? [...descBlock[1].matchAll(/(?:'([^']+)'|([a-zA-Z][\w-]*))\s*:/g)].map(m => m[1] || m[2]) : [];

// 4. master.json
const data = JSON.parse(fs.readFileSync('master.json', 'utf8'));
const masterSectors = [...new Set(data.records.map(r => r.sector))];

const analyticsSet = new Set(sectorKeys);
const sidebarSet = new Set(sidebarKeys);
const descSet = new Set(descKeys);

console.log('=== analytics.js: ' + sectorKeys.length + ' sectors ===');
console.log(sectorKeys.sort().join(', '));
console.log('\n=== index.html sidebar: ' + sidebarKeys.length + ' sectors ===');
console.log(sidebarKeys.sort().join(', '));
console.log('\n=== sector-ops.js descriptions: ' + descKeys.length + ' keys ===');
console.log(descKeys.sort().join(', '));

console.log('\n=== SYNC CHECK ===');
const missingInSidebar = sectorKeys.filter(k => !sidebarSet.has(k));
const missingInAnalytics = sidebarKeys.filter(k => !analyticsSet.has(k));
const missingDesc = sectorKeys.filter(k => !descSet.has(k));
const newSectors = sectorKeys.filter(k => masterSectors.indexOf(k) === -1);

if (missingInSidebar.length) console.log('IN analytics but NOT in sidebar:', missingInSidebar);
if (missingInAnalytics.length) console.log('IN sidebar but NOT in analytics:', missingInAnalytics);
if (missingDesc.length) console.log('Missing descriptions:', missingDesc);

console.log('\nNew sectors (structural only, no data):', newSectors.length ? newSectors.join(', ') : 'none');
console.log('master.json sectors:', masterSectors.length);
console.log('master.json records:', data.records.length);

if (missingInSidebar.length === 0 && missingInAnalytics.length === 0 && missingDesc.length === 0) {
  console.log('\nALL 3 FILES SYNCHRONIZED SUCCESSFULLY');
} else {
  console.log('\nSYNC ISSUES DETECTED - fix required');
}
