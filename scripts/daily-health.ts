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
import { ASSUMPTIONS } from '../src/lib/data/assumptions';

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
    return age > 90;
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
    lowConfidence: reviews.filter(r => r.confidence === 'low').map(r => ({
      ticker: r.ticker,
      reasons: r.confidenceReasons,
    })),
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

// Stale items
if (staleItems.length > 0) {
  console.log(`\n  ⚠️  STALE FIELDS (${staleItems.length}):`);
  // Sort by age descending
  staleItems.sort((a, b) => b.ageDays - a.ageDays);
  for (const s of staleItems) {
    console.log(`    ${s.ticker}.${s.field}: ${s.ageDays}d (threshold ${s.threshold}d)`);
  }
} else {
  console.log(`\n  ✅ No stale fields`);
}

// Low confidence
const lowConf = reviews.filter(r => r.confidence === 'low');
if (lowConf.length > 0) {
  console.log(`\n  🔴 LOW CONFIDENCE (${lowConf.length}):`);
  for (const r of lowConf) {
    console.log(`    ${r.ticker}: ${r.confidenceReasons.join('; ')}`);
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
