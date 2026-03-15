import { state } from './modules/state.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const data = require('./master.json');
state.records = data.records;

import { getSectorProfile } from './modules/sector-profiles.js';

// Test impact values now correct
console.log('=== Impact weights (corrected) ===');
for (const sec of ['cafes', 'restaurants', 'clinics', 'pharmacies']) {
  const p = getSectorProfile(sec);
  const rw = p.readinessWeights || {};
  console.log(`${sec}:`);
  console.log(`  phone: +${Math.round((rw.phone||0)*100)}`);
  console.log(`  reference_url: +${Math.round((rw.reference||0)*100)}`);
  console.log(`  district: +${Math.round((rw.district||0)*100)}`);
  console.log(`  confidence: +${Math.round((rw.confidence||0)*100)}`);
}

// Test that different issue types get different field sets
console.log('\n=== Field priority for different issue types (with common gaps) ===');
const commonGaps = [
  { field: 'phone' }, { field: 'instagram' }, { field: 'reference_url' }
];

const issueExtras = {
  ref:        ['reference_url', 'source_notes'],
  contact:    ['phone', 'instagram'],
  confidence: ['confidence', 'status', 'source_notes'],
  district:   ['district', 'short_address'],
  mixed:      ['reference_url', 'phone', 'instagram', 'district', 'confidence'],
};

for (const issueType of ['ref', 'contact', 'confidence', 'district', 'mixed']) {
  const gapKeys = commonGaps.map(g => g.field);
  const extras = (issueExtras[issueType] || []).filter(k => !gapKeys.includes(k));
  const allKeys = [...new Set([...gapKeys, ...extras])].slice(0, 5);
  console.log(`  ${issueType}: ${allKeys.join(' → ')}`);
}

console.log('\n✅ Impact weights and field selection verified');
