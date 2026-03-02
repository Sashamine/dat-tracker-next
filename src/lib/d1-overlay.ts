import { Company } from '@/lib/types';

export type D1MetricMap = Record<string, Record<string, number>>; // ticker -> metric -> value

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
export function applyD1Overlay(companies: Company[], d1: D1MetricMap | null): Company[] {
  if (!d1) return companies;

  return companies.map(c => {
    const metrics = d1[c.ticker];
    if (!metrics) return c;

    // Track which fields were sourced from D1 (dev-mode debug aid)
    const d1Fields: string[] = [];
    if (metrics.debt_usd            != null) d1Fields.push('totalDebt');
    if (metrics.cash_usd            != null) d1Fields.push('cashReserves');
    if (metrics.preferred_equity_usd != null) d1Fields.push('preferredEquity');
    if (metrics.basic_shares        != null) d1Fields.push('sharesForMnav');
    if (metrics.holdings_native != null && metrics.holdings_native > 0) d1Fields.push('holdings');

    return {
      ...c,
      totalDebt:       metrics.debt_usd            ?? c.totalDebt,
      cashReserves:    metrics.cash_usd             ?? c.cashReserves,
      preferredEquity: metrics.preferred_equity_usd ?? c.preferredEquity,
      sharesForMnav:   metrics.basic_shares         ?? c.sharesForMnav,
      // Only override holdings if D1 has a positive holdings_native value.
      // bitcoin_holdings_usd is intentionally not used here — see precedence note above.
      ...(metrics.holdings_native != null && metrics.holdings_native > 0
        ? { holdings: metrics.holdings_native }
        : {}),
      // Debug metadata — not part of the Company type, accessed via (company as any)._d1Fields
      _d1Fields: d1Fields.length > 0 ? d1Fields : undefined,
    } as Company;
  });
}
