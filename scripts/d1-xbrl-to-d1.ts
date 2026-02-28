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

  const ensureArtifacts = async (p: {
    ticker: string;
    accession: string | null;
    sourceUrl: string | null;
  }): Promise<string> => {
    if (!hasArtifacts) return 'unknown';

    // 1) Try find an existing artifact by ticker+accession embedded in r2_key or explicit accession column.
    if (p.accession) {
      const found = await d1.query<{ artifact_id: string }>(
        `SELECT artifact_id
         FROM artifacts
         WHERE ticker = ?
           AND (
             accession = ? OR r2_key LIKE '%' || ? || '%'
           )
         LIMIT 1;`,
        [p.ticker, p.accession, p.accession]
      );
      const id = found.results?.[0]?.artifact_id;
      if (id) return id;
    }

    // 2) Create a lightweight stub artifact row so datapoints can satisfy FK constraints.
    //    This is provenance-minimal (still ties datapoints to an artifact_id + run_id).
    const artifactId = crypto.randomUUID();
    const r2Bucket = 'dat-tracker-filings';
    const r2Key = p.accession ? `sec/companyfacts/${p.ticker}/${p.accession}.json` : `sec/companyfacts/${p.ticker}/unknown.json`;

    const contentHash = crypto
      .createHash('md5')
      .update(`sec_companyfacts_xbrl|${p.ticker}|${p.accession || 'unknown'}|${r2Key}`)
      .digest('hex');

    await d1.query(
      `INSERT OR IGNORE INTO artifacts (
         artifact_id, source_type, source_url, content_hash, fetched_at,
         r2_bucket, r2_key, cik, ticker, accession
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        artifactId,
        'sec_companyfacts_xbrl',
        p.sourceUrl,
        contentHash,
        nowIso,
        r2Bucket,
        r2Key,
        null,
        p.ticker,
        p.accession,
      ]
    );

    return artifactId;
  };

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

    // IMPORTANT: never let one bad ticker abort the whole batch.
    // Many tickers will be missing CIK mappings or have missing/partial companyfacts coverage.
    // We treat those as per-ticker failures and continue.
    let x:
      | {
          success: true;
          accessionNumber?: string | null;
          secUrl?: string | null;
          filingDate?: string | null;
          cashAndEquivalents?: number | null;
          cashDate?: string | null;
          totalDebt?: number | null;
          debtDate?: string | null;
          sharesOutstanding?: number | null;
          sharesOutstandingDate?: string | null;
          bitcoinHoldings?: number | null;
          bitcoinHoldingsDate?: string | null;
        }
      | { success: false; error: string };

    try {
      x = await extractXBRLData(ticker);
    } catch (e) {
      failed++;
      console.log(
        JSON.stringify({ ticker, ok: false, error: e instanceof Error ? e.message : String(e) }, null, 2)
      );
      continue;
    }

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

    let artifactId: string;
    try {
      artifactId = await ensureArtifacts({
        ticker,
        accession: x.accessionNumber || null,
        sourceUrl: x.secUrl || null,
      });
    } catch (e) {
      failed++;
      console.log(
        JSON.stringify(
          { ticker, ok: false, error: `ensureArtifacts failed: ${e instanceof Error ? e.message : String(e)}` },
          null,
          2
        )
      );
      continue;
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

      try {
        // NOTE: datapoints has FKs to artifacts(artifact_id) and runs(run_id) only.
        // entity_id is a free-form string (ticker).
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
      } catch (e) {
        failed++;
        console.log(
          JSON.stringify(
            {
              ticker,
              ok: false,
              metric: r.metric,
              as_of: r.as_of,
              error: `datapoints insert failed: ${e instanceof Error ? e.message : String(e)}`,
            },
            null,
            2
          )
        );
      }
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
