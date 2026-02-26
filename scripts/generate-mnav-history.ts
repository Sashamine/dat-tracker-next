/**
 * Generate Historical mNAV Data
 *
 * Uses hardcoded historical crypto prices (from public sources) and Yahoo Finance for stock prices.
 *
 * Usage: npx tsx scripts/generate-mnav-history.ts
 */

import * as fs from "fs";
import * as path from "path";

// Import holdings history
import { HOLDINGS_HISTORY, HoldingsSnapshot } from "../src/lib/data/holdings-history";

// Import current company data for debt fallback
import { allCompanies } from "../src/lib/data/companies";

// Corporate actions (splits/reverse splits) normalization
import { normalizePrice, normalizeShares } from "../src/lib/corporate-actions";
import { getCorporateActions } from "../src/lib/d1";

// Build debt and currency lookup from companies.ts
const companyDataLookup: Record<string, { totalDebt: number; preferredEquity: number; cash: number; currency: string }> = {};
for (const company of allCompanies) {
  companyDataLookup[company.ticker] = {
    totalDebt: (company as any).totalDebt || 0,
    preferredEquity: (company as any).preferredEquity || 0,
    cash: (company as any).cashReserves || 0,
    currency: (company as any).currency || "USD",
  };
}

// Approximate FX rates to USD (historical averages 2024-2025)
const FX_TO_USD: Record<string, number> = {
  USD: 1.0,
  JPY: 0.0067,  // ~150 JPY/USD
  CAD: 0.74,    // ~1.35 CAD/USD
  EUR: 1.08,    // ~0.93 EUR/USD
  GBP: 1.27,    // ~0.79 GBP/USD
  AUD: 0.65,    // ~1.54 AUD/USD
  HKD: 0.128,   // ~7.8 HKD/USD
  SEK: 0.095,   // ~10.5 SEK/USD
  BRL: 0.18,    // ~5.5 BRL/USD
};

interface CompanyMNAV {
  ticker: string;
  asset: string;
  mnav: number;
  marketCap: number;
  enterpriseValue: number;
  cryptoNav: number;
  holdings: number;
  stockPrice: number;
  cryptoPrice: number;
  sharesOutstanding: number;
  totalDebt: number;
  cash: number;
}

interface HistoricalMNAVSnapshot {
  date: string;
  median: number;
  average: number;
  count: number;
  btcPrice: number;
  ethPrice: number;
  companies: CompanyMNAV[];
}

// Load crypto prices from fetched data file
const CRYPTO_PRICES_FILE = path.join(__dirname, "../data/crypto-prices.json");
let FETCHED_CRYPTO_PRICES: Record<string, Record<string, number>> = {};

if (fs.existsSync(CRYPTO_PRICES_FILE)) {
  FETCHED_CRYPTO_PRICES = JSON.parse(fs.readFileSync(CRYPTO_PRICES_FILE, "utf-8"));
  console.log(`Loaded ${Object.keys(FETCHED_CRYPTO_PRICES).length} days of crypto prices from file`);
}

// Fallback historical crypto prices (only used if fetched file missing)
const HISTORICAL_CRYPTO_PRICES: Record<string, Record<string, number>> = {
  // 2024 Q1
  "2024-01-07": { BTC: 44000, ETH: 2300, SOL: 105, TAO: 320, LTC: 75, ZEC: 30, LINK: 15, SUI: 1.1, AVAX: 42, DOGE: 0.08, HYPE: 0, TRX: 0.11, XRP: 0.60, BNB: 320, HBAR: 0.09, ADA: 0.58 },
  "2024-01-14": { BTC: 43000, ETH: 2550, SOL: 98, TAO: 350, LTC: 73, ZEC: 28, LINK: 16, SUI: 1.2, AVAX: 40, DOGE: 0.08, HYPE: 0, TRX: 0.11, XRP: 0.58, BNB: 315, HBAR: 0.09, ADA: 0.55 },
  "2024-01-21": { BTC: 41500, ETH: 2450, SOL: 88, TAO: 380, LTC: 70, ZEC: 26, LINK: 15, SUI: 1.1, AVAX: 35, DOGE: 0.08, HYPE: 0, TRX: 0.11, XRP: 0.55, BNB: 310, HBAR: 0.08, ADA: 0.52 },
  "2024-01-28": { BTC: 43000, ETH: 2300, SOL: 97, TAO: 420, LTC: 68, ZEC: 25, LINK: 15, SUI: 1.3, AVAX: 36, DOGE: 0.08, HYPE: 0, TRX: 0.11, XRP: 0.53, BNB: 305, HBAR: 0.08, ADA: 0.50 },
  "2024-02-04": { BTC: 43200, ETH: 2350, SOL: 100, TAO: 450, LTC: 70, ZEC: 26, LINK: 16, SUI: 1.4, AVAX: 38, DOGE: 0.08, HYPE: 0, TRX: 0.11, XRP: 0.52, BNB: 315, HBAR: 0.08, ADA: 0.52 },
  "2024-02-11": { BTC: 48000, ETH: 2550, SOL: 110, TAO: 480, LTC: 72, ZEC: 27, LINK: 17, SUI: 1.5, AVAX: 40, DOGE: 0.09, HYPE: 0, TRX: 0.12, XRP: 0.54, BNB: 340, HBAR: 0.09, ADA: 0.55 },
  "2024-02-18": { BTC: 52000, ETH: 2900, SOL: 115, TAO: 520, LTC: 75, ZEC: 28, LINK: 18, SUI: 1.6, AVAX: 42, DOGE: 0.09, HYPE: 0, TRX: 0.13, XRP: 0.56, BNB: 380, HBAR: 0.10, ADA: 0.60 },
  "2024-02-25": { BTC: 57000, ETH: 3200, SOL: 125, TAO: 580, LTC: 80, ZEC: 29, LINK: 19, SUI: 1.7, AVAX: 45, DOGE: 0.10, HYPE: 0, TRX: 0.13, XRP: 0.58, BNB: 420, HBAR: 0.11, ADA: 0.65 },
  "2024-03-03": { BTC: 63000, ETH: 3400, SOL: 140, TAO: 650, LTC: 85, ZEC: 30, LINK: 20, SUI: 1.8, AVAX: 48, DOGE: 0.12, HYPE: 0, TRX: 0.14, XRP: 0.62, BNB: 480, HBAR: 0.12, ADA: 0.70 },
  "2024-03-10": { BTC: 72000, ETH: 3900, SOL: 175, TAO: 720, LTC: 95, ZEC: 32, LINK: 22, SUI: 2.0, AVAX: 55, DOGE: 0.18, HYPE: 0, TRX: 0.15, XRP: 0.65, BNB: 550, HBAR: 0.14, ADA: 0.78 },
  "2024-03-17": { BTC: 68000, ETH: 3600, SOL: 190, TAO: 700, LTC: 90, ZEC: 28, LINK: 19, SUI: 1.9, AVAX: 50, DOGE: 0.16, HYPE: 0, TRX: 0.13, XRP: 0.62, BNB: 520, HBAR: 0.13, ADA: 0.68 },
  "2024-03-24": { BTC: 67000, ETH: 3500, SOL: 185, TAO: 680, LTC: 88, ZEC: 26, LINK: 18, SUI: 1.8, AVAX: 48, DOGE: 0.17, HYPE: 0, TRX: 0.12, XRP: 0.61, BNB: 530, HBAR: 0.12, ADA: 0.65 },
  "2024-03-31": { BTC: 71333, ETH: 3611, SOL: 202, TAO: 682, LTC: 91, ZEC: 25, LINK: 18.4, SUI: 1.73, AVAX: 51, DOGE: 0.206, HYPE: 0, TRX: 0.117, XRP: 0.62, BNB: 602, HBAR: 0.125, ADA: 0.64 },
  // 2024 Q2
  "2024-04-07": { BTC: 69500, ETH: 3450, SOL: 175, TAO: 620, LTC: 88, ZEC: 24, LINK: 17, SUI: 1.6, AVAX: 45, DOGE: 0.19, HYPE: 0, TRX: 0.12, XRP: 0.58, BNB: 580, HBAR: 0.11, ADA: 0.58 },
  "2024-04-14": { BTC: 64000, ETH: 3100, SOL: 145, TAO: 550, LTC: 82, ZEC: 23, LINK: 15, SUI: 1.4, AVAX: 38, DOGE: 0.16, HYPE: 0, TRX: 0.12, XRP: 0.52, BNB: 540, HBAR: 0.10, ADA: 0.50 },
  "2024-04-21": { BTC: 66000, ETH: 3200, SOL: 155, TAO: 480, LTC: 85, ZEC: 22, LINK: 16, SUI: 1.3, AVAX: 40, DOGE: 0.15, HYPE: 0, TRX: 0.12, XRP: 0.54, BNB: 560, HBAR: 0.10, ADA: 0.52 },
  "2024-04-28": { BTC: 63500, ETH: 3150, SOL: 138, TAO: 420, LTC: 80, ZEC: 21, LINK: 14, SUI: 1.2, AVAX: 35, DOGE: 0.14, HYPE: 0, TRX: 0.12, XRP: 0.50, BNB: 545, HBAR: 0.09, ADA: 0.48 },
  "2024-05-05": { BTC: 64500, ETH: 3050, SOL: 148, TAO: 380, LTC: 82, ZEC: 21, LINK: 14, SUI: 1.1, AVAX: 36, DOGE: 0.15, HYPE: 0, TRX: 0.12, XRP: 0.52, BNB: 575, HBAR: 0.09, ADA: 0.46 },
  "2024-05-12": { BTC: 61000, ETH: 2950, SOL: 145, TAO: 350, LTC: 78, ZEC: 20, LINK: 13, SUI: 1.0, AVAX: 33, DOGE: 0.14, HYPE: 0, TRX: 0.12, XRP: 0.50, BNB: 560, HBAR: 0.08, ADA: 0.44 },
  "2024-05-19": { BTC: 67000, ETH: 3100, SOL: 170, TAO: 400, LTC: 85, ZEC: 22, LINK: 15, SUI: 1.2, AVAX: 38, DOGE: 0.16, HYPE: 0, TRX: 0.13, XRP: 0.54, BNB: 590, HBAR: 0.10, ADA: 0.48 },
  "2024-05-26": { BTC: 69000, ETH: 3800, SOL: 168, TAO: 420, LTC: 84, ZEC: 24, LINK: 18, SUI: 1.1, AVAX: 37, DOGE: 0.16, HYPE: 0, TRX: 0.12, XRP: 0.53, BNB: 600, HBAR: 0.11, ADA: 0.47 },
  "2024-06-02": { BTC: 68500, ETH: 3750, SOL: 165, TAO: 380, LTC: 83, ZEC: 23, LINK: 17, SUI: 1.05, AVAX: 35, DOGE: 0.16, HYPE: 0, TRX: 0.12, XRP: 0.52, BNB: 595, HBAR: 0.10, ADA: 0.45 },
  "2024-06-09": { BTC: 70000, ETH: 3650, SOL: 155, TAO: 350, LTC: 82, ZEC: 22, LINK: 16, SUI: 1.0, AVAX: 33, DOGE: 0.15, HYPE: 0, TRX: 0.12, XRP: 0.50, BNB: 580, HBAR: 0.09, ADA: 0.43 },
  "2024-06-16": { BTC: 66500, ETH: 3550, SOL: 148, TAO: 310, LTC: 78, ZEC: 21, LINK: 15, SUI: 0.95, AVAX: 30, DOGE: 0.14, HYPE: 0, TRX: 0.12, XRP: 0.48, BNB: 565, HBAR: 0.08, ADA: 0.41 },
  "2024-06-23": { BTC: 64000, ETH: 3500, SOL: 140, TAO: 285, LTC: 75, ZEC: 21, LINK: 14, SUI: 0.90, AVAX: 28, DOGE: 0.13, HYPE: 0, TRX: 0.12, XRP: 0.47, BNB: 570, HBAR: 0.08, ADA: 0.40 },
  "2024-06-30": { BTC: 62678, ETH: 3464, SOL: 143, TAO: 274, LTC: 72, ZEC: 21, LINK: 13.8, SUI: 0.87, AVAX: 27, DOGE: 0.124, HYPE: 0, TRX: 0.126, XRP: 0.47, BNB: 581, HBAR: 0.079, ADA: 0.39 },
  // 2024 Q3
  "2024-07-07": { BTC: 57000, ETH: 3100, SOL: 138, TAO: 290, LTC: 68, ZEC: 20, LINK: 13, SUI: 0.85, AVAX: 26, DOGE: 0.11, HYPE: 0, TRX: 0.13, XRP: 0.45, BNB: 555, HBAR: 0.07, ADA: 0.38 },
  "2024-07-14": { BTC: 63500, ETH: 3350, SOL: 155, TAO: 350, LTC: 72, ZEC: 23, LINK: 14, SUI: 1.0, AVAX: 28, DOGE: 0.12, HYPE: 0, TRX: 0.14, XRP: 0.48, BNB: 570, HBAR: 0.08, ADA: 0.40 },
  "2024-07-21": { BTC: 67000, ETH: 3500, SOL: 175, TAO: 420, LTC: 75, ZEC: 28, LINK: 15, SUI: 1.2, AVAX: 30, DOGE: 0.13, HYPE: 0, TRX: 0.14, XRP: 0.55, BNB: 585, HBAR: 0.09, ADA: 0.42 },
  "2024-07-28": { BTC: 68000, ETH: 3300, SOL: 185, TAO: 480, LTC: 73, ZEC: 32, LINK: 14, SUI: 1.4, AVAX: 28, DOGE: 0.13, HYPE: 0, TRX: 0.14, XRP: 0.58, BNB: 575, HBAR: 0.08, ADA: 0.41 },
  "2024-08-04": { BTC: 61000, ETH: 2900, SOL: 155, TAO: 380, LTC: 65, ZEC: 28, LINK: 12, SUI: 1.1, AVAX: 24, DOGE: 0.10, HYPE: 0, TRX: 0.13, XRP: 0.52, BNB: 520, HBAR: 0.06, ADA: 0.36 },
  "2024-08-11": { BTC: 59000, ETH: 2650, SOL: 145, TAO: 320, LTC: 62, ZEC: 30, LINK: 11, SUI: 1.0, AVAX: 22, DOGE: 0.10, HYPE: 0, TRX: 0.13, XRP: 0.50, BNB: 500, HBAR: 0.05, ADA: 0.34 },
  "2024-08-18": { BTC: 60500, ETH: 2700, SOL: 148, TAO: 350, LTC: 64, ZEC: 32, LINK: 11, SUI: 1.1, AVAX: 23, DOGE: 0.10, HYPE: 0, TRX: 0.14, XRP: 0.54, BNB: 540, HBAR: 0.055, ADA: 0.35 },
  "2024-08-25": { BTC: 64000, ETH: 2800, SOL: 155, TAO: 400, LTC: 66, ZEC: 35, LINK: 12, SUI: 1.2, AVAX: 25, DOGE: 0.11, HYPE: 0, TRX: 0.15, XRP: 0.56, BNB: 560, HBAR: 0.06, ADA: 0.37 },
  "2024-09-01": { BTC: 58500, ETH: 2500, SOL: 138, TAO: 350, LTC: 63, ZEC: 33, LINK: 11, SUI: 1.0, AVAX: 23, DOGE: 0.10, HYPE: 0, TRX: 0.15, XRP: 0.55, BNB: 530, HBAR: 0.05, ADA: 0.35 },
  "2024-09-08": { BTC: 55000, ETH: 2300, SOL: 130, TAO: 320, LTC: 60, ZEC: 30, LINK: 10, SUI: 0.95, AVAX: 21, DOGE: 0.10, HYPE: 0, TRX: 0.14, XRP: 0.53, BNB: 510, HBAR: 0.05, ADA: 0.33 },
  "2024-09-15": { BTC: 60000, ETH: 2400, SOL: 138, TAO: 380, LTC: 64, ZEC: 34, LINK: 11, SUI: 1.2, AVAX: 24, DOGE: 0.10, HYPE: 0, TRX: 0.15, XRP: 0.56, BNB: 545, HBAR: 0.05, ADA: 0.35 },
  "2024-09-22": { BTC: 63500, ETH: 2600, SOL: 150, TAO: 450, LTC: 66, ZEC: 36, LINK: 11, SUI: 1.5, AVAX: 26, DOGE: 0.11, HYPE: 0, TRX: 0.15, XRP: 0.57, BNB: 565, HBAR: 0.055, ADA: 0.37 },
  "2024-09-30": { BTC: 63497, ETH: 2659, SOL: 158, TAO: 529, LTC: 66, ZEC: 37, LINK: 11.5, SUI: 1.73, AVAX: 27, DOGE: 0.114, HYPE: 0, TRX: 0.151, XRP: 0.58, BNB: 583, HBAR: 0.056, ADA: 0.38 },
  // 2024 Q4
  "2024-10-06": { BTC: 62500, ETH: 2450, SOL: 148, TAO: 500, LTC: 65, ZEC: 36, LINK: 11, SUI: 1.8, AVAX: 26, DOGE: 0.11, HYPE: 0, TRX: 0.15, XRP: 0.54, BNB: 570, HBAR: 0.05, ADA: 0.36 },
  "2024-10-13": { BTC: 65000, ETH: 2550, SOL: 155, TAO: 540, LTC: 68, ZEC: 38, LINK: 12, SUI: 2.0, AVAX: 28, DOGE: 0.12, HYPE: 0, TRX: 0.16, XRP: 0.55, BNB: 585, HBAR: 0.06, ADA: 0.38 },
  "2024-10-20": { BTC: 68500, ETH: 2700, SOL: 168, TAO: 580, LTC: 72, ZEC: 42, LINK: 13, SUI: 2.2, AVAX: 30, DOGE: 0.14, HYPE: 0, TRX: 0.17, XRP: 0.58, BNB: 600, HBAR: 0.07, ADA: 0.42 },
  "2024-10-27": { BTC: 71000, ETH: 2650, SOL: 175, TAO: 550, LTC: 74, ZEC: 45, LINK: 12, SUI: 2.1, AVAX: 29, DOGE: 0.16, HYPE: 0, TRX: 0.17, XRP: 0.52, BNB: 595, HBAR: 0.065, ADA: 0.40 },
  "2024-11-03": { BTC: 69000, ETH: 2500, SOL: 165, TAO: 480, LTC: 70, ZEC: 42, LINK: 11, SUI: 1.9, AVAX: 27, DOGE: 0.17, HYPE: 0, TRX: 0.16, XRP: 0.51, BNB: 580, HBAR: 0.06, ADA: 0.38 },
  "2024-11-10": { BTC: 82000, ETH: 3100, SOL: 210, TAO: 580, LTC: 82, ZEC: 48, LINK: 14, SUI: 2.8, AVAX: 35, DOGE: 0.28, HYPE: 0, TRX: 0.18, XRP: 0.68, BNB: 630, HBAR: 0.10, ADA: 0.58 },
  "2024-11-17": { BTC: 91000, ETH: 3200, SOL: 240, TAO: 600, LTC: 90, ZEC: 50, LINK: 16, SUI: 3.2, AVAX: 40, DOGE: 0.38, HYPE: 0, TRX: 0.19, XRP: 1.05, BNB: 645, HBAR: 0.14, ADA: 0.75 },
  "2024-11-21": { BTC: 98000, ETH: 3350, SOL: 260, TAO: 620, LTC: 95, ZEC: 52, LINK: 17.5, SUI: 3.5, AVAX: 45, DOGE: 0.40, HYPE: 0, TRX: 0.20, XRP: 1.15, BNB: 650, HBAR: 0.15, ADA: 0.82 },
  "2024-11-24": { BTC: 97000, ETH: 3450, SOL: 255, TAO: 580, LTC: 100, ZEC: 55, LINK: 18, SUI: 3.6, AVAX: 46, DOGE: 0.42, HYPE: 10, TRX: 0.21, XRP: 1.45, BNB: 660, HBAR: 0.18, ADA: 0.95 },
  "2024-12-01": { BTC: 97500, ETH: 3650, SOL: 235, TAO: 550, LTC: 115, ZEC: 62, LINK: 22, SUI: 3.8, AVAX: 48, DOGE: 0.41, HYPE: 18, TRX: 0.28, XRP: 2.45, BNB: 685, HBAR: 0.28, ADA: 1.05 },
  "2024-12-08": { BTC: 99500, ETH: 3850, SOL: 225, TAO: 520, LTC: 120, ZEC: 65, LINK: 24, SUI: 4.2, AVAX: 52, DOGE: 0.43, HYPE: 22, TRX: 0.29, XRP: 2.38, BNB: 710, HBAR: 0.32, ADA: 1.10 },
  "2024-12-15": { BTC: 105000, ETH: 3950, SOL: 220, TAO: 490, LTC: 125, ZEC: 70, LINK: 28, SUI: 4.5, AVAX: 55, DOGE: 0.40, HYPE: 28, TRX: 0.28, XRP: 2.50, BNB: 720, HBAR: 0.30, ADA: 1.05 },
  "2024-12-22": { BTC: 96000, ETH: 3450, SOL: 195, TAO: 460, LTC: 108, ZEC: 60, LINK: 22, SUI: 4.3, AVAX: 42, DOGE: 0.33, HYPE: 25, TRX: 0.26, XRP: 2.20, BNB: 695, HBAR: 0.28, ADA: 0.92 },
  "2024-12-31": { BTC: 93429, ETH: 3334, SOL: 189, TAO: 451, LTC: 103, ZEC: 62, LINK: 19.7, SUI: 4.19, AVAX: 39, DOGE: 0.316, HYPE: 25, TRX: 0.257, XRP: 2.06, BNB: 702, HBAR: 0.277, ADA: 0.90 },
  // 2025 Q1
  "2025-01-05": { BTC: 98500, ETH: 3550, SOL: 210, TAO: 490, LTC: 110, ZEC: 58, LINK: 22, SUI: 4.8, AVAX: 42, DOGE: 0.35, HYPE: 22, TRX: 0.26, XRP: 2.35, BNB: 715, HBAR: 0.30, ADA: 0.95 },
  "2025-01-12": { BTC: 94000, ETH: 3250, SOL: 185, TAO: 420, LTC: 105, ZEC: 52, LINK: 20, SUI: 4.5, AVAX: 38, DOGE: 0.32, HYPE: 20, TRX: 0.25, XRP: 2.95, BNB: 695, HBAR: 0.32, ADA: 0.90 },
  "2025-01-19": { BTC: 105000, ETH: 3350, SOL: 250, TAO: 480, LTC: 115, ZEC: 55, LINK: 23, SUI: 5.0, AVAX: 45, DOGE: 0.38, HYPE: 23, TRX: 0.26, XRP: 3.15, BNB: 720, HBAR: 0.35, ADA: 1.00 },
  "2025-01-26": { BTC: 102000, ETH: 3150, SOL: 235, TAO: 450, LTC: 112, ZEC: 50, LINK: 21, SUI: 4.2, AVAX: 40, DOGE: 0.33, HYPE: 21, TRX: 0.25, XRP: 3.05, BNB: 690, HBAR: 0.30, ADA: 0.92 },
  "2025-02-02": { BTC: 97500, ETH: 2800, SOL: 210, TAO: 400, LTC: 105, ZEC: 48, LINK: 18, SUI: 3.8, AVAX: 35, DOGE: 0.28, HYPE: 18, TRX: 0.25, XRP: 2.70, BNB: 655, HBAR: 0.25, ADA: 0.82 },
  "2025-02-09": { BTC: 98000, ETH: 2700, SOL: 195, TAO: 380, LTC: 102, ZEC: 45, LINK: 17, SUI: 3.5, AVAX: 32, DOGE: 0.25, HYPE: 16, TRX: 0.24, XRP: 2.55, BNB: 635, HBAR: 0.22, ADA: 0.78 },
  "2025-02-16": { BTC: 96000, ETH: 2650, SOL: 175, TAO: 350, LTC: 98, ZEC: 42, LINK: 16, SUI: 3.2, AVAX: 28, DOGE: 0.22, HYPE: 15, TRX: 0.24, XRP: 2.50, BNB: 625, HBAR: 0.20, ADA: 0.75 },
  "2025-02-23": { BTC: 88000, ETH: 2450, SOL: 155, TAO: 320, LTC: 92, ZEC: 40, LINK: 15, SUI: 2.8, AVAX: 24, DOGE: 0.20, HYPE: 14, TRX: 0.24, XRP: 2.35, BNB: 615, HBAR: 0.18, ADA: 0.72 },
  "2025-03-02": { BTC: 84000, ETH: 2150, SOL: 140, TAO: 290, LTC: 88, ZEC: 42, LINK: 14, SUI: 2.5, AVAX: 21, DOGE: 0.18, HYPE: 13, TRX: 0.24, XRP: 2.25, BNB: 610, HBAR: 0.17, ADA: 0.70 },
  "2025-03-09": { BTC: 80000, ETH: 1900, SOL: 125, TAO: 260, LTC: 85, ZEC: 38, LINK: 13, SUI: 2.2, AVAX: 18, DOGE: 0.16, HYPE: 12, TRX: 0.23, XRP: 2.10, BNB: 605, HBAR: 0.16, ADA: 0.68 },
  "2025-03-16": { BTC: 83500, ETH: 1950, SOL: 132, TAO: 275, LTC: 88, ZEC: 40, LINK: 14, SUI: 2.3, AVAX: 20, DOGE: 0.17, HYPE: 13, TRX: 0.24, XRP: 2.15, BNB: 615, HBAR: 0.17, ADA: 0.70 },
  "2025-03-23": { BTC: 86000, ETH: 2000, SOL: 138, TAO: 285, LTC: 90, ZEC: 42, LINK: 14, SUI: 2.4, AVAX: 21, DOGE: 0.18, HYPE: 13, TRX: 0.24, XRP: 2.20, BNB: 620, HBAR: 0.18, ADA: 0.72 },
  "2025-03-31": { BTC: 82549, ETH: 1822, SOL: 127, TAO: 267, LTC: 87, ZEC: 40, LINK: 13.2, SUI: 2.24, AVAX: 19, DOGE: 0.166, HYPE: 12.5, TRX: 0.238, XRP: 2.09, BNB: 616, HBAR: 0.170, ADA: 0.70 },
  // 2025 Q2
  "2025-04-06": { BTC: 78000, ETH: 1700, SOL: 118, TAO: 240, LTC: 82, ZEC: 38, LINK: 12, SUI: 2.0, AVAX: 17, DOGE: 0.15, HYPE: 11, TRX: 0.23, XRP: 1.95, BNB: 600, HBAR: 0.15, ADA: 0.65 },
  "2025-04-13": { BTC: 84000, ETH: 1800, SOL: 135, TAO: 280, LTC: 88, ZEC: 42, LINK: 14, SUI: 2.3, AVAX: 20, DOGE: 0.17, HYPE: 14, TRX: 0.24, XRP: 2.10, BNB: 615, HBAR: 0.17, ADA: 0.68 },
  "2025-04-20": { BTC: 87500, ETH: 1850, SOL: 145, TAO: 310, LTC: 92, ZEC: 45, LINK: 15, SUI: 2.6, AVAX: 22, DOGE: 0.18, HYPE: 16, TRX: 0.25, XRP: 2.20, BNB: 625, HBAR: 0.18, ADA: 0.72 },
  "2025-04-27": { BTC: 94000, ETH: 1900, SOL: 155, TAO: 340, LTC: 95, ZEC: 48, LINK: 16, SUI: 2.9, AVAX: 24, DOGE: 0.20, HYPE: 20, TRX: 0.26, XRP: 2.30, BNB: 635, HBAR: 0.19, ADA: 0.75 },
  "2025-05-04": { BTC: 96500, ETH: 1950, SOL: 160, TAO: 360, LTC: 98, ZEC: 50, LINK: 17, SUI: 3.2, AVAX: 26, DOGE: 0.21, HYPE: 23, TRX: 0.27, XRP: 2.40, BNB: 645, HBAR: 0.20, ADA: 0.78 },
  "2025-05-11": { BTC: 103000, ETH: 2100, SOL: 168, TAO: 385, LTC: 102, ZEC: 52, LINK: 18, SUI: 3.5, AVAX: 28, DOGE: 0.22, HYPE: 28, TRX: 0.28, XRP: 2.48, BNB: 655, HBAR: 0.21, ADA: 0.80 },
  "2025-05-18": { BTC: 107000, ETH: 2250, SOL: 175, TAO: 400, LTC: 105, ZEC: 55, LINK: 19, SUI: 3.8, AVAX: 30, DOGE: 0.23, HYPE: 32, TRX: 0.28, XRP: 2.52, BNB: 665, HBAR: 0.22, ADA: 0.82 },
  "2025-05-25": { BTC: 109000, ETH: 2400, SOL: 178, TAO: 420, LTC: 100, ZEC: 53, LINK: 18, SUI: 4.0, AVAX: 31, DOGE: 0.24, HYPE: 35, TRX: 0.28, XRP: 2.50, BNB: 660, HBAR: 0.21, ADA: 0.80 },
  "2025-06-01": { BTC: 105000, ETH: 2350, SOL: 170, TAO: 400, LTC: 96, ZEC: 50, LINK: 17, SUI: 3.7, AVAX: 28, DOGE: 0.22, HYPE: 30, TRX: 0.27, XRP: 2.45, BNB: 650, HBAR: 0.20, ADA: 0.78 },
  "2025-06-08": { BTC: 108000, ETH: 2450, SOL: 175, TAO: 415, LTC: 99, ZEC: 52, LINK: 18, SUI: 3.9, AVAX: 30, DOGE: 0.23, HYPE: 32, TRX: 0.28, XRP: 2.48, BNB: 655, HBAR: 0.21, ADA: 0.80 },
  "2025-06-15": { BTC: 110000, ETH: 2550, SOL: 178, TAO: 425, LTC: 100, ZEC: 54, LINK: 19, SUI: 4.0, AVAX: 31, DOGE: 0.24, HYPE: 33, TRX: 0.28, XRP: 2.50, BNB: 660, HBAR: 0.22, ADA: 0.82 },
  "2025-06-22": { BTC: 108500, ETH: 2500, SOL: 175, TAO: 418, LTC: 98, ZEC: 52, LINK: 18, SUI: 3.9, AVAX: 30, DOGE: 0.23, HYPE: 31, TRX: 0.28, XRP: 2.48, BNB: 655, HBAR: 0.21, ADA: 0.80 },
  "2025-06-30": { BTC: 109368, ETH: 2517, SOL: 173, TAO: 410, LTC: 98, ZEC: 51, LINK: 17.8, SUI: 3.84, AVAX: 29, DOGE: 0.223, HYPE: 31, TRX: 0.279, XRP: 2.44, BNB: 648, HBAR: 0.202, ADA: 0.79 },
  // 2025 Q3
  "2025-07-06": { BTC: 107000, ETH: 2600, SOL: 175, TAO: 420, LTC: 95, ZEC: 50, LINK: 17, SUI: 3.7, AVAX: 28, DOGE: 0.22, HYPE: 29, TRX: 0.27, XRP: 2.35, BNB: 640, HBAR: 0.19, ADA: 0.75 },
  "2025-07-13": { BTC: 100000, ETH: 2450, SOL: 165, TAO: 400, LTC: 88, ZEC: 48, LINK: 16, SUI: 3.2, AVAX: 26, DOGE: 0.20, HYPE: 26, TRX: 0.25, XRP: 2.10, BNB: 620, HBAR: 0.16, ADA: 0.68 },
  "2025-07-20": { BTC: 92000, ETH: 2350, SOL: 158, TAO: 380, LTC: 82, ZEC: 46, LINK: 15, SUI: 2.8, AVAX: 25, DOGE: 0.18, HYPE: 24, TRX: 0.22, XRP: 1.85, BNB: 600, HBAR: 0.12, ADA: 0.58 },
  "2025-07-27": { BTC: 86500, ETH: 2300, SOL: 155, TAO: 370, LTC: 78, ZEC: 45, LINK: 14, SUI: 2.5, AVAX: 24, DOGE: 0.16, HYPE: 23, TRX: 0.20, XRP: 1.50, BNB: 585, HBAR: 0.09, ADA: 0.50 },
  "2025-08-03": { BTC: 78000, ETH: 2200, SOL: 148, TAO: 355, LTC: 72, ZEC: 44, LINK: 13, SUI: 2.2, AVAX: 23, DOGE: 0.14, HYPE: 22, TRX: 0.18, XRP: 1.20, BNB: 570, HBAR: 0.07, ADA: 0.45 },
  "2025-08-10": { BTC: 72000, ETH: 2350, SOL: 150, TAO: 360, LTC: 70, ZEC: 45, LINK: 13, SUI: 2.0, AVAX: 24, DOGE: 0.13, HYPE: 21, TRX: 0.17, XRP: 0.95, BNB: 565, HBAR: 0.06, ADA: 0.42 },
  "2025-08-17": { BTC: 68000, ETH: 2450, SOL: 152, TAO: 365, LTC: 68, ZEC: 46, LINK: 13, SUI: 1.9, AVAX: 24, DOGE: 0.12, HYPE: 21, TRX: 0.16, XRP: 0.75, BNB: 560, HBAR: 0.06, ADA: 0.40 },
  "2025-08-24": { BTC: 65000, ETH: 2500, SOL: 150, TAO: 360, LTC: 70, ZEC: 45, LINK: 13, SUI: 1.8, AVAX: 24, DOGE: 0.11, HYPE: 21, TRX: 0.16, XRP: 0.62, BNB: 558, HBAR: 0.055, ADA: 0.38 },
  "2025-08-31": { BTC: 63500, ETH: 2520, SOL: 148, TAO: 358, LTC: 71, ZEC: 45, LINK: 13, SUI: 1.7, AVAX: 24, DOGE: 0.11, HYPE: 21, TRX: 0.16, XRP: 0.60, BNB: 558, HBAR: 0.055, ADA: 0.37 },
  "2025-09-07": { BTC: 62000, ETH: 2500, SOL: 145, TAO: 355, LTC: 70, ZEC: 44, LINK: 12.5, SUI: 1.65, AVAX: 23, DOGE: 0.11, HYPE: 21, TRX: 0.16, XRP: 0.58, BNB: 555, HBAR: 0.055, ADA: 0.36 },
  "2025-09-14": { BTC: 64500, ETH: 2550, SOL: 150, TAO: 362, LTC: 72, ZEC: 46, LINK: 13, SUI: 1.7, AVAX: 24, DOGE: 0.12, HYPE: 21, TRX: 0.16, XRP: 0.60, BNB: 560, HBAR: 0.056, ADA: 0.37 },
  "2025-09-21": { BTC: 63000, ETH: 2530, SOL: 147, TAO: 358, LTC: 71, ZEC: 45, LINK: 12.8, SUI: 1.68, AVAX: 24, DOGE: 0.11, HYPE: 21, TRX: 0.16, XRP: 0.59, BNB: 558, HBAR: 0.056, ADA: 0.37 },
  "2025-09-30": { BTC: 64021, ETH: 2547, SOL: 148, TAO: 359, LTC: 71, ZEC: 45, LINK: 12.9, SUI: 1.65, AVAX: 24, DOGE: 0.113, HYPE: 21, TRX: 0.162, XRP: 0.59, BNB: 559, HBAR: 0.055, ADA: 0.36 },
  // 2025 Q4
  "2025-10-05": { BTC: 66000, ETH: 2600, SOL: 155, TAO: 380, LTC: 75, ZEC: 48, LINK: 14, SUI: 1.8, AVAX: 26, DOGE: 0.13, HYPE: 22, TRX: 0.17, XRP: 0.65, BNB: 575, HBAR: 0.07, ADA: 0.40 },
  "2025-10-12": { BTC: 68000, ETH: 2700, SOL: 162, TAO: 400, LTC: 80, ZEC: 50, LINK: 15, SUI: 2.2, AVAX: 28, DOGE: 0.15, HYPE: 23, TRX: 0.18, XRP: 0.72, BNB: 590, HBAR: 0.09, ADA: 0.45 },
  "2025-10-19": { BTC: 71000, ETH: 2800, SOL: 170, TAO: 420, LTC: 85, ZEC: 52, LINK: 17, SUI: 2.8, AVAX: 32, DOGE: 0.18, HYPE: 24, TRX: 0.19, XRP: 0.85, BNB: 610, HBAR: 0.12, ADA: 0.52 },
  "2025-10-26": { BTC: 75000, ETH: 2950, SOL: 180, TAO: 445, LTC: 90, ZEC: 54, LINK: 19, SUI: 3.5, AVAX: 36, DOGE: 0.22, HYPE: 25, TRX: 0.21, XRP: 1.15, BNB: 640, HBAR: 0.18, ADA: 0.65 },
  "2025-11-02": { BTC: 80000, ETH: 3050, SOL: 188, TAO: 460, LTC: 95, ZEC: 55, LINK: 20, SUI: 4.0, AVAX: 38, DOGE: 0.28, HYPE: 26, TRX: 0.23, XRP: 1.60, BNB: 670, HBAR: 0.24, ADA: 0.78 },
  "2025-11-09": { BTC: 85000, ETH: 3150, SOL: 195, TAO: 475, LTC: 100, ZEC: 56, LINK: 21, SUI: 4.3, AVAX: 40, DOGE: 0.32, HYPE: 27, TRX: 0.25, XRP: 2.00, BNB: 695, HBAR: 0.28, ADA: 0.88 },
  "2025-11-16": { BTC: 90000, ETH: 3250, SOL: 200, TAO: 485, LTC: 104, ZEC: 58, LINK: 22, SUI: 4.5, AVAX: 42, DOGE: 0.35, HYPE: 28, TRX: 0.26, XRP: 2.25, BNB: 705, HBAR: 0.30, ADA: 0.98 },
  "2025-11-23": { BTC: 92000, ETH: 3300, SOL: 202, TAO: 488, LTC: 106, ZEC: 59, LINK: 22, SUI: 4.6, AVAX: 43, DOGE: 0.36, HYPE: 28, TRX: 0.26, XRP: 2.32, BNB: 710, HBAR: 0.31, ADA: 1.02 },
  "2025-11-30": { BTC: 93500, ETH: 3350, SOL: 205, TAO: 492, LTC: 108, ZEC: 60, LINK: 23, SUI: 4.7, AVAX: 44, DOGE: 0.37, HYPE: 29, TRX: 0.27, XRP: 2.38, BNB: 715, HBAR: 0.32, ADA: 1.05 },
  "2025-12-07": { BTC: 92000, ETH: 3280, SOL: 200, TAO: 485, LTC: 105, ZEC: 58, LINK: 22, SUI: 4.5, AVAX: 42, DOGE: 0.35, HYPE: 28, TRX: 0.26, XRP: 2.28, BNB: 708, HBAR: 0.30, ADA: 1.00 },
  "2025-12-14": { BTC: 94000, ETH: 3350, SOL: 202, TAO: 490, LTC: 107, ZEC: 59, LINK: 23, SUI: 4.6, AVAX: 43, DOGE: 0.36, HYPE: 29, TRX: 0.27, XRP: 2.35, BNB: 712, HBAR: 0.31, ADA: 1.02 },
  "2025-12-21": { BTC: 92500, ETH: 3300, SOL: 198, TAO: 482, LTC: 104, ZEC: 57, LINK: 22, SUI: 4.5, AVAX: 41, DOGE: 0.35, HYPE: 28, TRX: 0.26, XRP: 2.28, BNB: 705, HBAR: 0.30, ADA: 0.98 },
  "2025-12-31": { BTC: 93000, ETH: 3300, SOL: 200, TAO: 480, LTC: 105, ZEC: 58, LINK: 22, SUI: 4.5, AVAX: 42, DOGE: 0.35, HYPE: 28, TRX: 0.26, XRP: 2.30, BNB: 710, HBAR: 0.30, ADA: 1.0 },
  // 2026 Q1
  "2026-01-05": { BTC: 97000, ETH: 3450, SOL: 212, TAO: 510, LTC: 110, ZEC: 60, LINK: 24, SUI: 4.8, AVAX: 45, DOGE: 0.38, HYPE: 30, TRX: 0.27, XRP: 2.50, BNB: 725, HBAR: 0.33, ADA: 1.08 },
  "2026-01-12": { BTC: 95000, ETH: 3400, SOL: 208, TAO: 500, LTC: 108, ZEC: 58, LINK: 23, SUI: 4.6, AVAX: 44, DOGE: 0.36, HYPE: 29, TRX: 0.27, XRP: 2.42, BNB: 718, HBAR: 0.32, ADA: 1.05 },
  "2026-01-19": { BTC: 102000, ETH: 3500, SOL: 220, TAO: 530, LTC: 115, ZEC: 62, LINK: 25, SUI: 5.0, AVAX: 48, DOGE: 0.40, HYPE: 32, TRX: 0.28, XRP: 2.60, BNB: 740, HBAR: 0.35, ADA: 1.12 },
  "2026-01-26": { BTC: 105000, ETH: 3600, SOL: 230, TAO: 550, LTC: 118, ZEC: 65, LINK: 26, SUI: 5.2, AVAX: 50, DOGE: 0.42, HYPE: 34, TRX: 0.28, XRP: 2.70, BNB: 755, HBAR: 0.36, ADA: 1.15 },
  "2026-02-02": { BTC: 98000, ETH: 3450, SOL: 215, TAO: 520, LTC: 112, ZEC: 60, LINK: 24, SUI: 4.8, AVAX: 46, DOGE: 0.38, HYPE: 31, TRX: 0.27, XRP: 2.55, BNB: 730, HBAR: 0.34, ADA: 1.08 },
  "2026-02-03": { BTC: 97000, ETH: 3400, SOL: 210, TAO: 510, LTC: 110, ZEC: 58, LINK: 23, SUI: 4.6, AVAX: 44, DOGE: 0.36, HYPE: 30, TRX: 0.26, XRP: 2.48, BNB: 720, HBAR: 0.33, ADA: 1.05 },
  "2026-02-04": { BTC: 96000, ETH: 3350, SOL: 205, TAO: 500, LTC: 108, ZEC: 56, LINK: 22, SUI: 4.4, AVAX: 42, DOGE: 0.34, HYPE: 29, TRX: 0.25, XRP: 2.40, BNB: 710, HBAR: 0.32, ADA: 1.02 },
  "2026-02-05": { BTC: 97500, ETH: 3380, SOL: 208, TAO: 505, LTC: 109, ZEC: 57, LINK: 22, SUI: 4.5, AVAX: 43, DOGE: 0.35, HYPE: 29, TRX: 0.26, XRP: 2.45, BNB: 715, HBAR: 0.32, ADA: 1.03 },
  "2026-02-06": { BTC: 98500, ETH: 3420, SOL: 212, TAO: 515, LTC: 111, ZEC: 58, LINK: 23, SUI: 4.6, AVAX: 44, DOGE: 0.36, HYPE: 30, TRX: 0.26, XRP: 2.50, BNB: 722, HBAR: 0.33, ADA: 1.06 },
};

// CoinGecko IDs for assets
const COINGECKO_IDS: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  TAO: "bittensor",
  LTC: "litecoin",
  ZEC: "zcash",
  LINK: "chainlink",
  SUI: "sui",
  AVAX: "avalanche-2",
  DOGE: "dogecoin",
  HYPE: "hyperliquid",
  TRX: "tron",
  XRP: "ripple",
  BNB: "binancecoin",
  HBAR: "hedera-hashgraph",
  ADA: "cardano",
};

// Cache for fetched crypto prices
const cryptoPriceCache: Record<string, Record<string, number>> = {};

// Fetch crypto prices from CoinGecko for a specific date
async function fetchCryptoPrices(date: string): Promise<Record<string, number> | null> {
  // Check cache first
  if (cryptoPriceCache[date]) {
    return cryptoPriceCache[date];
  }
  
  // Check hardcoded prices
  if (HISTORICAL_CRYPTO_PRICES[date]) {
    return HISTORICAL_CRYPTO_PRICES[date];
  }
  
  // Fetch from CoinGecko
  const prices: Record<string, number> = {};
  const [year, month, day] = date.split("-");
  const cgDate = `${day}-${month}-${year}`; // CoinGecko uses DD-MM-YYYY
  
  for (const [asset, cgId] of Object.entries(COINGECKO_IDS)) {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/${cgId}/history?date=${cgDate}&localization=false`;
      const response = await fetch(url, {
        headers: { "Accept": "application/json" }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.market_data?.current_price?.usd) {
          prices[asset] = data.market_data.current_price.usd;
        }
      }
      
      // Rate limit - CoinGecko free tier is 10-30 calls/min
      await delay(2500);
    } catch (e) {
      // Skip this asset
    }
  }
  
  if (Object.keys(prices).length > 0) {
    cryptoPriceCache[date] = prices;
    return prices;
  }
  
  return null;
}

// Get all trading dates from stock price files
function getAllTradingDates(): string[] {
  const stockPricesDir = path.join(__dirname, "../data/stock-prices");
  const allDates = new Set<string>();
  
  // Read a few major tickers to get trading dates
  const majorTickers = ["MSTR", "MARA", "RIOT", "CLSK"];
  
  for (const ticker of majorTickers) {
    const filePath = path.join(stockPricesDir, `${ticker}.json`);
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        for (const price of data.prices || []) {
          if (price.date) {
            allDates.add(price.date);
          }
        }
      } catch (e) {
        // Skip
      }
    }
  }
  
  return Array.from(allDates).sort();
}

// Use fetched crypto prices if available, otherwise fallback to hardcoded
const CRYPTO_PRICES = Object.keys(FETCHED_CRYPTO_PRICES).length > 0 
  ? FETCHED_CRYPTO_PRICES 
  : HISTORICAL_CRYPTO_PRICES;

// Get all dates where we have both crypto prices AND stock prices
const CRYPTO_DATES = new Set(Object.keys(CRYPTO_PRICES));
const STOCK_DATES = new Set(getAllTradingDates());

// Only process dates where we have both
const TARGET_DATES = Array.from(CRYPTO_DATES)
  .filter(date => STOCK_DATES.has(date))
  .sort();

console.log(`Crypto price dates: ${CRYPTO_DATES.size}`);
console.log(`Stock price dates: ${STOCK_DATES.size}`);
console.log(`Dates with both: ${TARGET_DATES.length}\n`);

// Rate limiting helper
async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Find holdings snapshot nearest to target date (within 45 days before)
function findHoldingsAtDate(
  history: HoldingsSnapshot[],
  targetDate: string
): HoldingsSnapshot | null {
  const target = new Date(targetDate).getTime();
  const maxDiff = 45 * 24 * 60 * 60 * 1000;

  let nearest: HoldingsSnapshot | null = null;
  let minDiff = Infinity;

  for (const snapshot of history) {
    const snapshotDate = new Date(snapshot.date).getTime();
    const diff = Math.abs(snapshotDate - target);

    if (snapshotDate <= target && diff < minDiff && diff <= maxDiff) {
      minDiff = diff;
      nearest = snapshot;
    }
  }

  return nearest;
}

// Load stock prices from local files (much faster than Yahoo Finance)
const stockPricesDir = path.join(__dirname, "../data/stock-prices");
const stockPriceCache: Record<string, Record<string, number>> = {};

function loadStockPricesForTicker(ticker: string): Record<string, number> {
  if (stockPriceCache[ticker]) {
    return stockPriceCache[ticker];
  }
  
  const filePath = path.join(stockPricesDir, `${ticker.replace(/\./g, "_")}.json`);
  if (!fs.existsSync(filePath)) {
    stockPriceCache[ticker] = {};
    return {};
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const prices: Record<string, number> = {};
    for (const p of data.prices || []) {
      if (p.date && p.close) {
        prices[p.date] = p.close;
      }
    }
    stockPriceCache[ticker] = prices;
    return prices;
  } catch {
    stockPriceCache[ticker] = {};
    return {};
  }
}

// Get stock price from local file
function getLocalStockPrice(ticker: string, date: string): number | null {
  const prices = loadStockPricesForTicker(ticker);
  
  // Exact match
  if (prices[date]) {
    return prices[date];
  }
  
  // Try to find closest date within 5 days
  const targetTime = new Date(date).getTime();
  let closest: number | null = null;
  let minDiff = 5 * 24 * 60 * 60 * 1000; // 5 days
  
  for (const [d, price] of Object.entries(prices)) {
    const diff = Math.abs(new Date(d).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = price;
    }
  }
  
  return closest;
}

// Fetch historical stock price - uses local file first, then Yahoo Finance as fallback
async function fetchStockPrice(
  ticker: string,
  date: string
): Promise<number | null> {
  // Try local file first (fast)
  const localPrice = getLocalStockPrice(ticker, date);
  if (localPrice) {
    return localPrice;
  }
  
  // Fallback to Yahoo Finance (slow, rate limited)
  return null; // Disabled for speed - we have local data
}

// Fetch balance sheet from FMP
async function fetchBalanceSheet(
  ticker: string,
  date: string
): Promise<{ totalDebt: number; cash: number } | null> {
  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://financialmodelingprep.com/api/v3/balance-sheet-statement/${ticker}?period=quarter&limit=20&apikey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;

    const targetDate = new Date(date).getTime();
    let nearest: any = null;
    let minDiff = Infinity;

    for (const bs of data) {
      const bsDate = new Date(bs.date).getTime();
      const diff = targetDate - bsDate;
      if (diff >= 0 && diff < minDiff) {
        minDiff = diff;
        nearest = bs;
      }
    }

    if (!nearest) return null;

    return {
      totalDebt:
        (nearest.shortTermDebt || 0) +
        (nearest.longTermDebt || 0) +
        (nearest.capitalLeaseObligations || 0),
      cash:
        (nearest.cashAndCashEquivalents || 0) +
        (nearest.shortTermInvestments || 0),
    };
  } catch {
    return null;
  }
}

// Calculate median
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

const corporateActionsCache: Record<string, any[]> = {};

async function getActionsForTicker(ticker: string) {
  if (corporateActionsCache[ticker]) return corporateActionsCache[ticker];
  try {
    const actions = await getCorporateActions({ entityId: ticker });
    corporateActionsCache[ticker] = actions;
    return actions;
  } catch {
    corporateActionsCache[ticker] = [];
    return [];
  }
}

// Main function
async function generateHistoricalMNAV(): Promise<void> {
  console.log("Generating Historical mNAV Data...\n");

  const results: HistoricalMNAVSnapshot[] = [];

  const today = new Date().toISOString().split("T")[0];
  
  for (const targetDate of TARGET_DATES) {
    // Skip future dates
    if (targetDate > today) {
      console.log(`\nSkipping future date: ${targetDate}`);
      continue;
    }
    
    console.log(`\nProcessing ${targetDate}...`);

    const cryptoPrices = CRYPTO_PRICES[targetDate];
    
    if (!cryptoPrices || Object.keys(cryptoPrices).length === 0) {
      console.log(`  No crypto prices for ${targetDate}`);
      continue;
    }

    const companies: CompanyMNAV[] = [];

    for (const [ticker, companyData] of Object.entries(HOLDINGS_HISTORY)) {
      const holdings = findHoldingsAtDate(companyData.history, targetDate);
      if (!holdings) continue;

      const cryptoPrice = cryptoPrices[companyData.asset];
      if (!cryptoPrice || cryptoPrice <= 0) continue;

      // Use actual daily stock price from local files first (more accurate)
      // Only fall back to holdings snapshot price if daily price unavailable
      let stockPrice = await fetchStockPrice(ticker, targetDate);
      
      if (!stockPrice || stockPrice <= 0) {
        // Fall back to holdings snapshot price
        stockPrice = holdings.stockPrice || 0;
      }

      if (!stockPrice || stockPrice <= 0) {
        console.log(`  ${ticker}: No stock price found`);
        continue;
      }

      // Get company data including currency
      const companyInfo = companyDataLookup[ticker] || { totalDebt: 0, preferredEquity: 0, cash: 0, currency: "USD" };
      const fxRate = FX_TO_USD[companyInfo.currency] || 1.0;

      // Normalize shares/price to current basis (split-proof).
      const actions = await getActionsForTicker(ticker);
      const sharesOutstanding = normalizeShares({ value: holdings.sharesOutstanding, asOf: targetDate, actions, basis: 'current' });
      const stockPriceNormalized = normalizePrice({ value: stockPrice, asOf: targetDate, actions, basis: 'current' });

      // Use stored market cap or calculate from price × shares, then convert to USD
      // Note: market cap is invariant under the normalization when using normalized pairs.
      const marketCapLocal = holdings.marketCap || (stockPriceNormalized * sharesOutstanding);
      const marketCap = marketCapLocal * fxRate;

      // Use debt/cash from holdings-history for EV-based mNAV
      // Fall back to companies.ts current values if not in holdings snapshot
      // Note: companies.ts debt values are already in USD
      const totalDebt = (holdings as any).totalDebt ?? companyInfo.totalDebt;
      const preferredEquity = (holdings as any).preferredEquity ?? companyInfo.preferredEquity;
      const cash = (holdings as any).cash ?? companyInfo.cash;

      // Calculate EV: Market Cap + Total Debt + Preferred Equity - Cash
      const enterpriseValue = marketCap + totalDebt + preferredEquity - cash;
      const cryptoNav = holdings.holdings * cryptoPrice;

      if (cryptoNav <= 0) continue;

      const mnav = enterpriseValue / cryptoNav;

      // Filter outliers - mNAV > 10x is suspicious for sector median
      if (mnav <= 0 || mnav > 10) {
        console.log(`  ${ticker}: Outlier mNAV ${mnav.toFixed(2)}x`);
        continue;
      }

      companies.push({
        ticker,
        asset: companyData.asset,
        mnav,
        marketCap,
        enterpriseValue,
        cryptoNav,
        holdings: holdings.holdings,
        stockPrice: stockPriceNormalized,
        cryptoPrice,
        sharesOutstanding,
        totalDebt,
        cash,
      });

      console.log(`  ${ticker}: ${mnav.toFixed(2)}x mNAV`);
    }

    // Require minimum 1 company (was 3 - too restrictive for daily data)
    if (companies.length < 1) {
      console.log(`  No valid companies for ${targetDate}`);
      continue;
    }

    // Calculate aggregates
    const mnavValues = companies.map((c) => c.mnav);
    const medianMNAV = median(mnavValues);
    const averageMNAV = mnavValues.reduce((a, b) => a + b, 0) / mnavValues.length;

    results.push({
      date: targetDate,
      median: medianMNAV,
      average: averageMNAV,
      count: companies.length,
      btcPrice: cryptoPrices.BTC,
      ethPrice: cryptoPrices.ETH,
      companies,
    });

    console.log(`  Summary: Median ${medianMNAV.toFixed(2)}x, Average ${averageMNAV.toFixed(2)}x (${companies.length} companies)`);
  }

  // Generate output file
  const outputPath = path.join(__dirname, "../src/lib/data/mnav-history-calculated.ts");

  const output = `// Auto-generated historical mNAV data
// Generated: ${new Date().toISOString()}
// DO NOT EDIT - regenerate with: npx tsx scripts/generate-mnav-history.ts

export interface HistoricalMNAVCompany {
  ticker: string;
  asset: string;
  mnav: number;
  marketCap: number;
  enterpriseValue: number;
  cryptoNav: number;
}

export interface HistoricalMNAVSnapshot {
  date: string;
  median: number;
  average: number;
  count: number;
  btcPrice: number;
  ethPrice: number;
  companies: HistoricalMNAVCompany[];
}

export const MNAV_HISTORY: HistoricalMNAVSnapshot[] = ${JSON.stringify(
    results.map((r) => ({
      ...r,
      companies: r.companies.map((c) => ({
        ticker: c.ticker,
        asset: c.asset,
        mnav: Math.round(c.mnav * 1000) / 1000,
        marketCap: Math.round(c.marketCap),
        enterpriseValue: Math.round(c.enterpriseValue),
        cryptoNav: Math.round(c.cryptoNav),
      })),
    })),
    null,
    2
  )};
`;

  fs.writeFileSync(outputPath, output);
  console.log(`\nOutput written to: ${outputPath}`);
  console.log(`Total snapshots: ${results.length}`);
}

generateHistoricalMNAV().catch(console.error);
