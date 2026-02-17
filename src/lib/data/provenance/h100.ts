/**
 * H100 Group (H100.ST) - Provenance-tracked data
 *
 * Swedish BTC treasury company — first Nordic Bitcoin treasury.
 * Listed on NGM Nordic SME (NOT Nasdaq). ISK-eligible for Swedish investors.
 * Adam Back investor via Jul 2025 raise: SEK 342.3M zero-coupon convertible debentures + directed equity issues. SEK 122.5M converted Nov 2025.
 * Acquired Future Holdings AG (Switzerland) Feb 12, 2026.
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
const MFN_HOLDINGS_FILING_URL = "https://mfn.se/a/h100-group/h100-group-acquires-4-39-btc-total-holdings-reach-1-051-btc";
const TREASURY_DASHBOARD_URL = "https://treasury.h100.group";
const IR_SHARES_URL = "https://www.h100.group/investor-relations/shares";

// =========================================================================
// LATEST DATA POINTS
// =========================================================================

// Holdings from MFN filing Feb 6, 2026: 4.39 BTC purchase → 1,051 total
const LATEST_HOLDINGS = 1_051; // BTC
const LATEST_HOLDINGS_DATE = "2026-02-06";

// Shares: 335,250,237 (pre-acquisition) + 3,146,456 (Future Holdings AG) = 338,396,693
// Future Holdings AG acquisition completed Feb 12, 2026
const SHARES_OUTSTANDING = 338_396_693; // Basic shares post-acquisition
const SHARES_DATE = "2026-02-12";  // MFN filing date for Future Holdings AG acquisition completion
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
      url: MFN_HOLDINGS_FILING_URL,
      quote: "4.39 BTC purchase → 1,051 total BTC holdings",
      anchor: "BTC Holdings",
      sourceName: "MFN (Modular Finance)",
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "MFN regulatory filing Feb 6, 2026. 4.39 BTC purchase bringing total to 1,051. IR confidence — MFN is the Swedish regulatory disclosure platform but lacks XBRL structure."
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
    "IR page shows 335,250,237 as last entry. Future Holdings AG acquisition (Feb 12, 2026) issued 3,146,456 new shares per MFN filing. IR page not yet updated with acquisition shares."
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
  // SEK 219.8M convertible remaining (~$20.7M USD at 10.6 SEK/USD)
  // Confidence: UNV
  // =========================================================================
  totalDebt: pv(
    TOTAL_DEBT,
    docSource({
      type: "regulatory",
      url: MFN_FEED_URL,
      quote: "SEK 342.3M convertible (Jul 2025), SEK 122.5M converted Nov 2025. SEK 219.8M remaining.",
      anchor: "Convertible Debt",
      sourceName: "MFN",
      documentDate: "2025-11-21",
    }),
    "UNV — Total debt unknown until Feb 24, 2026 Bokslutskommuniké. Zero-coupon convertible debentures outstanding (SEK 219.8M / ~$20.7M). Set to 0 as placeholder."
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
    originalAmount: 32_300_000, // SEK 342.3M ÷ ~10.6 SEK/USD
    convertedAmount: 11_557_000, // SEK 122.5M converted Nov 2025 ÷ ~10.6
    remainingAmount: 20_736_000, // SEK 219.8M remaining ÷ ~10.6
    currency: "SEK",
    originalAmountSEK: 342_300_000,
    convertedAmountSEK: 122_500_000,
    remainingAmountSEK: 219_800_000,
    conversionPriceSEK: 8.48,
    potentialShares: 25_919_811, // SEK 219,800,000 / SEK 8.48
    originalPotentialShares: 40_365_566, // SEK 342,300,000 / SEK 8.48
    sharesConverted: 14_450_468, // Nov 2025 conversion
    maturity: "2030-07-09",
    interestRate: 0, // Zero coupon
    forcedConversionThreshold: 11.27, // SEK — if 20-day VWAP exceeds, company can force conversion
    investors: "Adam Back et al",
    issuedDate: "2025-07-09",
    conversionDate: "2025-11-21",
    source: MFN_FEED_URL,
    note: "Zero-coupon convertible debentures. Originally SEK 342.3M / 40.37M shares. SEK 122.5M converted to 14,450,468 shares Nov 2025. Remaining: SEK 219.8M / 25.9M shares. Forced conversion if 20-day VWAP > SEK 11.27. Maturity Jul 9, 2030.",
  },
  acquisition: {
    target: "Future Holdings AG",
    country: "Switzerland",
    completedDate: "2026-02-12",  // MFN filing date
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
    "Adam Back investor via Jul 2025 raise: SEK 342.3M zero-coupon convertible debentures + directed equity issues. Acquired Future Holdings AG (Switzerland) Feb 12, 2026. " +
    "Cash/debt/burn will be updated with Feb 24, 2026 annual report (Bokslutskommuniké). " +
    "⚠️ IR page (h100.group/investor-relations/shares) incorrectly claims 'no convertibles' — contradicted by MFN filings showing SEK 219.8M outstanding. " +
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
