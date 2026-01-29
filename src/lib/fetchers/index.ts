/**
 * Fetcher Registry
 *
 * Central registry of all data fetchers.
 * Used by the comparison engine to fetch data from multiple sources.
 */

import { Fetcher, FetchResult, FetchError } from './types';
import { mnavFetcher, getSupportedTickers as getMnavTickers } from './mnav';
import { strategyFetcher, getSupportedTickers as getStrategyTickers } from './dashboards/strategy';
import { sharplinkFetcher, getSupportedTickers as getSharplinkTickers } from './dashboards/sharplink';
import { defidevcorpFetcher, getSupportedTickers as getDefidevcorpTickers } from './dashboards/defidevcorp';
import { xxiMempoolFetcher, getSupportedTickers as getXxiTickers } from './dashboards/xxi-mempool';
import { metaplanetFetcher, getSupportedTickers as getMetaplanetTickers } from './dashboards/metaplanet';
import { litestrategyFetcher, getSupportedTickers as getLitestrategyTickers } from './dashboards/litestrategy';
import { kulrFetcher, getSupportedTickers as getKulrTickers } from './dashboards/kulr';
import { upexiFetcher, getSupportedTickers as getUpexiTickers } from './dashboards/upexi';
import { capitalBFetcher, getSupportedTickers as getCapitalBTickers } from './dashboards/capital-b';
import { secXbrlFetcher, getSupportedTickers as getSecXbrlTickers } from './sec-xbrl';
import { yahooFinanceFetcher, getSupportedTickers as getYahooTickers } from './yahoo-finance';
import { amfFetcher, getSupportedTickers as getAmfTickers } from './amf';
import { hkexFetcher, getSupportedTickers as getHkexTickers } from './hkex';

export * from './types';
export * from './hkex';
export * from './hkex-pdf-extractor';
export * from './hkex-monitor';

/**
 * All registered fetchers
 */
export const fetchers: Record<string, Fetcher> = {
  'mnav': mnavFetcher,
  'strategy-dashboard': strategyFetcher,
  'sharplink-dashboard': sharplinkFetcher,
  'defidevcorp-dashboard': defidevcorpFetcher,
  'xxi-mempool': xxiMempoolFetcher,
  'metaplanet-dashboard': metaplanetFetcher,
  'litestrategy-dashboard': litestrategyFetcher,
  'kulr-tracker': kulrFetcher,
  'upexi-dashboard': upexiFetcher,
  'capital-b-dashboard': capitalBFetcher,
  'sec-xbrl': secXbrlFetcher,
  'yahoo-finance': yahooFinanceFetcher,
  'amf-france': amfFetcher,  // French regulatory filings (Capital B / ALTBG)
  'hkex': hkexFetcher,       // Hong Kong Stock Exchange filings (Boyaa, etc.)
};

/**
 * Get fetcher by name
 */
export function getFetcher(name: string): Fetcher | undefined {
  return fetchers[name];
}

/**
 * Get all fetcher names
 */
export function getFetcherNames(): string[] {
  return Object.keys(fetchers);
}

/**
 * Get tickers supported by a specific fetcher
 */
export function getTickersForFetcher(fetcherName: string): string[] {
  switch (fetcherName) {
    case 'mnav':
      return getMnavTickers();
    case 'strategy-dashboard':
      return getStrategyTickers();
    case 'sharplink-dashboard':
      return getSharplinkTickers();
    case 'defidevcorp-dashboard':
      return getDefidevcorpTickers();
    case 'xxi-mempool':
      return getXxiTickers();
    case 'metaplanet-dashboard':
      return getMetaplanetTickers();
    case 'litestrategy-dashboard':
      return getLitestrategyTickers();
    case 'kulr-tracker':
      return getKulrTickers();
    case 'upexi-dashboard':
      return getUpexiTickers();
    case 'capital-b-dashboard':
      return getCapitalBTickers();
    case 'sec-xbrl':
      return getSecXbrlTickers();
    case 'yahoo-finance':
      return getYahooTickers();
    case 'amf-france':
      return getAmfTickers();
    case 'hkex':
      return getHkexTickers();
    default:
      return [];
  }
}

/**
 * Fetch from all sources for given tickers
 * Returns results and any errors encountered
 */
export async function fetchFromAllSources(
  tickers: string[],
  sourceNames?: string[]
): Promise<{
  results: FetchResult[];
  errors: FetchError[];
}> {
  const results: FetchResult[] = [];
  const errors: FetchError[] = [];

  const fetcherList = sourceNames
    ? sourceNames.map(name => ({ name, fetcher: fetchers[name] })).filter(f => f.fetcher)
    : Object.entries(fetchers).map(([name, fetcher]) => ({ name, fetcher }));

  for (const { name, fetcher } of fetcherList) {
    try {
      console.log(`[fetchFromAllSources] Fetching from ${name}...`);
      const fetcherResults = await fetcher.fetch(tickers);
      results.push(...fetcherResults);
      console.log(`[fetchFromAllSources] Got ${fetcherResults.length} results from ${name}`);
    } catch (error) {
      console.error(`[fetchFromAllSources] Error from ${name}:`, error);
      errors.push({
        ticker: 'batch',
        source: name,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
      });
    }
  }

  return { results, errors };
}
