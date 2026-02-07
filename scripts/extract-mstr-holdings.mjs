import fs from 'fs';

// Read the MSTR daily file
const content = fs.readFileSync('src/lib/data/mstr-daily-mnav.ts', 'utf-8');

// Key dates we need from holdings-history
const targetDates = [
  '2024-03-31', '2024-06-30', '2024-09-30', '2024-11-18', '2024-12-31',
  '2025-03-31', '2025-06-30', '2025-09-30', '2025-12-31',
  '2026-01-12', '2026-01-20', '2026-01-26', '2026-02-01'
];

// Extract entries
const entries = content.matchAll(/\{\s*date:\s*"([^"]+)"[\s\S]*?btcHoldings:\s*(\d+)[\s\S]*?dilutedShares:\s*(\d+)[\s\S]*?\}/g);

const dataByDate = {};
for (const match of entries) {
  dataByDate[match[1]] = {
    holdings: parseInt(match[2]),
    dilutedShares: parseInt(match[3])
  };
}

console.log('MSTR Holdings to sync to holdings-history.ts:\n');
console.log('Date         | Holdings  | Diluted Shares');
console.log('-------------|-----------|---------------');

for (const date of targetDates) {
  const data = dataByDate[date];
  if (data) {
    const hps = (data.holdings / data.dilutedShares).toFixed(6);
    console.log(`${date} | ${data.holdings.toLocaleString().padStart(9)} | ${data.dilutedShares.toLocaleString().padStart(13)} | HPS: ${hps}`);
  } else {
    console.log(`${date} | NOT FOUND |`);
  }
}
