#!/usr/bin/env npx tsx

/**
 * Phase B / D1 backfill: basic_shares at quarter-ends.
 *
 * Writes into D1 table: datapoints (and updates latest_datapoints if it exists).
 *
 * Conventions:
 * - Insert datapoints in HISTORICAL basis (as reported in filings), with as_of = quarter_end.
 * - Consumers normalize to CURRENT basis using corporate_actions (effective_date inclusive; see notes).
 * - Idempotent via deterministic datapoint_id and INSERT OR IGNORE.
 *
 * Usage:
 *   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_D1_DATABASE_ID=... CLOUDFLARE_API_TOKEN=...
 *   npx tsx scripts/d1-backfill-basic-shares-qe.ts --tickers=MSTR,MARA --from=2019-01-01 --to=2026-12-31
 *
 * Optional:
 *   --dry-run=true
 *   --limit=200
 */

import crypto from 'node:crypto';
import { D1Client } from '../src/lib/d1';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function parseDate(s: string, name: string): string {
  const v = (s || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new Error(`Invalid ${name} (YYYY-MM-DD): ${s}`);
  return v;
}

function quarterEndsBetween(from: string, to: string): string[] {
  const ends = ['03-31', '06-30', '09-30', '12-31'];
  const out: string[] = [];
  const fromY = Number(from.slice(0, 4));
  const toY = Number(to.slice(0, 4));
  for (let y = fromY; y <= toY; y++) {
    for (const mmdd of ends) {
      const d = `${y}-${mmdd}`;
      if (d >= from && d <= to) out.push(d);
    }
  }
  return out;
}

function dpId(entity: string, metric: string, asOf: string, unit: string, scale: number): string {
  // Deterministic id for idempotency.
  // If you ever need to re-ingest with different scale/unit, that should be a NEW row.
  const key = `${entity}|${metric}|${asOf}|${unit}|${scale}`;
  return crypto.createHash('sha256').update(key).digest('hex').slice(0, 32);
}

type DpRow = {
  datapoint_id: string;
  entity_id: string;
  metric: string;
  value: number;
  unit: string;
  scale: number;
  as_of: string;
  reported_at: string | null;
  artifact_id: string;
  run_id: string;
  method: string;
  confidence: number;
  flags_json: string | null;
  created_at: string;
};

async function tableExists(d1: D1Client, table: string): Promise<boolean> {
  const out = await d1.query<any>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1;`,
    [table]
  );
  return (out.results?.length || 0) > 0;
}

async function main() {
  const tickersRaw = (argVal('tickers') || '').trim();
  const from = parseDate(argVal('from') || '2015-01-01', '--from');
  const to = parseDate(argVal('to') || new Date().toISOString().slice(0, 10), '--to');
  const limit = Number(argVal('limit') || '100000');
  const dryRun = (argVal('dry-run') || process.env.DRY_RUN || '').toString() === 'true';

  if (!tickersRaw) throw new Error('Missing --tickers= (comma-separated)');
  const tickers = tickersRaw
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  const d1 = D1Client.fromEnv();
  const nowIso = new Date().toISOString();
  const runId = `backfill_basic_shares_qe_${nowIso}`;

  const hasLatest = await tableExists(d1, 'latest_datapoints');

  // NOTE: We assume there is a `datapoints` table with columns matching LatestDatapointRow.
  // If not present, run the schema migration in docs/phase-b-d1-basic-shares.md.

  const qEnds = quarterEndsBetween(from, to);

  let inserted = 0;
  let skipped = 0;
  let missing = 0;

  for (const ticker of tickers) {
    // Discover a source artifact per quarter-end.
    // Assumption: artifacts table includes entity_id and period_end (YYYY-MM-DD) extracted from SEC metadata.
    // If your artifact schema differs, adjust query.

    for (const asOf of qEnds) {
      if (inserted + skipped >= limit) break;

      // D1 artifacts schema (current):
      // artifact_id, source_type, source_url, content_hash, fetched_at, r2_bucket, r2_key, cik, ticker, accession
      // It does NOT include period_end/form_type/filed_at.
      // For Phase B we approximate quarter-end artifacts using datapoints.as_of at the quarter-end.
      const art = await d1.query<any>(
        `SELECT artifact_id
         FROM datapoints
         WHERE entity_id = ?
           AND metric = 'basic_shares'
           AND as_of = ?
         ORDER BY datetime(created_at) DESC
         LIMIT 1;`,
        [ticker, asOf]
      );

      const artifactId = art.results?.[0]?.artifact_id as string | undefined;
      const filedAt = null;
      if (!artifactId) {
        missing++;
        continue;
      }

      // Pull extracted basic_shares datapoint for that artifact.
      // We expect raw extracted datapoints are stored per artifact in `datapoints` (or `artifact_datapoints`).
      // Here we assume `datapoints` contains all extracted datapoints and includes artifact_id.
      const dp = await d1.query<any>(
        `SELECT value, unit, scale, reported_at
         FROM datapoints
         WHERE entity_id = ?
           AND metric = 'basic_shares'
           AND as_of = ?
         ORDER BY datetime(created_at) DESC
         LIMIT 1;`,
        [ticker, asOf]
      );

      const value = Number(dp.results?.[0]?.value);
      if (!Number.isFinite(value) || value <= 0) {
        missing++;
        continue;
      }

      const unit = (dp.results?.[0]?.unit as string) || 'shares';
      const scale = Number(dp.results?.[0]?.scale ?? 0);
      const reportedAt = (dp.results?.[0]?.reported_at as string) || filedAt;

      const row: DpRow = {
        datapoint_id: dpId(ticker, 'basic_shares', asOf, unit, scale),
        entity_id: ticker,
        metric: 'basic_shares',
        value,
        unit,
        scale,
        as_of: asOf,
        reported_at: reportedAt,
        artifact_id: artifactId,
        run_id: runId,
        method: 'backfill_qe',
        confidence: 0.7,
        flags_json: JSON.stringify({
          backfill: true,
          quarter_end: asOf,
          basis: 'historical',
          note: 'Normalize to current basis via corporate_actions when consuming.',
        }),
        created_at: nowIso,
      };

      // Validation guardrail: very rough sanity check
      if (row.value > 50_000_000_000) {
        console.warn(`[warn] suspicious shares value for ${ticker} ${asOf}: ${row.value}`);
      }

      if (dryRun) {
        skipped++;
        continue;
      }

      // Insert OR IGNORE for idempotency.
      await d1.query(
        `INSERT OR IGNORE INTO datapoints (
           datapoint_id, entity_id, metric, value, unit, scale,
           as_of, reported_at, artifact_id, run_id,
           method, confidence, flags_json, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          row.datapoint_id,
          row.entity_id,
          row.metric,
          row.value,
          row.unit,
          row.scale,
          row.as_of,
          row.reported_at,
          row.artifact_id,
          row.run_id,
          row.method,
          row.confidence,
          row.flags_json,
          row.created_at,
        ]
      );

      // Maintain latest_datapoints if present.
      if (hasLatest) {
        // latest basis is 'current' at query time (normalization layer), so store historical here.
        // Upsert (entity_id, metric) to newest as_of.
        await d1.query(
          `INSERT INTO latest_datapoints (
             datapoint_id, entity_id, metric, value, unit, scale,
             as_of, reported_at, artifact_id, run_id,
             method, confidence, flags_json, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(entity_id, metric) DO UPDATE SET
             datapoint_id=excluded.datapoint_id,
             value=excluded.value,
             unit=excluded.unit,
             scale=excluded.scale,
             as_of=excluded.as_of,
             reported_at=excluded.reported_at,
             artifact_id=excluded.artifact_id,
             run_id=excluded.run_id,
             method=excluded.method,
             confidence=excluded.confidence,
             flags_json=excluded.flags_json,
             created_at=excluded.created_at
           WHERE excluded.as_of >= latest_datapoints.as_of;`,
          [
            row.datapoint_id,
            row.entity_id,
            row.metric,
            row.value,
            row.unit,
            row.scale,
            row.as_of,
            row.reported_at,
            row.artifact_id,
            row.run_id,
            row.method,
            row.confidence,
            row.flags_json,
            row.created_at,
          ]
        );
      }

      inserted++;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        tickers,
        from,
        to,
        quarters: qEnds.length,
        inserted,
        skipped,
        missing,
        hasLatest,
        runId,
      },
      null,
      2
    )
  );
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
