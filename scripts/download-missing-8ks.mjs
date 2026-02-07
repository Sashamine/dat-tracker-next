#!/usr/bin/env node
/**
 * Download specific 8-K filings that are missing
 */

import fs from 'fs';
import path from 'path';

const MISSING_8KS = [
  // KULR initial BTC purchases
  { ticker: 'kulr', cik: '1662684', date: '2024-12-26', accession: '0001104659-24-131749' },
  { ticker: 'kulr', cik: '1662684', date: '2025-01-06', accession: '0001104659-25-003302' },
  // NAKA post-merger
  { ticker: 'naka', cik: '1946573', date: '2025-08-19', accession: null },  // need to find
  // LITS initial treasury
  { ticker: 'lits', cik: '1262104', date: '2024-08-01', accession: null },  // need to find
];

async function downloadFiling(ticker, cik, accession, date) {
  const accessionClean = accession.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;
  
  console.log(`\nFetching ${ticker} ${date}...`);
  
  const res = await fetch(indexUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  
  if (!res.ok) {
    console.log(`  ⚠ Failed to fetch index: ${res.status}`);
    return null;
  }
  
  const index = await res.json();
  const docs = index.directory?.item || [];
  
  // Find the 8-K document
  let primaryDoc = docs.find(d => 
    d.name.endsWith('.htm') && 
    !d.name.includes('ex') &&
    (d.name.includes('8k') || d.name.includes('8-k') || d.size > 10000)
  );
  
  if (!primaryDoc) {
    console.log(`  ⚠ No 8-K found. Docs:`, docs.filter(d => d.name.endsWith('.htm')).map(d => d.name).join(', '));
    return null;
  }
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${primaryDoc.name}`;
  console.log(`  Downloading ${primaryDoc.name}...`);
  
  const docRes = await fetch(docUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  
  if (!docRes.ok) {
    console.log(`  ⚠ Failed: ${docRes.status}`);
    return null;
  }
  
  const html = await docRes.text();
  const dir = path.join('data', 'sec', ticker, '8k');
  fs.mkdirSync(dir, { recursive: true });
  
  const filename = `8k-${date}-${accession.split('-').pop()}.html`;
  fs.writeFileSync(path.join(dir, filename), html);
  console.log(`  ✓ Saved: ${path.join(dir, filename)}`);
  
  return { ticker, date, accession, path: `/filings/${ticker}/${accession}` };
}

async function main() {
  console.log('Downloading missing 8-K filings...');
  
  for (const filing of MISSING_8KS) {
    if (filing.accession) {
      await downloadFiling(filing.ticker, filing.cik, filing.accession, filing.date);
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  console.log('\n✓ Done');
}

main().catch(console.error);
