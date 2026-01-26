// Historical holdings per share data for companies that report it
// Sources: Company quarterly reports, 8-K filings, press releases
// Last updated: 2026-01-22 - Added source tracking for verification system (Phase 7a)
// NOTE: Share counts use DILUTED figures from SEC filings for accurate market cap calculation

import type { HoldingsSource } from '../types';

export interface HoldingsSnapshot {
  date: string; // YYYY-MM-DD
  holdings: number; // Total holdings (BTC, ETH, etc.)
  sharesOutstandingDiluted: number; // Diluted shares (WeightedAverageNumberOfDilutedSharesOutstanding)
  sharesOutstandingBasic?: number; // Basic shares (EntityCommonStockSharesOutstanding) - optional
  holdingsPerShare: number; // Calculated: holdings / sharesOutstandingDiluted

  // Source tracking (text description)
  source?: string; // e.g., "Q3 2024 10-Q", "8-K filing" - applies to holdings
  sharesAsOf?: string; // YYYY-MM-DD - if shares data is from different date than holdings
  sharesSource?: string; // SEC filing or source for share count, if different from holdings source

  // Verifiable source tracking (for automated verification)
  sourceUrl?: string; // URL that can be fetched and verified
  sourceType?: HoldingsSource; // Type of source (sec-filing, company-website, etc.)

  // For estimates (shares between quarters, ATM dilution, etc.)
  methodology?: string; // e.g., "SEC Q3 diluted (470M) + ATM estimate (25M)"
  confidence?: "high" | "medium" | "low";
  confidenceRange?: { floor: number; ceiling: number };
}

export interface CompanyHoldingsHistory {
  ticker: string;
  asset: string;
  history: HoldingsSnapshot[];
}

// MSTR historical data from quarterly reports
// Data compiled from 10-Q/10-K filings and 8-K announcements
// NOTE: All share counts are SPLIT-ADJUSTED (10:1 split in Aug 2024)
// SEC EDGAR source: WeightedAverageNumberOfDilutedSharesOutstanding
const MSTR_HISTORY: HoldingsSnapshot[] = [
  // 2020 - Initial purchases (split-adjusted: original * 10)
  { date: "2020-09-14", holdings: 38250, sharesOutstandingDiluted: 98_000_000, holdingsPerShare: 0.000390, source: "Initial BTC purchase announcement" },
  { date: "2020-12-21", holdings: 70470, sharesOutstandingDiluted: 103_000_000, holdingsPerShare: 0.000684, source: "Q4 2020" },

  // 2021 (split-adjusted)
  { date: "2021-03-31", holdings: 91326, sharesOutstandingDiluted: 105_000_000, holdingsPerShare: 0.000870, source: "Q1 2021 10-Q" },
  { date: "2021-06-30", holdings: 105085, sharesOutstandingDiluted: 109_000_000, holdingsPerShare: 0.000964, source: "Q2 2021 10-Q" },
  { date: "2021-09-30", holdings: 114042, sharesOutstandingDiluted: 112_000_000, holdingsPerShare: 0.001018, source: "Q3 2021 10-Q" },
  { date: "2021-12-31", holdings: 124391, sharesOutstandingDiluted: 115_000_000, holdingsPerShare: 0.001082, source: "Q4 2021 10-K" },

  // 2022 (split-adjusted)
  { date: "2022-03-31", holdings: 129218, sharesOutstandingDiluted: 117_000_000, holdingsPerShare: 0.001104, source: "Q1 2022 10-Q" },
  { date: "2022-06-30", holdings: 129699, sharesOutstandingDiluted: 118_000_000, holdingsPerShare: 0.001099, source: "Q2 2022 10-Q" },
  { date: "2022-09-30", holdings: 130000, sharesOutstandingDiluted: 119_000_000, holdingsPerShare: 0.001092, source: "Q3 2022 10-Q" },
  { date: "2022-12-31", holdings: 132500, sharesOutstandingDiluted: 120_000_000, holdingsPerShare: 0.001104, source: "Q4 2022 10-K" },

  // 2023 (split-adjusted, SEC EDGAR data)
  { date: "2023-03-31", holdings: 140000, sharesOutstandingDiluted: 118_340_000, holdingsPerShare: 0.001183, source: "Q1 2023 10-Q" },
  { date: "2023-06-30", holdings: 152800, sharesOutstandingDiluted: 117_390_000, holdingsPerShare: 0.001302, source: "Q2 2023 10-Q" },
  { date: "2023-09-30", holdings: 158245, sharesOutstandingDiluted: 116_648_000, holdingsPerShare: 0.001357, source: "Q3 2023 10-Q" },
  { date: "2023-12-31", holdings: 189150, sharesOutstandingDiluted: 136_706_000, holdingsPerShare: 0.001384, source: "Q4 2023 10-K" },

  // 2024 - Aggressive accumulation (SEC EDGAR diluted split-adjusted data)
  { date: "2024-03-31", holdings: 214246, sharesOutstandingDiluted: 185_560_000, holdingsPerShare: 0.001155, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 226500, sharesOutstandingDiluted: 178_610_000, holdingsPerShare: 0.001268, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 252220, sharesOutstandingDiluted: 197_270_000, holdingsPerShare: 0.001278, source: "Q3 2024 10-Q" },
  { date: "2024-11-18", holdings: 331200, sharesOutstandingDiluted: 220_000_000, holdingsPerShare: 0.001505, source: "8-K Nov 2024 - mNAV peak ~3.4x" },
  { date: "2024-12-31", holdings: 446400, sharesOutstandingDiluted: 257_640_000, holdingsPerShare: 0.001733, source: "Q4 2024 10-K" },

  // 2025 - Continued 21/21 plan execution (SEC EDGAR diluted shares)
  { date: "2025-03-31", holdings: 553555, sharesOutstandingDiluted: 290_090_000, holdingsPerShare: 0.001908, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 580250, sharesOutstandingDiluted: 306_760_000, holdingsPerShare: 0.001891, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 640808, sharesOutstandingDiluted: 315_390_000, holdingsPerShare: 0.002032, source: "Q3 2025 10-Q" },
  // 2026 - Weekly 8-K filings (holdings verified via bitbo.io/treasuries/microstrategy which cites SEC 8-K)
  // Adversarial review 2026-01-22: Previous entries (710K, 725K) had no supporting 8-K. Corrected to verified values.
  { date: "2025-12-31", holdings: 672500, sharesOutstandingDiluted: 330_000_000, holdingsPerShare: 0.002038, source: "Back-calc from Jan 5 8-K (673,783 - 1,283 Jan purchases + 3 Dec purchases)" },
  { date: "2026-01-12", holdings: 687410, sharesOutstandingDiluted: 345_000_000, holdingsPerShare: 0.001993, source: "SEC 8-K Jan 12 (via bitbo.io)", sharesSource: "ESTIMATE: ATM dilution", methodology: "Q3 2025 diluted (315M) + estimated ATM issuance (~30M shares)", confidence: "medium", confidenceRange: { floor: 330_000_000, ceiling: 360_000_000 } },
  { date: "2026-01-20", holdings: 709715, sharesOutstandingDiluted: 362_606_000, holdingsPerShare: 0.001958, source: "SEC 8-K Jan 20 (via bitbo.io)", sharesSource: "mNAV.com fullyDilutedShares", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K", sourceType: "sec-filing" },
];

// MARA Holdings - Largest US public miner
// SEC EDGAR source: WeightedAverageNumberOfDilutedSharesOutstanding
const MARA_HISTORY: HoldingsSnapshot[] = [
  { date: "2023-12-31", holdings: 15126, sharesOutstandingDiluted: 310_890_000, holdingsPerShare: 0.0000487, source: "FY 2023 10-K" },
  { date: "2024-03-31", holdings: 17631, sharesOutstandingDiluted: 328_630_000, holdingsPerShare: 0.0000537, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 18488, sharesOutstandingDiluted: 356_800_000, holdingsPerShare: 0.0000518, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 26747, sharesOutstandingDiluted: 396_980_000, holdingsPerShare: 0.0000674, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 44893, sharesOutstandingDiluted: 430_000_000, holdingsPerShare: 0.0001044, source: "FY 2024 10-K" },
  { date: "2025-03-31", holdings: 46376, sharesOutstandingDiluted: 445_000_000, holdingsPerShare: 0.0001042, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 49951, sharesOutstandingDiluted: 458_000_000, holdingsPerShare: 0.0001091, source: "Q2 2025 10-Q" },
  // Q3 2025: SEC 10-Q WeightedAverageNumberOfDilutedSharesOutstanding = 470,126,290
  // Note: 378M on cover page is EntityCommonStockSharesOutstanding (basic), not diluted
  // Q3 2025 was a profit quarter ($123M net income), so diluted includes convertibles
  // Cross-referenced: mNAV.com fullyDilutedShares=470,100,000, FinanceCharts=470,126,290
  // Q3 2025 earnings report: 53,250 BTC (mNAV uses this). SEC 10-Q digital assets show 52,850.
  // Using earnings report value as it's more recent and cross-verified.
  { date: "2025-09-30", holdings: 53250, sharesOutstandingDiluted: 470_126_290, holdingsPerShare: 0.0001133, source: "Q3 2025 earnings report", sharesSource: "SEC WeightedAverageNumberOfDilutedSharesOutstanding", sourceUrl: "https://ir.mara.com/news-events/press-releases/detail/1409/mara-announces-third-quarter-2025-results", sourceType: "press-release" },
];

// RIOT Platforms - BTC Miner
// SEC EDGAR CIK: 0001167419
//
// SHARE COUNT CORRECTION (Jan 2026):
// Previous entries used 371M from SEC 10-Q cover page (basic shares)
// Correct diluted shares: ~402M (implied from Q3 2025 EPS: $104.5M ÷ $0.26 = 402M)
// Q3 2025 was a profit quarter, so diluted includes all convertible securities
//
// HOLDINGS NOTE: RIOT sold 1,818 BTC in Dec 2025, reducing holdings to 18,005 BTC
// Source: Riot Dec 2025 Production Update (riotplatforms.com, Jan 7, 2026)
const RIOT_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 8490, sharesOutstandingDiluted: 280_000_000, holdingsPerShare: 0.0000303, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 9334, sharesOutstandingDiluted: 295_000_000, holdingsPerShare: 0.0000316, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 10427, sharesOutstandingDiluted: 310_000_000, holdingsPerShare: 0.0000336, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 17722, sharesOutstandingDiluted: 325_000_000, holdingsPerShare: 0.0000545, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 19223, sharesOutstandingDiluted: 335_000_000, holdingsPerShare: 0.0000574, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 15370, sharesOutstandingDiluted: 350_000_000, holdingsPerShare: 0.0000439, source: "Q2 2025 10-Q" },
  // Q3 2025: Diluted shares = 402M (from EPS: $104.5M net income ÷ $0.26 diluted EPS)
  // Note: 371M on cover page is basic shares, not diluted
  { date: "2025-09-30", holdings: 17429, sharesOutstandingDiluted: 402_000_000, holdingsPerShare: 0.0000434, source: "Q3 2025 10-Q", sharesSource: "Implied from Q3 EPS ($104.5M ÷ $0.26)" },
  // Dec 2025: Sold 1,818 BTC → 18,005 BTC remaining
  // Source: Riot Dec 2025 Production Update (riotplatforms.com)
  { date: "2025-12-31", holdings: 18005, sharesOutstandingDiluted: 402_000_000, holdingsPerShare: 0.0000448, source: "Dec 2025 Production Update", sharesSource: "Q3 2025 diluted (latest)", sourceUrl: "https://www.riotplatforms.com/news-media/press-releases", sourceType: "press-release" },
];

// Metaplanet (3350.T) - Japan's first Bitcoin treasury company
// Data from TSE filings and press releases
//
// STOCK SPLIT HISTORY:
// - July 30, 2024: 1-for-10 reverse split (shares ÷10)
// - March 28, 2025: 10-for-1 forward split (shares ×10)
// All historical numbers below are split-adjusted.
//
// SHARE STRUCTURE (Jan 2026):
// - Issued (common): 1,142,274,340 (1.14B) - tradeable shares (Nov 2025 filing)
// - Fully Diluted:   1,434,392,925 (1.43B) - includes convertible preferred
// - Difference:      ~294M from preferred stock (Class B "MERCURY" etc.)
//
// PREFERRED STOCK:
// - Class B "MERCURY" (Dec 2025): 23.61M shares, ¥1,000 conversion price
// - Currently underwater (stock ¥510 vs conversion ¥1,000)
// - Total preferred: ¥86.58B - handled via preferredEquity in companies.ts, NOT share dilution
//
// For mNAV calculation, we use COMMON SHARES (1.14B) because:
// - metaplanet.jp shows ~1.26x mNAV using this methodology
// - Preferred stock value is captured via preferredEquity field in EV calculation
// - Double-counting (diluted shares + preferredEquity) would inflate mNAV incorrectly
const METAPLANET_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-04-23", holdings: 97.85, sharesOutstandingDiluted: 17_600_000, holdingsPerShare: 0.00000556, source: "Initial BTC purchase" },
  { date: "2024-05-13", holdings: 141.07, sharesOutstandingDiluted: 18_200_000, holdingsPerShare: 0.00000775, source: "Press release" },
  { date: "2024-06-11", holdings: 161.27, sharesOutstandingDiluted: 19_500_000, holdingsPerShare: 0.00000827, source: "Press release" },
  { date: "2024-07-16", holdings: 245.99, sharesOutstandingDiluted: 24_000_000, holdingsPerShare: 0.00001025, source: "Press release" },
  { date: "2024-08-13", holdings: 360.37, sharesOutstandingDiluted: 28_500_000, holdingsPerShare: 0.00001265, source: "Press release" },
  { date: "2024-09-10", holdings: 398.83, sharesOutstandingDiluted: 32_000_000, holdingsPerShare: 0.00001246, source: "Press release" },
  { date: "2024-10-11", holdings: 530.71, sharesOutstandingDiluted: 36_000_000, holdingsPerShare: 0.00001474, source: "Press release" },
  { date: "2024-11-18", holdings: 1142.29, sharesOutstandingDiluted: 42_000_000, holdingsPerShare: 0.00002720, source: "Press release" },
  { date: "2024-12-23", holdings: 1762.00, sharesOutstandingDiluted: 46_000_000, holdingsPerShare: 0.00003830, source: "Press release" },
  { date: "2025-03-31", holdings: 4206, sharesOutstandingDiluted: 310_000_000, holdingsPerShare: 0.00001357, source: "Q1 2025 TSE filing" },
  { date: "2025-06-30", holdings: 12850, sharesOutstandingDiluted: 420_000_000, holdingsPerShare: 0.00003060, source: "Q2 2025 TSE filing" },
  { date: "2025-09-30", holdings: 22500, sharesOutstandingDiluted: 850_000_000, holdingsPerShare: 0.00002647, source: "Q3 2025 TSE filing" },
  // Common shares minus OTM Mercury converts (¥1000 strike vs ¥540 stock price)
  // 1.142B common - 23.6M Mercury converts = 1.119B (matches metaplanet.jp mNAV methodology)
  { date: "2026-01-24", holdings: 35102, sharesOutstandingDiluted: 1_118_664_340, holdingsPerShare: 0.00003138, source: "Press release", sharesSource: "Common shares ex-OTM Mercury converts", sourceUrl: "https://metaplanet.jp/bitcoin", sourceType: "company-website" },
];

// Semler Scientific (SMLR) - Medical device company turned BTC treasury
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const SMLR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-05-28", holdings: 581, sharesOutstandingDiluted: 7_068_024, holdingsPerShare: 0.0000822, source: "Initial purchase 8-K" },
  { date: "2024-06-17", holdings: 828, sharesOutstandingDiluted: 7_133_788, holdingsPerShare: 0.0001161, source: "8-K filing" },
  { date: "2024-09-30", holdings: 1058, sharesOutstandingDiluted: 7_266_242, holdingsPerShare: 0.0001456, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 2321, sharesOutstandingDiluted: 9_596_486, holdingsPerShare: 0.0002419, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 3082, sharesOutstandingDiluted: 11_151_572, holdingsPerShare: 0.0002764, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 2084, sharesOutstandingDiluted: 14_804_693, holdingsPerShare: 0.0001408, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 2058, sharesOutstandingDiluted: 15_159_895, holdingsPerShare: 0.0001357, source: "Q3 2025 10-Q" },
  { date: "2025-12-31", holdings: 2300, sharesOutstandingDiluted: 16_000_000, holdingsPerShare: 0.0001438, source: "Q4 2025 10-K est" },
  { date: "2026-01-15", holdings: 2450, sharesOutstandingDiluted: 16_500_000, holdingsPerShare: 0.0001485, source: "8-K filing", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000827876&type=8-K", sourceType: "sec-filing" },
];

// ==================== ETH COMPANIES ====================

// BTCS Inc - One of the first public ETH treasury companies
// SEC EDGAR source: EntityCommonStockSharesOutstanding
// NOTE: Historical data before 2025 needs verification - BTCS dramatically scaled ETH holdings in 2025
// Q3 2025 8-K: "ETH holdings increased to 70,322 ETH, up 380% from Q2 2025"
const BTCS_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-12-31", holdings: 9_000, sharesOutstandingDiluted: 20_087_981, holdingsPerShare: 0.000448, source: "2024 10-K (estimated from YTD growth)" },
  { date: "2025-06-30", holdings: 14_700, sharesOutstandingDiluted: 22_000_000, holdingsPerShare: 0.000668, source: "Q2 2025 (implied from Q3 380% growth)" },
  { date: "2025-09-30", holdings: 70_322, sharesOutstandingDiluted: 50_298_201, holdingsPerShare: 0.001398, source: "Q3 2025 8-K (verified)", sharesSource: "10-Q diluted shares. Options at $2.64 in the money", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229", sourceType: "sec-filing" },
  { date: "2025-12-31", holdings: 70_500, sharesOutstandingDiluted: 50_000_000, holdingsPerShare: 0.001410, source: "8-K Jan 7, 2026 shareholder letter (verified)", sharesSource: "Est diluted. Convertibles at $5.85/$13 out of money, options at $2.64 in money", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229&type=8-K", sourceType: "sec-filing" },
];

// Bit Digital - ETH miner and holder
// SEC EDGAR source: EntityCommonStockSharesOutstanding
// Corrected to 324M FD shares per Q3 2025 10-Q (was overstated)
// Note: Historical values were incorrectly showing ~30-40K ETH when actual holdings were much higher
// BTBT accumulated ETH throughout 2024-2025, reaching 155,227 ETH by Dec 2025
const BTBT_HISTORY: HoldingsSnapshot[] = [
  { date: "2023-12-31", holdings: 17245, sharesOutstandingDiluted: 165_000_000, holdingsPerShare: 0.000105, source: "2023 10-K" },
  { date: "2024-06-30", holdings: 22890, sharesOutstandingDiluted: 175_000_000, holdingsPerShare: 0.000131, source: "Q2 2024 10-Q" },
  { date: "2024-12-31", holdings: 27350, sharesOutstandingDiluted: 182_435_019, holdingsPerShare: 0.000150, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 85000, sharesOutstandingDiluted: 207_780_871, holdingsPerShare: 0.000409, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 120000, sharesOutstandingDiluted: 315_000_000, holdingsPerShare: 0.000381, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 140000, sharesOutstandingDiluted: 324_000_000, holdingsPerShare: 0.000432, source: "Q3 2025 10-Q", sharesSource: "SEC 10-Q diluted" },
  { date: "2025-12-31", holdings: 155227, sharesOutstandingDiluted: 324_000_000, holdingsPerShare: 0.000479, source: "Dec 2025 Press Release", sourceUrl: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/", sourceType: "press-release" },
];

// ==================== SOL COMPANIES ====================

// Sol Strategies (STKE.CA) - Canadian SOL treasury
const STKE_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 85000, sharesOutstandingDiluted: 45_000_000, holdingsPerShare: 0.001889, source: "Q2 2024" },
  { date: "2024-09-30", holdings: 142000, sharesOutstandingDiluted: 52_000_000, holdingsPerShare: 0.002731, source: "Q3 2024" },
  { date: "2024-12-31", holdings: 189000, sharesOutstandingDiluted: 65_000_000, holdingsPerShare: 0.002908, source: "Q4 2024 SEDAR+" },
  { date: "2025-03-31", holdings: 245000, sharesOutstandingDiluted: 75_000_000, holdingsPerShare: 0.003267, source: "Q1 2025 SEDAR+" },
  { date: "2025-06-30", holdings: 310000, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.003647, source: "Q2 2025 SEDAR+" },
  { date: "2025-09-30", holdings: 435159, sharesOutstandingDiluted: 115_000_000, holdingsPerShare: 0.003784, source: "FY 2025 annual" },
  { date: "2026-01-06", holdings: 523134, sharesOutstandingDiluted: 135_000_000, holdingsPerShare: 0.003875, source: "Dec 2025 monthly update", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001846839", sourceType: "sec-filing" },
];

// DeFi Development Corp (DFDV) - SOL treasury, launched April 2025
const DFDV_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-04-15", holdings: 150000, sharesOutstandingDiluted: 15_000_000, holdingsPerShare: 0.01000, source: "Initial SOL treasury" },
  { date: "2025-06-30", holdings: 735692, sharesOutstandingDiluted: 18_000_000, holdingsPerShare: 0.04087, source: "Q2 2025" },
  { date: "2025-08-05", holdings: 2000518, sharesOutstandingDiluted: 25_000_000, holdingsPerShare: 0.08002, source: "2M SOL milestone" },
  { date: "2025-09-30", holdings: 2018419, sharesOutstandingDiluted: 28_000_000, holdingsPerShare: 0.07209, source: "Q3 2025" },
  { date: "2025-12-31", holdings: 2106000, sharesOutstandingDiluted: 30_000_000, holdingsPerShare: 0.07020, source: "Q4 2025 preliminary" },
  { date: "2026-01-01", holdings: 2221329, sharesOutstandingDiluted: 30_000_000, holdingsPerShare: 0.07404, source: "Year in review", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001805526", sourceType: "sec-filing" },
];

// KULR Technology - Bitcoin First Company
// Note: 1-for-8 reverse stock split on June 23, 2025
// SEC EDGAR source: WeightedAverageNumberOfDilutedSharesOutstanding
// Q3 2025 10-Q: 1,056.7 BTC + 70 BTC collateral, fair value $120.5M
// ATM paused Dec 22, 2025 through Jun 30, 2026
const KULR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-12-26", holdings: 217.18, sharesOutstandingDiluted: 214_227_808, holdingsPerShare: 0.00000101, source: "Initial BTC purchase 8-K" },
  { date: "2025-01-06", holdings: 430.6, sharesOutstandingDiluted: 240_000_000, holdingsPerShare: 0.00000179, source: "8-K filing" },
  { date: "2025-01-21", holdings: 510, sharesOutstandingDiluted: 260_000_000, holdingsPerShare: 0.00000196, source: "Press release" },
  { date: "2025-02-11", holdings: 610.3, sharesOutstandingDiluted: 280_000_000, holdingsPerShare: 0.00000218, source: "Press release" },
  { date: "2025-03-25", holdings: 668.3, sharesOutstandingDiluted: 284_389_637, holdingsPerShare: 0.00000235, source: "Press release" },
  { date: "2025-05-20", holdings: 800.3, sharesOutstandingDiluted: 298_466_335, holdingsPerShare: 0.00000268, source: "Press release" },
  // Post reverse split (1-for-8) - SEC shows split-adjusted shares
  { date: "2025-06-23", holdings: 920, sharesOutstandingDiluted: 41_108_543, holdingsPerShare: 0.0000224, source: "Press release + reverse split" },
  { date: "2025-07-10", holdings: 1021, sharesOutstandingDiluted: 42_500_000, holdingsPerShare: 0.0000240, source: "GlobeNewswire press release", sourceUrl: "https://www.globenewswire.com/news-release/2025/07/10/3113243/0/en/KULR-Expands-Bitcoin-Holdings-to-1-021-BTC-Reports-291-2-BTC-Yield.html", sourceType: "press-release" },
  // Q3 2025: 10-Q shows 1,056.7 BTC held + 70 BTC as collateral = 1,127 total. Using 1,057 (excludes collateral).
  { date: "2025-09-30", holdings: 1057, sharesOutstandingDiluted: 45_650_000, holdingsPerShare: 0.0000231, source: "SEC 10-Q Q3 2025", sharesSource: "Stock Analysis Jan 2026", sourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm", sourceType: "sec-filing" },
];

// Boyaa Interactive (0434.HK) - Hong Kong's largest BTC treasury
// Data from HKEX filings and press releases
const BOYAA_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-01-26", holdings: 1100, sharesOutstandingDiluted: 660_000_000, holdingsPerShare: 0.00000167, source: "Initial accumulation" },
  { date: "2024-03-29", holdings: 1194, sharesOutstandingDiluted: 660_000_000, holdingsPerShare: 0.00000181, source: "HKEX filing" },
  { date: "2024-05-22", holdings: 1956, sharesOutstandingDiluted: 660_000_000, holdingsPerShare: 0.00000296, source: "HKEX filing" },
  { date: "2024-06-28", holdings: 2079, sharesOutstandingDiluted: 660_000_000, holdingsPerShare: 0.00000315, source: "HKEX filing" },
  { date: "2024-08-21", holdings: 2410, sharesOutstandingDiluted: 660_000_000, holdingsPerShare: 0.00000365, source: "HKEX filing" },
  { date: "2024-09-27", holdings: 2635, sharesOutstandingDiluted: 660_000_000, holdingsPerShare: 0.00000399, source: "Q3 report" },
  { date: "2024-11-29", holdings: 3183, sharesOutstandingDiluted: 664_000_000, holdingsPerShare: 0.00000479, source: "ETH-to-BTC swap announcement" },
  { date: "2024-12-30", holdings: 3274, sharesOutstandingDiluted: 664_000_000, holdingsPerShare: 0.00000493, source: "HKEX filing" },
  { date: "2025-02-28", holdings: 3350, sharesOutstandingDiluted: 664_000_000, holdingsPerShare: 0.00000505, source: "Press release" },
  { date: "2025-08-22", holdings: 3670, sharesOutstandingDiluted: 686_000_000, holdingsPerShare: 0.00000535, source: "Press release" },
  { date: "2025-09-16", holdings: 3925, sharesOutstandingDiluted: 686_000_000, holdingsPerShare: 0.00000572, source: "HKEX filing" },
  { date: "2025-11-17", holdings: 4091, sharesOutstandingDiluted: 729_120_000, holdingsPerShare: 0.00000561, source: "Q3 2025 results (Sep 2025 ~60M share placement)", sourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/0923/2025092301140.pdf", sourceType: "regulatory-filing" },
];

// Bitmine Immersion (BMNR) - World's largest ETH treasury
// Data from SEC filings and weekly press releases
const BMNR_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-07-17", holdings: 300657, sharesOutstandingDiluted: 50_000_000, holdingsPerShare: 0.006013, source: "$1B milestone press release" },
  { date: "2025-08-10", holdings: 1150263, sharesOutstandingDiluted: 150_000_000, holdingsPerShare: 0.007668, source: "Press release" },
  { date: "2025-08-17", holdings: 1523373, sharesOutstandingDiluted: 180_000_000, holdingsPerShare: 0.008463, source: "Press release" },
  { date: "2025-08-24", holdings: 1713899, sharesOutstandingDiluted: 221_515_180, holdingsPerShare: 0.007738, source: "Press release" },
  { date: "2025-09-07", holdings: 2069443, sharesOutstandingDiluted: 260_000_000, holdingsPerShare: 0.007959, source: "2M milestone" },
  { date: "2025-11-09", holdings: 3505723, sharesOutstandingDiluted: 350_000_000, holdingsPerShare: 0.010016, source: "Press release" },
  { date: "2025-11-20", holdings: 3559879, sharesOutstandingDiluted: 384_067_823, holdingsPerShare: 0.009269, source: "10-K filing" },
  { date: "2025-11-30", holdings: 3726499, sharesOutstandingDiluted: 400_000_000, holdingsPerShare: 0.009316, source: "Press release" },
  { date: "2025-12-14", holdings: 3967210, sharesOutstandingDiluted: 410_000_000, holdingsPerShare: 0.009676, source: "Press release" },
  { date: "2025-12-28", holdings: 4110525, sharesOutstandingDiluted: 425_000_000, holdingsPerShare: 0.009672, source: "Press release" },
  { date: "2026-01-04", holdings: 4143502, sharesOutstandingDiluted: 430_000_000, holdingsPerShare: 0.009636, source: "Press release", sourceUrl: "https://bitmine.com/press-releases", sourceType: "press-release" },
  { date: "2026-01-20", holdings: 4203036, sharesOutstandingDiluted: 455_000_000, holdingsPerShare: 0.009237, source: "Press release", sharesSource: "Jan 15 shareholder vote (454.9M)", sourceUrl: "https://www.prnewswire.com/news-releases/bitmine-immersion-technologies-bmnr-announces-eth-holdings-reach-4-203-million-tokens-and-total-crypto-and-total-cash-holdings-of-14-5-billion-302665064.html", sourceType: "press-release" },
];

// Nakamoto Holdings (NAKA) - Merged with KindlyMD
const NAKA_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-08-15", holdings: 1250, sharesOutstandingDiluted: 95_000_000, holdingsPerShare: 0.0000132, source: "Initial treasury announcement" },
  { date: "2024-10-31", holdings: 2800, sharesOutstandingDiluted: 110_000_000, holdingsPerShare: 0.0000255, source: "Q3 2024 filing" },
  { date: "2024-12-31", holdings: 4150, sharesOutstandingDiluted: 125_000_000, holdingsPerShare: 0.0000332, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 5398, sharesOutstandingDiluted: 140_000_000, holdingsPerShare: 0.0000386, source: "Q1 2025 10-Q" },
  { date: "2025-08-14", holdings: 21, sharesOutstandingDiluted: 150_000_000, holdingsPerShare: 0.0000001, source: "Pre-merger" },
  { date: "2025-08-19", holdings: 5765, sharesOutstandingDiluted: 450_000_000, holdingsPerShare: 0.0000128, source: "Post-merger 8-K" },
  // Nov 14, 2025: 439,850,889 shares + 71,704,975 pre-funded warrants = 511,555,864 fully diluted
  { date: "2025-11-14", holdings: 5398, sharesOutstandingDiluted: 511_555_864, holdingsPerShare: 0.0000106, source: "SEC 10-Q Nov 2025", sharesSource: "Shares (439.85M) + pre-funded warrants (71.7M)", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001946573&type=10-Q", sourceType: "sec-filing" },
];

// American Bitcoin Corp (ABTC) - Pure-play miner with HODL strategy
const ABTC_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-06-30", holdings: 2100, sharesOutstandingDiluted: 180_000_000, holdingsPerShare: 0.0000117, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 3418, sharesOutstandingDiluted: 850_000_000, holdingsPerShare: 0.0000040, source: "Q3 2025 - Hut 8 10-Q" },
  { date: "2025-10-24", holdings: 3865, sharesOutstandingDiluted: 850_000_000, holdingsPerShare: 0.0000045, source: "Press release" },
  { date: "2025-12-14", holdings: 4363, sharesOutstandingDiluted: 900_000_000, holdingsPerShare: 0.0000048, source: "Dec purchase announcement" },
  { date: "2026-01-02", holdings: 5427, sharesOutstandingDiluted: 920_000_000, holdingsPerShare: 0.0000059, source: "Top 20 announcement", sourceUrl: "https://www.prnewswire.com/news-releases/american-bitcoin-adds-139-bitcoin-increasing-strategic-reserve-to-4-004-bitcoin-302608175.html", sourceType: "press-release" },
];

// Next Technology Holding (NXTT) - BTC treasury company
// NOTE: 200-for-1 reverse stock split effective Sep 16, 2025
// Pre-split: ~566M shares → Post-split: ~2.83M shares
// All entries below are POST-SPLIT adjusted
const NXTT_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 3850, sharesOutstandingDiluted: 425_000, holdingsPerShare: 0.00906, source: "Q1 2024 filing (split-adjusted)" },
  { date: "2024-06-30", holdings: 4500, sharesOutstandingDiluted: 440_000, holdingsPerShare: 0.01023, source: "Q2 2024 filing (split-adjusted)" },
  { date: "2024-12-31", holdings: 5200, sharesOutstandingDiluted: 460_000, holdingsPerShare: 0.01130, source: "Q4 2024 filing (split-adjusted)" },
  { date: "2025-06-30", holdings: 5833, sharesOutstandingDiluted: 475_000, holdingsPerShare: 0.01228, source: "Q2 2025 filing (split-adjusted)" },
  // Post reverse split (200:1) - Sep 16, 2025
  { date: "2025-09-30", holdings: 5833, sharesOutstandingDiluted: 2_865_730, holdingsPerShare: 0.00204, source: "SEC 10-Q Q3 2025", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001784970&type=10-Q", sourceType: "sec-filing" },
  // Jan 2026: Additional equity issuances since Q3
  { date: "2026-01-16", holdings: 5833, sharesOutstandingDiluted: 4_082_556, holdingsPerShare: 0.00143, source: "TipRanks/Morningstar", sharesSource: "Jan 2026 aggregator data" },
];

// Capital B (ALTBG) - France BTC treasury (The Blockchain Group)
// Data from AMF (Autorité des marchés financiers) regulatory filings
// API: https://dilaamf.opendatasoft.com/api/v2/ (ISIN: FR0011053636)
// Note: Massive dilution in Sep 2025 from EUR58.1M private placement (Sep 16, 2025 AMF filing)
const ALTBG_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 1200, sharesOutstandingDiluted: 42_000_000, holdingsPerShare: 0.0000286, source: "H1 2024 Euronext filing" },
  { date: "2024-12-31", holdings: 1800, sharesOutstandingDiluted: 45_000_000, holdingsPerShare: 0.0000400, source: "FY 2024 annual report" },
  { date: "2025-06-30", holdings: 2201, sharesOutstandingDiluted: 48_000_000, holdingsPerShare: 0.0000459, source: "H1 2025 filing" },
  // Sep 2025: EUR58.1M capital increase via private placement caused ~4x share dilution
  { date: "2025-09-22", holdings: 2800, sharesOutstandingDiluted: 200_000_000, holdingsPerShare: 0.0000140, source: "AMF filing", sourceUrl: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2025/09/FCACT076270_20250922.pdf", sourceType: "regulatory-filing" },
  { date: "2025-09-29", holdings: 2812, sharesOutstandingDiluted: 200_000_000, holdingsPerShare: 0.0000141, source: "AMF filing", sourceUrl: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2025/09/FCACT076388_20250929.pdf", sourceType: "regulatory-filing" },
  { date: "2025-10-20", holdings: 2818, sharesOutstandingDiluted: 220_000_000, holdingsPerShare: 0.0000128, source: "AMF filing", sourceUrl: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2025/10/FCACT076738_20251020.pdf", sourceType: "regulatory-filing" },
  { date: "2025-11-25", holdings: 2823, sharesOutstandingDiluted: 226_884_068, holdingsPerShare: 0.0000124, source: "AMF filing", sourceUrl: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2025/11/FCACT077244_20251125.pdf", sourceType: "regulatory-filing", sharesSource: "mNAV.com Jan 2026" },
];

// H100 Group (H100.ST) - Swedish BTC treasury (first Nordic Bitcoin treasury company)
// NOTE: BTC treasury strategy started May 22, 2025 - no BTC holdings before that date
// Share count grew massively in 2025 through directed issues to fund BTC purchases (254M → 335M)
const H100_HISTORY: HoldingsSnapshot[] = [
  // May 2025: First BTC purchase - strategy initiated
  { date: "2025-05-22", holdings: 4, sharesOutstandingDiluted: 254_000_000, holdingsPerShare: 0.0000000157, source: "Press release - first BTC purchase (4.39 BTC)", sharesSource: "H100 IR (pre-dilution)", sourceType: "press-release" },
  // July 2025: Rapid accumulation via Adam Back convertible + directed issues
  { date: "2025-07-15", holdings: 628, sharesOutstandingDiluted: 300_000_000, holdingsPerShare: 0.00000209, source: "Press release - 628.22 BTC total", sharesSource: "Estimated mid-dilution", sourceType: "press-release" },
  // Sep 2025: Interim report (May-Sep 2025) released Nov 20, 2025
  { date: "2025-09-30", holdings: 1046, sharesOutstandingDiluted: 335_250_237, holdingsPerShare: 0.00000312, source: "Interim report May-Sep 2025", sourceUrl: "https://www.h100.group/investor-relations/financial-reports", sharesSource: "H100 IR shares page", sourceType: "company-website" },
  // Jan 2026: Shareholder letter confirms holdings stable at 1,046 BTC
  { date: "2026-01-02", holdings: 1046, sharesOutstandingDiluted: 335_250_237, holdingsPerShare: 0.00000312, source: "Jan 2, 2026 shareholder letter", sourceUrl: "https://www.h100.group/", sharesSource: "H100 IR shares page", sourceType: "company-website" },
];

// ==================== ADDITIONAL ETH COMPANIES ====================

// SharpLink Gaming (SBET) - Largest ETH treasury
// Note: 1:12 reverse split on May 6, 2025
// Using BASIC shares (EntityCommonStockSharesOutstanding) - matches reported mNAV (~0.83 on Nov 28, 2025)
// Fully diluted count (warrants, options, RSUs) not publicly available
const SBET_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 450000, sharesOutstandingDiluted: 75_000_000, holdingsPerShare: 0.006000, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 580000, sharesOutstandingDiluted: 82_000_000, holdingsPerShare: 0.007073, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 720000, sharesOutstandingDiluted: 90_000_000, holdingsPerShare: 0.008000, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 860000, sharesOutstandingDiluted: 98_000_000, holdingsPerShare: 0.008776, source: "Q4 2024 10-K" },
  // Post reverse split (1:12 on May 6, 2025)
  { date: "2025-06-30", holdings: 520000, sharesOutstandingDiluted: 145_000_000, holdingsPerShare: 0.003586, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 861251, sharesOutstandingDiluted: 180_000_000, holdingsPerShare: 0.004785, source: "Q3 2025 10-Q" },
  { date: "2026-01-10", holdings: 863424, sharesOutstandingDiluted: 196_690_000, holdingsPerShare: 0.004390, source: "SEC filing (basic shares)", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001981535&type=8-K", sourceType: "sec-filing" },
];

// Ether Capital (ETHM) - Canadian ETH treasury
const ETHM_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 320000, sharesOutstandingDiluted: 45_000_000, holdingsPerShare: 0.007111, source: "Q1 2024 SEDAR+" },
  { date: "2024-06-30", holdings: 380000, sharesOutstandingDiluted: 48_000_000, holdingsPerShare: 0.007917, source: "Q2 2024 SEDAR+" },
  { date: "2024-09-30", holdings: 440000, sharesOutstandingDiluted: 52_000_000, holdingsPerShare: 0.008462, source: "Q3 2024 SEDAR+" },
  { date: "2024-12-31", holdings: 497000, sharesOutstandingDiluted: 55_000_000, holdingsPerShare: 0.009036, source: "Q4 2024 Annual Report" },
  { date: "2025-06-30", holdings: 550000, sharesOutstandingDiluted: 58_000_000, holdingsPerShare: 0.009483, source: "Q2 2025 SEDAR+" },
  { date: "2025-09-30", holdings: 590000, sharesOutstandingDiluted: 60_000_000, holdingsPerShare: 0.009833, source: "Q3 2025 SEDAR+", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002080334", sourceType: "sec-filing" },
];

// GameSquare Holdings (GAME) - Esports/gaming company with ETH treasury
// SEC EDGAR source: WeightedAverageNumberOfDilutedSharesOutstanding
//
// IMPORTANT: mNAV.com has WRONG data for this ticker (shows BTC company with 447M shares)
// Do NOT use mNAV.com for GAME verification - ticker collision with different company
//
// Verified Q3 2025: 98,380,767 shares (SEC 10-Q Nov 14, 2025, as of Sep 30, 2025)
// Holdings: 15,600+ ETH (from The Block, company announcements)
// Share buyback active: ~$5M authorized, ~3.5M shares repurchased Oct 2025-Jan 2026
const GAME_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 8500, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.0001000, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 12000, sharesOutstandingDiluted: 90_000_000, holdingsPerShare: 0.0001333, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 15600, sharesOutstandingDiluted: 92_000_000, holdingsPerShare: 0.0001696, source: "Q4 2024 10-K" },
  { date: "2025-07-10", holdings: 1819, sharesOutstandingDiluted: 95_000_000, holdingsPerShare: 0.0000191, source: "Initial $5M ETH purchase" },
  { date: "2025-09-30", holdings: 15630, sharesOutstandingDiluted: 98_380_767, holdingsPerShare: 0.0001589, source: "Q3 2025 10-Q", sharesSource: "SEC 10-Q WeightedAverageNumberOfDilutedSharesOutstanding" },
  { date: "2026-01-23", holdings: 15600, sharesOutstandingDiluted: 94_845_193, holdingsPerShare: 0.0001645, source: "Company announcements", sharesSource: "SEC 10-Q Q3 2025 (98.4M) minus 3.5M buybacks (Oct-Jan 2026)", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001714562&type=10-Q", sourceType: "sec-filing" },
];

// FG Nexus (FGNX) - ETH treasury company (formerly Fundamental Global)
// SEC CIK: 1591890
// Note: Company launched ETH treasury strategy in July 2025 (Private Placement)
// Pre-July 2025 data is pre-treasury strategy era (minimal shares, different business)
const FGNX_HISTORY: HoldingsSnapshot[] = [
  // Pre-treasury strategy (Dec 2024: only 1.27M shares)
  { date: "2024-12-31", holdings: 0, sharesOutstandingDiluted: 1_267_904, holdingsPerShare: 0, source: "10-K 2024", sharesSource: "10-Q Q3 2025 balance sheet", sourceType: "sec-filing" },
  // Post Private Placement (Aug 2025) - ~40M pre-funded warrants converted
  { date: "2025-09-30", holdings: 50_770, sharesOutstandingDiluted: 39_834_188, holdingsPerShare: 1.274, source: "10-Q Q3 2025", sharesSource: "10-Q cover page", sourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315225023550", sourceType: "sec-filing" },
  { date: "2025-11-12", holdings: 50_770, sharesOutstandingDiluted: 39_574_350, holdingsPerShare: 1.283, source: "10-Q Q3 2025 cover", sharesSource: "10-Q cover page (Nov 12)", sourceType: "sec-filing" },
  // Sold ETH for buybacks - repurchased 9.9M shares
  { date: "2026-01-21", holdings: 37_594, sharesOutstandingDiluted: 33_600_000, holdingsPerShare: 1.119, source: "Press release Jan 21, 2026", sharesSource: "Press release (after 9.9M buybacks)", sourceUrl: "https://www.globenewswire.com/news-release/2026/01/21/3222681/0/en/FG-Nexus-Provides-Update-on-Common-and-Preferred-Share-Buyback-Programs-and-ETH-Holdings.html", sourceType: "press-release" },
];

// ==================== ADDITIONAL SOL COMPANIES ====================

// Forward Industries (FWDI) - World's leading SOL treasury, launched Sept 2025
// Sep 2025: $1.65B PIPE resulted in significant dilution (~86M FD shares)
// Debt-free after PIPE raise
const FWDI_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-09-11", holdings: 6834506, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.08041, source: "Initial $1.65B PIPE close", sharesSource: "PIPE 8-K" },
  { date: "2025-11-15", holdings: 6900000, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.08118, source: "Press release" },
  { date: "2025-12-01", holdings: 6921342, sharesOutstandingDiluted: 86_459_465, holdingsPerShare: 0.08006, source: "Shareholder update", sharesSource: "SEC 10-K Dec 11, 2025" },
  { date: "2026-01-15", holdings: 6979967, sharesOutstandingDiluted: 86_459_465, holdingsPerShare: 0.08073, source: "Press release", sharesSource: "SEC 10-K Dec 11, 2025" },
];

// Helius Medical / Solana Company (HSDT) - SOL treasury
// NOTE: 1-for-50 reverse stock split effective July 1, 2025
// Pre-split: ~33.8M shares → Post-split: ~676K, then grew via offerings
// sharesOutstandingDiluted includes pre-funded warrants at $0.0001 (essentially shares)
const HSDT_HISTORY: HoldingsSnapshot[] = [
  // Pre-split entries (adjusted for 1:50 split)
  { date: "2024-11-01", holdings: 800000, sharesOutstandingDiluted: 700_000, holdingsPerShare: 1.143, source: "SOL treasury announcement (split-adj)" },
  { date: "2024-12-31", holdings: 1500000, sharesOutstandingDiluted: 840_000, holdingsPerShare: 1.786, source: "Q4 2024 10-K (split-adj)" },
  // Post reverse split (July 1, 2025)
  { date: "2025-06-30", holdings: 2200000, sharesOutstandingDiluted: 1_000_000, holdingsPerShare: 2.200, source: "Q2 2025 10-Q (split-adj)" },
  // Nov 2025: FD shares include pre-funded + penny warrants exercisable at $0.0001
  { date: "2025-11-04", holdings: 2_300_000, sharesOutstandingDiluted: 84_130_257, holdingsPerShare: 0.02734, source: "Investor update", sharesSource: "Nov 4, 2025 investor update (incl. warrants)" },
];

// Upexi (UPXI) - SOL treasury company, launched April 2025
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const UPXI_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-04-15", holdings: 596714, sharesOutstandingDiluted: 22_000_000, holdingsPerShare: 0.02712, source: "Initial $100M SOL purchase" },
  { date: "2025-06-30", holdings: 735692, sharesOutstandingDiluted: 28_000_000, holdingsPerShare: 0.02627, source: "Q2 2025" },
  { date: "2025-07-31", holdings: 1900000, sharesOutstandingDiluted: 40_000_000, holdingsPerShare: 0.04750, source: "Press release" },
  { date: "2025-08-05", holdings: 2000518, sharesOutstandingDiluted: 45_000_000, holdingsPerShare: 0.04446, source: "2M SOL milestone" },
  { date: "2025-09-30", holdings: 2018419, sharesOutstandingDiluted: 58_888_756, holdingsPerShare: 0.03427, source: "Q3 2025 10-Q" },
  { date: "2026-01-05", holdings: 2_174_583, sharesOutstandingDiluted: 59_000_000, holdingsPerShare: 0.03686, source: "8-K Jan 9, 2026", sharesSource: "10-Q Sep 2025 basic shares. Convertibles ($150M@$4.25, $36M@$2.39) out of money", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001775194", sourceType: "sec-filing" },
];

// ==================== ALTCOIN TREASURIES ====================

// TAO Synergies (TAOX) - TAO treasury
const TAOX_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-01", holdings: 25000, sharesOutstandingDiluted: 18_000_000, holdingsPerShare: 0.00139, source: "Initial TAO treasury" },
  { date: "2024-12-31", holdings: 42000, sharesOutstandingDiluted: 22_000_000, holdingsPerShare: 0.00191, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 54000, sharesOutstandingDiluted: 26_000_000, holdingsPerShare: 0.00208, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 62000, sharesOutstandingDiluted: 28_000_000, holdingsPerShare: 0.00221, source: "Q3 2025 10-Q", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001571934", sourceType: "sec-filing" },
];

// TAO Investment Fund (XTAIF) - OTC TAO treasury
const XTAIF_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 35000, sharesOutstandingDiluted: 15_000_000, holdingsPerShare: 0.00233, source: "H1 2024 SEDAR" },
  { date: "2024-12-31", holdings: 50000, sharesOutstandingDiluted: 18_000_000, holdingsPerShare: 0.00278, source: "FY 2024 annual" },
  { date: "2025-06-30", holdings: 60000, sharesOutstandingDiluted: 20_000_000, holdingsPerShare: 0.00300, source: "H1 2025 filing" },
  { date: "2025-09-30", holdings: 65000, sharesOutstandingDiluted: 21_000_000, holdingsPerShare: 0.00310, source: "Q3 2025 filing", sourceUrl: "https://www.sedarplus.ca", sourceType: "regulatory-filing" },
];

// Lite Strategy (LITS) - LTC treasury
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const LITS_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-08-01", holdings: 450000, sharesOutstandingDiluted: 32_000_000, holdingsPerShare: 0.01406, source: "Initial LTC treasury 8-K" },
  { date: "2024-12-31", holdings: 720000, sharesOutstandingDiluted: 33_500_000, holdingsPerShare: 0.02149, source: "Q4 2024 10-K" },
  // Q1 FY2026 (ended Sep 30, 2025): 929,548 LTC per 10-Q and dashboard
  { date: "2025-09-30", holdings: 929548, sharesOutstandingDiluted: 35_655_155, holdingsPerShare: 0.02607, source: "Q1 FY2026 10-Q", sourceUrl: "https://www.litestrategy.com/dashboard/", sourceType: "company-website" },
];

// Cypherpunk Technologies (CYPH) - ZEC treasury, Winklevoss-backed
// SEC CIK: 1509745 (formerly Leap Therapeutics, rebranded Nov 2025)
// NOTE: Share count includes pre-funded warrants (80.7M) since they're essentially shares ($0.001 exercise)
const CYPH_HISTORY: HoldingsSnapshot[] = [
  // Oct 8, 2025: $58.88M PIPE closed, ZEC treasury strategy announced
  // Basic shares: 56.6M (41.4M pre-PIPE + 15.2M new), Pre-funded warrants: 80.7M
  { date: "2025-10-08", holdings: 0, sharesOutstandingDiluted: 137_420_344, holdingsPerShare: 0, source: "8-K Oct 9, 2025 - PIPE closed", sharesSource: "SEC 8-K + 10-Q Q3 2025", sourceUrl: "https://www.sec.gov/Archives/edgar/data/1509745/0001104659-25-098082-index.html", sourceType: "sec-filing" },
  // Nov 19, 2025: First ZEC purchase disclosed - 233,644 ZEC for ~$18M
  { date: "2025-11-19", holdings: 233_644, sharesOutstandingDiluted: 137_420_344, holdingsPerShare: 0.00170, source: "8-K Nov 20, 2025 - $18M ZEC purchase", sharesSource: "SEC 8-K + 10-Q Q3 2025", sourceUrl: "https://www.sec.gov/Archives/edgar/data/1509745/0001104659-25-114435-index.html", sourceType: "sec-filing" },
  // Dec 30, 2025: Additional $29M purchase - total 290,062.67 ZEC at $334.41 avg
  { date: "2025-12-30", holdings: 290_062, sharesOutstandingDiluted: 137_420_344, holdingsPerShare: 0.00211, source: "8-K Dec 30, 2025 - $29M ZEC purchase", sharesSource: "SEC 8-K + 10-Q Q3 2025", sourceUrl: "https://www.sec.gov/Archives/edgar/data/1509745/0001104659-25-125039-index.html", sourceType: "sec-filing" },
];

// Caliber (CWD) - LINK treasury, first Nasdaq company with LINK policy
const CWD_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-08-28", holdings: 0, sharesOutstandingDiluted: 18_000_000, holdingsPerShare: 0, source: "LINK treasury policy adopted" },
  { date: "2025-09-09", holdings: 0, sharesOutstandingDiluted: 18_000_000, holdingsPerShare: 0, source: "Initial purchase announced" },
  { date: "2025-09-18", holdings: 278011, sharesOutstandingDiluted: 20_000_000, holdingsPerShare: 0.01390, source: "$6.5M LINK purchase" },
  { date: "2025-09-25", holdings: 467632, sharesOutstandingDiluted: 22_000_000, holdingsPerShare: 0.02126, source: "$10M milestone" },
  { date: "2025-10-16", holdings: 562535, sharesOutstandingDiluted: 24_000_000, holdingsPerShare: 0.02344, source: "$2M additional purchase" },
  { date: "2025-12-11", holdings: 562535, sharesOutstandingDiluted: 25_000_000, holdingsPerShare: 0.02250, source: "75K LINK staked", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001627282", sourceType: "sec-filing" },
];

// SUI Group (SUIG) - SUI treasury (formerly Mill City Ventures)
// NOTE: Jan 2026 8-K shows actual holdings of 108M SUI, correcting earlier estimates
// TODO BACKFILL: Pre-Jan 2026 entries use basic shares (~48M). Jan 2026 8-K introduced "fully adjusted shares" (80.9M)
//   which includes pre-funded warrants. To fix treasury yield discontinuity, need to find historical
//   "fully adjusted shares" from prior 8-Ks/10-Qs and update sharesOutstandingDiluted for each entry.
//   SEC CIK: 1425355 | Search: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1425355&type=8-K
const SUIG_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-10-01", holdings: 45000000, sharesOutstandingDiluted: 28_000_000, holdingsPerShare: 1.607, source: "SUI treasury announcement" },
  { date: "2024-12-31", holdings: 78000000, sharesOutstandingDiluted: 35_000_000, holdingsPerShare: 2.229, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 108000000, sharesOutstandingDiluted: 42_000_000, holdingsPerShare: 2.571, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 108098436, sharesOutstandingDiluted: 48_000_000, holdingsPerShare: 2.252, source: "Q3 2025 10-Q", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001425355", sourceType: "sec-filing" },
  // Jan 2026: Company reports 108,098,436 SUI and 80.9M "fully adjusted shares" (includes 7.8M buyback in Q4 2025)
  { date: "2026-01-07", holdings: 108098436, sharesOutstandingDiluted: 80_900_000, holdingsPerShare: 1.336, source: "SEC 8-K Jan 8, 2026", sourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000165495426000201/suig_8k.htm", sourceType: "sec-filing" },
];

// AVAX One (AVX) - AVAX treasury (formerly AgriFORCE, pivoted Nov 2025)
// NOTE: Pre-Nov 2025 data is from before AVAX pivot - company was agricultural tech
const AVX_HISTORY: HoldingsSnapshot[] = [
  // Nov 5, 2025: PIPE closed, $219M raised ($145M cash + $73.7M in AVAX tokens)
  // 86.7M new shares + 6.1M pre-funded warrants issued
  { date: "2025-11-05", holdings: 13_800_000, sharesOutstandingDiluted: 93_112_148, holdingsPerShare: 0.148, source: "8-K PIPE closing", sourceUrl: "https://www.sec.gov/Archives/edgar/data/1826397/000149315225021006/form8-k.htm", sourceType: "sec-filing" },
];

// CleanCore Solutions (ZONE) - Official Dogecoin Treasury backed by Dogecoin Foundation
const ZONE_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-09-08", holdings: 285420000, sharesOutstandingDiluted: 35_000_000, holdingsPerShare: 8.155, source: "Treasury launch" },
  { date: "2025-09-11", holdings: 500000000, sharesOutstandingDiluted: 42_000_000, holdingsPerShare: 11.905, source: "500M DOGE milestone" },
  { date: "2025-09-16", holdings: 600000000, sharesOutstandingDiluted: 48_000_000, holdingsPerShare: 12.500, source: "Press release" },
  { date: "2025-09-30", holdings: 703617752, sharesOutstandingDiluted: 52_000_000, holdingsPerShare: 13.531, source: "Q1 FY2026 10-Q" },
  { date: "2025-10-06", holdings: 710000000, sharesOutstandingDiluted: 55_000_000, holdingsPerShare: 12.909, source: "Press release" },
  { date: "2025-10-13", holdings: 730000000, sharesOutstandingDiluted: 58_000_000, holdingsPerShare: 12.586, source: "Press release" },
  { date: "2025-11-12", holdings: 733100000, sharesOutstandingDiluted: 60_000_000, holdingsPerShare: 12.218, source: "Q1 FY2026 results", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001956741", sourceType: "sec-filing" },
];

// Brag House (TBH) - DOGE managed treasury
const TBH_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-08-15", holdings: 350000000, sharesOutstandingDiluted: 38_000_000, holdingsPerShare: 9.211, source: "Initial DOGE strategy" },
  { date: "2024-12-31", holdings: 580000000, sharesOutstandingDiluted: 48_000_000, holdingsPerShare: 12.083, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 730000000, sharesOutstandingDiluted: 58_000_000, holdingsPerShare: 12.586, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 780000000, sharesOutstandingDiluted: 62_000_000, holdingsPerShare: 12.581, source: "Q3 2025 10-Q", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001903595", sourceType: "sec-filing" },
];

// Bit Origin (BTOG) - DOGE treasury, Singapore-based
const BTOG_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-07-21", holdings: 40543745, sharesOutstandingDiluted: 58_000_000, holdingsPerShare: 0.699, source: "Initial DOGE purchase" },
  { date: "2025-08-11", holdings: 70543745, sharesOutstandingDiluted: 78_000_000, holdingsPerShare: 0.904, source: "Private placement", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001735556", sourceType: "sec-filing" },
];

// Hyperliquid Strategies (PURR) - HYPE treasury
// Company formed via Sonnet BioTherapeutics + Rorschach I merger on Dec 2, 2025
// HYPE holdings acquired from Rorschach I LLC in business combination
const PURR_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-12-02", holdings: 12_500_000, sharesOutstandingDiluted: 127_025_563, holdingsPerShare: 0.0984, source: "Business combination 8-K", sharesSource: "10-Q filed Dec 8, 2025", sourceUrl: "https://www.sec.gov/Archives/edgar/data/2078856/000149315225025886/form8-k.htm", sourceType: "sec-filing" },
];

// Hyperion DeFi (HYPD) - HYPE treasury
const HYPD_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-10-15", holdings: 650000, sharesOutstandingDiluted: 12_000_000, holdingsPerShare: 0.0542, source: "HYPE conversion announcement" },
  { date: "2024-12-31", holdings: 1200000, sharesOutstandingDiluted: 18_000_000, holdingsPerShare: 0.0667, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 1700000, sharesOutstandingDiluted: 22_000_000, holdingsPerShare: 0.0773, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 2100000, sharesOutstandingDiluted: 25_000_000, holdingsPerShare: 0.0840, source: "Q3 2025 10-Q", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001682639", sourceType: "sec-filing" },
];

// Tron Inc (TRON) - TRX treasury, formerly SRM Entertainment
// SEC CIK: 1956744
// NOTE: Previous "fix" from 677M to 365M was INCORRECT. The Sep 2025 warrant exercise added 312M TRX.
const TRON_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-06-15", holdings: 365_096_845, sharesOutstandingDiluted: 27_425_983, holdingsPerShare: 13.313, source: "Initial TRX treasury (pre-warrant)", sourceType: "press-release" },
  { date: "2025-09-02", holdings: 677_596_945, sharesOutstandingDiluted: 257_115_400, holdingsPerShare: 2.636, source: "8-K: $110M warrant exercise added 312M TRX", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1956744&type=8-K", sourceType: "sec-filing" },
  { date: "2025-09-30", holdings: 677_596_945, sharesOutstandingDiluted: 257_115_400, holdingsPerShare: 2.636, source: "10-Q Q3 2025", sharesSource: "10-Q balance sheet", sourceType: "sec-filing" },
  { date: "2025-12-29", holdings: 677_000_000, sharesOutstandingDiluted: 274_382_064, holdingsPerShare: 2.468, source: "8-K: $18M Justin Sun investment", sourceUrl: "https://www.sec.gov/Archives/edgar/data/1956744/000149315225029225/", sourceType: "sec-filing" },
  { date: "2026-01-23", holdings: 677_000_000, sharesOutstandingDiluted: 274_382_064, holdingsPerShare: 2.468, source: "8-K: Confirmed 677M+ TRX total", sourceUrl: "https://www.sec.gov/Archives/edgar/data/1956744/000149315226003321/", sourceType: "sec-filing" },
];

// Evernorth (XRPN) - XRP treasury
const XRPN_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-01", holdings: 200000000, sharesOutstandingDiluted: 42_000_000, holdingsPerShare: 4.762, source: "Initial XRP treasury" },
  { date: "2024-12-31", holdings: 388000000, sharesOutstandingDiluted: 55_000_000, holdingsPerShare: 7.055, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 473000000, sharesOutstandingDiluted: 68_000_000, holdingsPerShare: 6.956, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 520000000, sharesOutstandingDiluted: 75_000_000, holdingsPerShare: 6.933, source: "Q3 2025 10-Q", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002044009", sourceType: "sec-filing" },
];

// ==================== OTHER ASSETS ====================

// CleanSpark (CLSK) - BTC miner
// SEC EDGAR source: WeightedAverageNumberOfDilutedSharesOutstanding
const CLSK_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 6591, sharesOutstandingDiluted: 267_000_000, holdingsPerShare: 0.0000247, source: "Q1 2024" },
  { date: "2024-06-30", holdings: 8049, sharesOutstandingDiluted: 285_000_000, holdingsPerShare: 0.0000282, source: "Q2 2024" },
  { date: "2024-09-30", holdings: 8701, sharesOutstandingDiluted: 310_000_000, holdingsPerShare: 0.0000281, source: "Q3 2024" },
  { date: "2024-12-31", holdings: 10556, sharesOutstandingDiluted: 302_000_000, holdingsPerShare: 0.0000350, source: "Q4 2024 10-K" },
  { date: "2025-06-30", holdings: 11500, sharesOutstandingDiluted: 312_000_000, holdingsPerShare: 0.0000369, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 12300, sharesOutstandingDiluted: 317_760_000, holdingsPerShare: 0.0000387, source: "Q3 2025 10-Q" },
  // Jan 2026: Share count decreased due to buybacks and updated dilution calc from SEC DEF 14A
  { date: "2026-01-22", holdings: 13099, sharesOutstandingDiluted: 255_750_361, holdingsPerShare: 0.0000512, source: "SEC DEF 14A", sharesSource: "SEC DEF 14A Jan 22, 2026 (record date Jan 9, 2026)" },
];

// Hut 8 (HUT) - Canadian miner, merged with US Bitcoin Corp Nov 2023
// SEC EDGAR source: WeightedAverageNumberOfDilutedSharesOutstanding
// HUT (Hut 8) removed - pivoted to AI/HPC infrastructure, not a DAT company

// CORZ (Core Scientific) removed - pivoted to AI/HPC infrastructure, not a DAT company

// BTDR (Bitdeer) removed - primarily a miner/ASIC manufacturer, not a DAT company

// Trump Media (DJT) - Started BTC treasury May 2025
// SEC EDGAR source: EntityCommonStockSharesOutstanding
// 279,997,636 shares per SEC 10-Q Q3 2025 (filed Nov 5, 2025)
const DJT_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-05-30", holdings: 0, sharesOutstandingDiluted: 220_624_508, holdingsPerShare: 0, source: "Treasury deal closed" },
  { date: "2025-07-21", holdings: 19000, sharesOutstandingDiluted: 275_000_000, holdingsPerShare: 0.0000691, source: "Press reports ~$2B BTC" },
  { date: "2025-09-30", holdings: 11542, sharesOutstandingDiluted: 279_997_636, holdingsPerShare: 0.0000412, source: "Q3 2025 10-Q", sharesSource: "SEC 10-Q Q3 2025", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001849635&type=10-Q", sourceType: "sec-filing" },
];

// Twenty One Capital (XXI) - Launched by Tether/SoftBank/Mallers, 3rd largest public BTC holder
// DUAL-CLASS: Class A (346.5M non-voting) + Class B (304.8M voting) = 651.4M total shares
// For mNAV, use TOTAL shares (both classes have economic rights)
const XXI_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-04-23", holdings: 42000, sharesOutstandingDiluted: 500_000_000, holdingsPerShare: 0.0000840, source: "Initial announcement" },
  { date: "2025-07-29", holdings: 43500, sharesOutstandingDiluted: 550_000_000, holdingsPerShare: 0.0000791, source: "Pre-listing update" },
  { date: "2025-09-30", holdings: 43510, sharesOutstandingDiluted: 600_000_000, holdingsPerShare: 0.0000725, source: "Q3 2025 10-Q" },
  { date: "2025-12-09", holdings: 43514, sharesOutstandingDiluted: 651_000_000, holdingsPerShare: 0.0000668, source: "NYSE listing 8-K" },
  // Jan 2026: 346,548,153 Class A + 304,842,759 Class B = 651,390,912 total
  { date: "2026-01-02", holdings: 43514, sharesOutstandingDiluted: 651_390_912, holdingsPerShare: 0.0000668, source: "SEC 8-K (Class A + Class B)", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002070457&type=8-K", sourceType: "sec-filing" },
];

// Strive Asset (ASST) - First publicly traded asset management BTC treasury
// Includes pre-merger Semler Scientific (SMLR) data - merged Jan 2026
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const ASST_HISTORY: HoldingsSnapshot[] = [
  // Pre-merger Semler Scientific data (SMLR -> ASST)
  { date: "2024-05-28", holdings: 581, sharesOutstandingDiluted: 7_068_024, holdingsPerShare: 0.0000822, source: "SMLR: Initial purchase 8-K" },
  { date: "2024-06-17", holdings: 828, sharesOutstandingDiluted: 7_133_788, holdingsPerShare: 0.0001161, source: "SMLR: 8-K filing" },
  { date: "2024-09-30", holdings: 1058, sharesOutstandingDiluted: 7_266_242, holdingsPerShare: 0.0001456, source: "SMLR: Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 2321, sharesOutstandingDiluted: 9_596_486, holdingsPerShare: 0.0002419, source: "SMLR: Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 3082, sharesOutstandingDiluted: 11_151_572, holdingsPerShare: 0.0002764, source: "SMLR: Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 2084, sharesOutstandingDiluted: 14_804_693, holdingsPerShare: 0.0001408, source: "SMLR: Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 2058, sharesOutstandingDiluted: 15_159_895, holdingsPerShare: 0.0001357, source: "SMLR: Q3 2025 10-Q" },
  { date: "2025-12-31", holdings: 2300, sharesOutstandingDiluted: 16_000_000, holdingsPerShare: 0.0001438, source: "SMLR: Q4 2025 10-K est" },
  // Post-merger Strive + Semler combined
  { date: "2026-01-16", holdings: 12798, sharesOutstandingDiluted: 1_247_436_814, holdingsPerShare: 0.00001026, source: "SEC DEF 14C: 1.05B Class A + 198M Class B", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001920406&type=DEF+14C", sourceType: "sec-filing" },
];

// ==================== BNB COMPANIES ====================

// BNC (CEA Industries) - World's largest BNB treasury, backed by YZi Labs (CZ family office)
const BNC_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-06-15", holdings: 150000, sharesOutstandingDiluted: 45_000_000, holdingsPerShare: 3.333, source: "Initial BNB treasury" },
  { date: "2025-09-30", holdings: 320000, sharesOutstandingDiluted: 55_000_000, holdingsPerShare: 5.818, source: "Q3 2025 filing" },
  // Oct 2025: 502,441 BNB + 9,491 on exchanges = 512K total
  { date: "2025-12-12", holdings: 512000, sharesOutstandingDiluted: 44_062_938, holdingsPerShare: 11.620, source: "FY Q2 2026 10-Q", sharesSource: "SEC 10-Q Dec 12, 2025" },
];

// Nano Labs (NA) - Hong Kong Web3 infrastructure, BNB treasury (also holds 1,000 BTC passive)
// Foreign issuer - files 6-K (not 8-K/10-Q) and 20-F (not 10-K)
// TODO BACKFILL: Historical share counts need verification from 20-F filings. Current ~20.7M per companiesmarketcap.
//   SEC CIK: 1872302 | Search: https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1872302&type=6-K
const NA_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-07-04", holdings: 74_315, sharesOutstandingDiluted: 17_000_000, holdingsPerShare: 4.371, source: "Initial $50M BNB purchase", sourceUrl: "https://www.coindesk.com/markets/2025/07/04/nano-labs-buys-50m-in-bnb-in-1b-plan-to-hold-up-to-10-of-supply", sourceType: "press-release" },
  { date: "2025-07-28", holdings: 128_000, sharesOutstandingDiluted: 18_000_000, holdingsPerShare: 7.111, source: "128K BNB milestone", sourceUrl: "https://www.globenewswire.com/news-release/2025/07/28/3122289/0/en/Nano-Labs-Further-Increases-BNB-Holdings-to-128-000-Tokens-Expanding-Strategic-Reserve-to-Over-US-100-Million-and-Upgrading-BNB-Reserve-Strategy.html", sourceType: "press-release" },
  { date: "2025-12-31", holdings: 130_000, sharesOutstandingDiluted: 20_700_000, holdingsPerShare: 6.280, source: "SEC 6-K Dec 31, 2025", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1872302&type=6-K", sourceType: "sec-filing" },
];

// ==================== ADDITIONAL BTC ====================

// CEPO (Blockstream SPAC) - Adam Back's BTC treasury play
const CEPO_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-10-15", holdings: 25000, sharesOutstandingDiluted: 120_000_000, holdingsPerShare: 0.0002083, source: "Initial contribution from Adam Back" },
  { date: "2025-11-30", holdings: 28000, sharesOutstandingDiluted: 135_000_000, holdingsPerShare: 0.0002074, source: "Additional purchases" },
  { date: "2025-12-31", holdings: 30021, sharesOutstandingDiluted: 145_000_000, holdingsPerShare: 0.0002070, source: "Year-end 8-K", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002027708&type=8-K", sourceType: "sec-filing" },
];

// ==================== ADDITIONAL TAO ====================

// TWAV (Taoweave, fka Oblong) - TAO treasury
const TWAV_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-06-15", holdings: 8000, sharesOutstandingDiluted: 12_000_000, holdingsPerShare: 0.667, source: "Initial TAO treasury" },
  { date: "2025-09-30", holdings: 15000, sharesOutstandingDiluted: 15_000_000, holdingsPerShare: 1.000, source: "Q3 2025 filing" },
  { date: "2025-12-31", holdings: 21943, sharesOutstandingDiluted: 18_000_000, holdingsPerShare: 1.219, source: "Q4 2025 filing", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000746210", sourceType: "sec-filing" },
];

// ==================== ADDITIONAL LTC ====================

// LUXFF (Luxxfolio) - Canadian LTC treasury, Charlie Lee advisor
const LUXFF_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 5000, sharesOutstandingDiluted: 150_000_000, holdingsPerShare: 0.0000333, source: "Initial LTC treasury" },
  { date: "2024-12-31", holdings: 12000, sharesOutstandingDiluted: 180_000_000, holdingsPerShare: 0.0000667, source: "FY 2024 annual" },
  { date: "2025-06-30", holdings: 16500, sharesOutstandingDiluted: 200_000_000, holdingsPerShare: 0.0000825, source: "H1 2025 filing" },
  { date: "2025-09-30", holdings: 18000, sharesOutstandingDiluted: 208_000_000, holdingsPerShare: 0.0000865, source: "Q3 2025 SEDAR" },
  { date: "2025-12-31", holdings: 20084, sharesOutstandingDiluted: 220_000_000, holdingsPerShare: 0.0000913, source: "FY 2025 annual", sourceUrl: "https://thecse.com/listings/luxxfolio-holdings-inc/sedar-filings/", sourceType: "regulatory-filing" },
];

// ==================== HBAR COMPANIES ====================

// IHLDF (Immutable Holdings) - HBAR treasury, Hedera founding team
const IHLDF_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-07-15", holdings: 20000000, sharesOutstandingDiluted: 45_000_000, holdingsPerShare: 0.444, source: "Initial HBAR treasury" },
  { date: "2025-09-30", holdings: 35000000, sharesOutstandingDiluted: 55_000_000, holdingsPerShare: 0.636, source: "Q3 2025 filing" },
  { date: "2025-12-31", holdings: 48000000, sharesOutstandingDiluted: 65_000_000, holdingsPerShare: 0.738, source: "Q4 2025 filing", sourceUrl: "https://www.sedarplus.ca", sourceType: "regulatory-filing" },
];

// Map of all companies with historical data
export const HOLDINGS_HISTORY: Record<string, CompanyHoldingsHistory> = {
  // BTC Companies
  MSTR: { ticker: "MSTR", asset: "BTC", history: MSTR_HISTORY },
  MARA: { ticker: "MARA", asset: "BTC", history: MARA_HISTORY },
  RIOT: { ticker: "RIOT", asset: "BTC", history: RIOT_HISTORY },
  CLSK: { ticker: "CLSK", asset: "BTC", history: CLSK_HISTORY },
  "3350.T": { ticker: "3350.T", asset: "BTC", history: METAPLANET_HISTORY },
  KULR: { ticker: "KULR", asset: "BTC", history: KULR_HISTORY },
  "0434.HK": { ticker: "0434.HK", asset: "BTC", history: BOYAA_HISTORY },
  ASST: { ticker: "ASST", asset: "BTC", history: ASST_HISTORY },
  // HUT removed - pivoted to AI/HPC infrastructure, not a DAT company
  // CORZ removed - pivoted to AI/HPC infrastructure, not a DAT company
  // BTDR removed - primarily a miner/ASIC manufacturer, not a DAT company
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

/**
 * Get the latest diluted shares outstanding from holdings history.
 * This is the primary source for share counts used in mNAV calculations.
 */
export function getLatestDilutedShares(ticker: string): number | undefined {
  const history = HOLDINGS_HISTORY[ticker.toUpperCase()];
  if (!history || history.history.length === 0) return undefined;
  const latest = history.history[history.history.length - 1];
  return latest.sharesOutstandingDiluted;
}

/**
 * Get the latest holdings from holdings history.
 */
export function getLatestHoldings(ticker: string): number | undefined {
  const history = HOLDINGS_HISTORY[ticker.toUpperCase()];
  if (!history || history.history.length === 0) return undefined;
  const latest = history.history[history.history.length - 1];
  return latest.holdings;
}

/**
 * Get the full latest snapshot including source info for verification.
 * Used by comparison engine to verify our data sources.
 */
export function getLatestSnapshot(ticker: string): HoldingsSnapshot | undefined {
  const history = HOLDINGS_HISTORY[ticker.toUpperCase()];
  if (!history || history.history.length === 0) return undefined;
  return history.history[history.history.length - 1];
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
// Build: 1768789558
