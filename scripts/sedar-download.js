#!/usr/bin/env node
/**
 * SEDAR+ Document Downloader
 * 
 * Downloads regulatory filings from SEDAR+ for Canadian companies.
 * Uses Playwright to handle session authentication.
 * 
 * Usage: node scripts/sedar-download.js <ticker> [--limit N] [--force]
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Known company profiles
const PROFILES = {
  ihldf: { number: '000044016', name: 'Immutable Holdings Inc.' },
  xtaif: { number: '000055546', name: 'Hashgraph Holdings Inc.' }
};

async function downloadSedarProfile(ticker, options = {}) {
  const tickerLower = ticker.toLowerCase();
  const profile = PROFILES[tickerLower];
  
  if (!profile) {
    console.error(`Unknown ticker: ${ticker}`);
    console.error(`Available: ${Object.keys(PROFILES).join(', ')}`);
    process.exit(1);
  }
  
  const outputDir = path.resolve(__dirname, '..', 'data', 'sedar-content', tickerLower);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`\n📥 SEDAR+ Downloader`);
  console.log(`   Company: ${profile.name}`);
  console.log(`   Profile: ${profile.number}`);
  console.log(`   Output: ${outputDir}`);
  console.log(`   Limit: ${options.limit || 'all'} documents\n`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const context = await browser.newContext({
    acceptDownloads: true
  });

  const page = await context.newPage();

  try {
    // Go directly to search
    console.log('🔐 Establishing session...');
    await page.goto('https://www.sedarplus.ca/csa-party/service/create.html?targetAppCode=csa-party&service=searchDocuments&_locale=en', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Switch to Profiles tab using the tab element
    console.log('🔍 Switching to Profiles tab...');
    await page.click('[role="tab"]:has-text("Profiles")');
    await page.waitForTimeout(2000);
    
    // Search by profile number
    console.log(`🔍 Searching for ${profile.name}...`);
    await page.fill('input[placeholder*="Profile"]', profile.number);
    await page.click('button:has-text("Search")');
    await page.waitForTimeout(3000);
    
    // Click on the profile result link
    await page.click(`a:has-text("${profile.name.split(' / ')[0]}")`);
    await page.waitForTimeout(3000);
    
    // Click "Search and download documents for this profile"
    console.log('📂 Opening documents list...');
    await page.click('a:has-text("Search and download documents")');
    await page.waitForTimeout(3000);
    
    // Now get document links
    console.log('📄 Fetching documents...\n');
    
    // Get all PDF links in the table
    const pdfLinks = await page.$$('a[href*="resource.html"]');
    console.log(`   Found ${pdfLinks.length} document links\n`);
    
    let downloaded = 0;
    const limit = options.limit || pdfLinks.length;
    
    // Get info about each document first
    const docs = [];
    for (const link of pdfLinks.slice(0, limit)) {
      const text = await link.innerText();
      const href = await link.getAttribute('href');
      docs.push({ text, href });
    }
    
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i];
      
      // Create safe filename
      const safeName = doc.text.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 80) + '.pdf';
      const filePath = path.join(outputDir, safeName);
      
      // Skip if exists
      if (fs.existsSync(filePath) && !options.force) {
        console.log(`⏭️  [${i+1}/${docs.length}] Skip: ${safeName.substring(0, 50)}...`);
        continue;
      }
      
      console.log(`📄 [${i+1}/${docs.length}] ${doc.text.substring(0, 60)}...`);
      
      try {
        // Navigate to the document URL to trigger download
        const [download] = await Promise.all([
          page.waitForEvent('download', { timeout: 30000 }),
          page.goto(doc.href, { waitUntil: 'commit' })
        ]);
        
        await download.saveAs(filePath);
        const stats = fs.statSync(filePath);
        console.log(`   ✅ Saved (${(stats.size / 1024).toFixed(1)} KB)`);
        downloaded++;
        
        // Go back to search results
        await page.goBack();
        await page.waitForTimeout(1000);
        
      } catch (err) {
        console.log(`   ❌ ${err.message.split('\n')[0]}`);
        // Try to recover by going back to the documents page
        try {
          await page.goto('https://www.sedarplus.ca/csa-party/service/create.html?targetAppCode=csa-party&service=searchDocuments&_locale=en');
          await page.waitForTimeout(1000);
          await page.click('[role="tab"]:has-text("Profiles")');
          await page.fill('input[placeholder*="Profile"]', profile.number);
          await page.click('button:has-text("Search")');
          await page.waitForTimeout(2000);
          await page.click(`a:has-text("${profile.name.split(' / ')[0]}")`);
          await page.waitForTimeout(2000);
          await page.click('a:has-text("Search and download documents")');
          await page.waitForTimeout(2000);
        } catch (e) {
          console.log('   ⚠️  Could not recover session');
        }
      }
    }
    
    console.log(`\n📊 Downloaded ${downloaded} documents to ${outputDir}\n`);
    
  } finally {
    await browser.close();
  }
}

// CLI
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log(`
SEDAR+ Document Downloader

Usage:
  node scripts/sedar-download.js <ticker> [--limit N] [--force]

Options:
  --limit N   Only download first N documents
  --force     Re-download even if file exists

Available tickers:
${Object.entries(PROFILES).map(([k, v]) => `  ${k.toUpperCase()} - ${v.name} (${v.number})`).join('\n')}
`);
  process.exit(0);
}

const ticker = args[0];
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1]) : null;
const force = args.includes('--force');

downloadSedarProfile(ticker, { limit, force }).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
