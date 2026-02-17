/**
 * ALCPB (The Blockchain Group / Capital B) — BTC Treasury Company
 *
 * All values traced to AMF regulatory filings or Euronext press releases.
 * Click any metric → see source → verify at source.
 *
 * Jurisdiction: AMF (France), Euronext Growth Paris
 * ISIN: FR0011053636
 * Currency: EUR (converted to USD at ~1.04 EUR/USD where noted)
 * Asset: BTC
 * Fiscal Year End: December 31
 *
 * No SEC/XBRL — all sources are AMF filings or Euronext announcements.
 * Company formerly traded as ALTBG, rebranded to Capital B (ALCPB) in 2025.
 *
 * Latest filing:
 *   AMF shareholder declaration: Feb 9, 2026 (2,828 BTC, 227,468,631 shares)
 */

import {
  type ProvenanceFinancials,
  pv,
  docSource,
} from "../types/provenance";

// =========================================================================
// KEY FILINGS
// =========================================================================
const AMF_FEB9_2026_URL = "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2026/02/FCACT078219_20260209.pdf";
const AMF_FEB9_2026_DATE = "2026-02-09";

// OCA issuance press releases (Euronext)
const OCA_T1_MAR2025_URL = "https://live.euronext.com/en/products/equities/company-news/2025-05-12-blockchain-group-announces-convertible-bond-issuance-eur";
const OCA_B02_MAY2025_URL = "https://live.euronext.com/en/products/equities/company-news/2025-05-26-blockchain-group-announces-convertible-bond-issuance-eur";
const OCA_A03_JUN2025_URL = "https://live.euronext.com/en/products/equities/company-news/2025-06-12-blockchain-group-announces-equity-and-convertible-bond";
const OCA_A04_B04_A05_URL = "https://www.finanzwire.com/press-release/capital-b-capital-increase-and-convertible-bonds-issuance-for-eur115-million-with-tobam-bitcoin-alpha-fund-to-pursue-its-bitcoin-treasury-company-strategy-0WAE500EF0o";

// =========================================================================
// VALUES — from AMF filings + Euronext press releases
// =========================================================================

// BTC Holdings
// AMF filing Feb 9, 2026: 2,828 BTC total
const BTC_HOLDINGS = 2_828;
const HOLDINGS_DATE = AMF_FEB9_2026_DATE;

// Shares Outstanding (basic)
// AMF filing Feb 9, 2026: 227,468,631 basic shares
// Fully diluted: ~389,888,020 (per company press release)
const SHARES_BASIC = 227_468_631;
const SHARES_DATE = AMF_FEB9_2026_DATE;

// Total Debt — all convertible bonds (OCA tranches), converted EUR→USD at ~1.04
// OCA Tranche 1 (A-01 + B-01): €48.6M × 1.04 = $50,544,000 @ €0.544/share
// OCA B-02 (Fulgur/UTXO/Adam Back): €70.4M × 1.04 = $73,216,000 @ €0.707/share
// OCA B-03 T1 (Moonlight): €5M × 1.04 = $5,200,000 @ €3.809/share
// OCA B-03 T2 (Optional): €7.5M × 1.04 = $7,800,000 @ €4.9517/share
// OCA A-03 (TOBAM): €6M × 1.04 = $6,240,000 @ €6.24/share
// OCA A-04 (TOBAM): €5M × 1.04 = $5,200,000 @ €5.174/share
// OCA B-04 (Adam Back): €5M × 1.04 = $5,200,000 @ €5.174/share
// OCA A-05 T1 (TOBAM): €6.5M × 1.04 = $6,760,000 @ €3.6557/share
const OCA_T1_FACE = 50_544_000;
const OCA_B02_FACE = 73_216_000; // Fulgur 55.3M + UTXO 3M + Adam Back 12.1M = €70.4M
const OCA_B03_T1_FACE = 5_200_000;
const OCA_B03_T2_FACE = 7_800_000;
const OCA_A03_FACE = 6_240_000;
const OCA_A04_FACE = 5_200_000;
const OCA_B04_FACE = 5_200_000;
const OCA_A05_T1_FACE = 6_760_000;
const TOTAL_DEBT = OCA_T1_FACE + OCA_B02_FACE + OCA_B03_T1_FACE + OCA_B03_T2_FACE + OCA_A03_FACE + OCA_A04_FACE + OCA_B04_FACE + OCA_A05_T1_FACE;
// = $160,160,000

// Cash
// Unknown — pending FY 2025 IFRS financials. Set to 0.
const CASH_RESERVES = 0;

// Quarterly Burn
// ~€0.72M/quarter from H1 2025 IFRS ≈ $800K/quarter (estimated)
const QUARTERLY_BURN = 800_000;

// =========================================================================
// PROVENANCE
// =========================================================================

export const ALCPB_PROVENANCE: ProvenanceFinancials = {
  holdings: pv(
    BTC_HOLDINGS,
    docSource({
      type: "regulatory",
      searchTerm: "Total group holdings of 2,828 BTC",
      url: AMF_FEB9_2026_URL,
      quote: "Capital B and its subsidiary The Blockchain Group Luxembourg SA hold a total of 2,828 BTC as part of the Bitcoin Treasury Company strategy, with an acquisition value of 263.5 million",
      anchor: "Total group holdings",
      sourceName: "Capital B press release via AMF",
      documentDate: HOLDINGS_DATE,
    }),
    "AMF press release Feb 9, 2026 (PDF, extracted via pdftotext). Search term verified against document."
  ),

  sharesOutstanding: pv(
    SHARES_BASIC,
    docSource({
      type: "regulatory",
      searchTerm: "227,468,631",
      url: AMF_FEB9_2026_URL,
      quote: "TOTAL 227,468,631 100% ... 389,888,020 100% (fully diluted). Issued Common Shares: 227,468,631",
      anchor: "Impact of the operations on the distribution of the Company's share capital",
      sourceName: "Capital B press release via AMF",
      documentDate: SHARES_DATE,
    }),
    "Basic shares from capital distribution table. Fully diluted 389,888,020 (capital table) vs 391,728,020 (KPI table — includes 1.84M indicative free shares not yet granted). Active EUR 300M ATM — count may be stale between filings."
  ),

  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "regulatory",
      searchTerm: "convertible bonds",
      url: OCA_T1_MAR2025_URL,
      quote: "10 OCA tranches totaling ~€154M face value (A-01/B-01 through A-05). All zero-coupon convertible bonds. EUR→USD at ~1.04.",
      anchor: "OCA convertible bonds",
      sourceName: "Euronext Paris",
      documentDate: "2025-08-01",
    }),
    "Sum of all OCA tranche face values converted to USD. At stock ~€0.60: OCA Tranche 1 ($50.5M, strike $0.57) is ITM → dynamically subtracted from debt by mNAV calculator. See dilutive-instruments.ts for full breakdown."
  ),

  cashReserves: pv(
    CASH_RESERVES,
    docSource({
      type: "company-website",
      url: "https://cptlb.com",
      quote: "Cash position unknown — pending FY 2025 IFRS financials (expected Mar-Apr 2026).",
      anchor: "Cash",
      sourceName: "Capital B (cptlb.com)",
      documentDate: "2025-06-30",
    }),
    "Set to $0 pending FY 2025 IFRS financials. Company raised significant capital via ATM + OCA convertibles, but cash position is unclear without published statements. H1 2025 IFRS (Jun 30, 2025) was the last known baseline."
  ),

  quarterlyBurn: pv(
    QUARTERLY_BURN,
    docSource({
      type: "company-website",
      url: "https://cptlb.com",
      quote: "~€0.72M/quarter operating cash burn from H1 2025 IFRS financials",
      anchor: "Operating burn",
      sourceName: "Capital B H1 2025 IFRS",
      documentDate: "2025-06-30",
    }),
    "Estimated from H1 2025 IFRS actuals (~€0.72M/quarter). Pre-treasury cost structure — may not reflect current ops. FY 2025 results expected Mar-Apr 2026."
  ),

  preferredEquity: pv(
    0,
    docSource({
      type: "regulatory",
      url: AMF_FEB9_2026_URL,
      quote: "No preferred equity. All capital is common shares + OCA convertible bonds.",
      anchor: "Preferred equity",
      sourceName: "AMF filing",
      documentDate: AMF_FEB9_2026_DATE,
    }),
    "No preferred equity outstanding."
  ),
};

// =========================================================================
// DEBUG / STATS
// =========================================================================
export const ALCPB_PROVENANCE_DEBUG = {
  holdingsDate: HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  lastFilingChecked: AMF_FEB9_2026_DATE,
  holdings: BTC_HOLDINGS,
  sharesBasic: SHARES_BASIC,
  sharesDiluted: 389_888_020,
  totalDebt: TOTAL_DEBT,
  ocaTranches: 10,
  notes: "FY ends Dec 31. Euronext Growth Paris. AMF filings (no XBRL). ~47M dilutive overcount (OCA T1 partial conversions likely in basic count). BSA 2025-01 warrants expire Apr 10, 2026. EUR/USD conversions at ~1.04.",
};

// =========================================================================
// HELPER
// =========================================================================
export function getAlcpbProvenance() {
  return {
    holdings: ALCPB_PROVENANCE.holdings?.value,
    holdingsDate: HOLDINGS_DATE,
    sharesBasic: SHARES_BASIC,
    sharesDate: SHARES_DATE,
    cashReserves: ALCPB_PROVENANCE.cashReserves?.value,
    totalDebt: ALCPB_PROVENANCE.totalDebt?.value,
    preferredEquity: ALCPB_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: ALCPB_PROVENANCE.quarterlyBurn?.value,
  };
}
