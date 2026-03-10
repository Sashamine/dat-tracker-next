#!/usr/bin/env npx tsx
/**
 * D1 Verification Status Dashboard
 *
 * Reports the current state of datapoint verification in D1.
 * Shows overall rates, breakdown by source type, and lists remaining gaps.
 *
 * Usage:
 *   npx tsx scripts/d1-verification-status.ts
 *   npx tsx scripts/d1-verification-status.ts --detail   # show each unverified datapoint
 */
import { D1Client } from '../src/lib/d1';

const showDetail = process.argv.includes('--detail');

async function main() {
  const d1 = D1Client.fromEnv();

  // Overall totals
  const { results: [allTotals] } = await d1.query<{
    total: number;
    verified: number;
  }>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN citation_quote IS NOT NULL OR xbrl_concept IS NOT NULL THEN 1 ELSE 0 END) as verified
    FROM datapoints
  `);

  const { results: [currentTotals] } = await d1.query<{
    total: number;
    verified: number;
  }>(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN citation_quote IS NOT NULL OR xbrl_concept IS NOT NULL THEN 1 ELSE 0 END) as verified
    FROM latest_datapoints
  `);

  const allPct = ((allTotals.verified / allTotals.total) * 100).toFixed(1);
  const curPct = ((currentTotals.verified / currentTotals.total) * 100).toFixed(1);

  console.log('D1 VERIFICATION STATUS');
  console.log('='.repeat(50));
  console.log(`All datapoints:     ${allTotals.verified}/${allTotals.total} (${allPct}%)`);
  console.log(`Current datapoints: ${currentTotals.verified}/${currentTotals.total} (${curPct}%)`);

  // Breakdown by source type (current only)
  const { results: bySource } = await d1.query<{
    source_type: string;
    total: number;
    verified: number;
  }>(`
    SELECT
      a.source_type,
      COUNT(*) as total,
      SUM(CASE WHEN d.citation_quote IS NOT NULL OR d.xbrl_concept IS NOT NULL THEN 1 ELSE 0 END) as verified
    FROM latest_datapoints d
    JOIN artifacts a ON d.artifact_id = a.artifact_id
    GROUP BY a.source_type
    ORDER BY total DESC
  `);

  console.log('\nCurrent datapoints by source type:');
  console.log(`${'Source'.padEnd(28)} ${'Total'.padStart(6)} ${'Verified'.padStart(9)} ${'Rate'.padStart(6)}`);
  console.log('-'.repeat(52));
  for (const row of bySource) {
    const rate = row.total > 0 ? ((row.verified / row.total) * 100).toFixed(0) + '%' : '-';
    console.log(
      `${(row.source_type || 'unknown').padEnd(28)} ${String(row.total).padStart(6)} ${String(row.verified).padStart(9)} ${rate.padStart(6)}`,
    );
  }

  // Remaining unverified current, categorized
  const { results: remaining } = await d1.query<{
    category: string;
    cnt: number;
  }>(`
    SELECT
      CASE
        WHEN d.value = 0 THEN 'zero_value'
        WHEN a.source_type = 'regulatory-filing' THEN 'foreign_filing'
        WHEN a.source_type = 'press-release' THEN 'press_release'
        WHEN a.source_type IN ('company-website','company-reported','company-dashboard') THEN 'company_source'
        WHEN a.source_type IN ('manual_backfill','manual') THEN 'manual'
        WHEN a.source_type = 'hkex_pdf' THEN 'hkex_pdf'
        WHEN a.r2_key LIKE 'synthetic/%' THEN 'synthetic_r2'
        WHEN a.source_type LIKE '%sec%' THEN 'sec_no_match'
        ELSE 'other'
      END as category,
      COUNT(*) as cnt
    FROM latest_datapoints d
    JOIN artifacts a ON d.artifact_id = a.artifact_id
    WHERE d.citation_quote IS NULL AND d.xbrl_concept IS NULL
    GROUP BY category
    ORDER BY cnt DESC
  `);

  console.log('\nRemaining unverified current datapoints:');
  let unverifiedTotal = 0;
  for (const row of remaining) {
    console.log(`  ${row.category.padEnd(20)} ${row.cnt}`);
    unverifiedTotal += row.cnt;
  }
  console.log(`  ${'TOTAL'.padEnd(20)} ${unverifiedTotal}`);

  // Detailed list
  if (showDetail) {
    const { results: details } = await d1.query<{
      entity_id: string;
      metric: string;
      value: number;
      as_of: string | null;
      source_type: string;
      source_url: string | null;
      r2_key: string | null;
    }>(`
      SELECT d.entity_id, d.metric, d.value, d.as_of,
             a.source_type, a.source_url, a.r2_key
      FROM latest_datapoints d
      JOIN artifacts a ON d.artifact_id = a.artifact_id
      WHERE d.citation_quote IS NULL AND d.xbrl_concept IS NULL
      ORDER BY a.source_type, d.entity_id, d.metric
    `);

    console.log('\nDetailed unverified current datapoints:');
    console.log(
      `${'Entity'.padEnd(10)} ${'Metric'.padEnd(26)} ${'Value'.padStart(16)}  ${'Source'.padEnd(24)} URL`,
    );
    console.log('-'.repeat(120));
    for (const r of details) {
      console.log(
        `${r.entity_id.padEnd(10)} ${r.metric.padEnd(26)} ${String(r.value).padStart(16)}  ${(r.source_type || '').padEnd(24)} ${(r.source_url || '').slice(0, 60)}`,
      );
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
