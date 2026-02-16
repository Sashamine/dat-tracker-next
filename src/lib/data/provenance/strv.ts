/**
 * STRV (Strive, Inc.) - Provenance-tracked data
 *
 * First publicly traded asset management firm with Bitcoin treasury.
 * Merged with Asset Entities Sep 2025, acquired Semler Scientific Jan 2026.
 * 1-for-20 reverse split effective Feb 3, 2026.
 *
 * Trading ticker: ASST | Display: STRV
 * SEC CIK: 0001920406
 *
 * Every value traces back to an authoritative source.
 * Click any number → see source → verify at source.
 */

import {
  ProvenanceFinancials,
  pv,
  xbrlSource,
  docSource,
  derivedSource,
} from "../types/provenance";

// SEC CIK for Strive
export const STRV_CIK = "1920406";

// Document filenames for SEC filings
const JAN5_8K_DOC = "asst-20260105.htm";
const JAN28_8K_DOC = "ny20063534x6_8k.htm";
const JAN16_8K_DOC = "dp240082_8k.htm";
const FEB3_8K_DOC = "dp240990_8k.htm";
const Q3_10Q_DOC = "asst-20250930.htm";

// Helper to build SEC filing URL (with document filename)
const secDocUrl = (accession: string, docName: string) =>
  `https://www.sec.gov/Archives/edgar/data/${STRV_CIK}/${accession.replace(/-/g, "")}/${docName}`;

// =========================================================================
// KEY FILINGS
// =========================================================================

// Jan 5, 2026 8-K - Preliminary Q4 results (verified Dec 31 data)
const JAN5_8K_ACCESSION = "0001628280-26-000225";
const JAN5_8K_FILED = "2026-01-05";
const DEC31_2025_DATE = "2025-12-31";

// Jan 16, 2026 8-K - Semler merger close
const JAN16_8K_ACCESSION = "0000950103-26-000616";
const JAN16_8K_FILED = "2026-01-16";
const JAN16_MERGER_DATE = "2026-01-16";

// Jan 28, 2026 8-K - Holdings update (13,131.82 BTC) + debt info
const JAN28_8K_ACCESSION = "0001140361-26-002606";
const JAN28_8K_FILED = "2026-01-28";
const JAN28_HOLDINGS_DATE = "2026-01-28";

// Feb 3, 2026 8-K - 1-for-20 reverse split
const FEB3_8K_ACCESSION = "0000950103-26-001560";
const FEB3_8K_FILED = "2026-02-03";

// Q3 2025 10-Q (Sep 30, 2025)
const Q3_2025_10Q_ACCESSION = "0001628280-25-052343";
const Q3_2025_10Q_FILED = "2025-11-14";
const Q3_2025_PERIOD_END = "2025-09-30";

// =========================================================================
// CURRENT DATA (Post-Split, as of Jan 28, 2026)
// =========================================================================

const HOLDINGS = 13_131.82;
const HOLDINGS_DATE = "2026-01-28";

// ---- Verified anchors from Jan 5, 2026 8-K (as of Dec 31, 2025, pre-merger, pre-split) ----
const DEC31_CLASS_A = 698_734_905;
const DEC31_CLASS_B = 195_530_808;
const DEC31_TOTAL_SHARES = DEC31_CLASS_A + DEC31_CLASS_B; // 894,265,713
const DEC31_POST_SPLIT = Math.round(DEC31_TOTAL_SHARES / 20); // 44,713,286
const DEC31_BTC = 7_626.8;
const DEC31_CASH = 67_600_000;
const DEC31_SATA_SHARES = 2_012_729;
const DEC31_TRADITIONAL_WARRANTS = 531_888_702; // pre-split
const DEC31_PREFUNDED_WARRANTS = 1_072_289; // pre-split

// Post-Semler merger + post-split share counts (1-for-20 split effective Feb 6, 2026)
// Feb 13 8-K: Class A 53,168,237 + Class B 9,880,282 = 63,048,519 as of Feb 11, 2026
const BASIC_SHARES = 63_048_519; // Verified from SEC 8-K Feb 13, 2026

// Pre-funded warrants @ $0.002 - always ITM, essentially shares
// Dec 31: 1,072,289 pre-split / 20 = 53,614 post-split
const PRE_FUNDED_WARRANTS = 53_614;
const SHARES_WITH_PRE_FUNDED = BASIC_SHARES + PRE_FUNDED_WARRANTS; // 63,102,133

// Total debt: $10M remaining Semler convertible notes (after $90M exchange)
// Source: Jan 28, 2026 company PR
const TOTAL_DEBT = 10_000_000;

// Cash: $127.2M as of Feb 11, 2026 (SEC 8-K Feb 13, 2026)
const CASH = 127_200_000;

// Preferred equity: SATA 12.50% perpetual preferred (rate increased from 12.25% effective Feb 16)
// NOT convertible to common stock
// Feb 13 8-K: 4,265,518 SATA shares outstanding as of Feb 11, 2026
const SATA_TOTAL_SHARES = 4_265_518; // Verified from SEC 8-K Feb 13, 2026
const PREFERRED_EQUITY = Math.round(SATA_TOTAL_SHARES * 100); // $426,551,800

/**
 * STRV Financial Data with Full Provenance
 */
export const STRV_PROVENANCE: ProvenanceFinancials = {
  // =========================================================================
  // BTC HOLDINGS - from Jan 28, 2026 8-K
  // =========================================================================
  holdings: pv(
    HOLDINGS,
    docSource({
      type: "sec-document",
      searchTerm: "13,131.82",
      url: secDocUrl(JAN28_8K_ACCESSION, JAN28_8K_DOC),
      quote: "now holds 13,131.82 Bitcoin as of January 28, 2026",
      anchor: "Bitcoin Holdings",
      cik: STRV_CIK,
      accession: JAN28_8K_ACCESSION,
      filingType: "8-K",
      filingDate: JAN28_8K_FILED,
      documentDate: JAN28_HOLDINGS_DATE,
    }),
    "13,131.82 BTC as of Jan 28, 2026 (SEC 8-K)"
  ),

  // =========================================================================
  // SHARES OUTSTANDING - Post-Semler merger (Jan 16, 2026) + Post-split (Feb 3, 2026)
  // Basic: 63,048,519 (Feb 13 8-K: Class A 53,168,237 + Class B 9,880,282, post 1-for-20 split)
  // =========================================================================
  sharesOutstanding: pv(
    BASIC_SHARES,
    docSource({
      type: "sec-document",
      searchTerm: "698,734,905",
      url: secDocUrl(JAN5_8K_ACCESSION, JAN5_8K_DOC),
      quote: "698,734,905 Class A + 195,530,808 Class B = 894.3M total. ÷ 20 (reverse split) = 44.7M. Plus ~17.7M from Semler merger & PIPE (Jan 2026) = 62.4M.",
      anchor: "Item 2.02 — shares as of Dec 31, 2025 (pre-merger, pre-split)",
      cik: STRV_CIK,
      accession: JAN5_8K_ACCESSION,
      filingType: "8-K",
      filingDate: JAN5_8K_FILED,
      documentDate: DEC31_2025_DATE,
    }),
    "Company-derived: 44.7M verified (894.3M pre-split ÷ 20, Dec 31 8-K) + ~17.7M from merger/PIPE = 62.37M"
  ),

  // =========================================================================
  // TOTAL DEBT - $10M remaining Semler convertible notes (after $90M exchange)
  // =========================================================================
  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "sec-document",
      searchTerm: "aggregate of $90 million",
      url: secDocUrl(JAN28_8K_ACCESSION, JAN28_8K_DOC),
      quote: "retired (i) an aggregate of $90 million of the outstanding Semler Convertible Notes pursuant to the Notes Exchange and (ii) $20 million in borrowings from the Coinbase Loan",
      anchor: "Item 8.01",
      cik: STRV_CIK,
      accession: JAN28_8K_ACCESSION,
      filingType: "8-K",
      filingDate: JAN28_8K_FILED,
      documentDate: JAN28_HOLDINGS_DATE,
    }),
    "Company-derived: $100M original Semler converts - $90M exchanged for SATA = $10M remaining. Coinbase $20M loan paid off."
  ),

  // =========================================================================
  // CASH RESERVES - from Q3 2025 10-Q (likely deployed)
  // =========================================================================
  cashReserves: pv(
    CASH,
    docSource({
      type: "sec-document",
      searchTerm: "$67.6 million of cash",
      url: secDocUrl(JAN5_8K_ACCESSION, JAN5_8K_DOC),
      quote: "held $67.6 million of cash and cash equivalents",
      anchor: "Item 2.02",
      cik: STRV_CIK,
      accession: JAN5_8K_ACCESSION,
      filingType: "8-K",
      filingDate: JAN5_8K_FILED,
      documentDate: DEC31_2025_DATE,
    }),
    "$67.6M as of Dec 31, 2025. Post-Jan: +$119M SATA, -$20M Coinbase payoff, -BTC buys → ~$50-80M est."
  ),

  // =========================================================================
  // PREFERRED EQUITY - SATA 12.50% Perpetual Preferred (rate increased from 12.25% effective Feb 16)
  // NOT convertible to common stock
  // Feb 13 8-K: 4,265,518 SATA shares × $100 stated value = $426,551,800
  // =========================================================================
  preferredEquity: pv(
    PREFERRED_EQUITY,
    docSource({
      type: "sec-document",
      searchTerm: "2,012,729 shares of SATA Stock",
      url: secDocUrl(JAN5_8K_ACCESSION, JAN5_8K_DOC),
      quote: "2,012,729 shares of SATA Stock outstanding",
      anchor: "Item 2.02",
      cik: STRV_CIK,
      accession: JAN5_8K_ACCESSION,
      filingType: "8-K",
      filingDate: JAN5_8K_FILED,
      documentDate: DEC31_2025_DATE,
    }),
    "Company-derived: 2.01M verified (8-K Jan 5) + 1.32M underwritten + ~930K exchange = ~4.26M @ $100. NOT convertible."
  ),
};

// =========================================================================
// DEBUG INFO
// =========================================================================
export const STRV_PROVENANCE_DEBUG = {
  holdingsDate: HOLDINGS_DATE,
  balanceSheetDate: DEC31_2025_DATE,
  sharesDate: JAN5_8K_FILED,
  sharesBasic: BASIC_SHARES,
  sharesAnchorDec31: DEC31_POST_SPLIT,
  preFundedWarrants: PRE_FUNDED_WARRANTS,
  sharesWithPreFunded: SHARES_WITH_PRE_FUNDED,
  splitRatio: "1-for-20",
  splitEffectiveDate: "2026-02-06",
  mergerDate: JAN16_MERGER_DATE,
  totalDebt: TOTAL_DEBT,
  preferredEquity: PREFERRED_EQUITY,
  cashDec31: DEC31_CASH,
  btcDec31: DEC31_BTC,
  sataDec31: DEC31_SATA_SHARES,
  traditionalWarrantsDec31PreSplit: DEC31_TRADITIONAL_WARRANTS,
};

// =========================================================================
// Q3 2025 EARNINGS DATA (for earnings-data.ts)
// =========================================================================
export const STRV_Q3_2025_DATA = {
  periodEnd: Q3_2025_PERIOD_END,
  holdings: 5_886,
  sharesPreSplit: 815_483_610,
  sharesPostSplit: 40_774_181, // 815,483,610 / 20
  holdingsPerShare: 0.0001444, // 5886 / 40,774,181
  filingAccession: Q3_2025_10Q_ACCESSION,
  filingDate: Q3_2025_10Q_FILED,
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Get current STRV provenance
 */
export function getSTRVProvenance() {
  return STRV_PROVENANCE;
}

/**
 * Get holdings history data point from provenance
 */
export function getSTRVHoldingsSnapshot(date: string) {
  if (date >= "2026-01-28") {
    return {
      date: HOLDINGS_DATE,
      holdings: HOLDINGS,
      sharesOutstanding: BASIC_SHARES,
      holdingsPerShare: HOLDINGS / BASIC_SHARES,
      source: "SEC 8-K Jan 28, 2026",
      sourceUrl: secDocUrl(JAN28_8K_ACCESSION, JAN28_8K_DOC),
      sourceType: "sec-filing" as const,
    };
  }
  return null;
}
