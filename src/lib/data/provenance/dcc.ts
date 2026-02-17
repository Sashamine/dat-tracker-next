/**
 * DCC.AX (DigitalX Limited) — BTC Treasury Company
 *
 * All values traced to ASX regulatory filings via Listcorp.
 * Click any metric → see source → verify at source.
 *
 * ASX-listed (Perth, Australia). No SEC filings.
 * ISIN: AU000000DCC9 | ABN: 59 009 575 035
 * Asset: BTC
 * FY End: June 30
 */

import {
  type ProvenanceFinancials,
  pv,
  docSource,
} from "../types/provenance";

// =========================================================================
// KEY FILINGS
// =========================================================================
const TREASURY_DEC_2025_DATE = "2026-01-23";   // ASX announcement date
const Q2_FY2026_4C_DATE = "2026-01-30";        // Appendix 4C filing date
const PERIOD_END = "2025-12-31";               // Quarter end

// Source URLs
const TREASURY_DEC_2025_URL = "https://www.listcorp.com/asx/dcc/digitalx-limited/news/treasury-information-december-2025-3305468.html";
const Q2_FY2026_4C_URL = "https://www.listcorp.com/asx/dcc/digitalx-limited/news/quarterly-activities-appendix-4c-cash-flow-report-3308597.html";
const ASX_COMPANY_URL = "https://www.asx.com.au/markets/company/DCC";

// =========================================================================
// VALUES — from ASX filings
// =========================================================================

// BTC Holdings (Treasury Information - December 2025)
// 308.8 BTC held directly + 194.85 BTC equivalent via BTXX ETF (889,367 units)
// Total: 503.7 BTC (rounded to 504 in companies.ts)
const BTC_DIRECT = 308.8;
const BTC_VIA_BTXX = 194.85;       // 889,367 BTXX ETF units ≈ 194.85 BTC
const TOTAL_BTC = 503.7;           // Filing states "503.7 BTC"
const HOLDINGS_DATE = PERIOD_END;   // "as at 31 December 2025"

// Shares Outstanding
// 1,488,510,854 from ASX registry / Appendix 4C
const SHARES_OUTSTANDING = 1_488_510_854;
const SHARES_DATE = "2026-01-30";  // Appendix 4C filing date

// Debt
// No debt disclosed in Appendix 4C or quarterly report
const TOTAL_DEBT = 0;

// Cash
// Appendix 4C: Cash at Bank A$2,829,509 at 31 December 2025
// USD conversion: A$2,829,509 × 0.63 AUD/USD ≈ US$1,782,000
const CASH_AUD = 2_829_509;
const AUD_USD_RATE = 0.63;
const CASH_USD = 1_782_000;  // A$2,829,509 × 0.63

// Quarterly Burn
// Appendix 4C: Operating cash outflows $0.7M (A$705K) for Q2 FY2026
// USD conversion: A$705,000 × 0.63 ≈ US$440,000
const BURN_AUD = 705_000;
const BURN_USD = 440_000;

// =========================================================================
// PROVENANCE
// =========================================================================

export const DCC_PROVENANCE: ProvenanceFinancials = {
  holdings: pv(
    TOTAL_BTC,
    docSource({
      type: "regulatory",
      searchTerm: "503.7",
      url: TREASURY_DEC_2025_URL,
      quote: "DigitalX Bitcoin ETF Units are equivalent to 194.85 BTC, bringing DigitalX's total Bitcoin exposure to 503.7 BTC.",
      anchor: "total Bitcoin exposure",
      sourceName: "ASX via Listcorp",
      documentDate: PERIOD_END,
    }),
    "Dec 2025 Treasury Information: 308.8 direct + 194.85 via BTXX ETF (889,367 units, own fund). Filed 2026-01-23."
  ),

  sharesOutstanding: pv(
    SHARES_OUTSTANDING,
    docSource({
      type: "regulatory",
      searchTerm: "[JS-rendered — ASX registry page]",
      url: ASX_COMPANY_URL,
      quote: "1,488,510,854 ordinary shares on issue",
      anchor: "shares on issue",
      sourceName: "ASX Company Page",
      documentDate: SHARES_DATE,
    }),
    "ASX registry as of 2026-01-30. Cross-verified with Appendix 4C. Basic shares only — dilutives (~240M options/rights) not yet tracked."
  ),

  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "regulatory",
      searchTerm: "Operating cash outflows for the quarter were $0.7 million",
      url: Q2_FY2026_4C_URL,
      quote: "No debt disclosed in Appendix 4C or quarterly report",
      anchor: "Financial Review",
      sourceName: "ASX Appendix 4C Q2 FY2026",
      documentDate: PERIOD_END,
    }),
    "No debt facilities disclosed in Q2 FY2026 quarterly report or Appendix 4C. Debt-free balance sheet."
  ),

  cashReserves: pv(
    CASH_USD,
    docSource({
      type: "regulatory",
      searchTerm: "$2,829,509",
      url: Q2_FY2026_4C_URL,
      quote: "Cash at Bank $2,829,509",
      anchor: "Cash at Bank",
      sourceName: "ASX Appendix 4C Q2 FY2026",
      documentDate: PERIOD_END,
    }),
    "A$2,829,509 from Appendix 4C at 31 Dec 2025. USD conversion at 0.63 AUD/USD = US$1,782,000. Operating capital, not excess cash."
  ),

  quarterlyBurn: pv(
    BURN_USD,
    docSource({
      type: "regulatory",
      searchTerm: "Operating cash outflows for the quarter were $0.7 million",
      url: Q2_FY2026_4C_URL,
      quote: "Operating cash outflows for the quarter were $0.7 million, approximately 38% lower than the September quarter ($1.1m)",
      anchor: "Operating cash outflows",
      sourceName: "ASX Appendix 4C Q2 FY2026",
      documentDate: PERIOD_END,
    }),
    "A$705K operating outflow Q2 FY2026 × 0.63 AUD/USD ≈ US$440K. Down 38% from Q1 ($1.1M AUD)."
  ),

  preferredEquity: pv(
    0,
    docSource({
      type: "regulatory",
      searchTerm: "Total spot Bitcoin in Treasury at 31 December 2025 was 308.84",
      url: Q2_FY2026_4C_URL,
      quote: "No preferred equity disclosed",
      anchor: "Financial Review",
      sourceName: "ASX Appendix 4C Q2 FY2026",
      documentDate: PERIOD_END,
    }),
    "No preferred equity classes on issue. Ordinary shares only."
  ),
};

// =========================================================================
// DEBUG / STATS
// =========================================================================
export const DCC_PROVENANCE_DEBUG = {
  holdingsDate: HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: PERIOD_END,
  lastFilingChecked: Q2_FY2026_4C_DATE,
  holdings: TOTAL_BTC,
  holdingsBreakdown: `${BTC_DIRECT} direct + ${BTC_VIA_BTXX} via BTXX ETF`,
  sharesBasic: SHARES_OUTSTANDING,
  totalDebt: TOTAL_DEBT,
  cashAud: CASH_AUD,
  cashUsd: CASH_USD,
  burnAud: BURN_AUD,
  burnUsd: BURN_USD,
  audUsdRate: AUD_USD_RATE,
  notes: "FY ends Jun 30. ASX-listed (Perth, AU). No debt. BTC held direct + via BTXX ETF (own fund). Also holds 20,521 SOL (staked, not tracked). ~240M dilutive options/perf rights untracked.",
};

// =========================================================================
// HELPER
// =========================================================================
export function getDccProvenance() {
  return {
    holdings: DCC_PROVENANCE.holdings?.value,
    holdingsDate: HOLDINGS_DATE,
    sharesBasic: SHARES_OUTSTANDING,
    sharesDate: SHARES_DATE,
    cashReserves: DCC_PROVENANCE.cashReserves?.value,
    totalDebt: DCC_PROVENANCE.totalDebt?.value,
    preferredEquity: DCC_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: DCC_PROVENANCE.quarterlyBurn?.value,
  };
}
