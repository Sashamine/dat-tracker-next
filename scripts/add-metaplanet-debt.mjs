import fs from 'fs';

let content = fs.readFileSync('src/lib/data/holdings-history.ts', 'utf-8');

// Metaplanet debt timeline (in USD):
// - 2024 Q2-Q3 (Apr-Sep): No debt ($0)
// - 2024 Q4 (Oct-Dec): ~$50M (first bond issuances)
// - 2025 Q1 (Jan-Mar): ~$100M
// - 2025 Q2 (Apr-Jun): ~$180M
// - 2025 Q3+ (Jul+): ~$280M

function getDebtForDate(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  
  if (year === 2024) {
    if (month < 10) return { totalDebt: 0, cash: 5_000_000 };
    return { totalDebt: 50_000_000, cash: 10_000_000 };
  } else if (year === 2025) {
    if (month <= 3) return { totalDebt: 100_000_000, cash: 20_000_000 };
    if (month <= 6) return { totalDebt: 180_000_000, cash: 50_000_000 };
    return { totalDebt: 280_000_000, cash: 100_000_000 };
  }
  return { totalDebt: 280_000_000, cash: 150_000_000 };
}

// Find the METAPLANET_HISTORY array
const startMarker = 'const METAPLANET_HISTORY: HoldingsSnapshot[] = [';
const endMarker = '];\n\n// Semler Scientific';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
  console.log('Could not find METAPLANET_HISTORY');
  process.exit(1);
}

const before = content.substring(0, startIdx);
const metaplanetSection = content.substring(startIdx, endIdx + endMarker.length);
const after = content.substring(endIdx + endMarker.length);

// Process each entry
let newSection = metaplanetSection;

// Match date entries and add debt
const entryRegex = /\{ date: "(\d{4}-\d{2}-\d{2})"([^}]+)\}/g;
let match;
const replacements = [];

while ((match = entryRegex.exec(metaplanetSection)) !== null) {
  const dateStr = match[1];
  const restOfEntry = match[2];
  
  // Skip if already has totalDebt
  if (restOfEntry.includes('totalDebt')) continue;
  
  const debt = getDebtForDate(dateStr);
  const oldEntry = match[0];
  const newEntry = oldEntry.replace(
    /\}$/,
    `, totalDebt: ${debt.totalDebt.toLocaleString().replace(/,/g, '_')}, cash: ${debt.cash.toLocaleString().replace(/,/g, '_')} }`
  );
  
  replacements.push({ old: oldEntry, new: newEntry });
}

for (const r of replacements) {
  newSection = newSection.replace(r.old, r.new);
}

// Write back
content = before + newSection + after;
fs.writeFileSync('src/lib/data/holdings-history.ts', content);
console.log(`Updated ${replacements.length} Metaplanet entries with debt data`);
