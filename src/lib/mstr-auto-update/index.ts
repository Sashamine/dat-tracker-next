/**
 * MSTR Auto-Update Module
 * 
 * Automatically detects new MSTR 8-Ks from SEC EDGAR and updates:
 * - mstr-holdings-verified.ts
 * - mstr-atm-sales.ts  
 * - mstr-capital-events.ts
 * 
 * Designed to be called from /api/cron/mstr-update
 */

import * as fs from 'fs';
import * as path from 'path';

const CIK = '1050446';
const CIK_PADDED = CIK.padStart(10, '0');

// File paths (relative to project root)
const DATA_DIR = 'src/lib/data';
const HOLDINGS_FILE = `${DATA_DIR}/mstr-holdings-verified.ts`;
const ATM_FILE = `${DATA_DIR}/mstr-atm-sales.ts`;
const EVENTS_FILE = `${DATA_DIR}/mstr-capital-events.ts`;

export interface MSTRUpdateResult {
  success: boolean;
  newFilings: number;
  processed: ProcessedFiling[];
  errors: string[];
}

export interface ProcessedFiling {
  accession: string;
  filingDate: string;
  holdings?: number;
  btcAcquired?: number;
  btcCost?: number;
  atmShares?: number;
  atmProceeds?: number;
  updated: string[]; // which files were updated
}

interface SECFiling {
  accession: string;
  filingDate: string;
  form: string;
  primaryDocument: string;
}

// ============================================================================
// SEC EDGAR API
// ============================================================================

export async function fetchRecentFilings(formType = '8-K', count = 20): Promise<SECFiling[]> {
  const url = `https://data.sec.gov/submissions/CIK${CIK_PADDED}.json`;
  
  const res = await fetch(url, {
    headers: { 'User-Agent': 'DAT-Tracker research@datcap.com' }
  });
  
  if (!res.ok) {
    throw new Error(`SEC API error: ${res.status}`);
  }
  
  const data = await res.json();
  const filings: SECFiling[] = [];
  
  const recent = data.filings?.recent;
  if (!recent) throw new Error('No recent filings in SEC response');
  
  for (let i = 0; i < recent.form.length && filings.length < count; i++) {
    if (recent.form[i] === formType) {
      filings.push({
        accession: recent.accessionNumber[i],
        filingDate: recent.filingDate[i],
        form: recent.form[i],
        primaryDocument: recent.primaryDocument[i],
      });
    }
  }
  
  return filings;
}

export async function fetch8KContent(accession: string): Promise<{ html: string; text: string; docName: string }> {
  const accClean = accession.replace(/-/g, '');
  
  // Get filing index to find main document
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/index.json`;
  const indexRes = await fetch(indexUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@datcap.com' }
  });
  
  if (!indexRes.ok) {
    throw new Error(`Could not fetch filing index: ${indexRes.status}`);
  }
  
  const index = await indexRes.json();
  
  // Find main 8-K document (largest .htm that's not an exhibit)
  const docs = index.directory?.item || [];
  const mainDoc = docs
    .filter((d: any) => (d.name.endsWith('.htm') || d.name.endsWith('.html')) && !d.name.includes('ex'))
    .sort((a: any, b: any) => (b.size || 0) - (a.size || 0))[0];
  
  if (!mainDoc) {
    throw new Error('Could not find main 8-K document');
  }
  
  const docUrl = `https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${mainDoc.name}`;
  const docRes = await fetch(docUrl, {
    headers: { 'User-Agent': 'DAT-Tracker research@datcap.com' }
  });
  
  if (!docRes.ok) {
    throw new Error(`Could not fetch document: ${docRes.status}`);
  }
  
  const html = await docRes.text();
  const text = html.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ');
  
  return { html, text, docName: mainDoc.name };
}

// ============================================================================
// EXTRACTION - Table-based format (current MSTR 8-Ks)
// ============================================================================

export function extractHoldings(text: string): number | null {
  // Look for aggregate holdings patterns
  const patterns = [
    /Aggregate BTC Holdings[^0-9]*([\d,]+)/i,
    /(?:held|holds|hold)[^0-9]*(?:approximately\s+)?([\d,]+)\s*(?:bitcoin|BTC)/i,
    /aggregate[^0-9]*([\d,]+)\s*(?:bitcoin|BTC)/i,
    /([\d,]+)\s*(?:bitcoin|BTC)[^0-9]*(?:in the aggregate|total holdings)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseInt(match[1].replace(/,/g, ''), 10);
      // Sanity check - should be > 100k for MSTR
      if (value > 100000 && value < 10000000) {
        return value;
      }
    }
  }
  return null;
}

export function extractBTCPurchase(text: string): { btcAcquired: number; totalCost: number; avgPrice: number } | null {
  // Pattern: "BTC Acquired" column with value, and cost
  const btcPattern = /BTC Acquired[^0-9]*([\d,]+)/i;
  const costPattern = /(?:Aggregate Purchase Price|Total Cost)[^$]*\$([\d,.]+)\s*(million|billion)?/i;
  const avgPattern = /(?:Average Purchase Price|per bitcoin)[^$]*\$([\d,]+)/i;
  
  const btcMatch = text.match(btcPattern);
  const costMatch = text.match(costPattern);
  const avgMatch = text.match(avgPattern);
  
  if (!btcMatch) return null;
  
  const btcAcquired = parseInt(btcMatch[1].replace(/,/g, ''), 10);
  
  let totalCost = 0;
  if (costMatch) {
    totalCost = parseFloat(costMatch[1].replace(/,/g, ''));
    if (costMatch[2]?.toLowerCase() === 'billion') totalCost *= 1e9;
    else if (costMatch[2]?.toLowerCase() === 'million') totalCost *= 1e6;
    else if (totalCost < 1000) totalCost *= 1e6; // Assume millions if no unit and small number
  }
  
  let avgPrice = 0;
  if (avgMatch) {
    avgPrice = parseInt(avgMatch[1].replace(/,/g, ''), 10);
  } else if (btcAcquired > 0 && totalCost > 0) {
    avgPrice = Math.round(totalCost / btcAcquired);
  }
  
  // Sanity checks
  if (btcAcquired < 1 || btcAcquired > 100000) return null;
  
  return { btcAcquired, totalCost, avgPrice };
}

export function extractATMSales(text: string): { shares: number; proceeds: number } | null {
  // Look for Class A common stock sales
  const sharesPattern = /Class A[^0-9]*([\d,]+)\s*(?:shares|common)/i;
  const proceedsPattern = /(?:Net Proceeds|Gross Proceeds)[^$]*\$([\d,.]+)\s*(million|billion)?/i;
  
  // Alternative: look for table with shares and proceeds
  const tablePattern = /MSTR[^0-9]*([\d,]+)[^$]*\$([\d,.]+)\s*(million)?/i;
  
  let shares = 0;
  let proceeds = 0;
  
  const sharesMatch = text.match(sharesPattern);
  const proceedsMatch = text.match(proceedsPattern);
  
  if (sharesMatch) {
    shares = parseInt(sharesMatch[1].replace(/,/g, ''), 10);
  }
  
  if (proceedsMatch) {
    proceeds = parseFloat(proceedsMatch[1].replace(/,/g, ''));
    if (proceedsMatch[2]?.toLowerCase() === 'billion') proceeds *= 1e9;
    else if (proceedsMatch[2]?.toLowerCase() === 'million') proceeds *= 1e6;
    else if (proceeds < 10000) proceeds *= 1e6;
  }
  
  // Try table pattern if individual patterns didn't work well
  if (!shares || !proceeds) {
    const tableMatch = text.match(tablePattern);
    if (tableMatch) {
      shares = parseInt(tableMatch[1].replace(/,/g, ''), 10);
      proceeds = parseFloat(tableMatch[2].replace(/,/g, ''));
      if (tableMatch[3]?.toLowerCase() === 'million') proceeds *= 1e6;
      else if (proceeds < 10000) proceeds *= 1e6;
    }
  }
  
  if (shares < 1000) return null; // Too few shares to be valid ATM
  
  return { shares, proceeds };
}

export function extractPeriodEnd(text: string, filingDate: string): string {
  // Look for period end date in filing
  const periodPattern = /(?:through|ending|as of)\s+([A-Za-z]+\s+\d+,?\s+\d{4})/i;
  const match = text.match(periodPattern);
  
  if (match) {
    try {
      const date = new Date(match[1]);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Fall through to default
    }
  }
  
  // Default: filing date minus 1 day
  const filing = new Date(filingDate);
  filing.setDate(filing.getDate() - 1);
  return filing.toISOString().split('T')[0];
}

// ============================================================================
// FILE READERS - Get existing entries
// ============================================================================

export function getExistingAccessions(projectRoot: string): Set<string> {
  const accessions = new Set<string>();
  
  // Read from holdings file
  const holdingsPath = path.join(projectRoot, HOLDINGS_FILE);
  if (fs.existsSync(holdingsPath)) {
    const content = fs.readFileSync(holdingsPath, 'utf-8');
    const matches = content.matchAll(/accession:\s*"([^"]+)"/g);
    for (const match of matches) {
      accessions.add(match[1]);
    }
  }
  
  // Read from events file
  const eventsPath = path.join(projectRoot, EVENTS_FILE);
  if (fs.existsSync(eventsPath)) {
    const content = fs.readFileSync(eventsPath, 'utf-8');
    const matches = content.matchAll(/accessionNumber:\s*"([^"]+)"/g);
    for (const match of matches) {
      accessions.add(match[1]);
    }
  }
  
  return accessions;
}

// ============================================================================
// FILE UPDATERS
// ============================================================================

export function updateHoldingsFile(
  projectRoot: string,
  entry: { date: string; holdings: number; accession: string },
  dryRun = false
): boolean {
  const filePath = path.join(projectRoot, HOLDINGS_FILE);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already exists
  if (content.includes(`accession: "${entry.accession}"`)) {
    return false;
  }
  
  // Find insertion point (before closing ];)
  const insertPoint = content.lastIndexOf('];');
  if (insertPoint === -1) throw new Error('Could not find array end');
  
  const newEntry = `  { date: "${entry.date}", holdings: ${entry.holdings}, filingType: "8K", accession: "${entry.accession}", source: "8k-${entry.date}-${entry.accession}.html" },\n`;
  
  const newContent = content.slice(0, insertPoint) + newEntry + content.slice(insertPoint);
  
  // Update generation date
  const updatedContent = newContent.replace(
    /Generated: \d{4}-\d{2}-\d{2}/,
    `Generated: ${new Date().toISOString().split('T')[0]}`
  );
  
  if (!dryRun) {
    fs.writeFileSync(filePath, updatedContent);
  }
  
  return true;
}

export function updateATMFile(
  projectRoot: string,
  entry: { filingDate: string; shares: number; proceeds: number; accession: string; docName: string },
  dryRun = false
): boolean {
  const filePath = path.join(projectRoot, ATM_FILE);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already exists
  if (content.includes(`filingDate: "${entry.filingDate}"`)) {
    return false;
  }
  
  const insertPoint = content.lastIndexOf('];');
  if (insertPoint === -1) throw new Error('Could not find array end');
  
  const accClean = entry.accession.replace(/-/g, '');
  const newEntry = `  {
    filingDate: "${entry.filingDate}",
    shares: ${entry.shares},
    proceeds: ${entry.proceeds},
    format: "table",
    sharesByProgram: {"MSTR ATM": ${entry.shares}},
    accessionNumber: "${entry.accession}",
    secUrl: "https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${entry.docName}",
  },\n`;
  
  const newContent = content.slice(0, insertPoint) + newEntry + content.slice(insertPoint);
  
  if (!dryRun) {
    fs.writeFileSync(filePath, newContent);
  }
  
  return true;
}

export function updateEventsFile(
  projectRoot: string,
  entry: {
    date: string;
    filingDate: string;
    accession: string;
    holdings?: number;
    btcAcquired?: number;
    totalCost?: number;
    avgPrice?: number;
    atmShares?: number;
    atmProceeds?: number;
  },
  dryRun = false
): boolean {
  const filePath = path.join(projectRoot, EVENTS_FILE);
  const content = fs.readFileSync(filePath, 'utf-8');
  
  // Check if already exists
  if (content.includes(`accessionNumber: "${entry.accession}"`)) {
    return false;
  }
  
  const insertPoint = content.lastIndexOf('];');
  if (insertPoint === -1) throw new Error('Could not find array end');
  
  const accClean = entry.accession.replace(/-/g, '');
  const description = entry.btcAcquired 
    ? `Weekly BTC Update - ${entry.btcAcquired.toLocaleString()} BTC for $${((entry.totalCost || 0) / 1e6).toFixed(1)}M`
    : `Weekly BTC Update`;
  
  const newEntry = `  {
    date: "${entry.date}",
    filedDate: "${entry.filingDate}",
    accessionNumber: "${entry.accession}",
    secUrl: "https://www.sec.gov/Archives/edgar/data/${CIK}/${accClean}/${entry.accession}-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "${description}",
    btcAcquired: ${entry.btcAcquired || 0},
    btcCost: ${entry.totalCost || 0},
    btcAvgPrice: ${entry.avgPrice || 0},
    btcTotal: ${entry.holdings || 0},
    atmCommonShares: ${entry.atmShares || 0},
    atmCommonProceeds: ${entry.atmProceeds || 0},
    notes: "Auto-ingested via mstr-auto-update",
  },\n`;
  
  const newContent = content.slice(0, insertPoint) + newEntry + content.slice(insertPoint);
  
  if (!dryRun) {
    fs.writeFileSync(filePath, newContent);
  }
  
  return true;
}

// ============================================================================
// MAIN UPDATE FUNCTION
// ============================================================================

export interface MSTRUpdateOptions {
  projectRoot: string;
  dryRun?: boolean;
  maxFilings?: number;
}

export async function runMSTRAutoUpdate(options: MSTRUpdateOptions): Promise<MSTRUpdateResult> {
  const { projectRoot, dryRun = false, maxFilings = 10 } = options;
  
  const result: MSTRUpdateResult = {
    success: true,
    newFilings: 0,
    processed: [],
    errors: [],
  };
  
  try {
    // 1. Get existing accessions
    const existingAccessions = getExistingAccessions(projectRoot);
    console.log(`[MSTR Update] Found ${existingAccessions.size} existing accessions`);
    
    // 2. Fetch recent 8-Ks from SEC
    const recentFilings = await fetchRecentFilings('8-K', maxFilings);
    console.log(`[MSTR Update] Found ${recentFilings.length} recent 8-Ks`);
    
    // 3. Filter to new filings only
    const newFilings = recentFilings.filter(f => {
      const suffix = f.accession.split('-').pop() || '';
      return !existingAccessions.has(suffix) && !existingAccessions.has(f.accession);
    });
    
    console.log(`[MSTR Update] ${newFilings.length} new filings to process`);
    result.newFilings = newFilings.length;
    
    // 4. Process each new filing
    for (const filing of newFilings) {
      try {
        console.log(`[MSTR Update] Processing ${filing.accession} (${filing.filingDate})`);
        
        const { text, docName } = await fetch8KContent(filing.accession);
        
        // Extract data
        const holdings = extractHoldings(text);
        const purchase = extractBTCPurchase(text);
        const atm = extractATMSales(text);
        const eventDate = extractPeriodEnd(text, filing.filingDate);
        const accessionSuffix = filing.accession.split('-').pop() || filing.accession;
        
        console.log(`  Holdings: ${holdings?.toLocaleString() || 'N/A'}`);
        console.log(`  BTC Acquired: ${purchase?.btcAcquired?.toLocaleString() || 'N/A'}`);
        console.log(`  ATM Shares: ${atm?.shares?.toLocaleString() || 'N/A'}`);
        
        const processed: ProcessedFiling = {
          accession: filing.accession,
          filingDate: filing.filingDate,
          holdings: holdings || undefined,
          btcAcquired: purchase?.btcAcquired,
          btcCost: purchase?.totalCost,
          atmShares: atm?.shares,
          atmProceeds: atm?.proceeds,
          updated: [],
        };
        
        // Update files
        if (holdings) {
          const updated = updateHoldingsFile(projectRoot, {
            date: eventDate,
            holdings,
            accession: accessionSuffix,
          }, dryRun);
          if (updated) processed.updated.push('mstr-holdings-verified.ts');
        }
        
        if (atm?.shares) {
          const updated = updateATMFile(projectRoot, {
            filingDate: filing.filingDate,
            shares: atm.shares,
            proceeds: atm.proceeds,
            accession: filing.accession,
            docName,
          }, dryRun);
          if (updated) processed.updated.push('mstr-atm-sales.ts');
        }
        
        if (holdings || purchase) {
          const updated = updateEventsFile(projectRoot, {
            date: eventDate,
            filingDate: filing.filingDate,
            accession: filing.accession,
            holdings,
            btcAcquired: purchase?.btcAcquired,
            totalCost: purchase?.totalCost,
            avgPrice: purchase?.avgPrice,
            atmShares: atm?.shares,
            atmProceeds: atm?.proceeds,
          }, dryRun);
          if (updated) processed.updated.push('mstr-capital-events.ts');
        }
        
        result.processed.push(processed);
        
        // Rate limit - don't hammer SEC
        await new Promise(r => setTimeout(r, 500));
        
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        result.errors.push(`${filing.accession}: ${msg}`);
        console.error(`[MSTR Update] Error processing ${filing.accession}:`, msg);
      }
    }
    
  } catch (error) {
    result.success = false;
    result.errors.push(error instanceof Error ? error.message : String(error));
  }
  
  return result;
}
