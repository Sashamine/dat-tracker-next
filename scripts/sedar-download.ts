#!/usr/bin/env npx tsx
/**
 * SEDAR+ Document Downloader (Human-in-the-loop)
 *
 * Purpose:
 * - Establish SEDAR+ session
 * - If bot-protection / hCaptcha is shown, pause for manual solve
 * - Download filings and ingest into R2 + D1 artifacts
 *
 * Usage:
 *   npx tsx scripts/sedar-download.ts --ticker BTCT.V --limit 3 --headed
 *
 * Env:
 *   CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_DATABASE_ID / CLOUDFLARE_API_TOKEN
 *   R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_ENDPOINT / R2_BUCKET / R2_REGION
 */

import { chromium } from 'playwright';
import crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANADIAN_COMPANIES } from '../src/lib/sedar/canadian-companies.ts';
import { ingestArtifactToR2AndD1 } from '../src/lib/artifacts/ingest.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function waitForEnter(prompt: string) {
  process.stdout.write(prompt);
  await new Promise<void>(resolve => {
    process.stdin.resume();
    process.stdin.once('data', () => resolve());
  });
}

async function main() {
  const ticker = (argVal('ticker') || '').trim();
  const limit = Math.max(1, Math.min(20, parseInt(argVal('limit') || '5', 10) || 5));
  const headed = hasFlag('headed');

  if (!ticker) {
    console.error('Missing --ticker (e.g. --ticker=BTCT.V)');
    process.exit(1);
  }

  const company = CANADIAN_COMPANIES.find(c => c.ticker.toUpperCase() === ticker.toUpperCase());
  if (!company) {
    console.error(`Ticker not found in CANADIAN_COMPANIES: ${ticker}`);
    process.exit(1);
  }

  const outDir = path.join(__dirname, '..', 'data', 'sedar-content', ticker.toLowerCase().replace(/[^a-z0-9.]/g, ''));
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    acceptDownloads: true,
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    const entry = 'https://www.sedarplus.ca/csa-party/service/create.html?targetAppCode=csa-party&service=searchDocuments&_locale=en';
    await page.goto(entry, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);

    // Detect bot protection
    const text = await page.content();
    if (text.includes('ANOMALY DETECTED') || text.toLowerCase().includes('hcaptcha')) {
      await page.screenshot({ path: path.join(outDir, 'captcha.png') });
      if (!headed) {
        throw new Error('SEDAR bot protection encountered. Re-run with --headed and solve captcha manually.');
      }
      console.log('⚠️  SEDAR bot protection detected. Please solve the captcha in the opened browser window.');
      await waitForEnter('Press Enter here once captcha is solved...');
      await page.waitForTimeout(2000);
    }

    // Click Profiles tab (best-effort)
    const tabClicked = await page.evaluate(() => {
      const tabs = document.querySelectorAll('[role="tab"]');
      for (const tab of Array.from(tabs)) {
        const t = tab.textContent || '';
        if (t.includes('Profiles')) {
          (tab as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    console.log(`Profiles tab clicked: ${tabClicked}`);
    await page.waitForTimeout(1500);

    // Fill first visible text input with profile number
    const profileNumber = company.sedarProfileNumber;
    const input = page.locator('input[type="text"]').first();
    await input.waitFor({ timeout: 20000 });
    await input.fill(profileNumber);

    await page.locator('button:has-text("Search")').first().click();
    await page.waitForTimeout(2500);

    // Click profile result (best effort: match by name substring)
    const nameStem = company.name.split(' / ')[0];
    await page.locator(`a:has-text("${nameStem}")`).first().click({ timeout: 20000 });
    await page.waitForTimeout(2000);

    // Click "Search and download documents"
    await page.locator('a:has-text("Search and download documents")').first().click({ timeout: 20000 });
    await page.waitForTimeout(2500);

    // Collect resource links
    const docs = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="resource.html"]')) as HTMLAnchorElement[];
      return links.slice(0, 25).map(a => ({ title: (a.textContent || '').trim(), href: a.href }));
    });

    const picked = docs.slice(0, limit);
    console.log(`Found ${docs.length} doc links; ingesting ${picked.length}`);

    for (const [i, doc] of picked.entries()) {
      console.log(`[${i + 1}/${picked.length}] ${doc.title || 'Untitled'}`);

      const resp = await page.request.get(doc.href);
      const buf = await resp.body();
      const bytes = new Uint8Array(buf);

      // Derive a stable-ish docId from URL + content hash
      const contentHash = crypto.createHash('sha256').update(bytes).digest('hex');
      const docId = `${company.sedarProfileNumber}-${contentHash.slice(0, 12)}`;
      const r2Key = `sedar/${company.ticker.toUpperCase()}/${docId}.bin`;

      await ingestArtifactToR2AndD1({
        sourceType: 'sedar_filing',
        ticker: company.ticker,
        accession: docId,
        sourceUrl: doc.href,
        r2Key,
        bytes,
        contentType: resp.headers()['content-type'] || 'application/octet-stream',
      });

      console.log(`  ✅ ingested: ${r2Key}`);
    }

    console.log('Done.');
  } finally {
    await browser.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
