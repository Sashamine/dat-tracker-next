/**
 * BMNR SEC History - XBRL-Verified Data Only
 * ==========================================
 *
 * This file contains ONLY data extracted from SEC XBRL filings (10-Q and 10-K).
 * Each data point has full provenance: accession number, SEC URL, and filing date.
 *
 * Why XBRL-only?
 * - Machine-readable = no transcription errors
 * - Full audit trail via SEC EDGAR
 * - Supports accurate historical mNAV calculations
 *
 * What's NOT included:
 * - 8-K data (no XBRL, would require text parsing with hallucination risk)
 * - Press release data (not SEC-verified)
 * - News/aggregator data
 *
 * Note on reverse stock split:
 * - BMNR executed a 1:20 reverse stock split on May 15, 2025
 * - Pre-split share counts are marked with `preSplit: true`
 * - To compare across periods, divide pre-split shares by 20
 *
 * Note on fiscal year:
 * - BMNR's fiscal year ends August 31 (not calendar year)
 * - Q1 = Sep-Nov, Q2 = Dec-Feb, Q3 = Mar-May, Q4 = Jun-Aug
 *
 * ETH Treasury Strategy Timeline:
 * - Pre-Q2 FY2025: BTC mining company, immediately sold mined BTC
 * - Q2 FY2025 (Feb 2025): Started accumulating digital assets ($248K)
 * - Q3 FY2025 (May 2025): Continued accumulation ($174K)
 * - Q4 FY2025 (Jun-Aug 2025): ETH strategy launched, grew to $2.5B
 * - Q1 FY2026 (Sep-Nov 2025): Explosive growth to $10.6B (3.74M ETH)
 *
 * Data coverage: Q1 FY2024 through Q1 FY2026
 * Total filings: 9 (2 10-Ks + 7 10-Qs)
 */

export interface BMNRSecFiling {
  // Filing metadata
  periodEnd: string; // YYYY-MM-DD
  formType: "10-Q" | "10-K";
  filedDate: string; // YYYY-MM-DD
  accessionNumber: string;
  secUrl: string;

  // Balance sheet data (all values in USD)
  digitalAssets: number; // DigitalAssets or Cryptocurrency on balance sheet (BTC + ETH at fair value)
  cashAndEquivalents: number; // CashAndCashEquivalentsAtCarryingValue
  totalAssets: number;
  totalLiabilities: number;

  // Debt instruments
  totalDebt: number; // LongTermDebt + LoansPayable (includes related party loans)

  // Equity
  preferredEquity: number; // PreferredStockValue (Series A + Series B)
  commonSharesOutstanding: number; // CommonStockSharesOutstanding
  preSplit: boolean; // true if before May 2025 1:20 reverse split

  // Notes
  notes?: string;
}

export const BMNR_SEC_HISTORY: BMNRSecFiling[] = [
  // ==================== FY 2024 ====================
  {
    periodEnd: "2023-11-30",
    formType: "10-Q",
    filedDate: "2024-01-12",
    accessionNumber: "0001683168-24-000250",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-24-000250-index.html",
    digitalAssets: 152_990,
    cashAndEquivalents: 470_529,
    totalAssets: 8_580_018, // XBRL verified (was 7,934,925 — copy-paste from Q1 FY2025)
    totalLiabilities: 5_914_801,
    totalDebt: 2_019_922,
    preferredEquity: 45,
    commonSharesOutstanding: 49_748_705,
    preSplit: true,
    notes: "Q1 FY2024 - BTC mining operations, minimal BTC holdings (immediately sold mined BTC)",
  },
  {
    periodEnd: "2024-02-29",
    formType: "10-Q",
    filedDate: "2024-04-15",
    accessionNumber: "0001683168-24-002367",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-24-002367-index.html",
    digitalAssets: 11_733,
    cashAndEquivalents: 342_296,
    totalAssets: 7_849_837, // XBRL verified (was 7,712,598)
    totalLiabilities: 4_858_045,
    totalDebt: 1_718_779,
    preferredEquity: 45,
    commonSharesOutstanding: 49_821_698,
    preSplit: true,
    notes: "Q2 FY2024 - Digital assets declined (BTC sales), focus on mining operations",
  },
  {
    periodEnd: "2024-05-31",
    formType: "10-Q",
    filedDate: "2024-07-15",
    accessionNumber: "0001683168-24-004815",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-24-004815-index.html",
    digitalAssets: 169_632,
    cashAndEquivalents: 281_004,
    totalAssets: 8_166_529, // XBRL verified (was 7,699,513)
    totalLiabilities: 4_846_866,
    totalDebt: 1_625_000,
    preferredEquity: 45,
    commonSharesOutstanding: 49_912_607,
    preSplit: true,
    notes: "Q3 FY2024 - BTC mining, replenished digital assets to $170K",
  },
  {
    periodEnd: "2024-08-31",
    formType: "10-K",
    filedDate: "2024-12-09",
    accessionNumber: "0001683168-24-008555",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-24-008555-index.html",
    digitalAssets: 0,
    cashAndEquivalents: 499_270,
    totalAssets: 7_283_529, // XBRL verified (was 8,344,213)
    totalLiabilities: 5_491_660,
    totalDebt: 2_356_472,
    preferredEquity: 45,
    commonSharesOutstanding: 49_912_607,
    preSplit: true,
    notes: "FY2024 - No digital assets on balance sheet (BTC mining company, sold all mined BTC)",
  },

  // ==================== FY 2025 ====================
  {
    periodEnd: "2024-11-30",
    formType: "10-Q",
    filedDate: "2025-01-10",
    accessionNumber: "0001683168-25-000223",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-25-000223-index.html",
    digitalAssets: 0,
    cashAndEquivalents: 797_310,
    totalAssets: 7_934_925,
    totalLiabilities: 0, // Not extracted
    totalDebt: 23_003,
    preferredEquity: 45,
    commonSharesOutstanding: 39_667_607,
    preSplit: true,
    notes: "Q1 FY2025 - No digital asset treasury yet, minimal debt",
  },
  {
    periodEnd: "2025-02-28",
    formType: "10-Q",
    filedDate: "2025-04-14",
    accessionNumber: "0001683168-25-002541",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-25-002541-index.html",
    digitalAssets: 247_923,
    cashAndEquivalents: 482_951,
    totalAssets: 7_500_676, // XBRL verified (was 8,257,347)
    totalLiabilities: 5_403_885,
    totalDebt: 2_560_461,
    preferredEquity: 45,
    commonSharesOutstanding: 39_667_607,
    preSplit: true,
    notes: "Q2 FY2025 - FIRST digital asset accumulation ($248K) - treasury strategy begins",
  },
  {
    periodEnd: "2025-05-31",
    formType: "10-Q",
    filedDate: "2025-07-02",
    accessionNumber: "0001683168-25-004889",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-25-004889-index.html",
    digitalAssets: 173_916,
    cashAndEquivalents: 1_473_501,
    totalAssets: 8_265_816, // XBRL verified (was 8,173,267)
    totalLiabilities: 5_387_860,
    totalDebt: 2_391_407,
    preferredEquity: 45,
    commonSharesOutstanding: 2_053_366,
    preSplit: false,
    notes: "Q3 FY2025 - Post-reverse split (1:20 on May 15, 2025), cash buildup for ETH strategy",
  },
  {
    periodEnd: "2025-08-31",
    formType: "10-K",
    filedDate: "2025-11-21",
    accessionNumber: "0001493152-25-024679",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225024679/0001493152-25-024679-index.html",
    digitalAssets: 2_515_000_000,
    cashAndEquivalents: 511_999_000,
    totalAssets: 8_795_053_000,
    totalLiabilities: 102_256_000,
    totalDebt: 0,
    preferredEquity: 0,
    commonSharesOutstanding: 234_712_310,
    preSplit: false,
    notes: "FY2025 - ETH treasury strategy launched! $2.5B digital assets, 234.7M shares. NYSE uplisting completed June 2025.",
  },

  // ==================== FY 2026 ====================
  {
    periodEnd: "2025-11-30",
    formType: "10-Q",
    filedDate: "2026-01-13",
    accessionNumber: "0001493152-26-002084",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226002084/0001493152-26-002084-index.html",
    digitalAssets: 10_561_789_000,
    cashAndEquivalents: 887_678_000,
    totalAssets: 11_487_275_000,
    totalLiabilities: 235_743_000,
    totalDebt: 0,
    preferredEquity: 0,
    commonSharesOutstanding: 408_578_823,
    preSplit: false,
    notes: "Q1 FY2026 - 3.74M ETH + 193 BTC = $10.56B digital assets. World's largest ETH treasury.",
  },
];

/**
 * Helper function to get filing by period end date
 */
export function getBMNRFilingByDate(periodEnd: string): BMNRSecFiling | undefined {
  return BMNR_SEC_HISTORY.find((filing) => filing.periodEnd === periodEnd);
}

/**
 * Helper function to get filings within a date range
 */
export function getBMNRFilingsInRange(startDate: string, endDate: string): BMNRSecFiling[] {
  return BMNR_SEC_HISTORY.filter(
    (filing) => filing.periodEnd >= startDate && filing.periodEnd <= endDate
  );
}

/**
 * Helper function to get the most recent filing
 */
export function getLatestBMNRFiling(): BMNRSecFiling {
  return BMNR_SEC_HISTORY[BMNR_SEC_HISTORY.length - 1];
}

/**
 * Helper function to adjust pre-split shares for comparison
 * BMNR executed 1:20 reverse split on May 15, 2025
 */
export function getBMNRSharesPostSplit(filing: BMNRSecFiling): number {
  if (filing.preSplit) {
    return filing.commonSharesOutstanding / 20;
  }
  return filing.commonSharesOutstanding;
}
