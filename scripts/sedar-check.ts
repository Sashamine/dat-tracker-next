#!/usr/bin/env npx ts-node
/**
 * SEDAR+ Filing Checker
 * 
 * Uses Playwright to check for new filings on SEDAR+ for Canadian companies.
 * Sends Discord notification when new filings are detected.
 * 
 * Usage:
 *   npx ts-node scripts/sedar-check.ts
 *   npx ts-node scripts/sedar-check.ts --ticker IHLDF
 *   npx ts-node scripts/sedar-check.ts --dry-run
 * 
 * Environment:
 *   DISCORD_WEBHOOK_URL - Discord webhook for notifications
 */

import { chromium, type Page } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ============================================
// CONFIGURATION
// ============================================

interface CanadianCompany {
  ticker: string;
  localTicker: string;
  name: string;
  sedarProfileNumber: string;
  exchange: string;
  asset: string;
}

// Import canonical list from app code
import { CANADIAN_COMPANIES } from '../src/lib/sedar/canadian-companies.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// State file to track last seen filings
const STATE_FILE = path.join(__dirname, '../data/sedar-state.json');

interface SedarState {
  lastCheck: string;
  companies: Record<string, {
    lastFilingDate: string;
    lastFilingTitle: string;
  }>;
}

interface Filing {
  title: string;
  date: string;
  url: string;
}

// ============================================
// STATE MANAGEMENT
// ============================================

function loadState(): SedarState {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch (e) {
    console.warn('Could not load state file, starting fresh');
  }
  return {
    lastCheck: new Date().toISOString(),
    companies: {},
  };
}

function saveState(state: SedarState): void {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ============================================
// SEDAR+ SCRAPING
// ============================================

async function checkCompanyFilings(
  page: Page,
  company: CanadianCompany
): Promise<Filing[]> {
  const searchUrl = `https://www.sedarplus.ca/csa-party/records/searchRecords.html?_=profile&profile=${company.sedarProfileNumber}`;
  
  console.log(`  Checking ${company.ticker} (${company.sedarProfileNumber})...`);
  
  try {
    // Navigate to the profile's document search
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for the page to load and click on Documents tab if needed
    await page.waitForTimeout(2000);
    
    // Try to find and click the Documents tab
    const docsTab = page.locator('text=Documents').first();
    if (await docsTab.isVisible()) {
      await docsTab.click();
      await page.waitForTimeout(2000);
    }
    
    // Click Search to load results
    const searchBtn = page.locator('button:has-text("Search")').first();
    if (await searchBtn.isVisible()) {
      await searchBtn.click();
      await page.waitForTimeout(3000);
    }
    
    // Wait for results table
    await page.waitForSelector('table', { timeout: 30000 }).catch(() => null);
    
    // Extract filings from the table
    const filings = await page.evaluate(() => {
      const results: Array<{ title: string; date: string; url: string }> = [];
      const rows = document.querySelectorAll('table tbody tr');
      
      rows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          // Find the document link
          const link = row.querySelector('a[href*="resource.html"]') as HTMLAnchorElement;
          const dateCell = Array.from(cells).find(c => 
            c.textContent?.match(/\d{4}.*\d{2}:\d{2}/)
          );
          
          if (link && dateCell) {
            results.push({
              title: link.textContent?.trim() || 'Unknown',
              date: dateCell.textContent?.trim() || '',
              url: link.href,
            });
          }
        }
      });
      
      return results.slice(0, 10); // Get last 10 filings
    });
    
    console.log(`    Found ${filings.length} recent filings`);
    return filings;
    
  } catch (error) {
    console.error(`    Error checking ${company.ticker}:`, error);
    return [];
  }
}

function parseSedarDate(dateStr: string): Date {
  // SEDAR+ dates look like "January 14 2025 at 16:43:53 Eastern Standard Time"
  const match = dateStr.match(/(\w+)\s+(\d+)\s+(\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    return new Date(`${month} ${day}, ${year}`);
  }
  return new Date(0);
}

// ============================================
// DISCORD NOTIFICATION
// ============================================

async function sendDiscordNotification(
  company: CanadianCompany,
  newFilings: Filing[],
  adminUrl: string
): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log('  [Discord] No webhook configured, skipping notification');
    return;
  }

  const filingsList = newFilings.slice(0, 5).map(f => 
    `• **${f.title}** (${f.date.split(' at ')[0]})`
  ).join('\n');

  const payload = {
    username: 'DAT Tracker',
    embeds: [{
      title: `📁 New SEDAR+ Filing: ${company.ticker}`,
      description: [
        `**${company.name}** has new filings on SEDAR+:\n`,
        filingsList,
        '',
        `[🔍 View on SEDAR+](https://www.sedarplus.ca/csa-party/records/searchRecords.html?_=profile&profile=${company.sedarProfileNumber})`,
        `[📋 Review & Upload](${adminUrl})`,
      ].join('\n'),
      color: 0x3498db,
      fields: [
        { name: 'Asset', value: company.asset, inline: true },
        { name: 'Exchange', value: company.exchange, inline: true },
        { name: 'Profile #', value: company.sedarProfileNumber, inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: 'SEDAR+ Filing Monitor' },
    }],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(`  [Discord] Failed: ${response.status}`);
    } else {
      console.log(`  [Discord] Notification sent for ${company.ticker}`);
    }
  } catch (error) {
    console.error('  [Discord] Error:', error);
  }
}

// ============================================
// MAIN
// ============================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const tickerIndex = args.indexOf('--ticker');
  const tickerArg = args.find(a => a.startsWith('--ticker='))?.split('=')[1] ||
                    (tickerIndex !== -1 ? args[tickerIndex + 1] : undefined);

  const companies = tickerArg
    ? CANADIAN_COMPANIES.filter(c => c.ticker.toUpperCase() === tickerArg.toUpperCase())
    : CANADIAN_COMPANIES;

  if (companies.length === 0) {
    console.error(`No company found for ticker: ${tickerArg}`);
    process.exit(1);
  }

  console.log(`\n🍁 SEDAR+ Filing Checker`);
  console.log(`   Checking ${companies.length} companies...`);
  if (dryRun) console.log('   [DRY RUN - no notifications will be sent]\n');

  const state = loadState();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://dat-tracker-next.vercel.app';
  const adminUrl = `${baseUrl}/admin/sedar-filings`;

  // Launch browser
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  let totalNewFilings = 0;

  try {
    for (const company of companies) {
      const filings = await checkCompanyFilings(page, company);
      
      if (filings.length === 0) {
        console.log(`    No filings found (may need to check manually)`);
        continue;
      }

      const lastKnown = state.companies[company.ticker];
      const latestFiling = filings[0];
      const latestDate = parseSedarDate(latestFiling.date);

      // Check if this is a new filing
      let isNew = false;
      if (!lastKnown) {
        // First time checking this company - don't alert, just record
        console.log(`    First check for ${company.ticker}, recording baseline`);
      } else {
        const lastKnownDate = new Date(lastKnown.lastFilingDate);
        if (latestDate > lastKnownDate || latestFiling.title !== lastKnown.lastFilingTitle) {
          isNew = true;
          // Find all new filings
          const newFilings = filings.filter(f => {
            const fDate = parseSedarDate(f.date);
            return fDate > lastKnownDate;
          });

          console.log(`    🆕 ${newFilings.length} new filing(s) detected!`);
          totalNewFilings += newFilings.length;

          if (!dryRun) {
            await sendDiscordNotification(company, newFilings, adminUrl);
          }
        } else {
          console.log(`    No new filings since ${lastKnown.lastFilingDate.split('T')[0]}`);
        }
      }

      // Update state
      state.companies[company.ticker] = {
        lastFilingDate: latestDate.toISOString(),
        lastFilingTitle: latestFiling.title,
      };
    }

    state.lastCheck = new Date().toISOString();
    
    if (!dryRun) {
      saveState(state);
    }

    console.log(`\n✅ Check complete. ${totalNewFilings} new filing(s) found.`);

  } finally {
    await browser.close();
  }
}

main().catch(console.error);
