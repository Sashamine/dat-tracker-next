#!/usr/bin/env node
/**
 * Download older/missing SEC filings
 */

import fs from 'fs';
import path from 'path';

const FILINGS_TO_DOWNLOAD = [
  // BTBT 2023 10-K (need to find accession)
  { ticker: 'btbt', cik: '1710350', type: '10k', reportDate: '2023-12-31' },
  // BTBT Q3 2025 10-Q
  { ticker: 'btbt', cik: '1710350', type: '10q', reportDate: '2025-09-30' },
  // LITS 8-K around Aug 2024 (initial LTC treasury)
  { ticker: 'lits', cik: '1262104', type: '8k', reportDate: '2024-08-01' },
  // NAKA Q3 2024 and post-merger
  { ticker: 'naka', cik: '1946573', type: '10q', reportDate: '2024-09-30' },
  { ticker: 'naka', cik: '1946573', type: '8k', reportDate: '2025-08-19' },
];

async function getSubmissions(cik) {
  const url = `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

async function downloadFiling(cik, accession, ticker, type, reportDate) {
  const accessionClean = accession.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;
  
  const res = await fetch(indexUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  
  if (!res.ok) {
    console.log(`  ⚠ Failed to fetch index`);
    return null;
  }
  
  const index = await res.json();
  const docs = index.directory?.item || [];
  
  let primaryDoc = docs.find(d => 
    d.name.endsWith('.htm') && 
    !d.name.includes('ex') &&
    (d.name.includes(ticker) || d.name.includes(type) || d.size > 50000)
  );
  
  if (!primaryDoc) {
    primaryDoc = docs.find(d => d.name.endsWith('.htm') && d.size > 20000);
  }
  
  if (!primaryDoc) {
    console.log(`  ⚠ No document found`);
    return null;
  }
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${primaryDoc.name}`;
  console.log(`  Downloading ${primaryDoc.name}...`);
  
  const docRes = await fetch(docUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  
  if (!docRes.ok) return null;
  
  const html = await docRes.text();
  const dir = path.join('data', 'sec', ticker, type);
  fs.mkdirSync(dir, { recursive: true });
  
  const filename = `${type.toUpperCase()}-${reportDate}.html`;
  fs.writeFileSync(path.join(dir, filename), html);
  console.log(`  ✓ Saved: ${path.join(dir, filename)}`);
  
  return { ticker, type, reportDate, accession };
}

async function main() {
  for (const filing of FILINGS_TO_DOWNLOAD) {
    console.log(`\nLooking for ${filing.ticker.toUpperCase()} ${filing.type.toUpperCase()} ${filing.reportDate}...`);
    
    try {
      const subs = await getSubmissions(filing.cik);
      const recent = subs.filings?.recent || {};
      
      // Find matching filing
      for (let i = 0; i < (recent.form?.length || 0); i++) {
        const form = recent.form[i].toLowerCase().replace('-', '');
        const rptDate = recent.reportDate[i];
        const accession = recent.accessionNumber[i];
        
        if (form.includes(filing.type) && rptDate === filing.reportDate) {
          console.log(`  Found: ${accession}`);
          await downloadFiling(filing.cik, accession, filing.ticker, filing.type, filing.reportDate);
          break;
        }
      }
    } catch (e) {
      console.log(`  Error: ${e.message}`);
    }
    
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('\n✓ Done');
}

main().catch(console.error);
