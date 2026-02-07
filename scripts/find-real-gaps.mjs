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
  const currencyMatch = block.match(/currency:\s*["']([^"']+)["']/);
  const notesMatch = block.match(/notes:\s*["']([^"']+)["']/);
  
  if (tickerMatch) {
    currentData[tickerMatch[1]] = {
      holdings: holdingsMatch ? parseInt(holdingsMatch[1].replace(/_/g, '')) : 0,
      shares: sharesMatch ? parseInt(sharesMatch[1].replace(/_/g, '')) : 0,
      currency: currencyMatch ? currencyMatch[1] : 'USD',
      notes: notesMatch ? notesMatch[1] : ''
    };
  }
}

// Parse each _HISTORY array manually
const historyArrays = holdingsContent.matchAll(/const (\w+_HISTORY):\s*HoldingsSnapshot\[\]\s*=\s*\[([\s\S]*?)\];/g);

const lastEntries = {};
for (const [, varName, content] of historyArrays) {
  // Find entries
  const entries = [...content.matchAll(/\{\s*date:\s*["'](\d{4}-\d{2}-\d{2})["'][^}]*holdings:\s*([0-9_.]+)[^}]*sharesOutstandingDiluted:\s*([0-9_]+)/g)];
  
  if (entries.length > 0) {
    const last = entries[entries.length - 1];
    lastEntries[varName] = {
      date: last[1],
      holdings: parseFloat(last[2].replace(/_/g, '')),
      shares: parseInt(last[3].replace(/_/g, ''))
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

// Compare
console.log('REAL GAPS (Holdings & Shares):');
console.log('==============================\n');
console.log('Ticker | Last Date  | Holdings: History → Current (Δ) | Shares: History → Current (Δ)');
console.log('-------|------------|----------------------------------|-------------------------------');

const gaps = [];
for (const [varName, history] of Object.entries(lastEntries)) {
  const ticker = varToTicker[varName];
  if (!ticker) continue;
  
  const current = currentData[ticker];
  if (!current || current.currency !== 'USD') continue;
  if (current.notes?.toLowerCase().includes('pending')) continue;
  
  const hDiff = current.holdings - history.holdings;
  const sDiff = current.shares - history.shares;
  
  // Significant gap: >5% holdings change or >10% shares change
  const hPct = history.holdings > 0 ? Math.abs(hDiff / history.holdings * 100) : 0;
  const sPct = history.shares > 0 ? Math.abs(sDiff / history.shares * 100) : 0;
  
  if (hPct > 5 || sPct > 10) {
    gaps.push({ ticker, history, current, hDiff, sDiff, hPct, sPct });
  }
}

gaps.sort((a, b) => b.hPct - a.hPct);

for (const g of gaps) {
  const hStr = `${g.history.holdings.toLocaleString()} → ${g.current.holdings.toLocaleString()} (${g.hDiff > 0 ? '+' : ''}${g.hPct.toFixed(0)}%)`;
  const sStr = `${(g.history.shares/1e6).toFixed(1)}M → ${(g.current.shares/1e6).toFixed(1)}M (${g.sDiff > 0 ? '+' : ''}${g.sPct.toFixed(0)}%)`;
  console.log(`${g.ticker.padEnd(6)} | ${g.history.date} | ${hStr.padEnd(32)} | ${sStr}`);
}

console.log(`\nCompanies with significant gaps: ${gaps.length}`);
