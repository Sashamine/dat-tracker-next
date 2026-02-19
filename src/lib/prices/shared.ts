import { MARKET_CAP_OVERRIDES, FALLBACK_STOCKS } from "@/lib/data/market-cap-overrides";
import { FALLBACK_RATES } from "@/lib/utils/currency";

// FMP for market caps, OTC stocks, and forex
export const FMP_API_KEY = process.env.FMP_API_KEY || "";

// Forex pairs we need (FMP format)
// Note: FMP uses GBPUSD format for some pairs
export const FOREX_PAIRS = ["USDJPY", "USDHKD", "USDSEK", "USDCAD", "USDEUR", "GBPUSD", "USDAUD"];

// Ticker -> currency mapping for non-USD stocks (used for price conversion)
export const TICKER_CURRENCY: Record<string, string> = {
  "3350.T": "JPY",
  "3189.T": "JPY", // ANAP Holdings (Tokyo Stock Exchange)
  "3825.T": "JPY", // Remixpoint (Tokyo Stock Exchange)
  "H100.ST": "SEK",
  "0434.HK": "HKD",
  "ALCPB": "EUR",
  "SRAG.DU": "EUR", // Samara Asset Group (Frankfurt/XETRA)
  "ETHM": "CAD",
  "SWC": "GBP", // Smarter Web Company (AQUIS UK)
  "TSWCF": "GBP", // SWC OTC ticker
  "DCC.AX": "AUD", // DigitalX (ASX Australia)
  "NDA.V": "CAD", // Neptune Digital Assets (TSX Venture)
  "DMGI.V": "CAD", // DMG Blockchain (TSX Venture)
};

// Fetch forex rates from exchangerate-api.com (free, no API key needed)
export async function fetchExchangeRateApi(): Promise<Record<string, number> | null> {
  try {
    const response = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    if (!response.ok) return null;

    const data = await response.json();
    if (data?.result !== "success" || !data?.rates) return null;

    // Map to our format (1 USD = X currency)
    const rates: Record<string, number> = {};
    const currencies = ["AUD", "CAD", "EUR", "GBP", "JPY", "HKD", "SEK"];
    for (const cur of currencies) {
      if (data.rates[cur]) {
        rates[cur] = data.rates[cur];
      }
    }
    return rates;
  } catch (error) {
    console.error("[Forex] exchangerate-api error:", error);
    return null;
  }
}

export function getForexRate(currency: string | undefined, forexRates: Record<string, number>): number | null {
  if (!currency) return null;
  return forexRates[currency] || FALLBACK_RATES[currency] || null;
}

export function convertPriceToUsd(price: number, currency: string | undefined, forexRates: Record<string, number>): number {
  const rate = getForexRate(currency, forexRates);
  return rate && rate > 0 ? price / rate : price;
}

export function applyMarketCapOverride(ticker: string, marketCap: number): number {
  return MARKET_CAP_OVERRIDES[ticker] || marketCap;
}

export function calculateImpliedSharesFromFallback(ticker: string, forexRates: Record<string, number>): number {
  const fallback = FALLBACK_STOCKS[ticker];
  if (!fallback) return 0;

  const currency = TICKER_CURRENCY[ticker];
  const rate = currency ? (forexRates[currency] || FALLBACK_RATES[currency]) : null;
  // shares = marketCap_USD / (price_local / rate) = marketCap_USD * rate / price_local
  return rate ? (fallback.marketCap * rate) / fallback.price : 0;
}
