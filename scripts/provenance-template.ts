/**
 * TEMPLATE: Provenance file for [TICKER] ([Company Name])
 * 
 * Copy this file → rename to [ticker].ts → fill in values from XBRL extraction.
 * Run: .\scripts\xbrl-extract.ps1 -CIK [CIK] -Period "YYYY-MM-DD" -Filing "10-Q"
 *
 * Every value traces back to an authoritative source.
 * Click any number → see source → verify at source.
 */

import {
  ProvenanceFinancials,
  pv,
  xbrlSource,
  docSource,
  derivedSource,
} from "../types/provenance";

// SEC CIK
export const TICKER_CIK = "FILL_CIK";

// =========================================================================
// KEY FILINGS — fill accession numbers from EDGAR
// =========================================================================
const LATEST_10Q_ACCESSION = "FILL"; // e.g., "0001140361-25-040977"
const LATEST_10Q_FILED = "FILL";     // e.g., "2025-11-07"
const LATEST_PERIOD_END = "FILL";    // e.g., "2025-09-30"

// =========================================================================
// VALUES — fill from xbrl-extract.ps1 output
// =========================================================================
const LATEST_HOLDINGS = 0;           // Crypto units (XBRL or 8-K)
const LATEST_HOLDINGS_DATE = "FILL";
const SHARES_OUTSTANDING = 0;        // EntityCommonStockSharesOutstanding
const SHARES_DATE = "FILL";
const TOTAL_DEBT = 0;                // LongTermDebt or sum of debt items
const CASH_RESERVES = 0;             // CashAndCashEquivalentsAtCarryingValue
const QUARTERLY_BURN = 0;            // G&A or OpCF / quarters

// =========================================================================
// PROVENANCE
// =========================================================================

export const TICKER_PROVENANCE: ProvenanceFinancials = {
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "sec-document",       // or "xbrl" if CryptoAssetNumberOfUnits exists
      searchTerm: "FILL",
      url: `/filings/TICKER/${LATEST_10Q_ACCESSION}`,
      quote: "FILL",
      anchor: "FILL",
      cik: TICKER_CIK,
      accession: LATEST_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: LATEST_10Q_FILED,
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "FILL notes"
  ),

  sharesOutstanding: pv(
    SHARES_OUTSTANDING,
    xbrlSource({
      fact: "dei:EntityCommonStockSharesOutstanding",
      searchTerm: "FILL",
      rawValue: SHARES_OUTSTANDING,
      unit: "shares",
      periodType: "instant",
      periodEnd: SHARES_DATE,
      cik: TICKER_CIK,
      accession: LATEST_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: LATEST_10Q_FILED,
      documentAnchor: "Common Stock Outstanding",
    }),
    "FILL notes"
  ),

  totalDebt: pv(
    TOTAL_DEBT,
    xbrlSource({
      fact: "us-gaap:LongTermDebt",
      searchTerm: "FILL",
      rawValue: TOTAL_DEBT,
      unit: "USD",
      periodType: "instant",
      periodEnd: LATEST_PERIOD_END,
      cik: TICKER_CIK,
      accession: LATEST_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: LATEST_10Q_FILED,
      documentAnchor: "Long-term Debt",
    }),
    "FILL notes"
  ),

  cashReserves: pv(
    CASH_RESERVES,
    xbrlSource({
      fact: "us-gaap:CashAndCashEquivalentsAtCarryingValue",
      searchTerm: "FILL",
      rawValue: CASH_RESERVES,
      unit: "USD",
      periodType: "instant",
      periodEnd: LATEST_PERIOD_END,
      cik: TICKER_CIK,
      accession: LATEST_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: LATEST_10Q_FILED,
      documentAnchor: "Cash and cash equivalents",
    }),
    "FILL notes"
  ),

  quarterlyBurn: pv(
    QUARTERLY_BURN,
    xbrlSource({
      fact: "us-gaap:GeneralAndAdministrativeExpense", // or NetCashProvidedByUsedInOperatingActivities
      searchTerm: "FILL",
      rawValue: QUARTERLY_BURN,
      unit: "USD",
      periodType: "duration",
      periodStart: "FILL",
      periodEnd: LATEST_PERIOD_END,
      cik: TICKER_CIK,
      accession: LATEST_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: LATEST_10Q_FILED,
      documentAnchor: "General and administrative",
    }),
    "FILL notes"
  ),

  preferredEquity: pv(
    0,
    docSource({
      type: "sec-document",
      url: `/filings/TICKER/${LATEST_10Q_ACCESSION}`,
      quote: "No preferred stock outstanding",
      anchor: "Preferred stock",
      cik: TICKER_CIK,
      accession: LATEST_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: LATEST_10Q_FILED,
      documentDate: LATEST_PERIOD_END,
    }),
    "No preferred equity issued."
  ),
};

// =========================================================================
// DEBUG / STATS
// =========================================================================
export const TICKER_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: LATEST_PERIOD_END,
  lastFilingChecked: LATEST_10Q_FILED,
  holdings: LATEST_HOLDINGS,
  sharesBasic: SHARES_OUTSTANDING,
  totalDebt: TOTAL_DEBT,
  notes: "FILL",
};

// =========================================================================
// HELPER
// =========================================================================
export function getTICKERProvenance() {
  return {
    holdings: TICKER_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_OUTSTANDING,
    sharesDate: SHARES_DATE,
    cashReserves: TICKER_PROVENANCE.cashReserves?.value,
    totalDebt: TICKER_PROVENANCE.totalDebt?.value,
    preferredEquity: TICKER_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: TICKER_PROVENANCE.quarterlyBurn?.value,
  };
}
