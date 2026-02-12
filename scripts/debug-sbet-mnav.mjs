import fs from 'fs';

// Read MNAV history
const mnavContent = fs.readFileSync('src/lib/data/mnav-history-calculated.ts', 'utf8');

// Parse the data
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
    // Find mnav in nearby lines
    for (let j = i; j < i + 5 && j < lines.length; j++) {
      const mnavMatch = lines[j].match(/"mnav":\s*([\d.]+)/);
      if (mnavMatch && currentDate) {
        sbetData.push({ date: currentDate, mnav: parseFloat(mnavMatch[1]) });
        break;
      }
    }
  }
}

console.log('SBET mNAV timeline:');
console.log('==================');
sbetData.forEach(d => {
  const indicator = d.mnav > 3 ? ' ⚠️ HIGH' : d.mnav < 1 ? ' 📉 DISCOUNT' : '';
  console.log(`${d.date}  ${d.mnav.toFixed(2)}x${indicator}`);
});
console.log(`\nTotal data points: ${sbetData.length}`);

// Count how many are above 3x
const high = sbetData.filter(d => d.mnav > 3).length;
const normal = sbetData.filter(d => d.mnav >= 1 && d.mnav <= 3).length;
const discount = sbetData.filter(d => d.mnav < 1).length;
console.log(`\nDistribution:`);
console.log(`  > 3x (high premium): ${high}`);
console.log(`  1-3x (normal): ${normal}`);
console.log(`  < 1x (discount): ${discount}`);
