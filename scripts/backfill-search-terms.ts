#!/usr/bin/env npx tsx
/**
 * backfill-search-terms.ts
 *
 * For datapoints that have an accession (filing in R2) but no citation_search_term,
 * try to find the value in the document using various number formats.
 * When a match is found, store it as the citation_search_term for deep linking.
 *
 * Usage:
 *   npx tsx scripts/backfill-search-terms.ts                    # dry run (default)
 *   npx tsx scripts/backfill-search-terms.ts --apply             # write to D1
 *   npx tsx scripts/backfill-search-terms.ts --ticker=MSTR       # single ticker
 *   npx tsx scripts/backfill-search-terms.ts --verbose           # show all attempts
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
const apply = process.argv.includes('--apply');
const verbose = process.argv.includes('--verbose');

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

/** Replicate FilingViewer.tsx search regex */
function buildSearchRegex(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\s+/g, '\\s+');
  return new RegExp(pattern, 'gi');
}

function searchDoc(doc: string, term: string): boolean {
  return buildSearchRegex(term).test(doc);
}

/** Generate candidate search terms for a given metric value */
function generateCandidates(value: number, metric: string): [string, string][] {
  const candidates: [string, string][] = [];

  if (value === 0) return candidates;

  const absVal = Math.abs(value);

  // For USD metrics, XBRL values are full USD but docs often show in thousands
  const isUsd = metric.endsWith('_usd');
  const isShares = metric === 'basic_shares';

  // Full formatted number: 1,234,567
  candidates.push(['full', fmt(absVal)]);

  // Raw number without commas
  candidates.push(['raw', String(absVal)]);

  if (isUsd || isShares) {
    // In thousands: 1,234,567,000 → "1,234,567"
    if (absVal >= 1000 && absVal % 1000 === 0) {
      candidates.push(['thousands', fmt(absVal / 1000)]);
    }
    // In thousands (rounded for non-exact): 1,234,567,890 → "1,234,568"
    if (absVal >= 1000 && absVal % 1000 !== 0) {
      candidates.push(['thousands-rounded', fmt(Math.round(absVal / 1000))]);
    }

    // In millions with 1 decimal: "1,234.6" or "1,234.5"
    if (absVal >= 1_000_000) {
      candidates.push(['millions-1d', (absVal / 1_000_000).toFixed(1)]);
      // Also try formatted millions: "1,234.6"
      const mVal = absVal / 1_000_000;
      if (mVal >= 1000) {
        candidates.push(['millions-1d-fmt', fmt(Math.floor(mVal)) + '.' + ((absVal % 1_000_000) / 100_000).toFixed(0)]);
      }
    }

    // In millions integer
    if (absVal >= 1_000_000) {
      candidates.push(['millions-int', fmt(Math.round(absVal / 1_000_000))]);
    }

    // In billions with 1-2 decimals
    if (absVal >= 1_000_000_000) {
      candidates.push(['billions-1d', (absVal / 1_000_000_000).toFixed(1)]);
      candidates.push(['billions-2d', (absVal / 1_000_000_000).toFixed(2)]);
    }
  }

  // For holdings_native (crypto amounts), try common formats
  if (metric === 'holdings_native' || metric === 'bitcoin_holdings_usd') {
    // Try with different decimal places
    if (absVal !== Math.floor(absVal)) {
      candidates.push(['2d', absVal.toFixed(2)]);
      candidates.push(['2d-fmt', fmt(Math.floor(absVal)) + '.' + absVal.toFixed(2).split('.')[1]]);
    }
  }

  return candidates;
}

/** Fetch document text from R2 */
async function fetchR2Doc(ticker: string, accession: string, r2Key?: string): Promise<string | null> {
  const lowerTicker = ticker.toLowerCase();

  // Try direct r2_key first if available
  if (r2Key) {
    const url = `${R2_BASE_URL}/${r2Key}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('pdf')) return null; // Can't search PDFs
        return await res.text();
      }
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

  // Try legacy paths
  const legacyPaths = [
    `processed-sec-docs/${lowerTicker}/${accession}.txt`,
    `${lowerTicker}/10q/${accession}.txt`,
    `${lowerTicker}/10k/${accession}.txt`,
    `${lowerTicker}/8k/${accession}.txt`,
  ];
  for (const path of legacyPaths) {
    const url = `${R2_BASE_URL}/${path}`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (res.ok) return await res.text();
    } catch {}
  }

  return null;
}

async function main() {
  const d1 = D1Client.fromEnv();

  const tickerClause = tickerFilter ? `AND ld.entity_id = '${tickerFilter}'` : '';

  const { results } = await d1.query<any>(`
    SELECT ld.entity_id, ld.metric, ld.value, ld.datapoint_id,
           a.accession, a.r2_key
    FROM latest_datapoints ld
    JOIN artifacts a ON a.artifact_id = ld.artifact_id
    WHERE (ld.citation_search_term IS NULL OR ld.citation_search_term = '')
    AND a.accession IS NOT NULL AND a.accession != ''
    ${tickerClause}
    ORDER BY ld.entity_id, ld.metric
  `);

  console.log(`Datapoints to process: ${results.length}`);
  console.log(`Mode: ${apply ? 'APPLY (writing to D1)' : 'DRY RUN (use --apply to write)'}\n`);

  // Group by accession to batch R2 fetches
  const byDoc = new Map<string, { doc: string | null; fetched: boolean; ticker: string; accession: string; r2Key: string }>();
  for (const r of results) {
    const key = `${r.entity_id}/${r.accession}`;
    if (!byDoc.has(key)) {
      byDoc.set(key, { doc: null, fetched: false, ticker: r.entity_id, accession: r.accession, r2Key: r.r2_key });
    }
  }

  let found = 0, notFound = 0, noDoc = 0, skipped = 0;
  const updates: { datapoint_id: string; searchTerm: string }[] = [];

  for (const r of results) {
    const docKey = `${r.entity_id}/${r.accession}`;
    const docEntry = byDoc.get(docKey)!;

    // Fetch doc if not yet fetched
    if (!docEntry.fetched) {
      docEntry.doc = await fetchR2Doc(docEntry.ticker, docEntry.accession, docEntry.r2Key);
      docEntry.fetched = true;
      if (!docEntry.doc) {
        if (verbose) console.log(`  NODOC ${r.entity_id}/${r.accession}`);
      }
    }

    if (!docEntry.doc) {
      noDoc++;
      continue;
    }

    if (r.value === 0 || r.value === null) {
      skipped++;
      continue;
    }

    const candidates = generateCandidates(r.value, r.metric);
    let matched = false;

    for (const [label, term] of candidates) {
      if (searchDoc(docEntry.doc, term)) {
        console.log(`MATCH ${r.entity_id}/${r.metric} → "${term}" (${label})`);
        updates.push({ datapoint_id: r.datapoint_id, searchTerm: term });
        found++;
        matched = true;
        break;
      }
    }

    if (!matched) {
      if (verbose) {
        console.log(`MISS ${r.entity_id}/${r.metric} val=${r.value}`);
        for (const [label, term] of candidates) {
          console.log(`    tried: "${term}" (${label})`);
        }
      } else {
        console.log(`MISS ${r.entity_id}/${r.metric} val=${r.value}`);
      }
      notFound++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Found:    ${found}`);
  console.log(`Not found: ${notFound}`);
  console.log(`No doc:   ${noDoc}`);
  console.log(`Skipped:  ${skipped}`);

  if (apply && updates.length > 0) {
    console.log(`\nApplying ${updates.length} updates to D1...`);
    for (const u of updates) {
      await d1.query(
        `UPDATE datapoints SET citation_search_term = ? WHERE datapoint_id = ?`,
        [u.searchTerm, u.datapoint_id]
      );
    }
    console.log('Done.');
  } else if (updates.length > 0) {
    console.log(`\nRun with --apply to write ${updates.length} search terms to D1.`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
