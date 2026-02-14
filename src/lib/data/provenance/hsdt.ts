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
// 8-K Oct 29: ~2,300,000 SOL (most recent disclosure)
const SOL_XBRL_Q3 = 1_739_355;
const SOL_OCT29_8K = 2_300_000;
const LATEST_HOLDINGS = SOL_OCT29_8K;  // Most recent
const LATEST_HOLDINGS_DATE = "2025-10-29";

// Shares
// XBRL: EntityCommonStockSharesOutstanding = 41,301,400 (basic, cover page Nov 17)
// Press release: "75.9 million common shares and pre-funded warrants outstanding"
// Pre-funded warrants at $0.00001 are economically equivalent to shares
const SHARES_BASIC = 41_301_400;
const PREFUNDED_WARRANTS = 34_598_600;  // 75.9M - 41.3M
const SHARES_FOR_MNAV = 75_900_000;  // basic + PFWs
const SHARES_DATE = "2025-11-17";

// Financial data (Q3 2025 10-Q XBRL)
const CASH = 124_051_000;  // CashAndCashEquivalentsAtCarryingValue Sep 30
const TOTAL_DEBT = 0;  // No LongTermDebt in XBRL (404)
const QUARTERLY_BURN = 4_646_000;  // SGA Q3 2025 (Jul-Sep)
const PREFERRED_EQUITY = 0;  // No PreferredStockValue

// Staking
export const HSDT_STAKING = {
  stakingPct: 0.95,
  stakingApy: 0.0703,
  stakingMethod: "Native staking via Anchorage Digital custody",
  stakingCommenced: "September 2025",
  stakingRevenueQ3: 342_000,  // Q3 2025 10-Q
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
      searchTerm: "2.3 million SOL",
      url: `https://www.sec.gov/Archives/edgar/data/1610853/000110465925103714/hsdt-20251029xex99d1.htm`,
      quote: "hold over 2.3 million SOL",
      anchor: "SOL Holdings",
      cik: HSDT_CIK,
      accession: OCT29_8K_ACCESSION,
      filingType: "8-K",
      filingDate: OCT29_8K_FILED,
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "Oct 29, 2025 8-K press release. XBRL Q3 shows 1,739,355 SOL at Sep 30 (pre-Oct purchases)."
  ),

  sharesOutstanding: pv(
    SHARES_FOR_MNAV,
    docSource({
      type: "sec-document",
      searchTerm: "41,301,400",
      url: `https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/hsdt-20250930x10q.htm`,
      quote: "the registrant had 41,301,400 shares of Class A common stock",
      anchor: "Shares Outstanding",
      cik: HSDT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: SHARES_DATE,
    }),
    `Basic: ${SHARES_BASIC.toLocaleString()} (10-Q cover page) + PFWs: ~${PREFUNDED_WARRANTS.toLocaleString()} @ $0.00001 (from PIPE 8-K ${PIPE_8K_ACCESSION}) = ${SHARES_FOR_MNAV.toLocaleString()}`
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
    xbrlSource({
      fact: "us-gaap:CashAndCashEquivalentsAtCarryingValue",
      searchTerm: "124,051",
      rawValue: CASH,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: HSDT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Cash and cash equivalents",
    }),
    "Includes $500M PIPE proceeds being deployed into SOL. Jumped from $6M in Q2 to $124M in Q3."
  ),

  quarterlyBurn: pv(
    QUARTERLY_BURN,
    xbrlSource({
      fact: "us-gaap:SellingGeneralAndAdministrativeExpense",
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
      documentAnchor: "Selling, general and administrative",
    }),
    "Q3 2025 SGA. Elevated vs prior quarters due to SOL treasury ops scaling."
  ),

  preferredEquity: pv(
    PREFERRED_EQUITY,
    docSource({
      type: "sec-document",
      url: `https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/hsdt-20250930x10q.htm`,
      quote: "No preferred stock outstanding",
      anchor: "Preferred Stock",
      cik: HSDT_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "No preferred equity issued."
  ),
};

// =========================================================================
// DEBUG / STATS
// =========================================================================
export const HSDT_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: Q3_2025_PERIOD_END,
  lastFilingChecked: Q3_2025_10Q_FILED,
  holdings: LATEST_HOLDINGS,
  sharesBasic: SHARES_BASIC,
  sharesFD: SHARES_FOR_MNAV,
  prefundedWarrants: PREFUNDED_WARRANTS,
  totalDebt: TOTAL_DEBT,
  cash: CASH,
  quarterlyBurn: QUARTERLY_BURN,
  notes: "Holdings stale since Oct 29. 10-K FY2025 expected ~Mar 2026. HSDTW public warrants need strike price research.",
};

// =========================================================================
// HELPER
// =========================================================================
export function getHSDTProvenance() {
  return {
    holdings: HSDT_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_BASIC,
    sharesFD: SHARES_FOR_MNAV,
    sharesDate: SHARES_DATE,
    cashReserves: HSDT_PROVENANCE.cashReserves?.value,
    totalDebt: HSDT_PROVENANCE.totalDebt?.value,
    preferredEquity: HSDT_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: HSDT_PROVENANCE.quarterlyBurn?.value,
  };
}
