/**
 * DJT (Trump Media & Technology Group Corp.) - Provenance-tracked data
 *
 * Truth Social parent company. $2.5B private placement ($1.5B equity + $1B converts)
 * to fund BTC treasury strategy starting May 2025.
 *
 * Every value traces back to an authoritative source.
 * Click any number → see source → verify at source.
 *
 * ⚠️ NOTES:
 * - No standard crypto XBRL tags (CryptoAssetNumberOfUnits etc.) — DJT uses custom taxonomy
 * - BTC count must be sourced from filing text / 8-K press releases, not XBRL
 * - Holdings figure 11,542 BTC includes ~300 BTC purchased Dec 2025 (post Q3 close)
 * - Q3 2025 quarter-end BTC count was ~11,242 (implied from balance sheet + news)
 * - DJT also holds CRO tokens and $300M in BTC options strategy (not tracked here)
 */

import {
  ProvenanceFinancials,
  pv,
  xbrlSource,
  docSource,
  derivedSource,
} from "../types/provenance";

// SEC CIK for DJT (Trump Media & Technology Group)
export const DJT_CIK = "1849635";

// =========================================================================
// KEY FILINGS
// =========================================================================
const Q3_2025_10Q_ACCESSION = "0001140361-25-040977";
const Q3_2025_10Q_FILED = "2025-11-07";
const Q3_2025_PERIOD_END = "2025-09-30";
const Q3_2025_SHARES_DATE = "2025-11-05"; // Cover page date for share count

const FY2024_10K_ACCESSION = "0001140361-25-004822";
const FY2024_10K_FILED = "2025-02-14";

const Q3_EARNINGS_8K_ACCESSION = "0001140361-25-040969";
const Q3_EARNINGS_8K_FILED = "2025-11-07";

const DEC_2025_8K_ACCESSION = "0001140361-25-046056"; // Material Definitive Agreement
const DEC_2025_8K_FILED = "2025-12-18";

const DEC_2025_TREASURY_8K_ACCESSION = "0001140361-25-046825"; // Treasury update
const DEC_2025_TREASURY_8K_FILED = "2025-12-30";

// =========================================================================
// LATEST DATA POINTS (from XBRL + 8-K filings)
// =========================================================================

// Holdings: 11,542.16 BTC as of Sep 30, 2025 (Q3 2025 10-Q, crypto assets table)
const LATEST_HOLDINGS = 11_542; // BTC (11,542.16 per 10-Q)
const LATEST_HOLDINGS_DATE = "2025-09-30"; // Q3 2025 10-Q period end

// Shares from XBRL: EntityCommonStockSharesOutstanding
const SHARES_OUTSTANDING = 279_997_636;
const SHARES_DATE = Q3_2025_SHARES_DATE;

// Balance sheet from XBRL (Q3 2025)
const TOTAL_ASSETS = 3_265_266_500;
const TOTAL_LIABILITIES = 986_982_400;
const CURRENT_LIABILITIES = 38_574_800;
const NONCURRENT_LIABILITIES = TOTAL_LIABILITIES - CURRENT_LIABILITIES; // $948,407,600

// Debt: $1B zero-coupon convertible senior secured notes due 2030
const CONVERTIBLE_NOTES_PAYABLE = 945_645_500; // XBRL carrying value (< $1B par due to issuance costs)
const LONG_TERM_DEBT = 950_769_100; // XBRL LongTermDebt (includes converts + other)
const LONG_TERM_DEBT_NONCURRENT = 946_079_700; // XBRL LongTermDebtNoncurrent

// Cash
const CASH_UNRESTRICTED = 166_072_700;
const CASH_TOTAL_INCL_RESTRICTED = 501_911_500;
const RESTRICTED_CASH = CASH_TOTAL_INCL_RESTRICTED - CASH_UNRESTRICTED; // $335,838,800

// Revenue & Profit/Loss (XBRL)
const REVENUE_9M_2025 = 2_677_400;
const REVENUE_Q3_2025 = 972_900;
const PROFIT_LOSS_9M_2025 = -106_577_000;
const PROFIT_LOSS_Q3_2025 = -54_848_500;
const OPERATING_LOSS_9M_2025 = -140_701_400;
const OPERATING_LOSS_Q3_2025 = -57_658_400;

// Operating cash flow
const OP_CF_9M_2025 = 2_638_800; // Positive due to working capital changes
const OP_CF_Q1_2025 = -9_737_800;

// Capital raise
const PIPE_TOTAL = 2_500_000_000;
const PIPE_EQUITY = 1_500_000_000;
const PIPE_CONVERTS = 1_000_000_000;

// =========================================================================
// PROVENANCE
// =========================================================================

/**
 * DJT Financial Data with Full Provenance
 */
export const DJT_PROVENANCE: ProvenanceFinancials = {
  // =========================================================================
  // BTC HOLDINGS - from 8-K treasury updates + news verification
  // ⚠️ No XBRL crypto tags — DJT uses custom taxonomy for BTC
  // =========================================================================
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "sec-document",
      searchTerm: "11,542.16",
      url: `https://www.sec.gov/Archives/edgar/data/1849635/000114036125040977/`,
      quote: "Bitcoin 11,542.16 units, Cost Basis $1,368,082.6, Fair Value $1,320,108.6",
      anchor: "Bitcoin",
      cik: DJT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "11,542.16 BTC per Q3 2025 10-Q crypto assets table. Cost basis $1.368B, fair value $1.320B. Also holds CRO tokens (Cronos) and $300M BTC options strategy (not counted here)."
  ),

  // =========================================================================
  // SHARES OUTSTANDING - from XBRL (dei:EntityCommonStockSharesOutstanding)
  // 279,997,636 as of Nov 5, 2025 (Q3 10-Q cover page)
  // =========================================================================
  sharesOutstanding: pv(
    SHARES_OUTSTANDING,
    xbrlSource({
      fact: "dei:EntityCommonStockSharesOutstanding",
      searchTerm: "279,997,636",
      rawValue: SHARES_OUTSTANDING,
      unit: "shares",
      periodType: "instant",
      periodEnd: Q3_2025_SHARES_DATE,
      cik: DJT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Common Stock Outstanding",
    }),
    "Post-PIPE share count. Pre-PIPE was ~199M; ~81M new shares issued in Q2 2025 private placement."
  ),

  // =========================================================================
  // TOTAL DEBT - from XBRL (us-gaap:LongTermDebt)
  // $1B zero-coupon convertible senior secured notes due 2030
  // Carrying value ~$951M (par minus issuance costs)
  // =========================================================================
  totalDebt: pv(
    LONG_TERM_DEBT,
    xbrlSource({
      fact: "us-gaap:LongTermDebt",
      searchTerm: "950,769",
      rawValue: LONG_TERM_DEBT,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: DJT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Long-term Debt",
    }),
    "$1B par zero-coupon convertible senior secured notes due 2030. Carrying value ~$951M reflects issuance costs. ConvertibleNotesPayable XBRL = $945.6M. Part of $2.5B private placement (May 2025)."
  ),

  // =========================================================================
  // CASH RESERVES - from XBRL
  // Unrestricted: $166M | Total (incl restricted): $502M
  // Most of $2.5B raise deployed into BTC by Q3
  // =========================================================================
  cashReserves: pv(
    CASH_UNRESTRICTED,
    xbrlSource({
      fact: "us-gaap:CashAndCashEquivalentsAtCarryingValue",
      searchTerm: "166,072,700",
      rawValue: CASH_UNRESTRICTED,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: DJT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Cash and cash equivalents",
    }),
    "Unrestricted cash only ($166M). Total including restricted: $502M ($336M restricted from convertible proceeds). Down from $1.34B unrestricted at Q2 — deployed into BTC."
  ),

  // =========================================================================
  // QUARTERLY BURN - derived from 9M 2025 operating cash flow
  // 9M 2025 OpCF: +$2.6M → ~$880K/quarter (essentially breakeven)
  // =========================================================================
  quarterlyBurn: pv(
    0, // 9M 2025 OpCF is +$2.6M — operations are cash-flow positive, no burn
    xbrlSource({
      fact: "us-gaap:NetCashProvidedByUsedInOperatingActivities",
      searchTerm: "2,638,800",
      rawValue: 2_638_800,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-01-01",
      periodEnd: "2025-09-30",
      cik: DJT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: "2025-11-07",
      documentAnchor: "Cash provided by operating activities",
    }),
    "9M 2025 operating cash flow: +$2.6M. Operations are cash-flow neutral/positive — no burn."
  ),

  // =========================================================================
  // RESTRICTED CASH - from XBRL
  // $336M restricted from convertible proceeds
  // =========================================================================
  restrictedCash: pv(
    RESTRICTED_CASH,
    xbrlSource({
      fact: "us-gaap:RestrictedCash",
      searchTerm: "335,838.8",
      rawValue: RESTRICTED_CASH,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: DJT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Restricted cash",
    }),
    "Restricted cash from convertible note proceeds. Total cash = $502M ($166M unrestricted + $336M restricted)."
  ),

  // =========================================================================
  // REVENUE (Q3 2025)
  // =========================================================================
  revenueQ3: pv(
    REVENUE_Q3_2025,
    xbrlSource({
      fact: "us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax",
      searchTerm: "972.9",
      rawValue: REVENUE_Q3_2025,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-07-01",
      periodEnd: "2025-09-30",
      cik: DJT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Net sales",
    }),
    "Truth Social revenue (~$1M/quarter). Minimal relative to treasury strategy."
  ),

  // =========================================================================
  // NET LOSS (Q3 2025)
  // =========================================================================
  netLossQ3: pv(
    Math.abs(PROFIT_LOSS_Q3_2025),
    xbrlSource({
      fact: "us-gaap:ProfitLoss",
      searchTerm: "54,848.5",
      rawValue: PROFIT_LOSS_Q3_2025,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-07-01",
      periodEnd: "2025-09-30",
      cik: DJT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Net loss",
    }),
    "Includes crypto fair value changes. Operating loss was -$57.7M."
  ),

  // =========================================================================
  // PREFERRED EQUITY - None
  // =========================================================================
  preferredEquity: pv(
    0,
    docSource({
      type: "sec-document",
      url: `https://www.sec.gov/Archives/edgar/data/1849635/000114036125040977/`,
      quote: "No preferred stock outstanding",
      anchor: "Preferred stock",
      cik: DJT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "No preferred equity issued."
  ),
};

// =========================================================================
// CAPITAL RAISE DETAILS
// =========================================================================

export interface DJTCapitalRaise {
  announcedDate: string;
  secApprovalDate: string;
  firstPurchasesDate: string;
  totalProceeds: number;
  equityComponent: number;
  debtComponent: number;
  sharesIssued: number;  // ~81M new shares
  convertMaturity: string;
  convertCoupon: number;
  convertParValue: number;
  investors: number;  // ~50 institutional
  custodians: string[];
}

export const DJT_CAPITAL_RAISE: DJTCapitalRaise = {
  announcedDate: "2025-05-01",
  secApprovalDate: "2025-06-01",  // Approximate
  firstPurchasesDate: "2025-07-01",  // First major BTC purchases
  totalProceeds: PIPE_TOTAL,
  equityComponent: PIPE_EQUITY,
  debtComponent: PIPE_CONVERTS,
  sharesIssued: 80_000_000,  // ~81M shares (199M → 280M)
  convertMaturity: "2030",
  convertCoupon: 0,  // Zero-coupon
  convertParValue: 1_000_000_000,
  investors: 50,
  custodians: ["Crypto.com", "Anchorage Digital"],
};

// =========================================================================
// BALANCE SHEET DETAIL (Q3 2025)
// =========================================================================

export const DJT_BALANCE_SHEET = {
  periodEnd: Q3_2025_PERIOD_END,
  accession: Q3_2025_10Q_ACCESSION,
  totalAssets: TOTAL_ASSETS,
  currentAssets: 1_650_172_200,
  cashUnrestricted: CASH_UNRESTRICTED,
  cashTotalInclRestricted: CASH_TOTAL_INCL_RESTRICTED,
  restrictedCash: RESTRICTED_CASH,
  totalLiabilities: TOTAL_LIABILITIES,
  currentLiabilities: CURRENT_LIABILITIES,
  noncurrentLiabilities: NONCURRENT_LIABILITIES,
  convertibleNotesPayable: CONVERTIBLE_NOTES_PAYABLE,
  longTermDebt: LONG_TERM_DEBT,
  stockholdersEquity: TOTAL_ASSETS - TOTAL_LIABILITIES, // $2,278,284,100
};

// =========================================================================
// INCOME STATEMENT DATA (from XBRL)
// =========================================================================

export const DJT_INCOME_STATEMENT = {
  // Revenue (RevenueFromContractWithCustomerExcludingAssessedTax)
  revenue: {
    q3_2025: REVENUE_Q3_2025,        // $972,900
    ytd_9m_2025: REVENUE_9M_2025,    // $2,677,400
  },
  // Net loss (ProfitLoss)
  profitLoss: {
    q1_2025: -31_726_600,
    q2_2025: -20_001_900,
    q3_2025: PROFIT_LOSS_Q3_2025,     // -$54,848,500
    ytd_9m_2025: PROFIT_LOSS_9M_2025, // -$106,577,000
  },
  // Operating loss
  operatingLoss: {
    q3_2025: OPERATING_LOSS_Q3_2025,     // -$57,658,400
    ytd_9m_2025: OPERATING_LOSS_9M_2025, // -$140,701,400
  },
  // Weighted avg diluted shares
  dilutedShares: {
    q3_2025: 277_876_654,
    ytd_9m_2025: 246_529_179,
  },
};

// =========================================================================
// CASH FLOW HISTORY
// =========================================================================

export const DJT_CASH_FLOW = {
  operatingCF: {
    q1_2025: OP_CF_Q1_2025,      // -$9,737,800
    h1_2025: -7_434_700,          // -$7,434,700 (Q2 was positive due to WC)
    ytd_9m_2025: OP_CF_9M_2025,  // +$2,638,800 (positive due to WC changes)
    fy2024: -60_982_700,          // -$61M full year
  },
};

// =========================================================================
// SHARE COUNT HISTORY (from XBRL)
// =========================================================================

export const DJT_SHARE_HISTORY = [
  { date: "2024-03-31", shares: 199_000_000, note: "Pre-PIPE" },
  { date: "2024-06-30", shares: 199_000_000, note: "Pre-PIPE" },
  { date: "2024-09-30", shares: 199_000_000, note: "Pre-PIPE" },
  { date: "2024-12-31", shares: 199_000_000, note: "Pre-PIPE" },
  { date: "2025-03-31", shares: 199_000_000, note: "Pre-PIPE" },
  { date: "2025-06-30", shares: 280_000_000, note: "Post-PIPE (~81M new shares)" },
  { date: "2025-11-05", shares: 279_997_636, note: "Q3 10-Q cover page (XBRL verified)" },
];

// =========================================================================
// KNOWN GAPS / TODO
// =========================================================================

export const DJT_TODO = {
  convertibleTerms: "Strike price / conversion ratio not verified — check 8-K EX-2.1 from Dec 18, 2025",
  djtwwWarrants: "DJTWW public warrants exist (legacy SPAC) — count and strike not verified",
  earnoutShares: "Earnout shares from DWAC merger — status/tranches unknown",
  croHoldings: "DJT holds CRO tokens (Crypto.com) — amount not quantified",
  btcOptions: "$300M allocated to BTC options strategy — not tracked in holdings",
  fy2025_10k: "Expected ~March 2026 — will have first post-BTC annual balance sheet",
  exactQ3BTC: "Exact Q3 quarter-end BTC count needs verification from 10-Q text (XBRL has no crypto tags)",
};

// =========================================================================
// DEBUG / STATS
// =========================================================================

export const DJT_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: Q3_2025_PERIOD_END,
  lastFilingChecked: DEC_2025_TREASURY_8K_FILED,
  holdings: LATEST_HOLDINGS,
  sharesBasic: SHARES_OUTSTANDING,
  totalDebt: LONG_TERM_DEBT,
  cashUnrestricted: CASH_UNRESTRICTED,
  cashTotalInclRestricted: CASH_TOTAL_INCL_RESTRICTED,
  convertibleCarryingValue: CONVERTIBLE_NOTES_PAYABLE,
  pipeTotal: PIPE_TOTAL,
  notes:
    "Truth Social parent. $2.5B raise ($1.5B equity + $1B zero-coupon converts due 2030). No standard crypto XBRL tags. Also holds CRO + $300M BTC options (not counted). DJTWW warrants + earnout shares need verification.",
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

export function getDJTProvenance() {
  return {
    holdings: DJT_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_OUTSTANDING,
    sharesDate: SHARES_DATE,
    cashReserves: DJT_PROVENANCE.cashReserves?.value,
    cashTotalInclRestricted: CASH_TOTAL_INCL_RESTRICTED,
    totalDebt: DJT_PROVENANCE.totalDebt?.value,
    preferredEquity: DJT_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: DJT_PROVENANCE.quarterlyBurn?.value,
    convertibleNotesPayable: CONVERTIBLE_NOTES_PAYABLE,
  };
}
