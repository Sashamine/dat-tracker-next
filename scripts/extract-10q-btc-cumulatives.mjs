#!/usr/bin/env node
// Extract quarter-end BTC holdings from 10-Q filings

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const tenQDir = 'C:/Users/edwin/dat-tracker-next/public/sec/MSTR/10q';
const files = readdirSync(tenQDir).filter(f => f.endsWith('.html')).sort();

console.log('Quarter-End BTC Holdings from 10-Qs\n');
console.log('Date         | Filing        | BTC Holdings');
console.log('-------------|---------------|-------------');

for (const file of files) {
  const content = readFileSync(join(tenQDir, file), 'utf-8');
  const dateMatch = file.match(/10-Q-(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : 'unknown';
  
  // Search for BTC holdings patterns
  // Pattern 1: "approximately X,XXX bitcoins" or "X,XXX bitcoin"
  const patterns = [
    /approximately\s+([\d,]+)\s*bitcoin/gi,
    /(\d{1,3}(?:,\d{3})+)\s*bitcoin/gi,
    /held\s+([\d,]+)\s*bitcoin/gi,
    /own(?:ed|s)?\s+([\d,]+)\s*bitcoin/gi,
    /approximately\s+([\d,.]+)\s*bitcoins/gi,
  ];
  
  let btcFound = null;
  for (const pattern of patterns) {
    const matches = [...content.matchAll(pattern)];
    if (matches.length > 0) {
      // Get the largest number (most likely cumulative)
      for (const match of matches) {
        const num = parseInt(match[1].replace(/,/g, ''), 10);
        if (!btcFound || num > btcFound) {
          btcFound = num;
        }
      }
    }
  }
  
  if (btcFound) {
    console.log(`${date} | ${file.slice(0, 20).padEnd(13)} | ${btcFound.toLocaleString()}`);
  } else {
    console.log(`${date} | ${file.slice(0, 20).padEnd(13)} | NOT FOUND`);
  }
}
