#!/usr/bin/env node
// Find the specific missing purchases in Q1-Q2 2025

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const purchasesRaw = readFileSync('C:/Users/edwin/dat-tracker-next/src/lib/data/mstr-btc-purchases.ts', 'utf-8');

// Parse purchases
const directPattern = /filingDate:\s*['"](\d{4}-\d{2}-\d{2})['"][\s\S]*?btcAcquired:\s*([\d.]+)[\s\S]*?cumulativeHoldings:\s*([\d.]+|null)/g;
const purchases = [];

for (const match of purchasesRaw.matchAll(directPattern)) {
  purchases.push({ 
    date: match[1], 
    btc: parseFloat(match[2]),
    cumulative: match[3] === 'null' ? null : parseFloat(match[3])
  });
}

purchases.sort((a, b) => a.date.localeCompare(b.date));

// Show Q1-Q2 2025 purchases with cumulative jumps
console.log('Q1-Q2 2025 Purchases and Cumulative Tracking:\n');
console.log('Date       | BTC Acquired | Cumulative | Jump from Prev');
console.log('-----------|--------------|------------|---------------');

let prevCum = null;
for (const p of purchases) {
  if (p.date >= '2025-01-01' && p.date <= '2025-06-30') {
    const jump = (prevCum !== null && p.cumulative !== null) 
      ? (p.cumulative - prevCum - p.btc)
      : null;
    const jumpStr = jump !== null ? (jump > 100 ? `+${jump.toLocaleString()} GAP!` : jump.toLocaleString()) : 'N/A';
    
    console.log(
      `${p.date}  | ${p.btc.toLocaleString().padStart(12)} | ${p.cumulative?.toLocaleString()?.padStart(10) || 'N/A'.padStart(10)} | ${jumpStr}`
    );
    
    if (p.cumulative !== null) prevCum = p.cumulative;
  }
}

// Find 8-K filings in Q1-Q2 2025
const eightKDir = 'C:/Users/edwin/dat-tracker-next/public/sec/MSTR/8k';
const files = readdirSync(eightKDir)
  .filter(f => f.startsWith('8k-2025-0') && (f.includes('-01-') || f.includes('-02-') || f.includes('-03-') || f.includes('-04-') || f.includes('-05-') || f.includes('-06-')))
  .sort();

console.log('\n\n8-K filings in Q1-Q2 2025:');
console.log(files.join('\n'));
