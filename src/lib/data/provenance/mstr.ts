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
  // CASH RESERVES - from 8-K (USD Reserve for dividends/interest)
  // Note: This value comes from periodic 8-K updates about cash position
  // =========================================================================
  cashReserves: pv(2_250_000_000, docSource({
    type: "sec-document",
    url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/${JAN_2026_8K.replace(/-/g, "")}/`,
    quote: "$2.25 billion",
    anchor: "USD Reserve",  // Search term to find cash position section
    cik: MSTR_CIK,
    accession: JAN_2026_8K,
    filingType: "8-K",
    filingDate: JAN_2026_8K_FILED,
    documentDate: "2026-01-04",
  })),

  // =========================================================================
  // PREFERRED EQUITY - from XBRL + post-Q3 8-Ks
  // =========================================================================
  preferredEquity: pv(8_382_000_000, derivedSource({
    derivation: "Q3 2025 XBRL cumulative proceeds + post-Q3 issuances from 8-Ks",
    formula: "xbrlPreferredProceeds + postQ3Issuances",
    inputs: {
      xbrlPreferredProceeds: pv(5_890_000_000, xbrlSource({
        fact: "us-gaap:ProceedsFromIssuanceOfPreferredStockAndPreferenceStock",
        rawValue: 5_890_000_000,
        unit: "USD",
        periodType: "duration",
        periodStart: "2025-01-01",
        periodEnd: "2025-09-30",
        cik: MSTR_CIK,
        accession: Q3_2025_10Q,
        filingType: "10-Q",
        filingDate: Q3_2025_FILED,
      })),
      postQ3Issuances: pv(2_492_000_000, docSource({
        type: "company-website",
        url: "https://www.strategy.com/credit",
        quote: "Post-Q3 preferred issuances aggregated from strategy.com/credit",
        documentDate: "2026-01-26",
      })),
    },
  })),
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
