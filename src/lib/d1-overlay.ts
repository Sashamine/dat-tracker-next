import { Company, type HoldingsBasis } from '@/lib/types';

// Re-export so existing `import { HoldingsBasis } from '@/lib/d1-overlay'` continues to work.
export type { HoldingsBasis };

export type D1MetricMap = Record<string, Record<string, number>>; // ticker -> metric -> value
export type D1MetricSourceMap = Record<string, Record<string, string | null>>; // ticker -> metric -> source_url
export type D1MetricDateMap = Record<string, Record<string, string | null>>; // ticker -> metric -> as_of/reported_at

/**
 * Overlays D1 latest-metrics values onto enriched Company objects.
 * D1-first with static fallback: `??` preserves D1 `0` (legitimate)
 * but falls back to static when D1 value is undefined.
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
export function applyD1Overlay(
  companies: Company[],
  d1: D1MetricMap | null,
  sources?: D1MetricSourceMap | null,
  dates?: D1MetricDateMap | null
): Company[] {
  if (!d1) return companies;

  return companies.map(c => {
    const metrics = d1[c.ticker];
    const sourceMap = sources?.[c.ticker];
    const dateMap = dates?.[c.ticker];
    if (!metrics) return c;

    // Track which fields were sourced from D1 (dev-mode debug aid)
    const d1Fields: string[] = [];
    if (metrics.debt_usd            != null) d1Fields.push('totalDebt');
    if (metrics.cash_usd            != null) d1Fields.push('cashReserves');
    if (metrics.preferred_equity_usd != null) d1Fields.push('preferredEquity');
    if (metrics.basic_shares        != null) d1Fields.push('sharesForMnav');

    const hasNative = metrics.holdings_native != null && metrics.holdings_native > 0;
    if (hasNative) d1Fields.push('holdings');

    // Holdings basis: overlay can resolve native_units or static_fallback.
    // The usd_fair_value tier requires live price context and is only used
    // on the company detail page (see getHoldingsBasis helper below).
    const holdingsBasis: HoldingsBasis = hasNative ? 'native_units' : 'static_fallback';

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
      totalDebt:       metrics.debt_usd            ?? c.totalDebt,
      cashReserves:    metrics.cash_usd             ?? c.cashReserves,
      preferredEquity: metrics.preferred_equity_usd ?? c.preferredEquity,
      sharesForMnav:   metrics.basic_shares         ?? c.sharesForMnav,
      sharesAsOf:      metrics.basic_shares != null ? (dateMap?.basic_shares ?? c.sharesAsOf) : c.sharesAsOf,
      debtAsOf:        metrics.debt_usd != null ? (dateMap?.debt_usd ?? c.debtAsOf) : c.debtAsOf,
      cashAsOf:        metrics.cash_usd != null ? (dateMap?.cash_usd ?? c.cashAsOf) : c.cashAsOf,
      _staticCashAsOf: c.cashAsOf,  // Preserve original source date for staleness checks (D1 backfill can stamp carry-forward dates)
      preferredAsOf:   metrics.preferred_equity_usd != null
        ? (dateMap?.preferred_equity_usd ?? c.preferredAsOf)
        : c.preferredAsOf,
      // Prefer D1 receipt URLs where the metric was sourced from D1.
      sharesSourceUrl:   metrics.basic_shares != null ? (sourceMap?.basic_shares ?? c.sharesSourceUrl) : c.sharesSourceUrl,
      debtSourceUrl:     metrics.debt_usd != null ? (sourceMap?.debt_usd ?? c.debtSourceUrl) : c.debtSourceUrl,
      cashSourceUrl:     metrics.cash_usd != null ? (sourceMap?.cash_usd ?? c.cashSourceUrl) : c.cashSourceUrl,
      preferredSourceUrl: metrics.preferred_equity_usd != null
        ? (sourceMap?.preferred_equity_usd ?? c.preferredSourceUrl)
        : c.preferredSourceUrl,
      // Only override holdings if D1 has a positive holdings_native value.
      // bitcoin_holdings_usd is intentionally not used here — see precedence note above.
      ...(hasNative ? { holdings: metrics.holdings_native } : {}),
      ...(hasNative
        ? {
            holdingsSourceUrl: sourceMap?.holdings_native ?? c.holdingsSourceUrl,
            holdingsLastUpdated: dateMap?.holdings_native ?? c.holdingsLastUpdated,
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
