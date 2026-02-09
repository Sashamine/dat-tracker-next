/**
 * BMNR (Bitmine Immersion) - Provenance-tracked data
 * 
 * World's largest ETH treasury company.
 * Simpler structure than MSTR: no debt, no preferred equity.
 * 
 * Every value traces back to an authoritative source.
 * Click any number → see source → verify at source.
 */

import { 
  ProvenanceFinancials, 
  pv, 
  xbrlSource, 
  docSource, 
  derivedSource 
} from "../types/provenance";

// SEC CIK for BMNR
export const BMNR_CIK = "1829311";

// Latest data points (updated manually from 8-K filings)
const LATEST_HOLDINGS = 4_285_125;
const LATEST_HOLDINGS_DATE = "2026-02-01";
const LATEST_HOLDINGS_ACCESSION = "0001493152-26-004658";

const LATEST_STAKED = 2_897_459;
const STAKING_PCT = 0.676; // 67.6%

const SHARES_OUTSTANDING = 454_862_451;
const SHARES_DATE = "2026-01-12";
const SHARES_ACCESSION = "0001493152-26-002084";

// Q1 FY2026 10-Q data (filed Jan 13, 2026, as of Nov 30, 2025)
const Q1_FY2026_10Q = "0001493152-26-002084";
const Q1_FY2026_FILED = "2026-01-13";
const Q1_FY2026_PERIOD_END = "2025-11-30";

/**
 * BMNR Financial Data with Full Provenance
 */
export const BMNR_PROVENANCE: ProvenanceFinancials = {
  
  // =========================================================================
  // ETH HOLDINGS - from SEC 8-K filings (weekly updates)
  // =========================================================================
  holdings: pv(LATEST_HOLDINGS, docSource({
    type: "sec-document",
    url: `https://www.sec.gov/Archives/edgar/data/${BMNR_CIK}/${LATEST_HOLDINGS_ACCESSION.replace(/-/g, "")}/ex99-1.htm`,
    quote: `${LATEST_HOLDINGS.toLocaleString()} ETH`,
    anchor: "Total ETH Holdings",
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-02-02",
    documentDate: LATEST_HOLDINGS_DATE,
  }), "Weekly 8-K updates. Acquired 41,788 ETH in week ending Feb 1."),

  // =========================================================================
  // COST BASIS - from Q1 FY2026 10-Q
  // =========================================================================
  costBasisAvg: pv(4_002, derivedSource({
    derivation: "Total ETH cost / Total ETH holdings",
    formula: "$14,953,824,000 / 3,737,140 ETH = $4,002/ETH",
    inputs: {
      totalCost: pv(14_953_824_000, xbrlSource({
        fact: "us-gaap:CryptoAssetHoldingsAtCost",
        rawValue: 14_953_824_000,
        unit: "USD",
        periodType: "instant",
        periodEnd: Q1_FY2026_PERIOD_END,
        cik: BMNR_CIK,
        accession: Q1_FY2026_10Q,
        filingType: "10-Q",
        filingDate: Q1_FY2026_FILED,
      })),
      totalHoldings: pv(3_737_140, xbrlSource({
        fact: "us-gaap:CryptoAssetNumberOfUnits",
        rawValue: 3_737_140,
        unit: "pure",
        periodType: "instant",
        periodEnd: Q1_FY2026_PERIOD_END,
        cik: BMNR_CIK,
        accession: Q1_FY2026_10Q,
        filingType: "10-Q",
        filingDate: Q1_FY2026_FILED,
      })),
    },
  }), "Cost basis as of Nov 30, 2025 (Q1 FY2026 10-Q). Subsequent purchases may have different basis."),

  // =========================================================================
  // SHARES OUTSTANDING - from 10-Q cover page
  // =========================================================================
  sharesOutstanding: pv(SHARES_OUTSTANDING, xbrlSource({
    fact: "dei:EntityCommonStockSharesOutstanding",
    rawValue: SHARES_OUTSTANDING,
    unit: "shares",
    periodType: "instant",
    periodEnd: SHARES_DATE,
    cik: BMNR_CIK,
    accession: SHARES_ACCESSION,
    filingType: "10-Q",
    filingDate: Q1_FY2026_FILED,
  }), "Basic shares. Add ~4.4M dilutive shares (warrants + RSUs) for fully diluted."),

  // =========================================================================
  // STAKING - tracked separately (not in ProvenanceFinancials type)
  // From Feb 2, 2026 8-K: 2,897,459 ETH staked (67.6%)
  // Annualized staking revenue ~$188M
  // =========================================================================

  // =========================================================================
  // CASH RESERVES - from Feb 2, 2026 8-K
  // =========================================================================
  cashReserves: pv(586_000_000, docSource({
    type: "sec-document",
    url: `https://www.sec.gov/Archives/edgar/data/${BMNR_CIK}/${LATEST_HOLDINGS_ACCESSION.replace(/-/g, "")}/ex99-1.htm`,
    quote: "$586 million in cash",
    anchor: "Cash Position",
    cik: BMNR_CIK,
    accession: LATEST_HOLDINGS_ACCESSION,
    filingType: "8-K",
    filingDate: "2026-02-02",
    documentDate: LATEST_HOLDINGS_DATE,
  }), "Operating capital. Treated as restricted (not excess cash for mNAV)."),

  // =========================================================================
  // QUARTERLY BURN - estimated from Q1 FY2025 baseline
  // =========================================================================
  quarterlyBurn: pv(1_000_000, derivedSource({
    derivation: "Based on pre-pivot G&A baseline, annualized",
    formula: "Q1 FY2025 baseline G&A (~$959K/qtr), rounded to $1M",
    inputs: {
      q1Fy2025Ga: pv(959_000, docSource({
        type: "sec-document",
        url: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225015441/",
        quote: "G&A ~$959K",
        anchor: "General and Administrative",
        cik: BMNR_CIK,
        filingType: "10-Q",
        filingDate: "2025-01-14",
        documentDate: "2024-11-30",
      })),
    },
  }), "Estimated. Q1 FY2026 G&A of $223M was mostly one-time capital raising costs."),

  // =========================================================================
  // DEBT - None (equity-funded)
  // =========================================================================
  totalDebt: pv(0, xbrlSource({
    fact: "us-gaap:LongTermDebt",
    rawValue: 0,
    unit: "USD",
    periodType: "instant",
    periodEnd: Q1_FY2026_PERIOD_END,
    cik: BMNR_CIK,
    accession: Q1_FY2026_10Q,
    filingType: "10-Q",
    filingDate: Q1_FY2026_FILED,
  }), "No debt financing. All ETH purchases funded via equity (ATM + PIPE)."),

  // =========================================================================
  // PREFERRED EQUITY - None
  // =========================================================================
  preferredEquity: pv(0, xbrlSource({
    fact: "us-gaap:PreferredStockValue",
    rawValue: 0,
    unit: "USD",
    periodType: "instant",
    periodEnd: Q1_FY2026_PERIOD_END,
    cik: BMNR_CIK,
    accession: Q1_FY2026_10Q,
    filingType: "10-Q",
    filingDate: Q1_FY2026_FILED,
  }), "No preferred equity issued."),

  // =========================================================================
  // OTHER INVESTMENTS - tracked in companies.ts, not in ProvenanceFinancials
  // $200M Beast Industries + $19M Eightco Holdings (OCTO) = $219M
  // Excluded from mNAV (not crypto-correlated equity investments)
  // =========================================================================
};

// =========================================================================
// DEBUG / STATS
// =========================================================================

export const BMNR_PROVENANCE_DEBUG = {
  holdingsDate: LATEST_HOLDINGS_DATE,
  sharesDate: SHARES_DATE,
  balanceSheetDate: Q1_FY2026_PERIOD_END,
  lastFilingChecked: "2026-02-02",
  notes: "BMNR is simpler than MSTR: no debt, no preferred, single share class.",
};

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

/**
 * Get current BMNR provenance values for use in companies.ts
 */
export function getBMNRProvenance() {
  return {
    holdings: BMNR_PROVENANCE.holdings?.value,
    holdingsDate: LATEST_HOLDINGS_DATE,
    shares: SHARES_OUTSTANDING,
    sharesDate: SHARES_DATE,
    costBasisAvg: BMNR_PROVENANCE.costBasisAvg?.value,
    cashReserves: BMNR_PROVENANCE.cashReserves?.value,
    totalDebt: BMNR_PROVENANCE.totalDebt?.value,
    preferredEquity: BMNR_PROVENANCE.preferredEquity?.value,
    stakingAmount: LATEST_STAKED,
    stakingPct: STAKING_PCT,
  };
}
