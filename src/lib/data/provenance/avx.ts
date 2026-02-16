/**
 * AVX (AVAX One Technology Ltd) - Provenance-tracked data
 *
 * First publicly traded AVAX treasury company (Nasdaq: AVX).
 * Formerly AgriFORCE Growing Systems, pivoted Nov 2025.
 * PIPE-funded AVAX accumulation + protocol-native staking (~8% APY).
 *
 * Every value traces back to an authoritative source.
 * Click any number → see source → verify at source.
 *
 * ⚠️ NOTE: The Q3 2025 10-Q (Sep 30) is PRE-PIPE (closed Nov 5, 2025).
 * First post-PIPE balance sheet will be in 10-K (FY 2025, due ~March 2026).
 * Holdings & shares use company dashboard + 8-K data until then.
 */

import {
  ProvenanceFinancials,
  pv,
  xbrlSource,
  docSource,
  derivedSource,
} from "../types/provenance";

// SEC CIK for AVX (formerly AgriFORCE)
export const AVX_CIK = "1826397";

// Helper to build full SEC document URL
const secDocUrl = (cik: string, accession: string, doc: string) =>
  `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${doc}`;

// =========================================================================
// KEY FILINGS
// =========================================================================
const Q3_2025_10Q_ACCESSION = "0001493152-25-023464";
const Q3_2025_10Q_FILED = "2025-11-14";
const Q3_2025_PERIOD_END = "2025-09-30";

const PIPE_8K_ACCESSION = "0001493152-25-021006";
const PIPE_8K_FILED = "2025-11-06";

const JAN_2026_8K_ACCESSION = "0001493152-26-004069";
const JAN_2026_8K_FILED = "2026-01-28";

// =========================================================================
// LATEST DATA POINTS
// =========================================================================

// Holdings from company dashboard (most current) + verified against 8-K disclosures
const LATEST_HOLDINGS = 13_889_000; // AVAX
const LATEST_HOLDINGS_DATE = "2026-02-12";

// Shares from dashboard (post-PIPE + buybacks)
const SHARES_OUTSTANDING = 92_672_000; // Basic shares
const SHARES_DATE = "2026-02-12";

// Financial data from Q3 2025 10-Q (PRE-PIPE)
const TOTAL_DEBT = 1_689_415; // Debentures $1,372,679 + LT debt $41,736 + loan $275,000
const CASH_RESERVES = 894_701; // Pre-PIPE cash (will be much higher post-PIPE)
const QUARTERLY_BURN = 186_167; // Q3 2025 G&A

// PIPE details
const PIPE_TOTAL = 219_042_206;
const PIPE_CASH = 145_375_936;
const PIPE_AVAX = 73_666_270;
const PIPE_PRICE_PER_SHARE = 2.36;
const PIPE_SHARES_ISSUED = 86_690_657;
const PIPE_WARRANTS = 6_123_837;

/**
 * AVX Financial Data with Full Provenance
 */
export const AVX_PROVENANCE: ProvenanceFinancials = {
  // =========================================================================
  // AVAX HOLDINGS - from company dashboard, cross-referenced with 8-Ks
  // Dashboard: https://analytics-avaxone.theblueprint.xyz/
  // =========================================================================
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "company-website",
      searchTerm: "13,889,000",
      url: "https://analytics-avaxone.theblueprint.xyz/",
      quote: "13.889M AVAX held",
      anchor: "AVAX Holdings",
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "Dashboard-sourced (SEC-referenced in 8-K filings). Includes purchased AVAX (~9.4M), PIPE payment in AVAX (~6.3M), and staking rewards. >90% staked."
  ),

  // =========================================================================
  // SHARES OUTSTANDING - from dashboard + 8-K cross-reference
  // Post-PIPE: 93,112,148 → minus buybacks → ~92,672,000
  // =========================================================================
  sharesOutstanding: pv(
    SHARES_OUTSTANDING,
    docSource({
      type: "company-website",
      searchTerm: "92,672,000",
      url: "https://analytics-avaxone.theblueprint.xyz/",
      quote: "92.672M total shares",
      anchor: "Shares Outstanding",
      documentDate: SHARES_DATE,
    }),
    "Post-PIPE (93.1M) minus buybacks (~440K). PIPE 8-K confirms 93,112,148 post-closing. $40M buyback program active."
  ),

  // =========================================================================
  // TOTAL DEBT - from Q3 2025 10-Q XBRL (PRE-PIPE, legacy only)
  // Debentures: $1,372,679 (current) + LT debt: $41,736 + Loan: $275,000
  // =========================================================================
  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "sec-document",
      searchTerm: "1,372,679",
      url: secDocUrl(AVX_CIK, Q3_2025_10Q_ACCESSION, "form10-q.htm"),
      quote: "Debentures $1,372,679 + Long-term debt $41,736 + Loan payable $275,000 = $1,689,415",
      anchor: "Balance Sheet",
      cik: AVX_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "Legacy pre-PIPE debt: debentures ($1.37M, current) + LT debt ($42K) + loan ($275K). Minimal for a DAT."
  ),

  // =========================================================================
  // CASH RESERVES - 10-Q Sep 30 (PRE-PIPE)
  // ⚠️ This is dramatically understated - $145M+ cash came in from PIPE
  // Updated figure will come with 10-K (FY 2025, due ~March 2026)
  // =========================================================================
  cashReserves: pv(
    CASH_RESERVES,
    xbrlSource({
      fact: "us-gaap:CashAndCashEquivalentsAtCarryingValue",
      searchTerm: "894,701",
      rawValue: CASH_RESERVES,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: AVX_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Cash and cash equivalents",
    }),
    "⚠️ PRE-PIPE figure. $145M+ cash received from PIPE on Nov 5, 2025. Most deployed to buy AVAX. Actual post-PIPE cash TBD in 10-K."
  ),

  // =========================================================================
  // QUARTERLY BURN - Q3 2025 10-Q G&A
  // =========================================================================
  quarterlyBurn: pv(
    QUARTERLY_BURN,
    xbrlSource({
      fact: "us-gaap:GeneralAndAdministrativeExpense",
      searchTerm: "186,167",
      rawValue: QUARTERLY_BURN,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-07-01",
      periodEnd: Q3_2025_PERIOD_END,
      cik: AVX_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Office and administrative",
    }),
    "Pre-PIPE burn rate. Expect higher post-PIPE due to Hivemind management fees and expanded ops."
  ),

  // =========================================================================
  // PREFERRED EQUITY - None
  // =========================================================================
  preferredEquity: pv(
    0,
    docSource({
      type: "sec-document",
      url: secDocUrl(AVX_CIK, Q3_2025_10Q_ACCESSION, "form10-q.htm"),
      quote: "No preferred stock outstanding",
      anchor: "Preferred stock",
      cik: AVX_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "No preferred equity issued."
  ),
};

// =========================================================================
// PIPE TRANSACTION DETAIL
// =========================================================================

export interface AVXPipeTransaction {
  closingDate: string;
  totalProceeds: number;
  cashProceeds: number;
  avaxProceeds: number;
  pricePerShare: number;
  sharesIssued: number;
  preFundedWarrants: number;
  warrantStrike: number;
  accession: string;
  sourceUrl: string;
}

export const AVX_PIPE: AVXPipeTransaction = {
  closingDate: "2025-11-05",
  totalProceeds: PIPE_TOTAL,
  cashProceeds: PIPE_CASH,
  avaxProceeds: PIPE_AVAX,
  pricePerShare: PIPE_PRICE_PER_SHARE,
  sharesIssued: PIPE_SHARES_ISSUED,
  preFundedWarrants: PIPE_WARRANTS,
  warrantStrike: 0.0001,
  accession: PIPE_8K_ACCESSION,
  sourceUrl: secDocUrl(AVX_CIK, PIPE_8K_ACCESSION, "form8-k.htm"),
};

// =========================================================================
// STAKING INFO
// =========================================================================

export const AVX_STAKING = {
  percentStaked: 0.90,
  // NOTE: 0.08 (8%) is the advertised/target APY from company disclosures.
  // Realized yield through Dec 2025 was ~2.65% APY per math audit
  // (only ~89K AVAX gained in 99 days vs ~299K expected at 8%).
  // Discrepancy may be due to ramp-up period, partial staking, or validator timing.
  apy: 0.08,
  rewardsThruDec2025: 600_000, // USD
  expectedQ1_2026Rewards: 180_000, // AVAX tokens
  validatorInfra: true, // Proprietary validator + third-party delegation
  source: secDocUrl(AVX_CIK, JAN_2026_8K_ACCESSION, "ex99-1.htm"),
  sourceDate: "2026-01-28",
};

// =========================================================================
// CAPITAL PROGRAMS
// =========================================================================

export const AVX_CAPITAL_PROGRAMS = {
  buyback: {
    authorized: 40_000_000,
    executedShares: 649_845,
    executedValue: 1_100_000,
    avgPrice: 1.71,
    asOf: "2026-01-25",
    source: "8-K Jan 28, 2026",
    sourceUrl: secDocUrl(AVX_CIK, JAN_2026_8K_ACCESSION, "ex99-1.htm"),
  },
  shelf: {
    amount: 100_000_000, // S-3 filed Feb 9, 2026
    filingDate: "2026-02-09",
    accession: "0001493152-26-005802",
  },
};

// =========================================================================
// DEBUG / STATS
// =========================================================================

export const AVX_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: Q3_2025_PERIOD_END,
  lastFilingChecked: JAN_2026_8K_FILED,
  holdings: LATEST_HOLDINGS,
  sharesBasic: SHARES_OUTSTANDING,
  totalDebt: TOTAL_DEBT,
  pipeTotal: PIPE_TOTAL,
  notes:
    "First AVAX treasury company. Q3 10-Q is pre-PIPE; dashboard is primary source until 10-K (due ~March 2026). Pre-funded warrants (6.1M @ $0.0001) are functionally common stock.",
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

export function getAVXProvenance() {
  return {
    holdings: AVX_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_OUTSTANDING,
    sharesDate: SHARES_DATE,
    cashReserves: AVX_PROVENANCE.cashReserves?.value,
    totalDebt: AVX_PROVENANCE.totalDebt?.value,
    preferredEquity: AVX_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: AVX_PROVENANCE.quarterlyBurn?.value,
    stakingPct: AVX_STAKING.percentStaked,
    stakingApy: AVX_STAKING.apy,
  };
}
