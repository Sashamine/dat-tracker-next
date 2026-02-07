import fs from 'fs';

// Get companies with debt from companies.ts
const companiesContent = fs.readFileSync('src/lib/data/companies.ts', 'utf-8');
const holdingsContent = fs.readFileSync('src/lib/data/holdings-history.ts', 'utf-8');

// Find tickers with >$50M debt/preferred in companies.ts
const debtCompanies = [];
const blocks = companiesContent.split(/\n\s*\{/);
for (const block of blocks) {
  const tickerMatch = block.match(/ticker:\s*["']([^"']+)["']/);
  const debtMatch = block.match(/totalDebt:\s*([0-9_]+)/);
  const prefMatch = block.match(/preferredEquity:\s*([0-9_]+)/);
  
  if (tickerMatch) {
    const ticker = tickerMatch[1];
    const debt = debtMatch ? parseInt(debtMatch[1].replace(/_/g, '')) : 0;
    const pref = prefMatch ? parseInt(prefMatch[1].replace(/_/g, '')) : 0;
    if (debt > 50000000 || pref > 50000000) {
      debtCompanies.push({ ticker, debt, pref });
    }
  }
}

// Check which have totalDebt in holdings-history
const synced = [];
const notSynced = [];
for (const c of debtCompanies) {
  // Check if this ticker's history has totalDebt
  const historyName = c.ticker.replace(/\./g, '_').replace(/-/g, '_') + '_HISTORY';
  const historyRegex = new RegExp(historyName + '[\\s\\S]*?\\];', 'i');
  const historyMatch = holdingsContent.match(historyRegex);
  
  const hasHistorical = historyMatch && historyMatch[0].includes('totalDebt:');
  
  if (hasHistorical) {
    synced.push(c);
  } else {
    notSynced.push(c);
  }
}

console.log('SYNCED (have historical debt in holdings-history.ts):');
synced.sort((a,b) => (b.debt + b.pref) - (a.debt + a.pref));
synced.forEach(c => console.log(`  ${c.ticker}: $${((c.debt + c.pref)/1e6).toFixed(0)}M`));

console.log('\nNOT SYNCED (using current debt fallback):');
notSynced.sort((a,b) => (b.debt + b.pref) - (a.debt + a.pref));
notSynced.forEach(c => console.log(`  ${c.ticker}: $${((c.debt + c.pref)/1e6).toFixed(0)}M`));
console.log(`\nTotal synced: ${synced.length}`);
console.log(`Total not synced: ${notSynced.length}`);
