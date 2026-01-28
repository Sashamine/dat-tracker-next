/**
 * Check internal structure of a 6-K filing
 */

import { fetchWithRateLimit } from '../src/lib/sec/rate-limiter';

const USER_AGENT = 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)';

async function main() {
  const url = 'https://www.sec.gov/Archives/edgar/data/1846839/000110465926000251/tm2534586d2_6k.htm';
  
  console.log('Fetching 6-K cover page...\n');
  
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
  
  // Extract text content (simple regex to strip HTML)
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  console.log('=== 6-K Cover Page Content (first 3000 chars) ===\n');
  console.log(text.substring(0, 3000));
  
  // Look for any numbered items or sections
  console.log('\n\n=== Looking for numbered patterns ===');
  const patterns = [
    /Item\s+\d+/gi,
    /Section\s+\d+/gi,
    /Part\s+[IVX]+/gi,
    /\d+\.\d+/g,
    /Form\s+\d+-?[A-Z]*/gi,
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      const unique = [...new Set(matches)];
      console.log(`${pattern}: ${unique.slice(0, 10).join(', ')}`);
    }
  }
}

main().catch(console.error);
