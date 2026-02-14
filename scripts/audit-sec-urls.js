/**
 * SEC URL Audit Script
 * 
 * Verifies that cited values actually exist in linked SEC documents.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Extracted SEC URLs from companies.ts
const secUrls = [
  {
    "company": "Bitmine Immersion",
    "ticker": "BMNR",
    "field": "holdingsSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1829311/000149315226005707/ex99-1.htm#:~:text=4%2C325%2C738%20ETH",
    "citedValue": "4_325_738",
    "valueField": "holdings"
  },
  {
    "company": "Sharplink, Inc.",
    "ticker": "SBET",
    "field": "holdingsSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1981535/000149315225028063/ex99-1.htm",
    "citedValue": "863_424",
    "valueField": "holdings"
  },
  {
    "company": "FG Nexus",
    "ticker": "FGNX",
    "field": "holdingsSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1591890/000149315226003101/ex99-1.htm",
    "citedValue": "37_594",
    "valueField": "holdings"
  },
  {
    "company": "Twenty One Capital",
    "ticker": "XXI",
    "field": "holdingsSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/2070457/000121390025121293/0001213900-25-121293-index.htm",
    "citedValue": "43_514",
    "valueField": "holdings"
  },
  {
    "company": "MARA Holdings",
    "ticker": "MARA",
    "field": "holdingsSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm",
    "citedValue": "52_850",
    "valueField": "holdings"
  },
  {
    "company": "KULR Technology",
    "ticker": "KULR",
    "field": "holdingsSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
    "citedValue": "1_057",
    "valueField": "holdings"
  },
  {
    "company": "Nakamoto Inc.",
    "ticker": "NAKA",
    "field": "holdingsSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1946573/000149315225024314/ex99-1.htm",
    "citedValue": "5_398",
    "valueField": "holdings"
  },
  {
    "company": "Solana Company (fka Helius Medical)",
    "ticker": "HSDT",
    "field": "holdingsSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1610853/000110465925103714/hsdt-20251029xex99d1.htm",
    "citedValue": "2_300_000",
    "valueField": "holdings"
  },
  {
    "company": "DeFi Development Corp",
    "ticker": "DFDV",
    "field": "holdingsSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1805526/000119312526002668/dfdv-20260105.htm",
    "citedValue": "2_221_329",
    "valueField": "holdings"
  },
  {
    "company": "Nano Labs",
    "ticker": "NA",
    "field": "holdingsSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1872302/000121390025126828/ea027141101ex99-1_nano.htm",
    "citedValue": "130_000",
    "valueField": "holdings"
  },
  {
    "company": "SUI Group Holdings",
    "ticker": "SUIG",
    "field": "holdingsSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1425355/000165495426000201/suig_8k.htm",
    "citedValue": "108_098_436",
    "valueField": "holdings"
  },
  {
    "company": "American Bitcoin",
    "ticker": "ABTC",
    "field": "sharesSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/abtc-20250930.htm",
    "citedValue": "899_489_426",
    "valueField": "sharesForMnav"
  },
  {
    "company": "American Bitcoin",
    "ticker": "ABTC",
    "field": "burnSourceUrl",
    "url": "https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/abtc-20250930.htm",
    "citedValue": "8_052_000",
    "valueField": "quarterlyBurnUsd"
  }
];

// Parse numeric value from string like "4_325_738" or "BMNR_PROVENANCE.holdings?.value || 4_325_738"
function parseValue(val) {
  if (typeof val === 'number') return val;
  if (!val) return null;
  
  // Extract numeric portion (handle || fallback pattern)
  const match = val.match(/(\d[\d_,]*\.?\d*)/g);
  if (!match) return null;
  
  // Get the last match (fallback value after ||)
  const numStr = match[match.length - 1].replace(/[_,]/g, '');
  return parseFloat(numStr);
}

// Format number for search patterns
function getSearchPatterns(value) {
  if (!value || isNaN(value)) return [];
  
  const patterns = [];
  
  // Raw integer
  patterns.push(Math.floor(value).toString());
  
  // With commas (e.g., 4,325,738)
  patterns.push(Math.floor(value).toLocaleString('en-US'));
  
  // For large numbers, also try abbreviated versions
  if (value >= 1000000) {
    // Millions (e.g., "4.3 million", "4.3M")
    const millions = value / 1000000;
    patterns.push(millions.toFixed(1) + ' million');
    patterns.push(millions.toFixed(1) + 'M');
    patterns.push(millions.toFixed(2) + ' million');
  }
  
  // For percentages (0.xx)
  if (value < 1 && value > 0) {
    const pct = value * 100;
    patterns.push(pct.toFixed(0) + '%');
    patterns.push(pct.toFixed(1) + '%');
  }
  
  return patterns;
}

// Fetch a URL with proper headers
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    // Remove fragment
    const baseUrl = url.split('#')[0];
    
    const options = {
      headers: {
        'User-Agent': 'DATCAP Research contact@reservelabs.com',
        'Accept': 'text/html,application/xhtml+xml',
      }
    };
    
    https.get(baseUrl, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Follow redirect
        fetchUrl(res.headers.location).then(resolve).catch(reject);
        return;
      }
      
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Check if any pattern exists in text
function findPatterns(text, patterns) {
  for (const pattern of patterns) {
    if (text.includes(pattern)) {
      return pattern;
    }
  }
  return null;
}

// Main audit function
async function auditUrl(entry) {
  const value = parseValue(entry.citedValue);
  if (!value) {
    return { ...entry, status: 'skip', reason: 'No parseable value' };
  }
  
  const patterns = getSearchPatterns(value);
  
  try {
    const html = await fetchUrl(entry.url);
    const found = findPatterns(html, patterns);
    
    if (found) {
      return { ...entry, status: 'ok', foundPattern: found };
    } else {
      return { ...entry, status: 'not_found', searchedPatterns: patterns };
    }
  } catch (error) {
    return { ...entry, status: 'error', error: error.message };
  }
}

// Run audit with rate limiting
async function runAudit() {
  const results = [];
  
  // Filter to only verifiable URLs (actual SEC document files)
  const verifiable = secUrls.filter(e => 
    e.url.includes('sec.gov/Archives') && 
    e.url.endsWith('.htm') || e.url.includes('.htm#')
  );
  
  console.log(`Auditing ${verifiable.length} SEC document URLs...`);
  
  for (let i = 0; i < verifiable.length; i++) {
    const entry = verifiable[i];
    console.log(`[${i+1}/${verifiable.length}] ${entry.ticker} - ${entry.field}`);
    
    const result = await auditUrl(entry);
    results.push(result);
    
    // Rate limiting: 200ms between requests
    await new Promise(r => setTimeout(r, 200));
  }
  
  // Categorize results
  const ok = results.filter(r => r.status === 'ok');
  const notFound = results.filter(r => r.status === 'not_found');
  const errors = results.filter(r => r.status === 'error');
  
  console.log('\n=== AUDIT RESULTS ===');
  console.log(`OK: ${ok.length}`);
  console.log(`NOT FOUND: ${notFound.length}`);
  console.log(`ERRORS: ${errors.length}`);
  
  if (notFound.length > 0) {
    console.log('\n=== NOT FOUND ===');
    for (const r of notFound) {
      console.log(`${r.ticker} - ${r.field}: searched for ${r.searchedPatterns.join(', ')}`);
      console.log(`  URL: ${r.url}`);
    }
  }
  
  if (errors.length > 0) {
    console.log('\n=== ERRORS ===');
    for (const r of errors) {
      console.log(`${r.ticker} - ${r.field}: ${r.error}`);
    }
  }
  
  return results;
}

runAudit().catch(console.error);
