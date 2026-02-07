import fs from 'fs';

const content = fs.readFileSync('src/lib/data/mstr-daily-mnav.ts', 'utf-8');

// Key dates 
const targetDates = [
  '2024-03-31', '2024-06-30', '2024-09-30', '2024-12-31',
  '2025-03-31', '2025-06-30', '2025-09-30', '2025-12-31',
  '2026-01-20'
];

// Extract entries with debt/cash
const regex = /\{\s*date:\s*"([^"]+)"[\s\S]*?totalDebt:\s*(\d+)[\s\S]*?preferredEquity:\s*(\d+)[\s\S]*?cashAndEquivalents:\s*(\d+)[\s\S]*?\}/g;

const dataByDate = {};
let match;
while ((match = regex.exec(content)) !== null) {
  dataByDate[match[1]] = {
    totalDebt: parseInt(match[2]),
    preferredEquity: parseInt(match[3]),
    cash: parseInt(match[4])
  };
}

console.log('MSTR Debt/Cash for EV calculation:\n');
console.log('Date         | Total Debt   | Preferred    | Cash         | Net Debt');
console.log('-------------|--------------|--------------|--------------|-------------');

for (const date of targetDates) {
  const data = dataByDate[date];
  if (data) {
    const netDebt = data.totalDebt + data.preferredEquity - data.cash;
    console.log(`${date} | $${(data.totalDebt/1e9).toFixed(2)}B | $${(data.preferredEquity/1e9).toFixed(2)}B | $${(data.cash/1e6).toFixed(0)}M | $${(netDebt/1e9).toFixed(2)}B`);
  } else {
    console.log(`${date} | NOT FOUND`);
  }
}
