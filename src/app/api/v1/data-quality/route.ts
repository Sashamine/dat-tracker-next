/**
 * GET /api/v1/data-quality
 *
 * Returns per-company data freshness and confidence information.
 * Designed for API consumers who need to understand how current the data is.
 *
 * Query params:
 *   ?ticker=MSTR       — single company
 *   ?staleOnly=true    — only return companies with stale data
 *
 * Response shape:
 * {
 *   asOf: "2026-03-15T12:00:00Z",
 *   summary: { total: 56, fresh: 42, stale: 14, ... },
 *   companies: [{
 *     ticker: "MSTR",
 *     freshness: "fresh",
 *     metrics: {
 *       holdings_native: { value: 738731, asOf: "2026-03-10", ageDays: 5, status: "fresh", method: "sec_filing_text", cadenceDays: 30 },
 *       basic_shares: { ... },
 *     }
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';
import { allCompanies } from '@/lib/data/companies';
import {
  getHoldingsCadenceDays,
  STALE_BALANCE_SHEET_DAYS,
  CRITICAL_STALE_DAYS,
} from '@/lib/data/integrity-review';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type FreshnessStatus = 'fresh' | 'stale' | 'critical' | 'unknown';

interface MetricFreshness {
  value: number;
  asOf: string | null;
  ageDays: number | null;
  status: FreshnessStatus;
  method: string | null;
  cadenceDays: number;
  lastCronRun: string | null;
}

interface CompanyQuality {
  ticker: string;
  name: string;
  asset: string;
  freshness: FreshnessStatus;
  holdingsCadenceDays: number;
  metrics: Record<string, MetricFreshness>;
}

function daysSince(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tickerFilter = searchParams.get('ticker')?.toUpperCase();
  const staleOnly = searchParams.get('staleOnly') === 'true';

  const d1 = D1Client.fromEnv();

  // Get all latest datapoints with their run timestamps
  const result = await d1.query<{
    entity_id: string;
    metric: string;
    value: number;
    as_of: string | null;
    method: string | null;
    created_at: string | null;
  }>(
    `SELECT entity_id, metric, value, as_of, method, created_at
     FROM latest_datapoints
     WHERE status = 'approved'
     ORDER BY entity_id, metric`,
  );

  // Get last cron run times
  const runsResult = await d1.query<{
    trigger: string;
    ended_at: string;
    notes: string;
  }>(
    `SELECT trigger, ended_at, notes FROM runs
     WHERE ended_at IS NOT NULL
     ORDER BY ended_at DESC
     LIMIT 10`,
  );

  const lastXbrlRun = runsResult.results.find(r => r.notes?.includes('xbrl-to-d1'))?.ended_at ?? null;
  const lastForeignRun = runsResult.results.find(r => r.notes?.includes('foreign-to-d1'))?.ended_at ?? null;

  // Group by ticker
  const byTicker = new Map<string, Array<typeof result.results[0]>>();
  for (const row of result.results) {
    if (!byTicker.has(row.entity_id)) byTicker.set(row.entity_id, []);
    byTicker.get(row.entity_id)!.push(row);
  }

  const companyMap = new Map(allCompanies.map(c => [c.ticker, c]));
  const companies: CompanyQuality[] = [];

  const BALANCE_SHEET_METRICS = ['debt_usd', 'cash_usd', 'preferred_equity_usd', 'restricted_cash_usd', 'other_investments_usd'];

  for (const company of allCompanies) {
    if (tickerFilter && company.ticker !== tickerFilter) continue;

    const holdingsCadence = getHoldingsCadenceDays(company);
    const rows = byTicker.get(company.ticker) || [];
    const metrics: Record<string, MetricFreshness> = {};
    let worstStatus: FreshnessStatus = 'fresh';

    for (const row of rows) {
      const ageDays = daysSince(row.as_of);
      let cadence: number;
      let status: FreshnessStatus;

      if (row.metric === 'holdings_native' || row.metric === 'bitcoin_holdings_usd') {
        cadence = holdingsCadence;
      } else if (row.metric === 'basic_shares' || BALANCE_SHEET_METRICS.includes(row.metric)) {
        cadence = STALE_BALANCE_SHEET_DAYS;
      } else {
        cadence = 120;
      }

      if (ageDays === null) {
        status = 'unknown';
      } else if (ageDays > CRITICAL_STALE_DAYS) {
        status = 'critical';
      } else if (ageDays > cadence) {
        status = 'stale';
      } else {
        status = 'fresh';
      }

      // Track worst status for company-level rollup
      const statusRank: Record<FreshnessStatus, number> = { fresh: 0, unknown: 1, stale: 2, critical: 3 };
      if (statusRank[status] > statusRank[worstStatus]) {
        worstStatus = status;
      }

      metrics[row.metric] = {
        value: row.value,
        asOf: row.as_of,
        ageDays,
        status,
        method: row.method,
        cadenceDays: cadence,
        lastCronRun: row.method?.includes('xbrl') ? lastXbrlRun : lastForeignRun,
      };
    }

    if (staleOnly && worstStatus === 'fresh') continue;

    companies.push({
      ticker: company.ticker,
      name: company.name,
      asset: company.asset,
      freshness: worstStatus,
      holdingsCadenceDays: holdingsCadence,
      metrics,
    });
  }

  // Summary
  const summary = {
    total: companies.length,
    fresh: companies.filter(c => c.freshness === 'fresh').length,
    stale: companies.filter(c => c.freshness === 'stale').length,
    critical: companies.filter(c => c.freshness === 'critical').length,
    unknown: companies.filter(c => c.freshness === 'unknown').length,
    lastXbrlCron: lastXbrlRun,
    lastForeignCron: lastForeignRun,
  };

  return NextResponse.json({
    asOf: new Date().toISOString(),
    summary,
    companies,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
    },
  });
}
