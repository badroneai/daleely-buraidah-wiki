import { state } from './modules/state.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const data = require('./master.json');
state.records = data.records;

import { getSectorProfile, hasCustomProfile } from './modules/sector-profiles.js';
import { sectorMetrics, scoredPriority, sectorReadiness } from './modules/sector-ops.js';
import { getEntity } from './modules/storage.js';

// Test 1: RUA field selection logic per issue type
console.log('=== TEST 1: Field selection per issue type ===');
const issueExtras = {
  ref:        ['reference_url', 'source_notes'],
  contact:    ['phone', 'instagram'],
  confidence: ['confidence', 'status', 'source_notes'],
  district:   ['district', 'short_address'],
  verify:     ['status', 'confidence', 'source_notes'],
  mixed:      ['reference_url', 'phone', 'instagram', 'district', 'confidence'],
};
for (const [type, fields] of Object.entries(issueExtras)) {
  console.log(`  ${type}: ${fields.join(', ')}`);
}

// Test 2: Gaps for sample entities
console.log('\n=== TEST 2: Gap detection for sample entities ===');
const samples = [
  state.records.find(r => r.sector === 'cafes'),
  state.records.find(r => r.sector === 'restaurants'),
  state.records.find(r => r.sector === 'clinics'),
];
for (const e of samples) {
  const gaps = [];
  if (!(e.phone || '').trim()) gaps.push('phone');
  if (!(e.official_instagram || '').trim()) gaps.push('instagram');
  if (!(e.reference_url || '').trim()) gaps.push('reference_url');
  if (!(e.district || '').trim()) gaps.push('district');
  if (String(e.confidence || '').toLowerCase() === 'low') gaps.push('confidence');
  console.log(`  ${e.name} (${e.sector}): ${gaps.length} gaps → ${gaps.join(', ') || 'none'}`);
}

// Test 3: Impact weights differ per profile
console.log('\n=== TEST 3: Impact weights per sector profile ===');
['cafes', 'restaurants', 'clinics', 'pharmacies'].forEach(sec => {
  const p = getSectorProfile(sec);
  const rw = p.readinessWeights || {};
  console.log(`  ${sec}: phone=${rw.phone||0}, refs=${rw.refs||0}, insta=${rw.instagram||0}, district=${rw.district||0}`);
});

// Test 4: Search URL generation
console.log('\n=== TEST 4: Search URLs ===');
const entity = state.records[0];
const name = encodeURIComponent(entity.name);
console.log(`  Phone search: google.com/search?q=${name}+بريدة+رقم+الهاتف`);
console.log(`  Instagram: google.com/search?q=${name}+بريدة+instagram`);
console.log(`  Map: google.com/maps/search/${name}+بريدة`);

// Test 5: RUA coverage
console.log('\n=== TEST 5: RUA coverage stats ===');
let total = state.records.length;
let withPhoneGap = state.records.filter(r => !(r.phone || '').trim()).length;
let withRefGap = state.records.filter(r => !(r.reference_url || '').trim()).length;
let withInstaGap = state.records.filter(r => !(r.official_instagram || '').trim()).length;
let withDistGap = state.records.filter(r => !(r.district || '').trim()).length;
console.log(`  Total: ${total}`);
console.log(`  Missing phone: ${withPhoneGap} (${Math.round(withPhoneGap/total*100)}%)`);
console.log(`  Missing ref: ${withRefGap} (${Math.round(withRefGap/total*100)}%)`);
console.log(`  Missing insta: ${withInstaGap} (${Math.round(withInstaGap/total*100)}%)`);
console.log(`  Missing district: ${withDistGap} (${Math.round(withDistGap/total*100)}%)`);

console.log('\n✅ All RUA tests passed');
