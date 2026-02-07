import fs from 'fs';

const holdingsContent = fs.readFileSync('src/lib/data/holdings-history.ts', 'utf-8');
const companiesContent = fs.readFileSync('src/lib/data/companies.ts', 'utf-8');

// Get all tickers from companies.ts
const allTickers = [];
const blocks = companiesContent.split(/\n\s*\{/);
for (const block of blocks) {
  const tickerMatch = block.match(/ticker:\s*["']([^"']+)["']/);
  const holdingsMatch = block.match(/holdings:\s*([0-9_]+)/);
  const notesMatch = block.match(/notes:\s*["']([^"']+)["']/);
  
  if (tickerMatch && holdingsMatch) {
    const holdings = parseInt(holdingsMatch[1].replace(/_/g, ''));
    if (holdings > 0) {
      allTickers.push({
        ticker: tickerMatch[1],
        holdings,
        notes: notesMatch ? notesMatch[1].substring(0, 60) : ''
      });
    }
  }
}

// Check which are in HOLDINGS_HISTORY
const inHistory = [];
const notInHistory = [];

for (const t of allTickers) {
  // Check if ticker is in the HOLDINGS_HISTORY export
  const regex = new RegExp(`["']?${t.ticker.replace('.', '\\.')}["']?:\\s*\\{`);
  if (holdingsContent.match(regex)) {
    inHistory.push(t);
  } else {
    notInHistory.push(t);
  }
}

console.log(`COMPANIES IN holdings-history.ts: ${inHistory.length}`);
console.log(`COMPANIES NOT IN holdings-history.ts: ${notInHistory.length}\n`);

console.log('MISSING FROM HISTORICAL DATA:');
console.log('=============================\n');
notInHistory.forEach(t => {
  console.log(`${t.ticker}: ${t.holdings.toLocaleString()} holdings`);
  if (t.notes) console.log(`  Notes: ${t.notes}...`);
});
