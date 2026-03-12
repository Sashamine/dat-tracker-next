/**
 * Staleness Monitor Cron
 *
 * Daily Discord alert summarizing dataset freshness. Runs after all
 * data-ingestion crons have completed and reports any overdue fields,
 * low-confidence companies, and assumption health.
 *
 * Uses cadence-aware thresholds: SEC quarterly filers get 120 days,
 * real-time dashboards get 45 days, etc. Only companies past their
 * expected cadence are flagged as "overdue."
 *
 * Schedule: 30 9 * * * (9:30 AM UTC daily, after all ingestion crons)
 *
 * Usage:
 *   GET /api/cron/staleness-monitor              (cron, requires CRON_SECRET)
 *   GET /api/cron/staleness-monitor?manual=true   (manual trigger)
 *   GET /api/cron/staleness-monitor?manual=true&dryRun=true  (no Discord send)
 */

import { NextRequest, NextResponse } from 'next/server';
import { allCompanies } from '@/lib/data/companies';
import {
  getAllCompanyReviews,
  getHoldingsCadenceDays,
  STALE_BALANCE_SHEET_DAYS,
  CRITICAL_STALE_DAYS,
  type CompanyReviewResult,
} from '@/lib/data/integrity-review';
import { D1Client } from '@/lib/d1';
import { sendDiscordEmbed, type Severity } from '@/lib/discord';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

interface OverdueItem {
  ticker: string;
  field: string;
  ageDays: number;
  cadenceDays: number;
}

interface StalenessReport {
  totalCompanies: number;
  confidence: { high: number; medium: number; low: number };
  /** Holdings past their expected cadence (actionable). */
  overdueItems: OverdueItem[];
  /** Holdings past the critical 180d threshold. */
  criticalItems: OverdueItem[];
  /** Balance sheet fields past 120d threshold. */
  staleBalanceSheet: OverdueItem[];
  lowConfidenceTickers: string[];
  secCovered: number;
  foreignCovered: number;
}

/**
 * Fetch the latest as_of dates from D1 for each metric per ticker.
 * D1 often has fresher data than companies.ts (via automated pipelines).
 */
async function getD1FreshestDates(): Promise<Map<string, {
  holdings?: string;
  shares?: string;
  debt?: string;
  cash?: string;
}>> {
  const map = new Map<string, { holdings?: string; shares?: string; debt?: string; cash?: string }>();

  try {
    const d1 = D1Client.fromEnv();
    const result = await d1.query<{ entity_id: string; metric: string; max_as_of: string }>(
      `SELECT entity_id, metric, MAX(as_of) as max_as_of
       FROM datapoints
       WHERE metric IN ('holdings_native', 'basic_shares', 'debt_usd', 'cash_usd')
         AND status IN ('candidate', 'accepted', 'verified')
       GROUP BY entity_id, metric`
    );

    for (const row of result.results) {
      if (!map.has(row.entity_id)) map.set(row.entity_id, {});
      const entry = map.get(row.entity_id)!;
      switch (row.metric) {
        case 'holdings_native': entry.holdings = row.max_as_of; break;
        case 'basic_shares': entry.shares = row.max_as_of; break;
        case 'debt_usd': entry.debt = row.max_as_of; break;
        case 'cash_usd': entry.cash = row.max_as_of; break;
      }
    }
  } catch {
    // If D1 is unavailable, fall back to companies.ts only
    console.error('[staleness-monitor] D1 unavailable, using companies.ts dates only');
  }

  return map;
}

function daysSinceDate(isoDate: string | undefined | null): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/** Pick the fresher of two ISO date strings. */
function fresher(a: string | undefined | null, b: string | undefined): string | null {
  if (!a && !b) return null;
  if (!a) return b || null;
  if (!b) return a;
  return a > b ? a : b;
}

async function buildReport(): Promise<StalenessReport> {
  const reviews = getAllCompanyReviews(allCompanies);
  const d1Dates = await getD1FreshestDates();

  // Build a lookup from ticker to company for cadence info
  const companyByTicker = new Map(allCompanies.map(c => [c.ticker, c]));

  const confidence = { high: 0, medium: 0, low: 0 };
  const overdueItems: OverdueItem[] = [];
  const criticalItems: OverdueItem[] = [];
  const staleBalanceSheet: OverdueItem[] = [];

  for (const r of reviews) {
    confidence[r.confidence]++;

    const d1 = d1Dates.get(r.ticker);
    const company = companyByTicker.get(r.ticker);

    // Holdings: use the fresher of companies.ts and D1 dates
    const holdingsDate = fresher(company?.holdingsLastUpdated, d1?.holdings);
    const holdingsAge = daysSinceDate(holdingsDate);
    const cadenceDays = company ? getHoldingsCadenceDays(company) : r.holdingsCadenceDays;
    const holdingsOverdue = holdingsAge !== null && holdingsAge > cadenceDays;

    if (holdingsOverdue && holdingsAge !== null) {
      const item: OverdueItem = {
        ticker: r.ticker,
        field: 'holdings',
        ageDays: holdingsAge,
        cadenceDays,
      };
      overdueItems.push(item);
      if (holdingsAge > CRITICAL_STALE_DAYS) criticalItems.push(item);
    }

    // Balance sheet fields: use fresher of companies.ts and D1
    const sharesDate = fresher(company?.sharesAsOf, d1?.shares);
    const debtDate = fresher(company?.debtAsOf, d1?.debt);
    const cashDate = fresher(company?.cashAsOf, d1?.cash);

    for (const [field, date] of [
      ['shares', sharesDate],
      ['debt', debtDate],
      ['cash', cashDate],
    ] as const) {
      const age = daysSinceDate(date);
      if (age !== null && age > STALE_BALANCE_SHEET_DAYS) {
        staleBalanceSheet.push({ ticker: r.ticker, field, ageDays: age, cadenceDays: STALE_BALANCE_SHEET_DAYS });
      }
    }
  }

  const lowConfidenceTickers = reviews
    .filter(r => r.confidence === 'low')
    .map(r => r.ticker);

  return {
    totalCompanies: reviews.length,
    confidence,
    overdueItems,
    criticalItems,
    staleBalanceSheet,
    lowConfidenceTickers,
    secCovered: reviews.filter(r => r.isInSecPipeline).length,
    foreignCovered: reviews.filter(r => !r.isInSecPipeline).length,
  };
}

function formatDiscordEmbed(report: StalenessReport) {
  const { confidence, overdueItems, criticalItems, staleBalanceSheet, lowConfidenceTickers } = report;

  const totalIssues = overdueItems.length + staleBalanceSheet.length;

  // Determine severity
  let severity: Severity = 'info';
  if (criticalItems.length > 0 || lowConfidenceTickers.length > 0) severity = 'error';
  else if (totalIssues > 0) severity = 'warning';

  // Build fields for embed
  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  // Confidence summary
  fields.push({
    name: 'Confidence',
    value: `${confidence.high} high · ${confidence.medium} medium · ${confidence.low} low`,
    inline: true,
  });

  // Coverage
  fields.push({
    name: 'Coverage',
    value: `${report.secCovered} SEC · ${report.foreignCovered} foreign`,
    inline: true,
  });

  // Overdue summary
  fields.push({
    name: 'Overdue',
    value: overdueItems.length === 0
      ? 'None'
      : `${overdueItems.length} holdings (${criticalItems.length} critical)`,
    inline: true,
  });

  // Overdue holdings detail (sorted worst-first, max 8)
  if (overdueItems.length > 0) {
    const sorted = overdueItems.sort((a, b) => b.ageDays - a.ageDays);
    const lines = sorted.slice(0, 8).map(i =>
      `${i.ticker}: ${i.ageDays}d (expect ${i.cadenceDays}d)${i.ageDays > CRITICAL_STALE_DAYS ? ' ⚠️' : ''}`
    );
    if (sorted.length > 8) lines.push(`+${sorted.length - 8} more`);
    fields.push({
      name: 'Overdue Holdings',
      value: lines.join('\n'),
    });
  }

  // Stale balance sheet grouped by field (max 5 per field)
  const bsByField = new Map<string, OverdueItem[]>();
  for (const item of staleBalanceSheet) {
    if (!bsByField.has(item.field)) bsByField.set(item.field, []);
    bsByField.get(item.field)!.push(item);
  }
  for (const [field, items] of bsByField) {
    const sorted = items.sort((a, b) => b.ageDays - a.ageDays);
    const lines = sorted.slice(0, 5).map(i => `${i.ticker}: ${i.ageDays}d`);
    if (sorted.length > 5) lines.push(`+${sorted.length - 5} more`);
    fields.push({
      name: `Stale: ${field}`,
      value: lines.join('\n'),
      inline: true,
    });
  }

  // Low confidence tickers
  if (lowConfidenceTickers.length > 0) {
    fields.push({
      name: 'Low Confidence',
      value: lowConfidenceTickers.slice(0, 10).join(', ') +
        (lowConfidenceTickers.length > 10 ? ` +${lowConfidenceTickers.length - 10} more` : ''),
    });
  }

  const COLORS = { info: 0x3498db, warning: 0xf39c12, error: 0xe74c3c } as const;

  const title = totalIssues === 0
    ? `Daily Health: All ${report.totalCompanies} companies on schedule`
    : `Daily Health: ${overdueItems.length} overdue, ${staleBalanceSheet.length} stale balance sheet`;

  return {
    embed: {
      title,
      color: COLORS[severity],
      fields,
    },
    severity,
    shouldMention: criticalItems.length > 0,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get('manual') === 'true';
  const dryRun = searchParams.get('dryRun') === 'true';

  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const report = await buildReport();
  const { embed, severity, shouldMention } = formatDiscordEmbed(report);

  let discordSent = false;
  if (!dryRun) {
    discordSent = await sendDiscordEmbed(embed, shouldMention);
  }

  return NextResponse.json({
    success: true,
    dryRun,
    discordSent,
    report,
    embed,
  });
}

export const runtime = 'nodejs';
export const maxDuration = 30;
