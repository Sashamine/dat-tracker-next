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
  const secCikMatch = block.match(/secCik:\s*["']([^"']+)["']/);
  
  if (tickerMatch) {
    const ticker = tickerMatch[1];
    currentData[ticker] = {
      holdings: holdingsMatch ? parseInt(holdingsMatch[1].replace(/_/g, '')) : 0,
      shares: sharesMatch ? parseInt(sharesMatch[1].replace(/_/g, '')) : 0,
      debt: debtMatch ? parseInt(debtMatch[1].replace(/_/g, '')) : 0,
      currency: currencyMatch ? currencyMatch[1] : 'USD',
      secCik: secCikMatch ? secCikMatch[1] : null
    };
  }
}

// Get last entry from holdings-history.ts for each company
const historyData = {};
const historyExport = holdingsContent.match(/export const HOLDINGS_HISTORY[\s\S]*?\{([\s\S]*?)\};/);

if (historyExport) {
  const tickerMatches = historyExport[1].matchAll(/["']?([A-Z0-9.-]+)["']?:\s*\{\s*ticker/g);
  for (const m of tickerMatches) {
    const ticker = m[1];
    
    // Find the history array for this ticker
    const historyVarMatch = holdingsContent.match(new RegExp(`["']?${ticker.replace('.', '\\.')}["']?:\\s*\\{[^}]*history:\\s*(\\w+_HISTORY)`));
    if (!historyVarMatch) continue;
    
    const varName = historyVarMatch[1];
    const arrayMatch = holdingsContent.match(new RegExp(`const ${varName}[\\s\\S]*?\\[([\\s\\S]*?)\\];`));
    if (!arrayMatch) continue;
    
    // Get the last entry
    const entries = arrayMatch[1].matchAll(/\{\s*date:\s*["']([^"']+)["'][^}]*holdings:\s*([0-9_]+)[^}]*sharesOutstandingDiluted:\s*([0-9_]+)[^}]*(?:totalDebt:\s*([0-9_]+))?[^}]*\}/g);
    let lastEntry = null;
    for (const e of entries) {
      lastEntry = {
        date: e[1],
        holdings: parseInt(e[2].replace(/_/g, '')),
        shares: parseInt(e[3].replace(/_/g, '')),
        debt: e[4] ? parseInt(e[4].replace(/_/g, '')) : 0
      };
    }
    
    if (lastEntry) {
      historyData[ticker] = lastEntry;
    }
  }
}

// Compare and find gaps
console.log('GAPS BETWEEN holdings-history.ts AND companies.ts:');
console.log('===================================================\n');

const gaps = [];

for (const ticker of Object.keys(historyData)) {
  const current = currentData[ticker];
  const history = historyData[ticker];
  
  if (!current || current.currency !== 'USD') continue; // Skip international
  
  const holdingsDiff = current.holdings - history.holdings;
  const holdingsPct = history.holdings > 0 ? (holdingsDiff / history.holdings * 100).toFixed(1) : 'N/A';
  
  const sharesDiff = current.shares - history.shares;
  const sharesPct = history.shares > 0 ? (sharesDiff / history.shares * 100).toFixed(1) : 'N/A';
  
  const debtDiff = current.debt - history.debt;
  
  // Flag if any significant difference
  const hasGap = Math.abs(holdingsDiff) > 100 || 
                 Math.abs(sharesDiff) > 1000000 || 
                 Math.abs(debtDiff) > 10000000;
  
  if (hasGap) {
    gaps.push({
      ticker,
      lastDate: history.date,
      holdingsDiff,
      holdingsPct,
      sharesDiff,
      sharesPct,
      debtDiff,
      current,
      history
    });
  }
}

gaps.sort((a, b) => Math.abs(b.holdingsDiff) - Math.abs(a.holdingsDiff));

console.log('Ticker | Last History | Holdings Gap | Shares Gap | Debt Gap');
console.log('-------|--------------|--------------|------------|----------');

for (const g of gaps) {
  const hGap = g.holdingsDiff > 0 ? `+${g.holdingsDiff.toLocaleString()}` : g.holdingsDiff.toLocaleString();
  const sGap = g.sharesDiff > 0 ? `+${(g.sharesDiff/1e6).toFixed(1)}M` : `${(g.sharesDiff/1e6).toFixed(1)}M`;
  const dGap = g.debtDiff > 0 ? `+$${(g.debtDiff/1e6).toFixed(0)}M` : `$${(g.debtDiff/1e6).toFixed(0)}M`;
  
  console.log(`${g.ticker.padEnd(6)} | ${g.lastDate}   | ${hGap.padStart(12)} | ${sGap.padStart(10)} | ${dGap.padStart(8)}`);
}

console.log(`\nTotal companies with gaps: ${gaps.length}`);
