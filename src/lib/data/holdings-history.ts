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

// ==================== ETH COMPANIES ====================

// BTCS Inc - One of the first public ETH treasury companies
const BTCS_HISTORY: HoldingsSnapshot[] = [
  { date: "2022-12-31", holdings: 530, sharesOutstanding: 14_000_000, holdingsPerShare: 0.0000379, source: "2022 10-K" },
  { date: "2023-06-30", holdings: 785, sharesOutstanding: 14_500_000, holdingsPerShare: 0.0000541, source: "Q2 2023 10-Q" },
  { date: "2023-12-31", holdings: 1090, sharesOutstanding: 15_200_000, holdingsPerShare: 0.0000717, source: "2023 10-K" },
  { date: "2024-06-30", holdings: 1350, sharesOutstanding: 16_000_000, holdingsPerShare: 0.0000844, source: "Q2 2024 10-Q" },
  { date: "2024-12-31", holdings: 1580, sharesOutstanding: 17_500_000, holdingsPerShare: 0.0000903, source: "Q4 2024 estimate" },
];

// Bit Digital - ETH miner and holder
const BTBT_HISTORY: HoldingsSnapshot[] = [
  { date: "2023-12-31", holdings: 17245, sharesOutstanding: 102_000_000, holdingsPerShare: 0.000169, source: "2023 10-K" },
  { date: "2024-06-30", holdings: 22890, sharesOutstanding: 115_000_000, holdingsPerShare: 0.000199, source: "Q2 2024 10-Q" },
  { date: "2024-12-31", holdings: 27350, sharesOutstanding: 125_000_000, holdingsPerShare: 0.000219, source: "Q4 2024 estimate" },
];

// ==================== SOL COMPANIES ====================

// Sol Strategies (STKE.CA) - Canadian SOL treasury
const STKE_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 85000, sharesOutstanding: 45_000_000, holdingsPerShare: 0.001889, source: "Q2 2024" },
  { date: "2024-09-30", holdings: 142000, sharesOutstanding: 52_000_000, holdingsPerShare: 0.002731, source: "Q3 2024" },
  { date: "2024-12-31", holdings: 189000, sharesOutstanding: 65_000_000, holdingsPerShare: 0.002908, source: "Q4 2024 estimate" },
];

// DeFi Development Corp (DFDV) - SOL treasury
const DFDV_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-30", holdings: 52000, sharesOutstanding: 28_000_000, holdingsPerShare: 0.001857, source: "Q3 2024" },
  { date: "2024-12-31", holdings: 95000, sharesOutstanding: 35_000_000, holdingsPerShare: 0.002714, source: "Q4 2024 estimate" },
];

// KULR Technology - Bitcoin First Company
// Note: 1-for-8 reverse stock split on June 23, 2025
const KULR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-12-26", holdings: 217.18, sharesOutstanding: 210_000_000, holdingsPerShare: 0.00000103, source: "Initial BTC purchase 8-K" },
  { date: "2025-01-06", holdings: 430.6, sharesOutstanding: 220_000_000, holdingsPerShare: 0.00000196, source: "8-K filing" },
  { date: "2025-01-21", holdings: 510, sharesOutstanding: 240_000_000, holdingsPerShare: 0.00000213, source: "Press release" },
  { date: "2025-02-11", holdings: 610.3, sharesOutstanding: 260_000_000, holdingsPerShare: 0.00000235, source: "Press release" },
  { date: "2025-03-25", holdings: 668.3, sharesOutstanding: 270_000_000, holdingsPerShare: 0.00000248, source: "Press release" },
  { date: "2025-05-20", holdings: 800.3, sharesOutstanding: 290_000_000, holdingsPerShare: 0.00000276, source: "Press release" },
  // Post reverse split (1-for-8) - shares divided by 8
  { date: "2025-06-23", holdings: 920, sharesOutstanding: 37_500_000, holdingsPerShare: 0.0000245, source: "Press release + reverse split" },
  { date: "2025-07-10", holdings: 1021, sharesOutstanding: 40_000_000, holdingsPerShare: 0.0000255, source: "Press release" },
];

// Boyaa Interactive (0434.HK) - Hong Kong's largest BTC treasury
// Data from HKEX filings and press releases
const BOYAA_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-01-26", holdings: 1100, sharesOutstanding: 660_000_000, holdingsPerShare: 0.00000167, source: "Initial accumulation" },
  { date: "2024-03-29", holdings: 1194, sharesOutstanding: 660_000_000, holdingsPerShare: 0.00000181, source: "HKEX filing" },
  { date: "2024-05-22", holdings: 1956, sharesOutstanding: 660_000_000, holdingsPerShare: 0.00000296, source: "HKEX filing" },
  { date: "2024-06-28", holdings: 2079, sharesOutstanding: 660_000_000, holdingsPerShare: 0.00000315, source: "HKEX filing" },
  { date: "2024-08-21", holdings: 2410, sharesOutstanding: 660_000_000, holdingsPerShare: 0.00000365, source: "HKEX filing" },
  { date: "2024-09-27", holdings: 2635, sharesOutstanding: 660_000_000, holdingsPerShare: 0.00000399, source: "Q3 report" },
  { date: "2024-11-29", holdings: 3183, sharesOutstanding: 664_000_000, holdingsPerShare: 0.00000479, source: "ETH-to-BTC swap announcement" },
  { date: "2024-12-30", holdings: 3274, sharesOutstanding: 664_000_000, holdingsPerShare: 0.00000493, source: "HKEX filing" },
  { date: "2025-02-28", holdings: 3350, sharesOutstanding: 664_000_000, holdingsPerShare: 0.00000505, source: "Press release" },
  { date: "2025-08-22", holdings: 3670, sharesOutstanding: 686_000_000, holdingsPerShare: 0.00000535, source: "Press release" },
  { date: "2025-09-16", holdings: 3925, sharesOutstanding: 686_000_000, holdingsPerShare: 0.00000572, source: "HKEX filing" },
  { date: "2025-11-17", holdings: 4091, sharesOutstanding: 686_000_000, holdingsPerShare: 0.00000596, source: "Q3 2025 report" },
];

// Bitmine Immersion (BMNR) - World's largest ETH treasury
// Data from SEC filings and weekly press releases
const BMNR_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-07-17", holdings: 300657, sharesOutstanding: 50_000_000, holdingsPerShare: 0.006013, source: "$1B milestone press release" },
  { date: "2025-08-10", holdings: 1150263, sharesOutstanding: 150_000_000, holdingsPerShare: 0.007668, source: "Press release" },
  { date: "2025-08-17", holdings: 1523373, sharesOutstanding: 180_000_000, holdingsPerShare: 0.008463, source: "Press release" },
  { date: "2025-08-24", holdings: 1713899, sharesOutstanding: 221_515_180, holdingsPerShare: 0.007738, source: "Press release" },
  { date: "2025-09-07", holdings: 2069443, sharesOutstanding: 260_000_000, holdingsPerShare: 0.007959, source: "2M milestone" },
  { date: "2025-11-09", holdings: 3505723, sharesOutstanding: 350_000_000, holdingsPerShare: 0.010016, source: "Press release" },
  { date: "2025-11-20", holdings: 3559879, sharesOutstanding: 384_067_823, holdingsPerShare: 0.009269, source: "10-K filing" },
  { date: "2025-11-30", holdings: 3726499, sharesOutstanding: 400_000_000, holdingsPerShare: 0.009316, source: "Press release" },
  { date: "2025-12-14", holdings: 3967210, sharesOutstanding: 410_000_000, holdingsPerShare: 0.009676, source: "Press release" },
  { date: "2025-12-28", holdings: 4110525, sharesOutstanding: 425_000_000, holdingsPerShare: 0.009672, source: "Press release" },
  { date: "2026-01-04", holdings: 4143502, sharesOutstanding: 430_000_000, holdingsPerShare: 0.009636, source: "Press release" },
];

// ==================== OTHER ASSETS ====================

// CleanSpark (CLSK) - BTC miner
const CLSK_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 6591, sharesOutstanding: 230_000_000, holdingsPerShare: 0.0000287, source: "Q1 2024" },
  { date: "2024-06-30", holdings: 8049, sharesOutstanding: 250_000_000, holdingsPerShare: 0.0000322, source: "Q2 2024" },
  { date: "2024-09-30", holdings: 8701, sharesOutstanding: 270_000_000, holdingsPerShare: 0.0000322, source: "Q3 2024" },
  { date: "2024-12-31", holdings: 10556, sharesOutstanding: 290_000_000, holdingsPerShare: 0.0000364, source: "Q4 2024 estimate" },
];

// Strive (ASST) - First publicly traded asset management BTC treasury
// Data from press releases and SEC filings
const ASST_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-09-12", holdings: 5886, sharesOutstanding: 28_000_000, holdingsPerShare: 0.0002102, source: "Initial BTC treasury announcement" },
  { date: "2025-11-15", holdings: 7525, sharesOutstanding: 30_000_000, holdingsPerShare: 0.0002508, source: "SATA preferred offering" },
  { date: "2025-12-31", holdings: 7627, sharesOutstanding: 31_000_000, holdingsPerShare: 0.0002460, source: "Preliminary year-end" },
  { date: "2026-01-16", holdings: 12798, sharesOutstanding: 45_000_000, holdingsPerShare: 0.0002844, source: "Post-Semler merger 8-K" },
];

// Map of all companies with historical data
export const HOLDINGS_HISTORY: Record<string, CompanyHoldingsHistory> = {
  // BTC Companies
  MSTR: { ticker: "MSTR", asset: "BTC", history: MSTR_HISTORY },
  MARA: { ticker: "MARA", asset: "BTC", history: MARA_HISTORY },
  RIOT: { ticker: "RIOT", asset: "BTC", history: RIOT_HISTORY },
  CLSK: { ticker: "CLSK", asset: "BTC", history: CLSK_HISTORY },
  "3350.T": { ticker: "3350.T", asset: "BTC", history: METAPLANET_HISTORY },
  SMLR: { ticker: "SMLR", asset: "BTC", history: SMLR_HISTORY },
  KULR: { ticker: "KULR", asset: "BTC", history: KULR_HISTORY },
  "0434.HK": { ticker: "0434.HK", asset: "BTC", history: BOYAA_HISTORY },
  ASST: { ticker: "ASST", asset: "BTC", history: ASST_HISTORY },

  // ETH Companies
  BTCS: { ticker: "BTCS", asset: "ETH", history: BTCS_HISTORY },
  BTBT: { ticker: "BTBT", asset: "ETH", history: BTBT_HISTORY },
  BMNR: { ticker: "BMNR", asset: "ETH", history: BMNR_HISTORY },

  // SOL Companies
  STKE: { ticker: "STKE", asset: "SOL", history: STKE_HISTORY },
  DFDV: { ticker: "DFDV", asset: "SOL", history: DFDV_HISTORY },
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
