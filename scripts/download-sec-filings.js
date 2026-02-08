#!/usr/bin/env node
/**
 * Download MSTR SEC filings from EDGAR - Full Provenance Edition
 * 
 * Usage: 
 *   node scripts/download-sec-filings.js           # Downloads all relevant types
 *   node scripts/download-sec-filings.js 424B      # Just 424B
 *   node scripts/download-sec-filings.js S-3 S-1   # Just S-3 and S-1
 * 
 * SEC requires proper User-Agent header with contact info.
 * See: https://www.sec.gov/os/accessing-edgar-data
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const USER_AGENT = 'DAT-Tracker/1.0 (edwin.o.urey@gmail.com)';

const CIK = '0001050446'; // MicroStrategy/Strategy
const CIK_PADDED = CIK.padStart(10, '0');
const BASE_OUTPUT_DIR = path.join(__dirname, '..', 'public', 'sec', 'mstr');

// All form types needed for full BTC treasury provenance
const DEFAULT_FORM_TYPES = [
  '424B',     // Prospectus supplements (ATM sales, offerings)
  'S-3',      // Shelf registrations (includes S-3ASR, S-3/A)
  'S-1',      // IPO registrations (includes S-1/A)
  '8-A',      // Securities registration (includes 8-A12B)
  'EFFECT',   // Effectiveness notices
];

// Map form prefixes to folder names
function getFolderName(form) {
  const f = form.toUpperCase();
  if (f.startsWith('424B')) return '424b';
  if (f.startsWith('S-3')) return 's3';
  if (f.startsWith('S-1')) return 's1';
  if (f.startsWith('8-A')) return '8a';
  if (f.startsWith('EFFECT')) return 'effect';
  return f.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
}

async function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      }
    };
    
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${data.slice(0, 200)}`));
        }
      });
    }).on('error', reject);
  });
}

async function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html',
      }
    };
    
    https.get(url, options, (res) => {
      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchHtml(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function getAllFilings(formTypePrefixes) {
  // Fetch main submissions file
  const url = `https://data.sec.gov/submissions/CIK${CIK_PADDED}.json`;
  console.log(`Fetching filing list from: ${url}`);
  
  const data = await fetchJson(url);
  
  // Collect all filings from recent + historical files
  const allFilings = [];
  
  // Process recent filings
  const recent = data.filings.recent;
  for (let i = 0; i < recent.form.length; i++) {
    allFilings.push({
      form: recent.form[i],
      filingDate: recent.filingDate[i],
      accessionNumber: recent.accessionNumber[i],
      primaryDocument: recent.primaryDocument[i],
    });
  }
  console.log(`  Recent filings: ${recent.form.length}`);
  
  // Fetch historical filing files if they exist
  const historicalFiles = data.filings.files || [];
  for (const fileInfo of historicalFiles) {
    const histUrl = `https://data.sec.gov/submissions/${fileInfo.name}`;
    console.log(`  Fetching historical: ${fileInfo.name}`);
    
    await new Promise(r => setTimeout(r, 200)); // Rate limit
    
    try {
      const histData = await fetchJson(histUrl);
      for (let i = 0; i < histData.form.length; i++) {
        allFilings.push({
          form: histData.form[i],
          filingDate: histData.filingDate[i],
          accessionNumber: histData.accessionNumber[i],
          primaryDocument: histData.primaryDocument[i],
        });
      }
      console.log(`    Added ${histData.form.length} filings`);
    } catch (err) {
      console.error(`    Error fetching ${fileInfo.name}: ${err.message}`);
    }
  }
  
  console.log(`  Total filings found: ${allFilings.length}`);
  
  // Filter for requested form types
  const results = [];
  for (const filing of allFilings) {
    const form = filing.form.toUpperCase();
    const matchedPrefix = formTypePrefixes.find(prefix => form.startsWith(prefix.toUpperCase()));
    if (matchedPrefix) {
      results.push({
        ...filing,
        formPrefix: matchedPrefix,
      });
    }
  }
  
  return results;
}

async function downloadFiling(filing) {
  const accessionNoDashes = filing.accessionNumber.replace(/-/g, '');
  const url = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accessionNoDashes}/${filing.primaryDocument}`;
  
  const folderName = getFolderName(filing.form);
  const outputDir = path.join(BASE_OUTPUT_DIR, folderName);
  ensureDir(outputDir);
  
  const filename = `${filing.form.toLowerCase().replace(/\//g, '-')}-${filing.filingDate}-${accessionNoDashes.slice(-6)}.html`;
  const filepath = path.join(outputDir, filename);
  
  if (fs.existsSync(filepath)) {
    console.log(`  Skipping (exists): ${folderName}/${filename}`);
    return { skipped: true, filename };
  }
  
  console.log(`  Downloading: ${filing.primaryDocument}`);
  
  try {
    const html = await fetchHtml(url);
    fs.writeFileSync(filepath, html);
    console.log(`  Saved: ${folderName}/${filename}`);
    return { skipped: false, filename };
  } catch (err) {
    console.error(`  Error: ${err.message}`);
    return { error: err.message };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const formTypes = args.length > 0 ? args : DEFAULT_FORM_TYPES;
  
  console.log('='.repeat(60));
  console.log('MSTR SEC Filings Downloader - Full Provenance');
  console.log('='.repeat(60));
  console.log(`Form types: ${formTypes.join(', ')}`);
  console.log(`Output: ${BASE_OUTPUT_DIR}/[type]/\n`);
  
  try {
    const filings = await getAllFilings(formTypes);
    console.log(`\nFiltered to ${filings.length} matching filings\n`);
    
    // Sort by date
    filings.sort((a, b) => a.filingDate.localeCompare(b.filingDate));
    
    // Show breakdown by type
    const byType = {};
    for (const f of filings) {
      byType[f.form] = (byType[f.form] || 0) + 1;
    }
    console.log('By form type:');
    for (const [form, count] of Object.entries(byType).sort()) {
      console.log(`  ${form}: ${count}`);
    }
    console.log('');
    
    let downloaded = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const filing of filings) {
      console.log(`[${filing.filingDate}] ${filing.form}`);
      
      // Rate limit
      await new Promise(r => setTimeout(r, 200));
      
      const result = await downloadFiling(filing);
      if (result.skipped) skipped++;
      else if (result.error) errors++;
      else downloaded++;
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Done! Downloaded: ${downloaded}, Skipped: ${skipped}, Errors: ${errors}`);
    console.log('='.repeat(60));
    
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
