/**
 * MSTR Cash Flow History - Operating Burn Tracking
 * ==================================================
 *
 * This file tracks MSTR's operating cash flow (burn) from SEC filings.
 * Separate from mstr-sec-history.ts because cash flow has different semantics:
 * - 10-K: Full fiscal year figures
 * - 10-Q: Year-to-date (YTD) cumulative figures (not quarterly)
 *
 * Key XBRL Concepts:
 * - NetCashProvidedByUsedInOperatingActivities (Operating)
 * - NetCashProvidedByUsedInInvestingActivities (Investing - includes BTC purchases)
 * - NetCashProvidedByUsedInFinancingActivities (Financing - debt/equity raises)
 *
 * Sign Convention:
 * - Positive = cash provided (inflow)
 * - Negative = cash used (outflow)
 *
 * Data Sources:
 * - Annual (10-K): Full year operating cash flow
 * - All figures in USD
 */

export interface MSTRCashFlowFiling {
  // Filing metadata
  periodEnd: string; // YYYY-MM-DD (fiscal year end for 10-K)
  formType: "10-K" | "10-Q";
  filedDate: string; // YYYY-MM-DD
  accessionNumber: string;
  secUrl: string;

  // Cash Flow Statement Data (all values in USD)
  operatingCashFlow: number; // NetCashProvidedByUsedInOperatingActivities
  investingCashFlow: number; // NetCashProvidedByUsedInInvestingActivities
  financingCashFlow: number; // NetCashProvidedByUsedInFinancingActivities

  // Period type
  periodType: "full-year" | "ytd"; // 10-K = full year, 10-Q = YTD cumulative

  // Notes
  notes?: string;
}

/**
 * Annual Cash Flow History (10-K filings only)
 * These are full fiscal year figures - the authoritative annual operating burn
 */
export const MSTR_ANNUAL_CASH_FLOW: MSTRCashFlowFiling[] = [
  // ==================== FY 2020 ====================
  // Note: First year of BTC strategy, started Aug 2020
  // Software business still generating positive operating cash flow
  {
    periodEnd: "2020-12-31",
    formType: "10-K",
    filedDate: "2021-02-12",
    accessionNumber: "0001564590-21-005783",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000156459021005783/mstr-10k_20201231.htm",
    operatingCashFlow: 53_619_000, // $53.6M provided - SEC XBRL verified
    investingCashFlow: -1_018_693_000, // $(1.02B) used - SEC XBRL verified
    financingCashFlow: 563_233_000, // $563M provided - SEC XBRL verified
    periodType: "full-year",
    notes: "First year of BTC treasury strategy; strong software operating cash flow",
  },

  // ==================== FY 2021 ====================
  {
    periodEnd: "2021-12-31",
    formType: "10-K",
    filedDate: "2022-02-16",
    accessionNumber: "0001564590-22-005287",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000156459022005287/mstr-10k_20211231.htm",
    operatingCashFlow: 93_833_000, // $93.8M provided - SEC XBRL verified
    investingCashFlow: -2_629_235_000, // $(2.63B) used - SEC XBRL verified
    financingCashFlow: 2_541_685_000, // $2.54B provided - SEC XBRL verified
    periodType: "full-year",
    notes: "Peak software cash generation; aggressive BTC accumulation funded by converts",
  },

  // ==================== FY 2022 ====================
  {
    periodEnd: "2022-12-31",
    formType: "10-K",
    filedDate: "2023-02-16",
    accessionNumber: "0001564590-23-002012",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000156459023002012/mstr-10k_20221231.htm",
    operatingCashFlow: 3_211_000, // $3.2M provided - SEC XBRL verified
    investingCashFlow: -278_590_000, // $(279M) used - SEC XBRL verified
    financingCashFlow: 265_188_000, // $265M provided - SEC XBRL verified
    periodType: "full-year",
    notes: "Crypto winter; minimal BTC buying; software barely cash flow positive",
  },

  // ==================== FY 2023 ====================
  {
    periodEnd: "2023-12-31",
    formType: "10-K",
    filedDate: "2024-02-15",
    accessionNumber: "0000950170-24-015847",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000095017024015847/mstr-20231231.htm",
    operatingCashFlow: 12_712_000, // $12.7M provided - SEC XBRL verified
    investingCashFlow: -1_905_237_000, // $(1.91B) used - SEC XBRL verified
    financingCashFlow: 1_889_886_000, // $1.89B provided - SEC XBRL verified
    periodType: "full-year",
    notes: "BTC recovery year; ATM program becomes primary funding source",
  },

  // ==================== FY 2024 ====================
  {
    periodEnd: "2024-12-31",
    formType: "10-K",
    filedDate: "2025-02-18",
    accessionNumber: "0000950170-25-021814",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000095017025021814/mstr-20241231.htm",
    operatingCashFlow: -53_032_000, // $(53M) used - SEC XBRL verified
    investingCashFlow: -22_086_237_000, // $(22.09B) used - SEC XBRL verified
    financingCashFlow: 22_132_641_000, // $22.13B provided - SEC XBRL verified
    periodType: "full-year",
    notes: "First year of operating cash burn; 21/21 plan in full swing; STRK preferred launched",
  },
];

/**
 * YTD Cash Flow from 10-Q filings
 * These are cumulative YTD figures, not individual quarters
 */
export const MSTR_QUARTERLY_CASH_FLOW: MSTRCashFlowFiling[] = [
  // ==================== 9M 2025 (most recent) ====================
  {
    periodEnd: "2025-09-30",
    formType: "10-Q",
    filedDate: "2025-11-03",
    accessionNumber: "0001193125-25-262568",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312525262568/mstr-20250930.htm",
    operatingCashFlow: -45_612_000, // $(45.6M) used - 9 months YTD
    investingCashFlow: -19_417_576_000, // $(19.42B) used - BTC purchases YTD
    financingCashFlow: 19_476_842_000, // $19.48B provided - capital raises YTD
    periodType: "ytd",
    notes: "9M 2025 YTD; continuing negative operating cash flow pattern",
  },
];

/**
 * Helper: Get the most recent annual cash flow
 */
export function getMostRecentAnnualCashFlow(): MSTRCashFlowFiling {
  return MSTR_ANNUAL_CASH_FLOW[MSTR_ANNUAL_CASH_FLOW.length - 1];
}

/**
 * Helper: Calculate average quarterly burn from most recent 10-K
 */
export function getAverageQuarterlyBurn(): number {
  const mostRecent = getMostRecentAnnualCashFlow();
  // Operating cash flow / 4 quarters
  // Negative operating cash flow = burn
  return mostRecent.operatingCashFlow / 4;
}

/**
 * Helper: Get annual operating cash flow trend
 * Returns array of [year, operatingCashFlow] tuples
 */
export function getOperatingCashFlowTrend(): Array<[number, number]> {
  return MSTR_ANNUAL_CASH_FLOW.map((filing) => [
    parseInt(filing.periodEnd.substring(0, 4)),
    filing.operatingCashFlow,
  ]);
}

/**
 * Helper: Calculate cumulative operating cash flow
 * Useful for understanding total cash consumed/generated by operations
 */
export function getCumulativeOperatingCashFlow(): number {
  return MSTR_ANNUAL_CASH_FLOW.reduce(
    (sum, filing) => sum + filing.operatingCashFlow,
    0
  );
}

/**
 * MSTR Burn Summary
 * =================
 *
 * Historical Operating Cash Flow (SEC XBRL verified):
 *
 * | Fiscal Year | Operating Cash Flow | Trend          |
 * |-------------|---------------------|----------------|
 * | FY 2020     | +$53.6M (provided)  | Healthy        |
 * | FY 2021     | +$93.8M (provided)  | Peak           |
 * | FY 2022     | +$3.2M (provided)   | Minimal        |
 * | FY 2023     | +$12.7M (provided)  | Recovery       |
 * | FY 2024     | -$53.0M (used)      | First burn     |
 * | 9M 2025     | -$45.6M (used)      | Continuing     |
 *
 * Key Observations:
 * 1. FY 2020-2023: Software business generated positive operating cash flow
 * 2. FY 2024: First year of operating cash burn (-$53M)
 * 3. The shift coincides with aggressive BTC accumulation under 21/21 plan
 * 4. Quarterly burn rate ~$15.2M based on 9M 2025 ($45.6M / 3 = $15.2M)
 * 5. Burn is funded by capital raises (converts, ATM, preferred) - not a liquidity concern
 *
 * All figures verified directly from SEC EDGAR XBRL filings.
 *
 * Sources:
 * - SEC 10-K FY2024: https://www.sec.gov/Archives/edgar/data/1050446/000095017025021814/mstr-20241231.htm
 * - SEC 10-Q Q3 2025: https://www.sec.gov/Archives/edgar/data/1050446/000119312525262568/mstr-20250930.htm
 */
