/**
 * BTBT (Bit Digital) - Provenance-tracked data
 * 
 * ETH treasury + staking company with majority stake in WhiteFiber (WYFI) AI/HPC.
 * Formerly BTC miner, fully pivoted to Ethereum-native strategy in mid-2025.
 * One of the largest public Ethereum treasuries.
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

// SEC CIK for BTBT
export const BTBT_CIK = "1710350";

// =========================================================================
// KEY FILINGS
// =========================================================================
const Q3_2025_10Q_ACCESSION = "0001213900-25-110383";
const Q3_2025_10Q_FILED = "2025-11-14";
const Q3_2025_PERIOD_END = "2025-09-30";

const CONVERTS_8K_ACCESSION = "0001213900-25-095533";
const CONVERTS_8K_FILED = "2025-10-02";

// =========================================================================
// KEY VALUES
// =========================================================================
const LATEST_HOLDINGS = 155_227;          // Dec 31, 2025 (Jan 7, 2026 PR)
const LATEST_HOLDINGS_DATE = "2025-12-31";
const JAN_2026_HOLDINGS = 155_239;        // Jan 31, 2026 (Feb 6, 2026 PR)

const SHARES_OUTSTANDING = 323_792_059;   // Dec 31, 2025 (Jan 7, 2026 PR)
const SHARES_DATE = "2025-12-31";
const XBRL_SHARES = 323_674_831;          // Nov 10, 2025 (Q3 10-Q cover)
const XBRL_SHARES_DATE = "2025-11-10";

const TOTAL_DEBT = 150_000_000;           // $150M convertible notes (4% due 2030)
const CASH_RESERVES = 179_100_000;        // Q3 2025 earnings PR
const QUARTERLY_BURN = 8_500_000;         // From companies.ts, derived from Q1 cash flow

const STAKED_ETH = 138_263;               // Dec 31, 2025
const STAKING_PCT = 0.89;                 // 89% staked
const STAKING_APY = 0.035;                // 3.5% annualized (Dec 2025)

const WYFI_SHARES = 27_000_000;           // Approximate WYFI ownership
const WYFI_VALUE = 427_300_000;           // ~$427.3M as of Dec 31, 2025

const COST_BASIS = 3_045;                 // Average ETH acquisition price

// Helper to build full SEC document URL
const secDocUrl = (cik: string, accession: string, doc: string) =>
  `https://www.sec.gov/Archives/edgar/data/${cik}/${accession.replace(/-/g, "")}/${doc}`;

// =========================================================================
// PROVENANCE
// =========================================================================

/**
 * BTBT Financial Data with Full Provenance
 */
export const BTBT_PROVENANCE: ProvenanceFinancials = {
  
  // =========================================================================
  // ETH HOLDINGS - from monthly press releases
  // =========================================================================
  holdings: pv(LATEST_HOLDINGS, docSource({
    type: "press-release",
    searchTerm: "155,227",
    url: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/",
    quote: "As of December 31, 2025, the Company held approximately 155,227.3 ETH",
    anchor: "155,227",
    cik: BTBT_CIK,
    documentDate: LATEST_HOLDINGS_DATE,
  }), "Monthly ETH treasury press release. Includes ~15,218 ETH in externally managed fund."),

  // =========================================================================
  // COST BASIS - from monthly press release
  // =========================================================================
  costBasisAvg: pv(COST_BASIS, docSource({
    type: "press-release",
    searchTerm: "3,045",
    url: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/",
    quote: "The Company's total average ETH acquisition price for all holdings was approximately $3,045",
    anchor: "3,045",
    documentDate: LATEST_HOLDINGS_DATE,
  }), "Average acquisition price across all ETH holdings."),

  // =========================================================================
  // SHARES OUTSTANDING - from monthly press release (most recent)
  // Cross-verified with XBRL: 323,674,831 as of Nov 10, 2025 (Q3 10-Q)
  // =========================================================================
  sharesOutstanding: pv(SHARES_OUTSTANDING, docSource({
    type: "press-release",
    searchTerm: "323,792,059",
    url: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/",
    quote: "Bit Digital shares outstanding were 323,792,059 as of December 31, 2025",
    anchor: "323,792,059",
    documentDate: SHARES_DATE,
  }), "Basic shares. XBRL cross-check: 323,674,831 as of Nov 10, 2025 (Q3 10-Q)."),

  // =========================================================================
  // CASH RESERVES - from Q3 2025 earnings PR
  // =========================================================================
  cashReserves: pv(CASH_RESERVES, docSource({
    type: "press-release",
    searchTerm: "179.1 million",
    url: "https://bit-digital.com/press-releases/bit-digital-inc-announces-financial-results-for-the-third-quarter-of-fiscal-year-2025/",
    quote: "Cash and cash equivalents totaled $179.1 million as of September 30, 2025",
    anchor: "179.1 million",
    cik: BTBT_CIK,
    documentDate: Q3_2025_PERIOD_END,
  }), "Q3 2025 cash. Up from $95.2M at Dec 31, 2024."),

  // =========================================================================
  // TOTAL DEBT - $150M 4% Convertible Senior Notes due 2030
  // =========================================================================
  totalDebt: pv(TOTAL_DEBT, docSource({
    type: "press-release",
    searchTerm: "150 million",
    url: "https://bit-digital.com/press-releases/bit-digital-inc-purchases-31057-eth-with-convertible-notes-proceeds-raising-capital-at-a-premium-to-mnav/",
    quote: "recently completed $150 million convertible notes offering, which included the underwriters' full exercise of their over-allotment option",
    anchor: "150 million",
    cik: BTBT_CIK,
    accession: CONVERTS_8K_ACCESSION,
    filingType: "8-K",
    filingDate: CONVERTS_8K_FILED,
    documentDate: "2025-10-08",
  }), "$135M base + $15M overallotment = $150M. 4% coupon, due Oct 1, 2030. Conversion: $4.16/share (240.3846 shares/$1K)."),

  // =========================================================================
  // QUARTERLY BURN - from Q1 2025 10-Q cash flow
  // =========================================================================
  quarterlyBurn: pv(QUARTERLY_BURN, docSource({
    type: "sec-document",
    searchTerm: "17,401,915",
    url: `https://www.sec.gov/Archives/edgar/data/${BTBT_CIK}/000121390025044155/ea0241656-10q_bitdigital.htm`,
    quote: "NetCashUsedInOperatingActivities $17,401,915 (2025-01-01 to 2025-03-31)",
    anchor: "Operating Activities",
    cik: BTBT_CIK,
    accession: "0001213900-25-044155",
    filingType: "10-Q",
    filingDate: "2025-05-15",
    documentDate: "2025-03-31",
  }), "~$17.4M in Q1 2025 / 2 ≈ $8.5M quarterly (conservative est). Includes mining ops wind-down costs."),

  // =========================================================================
  // PREFERRED EQUITY - 1,000,000 preferred shares at $9.05M book value
  // Verified from Q3 2025 10-Q balance sheet (Feb 2026 adversarial audit)
  // =========================================================================
  preferredEquity: pv(9_050_000, docSource({
    type: "sec-document",
    searchTerm: "9,050,000",
    url: `https://www.sec.gov/Archives/edgar/data/${BTBT_CIK}/${Q3_2025_10Q_ACCESSION.replace(/-/g, "")}/ea0263546-10q_bitdigital.htm`,
    quote: "Preferred shares, $0.01 par value, 10,000,000 shares authorized, 1,000,000 shares issued and outstanding — $9,050,000",
    anchor: "Preferred shares",
    cik: BTBT_CIK,
    accession: Q3_2025_10Q_ACCESSION,
    filingType: "10-Q",
    filingDate: Q3_2025_10Q_FILED,
    documentDate: Q3_2025_PERIOD_END,
  }), "1M preferred shares at $9.05M book value. Classified in shareholders' equity. Unchanged since Dec 2024."),
};

// =========================================================================
// STAKING PROVENANCE
// =========================================================================

/** Staking data with provenance - from monthly press releases */
export const BTBT_STAKING = {
  stakedAmount: pv(STAKED_ETH, docSource({
    type: "press-release",
    searchTerm: "138,263",
    url: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/",
    quote: "The Company's total staked ETH was ~138,263, or ~89% of its total ETH holdings",
    anchor: "138,263",
    documentDate: LATEST_HOLDINGS_DATE,
  }), "Dec 31, 2025 monthly PR."),

  stakingPct: pv(STAKING_PCT, docSource({
    type: "press-release",
    searchTerm: "89%",
    url: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/",
    quote: "~89% of its total ETH holdings",
    anchor: "89%",
    documentDate: LATEST_HOLDINGS_DATE,
  })),

  annualizedYield: pv(STAKING_APY, docSource({
    type: "press-release",
    searchTerm: "3.5%",
    url: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/",
    quote: "representing an annualized yield of approximately 3.5%",
    anchor: "3.5%",
    documentDate: LATEST_HOLDINGS_DATE,
  }), "Generated 389.6 ETH in staking rewards during December 2025."),

  stakingRevenue: pv(2_900_000, docSource({
    type: "press-release",
    searchTerm: "2.9 million",
    url: "https://bit-digital.com/press-releases/bit-digital-inc-announces-financial-results-for-the-third-quarter-of-fiscal-year-2025/",
    quote: "Revenue from ETH staking was $2.9 million, a 542% increase",
    anchor: "2.9 million",
    documentDate: "2025-11-14",
  }), "Q3 2025 staking revenue. +542% YoY."),
};

// =========================================================================
// BALANCE SHEET PROVENANCE  
// =========================================================================

/** Additional balance sheet items tracked separately */
export const BTBT_BALANCE_SHEET = {
  totalAssets: pv(1_133_084_610, xbrlSource({
    fact: "us-gaap:Assets",
    searchTerm: "1,133,084,610",
    rawValue: 1_133_084_610,
    unit: "USD",
    periodType: "instant",
    periodEnd: Q3_2025_PERIOD_END,
    cik: BTBT_CIK,
    accession: Q3_2025_10Q_ACCESSION,
    filingType: "10-Q",
    filingDate: Q3_2025_10Q_FILED,
    documentAnchor: "Total Assets",
  }), "Q3 2025 10-Q XBRL."),

  totalDigitalAssets: pv(423_700_000, docSource({
    type: "press-release",
    searchTerm: "423.7 million",
    url: "https://bit-digital.com/press-releases/bit-digital-inc-announces-financial-results-for-the-third-quarter-of-fiscal-year-2025/",
    quote: "Total digital assets were $423.7 million as of September 30, 2025",
    anchor: "423.7 million",
    documentDate: Q3_2025_PERIOD_END,
  }), "Includes all crypto holdings at fair value. Up from $161.4M at Dec 31, 2024."),

  wyfiStake: pv(WYFI_VALUE, docSource({
    type: "press-release",
    searchTerm: "427.3 million",
    url: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/",
    quote: "approximately 27.0 million WhiteFiber (WYFI) shares with a market value of approximately $427.3 million",
    anchor: "427.3 million",
    documentDate: LATEST_HOLDINGS_DATE,
  }), `~27M WYFI shares (~70.7% ownership). WYFI is AI/HPC infrastructure. IPO Aug 2025.`),
};

// =========================================================================
// INCOME STATEMENT (Q3 2025)
// =========================================================================

export const BTBT_INCOME_STATEMENT = {
  totalRevenue: pv(30_500_000, docSource({
    type: "press-release",
    searchTerm: "30.5 million",
    url: "https://bit-digital.com/press-releases/bit-digital-inc-announces-financial-results-for-the-third-quarter-of-fiscal-year-2025/",
    quote: "Total revenue for the third quarter of 2025 was $30.5 million",
    anchor: "30.5 million",
    documentDate: "2025-11-14",
  }), "Q3 2025. +33% YoY."),

  netIncome: pv(146_700_000, docSource({
    type: "press-release",
    searchTerm: "146.7 million",
    url: "https://bit-digital.com/press-releases/bit-digital-inc-announces-financial-results-for-the-third-quarter-of-fiscal-year-2025/",
    quote: "Net income for the third quarter of 2025 was $146.7 million, or $0.47 per diluted share",
    anchor: "146.7 million",
    documentDate: "2025-11-14",
  }), "Includes $146M gains on digital assets."),

  revenueBreakdown: {
    mining: pv(7_400_000, docSource({
      type: "press-release",
      searchTerm: "7.4 million",
      url: "https://bit-digital.com/press-releases/bit-digital-inc-announces-financial-results-for-the-third-quarter-of-fiscal-year-2025/",
      quote: "Revenue from digital asset mining was $7.4 million",
      anchor: "7.4 million",
      documentDate: "2025-11-14",
    }), "Winding down. -27% YoY."),

    cloudServices: pv(18_000_000, docSource({
      type: "press-release",
      searchTerm: "18.0 million",
      url: "https://bit-digital.com/press-releases/bit-digital-inc-announces-financial-results-for-the-third-quarter-of-fiscal-year-2025/",
      quote: "Revenue from cloud services was $18.0 million",
      anchor: "18.0 million",
      documentDate: "2025-11-14",
    }), "WhiteFiber cloud/AI services. +48% YoY."),

    colocation: pv(1_700_000, docSource({
      type: "press-release",
      searchTerm: "1.7 million",
      url: "https://bit-digital.com/press-releases/bit-digital-inc-announces-financial-results-for-the-third-quarter-of-fiscal-year-2025/",
      quote: "Revenue from colocation services was $1.7 million",
      anchor: "1.7 million",
      documentDate: "2025-11-14",
    }), "New segment launched Q4 2024."),

    staking: pv(2_900_000, docSource({
      type: "press-release",
      searchTerm: "2.9 million",
      url: "https://bit-digital.com/press-releases/bit-digital-inc-announces-financial-results-for-the-third-quarter-of-fiscal-year-2025/",
      quote: "Revenue from ETH staking was $2.9 million, a 542% increase",
      anchor: "2.9 million",
      documentDate: "2025-11-14",
    }), "+542% YoY."),
  },
};

// =========================================================================
// CONVERTIBLE NOTES DETAIL
// =========================================================================

export const BTBT_CONVERTIBLE = {
  faceValue: pv(150_000_000, docSource({
    type: "press-release",
    searchTerm: "150 million",
    url: "https://bit-digital.com/press-releases/bit-digital-inc-purchases-31057-eth-with-convertible-notes-proceeds-raising-capital-at-a-premium-to-mnav/",
    quote: "$150 million convertible notes offering, which included the underwriters' full exercise of their over-allotment option",
    anchor: "150 million",
    documentDate: "2025-10-08",
  }), "$135M upsized offering + $15M overallotment fully exercised."),

  coupon: 0.04, // 4.00%
  maturityDate: "2030-10-01",
  conversionPrice: 4.16, // $4.16/share
  conversionRate: 240.3846, // shares per $1,000 principal
  potentialShares: 36_057_692, // 240.3846 × 150,000

  underwriters: "Barclays, Cantor, B. Riley Securities",
  notableInvestors: "Kraken Financial, Jump Trading Credit, Jane Street Capital",
  putDate: "2028-10-01", // Approximate investor put date

  ethPurchased: pv(31_057, docSource({
    type: "press-release",
    searchTerm: "31,057",
    url: "https://bit-digital.com/press-releases/bit-digital-inc-purchases-31057-eth-with-convertible-notes-proceeds-raising-capital-at-a-premium-to-mnav/",
    quote: "purchased approximately 31,057 Ethereum using the net proceeds",
    anchor: "31,057",
    documentDate: "2025-10-08",
  }), "Deployed full convert proceeds into ETH in early Oct 2025."),
};
