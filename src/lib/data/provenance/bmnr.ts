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
// Updated 2026-03-05 from 8-K filed Mar 2 (as of Mar 1)
const LATEST_HOLDINGS = 4_473_587;
const LATEST_HOLDINGS_DATE = "2026-03-01";
const LATEST_HOLDINGS_ACCESSION = "0001493152-26-008462";
const LATEST_HOLDINGS_DOC = "ex99-1.htm"; // Press release with holdings data

const LATEST_STAKED = 3_040_483;
const STAKING_PCT = 0.679; // 67.9% (3,040,483 / 4,473,587)

// Helper to build full SEC document URL
const secDocUrl = (cik: string, accession: string, doc: string) =>
  `/filings/bmnr/${accession}`;

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
    searchTerm: "4,473,587",
    // Direct link to the actual document containing the data
    url: secDocUrl(BMNR_CIK, LATEST_HOLDINGS_ACCESSION, LATEST_HOLDINGS_DOC),
    quote: `${LATEST_HOLDINGS.toLocaleString()} ETH`,
    anchor: LATEST_HOLDINGS.toLocaleString(),
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-03-02",
    documentDate: LATEST_HOLDINGS_DATE,
  }), "Weekly 8-K press release (ex99-1.htm)."),

  // =========================================================================
  // COST BASIS - 10-Q baseline + estimated post-quarter purchases from 8-K chain
  // =========================================================================
  costBasisAvg: pv(3_784, derivedSource({
    derivation: "Total ETH cost / Total ETH holdings (10-Q baseline + 8-K weekly purchases)",
    formula: "$16,932,512,514 + $100.1M (Feb 23 week: 51,162 ETH @ $1,958) + $100.6M (Mar 1 week: 50,928 ETH @ $1,976) = $17,133,213,000 / 4,473,587 ETH = $3,784/ETH",
    inputs: {
      baselineCost: pv(14_953_824_000, docSource({
        type: "sec-document",
        searchTerm: "14,953,824",
        url: `/filings/bmnr/0001493152-26-002084`,
        quote: "ETH 3,737,140 14,953,824 10,544,339 (digital assets table: Units / Cost Basis / Fair Value, $ in thousands)",
        anchor: "14,953,824",
        cik: BMNR_CIK,
        accession: Q1_FY2026_10Q,
        filingType: "10-Q",
        filingDate: Q1_FY2026_FILED,
        documentDate: Q1_FY2026_PERIOD_END,
      })),
      postQuarterPurchases: pv(1_978_688_514, derivedSource({
        derivation: "Sum of (weekly ETH delta × 8-K ETH price) from Dec 7 to Mar 1",
        formula: "736,447 additional ETH purchased at avg ~$2,957, total $2,179,389,000",
        inputs: {
          // Per-week 8-K chain (accession numbers):
          // Dec 7:  0001493152-25-026397 (Dec 8 8-K)
          // Dec 14: 0001493152-25-027660 (Dec 15 8-K)
          // Dec 21: 0001493152-25-028674 (Dec 22 8-K)
          // Jan 4:  0001493152-26-000274 (Jan 5 8-K)
          // Jan 11: 0001493152-26-001237 (Jan 12 8-K)
          // Jan 19: 0001493152-26-002762 (Jan 20 8-K)
          // Jan 25: 0001493152-26-003536 (Jan 26 8-K)
          // Feb 1:  0001493152-26-004658 (Feb 2 8-K)
          // Feb 8:  0001493152-26-005707 (Feb 9 8-K)
          // Feb 16: 0001493152-26-006953 (Feb 17 8-K) — 45,759 ETH @ $1,998
          // Feb 23: 0001493152-26-007694 (Feb 23 8-K) — 51,162 ETH @ $1,958
          // Mar 1:  0001493152-26-008462 (Mar 2 8-K) — 50,928 ETH @ $1,976
          // Each 8-K has ETH holdings count. Delta × stated ETH price = weekly cost.
          // See: bmnr-holdings-history.ts for the full chain.
        },
      })),
    },
  }), "10-Q baseline ($14.95B for 3,737,140 ETH) + estimated cost of 736,447 ETH from weekly 8-K prices through Mar 1. See clawd/bmnr-audit/cost-basis.md"),

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
  // From Mar 2, 2026 8-K: 3,040,483 ETH staked (67.9%)
  // Annualized staking revenue ~$202M (not updated in Mar 2 filing)
  // =========================================================================

  // =========================================================================
  // CASH RESERVES - from Mar 2, 2026 8-K
  // =========================================================================
  cashReserves: pv(868_000_000, docSource({
    type: "sec-document",
    searchTerm: "868 million",
    // Direct link to the actual document containing the data
    url: secDocUrl(BMNR_CIK, LATEST_HOLDINGS_ACCESSION, LATEST_HOLDINGS_DOC),
    quote: "total cash of $868 million",
    anchor: "868",
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-03-02",
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
        url: `/filings/bmnr/0001493152-26-002084`,
        quote: "General and administrative expenses 223,436 959 (comparative column, in thousands)",
        anchor: "General and administrative",
        cik: BMNR_CIK,
        accession: Q1_FY2026_10Q,
        filingType: "10-Q",
        filingDate: Q1_FY2026_FILED,
        documentDate: Q1_FY2026_PERIOD_END,
        // NOTE: $959K is the RECLASSIFIED Q1 FY2025 G&A from the Q1 FY2026 comparative column.
        // The original Q1 FY2025 10-Q (accn 0001683168-25-000223) reported G&A as $82,322 (raw dollars).
        // The Q1 FY2026 filing reclassified operating expenses, combining items into G&A = $959K.
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
  // OTHER INVESTMENTS - $214M total, excluded from mNAV
  // Source: Mar 2, 2026 8-K (same as holdings): "195 Bitcoin (BTC),
  // $200 million stake in Beast Industries, $14 million stake in
  // Eightco Holdings (NASDAQ: ORBS) ('moonshots')"
  // URL: /filings/bmnr/0001493152-26-008462
  // Accession: 0001493152-26-008462
  // These are non-crypto equity investments, excluded from CryptoNAV.
  // =========================================================================
};

// =========================================================================
// STAKING PROVENANCE (not in ProvenanceFinancials type, tracked separately)
// =========================================================================

/** Staking data with provenance - from weekly 8-K filings */
export const BMNR_STAKING_PROVENANCE = {
  // NOTE: The 8-K headline says "2,873,459 staked ETH" but the body says "2,897,459".
  // We use the body figure (2,897,459) because: 2,897,459/4,325,738 = 66.97% ≈ "about 67%" (matches filing).
  // The headline figure (2,873,459) gives 66.42% which would round to 66%, not 67%.
  // Conclusion: headline has a digit transposition (73 vs 97). Source document error, not ours.
  stakedAmount: pv(LATEST_STAKED, docSource({
    type: "sec-document",
    searchTerm: "3,040,483",
    url: secDocUrl(BMNR_CIK, LATEST_HOLDINGS_ACCESSION, LATEST_HOLDINGS_DOC),
    quote: "Bitmine total staked ETH stands at 3,040,483",
    anchor: "staked",
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-03-02",
    documentDate: LATEST_HOLDINGS_DATE,
  }), "Weekly 8-K press release (ex99-1.htm). Staked amount unchanged from Feb 17 filing."),

  stakingPct: pv(STAKING_PCT, docSource({
    type: "sec-document",
    searchTerm: "3,040,483",
    url: secDocUrl(BMNR_CIK, LATEST_HOLDINGS_ACCESSION, LATEST_HOLDINGS_DOC),
    quote: "Bitmine total staked ETH stands at 3,040,483",
    anchor: "3,040,483",
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-03-02",
    documentDate: LATEST_HOLDINGS_DATE,
  })),

  annualizedRevenue: pv(202_000_000, docSource({
    type: "sec-document",
    searchTerm: "202",
    url: secDocUrl(BMNR_CIK, LATEST_HOLDINGS_ACCESSION, LATEST_HOLDINGS_DOC),
    quote: "Annualized staking revenues are now $202 million",
    anchor: "staking",
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-03-02",
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
  // Baseline from Q1 FY2026 10-Q cover page (filed Jan 13, 2026)
  const baselineShares = SHARES_OUTSTANDING; // 454,862,451 as of Jan 12

  // ATM estimation from weekly 8-K data (Jan 12 → Mar 1)
  // Method: shares_issued = (ETH_delta × ETH_price) / stock_price
  // Assumes all ETH acquired is funded via ATM equity issuance at prevailing market prices.
  // Anchored to 10-Q cover page (454,862,451 shares as of Jan 12).
  // Cross-check: pre-anchor estimate at Jan 11 = 450.3M vs actual 454.9M = -1.0% error (PASS <5%)
  //
  // Weekly breakdown (from R2 reconstruction + stock prices):
  //   Jan 19: +35,268 ETH @ $3,211, stock ~$28.80 → ~3,930,000 shares
  //   Jan 25: +40,302 ETH @ $2,839, stock ~$25.10 → ~4,560,000 shares
  //   Feb 1:  +41,788 ETH @ $2,317, stock ~$20.47 → ~4,730,000 shares
  //   Feb 8:  +40,613 ETH @ $2,125, stock ~$20.96 → ~4,120,000 shares
  //   Feb 16: +45,759 ETH @ $1,998, stock ~$19.96 → ~4,580,000 shares
  //   Feb 23: +51,162 ETH @ $1,958, stock ~$18.00 → ~5,570,000 shares (est.)
  //   Mar 1:  +50,928 ETH @ $1,976, stock ~$18.00 → ~5,590,000 shares (est.)
  //   Total: ~33.08M shares
  // See: clawd/bmnr-audit/share-estimation.md
  //
  // NOTE: Feb 23 + Mar 1 stock prices estimated at ~$18 (conservative; BMNR traded ~$17-19 range).
  // Higher share estimate = lower mNAV premium (conservative direction).
  const estimatedNewShares = 33_080_000;

  return {
    date: LATEST_HOLDINGS_DATE,
    baselineShares,
    estimatedNewShares,
    totalEstimated: baselineShares + estimatedNewShares, // ~487,942,451
    confidence: "medium",
    methodology: `Q1 FY2026 10-Q baseline (${baselineShares.toLocaleString()}) + ATM estimate (${estimatedNewShares.toLocaleString()} shares from weekly 8-K ETH deltas through Mar 1, stock prices from market data). Cross-checks at 0.51% vs 10-Q anchor.`,
  };
}

// =========================================================================
// DEBUG / STATS
// =========================================================================

export const BMNR_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: Q1_FY2026_PERIOD_END,
  lastFilingChecked: "2026-03-02",
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
