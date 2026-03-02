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

type ExistingProposalRow = {
  value: number;
  unit: string;
  scale: number;
  as_of: string | null;
  reported_at: string | null;
  artifact_id: string;
  run_id: string;
  method: string | null;
  confidence: number | null;
  flags_json: string | null;
  confidence_details_json: string | null;
  status: string;
};

async function tableExists(d1: D1Client, table: string): Promise<boolean> {
  const out = await d1.query<any>(
    `SELECT name FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1;`,
    [table]
  );
  return (out.results?.length || 0) > 0;
}

function makeProposalKey(parts: {
  entityId: string;
  metric: string;
  proposalSource: string;
  asOf: string | null;
  reportedAt: string | null;
}): string {
  const raw = [
    'v1',
    parts.entityId,
    parts.metric,
    parts.proposalSource,
    parts.asOf || '',
    parts.reportedAt || '',
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function sameMutableFields(existing: ExistingProposalRow, incoming: {
  value: number;
  unit: string;
  scale: number;
  as_of: string | null;
  reported_at: string | null;
  artifact_id: string;
  run_id: string;
  method: string | null;
  confidence: number;
  flags_json: string | null;
  confidence_details_json: string | null;
  status: string;
}): boolean {
  return (
    Number(existing.value) === Number(incoming.value) &&
    existing.unit === incoming.unit &&
    Number(existing.scale) === Number(incoming.scale) &&
    (existing.as_of || null) === incoming.as_of &&
    (existing.reported_at || null) === incoming.reported_at &&
    existing.artifact_id === incoming.artifact_id &&
    existing.run_id === incoming.run_id &&
    (existing.method || null) === incoming.method &&
    Number(existing.confidence ?? 0) === Number(incoming.confidence ?? 0) &&
    (existing.flags_json || null) === (incoming.flags_json || null) &&
    (existing.confidence_details_json || null) === (incoming.confidence_details_json || null) &&
    existing.status === incoming.status
  );
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
  let updated = 0;
  let seededProposalKey = 0;
  let noop = 0;
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
        const proposalKey = makeProposalKey({
          entityId: ticker,
          metric: r.metric,
          proposalSource: x.accessionNumber || x.secUrl || artifactId,
          asOf: r.as_of,
          reportedAt: r.reported_at,
        });
        console.log(JSON.stringify({
          ticker,
          metric: r.metric,
          value: r.value,
          unit: r.unit,
          as_of: r.as_of,
          reported_at: r.reported_at,
          proposal_key: proposalKey,
          accession: x.accessionNumber || null,
          filingDate: x.filingDate || null,
        }, null, 2));
        continue;
      }

      try {
        // NOTE: datapoints has FKs to artifacts(artifact_id) and runs(run_id) only.
        // entity_id is a free-form string (ticker).
        const proposalKey = makeProposalKey({
          entityId: ticker,
          metric: r.metric,
          proposalSource: x.accessionNumber || x.secUrl || artifactId,
          asOf: r.as_of,
          reportedAt: r.reported_at,
        });

        const existingByProposal = await d1.query<ExistingProposalRow>(
          `SELECT
             value, unit, scale, as_of, reported_at, artifact_id, run_id,
             method, confidence, flags_json, confidence_details_json, status
           FROM datapoints
           WHERE proposal_key = ?
           LIMIT 1;`,
          [proposalKey]
        );

        // Guard against collisions with historical rows that predate proposal_key.
        // Those rows remain valid with proposal_key=NULL; treat as noop instead of violating ux_datapoints_dedupe.
        const dedupeCollision = existingByProposal.results.length
          ? { results: [] as Array<{ datapoint_id: string; proposal_key: string | null }> }
          : await d1.query<{ datapoint_id: string; proposal_key: string | null }>(
              `SELECT datapoint_id
                     , proposal_key
               FROM datapoints
               WHERE entity_id = ?
                 AND metric = ?
                 AND COALESCE(as_of, '') = COALESCE(?, '')
                 AND COALESCE(reported_at, '') = COALESCE(?, '')
                 AND COALESCE(artifact_id, '') = COALESCE(?, '')
                 AND value = ?
                 AND unit = ?
               LIMIT 1;`,
              [ticker, r.metric, r.as_of, r.reported_at, artifactId, r.value, r.unit]
            );

        if (dedupeCollision.results.length) {
          const legacy = dedupeCollision.results[0];
          if (legacy.proposal_key) {
            noop++;
            continue;
          }

          const seed = await d1.query(
            `UPDATE datapoints
             SET proposal_key = ?,
                 status = 'candidate'
             WHERE datapoint_id = ?
               AND proposal_key IS NULL
               AND NOT EXISTS (SELECT 1 FROM datapoints WHERE proposal_key = ?);`,
            [proposalKey, legacy.datapoint_id, proposalKey]
          );

          const seeded = Number(seed.meta?.changes || 0) > 0;
          if (seeded) seededProposalKey++;
          else noop++;
          continue;
        }

        const incoming = {
          value: r.value,
          unit: r.unit,
          scale: 0,
          as_of: r.as_of,
          reported_at: r.reported_at,
          artifact_id: artifactId,
          run_id: runId,
          method: r.method,
          confidence: r.confidence,
          flags_json: r.flags_json,
          confidence_details_json: null as string | null,
          status: 'candidate',
        };

        await d1.query(
          `INSERT INTO datapoints (
             datapoint_id, entity_id, metric, value, unit, scale,
             as_of, reported_at, artifact_id, run_id,
             method, confidence, flags_json, confidence_details_json, status,
             proposal_key, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(proposal_key) DO UPDATE SET
             value = excluded.value,
             unit = excluded.unit,
             scale = excluded.scale,
             as_of = excluded.as_of,
             reported_at = excluded.reported_at,
             artifact_id = excluded.artifact_id,
             run_id = excluded.run_id,
             method = excluded.method,
             confidence = excluded.confidence,
             flags_json = excluded.flags_json,
             confidence_details_json = excluded.confidence_details_json,
             status = excluded.status;`,
          [
            crypto.randomUUID(),
            ticker,
            r.metric,
            incoming.value,
            incoming.unit,
            incoming.scale,
            incoming.as_of,
            incoming.reported_at,
            incoming.artifact_id,
            incoming.run_id,
            incoming.method,
            incoming.confidence,
            incoming.flags_json,
            incoming.confidence_details_json,
            incoming.status,
            proposalKey,
            new Date().toISOString(),
          ]
        );

        if (!existingByProposal.results.length) {
          inserted++;
        } else if (sameMutableFields(existingByProposal.results[0], incoming)) {
          noop++;
        } else {
          updated++;
        }
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
        updated,
        seededProposalKey,
        noop,
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
