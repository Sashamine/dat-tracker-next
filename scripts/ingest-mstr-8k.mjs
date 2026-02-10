#!/usr/bin/env node
/**
 * MSTR 8-K Auto-Ingestion Script
 * 
 * Fetches new MSTR 8-Ks from SEC EDGAR and updates:
 * - mstr-holdings-verified.ts (BTC holdings)
 * - mstr-atm-sales.ts (ATM share sales)  
 * - mstr-capital-events.ts (BTC purchases, capital events)
 * 
 * Run manually: node scripts/ingest-mstr-8k.mjs
 * Run with specific accession: node scripts/ingest-mstr-8k.mjs --accession 0001193125-26-XXXXXX
 * Dry run: node scripts/ingest-mstr-8k.mjs --dry-run
 * 
 * Can be wired to /api/cron/mstr-update for automated runs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

const CIK = '1050446';
const TICKER = 'MSTR';

// File paths
const HOLDINGS_FILE = path.join(PROJECT_ROOT, 'src/lib/data/mstr-holdings-verified.ts');
const ATM_FILE = path.join(PROJECT_ROOT, 'src/lib/data/mstr-atm-sales.ts');
const EVENTS_FILE = path.join(PROJECT_ROOT, 'src/lib/data/mstr-capital-events.ts');

// ============================================================================
// SEC EDGAR API
// ============================================================================

async function fetchRecentFilings(filingType = '8-K', count = 10) {
  const url = `https://data.sec.gov/submissions/CIK${CIK.padStart(10, '0')}.json`;
  const res = await fetch(url, { 
    headers: { 'User-Agent': 'DAT-Tracker research@datcap.com' } 
  });
  
  if (!res.ok) throw new Error(`SEC API error: ${res.status}`);
  
  const data = await res.json();
  const filings = [];
  
  for (let i = 0; i < data.filings.recent.form.length && filings.length < count; i++) {
    if (data.filings.recent.form[i] === filingType) {
      filings.push({
        accession: data.filings.recent.accessionNumber[i],
        filingDate: data.filings.recent.filingDate[i],
        primaryDocument: data.filings.recent.primaryDocument[i],
      });
    }
  }
  
  return filings;
}

async function fetch8KContent(accession) {
  const accClean = accession.replace(/-/g, '');
  
  // Get filing index
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/index.json`;
  const indexRes = await fetch(indexUrl, { 
    headers: { 'User-Agent': 'DAT-Tracker research@datcap.com' } 
  });
  
  if (!indexRes.ok) throw new Error(`Could not fetch filing index: ${indexRes.status}`);
  
  const index = await indexRes.json();
  
  // Find main 8-K document
  const doc = index.directory.item.find(d => 
    (d.name.endsWith('.htm') || d.name.endsWith('.html')) && 
    !d.name.includes('ex') &&
    d.size > 5000
  );
  
  if (!doc) throw new Error('Could not find main 8-K document');
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${doc.name}`;
  const docRes = await fetch(docUrl, { 
    headers: { 'User-Agent': 'DAT-Tracker research@datcap.com' } 
  });
  
  const html = await docRes.text();
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  return { html, text, docName: doc.name };
}

// ============================================================================
// EXTRACTION PATTERNS
// ============================================================================

function extractHoldingsData(text) {
  // Pattern: "held approximately X bitcoins" or "aggregate of X bitcoins"
  const holdingsPatterns = [
    /(?:held|holds|hold) (?:an aggregate of )?(?:approximately )?([\d,]+) (?:bitcoin|BTC)/i,
    /aggregate (?:BTC|bitcoin) holdings? (?:of|were) (?:approximately )?([\d,]+)/i,
    /([\d,]+) (?:bitcoin|BTC).*?(?:in the aggregate|total|aggregate holdings)/i,
  ];
  
  for (const pattern of holdingsPatterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''), 10);
    }
  }
  return null;
}

function extractBTCPurchase(text) {
  // Pattern: "purchased/acquired X bitcoins for $Y"
  const purchasePatterns = [
    /(?:purchased|acquired) (?:approximately )?([\d,]+) (?:bitcoin|BTC).*?(?:for|at).*?\$([\d,.]+)\s*(million|billion)/i,
    /(?:purchased|acquired).*?\$([\d,.]+)\s*(million|billion).*?([\d,]+) (?:bitcoin|BTC)/i,
  ];
  
  for (const pattern of purchasePatterns) {
    const match = text.match(pattern);
    if (match) {
      let btc, cost;
      if (match[3] && match[3].match(/million|billion/i)) {
        // First pattern: BTC first, then cost
        btc = parseInt(match[1].replace(/,/g, ''), 10);
        cost = parseFloat(match[2].replace(/,/g, ''));
        if (match[3].toLowerCase() === 'billion') cost *= 1e9;
        else cost *= 1e6;
      } else {
        // Second pattern: cost first, then BTC
        cost = parseFloat(match[1].replace(/,/g, ''));
        if (match[2].toLowerCase() === 'billion') cost *= 1e9;
        else cost *= 1e6;
        btc = parseInt(match[3].replace(/,/g, ''), 10);
      }
      return { btcAcquired: btc, totalCost: cost, avgPrice: Math.round(cost / btc) };
    }
  }
  return null;
}

function extractCostBasis(text) {
  // Pattern: "aggregate purchase price of $X billion"
  const costPattern = /aggregate purchase price of (?:approximately )?\$([\d,.]+)\s*(billion|million)/i;
  const match = text.match(costPattern);
  
  if (match) {
    let cost = parseFloat(match[1].replace(/,/g, ''));
    if (match[2].toLowerCase() === 'billion') cost *= 1e9;
    else cost *= 1e6;
    return cost;
  }
  return null;
}

function extractAvgCostPerBTC(text) {
  // Pattern: "$X per bitcoin"
  const avgPattern = /\$([\d,]+)(?:\.\d+)? per (?:bitcoin|BTC)/i;
  const match = text.match(avgPattern);
  
  if (match) {
    return parseInt(match[1].replace(/,/g, ''), 10);
  }
  return null;
}

function extractATMSales(text) {
  // Look for ATM table or narrative
  const results = {
    shares: null,
    proceeds: null,
    byProgram: {},
  };
  
  // Pattern: "X shares of Class A common stock" with proceeds
  const classAPattern = /([\d,]+) shares of Class A common stock.*?\$([\d,.]+)\s*(million|billion)/i;
  const classAMatch = text.match(classAPattern);
  
  if (classAMatch) {
    results.shares = parseInt(classAMatch[1].replace(/,/g, ''), 10);
    let proceeds = parseFloat(classAMatch[2].replace(/,/g, ''));
    if (classAMatch[3].toLowerCase() === 'billion') proceeds *= 1e9;
    else proceeds *= 1e6;
    results.proceeds = proceeds;
    results.byProgram['MSTR ATM'] = results.shares;
  }
  
  return results.shares ? results : null;
}

function extractPeriodDates(text) {
  // Pattern: "from X through Y" or "between X and Y"
  const periodPattern = /(?:from|between) ([A-Za-z]+ \d+, \d{4})(?:,)? (?:through|and|to) ([A-Za-z]+ \d+, \d{4})/i;
  const match = text.match(periodPattern);
  
  if (match) {
    return {
      startDate: new Date(match[1]).toISOString().split('T')[0],
      endDate: new Date(match[2]).toISOString().split('T')[0],
    };
  }
  return null;
}

// ============================================================================
// FILE UPDATERS
// ============================================================================

function updateHoldingsFile(entry, dryRun = false) {
  const content = fs.readFileSync(HOLDINGS_FILE, 'utf-8');
  
  // Check if entry already exists
  if (content.includes(`date: "${entry.date}"`)) {
    console.log(`  ⏭️  Holdings entry for ${entry.date} already exists`);
    return false;
  }
  
  // Find the closing bracket of the array
  const insertPoint = content.lastIndexOf('];');
  if (insertPoint === -1) throw new Error('Could not find array end in holdings file');
  
  const newEntry = `  { date: "${entry.date}", holdings: ${entry.holdings}, filingType: "8K", accession: "${entry.accession}", source: "8k-${entry.date}-${entry.accession}.html" },\n`;
  
  const newContent = content.slice(0, insertPoint) + newEntry + content.slice(insertPoint);
  
  // Update generation date
  const updatedContent = newContent.replace(
    /Generated: \d{4}-\d{2}-\d{2}/,
    `Generated: ${new Date().toISOString().split('T')[0]}`
  );
  
  if (dryRun) {
    console.log(`  📝 Would add holdings entry: ${entry.holdings} BTC on ${entry.date}`);
    return true;
  }
  
  fs.writeFileSync(HOLDINGS_FILE, updatedContent);
  console.log(`  ✅ Added holdings entry: ${entry.holdings} BTC on ${entry.date}`);
  return true;
}

function updateATMFile(entry, dryRun = false) {
  const content = fs.readFileSync(ATM_FILE, 'utf-8');
  
  // Check if entry already exists
  if (content.includes(`filingDate: "${entry.filingDate}"`)) {
    console.log(`  ⏭️  ATM entry for ${entry.filingDate} already exists`);
    return false;
  }
  
  // Find the closing bracket of the array
  const insertPoint = content.lastIndexOf('];');
  if (insertPoint === -1) throw new Error('Could not find array end in ATM file');
  
  const newEntry = `  {
    filingDate: "${entry.filingDate}",
    shares: ${entry.shares},
    proceeds: ${entry.proceeds},
    format: "table",
    sharesByProgram: ${JSON.stringify(entry.sharesByProgram || {"MSTR ATM": entry.shares})},
    accessionNumber: "${entry.accession}",
    secUrl: "https://www.sec.gov/Archives/edgar/data/${CIK}/${entry.accession.replace(/-/g, '')}/${entry.docName}",
  },\n`;
  
  const newContent = content.slice(0, insertPoint) + newEntry + content.slice(insertPoint);
  
  // Update stats in header
  const updatedContent = newContent.replace(
    /Generated: \d{4}-\d{2}-\d{2}T[\d:.]+Z/,
    `Generated: ${new Date().toISOString()}`
  );
  
  if (dryRun) {
    console.log(`  📝 Would add ATM entry: ${entry.shares.toLocaleString()} shares, $${(entry.proceeds/1e6).toFixed(1)}M on ${entry.filingDate}`);
    return true;
  }
  
  fs.writeFileSync(ATM_FILE, updatedContent);
  console.log(`  ✅ Added ATM entry: ${entry.shares.toLocaleString()} shares on ${entry.filingDate}`);
  return true;
}

function updateCapitalEventsFile(entry, dryRun = false) {
  const content = fs.readFileSync(EVENTS_FILE, 'utf-8');
  
  // Check if entry already exists
  if (content.includes(`accessionNumber: "${entry.accession}"`)) {
    console.log(`  ⏭️  Capital event for ${entry.accession} already exists`);
    return false;
  }
  
  // Find a good insertion point (before the closing of MSTR_CAPITAL_EVENTS array)
  const insertPoint = content.lastIndexOf('];');
  if (insertPoint === -1) throw new Error('Could not find array end in events file');
  
  const newEntry = `  {
    date: "${entry.date}",
    filedDate: "${entry.filingDate}",
    accessionNumber: "${entry.accession}",
    secUrl: "https://www.sec.gov/Archives/edgar/data/${CIK}/${entry.accession.replace(/-/g, '')}/${entry.accession}-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - ${entry.btcAcquired?.toLocaleString() || '?'} BTC for $${((entry.totalCost || 0)/1e6).toFixed(1)}M",
    btcAcquired: ${entry.btcAcquired || 0},
    btcCost: ${entry.totalCost || 0},
    btcAvgPrice: ${entry.avgPrice || 0},
    btcTotal: ${entry.holdings || 0},
    btcTotalCost: ${entry.totalCostBasis || 0},
    atmCommonShares: ${entry.atmShares || 0},
    atmCommonProceeds: ${entry.atmProceeds || 0},
    notes: "Auto-ingested from SEC 8-K",
  },\n`;
  
  const newContent = content.slice(0, insertPoint) + newEntry + content.slice(insertPoint);
  
  if (dryRun) {
    console.log(`  📝 Would add capital event: ${entry.btcAcquired || 0} BTC purchased on ${entry.date}`);
    return true;
  }
  
  fs.writeFileSync(EVENTS_FILE, newContent);
  console.log(`  ✅ Added capital event for ${entry.date}`);
  return true;
}

// ============================================================================
// MAIN
// ============================================================================

async function ingest8K(accession, filingDate, dryRun = false) {
  console.log(`\n📄 Processing 8-K: ${accession} (filed ${filingDate})`);
  
  // Fetch content
  const { text, docName } = await fetch8KContent(accession);
  
  // Extract data
  const holdings = extractHoldingsData(text);
  const purchase = extractBTCPurchase(text);
  const totalCostBasis = extractCostBasis(text);
  const avgCostPerBTC = extractAvgCostPerBTC(text);
  const atmSales = extractATMSales(text);
  const period = extractPeriodDates(text);
  
  console.log(`  📊 Extracted:`);
  console.log(`     Holdings: ${holdings?.toLocaleString() || 'N/A'} BTC`);
  console.log(`     Purchase: ${purchase?.btcAcquired?.toLocaleString() || 'N/A'} BTC for $${((purchase?.totalCost || 0)/1e6).toFixed(1)}M`);
  console.log(`     ATM: ${atmSales?.shares?.toLocaleString() || 'N/A'} shares, $${((atmSales?.proceeds || 0)/1e6).toFixed(1)}M`);
  console.log(`     Period: ${period?.startDate || 'N/A'} to ${period?.endDate || 'N/A'}`);
  
  // Determine event date (end of period or filing date minus 1)
  const eventDate = period?.endDate || new Date(new Date(filingDate).getTime() - 86400000).toISOString().split('T')[0];
  const accessionSuffix = accession.split('-').pop();
  
  let updated = false;
  
  // Update holdings file
  if (holdings) {
    updated = updateHoldingsFile({
      date: eventDate,
      holdings,
      accession: accessionSuffix,
    }, dryRun) || updated;
  }
  
  // Update ATM file
  if (atmSales?.shares) {
    updated = updateATMFile({
      filingDate,
      shares: atmSales.shares,
      proceeds: atmSales.proceeds,
      sharesByProgram: atmSales.byProgram,
      accession,
      docName,
    }, dryRun) || updated;
  }
  
  // Update capital events file
  if (holdings || purchase) {
    updated = updateCapitalEventsFile({
      date: eventDate,
      filingDate,
      accession,
      holdings,
      btcAcquired: purchase?.btcAcquired,
      totalCost: purchase?.totalCost,
      avgPrice: purchase?.avgPrice || avgCostPerBTC,
      totalCostBasis,
      atmShares: atmSales?.shares,
      atmProceeds: atmSales?.proceeds,
    }, dryRun) || updated;
  }
  
  return updated;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const accessionArg = args.find(a => a.startsWith('--accession='))?.split('=')[1];
  
  console.log('🚀 MSTR 8-K Ingestion Pipeline');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  
  try {
    if (accessionArg) {
      // Process specific accession
      const filings = await fetchRecentFilings('8-K', 20);
      const filing = filings.find(f => f.accession === accessionArg);
      const filingDate = filing?.filingDate || new Date().toISOString().split('T')[0];
      
      await ingest8K(accessionArg, filingDate, dryRun);
    } else {
      // Process recent filings
      console.log('\n📡 Fetching recent MSTR 8-Ks from SEC EDGAR...');
      const filings = await fetchRecentFilings('8-K', 5);
      
      console.log(`   Found ${filings.length} recent 8-Ks`);
      
      for (const filing of filings) {
        await ingest8K(filing.accession, filing.filingDate, dryRun);
      }
    }
    
    console.log('\n✅ Ingestion complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
