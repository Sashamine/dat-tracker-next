/**
 * UPXI (Upexi) — SOL Treasury Company
 *
 * All values traced to SEC EDGAR filings or official company sources.
 * Click any metric → see source → verify at source.
 *
 * Fiscal Year End: June 30
 * CIK: 0001775194
 * Asset: SOL
 *
 * Latest filings:
 *   10-Q Q2 FY2026: 0001477932-26-000736 (filed 2026-02-10, period Dec 31, 2025)
 *   8-K Hivemind:   0001477932-26-000207 (filed 2026-01-14, Jan 9, 2026)
 *   10-K FY2025:    0001477932-25-006996 (filed 2025-09-24, period Jun 30, 2025)
 */

import {
  type ProvenanceFinancials,
  pv,
  xbrlSource,
  docSource,
} from "../types/provenance";

// SEC CIK
export const UPXI_CIK = "0001775194";

// =========================================================================
// KEY FILINGS
// =========================================================================
const Q2_FY2026_10Q_ACCESSION = "0001477932-26-000736";
const Q2_FY2026_10Q_FILED = "2026-02-10";
const Q2_FY2026_PERIOD_END = "2025-12-31";

const HIVEMIND_8K_ACCESSION = "0001477932-26-000207";
const HIVEMIND_8K_FILED = "2026-01-14";

const FY2025_10K_ACCESSION = "0001477932-25-006996";
const FY2025_10K_FILED = "2025-09-24";

// =========================================================================
// VALUES — from XBRL + 10-Q document text + 8-K
// =========================================================================

// SOL Holdings
// 10-Q Dec 31, 2025: 2,173,204 SOL (Note 5)
// Jan 5, 2026 press release: 2,174,583 SOL
// Jan 9, 2026 Hivemind: +265,500 locked SOL → total ~2,440,083
const SOL_DEC31_2025 = 2_173_204;           // 10-Q Note 5
const SOL_JAN5_2026 = 2_174_583;            // Press release
const SOL_HIVEMIND = 265_500;               // 8-K Jan 2026
const LATEST_HOLDINGS = SOL_JAN5_2026;      // Using Jan 5 as most recent verified
const LATEST_HOLDINGS_DATE = "2026-01-05";

// Shares
// 10-Q cover page: 69,760,581 as of Feb 9, 2026
// Dec 31 balance sheet: 62,796,362 issued, 416,226 treasury
const SHARES_FEB9_2026 = 69_760_581;        // 10-Q cover page
const SHARES_DEC31_2025 = 62_796_362;       // 10-Q balance sheet (issued)
const TREASURY_SHARES = 416_226;            // 10-Q balance sheet
const SHARES_DATE = "2026-02-09";

// sharesForMnav = basic shares only (dilutives in dilutive-instruments.ts)
// Use most recent: 69,760,581 (includes Feb 2026 offering of 6,337,000 + RSU vesting)
const SHARES_FOR_MNAV = SHARES_FEB9_2026;

// Debt
// $150M convertible @$4.25: $149,996,123 (net of $5.88M deferred financing costs = $144,115,480 on BS)
// $36M Hivemind @$2.39: ~$36,000,000 (subsequent event)
// BitGo credit facility: $62,695,723 (short-term, 11.5%)
// Cygnet notes: $5,380,910
// Promissory notes: $560,000 (convertible @$3.00)
const CONVERTIBLE_150M = 149_996_123;
const HIVEMIND_36M = 36_000_000;
const BITGO_CREDIT = 62_695_723;
const CYGNET_NOTES = 5_380_910;
const PROMISSORY_NOTES = 560_000;
const TOTAL_DEBT = CONVERTIBLE_150M + HIVEMIND_36M + BITGO_CREDIT + CYGNET_NOTES + PROMISSORY_NOTES;
// = $254,632,756

// Cash
const CASH_RESERVES = 1_616_765;            // 10-Q Dec 31, 2025 balance sheet

// Quarterly Burn (from operating cash flow)
// 6 months ended Dec 31, 2025: $(12,461,887) net cash used in operations
// Quarterly ≈ $6,230,944
const QUARTERLY_BURN = 6_230_944;

// =========================================================================
// PROVENANCE
// =========================================================================

export const UPXI_PROVENANCE: ProvenanceFinancials = {
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "sec-document",
      searchTerm: "Solana tokens held",
      url: `https://www.globenewswire.com/news-release/2026/01/07/3214451/0/en/Upexi-Moves-to-High-Return-Treasury-Strategy.html`,
      quote: "2,174,583 SOL as of January 5, 2026",
      anchor: "SOL holdings",
      cik: UPXI_CIK,
      accession: Q2_FY2026_10Q_ACCESSION,
      filingType: "8-K",
      filingDate: "2026-01-07",
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "Jan 5, 2026 press release. 10-Q Dec 31 shows 2,173,204 SOL. Hivemind adds 265,500 locked."
  ),

  sharesOutstanding: pv(
    SHARES_FOR_MNAV,
    xbrlSource({
      fact: "dei:EntityCommonStockSharesOutstanding",
      searchTerm: "69,760,581",
      rawValue: 69_760_581,
      unit: "shares",
      periodType: "instant",
      periodEnd: SHARES_DATE,
      cik: UPXI_CIK,
      accession: Q2_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q2_FY2026_10Q_FILED,
      documentAnchor: "Entity Common Stock Shares Outstanding",
    }),
    "10-Q cover page as of Feb 9, 2026. Includes Dec PIPE (3.29M), Feb offering (6.34M), RSU vesting."
  ),

  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "sec-document",
      searchTerm: "144,115,480",
      url: `https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/`,
      quote: "Convertible notes payable $144,115,480; Short-term treasury debt $62,695,723; Cygnet notes $5,380,910; Promissory notes $560,000",
      anchor: "Total Debt",
      cik: UPXI_CIK,
      accession: Q2_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q2_FY2026_10Q_FILED,
      documentDate: Q2_FY2026_PERIOD_END,
    }),
    "$150M convert @$4.25 + $36M Hivemind @$2.39 (subsequent) + $62.7M BitGo credit + $5.4M Cygnet + $560K promissory = $254.6M"
  ),

  cashReserves: pv(
    CASH_RESERVES,
    docSource({
      type: "sec-document",
      searchTerm: "1,616,765",
      url: `https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/`,
      quote: "Cash $1,616,765",
      anchor: "Cash",
      cik: UPXI_CIK,
      accession: Q2_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q2_FY2026_10Q_FILED,
      documentDate: Q2_FY2026_PERIOD_END,
    }),
    "Operating capital only. Not excess cash."
  ),

  quarterlyBurn: pv(
    QUARTERLY_BURN,
    xbrlSource({
      fact: "us-gaap:NetCashProvidedByUsedInOperatingActivities",
      searchTerm: "12,461,887",
      rawValue: -12_461_887,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-07-01",
      periodEnd: Q2_FY2026_PERIOD_END,
      cik: UPXI_CIK,
      accession: Q2_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q2_FY2026_10Q_FILED,
      documentAnchor: "Net cash used in operating activities",
    }),
    "6-month OpCF $12.46M / 2 = $6.23M/quarter. Includes digital asset strategy costs."
  ),

  preferredEquity: pv(
    0,
    docSource({
      type: "sec-document",
      url: `https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/`,
      quote: "Preferred stock, $0.00001 par value, 150,000 shares issued — convertible to 138,889 common, no material liquidation preference",
      anchor: "Preferred stock",
      cik: UPXI_CIK,
      accession: Q2_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q2_FY2026_10Q_FILED,
      documentDate: Q2_FY2026_PERIOD_END,
    }),
    "150K preferred shares (CEO) convert to 138,889 common. Immaterial for mNAV — treated as dilutive."
  ),
};

// =========================================================================
// DEBUG / STATS
// =========================================================================
export const UPXI_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: Q2_FY2026_PERIOD_END,
  lastFilingChecked: Q2_FY2026_10Q_FILED,
  holdings: LATEST_HOLDINGS,
  sharesBasic: SHARES_FOR_MNAV,
  totalDebt: TOTAL_DEBT,
  notes: "FY ends Jun 30. 95% staked. Locked SOL valued at 14% discount. BitGo credit = variable. GSR warrants in dispute.",
};

// =========================================================================
// HELPER
// =========================================================================
export function getUpxiProvenance() {
  return {
    holdings: UPXI_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_FOR_MNAV,
    sharesDate: SHARES_DATE,
    cashReserves: UPXI_PROVENANCE.cashReserves?.value,
    totalDebt: UPXI_PROVENANCE.totalDebt?.value,
    preferredEquity: UPXI_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: UPXI_PROVENANCE.quarterlyBurn?.value,
  };
}
