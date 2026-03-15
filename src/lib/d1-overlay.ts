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
 * Build a filing viewer URL from ticker + accession when available.
 * Falls back to the artifact's source_url.
 */
function buildSourceUrl(
  ticker: string,
  sourceUrl: string | null | undefined,
  accession: string | null | undefined,
): string | null {
  if (accession) {
    return `/filings/${ticker.toLowerCase()}/${accession}`;
  }
  return sourceUrl ?? null;
}

/**
 * Overlays D1 latest-metrics values onto enriched Company objects.
 *
 * D1 is the single source of truth (Phase 4). When D1 has a value for a field,
 * it wins unconditionally. Static values from companies.ts serve only as
 * fallback when D1 has no data for a given metric.
 *
 * Holdings precedence:
 *   1. holdings_native (unit: BTC/ETH/etc) — preferred; USD derived downstream via live price
 *   2. companies.ts static value — fallback when D1 field is absent
 *
 * Returns companies unchanged if d1 is null (graceful fallback when D1 API is unavailable).
 */
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

    // D1 is primary — use D1 values when available, static as fallback
    const hasD1Debt = metrics.debt_usd != null;
    const hasD1Cash = metrics.cash_usd != null;
    const hasD1Pref = metrics.preferred_equity_usd != null;
    const hasD1Shares = metrics.basic_shares != null;
    const hasD1Holdings = metrics.holdings_native != null && metrics.holdings_native > 0;

    // Shares: when D1 provides basic_shares, add back pre-funded warrant shares
    // that D1 doesn't track (D1 only has SEC XBRL CommonStockSharesOutstanding).
    // Guard: if D1 basic_shares ≈ static sharesForMnav (within 1%), D1 already
    // includes PFW shares — skip add-back to avoid double-count.
    let sharesValue = hasD1Shares ? metrics.basic_shares : c.sharesForMnav;
    const sharesIsD1 = hasD1Shares;
    if (hasD1Shares) {
      const pfwSharesRaw = getBaseIncludedShares(c.ticker);
      if (pfwSharesRaw > 0 && c.sharesForMnav) {
        const pctDiff = Math.abs((metrics.basic_shares - c.sharesForMnav) / c.sharesForMnav) * 100;
        if (pctDiff <= 1) {
          console.warn(`[d1-overlay] ${c.ticker}: D1 basic_shares (${metrics.basic_shares.toLocaleString()}) ≈ sharesForMnav (${c.sharesForMnav.toLocaleString()}) — skipping PFW add-back to avoid double-count`);
        } else {
          sharesValue = metrics.basic_shares + pfwSharesRaw;
        }
      }
    }

    // Track which fields were sourced from D1 (dev-mode debug aid)
    const d1Fields: string[] = [];
    if (hasD1Debt) d1Fields.push('totalDebt');
    if (hasD1Cash) d1Fields.push('cashReserves');
    if (hasD1Pref) d1Fields.push('preferredEquity');
    if (sharesIsD1) d1Fields.push('sharesForMnav');
    if (hasD1Holdings) d1Fields.push('holdings');

    const holdingsBasis: HoldingsBasis = hasD1Holdings ? 'native_units' : 'static_fallback';

    // Log D1 vs static divergences for monitoring (>5% = one source is wrong)
    const pfwSharesForCheck = getBaseIncludedShares(c.ticker);
    const staticSharesForCheck = (c.sharesForMnav || 0) - pfwSharesForCheck;

    const divergences: Array<{ field: string; d1: number; static: number; pct: number }> = [];
    const divergenceChecks: [string, number | undefined, number | undefined][] = [
      ['cashReserves', metrics.cash_usd, c.cashReserves],
      ['totalDebt', metrics.debt_usd, c.totalDebt],
      ['preferredEquity', metrics.preferred_equity_usd, c.preferredEquity],
      ['sharesForMnav', metrics.basic_shares, staticSharesForCheck > 0 ? staticSharesForCheck : c.sharesForMnav],
      ['holdings', metrics.holdings_native, c.holdings],
    ];
    for (const [field, d1Val, staticVal] of divergenceChecks) {
      if (d1Val != null && staticVal != null && staticVal > 0 && d1Val > 0) {
        const pct = Math.abs((d1Val - staticVal) / staticVal) * 100;
        if (pct > 5) {
          divergences.push({ field, d1: d1Val, static: staticVal, pct: Math.round(pct) });
          console.warn(`[d1-overlay] ${c.ticker}.${field}: D1=${d1Val} vs static=${staticVal} (${pct.toFixed(0)}% divergence)`);
        }
      }
    }

    const overlaid: Company = {
      ...c,
      totalDebt:       hasD1Debt ? metrics.debt_usd : c.totalDebt,
      cashReserves:    hasD1Cash ? metrics.cash_usd : c.cashReserves,
      preferredEquity: hasD1Pref ? metrics.preferred_equity_usd : c.preferredEquity,
      sharesForMnav:   sharesValue ?? c.sharesForMnav,
      sharesAsOf:      sharesIsD1 ? (dateMap?.basic_shares ?? c.sharesAsOf) : c.sharesAsOf,
      debtAsOf:        hasD1Debt ? (dateMap?.debt_usd ?? c.debtAsOf) : c.debtAsOf,
      cashAsOf:        hasD1Cash ? (dateMap?.cash_usd ?? c.cashAsOf) : c.cashAsOf,
      _staticCashAsOf: c.cashAsOf,
      preferredAsOf:   hasD1Pref ? (dateMap?.preferred_equity_usd ?? c.preferredAsOf) : c.preferredAsOf,
      // D1 citation chain (source URLs, quotes, search terms)
      sharesSourceUrl:   sharesIsD1 ? (buildSourceUrl(c.ticker, sourceMap?.basic_shares, accessionMap?.basic_shares) ?? c.sharesSourceUrl) : c.sharesSourceUrl,
      sharesSourceQuote: sharesIsD1 ? (quoteMap?.basic_shares ?? c.sharesSourceQuote) : c.sharesSourceQuote,
      sharesSearchTerm:  sharesIsD1 ? (searchTermMap?.basic_shares ?? c.sharesSearchTerm) : c.sharesSearchTerm,
      debtSourceUrl:     hasD1Debt ? (buildSourceUrl(c.ticker, sourceMap?.debt_usd, accessionMap?.debt_usd) ?? c.debtSourceUrl) : c.debtSourceUrl,
      debtSourceQuote:   hasD1Debt ? (quoteMap?.debt_usd ?? c.debtSourceQuote) : c.debtSourceQuote,
      debtSearchTerm:    hasD1Debt ? (searchTermMap?.debt_usd ?? c.debtSearchTerm) : c.debtSearchTerm,
      cashSourceUrl:     hasD1Cash ? (buildSourceUrl(c.ticker, sourceMap?.cash_usd, accessionMap?.cash_usd) ?? c.cashSourceUrl) : c.cashSourceUrl,
      cashSourceQuote:   hasD1Cash ? (quoteMap?.cash_usd ?? c.cashSourceQuote) : c.cashSourceQuote,
      cashSearchTerm:    hasD1Cash ? (searchTermMap?.cash_usd ?? c.cashSearchTerm) : c.cashSearchTerm,
      preferredSourceUrl: hasD1Pref ? (buildSourceUrl(c.ticker, sourceMap?.preferred_equity_usd, accessionMap?.preferred_equity_usd) ?? c.preferredSourceUrl) : c.preferredSourceUrl,
      preferredSourceQuote: hasD1Pref ? (quoteMap?.preferred_equity_usd ?? c.preferredSourceQuote) : c.preferredSourceQuote,
      preferredSearchTerm: hasD1Pref ? (searchTermMap?.preferred_equity_usd ?? c.preferredSearchTerm) : c.preferredSearchTerm,
      ...(hasD1Holdings ? { holdings: metrics.holdings_native } : {}),
      ...(hasD1Holdings
        ? {
            holdingsSourceUrl: buildSourceUrl(c.ticker, sourceMap?.holdings_native, accessionMap?.holdings_native) ?? c.holdingsSourceUrl,
            holdingsLastUpdated: dateMap?.holdings_native ?? c.holdingsLastUpdated,
            sourceQuote: quoteMap?.holdings_native ?? c.sourceQuote,
            sourceSearchTerm: searchTermMap?.holdings_native ?? c.sourceSearchTerm,
          }
        : {}),
      // Overlay metadata
      _d1Fields: d1Fields.length > 0 ? d1Fields : undefined,
      _d1Divergences: divergences.length > 0 ? divergences : undefined,
      holdingsBasis,
    };

    // Dev-only invariant: native_units basis implies positive holdings
    if (process.env.NODE_ENV === 'development' && holdingsBasis === 'native_units' && overlaid.holdings <= 0) {
      console.warn(`[d1-overlay] ${c.ticker}: holdingsBasis=native_units but holdings=${overlaid.holdings}`);
    }

    // Post-overlay invariant: final shares should not exceed both inputs by >10%
    if (sharesIsD1 && metrics.basic_shares != null && c.sharesForMnav) {
      const finalShares = overlaid.sharesForMnav ?? 0;
      const maxInput = Math.max(metrics.basic_shares, c.sharesForMnav);
      if (finalShares > maxInput * 1.1) {
        console.warn(
          `[d1-overlay] ${c.ticker}: overlaid shares (${finalShares.toLocaleString()}) exceed both D1 (${metrics.basic_shares.toLocaleString()}) and static (${c.sharesForMnav.toLocaleString()}) by >10% — possible double-count`
        );
      }
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
