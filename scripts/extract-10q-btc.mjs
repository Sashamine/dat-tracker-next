/**
 * Extract BTC holdings from 10-Q filings to find exact gaps
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'data/sec/mstr/10q';
const files = readdirSync(dir).filter(f => f.endsWith('.html')).sort();

console.log('10-Q BTC Holdings:\n');

for (const file of files) {
  const content = readFileSync(join(dir, file), 'utf8')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[^;]+;/g, ' ')
    .replace(/\s+/g, ' ');
  
  // Look for BTC holdings patterns
  const patterns = [
    /approximately\s+([\d,]+)\s+bitcoins/i,
    /held\s+approximately\s+([\d,]+)\s+bitcoins/i,
    /holds?\s+([\d,]+)\s+bitcoins/i,
    /([\d,]+)\s+bitcoins?\s+(?:held|acquired|at|as of)/i,
    /Aggregate BTC Holdings[:\s]+([\d,]+)/i,
  ];
  
  let btc = null;
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      const num = parseInt(match[1].replace(/,/g, ''), 10);
      if (num > 10000 && num < 1000000) {  // Reasonable BTC amount
        btc = num;
        break;
      }
    }
  }
  
  // Extract quarter from filename
  const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : file;
  
  console.log(`${date}: ${btc ? btc.toLocaleString() + ' BTC' : 'not found'}`);
}
