import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../data');

console.log('=== DATASET AUDIT ===\n');

// 1. Stock prices
console.log('📈 STOCK PRICES');
const stockDir = path.join(dataDir, 'stock-prices');
const stockFiles = fs.readdirSync(stockDir).filter(f => f.endsWith('.json'));
console.log(`   Files: ${stockFiles.length}`);

let minStockDate = '9999-99-99';
let maxStockDate = '0000-00-00';
let stockCoverage = {};

for (const file of stockFiles) {
  const ticker = file.replace('.json', '').replace(/_/g, '.');
  const data = JSON.parse(fs.readFileSync(path.join(stockDir, file), 'utf-8'));
  const dates = data.prices.map(p => p.date).sort();
  stockCoverage[ticker] = { from: dates[0], to: dates[dates.length-1], count: dates.length };
  if (dates[0] < minStockDate) minStockDate = dates[0];
  if (dates[dates.length-1] > maxStockDate) maxStockDate = dates[dates.length-1];
}
console.log(`   Date range: ${minStockDate} to ${maxStockDate}`);

// 2. Crypto prices
console.log('\n💰 CRYPTO PRICES');
const cryptoPath = path.join(dataDir, 'crypto-prices.json');
const cryptoData = JSON.parse(fs.readFileSync(cryptoPath, 'utf-8'));
const cryptoDates = Object.keys(cryptoData).sort();
console.log(`   Days: ${cryptoDates.length}`);
console.log(`   Date range: ${cryptoDates[0]} to ${cryptoDates[cryptoDates.length-1]}`);

// Check assets coverage
const assets = new Set();
for (const date of cryptoDates) {
  for (const asset of Object.keys(cryptoData[date])) {
    assets.add(asset);
  }
}
console.log(`   Assets: ${Array.from(assets).join(', ')}`);

// 3. Holdings history (import dynamically)
console.log('\n📊 HOLDINGS HISTORY');
const holdingsPath = path.join(__dirname, '../src/lib/data/holdings-history.ts');
const holdingsContent = fs.readFileSync(holdingsPath, 'utf-8');

// Extract tickers from export
const exportMatch = holdingsContent.match(/export const HOLDINGS_HISTORY[^{]*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}/s);
if (exportMatch) {
  const tickerMatches = exportMatch[1].matchAll(/["']?([A-Z0-9.]+)["']?\s*:\s*\{/g);
  const tickers = Array.from(tickerMatches).map(m => m[1]);
  console.log(`   Companies: ${tickers.length}`);
  console.log(`   Tickers: ${tickers.join(', ')}`);
}

// 4. Cross-reference: which holdings have stock prices?
console.log('\n🔗 CROSS-REFERENCE');
const holdingsTickers = ['SWC','MSTR','MARA','RIOT','CLSK','3350.T','KULR','SQNS','0434.HK','ASST','DJT','XXI','NAKA','ABTC','ALTBG','H100.ST','DCC.AX','BTCS','BTBT','BMNR','SBET','ETHM','GAME','FGNX','STKE','DFDV','FWDI','HSDT','UPXI','TAOX','XTAIF','LITS','CYPH','CWD','SUIG','AVX','ZONE','TBH','BTOG','PURR','HYPD','TRON','XRPN','BNC','NA','CEPO','TWAV','LUXFF','IHLDF'];
const stockTickers = stockFiles.map(f => f.replace('.json', '').replace(/_/g, '.'));
const stockSet = new Set(stockTickers);

const withStock = holdingsTickers.filter(t => stockSet.has(t));
const withoutStock = holdingsTickers.filter(t => !stockSet.has(t));

console.log(`   Holdings with stock prices: ${withStock.length}/${holdingsTickers.length}`);
if (withoutStock.length > 0) {
  console.log(`   ❌ Missing stock prices: ${withoutStock.join(', ')}`);
} else {
  console.log(`   ✅ All holdings have stock prices`);
}

// 5. Date overlap
console.log('\n📅 DATE OVERLAP');
const cryptoSet = new Set(cryptoDates);
let overlapCount = 0;
for (const [ticker, coverage] of Object.entries(stockCoverage)) {
  // Just count MSTR overlap as representative
  if (ticker === 'MSTR') {
    const stockDates = [];
    const data = JSON.parse(fs.readFileSync(path.join(stockDir, 'MSTR.json'), 'utf-8'));
    for (const p of data.prices) {
      if (cryptoSet.has(p.date)) overlapCount++;
    }
    console.log(`   MSTR dates overlapping with crypto: ${overlapCount}`);
  }
}

// Show stocks with shortest history
console.log('\n📉 SHORTEST STOCK HISTORIES');
const sorted = Object.entries(stockCoverage).sort((a, b) => a[1].count - b[1].count);
for (const [ticker, cov] of sorted.slice(0, 10)) {
  console.log(`   ${ticker}: ${cov.count} days (${cov.from} to ${cov.to})`);
}
