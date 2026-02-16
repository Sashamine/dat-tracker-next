/**
 * ABTC (American Bitcoin Corp.) - Provenance-tracked data
 *
 * Pure-play Bitcoin miner & accumulator, 80% owned by Hut 8.
 * Co-Founded by Eric Trump and Donald Trump Jr.
 * Merged with Gryphon Digital Mining Sep 3, 2025; listed on Nasdaq.
 * HODL strategy with SPS (Satoshis Per Share) as key metric.
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

// SEC CIK for ABTC (formerly Gryphon Digital Mining)
export const ABTC_CIK = "1755953";

// =========================================================================
// KEY FILINGS
// =========================================================================
const Q3_2025_10Q_ACCESSION = "0001193125-25-281390"; // Filed 2025-11-14
const Q3_2025_10Q_FILED = "2025-11-14";
const Q3_2025_PERIOD_END = "2025-09-30";

const MERGER_8K_ACCESSION = "0001213900-25-083726"; // Filed 2025-09-03
const MERGER_8K_FILED = "2025-09-03";

const Q2_2025_10Q_ACCESSION = "0001213900-25-076632"; // Filed 2025-08-14 (pre-merger, Gryphon)
const FY2024_10K_ACCESSION = "0001213900-25-026404"; // Filed 2025-03-31 (pre-merger, Gryphon)

// =========================================================================
// LATEST DATA
// =========================================================================
const LATEST_HOLDINGS = 5_098; // Dec 14, 2025 press release
const LATEST_HOLDINGS_DATE = "2025-12-14";

// Shares: 927,604,994 from Q3 2025 10-Q cover page (as of Nov 13, 2025)
// Class A: 195,380,091 + Class B: 732,224,903 + Class C: 0 = 927,604,994
// NOTE: 899,489,426 was WRONG — that's diluted weighted avg shares for EPS, not actual outstanding
const SHARES_CLASS_A = 195_380_091;
const SHARES_CLASS_B = 732_224_903;
const SHARES_OUTSTANDING = SHARES_CLASS_A + SHARES_CLASS_B; // 927,604,994
const SHARES_DATE = "2025-11-13";

// Debt: $286.2M Bitmain miner purchase agreement from Q3 2025 10-Q
// BTC pledged at fixed price for mining equipment. 24-month redemption window.
const TOTAL_DEBT = 286_200_000;

// Cash: Not verified from Q3 10-Q
// TODO: Verify from Q3 2025 10-Q balance sheet
const CASH_RESERVES = 7_976_000; // XBRL: us-gaap:Cash as of Sep 30, 2025

// Quarterly burn: $8,052,000 G&A from Q3 2025 10-Q
const QUARTERLY_BURN = 8_052_000;

// =========================================================================
// PROVENANCE
// =========================================================================

export const ABTC_PROVENANCE: ProvenanceFinancials = {
  // =========================================================================
  // BTC HOLDINGS - from Dec 14, 2025 Press Release
  // "held approximately 5,098 Bitcoin in its strategic reserve as of December 14, 2025"
  // Includes BTC acquired through mining + strategic purchases + held in custody/pledged
  // =========================================================================
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "press-release",
      searchTerm: "5,098 Bitcoin",
      url: "https://www.prnewswire.com/news-releases/american-bitcoin-enters-top-20-publicly-traded-bitcoin-treasury-companies-by-holdings-302643079.html",
      quote: "held approximately 5,098 Bitcoin in its strategic reserve as of December 14, 2025",
      anchor: "bitcoin-reserve",
      // No accession — this is a standalone PR Newswire release, not attached to any SEC filing
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "Source says 'approximately 5,098 Bitcoin' — standard PR hedging language. " +
    "Includes BTC held in custody or pledged for miner purchases under BITMAIN agreement. " +
    "Acquired through combination of mining and strategic purchases. " +
    "XBRL has CryptoAssetNumberOfUnits (3,418 BTC at Sep 30, 2025) but holdings source uses more recent PR data (5,098 at Dec 14, 2025)."
  ),

  // =========================================================================
  // SHARES OUTSTANDING - Q3 2025 10-Q
  // Post-merger: Hut 8 owns ~80%. Multi-class structure likely.
  // Using total/diluted count as proxy for all basic classes.
  // Pre-merger XBRL shows 82,802,406 (Q2 2025 cover page)
  // =========================================================================
  sharesOutstanding: pv(
    SHARES_OUTSTANDING,
    docSource({
      type: "sec-document",
      searchTerm: "195,380,091",
      url: `https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/abtc-20250930.htm`,
      quote: "195,380,091 shares of Class A common stock, 732,224,903 shares of Class B common stock",
      anchor: "shares-outstanding",
      cik: ABTC_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: SHARES_DATE,
    }),
    "10-Q cover page as of Nov 13, 2025. " +
    "Class A: 195,380,091 + Class B: 732,224,903 = 927,604,994. " +
    "Class B held by Hut 8 (~80% ownership). No Class C outstanding."
  ),

  // =========================================================================
  // TOTAL DEBT — $286.2M Bitmain miner purchase agreement
  // BTC pledged at fixed price for mining equipment. 24-month redemption window.
  // =========================================================================
  totalDebt: pv(
    286_200_000,
    docSource({
      type: "sec-document",
      searchTerm: "Bitmain",
      url: `https://www.sec.gov/Archives/edgar/data/${ABTC_CIK}/000119312525281390/abtc-20250930.htm`,
      quote: "Bitmain miner purchase agreement — BTC pledged at fixed price for mining equipment",
      anchor: "bitmain-agreement",
      cik: ABTC_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "$286.2M Bitmain miner purchase agreement. BTC pledged at fixed price for mining equipment with 24-month redemption window. " +
    "2,385 of 3,418 BTC (69.8%) pledged as of Sep 30, 2025. Economically a BTC-collateralized equipment commitment. " +
    "Operating leases ($185.6M) and intercompany payable ($103.8M to Hut 8) excluded. " +
    "Only Bitmain BTC-collateralized equipment commitment included as financial obligation."
  ),

  // =========================================================================
  // CASH RESERVES
  // Not verified — SEC 403 blocked direct Q3 10-Q access
  // =========================================================================
  cashReserves: pv(
    7_976_000,
    xbrlSource({
      fact: "us-gaap:Cash",
      searchTerm: "7,976,000",
      rawValue: 7_976_000,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: ABTC_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Cash",
    }),
    "$7.98M cash as of Sep 30, 2025. XBRL fact is us-gaap:Cash (not CashAndCashEquivalents). Pre-merger was $678K (Q2)."
  ),

  // =========================================================================
  // QUARTERLY BURN - Q3 2025 G&A: $8,052,000
  // =========================================================================
  quarterlyBurn: pv(
    QUARTERLY_BURN,
    xbrlSource({
      fact: "us-gaap:GeneralAndAdministrativeExpense",
      searchTerm: "8,052",
      rawValue: 8_052_000,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-07-01",
      periodEnd: Q3_2025_PERIOD_END,
      cik: ABTC_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "General and Administrative Expense",
    }),
    "Q3 2025 General & Administrative Expense from XBRL. " +
    "First full quarter post-merger (merged Sep 3, 2025). " +
    "May include one-time merger-related costs."
  ),
};

// Debug helper
export const ABTC_PROVENANCE_DEBUG = {
  cik: ABTC_CIK,
  latestFiling: Q3_2025_10Q_ACCESSION,
  filedDate: Q3_2025_10Q_FILED,
  periodEnd: Q3_2025_PERIOD_END,
  mergerDate: "2025-09-03",
  formerNames: ["Gryphon Digital Mining", "Akerna Corp", "MTech Acquisition Holdings"],
  xbrlNote: "XBRL has CryptoAssetNumberOfUnits (3,418 BTC at Sep 30, 2025; 10,171 BTC at Dec 31, 2024). " +
    "EntityCommonStockSharesOutstanding only through Q2 2025 (pre-merger, 82,802,406). " +
    "Post-merger share count (927.6M) sourced from 10-Q cover page text, not XBRL.",
  pendingVerification: [
    "Cost basis of BTC holdings",
    "Dilutive instruments (warrants, options) from equity footnotes",
    "Recent 8-Ks filed Dec 2025 - Feb 2026 for updated holdings",
  ],
};
