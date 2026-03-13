#!/usr/bin/env npx tsx
/**
 * backfill-8k-exhibits.ts
 *
 * Fetches Ex-99.* exhibits (press releases) for 8-K filings stored in R2,
 * strips HTML to plain text, and uploads as {accession}.exhibit.txt alongside
 * the existing cover page.
 *
 * This resolves the ~153 "no candidates" in value extraction verification —
 * the cover page doesn't contain financial data, but the exhibit does.
 *
 * Usage:
 *   npx tsx scripts/backfill-8k-exhibits.ts              # all
 *   npx tsx scripts/backfill-8k-exhibits.ts --ticker=MSTR # single ticker
 *   npx tsx scripts/backfill-8k-exhibits.ts --dry-run     # preview only
 */

import { D1Client } from '../src/lib/d1';
import { allCompanies } from '../src/lib/data/companies';

const SEC_USER_AGENT = 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)';
const R2_BASE_URL = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
const filterTicker = argVal('ticker')?.toUpperCase() ?? null;
const dryRun = process.argv.includes('--dry-run');
const verbose = process.argv.includes('--verbose');

// ---------------------------------------------------------------------------
// CIK lookup
// ---------------------------------------------------------------------------
const cikMap: Record<string, string> = {};
for (const c of allCompanies) {
  if (c.secCik) cikMap[c.ticker] = c.secCik;
}

let secTickersCache: Record<string, string> | null = null;

async function lookupCik(ticker: string): Promise<string | null> {
  if (cikMap[ticker]) return cikMap[ticker];

  // Fallback: SEC company tickers JSON
  if (!secTickersCache) {
    try {
      const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
        headers: { 'User-Agent': SEC_USER_AGENT },
      });
      if (res.ok) {
        const data = (await res.json()) as Record<string, { cik_str: number; ticker: string }>;
        secTickersCache = {};
        for (const entry of Object.values(data)) {
          secTickersCache[entry.ticker.toUpperCase()] = String(entry.cik_str);
        }
      }
    } catch {
      secTickersCache = {};
    }
  }

  return secTickersCache?.[ticker] ?? null;
}

// ---------------------------------------------------------------------------
// SEC filing index
// ---------------------------------------------------------------------------
type FilingDocument = { name: string; type?: string; size?: number };
type FilingIndex = { directory: { item: FilingDocument[]; name: string } };

function accNoDashes(acc: string): string {
  return acc.replace(/-/g, '');
}

async function fetchFilingIndex(cik: string, accession: string): Promise<FilingIndex | null> {
  const url = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes(accession)}/index.json`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': SEC_USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as FilingIndex;
  } catch {
    return null;
  }
}

function isInterestingExhibit(name: string): boolean {
  const n = (name || '').toLowerCase();
  if (!n.endsWith('.htm') && !n.endsWith('.html')) return false;
  return (
    /ex-?99\./i.test(name) ||
    /ex\d{2}99\d?/i.test(name) ||
    /dex99\d/i.test(name) ||
    /press|release|shareholder|letter|announce|earnings/i.test(name)
  );
}

// ---------------------------------------------------------------------------
// HTML stripping
// ---------------------------------------------------------------------------
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&mdash;/g, '—')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// R2 upload
// ---------------------------------------------------------------------------
async function uploadToR2(key: string, text: string): Promise<boolean> {
  try {
    const { r2PutObject } = await import('../src/lib/r2/client');
    await r2PutObject({
      key,
      body: Buffer.from(text),
      contentType: 'text/plain',
    });
    return true;
  } catch (err) {
    console.error(`  R2 upload failed: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function existsInR2(key: string): Promise<boolean> {
  try {
    const res = await fetch(`${R2_BASE_URL}/${key}`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const d1 = D1Client.fromEnv();

  // Get all accessions in new-uploads/ that have search terms (these are the ones
  // where value extraction needs the exhibit text)
  const query = filterTicker
    ? `SELECT DISTINCT a.accession, d.entity_id
       FROM artifacts a
       JOIN datapoints d ON d.artifact_id = a.artifact_id
       WHERE a.r2_key LIKE 'new-uploads/%'
         AND a.accession IS NOT NULL
         AND d.citation_search_term IS NOT NULL
         AND d.entity_id = ?
       ORDER BY d.entity_id`
    : `SELECT DISTINCT a.accession, d.entity_id
       FROM artifacts a
       JOIN datapoints d ON d.artifact_id = a.artifact_id
       WHERE a.r2_key LIKE 'new-uploads/%'
         AND a.accession IS NOT NULL
         AND d.citation_search_term IS NOT NULL
       ORDER BY d.entity_id`;

  const params = filterTicker ? [filterTicker] : [];
  const { results } = await d1.query<{ accession: string; entity_id: string }>(query, params);

  console.log(`\nFound ${results.length} accessions in new-uploads/ with search terms`);
  if (dryRun) console.log('DRY RUN — no uploads will be made\n');

  let uploaded = 0;
  let skipped = 0;
  let noCik = 0;
  let noExhibit = 0;
  let alreadyExists = 0;
  let fetchFailed = 0;

  for (const row of results) {
    const ticker = row.entity_id;
    const accession = row.accession;
    const exhibitKey = `new-uploads/${ticker.toLowerCase()}/${accession}.exhibit.txt`;

    // Check if exhibit already exists
    if (!dryRun && await existsInR2(exhibitKey)) {
      if (verbose) console.log(`  ${ticker} ${accession} — exhibit already exists`);
      alreadyExists++;
      continue;
    }

    // Look up CIK
    const cik = await lookupCik(ticker);
    if (!cik) {
      if (verbose) console.log(`  ${ticker} ${accession} — no CIK found`);
      noCik++;
      continue;
    }

    // Fetch filing index from SEC
    const index = await fetchFilingIndex(cik, accession);
    if (!index) {
      if (verbose) console.log(`  ${ticker} ${accession} — filing index fetch failed`);
      fetchFailed++;
      await sleep(300);
      continue;
    }

    // Find interesting exhibits
    const docs = (index.directory?.item || []).filter(d => isInterestingExhibit(d.name));

    if (docs.length === 0) {
      if (verbose) console.log(`  ${ticker} ${accession} — no Ex-99.* exhibits found`);
      noExhibit++;
      await sleep(300);
      continue;
    }

    // Prefer larger exhibits (usually press releases)
    docs.sort((a, b) => (b.size || 0) - (a.size || 0));
    const picked = docs[0];

    console.log(`  ${ticker} ${accession} — exhibit: ${picked.name} (${picked.size || '?'} bytes)`);

    if (dryRun) {
      uploaded++;
      await sleep(300);
      continue;
    }

    // Fetch exhibit HTML from SEC
    const exhibitUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDashes(accession)}/${picked.name}`;
    try {
      const res = await fetch(exhibitUrl, {
        headers: { 'User-Agent': SEC_USER_AGENT },
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        console.log(`    Fetch failed: ${res.status}`);
        fetchFailed++;
        await sleep(300);
        continue;
      }

      const html = await res.text();
      const text = stripHtml(html);

      if (text.length < 200) {
        console.log(`    Stripped text too short (${text.length} chars), skipping`);
        fetchFailed++;
        await sleep(300);
        continue;
      }

      // Upload to R2
      const ok = await uploadToR2(exhibitKey, text);
      if (ok) {
        console.log(`    Uploaded ${exhibitKey} (${text.length} chars)`);
        uploaded++;
      } else {
        fetchFailed++;
      }
    } catch (err) {
      console.log(`    Error: ${err instanceof Error ? err.message : String(err)}`);
      fetchFailed++;
    }

    // SEC rate limit
    await sleep(300);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Uploaded:       ${uploaded}`);
  console.log(`  Already exists: ${alreadyExists}`);
  console.log(`  No CIK:         ${noCik}`);
  console.log(`  No exhibit:     ${noExhibit}`);
  console.log(`  Fetch failed:   ${fetchFailed}`);
  console.log(`  Skipped:        ${skipped}`);
  console.log(`  Total:          ${results.length}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch(console.error);
