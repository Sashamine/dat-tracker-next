/**
 * Currency Conversion Utility
 * ===========================
 *
 * Converts non-USD stock prices to USD for accurate market cap calculation.
 * Uses FMP forex API for exchange rates with caching.
 */

const FMP_API_KEY = process.env.FMP_API_KEY || "";

// Currency pairs we need (base currency -> USD)
// FMP uses format like "USDJPY" for USD/JPY rate
const CURRENCY_PAIRS: Record<string, string> = {
  JPY: "USDJPY",  // 1 USD = X JPY (need to divide)
  HKD: "USDHKD",  // 1 USD = X HKD (need to divide)
  SEK: "USDSEK",  // 1 USD = X SEK (need to divide)
  CAD: "USDCAD",  // 1 USD = X CAD (need to divide)
  EUR: "USDEUR",  // 1 USD = X EUR (need to divide)
};

// Cache for exchange rates (5 minute TTL)
let rateCache: { rates: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fallback rates if API fails (updated periodically)
export const FALLBACK_RATES: Record<string, number> = {
  JPY: 150.0,   // 1 USD = 150 JPY (Jan 2026 approximate)
  HKD: 7.8,     // 1 USD = 7.8 HKD (pegged)
  SEK: 10.5,    // 1 USD = 10.5 SEK (approximate)
  CAD: 1.35,    // 1 USD = 1.35 CAD (approximate)
  EUR: 0.92,    // 1 USD = 0.92 EUR (approximate)
};

/**
 * Synchronous currency conversion using fallback rates.
 * Use this in client components where async isn't practical.
 */
export function convertToUSDSync(price: number, currency: string): number {
  if (currency === "USD" || !currency) {
    return price;
  }

  const rate = FALLBACK_RATES[currency];
  if (!rate || rate <= 0) {
    return price;
  }

  return price / rate;
}

interface FMPForexQuote {
  symbol: string;
  price: number;
  changesPercentage: number;
  change: number;
  dayLow: number;
  dayHigh: number;
  yearHigh: number;
  yearLow: number;
  marketCap: null;
  priceAvg50: number;
  priceAvg200: number;
  volume: number;
  avgVolume: number;
  exchange: string;
  open: number;
  previousClose: number;
  eps: null;
  pe: null;
  earningsAnnouncement: null;
  sharesOutstanding: null;
  timestamp: number;
}

/**
 * Fetch exchange rates from FMP
 */
async function fetchExchangeRates(): Promise<Record<string, number>> {
  if (!FMP_API_KEY) {
    console.warn("[Currency] FMP_API_KEY not set, using fallback rates");
    return FALLBACK_RATES;
  }

  try {
    // Fetch all currency pairs we need
    const pairs = Object.values(CURRENCY_PAIRS).join(",");
    const url = `https://financialmodelingprep.com/api/v3/quote/${pairs}?apikey=${FMP_API_KEY}`;

    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      console.error(`[Currency] FMP API error: ${response.status}`);
      return FALLBACK_RATES;
    }

    const data: FMPForexQuote[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.error("[Currency] FMP returned empty forex data");
      return FALLBACK_RATES;
    }

    // Build rates map (convert from FMP format)
    const rates: Record<string, number> = {};

    for (const quote of data) {
      // Find which currency this is for
      for (const [currency, pair] of Object.entries(CURRENCY_PAIRS)) {
        if (quote.symbol === pair && quote.price > 0) {
          rates[currency] = quote.price;
        }
      }
    }

    console.log("[Currency] Fetched rates:", rates);
    return { ...FALLBACK_RATES, ...rates }; // Merge with fallbacks
  } catch (error) {
    console.error("[Currency] Error fetching exchange rates:", error);
    return FALLBACK_RATES;
  }
}

/**
 * Get current exchange rates (cached)
 */
export async function getExchangeRates(): Promise<Record<string, number>> {
  // Return cached rates if fresh
  if (rateCache && Date.now() - rateCache.timestamp < CACHE_TTL) {
    return rateCache.rates;
  }

  const rates = await fetchExchangeRates();
  rateCache = { rates, timestamp: Date.now() };
  return rates;
}

/**
 * Convert a price from local currency to USD
 *
 * @param price - Price in local currency
 * @param currency - Currency code (JPY, HKD, SEK, CAD, EUR)
 * @returns Price in USD
 */
export async function convertToUSD(price: number, currency: string): Promise<number> {
  if (currency === "USD" || !currency) {
    return price;
  }

  const rates = await getExchangeRates();
  const rate = rates[currency];

  if (!rate || rate <= 0) {
    console.warn(`[Currency] No rate for ${currency}, returning original price`);
    return price;
  }

  // Rate is USD per 1 unit of foreign currency (e.g., 1 USD = 150 JPY)
  // So to convert JPY to USD: JPY / rate
  const usdPrice = price / rate;

  return usdPrice;
}

/**
 * Get the exchange rate for a currency (USD per 1 unit)
 */
export async function getExchangeRate(currency: string): Promise<number> {
  if (currency === "USD") return 1;

  const rates = await getExchangeRates();
  return rates[currency] || FALLBACK_RATES[currency] || 1;
}

/**
 * Check if a currency is supported
 */
export function isSupportedCurrency(currency: string): boolean {
  return currency === "USD" || currency in CURRENCY_PAIRS;
}
