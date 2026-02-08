#!/usr/bin/env node
/**
 * Upload SEC filings to Cloudflare R2 with organized structure
 * 
 * Usage:
 *   wrangler login                    # First time only
 *   node scripts/upload-to-r2.js      # Upload all local SEC files
 * 
 * Structure: {ticker}/{type}/{form}-{date}-{accession}.html
 * Example:   mstr/8k/8k-2026-01-26.html
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// =============================================================================
// CONFIGURATION - Change SEC_BASE_URL when custom domain is ready
// =============================================================================
const R2_BUCKET = 'dat-tracker-filings';
const SEC_BASE_URL = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';
// Future: const SEC_BASE_URL = 'https://sec.datcap.io';

const LOCAL_SEC_DIR = path.join(__dirname, '..', 'public', 'sec');
// =============================================================================

function getAllFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (item.endsWith('.html')) {
      files.push(fullPath);
    }
  }
  return files;
}

function getR2Key(localPath) {
  // Convert local path to R2 key
  // From: C:\...\public\sec\mstr\8k\8k-2026-01-26.html
  // To:   mstr/8k/8k-2026-01-26.html
  const relativePath = path.relative(LOCAL_SEC_DIR, localPath);
  return relativePath.replace(/\\/g, '/');
}

function uploadFile(localPath, r2Key) {
  // IMPORTANT: --remote flag required to upload to actual R2, not local emulator
  const cmd = `wrangler r2 object put "${R2_BUCKET}/${r2Key}" --file="${localPath}" --content-type="text/html" --remote`;
  try {
    execSync(cmd, { stdio: 'pipe' });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function checkFile(r2Key) {
  // IMPORTANT: --remote flag required to check actual R2, not local emulator
  const cmd = `wrangler r2 object head "${R2_BUCKET}/${r2Key}" --remote 2>&1`;
  try {
    execSync(cmd, { stdio: 'pipe' });
    return true; // File exists
  } catch {
    return false; // File doesn't exist
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('R2 SEC Filing Uploader');
  console.log('='.repeat(60));
  console.log(`Bucket: ${R2_BUCKET}`);
  console.log(`Base URL: ${SEC_BASE_URL}`);
  console.log(`Local dir: ${LOCAL_SEC_DIR}\n`);

  // Check wrangler auth
  try {
    execSync('wrangler whoami', { stdio: 'pipe' });
  } catch {
    console.error('ERROR: Not logged in to wrangler. Run: wrangler login');
    process.exit(1);
  }

  // Get all local HTML files
  const files = getAllFiles(LOCAL_SEC_DIR);
  console.log(`Found ${files.length} local files\n`);

  // Group by ticker for summary
  const byTicker = {};
  for (const f of files) {
    const r2Key = getR2Key(f);
    const ticker = r2Key.split('/')[0];
    byTicker[ticker] = (byTicker[ticker] || 0) + 1;
  }
  console.log('By ticker:');
  for (const [ticker, count] of Object.entries(byTicker).sort()) {
    console.log(`  ${ticker}: ${count}`);
  }
  console.log('');

  // Upload files
  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < files.length; i++) {
    const localPath = files[i];
    const r2Key = getR2Key(localPath);
    
    process.stdout.write(`[${i + 1}/${files.length}] ${r2Key}... `);

    // Check if already exists
    if (checkFile(r2Key)) {
      console.log('exists, skipping');
      skipped++;
      continue;
    }

    const result = uploadFile(localPath, r2Key);
    if (result.success) {
      console.log('uploaded');
      uploaded++;
    } else {
      console.log(`ERROR: ${result.error}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Done! Uploaded: ${uploaded}, Skipped: ${skipped}, Errors: ${errors}`);
  console.log('='.repeat(60));
  
  if (uploaded > 0) {
    console.log(`\nExample URL:`);
    const exampleKey = getR2Key(files[0]);
    console.log(`${SEC_BASE_URL}/${exampleKey}`);
  }
}

main().catch(console.error);
