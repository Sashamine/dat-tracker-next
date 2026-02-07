#!/usr/bin/env node
/**
 * Audit holdings-history.ts for provenance coverage
 */

import fs from 'fs';

const content = fs.readFileSync('src/lib/data/holdings-history.ts', 'utf8');

// Count entries and provenance status
const entries = content.match(/\{ date:/g)?.length || 0;
const withSourceUrl = content.match(/sourceUrl:/g)?.length || 0;
const withAnchor = (content.match(/sourceUrl:.*#/g) || []).length;
const withSourceType = content.match(/sourceType:/g)?.length || 0;

// Find tickers by looking for TICKER_HISTORY patterns
const historyVars = content.match(/const (\w+)_HISTORY/g) || [];
const tickers = historyVars.map(v => v.replace('const ', '').replace('_HISTORY', ''));

// Count entries per ticker
const tickerCounts = {};
for (const ticker of tickers) {
  const regex = new RegExp(`${ticker}_HISTORY.*?\\[([\\s\\S]*?)\\];`, 's');
  const match = content.match(regex);
  if (match) {
    const entryCount = (match[1].match(/\{ date:/g) || []).length;
    tickerCounts[ticker] = entryCount;
  }
}

console.log('=== Holdings History Provenance Audit ===\n');
console.log('Total entries:', entries);
console.log('With sourceUrl:', withSourceUrl, `(${(withSourceUrl/entries*100).toFixed(0)}%)`);
console.log('With anchor (#):', withAnchor, `(${(withAnchor/entries*100).toFixed(0)}%)`);
console.log('With sourceType:', withSourceType, `(${(withSourceType/entries*100).toFixed(0)}%)`);
console.log('');
console.log('Missing:');
console.log('  No sourceUrl:', entries - withSourceUrl);
console.log('  No anchor:', withSourceUrl - withAnchor);
console.log('');
console.log('Companies with history:', tickers.length);
for (const [ticker, count] of Object.entries(tickerCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${ticker}: ${count} entries`);
}
