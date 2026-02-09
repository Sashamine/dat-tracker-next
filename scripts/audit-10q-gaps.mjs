#!/usr/bin/env node
// Compare 10-Q quarter-end holdings with our extracted data

import { readFileSync } from 'fs';

// 10-Q quarter-end holdings (filing date -> quarter end BTC)
const tenQHoldings = [
  { date: '2020-09-30', filing: '2020-10-27', btc: 38250 },
  { date: '2021-03-31', filing: '2021-04-29', btc: 91579 },
  { date: '2021-06-30', filing: '2021-07-29', btc: 105085 },
  { date: '2021-09-30', filing: '2021-10-28', btc: 114042 },
  { date: '2022-03-31', filing: '2022-05-03', btc: 129218 },
  { date: '2022-06-30', filing: '2022-08-02', btc: 129699 },
  { date: '2022-09-30', filing: '2022-11-01', btc: 130000 },
  { date: '2023-03-31', filing: '2023-05-01', btc: 140000 },
  { date: '2023-06-30', filing: '2023-08-01', btc: 152800 },
  { date: '2023-09-30', filing: '2023-11-01', btc: 158400 },
  { date: '2024-03-31', filing: '2024-05-01', btc: 214400 },
  { date: '2024-06-30', filing: '2024-08-06', btc: 226500 },
  { date: '2024-09-30', filing: '2024-10-31', btc: 252220 },
  { date: '2025-03-31', filing: '2025-05-05', btc: 555450 },
  { date: '2025-06-30', filing: '2025-08-05', btc: 628791 },
  { date: '2025-09-30', filing: '2025-11-03', btc: 641167 },
];

// Load our extracted purchases
const purchasesRaw = readFileSync('C:/Users/edwin/dat-tracker-next/src/lib/data/mstr-btc-purchases.ts', 'utf-8');
const inferredRaw = readFileSync('C:/Users/edwin/dat-tracker-next/src/lib/data/mstr-inferred-purchases.ts', 'utf-8');

// Parse direct purchases (filingDate + btcAcquired)
const directPattern = /filingDate:\s*['"](\d{4}-\d{2}-\d{2})['"][\s\S]*?btcAcquired:\s*([\d.]+)/g;
const purchases = [];

for (const match of purchasesRaw.matchAll(directPattern)) {
  purchases.push({ date: match[1], btc: parseFloat(match[2]) });
}

// Parse inferred purchases (afterFiling.date + inferredBtc)
const inferredBtcPattern = /inferredBtc:\s*([\d.]+)/g;
const afterDatePattern = /afterFiling:\s*\{[\s\S]*?date:\s*['"](\d{4}-\d{2}-\d{2})['"]/g;

const inferredBtcs = [...inferredRaw.matchAll(inferredBtcPattern)].map(m => parseFloat(m[1]));
const afterDates = [...inferredRaw.matchAll(afterDatePattern)].map(m => m[1]);

for (let i = 0; i < inferredBtcs.length && i < afterDates.length; i++) {
  purchases.push({ date: afterDates[i], btc: inferredBtcs[i] });
}

// Sort by date
purchases.sort((a, b) => a.date.localeCompare(b.date));

// Calculate cumulative at each quarter-end
console.log('10-Q Quarter-End Reconciliation\n');
console.log('Quarter End  | 10-Q Says   | We Extracted | Gap    | % Coverage');
console.log('-------------|-------------|--------------|--------|----------');

for (const q of tenQHoldings) {
  const sumBefore = purchases
    .filter(p => p.date <= q.date)
    .reduce((sum, p) => sum + p.btc, 0);
  
  const gap = q.btc - sumBefore;
  const coverage = ((sumBefore / q.btc) * 100).toFixed(2);
  
  const gapStr = gap > 0 ? `+${gap.toLocaleString()}` : gap.toLocaleString();
  
  console.log(
    `${q.date}   | ${q.btc.toLocaleString().padStart(11)} | ${Math.round(sumBefore).toLocaleString().padStart(12)} | ${gapStr.padStart(6)} | ${coverage}%`
  );
}

// Find specific quarters with gaps
console.log('\n\nQuarters with Gaps > 500 BTC:');
console.log('-------------------------------');

for (const q of tenQHoldings) {
  const sumBefore = purchases
    .filter(p => p.date <= q.date)
    .reduce((sum, p) => sum + p.btc, 0);
  
  const gap = q.btc - sumBefore;
  
  if (Math.abs(gap) > 500) {
    console.log(`\n${q.date} (10-Q filed ${q.filing}): Gap = ${gap.toLocaleString()} BTC`);
    
    // Show last few purchases before this date
    const lastFew = purchases
      .filter(p => p.date <= q.date)
      .slice(-3);
    
    console.log('  Last purchases before quarter end:');
    for (const p of lastFew) {
      console.log(`    ${p.date}: ${p.btc.toLocaleString()} BTC`);
    }
  }
}
