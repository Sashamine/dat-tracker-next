import { Company, type HoldingsBasis } from '@/lib/types';
import { getBaseIncludedShares } from '@/lib/data/dilutive-instruments';

// Re-export so existing `import { HoldingsBasis } from '@/lib/d1-overlay'` continues to work.
export type { HoldingsBasis };

export type D1MetricMap = Record<string, Record<string, number>>; // ticker -> metric -> value
export type D1MetricSourceMap = Record<string, Record<string, string | null>>; // ticker -> metric -> source_url
export type D1MetricDateMap = Record<string, Record<string, string | null>>; // ticker -> metric -> as_of/reported_at
export type D1MetricQuoteMap = Record<string, Record<string, string | null>>; // ticker -> metric -> citation_quote
export type D1MetricSearchTermMap = Record<string, Record<string, string | null>>; // ticker -> metric -> citation_search_term
export type D1MetricAccessionMap = Record<string, Record<string, string | null>>; // ticker -> metric -> artifact accession

/**
 * Pick the most recent value by comparing as_of dates.
 * When both D1 and static have values and dates, the newer one wins.
 * Falls back to D1-first when dates are missing (legacy behavior).
 */
function pickNewest(
  d1Val: number | undefined,
  d1Date: string | null | undefined,
  staticVal: number | undefined,
  staticDate: string | null | undefined,
): { value: number | undefined; isD1: boolean } {
  const hasD1 = d1Val != null;
  const hasStatic = staticVal != null;

  if (!hasD1) return { value: staticVal, isD1: false };
  if (!hasStatic) return { value: d1Val, isD1: true };

  // Both have values — compare dates if available
  if (d1Date && staticDate && staticDate > d1Date) {
    return { value: staticVal, isD1: false };
  }

  // D1 wins by default (dates equal, missing, or D1 is newer)
  return { value: d1Val, isD1: true };
}

/**
 * Overlays D1 latest-metrics values onto enriched Company objects.
 * Date-aware: when both D1 and static have values with dates, the more
 * recent one wins. Falls back to D1-first when dates are unavailable.
 *
 * Holdings precedence (matches company detail page):
 *   1. holdings_native (unit: BTC/ETH/etc) — preferred; USD derived downstream via live price
 *   2. bitcoin_holdings_usd ÷ live price  — NOT applied here (overlay has no price context)
 *   3. companies.ts static value           — automatic fallback when D1 fields are absent
 *
 * The USD÷price fallback (step 2) is only used on the company detail page where
 * live prices are in scope.  Overview pages skip it because getCompanyMNAV()
 * already multiplies company.holdings × live price, so setting the native count
 * is sufficient.
 *
 * Returns companies unchanged if d1 is null (graceful fallback).
 */
/**
 * Build a filing viewer URL from ticker + accession when available.
 * Falls back to the artifact's source_url.
 */
function buildSourceUrl(
  ticker: string,
  sourceUrl: string | null | undefined,
  accession: string | null | undefined,
): string | null {
  // If we have an accession, prefer the internal filing viewer (supports ?q= deep linking)
  if (accession) {
    return `/filings/${ticker.toLowerCase()}/${accession}`;
  }
  return sourceUrl ?? null;
}

export function applyD1Overlay(
  companies: Company[],
  d1: D1MetricMap | null,
  sources?: D1MetricSourceMap | null,
  dates?: D1MetricDateMap | null,
  quotes?: D1MetricQuoteMap | null,
  searchTerms?: D1MetricSearchTermMap | null,
  accessions?: D1MetricAccessionMap | null,
): Company[] {
  if (!d1) return companies;

  return companies.map(c => {
    const metrics = d1[c.ticker];
    const sourceMap = sources?.[c.ticker];
    const dateMap = dates?.[c.ticker];
    const quoteMap = quotes?.[c.ticker];
    const searchTermMap = searchTerms?.[c.ticker];
    const accessionMap = accessions?.[c.ticker];
    if (!metrics) return c;

    // Date-aware picks: use whichever source (D1 or static) is more recent
    const debt = pickNewest(metrics.debt_usd, dateMap?.debt_usd, c.totalDebt, c.debtAsOf);
    const cash = pickNewest(metrics.cash_usd, dateMap?.cash_usd, c.cashReserves, c.cashAsOf);
    const pref = pickNewest(metrics.preferred_equity_usd, dateMap?.preferred_equity_usd, c.preferredEquity, c.preferredAsOf);
    const sharesRaw = pickNewest(metrics.basic_shares, dateMap?.basic_shares, c.sharesForMnav, c.sharesAsOf);
    // When D1 wins for shares, add back pre-funded warrant shares that are
    // included in static sharesForMnav but missing from D1 basic_shares
    // (D1 only tracks SEC XBRL CommonStockSharesOutstanding = common stock).
    const pfwShares = sharesRaw.isD1 ? getBaseIncludedShares(c.ticker) : 0;
    const shares = pfwShares > 0
      ? { value: (sharesRaw.value ?? 0) + pfwShares, isD1: true }
      : sharesRaw;

    // Holdings: D1 must be positive to override
    const d1HoldingsNative = (metrics.holdings_native != null && metrics.holdings_native > 0)
      ? metrics.holdings_native : undefined;
    const holdings = pickNewest(d1HoldingsNative, dateMap?.holdings_native, c.holdings, c.holdingsLastUpdated);

    // Track which fields were sourced from D1 (dev-mode debug aid)
    const d1Fields: string[] = [];
    if (debt.isD1) d1Fields.push('totalDebt');
    if (cash.isD1) d1Fields.push('cashReserves');
    if (pref.isD1) d1Fields.push('preferredEquity');
    if (shares.isD1) d1Fields.push('sharesForMnav');
    if (holdings.isD1) d1Fields.push('holdings');

    // Holdings basis depends on which source won
    const holdingsBasis: HoldingsBasis = holdings.isD1 ? 'native_units' : 'static_fallback';

    // Warn when D1 values diverge significantly from static (>50% = likely stale XBRL)
    const divergenceChecks: [string, number | undefined, number | undefined][] = [
      ['cashReserves', metrics.cash_usd, c.cashReserves],
      ['totalDebt', metrics.debt_usd, c.totalDebt],
      ['preferredEquity', metrics.preferred_equity_usd, c.preferredEquity],
      ['sharesForMnav', metrics.basic_shares, c.sharesForMnav],
    ];
    for (const [field, d1Val, staticVal] of divergenceChecks) {
      if (d1Val != null && staticVal != null && staticVal > 0 && d1Val > 0) {
        const pct = Math.abs((d1Val - staticVal) / staticVal) * 100;
        if (pct > 50) {
          console.warn(`[d1-overlay] ${c.ticker}.${field}: D1=${d1Val} vs static=${staticVal} (${pct.toFixed(0)}% divergence)`);
        }
      }
    }

    const overlaid: Company = {
      ...c,
      totalDebt:       debt.value ?? c.totalDebt,
      cashReserves:    cash.value ?? c.cashReserves,
      preferredEquity: pref.value ?? c.preferredEquity,
      sharesForMnav:   shares.value ?? c.sharesForMnav,
      sharesAsOf:      shares.isD1 ? (dateMap?.basic_shares ?? c.sharesAsOf) : c.sharesAsOf,
      debtAsOf:        debt.isD1 ? (dateMap?.debt_usd ?? c.debtAsOf) : c.debtAsOf,
      cashAsOf:        cash.isD1 ? (dateMap?.cash_usd ?? c.cashAsOf) : c.cashAsOf,
      _staticCashAsOf: c.cashAsOf,  // Preserve original source date for staleness checks (D1 backfill can stamp carry-forward dates)
      preferredAsOf:   pref.isD1 ? (dateMap?.preferred_equity_usd ?? c.preferredAsOf) : c.preferredAsOf,
      // Prefer D1 receipt URLs and citation quotes where the metric was sourced from D1.
      // When accession is available, build internal filing viewer URL for ?q= deep linking.
      sharesSourceUrl:   shares.isD1 ? (buildSourceUrl(c.ticker, sourceMap?.basic_shares, accessionMap?.basic_shares) ?? c.sharesSourceUrl) : c.sharesSourceUrl,
      sharesSourceQuote: shares.isD1 ? (quoteMap?.basic_shares ?? c.sharesSourceQuote) : c.sharesSourceQuote,
      sharesSearchTerm:  shares.isD1 ? (searchTermMap?.basic_shares ?? c.sharesSearchTerm) : c.sharesSearchTerm,
      debtSourceUrl:     debt.isD1 ? (buildSourceUrl(c.ticker, sourceMap?.debt_usd, accessionMap?.debt_usd) ?? c.debtSourceUrl) : c.debtSourceUrl,
      debtSourceQuote:   debt.isD1 ? (quoteMap?.debt_usd ?? c.debtSourceQuote) : c.debtSourceQuote,
      debtSearchTerm:    debt.isD1 ? (searchTermMap?.debt_usd ?? c.debtSearchTerm) : c.debtSearchTerm,
      cashSourceUrl:     cash.isD1 ? (buildSourceUrl(c.ticker, sourceMap?.cash_usd, accessionMap?.cash_usd) ?? c.cashSourceUrl) : c.cashSourceUrl,
      cashSourceQuote:   cash.isD1 ? (quoteMap?.cash_usd ?? c.cashSourceQuote) : c.cashSourceQuote,
      cashSearchTerm:    cash.isD1 ? (searchTermMap?.cash_usd ?? c.cashSearchTerm) : c.cashSearchTerm,
      preferredSourceUrl: pref.isD1 ? (buildSourceUrl(c.ticker, sourceMap?.preferred_equity_usd, accessionMap?.preferred_equity_usd) ?? c.preferredSourceUrl) : c.preferredSourceUrl,
      preferredSourceQuote: pref.isD1 ? (quoteMap?.preferred_equity_usd ?? c.preferredSourceQuote) : c.preferredSourceQuote,
      preferredSearchTerm: pref.isD1 ? (searchTermMap?.preferred_equity_usd ?? c.preferredSearchTerm) : c.preferredSearchTerm,
      ...(holdings.isD1 ? { holdings: holdings.value } : {}),
      ...(holdings.isD1
        ? {
            holdingsSourceUrl: buildSourceUrl(c.ticker, sourceMap?.holdings_native, accessionMap?.holdings_native) ?? c.holdingsSourceUrl,
            holdingsLastUpdated: dateMap?.holdings_native ?? c.holdingsLastUpdated,
            sourceQuote: quoteMap?.holdings_native ?? c.sourceQuote,
            sourceSearchTerm: searchTermMap?.holdings_native ?? c.sourceSearchTerm,
          }
        : {}),
      // Overlay metadata (typed on Company interface)
      _d1Fields: d1Fields.length > 0 ? d1Fields : undefined,
      holdingsBasis,
    };

    // Dev-only invariant: native_units basis implies positive holdings
    if (process.env.NODE_ENV === 'development' && holdingsBasis === 'native_units' && overlaid.holdings <= 0) {
      console.warn(`[d1-overlay] ${c.ticker}: holdingsBasis=native_units but holdings=${overlaid.holdings}`);
    }

    return overlaid;
  });
}

/**
 * Determine holdings basis using full 3-tier precedence (company page context).
 * Requires D1 metric values from useCompanyD1Latest.
 */
export function getHoldingsBasis(
  d1HoldingsNative: number | undefined,
  d1HoldingsUsd: number | undefined,
): HoldingsBasis {
  if (typeof d1HoldingsNative === 'number' && d1HoldingsNative > 0) return 'native_units';
  if (typeof d1HoldingsUsd === 'number' && d1HoldingsUsd > 0) return 'usd_fair_value';
  return 'static_fallback';
}

/** Human-readable label for a HoldingsBasis value. */
export const HOLDINGS_BASIS_LABEL: Record<HoldingsBasis, string> = {
  native_units:    'D1 native',
  usd_fair_value:  'D1 USD÷price',
  static_fallback: 'static',
};
