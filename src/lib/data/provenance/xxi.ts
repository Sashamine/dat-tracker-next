/**
 * XXI (Twenty One Capital) - Provenance-tracked data
 *
 * BTC treasury launched Dec 2025 via Tether/SoftBank/Cantor merger.
 * Dual-class share structure (Class A + Class B).
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

// SEC CIK for XXI
export const XXI_CIK = "2070457";

// Helper to build full SEC document URL
const secDocUrl = (cik: string, accession: string, doc: string) =>
  `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${doc}`;

// =========================================================================
// MERGER DATA (Dec 9, 2025) - from 8-K Dec 12, 2025
// =========================================================================
const MERGER_8K_ACCESSION = "0001213900-25-121293";
const MERGER_8K_FILED = "2025-12-12";
const MERGER_CLOSE_DATE = "2025-12-09";

// =========================================================================
// 10-Q DATA (filed Dec 19, 2025, stub period as of Dec 9, 2025)
// =========================================================================
const Q4_2025_10Q_ACCESSION = "0001213900-25-123918";
const Q4_2025_10Q_FILED = "2025-12-19";
const Q4_2025_PERIOD_END = "2025-12-09";

// Holdings at merger close
const HOLDINGS = 43_514;
const HOLDINGS_DATE = "2025-12-09";

// Dual-class shares from 10-Q XBRL
const CLASS_A_SHARES = 346_548_153;
const CLASS_B_SHARES = 304_842_759;
const TOTAL_SHARES = CLASS_A_SHARES + CLASS_B_SHARES; // 651,390,912

// Financial data
const TOTAL_DEBT = 486_500_000; // $486.5M convertible notes
const CASH_RESERVES = 119_300_000; // $119.3M
const COST_BASIS_AVG = 91_509; // Blended cost basis from S-1

/**
 * XXI Financial Data with Full Provenance
 */
export const XXI_PROVENANCE: ProvenanceFinancials = {
  // =========================================================================
  // BTC HOLDINGS - from merger close calculation
  // Tether (24,500) + Bitfinex (7,000) + PIPE Bitcoin (~11,533) + In-Kind (~481) = 43,514
  // =========================================================================
  holdings: pv(
    HOLDINGS,
    docSource({
      type: "sec-document",
      searchTerm: "31,500",
      url: secDocUrl(XXI_CIK, MERGER_8K_ACCESSION, "ea0228850-8k_twentyone.htm"),
      quote: "31,500 BTC contributed + PIPE BTC purchases",
      anchor: "Business Combination",
      cik: XXI_CIK,
      accession: MERGER_8K_ACCESSION,
      filingType: "8-K",
      filingDate: MERGER_8K_FILED,
      documentDate: MERGER_CLOSE_DATE,
    }),
    "Tether (24,500) + Bitfinex (7,000) = 31,500 contributed. Plus ~12,014 from PIPE (bitcoin + in-kind)."
  ),

  // =========================================================================
  // COST BASIS - from S-1 Jan 2026
  // Blended: ~42K BTC at $90,560 (merger FV) + post-close at higher prices
  // =========================================================================
  costBasisAvg: pv(
    COST_BASIS_AVG,
    docSource({
      type: "sec-document",
      searchTerm: "90,560.40",
      url: "https://www.sec.gov/Archives/edgar/data/2070457/000121390026001285/ea0270549-s1_twenty.htm",
      quote: "Bitcoin valued at $90,560.40 per BTC (Closing date Dec 8, 2025)",
      anchor: "Fair Value",
      cik: XXI_CIK,
      accession: "0001213900-26-001285",
      filingType: "S-1",
      filingDate: "2026-01-05",
      documentDate: MERGER_CLOSE_DATE,
    }),
    "Blended cost: ~42K at merger FV + PIPE purchases at market prices."
  ),

  // =========================================================================
  // SHARES OUTSTANDING - from 10-Q XBRL
  // Dual-class structure: Class A (public) + Class B (founders/sponsors)
  // =========================================================================
  sharesOutstanding: pv(
    TOTAL_SHARES,
    xbrlSource({
      fact: "dei:EntityCommonStockSharesOutstanding",
      searchTerm: "651,390,912",
      rawValue: TOTAL_SHARES,
      unit: "shares",
      periodType: "instant",
      periodEnd: Q4_2025_PERIOD_END,
      cik: XXI_CIK,
      accession: Q4_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q4_2025_10Q_FILED,
      documentAnchor: "shares of common stock outstanding",
    }),
    `Class A: ${CLASS_A_SHARES.toLocaleString()} + Class B: ${CLASS_B_SHARES.toLocaleString()} = ${TOTAL_SHARES.toLocaleString()} total`
  ),

  // =========================================================================
  // TOTAL DEBT - $486.5M 1% Convertible Senior Secured Notes due 2030
  // Collateralized by 16,116.32 BTC (~3:1 ratio)
  // =========================================================================
  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "sec-document",
      searchTerm: "486,500,000",
      url: secDocUrl(XXI_CIK, MERGER_8K_ACCESSION, "ea0228850-8k_twentyone.htm"),
      quote: "$486.5 million aggregate principal amount",
      anchor: "Convertible Notes",
      cik: XXI_CIK,
      accession: MERGER_8K_ACCESSION,
      filingType: "8-K",
      filingDate: MERGER_8K_FILED,
      documentDate: MERGER_CLOSE_DATE,
    }),
    "1.00% Convertible Senior Secured Notes due 2030. Conversion rate: 72.0841 shares/$1,000 (~$13.87 strike). Collateralized by 16,116.32 BTC."
  ),

  // =========================================================================
  // CASH RESERVES - from S-1 (no 10-Q balance sheet yet)
  // =========================================================================
  cashReserves: pv(
    CASH_RESERVES,
    docSource({
      type: "sec-document",
      searchTerm: "119.3",
      url: "https://www.sec.gov/Archives/edgar/data/2070457/000121390026001285/ea0270549-s1_twenty.htm",
      quote: "$119.3 million in cash",
      anchor: "Cash",
      cik: XXI_CIK,
      accession: "0001213900-26-001285",
      filingType: "S-1",
      filingDate: "2026-01-05",
      documentDate: MERGER_CLOSE_DATE,
    }),
    "Estimated cash at merger close. Awaiting Q4 2025 10-K for verified figure."
  ),

  // =========================================================================
  // PREFERRED EQUITY - None
  // =========================================================================
  preferredEquity: pv(
    0,
    docSource({
      type: "sec-document",
      url: secDocUrl(XXI_CIK, Q4_2025_10Q_ACCESSION, "xxi-20250930.htm"),
      cik: XXI_CIK,
      accession: Q4_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q4_2025_10Q_FILED,
      documentDate: Q4_2025_PERIOD_END,
    }),
    "No preferred equity issued."
  ),
};

// =========================================================================
// DEBUG INFO
// =========================================================================
export const XXI_PROVENANCE_DEBUG = {
  holdingsDate: HOLDINGS_DATE,
  balanceSheetDate: Q4_2025_PERIOD_END,
  sharesDate: Q4_2025_PERIOD_END,
  sharesBasic: TOTAL_SHARES,
  classAShares: CLASS_A_SHARES,
  classBShares: CLASS_B_SHARES,
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Get current XXI provenance (static for now, could be dynamic later)
 */
export function getXXIProvenance() {
  return XXI_PROVENANCE;
}
