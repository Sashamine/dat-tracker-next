#!/usr/bin/env npx tsx
/**
 * fix-xbrl-metadata-docs.ts
 *
 * Some R2 docs in new-uploads/ contain XBRL metadata instead of the actual
 * filing text (bad output from stripping inline XBRL HTML filings).
 * This script identifies those broken docs and re-downloads the actual
 * primary filing HTML from SEC EDGAR, strips it properly, and re-uploads.
 *
 * The improved stripping removes hidden XBRL context divs that produce
 * metadata noise when naively stripped.
 *
 * Usage:
 *   npx tsx scripts/fix-xbrl-metadata-docs.ts              # all
 *   npx tsx scripts/fix-xbrl-metadata-docs.ts --dry-run     # preview only
 *   npx tsx scripts/fix-xbrl-metadata-docs.ts --ticker=CORZ # single ticker
 */

import { D1Client } from '../src/lib/d1';
import { allCompanies } from '../src/lib/data/companies';

const SEC_USER_AGENT = 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)';
const R2_BASE_URL = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
const filterTicker = argVal('ticker')?.toUpperCase() ?? null;
const dryRun = process.argv.includes('--dry-run');

// CIK lookup
const cikMap: Record<string, string> = {};
for (const c of allCompanies) {
  if (c.secCik) cikMap[c.ticker] = c.secCik;
}
// Companies in D1 but not in companies.ts, or with different SEC tickers
cikMap['SQ'] = '1512673';    // Block, Inc. (SEC ticker: XYZ)
cikMap['SDIG'] = '1855485';  // Stronghold Digital Mining

let secTickersCache: Record<string, string> | null = null;

async function lookupCik(ticker: string): Promise<string | null> {
  if (cikMap[ticker]) return cikMap[ticker];
  if (secTickersCache === null) {
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
      } else {
        secTickersCache = {};
      }
    } catch {
      secTickersCache = {};
    }
  }
  return secTickersCache?.[ticker] ?? null;
}

/**
 * Improved HTML stripping that handles inline XBRL filings.
 * Removes hidden XBRL context sections that produce metadata noise.
 */
function stripHtmlImproved(html: string): string {
  return html
    // Remove hidden divs (XBRL context data)
    .replace(/<div[^>]*style\s*=\s*["'][^"']*display\s*:\s*none[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '')
    // Remove script/style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove XBRL-specific hidden sections
    .replace(/<ix:header>[\s\S]*?<\/ix:header>/gi, '')
    .replace(/<ix:hidden>[\s\S]*?<\/ix:hidden>/gi, '')
    // Remove all remaining HTML/XBRL tags
    .replace(/<[^>]+>/g, ' ')
    // Decode entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&mdash;/gi, '—')
    .replace(/&ldquo;/gi, '"')
    .replace(/&rdquo;/gi, '"')
    .replace(/&quot;/gi, '"')
    .replace(/&#\d+;/gi, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if an R2 document is XBRL metadata (broken stripping).
 */
function isXbrlMetadata(text: string): boolean {
  // XBRL metadata docs start with a pattern like "ticker-YYYYMMDD XXXXXXXXXX ..."
  return /^\w+-\d{8}\s+\d{10}/.test(text.slice(0, 100));
}

/**
 * Look up the primary document for a filing from SEC submissions API.
 */
async function getFilingPrimaryDoc(cik: string, accession: string): Promise<string | null> {
  const paddedCik = cik.padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': SEC_USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (res.status !== 200) return null;
    const data = (await res.json()) as any;
    const recent = data.filings?.recent;
    if (recent) {
      const idx = recent.accessionNumber?.indexOf(accession);
      if (idx !== undefined && idx >= 0) return recent.primaryDocument[idx];
    }
    // Check older filings
    const files = data.filings?.files || [];
    for (const f of files) {
      try {
        const fileUrl = `https://data.sec.gov/submissions/${f.name}`;
        const fileRes = await fetch(fileUrl, {
          headers: { 'User-Agent': SEC_USER_AGENT },
          signal: AbortSignal.timeout(15000),
        });
        if (fileRes.status !== 200) continue;
        const fileData = (await fileRes.json()) as any;
        const fIdx = fileData.accessionNumber?.indexOf(accession);
        if (fIdx !== undefined && fIdx >= 0) return fileData.primaryDocument[fIdx];
      } catch {}
      await sleep(300);
    }
    return null;
  } catch {
    return null;
  }
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const d1 = D1Client.fromEnv();

  // Get all accessions in new-uploads/ that have search terms
  const query = filterTicker
    ? `SELECT DISTINCT a.accession, d.entity_id
       FROM artifacts a
       JOIN datapoints d ON d.artifact_id = a.artifact_id
       WHERE a.r2_key LIKE 'new-uploads/%'
         AND a.accession IS NOT NULL
         AND d.citation_search_term IS NOT NULL
         AND d.entity_id = ?`
    : `SELECT DISTINCT a.accession, d.entity_id
       FROM artifacts a
       JOIN datapoints d ON d.artifact_id = a.artifact_id
       WHERE a.r2_key LIKE 'new-uploads/%'
         AND a.accession IS NOT NULL
         AND d.citation_search_term IS NOT NULL`;

  const params = filterTicker ? [filterTicker] : [];
  const { results } = await d1.query<{ accession: string; entity_id: string }>(query, params);

  console.log(`\nChecking ${results.length} accessions in new-uploads/`);
  if (dryRun) console.log('DRY RUN — no uploads\n');

  let checked = 0;
  let xbrlMeta = 0;
  let fixed = 0;
  let noCik = 0;
  let fetchFailed = 0;
  let normal = 0;

  for (const row of results) {
    const ticker = row.entity_id;
    const accession = row.accession;
    const r2Key = `new-uploads/${ticker.toLowerCase()}/${accession}.txt`;
    const r2Url = `${R2_BASE_URL}/${r2Key}`;

    checked++;

    // Fetch current R2 doc
    try {
      const r2Res = await fetch(r2Url);
      if (r2Res.status !== 200) {
        normal++;
        continue;
      }
      const text = await r2Res.text();

      if (isXbrlMetadata(text)) {
        console.log(`\n  ${ticker} ${accession} — XBRL metadata detected (${Math.round(text.length/1024)}K)`);
        xbrlMeta++;

        // Look up CIK
        const cik = await lookupCik(ticker);
        if (cik === null) {
          console.log(`    No CIK found, skipping`);
          noCik++;
          continue;
        }

        // Look up primary document
        const primaryDoc = await getFilingPrimaryDoc(cik, accession);
        if (primaryDoc === null) {
          console.log(`    Could not find primary document`);
          fetchFailed++;
          await sleep(300);
          continue;
        }

        console.log(`    Primary doc: ${primaryDoc}`);

        if (dryRun) {
          fixed++;
          await sleep(300);
          continue;
        }

        // Fetch actual filing HTML
        const accNoDash = accession.replace(/-/g, '');
        const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDash}/${primaryDoc}`;
        const filingRes = await fetch(filingUrl, {
          headers: { 'User-Agent': SEC_USER_AGENT },
          signal: AbortSignal.timeout(60000),
        });

        if (filingRes.status !== 200) {
          console.log(`    Fetch failed: ${filingRes.status}`);
          fetchFailed++;
          await sleep(300);
          continue;
        }

        const html = await filingRes.text();
        console.log(`    Fetched HTML: ${Math.round(html.length/1024)}K`);

        // Strip with improved algorithm
        const stripped = stripHtmlImproved(html);
        console.log(`    Stripped text: ${Math.round(stripped.length/1024)}K`);

        if (stripped.length < 500) {
          console.log(`    Stripped text too short, skipping`);
          fetchFailed++;
          await sleep(300);
          continue;
        }

        // Upload replacement
        const ok = await uploadToR2(r2Key, stripped);
        if (ok) {
          console.log(`    Uploaded improved text`);
          fixed++;
        } else {
          fetchFailed++;
        }

        await sleep(300);
      } else {
        normal++;
      }
    } catch (err: any) {
      console.log(`  ${ticker} ${accession} — Error: ${err.message}`);
      fetchFailed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Checked:      ${checked}`);
  console.log(`  Normal:       ${normal}`);
  console.log(`  XBRL meta:    ${xbrlMeta}`);
  console.log(`  Fixed:        ${fixed}`);
  console.log(`  No CIK:       ${noCik}`);
  console.log(`  Fetch failed: ${fetchFailed}`);
}

main().catch(console.error);
