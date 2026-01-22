/**
 * Yahoo Finance Fetcher
 *
 * Fetches shares outstanding from Yahoo Finance for validation.
 * Uses the unofficial Yahoo Finance API (no API key required).
 *
 * This provides a second source for share count validation alongside mNAV.com.
 */

import { FetchResult, Fetcher } from './types';
import { allCompanies } from '../data/companies';

interface YahooQuoteSummary {
  quoteSummary?: {
    result?: Array<{
      defaultKeyStatistics?: {
        sharesOutstanding?: {
          raw?: number;
          fmt?: string;
        };
        impliedSharesOutstanding?: {
          raw?: number;
          fmt?: string;
        };
      };
      price?: {
        marketCap?: {
          raw?: number;
        };
      };
    }>;
    error?: {
      code: string;
      description: string;
    };
  };
}

/**
 * Fetch shares outstanding from Yahoo Finance
 */
async function fetchYahooData(ticker: string): Promise<{
  sharesOutstanding?: number;
  marketCap?: number;
} | null> {
  try {
    // Use Yahoo Finance's quoteSummary endpoint
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=defaultKeyStatistics,price`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[YahooFinance] ${ticker}: HTTP ${response.status}`);
      return null;
    }

    const data: YahooQuoteSummary = await response.json();

    if (data.quoteSummary?.error) {
      console.log(`[YahooFinance] ${ticker}: API error - ${data.quoteSummary.error.description}`);
      return null;
    }

    const result = data.quoteSummary?.result?.[0];
    if (!result) {
      console.log(`[YahooFinance] ${ticker}: No data in response`);
      return null;
    }

    // Get shares outstanding
    const sharesOutstanding =
      result.defaultKeyStatistics?.sharesOutstanding?.raw ??
      result.defaultKeyStatistics?.impliedSharesOutstanding?.raw;

    // Get market cap
    const marketCap = result.price?.marketCap?.raw;

    return {
      sharesOutstanding,
      marketCap,
    };
  } catch (error) {
    console.error(`[YahooFinance] Error fetching ${ticker}:`, error);
    return null;
  }
}

/**
 * Get list of US tickers we can validate via Yahoo Finance
 * (Foreign tickers need different symbols or may not be available)
 */
function getUSCompanyTickers(): string[] {
  return allCompanies
    .filter(c => !c.ticker.includes('.')) // Exclude foreign tickers like 3350.T, 0434.HK
    .map(c => c.ticker);
}

export const yahooFinanceFetcher: Fetcher = {
  name: 'Yahoo Finance',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    const results: FetchResult[] = [];
    const usTickers = getUSCompanyTickers();

    for (const ticker of tickers) {
      // Skip non-US tickers
      if (!usTickers.includes(ticker)) {
        console.log(`[YahooFinance] Skipping non-US ticker: ${ticker}`);
        continue;
      }

      console.log(`[YahooFinance] Fetching ${ticker}...`);
      const data = await fetchYahooData(ticker);

      if (!data) {
        continue;
      }

      const fetchedAt = new Date();
      const sourceDate = fetchedAt.toISOString().split('T')[0];

      // Shares outstanding
      if (data.sharesOutstanding !== undefined) {
        results.push({
          ticker,
          field: 'shares_outstanding',
          value: data.sharesOutstanding,
          source: {
            name: 'Yahoo Finance',
            url: `https://finance.yahoo.com/quote/${ticker}/key-statistics`,
            date: sourceDate,
          },
          fetchedAt,
          raw: data,
        });
      }

      // Rate limit - be polite to Yahoo's API
      await new Promise(r => setTimeout(r, 300));
    }

    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return getUSCompanyTickers();
}
