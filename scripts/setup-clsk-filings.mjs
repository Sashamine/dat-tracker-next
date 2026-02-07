#!/usr/bin/env node
/**
 * Download CLSK SEC filings and prepare them with anchors
 * CLSK has fiscal year end 09-30
 */

import fs from 'fs';
import path from 'path';

const CIK = '827876';
const TICKER = 'clsk';

// Map holdings-history dates to actual SEC filings
// CLSK fiscal year ends 09-30, so calendar Q1 = FY Q2, etc.
const filings = [
  // Q1 2024 (2024-03-31) = FY Q2 2024, filed ~May 2024
  { date: '2024-03-31', type: '10q', accession: '0000950170-24-056937', primary: 'clsk-20240331.htm', holdings: 6591 },
  // Q2 2024 (2024-06-30) = FY Q3 2024, filed ~Aug 2024  
  { date: '2024-06-30', type: '10q', accession: '0000950170-24-094891', primary: 'clsk-20240630.htm', holdings: 8049 },
  // Q3 2024 (2024-09-30) = FY 2024 10-K, filed ~Dec 2024
  { date: '2024-09-30', type: '10k', accession: '0000950170-24-132565', primary: 'clsk-20240930.htm', holdings: 8701 },
  // Q4 2024 (2024-12-31) = FY Q1 2025, filed ~Feb 2025
  { date: '2024-12-31', type: '10q', accession: '0000950170-25-015470', primary: 'clsk-20241231.htm', holdings: 10556 },
  // Q2 2025 (2025-06-30) = FY Q3 2025, filed ~Aug 2025
  { date: '2025-06-30', type: '10q', accession: '0000827876-25-000005', primary: 'clsk-20250630.htm', holdings: 11500 },
];

async function getFilingIndex(accession) {
  const accessionClean = accession.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accessionClean}/index.json`;
  
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker research@dattracker.com' }
  });
  
  if (!resp.ok) return null;
  return resp.json();
}

async function downloadFiling(filing) {
  const accessionClean = filing.accession.replace(/-/g, '');
  
  // First get the filing index to find the actual document name
  console.log(`Fetching index for ${filing.date}...`);
  const index = await getFilingIndex(filing.accession);
  
  let docName = filing.primary;
  if (index && index.directory && index.directory.item) {
    // Find the primary document (10-Q or 10-K htm file)
    const htmFiles = index.directory.item.filter(f => 
      f.name.endsWith('.htm') && 
      f.name.toLowerCase().includes('clsk') &&
      !f.name.includes('_ex')
    );
    if (htmFiles.length > 0) {
      docName = htmFiles[0].name;
    }
  }
  
  const url = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accessionClean}/${docName}`;
  console.log(`Downloading ${filing.date} ${filing.type.toUpperCase()} from ${url}...`);
  
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker research@dattracker.com' }
  });
  
  if (!resp.ok) {
    console.error(`  ERROR: ${resp.status} - trying alternate patterns...`);
    // Try common patterns
    const patterns = [
      `clsk-${filing.date.replace(/-/g, '')}.htm`,
      `clsk${filing.date.replace(/-/g, '')}_10q.htm`,
      `clsk${filing.date.replace(/-/g, '')}_10k.htm`,
    ];
    
    for (const pattern of patterns) {
      const altUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accessionClean}/${pattern}`;
      const altResp = await fetch(altUrl, {
        headers: { 'User-Agent': 'DAT-Tracker research@dattracker.com' }
      });
      if (altResp.ok) {
        console.log(`  Found: ${pattern}`);
        return { html: await altResp.text(), docName: pattern };
      }
    }
    return null;
  }
  
  let html = await resp.text();
  
  // Add anchor for BTC holdings
  const holdingsStr = filing.holdings.toLocaleString();
  const holdingsNoComma = String(filing.holdings);
  
  // Try various patterns to find the holdings number
  let anchored = false;
  
  // Pattern 1: Number with commas in table cell
  const patterns = [
    new RegExp(`(>\\s*)(${holdingsStr.replace(/,/g, ',')})(\\s*<)`, 'g'),
    new RegExp(`(>\\s*)(${holdingsNoComma})(\\s*<)`, 'g'),
    // Sometimes numbers have different formatting
    new RegExp(`(>\\s*)(${holdingsStr.replace(/,/g, ',')})(\\s*bitcoin)`, 'gi'),
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(html)) {
      html = html.replace(pattern, (match, p1, p2, p3) => {
        anchored = true;
        return `${p1}<span id="btc-holdings" style="background:#fef08a;">${p2}</span>${p3}`;
      });
      console.log(`  ✓ Added anchor for ${filing.holdings} BTC`);
      break;
    }
  }
  
  if (!anchored) {
    console.log(`  ⚠ Could not find ${holdingsStr} in filing - will need manual anchor`);
  }
  
  return { html, docName };
}

async function main() {
  // Create directories
  const baseDir = path.join(process.cwd(), 'data', 'sec', TICKER);
  fs.mkdirSync(path.join(baseDir, '10k'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, '10q'), { recursive: true });
  
  console.log('\nDownloading CLSK filings...\n');
  
  const results = [];
  
  for (const filing of filings) {
    const result = await downloadFiling(filing);
    if (result) {
      const filename = `${filing.type.toUpperCase()}-${filing.date}.html`;
      const filePath = path.join(baseDir, filing.type, filename);
      fs.writeFileSync(filePath, result.html);
      console.log(`  Saved: ${filePath}\n`);
      results.push({ ...filing, filename, success: true });
    } else {
      console.log(`  FAILED: Could not download ${filing.date}\n`);
      results.push({ ...filing, success: false });
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n✓ Done. SourceUrls to add to holdings-history.ts:');
  for (const r of results) {
    if (r.success) {
      console.log(`  ${r.date}: sourceUrl: "/filings/clsk/${r.type.toUpperCase()}-${r.date}#btc-holdings"`);
    }
  }
}

main().catch(console.error);
