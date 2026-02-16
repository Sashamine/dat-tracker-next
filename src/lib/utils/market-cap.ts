/**
 * Centralized Market Cap Utility
 * ==============================
 *
 * Single source of truth for market cap calculations.
 *
 * DESIGN PRINCIPLES:
 * 1. sharesForMnav × price is preferred (real-time, accurate)
 * 2. Non-USD stocks: convert price to USD via forex API before calculation
 * 3. API market cap is fallback (can be stale)
 * 4. Dilution adjustments only when we have verified data
 *
 * CURRENCY HANDLING:
 * - 3350.T (Metaplanet): JPY → USD conversion
 * - 0434.HK (Boyaa): HKD → USD conversion
 * - H100.ST (Hashdex): SEK → USD conversion
 * - ALCPB (Capital B / The Blockchain Group): EUR → USD conversion
 */

import { Company } from "@/lib/types";
import { COMPANY_SOURCES, CompanyDataSources } from "@/lib/data/company-sources";
import { convertToUSD, convertToUSDSync } from "@/lib/utils/currency";
import { getEffectiveShares, dilutiveInstruments } from "@/lib/data/dilutive-instruments";

// Tickers that have non-USD stock prices
// NOTE: As of Jan 2026, the /api/prices and /api/prices/stream endpoints
// now convert foreign currency prices to USD before returning them.
// So this set should be EMPTY - all prices from the API are in USD.
const NON_USD_TICKERS = new Set<string>([
  // DISABLED - prices route now converts FALLBACK_STOCKS to USD
  // These would cause double-conversion
]);

// Currency codes for logging/display
const TICKER_CURRENCIES: Record<string, string> = {
  "3350.T": "JPY",
  "3189.T": "JPY",
  "0434.HK": "HKD",
  "H100.ST": "SEK",
  "ALCPB": "EUR",
  "DCC.AX": "AUD",
  "NDA.V": "CAD",
  "DMGI.V": "CAD",
};

export interface StockPriceData {
  price: number;
  marketCap: number;  // Already in USD from API
  change24h?: number;
  volume?: number;
  isStatic?: boolean;  // True for FALLBACK_STOCKS data
}

export interface MarketCapResult {
  marketCap: number;
  source: MarketCapSource;
  currency: string;
  dilutionApplied: boolean;
  dilutionFactor?: number;
  inTheMoneyDebtValue: number; // Face value of ITM converts - subtract from debt in EV calc
  inTheMoneyWarrantProceeds: number; // Exercise proceeds from ITM warrants - add to CryptoNAV
  warning?: string;
}

export type MarketCapSource =
  | "api"           // From stock API (preferred)
  | "calculated"    // shares × price (USD stocks only)
  | "static"        // From company.marketCap
  | "none";         // No data available

/**
 * Get market cap for a company using the correct source.
 *
 * Priority:
 * 1. For non-USD stocks with sharesForMnav: calculate from shares × price × forex
 * 2. API market cap (if reliable/overridden)
 * 3. Static company.marketCap (fallback)
 * 4. Zero (last resort)
 *
 * @param company - Company data
 * @param stockData - Stock price data from API
 * @param forexRates - Optional live forex rates (required for accurate non-USD calculation)
 */
export function getMarketCap(
  company: Company,
  stockData?: StockPriceData | null,
  forexRates?: Record<string, number>
): MarketCapResult {
  const ticker = company.ticker;
  const isNonUsd = NON_USD_TICKERS.has(ticker);
  const currency = TICKER_CURRENCIES[ticker] || "USD";

  // 1. For non-USD stocks, calculate from shares × price × forex (most accurate)
  if (isNonUsd && company.sharesForMnav && stockData?.price && stockData.price > 0) {
    const priceInUsd = convertToUSDSync(stockData.price, currency, forexRates);
    const calculatedMarketCap = priceInUsd * company.sharesForMnav;
    return {
      marketCap: calculatedMarketCap,
      source: "calculated",
      currency: "USD",
      dilutionApplied: false,
      inTheMoneyDebtValue: 0,
      inTheMoneyWarrantProceeds: 0,
    };
  }

  // 2. API market cap (use if available - includes our overrides)
  if (stockData?.marketCap && stockData.marketCap > 0) {
    return {
      marketCap: stockData.marketCap,
      source: "api",
      currency: "USD",
      dilutionApplied: false,
      inTheMoneyDebtValue: 0,
      inTheMoneyWarrantProceeds: 0,
    };
  }

  // 3. Static market cap from company data
  if (company.marketCap && company.marketCap > 0) {
    return {
      marketCap: company.marketCap,
      source: "static",
      currency: "USD",
      dilutionApplied: false,
      inTheMoneyDebtValue: 0,
      inTheMoneyWarrantProceeds: 0,
      warning: "Using static market cap - may be stale",
    };
  }

  // 4. No market cap available
  return {
    marketCap: 0,
    source: "none",
    currency,
    dilutionApplied: false,
    inTheMoneyDebtValue: 0,
    inTheMoneyWarrantProceeds: 0,
    warning: `No market cap data available for ${ticker}`,
  };
}

/**
 * Get market cap specifically for mNAV calculation.
 *
 * This function respects each company's methodology:
 * - If company has sharesForMnav, use stockPrice × sharesForMnav
 * - For non-USD stocks, convert price to USD first via forex API
 * - Otherwise fall back to regular getMarketCap logic
 *
 * Also returns inTheMoneyDebtValue which should be subtracted from totalDebt
 * in the EV calculation to avoid double-counting in-the-money convertibles.
 *
 * This ensures our mNAV matches what companies report on their dashboards.
 */
export async function getMarketCapForMnav(
  company: Company,
  stockData?: StockPriceData | null
): Promise<MarketCapResult> {
  const ticker = company.ticker;
  const isNonUsd = NON_USD_TICKERS.has(ticker);
  const currency = TICKER_CURRENCIES[ticker] || "USD";

  // If company has explicit share count for mNAV and we have a stock price
  if (company.sharesForMnav && company.sharesForMnav > 0 && stockData?.price && stockData.price > 0) {
    let priceInUsd = stockData.price;

    // For non-USD stocks, convert price to USD
    if (isNonUsd) {
      priceInUsd = await convertToUSD(stockData.price, currency);
    }

    // Check if company has dilutive instruments - if so, calculate effective shares
    let effectiveShares = company.sharesForMnav;
    let dilutionApplied = false;
    let inTheMoneyDebtValue = 0;
    let inTheMoneyWarrantProceeds = 0;

    if (dilutiveInstruments[ticker]) {
      const result = getEffectiveShares(ticker, company.sharesForMnav, priceInUsd);
      effectiveShares = result.diluted;
      dilutionApplied = result.diluted !== result.basic;
      inTheMoneyDebtValue = result.inTheMoneyDebtValue;
      inTheMoneyWarrantProceeds = result.inTheMoneyWarrantProceeds;
    }

    const calculatedMarketCap = priceInUsd * effectiveShares;
    return {
      marketCap: calculatedMarketCap,
      source: "calculated",
      currency: "USD",
      dilutionApplied,
      inTheMoneyDebtValue,
      inTheMoneyWarrantProceeds,
    };
  }

  // Fall back to regular market cap logic (API market cap)
  return getMarketCap(company, stockData);
}

/**
 * Synchronous version of getMarketCapForMnav for client components.
 * Uses live forex rates if provided, otherwise falls back to static rates.
 *
 * Also returns inTheMoneyDebtValue which should be subtracted from totalDebt
 * in the EV calculation to avoid double-counting in-the-money convertibles.
 *
 * @param company - Company data
 * @param stockData - Stock price data
 * @param forexRates - Optional live forex rates from API (preferred)
 */
export function getMarketCapForMnavSync(
  company: Company,
  stockData?: StockPriceData | null,
  forexRates?: Record<string, number>
): MarketCapResult {
  const ticker = company.ticker;
  const isNonUsd = NON_USD_TICKERS.has(ticker);
  const currency = TICKER_CURRENCIES[ticker] || "USD";

  // For static fallback stocks, use the verified marketCap directly (from company dashboard)
  // The fallback marketCap is more accurate than shares × price due to forex rate discrepancies
  if (stockData?.isStatic && stockData.marketCap && stockData.marketCap > 0) {
    return {
      marketCap: stockData.marketCap,
      source: "api",
      currency: "USD",
      dilutionApplied: false,
      inTheMoneyDebtValue: 0,
      inTheMoneyWarrantProceeds: 0,
    };
  }

  // If company has explicit share count for mNAV and we have a stock price
  if (company.sharesForMnav && company.sharesForMnav > 0 && stockData?.price && stockData.price > 0) {
    let priceInUsd = stockData.price;

    // For non-USD stocks, convert price to USD using live rates if available
    if (isNonUsd) {
      priceInUsd = convertToUSDSync(stockData.price, currency, forexRates);
    }

    // Check if company has dilutive instruments - if so, calculate effective shares
    // based on current stock price (comparing USD price to USD strike prices)
    let effectiveShares = company.sharesForMnav;
    let dilutionApplied = false;
    let inTheMoneyDebtValue = 0;
    let inTheMoneyWarrantProceeds = 0;

    if (dilutiveInstruments[ticker]) {
      const result = getEffectiveShares(ticker, company.sharesForMnav, priceInUsd);
      effectiveShares = result.diluted;
      dilutionApplied = result.diluted !== result.basic;
      inTheMoneyDebtValue = result.inTheMoneyDebtValue;
      inTheMoneyWarrantProceeds = result.inTheMoneyWarrantProceeds;

      // Debug for MSTR dilution calculation
      if (ticker === 'MSTR') {
        console.log('[MarketCap Debug] MSTR dilution:', {
          basicShares: company.sharesForMnav,
          stockPriceUSD: priceInUsd,
          dilutedShares: result.diluted,
          dilutionAdded: result.diluted - result.basic,
          inTheMoneyDebtValue: result.inTheMoneyDebtValue,
          inTheMoneyWarrantProceeds: result.inTheMoneyWarrantProceeds,
          breakdown: result.breakdown.map(b => ({
            type: b.type,
            strike: b.strikePrice,
            shares: b.potentialShares,
            faceValue: b.faceValue,
            itm: b.inTheMoney,
          })),
        });
      }
    }

    const calculatedMarketCap = priceInUsd * effectiveShares;

    // Debug for Metaplanet, MSTR, and TWAV
    if (ticker === '3350.T' || ticker === 'MSTR' || ticker === 'TWAV') {
      console.log(`[MarketCap Debug] ${ticker} calculated:`, {
        priceInUsd,
        effectiveShares,
        calculatedMarketCap,
        source: 'calculated',
      });
    }

    return {
      marketCap: calculatedMarketCap,
      source: "calculated",
      currency: "USD",
      dilutionApplied,
      inTheMoneyDebtValue,
      inTheMoneyWarrantProceeds,
    };
  }

  // Fall back to regular market cap logic
  return getMarketCap(company, stockData);
}

/**
 * Apply dilution adjustment to market cap.
 * Only use this when we have VERIFIED dilution data from company filings.
 *
 * @param basicMarketCap - Market cap based on basic shares
 * @param dilutionFactor - Ratio of diluted to basic shares (e.g., 1.2 = 20% dilution)
 */
export function applyDilutionFactor(
  basicMarketCap: number,
  dilutionFactor: number
): number {
  if (dilutionFactor <= 0 || dilutionFactor > 3) {
    // Sanity check - dilution factor should be between 1.0 and ~2.0 typically
    console.warn(`Invalid dilution factor: ${dilutionFactor}`);
    return basicMarketCap;
  }
  return basicMarketCap * dilutionFactor;
}

/**
 * Get dilution factor for a company from company-sources.
 * Returns undefined if not available/applicable.
 */
export function getDilutionFactor(ticker: string): number | undefined {
  const sources = COMPANY_SOURCES[ticker.toUpperCase()];
  if (!sources) return undefined;

  // For now, we only apply dilution when explicitly configured
  // Future: Add dilutionFactor to CompanyDataSources
  return undefined;
}

/**
 * Check if a ticker uses non-USD currency.
 * Useful for UI warnings.
 */
export function isNonUsdTicker(ticker: string): boolean {
  return NON_USD_TICKERS.has(ticker);
}

/**
 * Get currency code for a ticker.
 */
export function getTickerCurrency(ticker: string): string {
  return TICKER_CURRENCIES[ticker] || "USD";
}

/**
 * Verification helper: Compare calculated mNAV against official dashboard.
 * Returns discrepancy percentage.
 */
export function verifyMnavAgainstOfficial(
  calculatedMnav: number,
  officialMnav: number
): { discrepancy: number; isAcceptable: boolean } {
  if (officialMnav <= 0) {
    return { discrepancy: 0, isAcceptable: true };
  }

  const discrepancy = Math.abs(calculatedMnav - officialMnav) / officialMnav;
  // Accept up to 5% discrepancy (timing differences, rounding)
  const isAcceptable = discrepancy <= 0.05;

  return { discrepancy, isAcceptable };
}

// ============================================================================
// EXPECTED VALUES FOR VERIFICATION
// ============================================================================

/**
 * Known mNAV values from official sources for verification.
 * Updated manually when checking dashboards.
 */
export const EXPECTED_MNAV: Record<string, { value: number; source: string; date: string }> = {
  SBET: { value: 0.82, source: "sharplink.com/eth-dashboard", date: "2026-01-18" },
  "3350.T": { value: 1.0, source: "metaplanet.jp/bitcoin (approximate)", date: "2026-01-18" },
  // Add more as we verify
};

/**
 * Verify all companies with expected mNAV values.
 * Returns array of discrepancies.
 */
export function verifyAllMnavValues(
  calculateMnavFn: (ticker: string) => number | null
): Array<{ ticker: string; calculated: number; expected: number; discrepancy: number; ok: boolean }> {
  const results: Array<{ ticker: string; calculated: number; expected: number; discrepancy: number; ok: boolean }> = [];

  for (const [ticker, expected] of Object.entries(EXPECTED_MNAV)) {
    const calculated = calculateMnavFn(ticker);
    if (calculated !== null) {
      const { discrepancy, isAcceptable } = verifyMnavAgainstOfficial(calculated, expected.value);
      results.push({
        ticker,
        calculated,
        expected: expected.value,
        discrepancy,
        ok: isAcceptable,
      });
    }
  }

  return results;
}
