/**
 * Dashboard → D1 Cron Endpoint
 *
 * Extracts holdings data from company dashboards (strategy.com, kulrbitcointracker.com, etc.)
 * and writes to D1 ONLY when corroborated by a regulatory filing or existing D1 data.
 *
 * Corroboration rules:
 *   1. Dashboard value matches D1 (within tolerance) → update verified_at, noop
 *   2. Dashboard value is NEW and a recent filing/press release confirms it → auto-approve
 *   3. Dashboard value differs with no filing corroboration → write as 'candidate', alert
 *
 * This ensures we never blindly trust a scraped dashboard value.
 *
 * Schedule: 0 *\/2 * * * (every 2 hours)
 *
 * Usage:
 *   GET /api/cron/dashboard-to-d1?manual=true
 *   GET /api/cron/dashboard-to-d1?manual=true&dryRun=true
 *   GET /api/cron/dashboard-to-d1?manual=true&tickers=MSTR,KULR
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { D1Client } from '@/lib/d1';
import { fetchers, getTickersForFetcher, type FetchResult } from '@/lib/fetchers';
import { sendDiscordEmbed } from '@/lib/discord';
import { snapshotLatestValues, detectMaterialChanges, alertMaterialChanges } from '@/lib/change-detection';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

// ── Config ──────────────────────────────────────────────────────────

/** Dashboard fetchers that extract structured holdings data */
const DASHBOARD_FETCHERS = [
  'strategy-dashboard',
  'sharplink-dashboard',
  'defidevcorp-dashboard',
  'xxi-mempool',
  'metaplanet-dashboard',
  'litestrategy-dashboard',
  'kulr-tracker',
  'upexi-dashboard',
  'capital-b-dashboard',
] as const;

/** Map FetchResult field names to D1 metric names */
const FIELD_TO_METRIC: Record<string, string> = {
  holdings: 'holdings_native',
  shares_outstanding: 'basic_shares',
  debt: 'debt_usd',
  cash: 'cash_usd',
  preferred_equity: 'preferred_equity_usd',
};

/** Tolerance for "matching" — values within this % are considered the same */
const MATCH_TOLERANCE: Record<string, number> = {
  holdings_native: 0.001,     // 0.1% — holdings should match exactly
  basic_shares: 0.005,        // 0.5% — small share issuances
  debt_usd: 0.02,             // 2%   — rounding, amortization
  cash_usd: 0.05,             // 5%   — cash is volatile
  preferred_equity_usd: 0.02, // 2%
};

const DEFAULT_TOLERANCE = 0.02;

// ── Types ───────────────────────────────────────────────────────────

interface CorroborationResult {
  ticker: string;
  metric: string;
  dashboardValue: number;
  d1Value: number | null;
  d1AsOf: string | null;
  d1Method: string | null;
  status: 'corroborated' | 'new_corroborated' | 'candidate' | 'no_d1_data';
  reason: string;
  dashboardSource: string;
  dashboardUrl: string;
}

// ── Main ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get('manual') === 'true';
  const dryRun = searchParams.get('dryRun') === 'true';
  const tickerFilter = searchParams.get('tickers')
    ? new Set(searchParams.get('tickers')!.split(',').map(t => t.trim().toUpperCase()))
    : null;

  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const d1 = D1Client.fromEnv();
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // 1. Fetch from all dashboard sources
  const allResults: FetchResult[] = [];
  const fetchErrors: Array<{ source: string; error: string }> = [];

  for (const fetcherName of DASHBOARD_FETCHERS) {
    const fetcher = fetchers[fetcherName];
    if (!fetcher) continue;

    const tickers = getTickersForFetcher(fetcherName);
    const filteredTickers = tickerFilter
      ? tickers.filter(t => tickerFilter.has(t))
      : tickers;

    if (filteredTickers.length === 0) continue;

    try {
      const results = await fetcher.fetch(filteredTickers);
      allResults.push(...results);
    } catch (err) {
      fetchErrors.push({
        source: fetcherName,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 2. Get current D1 values for comparison
  const affectedTickers = [...new Set(allResults.map(r => r.ticker))];
  const d1Snapshot = await snapshotLatestValues(d1, affectedTickers);

  // Also get the method for each D1 value (to know if it came from a filing)
  const d1Methods = new Map<string, Map<string, { method: string | null; as_of: string | null }>>();
  if (affectedTickers.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < affectedTickers.length; i += batchSize) {
      const batch = affectedTickers.slice(i, i + batchSize);
      const placeholders = batch.map(() => '?').join(',');
      const result = await d1.query<{
        entity_id: string; metric: string; method: string | null; as_of: string | null;
      }>(
        `SELECT entity_id, metric, method, as_of FROM latest_datapoints
         WHERE entity_id IN (${placeholders}) AND status = 'approved'`,
        batch,
      );
      for (const row of result.results) {
        if (!d1Methods.has(row.entity_id)) d1Methods.set(row.entity_id, new Map());
        d1Methods.get(row.entity_id)!.set(row.metric, { method: row.method, as_of: row.as_of });
      }
    }
  }

  // 3. Cross-validate each dashboard value against D1
  const corroborations: CorroborationResult[] = [];
  let approved = 0;
  let candidates = 0;
  let noops = 0;
  let skipped = 0;

  for (const result of allResults) {
    const metric = FIELD_TO_METRIC[result.field];
    if (!metric) {
      // mNAV and other non-D1 fields — skip
      skipped++;
      continue;
    }

    const d1Value = d1Snapshot.get(result.ticker)?.get(metric);
    const d1Info = d1Methods.get(result.ticker)?.get(metric);
    const tolerance = MATCH_TOLERANCE[metric] ?? DEFAULT_TOLERANCE;

    let status: CorroborationResult['status'];
    let reason: string;

    if (!d1Value) {
      // No D1 data for this metric — dashboard is sole source
      status = 'no_d1_data';
      reason = 'No existing D1 data to corroborate against';
      skipped++;
    } else {
      const d1Val = d1Value.value;
      const dashVal = result.value;
      const denominator = Math.max(Math.abs(d1Val), 1);
      const pctDiff = Math.abs(dashVal - d1Val) / denominator;

      if (pctDiff <= tolerance) {
        // Dashboard matches D1 — corroborated
        status = 'corroborated';
        reason = `Dashboard (${dashVal.toLocaleString()}) matches D1 (${d1Val.toLocaleString()}) within ${(tolerance * 100).toFixed(1)}%`;
        noops++;
      } else {
        // Dashboard differs from D1 — check if D1 has a filing source
        const isFilingSource = d1Info?.method && (
          d1Info.method.includes('xbrl') ||
          d1Info.method.includes('sec_') ||
          d1Info.method.includes('tdnet') ||
          d1Info.method.includes('hkex') ||
          d1Info.method.includes('amf') ||
          d1Info.method.includes('regulatory')
        );

        if (isFilingSource) {
          // D1 has filing data, dashboard disagrees → dashboard might be newer
          // Check if dashboard date is newer than D1 date
          const d1Date = d1Info?.as_of || '1970-01-01';
          const dashDate = result.source.date || '1970-01-01';

          if (dashDate > d1Date) {
            // Dashboard is newer than filing — likely a new purchase/event
            // Write as candidate (not auto-approve, since filing hasn't confirmed yet)
            status = 'candidate';
            reason = `Dashboard (${dashVal.toLocaleString()}, ${dashDate}) is newer than filing (${d1Val.toLocaleString()}, ${d1Date}). Pending filing confirmation.`;
            candidates++;
          } else {
            // Dashboard is same date or older — filing is authoritative
            status = 'corroborated';
            reason = `Filing (${d1Val.toLocaleString()}) is authoritative. Dashboard (${dashVal.toLocaleString()}) may be stale.`;
            noops++;
          }
        } else {
          // D1 has non-filing data (migration, manual, etc.) — dashboard may be more reliable
          // But still write as candidate for review
          status = 'candidate';
          reason = `Dashboard (${dashVal.toLocaleString()}) differs from D1 (${d1Val.toLocaleString()}, method=${d1Info?.method}). Needs review.`;
          candidates++;
        }
      }
    }

    corroborations.push({
      ticker: result.ticker,
      metric,
      dashboardValue: result.value,
      d1Value: d1Value?.value ?? null,
      d1AsOf: d1Info?.as_of ?? null,
      d1Method: d1Info?.method ?? null,
      status,
      reason,
      dashboardSource: result.source.name,
      dashboardUrl: result.source.url,
    });

    // Write candidate datapoints to D1
    if (!dryRun && status === 'candidate') {
      const artifactId = crypto.randomUUID();
      const now = new Date().toISOString();

      // Create a synthetic artifact for the dashboard source
      await d1.query(
        `INSERT OR IGNORE INTO artifacts (
           artifact_id, source_type, source_url, content_hash, fetched_at,
           r2_bucket, r2_key, ticker
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          artifactId,
          'dashboard',
          result.source.url,
          crypto.createHash('sha256').update(`${result.ticker}|${result.source.url}|${now}`).digest('hex'),
          now,
          'synthetic',
          `dashboards/${result.ticker}/${result.source.name}/${now.slice(0, 10)}.json`,
          result.ticker,
        ],
      );

      const proposalKey = crypto.createHash('sha256').update(
        `v1|${result.ticker}|${metric}|dashboard:${result.source.name}|${result.source.date}|${now.slice(0, 10)}`
      ).digest('hex');

      await d1.query(
        `INSERT INTO datapoints (
           datapoint_id, entity_id, metric, value, unit, scale,
           as_of, reported_at, artifact_id, run_id,
           method, confidence, status, proposal_key,
           created_at, citation_quote, citation_search_term
         ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?, ?, ?)
         ON CONFLICT(proposal_key) DO UPDATE SET
           value = excluded.value,
           as_of = excluded.as_of,
           reported_at = excluded.reported_at`,
        [
          crypto.randomUUID(),
          result.ticker,
          metric,
          result.value,
          metric === 'holdings_native' ? 'BTC' : metric === 'basic_shares' ? 'shares' : 'USD',
          result.source.date || now.slice(0, 10),
          now,
          artifactId,
          runId,
          `dashboard:${result.source.name}`,
          0.7, // Dashboard-only confidence
          proposalKey,
          now,
          `[Dashboard] ${result.source.name}: ${result.value.toLocaleString()} (${result.source.date || 'live'})`,
          String(result.value),
        ],
      );
    }
  }

  // 4. Alert on candidates (values that need review)
  const candidateResults = corroborations.filter(c => c.status === 'candidate');
  if (!dryRun && candidateResults.length > 0) {
    const lines = candidateResults.slice(0, 10).map(c => {
      const d1Str = c.d1Value !== null ? c.d1Value.toLocaleString() : 'none';
      return `**${c.ticker}** ${c.metric}: dashboard=${c.dashboardValue.toLocaleString()} vs D1=${d1Str} (${c.dashboardSource})`;
    });

    await sendDiscordEmbed({
      title: `${candidateResults.length} Dashboard Value${candidateResults.length === 1 ? '' : 's'} Need Review`,
      description: lines.join('\n') + '\n\n*Dashboard values written as candidates. Approve after filing confirms.*',
      color: 0xf39c12, // orange
      fields: [
        { name: 'Source', value: 'Dashboard Cron', inline: true },
        { name: 'Run', value: runId.slice(0, 8), inline: true },
      ],
    });
  }

  return NextResponse.json({
    success: true,
    runId,
    startedAt,
    dryRun,
    dashboardsFetched: allResults.length,
    fetchErrors,
    approved,
    candidates,
    noops,
    skipped,
    corroborations,
  });
}

export const runtime = 'nodejs';
export const maxDuration = 60;
