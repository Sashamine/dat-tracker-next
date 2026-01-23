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
  { date: "2025-09-30", holdings: 52850, sharesOutstandingDiluted: 470_126_290, holdingsPerShare: 0.0001124, source: "Q3 2025 10-Q", sharesSource: "SEC WeightedAverageNumberOfDilutedSharesOutstanding" },
  // ESTIMATE: 470M (Q3 diluted) + ~25M (ATM issuance for 4,650 BTC at ~$95K BTC / ~$18 stock)
  // Confidence: MEDIUM | Range: 470M-500M | Audit: 2026-01-22-MARA.md
  { date: "2026-01-10", holdings: 57500, sharesOutstandingDiluted: 495_000_000, holdingsPerShare: 0.0001162, source: "8-K filing", sharesSource: "ESTIMATE: SEC Q3 diluted + ATM", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001507605&type=8-K", sourceType: "sec-filing", methodology: "SEC Q3 diluted (470M) + ~25M ATM issuance for 4,650 BTC at ~$95K BTC / ~$18 stock", confidence: "medium", confidenceRange: { floor: 470_000_000, ceiling: 510_000_000 } },
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
// - Issued (common): 1,140,974,340 (1.14B) - tradeable shares
// - Fully Diluted:   1,434,392,925 (1.43B) - includes convertible preferred
// - Difference:      ~294M from preferred stock (Class B "MERCURY" etc.)
//
// PREFERRED STOCK:
// - Class B "MERCURY" (Dec 2025): 23.61M shares, ¥1,000 conversion price
// - Currently underwater (stock ¥510 vs conversion ¥1,000)
// - Total preferred: ¥86.58B per mNAV.com
//
// For mNAV calculation, we use Fully Diluted (1.43B) because:
// - Preferred shareholders have economic claim on BTC value
// - Conservative approach assumes worst-case dilution
// - Consistent with mNAV.com methodology
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
  // Fully Diluted from mNAV.com (issued=1.14B + ~294M convertible preferred)
  // Confidence: MEDIUM | Issued: 1.14B | FD: 1.43B | Audit: 2026-01-22
  { date: "2026-01-22", holdings: 35102, sharesOutstandingDiluted: 1_434_392_925, holdingsPerShare: 0.00002447, source: "Press release", sharesSource: "mNAV.com fullyDilutedShares (includes preferred)", sourceUrl: "https://metaplanet.jp/bitcoin", sourceType: "company-website" },
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
const BTCS_HISTORY: HoldingsSnapshot[] = [
  { date: "2022-12-31", holdings: 530, sharesOutstandingDiluted: 14_500_000, holdingsPerShare: 0.0000366, source: "2022 10-K" },
  { date: "2023-06-30", holdings: 785, sharesOutstandingDiluted: 14_800_000, holdingsPerShare: 0.0000530, source: "Q2 2023 10-Q" },
  { date: "2023-12-31", holdings: 1090, sharesOutstandingDiluted: 15_500_000, holdingsPerShare: 0.0000703, source: "2023 10-K" },
  { date: "2024-06-30", holdings: 1350, sharesOutstandingDiluted: 16_174_923, holdingsPerShare: 0.0000835, source: "Q2 2024 10-Q" },
  { date: "2024-12-31", holdings: 1580, sharesOutstandingDiluted: 20_087_981, holdingsPerShare: 0.0000787, source: "Q4 2024 10-K" },
  { date: "2025-06-30", holdings: 1820, sharesOutstandingDiluted: 48_052_778, holdingsPerShare: 0.0000379, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 1950, sharesOutstandingDiluted: 46_838_532, holdingsPerShare: 0.0000416, source: "Q3 2025 10-Q" },
  { date: "2025-12-31", holdings: 2100, sharesOutstandingDiluted: 48_000_000, holdingsPerShare: 0.0000438, source: "Q4 2025 10-K est" },
  { date: "2026-01-10", holdings: 2200, sharesOutstandingDiluted: 49_000_000, holdingsPerShare: 0.0000449, source: "8-K filing", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229&type=8-K", sourceType: "sec-filing" },
];

// Bit Digital - ETH miner and holder
// SEC EDGAR source: EntityCommonStockSharesOutstanding
// Corrected to 324M FD shares per Q3 2025 10-Q (was overstated)
const BTBT_HISTORY: HoldingsSnapshot[] = [
  { date: "2023-12-31", holdings: 17245, sharesOutstandingDiluted: 165_000_000, holdingsPerShare: 0.000105, source: "2023 10-K" },
  { date: "2024-06-30", holdings: 22890, sharesOutstandingDiluted: 175_000_000, holdingsPerShare: 0.000131, source: "Q2 2024 10-Q" },
  { date: "2024-12-31", holdings: 27350, sharesOutstandingDiluted: 182_435_019, holdingsPerShare: 0.000150, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 30000, sharesOutstandingDiluted: 207_780_871, holdingsPerShare: 0.000144, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 32000, sharesOutstandingDiluted: 315_000_000, holdingsPerShare: 0.000102, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 35500, sharesOutstandingDiluted: 324_000_000, holdingsPerShare: 0.000110, source: "Q3 2025 10-Q", sharesSource: "SEC 10-Q diluted" },
  { date: "2025-12-31", holdings: 38000, sharesOutstandingDiluted: 324_000_000, holdingsPerShare: 0.000117, source: "Q4 2025 10-K est" },
  { date: "2026-01-12", holdings: 39500, sharesOutstandingDiluted: 324_000_000, holdingsPerShare: 0.000122, source: "8-K filing", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001710350&type=8-K", sourceType: "sec-filing" },
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
// Corrected to 45.67M FD shares per Q3 2025 10-Q (post-split adjusted)
const KULR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-12-26", holdings: 217.18, sharesOutstandingDiluted: 214_227_808, holdingsPerShare: 0.00000101, source: "Initial BTC purchase 8-K" },
  { date: "2025-01-06", holdings: 430.6, sharesOutstandingDiluted: 240_000_000, holdingsPerShare: 0.00000179, source: "8-K filing" },
  { date: "2025-01-21", holdings: 510, sharesOutstandingDiluted: 260_000_000, holdingsPerShare: 0.00000196, source: "Press release" },
  { date: "2025-02-11", holdings: 610.3, sharesOutstandingDiluted: 280_000_000, holdingsPerShare: 0.00000218, source: "Press release" },
  { date: "2025-03-25", holdings: 668.3, sharesOutstandingDiluted: 284_389_637, holdingsPerShare: 0.00000235, source: "Press release" },
  { date: "2025-05-20", holdings: 800.3, sharesOutstandingDiluted: 298_466_335, holdingsPerShare: 0.00000268, source: "Press release" },
  // Post reverse split (1-for-8) - SEC shows split-adjusted shares
  { date: "2025-06-23", holdings: 920, sharesOutstandingDiluted: 41_108_543, holdingsPerShare: 0.0000224, source: "Press release + reverse split" },
  { date: "2025-07-10", holdings: 1021, sharesOutstandingDiluted: 42_500_000, holdingsPerShare: 0.0000240, source: "Press release" },
  { date: "2025-09-30", holdings: 1200, sharesOutstandingDiluted: 45_674_420, holdingsPerShare: 0.0000263, source: "Q3 2025 10-Q", sharesSource: "SEC 10-Q diluted" },
  { date: "2025-12-31", holdings: 1450, sharesOutstandingDiluted: 45_674_420, holdingsPerShare: 0.0000317, source: "Q4 2025 10-K est" },
  { date: "2026-01-13", holdings: 1550, sharesOutstandingDiluted: 45_674_420, holdingsPerShare: 0.0000339, source: "8-K filing", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001662684&type=8-K", sourceType: "sec-filing" },
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
  { date: "2025-11-17", holdings: 4091, sharesOutstandingDiluted: 686_000_000, holdingsPerShare: 0.00000596, source: "Q3 2025 report" },
  { date: "2025-12-31", holdings: 4350, sharesOutstandingDiluted: 695_000_000, holdingsPerShare: 0.00000626, source: "Q4 2025 report" },
  { date: "2026-01-10", holdings: 4500, sharesOutstandingDiluted: 700_000_000, holdingsPerShare: 0.00000643, source: "HKEX filing", sourceUrl: "https://www.hkexnews.hk/listedco/listconews/sehk/search/search_active_main.xhtml?stockcode=00434", sourceType: "regulatory-filing" },
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
];

// Nakamoto Holdings (NAKA) - Merged with KindlyMD
const NAKA_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-08-15", holdings: 1250, sharesOutstandingDiluted: 95_000_000, holdingsPerShare: 0.0000132, source: "Initial treasury announcement" },
  { date: "2024-10-31", holdings: 2800, sharesOutstandingDiluted: 110_000_000, holdingsPerShare: 0.0000255, source: "Q3 2024 filing" },
  { date: "2024-12-31", holdings: 4150, sharesOutstandingDiluted: 125_000_000, holdingsPerShare: 0.0000332, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 5398, sharesOutstandingDiluted: 140_000_000, holdingsPerShare: 0.0000386, source: "Q1 2025 10-Q" },
  { date: "2025-08-14", holdings: 21, sharesOutstandingDiluted: 150_000_000, holdingsPerShare: 0.0000001, source: "Pre-merger" },
  { date: "2025-08-19", holdings: 5765, sharesOutstandingDiluted: 450_000_000, holdingsPerShare: 0.0000128, source: "Post-merger 8-K" },
  { date: "2025-11-12", holdings: 5398, sharesOutstandingDiluted: 500_000_000, holdingsPerShare: 0.0000108, source: "Q3 2025 10-Q", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001946573&type=10-Q", sourceType: "sec-filing" },
];

// American Bitcoin Corp (ABTC) - Hut 8 subsidiary, formerly tied to Eric Trump's American Data Centers
const ABTC_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 2100, sharesOutstandingDiluted: 180_000_000, holdingsPerShare: 0.0000117, source: "Q2 2024 filing" },
  { date: "2024-09-30", holdings: 3200, sharesOutstandingDiluted: 195_000_000, holdingsPerShare: 0.0000164, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 4300, sharesOutstandingDiluted: 210_000_000, holdingsPerShare: 0.0000205, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 5098, sharesOutstandingDiluted: 225_000_000, holdingsPerShare: 0.0000227, source: "Q1 2025 10-Q" },
  { date: "2025-10-24", holdings: 3865, sharesOutstandingDiluted: 850_000_000, holdingsPerShare: 0.0000045, source: "Press release" },
  { date: "2025-12-14", holdings: 5098, sharesOutstandingDiluted: 920_000_000, holdingsPerShare: 0.0000055, source: "Top 20 announcement", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001755953&type=8-K", sourceType: "sec-filing" },
];

// Nexon BTC Treasury (NXTT) - Gaming company BTC reserve
const NXTT_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 3850, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.0000453, source: "Q1 2024 filing" },
  { date: "2024-06-30", holdings: 4500, sharesOutstandingDiluted: 88_000_000, holdingsPerShare: 0.0000511, source: "Q2 2024 filing" },
  { date: "2024-12-31", holdings: 5200, sharesOutstandingDiluted: 92_000_000, holdingsPerShare: 0.0000565, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 5833, sharesOutstandingDiluted: 95_000_000, holdingsPerShare: 0.0000614, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 5833, sharesOutstandingDiluted: 98_000_000, holdingsPerShare: 0.0000595, source: "No new purchases since Mar 2025", sourceUrl: "https://bitbo.io/treasuries/next-technology-holdings/", sourceType: "aggregator" },
];

// Alt Brussels (ALTBG) - Belgium/France BTC treasury
const ALTBG_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 1200, sharesOutstandingDiluted: 42_000_000, holdingsPerShare: 0.0000286, source: "H1 2024 Euronext filing" },
  { date: "2024-12-31", holdings: 1800, sharesOutstandingDiluted: 45_000_000, holdingsPerShare: 0.0000400, source: "FY 2024 annual report" },
  { date: "2025-06-30", holdings: 2201, sharesOutstandingDiluted: 48_000_000, holdingsPerShare: 0.0000459, source: "H1 2025 filing" },
  { date: "2025-09-30", holdings: 2400, sharesOutstandingDiluted: 50_000_000, holdingsPerShare: 0.0000480, source: "Q3 2025 Euronext", sourceUrl: "https://live.euronext.com/en/product/equities/FR0011053636-ALXP", sourceType: "regulatory-filing" },
];

// H100 Group (H100.ST) - Swedish BTC treasury
const H100_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-30", holdings: 520, sharesOutstandingDiluted: 25_000_000, holdingsPerShare: 0.0000208, source: "Q3 2024 Finansinspektionen" },
  { date: "2024-12-31", holdings: 780, sharesOutstandingDiluted: 28_000_000, holdingsPerShare: 0.0000279, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 1046, sharesOutstandingDiluted: 32_000_000, holdingsPerShare: 0.0000327, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 1200, sharesOutstandingDiluted: 35_000_000, holdingsPerShare: 0.0000343, source: "Q3 2025 Finansinspektionen", sourceUrl: "https://www.h100.group/investor-relations/shares", sourceType: "company-website" },
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
// Verified Q3 2025: 98,380,767 shares (SEC 10-Q, record date Sep 5, 2025)
// Holdings: 15,600+ ETH (from The Block, company announcements)
// Share buyback active: ~$5M authorized, reduces share count over time
const GAME_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 8500, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.0001000, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 12000, sharesOutstandingDiluted: 90_000_000, holdingsPerShare: 0.0001333, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 15600, sharesOutstandingDiluted: 92_000_000, holdingsPerShare: 0.0001696, source: "Q4 2024 10-K" },
  { date: "2025-07-10", holdings: 1819, sharesOutstandingDiluted: 95_000_000, holdingsPerShare: 0.0000191, source: "Initial $5M ETH purchase" },
  { date: "2025-09-30", holdings: 15630, sharesOutstandingDiluted: 98_380_767, holdingsPerShare: 0.0001589, source: "Q3 2025 10-Q", sharesSource: "SEC 10-Q WeightedAverageNumberOfDilutedSharesOutstanding" },
  { date: "2026-01-15", holdings: 15600, sharesOutstandingDiluted: 98_380_767, holdingsPerShare: 0.0001586, source: "The Block", sharesSource: "SEC 10-Q Q3 2025 (latest)", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001714562&type=8-K", sourceType: "aggregator" },
];

// FG Nexus (FGNX) - ETH treasury company (formerly Forgenix/Fundamental Global)
// FG Nexus (FGNX) - ETH treasury company
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const FGNX_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-06-30", holdings: 22000, sharesOutstandingDiluted: 65_000_000, holdingsPerShare: 0.000338, source: "Q2 2024 filing" },
  { date: "2024-09-30", holdings: 32000, sharesOutstandingDiluted: 72_000_000, holdingsPerShare: 0.000444, source: "Q3 2024 filing" },
  { date: "2024-12-31", holdings: 40000, sharesOutstandingDiluted: 80_000_000, holdingsPerShare: 0.000500, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 45000, sharesOutstandingDiluted: 83_000_000, holdingsPerShare: 0.000542, source: "Q2 2025 10-Q" },
  { date: "2025-09-28", holdings: 50770, sharesOutstandingDiluted: 88_000_000, holdingsPerShare: 0.000577, source: "Q3 2025 10-Q" },
  { date: "2025-12-17", holdings: 40088, sharesOutstandingDiluted: 90_000_000, holdingsPerShare: 0.000445, source: "Buyback update" },
  { date: "2026-01-15", holdings: 48442, sharesOutstandingDiluted: 92_000_000, holdingsPerShare: 0.000527, source: "The Block", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001591890&type=8-K", sourceType: "aggregator" },
];

// ==================== ADDITIONAL SOL COMPANIES ====================

// Forward Industries (FWDI) - World's leading SOL treasury, launched Sept 2025
// Sep 2025: $1.65B PIPE resulted in significant dilution (85M FD shares)
const FWDI_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-09-11", holdings: 6834506, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.08041, source: "Initial $1.65B PIPE close", sharesSource: "PIPE 8-K" },
  { date: "2025-11-15", holdings: 6900000, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.08118, source: "Press release" },
  { date: "2025-12-01", holdings: 6921342, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.08143, source: "Shareholder update" },
  { date: "2026-01-15", holdings: 6980000, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.08212, source: "Press release", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000038264&type=8-K", sourceType: "press-release" },
];

// Heliogen Solar (HSDT) - SOL treasury, formerly Solana Company
const HSDT_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-11-01", holdings: 800000, sharesOutstandingDiluted: 35_000_000, holdingsPerShare: 0.0229, source: "SOL treasury announcement" },
  { date: "2024-12-31", holdings: 1500000, sharesOutstandingDiluted: 42_000_000, holdingsPerShare: 0.0357, source: "Q4 2024 10-K" },
  { date: "2025-06-30", holdings: 2200000, sharesOutstandingDiluted: 50_000_000, holdingsPerShare: 0.0440, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 2800000, sharesOutstandingDiluted: 58_000_000, holdingsPerShare: 0.0483, source: "Q3 2025 10-Q", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001610853&type=10-Q", sourceType: "sec-filing" },
];

// Upexi (UPXI) - SOL treasury company, launched April 2025
// SEC EDGAR source: EntityCommonStockSharesOutstanding
const UPXI_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-04-15", holdings: 596714, sharesOutstandingDiluted: 22_000_000, holdingsPerShare: 0.02712, source: "Initial $100M SOL purchase" },
  { date: "2025-06-30", holdings: 735692, sharesOutstandingDiluted: 28_000_000, holdingsPerShare: 0.02627, source: "Q2 2025" },
  { date: "2025-07-31", holdings: 1900000, sharesOutstandingDiluted: 40_000_000, holdingsPerShare: 0.04750, source: "Press release" },
  { date: "2025-08-05", holdings: 2000518, sharesOutstandingDiluted: 45_000_000, holdingsPerShare: 0.04446, source: "2M SOL milestone" },
  { date: "2025-09-30", holdings: 2018419, sharesOutstandingDiluted: 58_888_756, holdingsPerShare: 0.03427, source: "Q3 2025 10-K" },
  { date: "2025-12-31", holdings: 2106000, sharesOutstandingDiluted: 62_000_000, holdingsPerShare: 0.03397, source: "Q4 2025 est", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001775194", sourceType: "sec-filing" },
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
  { date: "2025-06-30", holdings: 929000, sharesOutstandingDiluted: 34_800_000, holdingsPerShare: 0.02670, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 1050000, sharesOutstandingDiluted: 35_655_155, holdingsPerShare: 0.02945, source: "Q3 2025 10-K", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001262104", sourceType: "sec-filing" },
];

// Cypherpunk Holdings (CYPH) - ZEC treasury, Winklevoss-backed (Canadian, SEDAR filings)
const CYPH_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-03-31", holdings: 180000, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.00212, source: "Q1 2024 SEDAR" },
  { date: "2024-09-30", holdings: 235000, sharesOutstandingDiluted: 92_000_000, holdingsPerShare: 0.00255, source: "Q3 2024 SEDAR" },
  { date: "2024-12-31", holdings: 290000, sharesOutstandingDiluted: 98_000_000, holdingsPerShare: 0.00296, source: "FY 2024 annual" },
  { date: "2025-06-30", holdings: 220000, sharesOutstandingDiluted: 102_000_000, holdingsPerShare: 0.00216, source: "Q2 2025 SEDAR" },
  { date: "2025-09-30", holdings: 225000, sharesOutstandingDiluted: 105_000_000, holdingsPerShare: 0.00214, source: "Q3 2025 SEDAR" },
  { date: "2025-11-19", holdings: 233645, sharesOutstandingDiluted: 110_000_000, holdingsPerShare: 0.00212, source: "$18M ZEC purchase" },
  { date: "2025-12-30", holdings: 290063, sharesOutstandingDiluted: 125_000_000, holdingsPerShare: 0.00232, source: "$29M ZEC purchase", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001509745", sourceType: "sec-filing" },
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

// SUI Group (SUIG) - SUI treasury
const SUIG_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-10-01", holdings: 45000000, sharesOutstandingDiluted: 28_000_000, holdingsPerShare: 1.607, source: "SUI treasury announcement" },
  { date: "2024-12-31", holdings: 78000000, sharesOutstandingDiluted: 35_000_000, holdingsPerShare: 2.229, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 108000000, sharesOutstandingDiluted: 42_000_000, holdingsPerShare: 2.571, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 130000000, sharesOutstandingDiluted: 48_000_000, holdingsPerShare: 2.708, source: "Q3 2025 10-Q", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001425355", sourceType: "sec-filing" },
];

// AVAX One (AVX) - AVAX treasury
const AVX_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-09-15", holdings: 5500000, sharesOutstandingDiluted: 22_000_000, holdingsPerShare: 0.250, source: "Initial AVAX treasury" },
  { date: "2024-12-31", holdings: 9800000, sharesOutstandingDiluted: 28_000_000, holdingsPerShare: 0.350, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 13800000, sharesOutstandingDiluted: 35_000_000, holdingsPerShare: 0.394, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 16500000, sharesOutstandingDiluted: 40_000_000, holdingsPerShare: 0.413, source: "Q3 2025 10-Q", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001826397", sourceType: "sec-filing" },
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
// Dec 2025: Sonnet merger added ~95M shares (32M -> 127M)
const PURR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-11-01", holdings: 4500000, sharesOutstandingDiluted: 15_000_000, holdingsPerShare: 0.300, source: "Initial HYPE treasury" },
  { date: "2024-12-31", holdings: 8500000, sharesOutstandingDiluted: 22_000_000, holdingsPerShare: 0.386, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 12000000, sharesOutstandingDiluted: 28_000_000, holdingsPerShare: 0.429, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 15000000, sharesOutstandingDiluted: 32_000_000, holdingsPerShare: 0.469, source: "Q3 2025 10-Q" },
  { date: "2025-12-15", holdings: 18000000, sharesOutstandingDiluted: 127_000_000, holdingsPerShare: 0.142, source: "Post-Sonnet merger 8-K", sharesSource: "Merger 8-K", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002078856", sourceType: "sec-filing" },
];

// Hyperion DeFi (HYPD) - HYPE treasury
const HYPD_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-10-15", holdings: 650000, sharesOutstandingDiluted: 12_000_000, holdingsPerShare: 0.0542, source: "HYPE conversion announcement" },
  { date: "2024-12-31", holdings: 1200000, sharesOutstandingDiluted: 18_000_000, holdingsPerShare: 0.0667, source: "Q4 2024 filing" },
  { date: "2025-06-30", holdings: 1700000, sharesOutstandingDiluted: 22_000_000, holdingsPerShare: 0.0773, source: "Q2 2025 filing" },
  { date: "2025-09-30", holdings: 2100000, sharesOutstandingDiluted: 25_000_000, holdingsPerShare: 0.0840, source: "Q3 2025 10-Q", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001682639", sourceType: "sec-filing" },
];

// Tron Inc (TRON) - TRX treasury, formerly SRM Entertainment
const TRON_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-06-15", holdings: 365096845, sharesOutstandingDiluted: 65_000_000, holdingsPerShare: 5.617, source: "Initial TRX treasury" },
  { date: "2025-09-02", holdings: 677596945, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 7.972, source: "$110M expansion", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001956744", sourceType: "sec-filing" },
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
  { date: "2025-12-31", holdings: 13099, sharesOutstandingDiluted: 325_000_000, holdingsPerShare: 0.0000403, source: "Dec 2025 mining update", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000827876&type=8-K", sourceType: "sec-filing" },
];

// Hut 8 (HUT) - Canadian miner, merged with US Bitcoin Corp Nov 2023
// SEC EDGAR source: WeightedAverageNumberOfDilutedSharesOutstanding
const HUT_HISTORY: HoldingsSnapshot[] = [
  { date: "2023-12-31", holdings: 9195, sharesOutstandingDiluted: 95_500_000, holdingsPerShare: 0.0000963, source: "Dec 2023 Report" },
  { date: "2024-03-31", holdings: 9102, sharesOutstandingDiluted: 100_200_000, holdingsPerShare: 0.0000908, source: "Q1 2024 10-Q" },
  { date: "2024-06-30", holdings: 9102, sharesOutstandingDiluted: 105_000_000, holdingsPerShare: 0.0000867, source: "Q2 2024 10-Q" },
  { date: "2024-09-30", holdings: 9106, sharesOutstandingDiluted: 108_000_000, holdingsPerShare: 0.0000843, source: "Q3 2024 10-Q" },
  { date: "2024-12-31", holdings: 10171, sharesOutstandingDiluted: 115_000_000, holdingsPerShare: 0.0000884, source: "Q4 2024 10-K" },
  { date: "2025-03-31", holdings: 10264, sharesOutstandingDiluted: 118_000_000, holdingsPerShare: 0.0000870, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 10667, sharesOutstandingDiluted: 120_000_000, holdingsPerShare: 0.0000889, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 13696, sharesOutstandingDiluted: 121_760_000, holdingsPerShare: 0.0001125, source: "Q3 2025 10-Q" },
  { date: "2026-01-03", holdings: 13696, sharesOutstandingDiluted: 125_000_000, holdingsPerShare: 0.0001096, source: "$200M Coinbase credit facility", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001964789&type=8-K", sourceType: "sec-filing" },
];

// Core Scientific (CORZ) - Emerged from bankruptcy Jan 2024
// SEC EDGAR source: WeightedAverageNumberOfDilutedSharesOutstanding (estimated ~15% dilution)
const CORZ_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-12-31", holdings: 256, sharesOutstandingDiluted: 338_000_000, holdingsPerShare: 0.00000076, source: "FY 2024 10-K" },
  { date: "2025-03-31", holdings: 977, sharesOutstandingDiluted: 342_000_000, holdingsPerShare: 0.00000286, source: "Q1 2025 10-Q" },
  { date: "2025-06-30", holdings: 1612, sharesOutstandingDiluted: 351_000_000, holdingsPerShare: 0.00000459, source: "Q2 2025 10-Q" },
  { date: "2025-09-30", holdings: 2116, sharesOutstandingDiluted: 356_000_000, holdingsPerShare: 0.00000594, source: "Q3 2025 10-Q", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001839341&type=10-Q", sourceType: "sec-filing" },
];

// Bitdeer Technologies (BTDR) - Started treasury strategy Nov 2024
// SEC EDGAR source: WeightedAverageNumberOfDilutedSharesOutstanding
const BTDR_HISTORY: HoldingsSnapshot[] = [
  { date: "2024-12-31", holdings: 594, sharesOutstandingDiluted: 190_000_000, holdingsPerShare: 0.00000313, source: "FY 2024 Earnings" },
  { date: "2025-03-31", holdings: 1156, sharesOutstandingDiluted: 205_000_000, holdingsPerShare: 0.00000564, source: "Q1 2025 Earnings" },
  { date: "2025-06-30", holdings: 1502, sharesOutstandingDiluted: 208_000_000, holdingsPerShare: 0.00000722, source: "Q2 2025 Earnings" },
  { date: "2025-09-30", holdings: 2029, sharesOutstandingDiluted: 208_620_000, holdingsPerShare: 0.00000973, source: "Q3 2025 Earnings" },
  { date: "2025-12-31", holdings: 2179, sharesOutstandingDiluted: 220_000_000, holdingsPerShare: 0.00000990, source: "Dec 2025 production update" },
  { date: "2026-01-10", holdings: 1901, sharesOutstandingDiluted: 225_000_000, holdingsPerShare: 0.00000845, source: "Weekly holdings update", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001899123&type=8-K", sourceType: "sec-filing" },
];

// Trump Media (DJT) - Started BTC treasury May 2025
// SEC EDGAR source: EntityCommonStockSharesOutstanding
// Corrected to 278M FD shares per Q3 2025 10-Q
const DJT_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-05-30", holdings: 0, sharesOutstandingDiluted: 220_624_508, holdingsPerShare: 0, source: "Treasury deal closed" },
  { date: "2025-07-21", holdings: 19000, sharesOutstandingDiluted: 275_000_000, holdingsPerShare: 0.0000691, source: "Press reports ~$2B BTC" },
  { date: "2025-09-30", holdings: 11542, sharesOutstandingDiluted: 278_000_000, holdingsPerShare: 0.0000415, source: "Q3 2025 10-Q", sharesSource: "SEC 10-Q diluted", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001849635&type=10-Q", sourceType: "sec-filing" },
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
  { date: "2026-01-16", holdings: 12798, sharesOutstandingDiluted: 45_000_000, holdingsPerShare: 0.0002844, source: "Post-Semler merger 8-K", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001920406&type=8-K", sourceType: "sec-filing" },
];

// ==================== BNB COMPANIES ====================

// BNC - BNB treasury backed by YZi Labs (CZ family office)
const BNC_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-06-15", holdings: 150000, sharesOutstandingDiluted: 45_000_000, holdingsPerShare: 3.333, source: "Initial BNB treasury" },
  { date: "2025-09-30", holdings: 320000, sharesOutstandingDiluted: 55_000_000, holdingsPerShare: 5.818, source: "Q3 2025 filing" },
  { date: "2025-12-31", holdings: 500000, sharesOutstandingDiluted: 65_000_000, holdingsPerShare: 7.692, source: "Q4 2025 filing", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001482541&type=10-K", sourceType: "sec-filing" },
];

// Nano Labs (NA) - Hong Kong Web3 infrastructure, BNB treasury
const NA_HISTORY: HoldingsSnapshot[] = [
  { date: "2025-06-30", holdings: 50000, sharesOutstandingDiluted: 85_000_000, holdingsPerShare: 0.588, source: "Initial BNB purchase" },
  { date: "2025-09-30", holdings: 90000, sharesOutstandingDiluted: 95_000_000, holdingsPerShare: 0.947, source: "Q3 2025 filing" },
  { date: "2025-12-31", holdings: 130000, sharesOutstandingDiluted: 105_000_000, holdingsPerShare: 1.238, source: "Q4 2025 filing", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001872302&type=10-K", sourceType: "sec-filing" },
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
