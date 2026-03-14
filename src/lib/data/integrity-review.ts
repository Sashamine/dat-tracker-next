/**
 * Integrity Review — Shared Risk Classification
 *
 * Single canonical source for company confidence, staleness,
 * market-cap source classification, and review queue logic.
 *
 * Used by: weekly-review.ts, daily-health.ts, monthly-reconciliation.ts,
 * and any future integrity tests.
 *
 * Do NOT duplicate these rules elsewhere.
 */

import type { Company } from '@/lib/types';
import { ASSUMPTIONS, ASSUMPTION_REVIEW_MAX_AGE_DAYS, type Assumption } from './assumptions';
import { MARKET_CAP_OVERRIDES } from './market-cap-overrides';
import { FALLBACK_STOCKS } from './market-cap-overrides';
import { dilutiveInstruments, type DilutiveInstrument } from './dilutive-instruments';
import { TICKER_TO_CIK } from '@/lib/sec/sec-edgar';

// ── Thresholds ──────────────────────────────────────────────────────

/** Holdings older than this are considered stale. */
export const STALE_HOLDINGS_DAYS = 90;

/** Balance sheet fields older than this are considered stale. */
export const STALE_BALANCE_SHEET_DAYS = 120;

/** Holdings older than this are critically stale. */
export const CRITICAL_STALE_DAYS = 180;

/** Foreign company holdings older than this trigger review. */
export const FOREIGN_REVIEW_STALE_DAYS = 60;

/** Convertibles maturing within this window are flagged. */
export const MATURITY_ALERT_DAYS = 90;

// ── Cadence-Aware Staleness ─────────────────────────────────────────

/**
 * Expected update cadence by holdings source type.
 * Used to suppress false-positive staleness alerts for companies
 * that update on known schedules (e.g., quarterly SEC filers).
 *
 * Values represent the number of days after which data is "overdue"
 * (expected cadence + reasonable buffer).
 */
export const CADENCE_DAYS: Record<string, number> = {
  'sec-filing':         120,  // Quarterly + 30d filing deadline
  'regulatory-filing':  120,  // Foreign quarterly filings
  'company-dashboard':  45,   // Real-time dashboards (Metaplanet, SBET)
  'company-website':    60,   // Company websites updated periodically
  'press-release':      90,   // Ad-hoc, no fixed schedule
  'company-reported':   90,
  'on-chain':           30,   // Should always be fresh
  'aggregator':         60,
  'manual':             90,
  'interpolated':       90,
};

/**
 * Per-ticker overrides when the source type alone isn't enough.
 * e.g., MSTR updates weekly via 8-K, not just quarterly.
 */
export const TICKER_CADENCE_OVERRIDES: Record<string, number> = {
  'MSTR':    30,   // Weekly 8-K BTC updates
  '3350.T':  30,   // TDnet filings (frequent share issuances)
};

/**
 * Get the expected staleness threshold for a company's holdings.
 * Returns the number of days after which the data should be considered overdue.
 */
export function getHoldingsCadenceDays(company: Company): number {
  // Ticker-specific override first
  if (company.ticker in TICKER_CADENCE_OVERRIDES) {
    return TICKER_CADENCE_OVERRIDES[company.ticker];
  }
  // Source-type based cadence
  if (company.holdingsSource && company.holdingsSource in CADENCE_DAYS) {
    return CADENCE_DAYS[company.holdingsSource];
  }
  // Default
  return STALE_HOLDINGS_DAYS;
}

// ── Types ───────────────────────────────────────────────────────────

export type Confidence = 'high' | 'medium' | 'low';

export type MarketCapSource =
  | 'shares_based'  // sharesForMnav × price (best)
  | 'override'      // MARKET_CAP_OVERRIDES (manual, may be stale)
  | 'fallback'      // FALLBACK_STOCKS (last resort)
  | 'api';          // FMP API with no sharesForMnav (unreliable for non-USD)

export interface ReviewFlag {
  category: string;
  reason: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface CompanyReviewResult {
  ticker: string;
  confidence: Confidence;
  confidenceReasons: string[];
  marketCapSource: MarketCapSource;
  flags: ReviewFlag[];
  openAssumptions: Assumption[];
  isInSecPipeline: boolean;
  isForeignManualReview: boolean;
  holdingsAgeDays: number | null;
  sharesAgeDays: number | null;
  debtAgeDays: number | null;
  cashAgeDays: number | null;
  /** Expected update cadence for this company's holdings (days). */
  holdingsCadenceDays: number;
  /** True if holdings are older than expected cadence (actually overdue, not just stale). */
  holdingsOverdue: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────

function daysSince(isoDate: string | undefined | null): number | null {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Public API ──────────────────────────────────────────────────────

/**
 * Classify market cap source for a company.
 */
export function getMarketCapSource(company: Company): MarketCapSource {
  if (company.ticker in MARKET_CAP_OVERRIDES) return 'override';
  if (company.ticker in FALLBACK_STOCKS) {
    // If they also have sharesForMnav, shares_based takes precedence
    if (company.sharesForMnav && company.sharesForMnav > 0) return 'shares_based';
    return 'fallback';
  }
  if (company.sharesForMnav && company.sharesForMnav > 0) return 'shares_based';
  return 'api';
}

/**
 * Check if a company is covered by the SEC auto-update pipeline.
 */
export function isInSecPipeline(company: Company): boolean {
  return company.ticker.toUpperCase() in TICKER_TO_CIK;
}

/**
 * Check if a company needs manual/foreign review (outside SEC pipeline).
 */
export function shouldReviewForeignCompany(company: Company, today?: Date): boolean {
  if (isInSecPipeline(company)) return false;
  const age = daysSince(company.holdingsLastUpdated);
  if (age !== null && age > FOREIGN_REVIEW_STALE_DAYS) return true;
  // Always flag non-SEC companies for awareness even if fresh
  return true;
}

/**
 * Get all open/monitoring assumptions for a ticker.
 */
export function getOpenAssumptions(ticker: string): Assumption[] {
  return ASSUMPTIONS.filter(a => a.ticker === ticker && a.status !== 'resolved');
}

/**
 * Get convertibles maturing within the alert window.
 */
export function getExpiringInstruments(ticker: string, withinDays: number = MATURITY_ALERT_DAYS): DilutiveInstrument[] {
  const instruments = dilutiveInstruments[ticker] || [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + withinDays);

  return instruments.filter(i => {
    if (!i.expiration) return false;
    const exp = new Date(i.expiration);
    return exp.getTime() <= cutoff.getTime() && exp.getTime() > Date.now();
  });
}

/**
 * Full review classification for a single company.
 * This is the canonical confidence + flags computation.
 */
export function getCompanyReview(company: Company): CompanyReviewResult {
  const flags: ReviewFlag[] = [];
  const confidenceReasons: string[] = [];
  const ticker = company.ticker;

  // ── Age calculations ────────────────────────────────────────────
  const holdingsAge = daysSince(company.holdingsLastUpdated);
  const sharesAge = daysSince(company.sharesAsOf);
  const debtAge = daysSince(company.debtAsOf);
  const cashAge = daysSince(company.cashAsOf);

  // ── Market cap source ───────────────────────────────────────────
  const mcSource = getMarketCapSource(company);

  // ── SEC pipeline coverage ───────────────────────────────────────
  const inSec = isInSecPipeline(company);
  const isForeign = !inSec;

  // ── Assumptions ─────────────────────────────────────────────────
  const openAssumptions = getOpenAssumptions(ticker);
  const highSensitivityAssumptions = openAssumptions.filter(a => a.sensitivity === 'high');

  // ── Flags ───────────────────────────────────────────────────────

  // Holdings staleness
  if (holdingsAge !== null && holdingsAge > CRITICAL_STALE_DAYS) {
    flags.push({ category: 'staleness', reason: `Holdings ${holdingsAge}d stale (>${CRITICAL_STALE_DAYS}d)`, severity: 'critical' });
    confidenceReasons.push(`holdings critically stale (${holdingsAge}d)`);
  } else if (holdingsAge !== null && holdingsAge > STALE_HOLDINGS_DAYS) {
    flags.push({ category: 'staleness', reason: `Holdings ${holdingsAge}d stale (>${STALE_HOLDINGS_DAYS}d)`, severity: 'warning' });
  }

  // Balance sheet staleness
  for (const [field, age] of [['shares', sharesAge], ['debt', debtAge], ['cash', cashAge]] as const) {
    if (age !== null && age > STALE_BALANCE_SHEET_DAYS) {
      flags.push({ category: 'staleness', reason: `${field} ${age}d stale (>${STALE_BALANCE_SHEET_DAYS}d)`, severity: 'warning' });
    }
  }

  // Market cap source quality
  if (mcSource === 'fallback') {
    flags.push({ category: 'market_cap', reason: 'Using FALLBACK_STOCKS (last resort)', severity: 'critical' });
    confidenceReasons.push('fallback market cap');
  } else if (mcSource === 'override') {
    flags.push({ category: 'market_cap', reason: 'Using MARKET_CAP_OVERRIDES (manual)', severity: 'warning' });
    confidenceReasons.push('override market cap');
  } else if (mcSource === 'api') {
    flags.push({ category: 'market_cap', reason: 'No sharesForMnav; using API market cap', severity: 'info' });
  }

  // Pending merger
  if (company.pendingMerger) {
    flags.push({ category: 'structure', reason: 'Pending merger — holdings/shares may change materially', severity: 'critical' });
    confidenceReasons.push('pending merger');
  }

  // Encumbered holdings
  if (company.encumberedHoldings && company.encumberedHoldings > 0) {
    flags.push({ category: 'structure', reason: `${company.encumberedHoldings.toLocaleString()} ${company.asset} encumbered`, severity: 'info' });
  }

  // Assumptions
  if (highSensitivityAssumptions.length > 0) {
    for (const a of highSensitivityAssumptions) {
      flags.push({ category: 'assumption', reason: `High-sensitivity: ${a.field} — ${a.assumption}`, severity: 'warning' });
    }
    confidenceReasons.push(`${highSensitivityAssumptions.length} high-sensitivity assumption(s)`);
  }

  // Foreign / manual review
  if (isForeign) {
    flags.push({ category: 'coverage', reason: 'Not in SEC auto-update pipeline', severity: 'info' });
    if (holdingsAge !== null && holdingsAge > FOREIGN_REVIEW_STALE_DAYS) {
      flags.push({ category: 'coverage', reason: `Foreign company: holdings ${holdingsAge}d stale (>${FOREIGN_REVIEW_STALE_DAYS}d)`, severity: 'warning' });
    }
  }

  // Expiring instruments
  const expiring = getExpiringInstruments(ticker);
  if (expiring.length > 0) {
    for (const inst of expiring) {
      flags.push({
        category: 'dilution',
        reason: `${inst.type} expires ${inst.expiration} (${inst.notes || `strike $${inst.strikePrice}`})`,
        severity: 'warning',
      });
    }
  }

  // ── Confidence ──────────────────────────────────────────────────

  let confidence: Confidence = 'high';

  // Low confidence triggers
  const isLow =
    (holdingsAge !== null && holdingsAge > CRITICAL_STALE_DAYS) ||
    mcSource === 'fallback' ||
    highSensitivityAssumptions.length > 0 ||
    company.pendingMerger === true;

  // Medium confidence triggers
  const isMedium =
    (holdingsAge !== null && holdingsAge > STALE_HOLDINGS_DAYS) ||
    mcSource === 'override' ||
    openAssumptions.filter(a => a.sensitivity !== 'high').length > 0;

  if (isLow) confidence = 'low';
  else if (isMedium) confidence = 'medium';

  if (confidence === 'high' && confidenceReasons.length === 0) {
    confidenceReasons.push('current filings, shares-based market cap, no open assumptions');
  }

  // Flag low-confidence companies with no assumption explaining why
  if (confidence === 'low' && openAssumptions.length === 0 && !company.pendingMerger) {
    flags.push({
      category: 'coverage',
      reason: 'Low confidence with no open assumption — add one to track resolution',
      severity: 'critical',
    });
  }

  // ── Cadence ───────────────────────────────────────────────────────
  const cadenceDays = getHoldingsCadenceDays(company);
  const holdingsOverdue = holdingsAge !== null && holdingsAge > cadenceDays;

  return {
    ticker,
    confidence,
    confidenceReasons,
    marketCapSource: mcSource,
    flags,
    openAssumptions,
    isInSecPipeline: inSec,
    isForeignManualReview: isForeign,
    holdingsAgeDays: holdingsAge,
    sharesAgeDays: sharesAge,
    debtAgeDays: debtAge,
    cashAgeDays: cashAge,
    holdingsCadenceDays: cadenceDays,
    holdingsOverdue,
  };
}

/**
 * Get review results for all companies.
 */
export function getAllCompanyReviews(companies: Company[]): CompanyReviewResult[] {
  return companies.map(getCompanyReview);
}

/**
 * Get companies that should appear in the weekly review queue.
 */
export function getReviewQueue(companies: Company[]): {
  lowConfidence: CompanyReviewResult[];
  withAssumptions: CompanyReviewResult[];
  foreignManual: CompanyReviewResult[];
  pendingMergers: CompanyReviewResult[];
  expiringInstruments: CompanyReviewResult[];
  staleHoldings: CompanyReviewResult[];
  overrideMarketCap: CompanyReviewResult[];
} {
  const all = getAllCompanyReviews(companies);

  return {
    lowConfidence: all.filter(r => r.confidence === 'low'),
    withAssumptions: all.filter(r => r.openAssumptions.length > 0),
    foreignManual: all.filter(r => r.isForeignManualReview),
    pendingMergers: all.filter(r => r.flags.some(f => f.category === 'structure' && f.reason.includes('Pending merger'))),
    expiringInstruments: all.filter(r => r.flags.some(f => f.category === 'dilution')),
    staleHoldings: all.filter(r => r.holdingsAgeDays !== null && r.holdingsAgeDays > STALE_HOLDINGS_DAYS),
    overrideMarketCap: all.filter(r => r.marketCapSource === 'override' || r.marketCapSource === 'fallback'),
  };
}
