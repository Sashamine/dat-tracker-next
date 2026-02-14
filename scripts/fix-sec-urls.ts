/**
 * Fix SEC source URLs that point to directory listings instead of actual documents.
 * Only touches URLs that end with a bare accession number directory (no filename).
 * 
 * For each directory URL, looks up the filing index to find the primary document.
 */

import * as fs from 'fs';
import * as path from 'path';

const COMPANIES_FILE = path.join(__dirname, '..', 'src', 'lib', 'data', 'companies.ts');

// Match URLs ending with /000.../ (18-digit accession, no filename after)
const DIR_URL_REGEX = /https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/(\d+)\/(\d{18})\//g;

interface FilingDoc {
  accession: string;
  primaryDoc: string;
}

function accessionToDashed(acc: string): string {
  // 000149315225021970 → 0001493152-25-021970
  return `${acc.slice(0, 10)}-${acc.slice(10, 12)}-${acc.slice(12)}`;
}

async function fetchPrimaryDoc(cik: string, accession: string): Promise<string | null> {
  const dashed = accessionToDashed(accession);
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession}/${dashed}-index.htm`;
  
  try {
    const resp = await fetch(indexUrl, {
      headers: {
        'User-Agent': 'DATCAP Research contact@reservelabs.com',
        'Accept': 'text/html',
      },
    });
    
    if (!resp.ok) {
      console.error(`  ❌ ${indexUrl} → ${resp.status}`);
      return null;
    }
    
    const html = await resp.text();
    
    // Find the first .htm file in the document table (primary document)
    // Pattern: the first link to a .htm file in the filing documents table
    // The primary doc is usually in the first row after headers
    const docMatch = html.match(/Archives\/edgar\/data\/\d+\/\d+\/([^"]+\.htm)/);
    if (docMatch) {
      return docMatch[1];
    }
    
    console.error(`  ❌ No .htm doc found in index for ${accession}`);
    return null;
  } catch (err) {
    console.error(`  ❌ Fetch error for ${accession}:`, err);
    return null;
  }
}

async function main() {
  let content = fs.readFileSync(COMPANIES_FILE, 'utf-8');
  
  // Collect all unique directory URLs
  const dirUrls = new Map<string, { cik: string; accession: string }>();
  let match;
  const regex = new RegExp(DIR_URL_REGEX);
  
  while ((match = regex.exec(content)) !== null) {
    const fullUrl = match[0];
    const cik = match[1];
    const accession = match[2];
    const key = `${cik}/${accession}`;
    if (!dirUrls.has(key)) {
      dirUrls.set(key, { cik, accession });
    }
  }
  
  console.log(`Found ${dirUrls.size} unique directory URLs to resolve\n`);
  
  let fixed = 0;
  let failed = 0;
  
  for (const [key, { cik, accession }] of dirUrls) {
    process.stdout.write(`Resolving ${accessionToDashed(accession)}... `);
    
    const primaryDoc = await fetchPrimaryDoc(cik, accession);
    if (primaryDoc) {
      const dirUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accession}/`;
      const docUrl = `${dirUrl}${primaryDoc}`;
      
      // Only replace directory URLs that end with /" (bare directory, no filename after)
      // This prevents corrupting URLs that already have a filename
      const pattern = new RegExp(
        dirUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"',
        'g'
      );
      const matches = content.match(pattern);
      const count = matches ? matches.length : 0;
      content = content.replace(pattern, docUrl + '"');
      console.log(`→ ${primaryDoc} (${count} replacements)`);
      fixed += count;
    } else {
      failed++;
      console.log('FAILED');
    }
    
    // Rate limit: SEC allows 10 req/sec, we'll be conservative
    await new Promise(r => setTimeout(r, 200));
  }
  
  fs.writeFileSync(COMPANIES_FILE, content);
  console.log(`\n✅ Fixed ${fixed} URLs across ${dirUrls.size} filings (${failed} failures)`);
  
  // Verify no directory-only URLs remain
  const remaining = (content.match(/SourceUrl.*sec\.gov.*\/\d{18}\/"/g) || []).length;
  console.log(`Remaining directory-only URLs: ${remaining}`);
}

main().catch(console.error);
