import fs from 'fs';

const content = fs.readFileSync('src/lib/data/companies.ts', 'utf-8');

// Find all company objects with ticker and debt
const companies = [];

// Match each company block
const regex = /ticker:\s*["']([^"']+)["'][^}]*?(?:totalDebt:\s*([0-9_]+))?[^}]*?(?:preferredEquity:\s*([0-9_]+))?/g;

let match;
while ((match = regex.exec(content)) !== null) {
  const ticker = match[1];
  const debt = match[2] ? parseInt(match[2].replace(/_/g, '')) : 0;
  const pref = match[3] ? parseInt(match[3].replace(/_/g, '')) : 0;
  const total = debt + pref;
  
  if (total > 50_000_000) {
    companies.push({ ticker, debt, pref, total });
  }
}

// Also try reverse order (preferred before debt)
const regex2 = /ticker:\s*["']([^"']+)["'][^}]*?(?:preferredEquity:\s*([0-9_]+))?[^}]*?(?:totalDebt:\s*([0-9_]+))?/g;

while ((match = regex2.exec(content)) !== null) {
  const ticker = match[1];
  const pref = match[2] ? parseInt(match[2].replace(/_/g, '')) : 0;
  const debt = match[3] ? parseInt(match[3].replace(/_/g, '')) : 0;
  const total = debt + pref;
  
  if (total > 50_000_000 && !companies.find(c => c.ticker === ticker)) {
    companies.push({ ticker, debt, pref, total });
  }
}

companies.sort((a, b) => b.total - a.total);

console.log('Companies with >$50M debt+preferred:\n');
console.log('Ticker     | Debt        | Preferred   | Total');
console.log('-----------|-------------|-------------|-------------');
companies.forEach(c => {
  console.log(`${c.ticker.padEnd(10)} | $${(c.debt/1e9).toFixed(2)}B | $${(c.pref/1e9).toFixed(2)}B | $${(c.total/1e9).toFixed(2)}B`);
});
