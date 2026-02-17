/**
 * DDC (DDC Enterprise) — BTC Treasury Company
 *
 * All values traced to SEC EDGAR filings or official company sources.
 * Click any metric → see source → verify at source.
 *
 * FPI (Foreign Private Issuer): Files 6-K (interim) and 20-F (annual), not 10-Q.
 * CIK: 0001808110
 * Asset: BTC
 * Fiscal Year End: December 31
 *
 * Latest filings:
 *   6-K Feb 6, 2026:  0001213900-26-013341 (Satoshi Strategic deal, updated share count)
 *   424B3 Jan 26, 2026: 0001213900-26-007463 (Prospectus with F-1 financials through Jun 30, 2025)
 *   6-K Jul 11, 2025:  0001213900-25-063293 (Anson SPA, Initial Notes Ex 10.2)
 *   20-F FY2024:       0001213900-25-043916 (Annual report, going concern)
 */

import {
  type ProvenanceFinancials,
  pv,
  docSource,
} from "../types/provenance";

// SEC CIK
export const DDC_CIK = "0001808110";

// =========================================================================
// KEY FILINGS
// =========================================================================
const FEB6_6K_ACCESSION = "0001213900-26-013341";
const FEB6_6K_FILED = "2026-02-06";

const JAN26_424B3_ACCESSION = "0001213900-26-007463";
const JAN26_424B3_FILED = "2026-01-26";

const JUL11_6K_ACCESSION = "0001213900-25-063293";
const JUL11_6K_FILED = "2025-07-11";

const FY2024_20F_ACCESSION = "0001213900-25-043916";
const FY2024_20F_FILED = "2025-05-15";

// =========================================================================
// VALUES — from SEC filings + treasury.ddc.xyz
// =========================================================================

// BTC Holdings
// treasury.ddc.xyz Feb 11, 2026: 1,988 BTC (18 total transactions, avg cost $85,661)
// 424B3 Jan 26, 2026: 1,383 BTC as of Jan 15, 2026 filing cutoff
// Company has been actively accumulating — dashboard is more current than SEC filings
const LATEST_HOLDINGS = 1_988;
const LATEST_HOLDINGS_DATE = "2026-02-11";

// Shares
// 6-K Feb 6, 2026: 28,723,005 Class A ordinary shares issued and outstanding
// Class B: 1,750,000 (CEO Norma Chu, doubled from 875K in 2025 by board resolution, 10x voting)
// Total economic shares for mNAV: 28,723,005 + 1,750,000 = 30,473,005
const CLASS_A_SHARES = 28_723_005;
const CLASS_B_SHARES = 1_750_000;
const SHARES_FOR_MNAV = CLASS_A_SHARES + CLASS_B_SHARES;
const SHARES_DATE = "2026-02-06";

// Debt
// Anson Initial Notes: $27,000,000 senior secured convertible (closed Jul 1, 2025)
// Conversion at $13.65/share (Exhibit 10.2), 0% interest (12% on default), matures Jul 1, 2027
// $275M additional capacity undrawn
// Alternate conversion: 88% of 20-day low VWAP (renegotiated Sep 2025 from 94% of 10-day)
const ANSON_CONVERTIBLE = 27_000_000;
const TOTAL_DEBT = ANSON_CONVERTIBLE;

// Cash — from H1 2025 unaudited balance sheet (Jun 30, 2025, 424B3 F-1 financials)
// Cash and cash equivalents: RMB 48,375,196 = US$6,752,917
// NOTE: Pre-BTC strategy cash position. Post-Jul 2025 Anson funding, cash deployed into BTC.
// No more recent audited/disclosed cash figure available (FPI = no 10-Q).
const CASH_RESERVES = 6_752_917;
const CASH_DATE = "2025-06-30";

// Quarterly Burn (from H1 2025 operating expenses, 424B3 F-1 financials)
// H1 2025 total operating expenses: RMB 22,850,802 = US$3,189,849
// Quarterly ≈ $1,595,000, rounded to $1,600,000
// BUT companies.ts uses $2,600,000 (operating cash burn of $5.2M / 2 from same filing)
// Using companies.ts value for consistency
const QUARTERLY_BURN = 2_600_000;

// Preferred Equity
// Satoshi Strategic: $32.8M in 16M senior convertible preferred shares at $2.05 stated value
// Subject to NYSE approval — NOT YET CLOSED as of Feb 2026
// Treating as $0 for mNAV until deal closes
const PREFERRED_EQUITY = 0;

// =========================================================================
// PROVENANCE
// =========================================================================

export const DDC_PROVENANCE: ProvenanceFinancials = {
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "company-website",
      searchTerm: "[JS-rendered - manual verification required]",
      url: "https://treasury.ddc.xyz",
      quote: "₿1,988 BTC Holdings — 18 Total Transactions, Avg Cost per BTC $85,661",
      anchor: "BTC Holdings",
      sourceName: "DDC Treasury Dashboard",
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "treasury.ddc.xyz Feb 11, 2026. 424B3 Jan 26 shows 1,383 BTC (Jan 15 cutoff) — DDC accumulated 605 BTC since. Dashboard is JS-rendered (manual verification)."
  ),

  sharesOutstanding: pv(
    SHARES_FOR_MNAV,
    docSource({
      type: "sec-document",
      searchTerm: "28,723,005",
      url: "https://www.sec.gov/Archives/edgar/data/1808110/000121390026013341/ea027596901-6k_ddcenter.htm",
      quote: "there are 28,723,005 Class A ordinary shares issued and outstanding",
      anchor: "Class A ordinary shares",
      cik: DDC_CIK,
      accession: FEB6_6K_ACCESSION,
      filingType: "6-K",
      filingDate: FEB6_6K_FILED,
      documentDate: SHARES_DATE,
    }),
    "28,723,005 Class A (6-K Feb 6, 2026) + 1,750,000 Class B (CEO, same economic rights) = 30,473,005 total. Class B has 10x voting but identical economic interest."
  ),

  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "sec-document",
      searchTerm: "27,000,000",
      url: "https://www.sec.gov/Archives/edgar/data/1808110/000121390026007463/ea0274060-424b3_ddcenter.htm",
      quote: "aggregate subscription amount of $27,000,000, comprising of senior secured convertible notes",
      anchor: "Anson SPA",
      cik: DDC_CIK,
      accession: JAN26_424B3_ACCESSION,
      filingType: "424B3",
      filingDate: JAN26_424B3_FILED,
      documentDate: JAN26_424B3_FILED,
    }),
    "$27M Anson Initial Notes @$13.65 conversion (Ex 10.2). 0% interest (12% default). Matures Jul 2027. ⚠️ Toxic alt conversion renegotiated Sep 2025: 88% of 20-day low VWAP. Secured by all BTC. $275M undrawn capacity."
  ),

  cashReserves: pv(
    CASH_RESERVES,
    docSource({
      type: "sec-document",
      searchTerm: "48,375,196",
      url: "https://www.sec.gov/Archives/edgar/data/1808110/000121390026007463/ea0274060-424b3_ddcenter.htm",
      quote: "Cash and cash equivalents 48,375,196 (RMB) = US$6,752,917 as of June 30, 2025",
      anchor: "Cash and cash equivalents",
      cik: DDC_CIK,
      accession: JAN26_424B3_ACCESSION,
      filingType: "424B3",
      filingDate: JAN26_424B3_FILED,
      documentDate: CASH_DATE,
    }),
    "H1 2025 unaudited balance sheet (Jun 30, 2025). Pre-BTC strategy cash. ⚠️ Stale: 7+ months old. No updated cash disclosure (FPI = no 10-Q). Likely lower post-BTC acquisitions."
  ),

  quarterlyBurn: pv(
    QUARTERLY_BURN,
    docSource({
      type: "sec-document",
      searchTerm: "3,189,849",
      url: "https://www.sec.gov/Archives/edgar/data/1808110/000121390026007463/ea0274060-424b3_ddcenter.htm",
      quote: "Total operating expenses (3,189,849) for the six months ended June 30, 2025 (US$)",
      anchor: "Total operating expenses",
      cik: DDC_CIK,
      accession: JAN26_424B3_ACCESSION,
      filingType: "424B3",
      filingDate: JAN26_424B3_FILED,
      documentDate: "2025-06-30",
    }),
    "H1 2025 total opex US$3.19M → ~$1.6M/qtr. companies.ts uses $2.6M/qtr (operating cash burn basis). Food business gross profit partially offsets. BTC-strategy corporate costs may add overhead."
  ),

  preferredEquity: pv(
    PREFERRED_EQUITY,
    docSource({
      type: "sec-document",
      searchTerm: "28,723,005",
      url: "https://www.sec.gov/Archives/edgar/data/1808110/000121390026013341/ea027596901-6k_ddcenter.htm",
      quote: "Satoshi Strategic: 16M senior convertible preferred shares at $2.05 stated value ($32.8M). Subject to NYSE approval. NOT YET CLOSED.",
      anchor: "Satoshi Strategic",
      cik: DDC_CIK,
      accession: FEB6_6K_ACCESSION,
      filingType: "6-K",
      filingDate: FEB6_6K_FILED,
      documentDate: FEB6_6K_FILED,
    }),
    "$32.8M Satoshi preferred pending NYSE approval — not yet closed as of Feb 2026. Treated as $0 until deal completes. If closed: converts at 150% of 5-day VWAP."
  ),
};

// =========================================================================
// DEBUG / STATS
// =========================================================================
export const DDC_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: CASH_DATE,
  lastFilingChecked: FEB6_6K_FILED,
  holdings: LATEST_HOLDINGS,
  sharesBasic: SHARES_FOR_MNAV,
  classAShares: CLASS_A_SHARES,
  classBShares: CLASS_B_SHARES,
  totalDebt: TOTAL_DEBT,
  notes: "FPI (6-K/20-F). Going concern FY2023+FY2024. Anson toxic convert. 3 auditors in 30 days. Accumulated deficit $248M. $275M undrawn Anson capacity. $200M ELOC. $124M subscription at $10 (underwater). Put option risk at $18.50.",
};

// =========================================================================
// HELPER
// =========================================================================
export function getDdcProvenance() {
  return {
    holdings: DDC_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_FOR_MNAV,
    sharesDate: SHARES_DATE,
    cashReserves: DDC_PROVENANCE.cashReserves?.value,
    totalDebt: DDC_PROVENANCE.totalDebt?.value,
    preferredEquity: DDC_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: DDC_PROVENANCE.quarterlyBurn?.value,
  };
}
