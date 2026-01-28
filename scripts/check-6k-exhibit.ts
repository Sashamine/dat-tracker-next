/**
 * Check internal structure of a 6-K exhibit
 */

import { fetchWithRateLimit } from '../src/lib/sec/rate-limiter';

const USER_AGENT = 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)';

async function main() {
  // Exhibit 99.1 from the same 6-K
  const url = 'https://www.sec.gov/Archives/edgar/data/1846839/000110465926000251/tm2534586d2_ex99-1.htm';
  
  console.log('Fetching 6-K Exhibit 99.1...\n');
  
  const response = await fetchWithRateLimit(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html',
    },
  });
  
  if (!response.ok) {
    console.log(`HTTP ${response.status}`);
    return;
  }
  
  const html = await response.text();
  
  // Extract text content
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log('=== Exhibit 99.1 Content (first 4000 chars) ===\n');
  console.log(text.substring(0, 4000));
  
  // Look for section numbers, article numbers, etc.
  console.log('\n\n=== Looking for numbered sections ===');
  const patterns = [
    { name: 'Section X.X', regex: /Section\s+\d+\.?\d*/gi },
    { name: 'Article X', regex: /Article\s+[IVX\d]+/gi },
    { name: 'Part X', regex: /Part\s+[IVX\d]+/gi },
    { name: 'Item X', regex: /Item\s+\d+/gi },
    { name: 'X.X pattern', regex: /(?:^|\s)(\d{1,2}\.\d{1,2})(?:\s|$)/g },
  ];
  
  for (const p of patterns) {
    const matches = text.match(p.regex);
    if (matches && matches.length > 0) {
      const unique = [...new Set(matches)].slice(0, 15);
      console.log(`${p.name}: ${unique.join(', ')}`);
    }
  }
}

main().catch(console.error);
