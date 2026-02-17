/**
 * H100 Group (H100.ST) - Provenance-tracked data
 *
 * Swedish BTC treasury company — first Nordic Bitcoin treasury.
 * Listed on NGM Nordic SME (NOT Nasdaq). ISK-eligible for Swedish investors.
 * Adam Back investor via SEK 516M convertible (Jul 2025).
 * Acquired Future Holdings AG (Switzerland) Feb 10, 2026.
 *
 * ⚠️ NO SEC/XBRL — sources are MFN (Swedish regulatory filings) + company treasury dashboard.
 * Confidence levels are generally IR/3P rather than REG for balance sheet items,
 * since MFN filings don't include structured XBRL data.
 *
 * Every value traces back to an authoritative source.
 */

import {
  ProvenanceFinancials,
  pv,
  docSource,
} from "../types/provenance";

// =========================================================================
// KEY SOURCES
// =========================================================================
const MFN_FEED_URL = "https://mfn.se/a/h100-group";
const TREASURY_DASHBOARD_URL = "https://treasury.h100.group";
const IR_SHARES_URL = "https://www.h100.group/investor-relations/shares";

// =========================================================================
// LATEST DATA POINTS
// =========================================================================

// Holdings from MFN filing Feb 6, 2026: 4 BTC purchase → 1,051 total
const LATEST_HOLDINGS = 1_051; // BTC
const LATEST_HOLDINGS_DATE = "2026-02-06";

// Shares: 335,250,237 (pre-acquisition) + 3,146,456 (Future Holdings AG) = 338,396,693
// Future Holdings AG acquisition completed Feb 10, 2026
const SHARES_OUTSTANDING = 338_396_693; // Basic shares post-acquisition
const SHARES_DATE = "2026-02-10";
const PRE_ACQUISITION_SHARES = 335_250_237;
const FUTURE_HOLDINGS_NEW_SHARES = 3_146_456;

// Cost basis from treasury dashboard (3P confidence — not audited)
const COST_BASIS_AVG = 114_606; // USD per BTC

// Financial data — limited until Feb 24, 2026 annual report (Bokslutskommuniké)
const TOTAL_DEBT = 0; // Unknown until Feb 24 report; convertible debt outstanding but amount uncertain
const CASH_RESERVES = 0; // Unknown until Feb 24 report
const QUARTERLY_BURN = 1_000_000; // Estimated from MFN Interim Report Nov 19, 2025

/**
 * H100 Group Financial Data with Full Provenance
 *
 * Confidence levels:
 * - Holdings: IR (MFN regulatory filing, but no XBRL)
 * - Shares: IR (company IR page share capital table)
 * - CostBasis: 3P (treasury dashboard, unaudited)
 * - Burn: EST (estimated from interim report)
 * - Cash/Debt: UNV (unknown until Feb 24 annual report)
 */
export const H100_PROVENANCE: ProvenanceFinancials = {
  // =========================================================================
  // BTC HOLDINGS - from MFN filing Feb 6, 2026
  // Confidence: IR — MFN regulatory filing (Swedish equivalent of 8-K)
  // =========================================================================
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "regulatory",
      searchTerm: "1,051",
      url: MFN_FEED_URL,
      quote: "4 BTC purchase → 1,051 total BTC holdings",
      anchor: "BTC Holdings",
      sourceName: "MFN (Modular Finance)",
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "MFN regulatory filing Feb 6, 2026. 4 BTC purchase bringing total to 1,051. IR confidence — MFN is the Swedish regulatory disclosure platform but lacks XBRL structure."
  ),

  // =========================================================================
  // SHARES OUTSTANDING - IR page + MFN acquisition filing
  // Confidence: IR — share capital table on company IR page
  // =========================================================================
  sharesOutstanding: pv(
    SHARES_OUTSTANDING,
    docSource({
      type: "company-website",
      searchTerm: "335,250,237",
      url: IR_SHARES_URL,
      quote: "335,250,237 shares (pre-acquisition) + 3,146,456 new shares for Future Holdings AG acquisition = 338,396,693",
      anchor: "Share capital development",
      documentDate: SHARES_DATE,
    }),
    "IR page shows 335,250,237 as last entry. Future Holdings AG acquisition (Feb 10, 2026) issued 3,146,456 new shares per MFN filing. IR page not yet updated with acquisition shares."
  ),

  // =========================================================================
  // COST BASIS - Treasury dashboard (3P confidence)
  // =========================================================================
  costBasisAvg: pv(
    COST_BASIS_AVG,
    docSource({
      type: "company-website",
      searchTerm: "114,606",
      url: TREASURY_DASHBOARD_URL,
      quote: "Average cost basis per BTC",
      anchor: "Cost Basis",
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "3P confidence — treasury dashboard is company-operated but unaudited. No SEC/XBRL verification possible for Swedish companies."
  ),

  // =========================================================================
  // TOTAL DEBT - Unknown until Feb 24 annual report
  // SEK 393.5M convertible outstanding but exact USD equivalent uncertain
  // Confidence: UNV
  // =========================================================================
  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "regulatory",
      url: MFN_FEED_URL,
      quote: "SEK 516M convertible (Jul 2025), SEK 122.5M converted Nov 2025. ~SEK 393.5M remaining.",
      anchor: "Convertible Debt",
      sourceName: "MFN",
      documentDate: "2025-11-19",
    }),
    "UNV — Total debt unknown until Feb 24, 2026 Bokslutskommuniké. Convertible debentures outstanding (~SEK 393.5M) but exact balance uncertain. Set to 0 as placeholder."
  ),

  // =========================================================================
  // CASH RESERVES - Unknown until Feb 24 annual report
  // Confidence: UNV
  // =========================================================================
  cashReserves: pv(
    CASH_RESERVES,
    docSource({
      type: "regulatory",
      url: MFN_FEED_URL,
      quote: "Cash position not disclosed in interim press releases",
      anchor: "Cash",
      sourceName: "MFN",
      documentDate: "2025-11-19",
    }),
    "UNV — Cash not disclosed until Feb 24, 2026 annual report. Set to 0 as placeholder."
  ),

  // =========================================================================
  // QUARTERLY BURN - Estimated ~$1M/quarter
  // Confidence: EST — derived from MFN Interim Report Nov 19, 2025
  // =========================================================================
  quarterlyBurn: pv(
    QUARTERLY_BURN,
    docSource({
      type: "regulatory",
      url: MFN_FEED_URL,
      quote: "Operating expenses from MFN Interim Report",
      anchor: "Operating Expenses",
      sourceName: "MFN",
      documentDate: "2025-11-19",
    }),
    "EST — Estimated from MFN Interim Report (Nov 19, 2025). Swedish quarterly reports don't provide XBRL-level granularity. Will be updated with Feb 24 annual report."
  ),

  // =========================================================================
  // PREFERRED EQUITY - None
  // =========================================================================
  preferredEquity: pv(
    0,
    docSource({
      type: "company-website",
      url: IR_SHARES_URL,
      quote: "All shares have the same voting value",
      anchor: "Ownership structure",
      documentDate: SHARES_DATE,
    }),
    "No preferred equity. Single share class per IR page."
  ),
};

// =========================================================================
// STAKING INFO — N/A (BTC company, not proof-of-stake)
// =========================================================================
export const H100_STAKING = null; // BTC cannot be staked natively

// =========================================================================
// CAPITAL PROGRAMS
// =========================================================================
export const H100_CAPITAL_PROGRAMS = {
  convertible: {
    originalAmount: 49_600_000, // SEK 516M ÷ ~10.4 USD/SEK
    convertedAmount: 11_800_000, // SEK 122.5M converted Nov 2025
    remainingAmount: 37_800_000, // ~SEK 393.5M remaining
    currency: "SEK",
    originalAmountSEK: 516_000_000,
    convertedAmountSEK: 122_500_000,
    remainingAmountSEK: 393_500_000,
    investors: "Adam Back et al",
    issuedDate: "2025-07-09",
    conversionDate: "2025-11-21",
    source: MFN_FEED_URL,
    note: "Zero-interest convertible debentures. SEK 122.5M converted to shares Nov 2025. IR page incorrectly claims 'no convertibles issued'.",
  },
  acquisition: {
    target: "Future Holdings AG",
    country: "Switzerland",
    completedDate: "2026-02-10",
    sharesIssued: FUTURE_HOLDINGS_NEW_SHARES,
    note: "First expansion outside Nordics. Swiss BTC treasury company.",
    source: MFN_FEED_URL,
  },
};

// =========================================================================
// DEBUG / STATS
// =========================================================================
export const H100_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: "2025-09-30", // Last interim report
  nextReportDate: "2026-02-24", // Bokslutskommuniké (annual report)
  holdings: LATEST_HOLDINGS,
  sharesBasic: SHARES_OUTSTANDING,
  preAcquisitionShares: PRE_ACQUISITION_SHARES,
  futureHoldingsNewShares: FUTURE_HOLDINGS_NEW_SHARES,
  totalDebt: TOTAL_DEBT,
  cashReserves: CASH_RESERVES,
  costBasisAvg: COST_BASIS_AVG,
  notes:
    "First Nordic Bitcoin treasury company. NGM Nordic SME listed (NOT Nasdaq). " +
    "Swedish company — no SEC/XBRL, sources are MFN + treasury dashboard. " +
    "Adam Back investor via SEK 516M convertible. Acquired Future Holdings AG (Switzerland) Feb 10, 2026. " +
    "Cash/debt/burn will be updated with Feb 24, 2026 annual report (Bokslutskommuniké). " +
    "Confidence: Holdings=IR, Shares=IR, CostBasis=3P, Burn=EST, Cash/Debt=UNV.",
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================
export function getH100Provenance() {
  return {
    holdings: LATEST_HOLDINGS,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_OUTSTANDING,
    sharesDate: SHARES_DATE,
    cashReserves: H100_PROVENANCE.cashReserves?.value,
    totalDebt: H100_PROVENANCE.totalDebt?.value,
    preferredEquity: H100_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: H100_PROVENANCE.quarterlyBurn?.value,
    costBasisAvg: COST_BASIS_AVG,
    stakingPct: null, // BTC — no staking
    stakingApy: null,
  };
}
