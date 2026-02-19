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
import { MSTR_ATM_SALES, getCommonShares } from "../mstr-atm-sales";
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
  .reduce((sum, sale) => sum + getCommonShares(sale), 0);

// strategy.com Basic Shares Outstanding (primary source, Reg FD channel)
const STRATEGY_COM_TOTAL = 333_083_000; // as of Feb 8, 2026
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
  // SHARES OUTSTANDING
  // Company current: strategy.com/shares (Reg FD) — 333.1M
  // SEC verified: Q3 10-Q + ATM 8-Ks — 331.3M (Δ1.7M = Q4 emp equity)
  // =========================================================================
  sharesOutstanding: pv(CURRENT_SHARES, derivedSource({
    derivation: "Company-disclosed current, cross-checked against SEC filings",
    formula: "strategy.com Basic Shares Outstanding, verified within 0.5% by 10-Q + ATM 8-Ks",
    inputs: {
      companyCurrent: pv(STRATEGY_COM_TOTAL, docSource({
        type: "company-website",
        searchTerm: "Basic Shares Outstanding",
        url: "https://www.strategy.com/shares",
        quote: `${(STRATEGY_COM_TOTAL / 1_000).toLocaleString()}K Basic Shares Outstanding`,
        anchor: "strategy.com/shares (Reg FD)",
        cik: MSTR_CIK,
        filingType: undefined,
        documentDate: latestFinancials.date,
      })),
      secVerified: pv(
        latestFinancials.shares.breakdown
          ? latestFinancials.shares.breakdown.baseline + latestFinancials.shares.breakdown.atmCumulative + CLASS_B_SHARES
          : 0,
        docSource({
          type: "sec-document",
          searchTerm: "267,468",
          url: `/filings/mstr/${Q3_2025_10Q}?tab=document&q=267%2C468`,
          quote: `10-Q: 267.5M baseline + ATM 8-Ks: ${((latestFinancials.shares.breakdown?.atmCumulative || 0) / 1e6).toFixed(1)}M + Class B: 19.6M`,
          anchor: "Q3 2025 10-Q cover page + weekly 8-K ATM filings",
          cik: MSTR_CIK,
          accession: Q3_2025_10Q,
          filingType: "10-Q",
          filingDate: Q3_2025_FILED,
          documentDate: Q3_COVER_PAGE_DATE,
        })
      ),
    },
  }), `Company: ${(STRATEGY_COM_TOTAL / 1e6).toFixed(1)}M (strategy.com). SEC: ${((latestFinancials.shares.breakdown ? latestFinancials.shares.breakdown.baseline + latestFinancials.shares.breakdown.atmCumulative + CLASS_B_SHARES : 0) / 1e6).toFixed(1)}M (10-Q + ATM 8-Ks). Δ1.7M = Q4 employee equity (pending 10-K).`),

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
  // TOTAL DEBT
  // Company current: strategy.com/debt — $8,214M notional (6 convertible notes)
  // SEC verified: Q3 10-Q XBRL — $8,174M book value (Δ$40M = OID amortization)
  // =========================================================================
  totalDebt: pv(8_214_000_000, derivedSource({
    derivation: "Company-disclosed notional, cross-checked against SEC book value",
    formula: "strategy.com Total Debt (notional face value of 6 convertible notes)",
    inputs: {
      companyCurrent: pv(8_214_000_000, docSource({
        type: "company-website",
        searchTerm: "8,214,000",
        url: "https://www.strategy.com/debt",
        quote: "2028 $1,010M + 2029 $3,000M + 2030A $800M + 2030B $2,000M + 2031 $604M + 2032 $800M = $8,214M",
        anchor: "strategy.com/debt (Reg FD)",
        cik: MSTR_CIK,
        filingType: undefined,
        documentDate: "2026-02-12",
      })),
      secVerified: pv(8_173_903_000, xbrlSource({
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
      })),
    },
  }), "Company: $8,214M notional (strategy.com/debt). SEC: $8,174M book value (Q3 10-Q). Δ$40M = OID amortization. All convertible notes, no term loans."),

  // =========================================================================
  // CASH - USD Reserve ($2.25B)
  // First disclosed in Jan 4, 2026 8-K. Confirmed in Feb 5, 2026 Q4 earnings.
  // This is cash earmarked for preferred dividends + debt interest.
  // Balance sheet shows $2.30B total cash (Dec 31, 2025); $2.25B is the
  // earmarked USD Reserve portion.
  // =========================================================================
  cashReserves: pv(2_250_000_000, docSource({
    type: "sec-document",
    searchTerm: "2.25",
    url: "/filings/mstr/0001193125-26-001550?tab=document&q=USD%20Reserve",
    quote: "USD Reserve was $2.25 billion, which provides approximately 2.5 years of coverage for dividends on its preferred stock and interest on its outstanding indebtedness",
    anchor: "USD Reserve",
    cik: MSTR_CIK,
    accession: "0001193125-26-001550",
    filingType: "8-K",
    filingDate: "2026-01-05",
    documentDate: "2026-01-04",
  }), "USD Reserve for dividends/interest. First disclosed Jan 4 8-K (accn 001550). Confirmed Feb 5 Q4 earnings 8-K (accn 021726, Exhibit 99.1): same $2.25B figure reiterated as of Feb 1, 2026. Balance sheet (Dec 31): $2,301,470K total cash."),

  // =========================================================================
  // PREFERRED EQUITY
  // Company current: strategy.com/credit — $8,383M (5 preferred series)
  // SEC verified: Q3 10-Q $5,786M + STRE 8-K $717M + post-Q3 ATM 8-Ks ~$1,880M = ~$8,383M
  // =========================================================================
  preferredEquity: pv(8_383_000_000, derivedSource({
    derivation: "Company-disclosed current, cross-checked against SEC filings",
    formula: "strategy.com Total Pref (notional of 5 preferred series)",
    inputs: {
      companyCurrent: pv(8_383_000_000, docSource({
        type: "company-website",
        searchTerm: "Total Pref",
        url: "https://www.strategy.com/credit",
        quote: "STRF $1,284M + STRC $3,379M + STRE $916M + STRK $1,402M + STRD $1,402M = $8,383M",
        anchor: "strategy.com/credit (Reg FD)",
        cik: MSTR_CIK,
        filingType: undefined,
        documentDate: "2026-02-12",
      })),
      secVerified: pv(5_786_330_000, docSource({
        type: "sec-document",
        searchTerm: "5,786,330",
        url: `/filings/mstr/${Q3_2025_10Q}?tab=document&q=Total%20mezzanine`,
        quote: "$5,786,330 (thousands) = $5.786B Total mezzanine equity as of Sep 30, 2025",
        anchor: "Q3 2025 10-Q balance sheet",
        cik: MSTR_CIK,
        accession: Q3_2025_10Q,
        filingType: "10-Q",
        filingDate: Q3_2025_FILED,
        documentDate: Q3_COVER_PAGE_DATE,
      })),
    },
  }), "Company: $8,383M (strategy.com/credit). SEC: $5,786M at Q3 + $717M STRE (8-K) + ~$1,880M ATM (8-Ks) = ~$8,383M. 5 series: STRF, STRC, STRE, STRK, STRD."),
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
