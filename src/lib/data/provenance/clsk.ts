/**
 * CLSK (CleanSpark, Inc.) - Provenance-tracked data
 *
 * Major US Bitcoin miner with HODL strategy + AI infrastructure pivot.
 * FY ends September 30. Q1 FY2026 = Oct-Dec 2025.
 *
 * Capital structure: $1.8B in convertible notes (two tranches).
 * Active share buyback program (42.4M shares repurchased).
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

// SEC CIK for CLSK
export const CLSK_CIK = "827876";

// Helper to build full SEC document URL
const secDocUrl = (cik: string, accession: string, doc: string) =>
  `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${doc}`;

// =========================================================================
// Q1 FY2026 10-Q DATA (filed Feb 5, 2026, as of Dec 31, 2025)
// =========================================================================
const Q1_FY2026_10Q_ACCESSION = "0001193125-26-039538";
const Q1_FY2026_10Q_FILED = "2026-02-05";
const Q1_FY2026_PERIOD_END = "2025-12-31";
const Q1_FY2026_COVER_DATE = "2026-01-29"; // Shares as of date from cover page

// FY2025 10-K DATA (filed Nov 25, 2025, as of Sep 30, 2025)
const FY2025_10K_ACCESSION = "0001193125-25-297510";
const FY2025_10K_FILED = "2025-11-25";

// Latest holdings from company IR page (updated monthly)
// 10-Q XBRL only reports noncurrent BTC (1,648) but total is much higher
// Company website reports total including current + noncurrent
const LATEST_HOLDINGS = 13_513; // From cleanspark.com/bitcoin-operations as of Jan 31, 2026
const LATEST_HOLDINGS_DATE = "2026-01-31";

// Shares outstanding (from 10-Q cover page, Jan 29, 2026)
const SHARES_OUTSTANDING = 255_752_913; // Basic shares outstanding
const SHARES_ISSUED = 298_114_889; // Total shares issued
const TREASURY_SHARES = 42_365_391; // Shares held in treasury (buyback)

// Financial data from Q1 FY2026 10-Q XBRL
const TOTAL_DEBT = 1_786_759_000; // LongTermDebt (net of discount) - XBRL
const CASH_RESERVES = 458_097_000; // CashAndCashEquivalentsAtCarryingValue - XBRL
const BTC_FAIR_VALUE_CURRENT = 830_073_000; // CryptoAssetFairValueCurrent - XBRL
const BTC_FAIR_VALUE_NONCURRENT = 171_924_000; // CryptoAssetFairValueNoncurrent - XBRL

// Quarterly G&A from FY2025 10-K (Q4 FY2025: Jul-Sep 2025)
const QUARTERLY_BURN = 19_400_760;

/**
 * CLSK Financial Data with Full Provenance
 */
export const CLSK_PROVENANCE: ProvenanceFinancials = {
  // =========================================================================
  // BTC HOLDINGS - from company IR page (monthly updates)
  // 10-Q XBRL only has noncurrent BTC (1,648 of ~10,700+ total)
  // Company website shows total including current position
  // =========================================================================
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "company-website",
      searchTerm: "13,513",
      url: "https://www.cleanspark.com/bitcoin-operations",
      quote: "13,513 Bitcoin Holdings As of January 31, 2026",
      anchor: "Bitcoin Holdings",
      documentDate: LATEST_HOLDINGS_DATE,
    }),
    "From CleanSpark IR page (updated monthly). 10-Q XBRL splits into current ($830M) + noncurrent ($172M). At ~$93.5K BTC price (Dec 31), total ~10,700 BTC at quarter end."
  ),

  // =========================================================================
  // SHARES OUTSTANDING - from Q1 FY2026 10-Q cover page
  // Note: 42.4M shares in treasury from Nov 2025 buyback ($460M)
  // =========================================================================
  sharesOutstanding: pv(
    SHARES_OUTSTANDING,
    xbrlSource({
      fact: "dei:EntityCommonStockSharesOutstanding",
      searchTerm: "255,752,913",
      rawValue: SHARES_OUTSTANDING,
      unit: "shares",
      periodType: "instant",
      periodEnd: Q1_FY2026_COVER_DATE,
      cik: CLSK_CIK,
      accession: Q1_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_FY2026_10Q_FILED,
      documentAnchor: "shares of common stock outstanding",
    }),
    `298.1M issued - 42.4M treasury = 255.8M outstanding. Buyback of 30.6M shares ($460M) from Nov 2025 convertible offering investors.`
  ),

  // =========================================================================
  // QUARTERLY BURN - G&A from FY2025 10-K XBRL (Q4 FY2025)
  // Using G&A only (excludes mining COGS which vary with production)
  // =========================================================================
  quarterlyBurn: pv(
    QUARTERLY_BURN,
    xbrlSource({
      fact: "us-gaap:GeneralAndAdministrativeExpense",
      searchTerm: "19,400,760",
      rawValue: QUARTERLY_BURN,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-07-01",
      periodEnd: "2025-09-30",
      cik: CLSK_CIK,
      accession: FY2025_10K_ACCESSION,
      filingType: "10-K",
      filingDate: FY2025_10K_FILED,
      documentAnchor: "General and administrative",
    }),
    "G&A only. Mining COGS excluded as variable with BTC production/hashrate."
  ),

  // =========================================================================
  // TOTAL DEBT - from Q1 FY2026 10-Q XBRL
  // $650M 0% due 2030 (Dec 2024) + $1.15B 0% due 2032 (Nov 2025)
  // =========================================================================
  totalDebt: pv(
    TOTAL_DEBT,
    xbrlSource({
      fact: "us-gaap:LongTermDebt",
      searchTerm: "1,786,759",
      rawValue: TOTAL_DEBT,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q1_FY2026_PERIOD_END,
      cik: CLSK_CIK,
      accession: Q1_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_FY2026_10Q_FILED,
      documentAnchor: "Long-term debt",
    }),
    "$650M 0% Convertible Notes due 2030 + $1.15B 0% Convertible Notes due 2032 = $1.8B face. Net of discount/issuance costs."
  ),

  // =========================================================================
  // CASH RESERVES - from Q1 FY2026 10-Q XBRL
  // =========================================================================
  cashReserves: pv(
    CASH_RESERVES,
    xbrlSource({
      fact: "us-gaap:CashAndCashEquivalentsAtCarryingValue",
      searchTerm: "458,097",
      rawValue: CASH_RESERVES,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q1_FY2026_PERIOD_END,
      cik: CLSK_CIK,
      accession: Q1_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_FY2026_10Q_FILED,
      documentAnchor: "Cash and cash equivalents",
    }),
    "$458M cash. Significant increase from $43M at FY2025 end due to $1.15B convertible offering (Nov 2025)."
  ),

  // =========================================================================
  // PREFERRED EQUITY - None
  // =========================================================================
  preferredEquity: pv(
    0,
    xbrlSource({
      fact: "us-gaap:PreferredStockValue",
      rawValue: 0,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q1_FY2026_PERIOD_END,
      cik: CLSK_CIK,
      accession: Q1_FY2026_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q1_FY2026_10Q_FILED,
      documentAnchor: "Preferred stock",
    }),
    "10M preferred shares authorized, none issued."
  ),
};

// =========================================================================
// CONVERTIBLE NOTES DETAIL
// Two tranches of zero-coupon convertible senior notes
// =========================================================================

export interface CLSKConvertibleNote {
  id: string;
  name: string;
  issuanceDate: string;
  maturityDate: string;
  principalAmount: number;
  couponRate: number;
  conversionPrice: number;
  conversionRate: number; // shares per $1,000 principal
  sharesIfConverted: number;
  cappedCallCap?: number; // Cap price for capped call hedge
  accession8k: string;
  sourceUrl: string;
  status: "outstanding" | "converted" | "redeemed" | "matured";
}

export const CLSK_CONVERTIBLE_NOTES: CLSKConvertibleNote[] = [
  {
    id: "2030-notes",
    name: "0.00% Convertible Senior Notes due 2030",
    issuanceDate: "2024-12-17",
    maturityDate: "2030-06-15",
    principalAmount: 650_000_000, // $550M + $100M greenshoe exercised
    couponRate: 0,
    conversionPrice: 14.80,
    conversionRate: 67.5858, // shares per $1,000 principal
    sharesIfConverted: 43_930_770, // 67.5858 × 650,000
    cappedCallCap: 24.66, // 100% premium over $12.33 close
    accession8k: "0001193125-24-284968", // Dec 17, 2024 closing 8-K
    sourceUrl: "https://www.prnewswire.com/news-releases/cleanspark-inc-announces-pricing-of-550-million-convertible-notes-offering-302331078.html",
    status: "outstanding",
  },
  {
    id: "2032-notes",
    name: "0.00% Convertible Senior Notes due 2032",
    issuanceDate: "2025-11-13",
    maturityDate: "2032-06-15", // Estimated - need exact date from indenture
    principalAmount: 1_150_000_000,
    couponRate: 0,
    conversionPrice: 19.16,
    conversionRate: 52.1832, // shares per $1,000 principal
    sharesIfConverted: 60_010_680, // 52.1832 × 1,150,000
    accession8k: "0001193125-25-280105",
    sourceUrl: "https://www.prnewswire.com/news-releases/cleanspark-inc-announces-closing-of-upsized-1-15-billion-zero-coupon-convertible-notes-offering-302615019.html",
    status: "outstanding",
  },
];

/**
 * Calculate total convertible debt (face value)
 */
export function getCLSKTotalConvertibleDebt(): number {
  return CLSK_CONVERTIBLE_NOTES.filter((n) => n.status === "outstanding").reduce(
    (sum, n) => sum + n.principalAmount,
    0
  );
}

/**
 * Calculate total potential dilutive shares from convertibles
 */
export function getCLSKTotalDilutiveFromConverts(): number {
  return CLSK_CONVERTIBLE_NOTES.filter((n) => n.status === "outstanding").reduce(
    (sum, n) => sum + n.sharesIfConverted,
    0
  );
}

// =========================================================================
// DEBUG / STATS
// =========================================================================

export const CLSK_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  holdingsSource: "cleanspark.com/bitcoin-operations",
  sharesDate: Q1_FY2026_COVER_DATE,
  balanceSheetDate: Q1_FY2026_PERIOD_END,
  lastFilingChecked: Q1_FY2026_10Q_FILED,
  holdings: LATEST_HOLDINGS,
  sharesBasic: SHARES_OUTSTANDING,
  sharesIssued: SHARES_ISSUED,
  treasuryShares: TREASURY_SHARES,
  totalDebt: TOTAL_DEBT,
  totalConvertiblesFace: getCLSKTotalConvertibleDebt(),
  totalDilutiveFromConverts: getCLSKTotalDilutiveFromConverts(),
  cashReserves: CASH_RESERVES,
  btcFairValueCurrent: BTC_FAIR_VALUE_CURRENT,
  btcFairValueNoncurrent: BTC_FAIR_VALUE_NONCURRENT,
  btcFairValueTotal: BTC_FAIR_VALUE_CURRENT + BTC_FAIR_VALUE_NONCURRENT,
  notes:
    "CleanSpark is a BTC miner + AI infrastructure company. FY ends Sep 30. Holdings from IR page (monthly updates). $1.8B in two zero-coupon convertible tranches. Active $460M share buyback (42.4M shares in treasury).",
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Get current CLSK provenance values for use in companies.ts
 */
export function getCLSKProvenance() {
  return {
    holdings: CLSK_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_OUTSTANDING,
    sharesDate: Q1_FY2026_COVER_DATE,
    cashReserves: CLSK_PROVENANCE.cashReserves?.value,
    totalDebt: CLSK_PROVENANCE.totalDebt?.value,
    preferredEquity: CLSK_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: CLSK_PROVENANCE.quarterlyBurn?.value,
  };
}
