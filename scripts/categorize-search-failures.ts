#!/usr/bin/env tsx
/**
 * Categorize the search-term-not-found failures by method.
 * Separates expected misses (XBRL values) from real problems.
 */
import { D1Client } from '@/lib/d1';

const SITE_BASE = 'https://dat-tracker-next.vercel.app';

async function fetchDoc(ticker: string, accession: string): Promise<string | null> {
  try {
    const res = await fetch(`${SITE_BASE}/api/sec/fetch-content?ticker=${ticker}&accession=${accession}`);
    if (!res.ok) return null;
    const text = await res.text();
    return text.length > 100 ? text : null;
  } catch { return null; }
}

async function main() {
  const d1 = D1Client.fromEnv();

  const result = await d1.query<{
    entity_id: string; metric: string; value: number; as_of: string;
    method: string; citation_search_term: string; xbrl_concept: string;
    artifact_accession: string; citation_quote: string;
  }>(`
    SELECT d.entity_id, d.metric, d.value, d.as_of, d.method,
           d.citation_search_term, d.xbrl_concept, d.citation_quote,
           a.accession AS artifact_accession
    FROM latest_datapoints d
    LEFT JOIN artifacts a ON a.artifact_id = d.artifact_id
    ORDER BY d.entity_id, d.metric
  `);

  const rows = result.results;

  // All datapoints with search terms + artifacts (the verifiable set)
  const verifiable = rows.filter(r => r.citation_search_term && r.artifact_accession);

  console.log(`Total datapoints: ${rows.length}`);
  console.log(`Verifiable (have search term + artifact): ${verifiable.length}`);

  // Split: XBRL vs non-XBRL
  const xbrl = verifiable.filter(r =>
    r.method === 'sec_companyfacts_xbrl' || (r.xbrl_concept && r.xbrl_concept.length > 0)
  );
  const nonXbrl = verifiable.filter(r =>
    r.method !== 'sec_companyfacts_xbrl' && (!r.xbrl_concept || r.xbrl_concept.length === 0)
  );

  console.log(`\n=== XBRL-sourced: ${xbrl.length} (search term = computed value, NOT in doc text) ===`);
  console.log(`These are EXPECTED to fail text search — values come from XBRL tags, not document text.`);

  console.log(`\n=== Non-XBRL: ${nonXbrl.length} (search term SHOULD be in doc text) ===`);

  // Group non-XBRL by method
  const byMethod: Record<string, typeof nonXbrl> = {};
  for (const r of nonXbrl) {
    const m = r.method || 'unknown';
    if (!byMethod[m]) byMethod[m] = [];
    byMethod[m].push(r);
  }

  for (const [method, items] of Object.entries(byMethod).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`\n  Method: ${method} (${items.length})`);
    for (const r of items) {
      const search = (r.citation_search_term || '').slice(0, 50);
      console.log(`    ${r.entity_id}.${r.metric}: val=${r.value.toLocaleString()} search="${search}"`);
    }
  }

  // Now actually verify the non-XBRL ones against R2 docs
  console.log(`\n${'='.repeat(70)}`);
  console.log(`VERIFYING ${nonXbrl.length} NON-XBRL DATAPOINTS AGAINST R2 DOCUMENTS`);
  console.log(`${'='.repeat(70)}`);

  let docsFound = 0;
  let termsFound = 0;
  let termsMissing = 0;
  let docsMissing = 0;
  const realFailures: Array<{ ticker: string; metric: string; search: string; accession: string; value: number; method: string }> = [];

  for (const r of nonXbrl) {
    const doc = await fetchDoc(r.entity_id, r.artifact_accession);
    if (!doc) {
      docsMissing++;
      continue;
    }
    docsFound++;

    const searchLower = r.citation_search_term.toLowerCase();
    const found = doc.toLowerCase().includes(searchLower);

    if (found) {
      termsFound++;
    } else {
      termsMissing++;
      realFailures.push({
        ticker: r.entity_id,
        metric: r.metric,
        search: r.citation_search_term,
        accession: r.artifact_accession,
        value: r.value,
        method: r.method,
      });
    }

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 150));
  }

  console.log(`\n  Docs fetched:       ${docsFound}/${nonXbrl.length}`);
  console.log(`  Docs missing:       ${docsMissing}`);
  console.log(`  Terms found in doc: ${termsFound}/${docsFound} (${docsFound > 0 ? ((termsFound/docsFound)*100).toFixed(1) : 0}%)`);
  console.log(`  Terms NOT found:    ${termsMissing}`);

  if (realFailures.length > 0) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`REAL FAILURES: Citation search term not in source document`);
    console.log(`These are datapoints where the cited value cannot be found in the R2 doc.`);
    console.log(`${'='.repeat(70)}`);

    for (const f of realFailures) {
      console.log(`\n  ${f.ticker}.${f.metric}:`);
      console.log(`    Value:     ${f.value.toLocaleString()}`);
      console.log(`    Search:    "${f.search}"`);
      console.log(`    Accession: ${f.accession}`);
      console.log(`    Method:    ${f.method}`);
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  XBRL datapoints (expected text-search failures): ${xbrl.length}`);
  console.log(`  Non-XBRL datapoints verified:                    ${nonXbrl.length}`);
  console.log(`  Non-XBRL search terms found in docs:             ${termsFound}`);
  console.log(`  Non-XBRL search terms NOT found (real problems): ${realFailures.length}`);
  console.log(`  Documents not fetchable:                          ${docsMissing}`);

  if (realFailures.length > 0) {
    process.exit(1);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
