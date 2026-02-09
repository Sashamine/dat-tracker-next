import fs from 'fs';

const content = fs.readFileSync('src/lib/data/mstr-sec-history.ts', 'utf8');

// Count filings by year
const years = {};
const matches = [...content.matchAll(/periodEnd:\s*"(\d{4})-/g)];
for (const m of matches) {
  const year = m[1];
  years[year] = (years[year] || 0) + 1;
}

console.log('MSTR SEC History Coverage (XBRL filings):');
console.log('==========================================');
Object.entries(years).sort().forEach(([y, c]) => console.log(`${y}: ${c} filings`));

// Check for preferredEquity in historical data
const prefMatches = content.match(/preferredEquity:\s*(null|\d[\d_]*)/g) || [];
const nonNull = prefMatches.filter(m => !m.includes('null')).length;
const nullCount = prefMatches.filter(m => m.includes('null')).length;

console.log('\nPreferred Equity in historical filings:');
console.log(`  With preferred data: ${nonNull}`);
console.log(`  Without (null): ${nullCount}`);

// Check debt coverage
const debtMatches = content.match(/convertibleDebt:\s*(null|\d[\d_]*)/g) || [];
const debtNonNull = debtMatches.filter(m => !m.includes('null')).length;
const debtNull = debtMatches.filter(m => m.includes('null')).length;

console.log('\nConvertible Debt in historical filings:');
console.log(`  With debt data: ${debtNonNull}`);
console.log(`  Without (null): ${debtNull}`);

// Check what instruments existed when
console.log('\n==========================================');
console.log('Historical Instrument Complexity:');
console.log('==========================================');
console.log('2020: Common stock + cash (BTC started Aug 2020)');
console.log('2020-Q4: + Convertible debt (first notes Dec 2020)');
console.log('2021-2024: Common + Convertible debt (multiple tranches)');
console.log('2025-Q1: + STRK preferred (first pref Feb 2025)');
console.log('2025-Q2+: + STRF, STRD, STRC, STRE (5 preferred series)');
console.log('\nConclusion: Historical data is SIMPLER before 2025.');
