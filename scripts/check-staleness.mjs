import fs from 'fs';

const companiesContent = fs.readFileSync('src/lib/data/companies.ts', 'utf-8');
const today = new Date('2026-02-07');

const companies = [];
const blocks = companiesContent.split(/\n\s*\{/);

for (const block of blocks) {
  const tickerMatch = block.match(/ticker:\s*["']([^"']+)["']/);
  if (!tickerMatch) continue;
  
  const ticker = tickerMatch[1];
  const secCik = block.match(/secCik:\s*["']([^"']+)["']/)?.[1];
  const currency = block.match(/currency:\s*["']([^"']+)["']/)?.[1] || 'USD';
  const notes = block.match(/notes:\s*["']([^"']+)["']/)?.[1] || '';
  
  if (currency !== 'USD' && !secCik) continue;
  if (notes.toLowerCase().includes('pending')) continue;
  
  const holdingsLastUpdated = block.match(/holdingsLastUpdated:\s*["']([^"']+)["']/)?.[1];
  const sharesAsOf = block.match(/sharesAsOf:\s*["']([^"']+)["']/)?.[1];
  const debtAsOf = block.match(/debtAsOf:\s*["']([^"']+)["']/)?.[1];
  const debt = block.match(/totalDebt:\s*([0-9_]+)/)?.[1];
  
  const holdingsDate = holdingsLastUpdated ? new Date(holdingsLastUpdated) : null;
  const sharesDate = sharesAsOf ? new Date(sharesAsOf) : null;
  const debtDate = debtAsOf ? new Date(debtAsOf) : null;
  
  const holdingsAge = holdingsDate ? Math.floor((today - holdingsDate) / (1000*60*60*24)) : null;
  const sharesAge = sharesDate ? Math.floor((today - sharesDate) / (1000*60*60*24)) : null;
  const debtAge = debtDate ? Math.floor((today - debtDate) / (1000*60*60*24)) : null;
  
  companies.push({
    ticker,
    holdingsAge,
    holdingsDate: holdingsLastUpdated,
    sharesAge,
    sharesDate: sharesAsOf,
    debtAge,
    debtDate: debtAsOf,
    hasDebt: debt && parseInt(debt.replace(/_/g, '')) > 0
  });
}

// Sort by oldest holdings
companies.sort((a, b) => (b.holdingsAge || 0) - (a.holdingsAge || 0));

console.log('DATA STALENESS REPORT (as of 2026-02-07)');
console.log('========================================\n');

console.log('HOLDINGS older than 60 days:');
const staleHoldings = companies.filter(c => c.holdingsAge > 60);
for (const c of staleHoldings) {
  console.log(`  ${c.ticker}: ${c.holdingsAge} days old (${c.holdingsDate})`);
}
if (staleHoldings.length === 0) console.log('  None!');

console.log('\nSHARES older than 60 days:');
const staleShares = companies.filter(c => c.sharesAge > 60);
for (const c of staleShares) {
  console.log(`  ${c.ticker}: ${c.sharesAge} days old (${c.sharesDate})`);
}
if (staleShares.length === 0) console.log('  None!');

console.log('\nDEBT older than 90 days (for companies with debt):');
const staleDebt = companies.filter(c => c.hasDebt && c.debtAge > 90);
for (const c of staleDebt) {
  console.log(`  ${c.ticker}: ${c.debtAge} days old (${c.debtDate})`);
}
if (staleDebt.length === 0) console.log('  None!');

console.log('\n\nSUMMARY:');
const avgHoldings = companies.reduce((sum, c) => sum + (c.holdingsAge || 0), 0) / companies.length;
const avgShares = companies.reduce((sum, c) => sum + (c.sharesAge || 0), 0) / companies.length;
console.log(`Average holdings age: ${avgHoldings.toFixed(0)} days`);
console.log(`Average shares age: ${avgShares.toFixed(0)} days`);
