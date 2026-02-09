#!/usr/bin/env node
// Debug the BTC overcount issue

import { readFileSync } from 'fs';

const purchasesRaw = readFileSync('C:/Users/edwin/dat-tracker-next/src/lib/data/mstr-btc-purchases.ts', 'utf-8');
const inferredRaw = readFileSync('C:/Users/edwin/dat-tracker-next/src/lib/data/mstr-inferred-purchases.ts', 'utf-8');

// Parse direct purchases
const directPattern = /filingDate:\s*['"](\d{4}-\d{2}-\d{2})['"][\s\S]*?btcAcquired:\s*([\d.]+)/g;
const purchases = [];

for (const match of purchasesRaw.matchAll(directPattern)) {
  purchases.push({ date: match[1], btc: parseFloat(match[2]), source: 'direct' });
}

// Parse inferred  
const inferredBtcPattern = /inferredBtc:\s*([\d.]+)/g;
const afterDatePattern = /afterFiling:\s*\{[\s\S]*?date:\s*['"](\d{4}-\d{2}-\d{2})['"]/g;
const inferredBtcs = [...inferredRaw.matchAll(inferredBtcPattern)].map(m => parseFloat(m[1]));
const afterDates = [...inferredRaw.matchAll(afterDatePattern)].map(m => m[1]);

for (let i = 0; i < inferredBtcs.length && i < afterDates.length; i++) {
  purchases.push({ date: afterDates[i], btc: inferredBtcs[i], source: 'inferred' });
}

// Sort by date
purchases.sort((a, b) => a.date.localeCompare(b.date));

// Show all purchases from 2020-10-01 to 2021-03-31
console.log('Purchases from Q4 2020 to Q1 2021:\n');
console.log('Date       | BTC       | Source    | Running Total');
console.log('-----------|-----------|-----------|-------------');

let running = 38250; // Q3 2020 end
for (const p of purchases) {
  if (p.date > '2020-09-30' && p.date <= '2021-03-31') {
    running += p.btc;
    console.log(`${p.date}  | ${p.btc.toLocaleString().padStart(9)} | ${p.source.padEnd(9)} | ${running.toLocaleString()}`);
  }
}

console.log(`\nFinal running total: ${running.toLocaleString()}`);
console.log(`10-Q Q1 2021 says:   91,579`);
console.log(`Difference:          ${(running - 91579).toLocaleString()}`);

// Also check for duplicates
console.log('\n\nChecking for duplicates...');
const seen = {};
for (const p of purchases) {
  const key = `${p.date}-${p.btc}`;
  if (seen[key]) {
    console.log(`DUPLICATE: ${p.date} ${p.btc} BTC (${p.source} vs ${seen[key]})`);
  }
  seen[key] = p.source;
}
