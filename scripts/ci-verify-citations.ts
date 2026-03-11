#!/usr/bin/env npx tsx
/**
 * ci-verify-citations.ts
 *
 * Lightweight CI gate: checks that every datapoint in D1 has provenance
 * (xbrl_concept or citation_quote). Fails if coverage drops below threshold.
 *
 * Unlike verify-d1-citations.ts (which re-extracts from SEC and checks R2 docs),
 * this only queries D1 — fast enough for PR checks (~5s).
 *
 * Usage:
 *   npx tsx scripts/ci-verify-citations.ts                 # default 100% threshold
 *   npx tsx scripts/ci-verify-citations.ts --threshold=99   # custom threshold
 *   npx tsx scripts/ci-verify-citations.ts --current-only   # only check latest datapoints
 */

import { D1Client } from '../src/lib/d1';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

const threshold = Number(argVal('threshold') ?? '100');
const currentOnly = process.argv.includes('--current-only');

async function main() {
  const d1 = D1Client.fromEnv();

  const table = currentOnly ? 'latest_datapoints' : 'datapoints';

  // Count total and cited datapoints
  const { results: counts } = await d1.query<{
    total: number;
    cited: number;
    xbrl_only: number;
    quote_only: number;
    both: number;
    uncited: number;
  }>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN (xbrl_concept IS NOT NULL AND xbrl_concept != '')
                 OR (citation_quote IS NOT NULL AND citation_quote != '')
               THEN 1 ELSE 0 END) as cited,
      SUM(CASE WHEN (xbrl_concept IS NOT NULL AND xbrl_concept != '')
                AND (citation_quote IS NULL OR citation_quote = '')
               THEN 1 ELSE 0 END) as xbrl_only,
      SUM(CASE WHEN (xbrl_concept IS NULL OR xbrl_concept = '')
                AND (citation_quote IS NOT NULL AND citation_quote != '')
               THEN 1 ELSE 0 END) as quote_only,
      SUM(CASE WHEN (xbrl_concept IS NOT NULL AND xbrl_concept != '')
                AND (citation_quote IS NOT NULL AND citation_quote != '')
               THEN 1 ELSE 0 END) as both,
      SUM(CASE WHEN (xbrl_concept IS NULL OR xbrl_concept = '')
                AND (citation_quote IS NULL OR citation_quote = '')
               THEN 1 ELSE 0 END) as uncited
    FROM ${table}
  `);

  const { total, cited, xbrl_only, quote_only, both, uncited } = counts[0];
  const coverage = total > 0 ? (cited / total) * 100 : 0;

  console.log(`Citation Coverage (${currentOnly ? 'current' : 'all-time'})`);
  console.log(`${'='.repeat(50)}`);
  console.log(`  Total datapoints:    ${total.toLocaleString()}`);
  console.log(`  Cited:               ${cited.toLocaleString()} (${coverage.toFixed(1)}%)`);
  console.log(`    XBRL only:         ${xbrl_only.toLocaleString()}`);
  console.log(`    Quote only:        ${quote_only.toLocaleString()}`);
  console.log(`    Both:              ${both.toLocaleString()}`);
  console.log(`  Uncited:             ${uncited.toLocaleString()}`);
  console.log(`  Threshold:           ${threshold}%`);

  // If there are uncited datapoints, list them
  if (uncited > 0) {
    const { results: gaps } = await d1.query<{
      entity_id: string;
      metric: string;
      as_of: string | null;
      method: string | null;
    }>(`
      SELECT entity_id, metric, as_of, method
      FROM ${table}
      WHERE (xbrl_concept IS NULL OR xbrl_concept = '')
        AND (citation_quote IS NULL OR citation_quote = '')
      ORDER BY entity_id, metric, as_of
      LIMIT 50
    `);

    console.log(`\nUncited datapoints (first ${Math.min(gaps.length, 50)}):`);
    for (const g of gaps) {
      console.log(`  ${g.entity_id} / ${g.metric} (${g.as_of || 'no date'}) [${g.method || 'no method'}]`);
    }
    if (uncited > 50) {
      console.log(`  ... and ${uncited - 50} more`);
    }
  }

  // Gate
  if (coverage < threshold) {
    console.log(`\nFAIL: Coverage ${coverage.toFixed(1)}% is below threshold ${threshold}%`);
    process.exit(1);
  }

  console.log(`\nPASS: Coverage ${coverage.toFixed(1)}% meets threshold ${threshold}%`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
