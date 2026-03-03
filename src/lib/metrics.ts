/** Canonical D1 metric names used for balance sheet + holdings overlays. */
export const CORE_D1_METRICS = [
  'cash_usd',
  'debt_usd',
  'preferred_equity_usd',
  'basic_shares',
  'bitcoin_holdings_usd',
  'holdings_native',
] as const;

export type CoreD1Metric = (typeof CORE_D1_METRICS)[number];

/**
 * Extended metrics for the company detail history chart.
 * Superset of CORE_D1_METRICS plus restricted_cash and other_investments.
 */
export const HISTORY_D1_METRICS = [
  ...CORE_D1_METRICS,
  'restricted_cash_usd',
  'other_investments_usd',
] as const;

export type HistoryD1Metric = (typeof HISTORY_D1_METRICS)[number];
