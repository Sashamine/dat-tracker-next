#!/usr/bin/env npx tsx
/**
 * fix-no-candidates.ts
 *
 * For each "no candidates" datapoint in value extraction verification,
 * searches across ALL R2 documents for that ticker to find the number.
 * If found in a different doc or format, updates the citation in D1.
 * If not found anywhere, marks the datapoint for manual review.
 *
 * Usage:
 *   npx tsx scripts/fix-no-candidates.ts              # analyze all
 *   npx tsx scripts/fix-no-candidates.ts --fix         # apply fixes to D1
 *   npx tsx scripts/fix-no-candidates.ts --ticker=MSTR # single ticker
 */

import { D1Client } from '../src/lib/d1';

const R2_BASE_URL = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';
const DERIVED_PREFIXES = ['[Zero', '[Derived', '[Carried', '[Pre-filing', '[SPAC', '[Historical'];

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}
const applyFixes = process.argv.includes('--fix');
const filterTicker = argVal('ticker')?.toUpperCase() ?? null;

// ---------------------------------------------------------------------------
// Number format variations
// ---------------------------------------------------------------------------
function generateSearchVariants(value: number, searchTerm: string): string[] {
  const variants: string[] = [];

  // Original search term
  variants.push(searchTerm);

  // Raw value with commas
  const withCommas = value.toLocaleString('en-US');
  variants.push(withCommas);

  // Raw value without commas
  const raw = String(value);
  variants.push(raw);

  // Scaled: value / 1000 with commas
  if (value >= 1000 && value % 1000 === 0) {
    const k = value / 1000;
    variants.push(k.toLocaleString('en-US'));
    variants.push(String(k));
  }

  // Scaled: value / 1,000,000
  if (value >= 1_000_000 && value % 1_000_000 === 0) {
    const m = value / 1_000_000;
    variants.push(m.toLocaleString('en-US'));
    variants.push(String(m));
  }

  // "X.Y million" format
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    const mStr = m % 1 === 0 ? String(m) : m.toFixed(1);
    variants.push(`${mStr} million`);
    variants.push(`$${mStr} million`);
  }

  // "X.Y billion" format
  if (value >= 1_000_000_000) {
    const b = value / 1_000_000_000;
    const bStr = b % 1 === 0 ? String(b) : b.toFixed(1);
    variants.push(`${bStr} billion`);
    variants.push(`$${bStr} billion`);
  }

  // Dedupe
  return [...new Set(variants)].filter(v => v.length >= 3);
}

function findInDoc(doc: string, variants: string[]): { variant: string; index: number } | null {
  for (const v of variants) {
    const escaped = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = escaped.replace(/\s+/g, '\\s+');
    const regex = new RegExp(pattern, 'gi');
    const match = regex.exec(doc);
    if (match) return { variant: v, index: match.index };
  }
  return null;
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------------
// Fetch all R2 docs for a ticker
// ---------------------------------------------------------------------------
async function fetchAllDocsForTicker(
  d1: InstanceType<typeof D1Client>,
  ticker: string
): Promise<Array<{ accession: string; artifactId: string; r2Key: string; text: string }>> {
  // Get all artifacts for this ticker
  const { results: artifacts } = await d1.query<{
    artifact_id: string; accession: string; r2_key: string;
  }>(`
    SELECT artifact_id, accession, r2_key
    FROM artifacts
    WHERE ticker = ? AND r2_key IS NOT NULL
    ORDER BY fetched_at DESC
  `, [ticker]);

  const docs: Array<{ accession: string; artifactId: string; r2Key: string; text: string }> = [];

  for (const art of artifacts) {
    try {
      const url = `${R2_BASE_URL}/${art.r2_key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('pdf')) continue;
      let text = await res.text();
      // Strip HTML if needed
      if (text.includes('</') && text.includes('<')) {
        text = stripHtml(text);
      }
      if (text.length < 100) continue;
      docs.push({
        accession: art.accession,
        artifactId: art.artifact_id,
        r2Key: art.r2_key,
        text,
      });
    } catch {}
  }

  return docs;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const d1 = D1Client.fromEnv();

  // Get no-candidate datapoints (same filter as verify script)
  const query = `
    SELECT d.datapoint_id, d.entity_id, d.metric, d.value, d.method,
           d.citation_search_term, d.citation_quote, d.artifact_id,
           a.accession, a.r2_key
    FROM latest_datapoints d
    LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
    WHERE d.citation_search_term IS NOT NULL
      AND a.accession IS NOT NULL
      AND d.value != 0
      AND d.method != 'sec_companyfacts_xbrl'
    ORDER BY d.entity_id, d.metric
  `;

  const { results: rows } = await d1.query<{
    datapoint_id: string; entity_id: string; metric: string; value: number;
    method: string; citation_search_term: string; citation_quote: string | null;
    artifact_id: string; accession: string; r2_key: string | null;
  }>(query);

  // Filter derived
  const checkRows = rows.filter(r => {
    const quote = r.citation_quote || '';
    return DERIVED_PREFIXES.every(p => quote.indexOf(p) !== 0);
  });

  // Apply ticker filter
  const filtered = filterTicker
    ? checkRows.filter(r => r.entity_id === filterTicker)
    : checkRows;

  console.log(`\nAnalyzing ${filtered.length} text-based datapoints`);
  if (applyFixes) console.log('FIX MODE — will update D1\n');
  else console.log('ANALYSIS MODE — use --fix to apply changes\n');

  // Group by ticker for efficient doc fetching
  const byTicker: Record<string, typeof filtered> = {};
  for (const r of filtered) {
    if (!byTicker[r.entity_id]) byTicker[r.entity_id] = [];
    byTicker[r.entity_id].push(r);
  }

  const results = {
    alreadyPassing: 0,
    fixedSearchTerm: 0,
    fixedArtifact: 0,
    unfixable: 0,
    total: 0,
  };

  const unfixableList: Array<{ ticker: string; metric: string; value: number; search: string; reason: string }> = [];
  const fixList: Array<{ ticker: string; metric: string; oldSearch: string; newSearch: string; action: string }> = [];

  for (const [ticker, tickerRows] of Object.entries(byTicker)) {
    // Fetch all docs for this ticker
    const allDocs = await fetchAllDocsForTicker(d1, ticker);

    for (const row of tickerRows) {
      results.total++;
      const variants = generateSearchVariants(row.value, row.citation_search_term);

      // First check: does the current cited doc contain the number?
      const currentDoc = allDocs.find(d => d.accession === row.accession);
      if (currentDoc) {
        const found = findInDoc(currentDoc.text, variants);
        if (found) {
          if (found.variant !== row.citation_search_term) {
            // Found in same doc but different format — update search term
            fixList.push({
              ticker, metric: row.metric,
              oldSearch: row.citation_search_term,
              newSearch: found.variant,
              action: 'update_search_term',
            });
            results.fixedSearchTerm++;

            if (applyFixes) {
              try {
                await d1.query(
                  'UPDATE datapoints SET citation_search_term = ? WHERE datapoint_id = ?',
                  [found.variant, row.datapoint_id]
                );
              } catch (err) {
                console.log(`  SKIP ${ticker} ${row.metric}: ${err instanceof Error ? err.message : String(err)}`);
              }
            }
          } else {
            results.alreadyPassing++;
          }
          continue;
        }
      }

      // Second check: search ALL docs for this ticker
      let foundInOtherDoc = false;
      for (const doc of allDocs) {
        if (doc.accession === row.accession) continue;
        const found = findInDoc(doc.text, variants);
        if (found) {
          fixList.push({
            ticker, metric: row.metric,
            oldSearch: row.citation_search_term,
            newSearch: found.variant,
            action: `repoint_to_${(doc.accession || doc.artifactId).slice(0, 30)}`,
          });
          results.fixedArtifact++;
          foundInOtherDoc = true;

          if (applyFixes) {
            try {
              await d1.query(
                'UPDATE datapoints SET citation_search_term = ?, artifact_id = ? WHERE datapoint_id = ?',
                [found.variant, doc.artifactId, row.datapoint_id]
              );
            } catch (err) {
              console.log(`  SKIP ${ticker} ${row.metric}: ${err instanceof Error ? err.message : String(err)}`);
            }
          }
          break;
        }
      }

      if (!foundInOtherDoc) {
        results.unfixable++;
        unfixableList.push({
          ticker, metric: row.metric, value: row.value,
          search: row.citation_search_term,
          reason: allDocs.length === 0 ? 'no R2 docs for ticker' : `not in any of ${allDocs.length} docs`,
        });
      }
    }

    // Small delay between tickers to avoid hammering R2
    await new Promise(r => setTimeout(r, 100));
  }

  // Print results
  console.log(`\n${'='.repeat(60)}`);
  console.log('RESULTS');
  console.log(`${'='.repeat(60)}`);
  console.log(`  Total checked:      ${results.total}`);
  console.log(`  Already passing:    ${results.alreadyPassing}`);
  console.log(`  Fixed search term:  ${results.fixedSearchTerm}`);
  console.log(`  Repointed artifact: ${results.fixedArtifact}`);
  console.log(`  Unfixable:          ${results.unfixable}`);

  if (fixList.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`FIXES ${applyFixes ? 'APPLIED' : 'AVAILABLE'} (${fixList.length}):`);
    console.log(`${'─'.repeat(60)}`);
    for (const f of fixList) {
      console.log(`  ${f.ticker} ${f.metric}: "${f.oldSearch}" → "${f.newSearch}" (${f.action})`);
    }
  }

  if (unfixableList.length > 0) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`UNFIXABLE — NEEDS MANUAL REVIEW (${unfixableList.length}):`);
    console.log(`${'─'.repeat(60)}`);
    for (const u of unfixableList) {
      console.log(`  ${u.ticker} ${u.metric} = ${u.value.toLocaleString()}: search="${u.search}" — ${u.reason}`);
    }
  }

  if (!applyFixes && fixList.length > 0) {
    console.log(`\n→ Run with --fix to apply ${fixList.length} fixes to D1`);
  }
}

main().catch(console.error);
