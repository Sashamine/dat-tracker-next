import fs from 'fs';

// Read MNAV history
const mnavContent = fs.readFileSync('src/lib/data/mnav-history-calculated.ts', 'utf8');

// Parse SBET entries
const lines = mnavContent.split('\n');
let currentDate = null;
let sbetData = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('"date":')) {
    const match = line.match(/"date":\s*"([^"]+)"/);
    if (match) currentDate = match[1];
  }
  if (line.includes('"ticker": "SBET"')) {
    for (let j = i; j < i + 5 && j < lines.length; j++) {
      const mnavMatch = lines[j].match(/"mnav":\s*([\d.]+)/);
      if (mnavMatch && currentDate) {
        sbetData.push({ date: currentDate, mnav: parseFloat(mnavMatch[1]) });
        break;
      }
    }
  }
}

// Quarter end dates
const quarterEnds = [
  { q: 'Q2 2025', date: '2025-06-30' },
  { q: 'Q3 2025', date: '2025-09-30' },
  { q: 'Q4 2025', date: '2025-12-31' },
];

console.log('SBET Quarter End mNAV lookup:');
console.log('==============================');

for (const qe of quarterEnds) {
  const targetDate = new Date(qe.date);
  
  // Find closest within 7 days
  let closest = null;
  let closestDiff = Infinity;
  
  for (const entry of sbetData) {
    const entryDate = new Date(entry.date);
    const diff = Math.abs(targetDate.getTime() - entryDate.getTime());
    if (diff < closestDiff && diff < 7 * 24 * 60 * 60 * 1000) {
      closest = entry;
      closestDiff = diff;
    }
  }
  
  if (closest) {
    console.log(`${qe.q} (${qe.date}): mNAV = ${closest.mnav.toFixed(2)}x (from ${closest.date})`);
  } else {
    console.log(`${qe.q} (${qe.date}): NO DATA WITHIN 7 DAYS`);
  }
}

// SBET earnings data for reference
console.log('\nSBET Earnings HPS data (from earnings-data.ts):');
console.log('Q2 2025: HPS = 0.001379 (200K ETH / 145M shares)');
console.log('Q3 2025: HPS = 0.004543 (817K ETH / 180M shares)');
console.log('Q4 2025: HPS = 0.004390 (863K ETH / 197M shares)');

console.log('\nExpected adjusted calculations:');
for (const qe of quarterEnds) {
  const targetDate = new Date(qe.date);
  let closest = null;
  let closestDiff = Infinity;
  
  for (const entry of sbetData) {
    const entryDate = new Date(entry.date);
    const diff = Math.abs(targetDate.getTime() - entryDate.getTime());
    if (diff < closestDiff && diff < 7 * 24 * 60 * 60 * 1000) {
      closest = entry;
      closestDiff = diff;
    }
  }
  
  const hpsMap = {
    'Q2 2025': 0.001379,
    'Q3 2025': 0.004543,
    'Q4 2025': 0.004390,
  };
  
  const hps = hpsMap[qe.q];
  if (closest && hps) {
    const adjusted = hps / closest.mnav;
    console.log(`${qe.q}: ${hps.toFixed(6)} / ${closest.mnav.toFixed(2)} = ${adjusted.toFixed(6)}`);
  }
}
