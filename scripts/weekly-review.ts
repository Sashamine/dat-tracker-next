#!/usr/bin/env npx tsx

/**
 * Weekly Review — Single-Command Review Queue
 *
 * Generates a structured review report for a weekly Claude session.
 * Outputs enough context per company that the reviewer does not
 * need to reconstruct it manually.
 *
 * Usage:
 *   npx tsx scripts/weekly-review.ts
 *   npx tsx scripts/weekly-review.ts --ticker=MSTR,CEPO
 */

import { allCompanies } from '../src/lib/data/companies';
import {
  getAllCompanyReviews,
  getReviewQueue,
  type CompanyReviewResult,
  STALE_HOLDINGS_DAYS,
  STALE_BALANCE_SHEET_DAYS,
} from '../src/lib/data/integrity-review';
import { ASSUMPTIONS, ASSUMPTION_REVIEW_MAX_AGE_DAYS } from '../src/lib/data/assumptions';
import { MARKET_CAP_OVERRIDES } from '../src/lib/data/market-cap-overrides';
import { dilutiveInstruments, getEffectiveShares } from '../src/lib/data/dilutive-instruments';
import { MATURITY_ALERT_DAYS } from '../src/lib/data/integrity-review';

// ── CLI args ────────────────────────────────────────────────────────

const tickerArg = process.argv.find(a => a.startsWith('--ticker='));
const tickerFilter = tickerArg
  ? new Set(tickerArg.replace('--ticker=', '').split(',').map(t => t.trim().toUpperCase()))
  : null;

const companies = tickerFilter
  ? allCompanies.filter(c => tickerFilter.has(c.ticker))
  : allCompanies;

// ── Run review ──────────────────────────────────────────────────────

const allReviews = getAllCompanyReviews(companies);
const queue = getReviewQueue(companies);
const today = new Date().toISOString().split('T')[0];

function printSection(title: string, items: CompanyReviewResult[], extraDetail?: (r: CompanyReviewResult) => string[]) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${title} (${items.length})`);
  console.log(`${'─'.repeat(60)}`);

  if (items.length === 0) {
    console.log('  (none)');
    return;
  }

  for (const r of items) {
    const company = companies.find(c => c.ticker === r.ticker);
    if (!company) continue;

    const conf = r.confidence === 'low' ? '🔴' : r.confidence === 'medium' ? '🟡' : '🟢';
    const mcLabel = r.marketCapSource === 'shares_based' ? '' : ` [mcap: ${r.marketCapSource}]`;
    const secLabel = r.isInSecPipeline ? '' : ' [no SEC pipeline]';

    console.log(`\n  ${conf} ${r.ticker} — ${company.name}${mcLabel}${secLabel}`);
    console.log(`     Confidence: ${r.confidence} — ${r.confidenceReasons.join('; ')}`);

    // Age summary
    const ages: string[] = [];
    if (r.holdingsAgeDays !== null) ages.push(`holdings: ${r.holdingsAgeDays}d`);
    if (r.sharesAgeDays !== null) ages.push(`shares: ${r.sharesAgeDays}d`);
    if (r.debtAgeDays !== null) ages.push(`debt: ${r.debtAgeDays}d`);
    if (r.cashAgeDays !== null) ages.push(`cash: ${r.cashAgeDays}d`);
    if (ages.length > 0) console.log(`     Age: ${ages.join(', ')}`);

    // Key metrics
    const metrics: string[] = [];
    if (company.holdings) metrics.push(`holdings: ${company.holdings.toLocaleString()} ${company.asset}`);
    if (company.sharesForMnav) metrics.push(`shares: ${company.sharesForMnav.toLocaleString()}`);
    if (company.totalDebt) metrics.push(`debt: $${(company.totalDebt / 1e6).toFixed(0)}M`);
    if (company.cashReserves) metrics.push(`cash: $${(company.cashReserves / 1e6).toFixed(0)}M`);
    if (company.encumberedHoldings) metrics.push(`encumbered: ${company.encumberedHoldings.toLocaleString()}`);
    if (metrics.length > 0) console.log(`     Data: ${metrics.join(', ')}`);

    // Flags
    const warnings = r.flags.filter(f => f.severity !== 'info');
    for (const f of warnings) {
      const icon = f.severity === 'critical' ? '🔴' : '🟡';
      console.log(`     ${icon} ${f.reason}`);
    }

    // Assumptions
    for (const a of r.openAssumptions) {
      console.log(`     📋 Assumption: ${a.field} — ${a.assumption}`);
      console.log(`        Trigger: ${a.trigger}`);
    }

    // Extra detail from caller
    if (extraDetail) {
      for (const line of extraDetail(r)) {
        console.log(`     ${line}`);
      }
    }
  }
}

// ── Header ──────────────────────────────────────────────────────────

console.log(`\n${'═'.repeat(60)}`);
console.log(`  WEEKLY REVIEW — ${today}`);
console.log(`  ${companies.length} companies analyzed`);
console.log(`${'═'.repeat(60)}`);

// ── Summary ─────────────────────────────────────────────────────────

const byConf = { high: 0, medium: 0, low: 0 };
for (const r of allReviews) byConf[r.confidence]++;

console.log(`\n  Confidence: 🟢 ${byConf.high} high  🟡 ${byConf.medium} medium  🔴 ${byConf.low} low`);
console.log(`  Market Cap: ${allReviews.filter(r => r.marketCapSource === 'shares_based').length} shares-based, ` +
  `${allReviews.filter(r => r.marketCapSource === 'override').length} override, ` +
  `${allReviews.filter(r => r.marketCapSource === 'fallback').length} fallback`);
console.log(`  SEC Pipeline: ${allReviews.filter(r => r.isInSecPipeline).length} covered, ` +
  `${allReviews.filter(r => !r.isInSecPipeline).length} manual/foreign`);
console.log(`  Assumptions: ${ASSUMPTIONS.filter(a => a.status === 'open').length} open, ` +
  `${ASSUMPTIONS.filter(a => a.status === 'monitoring').length} monitoring, ` +
  `${ASSUMPTIONS.filter(a => a.status === 'resolved').length} resolved`);

// ── Section 1: Low Confidence ───────────────────────────────────────

printSection('LOW CONFIDENCE — Requires Review', queue.lowConfidence);

// ── Section 2: Open Assumptions ─────────────────────────────────────

// Deduplicate — show each assumption once, grouped
const assumptionTickers = new Set(queue.withAssumptions.map(r => r.ticker));
const assumptionItems = queue.withAssumptions.filter((r, i, arr) =>
  arr.findIndex(x => x.ticker === r.ticker) === i
);
printSection('OPEN ASSUMPTIONS', assumptionItems);

// ── Section 3: Pending Mergers ──────────────────────────────────────

printSection('PENDING MERGERS', queue.pendingMergers);

// ── Section 4: Foreign / Manual Review ──────────────────────────────

printSection('FOREIGN / MANUAL REVIEW (No SEC Pipeline)', queue.foreignManual);

// ── Section 5: Stale Holdings ───────────────────────────────────────

printSection(`STALE HOLDINGS (>${STALE_HOLDINGS_DAYS}d)`, queue.staleHoldings);

// ── Section 6: Override / Fallback Market Cap ───────────────────────

printSection('OVERRIDE / FALLBACK MARKET CAP', queue.overrideMarketCap);

// ── Section 7: Expiring Instruments ─────────────────────────────────

printSection('INSTRUMENTS EXPIRING WITHIN 90 DAYS', queue.expiringInstruments);

// ── Section 8: Instrument Moneyness & Maturity ───────────────────────

const companiesWithInstruments = companies.filter(c => (dilutiveInstruments[c.ticker]?.length ?? 0) > 0);
if (companiesWithInstruments.length > 0) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  DILUTIVE INSTRUMENT STATUS (${companiesWithInstruments.length} companies)`);
  console.log(`${'─'.repeat(60)}`);

  for (const co of companiesWithInstruments) {
    const instruments = dilutiveInstruments[co.ticker];
    if (!instruments || instruments.length === 0) continue;

    // We don't have live stock prices in this script, so show instrument details
    // and flag maturity proximity
    console.log(`\n  ${co.ticker} — ${instruments.length} instrument(s)`);

    for (const inst of instruments) {
      const parts: string[] = [];
      parts.push(inst.type);
      parts.push(`strike $${inst.strikePrice}`);
      parts.push(`${inst.potentialShares.toLocaleString()} shares`);

      if (inst.faceValue) {
        parts.push(`face $${(inst.faceValue / 1e6).toFixed(0)}M`);
      }

      if (inst.settlementType && inst.settlementType !== 'full_share') {
        parts.push(`settlement: ${inst.settlementType}`);
      }

      // Maturity proximity
      let maturityFlag = '';
      if (inst.expiration) {
        const daysToExpiry = Math.floor((new Date(inst.expiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry < 0) {
          maturityFlag = ' [EXPIRED]';
        } else if (daysToExpiry <= MATURITY_ALERT_DAYS) {
          maturityFlag = ` [MATURES IN ${daysToExpiry}d]`;
        } else {
          parts.push(`expires ${inst.expiration}`);
        }
      }

      console.log(`    ${parts.join(' | ')}${maturityFlag}`);
    }
  }
}

// ── Assumption Age Check ────────────────────────────────────────────

const staleAssumptions = ASSUMPTIONS
  .filter(a => a.status !== 'resolved')
  .filter(a => {
    const age = Math.floor((Date.now() - new Date(a.lastReviewed).getTime()) / (1000 * 60 * 60 * 24));
    return age > ASSUMPTION_REVIEW_MAX_AGE_DAYS;
  });

if (staleAssumptions.length > 0) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ⚠️  OVERDUE ASSUMPTION REVIEWS (${staleAssumptions.length})`);
  console.log(`${'─'.repeat(60)}`);
  for (const a of staleAssumptions) {
    const age = Math.floor((Date.now() - new Date(a.lastReviewed).getTime()) / (1000 * 60 * 60 * 24));
    console.log(`  ${a.ticker}.${a.field}: ${age}d since review (max ${ASSUMPTION_REVIEW_MAX_AGE_DAYS}d)`);
  }
}

// ── Override Inventory ──────────────────────────────────────────────

const overrideCount = Object.keys(MARKET_CAP_OVERRIDES).length;
if (overrideCount > 0) {
  console.log(`\n  ℹ️  ${overrideCount} MARKET_CAP_OVERRIDES active: ${Object.keys(MARKET_CAP_OVERRIDES).join(', ')}`);
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`  END OF WEEKLY REVIEW`);
console.log(`${'═'.repeat(60)}\n`);
