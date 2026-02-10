/**
 * MSTR (Strategy Inc.) - Provenance-tracked data
 * 
 * Uses verified data from:
 * - mstr-verified-financials.ts (consolidated holdings/shares from SEC filings)
 * - mstr-atm-sales.ts (share issuances from SEC 8-K filings)
 * - mstr-capital-structure.ts (debt/preferred from SEC filings)
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
import { 
  getMSTRLatestFinancials, 
  MSTR_VERIFIED_STATS,
  CLASS_B_SHARES 
} from "../mstr-verified-financials";
import { MSTR_ATM_SALES } from "../mstr-atm-sales";
import { EMPLOYEE_EQUITY_STATS } from "../mstr-employee-equity";

// SEC CIK for MSTR
export const MSTR_CIK = "1050446";

// Get latest from verified financials (single source of truth)
const latestFinancials = getMSTRLatestFinancials();
if (!latestFinancials) {
  throw new Error("No verified financials available for MSTR");
}

// Extract values from verified financials
const LATEST_HOLDINGS = latestFinancials.holdings.value;
const LATEST_HOLDINGS_DATE = latestFinancials.date;
const LATEST_HOLDINGS_ACCESSION = `0001193125-26-${latestFinancials.holdings.accession}`;
const CURRENT_SHARES = latestFinancials.shares.total;

// Q3 2025 10-Q baseline for provenance details
const Q3_2025_10Q = "0001193125-25-262568";
const Q3_2025_FILED = "2025-11-03";
const Q3_COVER_PAGE_DATE = "2025-10-29";

// Get ATM shares post-Q3 for provenance breakdown
const postQ3AtmShares = MSTR_ATM_SALES
  .filter(sale => sale.filingDate > Q3_COVER_PAGE_DATE)
  .reduce((sum, sale) => sum + sale.shares, 0);

// strategy.com total for comparison
const STRATEGY_COM_TOTAL = 332_431_000;
const REMAINING_GAP = STRATEGY_COM_TOTAL - CURRENT_SHARES;

/**
 * MSTR Financial Data with Full Provenance
 * 
 * Data sourced from verified SEC filings - see source files for full audit trail
 */
export const MSTR_PROVENANCE: ProvenanceFinancials = {
  
  // =========================================================================
  // BTC HOLDINGS - from verified 8-K filings (mstr-holdings-verified.ts)
  // =========================================================================
  holdings: pv(LATEST_HOLDINGS, docSource({
    type: "sec-document",
    searchTerm: LATEST_HOLDINGS.toLocaleString(),
    url: `/filings/mstr/${LATEST_HOLDINGS_ACCESSION}?tab=document&q=aggregate%20BTC`,
    quote: `${LATEST_HOLDINGS.toLocaleString()} BTC`,
    anchor: "Aggregate BTC Holdings",
    cik: MSTR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: LATEST_HOLDINGS_DATE,
    documentDate: LATEST_HOLDINGS_DATE,
  }), `From mstr-verified-financials.ts (${MSTR_VERIFIED_STATS.totalSnapshots} SEC-verified snapshots)`),

  // =========================================================================
  // COST BASIS - from latest 8-K
  // =========================================================================
  costBasisAvg: pv(76_056, docSource({
    type: "sec-document",
    searchTerm: "76,056",
    url: `/filings/mstr/${LATEST_HOLDINGS_ACCESSION}?tab=document&q=average%20purchase`,
    quote: "$76,056",
    anchor: "Average Purchase Price",
    cik: MSTR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: LATEST_HOLDINGS_DATE,
    documentDate: LATEST_HOLDINGS_DATE,
  })),

  // =========================================================================
  // TOTAL COST BASIS - from latest 8-K
  // =========================================================================
  totalCostBasis: pv(54_350_000_000, docSource({
    type: "sec-document",
    searchTerm: "54.35",
    url: `/filings/mstr/${LATEST_HOLDINGS_ACCESSION}?tab=document&q=aggregate%20purchase`,
    quote: "$54.35B",
    anchor: "Aggregate Purchase Price",
    cik: MSTR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: LATEST_HOLDINGS_DATE,
    documentDate: LATEST_HOLDINGS_DATE,
  })),

  // =========================================================================
  // SHARES OUTSTANDING - from mstr-verified-financials.ts
  // Q3 10-Q baseline + post-Q3 ATM 8-Ks + Class B (constant)
  // =========================================================================
  sharesOutstanding: pv(CURRENT_SHARES, derivedSource({
    derivation: "Q3 2025 10-Q baseline + post-Q3 ATM 8-Ks + Class B",
    formula: "q3ClassABaseline + postQ3Atm + classB",
    inputs: {
      q3ClassABaseline: pv(latestFinancials.shares.breakdown?.baseline || 0, docSource({
        type: "sec-document",
        searchTerm: "267,468",
        url: `/filings/mstr/${Q3_2025_10Q}?tab=document&q=267%2C468`,
        quote: "267,468 shares (thousands) = 267.5M Class A",
        anchor: "Class A common stock from Q3 10-Q",
        cik: MSTR_CIK,
        accession: Q3_2025_10Q,
        filingType: "10-Q",
        filingDate: Q3_2025_FILED,
        documentDate: Q3_COVER_PAGE_DATE,
      })),
      postQ3Atm: pv(latestFinancials.shares.breakdown?.atmCumulative || 0, docSource({
        type: "sec-document",
        searchTerm: (latestFinancials.shares.breakdown?.atmCumulative || 0).toLocaleString(),
        url: "/filings/mstr?type=8-K&after=2025-10-29",
        quote: `${(latestFinancials.shares.breakdown?.atmCumulative || 0).toLocaleString()} shares from post-Q3 ATM`,
        anchor: "Aggregated from weekly 8-K ATM filings",
        cik: MSTR_CIK,
        filingType: "8-K",
        documentDate: latestFinancials.date,
      })),
      classB: pv(CLASS_B_SHARES, docSource({
        type: "sec-document",
        searchTerm: "19,640,250",
        url: `/filings/mstr/${Q3_2025_10Q}?tab=document&q=Class%20B`,
        quote: `${CLASS_B_SHARES.toLocaleString()} Class B shares`,
        anchor: "Class B common stock (constant)",
        cik: MSTR_CIK,
        accession: Q3_2025_10Q,
        filingType: "10-Q",
        filingDate: Q3_2025_FILED,
        documentDate: Q3_COVER_PAGE_DATE,
      })),
    },
  }), `SEC-verified: Q3 baseline + ${((latestFinancials.shares.breakdown?.atmCumulative || 0) / 1e6).toFixed(1)}M post-Q3 ATM + 19.6M Class B`),

  // =========================================================================
  // QUARTERLY BURN - from Q3 2025 10-Q XBRL
  // =========================================================================
  quarterlyBurn: pv(15_200_000, derivedSource({
    derivation: "YTD operating cash outflow ÷ 3 quarters",
    formula: "Math.abs(ytdOperatingCashFlow) / 3",
    inputs: {
      ytdOperatingCashFlow: pv(-45_612_000, xbrlSource({
        fact: "us-gaap:NetCashProvidedByUsedInOperatingActivities",
        searchTerm: "45,612",
        rawValue: -45_612_000,
        unit: "USD",
        periodType: "duration",
        periodStart: "2025-01-01",
        periodEnd: "2025-09-30",
        cik: MSTR_CIK,
        accession: Q3_2025_10Q,
        filingType: "10-Q",
        filingDate: Q3_2025_FILED,
        documentAnchor: "Net cash used in operating activities",
      })),
    },
  }), "Quarterly average - actual quarters may vary"),

  // =========================================================================
  // TOTAL DEBT - from Q3 2025 10-Q XBRL
  // TODO: Update after Q4 2025 10-K (new convertible issuances)
  // =========================================================================
  totalDebt: pv(8_173_903_000, xbrlSource({
    fact: "us-gaap:LongTermDebt",
    searchTerm: "8,173,903",
    rawValue: 8_173_903_000,
    unit: "USD",
    periodType: "instant",
    periodEnd: "2025-09-30",
    cik: MSTR_CIK,
    accession: Q3_2025_10Q,
    filingType: "10-Q",
    filingDate: Q3_2025_FILED,
    documentAnchor: "(5) Long-term Debt",
  }), "As of Sep 30, 2025. Pending Q4 2025 update."),

  // =========================================================================
  // CASH - USD Reserve from Jan 2026 8-K
  // This is cash earmarked for preferred dividends + debt interest
  // =========================================================================
  cashReserves: pv(2_250_000_000, docSource({
    type: "sec-document",
    searchTerm: "2.25",
    url: "/filings/mstr/0001193125-26-001550?tab=document&q=USD%20Reserve",
    quote: "USD Reserve was $2.25 billion",
    anchor: "USD Reserve",
    cik: MSTR_CIK,
    accession: "0001193125-26-001550",
    filingType: "8-K",
    filingDate: "2026-01-05",
    documentDate: "2026-01-04",
  }), "USD Reserve for dividends/interest. As of Jan 4, 2026."),

  // =========================================================================
  // PREFERRED EQUITY - from SEC filings
  // Q3 10-Q cumulative + post-Q3 issuances from 8-K filings
  // =========================================================================
  preferredEquity: pv(8_278_130_000, derivedSource({
    derivation: "Q3 2025 10-Q cumulative + post-Q3 issuances (STRE 8-K + ATM 8-Ks)",
    formula: "Q3_cumulative + STRE_Nov13 + post_Q3_ATM",
    inputs: {
      q3Cumulative: pv(5_786_330_000, docSource({
        type: "sec-document",
        searchTerm: "5,786,330",
        url: `/filings/mstr/${Q3_2025_10Q}?tab=document&q=Total%20mezzanine`,
        quote: "$5,786,330 (thousands) = $5.786B Total mezzanine equity",
        anchor: "Total mezzanine equity",
        cik: MSTR_CIK,
        accession: Q3_2025_10Q,
        filingType: "10-Q",
        filingDate: Q3_2025_FILED,
        documentDate: Q3_COVER_PAGE_DATE,
      })),
      streNov13: pv(716_800_000, docSource({
        type: "sec-document",
        searchTerm: "716.8",
        url: "https://www.sec.gov/Archives/edgar/data/1050446/000119312525280178/d205736d8k.htm#:~:text=gross%20proceeds%20from%20the%20Offering%20were%20approximately",
        quote: "gross proceeds ~€620.0M ($716.8M)",
        anchor: "STRE Offering 8-K",
        cik: MSTR_CIK,
        accession: "0001193125-25-280178",
        filingType: "8-K",
        filingDate: "2025-11-13",
        documentDate: "2025-11-12",
      })),
      postQ3Atm: pv(1_775_000_000, docSource({
        type: "sec-document",
        searchTerm: "1,775",
        url: "/filings/mstr?type=8-K&after=2025-10-29",
        quote: "Sum of ~$1.775B from post-Q3 preferred ATM 8-Ks",
        anchor: "Aggregated from multiple weekly 8-K filings",
        cik: MSTR_CIK,
        filingType: "8-K",
        documentDate: "2026-01-26",
      })),
    },
  }), "SEC-verified: $8.278B (Q3 $5.786B + STRE $0.717B + ATM $1.78B)"),
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

/**
 * Debug: Show current values and share breakdown
 */
export const MSTR_PROVENANCE_DEBUG = {
  holdings: LATEST_HOLDINGS,
  holdingsDate: LATEST_HOLDINGS_DATE,
  shares: {
    verifiedTotal: CURRENT_SHARES,
    strategyComTotal: STRATEGY_COM_TOTAL,
    remainingGap: REMAINING_GAP,
  },
  sharesBreakdown: latestFinancials.shares.breakdown ? {
    baseline: latestFinancials.shares.breakdown.baseline,
    atmCumulative: latestFinancials.shares.breakdown.atmCumulative,
    employeeEquityCumulative: latestFinancials.shares.breakdown.employeeEquityCumulative,
    classA: latestFinancials.shares.classA,
    classB: CLASS_B_SHARES,
  } : {
    classA: latestFinancials.shares.classA,
    classB: CLASS_B_SHARES,
  },
  employeeEquity: {
    quartersTracked: EMPLOYEE_EQUITY_STATS.totalQuarters,
    latestQuarter: EMPLOYEE_EQUITY_STATS.latestQuarter,
    totalSharesIssued: EMPLOYEE_EQUITY_STATS.totalSharesIssued,
  },
  totalAtmEvents: MSTR_ATM_SALES.length,
  verifiedSnapshots: MSTR_VERIFIED_STATS.totalSnapshots,
  source: "mstr-verified-financials.ts",
};
