import fs from 'fs';

// CIKs from verify-ciks.ts
const CIK_MAPPINGS = {
  'MSTR': '0001050446',
  'MARA': '0001507605',
  'RIOT': '0001167419',
  'CLSK': '0000827876',
  'KULR': '0001662684',
  'NAKA': '0001946573',
  'DJT': '0001849635',
  'XXI': '0001865602',
  'CEPO': '0001865602',
  'ASST': '0001920406',
  'NXTT': '0001784970',
  'ABTC': '0002068580',
  'BMNR': '0001829311',
  'SBET': '0001981535',
  'ETHM': '0002080334',
  'BTBT': '0001710350',
  'BTCS': '0001436229',
  'GAME': '0001714562',
  'FGNX': '0001591890',
  'FWDI': '0000038264',
  'HSDT': '0001610853',
  'DFDV': '0001805526',
  'UPXI': '0001775194',
  'PURR': '0002078856',
  'HYPD': '0001682639',
  'NA': '0001872302',
  'TAOX': '0001571934',
  'TWAV': '0000746210',
  'CWD': '0001627282',
  'TRON': '0001956744',
  'LITS': '0001262104',
  'SUIG': '0001425355',
  'ZONE': '0001956741',
  'TBH': '0001903595',
  'BTOG': '0001735556',
  'AVX': '0001826397',
  'IHLDF': '0001905459',
  'STKE': '0001846839',
  'BNC': '0001482541',
};

let content = fs.readFileSync('src/lib/data/companies.ts', 'utf8');
const missing = [];
const existing = [];

for (const [ticker, cik] of Object.entries(CIK_MAPPINGS)) {
  const tickerPattern = `ticker: "${ticker}"`;
  const cikPattern = `secCik:`;
  
  // Find the company block
  const tickerIndex = content.indexOf(tickerPattern);
  if (tickerIndex === -1) continue;
  
  // Find next company (next "id:" or end of array)
  const nextCompanyIndex = content.indexOf('\n  {', tickerIndex + 1);
  const companyBlock = content.slice(tickerIndex, nextCompanyIndex > 0 ? nextCompanyIndex : undefined);
  
  if (companyBlock.includes('secCik:')) {
    existing.push(ticker);
  } else {
    missing.push({ ticker, cik });
  }
}

console.log('=== CIK Sync Report ===\n');
console.log(`Already have secCik: ${existing.length}`);
console.log(`Missing secCik: ${missing.length}\n`);

if (missing.length > 0) {
  console.log('Companies needing secCik added:');
  for (const { ticker, cik } of missing) {
    console.log(`  ${ticker}: ${cik}`);
  }
}

// Now actually add them
let updated = 0;
for (const { ticker, cik } of missing) {
  // Find ticker line and add secCik after it
  const tickerLine = `ticker: "${ticker}",`;
  const replacement = `ticker: "${ticker}",\n    secCik: "${cik}",`;
  
  if (content.includes(tickerLine)) {
    content = content.replace(tickerLine, replacement);
    updated++;
  }
}

if (updated > 0) {
  fs.writeFileSync('src/lib/data/companies.ts', content);
  console.log(`\n✅ Added secCik to ${updated} companies`);
} else {
  console.log('\n✅ All companies already have secCik');
}
