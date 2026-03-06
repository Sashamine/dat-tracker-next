#!/usr/bin/env tsx
/**
 * verify-r2-citations.ts
 *
 * Scans H-SVG history files for accessionNumber fields and checks:
 * 1. Whether the backing document exists in our R2 bucket
 * 2. Whether the accession number exists in SEC EDGAR (catches fabricated accessions)
 *
 * Uses regex extraction instead of runtime imports to avoid transitive
 * dependency issues (e.g., provenance/mara.ts COST_BASIS_TOTAL).
 *
 * Usage:
 *   npx tsx scripts/verify-r2-citations.ts                  # R2 check only
 *   npx tsx scripts/verify-r2-citations.ts --edgar          # R2 + EDGAR verification
 *   npx tsx scripts/verify-r2-citations.ts --edgar-only     # EDGAR only (skip R2)
 *   npx tsx scripts/verify-r2-citations.ts --ticker=BMNR    # single ticker
 *   npx tsx scripts/verify-r2-citations.ts --verbose        # show each check
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
const verbose = process.argv.includes('--verbose');
const checkEdgar = process.argv.includes('--edgar') || process.argv.includes('--edgar-only');
const edgarOnly = process.argv.includes('--edgar-only');
const filterTicker = argVal('ticker')?.toUpperCase() ?? null;

// SEC EDGAR rate limiting (Rule 9: minimum 200ms between requests)
const SEC_DELAY_MS = 250;
const SEC_USER_AGENT = 'DAT Tracker Admin (contact@dat-tracker.com)';

// ---------------------------------------------------------------------------
// R2 config (mirrors FilingViewerClient.tsx and fetch-content/route.ts)
// ---------------------------------------------------------------------------
const R2_BASE_URL = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';
const R2_PREFIXES = ['new-uploads', 'batch1', 'batch2', 'batch3', 'batch4', 'batch5', 'batch6'];

const TICKER_BATCHES: Record<string, number> = {
  abtc: 1, asst: 1, avx: 1, bmnr: 1, bnc: 1, btbt: 1, btcs: 1, btdr: 1, btog: 1, cepo: 1, clsk: 1,
  corz: 2, cwd: 2, cyph: 2, dfdv: 2, djt: 2, ethm: 2, fgnx: 2, fwdi: 2,
  game: 3, hsdt: 3, hypd: 3, kulr: 3, lits: 3, mara: 3, mstr: 3, na: 3,
  naka: 4, nxtt: 4, purr: 4, riot: 4, sbet: 4, stke: 4, suig: 4,
  taox: 5, tbh: 5, tron: 5, twav: 5, upxi: 5, xrpn: 5, xxi: 5,
  zone: 6,
  zooz: 1,
};

// ---------------------------------------------------------------------------
// Extract accessions from source files via regex
// ---------------------------------------------------------------------------
interface Citation {
  ticker: string;
  accession: string;
  file: string;
}

const DATA_DIR = path.join(__dirname, '..', 'src', 'lib', 'data');

function extractFromFile(filePath: string, defaultTicker: string | null): Citation[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  const citations: Citation[] = [];

  // Match accessionNumber fields: accessionNumber: "XXXX-XX-XXXXXX"
  const accRegex = /accessionNumber:\s*['"`](\d{10}-\d{2}-\d{6})['"`]/g;
  // Match standardized filing URLs: /filings/ticker/0001193125-26-062811
  const urlRegex = /\/filings\/[a-z0-9.]+\/(\d{10}-\d{2}-\d{6})/g;

  // For files with per-entry tickers (earnings-data.ts, companies.ts), build a map of line->ticker
  // When defaultTicker is set, skip per-line detection (avoids picking up nested tickers like atmPrefSales)
  const lines = content.split('\n');
  const tickerAtLine: Record<number, string> = {};
  let currentTicker = defaultTicker;

  for (let i = 0; i < lines.length; i++) {
    if (!defaultTicker) {
      const tickerMatch = /^\s*ticker:\s*['"`]([A-Z0-9.]+)['"`]/.exec(lines[i]);
      const idMatch = /^\s*id:\s*['"`]([a-z0-9.]+)['"`]/.exec(lines[i]);
      if (tickerMatch) {
        currentTicker = tickerMatch[1];
      } else if (idMatch && !currentTicker) {
        currentTicker = idMatch[1];
      }
    }
    tickerAtLine[i] = currentTicker || 'UNKNOWN';
  }

  // Extract all accession numbers from fields
  let match;
  while ((match = accRegex.exec(content)) !== null) {
    const accession = match[1];
    const lineNum = content.substring(0, match.index).split('\n').length - 1;
    const ticker = tickerAtLine[lineNum] || defaultTicker || 'UNKNOWN';
    if (filterTicker && ticker.toUpperCase() !== filterTicker) continue;
    citations.push({ ticker: ticker.toUpperCase(), accession, file: fileName });
  }

  // Extract all accession numbers from standardized URLs
  while ((match = urlRegex.exec(content)) !== null) {
    const accession = match[1];
    const lineNum = content.substring(0, match.index).split('\n').length - 1;
    const ticker = tickerAtLine[lineNum] || defaultTicker || 'UNKNOWN';
    if (filterTicker && ticker.toUpperCase() !== filterTicker) continue;
    citations.push({ ticker: ticker.toUpperCase(), accession, file: fileName });
  }

  return citations;
}

function collectCitations(): Citation[] {
  const citations: Citation[] = [];

  // H-SVG history files and primary data
  const files: Array<{ path: string; defaultTicker: string | null }> = [
    { path: path.join(DATA_DIR, 'companies.ts'), defaultTicker: null },
    { path: path.join(DATA_DIR, 'bmnr-holdings-history.ts'), defaultTicker: 'BMNR' },
    { path: path.join(DATA_DIR, 'zooz-holdings-history.ts'), defaultTicker: 'ZOOZ' },
    { path: path.join(DATA_DIR, 'earnings-data.ts'), defaultTicker: null },
    { path: path.join(DATA_DIR, 'mara-holdings-history.ts'), defaultTicker: 'MARA' },
    { path: path.join(DATA_DIR, 'mstr-sec-history.ts'), defaultTicker: 'MSTR' },
    { path: path.join(DATA_DIR, 'mstr-capital-events.ts'), defaultTicker: 'MSTR' },
    { path: path.join(DATA_DIR, 'mstr-atm-sales.ts'), defaultTicker: 'MSTR' },
    { path: path.join(DATA_DIR, 'mstr-btc-purchases.ts'), defaultTicker: 'MSTR' },
    { path: path.join(DATA_DIR, 'mstr-debt-issuances.ts'), defaultTicker: 'MSTR' },
    { path: path.join(DATA_DIR, 'mstr-cash-flow-history.ts'), defaultTicker: 'MSTR' },
    { path: path.join(DATA_DIR, 'mstr-verified-financials.ts'), defaultTicker: 'MSTR' },
    { path: path.join(DATA_DIR, 'ddc-sec-holdings-history.ts'), defaultTicker: 'DDC' },
    { path: path.join(DATA_DIR, 'bmnr-capital-events.ts'), defaultTicker: 'BMNR' },
    { path: path.join(DATA_DIR, 'bmnr-sec-history.ts'), defaultTicker: 'BMNR' },
    { path: path.join(DATA_DIR, 'mara-capital-events.ts'), defaultTicker: 'MARA' },
  ];

  // Add all files in provenance/
  const provenanceDir = path.join(DATA_DIR, 'provenance');
  if (fs.existsSync(provenanceDir)) {
    const provFiles = fs.readdirSync(provenanceDir).filter(f => f.endsWith('.ts'));
    for (const f of provFiles) {
      const ticker = f.replace('.ts', '').toUpperCase();
      files.push({ path: path.join(provenanceDir, f), defaultTicker: ticker });
    }
  }

  for (const { path: filePath, defaultTicker } of files) {
    if (!fs.existsSync(filePath)) {
      if (verbose) console.warn(`  Skipping ${path.basename(filePath)} — file not found`);
      continue;
    }
    const extracted = extractFromFile(filePath, defaultTicker);
    citations.push(...extracted);
  }

  // Deduplicate by ticker+accession
  const seen = new Set<string>();
  return citations.filter(c => {
    const key = `${c.ticker}|${c.accession}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Check R2 existence
// ---------------------------------------------------------------------------
interface R2Result extends Citation {
  inR2: boolean;
  r2Key: string | null;
  prefixFound: string | null;
}

async function checkR2(citation: Citation): Promise<R2Result> {
  const tickerLower = citation.ticker.toLowerCase();
  const batch = TICKER_BATCHES[tickerLower] || 1;

  const orderedPrefixes = [
    `batch${batch}`,
    ...R2_PREFIXES.filter(p => p !== `batch${batch}`),
  ];

  for (const prefix of orderedPrefixes) {
    const url = `${R2_BASE_URL}/${prefix}/${tickerLower}/${citation.accession}.txt`;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      if (res.ok) {
        const key = `${prefix}/${tickerLower}/${citation.accession}.txt`;
        if (verbose) console.log(`  R2-OK ${citation.ticker} ${citation.accession} -> ${key}`);
        return { ...citation, inR2: true, r2Key: key, prefixFound: prefix };
      }
    } catch {
      // try next
    }
  }

  if (verbose) console.log(`  R2-MISS ${citation.ticker} ${citation.accession}`);
  return { ...citation, inR2: false, r2Key: null, prefixFound: null };
}

// ---------------------------------------------------------------------------
// EDGAR verification — checks accession exists in SEC's EFTS search index
// ---------------------------------------------------------------------------
interface EdgarResult extends Citation {
  existsInEdgar: boolean;
  edgarEntity: string | null;
  edgarFormType: string | null;
  edgarFiledDate: string | null;
  error: string | null;
}

// Known non-SEC tickers (foreign filers not in EDGAR)
const NON_SEC_TICKERS = new Set([
  '3350.T', '3189.T', '3825.T', '0434.HK',
  'ALCPB', 'DCC.AX', 'H100.ST', 'LUXFF',
  'OBTC3', 'SRAG.DU', 'SWC', 'XTAIF', 'BTCT.V',
]);

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function checkEdgarAccession(citation: Citation): Promise<EdgarResult> {
  if (NON_SEC_TICKERS.has(citation.ticker)) {
    return {
      ...citation,
      existsInEdgar: true,
      edgarEntity: '(non-SEC filer)',
      edgarFormType: null,
      edgarFiledDate: null,
      error: null,
    };
  }

  // Use EFTS full-text search to find the accession
  const url = `https://efts.sec.gov/LATEST/search-index?q=%22${citation.accession}%22&dateRange=custom&startdt=2000-01-01&enddt=2030-01-01`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': SEC_USER_AGENT },
    });

    if (res.status === 429) {
      await sleep(2000);
      const retry = await fetch(url, {
        headers: { 'User-Agent': SEC_USER_AGENT },
      });
      if (!retry.ok) {
        return { ...citation, existsInEdgar: false, edgarEntity: null, edgarFormType: null, edgarFiledDate: null, error: `EDGAR HTTP ${retry.status} (rate limited)` };
      }
      return parseEdgarResponse(citation, await retry.json());
    }

    if (!res.ok) {
      return { ...citation, existsInEdgar: false, edgarEntity: null, edgarFormType: null, edgarFiledDate: null, error: `EDGAR HTTP ${res.status}` };
    }

    return parseEdgarResponse(citation, await res.json());
  } catch (err) {
    return { ...citation, existsInEdgar: false, edgarEntity: null, edgarFormType: null, edgarFiledDate: null, error: String(err) };
  }
}

function parseEdgarResponse(
  citation: Citation,
  data: { hits?: { total?: { value?: number }; hits?: Array<{ _source?: { entity_name?: string; form_type?: string; file_date?: string } }> } },
): EdgarResult {
  const totalHits = data?.hits?.total?.value ?? 0;
  if (totalHits === 0) {
    return {
      ...citation,
      existsInEdgar: false,
      edgarEntity: null,
      edgarFormType: null,
      edgarFiledDate: null,
      error: 'NOT FOUND — possible fabrication',
    };
  }

  const hit = data.hits!.hits![0]?._source;
  return {
    ...citation,
    existsInEdgar: true,
    edgarEntity: hit?.entity_name ?? null,
    edgarFormType: hit?.form_type ?? null,
    edgarFiledDate: hit?.file_date ?? null,
    error: null,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const citations = collectCitations();
  console.log(`\nCollected ${citations.length} unique accession citations${filterTicker ? ` for ${filterTicker}` : ''}\n`);

  if (citations.length === 0) {
    console.log('No citations found.');
    return;
  }

  // ── R2 check ──────────────────────────────────────────────────────
  let r2Results: R2Result[] = [];
  if (!edgarOnly) {
    const CONCURRENCY = 10;
    for (let i = 0; i < citations.length; i += CONCURRENCY) {
      const chunk = citations.slice(i, i + CONCURRENCY);
      const chunkResults = await Promise.all(chunk.map(checkR2));
      r2Results.push(...chunkResults);
      if (!verbose && i > 0) process.stdout.write('.');
    }
    if (!verbose) console.log();

    const inR2 = r2Results.filter(r => r.inR2);
    const missingR2 = r2Results.filter(r => !r.inR2);

    console.log('\n' + '='.repeat(60));
    console.log(`R2 RESULTS: ${inR2.length}/${r2Results.length} documents in R2`);
    console.log('='.repeat(60));

    if (missingR2.length > 0) {
      console.log(`\n  MISSING from R2 (${missingR2.length}):\n`);
      const byTicker: Record<string, R2Result[]> = {};
      for (const m of missingR2) (byTicker[m.ticker] ??= []).push(m);
      for (const [ticker, entries] of Object.entries(byTicker).sort()) {
        console.log(`  ${ticker} (${entries.length} missing):`);
        for (const e of entries) console.log(`    - ${e.accession} (${e.file})`);
      }
    }

    if (inR2.length > 0) {
      console.log(`\n  Found in R2 (${inR2.length}):\n`);
      const byTicker: Record<string, R2Result[]> = {};
      for (const r of inR2) (byTicker[r.ticker] ??= []).push(r);
      for (const [ticker, entries] of Object.entries(byTicker).sort()) {
        console.log(`  ${ticker}: ${entries.length} docs (${entries[0].prefixFound})`);
      }
    }
  }

  // ── EDGAR check ───────────────────────────────────────────────────
  let edgarResults: EdgarResult[] = [];
  if (checkEdgar) {
    console.log('\n' + '='.repeat(60));
    console.log('EDGAR VERIFICATION — checking accessions exist in SEC index');
    console.log(`  Rate: 1 request per ${SEC_DELAY_MS}ms (${citations.length} accessions)`);
    console.log(`  Estimated time: ~${Math.ceil(citations.length * SEC_DELAY_MS / 1000)}s`);
    console.log('='.repeat(60) + '\n');

    for (let i = 0; i < citations.length; i++) {
      const result = await checkEdgarAccession(citations[i]);
      edgarResults.push(result);

      if (verbose) {
        const tag = result.existsInEdgar ? 'OK' : 'FAIL';
        const detail = result.existsInEdgar
          ? `${result.edgarEntity} | ${result.edgarFormType} | ${result.edgarFiledDate}`
          : result.error;
        console.log(`  [${i + 1}/${citations.length}] ${tag} ${result.ticker} ${result.accession} — ${detail}`);
      } else {
        process.stdout.write(result.existsInEdgar ? '.' : 'X');
        if ((i + 1) % 50 === 0) process.stdout.write(` ${i + 1}/${citations.length}\n`);
      }

      if (i < citations.length - 1) await sleep(SEC_DELAY_MS);
    }
    if (!verbose) console.log();

    const verified = edgarResults.filter(r => r.existsInEdgar);
    const fabricated = edgarResults.filter(r => !r.existsInEdgar);

    console.log('\n' + '='.repeat(60));
    console.log(`EDGAR RESULTS: ${verified.length}/${edgarResults.length} accessions verified`);
    if (fabricated.length > 0) {
      console.log(`  FABRICATED/INVALID: ${fabricated.length}`);
    }
    console.log('='.repeat(60));

    if (fabricated.length > 0) {
      console.log(`\n  FABRICATED OR INVALID (${fabricated.length}):\n`);
      for (const r of fabricated) {
        console.log(`  ${r.ticker} ${r.accession} (${r.file})`);
        console.log(`    ${r.error}`);
      }
    }

    if (verbose && verified.length > 0) {
      console.log(`\n  Verified in EDGAR (${verified.length}):\n`);
      for (const r of verified) {
        if (r.edgarEntity === '(non-SEC filer)') continue;
        console.log(`  ${r.ticker} ${r.accession} -> ${r.edgarEntity} | ${r.edgarFormType} | ${r.edgarFiledDate}`);
      }
    }
  }

  // ── JSON summary ──────────────────────────────────────────────────
  const summary: Record<string, unknown> = {};

  if (!edgarOnly) {
    const inR2 = r2Results.filter(r => r.inR2);
    const missingR2 = r2Results.filter(r => !r.inR2);
    summary.r2 = {
      total: r2Results.length,
      found: inR2.length,
      missing: missingR2.length,
      coverage: `${((inR2.length / r2Results.length) * 100).toFixed(1)}%`,
      missingAccessions: missingR2.map(m => ({ ticker: m.ticker, accession: m.accession, file: m.file })),
    };
  }

  if (checkEdgar) {
    const verified = edgarResults.filter(r => r.existsInEdgar);
    const fabricated = edgarResults.filter(r => !r.existsInEdgar);
    summary.edgar = {
      total: edgarResults.length,
      verified: verified.length,
      fabricated: fabricated.length,
      coverage: `${((verified.length / edgarResults.length) * 100).toFixed(1)}%`,
      fabricatedAccessions: fabricated.map(r => ({
        ticker: r.ticker,
        accession: r.accession,
        file: r.file,
        error: r.error,
      })),
    };
  }

  console.log('\n--- JSON ---');
  console.log(JSON.stringify(summary, null, 2));

  // Exit with failure if any fabricated accessions found
  if (checkEdgar && edgarResults.some(r => !r.existsInEdgar)) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
