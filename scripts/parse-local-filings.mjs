#!/usr/bin/env node
/**
 * Parse all local SEC filings and extract BTC holdings
 * Cross-reference against companies.ts to find discrepancies
 */

import fs from 'fs';
import path from 'path';

const SEC_CONTENT_DIR = 'C:\\Users\\edwin\\dat-tracker-next\\data\\sec-content';
const COMPANIES_FILE = 'C:\\Users\\edwin\\dat-tracker-next\\src\\lib\\data\\companies.ts';

// Read companies.ts and extract holdings
function parseCompanies() {
  const content = fs.readFileSync(COMPANIES_FILE, 'utf-8');
  const companies = {};
  
  // Match company entries with ticker and holdings
  const companyRegex = /ticker:\s*["']([^"']+)["'][\s\S]*?holdings:\s*([\d,]+)/g;
  let match;
  while ((match = companyRegex.exec(content)) !== null) {
    const ticker = match[1];
    const holdings = parseInt(match[2].replace(/,/g, ''));
    companies[ticker] = holdings;
  }
  return companies;
}

// Extract BTC holdings from filing text
function extractHoldings(text, ticker) {
  const patterns = [
    // "X,XXX bitcoin" or "X,XXX BTC"
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|BTC|btc)/gi,
    // "holds X,XXX" 
    /holds?\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|BTC)/gi,
    // "X,XXX bitcoins"
    /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*bitcoins/gi,
    // "bitcoin holdings of X,XXX"
    /bitcoin\s+holdings?\s+(?:of\s+)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)/gi,
    // "treasury of X,XXX"
    /treasury\s+(?:of\s+)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|BTC)/gi,
    // "increased to X,XXX"
    /increased\s+(?:to\s+)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|BTC)?/gi,
    // "totaling X,XXX"
    /totaling\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|BTC)?/gi,
    // "aggregate of X,XXX"
    /aggregate\s+(?:of\s+)?(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|BTC)/gi,
    // "approximately X,XXX bitcoin"
    /approximately\s+(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:bitcoin|BTC)/gi,
  ];

  const found = [];
  
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const num = parseFloat(match[1].replace(/,/g, ''));
      // Filter out unreasonable values (prices, percentages, etc)
      if (num >= 1 && num < 10000000) {
        // Get context around the match
        const start = Math.max(0, match.index - 100);
        const end = Math.min(text.length, match.index + match[0].length + 100);
        const context = text.slice(start, end).replace(/\s+/g, ' ').trim();
        found.push({ value: num, context, pattern: pattern.source });
      }
    }
  }

  return found;
}

// Get the most likely holdings value from extracted numbers
function getBestHoldings(found, currentHoldings) {
  if (found.length === 0) return null;
  
  // Sort by value descending (usually the total is mentioned)
  const sorted = [...found].sort((a, b) => b.value - a.value);
  
  // Filter to values that seem reasonable as total holdings
  // (at least 50% of current holdings, or if much larger, could be an update)
  const reasonable = sorted.filter(f => {
    // Skip values that are clearly prices (like $100,000)
    if (f.context.includes('$') && f.context.indexOf('$') < f.context.indexOf(f.value.toString())) {
      return false;
    }
    // Skip percentages
    if (f.context.includes('%')) return false;
    // Skip if it mentions "price" or "cost"
    if (/price|cost|paid|average/i.test(f.context)) return false;
    return true;
  });

  if (reasonable.length === 0) return null;
  
  // Return the largest reasonable value (most likely the total)
  return reasonable[0];
}

async function main() {
  console.log('Parsing local SEC filings...\n');
  
  const companies = parseCompanies();
  console.log(`Found ${Object.keys(companies).length} companies in companies.ts\n`);
  
  const folders = fs.readdirSync(SEC_CONTENT_DIR);
  const results = [];
  
  for (const folder of folders) {
    const ticker = folder.toUpperCase();
    const folderPath = path.join(SEC_CONTENT_DIR, folder);
    
    if (!fs.statSync(folderPath).isDirectory()) continue;
    
    const currentHoldings = companies[ticker];
    if (!currentHoldings) {
      console.log(`⚠️  ${ticker}: No entry in companies.ts`);
      continue;
    }
    
    // Get all filing files
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
    if (files.length === 0) continue;
    
    // Sort by date (filename format: YYYY-MM-DD-form.md)
    files.sort().reverse();
    const latestFile = files[0];
    const filePath = path.join(folderPath, latestFile);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const found = extractHoldings(content, ticker);
    const best = getBestHoldings(found, currentHoldings);
    
    if (best) {
      const diff = best.value - currentHoldings;
      const pctDiff = ((diff / currentHoldings) * 100).toFixed(1);
      
      if (Math.abs(diff) > 0.5) {
        results.push({
          ticker,
          current: currentHoldings,
          filing: best.value,
          diff,
          pctDiff,
          file: latestFile,
          context: best.context
        });
      }
    }
  }
  
  // Sort by absolute difference
  results.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  
  console.log('\n=== DISCREPANCIES FOUND ===\n');
  
  for (const r of results) {
    const arrow = r.diff > 0 ? '📈' : '📉';
    console.log(`${arrow} ${r.ticker}: ${r.current.toLocaleString()} → ${r.filing.toLocaleString()} (${r.diff > 0 ? '+' : ''}${r.diff.toLocaleString()}, ${r.pctDiff}%)`);
    console.log(`   File: ${r.file}`);
    console.log(`   Context: "${r.context.slice(0, 150)}..."`);
    console.log('');
  }
  
  if (results.length === 0) {
    console.log('✅ No discrepancies found!');
  } else {
    console.log(`\nFound ${results.length} potential discrepancies to review.`);
  }
}

main().catch(console.error);
