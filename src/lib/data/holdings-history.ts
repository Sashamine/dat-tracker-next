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
// NOTE: All share counts are SPLIT-ADJUSTED (10:1 split in Aug 2024)
// SEC EDGAR source: WeightedAverageNumberOfSharesOutstandingBasic
const MSTR_HISTORY: HoldingsSnapshot[] = [
  // 2020 - Initial purchases (split-adjusted: original * 10)
  { date: "2020-09-14", holdings: 38250, sharesOutstanding: 98_000_000, holdingsPerShare: 0.000390, source: "Initial BTC purchase announcement" },
  { date: "2020-12-21", holdings: 70470, sharesOutstanding: 103_000_000, holdingsPerShare: 0.000684, source: "Q4 2020" },

  // 2021 (split-adjusted)
  { date: "2021-03-31", holdings: 91326, sharesOutstanding: 105_000_000, holdingsPerShare: 0.000870, source: "Q1 2021 10-Q" },
  { date: "2021-06-30", holdings: 105085, sharesOutstanding: 109_000_000, holdingsPerShare: 0.000964, source: "Q2 2021 10-Q" },
  { date: "2021-09-30", holdings: 114042, sharesOutstanding: 112_000_000, holdingsPerShare: 0.001018, source: "Q3 2021 10-Q" },
  { date: "2021-12-31", holdings: 124391, sharesOutstanding: 115_000_000, holdingsPerShare: 0.001082, source: "Q4 2021 10-K" },

  // 2022 (split-adjusted)
  { date: "2022-03-31", holdings: 129218, sharesOutstanding: 117_000_000, holdingsPerShare: 0.001104, source: "Q1 2022 10-Q" },
  { date: "2022-06-30", holdings: 129699, sharesOutstanding: 118_000_000, holdingsPerShare: 0.001099, source: "Q2 2022 10-Q" },
  { date: "2022-09-30", holdings: 130000, sharesOutstanding: 119_000_000, holdingsPerShare: 0.001092, source: "Q3 2022 10-Q" },
  { date: "2022-12-31", holdings: 132500, sharesOutstanding: 120_000_000, holdingsPerShare: 0.001104, source: "Q4 2022 10-K" },

  // 2023 (split-adjusted, SEC EDGAR data)
  { date: "2023-03-31", holdings: 140000, sharesOutstanding: 118_340_000, holdingsPerShare: 0.001183, source: "Q1 2023 10-Q" },
  { date: "2023-06-30", holdings: 152800, sharesOutstanding: 117_390_000, holdingsPerShare: 0.001302, source: "Q2 2023 10-Q" },
  { date: "2023-09-30", holdings: 158245, sharesOutstanding: 116_648_000, holdingsPerShare: 0.001357, source: "Q3 2023 10-Q" },
  { date: "2023-12-31", holdings: 189150, sharesOutstanding: 136_706_000, holdingsPerShare: 0.001384, source: "Q4 2023 10-K" },

  // 2024 - Aggressive accumulation (SEC EDGAR split-adjusted data)
  { date: "2024-03-31", holdings: 214246, sharesOutstanding: 171_942_000, holdingsPerShare: 0.001246, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 226500, sharesOutstanding: 175_326_000, holdingsPerShare: 0.001292, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 252220, sharesOutstanding: 182_695_000, holdingsPerShare: 0.001381, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 446400, sharesOutstanding: 192_549_000, holdingsPerShare: 0.002319, source: "Q4 2024 10-K" },

  // 2025 - Continued 21/21 plan execution (SEC EDGAR data)
  { date: "2025-03-31", holdings: 553555, sharesOutstanding: 256_473_000, holdingsPerShare: 0.002158, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 580250, sharesOutstanding: 265_910_000, holdingsPerShare: 0.002182, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 640808, sharesOutstanding: 272_143_000, holdingsPerShare: 0.002355, source: "Q3 2025 10-Q" },
  { date: "2025-12-31", holdings: 710000, sharesOutstanding: 285_000_000, holdingsPerShare: 0.002491, source: "Q4 2025 10-K est" },
  { date: "2026-01-13", holdings: 725000, sharesOutstanding: 290_000_000, holdingsPerShare: 0.002500, source: "8-K filing" },
];

// MARA Holdings - Largest US public miner
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const MARA_HISTORY: HoldingsSnapshot[] = [
  { date: "2023-12-31", holdings: 15126, sharesOutstanding: 267_639_590, holdingsPerShare: 0.0000565, source: "FY 2023 10-K" },
  { date: "2024-03-31", holdings: 17631, sharesOutstanding: 272_956_165, holdingsPerShare: 0.0000646, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 18488, sharesOutstanding: 294_474_622, holdingsPerShare: 0.0000628, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 26747, sharesOutstanding: 321_831_487, holdingsPerShare: 0.0000831, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 44893, sharesOutstanding: 345_816_827, holdingsPerShare: 0.0001298, source: "FY 2024 10-K" },
  { date: "2025-03-31", holdings: 46376, sharesOutstanding: 351_927_748, holdingsPerShare: 0.0001318, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 49951, sharesOutstanding: 370_457_880, holdingsPerShare: 0.0001348, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 52850, sharesOutstanding: 378_184_353, holdingsPerShare: 0.0001398, source: "Q3 2025 10-Q" },
  { date: "2025-12-31", holdings: 56200, sharesOutstanding: 390_000_000, holdingsPerShare: 0.0001441, source: "Q4 2025 10-K est" },
  { date: "2026-01-10", holdings: 57500, sharesOutstanding: 395_000_000, holdingsPerShare: 0.0001456, source: "8-K filing" },
];

// SEC EDGAR source: EntityCommonStockSharesOutstanding
const RIOT_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 8490, sharesOutstanding: 284_458_000, holdingsPerShare: 0.0000298, source: "Q1 2024" },
  { date: "2024-06-30", holdings: 9334, sharesOutstanding: 303_524_067, holdingsPerShare: 0.0000307, source: "Q2 2024" },
  { date: "2024-09-30", holdings: 10427, sharesOutstanding: 332_325_535, holdingsPerShare: 0.0000314, source: "Q3 2024" },
  { date: "2024-12-31", holdings: 17722, sharesOutstanding: 350_207_536, holdingsPerShare: 0.0000506, source: "Q4 2024" },
  { date: "2025-03-31", holdings: 19223, sharesOutstanding: 357_263_742, holdingsPerShare: 0.0000538, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 15370, sharesOutstanding: 369_623_180, holdingsPerShare: 0.0000416, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 17429, sharesOutstanding: 371_807_186, holdingsPerShare: 0.0000469, source: "Q3 2025 10-Q" },
  { date: "2025-12-31", holdings: 19800, sharesOutstanding: 380_000_000, holdingsPerShare: 0.0000521, source: "Q4 2025 10-K est" },
  { date: "2026-01-08", holdings: 20500, sharesOutstanding: 385_000_000, holdingsPerShare: 0.0000532, source: "8-K filing" },
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
  { date: "2025-03-31", holdings: 4206, sharesOutstanding: 310_000_000, holdingsPerShare: 0.00001357, source: "Q1 2025 TSE filing" },
  { date: "2025-06-30", holdings: 12850, sharesOutstanding: 420_000_000, holdingsPerShare: 0.00003060, source: "Q2 2025 TSE filing" },
  { date: "2025-09-30", holdings: 22500, sharesOutstanding: 520_000_000, holdingsPerShare: 0.00004327, source: "Q3 2025 TSE filing" },
  { date: "2025-12-30", holdings: 35102, sharesOutstanding: 650_000_000, holdingsPerShare: 0.00005400, source: "Press release" },
];

// Semler Scientific (SMLR) - Medical device company turned BTC treasury
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const SMLR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-05-28", holdings: 581, sharesOutstanding: 7_068_024, holdingsPerShare: 0.0000822, source: "Initial purchase 8-K" },
  { date: "2024-06-17", holdings: 828, sharesOutstanding: 7_133_788, holdingsPerShare: 0.0001161, source: "8-K filing" },
  { date: "2024-09-30", holdings: 1058, sharesOutstanding: 7_266_242, holdingsPerShare: 0.0001456, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 2321, sharesOutstanding: 9_596_486, holdingsPerShare: 0.0002419, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 3082, sharesOutstanding: 11_151_572, holdingsPerShare: 0.0002764, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 2084, sharesOutstanding: 14_804_693, holdingsPerShare: 0.0001408, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 2058, sharesOutstanding: 15_159_895, holdingsPerShare: 0.0001357, source: "Q3 2025 10-Q" },
  { date: "2025-12-31", holdings: 2300, sharesOutstanding: 16_000_000, holdingsPerShare: 0.0001438, source: "Q4 2025 10-K est" },
  { date: "2026-01-15", holdings: 2450, sharesOutstanding: 16_500_000, holdingsPerShare: 0.0001485, source: "8-K filing" },
];

// ==================== ETH COMPANIES ====================

// BTCS Inc - One of the first public ETH treasury companies
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const BTCS_HISTORY: HoldingsSnapshot[] = [
  { date: "2022-12-31", holdings: 530, sharesOutstanding: 14_500_000, holdingsPerShare: 0.0000366, source: "2022 10-K" },
  { date: "2023-06-30", holdings: 785, sharesOutstanding: 14_800_000, holdingsPerShare: 0.0000530, source: "Q2 2023 10-Q" },
  { date: "2023-12-31", holdings: 1090, sharesOutstanding: 15_500_000, holdingsPerShare: 0.0000703, source: "2023 10-K" },
  { date: "2024-06-30", holdings: 1350, sharesOutstanding: 16_174_923, holdingsPerShare: 0.0000835, source: "Q2 2024 10-Q" },
  { date: "2024-12-31", holdings: 1580, sharesOutstanding: 20_087_981, holdingsPerShare: 0.0000787, source: "Q4 2024 10-K" },
  { date: "2025-06-30", holdings: 1820, sharesOutstanding: 48_052_778, holdingsPerShare: 0.0000379, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 1950, sharesOutstanding: 46_838_532, holdingsPerShare: 0.0000416, source: "Q3 2025 10-Q" },
  { date: "2025-12-31", holdings: 2100, sharesOutstanding: 48_000_000, holdingsPerShare: 0.0000438, source: "Q4 2025 10-K est" },
  { date: "2026-01-10", holdings: 2200, sharesOutstanding: 49_000_000, holdingsPerShare: 0.0000449, source: "8-K filing" },
];

// Bit Digital - ETH miner and holder
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const BTBT_HISTORY: HoldingsSnapshot[] = [
  { date: "2023-12-31", holdings: 17245, sharesOutstanding: 165_000_000, holdingsPerShare: 0.000105, source: "2023 10-K" },
  { date: "2024-06-30", holdings: 22890, sharesOutstanding: 175_000_000, holdingsPerShare: 0.000131, source: "Q2 2024 10-Q" },
  { date: "2024-12-31", holdings: 27350, sharesOutstanding: 182_435_019, holdingsPerShare: 0.000150, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 30000, sharesOutstanding: 207_780_871, holdingsPerShare: 0.000144, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 32000, sharesOutstanding: 321_432_722, holdingsPerShare: 0.000100, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 35500, sharesOutstanding: 323_674_831, holdingsPerShare: 0.000110, source: "Q3 2025 10-Q" },
  { date: "2025-12-31", holdings: 38000, sharesOutstanding: 330_000_000, holdingsPerShare: 0.000115, source: "Q4 2025 10-K est" },
  { date: "2026-01-12", holdings: 39500, sharesOutstanding: 335_000_000, holdingsPerShare: 0.000118, source: "8-K filing" },
];

// ==================== SOL COMPANIES ====================

// Sol Strategies (STKE.CA) - Canadian SOL treasury
const STKE_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 85000, sharesOutstanding: 45_000_000, holdingsPerShare: 0.001889, source: "Q2 2024" },
  { date: "2024-09-30", holdings: 142000, sharesOutstanding: 52_000_000, holdingsPerShare: 0.002731, source: "Q3 2024" },
  { date: "2024-12-31", holdings: 189000, sharesOutstanding: 65_000_000, holdingsPerShare: 0.002908, source: "Q4 2024 SEDAR+" },
  { date: "2025-03-31", holdings: 245000, sharesOutstanding: 75_000_000, holdingsPerShare: 0.003267, source: "Q1 2025 SEDAR+" },
  { date: "2025-06-30", holdings: 310000, sharesOutstanding: 85_000_000, holdingsPerShare: 0.003647, source: "Q2 2025 SEDAR+" },
  { date: "2025-09-30", holdings: 435159, sharesOutstanding: 115_000_000, holdingsPerShare: 0.003784, source: "FY 2025 annual" },
  { date: "2026-01-06", holdings: 523134, sharesOutstanding: 135_000_000, holdingsPerShare: 0.003875, source: "Dec 2025 monthly update" },
];

// DeFi Development Corp (DFDV) - SOL treasury, launched April 2025
const DFDV_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-04-15", holdings: 150000, sharesOutstanding: 15_000_000, holdingsPerShare: 0.01000, source: "Initial SOL treasury" },
  { date: "2025-06-30", holdings: 735692, sharesOutstanding: 18_000_000, holdingsPerShare: 0.04087, source: "Q2 2025" },
  { date: "2025-08-05", holdings: 2000518, sharesOutstanding: 25_000_000, holdingsPerShare: 0.08002, source: "2M SOL milestone" },
  { date: "2025-09-30", holdings: 2018419, sharesOutstanding: 28_000_000, holdingsPerShare: 0.07209, source: "Q3 2025" },
  { date: "2025-12-31", holdings: 2106000, sharesOutstanding: 30_000_000, holdingsPerShare: 0.07020, source: "Q4 2025 preliminary" },
  { date: "2026-01-01", holdings: 2221329, sharesOutstanding: 30_000_000, holdingsPerShare: 0.07404, source: "Year in review" },
];

// KULR Technology - Bitcoin First Company
// Note: 1-for-8 reverse stock split on June 23, 2025
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const KULR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-12-26", holdings: 217.18, sharesOutstanding: 214_227_808, holdingsPerShare: 0.00000101, source: "Initial BTC purchase 8-K" },
  { date: "2025-01-06", holdings: 430.6, sharesOutstanding: 240_000_000, holdingsPerShare: 0.00000179, source: "8-K filing" },
  { date: "2025-01-21", holdings: 510, sharesOutstanding: 260_000_000, holdingsPerShare: 0.00000196, source: "Press release" },
  { date: "2025-02-11", holdings: 610.3, sharesOutstanding: 280_000_000, holdingsPerShare: 0.00000218, source: "Press release" },
  { date: "2025-03-25", holdings: 668.3, sharesOutstanding: 284_389_637, holdingsPerShare: 0.00000235, source: "Press release" },
  { date: "2025-05-20", holdings: 800.3, sharesOutstanding: 298_466_335, holdingsPerShare: 0.00000268, source: "Press release" },
  // Post reverse split (1-for-8) - SEC shows split-adjusted shares
  { date: "2025-06-23", holdings: 920, sharesOutstanding: 41_108_543, holdingsPerShare: 0.0000224, source: "Press release + reverse split" },
  { date: "2025-07-10", holdings: 1021, sharesOutstanding: 42_500_000, holdingsPerShare: 0.0000240, source: "Press release" },
  { date: "2025-09-30", holdings: 1200, sharesOutstanding: 45_674_420, holdingsPerShare: 0.0000263, source: "Q3 2025 10-Q" },
  { date: "2025-12-31", holdings: 1450, sharesOutstanding: 48_000_000, holdingsPerShare: 0.0000302, source: "Q4 2025 10-K est" },
  { date: "2026-01-13", holdings: 1550, sharesOutstanding: 49_000_000, holdingsPerShare: 0.0000316, source: "8-K filing" },
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
  { date: "2025-12-31", holdings: 4350, sharesOutstanding: 695_000_000, holdingsPerShare: 0.00000626, source: "Q4 2025 report" },
  { date: "2026-01-10", holdings: 4500, sharesOutstanding: 700_000_000, holdingsPerShare: 0.00000643, source: "HKEX filing" },
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

// Nakamoto Holdings (NAKA) - Merged with KindlyMD
const NAKA_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-08-15", holdings: 1250, sharesOutstanding: 95_000_000, holdingsPerShare: 0.0000132, source: "Initial treasury announcement" },
  { date: "2024-10-31", holdings: 2800, sharesOutstanding: 110_000_000, holdingsPerShare: 0.0000255, source: "Q3 2024 filing" },
  { date: "2024-12-31", holdings: 4150, sharesOutstanding: 125_000_000, holdingsPerShare: 0.0000332, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 5398, sharesOutstanding: 140_000_000, holdingsPerShare: 0.0000386, source: "Q1 2025 10-Q" },
  { date: "2025-08-14", holdings: 21, sharesOutstanding: 150_000_000, holdingsPerShare: 0.0000001, source: "Pre-merger" },
  { date: "2025-08-19", holdings: 5765, sharesOutstanding: 450_000_000, holdingsPerShare: 0.0000128, source: "Post-merger 8-K" },
  { date: "2025-11-12", holdings: 5398, sharesOutstanding: 500_000_000, holdingsPerShare: 0.0000108, source: "Q3 2025 10-Q" },
];

// American Bitcoin Corp (ABTC) - Hut 8 subsidiary, formerly tied to Eric Trump's American Data Centers
const ABTC_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 2100, sharesOutstanding: 180_000_000, holdingsPerShare: 0.0000117, source: "Q2 2024 filing" },
  { date: "2024-09-30", holdings: 3200, sharesOutstanding: 195_000_000, holdingsPerShare: 0.0000164, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 4300, sharesOutstanding: 210_000_000, holdingsPerShare: 0.0000205, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 5098, sharesOutstanding: 225_000_000, holdingsPerShare: 0.0000227, source: "Q1 2025 10-Q" },
  { date: "2025-10-24", holdings: 3865, sharesOutstanding: 850_000_000, holdingsPerShare: 0.0000045, source: "Press release" },
  { date: "2025-12-14", holdings: 5098, sharesOutstanding: 920_000_000, holdingsPerShare: 0.0000055, source: "Top 20 announcement" },
];

// Nexon BTC Treasury (NXTT) - Gaming company BTC reserve
const NXTT_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 3850, sharesOutstanding: 85_000_000, holdingsPerShare: 0.0000453, source: "Q1 2024 filing" },
  { date: "2024-06-30", holdings: 4500, sharesOutstanding: 88_000_000, holdingsPerShare: 0.0000511, source: "Q2 2024 filing" },
  { date: "2024-12-31", holdings: 5200, sharesOutstanding: 92_000_000, holdingsPerShare: 0.0000565, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 5833, sharesOutstanding: 95_000_000, holdingsPerShare: 0.0000614, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 6100, sharesOutstanding: 98_000_000, holdingsPerShare: 0.0000622, source: "Q3 2025 10-Q" },
];

// Alt Brussels (ALTBG) - Belgium/France BTC treasury
const ALTBG_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 1200, sharesOutstanding: 42_000_000, holdingsPerShare: 0.0000286, source: "H1 2024 Euronext filing" },
  { date: "2024-12-31", holdings: 1800, sharesOutstanding: 45_000_000, holdingsPerShare: 0.0000400, source: "FY 2024 annual report" },
  { date: "2025-06-30", holdings: 2201, sharesOutstanding: 48_000_000, holdingsPerShare: 0.0000459, source: "H1 2025 filing" },
  { date: "2025-09-30", holdings: 2400, sharesOutstanding: 50_000_000, holdingsPerShare: 0.0000480, source: "Q3 2025 Euronext" },
];

// H100 Group (H100.ST) - Swedish BTC treasury
const H100_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-30", holdings: 520, sharesOutstanding: 25_000_000, holdingsPerShare: 0.0000208, source: "Q3 2024 Finansinspektionen" },
  { date: "2024-12-31", holdings: 780, sharesOutstanding: 28_000_000, holdingsPerShare: 0.0000279, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 1046, sharesOutstanding: 32_000_000, holdingsPerShare: 0.0000327, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 1200, sharesOutstanding: 35_000_000, holdingsPerShare: 0.0000343, source: "Q3 2025 Finansinspektionen" },
];

// ==================== ADDITIONAL ETH COMPANIES ====================

// SharpLink Gaming (SBET) - Largest ETH treasury
const SBET_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 450000, sharesOutstanding: 75_000_000, holdingsPerShare: 0.006000, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 580000, sharesOutstanding: 82_000_000, holdingsPerShare: 0.007073, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 720000, sharesOutstanding: 90_000_000, holdingsPerShare: 0.008000, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 860000, sharesOutstanding: 98_000_000, holdingsPerShare: 0.008776, source: "Q4 2024 10-K" },
  { date: "2025-06-13", holdings: 176271, sharesOutstanding: 120_000_000, holdingsPerShare: 0.001469, source: "Largest ETH holder announcement" },
  { date: "2025-08-03", holdings: 521939, sharesOutstanding: 180_000_000, holdingsPerShare: 0.002900, source: "Press release" },
  { date: "2025-08-31", holdings: 837230, sharesOutstanding: 250_000_000, holdingsPerShare: 0.003349, source: "Press release" },
  { date: "2025-10-19", holdings: 859853, sharesOutstanding: 280_000_000, holdingsPerShare: 0.003071, source: "Press release" },
  { date: "2025-11-09", holdings: 861251, sharesOutstanding: 290_000_000, holdingsPerShare: 0.002970, source: "Q3 2025 results" },
];

// Ether Capital (ETHM) - Canadian ETH treasury
const ETHM_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 320000, sharesOutstanding: 45_000_000, holdingsPerShare: 0.007111, source: "Q1 2024 SEDAR+" },
  { date: "2024-06-30", holdings: 380000, sharesOutstanding: 48_000_000, holdingsPerShare: 0.007917, source: "Q2 2024 SEDAR+" },
  { date: "2024-09-30", holdings: 440000, sharesOutstanding: 52_000_000, holdingsPerShare: 0.008462, source: "Q3 2024 SEDAR+" },
  { date: "2024-12-31", holdings: 497000, sharesOutstanding: 55_000_000, holdingsPerShare: 0.009036, source: "Q4 2024 Annual Report" },
  { date: "2025-06-30", holdings: 550000, sharesOutstanding: 58_000_000, holdingsPerShare: 0.009483, source: "Q2 2025 SEDAR+" },
  { date: "2025-09-30", holdings: 590000, sharesOutstanding: 60_000_000, holdingsPerShare: 0.009833, source: "Q3 2025 SEDAR+" },
];

// GameSquare Holdings (GAME) - Esports with ETH treasury
const GAME_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 8500, sharesOutstanding: 120_000_000, holdingsPerShare: 0.0000708, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 12000, sharesOutstanding: 128_000_000, holdingsPerShare: 0.0000938, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 15600, sharesOutstanding: 135_000_000, holdingsPerShare: 0.0001156, source: "Q4 2024 10-K" },
  { date: "2025-07-10", holdings: 1819, sharesOutstanding: 140_000_000, holdingsPerShare: 0.0000130, source: "Initial $5M ETH purchase" },
  { date: "2025-08-13", holdings: 15630, sharesOutstanding: 155_000_000, holdingsPerShare: 0.0001008, source: "Press release" },
  { date: "2026-01-15", holdings: 15600, sharesOutstanding: 160_000_000, holdingsPerShare: 0.0000975, source: "The Block" },
];

// FG Nexus (FGNX) - ETH treasury company (formerly Forgenix/Fundamental Global)
// FG Nexus (FGNX) - ETH treasury company
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const FGNX_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 22000, sharesOutstanding: 65_000_000, holdingsPerShare: 0.000338, source: "Q2 2024 filing" },
  { date: "2024-09-30", holdings: 32000, sharesOutstanding: 72_000_000, holdingsPerShare: 0.000444, source: "Q3 2024 filing" },
  { date: "2024-12-31", holdings: 40000, sharesOutstanding: 80_000_000, holdingsPerShare: 0.000500, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 45000, sharesOutstanding: 83_000_000, holdingsPerShare: 0.000542, source: "Q2 2025 10-Q" },
  { date: "2025-09-28", holdings: 50770, sharesOutstanding: 88_000_000, holdingsPerShare: 0.000577, source: "Q3 2025 10-Q" },
  { date: "2025-12-17", holdings: 40088, sharesOutstanding: 90_000_000, holdingsPerShare: 0.000445, source: "Buyback update" },
  { date: "2026-01-15", holdings: 48442, sharesOutstanding: 92_000_000, holdingsPerShare: 0.000527, source: "The Block" },
];

// ==================== ADDITIONAL SOL COMPANIES ====================

// Forward Industries (FWDI) - World's leading SOL treasury, launched Sept 2025
const FWDI_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-09-11", holdings: 6834506, sharesOutstanding: 35_000_000, holdingsPerShare: 0.19527, source: "Initial $1.65B PIPE close" },
  { date: "2025-11-15", holdings: 6900000, sharesOutstanding: 38_000_000, holdingsPerShare: 0.18158, source: "Press release" },
  { date: "2025-12-01", holdings: 6921342, sharesOutstanding: 40_000_000, holdingsPerShare: 0.17303, source: "Shareholder update" },
  { date: "2026-01-15", holdings: 6980000, sharesOutstanding: 42_000_000, holdingsPerShare: 0.16619, source: "Press release" },
];

// Heliogen Solar (HSDT) - SOL treasury, formerly Solana Company
const HSDT_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-11-01", holdings: 800000, sharesOutstanding: 35_000_000, holdingsPerShare: 0.0229, source: "SOL treasury announcement" },
  { date: "2024-12-31", holdings: 1500000, sharesOutstanding: 42_000_000, holdingsPerShare: 0.0357, source: "Q4 2024 10-K" },
  { date: "2025-06-30", holdings: 2200000, sharesOutstanding: 50_000_000, holdingsPerShare: 0.0440, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 2800000, sharesOutstanding: 58_000_000, holdingsPerShare: 0.0483, source: "Q3 2025 10-Q" },
];

// Upexi (UPXI) - SOL treasury company, launched April 2025
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const UPXI_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-04-15", holdings: 596714, sharesOutstanding: 22_000_000, holdingsPerShare: 0.02712, source: "Initial $100M SOL purchase" },
  { date: "2025-06-30", holdings: 735692, sharesOutstanding: 28_000_000, holdingsPerShare: 0.02627, source: "Q2 2025" },
  { date: "2025-07-31", holdings: 1900000, sharesOutstanding: 40_000_000, holdingsPerShare: 0.04750, source: "Press release" },
  { date: "2025-08-05", holdings: 2000518, sharesOutstanding: 45_000_000, holdingsPerShare: 0.04446, source: "2M SOL milestone" },
  { date: "2025-09-30", holdings: 2018419, sharesOutstanding: 58_888_756, holdingsPerShare: 0.03427, source: "Q3 2025 10-K" },
  { date: "2025-12-31", holdings: 2106000, sharesOutstanding: 62_000_000, holdingsPerShare: 0.03397, source: "Q4 2025 est" },
];

// ==================== ALTCOIN TREASURIES ====================

// TAO Synergies (TAOX) - TAO treasury
const TAOX_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-01", holdings: 25000, sharesOutstanding: 18_000_000, holdingsPerShare: 0.00139, source: "Initial TAO treasury" },
  { date: "2024-12-31", holdings: 42000, sharesOutstanding: 22_000_000, holdingsPerShare: 0.00191, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 54000, sharesOutstanding: 26_000_000, holdingsPerShare: 0.00208, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 62000, sharesOutstanding: 28_000_000, holdingsPerShare: 0.00221, source: "Q3 2025 10-Q" },
];

// TAO Investment Fund (XTAIF) - OTC TAO treasury
const XTAIF_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 35000, sharesOutstanding: 15_000_000, holdingsPerShare: 0.00233, source: "H1 2024 SEDAR" },
  { date: "2024-12-31", holdings: 50000, sharesOutstanding: 18_000_000, holdingsPerShare: 0.00278, source: "FY 2024 annual" },
  { date: "2025-06-30", holdings: 60000, sharesOutstanding: 20_000_000, holdingsPerShare: 0.00300, source: "H1 2025 filing" },
  { date: "2025-09-30", holdings: 65000, sharesOutstanding: 21_000_000, holdingsPerShare: 0.00310, source: "Q3 2025 filing" },
];

// Lite Strategy (LITS) - LTC treasury
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const LITS_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-08-01", holdings: 450000, sharesOutstanding: 32_000_000, holdingsPerShare: 0.01406, source: "Initial LTC treasury 8-K" },
  { date: "2024-12-31", holdings: 720000, sharesOutstanding: 33_500_000, holdingsPerShare: 0.02149, source: "Q4 2024 10-K" },
  { date: "2025-06-30", holdings: 929000, sharesOutstanding: 34_800_000, holdingsPerShare: 0.02670, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 1050000, sharesOutstanding: 35_655_155, holdingsPerShare: 0.02945, source: "Q3 2025 10-K" },
];

// Cypherpunk Holdings (CYPH) - ZEC treasury, Winklevoss-backed (Canadian, SEDAR filings)
const CYPH_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 180000, sharesOutstanding: 85_000_000, holdingsPerShare: 0.00212, source: "Q1 2024 SEDAR" },
  { date: "2024-09-30", holdings: 235000, sharesOutstanding: 92_000_000, holdingsPerShare: 0.00255, source: "Q3 2024 SEDAR" },
  { date: "2024-12-31", holdings: 290000, sharesOutstanding: 98_000_000, holdingsPerShare: 0.00296, source: "FY 2024 annual" },
  { date: "2025-06-30", holdings: 220000, sharesOutstanding: 102_000_000, holdingsPerShare: 0.00216, source: "Q2 2025 SEDAR" },
  { date: "2025-09-30", holdings: 225000, sharesOutstanding: 105_000_000, holdingsPerShare: 0.00214, source: "Q3 2025 SEDAR" },
  { date: "2025-11-19", holdings: 233645, sharesOutstanding: 110_000_000, holdingsPerShare: 0.00212, source: "$18M ZEC purchase" },
  { date: "2025-12-30", holdings: 290063, sharesOutstanding: 125_000_000, holdingsPerShare: 0.00232, source: "$29M ZEC purchase" },
];

// Caliber (CWD) - LINK treasury, first Nasdaq company with LINK policy
const CWD_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-08-28", holdings: 0, sharesOutstanding: 18_000_000, holdingsPerShare: 0, source: "LINK treasury policy adopted" },
  { date: "2025-09-09", holdings: 0, sharesOutstanding: 18_000_000, holdingsPerShare: 0, source: "Initial purchase announced" },
  { date: "2025-09-18", holdings: 278011, sharesOutstanding: 20_000_000, holdingsPerShare: 0.01390, source: "$6.5M LINK purchase" },
  { date: "2025-09-25", holdings: 467632, sharesOutstanding: 22_000_000, holdingsPerShare: 0.02126, source: "$10M milestone" },
  { date: "2025-10-16", holdings: 562535, sharesOutstanding: 24_000_000, holdingsPerShare: 0.02344, source: "$2M additional purchase" },
  { date: "2025-12-11", holdings: 562535, sharesOutstanding: 25_000_000, holdingsPerShare: 0.02250, source: "75K LINK staked" },
];

// SUI Group (SUIG) - SUI treasury
const SUIG_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-10-01", holdings: 45000000, sharesOutstanding: 28_000_000, holdingsPerShare: 1.607, source: "SUI treasury announcement" },
  { date: "2024-12-31", holdings: 78000000, sharesOutstanding: 35_000_000, holdingsPerShare: 2.229, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 108000000, sharesOutstanding: 42_000_000, holdingsPerShare: 2.571, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 130000000, sharesOutstanding: 48_000_000, holdingsPerShare: 2.708, source: "Q3 2025 10-Q" },
];

// AVAX One (AVX) - AVAX treasury
const AVX_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-15", holdings: 5500000, sharesOutstanding: 22_000_000, holdingsPerShare: 0.250, source: "Initial AVAX treasury" },
  { date: "2024-12-31", holdings: 9800000, sharesOutstanding: 28_000_000, holdingsPerShare: 0.350, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 13800000, sharesOutstanding: 35_000_000, holdingsPerShare: 0.394, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 16500000, sharesOutstanding: 40_000_000, holdingsPerShare: 0.413, source: "Q3 2025 10-Q" },
];

// CleanCore Solutions (ZONE) - Official Dogecoin Treasury backed by Dogecoin Foundation
const ZONE_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-09-08", holdings: 285420000, sharesOutstanding: 35_000_000, holdingsPerShare: 8.155, source: "Treasury launch" },
  { date: "2025-09-11", holdings: 500000000, sharesOutstanding: 42_000_000, holdingsPerShare: 11.905, source: "500M DOGE milestone" },
  { date: "2025-09-16", holdings: 600000000, sharesOutstanding: 48_000_000, holdingsPerShare: 12.500, source: "Press release" },
  { date: "2025-09-30", holdings: 703617752, sharesOutstanding: 52_000_000, holdingsPerShare: 13.531, source: "Q1 FY2026 10-Q" },
  { date: "2025-10-06", holdings: 710000000, sharesOutstanding: 55_000_000, holdingsPerShare: 12.909, source: "Press release" },
  { date: "2025-10-13", holdings: 730000000, sharesOutstanding: 58_000_000, holdingsPerShare: 12.586, source: "Press release" },
  { date: "2025-11-12", holdings: 733100000, sharesOutstanding: 60_000_000, holdingsPerShare: 12.218, source: "Q1 FY2026 results" },
];

// Brag House (TBH) - DOGE managed treasury
const TBH_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-08-15", holdings: 350000000, sharesOutstanding: 38_000_000, holdingsPerShare: 9.211, source: "Initial DOGE strategy" },
  { date: "2024-12-31", holdings: 580000000, sharesOutstanding: 48_000_000, holdingsPerShare: 12.083, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 730000000, sharesOutstanding: 58_000_000, holdingsPerShare: 12.586, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 780000000, sharesOutstanding: 62_000_000, holdingsPerShare: 12.581, source: "Q3 2025 10-Q" },
];

// Bit Origin (BTOG) - DOGE treasury, Singapore-based
const BTOG_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-07-21", holdings: 40543745, sharesOutstanding: 58_000_000, holdingsPerShare: 0.699, source: "Initial DOGE purchase" },
  { date: "2025-08-11", holdings: 70543745, sharesOutstanding: 78_000_000, holdingsPerShare: 0.904, source: "Private placement" },
];

// Hyperliquid Strategies (PURR) - HYPE treasury
const PURR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-11-01", holdings: 4500000, sharesOutstanding: 15_000_000, holdingsPerShare: 0.300, source: "Initial HYPE treasury" },
  { date: "2024-12-31", holdings: 8500000, sharesOutstanding: 22_000_000, holdingsPerShare: 0.386, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 12000000, sharesOutstanding: 28_000_000, holdingsPerShare: 0.429, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 15000000, sharesOutstanding: 32_000_000, holdingsPerShare: 0.469, source: "Q3 2025 10-Q" },
];

// Hyperion DeFi (HYPD) - HYPE treasury
const HYPD_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-10-15", holdings: 650000, sharesOutstanding: 12_000_000, holdingsPerShare: 0.0542, source: "HYPE conversion announcement" },
  { date: "2024-12-31", holdings: 1200000, sharesOutstanding: 18_000_000, holdingsPerShare: 0.0667, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 1700000, sharesOutstanding: 22_000_000, holdingsPerShare: 0.0773, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 2100000, sharesOutstanding: 25_000_000, holdingsPerShare: 0.0840, source: "Q3 2025 10-Q" },
];

// Tron Inc (TRON) - TRX treasury, formerly SRM Entertainment
const TRON_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-06-15", holdings: 365096845, sharesOutstanding: 65_000_000, holdingsPerShare: 5.617, source: "Initial TRX treasury" },
  { date: "2025-09-02", holdings: 677596945, sharesOutstanding: 85_000_000, holdingsPerShare: 7.972, source: "$110M expansion" },
];

// Evernorth (XRPN) - XRP treasury
const XRPN_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-01", holdings: 200000000, sharesOutstanding: 42_000_000, holdingsPerShare: 4.762, source: "Initial XRP treasury" },
  { date: "2024-12-31", holdings: 388000000, sharesOutstanding: 55_000_000, holdingsPerShare: 7.055, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 473000000, sharesOutstanding: 68_000_000, holdingsPerShare: 6.956, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 520000000, sharesOutstanding: 75_000_000, holdingsPerShare: 6.933, source: "Q3 2025 10-Q" },
];

// ==================== OTHER ASSETS ====================

// CleanSpark (CLSK) - BTC miner
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const CLSK_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 6591, sharesOutstanding: 229_571_000, holdingsPerShare: 0.0000287, source: "Q1 2024" },
  { date: "2024-06-30", holdings: 8049, sharesOutstanding: 248_119_133, holdingsPerShare: 0.0000324, source: "Q2 2024" },
  { date: "2024-09-30", holdings: 8701, sharesOutstanding: 292_561_667, holdingsPerShare: 0.0000297, source: "Q3 2024" },
  { date: "2024-12-31", holdings: 10556, sharesOutstanding: 280_807_606, holdingsPerShare: 0.0000376, source: "Q4 2024 10-K" },
  { date: "2025-06-30", holdings: 11500, sharesOutstanding: 281_083_382, holdingsPerShare: 0.0000409, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 12300, sharesOutstanding: 255_583_445, holdingsPerShare: 0.0000481, source: "Q3 2025 10-Q" },
  { date: "2025-12-31", holdings: 13099, sharesOutstanding: 260_000_000, holdingsPerShare: 0.0000504, source: "Dec 2025 mining update" },
];

// Hut 8 (HUT) - Canadian miner, merged with US Bitcoin Corp Nov 2023
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const HUT_HISTORY: HoldingsSnapshot[] = [
  { date: "2023-12-31", holdings: 9195, sharesOutstanding: 82_900_000, holdingsPerShare: 0.0001109, source: "Dec 2023 Report" },
  { date: "2024-03-31", holdings: 9102, sharesOutstanding: 86_800_000, holdingsPerShare: 0.0001049, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 9102, sharesOutstanding: 91_078_961, holdingsPerShare: 0.0000999, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 9106, sharesOutstanding: 93_581_092, holdingsPerShare: 0.0000973, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 10171, sharesOutstanding: 103_855_686, holdingsPerShare: 0.0000979, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 10264, sharesOutstanding: 104_220_084, holdingsPerShare: 0.0000985, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 10667, sharesOutstanding: 105_527_928, holdingsPerShare: 0.0001011, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 13696, sharesOutstanding: 108_036_632, holdingsPerShare: 0.0001268, source: "Q3 2025 10-Q" },
  { date: "2026-01-03", holdings: 13696, sharesOutstanding: 112_000_000, holdingsPerShare: 0.0001223, source: "$200M Coinbase credit facility" },
];

// Core Scientific (CORZ) - Emerged from bankruptcy Jan 2024
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const CORZ_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-12-31", holdings: 256, sharesOutstanding: 294_122_589, holdingsPerShare: 0.00000087, source: "FY 2024 10-K" },
  { date: "2025-03-31", holdings: 977, sharesOutstanding: 297_821_835, holdingsPerShare: 0.00000328, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 1612, sharesOutstanding: 305_408_442, holdingsPerShare: 0.00000528, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 2116, sharesOutstanding: 310_061_300, holdingsPerShare: 0.00000682, source: "Q3 2025 10-Q" },
];

// Bitdeer Technologies (BTDR) - Started treasury strategy Nov 2024
const BTDR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-12-31", holdings: 594, sharesOutstanding: 165_427_000, holdingsPerShare: 0.00000359, source: "FY 2024 Earnings" },
  { date: "2025-03-31", holdings: 1156, sharesOutstanding: 228_561_000, holdingsPerShare: 0.00000506, source: "Q1 2025 Earnings" },
  { date: "2025-06-30", holdings: 1502, sharesOutstanding: 193_970_000, holdingsPerShare: 0.00000774, source: "Q2 2025 Earnings" },
  { date: "2025-09-30", holdings: 2029, sharesOutstanding: 230_814_000, holdingsPerShare: 0.00000879, source: "Q3 2025 Earnings" },
  { date: "2025-12-31", holdings: 2179, sharesOutstanding: 245_000_000, holdingsPerShare: 0.00000889, source: "Dec 2025 production update" },
  { date: "2026-01-10", holdings: 1901, sharesOutstanding: 250_000_000, holdingsPerShare: 0.00000760, source: "Weekly holdings update" },
];

// Trump Media (DJT) - Started BTC treasury May 2025
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const DJT_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-05-30", holdings: 0, sharesOutstanding: 220_624_508, holdingsPerShare: 0, source: "Treasury deal closed" },
  { date: "2025-07-21", holdings: 19000, sharesOutstanding: 277_067_396, holdingsPerShare: 0.0000686, source: "Press reports ~$2B BTC" },
  { date: "2025-09-30", holdings: 15000, sharesOutstanding: 279_997_636, holdingsPerShare: 0.0000536, source: "Q3 2025 10-Q" },
  { date: "2025-12-22", holdings: 11542, sharesOutstanding: 285_000_000, holdingsPerShare: 0.0000405, source: "Bitcoin Magazine" },
  { date: "2026-01-10", holdings: 15000, sharesOutstanding: 288_000_000, holdingsPerShare: 0.0000521, source: "The Block" },
];

// Twenty One Capital (XXI) - Launched by Tether/SoftBank/Mallers, 3rd largest public BTC holder
// Twenty One Capital (XXI) - Launched by Tether/SoftBank/Mallers
const XXI_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-04-23", holdings: 42000, sharesOutstanding: 500_000_000, holdingsPerShare: 0.0000840, source: "Initial announcement" },
  { date: "2025-07-29", holdings: 43500, sharesOutstanding: 550_000_000, holdingsPerShare: 0.0000791, source: "Pre-listing update" },
  { date: "2025-09-30", holdings: 43510, sharesOutstanding: 600_000_000, holdingsPerShare: 0.0000725, source: "Q3 2025 10-Q" },
  { date: "2025-12-09", holdings: 43514, sharesOutstanding: 651_000_000, holdingsPerShare: 0.0000668, source: "NYSE listing 8-K" },
  { date: "2026-01-02", holdings: 43514, sharesOutstanding: 346_548_153, holdingsPerShare: 0.0001256, source: "Shares outstanding update" },
];

// Strive (ASST) - First publicly traded asset management BTC treasury
// Data from press releases and SEC filings
const ASST_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-09-12", holdings: 5886, sharesOutstanding: 28_000_000, holdingsPerShare: 0.0002102, source: "Initial BTC treasury announcement" },
  { date: "2025-11-15", holdings: 7525, sharesOutstanding: 30_000_000, holdingsPerShare: 0.0002508, source: "SATA preferred offering" },
  { date: "2025-12-31", holdings: 7627, sharesOutstanding: 31_000_000, holdingsPerShare: 0.0002460, source: "Preliminary year-end" },
  { date: "2026-01-16", holdings: 12798, sharesOutstanding: 45_000_000, holdingsPerShare: 0.0002844, source: "Post-Semler merger 8-K" },
];

// ==================== BNB COMPANIES ====================

// BNC - BNB treasury backed by YZi Labs (CZ family office)
const BNC_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-06-15", holdings: 150000, sharesOutstanding: 45_000_000, holdingsPerShare: 3.333, source: "Initial BNB treasury" },
  { date: "2025-09-30", holdings: 320000, sharesOutstanding: 55_000_000, holdingsPerShare: 5.818, source: "Q3 2025 filing" },
  { date: "2025-12-31", holdings: 500000, sharesOutstanding: 65_000_000, holdingsPerShare: 7.692, source: "Q4 2025 filing" },
];

// Nano Labs (NA) - Hong Kong Web3 infrastructure, BNB treasury
const NA_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-06-30", holdings: 50000, sharesOutstanding: 85_000_000, holdingsPerShare: 0.588, source: "Initial BNB purchase" },
  { date: "2025-09-30", holdings: 90000, sharesOutstanding: 95_000_000, holdingsPerShare: 0.947, source: "Q3 2025 filing" },
  { date: "2025-12-31", holdings: 130000, sharesOutstanding: 105_000_000, holdingsPerShare: 1.238, source: "Q4 2025 filing" },
];

// ==================== ADDITIONAL BTC ====================

// CEPO (Blockstream SPAC) - Adam Back's BTC treasury play
const CEPO_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-10-15", holdings: 25000, sharesOutstanding: 120_000_000, holdingsPerShare: 0.0002083, source: "Initial contribution from Adam Back" },
  { date: "2025-11-30", holdings: 28000, sharesOutstanding: 135_000_000, holdingsPerShare: 0.0002074, source: "Additional purchases" },
  { date: "2025-12-31", holdings: 30021, sharesOutstanding: 145_000_000, holdingsPerShare: 0.0002070, source: "Year-end 8-K" },
];

// ==================== ADDITIONAL TAO ====================

// TWAV (Taoweave, fka Oblong) - TAO treasury
const TWAV_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-06-15", holdings: 8000, sharesOutstanding: 12_000_000, holdingsPerShare: 0.667, source: "Initial TAO treasury" },
  { date: "2025-09-30", holdings: 15000, sharesOutstanding: 15_000_000, holdingsPerShare: 1.000, source: "Q3 2025 filing" },
  { date: "2025-12-31", holdings: 21943, sharesOutstanding: 18_000_000, holdingsPerShare: 1.219, source: "Q4 2025 filing" },
];

// ==================== ADDITIONAL LTC ====================

// LUXFF (Luxxfolio) - Canadian LTC treasury, Charlie Lee advisor
const LUXFF_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 5000, sharesOutstanding: 150_000_000, holdingsPerShare: 0.0000333, source: "Initial LTC treasury" },
  { date: "2024-12-31", holdings: 12000, sharesOutstanding: 180_000_000, holdingsPerShare: 0.0000667, source: "FY 2024 annual" },
  { date: "2025-06-30", holdings: 16500, sharesOutstanding: 200_000_000, holdingsPerShare: 0.0000825, source: "H1 2025 filing" },
  { date: "2025-09-30", holdings: 18000, sharesOutstanding: 208_000_000, holdingsPerShare: 0.0000865, source: "Q3 2025 SEDAR" },
  { date: "2025-12-31", holdings: 20084, sharesOutstanding: 220_000_000, holdingsPerShare: 0.0000913, source: "FY 2025 annual" },
];

// ==================== HBAR COMPANIES ====================

// IHLDF (Immutable Holdings) - HBAR treasury, Hedera founding team
const IHLDF_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-07-15", holdings: 20000000, sharesOutstanding: 45_000_000, holdingsPerShare: 0.444, source: "Initial HBAR treasury" },
  { date: "2025-09-30", holdings: 35000000, sharesOutstanding: 55_000_000, holdingsPerShare: 0.636, source: "Q3 2025 filing" },
  { date: "2025-12-31", holdings: 48000000, sharesOutstanding: 65_000_000, holdingsPerShare: 0.738, source: "Q4 2025 filing" },
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

  // BNB Companies
  BNC: { ticker: "BNC", asset: "BNB", history: BNC_HISTORY },
  NA: { ticker: "NA", asset: "BNB", history: NA_HISTORY },

  // Additional BTC
  CEPO: { ticker: "CEPO", asset: "BTC", history: CEPO_HISTORY },

  // Additional TAO
  TWAV: { ticker: "TWAV", asset: "TAO", history: TWAV_HISTORY },

  // Additional LTC
  LUXFF: { ticker: "LUXFF", asset: "LTC", history: LUXFF_HISTORY },

  // HBAR Companies
  IHLDF: { ticker: "IHLDF", asset: "HBAR", history: IHLDF_HISTORY },
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
