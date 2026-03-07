#!/usr/bin/env npx tsx

/**
 * Daily Health Check
 *
 * Produces a compact report on dataset freshness, market-cap source
 * quality, and pipeline health. Designed to be run as a cron job
 * or GitHub Action and post results to Discord.
 *
 * Usage:
 *   npx tsx scripts/daily-health.ts
 *   npx tsx scripts/daily-health.ts --json   # machine-readable output
 */

import { allCompanies } from '../src/lib/data/companies';
import {
  getAllCompanyReviews,
  STALE_HOLDINGS_DAYS,
  STALE_BALANCE_SHEET_DAYS,
  type CompanyReviewResult,
} from '../src/lib/data/integrity-review';
import { ASSUMPTIONS, ASSUMPTION_REVIEW_MAX_AGE_DAYS } from '../src/lib/data/assumptions';

const jsonMode = process.argv.includes('--json');
const today = new Date().toISOString().split('T')[0];

const reviews = getAllCompanyReviews(allCompanies);

// ── Section 1: Freshness ────────────────────────────────────────────

interface StaleItem {
  ticker: string;
  field: string;
  ageDays: number;
  threshold: number;
}

const staleItems: StaleItem[] = [];

for (const r of reviews) {
  if (r.holdingsAgeDays !== null && r.holdingsAgeDays > STALE_HOLDINGS_DAYS) {
    staleItems.push({ ticker: r.ticker, field: 'holdings', ageDays: r.holdingsAgeDays, threshold: STALE_HOLDINGS_DAYS });
  }
  for (const [field, age] of [['shares', r.sharesAgeDays], ['debt', r.debtAgeDays], ['cash', r.cashAgeDays]] as const) {
    if (age !== null && age > STALE_BALANCE_SHEET_DAYS) {
      staleItems.push({ ticker: r.ticker, field, ageDays: age, threshold: STALE_BALANCE_SHEET_DAYS });
    }
  }
}

// ── Section 2: Market Cap Source ────────────────────────────────────

const mcSources = { shares_based: 0, override: 0, fallback: 0, api: 0 };
for (const r of reviews) mcSources[r.marketCapSource]++;

// ── Section 3: Confidence ───────────────────────────────────────────

const confCounts = { high: 0, medium: 0, low: 0 };
for (const r of reviews) confCounts[r.confidence]++;

// ── Section 4: Pipeline Coverage ────────────────────────────────────

const secCovered = reviews.filter(r => r.isInSecPipeline).length;
const foreign = reviews.filter(r => !r.isInSecPipeline).length;

// ── Section 5: Assumption Health ────────────────────────────────────

const openAssumptions = ASSUMPTIONS.filter(a => a.status === 'open').length;
const monitoringAssumptions = ASSUMPTIONS.filter(a => a.status === 'monitoring').length;
const overdueAssumptions = ASSUMPTIONS
  .filter(a => a.status !== 'resolved')
  .filter(a => {
    const age = Math.floor((Date.now() - new Date(a.lastReviewed).getTime()) / (1000 * 60 * 60 * 24));
    return age > ASSUMPTION_REVIEW_MAX_AGE_DAYS;
  }).length;

// ── Output ──────────────────────────────────────────────────────────

if (jsonMode) {
  const report = {
    date: today,
    companies: allCompanies.length,
    confidence: confCounts,
    marketCapSources: mcSources,
    pipeline: { secCovered, foreign },
    assumptions: { open: openAssumptions, monitoring: monitoringAssumptions, overdue: overdueAssumptions },
    staleItems,
    staleByField: Object.fromEntries(
      Object.entries(
        staleItems.reduce((acc, s) => { (acc[s.field] ??= []).push(s); return acc; }, {} as Record<string, StaleItem[]>)
      )
    ),
    lowConfidence: reviews.filter(r => r.confidence === 'low').map(r => {
      const hasMarketCapIssue = r.marketCapSource === 'fallback' || r.marketCapSource === 'override';
      const hasStaleness = r.holdingsAgeDays !== null && r.holdingsAgeDays > STALE_HOLDINGS_DAYS;
      const hasPendingMerger = r.flags.some(f => f.reason.includes('Pending merger'));
      const hasAssumption = r.openAssumptions.some(a => a.sensitivity === 'high');

      let anomalyType: string;
      if (hasPendingMerger) anomalyType = 'pending_merger';
      else if (hasMarketCapIssue && hasStaleness) anomalyType = 'mixed';
      else if (hasMarketCapIssue) anomalyType = 'market_only';
      else if (hasStaleness || hasAssumption) anomalyType = 'source_update';
      else anomalyType = 'unexplained';

      return { ticker: r.ticker, anomalyType, reasons: r.confidenceReasons };
    }),
  };
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

// Human-readable output
console.log(`\n  DAILY HEALTH CHECK — ${today}`);
console.log(`  ${allCompanies.length} companies\n`);

// Confidence
console.log(`  Confidence:  🟢 ${confCounts.high}  🟡 ${confCounts.medium}  🔴 ${confCounts.low}`);

// Market cap
console.log(`  Market Cap:  shares=${mcSources.shares_based}  override=${mcSources.override}  fallback=${mcSources.fallback}  api=${mcSources.api}`);

// Pipeline
console.log(`  Pipeline:    SEC=${secCovered}  foreign/manual=${foreign}`);

// Assumptions
console.log(`  Assumptions: open=${openAssumptions}  monitoring=${monitoringAssumptions}  overdue=${overdueAssumptions}`);

// Stale items — grouped by field type
if (staleItems.length > 0) {
  console.log(`\n  ⚠️  STALE FIELDS (${staleItems.length}):`);

  const byField: Record<string, StaleItem[]> = {};
  for (const s of staleItems) {
    (byField[s.field] ??= []).push(s);
  }

  const openAssumptionTickers = new Set(
    ASSUMPTIONS.filter(a => a.status !== 'resolved').map(a => a.ticker)
  );

  for (const [field, items] of Object.entries(byField)) {
    items.sort((a, b) => b.ageDays - a.ageDays);
    console.log(`    ${field} (${items.length}):`);
    for (const s of items) {
      const hasAssumption = openAssumptionTickers.has(s.ticker) ? ' [assumption]' : '';
      console.log(`      ${s.ticker}: ${s.ageDays}d (threshold ${s.threshold}d)${hasAssumption}`);
    }
  }
} else {
  console.log(`\n  ✅ No stale fields`);
}

// Low confidence — classified by anomaly type
const lowConf = reviews.filter(r => r.confidence === 'low');
if (lowConf.length > 0) {
  console.log(`\n  🔴 LOW CONFIDENCE (${lowConf.length}):`);

  for (const r of lowConf) {
    const hasMarketCapIssue = r.marketCapSource === 'fallback' || r.marketCapSource === 'override';
    const hasStaleness = r.holdingsAgeDays !== null && r.holdingsAgeDays > STALE_HOLDINGS_DAYS;
    const hasPendingMerger = r.flags.some(f => f.reason.includes('Pending merger'));
    const hasAssumption = r.openAssumptions.some(a => a.sensitivity === 'high');

    let anomalyType: string;
    if (hasPendingMerger) anomalyType = 'pending_merger';
    else if (hasMarketCapIssue && hasStaleness) anomalyType = 'mixed';
    else if (hasMarketCapIssue) anomalyType = 'market_only';
    else if (hasStaleness || hasAssumption) anomalyType = 'source_update';
    else anomalyType = 'unexplained';

    console.log(`    ${r.ticker} [${anomalyType}]: ${r.confidenceReasons.join('; ')}`);
  }
}

// Overdue assumptions
if (overdueAssumptions > 0) {
  console.log(`\n  ⚠️  ${overdueAssumptions} OVERDUE ASSUMPTION REVIEW(S)`);
}

console.log('');

// Exit with error if critical issues
const hasCritical = lowConf.length > 0 || overdueAssumptions > 0;
if (hasCritical) {
  process.exit(1);
}
