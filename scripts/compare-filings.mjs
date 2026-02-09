#!/usr/bin/env node
// Compare our local 8-Ks vs SEC's list

import { readdirSync } from 'fs';

// Our local files
const localDir = 'C:/Users/edwin/dat-tracker-next/public/sec/MSTR/8k';
const localFiles = readdirSync(localDir)
  .filter(f => f.startsWith('8k-2025-'))
  .map(f => {
    const match = f.match(/8k-(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
  })
  .filter(Boolean);

// Count by month
const localByMonth = {};
for (const date of localFiles) {
  const month = date.slice(0, 7);
  localByMonth[month] = (localByMonth[month] || 0) + 1;
}

console.log('Local 8-K files by month:');
console.log(Object.entries(localByMonth).sort().map(([m, c]) => `  ${m}: ${c}`).join('\n'));
console.log(`\nTotal local 2025 8-Ks: ${localFiles.length}`);

// Q1 2025 dates
const q1Dates = localFiles.filter(d => d >= '2025-01-01' && d <= '2025-03-31');
const q2Dates = localFiles.filter(d => d >= '2025-04-01' && d <= '2025-06-30');

console.log(`\nQ1 2025 (Jan-Mar): ${q1Dates.length} filings`);
console.log(`Q2 2025 (Apr-Jun): ${q2Dates.length} filings`);

console.log('\nQ1 2025 dates:');
console.log(q1Dates.sort().join(', '));

console.log('\nQ2 2025 dates:');
console.log(q2Dates.sort().join(', '));
