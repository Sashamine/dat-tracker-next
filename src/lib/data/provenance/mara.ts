/**
 * MARA (Marathon Digital Holdings) - Provenance-tracked data
 *
 * Largest US public Bitcoin miner with HODL strategy.
 * Complex capital structure with multiple convertible note tranches.
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

// SEC CIK for MARA
export const MARA_CIK = "1507605";

// Helper to build full SEC document URL
const secDocUrl = (cik: string, accession: string, doc: string) =>
  `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${doc}`;

// =========================================================================
// Q3 2025 10-Q DATA (filed Nov 4, 2025, as of Sep 30, 2025)
// =========================================================================
const Q3_2025_10Q_ACCESSION = "0001507605-25-000028";
const Q3_2025_10Q_FILED = "2025-11-04";
const Q3_2025_PERIOD_END = "2025-09-30";
const Q3_2025_COVER_DATE = "2025-10-28"; // Shares as of date from cover page

// Latest holdings data points
const LATEST_HOLDINGS = 52_850;
const LATEST_HOLDINGS_DATE = "2025-09-30";

// Shares outstanding
const SHARES_OUTSTANDING = 378_184_353; // Basic shares from 10-Q cover
const DILUTED_SHARES = 470_126_290; // From WeightedAverageNumberOfDilutedSharesOutstanding

// Financial data
const TOTAL_DEBT = 3_248_000_000; // ~$3.25B in convertible notes
const CASH_RESERVES = 826_392_000; // $826M cash
const RESTRICTED_CASH = 12_000_000; // $12M restricted
const COST_BASIS_TOTAL = 4_637_673_000; // Total cost of BTC

/**
 * MARA Financial Data with Full Provenance
 */
export const MARA_PROVENANCE: ProvenanceFinancials = {
  // =========================================================================
  // BTC HOLDINGS - from SEC 10-Q filing
  // MARA reports holdings as: custody + receivable (from hosted mining)
  // Q3 2025: 35,493 custody + 17,357 receivable = 52,850 total
  // =========================================================================
  holdings: pv(
    LATEST_HOLDINGS,
    docSource({
      type: "sec-document",
      searchTerm: "52,850",
      url: secDocUrl(MARA_CIK, Q3_2025_10Q_ACCESSION, "mara-20250930.htm"),
      quote: "35,493 + 17,357 = 52,850 BTC",
      anchor: "Digital assets",
      cik: MARA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
    }),
    "Total BTC = custody (35,493) + receivable from hosted mining (17,357). MARA is a miner, not pure treasury."
  ),

  // =========================================================================
  // COST BASIS - from Q3 2025 10-Q
  // Total cost / total holdings = average cost per BTC
  // =========================================================================
  costBasisAvg: pv(
    87_760,
    derivedSource({
      derivation: "Total BTC cost / Total BTC holdings",
      formula: "$4,637,673,000 / 52,850 BTC = $87,760/BTC",
      inputs: {
        totalCost: pv(
          COST_BASIS_TOTAL,
          xbrlSource({
            fact: "mara:CryptoAssetCost",
            searchTerm: "4,637,673",
            rawValue: COST_BASIS_TOTAL,
            unit: "USD",
            periodType: "instant",
            periodEnd: Q3_2025_PERIOD_END,
            cik: MARA_CIK,
            accession: Q3_2025_10Q_ACCESSION,
            filingType: "10-Q",
            filingDate: Q3_2025_10Q_FILED,
            documentAnchor: "Digital assets at cost",
          })
        ),
        totalHoldings: pv(
          LATEST_HOLDINGS,
          docSource({
            type: "sec-document",
            searchTerm: "52,850",
            url: secDocUrl(MARA_CIK, Q3_2025_10Q_ACCESSION, "mara-20250930.htm"),
            quote: "52,850 BTC",
            anchor: "Bitcoin holdings",
            cik: MARA_CIK,
            accession: Q3_2025_10Q_ACCESSION,
            filingType: "10-Q",
            filingDate: Q3_2025_10Q_FILED,
            documentDate: Q3_2025_PERIOD_END,
          })
        ),
      },
    }),
    "High cost basis reflects premium paid during 2024-2025 accumulation phase."
  ),

  // =========================================================================
  // TOTAL COST BASIS - from Q3 2025 10-Q XBRL
  // =========================================================================
  totalCostBasis: pv(
    COST_BASIS_TOTAL,
    xbrlSource({
      fact: "mara:CryptoAssetCost",
      searchTerm: "4,637,673",
      rawValue: COST_BASIS_TOTAL,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: MARA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Digital assets at cost",
    })
  ),

  // =========================================================================
  // SHARES OUTSTANDING - from Q3 2025 10-Q
  // Using basic shares for sharesForMnav; dilutives tracked separately
  // =========================================================================
  sharesOutstanding: pv(
    SHARES_OUTSTANDING,
    xbrlSource({
      fact: "dei:EntityCommonStockSharesOutstanding",
      searchTerm: "378,184,353",
      rawValue: SHARES_OUTSTANDING,
      unit: "shares",
      periodType: "instant",
      periodEnd: Q3_2025_COVER_DATE,
      cik: MARA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "shares of common stock outstanding",
    }),
    "Basic shares. Dilutives (~81M from converts + ~324K RSUs) tracked in dilutive-instruments.ts."
  ),

  // =========================================================================
  // QUARTERLY BURN - from Q3 2025 10-Q XBRL
  // Using G&A only (excludes mining COGS which are variable with production)
  // =========================================================================
  quarterlyBurn: pv(
    85_296_000,
    xbrlSource({
      fact: "us-gaap:GeneralAndAdministrativeExpense",
      searchTerm: "85,296",
      rawValue: 85_296_000,
      unit: "USD",
      periodType: "duration",
      periodStart: "2025-07-01",
      periodEnd: "2025-09-30",
      cik: MARA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "General and administrative",
    }),
    "G&A only. Mining COGS excluded as they're variable with BTC production."
  ),

  // =========================================================================
  // TOTAL DEBT - from Q3 2025 10-Q XBRL
  // Multiple convertible note tranches: 2026, 2030, 2031, 2032
  // =========================================================================
  totalDebt: pv(
    TOTAL_DEBT,
    xbrlSource({
      fact: "us-gaap:LongTermDebt",
      searchTerm: "3,248,000",
      rawValue: TOTAL_DEBT,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: MARA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Long-term debt",
    }),
    "~$3.25B in convertible notes: 2026 ($747.5M), 2030 ($850M), 2031, 2032 ($950M) series."
  ),

  // =========================================================================
  // CASH RESERVES - from Q3 2025 10-Q XBRL
  // =========================================================================
  cashReserves: pv(
    CASH_RESERVES,
    xbrlSource({
      fact: "us-gaap:CashAndCashEquivalentsAtCarryingValue",
      searchTerm: "826,392",
      rawValue: CASH_RESERVES,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: MARA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Cash and cash equivalents",
    }),
    `Plus $${(RESTRICTED_CASH / 1e6).toFixed(0)}M restricted cash.`
  ),

  // =========================================================================
  // PREFERRED EQUITY - None
  // =========================================================================
  preferredEquity: pv(
    0,
    xbrlSource({
      fact: "us-gaap:PreferredStockValue",
      searchTerm: "Preferred stock",
      rawValue: 0,
      unit: "USD",
      periodType: "instant",
      periodEnd: Q3_2025_PERIOD_END,
      cik: MARA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentAnchor: "Preferred stock",
    }),
    "No preferred equity issued."
  ),
};

// =========================================================================
// CONVERTIBLE NOTES DETAIL
// Full breakdown of all convertible tranches for reference
// Actual dilutive calculations in dilutive-instruments.ts
// =========================================================================

export interface MARAConvertibleNote {
  id: string;
  name: string;
  issuanceDate: string;
  maturityDate: string;
  principalAmount: number;
  couponRate: number;
  conversionPrice: number;
  sharesIfConverted: number;
  accession8k?: string;
  status: "outstanding" | "converted" | "redeemed" | "matured";
}

export const MARA_CONVERTIBLE_NOTES: MARAConvertibleNote[] = [
  {
    id: "2026-notes",
    name: "2026 Convertible Senior Notes",
    issuanceDate: "2021-11-18",
    maturityDate: "2026-11-15",
    principalAmount: 747_500_000,
    couponRate: 0,
    conversionPrice: 76.17,
    sharesIfConverted: 9_812_000,
    accession8k: "0001193125-21-334851",
    status: "outstanding",
  },
  {
    id: "2030-notes",
    name: "2030 Convertible Senior Notes",
    issuanceDate: "2024-12-04",
    maturityDate: "2030-12-01",
    principalAmount: 850_000_000,
    couponRate: 0,
    conversionPrice: 34.58,
    sharesIfConverted: 24_580_000,
    accession8k: "0001493152-24-048704",
    status: "outstanding",
  },
  {
    id: "2032-notes",
    name: "2032 Convertible Senior Notes",
    issuanceDate: "2025-07-28",
    maturityDate: "2032-05-01",
    principalAmount: 950_000_000,
    couponRate: 0,
    conversionPrice: 20.26,
    sharesIfConverted: 46_890_000,
    accession8k: "0000950142-25-002027",
    status: "outstanding",
  },
];

/**
 * Calculate total convertible debt
 */
export function getMARATotalConvertibleDebt(): number {
  return MARA_CONVERTIBLE_NOTES.filter((n) => n.status === "outstanding").reduce(
    (sum, n) => sum + n.principalAmount,
    0
  );
}

/**
 * Calculate total potential dilutive shares from convertibles
 */
export function getMARATotalDilutiveFromConverts(): number {
  return MARA_CONVERTIBLE_NOTES.filter((n) => n.status === "outstanding").reduce(
    (sum, n) => sum + n.sharesIfConverted,
    0
  );
}

// =========================================================================
// DEBUG / STATS
// =========================================================================

export const MARA_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: Q3_2025_COVER_DATE,
  balanceSheetDate: Q3_2025_PERIOD_END,
  lastFilingChecked: Q3_2025_10Q_FILED,
  holdings: LATEST_HOLDINGS,
  sharesBasic: SHARES_OUTSTANDING,
  sharesDiluted: DILUTED_SHARES,
  totalDebt: TOTAL_DEBT,
  totalConvertibles: getMARATotalConvertibleDebt(),
  totalDilutiveFromConverts: getMARATotalDilutiveFromConverts(),
  notes:
    "MARA is a BTC miner, not pure treasury. Holdings include receivable from hosted mining. Complex cap structure with multiple convert tranches.",
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Get current MARA provenance values for use in companies.ts
 */
export function getMARAProvenance() {
  return {
    holdings: MARA_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    sharesBasic: SHARES_OUTSTANDING,
    sharesDiluted: DILUTED_SHARES,
    sharesDate: Q3_2025_COVER_DATE,
    costBasisAvg: MARA_PROVENANCE.costBasisAvg?.value,
    totalCostBasis: MARA_PROVENANCE.totalCostBasis?.value,
    cashReserves: MARA_PROVENANCE.cashReserves?.value,
    restrictedCash: RESTRICTED_CASH,
    totalDebt: MARA_PROVENANCE.totalDebt?.value,
    preferredEquity: MARA_PROVENANCE.preferredEquity?.value,
    quarterlyBurn: MARA_PROVENANCE.quarterlyBurn?.value,
  };
}
