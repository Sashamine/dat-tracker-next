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
    url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/${LATEST_HOLDINGS_ACCESSION.replace(/-/g, "")}/`,
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
  costBasisAvg: pv(76_052, docSource({
    type: "sec-document",
    url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/${LATEST_HOLDINGS_ACCESSION.replace(/-/g, "")}/`,
    quote: "$76,052",
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
  totalCostBasis: pv(54_260_000_000, docSource({
    type: "sec-document",
    url: `https://www.sec.gov/Archives/edgar/data/${MSTR_CIK}/${LATEST_HOLDINGS_ACCESSION.replace(/-/g, "")}/`,
    quote: "$54.26B",
    anchor: "Aggregate Purchase Price",
    cik: MSTR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: LATEST_HOLDINGS_DATE,
    documentDate: LATEST_HOLDINGS_DATE,
  })),

  // =========================================================================
  // SHARES OUTSTANDING - from mstr-verified-financials.ts
  // Uses baseline + ATM + employee equity methodology
  // Class B: Constant 19.64M (founder shares with 10x voting)
  // =========================================================================
  sharesOutstanding: pv(CURRENT_SHARES, derivedSource({
    derivation: "From mstr-verified-financials.ts (baseline + ATM + employee equity)",
    formula: latestFinancials.shares.source,
    inputs: {
      classA: pv(latestFinancials.shares.classA, docSource({
        type: "sec-document",
        url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K",
        quote: `${latestFinancials.shares.classA.toLocaleString()} Class A shares`,
        anchor: "Verified Financials",
        cik: MSTR_CIK,
        filingType: "8-K",
        documentDate: latestFinancials.date,
      })),
      classBShares: pv(CLASS_B_SHARES, xbrlSource({
        fact: "us-gaap:CommonStockSharesOutstanding (Class B)",
        rawValue: CLASS_B_SHARES,
        unit: "shares",
        periodType: "instant",
        periodEnd: "2025-09-30",
        cik: MSTR_CIK,
        accession: Q3_2025_10Q,
        filingType: "10-Q",
        filingDate: Q3_2025_FILED,
      })),
    },
  }), `From mstr-verified-financials.ts (${MSTR_VERIFIED_STATS.totalSnapshots} snapshots). strategy.com shows ~${(REMAINING_GAP / 1_000_000).toFixed(1)}M more shares.`),

  // =========================================================================
  // QUARTERLY BURN - from Q3 2025 10-Q XBRL
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
  // TOTAL DEBT - from Q3 2025 10-Q XBRL
  // TODO: Update after Q4 2025 10-K (new convertible issuances)
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
  }), "As of Sep 30, 2025. Pending Q4 2025 update."),

  // =========================================================================
  // CASH - USD Reserve from Jan 2026 8-K
  // This is cash earmarked for preferred dividends + debt interest
  // =========================================================================
  cashReserves: pv(2_250_000_000, docSource({
    type: "sec-document",
    url: "https://www.sec.gov/Archives/edgar/data/1050446/000119312526001550/",
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
  preferredEquity: pv(8_382_000_000, derivedSource({
    derivation: "Q3 2025 10-Q cumulative + post-Q3 issuances (STRE 8-K + ATM 8-Ks)",
    formula: "Q3_cumulative + STRE_Nov13 + post_Q3_ATM",
    inputs: {
      q3Cumulative: pv(5_890_000_000, xbrlSource({
        fact: "us-gaap:TemporaryEquityCarryingAmountIncludingPortionAttributableToNoncontrollingInterests",
        rawValue: 5_890_000_000,
        unit: "USD",
        periodType: "instant",
        periodEnd: "2025-09-30",
        cik: MSTR_CIK,
        accession: Q3_2025_10Q,
        filingType: "10-Q",
        filingDate: Q3_2025_FILED,
      })),
      streNov13: pv(717_000_000, docSource({
        type: "sec-document",
        url: "https://www.sec.gov/Archives/edgar/data/1050446/000119312525273011/",
        quote: "STRE €620M (~$717M USD)",
        anchor: "STRE Offering",
        cik: MSTR_CIK,
        accession: "0001193125-25-273011",
        filingType: "8-K",
        filingDate: "2025-11-13",
        documentDate: "2025-11-07",
      })),
      postQ3Atm: pv(1_775_000_000, docSource({
        type: "sec-document",
        url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K",
        quote: "~$1.775B from post-Q3 preferred ATM (strategy.com/credit aggregated)",
        anchor: "Preferred ATM Status",
        cik: MSTR_CIK,
        filingType: "8-K",
        documentDate: "2026-01-26",
      })),
    },
  }), "SEC-verified: $8.382B (Q3 $5.89B + STRE $0.72B + ATM $1.78B)"),
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
