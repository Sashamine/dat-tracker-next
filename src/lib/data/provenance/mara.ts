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
const DILUTED_SHARES = 470_126_290; // XBRL WeightedAverageNumberOfDilutedSharesOutstanding Q3-ONLY (Jul-Sep 2025). YTD (Jan-Sep) is 450,081,096.

// Financial data
const TOTAL_DEBT = 3_597_561_000; // $3,247,561K LongTermDebt (XBRL) + $350,000K LinesOfCreditCurrent (XBRL). Both from 10-Q Q3 2025.
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
    87_752, // $4,637,673,000 / 52,850 = $87,751.62
    derivedSource({
      derivation: "Total BTC cost / Total BTC holdings",
      formula: "$4,637,673,000 / 52,850 BTC = $87,752/BTC",
      inputs: {
        totalCost: pv(
          COST_BASIS_TOTAL,
          docSource({
            type: "sec-document",
            searchTerm: "Total bitcoin holdings",
            url: secDocUrl(MARA_CIK, Q3_2025_10Q_ACCESSION, "mara-20250930.htm"),
            quote: "Total bitcoin holdings 52,850 $4,637,673",
            anchor: "Note 5 - Digital Assets",
            cik: MARA_CIK,
            accession: Q3_2025_10Q_ACCESSION,
            filingType: "10-Q",
            filingDate: Q3_2025_10Q_FILED,
            documentDate: Q3_2025_PERIOD_END,
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
    docSource({
      type: "sec-document",
      searchTerm: "Total bitcoin holdings",
      url: secDocUrl(MARA_CIK, Q3_2025_10Q_ACCESSION, "mara-20250930.htm"),
      quote: "Total bitcoin holdings 52,850 $4,637,673",
      anchor: "Note 5 - Digital Assets",
      cik: MARA_CIK,
      accession: Q3_2025_10Q_ACCESSION,
      filingType: "10-Q",
      filingDate: Q3_2025_10Q_FILED,
      documentDate: Q3_2025_PERIOD_END,
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
    "Basic shares. Dilutives (~132M from converts + ~324K warrants at $25.00, expiring ~Jan 2026) tracked in dilutive-instruments.ts."
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
    derivedSource({
      derivation: "Long-term convertible notes (book value) + line of credit (current)",
      formula: "$3,247,561K (LongTermDebt XBRL) + $350,000K (LinesOfCreditCurrent XBRL) = $3,597,561K",
      inputs: {
        longTermDebt: pv(3_247_561_000, xbrlSource({
          fact: "us-gaap:LongTermDebt",
          searchTerm: "3,247,561",
          rawValue: 3_247_561_000,
          unit: "USD",
          periodType: "instant",
          periodEnd: Q3_2025_PERIOD_END,
          cik: MARA_CIK,
          accession: Q3_2025_10Q_ACCESSION,
          filingType: "10-Q",
          filingDate: Q3_2025_10Q_FILED,
          documentAnchor: "Long-term debt",
        })),
        lineOfCredit: pv(350_000_000, docSource({
          type: "sec-document",
          searchTerm: "Line of credit, current portion 350,000",
          url: `https://www.sec.gov/Archives/edgar/data/${MARA_CIK}/${Q3_2025_10Q_ACCESSION.replace(/-/g, "")}/mara-20250930.htm`,
          quote: "Line of credit - current portion $350,000",
          anchor: "Line of credit",
          cik: MARA_CIK,
          accession: Q3_2025_10Q_ACCESSION,
          filingType: "10-Q",
          filingDate: Q3_2025_10Q_FILED,
          documentDate: Q3_2025_PERIOD_END,
        })),
      },
    }),
    "5 convertible note tranches ($3.298B face) + $350M line of credit. Converts: Dec 2026 1% ($48M), Sep 2031 2.125% ($300M), Mar 2030 0% ($1B), Jun 2031 0% ($925M), Aug 2032 0% ($1.025B). Per 10-Q Q3 2025 Note 14."
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
      // No searchTerm for zero values
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
// Reconciled 2026-02-15 with 10-Q Q3 2025 Note 14 (5 tranches)
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

// Updated 2026-02-15 to match 10-Q Q3 2025 Note 14 (5 tranches)
export const MARA_CONVERTIBLE_NOTES: MARAConvertibleNote[] = [
  {
    id: "2026-notes",
    name: "1.0% Convertible Senior Notes due Dec 2026",
    issuanceDate: "2021-11-18",
    maturityDate: "2026-12-01",
    principalAmount: 48_077_000,    // $48M remaining (originally $747.5M, most redeemed)
    couponRate: 1.0,                // 1.0%
    conversionPrice: 76.17,         // $1,000 / 13.1277 = $76.17
    sharesIfConverted: 631_265,     // $48,077K × 13.1277 / 1000
    accession8k: "0001193125-21-334851",
    status: "outstanding",
  },
  {
    id: "2031-notes-a",
    name: "2.125% Convertible Senior Notes due Sep 2031",
    issuanceDate: "2024-08-14",
    maturityDate: "2031-09-01",
    principalAmount: 300_000_000,   // $300M
    couponRate: 2.125,              // 2.125%
    conversionPrice: 18.89,         // $1,000 / 52.9451 = $18.89
    sharesIfConverted: 15_883_530,  // $300,000K × 52.9451 / 1000
    accession8k: "0001493152-24-032433",
    status: "outstanding",
  },
  {
    id: "2030-notes",
    name: "0% Convertible Senior Notes due Mar 2030",
    issuanceDate: "2024-11-21",
    maturityDate: "2030-03-01",
    principalAmount: 1_000_000_000, // $1B
    couponRate: 0,                  // 0% (zero-coupon)
    conversionPrice: 25.91,         // $1,000 / 38.5902 = $25.91
    sharesIfConverted: 38_590_200,  // $1,000,000K × 38.5902 / 1000
    accession8k: "0001493152-24-047078",
    status: "outstanding",
  },
  {
    id: "2031-notes-b",
    name: "0% Convertible Senior Notes due Jun 2031",
    issuanceDate: "2024-12-04",
    maturityDate: "2031-06-01",
    principalAmount: 925_000_000,   // $925M
    couponRate: 0,                  // 0% (zero-coupon)
    conversionPrice: 34.58,         // $1,000 / 28.9159 = $34.58
    sharesIfConverted: 26_747_208,  // $925,000K × 28.9159 / 1000
    accession8k: "0001493152-24-048704",
    status: "outstanding",
  },
  {
    id: "2032-notes",
    name: "0% Convertible Senior Notes due Aug 2032",
    issuanceDate: "2025-07-28",
    maturityDate: "2032-08-01",
    principalAmount: 1_025_000_000, // $1.025B
    couponRate: 0,                  // 0% (zero-coupon)
    conversionPrice: 20.26,         // $1,000 / 49.3619 = $20.26
    sharesIfConverted: 50_596_048,  // $1,025,000K × 49.3619 / 1000
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
