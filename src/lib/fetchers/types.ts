/**
 * Fetcher Types
 *
 * Standardized interfaces for all data fetchers.
 * Each fetcher returns FetchResult[] for comparison engine.
 */

export type FetchField = 'holdings' | 'shares_outstanding' | 'debt' | 'cash' | 'preferred_equity' | 'mnav';

/**
 * What a fetcher returns for each data point
 */
export interface FetchResult {
  ticker: string;
  field: FetchField;
  value: number;
  source: {
    name: string;       // "mNAV.com", "strategy.com", "SEC 8-K", etc.
    url: string;        // Link to verify
    date: string;       // When source published this (ISO date string)
  };
  fetchedAt: Date;
  raw?: unknown;        // Original response for debugging
}

/**
 * Fetcher interface - all fetchers implement this
 */
export interface Fetcher {
  name: string;
  fetch(tickers: string[]): Promise<FetchResult[]>;
}

/**
 * Error from a fetch attempt
 */
export interface FetchError {
  ticker: string;
  source: string;
  error: string;
  timestamp: Date;
}
