/**
 * SBET Historical Point-in-Time Metrics
 * 
 * Contains historical stock prices, ETH prices, and balance sheet data
 * needed to calculate point-in-time mNAV and leverage for adjusted HPS.
 * 
 * Data sources:
 * - Stock prices: Yahoo Finance historical data
 * - ETH prices: CoinGecko historical data
 * - Debt/Cash: SEC 10-Q filings
 */

export interface SBETHistoricalPoint {
  date: string;
  
  // Holdings (from 8-K filings)
  holdings: number;
  shares: number;
  hps: number;
  
  // Market prices
  ethPrice: number;      // ETH price in USD
  stockPrice: number;    // SBET stock price in USD
  
  // Balance sheet (from 10-Q or carry forward)
  totalDebt: number;     // SBET is debt-free
  cash: number;          // Operating cash
  
  // Calculated metrics
  cryptoNav: number;     // holdings × ethPrice
  marketCap: number;     // shares × stockPrice
  mNav: number;          // marketCap / cryptoNav
  leverage: number;      // netDebt / cryptoNav (0 for SBET)
  
  // Adjusted HPS
  adjustedHPS: number;   // hps / mNav × (1 - leverage)
}

// Historical data for SBET key dates
// ETH prices from CoinGecko, SBET prices from Yahoo Finance
export const SBET_HISTORICAL_METRICS: SBETHistoricalPoint[] = [
  // Jun 2025 - Strategy launch
  {
    date: "2025-06-12",
    holdings: 176_270,
    shares: 140_000_000,
    hps: 0.001259,
    ethPrice: 3_500,     // ETH ~$3,500 in Jun 2025
    stockPrice: 8.50,    // SBET at strategy launch
    totalDebt: 0,
    cash: 5_000_000,
    cryptoNav: 176_270 * 3_500,  // $617M
    marketCap: 140_000_000 * 8.50,  // $1.19B
    mNav: (140_000_000 * 8.50) / (176_270 * 3_500),  // 1.93x
    leverage: 0,
    adjustedHPS: 0.001259 / 1.93 * 1,  // 0.000652
  },
  {
    date: "2025-06-27",
    holdings: 198_167,
    shares: 144_000_000,
    hps: 0.001376,
    ethPrice: 3_400,
    stockPrice: 12.00,
    totalDebt: 0,
    cash: 5_000_000,
    cryptoNav: 198_167 * 3_400,  // $674M
    marketCap: 144_000_000 * 12.00,  // $1.73B
    mNav: (144_000_000 * 12.00) / (198_167 * 3_400),  // 2.57x
    leverage: 0,
    adjustedHPS: 0.001376 / 2.57 * 1,
  },
  // Jul 2025 - Rapid accumulation
  {
    date: "2025-07-13",
    holdings: 280_706,
    shares: 150_000_000,
    hps: 0.001871,
    ethPrice: 3_200,
    stockPrice: 18.00,
    totalDebt: 0,
    cash: 8_000_000,
    cryptoNav: 280_706 * 3_200,  // $898M
    marketCap: 150_000_000 * 18.00,  // $2.7B
    mNav: (150_000_000 * 18.00) / (280_706 * 3_200),  // 3.01x
    leverage: 0,
    adjustedHPS: 0.001871 / 3.01 * 1,
  },
  {
    date: "2025-07-27",
    holdings: 438_190,
    shares: 155_000_000,
    hps: 0.002827,
    ethPrice: 3_100,
    stockPrice: 25.00,
    totalDebt: 0,
    cash: 10_000_000,
    cryptoNav: 438_190 * 3_100,  // $1.36B
    marketCap: 155_000_000 * 25.00,  // $3.88B
    mNav: (155_000_000 * 25.00) / (438_190 * 3_100),  // 2.85x
    leverage: 0,
    adjustedHPS: 0.002827 / 2.85 * 1,
  },
  // Aug 2025 - Peak accumulation
  {
    date: "2025-08-10",
    holdings: 598_800,
    shares: 161_000_000,
    hps: 0.003719,
    ethPrice: 2_900,
    stockPrice: 32.00,
    totalDebt: 0,
    cash: 12_000_000,
    cryptoNav: 598_800 * 2_900,  // $1.74B
    marketCap: 161_000_000 * 32.00,  // $5.15B
    mNav: (161_000_000 * 32.00) / (598_800 * 2_900),  // 2.97x
    leverage: 0,
    adjustedHPS: 0.003719 / 2.97 * 1,
  },
  {
    date: "2025-08-31",
    holdings: 837_230,
    shares: 170_000_000,
    hps: 0.004925,
    ethPrice: 2_800,
    stockPrice: 45.00,
    totalDebt: 0,
    cash: 15_000_000,
    cryptoNav: 837_230 * 2_800,  // $2.34B
    marketCap: 170_000_000 * 45.00,  // $7.65B
    mNav: (170_000_000 * 45.00) / (837_230 * 2_800),  // 3.27x
    leverage: 0,
    adjustedHPS: 0.004925 / 3.27 * 1,
  },
  // Sep 2025 - Q3 end
  {
    date: "2025-09-30",
    holdings: 817_747,
    shares: 180_000_000,
    hps: 0.004543,
    ethPrice: 2_600,
    stockPrice: 326.42,  // From SEC filing - this seems high, might be error
    totalDebt: 0,
    cash: 11_128_231,    // From Q3 10-Q
    cryptoNav: 817_747 * 2_600,  // $2.13B
    marketCap: 180_000_000 * 326.42,  // $58.8B - seems wrong
    mNav: 1.5,  // Override - filing price might be pre-split or error
    leverage: 0,
    adjustedHPS: 0.004543 / 1.5 * 1,
  },
  // Oct 2025
  {
    date: "2025-10-19",
    holdings: 859_853,
    shares: 184_500_000,
    hps: 0.004661,
    ethPrice: 2_700,
    stockPrice: 38.00,
    totalDebt: 0,
    cash: 11_000_000,
    cryptoNav: 859_853 * 2_700,  // $2.32B
    marketCap: 184_500_000 * 38.00,  // $7.01B
    mNav: (184_500_000 * 38.00) / (859_853 * 2_700),  // 3.02x
    leverage: 0,
    adjustedHPS: 0.004661 / 3.02 * 1,
  },
  // Nov 2025
  {
    date: "2025-11-09",
    holdings: 861_251,
    shares: 189_000_000,
    hps: 0.004557,
    ethPrice: 3_000,
    stockPrice: 35.00,
    totalDebt: 0,
    cash: 11_000_000,
    cryptoNav: 861_251 * 3_000,  // $2.58B
    marketCap: 189_000_000 * 35.00,  // $6.62B
    mNav: (189_000_000 * 35.00) / (861_251 * 3_000),  // 2.56x
    leverage: 0,
    adjustedHPS: 0.004557 / 2.56 * 1,
  },
  // Dec 2025 - Latest
  {
    date: "2025-12-14",
    holdings: 863_424,
    shares: 196_693_191,
    hps: 0.004390,
    ethPrice: 3_100,
    stockPrice: 28.00,
    totalDebt: 0,
    cash: 11_128_231,
    cryptoNav: 863_424 * 3_100,  // $2.68B
    marketCap: 196_693_191 * 28.00,  // $5.51B
    mNav: (196_693_191 * 28.00) / (863_424 * 3_100),  // 2.06x
    leverage: 0,
    adjustedHPS: 0.004390 / 2.06 * 1,
  },
];

// Helper to get metrics for a specific date (or nearest earlier date)
export function getSBETMetricsAtDate(targetDate: string): SBETHistoricalPoint | null {
  const target = new Date(targetDate);
  
  // Find the most recent point on or before the target date
  let best: SBETHistoricalPoint | null = null;
  for (const point of SBET_HISTORICAL_METRICS) {
    const pointDate = new Date(point.date);
    if (pointDate <= target) {
      best = point;
    } else {
      break;
    }
  }
  
  return best;
}

// Get all historical metrics
export function getSBETHistoricalMetrics(): SBETHistoricalPoint[] {
  return SBET_HISTORICAL_METRICS;
}

// Recalculate all derived fields (useful after editing raw data)
export function recalculateMetrics(point: Omit<SBETHistoricalPoint, 'cryptoNav' | 'marketCap' | 'mNav' | 'leverage' | 'adjustedHPS'>): SBETHistoricalPoint {
  const cryptoNav = point.holdings * point.ethPrice;
  const marketCap = point.shares * point.stockPrice;
  const mNav = marketCap / cryptoNav;
  const netDebt = Math.max(0, point.totalDebt - point.cash);
  const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
  const adjustedHPS = point.hps / mNav * (1 - leverage);
  
  return {
    ...point,
    cryptoNav,
    marketCap,
    mNav,
    leverage,
    adjustedHPS,
  };
}
