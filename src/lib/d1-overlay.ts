import { Company } from '@/lib/types';

export type D1MetricMap = Record<string, Record<string, number>>; // ticker -> metric -> value

/**
 * Overlays D1 latest-metrics values onto enriched Company objects.
 * D1-first with static fallback: `??` preserves D1 `0` (legitimate)
 * but falls back to static when D1 value is undefined.
 *
 * Returns companies unchanged if d1 is null (graceful fallback).
 */
export function applyD1Overlay(companies: Company[], d1: D1MetricMap | null): Company[] {
  if (!d1) return companies;

  return companies.map(c => {
    const metrics = d1[c.ticker];
    if (!metrics) return c;

    return {
      ...c,
      totalDebt:       metrics.debt_usd            ?? c.totalDebt,
      cashReserves:    metrics.cash_usd             ?? c.cashReserves,
      preferredEquity: metrics.preferred_equity_usd ?? c.preferredEquity,
      sharesForMnav:   metrics.basic_shares         ?? c.sharesForMnav,
      // Only override holdings if D1 has a positive holdings_native value
      ...(metrics.holdings_native != null && metrics.holdings_native > 0
        ? { holdings: metrics.holdings_native }
        : {}),
    };
  });
}
