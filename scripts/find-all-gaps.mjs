import fs from 'fs';

const holdingsContent = fs.readFileSync('src/lib/data/holdings-history.ts', 'utf-8');
const companiesContent = fs.readFileSync('src/lib/data/companies.ts', 'utf-8');

// Get current values from companies.ts
const currentData = {};
const blocks = companiesContent.split(/\n\s*\{/);
for (const block of blocks) {
  const tickerMatch = block.match(/ticker:\s*["']([^"']+)["']/);
  const holdingsMatch = block.match(/holdings:\s*([0-9_]+)/);
  const sharesMatch = block.match(/sharesForMnav:\s*([0-9_]+)/);
  const debtMatch = block.match(/totalDebt:\s*([0-9_]+)/);
  const currencyMatch = block.match(/currency:\s*["']([^"']+)["']/);
  const notesMatch = block.match(/notes:\s*["']([^"']+)["']/);
  
  if (tickerMatch) {
    currentData[tickerMatch[1]] = {
      holdings: holdingsMatch ? parseInt(holdingsMatch[1].replace(/_/g, '')) : 0,
      shares: sharesMatch ? parseInt(sharesMatch[1].replace(/_/g, '')) : 0,
      debt: debtMatch ? parseInt(debtMatch[1].replace(/_/g, '')) : 0,
      currency: currencyMatch ? currencyMatch[1] : 'USD',
      notes: notesMatch ? notesMatch[1] : ''
    };
  }
}

// Parse each _HISTORY array manually
const historyArrays = holdingsContent.matchAll(/const (\w+_HISTORY):\s*HoldingsSnapshot\[\]\s*=\s*\[([\s\S]*?)\];/g);

const lastEntries = {};
for (const [, varName, content] of historyArrays) {
  const entries = [...content.matchAll(/\{\s*date:\s*["'](\d{4}-\d{2}-\d{2})["'][^}]*holdings:\s*([0-9_.]+)[^}]*sharesOutstandingDiluted:\s*([0-9_]+)(?:[^}]*totalDebt:\s*([0-9_]+))?/g)];
  
  if (entries.length > 0) {
    const last = entries[entries.length - 1];
    lastEntries[varName] = {
      date: last[1],
      holdings: parseFloat(last[2].replace(/_/g, '')),
      shares: parseInt(last[3].replace(/_/g, '')),
      debt: last[4] ? parseInt(last[4].replace(/_/g, '')) : 0
    };
  }
}

// Map variable names to tickers
const varToTicker = {};
const exportMatch = holdingsContent.match(/export const HOLDINGS_HISTORY[\s\S]*?\{([\s\S]*?)\};/);
if (exportMatch) {
  const mappings = exportMatch[1].matchAll(/["']?([A-Z0-9.-]+)["']?:\s*\{[^}]*history:\s*(\w+_HISTORY)/g);
  for (const [, ticker, varName] of mappings) {
    varToTicker[varName] = ticker;
  }
}

// Compare ALL
console.log('ALL DIFFERENCES (companies.ts vs holdings-history.ts last entry):');
console.log('==================================================================\n');

const allGaps = [];
const perfect = [];

for (const [varName, history] of Object.entries(lastEntries)) {
  const ticker = varToTicker[varName];
  if (!ticker) continue;
  
  const current = currentData[ticker];
  if (!current || current.currency !== 'USD') continue;
  if (current.notes?.toLowerCase().includes('pending')) continue;
  
  const hDiff = current.holdings - history.holdings;
  const sDiff = current.shares - history.shares;
  const dDiff = current.debt - history.debt;
  
  if (hDiff !== 0 || sDiff !== 0 || dDiff !== 0) {
    allGaps.push({ ticker, history, current, hDiff, sDiff, dDiff });
  } else {
    perfect.push(ticker);
  }
}

allGaps.sort((a, b) => a.ticker.localeCompare(b.ticker));

console.log('HOLDINGS DIFFERENCES:');
const hGaps = allGaps.filter(g => g.hDiff !== 0);
if (hGaps.length === 0) {
  console.log('  None!\n');
} else {
  for (const g of hGaps) {
    console.log(`  ${g.ticker}: ${g.history.holdings.toLocaleString()} → ${g.current.holdings.toLocaleString()} (${g.hDiff > 0 ? '+' : ''}${g.hDiff.toLocaleString()}) [last: ${g.history.date}]`);
  }
  console.log('');
}

console.log('SHARES DIFFERENCES:');
const sGaps = allGaps.filter(g => g.sDiff !== 0);
if (sGaps.length === 0) {
  console.log('  None!\n');
} else {
  for (const g of sGaps) {
    const pct = (g.sDiff / g.history.shares * 100).toFixed(1);
    console.log(`  ${g.ticker}: ${(g.history.shares/1e6).toFixed(2)}M → ${(g.current.shares/1e6).toFixed(2)}M (${g.sDiff > 0 ? '+' : ''}${pct}%) [last: ${g.history.date}]`);
  }
  console.log('');
}

console.log('DEBT DIFFERENCES:');
const dGaps = allGaps.filter(g => g.dDiff !== 0);
if (dGaps.length === 0) {
  console.log('  None!\n');
} else {
  for (const g of dGaps) {
    console.log(`  ${g.ticker}: $${(g.history.debt/1e6).toFixed(0)}M → $${(g.current.debt/1e6).toFixed(0)}M (${g.dDiff > 0 ? '+' : ''}$${(g.dDiff/1e6).toFixed(0)}M) [last: ${g.history.date}]`);
  }
  console.log('');
}

console.log(`PERFECT MATCHES: ${perfect.length}`);
console.log(`  ${perfect.join(', ')}`);
