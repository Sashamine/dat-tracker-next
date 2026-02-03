const fs = require('fs');
const content = fs.readFileSync('./src/lib/data/holdings-history.ts', 'utf8');

// Find all company histories
const historyPattern = /const (\w+)_HISTORY.*?\n\];/gs;
const matches = [...content.matchAll(historyPattern)];

let results = [];
for (const match of matches) {
  const name = match[1];
  const block = match[0];
  const entries = (block.match(/\{ date:/g) || []).length;
  const withSecUrl = (block.match(/sourceType: ['"]sec-filing['"]/g) || []).length;
  const withAnyUrl = (block.match(/sourceUrl:/g) || []).length;
  
  if (entries > 0) {
    results.push({
      name,
      entries,
      withSecUrl,
      withAnyUrl,
      missing: entries - withSecUrl
    });
  }
}

// Sort by missing (most missing first)
results.sort((a, b) => b.missing - a.missing);

console.log('Company,Entries,SEC URLs,Missing');
for (const r of results) {
  console.log(`${r.name},${r.entries},${r.withSecUrl},${r.missing}`);
}
console.log('');
console.log('Total companies:', results.length);
console.log('Fully sourced:', results.filter(r => r.missing === 0).length);
console.log('Need work:', results.filter(r => r.missing > 0).length);
