/**
 * SEC Filings Migration Script
 * ============================
 * 
 * Fetches recent SEC filings for all companies and stores them locally.
 * 
 * Usage: npx tsx scripts/migrate-sec-filings.ts [--ticker=AVX] [--limit=20]
 */

import * as fs from 'fs';
import * as path from 'path';

// SEC API settings
const SEC_USER_AGENT = 'DATTracker/1.0 (https://dat-tracker-next.vercel.app; contact@dattracker.com)';
const RATE_LIMIT_MS = 200; // SEC asks for 10 req/sec max

// All companies with SEC CIKs
const SEC_COMPANIES: { ticker: string; cik: string; asset: string }[] = [
  { ticker: 'MSTR', cik: '1050446', asset: 'BTC' },
  { ticker: 'MARA', cik: '1507605', asset: 'BTC' },
  { ticker: 'RIOT', cik: '1167419', asset: 'BTC' },
  { ticker: 'CLSK', cik: '827876', asset: 'BTC' },
  { ticker: 'CORZ', cik: '1839341', asset: 'BTC' },
  { ticker: 'BTDR', cik: '1899123', asset: 'BTC' },
  { ticker: 'KULR', cik: '1662684', asset: 'BTC' },
  { ticker: 'XXI', cik: '2070457', asset: 'BTC' },
  { ticker: 'DJT', cik: '1849635', asset: 'BTC' },
  { ticker: 'CEPO', cik: '2027708', asset: 'BTC' },
  { ticker: 'NXTT', cik: '1784970', asset: 'BTC' },
  { ticker: 'NAKA', cik: '1946573', asset: 'BTC' },
  { ticker: 'ABTC', cik: '2068580', asset: 'BTC' },
  { ticker: 'ASST', cik: '1920406', asset: 'BTC' },
  { ticker: 'BMNR', cik: '1829311', asset: 'ETH' },
  { ticker: 'SBET', cik: '1981535', asset: 'ETH' },
  { ticker: 'BTCS', cik: '1436229', asset: 'ETH' },
  { ticker: 'BTBT', cik: '1710350', asset: 'ETH' },
  { ticker: 'GAME', cik: '1714562', asset: 'ETH' },
  { ticker: 'ETHM', cik: '2080334', asset: 'ETH' },
  { ticker: 'FGNX', cik: '1591890', asset: 'ETH' },
  { ticker: 'DFDV', cik: '1805526', asset: 'SOL' },
  { ticker: 'UPXI', cik: '1775194', asset: 'SOL' },
  { ticker: 'FWDI', cik: '38264', asset: 'SOL' },
  { ticker: 'HSDT', cik: '1610853', asset: 'SOL' },
  { ticker: 'STKE', cik: '1846839', asset: 'SOL' },
  { ticker: 'HYPD', cik: '1682639', asset: 'HYPE' },
  { ticker: 'PURR', cik: '2078856', asset: 'HYPE' },
  { ticker: 'NA', cik: '1872302', asset: 'BNB' },
  { ticker: 'BNC', cik: '1482541', asset: 'BNB' },
  { ticker: 'TAOX', cik: '1571934', asset: 'TAO' },
  { ticker: 'TWAV', cik: '746210', asset: 'TAO' },
  { ticker: 'CWD', cik: '1627282', asset: 'LINK' },
  { ticker: 'TRON', cik: '1956744', asset: 'TRX' },
  { ticker: 'XRPN', cik: '2044009', asset: 'XRP' },
  { ticker: 'CYPH', cik: '1509745', asset: 'ZEC' },
  { ticker: 'LITS', cik: '1262104', asset: 'LTC' },
  { ticker: 'SUIG', cik: '1425355', asset: 'SUI' },
  { ticker: 'ZONE', cik: '1956741', asset: 'DOGE' },
  { ticker: 'TBH', cik: '1903595', asset: 'DOGE' },
  { ticker: 'BTOG', cik: '1735556', asset: 'DOGE' },
  { ticker: 'AVX', cik: '1826397', asset: 'AVAX' },
];

interface SECFiling {
  accessionNumber: string;
  formType: string;
  filedDate: string;
  periodDate?: string;
  items?: string[];  // For 8-K: [1.01, 8.01, etc]
  description?: string;
  url: string;
}

interface CompanyFilings {
  ticker: string;
  cik: string;
  asset: string;
  companyName: string;
  filings: SECFiling[];
  fetchedAt: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSECSubmissions(cik: string): Promise<any> {
  const paddedCik = cik.padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': SEC_USER_AGENT,
      'Accept': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error(`SEC API returned ${response.status} for CIK ${cik}`);
  }
  
  return response.json();
}

function parse8KItems(description: string): string[] {
  // Extract item codes from description like "items 1.01, 8.01, and 9.01"
  const match = description.match(/items?\s+([\d.,\s]+(?:and\s+[\d.]+)?)/i);
  if (!match) return [];
  
  const itemsStr = match[1].replace(/and/gi, ',');
  return itemsStr.split(',')
    .map(s => s.trim())
    .filter(s => /^\d+\.\d+$/.test(s));
}

async function fetchCompanyFilings(
  ticker: string, 
  cik: string, 
  asset: string,
  limit: number = 50
): Promise<CompanyFilings> {
  console.log(`Fetching ${ticker} (CIK: ${cik})...`);
  
  const data = await fetchSECSubmissions(cik);
  const companyName = data.name || ticker;
  
  const recent = data.filings?.recent;
  if (!recent) {
    throw new Error(`No recent filings found for ${ticker}`);
  }
  
  const filings: SECFiling[] = [];
  const relevantForms = ['8-K', '8-K/A', '10-Q', '10-K', '10-K/A', 'S-3', 'S-1', '424B'];
  
  const count = Math.min(recent.form?.length || 0, limit);
  for (let i = 0; i < count; i++) {
    const formType = recent.form[i];
    
    // Skip irrelevant forms
    if (!relevantForms.some(f => formType.startsWith(f))) continue;
    
    const accessionNumber = recent.accessionNumber[i];
    const accessionClean = accessionNumber.replace(/-/g, '');
    const primaryDoc = recent.primaryDocument[i];
    const description = recent.primaryDocDescription?.[i] || '';
    
    const filing: SECFiling = {
      accessionNumber,
      formType,
      filedDate: recent.filingDate[i],
      periodDate: recent.reportDate?.[i],
      url: `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${primaryDoc}`,
    };
    
    // For 8-Ks, extract item codes
    if (formType.startsWith('8-K')) {
      filing.items = parse8KItems(description);
      filing.description = description;
    }
    
    filings.push(filing);
  }
  
  return {
    ticker,
    cik,
    asset,
    companyName,
    filings,
    fetchedAt: new Date().toISOString(),
  };
}

async function migrateAllCompanies(
  targetTicker?: string,
  limit: number = 50
): Promise<void> {
  const outputDir = path.join(__dirname, '..', 'src', 'lib', 'data', 'sec-filings');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const companies = targetTicker 
    ? SEC_COMPANIES.filter(c => c.ticker.toUpperCase() === targetTicker.toUpperCase())
    : SEC_COMPANIES;
  
  if (companies.length === 0) {
    console.error(`No company found for ticker: ${targetTicker}`);
    process.exit(1);
  }
  
  console.log(`\nMigrating ${companies.length} companies...\n`);
  
  const results: { ticker: string; status: string; filingCount?: number }[] = [];
  
  for (const company of companies) {
    try {
      const data = await fetchCompanyFilings(company.ticker, company.cik, company.asset, limit);
      
      // Write to JSON file
      const outputPath = path.join(outputDir, `${company.ticker.toLowerCase()}.json`);
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      
      results.push({ 
        ticker: company.ticker, 
        status: 'OK', 
        filingCount: data.filings.length 
      });
      
      console.log(`  ✓ ${company.ticker}: ${data.filings.length} filings saved`);
      
      // Rate limit
      await sleep(RATE_LIMIT_MS);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      results.push({ ticker: company.ticker, status: `FAILED: ${message}` });
      console.error(`  ✗ ${company.ticker}: ${message}`);
    }
  }
  
  // Summary
  console.log('\n=== Migration Summary ===');
  const success = results.filter(r => r.status === 'OK').length;
  const failed = results.filter(r => r.status !== 'OK').length;
  console.log(`Success: ${success}/${companies.length}`);
  console.log(`Failed: ${failed}/${companies.length}`);
  
  if (failed > 0) {
    console.log('\nFailed companies:');
    results.filter(r => r.status !== 'OK').forEach(r => {
      console.log(`  - ${r.ticker}: ${r.status}`);
    });
  }
  
  // Create index file
  const indexPath = path.join(outputDir, 'index.ts');
  const indexContent = generateIndexFile(companies.map(c => c.ticker));
  fs.writeFileSync(indexPath, indexContent);
  console.log(`\nIndex file created: ${indexPath}`);
}

function generateIndexFile(tickers: string[]): string {
  const imports = tickers.map(t => 
    `import ${t.replace(/[.-]/g, '_').toLowerCase()}Data from './${t.toLowerCase()}.json';`
  ).join('\n');
  
  const exports = tickers.map(t => 
    `  '${t}': ${t.replace(/[.-]/g, '_').toLowerCase()}Data,`
  ).join('\n');
  
  return `/**
 * SEC Filings Index
 * Auto-generated by migrate-sec-filings.ts
 * Last updated: ${new Date().toISOString()}
 */

${imports}

export const SEC_FILINGS: Record<string, any> = {
${exports}
};

export function getCompanyFilings(ticker: string) {
  return SEC_FILINGS[ticker.toUpperCase()];
}

export function getAllFilings() {
  return SEC_FILINGS;
}
`;
}

// Parse CLI args
const args = process.argv.slice(2);
let targetTicker: string | undefined;
let limit = 50;

for (const arg of args) {
  if (arg.startsWith('--ticker=')) {
    targetTicker = arg.split('=')[1];
  } else if (arg.startsWith('--limit=')) {
    limit = parseInt(arg.split('=')[1], 10);
  }
}

// Run migration
migrateAllCompanies(targetTicker, limit).catch(console.error);
