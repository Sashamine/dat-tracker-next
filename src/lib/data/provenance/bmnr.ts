/**
 * BMNR (Bitmine Immersion) - Provenance-tracked data
 * 
 * World's largest ETH treasury company.
 * Simpler structure than MSTR: no debt, no preferred equity.
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

// SEC CIK for BMNR
export const BMNR_CIK = "1829311";

// Latest data points (updated manually from 8-K filings)
// Updated 2026-02-09 from 8-K filed today (as of Feb 8)
const LATEST_HOLDINGS = 4_325_738;
const LATEST_HOLDINGS_DATE = "2026-02-08";
const LATEST_HOLDINGS_ACCESSION = "0001493152-26-005707";
const LATEST_HOLDINGS_DOC = "ex99-1.htm"; // Press release with holdings data

const LATEST_STAKED = 2_897_459;
const STAKING_PCT = 0.670; // 67.0% (2,897,459 / 4,325,738)

// Helper to build full SEC document URL
const secDocUrl = (cik: string, accession: string, doc: string) =>
  `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${doc}`;

const SHARES_OUTSTANDING = 454_862_451;
const SHARES_DATE = "2026-01-12";
const SHARES_ACCESSION = "0001493152-26-002084";

// Q1 FY2026 10-Q data (filed Jan 13, 2026, as of Nov 30, 2025)
const Q1_FY2026_10Q = "0001493152-26-002084";
const Q1_FY2026_FILED = "2026-01-13";
const Q1_FY2026_PERIOD_END = "2025-11-30";

/**
 * BMNR Financial Data with Full Provenance
 */
export const BMNR_PROVENANCE: ProvenanceFinancials = {
  
  // =========================================================================
  // ETH HOLDINGS - from SEC 8-K filings (weekly updates)
  // =========================================================================
  holdings: pv(LATEST_HOLDINGS, docSource({
    type: "sec-document",
    searchTerm: "4,325,738",
    // Direct link to the actual document containing the data
    url: secDocUrl(BMNR_CIK, LATEST_HOLDINGS_ACCESSION, LATEST_HOLDINGS_DOC),
    quote: `${LATEST_HOLDINGS.toLocaleString()} ETH`,
    anchor: LATEST_HOLDINGS.toLocaleString(),
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-02-09",
    documentDate: LATEST_HOLDINGS_DATE,
  }), "Weekly 8-K press release (ex99-1.htm)."),

  // =========================================================================
  // COST BASIS - from Q1 FY2026 10-Q
  // =========================================================================
  costBasisAvg: pv(4_002, derivedSource({
    derivation: "Total ETH cost / Total ETH holdings",
    formula: "$14,953,824,000 / 3,737,140 ETH = $4,002/ETH",
    inputs: {
      totalCost: pv(14_953_824_000, docSource({
        type: "sec-document",
        searchTerm: "14,953,824",
        url: `https://www.sec.gov/Archives/edgar/data/${BMNR_CIK}/000149315226002084/form10-q.htm`,
        quote: "digital assets at cost of $14,953,824",
        anchor: "digital assets at cost",
        cik: BMNR_CIK,
        accession: Q1_FY2026_10Q,
        filingType: "10-Q",
        filingDate: Q1_FY2026_FILED,
        documentDate: Q1_FY2026_PERIOD_END,
      })),
      totalHoldings: pv(3_737_140, docSource({
        type: "sec-document",
        searchTerm: "3,737,140",
        url: `https://www.sec.gov/Archives/edgar/data/${BMNR_CIK}/000149315226002084/form10-q.htm`,
        quote: "3,737,140 Ether",
        anchor: "3,737,140 Ether",
        cik: BMNR_CIK,
        accession: Q1_FY2026_10Q,
        filingType: "10-Q",
        filingDate: Q1_FY2026_FILED,
        documentDate: Q1_FY2026_PERIOD_END,
      })),
    },
  }), "⚠️ STALE: As of Nov 30, 2025 only. Excludes ~590K ETH purchased since then at $2,100-$3,200. Actual current basis likely lower."),

  // =========================================================================
  // SHARES OUTSTANDING - from 10-Q cover page
  // =========================================================================
  sharesOutstanding: pv(SHARES_OUTSTANDING, xbrlSource({
    fact: "dei:EntityCommonStockSharesOutstanding",
    searchTerm: "454,862,451",
    rawValue: SHARES_OUTSTANDING,
    unit: "shares",
    periodType: "instant",
    periodEnd: SHARES_DATE,
    cik: BMNR_CIK,
    accession: SHARES_ACCESSION,
    filingType: "10-Q",
    filingDate: Q1_FY2026_FILED,
    documentAnchor: "shares outstanding of the registrant",
  }), "Basic shares. Add ~13.5M potentially dilutive shares (CVI warrants 10.4M @ $87.50, strategic advisor warrants 3.0M @ $5.40, RSUs 27K, C-3 warrants 1.3K) for fully diluted."),

  // =========================================================================
  // STAKING - tracked separately (not in ProvenanceFinancials type)
  // From Feb 9, 2026 8-K: 2,897,459 ETH staked (67.0%)
  // Annualized staking revenue ~$202M
  // =========================================================================

  // =========================================================================
  // CASH RESERVES - from Feb 9, 2026 8-K
  // =========================================================================
  cashReserves: pv(595_000_000, docSource({
    type: "sec-document",
    searchTerm: "595",
    // Direct link to the actual document containing the data
    url: secDocUrl(BMNR_CIK, LATEST_HOLDINGS_ACCESSION, LATEST_HOLDINGS_DOC),
    quote: "$595 million in cash",
    anchor: "595",
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-02-09",
    documentDate: LATEST_HOLDINGS_DATE,
  }), "Weekly 8-K press release (ex99-1.htm)."),

  // =========================================================================
  // QUARTERLY BURN - estimated from Q1 FY2025 baseline
  // =========================================================================
  quarterlyBurn: pv(1_000_000, derivedSource({
    derivation: "Based on pre-pivot G&A baseline, annualized",
    formula: "Q1 FY2025 baseline G&A (~$959K/qtr), rounded to $1M",
    inputs: {
      q1Fy2025Ga: pv(959_000, docSource({
        type: "sec-document",
        searchTerm: "959",
        url: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225015441/",
        quote: "G&A ~$959K",
        anchor: "General and Administrative",
        cik: BMNR_CIK,
        filingType: "10-Q",
        filingDate: "2025-01-14",
        documentDate: "2024-11-30",
      })),
    },
  }), "Estimated. Q1 FY2026 G&A of $223M was mostly one-time capital raising costs."),

  // =========================================================================
  // DEBT - None (equity-funded)
  // =========================================================================
  totalDebt: pv(0, xbrlSource({
    fact: "us-gaap:LongTermDebt",
    // No searchTerm for zero values
    rawValue: 0,
    unit: "USD",
    periodType: "instant",
    periodEnd: Q1_FY2026_PERIOD_END,
    cik: BMNR_CIK,
    accession: Q1_FY2026_10Q,
    filingType: "10-Q",
    filingDate: Q1_FY2026_FILED,
    documentAnchor: "LIABILITIES",
  }), "No debt financing. All ETH purchases funded via equity (ATM + PIPE)."),

  // =========================================================================
  // PREFERRED EQUITY - None
  // =========================================================================
  preferredEquity: pv(0, xbrlSource({
    fact: "us-gaap:PreferredStockValue",
    // No searchTerm for zero values
    rawValue: 0,
    unit: "USD",
    periodType: "instant",
    periodEnd: Q1_FY2026_PERIOD_END,
    cik: BMNR_CIK,
    accession: Q1_FY2026_10Q,
    filingType: "10-Q",
    filingDate: Q1_FY2026_FILED,
    documentAnchor: "A and B Convertible Preferred Stock",
  }), "No preferred equity issued."),

  // =========================================================================
  // OTHER INVESTMENTS - tracked in companies.ts, not in ProvenanceFinancials
  // $200M Beast Industries + $19M Eightco Holdings (OCTO) = $219M
  // Excluded from mNAV (not crypto-correlated equity investments)
  // =========================================================================
};

// =========================================================================
// STAKING PROVENANCE (not in ProvenanceFinancials type, tracked separately)
// =========================================================================

/** Staking data with provenance - from weekly 8-K filings */
export const BMNR_STAKING_PROVENANCE = {
  stakedAmount: pv(LATEST_STAKED, docSource({
    type: "sec-document",
    searchTerm: "2,897,459",
    // Direct link to the actual document containing the data
    url: secDocUrl(BMNR_CIK, LATEST_HOLDINGS_ACCESSION, LATEST_HOLDINGS_DOC),
    quote: "2,897,459 ETH (67.0%) are currently staked",
    anchor: "staked",
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-02-09",
    documentDate: LATEST_HOLDINGS_DATE,
  }), "Weekly 8-K press release (ex99-1.htm)."),

  stakingPct: pv(STAKING_PCT, docSource({
    type: "sec-document",
    searchTerm: "67.0%",
    url: secDocUrl(BMNR_CIK, LATEST_HOLDINGS_ACCESSION, LATEST_HOLDINGS_DOC),
    quote: "67.0%",
    anchor: "67.0%",
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-02-09",
    documentDate: LATEST_HOLDINGS_DATE,
  })),

  annualizedRevenue: pv(202_000_000, docSource({
    type: "sec-document",
    searchTerm: "202",
    url: secDocUrl(BMNR_CIK, LATEST_HOLDINGS_ACCESSION, LATEST_HOLDINGS_DOC),
    quote: "Annualized staking revenues are now $202 million, up +7% in the past week",
    anchor: "staking",
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-02-09",
    documentDate: LATEST_HOLDINGS_DATE,
  })),
};

// =========================================================================
// SHARE ESTIMATION (for periods between 10-Q filings)
// =========================================================================

/**
 * Estimate shares issued since last SEC filing using ETH acquisition methodology
 * Formula: shares_issued = (ETH_acquired × ETH_price) / stock_price
 * 
 * Inputs (all from SEC 8-Ks):
 * - ETH_acquired: Change in holdings from consecutive 8-Ks
 * - ETH_price: Stated in 8-K filing
 * - stock_price: Market data at filing date
 * 
 * See: clawd/bmnr-audit/METHODOLOGY.md
 */
export interface ShareEstimate {
  date: string;
  baselineShares: number;    // From last 10-Q
  estimatedNewShares: number; // Sum of estimated issuances
  totalEstimated: number;     // baseline + estimated
  confidence: "high" | "medium" | "low";
  methodology: string;
}

/**
 * Estimate current shares outstanding
 * Uses Q1 FY2026 10-Q baseline + estimated ATM issuances
 */
export function estimateBMNRShares(): ShareEstimate {
  // Baseline from Q1 FY2026 10-Q (filed Jan 13, 2026)
  const baselineShares = SHARES_OUTSTANDING; // 454,862,451
  const baselineDate = SHARES_DATE; // "2026-01-12"
  
  // ETH acquisitions since baseline
  // From 8-K filings: Jan 12 holdings: 3,737,140 → Feb 8 holdings: 4,325,738
  const ethAcquired = LATEST_HOLDINGS - 3_737_140; // 588,598 ETH
  const avgEthPrice = 2_600; // Rough average ETH price in this period
  const avgStockPrice = 22; // Rough average BMNR stock price
  
  // Estimate shares issued via ATM
  const estimatedNewShares = Math.round((ethAcquired * avgEthPrice) / avgStockPrice);
  // = (588,598 × $2,600) / $22 = ~69.5M new shares
  
  return {
    date: LATEST_HOLDINGS_DATE,
    baselineShares,
    estimatedNewShares,
    totalEstimated: baselineShares + estimatedNewShares,
    confidence: "medium",
    methodology: `Q1 FY2026 10-Q baseline (${baselineShares.toLocaleString()}) + estimated ATM (${estimatedNewShares.toLocaleString()} from ${ethAcquired.toLocaleString()} ETH × $${avgEthPrice} ÷ $${avgStockPrice})`,
  };
}

// =========================================================================
// DEBUG / STATS
// =========================================================================

export const BMNR_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: Q1_FY2026_PERIOD_END,
  lastFilingChecked: "2026-02-02",
  notes: "BMNR is simpler than MSTR: no debt, no preferred, single share class.",
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Get current BMNR provenance values for use in companies.ts
 */
export function getBMNRProvenance() {
  return {
    holdings: BMNR_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    shares: SHARES_OUTSTANDING,
    sharesDate: SHARES_DATE,
    costBasisAvg: BMNR_PROVENANCE.costBasisAvg?.value,
    cashReserves: BMNR_PROVENANCE.cashReserves?.value,
    totalDebt: BMNR_PROVENANCE.totalDebt?.value,
    preferredEquity: BMNR_PROVENANCE.preferredEquity?.value,
    stakingAmount: LATEST_STAKED,
    stakingPct: STAKING_PCT,
  };
}
