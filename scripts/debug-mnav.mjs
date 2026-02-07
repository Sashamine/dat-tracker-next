import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get tickers from stock price files  
const stockDir = path.join(__dirname, '../data/stock-prices');
const stockFiles = fs.readdirSync(stockDir).filter(f => f.endsWith('.json'));
const stockTickers = stockFiles.map(f => f.replace('.json', '').replace(/_/g, '.'));

console.log('Stock files:', stockTickers.length);
console.log('Stock tickers:', stockTickers.join(', '));

// Check for a specific date
const testDate = '2025-01-15';
console.log('\nChecking date:', testDate);

for (const file of stockFiles.slice(0, 10)) {
  const ticker = file.replace('.json', '').replace(/_/g, '.');
  const data = JSON.parse(fs.readFileSync(path.join(stockDir, file), 'utf-8'));
  const match = data.prices.find(p => p.date === testDate);
  console.log(ticker + ':', match ? match.close : 'NO DATA');
}
