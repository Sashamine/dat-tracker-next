/**
 * Download historical SEC filings referenced in sourceUrls
 * Run with: node scripts/download-historical-filings.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Ticker to CIK mapping
const TICKER_CIKS = {
  mstr: "1050446", mara: "1507605", riot: "1167419", clsk: "1515671",
  btbt: "1799290", kulr: "1662684", bmnr: "1829311", corz: "1878848",
  abtc: "2068580", btcs: "1510079", game: "1825079", fgnx: "1437925",
  dfdv: "1652044", upxi: "1777319", hsdt: "1580063", tron: "1956744",
  cwd: "1627282", stke: "1846839", sqns: "1383395", twav: "746210",
  asst: "1920406", djt: "1849635", xxi: "2070457", fld: "1899287",
  sbet: "1869198", cepo: "2027708", avx: "1826397", ethm: "2028699",
  hypd: "1437107", purr: "2078856", na: "1872302", taox: "1539029",
  suig: "1425355", tbh: "1903595", btog: "1735556", zone: "1849430",
  xrpn: "1991453", cyph: "1509745", bnc: "1952979", naka: "1977303",
  lits: "1411460", nxtt: "1826661", btdr: "1933567", fufu: "1921158",
  fwdi: "1879932",
};

const OUTPUT_DIR = path.join(__dirname, '..', 'public', 'sec-content');
const SEC_DELAY = 150; // ms between SEC requests (rate limiting)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fetch(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ ok: true, status: res.statusCode, text: () => data, json: () => JSON.parse(data) });
        } else {
          resolve({ ok: false, status: res.statusCode, text: () => data });
        }
      });
    });
    req.on('error', reject);
  });
}

/**
 * Parse sourceUrl into ticker, type, date, accession
 */
function parseSourceUrl(url) {
  // Clean the URL - remove BOM, trim, remove anchor
  url = url.replace(/^\uFEFF/, '').replace(/[\r\n]/g, '').trim();
  if (!url) return null;
  
  const [urlPath] = url.split('#');
  
  // Format: /filings/ticker/...
  const match = urlPath.match(/^\/filings\/([^\/]+)\/(.+)$/);
  if (!match) {
    return null;
  }
  
  const ticker = match[1].toLowerCase();
  const rest = match[2].trim();
  
  // Already an accession number? (format: 0001193125-22-036073)
  if (/^\d{10}-\d{2}-\d{6}$/.test(rest)) {
    return { ticker, accession: rest };
  }
  
  // Type + date variations:
  // 10-Q-2022-11-01, 10Q-2025-06-30, 8k-2020-09-14-244732, 10KA-2024-12-31
  const typeMatch = rest.match(/^(10-?[QK]A?|8-?[Kk])-?(\d{4}-\d{2}-\d{2})(?:-\d+)?$/i);
  if (typeMatch) {
    const type = typeMatch[1].toUpperCase().replace(/-/g, '').replace('8K', '8-K').replace('10Q', '10-Q').replace('10K', '10-K');
    return { ticker, type, date: typeMatch[2] };
  }
  
  // Just date: 2025-07-17 or 2023-12-31
  const dateMatch = rest.match(/^(\d{4}-\d{2}-\d{2})$/);
  if (dateMatch) {
    return { ticker, date: dateMatch[1], type: '8-K' }; // Assume 8-K for date-only
  }
  
  console.log(`  [DEBUG] Could not parse rest: "${rest}"`);
  return null;
}

/**
 * Lookup accession number from SEC
 */
async function lookupAccession(ticker, type, date) {
  const cik = TICKER_CIKS[ticker];
  if (!cik) {
    console.log(`  Unknown ticker: ${ticker}`);
    return null;
  }
  
  const url = `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`;
  const res = await fetch(url, { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' });
  
  if (!res.ok) {
    console.log(`  SEC API error: ${res.status}`);
    return null;
  }
  
  const data = await res.json();
  const filings = data.filings?.recent;
  if (!filings) return null;
  
  // Find matching filing
  for (let i = 0; i < filings.accessionNumber.length; i++) {
    const form = filings.form[i].toUpperCase().replace('-', '');
    const filingDate = filings.filingDate[i];
    
    // If type specified, match it
    if (type) {
      const normalizedType = type.replace('-', '');
      if (form !== normalizedType && !form.startsWith(normalizedType)) continue;
    }
    
    // Match date (exact or within 7 days)
    if (date) {
      const daysDiff = Math.abs(new Date(filingDate) - new Date(date)) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 7) {
        return filings.accessionNumber[i];
      }
    }
  }
  
  return null;
}

/**
 * Download filing content from SEC
 */
async function downloadFiling(cik, accession) {
  const accessionClean = accession.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;
  
  const indexRes = await fetch(indexUrl, { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' });
  if (!indexRes.ok) {
    console.log(`  Index not found: ${indexRes.status}`);
    return null;
  }
  
  const index = await indexRes.json();
  const items = index.directory?.item || [];
  
  // Find primary document
  let primaryDoc = items.find(item => 
    (item.name.endsWith('.htm') || item.name.endsWith('.html')) &&
    !item.name.toLowerCase().includes('ex') &&
    !item.name.startsWith('R')
  );
  
  if (!primaryDoc) {
    primaryDoc = items.find(item => item.name.endsWith('.htm') || item.name.endsWith('.txt'));
  }
  
  if (!primaryDoc) {
    console.log(`  No document found`);
    return null;
  }
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${primaryDoc.name}`;
  const docRes = await fetch(docUrl, { 'User-Agent': 'DAT-Tracker research@dat-tracker.com' });
  
  if (!docRes.ok) {
    console.log(`  Document error: ${docRes.status}`);
    return null;
  }
  
  return await docRes.text();
}

/**
 * Main download function
 */
async function downloadAll() {
  // Read needed filings
  const neededFile = path.join(__dirname, '..', 'needed-filings.txt');
  const urls = fs.readFileSync(neededFile, 'utf8').trim().split('\n');
  
  console.log(`Processing ${urls.length} sourceUrls...`);
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const url of urls) {
    const parsed = parseSourceUrl(url.trim());
    if (!parsed) {
      console.log(`Cannot parse: ${url}`);
      failed++;
      continue;
    }
    
    const { ticker } = parsed;
    let { accession } = parsed;
    
    // Lookup accession if needed
    if (!accession && parsed.date) {
      console.log(`Looking up: ${ticker} ${parsed.type || ''} ${parsed.date}`);
      accession = await lookupAccession(ticker, parsed.type, parsed.date);
      await sleep(SEC_DELAY);
      
      if (!accession) {
        console.log(`  Could not find accession`);
        failed++;
        continue;
      }
    }
    
    if (!accession) {
      console.log(`No accession for: ${url}`);
      failed++;
      continue;
    }
    
    // Check if already exists
    const tickerDir = path.join(OUTPUT_DIR, ticker);
    const filePath = path.join(tickerDir, `${accession}.txt`);
    
    if (fs.existsSync(filePath)) {
      console.log(`Already have: ${ticker}/${accession}`);
      skipped++;
      continue;
    }
    
    // Download
    console.log(`Downloading: ${ticker}/${accession}`);
    const cik = TICKER_CIKS[ticker];
    if (!cik) {
      console.log(`  Unknown ticker`);
      failed++;
      continue;
    }
    
    const content = await downloadFiling(cik, accession);
    await sleep(SEC_DELAY);
    
    if (!content) {
      failed++;
      continue;
    }
    
    // Save
    if (!fs.existsSync(tickerDir)) {
      fs.mkdirSync(tickerDir, { recursive: true });
    }
    fs.writeFileSync(filePath, content);
    console.log(`  Saved: ${filePath}`);
    downloaded++;
  }
  
  console.log(`\nDone! Downloaded: ${downloaded}, Skipped: ${skipped}, Failed: ${failed}`);
}

downloadAll().catch(console.error);
