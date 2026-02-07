import fs from 'fs';

// Read the MSTR daily file
const content = fs.readFileSync('src/lib/data/mstr-daily-mnav.ts', 'utf-8');

// Extract entries with date and dilutedShares
const dateMatches = content.matchAll(/date:\s*"([^"]+)"/g);
const sharesMatches = content.matchAll(/dilutedShares:\s*(\d+)/g);

const dates = [...dateMatches].map(m => m[1]);
const shares = [...sharesMatches].map(m => parseInt(m[1]));

// Find unique share counts and their date ranges
const shareChanges = [];
let prevShares = null;

for (let i = 0; i < dates.length; i++) {
  if (shares[i] !== prevShares) {
    shareChanges.push({ date: dates[i], shares: shares[i] });
    prevShares = shares[i];
  }
}

console.log('MSTR Diluted Shares Timeline:');
shareChanges.forEach(sc => {
  console.log(`  ${sc.date}: ${(sc.shares / 1e6).toFixed(1)}M shares`);
});
