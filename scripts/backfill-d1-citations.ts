#!/usr/bin/env npx tsx
/**
 * backfill-d1-citations.ts
 *
 * Backfills citation_quote and citation_search_term on D1 datapoints by:
 * 1. For each datapoint missing a citation_quote
 * 2. Fetch its linked R2 document (via artifact accession)
 * 3. Search the document text for the datapoint's value (formatted various ways)
 * 4. If found, extract the surrounding passage as citation_quote
 * 5. Write citation_quote + citation_search_term back to D1
 *
 * This is deterministic — no LLM needed. Just value-in-document matching.
 *
 * Usage:
 *   npx tsx scripts/backfill-d1-citations.ts                    # all
 *   npx tsx scripts/backfill-d1-citations.ts --ticker=MSTR      # single ticker
 *   npx tsx scripts/backfill-d1-citations.ts --dry-run=true     # preview only
 *   npx tsx scripts/backfill-d1-citations.ts --method=sec_companyfacts_xbrl  # filter by method
 */

import { D1Client } from '../src/lib/d1';
import { extractSearchSnippet } from '../src/lib/utils/citation';

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
const filterTicker = argVal('ticker')?.toUpperCase() ?? null;
const filterMethod = argVal('method') ?? null;
const dryRun = (argVal('dry-run') || '').toString() === 'true';
const verbose = process.argv.includes('--verbose');

// ---------------------------------------------------------------------------
// R2 document fetching
// ---------------------------------------------------------------------------
const R2_BASE_URL = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';
const TICKER_BATCHES: Record<string, number> = {
  abtc: 1, asst: 1, avx: 1, bmnr: 1, bnc: 1, btbt: 1, btcs: 1, btdr: 1, btog: 1, cepo: 1, clsk: 1,
  corz: 2, cwd: 2, cyph: 2, dfdv: 2, djt: 2, ethm: 2, fgnx: 2, fwdi: 2,
  game: 3, hsdt: 3, hypd: 3, kulr: 3, lits: 3, mara: 3, mstr: 3, na: 3,
  naka: 4, nxtt: 4, purr: 4, riot: 4, sbet: 4, stke: 4, suig: 4,
  taox: 5, tbh: 5, tron: 5, twav: 5, upxi: 5, xrpn: 5, xxi: 5,
  zone: 6, zooz: 1,
};
const R2_PREFIXES = ['new-uploads', 'batch1', 'batch2', 'batch3', 'batch4', 'batch5', 'batch6'];

async function fetchR2Document(ticker: string, accession: string): Promise<string | null> {
  const tickerLower = ticker.toLowerCase();
  const batch = TICKER_BATCHES[tickerLower] || 1;
  const orderedPrefixes = [`batch${batch}`, ...R2_PREFIXES.filter((p) => p !== `batch${batch}`)];

  for (const prefix of orderedPrefixes) {
    const url = `${R2_BASE_URL}/${prefix}/${tickerLower}/${accession}.txt`;
    try {
      const res = await fetch(url);
      if (res.ok) return await res.text();
    } catch {
      continue;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Value formatting: generate search patterns for a numeric value
// ---------------------------------------------------------------------------
function formatValuePatterns(value: number, unit: string, metric: string): string[] {
  const patterns: string[] = [];
  const abs = Math.abs(value);

  // Integer values (shares, whole dollars, native holdings)
  if (Number.isInteger(value) || abs > 100) {
    // With commas: 1,234,567
    const withCommas = abs.toLocaleString('en-US');
    patterns.push(withCommas);

    // Without commas: 1234567
    if (abs >= 1000) {
      patterns.push(abs.toString());
    }

    // In thousands: 1,234 (if value is e.g. 1234000 and unit is USD, SEC filings often show in thousands)
    if (abs >= 1_000_000 && abs % 1000 === 0) {
      patterns.push((abs / 1000).toLocaleString('en-US'));
    }

    // In millions with decimals: 1,234.6 or 1234.6
    if (abs >= 1_000_000) {
      const inM = abs / 1_000_000;
      if (inM >= 1) {
        patterns.push(inM.toFixed(1));
        patterns.push(inM.toFixed(0));
        if (inM >= 1000) {
          patterns.push(inM.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }));
          patterns.push(Math.round(inM).toLocaleString('en-US'));
        }
      }
    }

    // In billions
    if (abs >= 1_000_000_000) {
      const inB = abs / 1_000_000_000;
      patterns.push(inB.toFixed(1));
      patterns.push(inB.toFixed(2));
      patterns.push(inB.toFixed(3));
    }
  }

  // Decimal values (BTC holdings like 672500.5)
  if (!Number.isInteger(value)) {
    patterns.push(abs.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 6 }));
    patterns.push(abs.toString());
  }

  // For shares: also try without trailing zeros that SEC sometimes omits
  if (metric === 'basic_shares' && abs > 1_000_000) {
    // e.g., 277660000 → try "277,660" (in thousands)
    const inK = abs / 1000;
    if (Number.isInteger(inK)) {
      patterns.push(inK.toLocaleString('en-US'));
    }
  }

  // Deduplicate and filter: require at least 4 chars to avoid false matches
  // (e.g., "100", "2.4" match everywhere in financial docs)
  return [...new Set(patterns)].filter(p => p.length >= 4);
}

// ---------------------------------------------------------------------------
// Search document for value and extract surrounding context
// ---------------------------------------------------------------------------
/**
 * Strip HTML/XML tags and decode common entities to get plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')            // Remove tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findValueInDocument(
  rawDocText: string,
  patterns: string[],
): { quote: string; searchTerm: string; patternUsed: string } | null {
  // Work with plain text (strip HTML if present)
  const docText = rawDocText.includes('<') ? stripHtml(rawDocText) : rawDocText;

  for (const pattern of patterns) {
    // Escape for regex
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Allow flexible whitespace
    const flexPattern = escaped.replace(/\s+/g, '\\s+');
    const regex = new RegExp(flexPattern, 'g');

    const match = regex.exec(docText);
    if (match) {
      // Skip if the pattern matches too many times (ambiguous)
      const allMatches = docText.match(new RegExp(flexPattern, 'g'));
      if (allMatches && allMatches.length > 20) continue;

      // Extract surrounding context (up to ~200 chars on each side, trimmed to sentence boundaries)
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;

      let quoteStart = Math.max(0, matchStart - 200);
      let quoteEnd = Math.min(docText.length, matchEnd + 200);

      // Trim to sentence/line boundary on left
      const leftChunk = docText.slice(quoteStart, matchStart);
      const sentenceStart = leftChunk.search(/(?:^|\.\s+|\n)[A-Z]/);
      if (sentenceStart >= 0) {
        quoteStart = quoteStart + sentenceStart;
        if (docText[quoteStart] === '.' || docText[quoteStart] === '\n') quoteStart++;
        while (quoteStart < matchStart && /\s/.test(docText[quoteStart])) quoteStart++;
      }

      // Trim to sentence/line boundary on right
      const rightChunk = docText.slice(matchEnd, quoteEnd);
      const sentenceEnd = rightChunk.search(/\.\s|\n/);
      if (sentenceEnd >= 0) {
        quoteEnd = matchEnd + sentenceEnd + 1;
      }

      const quote = docText.slice(quoteStart, quoteEnd).replace(/\s+/g, ' ').trim();

      if (quote.length < 10) continue;

      return {
        quote: quote.slice(0, 500),
        searchTerm: pattern,        // Use the exact pattern that matched, not re-extracted
        patternUsed: pattern,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const d1 = D1Client.fromEnv();

  // Fetch datapoints missing citation_quote that have artifacts with accessions
  let sql = `
    SELECT d.datapoint_id, d.entity_id, d.metric, d.value, d.unit, d.as_of,
           d.method, d.xbrl_concept, a.accession, a.source_type
    FROM latest_datapoints d
    JOIN artifacts a ON a.artifact_id = d.artifact_id
    WHERE d.citation_quote IS NULL
      AND a.accession IS NOT NULL
  `;
  const params: any[] = [];

  if (filterTicker) {
    sql += ' AND d.entity_id = ?';
    params.push(filterTicker);
  }
  if (filterMethod) {
    sql += ' AND d.method = ?';
    params.push(filterMethod);
  }
  sql += ' ORDER BY d.entity_id, d.metric';

  const { results: rows } = await d1.query<{
    datapoint_id: string;
    entity_id: string;
    metric: string;
    value: number;
    unit: string;
    as_of: string | null;
    method: string | null;
    xbrl_concept: string | null;
    accession: string;
    source_type: string | null;
  }>(sql, params);

  console.log(`Found ${rows.length} datapoints missing citation_quote (with accession)`);
  if (dryRun) console.log('(DRY RUN — no writes)');

  const docCache: Record<string, string | null> = {};
  let found = 0;
  let notFound = 0;
  let docMissing = 0;
  let written = 0;

  for (const row of rows) {
    const cacheKey = `${row.entity_id}|${row.accession}`;
    if (!(cacheKey in docCache)) {
      docCache[cacheKey] = await fetchR2Document(row.entity_id, row.accession);
    }
    const doc = docCache[cacheKey];

    if (!doc) {
      docMissing++;
      if (verbose) {
        console.log(`  SKIP ${row.entity_id}/${row.metric}: R2 doc missing for ${row.accession}`);
      }
      continue;
    }

    // Skip zero values — nothing meaningful to cite
    if (row.value === 0) {
      if (verbose) console.log(`  SKIP ${row.entity_id}/${row.metric}: value is 0`);
      continue;
    }

    const patterns = formatValuePatterns(row.value, row.unit, row.metric);
    if (patterns.length === 0) {
      if (verbose) console.log(`  SKIP ${row.entity_id}/${row.metric}: no search patterns for value ${row.value}`);
      continue;
    }

    const result = findValueInDocument(doc, patterns);

    if (!result) {
      notFound++;
      if (verbose) {
        console.log(`  MISS ${row.entity_id}/${row.metric} = ${row.value} (tried ${patterns.length} patterns)`);
      }
      continue;
    }

    found++;
    // Use the matched pattern as search term (most reliable), fall back to quote extraction
    const citationSearchTerm = result.searchTerm || extractSearchSnippet(result.quote);

    if (verbose || dryRun) {
      console.log(`  FOUND ${row.entity_id}/${row.metric} = ${row.value}`);
      console.log(`    Pattern: "${result.patternUsed}"`);
      console.log(`    Quote:   "${result.quote.slice(0, 120)}${result.quote.length > 120 ? '...' : ''}"`);
      console.log(`    Search:  "${citationSearchTerm}"`);
    }

    if (!dryRun) {
      await d1.query(
        `UPDATE datapoints
         SET citation_quote = ?,
             citation_search_term = ?
         WHERE datapoint_id = ?`,
        [result.quote, citationSearchTerm, row.datapoint_id]
      );
      written++;
    }
  }

  // Also check datapoints without accession (can't R2-verify, just report)
  const noAccession = await d1.query<{ cnt: number }>(
    `SELECT COUNT(*) as cnt FROM latest_datapoints d
     LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
     WHERE d.citation_quote IS NULL AND (a.accession IS NULL OR a.accession = '')`,
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log('BACKFILL RESULTS');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Datapoints checked:       ${rows.length}`);
  console.log(`  Value found in document:  ${found}`);
  console.log(`  Value NOT found:          ${notFound}`);
  console.log(`  R2 document missing:      ${docMissing}`);
  console.log(`  Citations written:        ${dryRun ? '(dry run)' : written}`);
  console.log(`  Without accession (skip): ${noAccession.results[0].cnt}`);
  console.log(`  Hit rate:                 ${rows.length > 0 ? ((found / (rows.length - docMissing)) * 100).toFixed(1) : 'N/A'}% (of docs found)`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
