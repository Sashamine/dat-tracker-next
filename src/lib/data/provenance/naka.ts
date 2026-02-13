/**
 * NAKA (Nakamoto Inc.) - Provenance-tracked data
 *
 * First publicly traded Bitcoin conglomerate. Formerly KindlyMD (rebranded Jan 21, 2026).
 * $540M PIPE + $200M Yorkville converts (May 2025) → refinanced to $210M Kraken loan (Dec 2025).
 * Goal: 1M BTC ("one Nakamoto"). CEO: David Bailey (Bitcoin Magazine).
 *
 * Every value traces back to an authoritative source.
 * Click any number → see source → verify at source.
 *
 * CIK: 0001946573
 * FY end: December 31 (calendar year)
 */

import {
  ProvenanceFinancials,
  pv,
  xbrlSource,
  docSource,
  derivedSource,
} from "../types/provenance";

// SEC CIK
export const NAKA_CIK = "0001946573";

// =========================================================================
// KEY FILINGS
// =========================================================================
const Q3_2025_10Q_ACCESSION = "0001493152-25-024260";
const Q3_2025_10Q_FILED = "2025-11-19";
const Q3_2025_PERIOD_END = "2025-09-30";
const Q3_2025_SHARES_DATE = "2025-11-14"; // Cover page date for share count

const Q3_2025_EARNINGS_8K_ACCESSION = "0001493152-25-024314";
const Q3_2025_EARNINGS_8K_FILED = "2025-11-19";

const KRAKEN_LOAN_8K_ACCESSION = "0001493152-25-026862";
const KRAKEN_LOAN_8K_FILED = "2025-12-09";

const REBRAND_8K_ACCESSION = "0001493152-26-003008";
const REBRAND_8K_FILED = "2026-01-21";

const PIPE_8K_ACCESSION = "0001213900-25-041722";
const PIPE_8K_FILED = "2025-05-12";

// =========================================================================
// LATEST DATA POINTS (from XBRL + 8-K filings)
// =========================================================================

// Holdings: 5,398 BTC as of Sep 30, 2025 (XBRL confirmed)
// Total purchased: 5,765 BTC at $118,205 avg; 367 BTC used for strategic investments
const LATEST_HOLDINGS = 5_398;
const LATEST_HOLDINGS_DATE = "2025-11-12"; // Confirmed in Q3 earnings 8-K

// Shares: XBRL EntityCommonStockSharesOutstanding
const SHARES_OUTSTANDING = 439_850_889; // Common stock as of Nov 14, 2025
const PREFUNDED_WARRANTS = 71_704_975;  // Pre-funded warrants at $0.001 exercise
const TOTAL_SHARES_FOR_MNAV = 511_555_864; // Basic + pre-funded (effectively shares)
const SHARES_DATE = Q3_2025_SHARES_DATE;

// Debt: Kraken loan (replaced Yorkville → Two Prime → Kraken chain)
const TOTAL_DEBT = 210_000_000; // $210M USDT, 8% annual, BTC-collateralized, due Dec 4, 2026
const DEBT_DATE = "2025-12-09"; // Kraken loan 8-K filed date

// Cash: XBRL CashAndCashEquivalentsAtCarryingValue
const CASH_RESERVES = 24_185_083;

// Quarterly burn estimate
const QUARTERLY_BURN = 8_000_000; // Conservative estimate from Q3 G&A + ramp

// =========================================================================
// PROVENANCE
// =========================================================================

export const NAKA_PROVENANCE: ProvenanceFinancials = {
  holdings: pv(
    LATEST_HOLDINGS,
    xbrlSource({
      fact: "srt:CryptoAssetNumberOfUnits",
      searchTerm: "5,398",
      rawValue: 5398,
      unit: "Integer",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: NAKA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Digital assets held, Units",
    }),
    "5,398 BTC held as of Sep 30, 2025. Total 5,765 purchased at avg $118,205; 367 BTC used for strategic investments (Metaplanet $30M, Treasury BV $15M). Also confirmed as of Nov 12, 2025 in Q3 earnings 8-K."
  ),

  sharesOutstanding: pv(
    TOTAL_SHARES_FOR_MNAV,
    xbrlSource({
      fact: "dei:EntityCommonStockSharesOutstanding",
      searchTerm: "439,850,889",
      rawValue: SHARES_OUTSTANDING,
      unit: "shares",
      periodType: "instant",
      periodEnd: SHARES_DATE,
      cik: NAKA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Entity Common Stock Shares Outstanding",
    }),
    `${SHARES_OUTSTANDING.toLocaleString()} common shares + ${PREFUNDED_WARRANTS.toLocaleString()} pre-funded warrants at $0.001 = ${TOTAL_SHARES_FOR_MNAV.toLocaleString()} total. Pre-funded warrants treated as basic shares for mNAV.`
  ),

  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "sec-document",
      searchTerm: "210,000,000 USDT",
      url: `https://www.sec.gov/Archives/edgar/data/1946573/000149315225026862/form8-k.htm`,
      quote: "a fixed-term loan of 210,000,000 USDT...bearing a fee of 8.00% per annum, maturing on December 4, 2026",
      anchor: "Kraken Loan Agreement",
      cik: NAKA_CIK,
      accession: KRAKEN_LOAN_8K_ACCESSION,
      filingType: "8-K",
      filingDate: KRAKEN_LOAN_8K_FILED,
      documentDate: "2025-12-09",
    }),
    "$210M Kraken BTC-backed loan. Replaced Two Prime/Antalpha loan (Oct 2025) which replaced Yorkville convertible debenture ($200M, $2.80 conversion). 8% annual, secured by min $323.4M BTC collateral, due Dec 4, 2026."
  ),

  cashReserves: pv(
    CASH_RESERVES,
    xbrlSource({
      fact: "us-gaap:CashAndCashEquivalentsAtCarryingValue",
      searchTerm: "24,185,083",
      rawValue: CASH_RESERVES,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: NAKA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Cash and cash equivalents",
    }),
    "Cash and cash equivalents as of Sep 30, 2025. Up from $2.3M pre-BTC strategy (Dec 31, 2024)."
  ),

  quarterlyBurn: pv(
    QUARTERLY_BURN,
    xbrlSource({
      fact: "us-gaap:GeneralAndAdministrativeExpense",
      searchTerm: "4,982,754",
      rawValue: 4_982_754,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-07-01",
      periodEnd: Q3_2025_PERIOD_END,
      cik: NAKA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "General and administrative",
    }),
    "Q3 2025 G&A: $4.98M. 9M operating cash flow: -$15.9M (~$5.3M/quarter avg). Using $8M as conservative estimate including ramp-up costs for BTC strategy."
  ),

  preferredEquity: pv(
    0,
    docSource({
      type: "sec-document",
      url: `https://www.sec.gov/Archives/edgar/data/1946573/000149315225024260/form10-q.htm`,
      quote: "No preferred stock outstanding",
      anchor: "Preferred stock",
      cik: NAKA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "No preferred equity issued."
  ),
};

// =========================================================================
// BALANCE SHEET DETAILS
// =========================================================================
export const NAKA_BALANCE_SHEET = {
  cryptoAssetFairValue: 615_798_837, // XBRL CryptoAssetFairValueNoncurrent
  cashAndEquivalents: CASH_RESERVES,
  convertibleNotesPayable: 203_000_000, // Yorkville (as of 10-Q date, before Kraken refi)
  krakenLoan: TOTAL_DEBT, // $210M, replaced converts
  totalInvestments: 51_000_000, // Metaplanet $30M + Treasury BV $15M + FUTURE $6M
};

// =========================================================================
// CAPITAL RAISE DETAILS
// =========================================================================
export const NAKA_CAPITAL_RAISE = {
  initialPipe: 540_000_000, // May 2025 PIPE gross proceeds
  yorkvilleConvertible: 200_000_000, // Yorkville debenture (redeemed Oct 2025)
  yorkvilleConversionPrice: 2.80,
  atmAuthorized: 5_000_000_000, // $5B ATM program
  atmUsed: 5_600_000, // $5.6M raised at avg $4.15/share as of Q3 2025
};

// =========================================================================
// TODO LIST
// =========================================================================
export const NAKA_TODO = [
  "Q4 2025 10-K due ~March 2026 — will have updated holdings + year-end financials",
  "Check if additional BTC purchased since Nov 2025 via any new 8-K filings",
  "ATM program usage may have increased since Q3 (only $5.6M of $5B used)",
  "Verify NAKAW warrant strike price (~$11.50) and expiration from original prospectus",
  "BTC Inc. call option details — put option liability was $21.8M as of Q3",
];

// =========================================================================
// DEBUG / STATS
// =========================================================================
export const NAKA_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: Q3_2025_PERIOD_END,
  lastFilingChecked: REBRAND_8K_FILED,
  holdings: LATEST_HOLDINGS,
  sharesBasic: SHARES_OUTSTANDING,
  sharesPrefunded: PREFUNDED_WARRANTS,
  sharesTotalForMnav: TOTAL_SHARES_FOR_MNAV,
  totalDebt: TOTAL_DEBT,
  cashReserves: CASH_RESERVES,
  quarterlyBurn: QUARTERLY_BURN,
  notes: "Kraken loan $210M (Dec 2025) replaced Two Prime/Yorkville chain. Pre-funded warrants at $0.001 treated as basic shares.",
};

// =========================================================================
// HELPER
// =========================================================================
export function getNakaProvenance() {
  return {
    holdings: NAKA_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_OUTSTANDING,
    sharesPrefunded: PREFUNDED_WARRANTS,
    sharesTotalForMnav: TOTAL_SHARES_FOR_MNAV,
    sharesDate: SHARES_DATE,
    cashReserves: NAKA_PROVENANCE.cashReserves?.value,
    totalDebt: NAKA_PROVENANCE.totalDebt?.value,
    preferredEquity: NAKA_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: NAKA_PROVENANCE.quarterlyBurn?.value,
  };
}
