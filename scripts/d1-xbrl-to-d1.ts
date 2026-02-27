#!/usr/bin/env npx tsx

/**
 * XBRL -> D1 datapoints backfill (SEC companyfacts XBRL API)
 *
 * Why this exists:
 * - Phase B basic_shares QE anchor backfill requires underlying basic_shares datapoints in D1.
 * - The repo already has deterministic extraction via src/lib/sec/xbrl-extractor.ts.
 * - We want a GitHub Actions-friendly script (no wrangler dependency) that writes to D1 via Cloudflare API.
 *
 * Usage (local):
 *   CLOUDFLARE_ACCOUNT_ID=... CLOUDFLARE_D1_DATABASE_ID=... CLOUDFLARE_API_TOKEN=...
 *   npx tsx scripts/d1-xbrl-to-d1.ts --tickers=COIN,HOOD --dry-run=true
 */

import crypto from 'node:crypto';
import { D1Client } from '../src/lib/d1';
import { extractXBRLData } from '../src/lib/sec/xbrl-extractor';

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

type MetricRow = {
  metric: 'cash_usd' | 'debt_usd' | 'preferred_equity_usd' | 'basic_shares' | 'bitcoin_holdings_usd';
  value: number;
  unit: 'USD' | 'shares';
  as_of: string | null;
  reported_at: string | null;
  method: 'sec_companyfacts_xbrl';
  confidence: number;
  flags_json: string | null;
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
  const dryRun = (argVal('dry-run') || process.env.DRY_RUN || '').toString() === 'true';
  const force = (argVal('force') || process.env.FORCE || '').toString() === 'true';

  if (!tickersRaw) throw new Error('Missing --tickers= (comma-separated)');
  const tickers = tickersRaw
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);

  const d1 = D1Client.fromEnv();
  const nowIso = new Date().toISOString();
  const runId = crypto.randomUUID();

  const hasRuns = await tableExists(d1, 'runs');
  const hasArtifacts = await tableExists(d1, 'artifacts');

  if (!dryRun && hasRuns) {
    await d1.query(
      `INSERT OR IGNORE INTO runs (run_id, started_at, ended_at, trigger, code_sha, notes)
       VALUES (?, ?, NULL, ?, ?, ?);`,
      [runId, nowIso, 'd1_xbrl_to_d1', process.env.GITHUB_SHA || null, `d1-xbrl-to-d1 tickers=${tickers.join(',')}`]
    );
  }

  let processed = 0;
  let extracted = 0;
  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  for (const ticker of tickers) {
    processed++;

    const x = await extractXBRLData(ticker);
    if (!x.success) {
      failed++;
      console.log(JSON.stringify({ ticker, ok: false, error: x.error }, null, 2));
      continue;
    }

    const rows: MetricRow[] = [];

    if (typeof x.cashAndEquivalents === 'number') {
      rows.push({
        metric: 'cash_usd',
        value: x.cashAndEquivalents,
        unit: 'USD',
        as_of: x.cashDate || null,
        reported_at: x.filingDate || x.cashDate || null,
        method: 'sec_companyfacts_xbrl',
        confidence: 1.0,
        flags_json: null,
      });
    }

    if (typeof x.totalDebt === 'number') {
      rows.push({
        metric: 'debt_usd',
        value: x.totalDebt,
        unit: 'USD',
        as_of: x.debtDate || null,
        reported_at: x.filingDate || x.debtDate || null,
        method: 'sec_companyfacts_xbrl',
        confidence: 1.0,
        flags_json: null,
      });
    }

    if (typeof x.sharesOutstanding === 'number') {
      rows.push({
        metric: 'basic_shares',
        value: x.sharesOutstanding,
        unit: 'shares',
        as_of: x.sharesOutstandingDate || null,
        reported_at: x.filingDate || x.sharesOutstandingDate || null,
        method: 'sec_companyfacts_xbrl',
        confidence: 1.0,
        flags_json: null,
      });
    }

    if (typeof x.bitcoinHoldings === 'number') {
      rows.push({
        metric: 'bitcoin_holdings_usd',
        value: x.bitcoinHoldings,
        unit: 'USD',
        as_of: x.bitcoinHoldingsDate || null,
        reported_at: x.filingDate || x.bitcoinHoldingsDate || null,
        method: 'sec_companyfacts_xbrl',
        confidence: 1.0,
        flags_json: null,
      });
    }

    if (!rows.length) {
      extracted++;
      console.log(JSON.stringify({ ticker, ok: true, extracted: 0, note: 'no metrics found in XBRL extraction' }, null, 2));
      continue;
    }

    extracted++;

    // Best-effort artifact linkage.
    // If artifacts table exists, try to find one with ticker + accession in r2_key.
    // Otherwise, set artifact_id to null (D1 FK might allow null; if not, this will fail and we’ll revisit).
    let artifactId: string | null = null;
    if (hasArtifacts && x.accessionNumber) {
      const a = await d1.query<{ artifact_id: string }>(
        `SELECT artifact_id
         FROM artifacts
         WHERE ticker = ?
           AND r2_key LIKE '%' || ? || '%'
         LIMIT 1;`,
        [ticker, x.accessionNumber]
      );
      artifactId = a.results?.[0]?.artifact_id || null;
    }

    for (const r of rows) {
      if (!r.as_of) {
        // Without an as_of, this isn't useful for QE anchoring; still allow insert if forced.
        if (!force) {
          skipped++;
          continue;
        }
      }

      if (dryRun) {
        console.log(JSON.stringify({
          ticker,
          metric: r.metric,
          value: r.value,
          unit: r.unit,
          as_of: r.as_of,
          reported_at: r.reported_at,
          accession: x.accessionNumber || null,
          filingDate: x.filingDate || null,
        }, null, 2));
        continue;
      }

      await d1.query(
        `INSERT OR IGNORE INTO datapoints (
           datapoint_id, entity_id, metric, value, unit, scale,
           as_of, reported_at, artifact_id, run_id,
           method, confidence, flags_json, created_at
         ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          crypto.randomUUID(),
          ticker,
          r.metric,
          r.value,
          r.unit,
          r.as_of,
          r.reported_at,
          artifactId,
          runId,
          r.method,
          r.confidence,
          r.flags_json,
          new Date().toISOString(),
        ]
      );
      inserted++;
    }
  }

  console.log(
    JSON.stringify(
      {
        dryRun,
        tickers,
        processed,
        extracted,
        inserted,
        skipped,
        failed,
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
