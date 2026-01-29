/**
 * Download SEC filing content locally
 * 
 * Stores full submission text (.txt) which includes main filing + all exhibits.
 * This avoids multiple requests per filing and gives us everything in one file.
 * 
 * Usage:
 *   npx tsx scripts/download-filing-content.ts           # All companies
 *   npx tsx scripts/download-filing-content.ts AVX       # Single company
 *   npx tsx scripts/download-filing-content.ts --dry-run # Preview only
 */

import * as fs from 'fs';
import * as path from 'path';

const SEC_FILINGS_DIR = path.join(__dirname, '../src/lib/data/sec-filings');
const CONTENT_DIR = path.join(__dirname, '../data/sec-content');

// Rate limit: SEC asks for max 10 requests/second
const RATE_LIMIT_MS = 150;

interface Filing {
  accessionNumber: string;
  formType: string;
  filedDate: string;
  url: string;
}

interface FilingMetadata {
  ticker: string;
  cik: string;
  filings: Filing[];
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getFullSubmissionUrl(cik: string, accessionNumber: string): string {
  // Full submission URL format:
  // https://www.sec.gov/Archives/edgar/data/{CIK}/{accession-no-dashes}/{accession}.txt
  const accessionNoDashes = accessionNumber.replace(/-/g, '');
  return `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionNoDashes}/${accessionNumber}.txt`;
}

async function downloadFiling(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DATCAP Research contact@datcap.com',
        'Accept-Encoding': 'gzip, deflate',
      },
    });
    
    if (!response.ok) {
      console.error(`  ❌ HTTP ${response.status}: ${url}`);
      return null;
    }
    
    return await response.text();
  } catch (error) {
    console.error(`  ❌ Fetch error: ${error}`);
    return null;
  }
}

async function processCompany(ticker: string, dryRun: boolean): Promise<{ downloaded: number; skipped: number; failed: number }> {
  const metadataPath = path.join(SEC_FILINGS_DIR, `${ticker.toLowerCase()}.json`);
  
  if (!fs.existsSync(metadataPath)) {
    console.error(`  No metadata file: ${metadataPath}`);
    return { downloaded: 0, skipped: 0, failed: 0 };
  }
  
  const metadata: FilingMetadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  const contentDir = path.join(CONTENT_DIR, ticker.toLowerCase());
  
  if (!dryRun && !fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
  }
  
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const filing of metadata.filings) {
    const filename = `${filing.accessionNumber}.txt`;
    const filepath = path.join(contentDir, filename);
    
    // Skip if already downloaded
    if (fs.existsSync(filepath)) {
      skipped++;
      continue;
    }
    
    const url = getFullSubmissionUrl(metadata.cik, filing.accessionNumber);
    
    if (dryRun) {
      console.log(`  Would download: ${filing.formType} ${filing.filedDate} → ${filename}`);
      downloaded++;
      continue;
    }
    
    console.log(`  Downloading: ${filing.formType} ${filing.filedDate}...`);
    const content = await downloadFiling(url);
    
    if (content) {
      fs.writeFileSync(filepath, content);
      downloaded++;
    } else {
      failed++;
    }
    
    await sleep(RATE_LIMIT_MS);
  }
  
  return { downloaded, skipped, failed };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const specificTicker = args.find(a => !a.startsWith('--'))?.toUpperCase();
  
  console.log('📥 SEC Filing Content Downloader');
  console.log(`   Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`   Target: ${specificTicker || 'ALL'}\n`);
  
  // Ensure content directory exists
  if (!dryRun && !fs.existsSync(CONTENT_DIR)) {
    fs.mkdirSync(CONTENT_DIR, { recursive: true });
  }
  
  // Get all JSON files or just the specified one
  const metadataFiles = fs.readdirSync(SEC_FILINGS_DIR)
    .filter(f => f.endsWith('.json') && f !== 'index.ts')
    .filter(f => !specificTicker || f === `${specificTicker.toLowerCase()}.json`);
  
  if (metadataFiles.length === 0) {
    console.error('No metadata files found');
    process.exit(1);
  }
  
  let totalDownloaded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  
  for (const file of metadataFiles) {
    const ticker = file.replace('.json', '').toUpperCase();
    console.log(`\n📁 ${ticker}`);
    
    const result = await processCompany(ticker, dryRun);
    totalDownloaded += result.downloaded;
    totalSkipped += result.skipped;
    totalFailed += result.failed;
    
    console.log(`   ✅ ${result.downloaded} downloaded, ${result.skipped} skipped, ${result.failed} failed`);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`📊 Total: ${totalDownloaded} downloaded, ${totalSkipped} skipped, ${totalFailed} failed`);
  console.log(`📂 Content stored in: ${CONTENT_DIR}`);
}

main().catch(console.error);
