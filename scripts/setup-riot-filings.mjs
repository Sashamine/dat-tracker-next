#!/usr/bin/env node
/**
 * Download RIOT SEC filings and prepare them with anchors
 */

import fs from 'fs';
import path from 'path';

const CIK = '1167419';
const TICKER = 'riot';

const filings = [
  { date: '2022-12-31', type: '10k', accession: '0001558370-23-002704', primary: 'riot-20221231x10k.htm', holdings: 6974 },
  { date: '2023-12-31', type: '10k', accession: '0001558370-24-001550', primary: 'riot-20231231x10k.htm', holdings: 7362 },
  { date: '2024-03-31', type: '10q', accession: '0001558370-24-006400', primary: 'riot-20240331x10q.htm', holdings: 8490 },
  { date: '2024-06-30', type: '10q', accession: '0001558370-24-010495', primary: 'riot-20240630x10q.htm', holdings: 9334 },
  { date: '2024-09-30', type: '10q', accession: '0001558370-24-014179', primary: 'riot-20240930x10q.htm', holdings: 10427 },
  { date: '2024-12-31', type: '10k', accession: '0001558370-25-001888', primary: 'riot-20241231x10k.htm', holdings: 17722 },
  { date: '2025-03-31', type: '10q', accession: '0001558370-25-006119', primary: 'riot-20250331x10q.htm', holdings: 19223 },
  { date: '2025-06-30', type: '10q', accession: '0001558370-25-009896', primary: 'riot-20250630x10q.htm', holdings: 19273 },
  { date: '2025-09-30', type: '10q', accession: '0001104659-25-104466', primary: 'riot-20250930x10q.htm', holdings: 19287 },
];

async function downloadFiling(filing) {
  const accessionClean = filing.accession.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accessionClean}/${filing.primary}`;
  
  console.log(`Downloading ${filing.date} ${filing.type.toUpperCase()}...`);
  
  const resp = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker research@dattracker.com' }
  });
  
  if (!resp.ok) {
    console.error(`  ERROR: ${resp.status}`);
    return null;
  }
  
  let html = await resp.text();
  
  // Add anchor for BTC holdings
  // Look for the holdings number and add id="btc-holdings" to its container
  const holdingsStr = filing.holdings.toLocaleString();
  const holdingsPattern = new RegExp(`(>[\\s]*)(${holdingsStr.replace(/,/g, ',')})(\\s*<)`, 'g');
  
  if (holdingsPattern.test(html)) {
    html = html.replace(holdingsPattern, '$1<span id="btc-holdings" style="background:#fef08a;">$2</span>$3');
    console.log(`  ✓ Added anchor for ${holdingsStr} BTC`);
  } else {
    // Try without commas
    const noCommas = String(filing.holdings);
    const altPattern = new RegExp(`(>[\\s]*)(${noCommas})(\\s*<)`, 'g');
    if (altPattern.test(html)) {
      html = html.replace(altPattern, '$1<span id="btc-holdings" style="background:#fef08a;">$2</span>$3');
      console.log(`  ✓ Added anchor for ${noCommas} BTC`);
    } else {
      console.log(`  ⚠ Could not find ${holdingsStr} in filing`);
    }
  }
  
  return html;
}

async function main() {
  // Create directories
  const baseDir = path.join(process.cwd(), 'data', 'sec', TICKER);
  fs.mkdirSync(path.join(baseDir, '10k'), { recursive: true });
  fs.mkdirSync(path.join(baseDir, '10q'), { recursive: true });
  
  console.log('\\nDownloading RIOT filings...\\n');
  
  for (const filing of filings) {
    const html = await downloadFiling(filing);
    if (html) {
      const filename = `${filing.type.toUpperCase()}-${filing.date}.html`;
      const filePath = path.join(baseDir, filing.type, filename);
      fs.writeFileSync(filePath, html);
      console.log(`  Saved: ${filePath}`);
    }
    // Rate limit
    await new Promise(r => setTimeout(r, 300));
  }
  
  console.log('\\n✓ Done. Now update holdings-history.ts with sourceUrl values.');
  console.log('\\nSourceUrls to add:');
  for (const f of filings) {
    console.log(`  ${f.date}: sourceUrl: "/filings/riot/${f.type.toUpperCase()}-${f.date}#btc-holdings"`);
  }
}

main().catch(console.error);
