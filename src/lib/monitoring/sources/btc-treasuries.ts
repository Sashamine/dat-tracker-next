/**
 * Bitcoin Treasuries Monitor
 * Fetches and compares holdings data from CoinGecko API
 * (Previously used bitcointreasuries.net which is no longer available)
 */

import { BTCTreasuriesEntry, SourceCheckResult } from '../types';

// CoinGecko API response types
interface CoinGeckoCompany {
  name: string;
  symbol: string;
  country: string;
  total_holdings: number;
  total_entry_value_usd: number;
  total_current_value_usd: number;
  percentage_of_total_supply: number;
}

interface CoinGeckoTreasuryResponse {
  total_holdings: number;
  total_value_usd: number;
  market_cap_dominance: number;
  companies: CoinGeckoCompany[];
}

// Cache for external data
let btcTreasuriesCache: { data: BTCTreasuriesEntry[]; timestamp: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// CoinGecko API configuration
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';

/**
 * Fetch BTC holdings from CoinGecko API
 * Free tier: 30 calls/min, data updates every 5 minutes
 */
export async function fetchBitcoinTreasuries(): Promise<BTCTreasuriesEntry[]> {
  // Return cached data if fresh
  if (btcTreasuriesCache && Date.now() - btcTreasuriesCache.timestamp < CACHE_TTL) {
    return btcTreasuriesCache.data;
  }

  try {
    const response = await fetch(`${COINGECKO_API_URL}/companies/public_treasury/bitcoin`, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'DAT-Tracker/1.0',
      },
      // Don't cache in Vercel edge
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('CoinGecko Treasury API error:', response.status, response.statusText);
      return btcTreasuriesCache?.data || [];
    }

    const data: CoinGeckoTreasuryResponse = await response.json();

    // Map CoinGecko data to our BTCTreasuriesEntry format
    const entries: BTCTreasuriesEntry[] = data.companies.map((company) => ({
      symbol: company.symbol?.toUpperCase() || '',
      name: company.name || '',
      total_btc: company.total_holdings || 0,
      // CoinGecko doesn't provide change data, but we can calculate entry price
      entry_price: company.total_holdings > 0
        ? company.total_entry_value_usd / company.total_holdings
        : undefined,
      current_value: company.total_current_value_usd || undefined,
    }));

    console.log(`CoinGecko: Fetched ${entries.length} companies with BTC holdings`);
    btcTreasuriesCache = { data: entries, timestamp: Date.now() };
    return entries;
  } catch (error) {
    console.error('CoinGecko Treasury fetch error:', error);
    return btcTreasuriesCache?.data || [];
  }
}

/**
 * Match our companies with external BTC treasury data
 */
export interface BTCDiscrepancy {
  companyId: number;
  ticker: string;
  companyName: string;
  ourHoldings: number;
  externalHoldings: number;
  discrepancyPct: number;
  externalSource: string;
}

export async function checkBTCTreasuriesDiscrepancies(
  btcCompanies: Array<{
    id: number;
    ticker: string;
    name: string;
    holdings: number;
  }>
): Promise<BTCDiscrepancy[]> {
  const externalData = await fetchBitcoinTreasuries();
  const discrepancies: BTCDiscrepancy[] = [];

  // Create lookup by symbol and name
  // CoinGecko uses suffixes like ".US", ".T" (Japan), ".HK", etc.
  const externalBySymbol = new Map<string, BTCTreasuriesEntry>();
  const externalByName = new Map<string, BTCTreasuriesEntry>();

  for (const item of externalData) {
    if (item.symbol) {
      const symbol = item.symbol.toUpperCase();
      // Store both full symbol and base symbol (without exchange suffix)
      externalBySymbol.set(symbol, item);
      const baseTicker = symbol.split('.')[0];
      if (baseTicker !== symbol) {
        externalBySymbol.set(baseTicker, item);
      }
    }
    if (item.name) {
      externalByName.set(item.name.toLowerCase(), item);
    }
  }

  for (const company of btcCompanies) {
    // Try to match by ticker (base ticker without exchange suffix) or name
    const baseTicker = company.ticker.split('.')[0].toUpperCase();
    let external = externalBySymbol.get(baseTicker);
    if (!external) {
      external = externalBySymbol.get(company.ticker.toUpperCase());
    }
    if (!external) {
      external = externalByName.get(company.name.toLowerCase());
    }

    if (external && external.total_btc > 0) {
      const externalHoldings = external.total_btc;
      const discrepancyPct = Math.abs(
        (company.holdings - externalHoldings) / Math.max(company.holdings, externalHoldings)
      ) * 100;

      // Only track if there's a meaningful difference (>1%)
      if (discrepancyPct > 1) {
        discrepancies.push({
          companyId: company.id,
          ticker: company.ticker,
          companyName: company.name,
          ourHoldings: company.holdings,
          externalHoldings,
          discrepancyPct,
          externalSource: 'CoinGecko',
        });
      }
    }
  }

  // Sort by discrepancy percentage (largest first)
  return discrepancies.sort((a, b) => b.discrepancyPct - a.discrepancyPct);
}

/**
 * Check for holdings updates from BTC treasuries
 * Returns companies where external data shows significant changes
 */
export async function checkBTCTreasuriesForUpdates(
  btcCompanies: Array<{
    id: number;
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
  }>
): Promise<SourceCheckResult[]> {
  const externalData = await fetchBitcoinTreasuries();
  const results: SourceCheckResult[] = [];

  // Create lookup
  // CoinGecko uses suffixes like ".US", ".T" (Japan), ".HK", etc.
  const externalBySymbol = new Map<string, BTCTreasuriesEntry>();
  const externalByName = new Map<string, BTCTreasuriesEntry>();

  for (const item of externalData) {
    if (item.symbol) {
      const symbol = item.symbol.toUpperCase();
      // Store both full symbol and base symbol (without exchange suffix)
      externalBySymbol.set(symbol, item);
      const baseTicker = symbol.split('.')[0];
      if (baseTicker !== symbol) {
        externalBySymbol.set(baseTicker, item);
      }
    }
    if (item.name) {
      externalByName.set(item.name.toLowerCase(), item);
    }
  }

  for (const company of btcCompanies) {
    // Try to match by ticker (base ticker without exchange suffix) or name
    const baseTicker = company.ticker.split('.')[0].toUpperCase();
    let external = externalBySymbol.get(baseTicker);
    if (!external) {
      external = externalBySymbol.get(company.ticker.toUpperCase());
    }
    if (!external) {
      external = externalByName.get(company.name.toLowerCase());
    }

    if (external && external.total_btc > 0) {
      const externalHoldings = external.total_btc;
      const discrepancyPct = company.holdings > 0
        ? Math.abs((company.holdings - externalHoldings) / company.holdings) * 100
        : 100;

      // If external shows a different value (>1% difference), report it
      if (discrepancyPct > 1) {
        // High confidence if small change, lower if large change
        const confidence = discrepancyPct < 5 ? 0.95 :
                          discrepancyPct < 10 ? 0.85 :
                          discrepancyPct < 20 ? 0.75 : 0.60;

        results.push({
          sourceType: 'btc_treasuries',
          companyId: company.id,
          ticker: company.ticker,
          asset: company.asset,
          detectedHoldings: externalHoldings,
          confidence,
          sourceUrl: 'https://www.coingecko.com/en/treasuries/bitcoin',
          sourceText: `${company.name} (${company.ticker}): ${externalHoldings.toLocaleString()} BTC from CoinGecko Treasury API`,
          trustLevel: 'verified',
        });
      }
    }
  }

  return results;
}

/**
 * Get the latest data from BTC treasuries for a specific ticker
 */
export async function getBTCTreasuriesForTicker(
  ticker: string
): Promise<BTCTreasuriesEntry | null> {
  const data = await fetchBitcoinTreasuries();
  return data.find(d => d.symbol?.toUpperCase() === ticker.toUpperCase()) || null;
}
