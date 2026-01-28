/**
 * Check structure of a 6-K press release (monthly update)
 */

import { fetchWithRateLimit } from '../src/lib/sec/rate-limiter';

const USER_AGENT = 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)';

async function main() {
  // Try the Dec 8, 2025 6-K - might be a monthly business update
  const filings = [
    { date: 'Dec 8, 2025', accession: '0001062993-25-017198' },
    { date: 'Nov 25, 2025', accession: '0001062993-25-017010' },
  ];
  
  for (const filing of filings) {
    const accessionClean = filing.accession.replace(/-/g, '');
    const indexUrl = `https://www.sec.gov/Archives/edgar/data/1846839/${accessionClean}/index.json`;
    
    console.log(`\n=== ${filing.date} (${filing.accession}) ===`);
    
    const indexResponse = await fetchWithRateLimit(indexUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });
    
    if (!indexResponse.ok) {
      console.log(`Index HTTP ${indexResponse.status}`);
      continue;
    }
    
    const index = await indexResponse.json() as any;
    const htmlDocs = index.directory.item.filter((i: any) => 
      i.name.endsWith('.htm') && !i.name.includes('index')
    );
    
    console.log('Documents:', htmlDocs.map((d: any) => d.name).join(', '));
    
    // Fetch the ex99-1 if it exists
    const exhibit = htmlDocs.find((d: any) => d.name.includes('ex99'));
    if (!exhibit) continue;
    
    const docUrl = `https://www.sec.gov/Archives/edgar/data/1846839/${accessionClean}/${exhibit.name}`;
    const docResponse = await fetchWithRateLimit(docUrl, {
      headers: { 'User-Agent': USER_AGENT },
    });
    
    if (!docResponse.ok) continue;
    
    const html = await docResponse.text();
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('\n--- Content (first 2500 chars) ---');
    console.log(text.substring(0, 2500));
    
    // Look for numbered items
    const sectionMatches = text.match(/(?:^|\s)(\d+\.)\s+[A-Z]/g);
    if (sectionMatches) {
      console.log('\n--- Numbered sections found ---');
      console.log([...new Set(sectionMatches)].slice(0, 10).join(', '));
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
}

main().catch(console.error);
