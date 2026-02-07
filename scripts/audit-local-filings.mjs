import fs from 'fs';
import path from 'path';

const secContentDir = 'data/sec-content';
const companiesPath = 'src/lib/data/companies.ts';

// Get current holdings from companies.ts
const companiesContent = fs.readFileSync(companiesPath, 'utf-8');
const currentHoldings = {};

const blocks = companiesContent.split(/\n\s*\{/);
for (const block of blocks) {
  const tickerMatch = block.match(/ticker:\s*["']([^"']+)["']/);
  const holdingsMatch = block.match(/holdings:\s*([0-9_]+)/);
  const holdingsDateMatch = block.match(/holdingsLastUpdated:\s*["']([^"']+)["']/);
  
  if (tickerMatch && holdingsMatch) {
    currentHoldings[tickerMatch[1].toLowerCase()] = {
      holdings: parseInt(holdingsMatch[1].replace(/_/g, '')),
      date: holdingsDateMatch?.[1] || 'unknown'
    };
  }
}

// Patterns to find holdings in SEC filings
const holdingsPatterns = [
  /holds?\s+([\d,]+\.?\d*)\s*(?:BTC|Bitcoin|bitcoin)/gi,
  /(?:BTC|Bitcoin|bitcoin)\s*(?:holdings?|treasury)\s*(?:of|:)?\s*([\d,]+\.?\d*)/gi,
  /([\d,]+\.?\d*)\s*(?:BTC|Bitcoin|bitcoin)\s*(?:as of|held)/gi,
  /treasury\s*(?:of|holds?|:)\s*([\d,]+\.?\d*)\s*(?:BTC|Bitcoin)/gi,
];

// Check each company directory
const companies = fs.readdirSync(secContentDir).filter(f => 
  fs.statSync(path.join(secContentDir, f)).isDirectory()
);

console.log('AUDIT: Local SEC Filings vs companies.ts\n');
console.log('=========================================\n');

const updates = [];

for (const ticker of companies) {
  const dir = path.join(secContentDir, ticker);
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.txt')).sort().reverse();
  
  if (files.length === 0) continue;
  
  // Check most recent filings
  for (const file of files.slice(0, 3)) {
    const content = fs.readFileSync(path.join(dir, file), 'utf-8');
    
    // Get filing date
    const dateMatch = content.match(/CONFORMED PERIOD OF REPORT:\s*(\d{8})/);
    const filingDate = dateMatch ? 
      `${dateMatch[1].slice(0,4)}-${dateMatch[1].slice(4,6)}-${dateMatch[1].slice(6,8)}` : 
      'unknown';
    
    // Search for holdings
    for (const pattern of holdingsPatterns) {
      const matches = [...content.matchAll(pattern)];
      for (const match of matches) {
        const holdingsStr = match[1] || match[2];
        if (!holdingsStr) continue;
        
        const holdings = parseFloat(holdingsStr.replace(/,/g, ''));
        if (holdings < 10 || holdings > 1000000) continue; // Filter noise
        
        const current = currentHoldings[ticker];
        if (!current) continue;
        
        const diff = Math.abs(holdings - current.holdings);
        const pctDiff = (diff / current.holdings * 100).toFixed(1);
        
        if (diff > 10 && parseFloat(pctDiff) > 1) {
          updates.push({
            ticker: ticker.toUpperCase(),
            filingDate,
            file,
            foundHoldings: holdings,
            currentHoldings: current.holdings,
            currentDate: current.date,
            diff: holdings - current.holdings,
            pctDiff
          });
        }
        break; // Only need first match
      }
    }
  }
}

// Dedupe and show most recent per ticker
const byTicker = {};
for (const u of updates) {
  if (!byTicker[u.ticker] || u.filingDate > byTicker[u.ticker].filingDate) {
    byTicker[u.ticker] = u;
  }
}

const sorted = Object.values(byTicker).sort((a, b) => b.filingDate.localeCompare(a.filingDate));

if (sorted.length === 0) {
  console.log('No discrepancies found!');
} else {
  console.log('DISCREPANCIES FOUND:\n');
  for (const u of sorted) {
    const sign = u.diff > 0 ? '+' : '';
    console.log(`${u.ticker}:`);
    console.log(`  Filing: ${u.filingDate} (${u.file})`);
    console.log(`  Found: ${u.foundHoldings.toLocaleString()} | Current: ${u.currentHoldings.toLocaleString()} (${u.currentDate})`);
    console.log(`  Diff: ${sign}${u.diff.toLocaleString()} (${u.pctDiff}%)`);
    console.log('');
  }
}
