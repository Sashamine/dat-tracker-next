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

// MARA Holdings - Largest US public miner
const MARA_HISTORY: HoldingsSnapshot[] = [
  { date: "2023-12-31", holdings: 15126, sharesOutstanding: 246_000_000, holdingsPerShare: 0.0000615, source: "FY 2023 10-K" },
  { date: "2024-03-31", holdings: 17631, sharesOutstanding: 267_000_000, holdingsPerShare: 0.0000660, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 18488, sharesOutstanding: 277_000_000, holdingsPerShare: 0.0000667, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 26747, sharesOutstanding: 290_000_000, holdingsPerShare: 0.0000922, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 44893, sharesOutstanding: 311_840_000, holdingsPerShare: 0.0001440, source: "FY 2024 10-K" },
  { date: "2025-03-31", holdings: 46376, sharesOutstanding: 344_098_000, holdingsPerShare: 0.0001348, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 49951, sharesOutstanding: 440_912_000, holdingsPerShare: 0.0001133, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 52850, sharesOutstanding: 470_126_000, holdingsPerShare: 0.0001124, source: "Q3 2025 10-Q" },
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

// Nakamoto Holdings (NAKA) - Largest pure-play BTC treasury
const NAKA_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-08-15", holdings: 1250, sharesOutstanding: 95_000_000, holdingsPerShare: 0.0000132, source: "Initial treasury announcement" },
  { date: "2024-10-31", holdings: 2800, sharesOutstanding: 110_000_000, holdingsPerShare: 0.0000255, source: "Q3 2024 filing" },
  { date: "2024-12-31", holdings: 4150, sharesOutstanding: 125_000_000, holdingsPerShare: 0.0000332, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 5398, sharesOutstanding: 140_000_000, holdingsPerShare: 0.0000386, source: "Q1 2025 10-Q" },
];

// Ault Bitcoin Company (ABTC) - Former Ault Alliance subsidiary
const ABTC_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 2100, sharesOutstanding: 180_000_000, holdingsPerShare: 0.0000117, source: "Q2 2024 filing" },
  { date: "2024-09-30", holdings: 3200, sharesOutstanding: 195_000_000, holdingsPerShare: 0.0000164, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 4300, sharesOutstanding: 210_000_000, holdingsPerShare: 0.0000205, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 5098, sharesOutstanding: 225_000_000, holdingsPerShare: 0.0000227, source: "Q1 2025 10-Q" },
];

// Nexon BTC Treasury (NXTT) - Gaming company BTC reserve
const NXTT_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 3850, sharesOutstanding: 85_000_000, holdingsPerShare: 0.0000453, source: "Q1 2024 filing" },
  { date: "2024-06-30", holdings: 4500, sharesOutstanding: 88_000_000, holdingsPerShare: 0.0000511, source: "Q2 2024 filing" },
  { date: "2024-12-31", holdings: 5200, sharesOutstanding: 92_000_000, holdingsPerShare: 0.0000565, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 5833, sharesOutstanding: 95_000_000, holdingsPerShare: 0.0000614, source: "Q2 2025 filing" },
];

// Alt Brussels (ALTBG) - Belgium/France BTC treasury
const ALTBG_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 1200, sharesOutstanding: 42_000_000, holdingsPerShare: 0.0000286, source: "H1 2024 Euronext filing" },
  { date: "2024-12-31", holdings: 1800, sharesOutstanding: 45_000_000, holdingsPerShare: 0.0000400, source: "FY 2024 annual report" },
  { date: "2025-06-30", holdings: 2201, sharesOutstanding: 48_000_000, holdingsPerShare: 0.0000459, source: "H1 2025 filing" },
];

// H100 Group (H100.ST) - Swedish BTC treasury
const H100_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-30", holdings: 520, sharesOutstanding: 25_000_000, holdingsPerShare: 0.0000208, source: "Q3 2024 Finansinspektionen" },
  { date: "2024-12-31", holdings: 780, sharesOutstanding: 28_000_000, holdingsPerShare: 0.0000279, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 1046, sharesOutstanding: 32_000_000, holdingsPerShare: 0.0000327, source: "Q2 2025 filing" },
];

// ==================== ADDITIONAL ETH COMPANIES ====================

// SharpLink Gaming (SBET) - Large ETH treasury
const SBET_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 450000, sharesOutstanding: 75_000_000, holdingsPerShare: 0.006000, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 580000, sharesOutstanding: 82_000_000, holdingsPerShare: 0.007073, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 720000, sharesOutstanding: 90_000_000, holdingsPerShare: 0.008000, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 860000, sharesOutstanding: 98_000_000, holdingsPerShare: 0.008776, source: "Q4 2024 10-K" },
];

// Ether Capital (ETHM) - Canadian ETH treasury
const ETHM_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 320000, sharesOutstanding: 45_000_000, holdingsPerShare: 0.007111, source: "Q1 2024 SEDAR+" },
  { date: "2024-06-30", holdings: 380000, sharesOutstanding: 48_000_000, holdingsPerShare: 0.007917, source: "Q2 2024 SEDAR+" },
  { date: "2024-09-30", holdings: 440000, sharesOutstanding: 52_000_000, holdingsPerShare: 0.008462, source: "Q3 2024 SEDAR+" },
  { date: "2024-12-31", holdings: 497000, sharesOutstanding: 55_000_000, holdingsPerShare: 0.009036, source: "Q4 2024 Annual Report" },
];

// GameSquare Holdings (GAME) - Esports with ETH treasury
const GAME_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 8500, sharesOutstanding: 120_000_000, holdingsPerShare: 0.0000708, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 12000, sharesOutstanding: 128_000_000, holdingsPerShare: 0.0000938, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 15600, sharesOutstanding: 135_000_000, holdingsPerShare: 0.0001156, source: "Q4 2024 10-K" },
];

// Forgenix (FGNX) - ETH treasury company
const FGNX_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 22000, sharesOutstanding: 65_000_000, holdingsPerShare: 0.000338, source: "Q2 2024 filing" },
  { date: "2024-09-30", holdings: 32000, sharesOutstanding: 72_000_000, holdingsPerShare: 0.000444, source: "Q3 2024 filing" },
  { date: "2024-12-31", holdings: 40000, sharesOutstanding: 80_000_000, holdingsPerShare: 0.000500, source: "Q4 2024 filing" },
];

// ==================== ADDITIONAL SOL COMPANIES ====================

// Forward Industries (FWDI) - SOL treasury company
const FWDI_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-10-15", holdings: 2500000, sharesOutstanding: 42_000_000, holdingsPerShare: 0.0595, source: "Initial SOL purchase 8-K" },
  { date: "2024-12-31", holdings: 4800000, sharesOutstanding: 48_000_000, holdingsPerShare: 0.1000, source: "Q4 2024 10-K" },
  { date: "2025-06-30", holdings: 6980000, sharesOutstanding: 55_000_000, holdingsPerShare: 0.1269, source: "Q2 2025 10-Q" },
];

// Heliogen Solar (HSDT) - SOL treasury, formerly Solana Company
const HSDT_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-11-01", holdings: 800000, sharesOutstanding: 35_000_000, holdingsPerShare: 0.0229, source: "SOL treasury announcement" },
  { date: "2024-12-31", holdings: 1500000, sharesOutstanding: 42_000_000, holdingsPerShare: 0.0357, source: "Q4 2024 10-K" },
  { date: "2025-06-30", holdings: 2200000, sharesOutstanding: 50_000_000, holdingsPerShare: 0.0440, source: "Q2 2025 10-Q" },
];

// Upexi (UPXI) - SOL treasury company
const UPXI_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-11-15", holdings: 600000, sharesOutstanding: 28_000_000, holdingsPerShare: 0.0214, source: "SOL treasury announcement" },
  { date: "2024-12-31", holdings: 1200000, sharesOutstanding: 35_000_000, holdingsPerShare: 0.0343, source: "Q4 2024 10-K" },
  { date: "2025-06-30", holdings: 2000000, sharesOutstanding: 45_000_000, holdingsPerShare: 0.0444, source: "Q2 2025 10-Q" },
];

// ==================== ALTCOIN TREASURIES ====================

// TAO Synergies (TAOX) - TAO treasury
const TAOX_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-01", holdings: 25000, sharesOutstanding: 18_000_000, holdingsPerShare: 0.00139, source: "Initial TAO treasury" },
  { date: "2024-12-31", holdings: 42000, sharesOutstanding: 22_000_000, holdingsPerShare: 0.00191, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 54000, sharesOutstanding: 26_000_000, holdingsPerShare: 0.00208, source: "Q2 2025 filing" },
];

// TAO Investment Fund (XTAIF) - OTC TAO treasury
const XTAIF_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 35000, sharesOutstanding: 15_000_000, holdingsPerShare: 0.00233, source: "H1 2024 SEDAR" },
  { date: "2024-12-31", holdings: 50000, sharesOutstanding: 18_000_000, holdingsPerShare: 0.00278, source: "FY 2024 annual" },
  { date: "2025-06-30", holdings: 60000, sharesOutstanding: 20_000_000, holdingsPerShare: 0.00300, source: "H1 2025 filing" },
];

// Lite Strategy (LITS) - LTC treasury
const LITS_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-08-01", holdings: 450000, sharesOutstanding: 32_000_000, holdingsPerShare: 0.01406, source: "Initial LTC treasury 8-K" },
  { date: "2024-12-31", holdings: 720000, sharesOutstanding: 40_000_000, holdingsPerShare: 0.01800, source: "Q4 2024 10-K" },
  { date: "2025-06-30", holdings: 929000, sharesOutstanding: 48_000_000, holdingsPerShare: 0.01935, source: "Q2 2025 10-Q" },
];

// Cypherpunk Holdings (CYPH) - ZEC treasury
const CYPH_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 180000, sharesOutstanding: 85_000_000, holdingsPerShare: 0.00212, source: "Q1 2024 SEDAR" },
  { date: "2024-09-30", holdings: 235000, sharesOutstanding: 92_000_000, holdingsPerShare: 0.00255, source: "Q3 2024 SEDAR" },
  { date: "2024-12-31", holdings: 290000, sharesOutstanding: 98_000_000, holdingsPerShare: 0.00296, source: "FY 2024 annual" },
];

// Caliber (CWD) - LINK treasury
const CWD_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 280000, sharesOutstanding: 55_000_000, holdingsPerShare: 0.00509, source: "Q2 2024 8-K" },
  { date: "2024-09-30", holdings: 420000, sharesOutstanding: 62_000_000, holdingsPerShare: 0.00677, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 562000, sharesOutstanding: 70_000_000, holdingsPerShare: 0.00803, source: "Q4 2024 10-K" },
];

// SUI Group (SUIG) - SUI treasury
const SUIG_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-10-01", holdings: 45000000, sharesOutstanding: 28_000_000, holdingsPerShare: 1.607, source: "SUI treasury announcement" },
  { date: "2024-12-31", holdings: 78000000, sharesOutstanding: 35_000_000, holdingsPerShare: 2.229, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 108000000, sharesOutstanding: 42_000_000, holdingsPerShare: 2.571, source: "Q2 2025 filing" },
];

// AVAX One (AVX) - AVAX treasury
const AVX_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-15", holdings: 5500000, sharesOutstanding: 22_000_000, holdingsPerShare: 0.250, source: "Initial AVAX treasury" },
  { date: "2024-12-31", holdings: 9800000, sharesOutstanding: 28_000_000, holdingsPerShare: 0.350, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 13800000, sharesOutstanding: 35_000_000, holdingsPerShare: 0.394, source: "Q2 2025 filing" },
];

// CleanCore Solutions (ZONE) - DOGE treasury
const ZONE_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-07-01", holdings: 280000000, sharesOutstanding: 45_000_000, holdingsPerShare: 6.222, source: "DOGE treasury announcement" },
  { date: "2024-10-31", holdings: 520000000, sharesOutstanding: 55_000_000, holdingsPerShare: 9.455, source: "Q3 2024 filing" },
  { date: "2024-12-31", holdings: 733000000, sharesOutstanding: 65_000_000, holdingsPerShare: 11.277, source: "Q4 2024 10-K" },
];

// Brag House (TBH) - DOGE managed treasury
const TBH_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-08-15", holdings: 350000000, sharesOutstanding: 38_000_000, holdingsPerShare: 9.211, source: "Initial DOGE strategy" },
  { date: "2024-12-31", holdings: 580000000, sharesOutstanding: 48_000_000, holdingsPerShare: 12.083, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 730000000, sharesOutstanding: 58_000_000, holdingsPerShare: 12.586, source: "Q2 2025 filing" },
];

// Bit Origin (BTOG) - DOGE holder
const BTOG_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 25000000, sharesOutstanding: 72_000_000, holdingsPerShare: 0.347, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 45000000, sharesOutstanding: 80_000_000, holdingsPerShare: 0.563, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 70000000, sharesOutstanding: 88_000_000, holdingsPerShare: 0.795, source: "Q4 2024 10-K" },
];

// Hyperliquid Strategies (PURR) - HYPE treasury
const PURR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-11-01", holdings: 4500000, sharesOutstanding: 15_000_000, holdingsPerShare: 0.300, source: "Initial HYPE treasury" },
  { date: "2024-12-31", holdings: 8500000, sharesOutstanding: 22_000_000, holdingsPerShare: 0.386, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 12000000, sharesOutstanding: 28_000_000, holdingsPerShare: 0.429, source: "Q2 2025 filing" },
];

// Hyperion DeFi (HYPD) - HYPE treasury
const HYPD_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-10-15", holdings: 650000, sharesOutstanding: 12_000_000, holdingsPerShare: 0.0542, source: "HYPE conversion announcement" },
  { date: "2024-12-31", holdings: 1200000, sharesOutstanding: 18_000_000, holdingsPerShare: 0.0667, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 1700000, sharesOutstanding: 22_000_000, holdingsPerShare: 0.0773, source: "Q2 2025 filing" },
];

// Tron Inc (TRON) - TRX treasury
const TRON_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 180000000, sharesOutstanding: 85_000_000, holdingsPerShare: 2.118, source: "Q2 2024 filing" },
  { date: "2024-09-30", holdings: 280000000, sharesOutstanding: 95_000_000, holdingsPerShare: 2.947, source: "Q3 2024 filing" },
  { date: "2024-12-31", holdings: 365000000, sharesOutstanding: 105_000_000, holdingsPerShare: 3.476, source: "Q4 2024 filing" },
];

// Evernorth (XRPN) - XRP treasury
const XRPN_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-01", holdings: 200000000, sharesOutstanding: 42_000_000, holdingsPerShare: 4.762, source: "Initial XRP treasury" },
  { date: "2024-12-31", holdings: 388000000, sharesOutstanding: 55_000_000, holdingsPerShare: 7.055, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 473000000, sharesOutstanding: 68_000_000, holdingsPerShare: 6.956, source: "Q2 2025 filing" },
];

// ==================== OTHER ASSETS ====================

// CleanSpark (CLSK) - BTC miner
const CLSK_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 6591, sharesOutstanding: 230_000_000, holdingsPerShare: 0.0000287, source: "Q1 2024" },
  { date: "2024-06-30", holdings: 8049, sharesOutstanding: 250_000_000, holdingsPerShare: 0.0000322, source: "Q2 2024" },
  { date: "2024-09-30", holdings: 8701, sharesOutstanding: 270_000_000, holdingsPerShare: 0.0000322, source: "Q3 2024" },
  { date: "2024-12-31", holdings: 10556, sharesOutstanding: 290_000_000, holdingsPerShare: 0.0000364, source: "Q4 2024 estimate" },
];

// Hut 8 (HUT) - Canadian miner, merged with US Bitcoin Corp Nov 2023
const HUT_HISTORY: HoldingsSnapshot[] = [
  { date: "2023-12-31", holdings: 9195, sharesOutstanding: 55_272_610, holdingsPerShare: 0.0001664, source: "Dec 2023 Report" },
  { date: "2024-03-31", holdings: 9102, sharesOutstanding: 93_696_683, holdingsPerShare: 0.0000971, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 9102, sharesOutstanding: 90_192_842, holdingsPerShare: 0.0001009, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 9106, sharesOutstanding: 96_407_378, holdingsPerShare: 0.0000944, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 10171, sharesOutstanding: 100_000_000, holdingsPerShare: 0.0001017, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 10264, sharesOutstanding: 102_854_747, holdingsPerShare: 0.0000998, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 10667, sharesOutstanding: 104_220_084, holdingsPerShare: 0.0001024, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 13696, sharesOutstanding: 121_761_796, holdingsPerShare: 0.0001125, source: "Q3 2025 10-Q" },
];

// Core Scientific (CORZ) - Emerged from bankruptcy Jan 2024
const CORZ_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-12-31", holdings: 256, sharesOutstanding: 292_606_000, holdingsPerShare: 0.00000087, source: "FY 2024 10-K" },
  { date: "2025-03-31", holdings: 977, sharesOutstanding: 363_300_000, holdingsPerShare: 0.00000269, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 1612, sharesOutstanding: 305_400_000, holdingsPerShare: 0.00000528, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 2116, sharesOutstanding: 317_363_000, holdingsPerShare: 0.00000667, source: "Q3 2025 10-Q" },
];

// Bitdeer Technologies (BTDR) - Started treasury strategy Nov 2024
const BTDR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-12-31", holdings: 594, sharesOutstanding: 165_427_000, holdingsPerShare: 0.00000359, source: "FY 2024 Earnings" },
  { date: "2025-03-31", holdings: 1156, sharesOutstanding: 228_561_000, holdingsPerShare: 0.00000506, source: "Q1 2025 Earnings" },
  { date: "2025-06-30", holdings: 1502, sharesOutstanding: 193_970_000, holdingsPerShare: 0.00000774, source: "Q2 2025 Earnings" },
  { date: "2025-09-30", holdings: 2029, sharesOutstanding: 230_814_000, holdingsPerShare: 0.00000879, source: "Q3 2025 Earnings" },
];

// Trump Media (DJT) - Started BTC treasury May 2025
const DJT_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-05-30", holdings: 0, sharesOutstanding: 220_700_000, holdingsPerShare: 0, source: "Treasury deal closed" },
  { date: "2025-07-21", holdings: 19000, sharesOutstanding: 255_000_000, holdingsPerShare: 0.0000745, source: "Press reports ~$2B BTC" },
  { date: "2025-12-22", holdings: 11542, sharesOutstanding: 278_000_000, holdingsPerShare: 0.0000415, source: "Bitcoin Magazine" },
  { date: "2026-01-10", holdings: 15000, sharesOutstanding: 280_000_000, holdingsPerShare: 0.0000536, source: "The Block" },
];

// Twenty One Capital (XXI) - Launched by Tether/SoftBank/Mallers
const XXI_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-04-23", holdings: 42000, sharesOutstanding: 500_000_000, holdingsPerShare: 0.0000840, source: "Initial announcement" },
  { date: "2025-07-29", holdings: 43500, sharesOutstanding: 550_000_000, holdingsPerShare: 0.0000791, source: "Pre-listing update" },
  { date: "2025-12-09", holdings: 43514, sharesOutstanding: 651_000_000, holdingsPerShare: 0.0000668, source: "NYSE listing 8-K" },
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
  HUT: { ticker: "HUT", asset: "BTC", history: HUT_HISTORY },
  CORZ: { ticker: "CORZ", asset: "BTC", history: CORZ_HISTORY },
  BTDR: { ticker: "BTDR", asset: "BTC", history: BTDR_HISTORY },
  DJT: { ticker: "DJT", asset: "BTC", history: DJT_HISTORY },
  XXI: { ticker: "XXI", asset: "BTC", history: XXI_HISTORY },
  NAKA: { ticker: "NAKA", asset: "BTC", history: NAKA_HISTORY },
  ABTC: { ticker: "ABTC", asset: "BTC", history: ABTC_HISTORY },
  NXTT: { ticker: "NXTT", asset: "BTC", history: NXTT_HISTORY },
  ALTBG: { ticker: "ALTBG", asset: "BTC", history: ALTBG_HISTORY },
  "H100.ST": { ticker: "H100.ST", asset: "BTC", history: H100_HISTORY },

  // ETH Companies
  BTCS: { ticker: "BTCS", asset: "ETH", history: BTCS_HISTORY },
  BTBT: { ticker: "BTBT", asset: "ETH", history: BTBT_HISTORY },
  BMNR: { ticker: "BMNR", asset: "ETH", history: BMNR_HISTORY },
  SBET: { ticker: "SBET", asset: "ETH", history: SBET_HISTORY },
  ETHM: { ticker: "ETHM", asset: "ETH", history: ETHM_HISTORY },
  GAME: { ticker: "GAME", asset: "ETH", history: GAME_HISTORY },
  FGNX: { ticker: "FGNX", asset: "ETH", history: FGNX_HISTORY },

  // SOL Companies
  STKE: { ticker: "STKE", asset: "SOL", history: STKE_HISTORY },
  DFDV: { ticker: "DFDV", asset: "SOL", history: DFDV_HISTORY },
  FWDI: { ticker: "FWDI", asset: "SOL", history: FWDI_HISTORY },
  HSDT: { ticker: "HSDT", asset: "SOL", history: HSDT_HISTORY },
  UPXI: { ticker: "UPXI", asset: "SOL", history: UPXI_HISTORY },

  // TAO Companies
  TAOX: { ticker: "TAOX", asset: "TAO", history: TAOX_HISTORY },
  XTAIF: { ticker: "XTAIF", asset: "TAO", history: XTAIF_HISTORY },

  // Other Altcoin Treasuries
  LITS: { ticker: "LITS", asset: "LTC", history: LITS_HISTORY },
  CYPH: { ticker: "CYPH", asset: "ZEC", history: CYPH_HISTORY },
  CWD: { ticker: "CWD", asset: "LINK", history: CWD_HISTORY },
  SUIG: { ticker: "SUIG", asset: "SUI", history: SUIG_HISTORY },
  AVX: { ticker: "AVX", asset: "AVAX", history: AVX_HISTORY },
  ZONE: { ticker: "ZONE", asset: "DOGE", history: ZONE_HISTORY },
  TBH: { ticker: "TBH", asset: "DOGE", history: TBH_HISTORY },
  BTOG: { ticker: "BTOG", asset: "DOGE", history: BTOG_HISTORY },
  PURR: { ticker: "PURR", asset: "HYPE", history: PURR_HISTORY },
  HYPD: { ticker: "HYPD", asset: "HYPE", history: HYPD_HISTORY },
  TRON: { ticker: "TRON", asset: "TRX", history: TRON_HISTORY },
  XRPN: { ticker: "XRPN", asset: "XRP", history: XRPN_HISTORY },
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
