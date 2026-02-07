import fs from 'fs';

const companiesContent = fs.readFileSync('src/lib/data/companies.ts', 'utf-8');

const companies = [];
const blocks = companiesContent.split(/\n\s*\{/);

for (const block of blocks) {
  const tickerMatch = block.match(/ticker:\s*["']([^"']+)["']/);
  if (!tickerMatch) continue;
  
  const ticker = tickerMatch[1];
  const secCik = block.match(/secCik:\s*["']([^"']+)["']/)?.[1];
  const currency = block.match(/currency:\s*["']([^"']+)["']/)?.[1] || 'USD';
  const notes = block.match(/notes:\s*["']([^"']+)["']/)?.[1] || '';
  
  // Skip international (no SEC) and pending mergers
  if (currency !== 'USD' && !secCik) continue;
  if (notes.toLowerCase().includes('pending')) continue;
  
  const holdings = block.match(/holdings:\s*([0-9_]+)/)?.[1];
  const holdingsSourceUrl = block.match(/holdingsSourceUrl:\s*["']([^"']+)["']/)?.[1];
  const holdingsLastUpdated = block.match(/holdingsLastUpdated:\s*["']([^"']+)["']/)?.[1];
  
  const shares = block.match(/sharesForMnav:\s*([0-9_]+)/)?.[1];
  const sharesSourceUrl = block.match(/sharesSourceUrl:\s*["']([^"']+)["']/)?.[1];
  const sharesAsOf = block.match(/sharesAsOf:\s*["']([^"']+)["']/)?.[1];
  
  const debt = block.match(/totalDebt:\s*([0-9_]+)/)?.[1];
  const debtSourceUrl = block.match(/debtSourceUrl:\s*["']([^"']+)["']/)?.[1];
  const debtAsOf = block.match(/debtAsOf:\s*["']([^"']+)["']/)?.[1];
  
  companies.push({
    ticker,
    secCik,
    holdings: {
      value: holdings ? parseInt(holdings.replace(/_/g, '')) : null,
      url: holdingsSourceUrl,
      asOf: holdingsLastUpdated
    },
    shares: {
      value: shares ? parseInt(shares.replace(/_/g, '')) : null,
      url: sharesSourceUrl,
      asOf: sharesAsOf
    },
    debt: {
      value: debt ? parseInt(debt.replace(/_/g, '')) : 0,
      url: debtSourceUrl,
      asOf: debtAsOf
    }
  });
}

// Categorize
const complete = [];
const missingHoldings = [];
const missingShares = [];
const missingDebt = [];

for (const c of companies) {
  const issues = [];
  
  if (!c.holdings.url) issues.push('holdings');
  if (!c.shares.url) issues.push('shares');
  if (c.debt.value > 0 && !c.debt.url) issues.push('debt');
  
  if (issues.length === 0) {
    complete.push(c.ticker);
  } else {
    if (issues.includes('holdings')) missingHoldings.push(c);
    if (issues.includes('shares')) missingShares.push(c);
    if (issues.includes('debt')) missingDebt.push(c);
  }
}

console.log('COMPANIES.TS PROVENANCE AUDIT');
console.log('=============================\n');

console.log(`✅ COMPLETE PROVENANCE: ${complete.length}`);
console.log(`   ${complete.join(', ')}\n`);

console.log(`❌ MISSING holdingsSourceUrl: ${missingHoldings.length}`);
for (const c of missingHoldings) {
  console.log(`   ${c.ticker} (CIK: ${c.secCik || 'none'}) - ${c.holdings.value?.toLocaleString()} holdings`);
}

console.log(`\n❌ MISSING sharesSourceUrl: ${missingShares.length}`);
for (const c of missingShares) {
  console.log(`   ${c.ticker} (CIK: ${c.secCik || 'none'}) - ${c.shares.value?.toLocaleString()} shares`);
}

console.log(`\n❌ MISSING debtSourceUrl (has debt): ${missingDebt.length}`);
for (const c of missingDebt) {
  console.log(`   ${c.ticker} (CIK: ${c.secCik || 'none'}) - $${(c.debt.value/1e6).toFixed(0)}M debt`);
}

console.log(`\n\nTOTAL: ${companies.length} US companies`);
console.log(`Complete: ${complete.length} (${(complete.length/companies.length*100).toFixed(0)}%)`);
console.log(`Need work: ${companies.length - complete.length}`);
