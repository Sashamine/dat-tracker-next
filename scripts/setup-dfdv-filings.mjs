#!/usr/bin/env node
/**
 * Download DFDV (DeFi Development Corp) SEC filings
 * SOL treasury company, SEC CIK 0001805526
 */

import fs from 'fs';
import path from 'path';

const CIK = '1805526';
const TICKER = 'dfdv';

// DFDV launched SOL treasury April 2025, so limited history
const filings = [
  // Q2 2025 10-Q (filed ~Aug 2025)
  { date: '2025-06-30', type: '10q', accession: null, holdings: 280000 },
  // Q3 2025 10-Q (filed ~Nov 2025)
  { date: '2025-09-30', type: '10q', accession: null, holdings: 420000 },
  // Q4 2025 10-K (filed ~Mar 2026)
  { date: '2025-12-31', type: '10k', accession: null, holdings: 550000 },
];

async function getSubmissions() {
  const url = `https://data.sec.gov/submissions/CIK${CIK.padStart(10, '0')}.json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  if (!res.ok) throw new Error(`Failed to fetch submissions: ${res.status}`);
  return res.json();
}

async function getFilingIndex(accession) {
  const accessionClean = accession.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accessionClean}/index.json`;
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  
  if (!res.ok) return null;
  return res.json();
}

async function downloadFiling(accession, date, type) {
  console.log(`\nFetching ${date} ${type.toUpperCase()}...`);
  
  const index = await getFilingIndex(accession);
  if (!index) {
    console.log(`  ⚠ Could not fetch index for ${accession}`);
    return null;
  }
  
  const docs = index.directory?.item || [];
  let primaryDoc = docs.find(d => 
    d.name.endsWith('.htm') && 
    (d.name.includes(TICKER) || d.name.includes('10q') || d.name.includes('10k')) &&
    !d.name.includes('ex')
  );
  if (!primaryDoc) {
    primaryDoc = docs.find(d => d.name.endsWith('.htm') && d.size > 100000);
  }
  
  if (!primaryDoc) {
    console.log(`  ⚠ Could not find primary document`);
    console.log(`  Available:`, docs.filter(d => d.name.endsWith('.htm')).map(d => d.name).join(', '));
    return null;
  }
  
  const accessionClean = accession.replace(/-/g, '');
  const filingUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accessionClean}/${primaryDoc.name}`;
  
  console.log(`  Downloading from ${primaryDoc.name}...`);
  
  const res = await fetch(filingUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  
  if (!res.ok) {
    console.log(`  ⚠ Failed: ${res.status}`);
    return null;
  }
  
  let html = await res.text();
  
  const dir = path.join('data', 'sec', TICKER, type);
  fs.mkdirSync(dir, { recursive: true });
  
  const filename = `${type.toUpperCase()}-${date}.html`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, html);
  console.log(`  ✓ Saved: ${filepath}`);
  
  return {
    date,
    type,
    path: filepath,
    sourceUrl: `/filings/${TICKER}/${filename}#sol-holdings`
  };
}

async function main() {
  console.log('Fetching DFDV SEC submissions...\n');
  
  const subs = await getSubmissions();
  const recent = subs.filings?.recent || {};
  
  // Find 10-Q and 10-K filings
  const results = [];
  for (let i = 0; i < (recent.form?.length || 0); i++) {
    const form = recent.form[i];
    const reportDate = recent.reportDate[i];
    const accession = recent.accessionNumber[i];
    
    if ((form === '10-Q' || form === '10-K') && reportDate) {
      const filing = filings.find(f => f.date === reportDate);
      if (filing) {
        const result = await downloadFiling(accession, reportDate, form.toLowerCase().replace('-', ''));
        if (result) results.push(result);
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  
  console.log('\n\n✓ Done. SourceUrls to add:');
  for (const r of results) {
    console.log(`  ${r.date}: sourceUrl: "${r.sourceUrl}"`);
  }
}

main().catch(console.error);
