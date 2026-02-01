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
    slowMo: 100
  });

  const context = await browser.newContext({
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });

  const page = await context.newPage();
  
  // Set download behavior via CDP
  const client = await page.context().newCDPSession(page);
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: outputDir
  });

  try {
    // Go directly to search
    console.log('🔐 Establishing session...');
    await page.goto('https://www.sedarplus.ca/csa-party/service/create.html?targetAppCode=csa-party&service=searchDocuments&_locale=en', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    // Wait for page to be interactive
    await page.waitForTimeout(5000);

    // Switch to Profiles tab
    console.log('🔍 Switching to Profiles tab...');
    
    // Take screenshot for debugging
    await page.screenshot({ path: path.join(outputDir, 'debug-1-before-tab.png') });
    
    // Try to find and click the Profiles tab
    const tabClicked = await page.evaluate(() => {
      // Look for tab elements
      const tabs = document.querySelectorAll('[role="tab"]');
      console.log('Found tabs:', tabs.length);
      for (const tab of tabs) {
        if (tab.textContent && tab.textContent.includes('Profiles')) {
          tab.click();
          return true;
        }
      }
      // Also try looking for tab-like elements
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        if (el.textContent === 'Profiles' && el.tagName !== 'SCRIPT') {
          el.click();
          return true;
        }
      }
      return false;
    });
    console.log(`   Tab click result: ${tabClicked}`);
    await page.waitForTimeout(3000);
    
    // Take another screenshot
    await page.screenshot({ path: path.join(outputDir, 'debug-2-after-tab.png') });
    
    // Search by profile number
    console.log(`🔍 Searching for ${profile.name}...`);
    // Wait for input to appear after tab switch
    await page.waitForSelector('input[type="text"]', { timeout: 10000 });
    const inputs = await page.$$('input[type="text"]');
    if (inputs.length > 0) {
      await inputs[0].fill(profile.number);
    }
    await page.click('button:has-text("Search")');
    await page.waitForTimeout(3000);
    
    // Click on the profile result link
    await page.click(`a:has-text("${profile.name.split(' / ')[0]}")`);
    await page.waitForTimeout(3000);
    
    // Click "Search and download documents for this profile"
    console.log('📂 Opening documents list...');
    await page.click('a:has-text("Search and download documents")');
    await page.waitForTimeout(3000);
    
    // Get all PDF links
    console.log('📄 Fetching documents...\n');
    const pdfLinks = await page.$$('a[href*="resource.html"]');
    console.log(`   Found ${pdfLinks.length} document links\n`);
    
    let downloaded = 0;
    const limit = options.limit || pdfLinks.length;
    
    // Collect document info
    const docs = [];
    for (const link of pdfLinks.slice(0, limit)) {
      const text = await link.innerText();
      const href = await link.getAttribute('href');
      if (href && href.includes('resource.html')) {
        docs.push({ text: text.trim(), href });
      }
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
        // Wait for download event and navigate
        const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
        await page.goto(doc.href, { waitUntil: 'commit', timeout: 30000 }).catch(() => {});
        
        const download = await downloadPromise;
        await download.saveAs(filePath);
        
        const stats = fs.statSync(filePath);
        console.log(`   ✅ Saved (${(stats.size / 1024).toFixed(1)} KB)`);
        downloaded++;
        
        // Small delay
        await page.waitForTimeout(500);
        
      } catch (err) {
        console.log(`   ❌ ${err.message.split('\n')[0]}`);
      }
      
      // Re-navigate to documents page for next download
      if (i < docs.length - 1) {
        try {
          await page.goto('https://www.sedarplus.ca/csa-party/service/create.html?targetAppCode=csa-party&service=searchDocuments&_locale=en', { waitUntil: 'networkidle' });
          await page.evaluate(() => {
            const tabs = document.querySelectorAll('[role="tab"]');
            for (const tab of tabs) {
              if (tab.textContent.includes('Profiles')) {
                tab.click();
                return;
              }
            }
          });
          await page.waitForTimeout(1000);
          await page.fill('input[placeholder*="Profile"]', profile.number);
          await page.click('button:has-text("Search")');
          await page.waitForTimeout(2000);
          await page.click(`a:has-text("${profile.name.split(' / ')[0]}")`);
          await page.waitForTimeout(2000);
          await page.click('a:has-text("Search and download documents")');
          await page.waitForTimeout(2000);
          
          // Re-fetch document links with fresh URLs
          const newLinks = await page.$$('a[href*="resource.html"]');
          if (newLinks[i + 1]) {
            docs[i + 1].href = await newLinks[i + 1].getAttribute('href');
          }
        } catch (e) {
          console.log('   ⚠️  Navigation error, continuing...');
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
