/**
 * DFDV (DeFi Development Corp.) - Provenance-tracked data
 *
 * First US public company with SOL-focused treasury strategy.
 * Formerly Janover Inc. (JNVR), pivoted to SOL treasury in April 2025.
 * Operates validator nodes, dfdvSOL liquid staking token.
 * 5.50% Convertible Senior Notes due 2030.
 *
 * SEC CIK: 0001805526
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

// SEC CIK for DFDV
export const DFDV_CIK = "1805526";

// =========================================================================
// KEY FILINGS
// =========================================================================

// Q4 2025 Business Update (Jan 5, 2026) - Latest holdings + shares
const Q4_BIZ_UPDATE_ACCESSION = "0001193125-26-002668";
const Q4_BIZ_UPDATE_FILED = "2026-01-05";
const Q4_BIZ_UPDATE_DATE = "2026-01-01";

// Jan 29, 2026 8-K - Press release
const JAN29_8K_ACCESSION = "0001213900-26-009173";
const JAN29_8K_FILED = "2026-01-29";

// Q3 2025 10-Q (Sep 30, 2025)
const Q3_2025_10Q_ACCESSION = "0001193125-25-286660";
const Q3_2025_10Q_FILED = "2025-11-19";
const Q3_2025_PERIOD_END = "2025-09-30";

// Q2 2025 10-Q (Jun 30, 2025)
const Q2_2025_10Q_ACCESSION = "0000950170-25-108479";
const Q2_2025_10Q_FILED = "2025-08-14";
const Q2_2025_PERIOD_END = "2025-06-30";

// Q1 2025 10-Q (Mar 31, 2025)
const Q1_2025_10Q_ACCESSION = "0001213900-25-042977";
const Q1_2025_10Q_FILED = "2025-05-14";

// April 7, 2025 8-K - SOL pivot announcement
const PIVOT_8K_ACCESSION = "0001213900-25-029172";
const PIVOT_8K_FILED = "2025-04-07";

// Nov 13, 2025 8-K - Sep shareholder letter/business update
const NOV13_8K_ACCESSION = "0001213900-25-109627";
const NOV13_8K_FILED = "2025-11-13";

// Jul 8, 2025 8-K - June shareholder letter
const JUL8_8K_ACCESSION = "0001213900-25-061934";
const JUL8_8K_FILED = "2025-07-08";

// Helper to build SEC filing URL
const secDocUrl = (accession: string, docName: string) =>
  `https://www.sec.gov/Archives/edgar/data/${DFDV_CIK}/${accession.replace(/-/g, "")}/${docName}`;

// =========================================================================
// LATEST DATA (as of Jan 1, 2026 business update)
// =========================================================================
const LATEST_HOLDINGS = 2_221_329; // SOL + SOL equivalents
const LATEST_SHARES = 29_892_800;
const LATEST_CASH = 9_000_000;

// Debt from Q3 10-Q + company dashboard
const CONVERTIBLE_DEBT_FACE = 134_000_000; // ~$134M 5.50% Convertible Senior Notes
const SOL_DEFI_LOANS = 52_000_000; // SOL/DeFi protocol loans (post-Q3)
const TOTAL_DEBT = CONVERTIBLE_DEBT_FACE + SOL_DEFI_LOANS; // $186M

// Quarterly burn from Q3 XBRL
const QUARTERLY_BURN = 3_572_000;

// =========================================================================
// PROVENANCE
// =========================================================================

export const DFDV_PROVENANCE: ProvenanceFinancials = {
  // =========================================================================
  // SOL HOLDINGS - Q4 2025 Business Update (8-K Jan 5, 2026)
  // "The Company currently holds 2,221,329 SOL and SOL equivalents"
  // =========================================================================
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "sec-document",
      searchTerm: "2,221,329",
      url: "https://www.globenewswire.com/news-release/2026/01/05/3212684/0/en/DeFi-Development-Corp-Provides-Preliminary-Q4-2025-Business-Update.html",
      quote:
        "The Company currently holds 2,221,329 SOL and SOL equivalents on the balance sheet",
      anchor: "sol-holdings",
      cik: DFDV_CIK,
      accession: Q4_BIZ_UPDATE_ACCESSION,
      filingType: "8-K",
      filingDate: Q4_BIZ_UPDATE_FILED,
      documentDate: Q4_BIZ_UPDATE_DATE,
    }),
    "Q4 2025 preliminary update. Includes staked SOL, validator deposits, and dfdvSOL equivalent. " +
      "XBRL CryptoAssetNumberOfUnits from Q3 10-Q: 1,157 (thousands) = 1,157,000 SOL as of Sep 30, 2025."
  ),

  // =========================================================================
  // SHARES OUTSTANDING - Q4 2025 Business Update
  // "The Company's current shares outstanding as of January 1, 2026, is 29,892,800"
  // Decreased from 31,401,212 (Q3 10-Q cover page) due to Q4 buyback
  // =========================================================================
  sharesOutstanding: pv(
    LATEST_SHARES,
    docSource({
      type: "sec-document",
      searchTerm: "29,892,800",
      url: "https://www.globenewswire.com/news-release/2026/01/05/3212684/0/en/DeFi-Development-Corp-Provides-Preliminary-Q4-2025-Business-Update.html",
      quote:
        "The Company's current shares outstanding as of January 1, 2026, is 29,892,800",
      anchor: "shares-outstanding",
      cik: DFDV_CIK,
      accession: Q4_BIZ_UPDATE_ACCESSION,
      filingType: "8-K",
      filingDate: Q4_BIZ_UPDATE_FILED,
      documentDate: Q4_BIZ_UPDATE_DATE,
    }),
    "Decreased from 31,401,212 (Q3 10-Q, Nov 19, 2025) due to Q4 share repurchase: " +
      "2,049,113 shares bought back at avg $5.62/share ($11.5M total)."
  ),

  // =========================================================================
  // TOTAL DEBT - $186M: $134M converts + $52M SOL/DeFi loans
  // Q3 10-Q XBRL: ConvertibleDebtNoncurrent = $131,444,000 (net of discount)
  //               DebtLongtermAndShorttermCombinedAmount = $131,711,000
  // Post-Q3: Company dashboard shows additional $52M SOL/DeFi protocol loans
  // =========================================================================
  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "sec-document",
      searchTerm: "131,444",
      url: `https://www.sec.gov/Archives/edgar/data/${DFDV_CIK}/${Q3_2025_10Q_ACCESSION.replace(/-/g, "")}/`,
      quote:
        "ConvertibleDebtNoncurrent $131,444,000 + SOL/DeFi loans from company dashboard",
      anchor: "debt",
      cik: DFDV_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "$134M face value 5.50% Convertible Senior Notes due 2030 (net B/S: $131.4M after unamortized discount of $8.9M). " +
      "$52M SOL/DeFi protocol loans per defidevcorp.com dashboard (post-Q3 addition). " +
      "Total: $186M."
  ),

  // =========================================================================
  // CASH - ~$9M in cash, stablecoins, and other tokens
  // =========================================================================
  cashReserves: pv(
    LATEST_CASH,
    docSource({
      type: "sec-document",
      searchTerm: "$9M",
      url: "https://www.globenewswire.com/news-release/2026/01/05/3212684/0/en/DeFi-Development-Corp-Provides-Preliminary-Q4-2025-Business-Update.html",
      quote:
        "approximately $9M in cash, stablecoins, and other tokens-readily-convertible-to-cash",
      anchor: "cash",
      cik: DFDV_CIK,
      accession: Q4_BIZ_UPDATE_ACCESSION,
      filingType: "8-K",
      filingDate: Q4_BIZ_UPDATE_FILED,
      documentDate: Q4_BIZ_UPDATE_DATE,
    }),
    "Cash earmarked for operations. Not excess cash — used for operational expenses and SOL acquisitions."
  ),

  // =========================================================================
  // QUARTERLY BURN - from Q3 2025 10-Q XBRL
  // GeneralAndAdministrativeExpense for Q3 2025
  // =========================================================================
  quarterlyBurn: pv(
    QUARTERLY_BURN,
    xbrlSource({
      fact: "us-gaap:GeneralAndAdministrativeExpense",
      rawValue: QUARTERLY_BURN,
      unit: "USD",
      periodType: "duration",
      periodEnd: Q3_2025_PERIOD_END,
      periodStart: "2025-07-01",
      cik: DFDV_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
    }),
    "Q3 2025 G&A expense from XBRL. Note: Total CostsAndExpenses were *negative* (-$67.5M Q3) due to crypto asset gains."
  ),
};
