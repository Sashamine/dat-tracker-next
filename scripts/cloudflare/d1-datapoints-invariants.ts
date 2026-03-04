#!/usr/bin/env npx tsx

import { D1Client } from '../../src/lib/d1';

type CountRow = { cnt?: number | string };
type SampleRow = Record<string, unknown>;

function toNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function count(d1: D1Client, sql: string, params: unknown[] = []): Promise<number> {
  const r = await d1.query<CountRow>(sql, params);
  return toNum(r.results[0]?.cnt);
}

async function sample(d1: D1Client, sql: string, params: unknown[] = []): Promise<SampleRow[]> {
  const r = await d1.query<SampleRow>(sql, params);
  return r.results || [];
}

async function main() {
  const d1 = D1Client.fromEnv();

  const duplicateProposalKeyGroups = await count(
    d1,
    `SELECT COUNT(*) AS cnt
     FROM (
       SELECT proposal_key
       FROM datapoints
       WHERE proposal_key IS NOT NULL
       GROUP BY proposal_key
       HAVING COUNT(*) > 1
     ) t;`
  );

  const duplicateLegacyGroups = await count(
    d1,
    `SELECT COUNT(*) AS cnt
     FROM (
       SELECT
         entity_id, metric,
         COALESCE(as_of, '') AS as_of_key,
         COALESCE(reported_at, '') AS reported_at_key,
         artifact_id, run_id
       FROM datapoints
       WHERE proposal_key IS NULL
       GROUP BY
         entity_id, metric, as_of_key, reported_at_key, artifact_id, run_id
       HAVING COUNT(*) > 1
     ) t;`
  );

  const negativeLatestValues = await count(
    d1,
    `SELECT COUNT(*) AS cnt
     FROM latest_datapoints
     WHERE value < 0;`
  );

  const impossibleSharesValues = await count(
    d1,
    `SELECT COUNT(*) AS cnt
     FROM latest_datapoints
     WHERE LOWER(metric) LIKE '%shares%'
       AND value > 1000000000000;`
  );

  const impossibleHoldingsUsdValues = await count(
    d1,
    `SELECT COUNT(*) AS cnt
     FROM latest_datapoints
     WHERE LOWER(metric) LIKE '%holdings_usd%'
       AND value > 10000000000000;`
  );

  const summary = {
    duplicateProposalKeyGroups,
    duplicateLegacyGroups,
    negativeLatestValues,
    impossibleSharesValues,
    impossibleHoldingsUsdValues,
  };

  console.log('D1_DATAPOINTS_INVARIANTS', JSON.stringify(summary));

  const failing =
    duplicateProposalKeyGroups > 0 ||
    duplicateLegacyGroups > 0 ||
    negativeLatestValues > 0 ||
    impossibleSharesValues > 0 ||
    impossibleHoldingsUsdValues > 0;

  if (!failing) {
    console.log('INVARIANT OK: datapoints duplicate + sanity bounds checks passed');
    return;
  }

  if (duplicateProposalKeyGroups > 0) {
    const rows = await sample(
      d1,
      `SELECT proposal_key, COUNT(*) AS cnt
       FROM datapoints
       WHERE proposal_key IS NOT NULL
       GROUP BY proposal_key
       HAVING COUNT(*) > 1
       ORDER BY cnt DESC, proposal_key ASC
       LIMIT 5;`
    );
    console.error('duplicate proposal_key sample', JSON.stringify(rows));
  }

  if (duplicateLegacyGroups > 0) {
    const rows = await sample(
      d1,
      `SELECT
         entity_id, metric, as_of, reported_at, artifact_id, run_id, COUNT(*) AS cnt
       FROM datapoints
       WHERE proposal_key IS NULL
       GROUP BY entity_id, metric, as_of, reported_at, artifact_id, run_id
       HAVING COUNT(*) > 1
       ORDER BY cnt DESC, entity_id ASC, metric ASC
       LIMIT 5;`
    );
    console.error('legacy duplicate sample', JSON.stringify(rows));
  }

  if (negativeLatestValues > 0) {
    const rows = await sample(
      d1,
      `SELECT entity_id, metric, value, as_of, reported_at
       FROM latest_datapoints
       WHERE value < 0
       ORDER BY value ASC
       LIMIT 5;`
    );
    console.error('negative value sample', JSON.stringify(rows));
  }

  if (impossibleSharesValues > 0) {
    const rows = await sample(
      d1,
      `SELECT entity_id, metric, value, as_of, reported_at
       FROM latest_datapoints
       WHERE LOWER(metric) LIKE '%shares%'
         AND value > 1000000000000
       ORDER BY value DESC
       LIMIT 5;`
    );
    console.error('impossible shares sample', JSON.stringify(rows));
  }

  if (impossibleHoldingsUsdValues > 0) {
    const rows = await sample(
      d1,
      `SELECT entity_id, metric, value, as_of, reported_at
       FROM latest_datapoints
       WHERE LOWER(metric) LIKE '%holdings_usd%'
         AND value > 10000000000000
       ORDER BY value DESC
       LIMIT 5;`
    );
    console.error('impossible holdings_usd sample', JSON.stringify(rows));
  }

  console.error('INVARIANT FAILED: datapoints duplicate + sanity bounds checks');
  process.exit(2);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

