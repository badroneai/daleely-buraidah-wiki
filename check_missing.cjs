const d = require('./master.json');
const recs = d.records || d;
const fields = ['phone','short_address','hours_summary','official_instagram','editorial_summary','reference_url','district'];
const missing = {};
fields.forEach(f => missing[f] = 0);
for (const r of recs) {
  for (const f of fields) {
    if (!r[f] || String(r[f]).trim() === '') missing[f]++;
  }
}
console.log('Total records:', recs.length);
console.log('\nMissing fields:');
for (const [k, v] of Object.entries(missing)) {
  console.log('  ' + k + ': ' + v + ' / ' + recs.length + ' (' + Math.round(v / recs.length * 100) + '%)');
}

// Also check per-sector completeness for top 5 worst sectors
const bySector = {};
for (const r of recs) {
  const s = r.sector || 'unknown';
  if (!bySector[s]) bySector[s] = { total: 0, missingPhone: 0, missingAddress: 0, missingHours: 0 };
  bySector[s].total++;
  if (!r.phone || String(r.phone).trim() === '') bySector[s].missingPhone++;
  if (!r.short_address || String(r.short_address).trim() === '') bySector[s].missingAddress++;
  if (!r.hours_summary || String(r.hours_summary).trim() === '') bySector[s].missingHours++;
}
console.log('\nSectors with most missing phones:');
Object.entries(bySector)
  .sort((a,b) => b[1].missingPhone - a[1].missingPhone)
  .slice(0,10)
  .forEach(([s, d]) => console.log('  ' + s + ': ' + d.missingPhone + '/' + d.total));
