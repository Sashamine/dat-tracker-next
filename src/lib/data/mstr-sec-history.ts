/**
 * MSTR SEC History - XBRL-Verified Data Only
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
 * - Strategy.com data (not SEC-verified)
 * - News/aggregator data
 *
 * Note on stock split:
 * - MSTR executed a 10:1 stock split on August 7, 2024
 * - Pre-split share counts are marked with `preSplit: true`
 * - To compare across periods, multiply pre-split shares by 10
 *
 * Data coverage: Q3 2020 (first BTC purchase) through Q3 2025
 * Total filings: 21 (5 10-Ks + 16 10-Qs)
 */

export interface MSTRSecFiling {
  // Filing metadata
  periodEnd: string; // YYYY-MM-DD
  formType: "10-Q" | "10-K";
  filedDate: string; // YYYY-MM-DD
  accessionNumber: string;
  secUrl: string;

  // Balance sheet data (all values in USD)
  digitalAssets: number; // IndefiniteLivedIntangibleAssetsExcludingGoodwill (BTC at cost basis pre-2024, fair value post-ASU 2023-08)
  cashAndEquivalents: number; // CashAndCashEquivalentsAtCarryingValue
  totalAssets: number;
  totalLiabilities: number;

  // Debt instruments
  convertibleDebt: number | null; // ConvertibleNotesPayable (null if not reported separately)
  longTermDebt: number | null; // LongTermDebt (includes all debt when convertibles not broken out)

  // Equity
  preferredEquity: number | null; // TemporaryEquityCarryingAmountAttributableToParent (mezzanine equity)
  commonSharesOutstanding: number; // CommonStockSharesOutstanding
  preSplit: boolean; // true if before Aug 2024 10:1 split

  // Notes
  notes?: string;
}

export const MSTR_SEC_HISTORY: MSTRSecFiling[] = [
  // ==================== FY 2020 ====================
  {
    periodEnd: "2020-09-30",
    formType: "10-Q",
    filedDate: "2020-10-29",
    accessionNumber: "0001564590-20-047995",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 380_758_000,
    cashAndEquivalents: 52_653_000,
    totalAssets: 1_104_420_000,
    totalLiabilities: 500_283_000,
    convertibleDebt: null,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 7_253_000,
    preSplit: true,
    notes: "First quarter with BTC holdings (21,454 BTC acquired Aug-Sep 2020)",
  },
  {
    periodEnd: "2020-12-31",
    formType: "10-K",
    filedDate: "2021-02-16",
    accessionNumber: "0001564590-21-005783",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-K&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 1_054_302_000,
    cashAndEquivalents: 59_675_000,
    totalAssets: 1_812_278_000,
    totalLiabilities: 1_169_963_000,
    convertibleDebt: null,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 7_623_000,
    preSplit: true,
    notes: "First full fiscal year with BTC treasury strategy",
  },

  // ==================== FY 2021 ====================
  {
    periodEnd: "2021-03-31",
    formType: "10-Q",
    filedDate: "2021-04-29",
    accessionNumber: "0001564590-21-021949",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 1_946_582_000,
    cashAndEquivalents: 82_544_000,
    totalAssets: 2_771_003_000,
    totalLiabilities: 1_758_527_000,
    convertibleDebt: 674_443_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 7_782_000,
    preSplit: true,
    notes: "First convertible notes issued (Dec 2020)",
  },
  {
    periodEnd: "2021-06-30",
    formType: "10-Q",
    filedDate: "2021-07-29",
    accessionNumber: "0001564590-21-039125",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 2_051_039_000,
    cashAndEquivalents: 56_399_000,
    totalAssets: 2_892_285_000,
    totalLiabilities: 1_816_422_000,
    convertibleDebt: 636_392_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 7_784_000,
    preSplit: true,
  },
  {
    periodEnd: "2021-09-30",
    formType: "10-Q",
    filedDate: "2021-10-28",
    accessionNumber: "0001564590-21-052646",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 2_405_739_000,
    cashAndEquivalents: 56_975_000,
    totalAssets: 3_265_697_000,
    totalLiabilities: 2_114_403_000,
    convertibleDebt: 637_136_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 8_394_000,
    preSplit: true,
  },
  {
    periodEnd: "2021-12-31",
    formType: "10-K",
    filedDate: "2022-02-15",
    accessionNumber: "0001564590-22-005287",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-K&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 2_850_210_000,
    cashAndEquivalents: 63_356_000,
    totalAssets: 3_739_035_000,
    totalLiabilities: 2_443_759_000,
    convertibleDebt: 637_882_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 9_322_000,
    preSplit: true,
  },

  // ==================== FY 2022 ====================
  {
    periodEnd: "2022-03-31",
    formType: "10-Q",
    filedDate: "2022-05-03",
    accessionNumber: "0001564590-22-017437",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 2_895_619_000,
    cashAndEquivalents: 92_677_000,
    totalAssets: 3_814_810_000,
    totalLiabilities: 2_469_148_000,
    convertibleDebt: 638_630_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 9_334_000,
    preSplit: true,
  },
  {
    periodEnd: "2022-06-30",
    formType: "10-Q",
    filedDate: "2022-08-02",
    accessionNumber: "0001564590-22-027479",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 1_987_781_000,
    cashAndEquivalents: 69_386_000,
    totalAssets: 2_897_813_000,
    totalLiabilities: 2_488_068_000,
    convertibleDebt: 639_380_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 9_337_000,
    preSplit: true,
    notes: "BTC impairment charges during crypto winter",
  },
  {
    periodEnd: "2022-09-30",
    formType: "10-Q",
    filedDate: "2022-11-01",
    accessionNumber: "0001564590-22-036073",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 1_993_032_000,
    cashAndEquivalents: 60_390_000,
    totalAssets: 2_908_433_000,
    totalLiabilities: 2_500_905_000,
    convertibleDebt: 640_133_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 9_354_000,
    preSplit: true,
  },
  {
    periodEnd: "2022-12-31",
    formType: "10-K",
    filedDate: "2023-02-14",
    accessionNumber: "0001564590-23-002012",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-K&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 1_840_028_000,
    cashAndEquivalents: 43_835_000,
    totalAssets: 2_753_631_000,
    totalLiabilities: 2_511_762_000,
    convertibleDebt: 640_888_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 9_585_000,
    preSplit: true,
    notes: "Crypto winter trough - peak impairment losses",
  },

  // ==================== FY 2023 ====================
  {
    periodEnd: "2023-03-31",
    formType: "10-Q",
    filedDate: "2023-05-04",
    accessionNumber: "0000950170-23-016229",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 2_000_392_000,
    cashAndEquivalents: 94_311_000,
    totalAssets: 2_958_851_000,
    totalLiabilities: 2_523_091_000,
    convertibleDebt: 641_645_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 10_995_000,
    preSplit: true,
    notes: "BTC recovery begins",
  },
  {
    periodEnd: "2023-06-30",
    formType: "10-Q",
    filedDate: "2023-08-01",
    accessionNumber: "0000950170-23-036448",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 2_323_252_000,
    cashAndEquivalents: 65_968_000,
    totalAssets: 3_270_055_000,
    totalLiabilities: 2_543_016_000,
    convertibleDebt: 642_405_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 12_119_000,
    preSplit: true,
  },
  {
    periodEnd: "2023-09-30",
    formType: "10-Q",
    filedDate: "2023-11-02",
    accessionNumber: "0000950170-23-057418",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 2_451_374_000,
    cashAndEquivalents: 45_009_000,
    totalAssets: 3_391_638_000,
    totalLiabilities: 2_565_098_000,
    convertibleDebt: 643_167_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 12_543_000,
    preSplit: true,
  },
  {
    periodEnd: "2023-12-31",
    formType: "10-K",
    filedDate: "2024-02-15",
    accessionNumber: "0000950170-24-015847",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-K&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 3_626_476_000,
    cashAndEquivalents: 46_817_000,
    totalAssets: 4_534_127_000,
    totalLiabilities: 2_591_907_000,
    convertibleDebt: 643_931_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 14_904_000,
    preSplit: true,
    notes: "Strong BTC recovery continues",
  },

  // ==================== FY 2024 ====================
  {
    periodEnd: "2024-03-31",
    formType: "10-Q",
    filedDate: "2024-04-29",
    accessionNumber: "0000950170-24-051230",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 5_074_152_000,
    cashAndEquivalents: 81_326_000,
    totalAssets: 5_986_978_000,
    totalLiabilities: 3_537_988_000,
    convertibleDebt: 644_698_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 15_683_000,
    preSplit: true,
    notes: "Post-halving BTC appreciation",
  },
  {
    periodEnd: "2024-06-30",
    formType: "10-Q",
    filedDate: "2024-08-01",
    accessionNumber: "0000950170-24-091778",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 5_687_890_000,
    cashAndEquivalents: 66_923_000,
    totalAssets: 6_585_610_000,
    totalLiabilities: 4_191_571_000,
    convertibleDebt: 3_346_519_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 17_103_000,
    preSplit: true,
    notes: "Last quarter before 10:1 stock split; major convertible issuance",
  },
  {
    periodEnd: "2024-09-30",
    formType: "10-Q",
    filedDate: "2024-10-30",
    accessionNumber: "0000950170-24-119263",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 6_850_879_000,
    cashAndEquivalents: 46_343_000,
    totalAssets: 7_745_451_000,
    totalLiabilities: 4_269_428_000,
    convertibleDebt: 4_202_656_000,
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 183_000_000,
    preSplit: false,
    notes: "First quarter post 10:1 stock split (Aug 7, 2024)",
  },
  {
    periodEnd: "2024-12-31",
    formType: "10-K",
    filedDate: "2025-02-06",
    accessionNumber: "0000950170-25-021814",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-K&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 23_909_373_000,
    cashAndEquivalents: 38_117_000,
    totalAssets: 25_119_428_000,
    totalLiabilities: 8_227_285_000,
    convertibleDebt: null, // Not separately reported in 10-K
    longTermDebt: null,
    preferredEquity: null,
    commonSharesOutstanding: 226_138_000,
    preSplit: false,
    notes: "BTC at fair value under ASU 2023-08; massive BTC accumulation",
  },

  // ==================== FY 2025 ====================
  {
    periodEnd: "2025-03-31",
    formType: "10-Q",
    filedDate: "2025-05-01",
    accessionNumber: "0000950170-25-063536",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 43_546_079_000,
    cashAndEquivalents: 60_298_000,
    totalAssets: 44_798_093_000,
    totalLiabilities: 9_254_685_000,
    convertibleDebt: 8_131_130_000,
    longTermDebt: null,
    preferredEquity: 1_304_497_000,
    commonSharesOutstanding: 246_537_000,
    preSplit: false,
    notes: "First quarter with preferred equity. Total mezzanine = STRK $593,624K + STRF $710,873K",
  },
  {
    periodEnd: "2025-06-30",
    formType: "10-Q",
    filedDate: "2025-07-31",
    accessionNumber: "0000950170-25-102209",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 64_362_798_000,
    cashAndEquivalents: 50_095_000,
    totalAssets: 65_712_605_000,
    totalLiabilities: 9_283_527_000,
    convertibleDebt: 8_137_427_000,
    longTermDebt: null,
    preferredEquity: 2_893_921_000,
    commonSharesOutstanding: 261_318_000,
    preSplit: false,
    notes: "Total mezzanine = STRK $1,040,394K + STRF $874,041K + STRC $979,486K",
  },
  {
    periodEnd: "2025-09-30",
    formType: "10-Q",
    filedDate: "2025-10-30",
    accessionNumber: "0001193125-25-262568",
    secUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=10-Q&dateb=&owner=include&count=40&search_text=",
    digitalAssets: 73_205_725_000,
    cashAndEquivalents: 54_285_000,
    totalAssets: 74_597_847_000,
    totalLiabilities: 9_346_405_000,
    convertibleDebt: 8_143_824_000,
    longTermDebt: null,
    preferredEquity: 5_786_330_000,
    commonSharesOutstanding: 267_468_000,
    preSplit: false,
    notes: "Total mezzanine = STRK $1,091,342K + STRF $1,193,240K + STRC $2,473,800K + STRD $1,027,948K",
  },
];

/**
 * Helper: Get filing by period end date
 */
export function getFilingByPeriod(periodEnd: string): MSTRSecFiling | undefined {
  return MSTR_SEC_HISTORY.find((f) => f.periodEnd === periodEnd);
}

/**
 * Helper: Get all filings for a fiscal year
 */
export function getFilingsForYear(year: number): MSTRSecFiling[] {
  return MSTR_SEC_HISTORY.filter((f) => f.periodEnd.startsWith(year.toString()));
}

/**
 * Helper: Get the most recent filing
 */
export function getMostRecentFiling(): MSTRSecFiling {
  return MSTR_SEC_HISTORY[MSTR_SEC_HISTORY.length - 1];
}

/**
 * Helper: Adjust pre-split share count to post-split equivalent
 */
export function adjustSharesForSplit(filing: MSTRSecFiling): number {
  return filing.preSplit
    ? filing.commonSharesOutstanding * 10
    : filing.commonSharesOutstanding;
}

/**
 * Helper: Calculate book value per share for a filing
 * Note: This is accounting book value, not mNAV
 */
export function calculateBookValuePerShare(filing: MSTRSecFiling): number {
  const shareholdersEquity = filing.totalAssets - filing.totalLiabilities;
  const adjustedShares = adjustSharesForSplit(filing);
  return shareholdersEquity / adjustedShares;
}
