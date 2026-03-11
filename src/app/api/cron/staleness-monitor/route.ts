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
  STALE_BALANCE_SHEET_DAYS,
  CRITICAL_STALE_DAYS,
  type CompanyReviewResult,
} from '@/lib/data/integrity-review';
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

function buildReport(): StalenessReport {
  const reviews = getAllCompanyReviews(allCompanies);

  const confidence = { high: 0, medium: 0, low: 0 };
  const overdueItems: OverdueItem[] = [];
  const criticalItems: OverdueItem[] = [];
  const staleBalanceSheet: OverdueItem[] = [];

  for (const r of reviews) {
    confidence[r.confidence]++;

    // Holdings: use cadence-aware threshold
    if (r.holdingsOverdue && r.holdingsAgeDays !== null) {
      const item: OverdueItem = {
        ticker: r.ticker,
        field: 'holdings',
        ageDays: r.holdingsAgeDays,
        cadenceDays: r.holdingsCadenceDays,
      };
      overdueItems.push(item);
      if (r.holdingsAgeDays > CRITICAL_STALE_DAYS) criticalItems.push(item);
    }

    // Balance sheet fields: flat threshold (no per-company cadence yet)
    for (const [field, age] of [
      ['shares', r.sharesAgeDays],
      ['debt', r.debtAgeDays],
      ['cash', r.cashAgeDays],
    ] as const) {
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

  const report = buildReport();
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
