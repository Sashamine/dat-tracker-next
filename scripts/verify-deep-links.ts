#!/usr/bin/env npx tsx
/**
 * verify-deep-links.ts
 *
 * End-to-end verification that citation deep links work:
 * For each current datapoint with a citation_search_term + artifact accession,
 * fetches the R2 document and verifies the search term appears in the text.
 *
 * This replicates the same regex matching the filing viewer uses (FilingViewer.tsx):
 *   1. Escape special regex chars
 *   2. Replace whitespace with \s+ for flexible matching
 *   3. Case-insensitive match
 *
 * Usage:
 *   npx tsx scripts/verify-deep-links.ts                    # all current datapoints
 *   npx tsx scripts/verify-deep-links.ts --ticker=MSTR      # single ticker
 *   npx tsx scripts/verify-deep-links.ts --verbose           # show match context
 */

import { D1Client } from '../src/lib/d1';

const R2_BASE_URL = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';
const R2_PREFIXES = ['new-uploads', 'batch1', 'batch2', 'batch3', 'batch4', 'batch5', 'batch6', 'external-sources'];

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

const tickerFilter = argVal('ticker')?.toUpperCase() ?? null;
const verbose = process.argv.includes('--verbose');

/** Replicate FilingViewer.tsx search regex */
function buildSearchRegex(searchTerm: string): RegExp {
  const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\s+/g, '\\s+');
  return new RegExp(pattern, 'gi');
}

/** Fetch document text from R2 */
async function fetchR2Doc(ticker: string, accession: string, r2Key?: string | null): Promise<string | null> {
  const lowerTicker = ticker.toLowerCase();

  // Try direct r2_key first (most reliable)
  if (r2Key && !r2Key.endsWith('.json') && !r2Key.endsWith('.pdf')) {
    try {
      const res = await fetch(`${R2_BASE_URL}/${r2Key}`, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return await res.text();
    } catch {}
  }

  // Try standard R2 prefixes
  for (const prefix of R2_PREFIXES) {
    const url = `${R2_BASE_URL}/${prefix}/${lowerTicker}/${accession}.txt`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return await res.text();
    } catch {}
  }

  return null;
}

type Row = {
  entity_id: string;
  metric: string;
  as_of: string | null;
  value: number;
  citation_search_term: string;
  citation_quote: string | null;
  accession: string | null;
  r2_key: string | null;
  source_url: string | null;
};

async function main() {
  const d1 = D1Client.fromEnv();

  // Get all current datapoints that have a search term + artifact
  const tickerClause = tickerFilter ? `AND d.entity_id = '${tickerFilter}'` : '';
  const { results: rows } = await d1.query<Row>(`
    SELECT
      d.entity_id, d.metric, d.as_of, d.value,
      d.citation_search_term, d.citation_quote,
      a.accession, a.r2_key, a.source_url
    FROM latest_datapoints d
    LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
    WHERE d.citation_search_term IS NOT NULL
      AND d.citation_search_term != ''
      ${tickerClause}
    ORDER BY d.entity_id, d.metric
  `);

  console.log(`Deep Link Verification`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Datapoints with search terms: ${rows.length}`);
  if (tickerFilter) console.log(`Filter: ${tickerFilter}`);
  console.log();

  // Group by accession to avoid fetching the same doc multiple times
  const byAccession = new Map<string, Row[]>();
  const noAccession: Row[] = [];

  for (const row of rows) {
    if (row.accession) {
      const key = `${row.entity_id}/${row.accession}`;
      if (!byAccession.has(key)) byAccession.set(key, []);
      byAccession.get(key)!.push(row);
    } else {
      noAccession.push(row);
    }
  }

  let pass = 0;
  let fail = 0;
  let noDoc = 0;
  let noAccessionCount = noAccession.length;
  const failures: { ticker: string; metric: string; searchTerm: string; reason: string }[] = [];

  // Process by accession (batch fetches)
  for (const [key, datapoints] of byAccession) {
    const [ticker, accession] = key.split('/');
    const r2Key = datapoints[0]?.r2_key;
    const doc = await fetchR2Doc(ticker, accession, r2Key);

    if (!doc) {
      for (const dp of datapoints) {
        noDoc++;
        if (verbose) {
          console.log(`  NODOC  ${dp.entity_id} / ${dp.metric} — ${accession} not in R2`);
        }
      }
      continue;
    }

    for (const dp of datapoints) {
      const regex = buildSearchRegex(dp.citation_search_term);
      const matches = doc.match(regex);

      if (matches && matches.length > 0) {
        pass++;
        if (verbose) {
          // Show match context
          const idx = doc.search(regex);
          const context = doc.slice(Math.max(0, idx - 30), idx + dp.citation_search_term.length + 30).replace(/\s+/g, ' ');
          console.log(`  PASS   ${dp.entity_id} / ${dp.metric} — "${dp.citation_search_term}" found (${matches.length}x)`);
          console.log(`         ...${context}...`);
        }
      } else {
        fail++;
        failures.push({
          ticker: dp.entity_id,
          metric: dp.metric,
          searchTerm: dp.citation_search_term,
          reason: `not found in ${accession} (${(doc.length / 1024).toFixed(0)}KB doc)`,
        });
        if (verbose) {
          console.log(`  FAIL   ${dp.entity_id} / ${dp.metric} — "${dp.citation_search_term}" NOT in ${accession}`);
        }
      }
    }
  }

  // Summary
  console.log(`Results`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  PASS (search term found in doc):  ${pass}`);
  console.log(`  FAIL (search term NOT in doc):    ${fail}`);
  console.log(`  NODOC (R2 document not found):    ${noDoc}`);
  console.log(`  SKIP (no accession on artifact):  ${noAccessionCount}`);
  console.log(`  Total:                            ${rows.length}`);

  const verifiable = pass + fail;
  const hitRate = verifiable > 0 ? ((pass / verifiable) * 100).toFixed(1) : 'N/A';
  console.log(`\n  Deep link hit rate: ${hitRate}% (${pass}/${verifiable})`);

  if (failures.length > 0) {
    console.log(`\nFailures (search term not found in document):`);
    for (const f of failures.slice(0, 30)) {
      console.log(`  ${f.ticker} / ${f.metric} — "${f.searchTerm}" — ${f.reason}`);
    }
    if (failures.length > 30) {
      console.log(`  ... and ${failures.length - 30} more`);
    }
  }

  if (noAccessionCount > 0 && verbose) {
    console.log(`\nNo accession (external sources — deep link not possible):`);
    for (const dp of noAccession.slice(0, 10)) {
      console.log(`  ${dp.entity_id} / ${dp.metric} — source: ${(dp.source_url || '(null)').slice(0, 60)}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
