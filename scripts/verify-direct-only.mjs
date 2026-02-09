#!/usr/bin/env node
// Verify using ONLY mstr-btc-purchases.ts (already has inferred inline)

import { readFileSync } from 'fs';

const purchasesRaw = readFileSync('C:/Users/edwin/dat-tracker-next/src/lib/data/mstr-btc-purchases.ts', 'utf-8');

// Parse direct purchases
const directPattern = /filingDate:\s*['"](\d{4}-\d{2}-\d{2})['"][\s\S]*?btcAcquired:\s*([\d.]+)/g;
const purchases = [];

for (const match of purchasesRaw.matchAll(directPattern)) {
  purchases.push({ date: match[1], btc: parseFloat(match[2]) });
}

// Sort by date
purchases.sort((a, b) => a.date.localeCompare(b.date));

// 10-Q quarter-end holdings
const tenQHoldings = [
  { date: '2020-09-30', btc: 38250 },
  { date: '2021-03-31', btc: 91579 },
  { date: '2021-06-30', btc: 105085 },
  { date: '2021-09-30', btc: 114042 },
  { date: '2022-03-31', btc: 129218 },
  { date: '2022-06-30', btc: 129699 },
  { date: '2022-09-30', btc: 130000 },
  { date: '2023-03-31', btc: 140000 },
  { date: '2023-06-30', btc: 152800 },
  { date: '2023-09-30', btc: 158400 },
  { date: '2024-03-31', btc: 214400 },
  { date: '2024-06-30', btc: 226500 },
  { date: '2024-09-30', btc: 252220 },
  { date: '2025-03-31', btc: 555450 },
  { date: '2025-06-30', btc: 628791 },
  { date: '2025-09-30', btc: 641167 },
];

console.log('10-Q Quarter-End Reconciliation (Direct file only)\n');
console.log('Quarter End  | 10-Q Says   | We Extracted | Gap      | Coverage');
console.log('-------------|-------------|--------------|----------|----------');

for (const q of tenQHoldings) {
  const sumBefore = purchases
    .filter(p => p.date <= q.date)
    .reduce((sum, p) => sum + p.btc, 0);
  
  const gap = q.btc - sumBefore;
  const coverage = ((sumBefore / q.btc) * 100).toFixed(2);
  const gapStr = gap > 0 ? `+${gap.toLocaleString()}` : gap.toLocaleString();
  
  console.log(
    `${q.date}   | ${q.btc.toLocaleString().padStart(11)} | ${Math.round(sumBefore).toLocaleString().padStart(12)} | ${gapStr.padStart(8)} | ${coverage}%`
  );
}

// Total
const total = purchases.reduce((sum, p) => sum + p.btc, 0);
console.log(`\nTotal extracted: ${total.toLocaleString()} BTC`);
console.log(`Latest 8-K says: 713,502 BTC`);
console.log(`Gap: ${(713502 - total).toLocaleString()} BTC (${((total / 713502) * 100).toFixed(2)}% coverage)`);
