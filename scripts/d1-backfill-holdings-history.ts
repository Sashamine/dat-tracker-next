#!/usr/bin/env npx tsx

/**
 * Phase 1.3 — D1 history backfill from holdings-history.ts
 *
 * Reads every raw snapshot from HOLDINGS_HISTORY (+ MSTR via getHoldingsHistory),
 * extracts up to 5 metrics per snapshot, and upserts into D1 `datapoints` with
 * idempotent `proposal_key`.
 *
 * Metrics extracted per snapshot:
 *   holdings_native  – snapshot.holdings     (unit = asset, e.g. BTC/ETH/SOL)
 *   basic_shares     – snapshot.sharesOutstanding  (unit = shares)
 *   cash_usd         – snapshot.cash               (unit = USD, optional)
 *   debt_usd         – snapshot.totalDebt          (unit = USD, optional)
 *   preferred_equity_usd – snapshot.preferredEquity (unit = USD, optional)
 *
 * Usage:
 *   npx tsx scripts/d1-backfill-holdings-history.ts                           # dry run, all tickers
 *   npx tsx scripts/d1-backfill-holdings-history.ts --dry-run=false           # wet run, all tickers
 *   npx tsx scripts/d1-backfill-holdings-history.ts --dry-run=false --tickers=MARA,CLSK
 *   npx tsx scripts/d1-backfill-holdings-history.ts --dry-run=false --metrics=cash_usd,debt_usd
 */

import crypto from 'node:crypto';
import { D1Client } from '../src/lib/d1';
import {
  HOLDINGS_HISTORY,
  getHoldingsHistory,
  type HoldingsSnapshot,
  type CompanyHoldingsHistory,
} from '../src/lib/data/holdings-history';

// ---------------------------------------------------------------------------
// CLI helpers
// ---------------------------------------------------------------------------

function argVal(name: string): string | null {
  const prefix = `--${name}=`;
  const hit = process.argv.find(a => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

function mapConfidence(raw: 'high' | 'medium' | 'low' | undefined): number {
  if (raw === 'high') return 1.0;
  if (raw === 'medium') return 0.9;
  if (raw === 'low') return 0.75;
  return 0.85;
}

function nowIso() {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Proposal key — must match xbrl-to-d1 / sec-filing-holdings-native pattern
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Asset unit resolution
// ---------------------------------------------------------------------------

const ASSET_UNIT_MAP: Record<string, string> = {
  BTC: 'BTC', BITCOIN: 'BTC',
  ETH: 'ETH', ETHER: 'ETH', ETHEREUM: 'ETH',
  SOL: 'SOL', SOLANA: 'SOL',
  TAO: 'TAO',
  LTC: 'LTC', LITECOIN: 'LTC',
  ZEC: 'ZEC', ZCASH: 'ZEC',
  LINK: 'LINK', CHAINLINK: 'LINK',
  SUI: 'SUI',
  AVAX: 'AVAX', AVALANCHE: 'AVAX',
  DOGE: 'DOGE', DOGECOIN: 'DOGE',
  HYPE: 'HYPE',
  TRX: 'TRX', TRON: 'TRX',
  XRP: 'XRP',
  BNB: 'BNB',
  HBAR: 'HBAR',
  MULTI: 'MULTI',
};

function resolveAssetUnit(asset: string): string | null {
  const key = (asset || '').trim().toUpperCase();
  return ASSET_UNIT_MAP[key] || null;
}

// Some MULTI-asset histories still track `holdings` as BTC-native for chart
// continuity; allow explicit ticker-level unit overrides for holdings_native.
const HOLDINGS_UNIT_OVERRIDES: Record<string, string> = {
  '3825.T': 'BTC',
};

// ---------------------------------------------------------------------------
// Artifact resolution — cache per sourceUrl/accession
// ---------------------------------------------------------------------------

type ArtifactCacheKey = string; // accession or sourceUrl
const artifactCache = new Map<ArtifactCacheKey, string>();

async function getSqliteObjectType(
  d1: D1Client,
  name: string,
): Promise<'table' | 'view' | null> {
  const r = await d1.query<{ type: string }>(
    `SELECT type FROM sqlite_master WHERE name = ? LIMIT 1;`,
    [name],
  );
  const t = r.results[0]?.type;
  if (t === 'table' || t === 'view') return t;
  return null;
}

async function resolveOrCreateArtifact(
  d1: D1Client,
  ticker: string,
  snapshot: HoldingsSnapshot,
  dryRun: boolean,
): Promise<string> {
  const accession = snapshot.sourceUrl?.match(/\b(\d{10}-\d{2}-\d{6})\b/)?.[1] || null;
  // Ensure source_url is always non-null for synthetic artifacts; some D1 schemas
  // enforce NOT NULL and will silently ignore INSERT OR IGNORE with null values.
  const sourceUrl =
    snapshot.sourceUrl ||
    `holdings_history_ts://${ticker}/${snapshot.date}`;

  // Determine a cache key — prefer accession, then sourceUrl
  const cacheKey = accession || sourceUrl || `${ticker}|${snapshot.date}`;
  const cached = artifactCache.get(cacheKey);
  if (cached) return cached;

  // Look up existing artifact by accession first
  if (accession) {
    const byAccession = await d1.query<{ artifact_id: string }>(
      `SELECT artifact_id FROM artifacts
       WHERE accession = ?
       ORDER BY fetched_at DESC LIMIT 1;`,
      [accession],
    );
    if (byAccession.results[0]?.artifact_id) {
      artifactCache.set(cacheKey, byAccession.results[0].artifact_id);
      return byAccession.results[0].artifact_id;
    }
  }

  // Then by sourceUrl
  if (sourceUrl) {
    const byUrl = await d1.query<{ artifact_id: string }>(
      `SELECT artifact_id FROM artifacts
       WHERE source_url = ?
       ORDER BY fetched_at DESC LIMIT 1;`,
      [sourceUrl],
    );
    if (byUrl.results[0]?.artifact_id) {
      artifactCache.set(cacheKey, byUrl.results[0].artifact_id);
      return byUrl.results[0].artifact_id;
    }
  }

  // Create synthetic artifact — content_hash is NOT NULL in schema,
  // so we use a hash of the source info as a synthetic content_hash.
  const artifactId = crypto.randomUUID();
  if (!dryRun) {
    const sourceType = accession ? 'sec_filing' : (snapshot.sourceType || 'holdings_history_ts');
    const syntheticHash = crypto.createHash('sha256')
      .update(`synthetic|${ticker}|${snapshot.date}|${sourceUrl || ''}`)
      .digest('hex');
    await d1.query(
      `INSERT OR IGNORE INTO artifacts
         (artifact_id, source_type, source_url, content_hash, accession, ticker, fetched_at, r2_bucket, r2_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'synthetic', ?);`,
      [artifactId, sourceType, sourceUrl, syntheticHash, accession, ticker, nowIso(), `synthetic/${artifactId}`],
    );
  }

  // Resolve canonical row id after INSERT OR IGNORE so we never return a UUID
  // that failed to insert due conflicts.
  if (accession) {
    const byAccession = await d1.query<{ artifact_id: string }>(
      `SELECT artifact_id FROM artifacts
       WHERE accession = ?
       ORDER BY fetched_at DESC LIMIT 1;`,
      [accession],
    );
    if (byAccession.results[0]?.artifact_id) {
      artifactCache.set(cacheKey, byAccession.results[0].artifact_id);
      return byAccession.results[0].artifact_id;
    }
  }

  if (sourceUrl) {
    const byUrl = await d1.query<{ artifact_id: string }>(
      `SELECT artifact_id FROM artifacts
       WHERE source_url = ?
       ORDER BY fetched_at DESC LIMIT 1;`,
      [sourceUrl],
    );
    if (byUrl.results[0]?.artifact_id) {
      artifactCache.set(cacheKey, byUrl.results[0].artifact_id);
      return byUrl.results[0].artifact_id;
    }
  }

  if (!dryRun) {
    const byId = await d1.query<{ artifact_id: string }>(
      `SELECT artifact_id FROM artifacts WHERE artifact_id = ? LIMIT 1;`,
      [artifactId],
    );
    if (byId.results[0]?.artifact_id) {
      artifactCache.set(cacheKey, byId.results[0].artifact_id);
      return byId.results[0].artifact_id;
    }
  }

  if (dryRun) {
    artifactCache.set(cacheKey, artifactId);
    return artifactId;
  }

  throw new Error(`artifact_resolution_failed ticker=${ticker} as_of=${snapshot.date} key=${cacheKey}`);
}

// ---------------------------------------------------------------------------
// Metric extraction
// ---------------------------------------------------------------------------

type MetricDef = {
  metric: string;
  getValue: (s: HoldingsSnapshot) => number | undefined;
  getUnit: (assetUnit: string) => string;
};

const ALL_METRIC_DEFS: MetricDef[] = [
  {
    metric: 'holdings_native',
    getValue: (s) => s.holdings,
    getUnit: (assetUnit) => assetUnit,
  },
  {
    metric: 'basic_shares',
    getValue: (s) => s.sharesOutstanding,
    getUnit: () => 'shares',
  },
  {
    metric: 'cash_usd',
    getValue: (s) => s.cash,
    getUnit: () => 'USD',
  },
  {
    metric: 'debt_usd',
    getValue: (s) => s.totalDebt,
    getUnit: () => 'USD',
  },
  {
    metric: 'preferred_equity_usd',
    getValue: (s) => s.preferredEquity,
    getUnit: () => 'USD',
  },
];

// ---------------------------------------------------------------------------
// Proposal source string
// ---------------------------------------------------------------------------

function proposalSource(
  snapshot: HoldingsSnapshot,
  ticker: string,
): string {
  // Prefer accession (stable SEC identifier)
  const accession = snapshot.sourceUrl?.match(/\b(\d{10}-\d{2}-\d{6})\b/)?.[1];
  if (accession) return accession;

  // Then sourceUrl
  if (snapshot.sourceUrl) return snapshot.sourceUrl;

  // Fallback to deterministic string
  return `holdings_history_ts|${ticker}|${snapshot.date}`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const tickersRaw = (argVal('tickers') || 'ALL').trim();
  const metricsRaw = (argVal('metrics') || 'ALL').trim();
  const dryRun = (argVal('dry-run') ?? 'true') === 'true';
  const limit = Number(argVal('limit') || '999999');

  // Build ticker list: ALL = every key in HOLDINGS_HISTORY + MSTR
  const useAllTickers = !tickersRaw || tickersRaw.toUpperCase() === 'ALL';
  const allTickers = Array.from(
    new Set([...Object.keys(HOLDINGS_HISTORY), 'MSTR']),
  ).sort();

  const tickers = useAllTickers
    ? allTickers
    : tickersRaw.split(',').map(t => t.trim().toUpperCase()).filter(Boolean);

  // Build metric filter
  const useAllMetrics = !metricsRaw || metricsRaw.toUpperCase() === 'ALL';
  const enabledMetricNames = useAllMetrics
    ? ALL_METRIC_DEFS.map(m => m.metric)
    : metricsRaw.split(',').map(m => m.trim()).filter(Boolean);
  const enabledMetrics = ALL_METRIC_DEFS.filter(m =>
    enabledMetricNames.includes(m.metric),
  );

  const d1 = D1Client.fromEnv();
  const runId = crypto.randomUUID();
  const latestObjectType = await getSqliteObjectType(d1, 'latest_datapoints');
  const canWriteLatest = latestObjectType === 'table';

  // Create run record
  if (!dryRun) {
    await d1.query(
      `INSERT OR IGNORE INTO runs (run_id, started_at, trigger, code_sha, notes)
       VALUES (?, ?, ?, ?, ?);`,
      [
        runId,
        nowIso(),
        'manual',
        process.env.GITHUB_SHA || null,
        `backfill_holdings_history_ts tickers=${tickers.length} metrics=${enabledMetricNames.join(',')}`,
      ],
    );
  }

  // Counters
  let totalSnapshots = 0;
  let totalInserted = 0;
  let totalUpdated = 0;
  let totalNoop = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const perTicker: Record<string, { snapshots: number; inserted: number; updated: number; noop: number; skipped: number; failed: number }> = {};

  // Track latest as_of per (entity_id, metric) for latest_datapoints update
  const latestByEntityMetric = new Map<string, {
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
  }>();

  // Deduplicate: some map keys are aliases (ALTBG → ALCPB same history).
  // Use company.ticker as the canonical entity_id and skip duplicates.
  const processedEntityIds = new Set<string>();

  for (const ticker of tickers) {
    // Get RAW history (not interpolated) — except MSTR which must use getHoldingsHistory
    let company: CompanyHoldingsHistory | null;
    if (ticker === 'MSTR') {
      // MSTR uses verified financials via getHoldingsHistory, but we only want
      // the raw (non-interpolated) points. getHoldingsHistory adds midpoints.
      // We want the originals — filter out interpolated ones.
      const full = getHoldingsHistory('MSTR');
      if (full) {
        company = {
          ...full,
          history: full.history.filter(
            s => !s.source?.startsWith('Interpolated'),
          ),
        };
      } else {
        company = null;
      }
    } else {
      // Direct map access — raw snapshots only (no interpolation)
      const entry = HOLDINGS_HISTORY[ticker];
      company = entry || null;
    }

    if (!company || !company.history.length) {
      continue;
    }

    // Use canonical ticker from the data (not the map key) as entity_id
    const entityId = company.ticker.toUpperCase();
    if (processedEntityIds.has(entityId)) {
      continue; // Skip alias (e.g., ALTBG → ALCPB)
    }
    processedEntityIds.add(entityId);

    const assetUnit = resolveAssetUnit(company.asset);
    if (!assetUnit) {
      console.log(JSON.stringify({ ticker: entityId, skipped: true, reason: `unknown asset: ${company.asset}` }));
      continue;
    }

    const stats = { snapshots: 0, inserted: 0, updated: 0, noop: 0, skipped: 0, failed: 0 };

    for (const snapshot of company.history) {
      if (totalSnapshots >= limit) break;

      // Skip interpolated snapshots
      if (snapshot.sourceType === 'interpolated') {
        stats.skipped++;
        totalSkipped++;
        continue;
      }

      stats.snapshots++;
      totalSnapshots++;

      const artifactId = await resolveOrCreateArtifact(d1, entityId, snapshot, dryRun);
      const asOf = snapshot.date || null;
      const reportedAt = snapshot.date || null;
      const confidence = mapConfidence(snapshot.confidence);
      const pSource = proposalSource(snapshot, entityId);

      for (const metricDef of enabledMetrics) {
        const value = metricDef.getValue(snapshot);
        if (value === undefined || value === null) continue;

        let unit = metricDef.getUnit(assetUnit);
        // Default behavior is to skip ambiguous MULTI holdings. Allow only
        // explicit ticker overrides where `snapshot.holdings` is known BTC-native.
        if (metricDef.metric === 'holdings_native' && assetUnit === 'MULTI') {
          const overrideUnit = HOLDINGS_UNIT_OVERRIDES[entityId];
          if (!overrideUnit) {
            stats.skipped++;
            totalSkipped++;
            continue;
          }
          unit = overrideUnit;
        }
        const proposalKey = makeProposalKey({
          entityId,
          metric: metricDef.metric,
          proposalSource: pSource,
          asOf,
          reportedAt,
        });

        const flagsJson = JSON.stringify({
          backfill: {
            from: 'holdings_history_ts',
            script: 'd1-backfill-holdings-history',
          },
          source: {
            source_type: snapshot.sourceType || null,
            source_url: snapshot.sourceUrl || null,
            source_label: snapshot.source || null,
            confidence_raw: snapshot.confidence || null,
          },
        });

        const datapointId = crypto.randomUUID();
        const createdAt = nowIso();

        if (dryRun) {
          stats.noop++;
          totalNoop++;
          continue;
        }

        try {
          // Check if proposal_key already exists
          const existing = await d1.query<{ datapoint_id: string; value: number }>(
            `SELECT datapoint_id, value FROM datapoints WHERE proposal_key = ? LIMIT 1;`,
            [proposalKey],
          );

          if (existing.results.length > 0) {
            // Already exists — check if value matches
            if (Number(existing.results[0].value) === Number(value)) {
              stats.noop++;
              totalNoop++;
            } else {
              // Update existing
              await d1.query(
                `UPDATE datapoints SET
                   value = ?, unit = ?, scale = 0,
                   as_of = ?, reported_at = ?,
                   artifact_id = ?, run_id = ?,
                   method = 'backfill_holdings_history_ts',
                   confidence = ?, flags_json = ?
                 WHERE proposal_key = ?;`,
                [value, unit, asOf, reportedAt, artifactId, runId, confidence, flagsJson, proposalKey],
              );
              stats.updated++;
              totalUpdated++;
            }
          } else {
            // Also check for legacy rows without proposal_key (dedupe collision)
            const dedupeCollision = await d1.query<{ datapoint_id: string; proposal_key: string | null }>(
              `SELECT datapoint_id, proposal_key FROM datapoints
               WHERE entity_id = ? AND metric = ? AND as_of = ?
                 AND ABS(value - ?) < 0.01
               LIMIT 1;`,
              [entityId, metricDef.metric, asOf, value],
            );

            if (dedupeCollision.results.length > 0 && !dedupeCollision.results[0].proposal_key) {
              // Seed the proposal_key on the legacy row
              await d1.query(
                `UPDATE datapoints
                 SET proposal_key = ?, status = 'candidate'
                 WHERE datapoint_id = ? AND proposal_key IS NULL
                   AND NOT EXISTS (SELECT 1 FROM datapoints WHERE proposal_key = ?);`,
                [proposalKey, dedupeCollision.results[0].datapoint_id, proposalKey],
              );
              stats.noop++;
              totalNoop++;
            } else if (dedupeCollision.results.length > 0) {
              stats.noop++;
              totalNoop++;
            } else {
              // Insert new row
              await d1.query(
                `INSERT INTO datapoints (
                   datapoint_id, entity_id, metric, value, unit, scale,
                   as_of, reported_at, artifact_id, run_id,
                   method, confidence, flags_json, status,
                   proposal_key, created_at
                 ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?)
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
                   status = excluded.status;`,
                [
                  datapointId, entityId, metricDef.metric, value, unit,
                  asOf, reportedAt, artifactId, runId,
                  'backfill_holdings_history_ts', confidence, flagsJson, proposalKey, createdAt,
                ],
              );
              stats.inserted++;
              totalInserted++;
            }
          }

          // Track latest for latest_datapoints update
          const lmKey = `${entityId}|${metricDef.metric}`;
          const prev = latestByEntityMetric.get(lmKey);
          if (!prev || (asOf && asOf >= (prev.as_of || ''))) {
            latestByEntityMetric.set(lmKey, {
              datapoint_id: existing.results[0]?.datapoint_id || datapointId,
              entity_id: entityId,
              metric: metricDef.metric,
              value,
              unit,
              scale: 0,
              as_of: asOf || '',
              reported_at: reportedAt,
              artifact_id: artifactId,
              run_id: runId,
              method: 'backfill_holdings_history_ts',
              confidence,
              flags_json: flagsJson,
              created_at: createdAt,
            });
          }
        } catch (err) {
          stats.failed++;
          totalFailed++;
          console.log(JSON.stringify({
            ok: false,
            ticker: entityId,
            metric: metricDef.metric,
            as_of: asOf,
            error: err instanceof Error ? err.message : String(err),
          }));
        }
      }
    }

    perTicker[entityId] = stats;
  }

  // Update latest_datapoints
  let latestUpdated = 0;
  if (!dryRun && canWriteLatest) {
    for (const row of latestByEntityMetric.values()) {
      try {
        await d1.query(
          `INSERT INTO latest_datapoints (
             datapoint_id, entity_id, metric, value, unit, scale,
             as_of, reported_at, artifact_id, run_id,
             method, confidence, flags_json, created_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(entity_id, metric) DO UPDATE SET
             datapoint_id = excluded.datapoint_id,
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
             created_at = excluded.created_at
           WHERE excluded.as_of >= latest_datapoints.as_of;`,
          [
            row.datapoint_id, row.entity_id, row.metric,
            row.value, row.unit, row.scale,
            row.as_of, row.reported_at, row.artifact_id, row.run_id,
            row.method, row.confidence, row.flags_json, row.created_at,
          ],
        );
        latestUpdated++;
      } catch (err) {
        totalFailed++;
        console.log(JSON.stringify({
          ok: false,
          kind: 'latest_datapoints_update_error',
          entity_id: row.entity_id,
          metric: row.metric,
          error: err instanceof Error ? err.message : String(err),
        }));
      }
    }
  } else if (!dryRun && latestObjectType === 'view') {
    console.log(JSON.stringify({
      ok: true,
      kind: 'latest_datapoints_update_skipped',
      reason: 'latest_datapoints_is_view',
    }));
  } else if (!dryRun && latestObjectType === null) {
    console.log(JSON.stringify({
      ok: true,
      kind: 'latest_datapoints_update_skipped',
      reason: 'latest_datapoints_missing',
    }));
  }

  if (!dryRun) {
    // Close run
    await d1.query(`UPDATE runs SET ended_at = ? WHERE run_id = ?;`, [nowIso(), runId]);
  }

  // Summary
  console.log(JSON.stringify({
    dryRun,
    tickerCount: tickers.length,
    metricsEnabled: enabledMetricNames,
    runId,
    totalSnapshots,
    totalInserted,
    totalUpdated,
    totalNoop,
    totalSkipped,
    totalFailed,
    latestDatapointsUpdated: latestUpdated,
    perTicker,
  }, null, 2));

  // Fail wet runs if any row-level operation failed.
  if (!dryRun && totalFailed > 0) {
    throw new Error(`backfill_failed totalFailed=${totalFailed}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
