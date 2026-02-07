#!/usr/bin/env node
/**
 * Download BTBT (Bit Digital) SEC filings and prepare them with anchors
 * BTBT is ETH-focused, calendar year fiscal
 */

import fs from 'fs';
import path from 'path';

const CIK = '1710350';
const TICKER = 'btbt';

// Map holdings-history dates to actual SEC filings  
// Accession numbers from SEC data.sec.gov/submissions
const filings = [
  // FY 2023 10-K (filed Apr 2024) - need to find exact accession
  { date: '2023-12-31', type: '10k', accession: '0001213900-24-025556', primary: null, holdings: 17245 },
  // Q2 2024 10-Q (filed Aug 2024)
  { date: '2024-06-30', type: '10q', accession: '0001213900-24-070722', primary: null, holdings: 22890 },
  // FY 2024 10-K (filed Mar 2025)
  { date: '2024-12-31', type: '10k', accession: '0001013762-25-000307', primary: null, holdings: 27350 },
  // Q1 2025 10-Q (filed May 2025)
  { date: '2025-03-31', type: '10q', accession: '0001213900-25-044155', primary: null, holdings: 85000 },
  // Q2 2025 10-Q (filed Aug 2025)
  { date: '2025-06-30', type: '10q', accession: '0001213900-25-076608', primary: null, holdings: 120000 },
  // Q3 2025 10-Q (filed Nov 2025)
  { date: '2025-09-30', type: '10q', accession: '0001213900-25-104749', primary: null, holdings: 140000 },
];

async function getFilingIndex(accession) {
  const accessionClean = accession.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accessionClean}/index.json`;
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  
  if (!res.ok) {
    console.log(`  ⚠ Could not fetch index for ${accession}: ${res.status}`);
    return null;
  }
  
  return res.json();
}

async function downloadFiling(filing) {
  console.log(`\nFetching index for ${filing.date}...`);
  
  const index = await getFilingIndex(filing.accession);
  if (!index) return null;
  
  // Find the primary document
  const docs = index.directory?.item || [];
  let primaryDoc = filing.primary ? docs.find(d => d.name === filing.primary) : null;
  if (!primaryDoc) {
    // Try to find the main 10-K or 10-Q document
    primaryDoc = docs.find(d => 
      d.name.endsWith('.htm') && 
      (d.name.includes(TICKER) || d.name.includes('10k') || d.name.includes('10q')) &&
      !d.name.includes('ex')
    );
  }
  if (!primaryDoc) {
    // Fallback: any htm file that looks like a main filing
    primaryDoc = docs.find(d => d.name.endsWith('.htm') && d.size > 100000);
  }
  
  if (!primaryDoc) {
    console.log(`  ⚠ Could not find primary document for ${filing.date}`);
    console.log(`  Available docs:`, docs.filter(d => d.name.endsWith('.htm')).map(d => d.name).join(', '));
    return null;
  }
  
  const accessionClean = filing.accession.replace(/-/g, '');
  const filingUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accessionClean}/${primaryDoc.name}`;
  
  console.log(`Downloading ${filing.date} ${filing.type.toUpperCase()} from ${filingUrl}...`);
  
  const res = await fetch(filingUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  
  if (!res.ok) {
    console.log(`  ⚠ Failed to download: ${res.status}`);
    return null;
  }
  
  let html = await res.text();
  
  // Try to find and mark the ETH holdings (BTBT holds ETH, not BTC)
  const holdingsStr = filing.holdings.toLocaleString();
  const holdingsPatterns = [
    new RegExp(`(\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?\\s*(?:ETH|Ethereum|Ether))`, 'gi'),
    new RegExp(`${holdingsStr}`, 'g'),
    new RegExp(filing.holdings.toString(), 'g'),
  ];
  
  let found = false;
  for (const pattern of holdingsPatterns) {
    if (pattern.test(html)) {
      found = true;
      break;
    }
  }
  
  if (!found) {
    console.log(`  ⚠ Could not find ${holdingsStr} in filing - will need manual anchor`);
  }
  
  // Add anchor for ETH holdings
  if (!html.includes('id="eth-holdings"')) {
    // Try to add anchor near the holdings number
    const holdingsRegex = new RegExp(`(${filing.holdings.toLocaleString()}|${filing.holdings})`, 'g');
    if (holdingsRegex.test(html)) {
      html = html.replace(holdingsRegex, '<span id="eth-holdings">$1</span>');
      console.log(`  ✓ Added eth-holdings anchor`);
    }
  }
  
  // Save the file
  const dir = path.join('data', 'sec', TICKER, filing.type);
  fs.mkdirSync(dir, { recursive: true });
  
  const filename = `${filing.type.toUpperCase()}-${filing.date}.html`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, html);
  console.log(`  Saved: ${filepath}`);
  
  return {
    date: filing.date,
    type: filing.type,
    path: filepath,
    sourceUrl: `/filings/${TICKER}/${filename}#eth-holdings`
  };
}

async function main() {
  console.log('Downloading BTBT filings...\n');
  
  const results = [];
  for (const filing of filings) {
    const result = await downloadFiling(filing);
    if (result) results.push(result);
    // Rate limit
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log('\n\n✓ Done. SourceUrls to add to holdings-history.ts:');
  for (const r of results) {
    console.log(`  ${r.date}: sourceUrl: "${r.sourceUrl}"`);
  }
}

main().catch(console.error);
