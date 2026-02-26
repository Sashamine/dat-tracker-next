import { getCorporateActions, type LatestDatapointRow } from '@/lib/d1';
import { normalizeShares, normalizePrice } from '@/lib/corporate-actions';

/**
 * Normalize latest_datapoints rows into a consistent split-proof basis.
 *
 * basis='current': convert historical shares to current share basis, and convert
 * historical prices to current price basis (so marketCap stays invariant).
 */
export async function normalizeLatestRowsForTicker(
  ticker: string,
  rows: LatestDatapointRow[],
  basis: 'current' | 'historical' = 'current'
): Promise<LatestDatapointRow[]> {
  const actions = await getCorporateActions(ticker);

  return rows.map(r => {
    if (r.metric !== 'basic_shares') return r;
    const asOf = (r.as_of || r.reported_at || r.created_at || '').slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return r;

    return {
      ...r,
      value: normalizeShares(r.value, actions, asOf, basis),
      // Keep provenance in flags_json? not changing schema for now.
    };
  });
}

export async function normalizePriceForTicker(
  ticker: string,
  price: number,
  asOf: string,
  basis: 'current' | 'historical' = 'current'
): Promise<number> {
  const actions = await getCorporateActions(ticker);
  return normalizePrice(price, actions, asOf, basis);
}
