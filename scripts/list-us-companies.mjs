import fs from 'fs';

const holdingsContent = fs.readFileSync('src/lib/data/holdings-history.ts', 'utf-8');
const companiesContent = fs.readFileSync('src/lib/data/companies.ts', 'utf-8');

// Get company info from companies.ts
const companyInfo = {};
const blocks = companiesContent.split(/\n\s*\{/);
for (const block of blocks) {
  const tickerMatch = block.match(/ticker:\s*["']([^"']+)["']/);
  const currencyMatch = block.match(/currency:\s*["']([^"']+)["']/);
  const notesMatch = block.match(/notes:\s*["']([^"']+)["']/);
  const secCikMatch = block.match(/secCik:\s*["']([^"']+)["']/);
  const holdingsMatch = block.match(/holdings:\s*([0-9_]+)/);
  
  if (tickerMatch) {
    const ticker = tickerMatch[1];
    companyInfo[ticker] = {
      currency: currencyMatch ? currencyMatch[1] : 'USD',
      notes: notesMatch ? notesMatch[1] : '',
      secCik: secCikMatch ? secCikMatch[1] : null,
      holdings: holdingsMatch ? parseInt(holdingsMatch[1].replace(/_/g, '')) : 0
    };
  }
}

// Get companies in HOLDINGS_HISTORY
const historyExport = holdingsContent.match(/export const HOLDINGS_HISTORY[\s\S]*?\{([\s\S]*?)\};/);
const tickersInHistory = [];

if (historyExport) {
  const matches = historyExport[1].matchAll(/["']?([A-Z0-9.-]+)["']?:\s*\{/g);
  for (const m of matches) {
    tickersInHistory.push(m[1]);
  }
}

// Filter: US-listed (has SEC CIK or USD currency), not MSTR, not pending merger
const usCompanies = [];
const excluded = [];

for (const ticker of tickersInHistory) {
  const info = companyInfo[ticker] || {};
  
  // Skip MSTR (already done)
  if (ticker === 'MSTR') {
    excluded.push({ ticker, reason: 'Already synced with 8-K data' });
    continue;
  }
  
  // Skip international (non-USD without SEC CIK)
  const isInternational = info.currency !== 'USD' && !info.secCik;
  if (isInternational) {
    excluded.push({ ticker, reason: `International (${info.currency})` });
    continue;
  }
  
  // Skip pending mergers
  if (info.notes?.toLowerCase().includes('pending') || info.notes?.toLowerCase().includes('merger')) {
    excluded.push({ ticker, reason: 'Pending merger' });
    continue;
  }
  
  usCompanies.push({
    ticker,
    holdings: info.holdings,
    secCik: info.secCik,
    currency: info.currency
  });
}

// Sort by holdings (largest first)
usCompanies.sort((a, b) => b.holdings - a.holdings);

console.log('US-LISTED COMPANIES NEEDING 8-K AUDIT:');
console.log('======================================\n');
console.log('(Excluding MSTR, international, pending mergers)\n');

usCompanies.forEach((c, i) => {
  console.log(`${i + 1}. ${c.ticker} - ${c.holdings?.toLocaleString() || '?'} holdings ${c.secCik ? `(CIK: ${c.secCik})` : ''}`);
});

console.log(`\nTotal: ${usCompanies.length} companies\n`);

console.log('EXCLUDED:');
excluded.forEach(e => console.log(`  ${e.ticker}: ${e.reason}`));
