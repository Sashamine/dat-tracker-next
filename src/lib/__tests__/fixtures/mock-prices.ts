/**
 * Mock Prices Fixture
 *
 * Frozen, deterministic prices for reconciliation tests.
 * No network calls — all values are hardcoded.
 */

import type { PricesData } from "@/lib/math/mnav-engine";
import type { StockPriceData } from "@/lib/utils/market-cap";

// ─── Crypto asset prices (USD) ──────────────────────────────────────────────
export const MOCK_CRYPTO_PRICES: Record<string, { price: number }> = {
  BTC: { price: 90_000 },
  ETH: { price: 2_500 },
  SOL: { price: 150 },
  HYPE: { price: 25 },
  BNB: { price: 600 },
  TRX: { price: 0.25 },
  XRP: { price: 2.50 },
  ZEC: { price: 50 },
  LTC: { price: 100 },
  SUI: { price: 3.50 },
  DOGE: { price: 0.30 },
  TAO: { price: 400 },
  LINK: { price: 15 },
  AVAX: { price: 35 },
  ADA: { price: 0.80 },
  HBAR: { price: 0.30 },
};

// ─── Stock prices (USD, post-forex-conversion for foreign tickers) ──────────
// These simulate what the API returns — foreign prices already converted to USD.
export const MOCK_STOCK_PRICES: Record<string, StockPriceData> = {
  BMNR: { price: 12.00, marketCap: 0 },
  SBET: { price: 8.50, marketCap: 0 },
  ETHM: { price: 0.50, marketCap: 0 },
  BTBT: { price: 3.00, marketCap: 0 },
  BTCS: { price: 5.00, marketCap: 0 },
  GAME: { price: 25.00, marketCap: 0 },
  FGNX: { price: 15.00, marketCap: 0 },
  MSTR: { price: 350.00, marketCap: 0 },
  "3350.T": { price: 30.00, marketCap: 0 },  // Already USD-converted
  XXI: { price: 55.00, marketCap: 0 },
  CEPO: { price: 2.00, marketCap: 0 },
  MARA: { price: 18.00, marketCap: 0 },
  ASST: { price: 1.50, marketCap: 0 },
  KULR: { price: 3.50, marketCap: 0 },
  ALCPB: { price: 45.00, marketCap: 0 },
  "H100.ST": { price: 5.00, marketCap: 0 },
  OBTC3: { price: 10.00, marketCap: 0 },
  SWC: { price: 40.00, marketCap: 0 },
  SQNS: { price: 3.00, marketCap: 0 },
  DDC: { price: 8.00, marketCap: 0 },
  FUFU: { price: 1.00, marketCap: 0 },
  FLD: { price: 2.50, marketCap: 0 },
  "3825.T": { price: 1.50, marketCap: 0 },
  "3189.T": { price: 0.80, marketCap: 0 },
  ZOOZ: { price: 4.00, marketCap: 0 },
  "BTCT.V": { price: 0.30, marketCap: 0 },
  "DCC.AX": { price: 0.15, marketCap: 0 },
  NAKA: { price: 2.00, marketCap: 0 },
  DJT: { price: 35.00, marketCap: 0 },
  "0434.HK": { price: 1.50, marketCap: 0 },
  ABTC: { price: 12.00, marketCap: 0 },
  FWDI: { price: 6.00, marketCap: 0 },
  HSDT: { price: 1.50, marketCap: 0 },
  DFDV: { price: 0.80, marketCap: 0 },
  UPXI: { price: 3.00, marketCap: 0 },
  STKE: { price: 8.00, marketCap: 0 },
  PURR: { price: 1.00, marketCap: 0 },
  HYPD: { price: 15.00, marketCap: 0 },
  BNC: { price: 0.50, marketCap: 0 },
  NA: { price: 5.00, marketCap: 0 },
  TAOX: { price: 2.00, marketCap: 0 },
  XTAIF: { price: 0.20, marketCap: 0 },
  TWAV: { price: 3.00, marketCap: 0 },
  CWD: { price: 0.10, marketCap: 0 },
  TRON: { price: 1.50, marketCap: 0 },
  XRPN: { price: 12.00, marketCap: 0 },
  CYPH: { price: 2.50, marketCap: 0 },
  LITS: { price: 4.00, marketCap: 0 },
  LUXFF: { price: 0.15, marketCap: 0 },
  SUIG: { price: 1.20, marketCap: 0 },
  ZONE: { price: 0.40, marketCap: 0 },
  TBH: { price: 0.80, marketCap: 0 },
  BTOG: { price: 1.50, marketCap: 0 },
  AVX: { price: 2.00, marketCap: 0 },
  IHLDF: { price: 0.30, marketCap: 0 },
};

// ─── Forex rates (to USD) ───────────────────────────────────────────────────
export const MOCK_FOREX_RATES: Record<string, number> = {
  JPY: 0.0067,   // 1 JPY ≈ $0.0067
  HKD: 0.128,    // 1 HKD ≈ $0.128
  SEK: 0.095,    // 1 SEK ≈ $0.095
  EUR: 1.08,     // 1 EUR ≈ $1.08
  AUD: 0.65,     // 1 AUD ≈ $0.65
  CAD: 0.74,     // 1 CAD ≈ $0.74
  BRL: 0.19,     // 1 BRL ≈ $0.19
  GBP: 1.27,     // 1 GBP ≈ $1.27
};

// ─── LST exchange rates ─────────────────────────────────────────────────────
export const MOCK_LST_RATES: Record<string, { exchangeRate: number; provider: string; fetchedAt: string }> = {
  stHYPE: { exchangeRate: 1.94, provider: "mock", fetchedAt: "2026-03-13T00:00:00Z" },
  jitoSOL: { exchangeRate: 1.15, provider: "mock", fetchedAt: "2026-03-13T00:00:00Z" },
  LsETH: { exchangeRate: 1.08, provider: "mock", fetchedAt: "2026-03-13T00:00:00Z" },
};

// ─── Combined PricesData object ─────────────────────────────────────────────
export const MOCK_PRICES: PricesData = {
  crypto: MOCK_CRYPTO_PRICES,
  stocks: MOCK_STOCK_PRICES,
  forex: MOCK_FOREX_RATES,
  lst: MOCK_LST_RATES,
};
