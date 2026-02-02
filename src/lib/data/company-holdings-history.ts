/**
 * Central registry for company holdings history
 * 
 * This module provides a unified interface for looking up historical
 * BTC holdings for companies that have tracked purchase history.
 */

import { getHoldingsAsOf as getANAPHoldings } from "./anap-holdings-history";
import { getHoldingsAsOf as getRemixpointHoldings } from "./remixpoint-holdings-history";
import { getHoldingsAsOf as getDDCHoldings } from "./ddc-holdings-history";

// Map of tickers to their holdings history lookup functions
const HOLDINGS_HISTORY_FUNCTIONS: Record<string, (date: string) => number> = {
  "3189.T": getANAPHoldings,
  "3825.T": getRemixpointHoldings,
  "DDC": getDDCHoldings,
  // Add more companies here as we build their histories:
  // "SWC": getSWCHoldings,
  // "3350.T": getMetaplanetHoldings,
};

/**
 * Check if a company has historical holdings data
 */
export function hasHoldingsHistory(ticker: string): boolean {
  return ticker in HOLDINGS_HISTORY_FUNCTIONS;
}

/**
 * Get holdings for a company at a specific date
 * Returns null if no historical data is available
 */
export function getHistoricalHoldings(ticker: string, date: string): number | null {
  const lookupFn = HOLDINGS_HISTORY_FUNCTIONS[ticker];
  if (!lookupFn) return null;
  return lookupFn(date);
}

/**
 * Get holdings for multiple dates (for charting)
 */
export function getHoldingsTimeSeries(
  ticker: string, 
  dates: string[]
): { date: string; holdings: number }[] {
  const lookupFn = HOLDINGS_HISTORY_FUNCTIONS[ticker];
  if (!lookupFn) return [];
  
  return dates.map(date => ({
    date,
    holdings: lookupFn(date),
  }));
}
