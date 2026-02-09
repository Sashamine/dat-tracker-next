#!/usr/bin/env node
// Trace where the Q1/Q2 2025 gaps are

import { readFileSync } from 'fs';

const purchasesRaw = readFileSync('C:/Users/edwin/dat-tracker-next/src/lib/data/mstr-btc-purchases.ts', 'utf-8');

// Parse purchases with cumulatives
const pattern = /filingDate:\s*['"](\d{4}-\d{2}-\d{2})['"][\s\S]*?btcAcquired:\s*([\d.]+)[\s\S]*?cumulativeHoldings:\s*([\d.]+|null)/g;
const purchases = [];

for (const match of purchasesRaw.matchAll(pattern)) {
  purchases.push({ 
    date: match[1], 
    btc: parseFloat(match[2]),
    cumulative: match[3] === 'null' ? null : parseFloat(match[3])
  });
}

purchases.sort((a, b) => a.date.localeCompare(b.date));

// Q1 2025 analysis (Jan 1 - Mar 31)
console.log('Q1 2025 (Jan-Mar) Analysis:');
console.log('==============================');

const q1Purchases = purchases.filter(p => p.date >= '2025-01-01' && p.date <= '2025-03-31');
const q1Sum = q1Purchases.reduce((sum, p) => sum + p.btc, 0);
const lastBeforeQ1 = purchases.filter(p => p.date < '2025-01-01').pop();
const lastQ1 = q1Purchases[q1Purchases.length - 1];

console.log(`Pre-Q1 cumulative: ${lastBeforeQ1?.cumulative?.toLocaleString() || 'N/A'}`);
console.log(`Q1 purchases sum: ${q1Sum.toLocaleString()}`);
console.log(`Last Q1 entry (${lastQ1?.date}): cumulative ${lastQ1?.cumulative?.toLocaleString()}`);
console.log(`Expected (pre-Q1 + Q1 sum): ${((lastBeforeQ1?.cumulative || 0) + q1Sum).toLocaleString()}`);
console.log(`10-Q Q1 says: 555,450`);
console.log(`Gap from 10-Q: ${(555450 - (lastQ1?.cumulative || 0)).toLocaleString()}`);

// Check for jumps in cumulative vs btcAcquired
console.log('\nCumulative jumps larger than btcAcquired (indicates missed purchases):');
let prev = lastBeforeQ1;
for (const p of q1Purchases) {
  if (prev?.cumulative && p.cumulative) {
    const expected = prev.cumulative + p.btc;
    const actual = p.cumulative;
    const diff = actual - expected;
    if (Math.abs(diff) > 100) {
      console.log(`  ${p.date}: acquired ${p.btc.toLocaleString()}, cumulative went ${prev.cumulative.toLocaleString()} → ${actual.toLocaleString()}`);
      console.log(`           Expected ${expected.toLocaleString()}, diff = ${diff.toLocaleString()}`);
    }
  }
  prev = p;
}

// Q2 2025 analysis
console.log('\n\nQ2 2025 (Apr-Jun) Analysis:');
console.log('==============================');

const q2Purchases = purchases.filter(p => p.date >= '2025-04-01' && p.date <= '2025-06-30');
const q2Sum = q2Purchases.reduce((sum, p) => sum + p.btc, 0);
const lastQ2 = q2Purchases[q2Purchases.length - 1];

console.log(`Last Q1 cumulative: ${lastQ1?.cumulative?.toLocaleString()}`);
console.log(`Q2 purchases sum: ${q2Sum.toLocaleString()}`);
console.log(`Last Q2 entry (${lastQ2?.date}): cumulative ${lastQ2?.cumulative?.toLocaleString()}`);
console.log(`10-Q Q2 says: 628,791`);
console.log(`Gap from 10-Q: ${(628791 - (lastQ2?.cumulative || 0)).toLocaleString()}`);

// Check Q2 jumps
console.log('\nCumulative jumps larger than btcAcquired:');
prev = lastQ1;
for (const p of q2Purchases) {
  if (prev?.cumulative && p.cumulative && p.cumulative > 1000) { // Skip bad 202 entry
    const expected = prev.cumulative + p.btc;
    const actual = p.cumulative;
    const diff = actual - expected;
    if (Math.abs(diff) > 100) {
      console.log(`  ${p.date}: acquired ${p.btc.toLocaleString()}, cumulative went ${prev.cumulative.toLocaleString()} → ${actual.toLocaleString()}`);
      console.log(`           Expected ${expected.toLocaleString()}, diff = ${diff.toLocaleString()}`);
    }
  }
  if (p.cumulative > 1000) prev = p;
}

// Summary
console.log('\n\nSUMMARY:');
console.log('=========');
console.log('The 10-Q figures are HIGHER than our weekly 8-K cumulative.');
console.log('This means purchases happened BETWEEN weekly 8-K filings.');
console.log('');
console.log('Q1 2025: 10-Q says 555,450, last 8-K (3/31) says 528,185 → gap of 27,265 BTC');
console.log('Q2 2025: 10-Q says 628,791, last 8-K (6/30) says 597,325 → gap of 31,466 BTC');
console.log('');
console.log('These gaps represent purchases after the weekly 8-K cutoff but before quarter end.');
