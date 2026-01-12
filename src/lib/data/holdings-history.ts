// Historical holdings per share data for companies that report it
// Sources: Company quarterly reports, 8-K filings, press releases

export interface HoldingsSnapshot {
  date: string; // YYYY-MM-DD
  holdings: number; // Total holdings (BTC, ETH, etc.)
  sharesOutstanding: number; // Diluted shares outstanding
  holdingsPerShare: number; // Calculated: holdings / shares
  source?: string; // e.g., "Q3 2024 10-Q", "8-K filing"
}

export interface CompanyHoldingsHistory {
  ticker: string;
  asset: string;
  history: HoldingsSnapshot[];
}

// MSTR historical data from quarterly reports
// Data compiled from 10-Q/10-K filings and 8-K announcements
const MSTR_HISTORY: HoldingsSnapshot[] = [
  // 2020 - Initial purchases
  { date: "2020-09-14", holdings: 38250, sharesOutstanding: 9_800_000, holdingsPerShare: 0.003903, source: "Initial BTC purchase announcement" },
  { date: "2020-12-21", holdings: 70470, sharesOutstanding: 10_300_000, holdingsPerShare: 0.006842, source: "Q4 2020" },

  // 2021
  { date: "2021-03-31", holdings: 91326, sharesOutstanding: 10_500_000, holdingsPerShare: 0.008698, source: "Q1 2021 10-Q" },
  { date: "2021-06-30", holdings: 105085, sharesOutstanding: 10_900_000, holdingsPerShare: 0.009641, source: "Q2 2021 10-Q" },
  { date: "2021-09-30", holdings: 114042, sharesOutstanding: 11_200_000, holdingsPerShare: 0.010182, source: "Q3 2021 10-Q" },
  { date: "2021-12-31", holdings: 124391, sharesOutstanding: 11_500_000, holdingsPerShare: 0.010817, source: "Q4 2021 10-K" },

  // 2022
  { date: "2022-03-31", holdings: 129218, sharesOutstanding: 11_700_000, holdingsPerShare: 0.011044, source: "Q1 2022 10-Q" },
  { date: "2022-06-30", holdings: 129699, sharesOutstanding: 11_800_000, holdingsPerShare: 0.010992, source: "Q2 2022 10-Q" },
  { date: "2022-09-30", holdings: 130000, sharesOutstanding: 11_900_000, holdingsPerShare: 0.010924, source: "Q3 2022 10-Q" },
  { date: "2022-12-31", holdings: 132500, sharesOutstanding: 12_000_000, holdingsPerShare: 0.011042, source: "Q4 2022 10-K" },

  // 2023
  { date: "2023-03-31", holdings: 140000, sharesOutstanding: 13_500_000, holdingsPerShare: 0.010370, source: "Q1 2023 10-Q" },
  { date: "2023-06-30", holdings: 152800, sharesOutstanding: 14_500_000, holdingsPerShare: 0.010538, source: "Q2 2023 10-Q" },
  { date: "2023-09-30", holdings: 158245, sharesOutstanding: 15_200_000, holdingsPerShare: 0.010411, source: "Q3 2023 10-Q" },
  { date: "2023-12-31", holdings: 189150, sharesOutstanding: 17_500_000, holdingsPerShare: 0.010809, source: "Q4 2023 10-K" },

  // 2024 - Aggressive accumulation phase
  { date: "2024-03-31", holdings: 214246, sharesOutstanding: 20_800_000, holdingsPerShare: 0.010300, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 226500, sharesOutstanding: 23_500_000, holdingsPerShare: 0.009638, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 252220, sharesOutstanding: 26_000_000, holdingsPerShare: 0.009701, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 446400, sharesOutstanding: 48_000_000, holdingsPerShare: 0.009300, source: "Q4 2024 estimates" },
];

// Other companies with reported historical data can be added here
const MARA_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 17631, sharesOutstanding: 280_000_000, holdingsPerShare: 0.0000630, source: "Q1 2024" },
  { date: "2024-06-30", holdings: 20818, sharesOutstanding: 295_000_000, holdingsPerShare: 0.0000706, source: "Q2 2024" },
  { date: "2024-09-30", holdings: 26747, sharesOutstanding: 310_000_000, holdingsPerShare: 0.0000863, source: "Q3 2024" },
  { date: "2024-12-31", holdings: 44394, sharesOutstanding: 350_000_000, holdingsPerShare: 0.0001268, source: "Q4 2024" },
];

const RIOT_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 8490, sharesOutstanding: 290_000_000, holdingsPerShare: 0.0000293, source: "Q1 2024" },
  { date: "2024-06-30", holdings: 9334, sharesOutstanding: 305_000_000, holdingsPerShare: 0.0000306, source: "Q2 2024" },
  { date: "2024-09-30", holdings: 10427, sharesOutstanding: 320_000_000, holdingsPerShare: 0.0000326, source: "Q3 2024" },
  { date: "2024-12-31", holdings: 17722, sharesOutstanding: 340_000_000, holdingsPerShare: 0.0000521, source: "Q4 2024" },
];

// Metaplanet (3350.T) - Japan's first Bitcoin treasury company
// Data from TSE filings and press releases
const METAPLANET_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-04-23", holdings: 97.85, sharesOutstanding: 17_600_000, holdingsPerShare: 0.00000556, source: "Initial BTC purchase" },
  { date: "2024-05-13", holdings: 141.07, sharesOutstanding: 18_200_000, holdingsPerShare: 0.00000775, source: "Press release" },
  { date: "2024-06-11", holdings: 161.27, sharesOutstanding: 19_500_000, holdingsPerShare: 0.00000827, source: "Press release" },
  { date: "2024-07-16", holdings: 245.99, sharesOutstanding: 24_000_000, holdingsPerShare: 0.00001025, source: "Press release" },
  { date: "2024-08-13", holdings: 360.37, sharesOutstanding: 28_500_000, holdingsPerShare: 0.00001265, source: "Press release" },
  { date: "2024-09-10", holdings: 398.83, sharesOutstanding: 32_000_000, holdingsPerShare: 0.00001246, source: "Press release" },
  { date: "2024-10-11", holdings: 530.71, sharesOutstanding: 36_000_000, holdingsPerShare: 0.00001474, source: "Press release" },
  { date: "2024-11-18", holdings: 1142.29, sharesOutstanding: 42_000_000, holdingsPerShare: 0.00002720, source: "Press release" },
  { date: "2024-12-23", holdings: 1762.00, sharesOutstanding: 46_000_000, holdingsPerShare: 0.00003830, source: "Press release" },
];

// Semler Scientific (SMLR) - Medical device company turned BTC treasury
const SMLR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-05-28", holdings: 581, sharesOutstanding: 6_900_000, holdingsPerShare: 0.0000842, source: "Initial purchase 8-K" },
  { date: "2024-06-17", holdings: 828, sharesOutstanding: 6_900_000, holdingsPerShare: 0.0001200, source: "8-K filing" },
  { date: "2024-09-30", holdings: 1058, sharesOutstanding: 7_100_000, holdingsPerShare: 0.0001490, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 2084, sharesOutstanding: 7_300_000, holdingsPerShare: 0.0002855, source: "Q4 2024 estimate" },
];

// Map of all companies with historical data
export const HOLDINGS_HISTORY: Record<string, CompanyHoldingsHistory> = {
  MSTR: { ticker: "MSTR", asset: "BTC", history: MSTR_HISTORY },
  MARA: { ticker: "MARA", asset: "BTC", history: MARA_HISTORY },
  RIOT: { ticker: "RIOT", asset: "BTC", history: RIOT_HISTORY },
  "3350.T": { ticker: "3350.T", asset: "BTC", history: METAPLANET_HISTORY },
  SMLR: { ticker: "SMLR", asset: "BTC", history: SMLR_HISTORY },
};

// Get history for a specific company
export function getHoldingsHistory(ticker: string): CompanyHoldingsHistory | null {
  return HOLDINGS_HISTORY[ticker.toUpperCase()] || null;
}

// Calculate growth metrics
export function calculateHoldingsGrowth(history: HoldingsSnapshot[]): {
  totalGrowth: number; // % growth from first to last
  annualizedGrowth: number; // CAGR
  latestHoldingsPerShare: number;
  oldestHoldingsPerShare: number;
  periodYears: number;
} | null {
  if (history.length < 2) return null;

  const oldest = history[0];
  const latest = history[history.length - 1];

  const startDate = new Date(oldest.date);
  const endDate = new Date(latest.date);
  const periodYears = (endDate.getTime() - startDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

  if (periodYears <= 0 || oldest.holdingsPerShare <= 0) return null;

  const totalGrowth = (latest.holdingsPerShare / oldest.holdingsPerShare - 1) * 100;
  const annualizedGrowth = (Math.pow(latest.holdingsPerShare / oldest.holdingsPerShare, 1 / periodYears) - 1) * 100;

  return {
    totalGrowth,
    annualizedGrowth,
    latestHoldingsPerShare: latest.holdingsPerShare,
    oldestHoldingsPerShare: oldest.holdingsPerShare,
    periodYears,
  };
}
