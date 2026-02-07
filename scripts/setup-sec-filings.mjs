#!/usr/bin/env node
/**
 * Generic SEC filing downloader for DAT Tracker
 * Usage: node setup-sec-filings.mjs <TICKER>
 */

import fs from 'fs';
import path from 'path';

const COMPANIES = {
  upxi: { cik: '1775194', asset: 'SOL', fiscalYearEnd: '0630' },
  hsdt: { cik: '1610853', asset: 'SOL', fiscalYearEnd: '1231' },
  fufu: { cik: '1921158', asset: 'BTC', fiscalYearEnd: '1231' },
  kulr: { cik: '1662684', asset: 'BTC', fiscalYearEnd: '1231' },
  abtc: { cik: '1436229', asset: 'BTC', fiscalYearEnd: '1231' },
  btcs: { cik: '1471941', asset: 'ETH', fiscalYearEnd: '1231' },
};

const ticker = process.argv[2]?.toLowerCase();
if (!ticker || !COMPANIES[ticker]) {
  console.log('Usage: node setup-sec-filings.mjs <ticker>');
  console.log('Available:', Object.keys(COMPANIES).join(', '));
  process.exit(1);
}

const { cik, asset } = COMPANIES[ticker];

async function getSubmissions() {
  const url = `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  return res.json();
}

async function getFilingIndex(accession) {
  const accessionClean = accession.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  if (!res.ok) return null;
  return res.json();
}

async function downloadFiling(accession, reportDate, formType) {
  console.log(`\nFetching ${reportDate} ${formType}...`);
  
  const index = await getFilingIndex(accession);
  if (!index) {
    console.log(`  ⚠ Could not fetch index`);
    return null;
  }
  
  const docs = index.directory?.item || [];
  // Find primary document (the actual filing, not exhibits)
  let primaryDoc = docs.find(d => 
    d.name.endsWith('.htm') && 
    !d.name.includes('ex') &&
    (d.name.includes(ticker) || d.name.includes('10q') || d.name.includes('10k') || d.name.includes('20f') || d.name.includes('6k'))
  );
  if (!primaryDoc) {
    primaryDoc = docs.find(d => d.name.endsWith('.htm') && d.size > 50000);
  }
  
  if (!primaryDoc) {
    console.log(`  ⚠ Could not find primary doc`);
    console.log(`  Available:`, docs.filter(d => d.name.endsWith('.htm')).slice(0,5).map(d => `${d.name}(${d.size})`).join(', '));
    return null;
  }
  
  const accessionClean = accession.replace(/-/g, '');
  const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${primaryDoc.name}`;
  
  console.log(`  Downloading ${primaryDoc.name}...`);
  
  const res = await fetch(filingUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@example.com' }
  });
  
  if (!res.ok) {
    console.log(`  ⚠ Failed: ${res.status}`);
    return null;
  }
  
  const html = await res.text();
  const type = formType.toLowerCase().replace('-', '').replace('/', '');
  const dir = path.join('data', 'sec', ticker, type);
  fs.mkdirSync(dir, { recursive: true });
  
  const filename = `${type.toUpperCase()}-${reportDate}.html`;
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, html);
  console.log(`  ✓ Saved: ${filepath}`);
  
  return {
    date: reportDate,
    type,
    sourceUrl: `/filings/${ticker}/${filename}#${asset.toLowerCase()}-holdings`
  };
}

async function main() {
  console.log(`Fetching ${ticker.toUpperCase()} SEC filings (CIK ${cik})...\n`);
  
  const subs = await getSubmissions();
  const recent = subs.filings?.recent || {};
  
  const results = [];
  const seen = new Set();
  
  for (let i = 0; i < (recent.form?.length || 0) && results.length < 10; i++) {
    const form = recent.form[i];
    const reportDate = recent.reportDate[i];
    const accession = recent.accessionNumber[i];
    
    // Match 10-Q, 10-K, 20-F (foreign annual), 6-K (foreign current)
    if (['10-Q', '10-K', '10-K/A', '20-F', '6-K'].includes(form) && reportDate && !seen.has(reportDate)) {
      seen.add(reportDate);
      const result = await downloadFiling(accession, reportDate, form);
      if (result) results.push(result);
      await new Promise(r => setTimeout(r, 300));
    }
  }
  
  console.log('\n\n✓ Done. Add these to holdings-history.ts:');
  for (const r of results) {
    console.log(`  ${r.date}: sourceUrl: "${r.sourceUrl}"`);
  }
}

main().catch(console.error);
