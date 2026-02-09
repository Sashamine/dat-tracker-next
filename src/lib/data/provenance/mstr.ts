/**
 * MSTR (Strategy Inc.) - Provenance-tracked data
 * 
 * Every value traces back to an authoritative source.
 * Click any number → see source → verify at source.
 */

import { 
  ProvenanceFinancials, 
  pv, 
  xbrlSource, 
  docSource, 
  derivedSource 
} from "../types/provenance";

// SEC CIK for MSTR
export const MSTR_CIK = "1050446";

// Latest Q3 2025 10-Q accession
const Q3_2025_10Q = "0001193125-25-262568";
const Q3_2025_FILED = "2025-11-03";

// Latest 8-K Feb 2, 2026 (BTC holdings update)
const FEB_2026_8K = "0001193125-26-032731";
const FEB_2026_8K_FILED = "2026-02-02";

// Latest 8-K Jan 5, 2026 (Cash reserve update)
const JAN_2026_8K = "0001193125-26-001550";
const JAN_2026_8K_FILED = "2026-01-05";

/**
 * MSTR Financial Data with Full Provenance
 */
export const MSTR_PROVENANCE: ProvenanceFinancials = {
  
  // =========================================================================
  // BTC HOLDINGS - from 8-K announcement
  // Section: "BTC Update" table, Column: "Aggregate BTC Holdings"
  // =========================================================================
  holdings: pv(713_502, docSource({
    type: "sec-document",
    url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/${FEB_2026_8K.replace(/-/g, "")}/mstr-20260131.htm`,
    quote: "713,502",
    anchor: "Aggregate BTC Holdings",  // Column header - consistent across 8-Ks
    cik: MSTR_CIK,
    accession: FEB_2026_8K,
    filingType: "8-K",
    filingDate: FEB_2026_8K_FILED,
    documentDate: "2026-02-01",
  })),

  // =========================================================================
  // HOLDINGS VALUE - from XBRL (IndefiniteLivedIntangibleAssets)
  // =========================================================================
  holdingsValue: pv(73_210_000_000, xbrlSource({
    fact: "us-gaap:IndefiniteLivedIntangibleAssetsExcludingGoodwill",
    rawValue: 73_210_000_000,
    unit: "USD",
    periodType: "instant",
    periodEnd: "2025-09-30",
    cik: MSTR_CIK,
    accession: Q3_2025_10Q,
    filingType: "10-Q",
    filingDate: Q3_2025_FILED,
  })),

  // =========================================================================
  // COST BASIS - directly from 8-K table
  // Section: "BTC Update" table, Column: "Average Purchase Price"
  // =========================================================================
  costBasisAvg: pv(76_052, docSource({
    type: "sec-document",
    url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/${FEB_2026_8K.replace(/-/g, "")}/mstr-20260131.htm`,
    quote: "$76,052",
    anchor: "Average Purchase Price",  // Column header - consistent across 8-Ks
    cik: MSTR_CIK,
    accession: FEB_2026_8K,
    filingType: "8-K",
    filingDate: FEB_2026_8K_FILED,
    documentDate: "2026-02-01",
  })),

  // =========================================================================
  // TOTAL COST BASIS - from 8-K table
  // Section: "BTC Update" table, Column: "Aggregate Purchase Price (in billions)"
  // =========================================================================
  totalCostBasis: pv(54_260_000_000, docSource({
    type: "sec-document",
    url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/${FEB_2026_8K.replace(/-/g, "")}/mstr-20260131.htm`,
    quote: "$54.26",
    anchor: "Aggregate Purchase Price",  // Column header - value shown in billions
    cik: MSTR_CIK,
    accession: FEB_2026_8K,
    filingType: "8-K",
    filingDate: FEB_2026_8K_FILED,
    documentDate: "2026-02-01",
  })),

  // =========================================================================
  // QUARTERLY BURN - DERIVED from XBRL (YTD cash flow ÷ 3)
  // =========================================================================
  quarterlyBurn: pv(15_200_000, derivedSource({
    derivation: "YTD operating cash outflow ÷ 3 quarters",
    formula: "Math.abs(ytdOperatingCashFlow) / 3",
    inputs: {
      ytdOperatingCashFlow: pv(-45_612_000, xbrlSource({
        fact: "us-gaap:NetCashProvidedByUsedInOperatingActivities",
        rawValue: -45_612_000,
        unit: "USD",
        periodType: "duration",
        periodStart: "2025-01-01",
        periodEnd: "2025-09-30",
        cik: MSTR_CIK,
        accession: Q3_2025_10Q,
        filingType: "10-Q",
        filingDate: Q3_2025_FILED,
      })),
    },
  }), "Quarterly average - actual quarters may vary"),

  // =========================================================================
  // SHARES OUTSTANDING - from XBRL (weighted average for Q3)
  // Note: This is weighted avg for Q3. Current shares higher due to ATM issuances.
  // For real-time, see strategy.com/shares which aggregates 8-K ATM disclosures.
  // =========================================================================
  sharesOutstanding: pv(284_376_000, xbrlSource({
    fact: "us-gaap:WeightedAverageNumberOfSharesOutstandingBasic",
    rawValue: 284_376_000,
    unit: "shares",
    periodType: "duration",
    periodStart: "2025-07-01",
    periodEnd: "2025-09-30",
    cik: MSTR_CIK,
    accession: Q3_2025_10Q,
    filingType: "10-Q",
    filingDate: Q3_2025_FILED,
  }), "Q3 2025 weighted avg. Current ~332M after ATM issuances."),

  // =========================================================================
  // TOTAL DEBT - from XBRL (LongTermDebt)
  // =========================================================================
  totalDebt: pv(8_173_903_000, xbrlSource({
    fact: "us-gaap:LongTermDebt",
    rawValue: 8_173_903_000,
    unit: "USD",
    periodType: "instant",
    periodEnd: "2025-09-30",
    cik: MSTR_CIK,
    accession: Q3_2025_10Q,
    filingType: "10-Q",
    filingDate: Q3_2025_FILED,
  })),

  // =========================================================================
  // CASH & EQUIVALENTS - from XBRL (balance sheet cash)
  // Note: This is balance sheet cash, not earmarked reserves
  // =========================================================================
  cashReserves: pv(46_343_000, xbrlSource({
    fact: "us-gaap:CashAndCashEquivalentsAtCarryingValue",
    rawValue: 46_343_000,
    unit: "USD",
    periodType: "instant",
    periodEnd: "2025-09-30",
    cik: MSTR_CIK,
    accession: Q3_2025_10Q,
    filingType: "10-Q",
    filingDate: Q3_2025_FILED,
  }), "Balance sheet cash. Operational funds, not earmarked reserves."),

  // =========================================================================
  // PREFERRED EQUITY - Full SEC Provenance
  // Calculation: Direct Offerings (424B5) + ATM Sales (Authorization - Available)
  // =========================================================================
  preferredEquity: pv(8_245_000_000, derivedSource({
    derivation: "SEC-verified: Direct underwritten offerings (424B5) + ATM sales (Authorization 424B5 - Available 8-K)",
    formula: "directOfferings + atmSales",
    inputs: {
      // Direct underwritten offerings from 424B5 filings
      directOfferings: pv(6_332_581_100, derivedSource({
        derivation: "Sum of 5 underwritten preferred offerings from SEC 424B5 filings",
        formula: "STRK + STRF + STRD + STRC + STRE",
        inputs: {
          STRK: pv(730_000_000, docSource({
            type: "sec-document",
            url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/000119312525018819/`,
            quote: "7,300,000 shares at $100",
            cik: MSTR_CIK,
            accession: "0001193125-25-018819",
            filingType: "424B5",
            filingDate: "2025-02-03",
            documentDate: "2025-02-03",
          })),
          STRF: pv(850_000_000, docSource({
            type: "sec-document",
            url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/000119312525060332/`,
            quote: "8,500,000 shares at $100",
            cik: MSTR_CIK,
            accession: "0001193125-25-060332",
            filingType: "424B5",
            filingDate: "2025-03-21",
            documentDate: "2025-03-21",
          })),
          STRD: pv(1_176_470_000, docSource({
            type: "sec-document",
            url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/000119312525137186/`,
            quote: "11,764,700 shares at $100",
            cik: MSTR_CIK,
            accession: "0001193125-25-137186",
            filingType: "424B5",
            filingDate: "2025-06-06",
            documentDate: "2025-06-06",
          })),
          STRC: pv(2_801_111_100, docSource({
            type: "sec-document",
            url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/000119312525165531/`,
            quote: "28,011,111 shares at $100",
            cik: MSTR_CIK,
            accession: "0001193125-25-165531",
            filingType: "424B5",
            filingDate: "2025-07-25",
            documentDate: "2025-07-25",
          })),
          STRE: pv(775_000_000, docSource({
            type: "sec-document",
            url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/000119312525272591/`,
            quote: "7,750,000 shares at $100",
            cik: MSTR_CIK,
            accession: "0001193125-25-272591",
            filingType: "424B5",
            filingDate: "2025-11-07",
            documentDate: "2025-11-07",
          })),
        },
      })),
      // ATM sales = Authorization (424B5) - Available (8-K)
      atmSales: pv(1_912_900_000, derivedSource({
        derivation: "ATM sales = Authorization (424B5 registrations) - Available for Issuance (8-K Jan 26 2026)",
        formula: "(STRK_auth - STRK_avail) + (STRF_auth - STRF_avail) + (STRD_auth - STRD_avail) + (STRC_auth - STRC_avail)",
        inputs: {
          STRK_atmSold: pv(668_400_000, docSource({
            type: "sec-document",
            url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/000119312526021726/`,
            quote: "STRK: $21B auth (0001193125-25-050408) - $20.33B available = $668M sold",
            cik: MSTR_CIK,
            accession: "0001193125-26-021726",
            filingType: "8-K",
            filingDate: "2026-01-26",
            documentDate: "2026-01-26",
          })),
          STRF_atmSold: pv(480_700_000, docSource({
            type: "sec-document",
            url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/000119312526021726/`,
            quote: "STRF: $2.1B auth (0001193125-25-124554) - $1.62B available = $481M sold",
            cik: MSTR_CIK,
            accession: "0001193125-26-021726",
            filingType: "8-K",
            filingDate: "2026-01-26",
            documentDate: "2026-01-26",
          })),
          STRD_atmSold: pv(185_200_000, docSource({
            type: "sec-document",
            url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/000119312526021726/`,
            quote: "STRD: $4.2B auth (0001193125-25-263719) - $4.01B available = $185M sold",
            cik: MSTR_CIK,
            accession: "0001193125-26-021726",
            filingType: "8-K",
            filingDate: "2026-01-26",
            documentDate: "2026-01-26",
          })),
          STRC_atmSold: pv(578_600_000, docSource({
            type: "sec-document",
            url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/000119312526021726/`,
            quote: "STRC: $4.2B auth (0001193125-25-263719) - $3.62B available = $579M sold",
            cik: MSTR_CIK,
            accession: "0001193125-26-021726",
            filingType: "8-K",
            filingDate: "2026-01-26",
            documentDate: "2026-01-26",
          })),
        },
      })),
    },
  }), "SEC-verified: $8.245B. Strategy.com claims $8.389B - discrepancy of $144M (1.7%) flagged."),
};

/**
 * Get provenance data for a specific MSTR field
 */
export function getMSTRProvenance<K extends keyof ProvenanceFinancials>(
  field: K
): ProvenanceFinancials[K] {
  return MSTR_PROVENANCE[field];
}

/**
 * Export all MSTR provenance fields as array for iteration
 */
export function getMSTRProvenanceFields(): Array<{
  field: string;
  data: ProvenanceFinancials[keyof ProvenanceFinancials];
}> {
  return Object.entries(MSTR_PROVENANCE)
    .filter(([_, v]) => v !== undefined)
    .map(([field, data]) => ({ field, data }));
}
