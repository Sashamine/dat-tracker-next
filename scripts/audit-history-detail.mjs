#!/usr/bin/env node
/**
 * Detailed audit of holdings-history.ts provenance by company
 */

import fs from 'fs';

const content = fs.readFileSync('src/lib/data/holdings-history.ts', 'utf8');

// Find all history arrays
const historyMatches = content.matchAll(/const (\w+)_HISTORY:\s*HoldingsSnapshot\[\]\s*=\s*\[([\s\S]*?)\];/g);

console.log('=== Detailed Provenance Audit ===\n');

const results = [];

for (const match of historyMatches) {
  const ticker = match[1];
  const arrayContent = match[2];
  
  // Parse each entry
  const entries = arrayContent.match(/\{[^{}]*\}/g) || [];
  
  let total = 0;
  let withUrl = 0;
  let withAnchor = 0;
  let missingUrl = [];
  let missingAnchor = [];
  
  for (const entry of entries) {
    total++;
    const dateMatch = entry.match(/date:\s*["']([^"']+)["']/);
    const date = dateMatch?.[1] || 'unknown';
    const holdingsMatch = entry.match(/holdings:\s*([\d_,]+)/);
    const holdings = holdingsMatch?.[1]?.replace(/[_,]/g, '') || '?';
    
    const hasUrl = entry.includes('sourceUrl:');
    const hasAnchor = entry.includes('#');
    
    if (hasUrl) withUrl++;
    if (hasAnchor) withAnchor++;
    
    if (!hasUrl) {
      missingUrl.push({ date, holdings });
    } else if (!hasAnchor) {
      missingAnchor.push({ date, holdings });
    }
  }
  
  results.push({
    ticker,
    total,
    withUrl,
    withAnchor,
    missingUrl,
    missingAnchor,
    score: withAnchor / total,
  });
}

// Sort by most work needed (lowest score)
results.sort((a, b) => a.score - b.score);

// Show companies needing most work
console.log('Companies needing work (sorted by coverage):\n');
console.log('Ticker      | Total | URLs | Anchors | Missing URL | Missing Anchor');
console.log('------------|-------|------|---------|-------------|---------------');

for (const r of results) {
  const urlPct = ((r.withUrl / r.total) * 100).toFixed(0);
  const anchorPct = ((r.withAnchor / r.total) * 100).toFixed(0);
  console.log(
    `${r.ticker.padEnd(11)} | ${String(r.total).padStart(5)} | ${String(r.withUrl).padStart(4)} | ${String(r.withAnchor).padStart(7)} | ${String(r.missingUrl.length).padStart(11)} | ${String(r.missingAnchor.length).padStart(14)}`
  );
}

// Show entries missing URLs (worst case)
console.log('\n\n=== Entries Missing sourceUrl ===\n');
for (const r of results.filter(r => r.missingUrl.length > 0).slice(0, 10)) {
  console.log(`${r.ticker}:`);
  for (const e of r.missingUrl.slice(0, 5)) {
    console.log(`  ${e.date}: ${parseInt(e.holdings).toLocaleString()} holdings`);
  }
  if (r.missingUrl.length > 5) {
    console.log(`  ... and ${r.missingUrl.length - 5} more`);
  }
  console.log('');
}
