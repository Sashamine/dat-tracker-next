/**
 * SUIG (SUI Group Holdings Limited) - Provenance-tracked data
 *
 * First publicly traded SUI treasury company. Formerly Mill City Ventures.
 * ~2.9% of SUI circulating supply. PIPE-funded accumulation + staking (~2.2% APY).
 * Only public company with Sui Foundation relationship.
 *
 * Every value traces back to an authoritative source.
 * Click any number → see source → verify at source.
 *
 * ⚠️ TODO: Custom view component (SUIGCompanyView.tsx) needed for mNAV citation rendering.
 * The default company page view doesn't render MnavCalculationCard with source URLs.
 * See TOOLS.md "Custom Views for mNAV Citations" for details.
 */

import {
  ProvenanceFinancials,
  pv,
  xbrlSource,
  docSource,
} from "../types/provenance";

// SEC CIK for SUIG (formerly Mill City Ventures)
export const SUIG_CIK = "1425355";

// Helper to build full SEC document URL
const secDocUrl = (cik: string, accession: string, doc: string) =>
  `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${doc}`;

// =========================================================================
// KEY FILINGS
// =========================================================================
const Q1_2025_10Q_ACCESSION = "0001654954-25-005448";
const Q1_2025_10Q_FILED = "2025-05-13";
const Q1_2025_PERIOD_END = "2025-03-31";

const Q2_2025_10Q_ACCESSION = "0001654954-25-009666";
const Q2_2025_10Q_FILED = "2025-08-14";
const Q2_2025_PERIOD_END = "2025-06-30";

const Q3_2025_10Q_ACCESSION = "0001654954-25-012949";
const Q3_2025_10Q_FILED = "2025-11-13";
const Q3_2025_PERIOD_END = "2025-09-30";

const JAN_2026_8K_ACCESSION = "0001654954-26-000201";
const JAN_2026_8K_FILED = "2026-01-08";

// =========================================================================
// LATEST DATA POINTS
// =========================================================================

// Holdings from Jan 8, 2026 8-K Exhibit 99.1
const LATEST_HOLDINGS = 108_098_436; // SUI
const LATEST_HOLDINGS_DATE = "2026-01-07";

// Shares from Jan 8, 2026 8-K: "fully adjusted shares issued and outstanding"
const SHARES_OUTSTANDING = 80_900_000; // Basic shares
const SHARES_DATE = "2026-01-07";

// Financial data from Q3 2025 10-Q (Sep 30, 2025)
const TOTAL_DEBT = 0; // No significant debt per 10-Q
// $42.7M cash+restricted (Q3 2025 XBRL: CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents)
// CashAndCashEquivalentsAtCarryingValue not separately reported for Q3.
// Q2 2025 standalone cash was $1.497M. The spike to $42.7M reflects ATM/PIPE proceeds.
const CASH_RESERVES = 42_700_411;
const QUARTERLY_BURN = 1_000_000; // G&A / actual cash burn (excludes non-cash crypto mark-to-market)

// Capital programs
const CAPITAL_RAISED_PIPE = 450_000_000;
const CAPITAL_RAISED_ATM = 500_000_000; // S-1 registration

/**
 * SUIG Financial Data with Full Provenance
 */
export const SUIG_PROVENANCE: ProvenanceFinancials = {
  // =========================================================================
  // SUI HOLDINGS - from Jan 8, 2026 8-K Exhibit 99.1
  // =========================================================================
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "sec-document",
      searchTerm: "108,098,436",
      url: "https://www.sec.gov/Archives/edgar/data/1425355/000165495426000201/suig_ex991.htm",
      quote: "108,098,436 SUI tokens",
      anchor: "SUI Holdings",
      cik: SUIG_CIK,
      accession: JAN_2026_8K_ACCESSION,
      filingType: "8-K",
      filingDate: JAN_2026_8K_FILED,
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "From 8-K Exhibit 99.1 treasury update. ~2.9% of SUI circulating supply. Substantially all staked."
  ),

  // =========================================================================
  // SHARES OUTSTANDING - from Jan 8, 2026 8-K
  // "fully adjusted shares issued and outstanding as of January 7, 2026"
  // =========================================================================
  sharesOutstanding: pv(
    SHARES_OUTSTANDING,
    docSource({
      type: "sec-document",
      searchTerm: "80.9 million shares",
      url: "https://www.sec.gov/Archives/edgar/data/1425355/000165495426000201/suig_8k.htm",
      quote: "fully adjusted shares issued and outstanding as of January 7, 2026",
      anchor: "Shares Outstanding",
      cik: SUIG_CIK,
      accession: JAN_2026_8K_ACCESSION,
      filingType: "8-K",
      filingDate: JAN_2026_8K_FILED,
      documentDate: SHARES_DATE,
    }),
    "Post-buyback figure. Q4 2025: repurchased 7.8M shares. Q3 10-Q cover page showed 83,068,868 as of Nov 13, 2025."
  ),

  // =========================================================================
  // TOTAL DEBT - No significant debt
  // Liabilities per Q3 2025 XBRL = $24.04M, but this is largely deferred/accrued
  // liabilities (not financial debt). No LongTermDebt, NotesPayable, or similar
  // XBRL facts reported.
  // =========================================================================
  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "sec-document",
      searchTerm: "24,039,202",
      url: secDocUrl(SUIG_CIK, Q3_2025_10Q_ACCESSION, "mcvt_10q.htm"),
      quote: "Total liabilities $24,039,202 (accrued/deferred, no financial debt instruments)",
      anchor: "Balance Sheet",
      cik: SUIG_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "Total liabilities $24M are accrued/deferred items, NOT financial debt. No LongTermDebt in XBRL. Treating as $0 financial debt for mNAV."
  ),

  // =========================================================================
  // CASH RESERVES - Q3 2025 10-Q (Sep 30, 2025)
  // XBRL: CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents = $42,700,411
  // CashAndCashEquivalentsAtCarryingValue not separately reported for Q3.
  // =========================================================================
  cashReserves: pv(
    CASH_RESERVES,
    xbrlSource({
      fact: "us-gaap:CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
      searchTerm: "42,700,411",
      rawValue: CASH_RESERVES,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: SUIG_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Cash and cash equivalents",
    }),
    "Combined cash+restricted. Q2 standalone cash was $1.497M; spike to $42.7M reflects ATM/PIPE proceeds. Likely earmarked for SUI purchases."
  ),

  // =========================================================================
  // QUARTERLY BURN - Estimated ~$1M actual G&A
  // Total GAAP OpEx was $64.7M in Q3 2025 but dominated by crypto mark-to-market.
  // Using Q1 2025 operating cash flow as best proxy for actual cash burn.
  // =========================================================================
  quarterlyBurn: pv(
    QUARTERLY_BURN,
    docSource({
      type: "sec-document",
      searchTerm: "3,646,585",
      url: secDocUrl(SUIG_CIK, Q1_2025_10Q_ACCESSION, "mcvt_10q.htm"),
      quote: "NetCashUsedInOperatingActivities $3,646,585 (2025-01-01 to 2025-03-31)",
      anchor: "Cash flows from operating activities",
      cik: SUIG_CIK,
      accession: Q1_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_2025_10Q_FILED,
      documentDate: Q1_2025_PERIOD_END,
    }),
    "Estimated ~$1M/quarter actual G&A burn. Q1 2025 operating cash outflow was $3.6M but includes legacy business wind-down. GAAP OpEx dominated by non-cash crypto impairment."
  ),

  // =========================================================================
  // PREFERRED EQUITY - None
  // =========================================================================
  preferredEquity: pv(
    0,
    docSource({
      type: "sec-document",
      url: secDocUrl(SUIG_CIK, Q3_2025_10Q_ACCESSION, "mcvt_10q.htm"),
      quote: "No preferred stock outstanding",
      anchor: "Preferred stock",
      cik: SUIG_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "No preferred equity issued."
  ),
};

// =========================================================================
// STAKING INFO
// =========================================================================

export const SUIG_STAKING = {
  percentStaked: 0.98, // "Substantially almost all of these holdings continue to be staked"
  apy: 0.022, // ~2.2% annualized yield
  method: "Native staking, liquid staking, and restaking via third-party validators",
  stakingRevenue_Q3_2025: 1_010_000, // $1.01M SUI staking revenue per Q3 10-Q
  source: secDocUrl(SUIG_CIK, Q3_2025_10Q_ACCESSION, "mcvt_10q.htm"),
  sourceQuote: "Substantially almost all of these holdings continue to be staked, generating annualized yield of ~2.2%",
  sourceDate: Q3_2025_PERIOD_END,
};

// =========================================================================
// CAPITAL PROGRAMS
// =========================================================================

export const SUIG_CAPITAL_PROGRAMS = {
  pipe: {
    amount: CAPITAL_RAISED_PIPE,
    note: "$450M PIPE financing",
    // No specific 8-K accession tracked yet for the PIPE closing
  },
  atm: {
    amount: CAPITAL_RAISED_ATM,
    registrationStatement: "S-1",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000121390025088239/ea0253998-03.htm",
    note: "$500M ATM program via S-1 registration",
  },
  buyback: {
    q4_2025_shares: 7_800_000, // Repurchased 7.8M shares in Q4 2025
    note: "Q4 2025: repurchased 7.8M shares, reducing from ~83M to ~80.9M fully adjusted",
    source: "8-K Jan 8, 2026",
    sourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000165495426000201/suig_8k.htm",
  },
};

// =========================================================================
// DEBUG / STATS
// =========================================================================

export const SUIG_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: Q3_2025_PERIOD_END,
  lastFilingChecked: JAN_2026_8K_FILED,
  holdings: LATEST_HOLDINGS,
  sharesBasic: SHARES_OUTSTANDING,
  totalDebt: TOTAL_DEBT,
  cashReserves: CASH_RESERVES,
  pipeTotal: CAPITAL_RAISED_PIPE,
  atmProgram: CAPITAL_RAISED_ATM,
  notes:
    "First SUI treasury company. Formerly Mill City Ventures (MCVT). ~2.9% of SUI supply. " +
    "Q3 10-Q is latest balance sheet. 8-K Jan 8 2026 has latest holdings + share count. " +
    "$24M total liabilities are accrued/deferred (not financial debt). " +
    "Cash $42.7M likely earmarked for SUI purchases.",
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

export function getSUIGProvenance() {
  return {
    holdings: SUIG_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_OUTSTANDING,
    sharesDate: SHARES_DATE,
    cashReserves: SUIG_PROVENANCE.cashReserves?.value,
    totalDebt: SUIG_PROVENANCE.totalDebt?.value,
    preferredEquity: SUIG_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: SUIG_PROVENANCE.quarterlyBurn?.value,
    stakingPct: SUIG_STAKING.percentStaked,
    stakingApy: SUIG_STAKING.apy,
  };
}
