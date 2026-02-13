/**
 * FWDI (Forward Industries) — SOL Treasury Company
 *
 * All values traced to SEC EDGAR filings or official company sources.
 * Click any metric → see source → verify at source.
 *
 * Fiscal Year End: September 30
 * CIK: 0000038264
 * Asset: SOL
 *
 * Latest filings:
 *   10-Q Q1 FY2026: 0001683168-26-000960 (filed 2026-02-12, period Dec 31, 2025)
 *   10-K FY2025:    0001683168-25-009068 (filed 2025-12-11, period Sep 30, 2025)
 */

import {
  type ProvenanceFinancials,
  pv,
  xbrlSource,
  docSource,
} from "../types/provenance";

// SEC CIK
export const FWDI_CIK = "0000038264";

// =========================================================================
// KEY FILINGS
// =========================================================================
const Q1_FY2026_10Q_ACCESSION = "0001683168-26-000960";
const Q1_FY2026_10Q_FILED = "2026-02-12";
const Q1_FY2026_PERIOD_END = "2025-12-31";

const FY2025_10K_ACCESSION = "0001683168-25-009068";
const FY2025_10K_FILED = "2025-12-11";
const FY2025_PERIOD_END = "2025-09-30";

// =========================================================================
// VALUES — from XBRL + document text
// =========================================================================

// SOL Holdings
// 10-Q Dec 31: 4,973,000 SOL (raw) + ~2M in LST form (fwdSOL, reported separately)
// Website Jan 15, 2026: 6,979,967 SOL-equivalent (includes LSTs)
// 10-K Sep 30: 6,854,000 SOL (XBRL CryptoAssetNumberOfUnits)
const SOL_RAW_Q1_FY2026 = 4_973_000;       // 10-Q: raw SOL count
const SOL_EQUIVALENT_JAN15 = 6_979_967;     // Website: SOL + LSTs
const SOL_10K = 6_854_000;                   // 10-K XBRL
const LATEST_HOLDINGS = SOL_EQUIVALENT_JAN15;
const LATEST_HOLDINGS_DATE = "2026-01-15";

// Shares
const SHARES_COMMON_DEC31 = 84_924_272;     // 10-Q balance sheet
const SHARES_COMMON_JAN31 = 83_139_037;     // 10-Q cover page
const PREFUNDED_WARRANTS = 12_864_602;       // 10-Q: outstanding PFWs @ $0.00001
const SHARES_DATE = "2026-01-31";

// sharesForMnav = common + pre-funded warrants (PFWs are essentially shares at $0.00001)
const SHARES_FOR_MNAV = SHARES_COMMON_JAN31 + PREFUNDED_WARRANTS; // 96,003,639

// Debt — ZERO
const TOTAL_DEBT = 0;

// Cash
const CASH_DEC31 = 25_388_079;              // 10-Q XBRL
const CASH_JAN31_EST = 12_000_000;          // 10-Q MD&A text: "approximately $12 million"

// Cost basis
const COST_BASIS_SEP30 = 1_590_521_000;     // 10-K: $1.59B for 6,854,000 SOL
const COST_BASIS_DEC31 = 972_822_000;       // 10-Q: $972.8M for 4,973,000 raw SOL
const COST_BASIS_AVG_SEP30 = COST_BASIS_SEP30 / SOL_10K; // ~$232.07/SOL
const COST_BASIS_AVG_DEC31 = COST_BASIS_DEC31 / SOL_RAW_Q1_FY2026; // ~$195.60/SOL

// Operating metrics (Q1 FY2026)
const GA_EXPENSE_Q1 = 3_252_629;
const OP_CF_Q1 = -7_929_151;
const REVENUE_Q1 = 21_435_250;
const STAKING_REVENUE_Q1 = 17_381_000;
const NET_LOSS_Q1 = -585_651_086;            // Includes massive unrealized SOL FV loss
const OPERATING_LOSS_Q1 = -583_639_575;

// Liabilities
const TOTAL_LIABILITIES_DEC31 = 12_084_535;  // All current (no long-term debt)

// =========================================================================
// PROVENANCE
// =========================================================================

export const FWDI_PROVENANCE: ProvenanceFinancials = {
  // =========================================================================
  // SOL HOLDINGS — SOL-equivalent (raw SOL + LSTs like fwdSOL)
  // 10-Q shows 4,973,000 raw SOL; website shows 6,979,967 SOL-equivalent
  // Difference is liquid staking tokens (fwdSOL) reported as "not measured at FV"
  // =========================================================================
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "company-website",
      url: "https://www.forwardindustries.com/",
      quote: "6,979,967 SOL as of January 15, 2026",
      anchor: "SOL Holdings",
      sourceName: "Forward Industries IR",
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    `SOL-equivalent (raw SOL + liquid staking tokens). 10-Q Dec 31 shows 4,973,000 raw SOL (cost $972.8M) + $201.6M in "digital assets not measured at fair value" (likely fwdSOL). Website Jan 15 total: 6,979,967.`
  ),

  // =========================================================================
  // SHARES OUTSTANDING
  // 83,139,037 common (Jan 31, 2026 cover page)
  // + 12,864,602 pre-funded warrants @ $0.00001 (essentially shares)
  // = 95,003,639 for mNAV (PFWs included in basic EPS per 10-Q)
  // =========================================================================
  sharesOutstanding: pv(
    SHARES_FOR_MNAV,
    xbrlSource({
      fact: "dei:EntityCommonStockSharesOutstanding",
      searchTerm: "83,139,037",
      rawValue: SHARES_COMMON_JAN31,
      unit: "shares",
      periodType: "instant",
      periodEnd: SHARES_DATE,
      cik: FWDI_CIK,
      accession: Q1_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_FY2026_10Q_FILED,
      documentAnchor: "Common Stock Outstanding",
    }),
    `83,139,037 common + 12,864,602 pre-funded warrants @ $0.00001 = 96,003,639. PFWs included in basic EPS per 10-Q. Shares decreasing due to $1B buyback program (3.3M repurchased through Jan 2026 at avg $7.32).`
  ),

  // =========================================================================
  // TOTAL DEBT — $0 (debt free)
  // =========================================================================
  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "sec-document",
      searchTerm: "12,084",
      url: `https://www.sec.gov/Archives/edgar/data/38264/000168316826000960/forward_i10q-123125.htm`,
      quote: "Total liabilities $12,084,535 (all current — taxes, accrued expenses, leases)",
      anchor: "Total liabilities",
      cik: FWDI_CIK,
      accession: Q1_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_FY2026_10Q_FILED,
      documentDate: Q1_FY2026_PERIOD_END,
    }),
    "Zero long-term debt. Total liabilities $12.1M are all current (taxes, accrued expenses, lease liability). Debt free since inception of SOL strategy."
  ),

  // =========================================================================
  // CASH RESERVES
  // Dec 31: $25.4M | Jan 31: ~$12M (declining due to buybacks)
  // =========================================================================
  cashReserves: pv(
    CASH_JAN31_EST,
    docSource({
      type: "sec-document",
      searchTerm: "approximately $12 million",
      url: `https://www.sec.gov/Archives/edgar/data/38264/000168316826000960/forward_i10q-123125.htm`,
      quote: "approximately $12 million in cash as of January 31, 2026",
      anchor: "Cash and cash equivalents",
      cik: FWDI_CIK,
      accession: Q1_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_FY2026_10Q_FILED,
      documentDate: "2026-01-31",
    }),
    "~$12M at Jan 31 per 10-Q MD&A. Down from $25.4M at Dec 31 and $38.2M at Sep 30 — declining due to $24.4M in share buybacks plus operating costs."
  ),

  // =========================================================================
  // QUARTERLY BURN — G&A expense Q1 FY2026
  // =========================================================================
  quarterlyBurn: pv(
    GA_EXPENSE_Q1,
    xbrlSource({
      fact: "us-gaap:GeneralAndAdministrativeExpense",
      searchTerm: "3,252",
      rawValue: GA_EXPENSE_Q1,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-10-01",
      periodEnd: Q1_FY2026_PERIOD_END,
      cik: FWDI_CIK,
      accession: Q1_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_FY2026_10Q_FILED,
      documentAnchor: "General and administrative",
    }),
    "Q1 FY2026 G&A: $3.25M. Up from ~$2.4M/qtr avg in FY2025 due to treasury-related costs. Galaxy asset management fees: $1.74M/qtr additional. OpCF was -$7.9M in Q1."
  ),

  // =========================================================================
  // PREFERRED EQUITY — None
  // =========================================================================
  preferredEquity: pv(
    0,
    docSource({
      type: "sec-document",
      url: `https://www.sec.gov/Archives/edgar/data/38264/000168316826000960/forward_i10q-123125.htm`,
      quote: "Series A-1 Convertible Preferred: 0 shares outstanding",
      anchor: "Preferred stock",
      cik: FWDI_CIK,
      accession: Q1_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_FY2026_10Q_FILED,
      documentDate: Q1_FY2026_PERIOD_END,
    }),
    "Series A-1 Convertible Preferred fully converted to common. Zero outstanding."
  ),

  // =========================================================================
  // REVENUE (Q1 FY2026) — Staking + Design segments
  // =========================================================================
  revenueQ3: pv(
    REVENUE_Q1,
    xbrlSource({
      fact: "us-gaap:Revenues",
      searchTerm: "21,435",
      rawValue: REVENUE_Q1,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-10-01",
      periodEnd: Q1_FY2026_PERIOD_END,
      cik: FWDI_CIK,
      accession: Q1_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_FY2026_10Q_FILED,
      documentAnchor: "Revenues",
    }),
    "Q1 FY2026: $21.4M total ($17.4M staking at 92% margin + $4.1M design segment). Staking revenue is the primary driver."
  ),

  // =========================================================================
  // NET LOSS (Q1 FY2026) — Dominated by unrealized SOL FV loss
  // =========================================================================
  netLossQ3: pv(
    Math.abs(NET_LOSS_Q1),
    xbrlSource({
      fact: "us-gaap:NetIncomeLoss",
      searchTerm: "585,651",
      rawValue: NET_LOSS_Q1,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-10-01",
      periodEnd: Q1_FY2026_PERIOD_END,
      cik: FWDI_CIK,
      accession: Q1_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_FY2026_10Q_FILED,
      documentAnchor: "Net loss",
    }),
    "Dominated by $560M unrealized SOL mark-to-market loss (non-cash). Operating loss -$583.6M. Staking operations profitable at segment level."
  ),
};

// =========================================================================
// BALANCE SHEET DETAIL (Q1 FY2026, Dec 31, 2025)
// =========================================================================
export const FWDI_BALANCE_SHEET = {
  periodEnd: Q1_FY2026_PERIOD_END,
  accession: Q1_FY2026_10Q_ACCESSION,
  totalAssets: 892_946_117,
  cashAndEquivalents: CASH_DEC31,
  totalLiabilities: TOTAL_LIABILITIES_DEC31,
  currentLiabilities: TOTAL_LIABILITIES_DEC31, // all current
  longTermDebt: 0,
  stockholdersEquity: 892_946_117 - TOTAL_LIABILITIES_DEC31,
  // Digital assets breakdown
  solRaw: SOL_RAW_Q1_FY2026,
  solRawCostBasis: COST_BASIS_DEC31,
  solRawCarryingValue: 619_277_000,
  digitalAssetsNotAtFV: 201_560_000,  // fwdSOL / LSTs
  doubleZeroTokens: { units: 20_000_000, cost: 1_000_000, carryingValue: 2_428_000 },
  otherDigitalAssets: 3_498_000,
  totalDigitalAssetsCost: 1_178_882_000,
  totalDigitalAssetsCarrying: 826_763_000,
};

// =========================================================================
// STAKING DATA
// =========================================================================
export const FWDI_STAKING = {
  stakingRevenueQ1FY2026: STAKING_REVENUE_Q1,    // $17.4M
  stakingCostQ1FY2026: 1_398_000,                 // $1.4M
  stakingGrossProfit: 15_983_000,                  // 92% margin
  stakedAssetsValueDec31: 820_800_000,             // $820.8M staked
  stakedAssetsValueSep30: 1_430_500_000,           // $1.43B staked
  estimatedApy: 0.085,                             // ~8.5% gross
  stakingRevenueFY2025: 4_360_000,                 // $4.36M (only ~3 weeks in Sep)
  assetManagementFeesQ1: 1_739_000,                // Galaxy advisory fee
};

// =========================================================================
// INCOME STATEMENT (Q1 FY2026)
// =========================================================================
export const FWDI_INCOME_STATEMENT = {
  revenue: {
    q1_fy2026: REVENUE_Q1,
    staking_q1_fy2026: STAKING_REVENUE_Q1,
    design_q1_fy2026: 4_054_000,
    fy2025: 18_187_525,
  },
  netLoss: {
    q1_fy2026: NET_LOSS_Q1,
    fy2025: -166_974_340,
  },
  operatingLoss: {
    q1_fy2026: OPERATING_LOSS_Q1,
    fy2025: -8_392_420,
  },
  gaExpense: {
    q1_fy2026: GA_EXPENSE_Q1,
    fy2025: 9_604_490,
  },
  operatingCashFlow: {
    q1_fy2026: OP_CF_Q1,
    fy2025: -4_502_087,
  },
};

// =========================================================================
// CAPITAL RAISE & SHARE ACTIVITY
// =========================================================================
export const FWDI_CAPITAL = {
  pipeTotal: 1_650_000_000,
  pipeClosedDate: "2025-09-11",
  initialPurchases: { sol: 6_822_000, avgPrice: 232, date: "2025-09-15" },
  atmAgent: "Cantor Fitzgerald",
  atmSharesSoldQ1: 311_951,
  atmProceedsQ1: 7_457_186,
  atmSharesReserved: 102_128_488,
  buybackAuthorized: 1_000_000_000,
  buybackUsed: 24_387_000,
  buybackShares: 3_330_000,
  buybackAvgPrice: 7.32,
  buybackPeriod: "Nov 2025 – Sep 2027",
};

// =========================================================================
// DEBUG / STATS
// =========================================================================
export const FWDI_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: Q1_FY2026_PERIOD_END,
  lastFilingChecked: Q1_FY2026_10Q_FILED,
  holdings: LATEST_HOLDINGS,
  holdingsRawSol: SOL_RAW_Q1_FY2026,
  holdingsNote: "6,979,967 = SOL-equivalent (raw SOL + LSTs). 10-Q shows 4,973,000 raw SOL + $201.6M in LST form.",
  sharesCommon: SHARES_COMMON_JAN31,
  prefundedWarrants: PREFUNDED_WARRANTS,
  sharesForMnav: SHARES_FOR_MNAV,
  totalDebt: TOTAL_DEBT,
  cashLatest: CASH_JAN31_EST,
  costBasisAvgSep30: Math.round(COST_BASIS_AVG_SEP30 * 100) / 100,
  costBasisAvgDec31: Math.round(COST_BASIS_AVG_DEC31 * 100) / 100,
  notes: "10-Q Q1 FY2026 filed Feb 12, 2026. Shares declining via $1B buyback. Cash declining. Staking $17.4M/qtr revenue.",
};
