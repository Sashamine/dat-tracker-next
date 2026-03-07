/**
 * HSDT (Solana Company, fka Helius Medical) — SOL Treasury Company
 *
 * All values traced to SEC EDGAR filings.
 * Click any metric → see source → verify at source.
 *
 * Fiscal Year End: December 31
 * CIK: 0001610853
 * Asset: SOL
 *
 * Latest filings:
 *   10-Q Q3 2025:  0001104659-25-113714 (filed 2025-11-18, period Sep 30, 2025)
 *   10-K FY 2024:  0001558370-25-003619 (filed 2025-03-25, period Dec 31, 2024)
 *   8-K Oct 29:    0001104659-25-103714 (filed 2025-10-29, ~2.3M SOL disclosure)
 */

import {
  type ProvenanceFinancials,
  pv,
  xbrlSource,
  docSource,
  derivedSource,
} from "../types/provenance";

// SEC CIK
export const HSDT_CIK = "0001610853";

// =========================================================================
// KEY FILINGS
// =========================================================================
const Q3_2025_10Q_ACCESSION = "0001104659-25-113714";
const Q3_2025_10Q_FILED = "2025-11-18";
const Q3_2025_PERIOD_END = "2025-09-30";

const OCT29_8K_ACCESSION = "0001104659-25-103714";
const OCT29_8K_FILED = "2025-10-29";

const PIPE_8K_ACCESSION = "0001104659-25-089774";  // Sep 15 PIPE 8-K

// =========================================================================
// VALUES — from XBRL + document text
// =========================================================================

// SOL Holdings
// XBRL Q3 2025: CryptoAssetNumberOfUnits = 1,739,355 (Sep 30)
// 8-K Oct 29: ~2,300,000 SOL (approximate)
// 10-Q Note 10 (Subsequent Events, Nov 18): 2,340,757 SOL (most precise/current)
const SOL_XBRL_Q3 = 1_739_355;
const SOL_OCT29_8K = 2_300_000;
const SOL_10Q_NOTE10 = 2_340_757;
const LATEST_HOLDINGS = SOL_10Q_NOTE10;  // Most current — 10-Q Subsequent Events
const LATEST_HOLDINGS_DATE = "2025-11-18";

// Shares
// Feb 20, 2026 8-K (accn 0001104659-26-018212):
//   52,802,604 Class A common shares issued and outstanding
//   23,930,181 pre-funded warrants outstanding
//   Total: 76,732,785
// Change from Sep 30: basic +12.5M (ATM issuance), PFWs -11.7M (exercised into common), net +806K
// Prior (Sep 30): 40,299,228 basic + 35,627,639 PFWs = 75,926,867
const FEB20_8K_ACCESSION = "0001104659-26-018212";
const SHARES_BASIC_FEB20 = 52_802_604;  // 8-K Feb 20, 2026
const SHARES_BASIC_SEP30 = 40_299_228;  // Balance sheet Sep 30 (historical)
const SHARES_BASIC_NOV17 = 41_301_400;  // Cover page Nov 17 (historical)
const PREFUNDED_WARRANTS = 23_930_181;  // 8-K Feb 20, 2026 (was 35,627,639 at Sep 30)
const SHARES_FOR_MNAV = 76_732_785;  // Feb 20 basic + Feb 20 PFWs
const SHARES_DATE = "2026-02-20";

// Financial data (Q3 2025 10-Q XBRL + Oct 29 8-K update)
// XBRL Sep 30: $124,051,000. But 10-Q Note 10 shows $124.6M spent on SOL post-Q3.
// Oct 29 8-K: ">$15M of cash and stablecoins" — best available estimate.
const CASH = 15_000_000;  // Oct 29 8-K estimate. XBRL Sep 30 was $124,051,000.
const TOTAL_DEBT = 0;  // No LongTermDebt in XBRL (404)
const QUARTERLY_BURN = 5_504_000;  // SGA $4,646K + R&D $858K = $5,504K total opex Q3 2025 (Jul-Sep)
const PREFERRED_EQUITY = 0;  // No PreferredStockValue

// Staking
export const HSDT_STAKING = {
  stakingPct: 0.9996,  // 10-Q Note 3: 1,738,682 staked / 1,739,355 total = 99.96%
  stakingApy: 0.0703,
  stakingMethod: "Native staking via Anchorage Digital custody",
  stakingCommenced: "September 2025",
  stakingRevenueQ3: 342_000,  // Q3 2025 10-Q (partial quarter — staking commenced Sep 2025)
};

// Capital raises
export const HSDT_CAPITAL = {
  pipeTotal: 500_000_000,
  pipeClosedDate: "2025-09-15",
  pipeLeadInvestors: ["Pantera Capital", "Summer Capital"],
  pipe8kAccession: PIPE_8K_ACCESSION,
};

// =========================================================================
// PROVENANCE
// =========================================================================

export const HSDT_PROVENANCE: ProvenanceFinancials = {
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "sec-document",
      searchTerm: "2,340,757 SOL",
      url: `/filings/hsdt/0001104659-25-113714`,
      quote: "the Company held directly or had rights to 2,340,757 SOL",
      anchor: "SOL Holdings",
      cik: HSDT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "10-Q Note 10 (Subsequent Events, Nov 18). XBRL Q3 = 1,739,355 at Sep 30. Purchased net 587,737 SOL post-Q3 at $211.97."
  ),

  sharesOutstanding: pv(
    SHARES_FOR_MNAV,
    docSource({
      type: "sec-document",
      searchTerm: "52,802,604",
      url: `/filings/hsdt/0001104659-26-018212`,
      quote: "52,802,604 shares of Class A common stock issued and outstanding; 23,930,181 pre-funded warrants outstanding",
      anchor: "Shares Outstanding",
      cik: HSDT_CIK,
      accession: FEB20_8K_ACCESSION,
      filingType: "8-K",
      filingDate: "2026-02-20",
      documentDate: SHARES_DATE,
    }),
    `8-K Feb 20, 2026: ${SHARES_BASIC_FEB20.toLocaleString()} basic + ${PREFUNDED_WARRANTS.toLocaleString()} PFWs @ $0.001 = ${SHARES_FOR_MNAV.toLocaleString()}. Prior (Sep 30): 40.3M basic + 35.6M PFWs = 75.9M. PFW exercises converted ~11.7M to common; net +806K from ATM issuance.`
  ),

  totalDebt: pv(
    TOTAL_DEBT,
    xbrlSource({
      fact: "us-gaap:LongTermDebt",
      searchTerm: "Total liabilities",
      rawValue: 0,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: HSDT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Balance Sheet",
    }),
    "No LongTermDebt XBRL tag reported. Balance sheet shows no long-term borrowings."
  ),

  cashReserves: pv(
    CASH,
    docSource({
      type: "sec-document",
      searchTerm: "$15 million",
      url: `/filings/hsdt/0001104659-25-103714`,
      quote: "more than $15 million of cash and stablecoins",
      anchor: "Cash",
      cik: HSDT_CIK,
      accession: OCT29_8K_ACCESSION,
      filingType: "8-K",
      filingDate: OCT29_8K_FILED,
      documentDate: "2025-10-29",
    }),
    "Oct 29 8-K: >$15M cash+stablecoins. XBRL Sep 30 was $124M but ~$109M deployed into SOL purchases post-Q3 (10-Q Note 10: 587K SOL at $211.97). ~$15M is best estimate pending 10-K FY2025."
  ),

  quarterlyBurn: pv(
    QUARTERLY_BURN,
    xbrlSource({
      fact: "us-gaap:SellingGeneralAndAdministrativeExpense + ResearchAndDevelopmentExpense",
      searchTerm: "4,646",
      rawValue: QUARTERLY_BURN,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-07-01",
      periodEnd: Q3_2025_PERIOD_END,
      cik: HSDT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Total operating expenses",
    }),
    "Q3 2025 total opex: SGA $4,646K + R&D $858K = $5,504K. R&D is legacy medical device wind-down, declining."
  ),

  preferredEquity: pv(
    PREFERRED_EQUITY,
    docSource({
      type: "sec-document",
      url: `/filings/hsdt/0001104659-25-113714`,
      quote: "No preferred stock line item on balance sheet",
      anchor: "Preferred Stock",
      cik: HSDT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "No preferred equity — absent from balance sheet."
  ),
};

// =========================================================================
// DEBUG / STATS
// =========================================================================
export const HSDT_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: Q3_2025_PERIOD_END,
  lastFilingChecked: "2026-02-20",
  holdings: LATEST_HOLDINGS,
  sharesBasicFeb20: SHARES_BASIC_FEB20,
  sharesBasicSep30: SHARES_BASIC_SEP30,
  sharesBasicNov17: SHARES_BASIC_NOV17,
  sharesFD: SHARES_FOR_MNAV,
  prefundedWarrants: PREFUNDED_WARRANTS,
  totalDebt: TOTAL_DEBT,
  cash: CASH,
  quarterlyBurn: QUARTERLY_BURN,
  notes: "Shares updated from 8-K Feb 20, 2026. Holdings still from 10-Q Note 10 (Nov 18) — STALE, likely higher after continued ATM-funded SOL purchases. Cash ($15M) from Oct 29, 2025 8-K — STALE. 10-K FY2025 expected ~Mar 2026 will update all fields. Dilutives: 73.9M stapled @ $10.134, 7.4M advisor @ $0.001, 617 HSDTW @ $6.756.",
};

// =========================================================================
// HELPER
// =========================================================================
export function getHSDTProvenance() {
  return {
    holdings: HSDT_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_BASIC_NOV17,
    sharesFD: SHARES_FOR_MNAV,
    sharesDate: SHARES_DATE,
    cashReserves: HSDT_PROVENANCE.cashReserves?.value,
    totalDebt: HSDT_PROVENANCE.totalDebt?.value,
    preferredEquity: HSDT_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: HSDT_PROVENANCE.quarterlyBurn?.value,
  };
}
