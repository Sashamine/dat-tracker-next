/**
 * MSTR Capital Events - 8-K Filings with SEC Provenance
 * ======================================================
 *
 * This file tracks capital events from 8-K filings:
 * - BTC purchases (weekly "BTC Update" filings)
 * - Debt issuances (convertible notes, secured notes)
 * - Preferred equity issuances (STRF, STRC, STRK, STRD, STRE)
 * - ATM program events (at-the-market offerings)
 * - Corporate events (stock split, name change)
 *
 * Why track 8-Ks separately from 10-Q/10-K?
 * - 8-Ks capture inter-quarter activity for accurate point-in-time mNAV
 * - 10-Q/10-K provide quarterly snapshots with XBRL precision
 * - Together, they enable full historical reconstruction
 *
 * Data quality note:
 * - 8-Ks do NOT have XBRL (machine-readable data)
 * - Values extracted from text require careful verification
 * - Cross-check against quarterly totals in mstr-sec-history.ts
 *
 * Coverage: Aug 2020 (first BTC) through present
 *
 * =============================================================================
 * TODO: PENDING EVENTS (contractually due, awaiting SEC filing for verification)
 * =============================================================================
 *
 * 1. Dec 2025 Notes Conversion (matured Dec 15, 2025)
 *    - $650M @ 0.75% convertible notes matured
 *    - Conversion price: ~$39.80/share (post-split)
 *    - Expected: Full conversion to ~16.3M shares (MSTR was >$300)
 *    - Source: Original indenture (0001193125-20-315971)
 *    - Verify with: Q4 2025 10-Q (expected ~Feb 2026)
 *    - Impact: Reduces convertible debt from ~$7.2B to ~$6.6B
 *
 * Future maturities to track:
 * - Feb 2027: $1.05B @ 0% Notes due
 * - Sep 2028: $1.01B @ 0.625% Notes due
 * - Jun 2028: $500M @ 0% Notes due
 * - Dec 2029: $3B @ 0% Notes due
 * - Mar 2030: $800M @ 0.625% Notes due
 * - Mar 2030: $2B @ 0% Notes due (2030B)
 * - Mar 2031: $603.75M @ 0.875% Notes due
 * - Jun 2032: $800M @ 2.25% Notes due
 */

export type CapitalEventType =
  | "BTC" // Bitcoin purchase
  | "DEBT" // Debt issuance (convertible notes, secured notes)
  | "PREF" // Perpetual preferred stock issuance
  | "ATM" // At-the-market program announcement
  | "DEBT_EVENT" // Debt redemption, conversion, amendment
  | "CORP"; // Corporate event (split, name change)

export interface CapitalEvent {
  // Filing metadata
  date: string; // YYYY-MM-DD (date of event, not filing date)
  filedDate: string; // YYYY-MM-DD
  accessionNumber: string;
  secUrl: string;
  type: CapitalEventType;

  // Enhanced citation for audit trail (enables direct navigation)
  item?: string; // SEC Item number (e.g., "8.01", "1.01", "3.03")
  section?: string; // Named section within Item (e.g., "BTC Update", "ATM Update")

  // Event details (type-specific)
  description: string;

  // BTC events
  btcAcquired?: number;
  btcPurchasePrice?: number; // Aggregate price in USD
  btcAvgPrice?: number; // Per-BTC average
  btcCumulative?: number; // Running total after this event

  // Debt events
  debtPrincipal?: number; // Face value
  debtCoupon?: number; // Interest rate (e.g., 0.75 = 0.75%)
  debtMaturity?: string; // YYYY-MM-DD
  debtType?: "convertible" | "secured" | "term";
  conversionPrice?: number; // Post-split conversion price per share (for convertibles)

  // Preferred events
  prefTicker?: string; // STRF, STRC, STRK, STRD, STRE
  prefShares?: number;
  prefGrossProceeds?: number;
  prefDividendRate?: number; // Annual rate (e.g., 10.0 = 10%)

  // ATM program announcements
  atmCapacity?: number; // Total program capacity in USD
  atmSecurities?: string[]; // Which securities covered

  // ATM sales (from weekly 8-K filings, disclosed alongside BTC updates)
  atmMstrShares?: number; // Class A common shares sold
  atmMstrProceeds?: number; // Net proceeds from Class A sales ($)
  atmPrefSales?: {
    // Preferred stock sales by ticker
    ticker: string; // STRK, STRF, STRD, STRC, STRE
    shares: number;
    proceeds: number;
  }[];
  atmTotalProceeds?: number; // Total ATM net proceeds ($)

  // Corporate events
  splitRatio?: string; // e.g., "10:1"
  newName?: string;

  // Notes
  notes?: string;
}

/**
 * Key capital events extracted from 8-K filings
 * Ordered chronologically from oldest to newest
 */
export const MSTR_CAPITAL_EVENTS: CapitalEvent[] = [
  // ==================== 2020 - Bitcoin Treasury Begins ====================
  {
    date: "2020-08-11",
    filedDate: "2020-08-11",
    accessionNumber: "0001193125-20-215604",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312520215604/0001193125-20-215604-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Investment",
    description: "First BTC purchase - 21,454 BTC for $250M",
    btcAcquired: 21454,
    btcPurchasePrice: 250_000_000,
    btcAvgPrice: 11652,
    btcCumulative: 21454,
    notes:
      "Historic first purchase establishing Bitcoin treasury strategy. Board approved up to $250M.",
  },
  {
    date: "2020-09-14",
    filedDate: "2020-09-15",
    accessionNumber: "0001193125-20-245835",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312520245835/0001193125-20-245835-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Investment",
    description: "Additional BTC purchase - 16,796 BTC for $175M",
    btcAcquired: 16796,
    btcPurchasePrice: 175_000_000,
    btcAvgPrice: 10419,
    btcCumulative: 38250,
    notes: "SEC verified. Second major purchase, bringing total to 38,250 BTC",
  },
  {
    date: "2020-12-04",
    filedDate: "2020-12-04",
    accessionNumber: "0001193125-20-310787",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312520310787/0001193125-20-310787-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "Additional BTC purchase - 2,574 BTC for $50M",
    btcAcquired: 2574,
    btcPurchasePrice: 50_000_000,
    btcAvgPrice: 19427,
    btcCumulative: 40824,
    notes: "SEC verified. Filing includes cumulative holdings of 40,824 BTC.",
  },
  {
    date: "2020-12-11",
    filedDate: "2020-12-11",
    accessionNumber: "0001193125-20-315971",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312520315971/d225117dex41.htm",
    type: "DEBT",
    item: "1.01",
    section: "Entry into a Material Definitive Agreement",
    description: "First convertible note - $650M @ 0.75% due Dec 2025",
    debtPrincipal: 650_000_000,
    debtCoupon: 0.75,
    debtMaturity: "2025-12-15",
    debtType: "convertible",
    conversionPrice: 39.8, // $398 pre-split / 10
    notes:
      "First debt financing for BTC acquisition. Conversion price ~$398 (pre-split)",
  },
  {
    date: "2020-12-21",
    filedDate: "2020-12-21",
    accessionNumber: "0001193125-20-323284",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312520323284/0001193125-20-323284-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Purchase",
    description: "BTC purchase with convertible proceeds - 29,646 BTC for $650M",
    btcAcquired: 29646,
    btcPurchasePrice: 650_000_000,
    btcAvgPrice: 21925,
    btcCumulative: 70470,
    notes: "Deployed full convertible note proceeds into BTC",
  },

  // ==================== 2021 - Continued Accumulation ====================
  // Note: All 2021 purchases verified against SEC 8-K filings.
  {
    date: "2021-01-22",
    filedDate: "2021-01-22",
    accessionNumber: "0001193125-21-014227",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521014227/0001193125-21-014227-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 314 BTC for ~$10M",
    btcAcquired: 314,
    btcPurchasePrice: 10_000_000,
    btcAvgPrice: 31808,
    btcCumulative: 70784,
    notes: "SEC verified. First purchase of 2021.",
  },
  {
    date: "2021-02-02",
    filedDate: "2021-02-02",
    accessionNumber: "0001193125-21-025369",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521025369/0001193125-21-025369-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 295 BTC for ~$10M",
    btcAcquired: 295,
    btcPurchasePrice: 10_000_000,
    btcAvgPrice: 33810,
    btcCumulative: 71079,
    notes: "SEC verified.",
  },
  {
    date: "2021-02-19",
    filedDate: "2021-02-19",
    accessionNumber: "0001193125-21-048555",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521048555/d130600dex41.htm",
    type: "DEBT",
    item: "1.01",
    section: "Entry into a Material Definitive Agreement",
    description: "Second convertible note - $1.05B @ 0% due Feb 2027",
    debtPrincipal: 1_050_000_000,
    debtCoupon: 0,
    debtMaturity: "2027-02-15",
    debtType: "convertible",
    conversionPrice: 143.25, // $1,432.46 pre-split / 10
    notes: "Zero-coupon convertible issued at premium to fund BTC purchases",
  },
  {
    date: "2021-02-24",
    filedDate: "2021-02-24",
    accessionNumber: "0001193125-21-057643",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521057643/0001193125-21-057643-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Purchase",
    description: "BTC purchase with convertible proceeds - 19,452 BTC for $1.026B",
    btcAcquired: 19452,
    btcPurchasePrice: 1_026_000_000,
    btcAvgPrice: 52765,
    btcCumulative: 90531,
    notes: "Deployed ~$1B from Feb 2027 convertible. Major accumulation.",
  },
  {
    date: "2021-03-01",
    filedDate: "2021-03-01",
    accessionNumber: "0001193125-21-062322",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521062322/0001193125-21-062322-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 328 BTC for ~$15M",
    btcAcquired: 328,
    btcPurchasePrice: 15_000_000,
    btcAvgPrice: 45710,
    btcCumulative: 90859,
    notes: "SEC verified.",
  },
  {
    date: "2021-03-05",
    filedDate: "2021-03-05",
    accessionNumber: "0001193125-21-070446",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521070446/0001193125-21-070446-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 205 BTC for ~$10M",
    btcAcquired: 205,
    btcPurchasePrice: 10_000_000,
    btcAvgPrice: 48888,
    btcCumulative: 91064,
    notes: "SEC verified.",
  },
  {
    date: "2021-03-12",
    filedDate: "2021-03-12",
    accessionNumber: "0001193125-21-078715",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521078715/0001193125-21-078715-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 262 BTC for ~$15M",
    btcAcquired: 262,
    btcPurchasePrice: 15_000_000,
    btcAvgPrice: 57146,
    btcCumulative: 91326,
    notes: "SEC verified. End Q1 2021 holdings: 91,326 BTC",
  },
  {
    date: "2021-04-05",
    filedDate: "2021-04-05",
    accessionNumber: "0001193125-21-105625",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521105625/0001193125-21-105625-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 253 BTC for ~$15M",
    btcAcquired: 253,
    btcPurchasePrice: 15_000_000,
    btcAvgPrice: 59339,
    btcCumulative: 91579,
    notes: "SEC verified.",
  },
  {
    date: "2021-05-13",
    filedDate: "2021-05-13",
    accessionNumber: "0001193125-21-159855",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521159855/0001193125-21-159855-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 271 BTC for ~$15M",
    btcAcquired: 271,
    btcPurchasePrice: 15_000_000,
    btcAvgPrice: 55387,
    btcCumulative: 91850,
    notes: "SEC verified.",
  },
  {
    date: "2021-05-18",
    filedDate: "2021-05-18",
    accessionNumber: "0001193125-21-164617",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521164617/0001193125-21-164617-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 229 BTC for ~$10M",
    btcAcquired: 229,
    btcPurchasePrice: 10_000_000,
    btcAvgPrice: 43663,
    btcCumulative: 92079,
    notes: "SEC verified.",
  },
  {
    date: "2021-06-14",
    filedDate: "2021-06-14",
    accessionNumber: "0001193125-21-189600",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521189600/d148411dex41.htm",
    type: "DEBT",
    item: "1.01",
    section: "Term Loan Agreement",
    description: "Secured term loan - $500M @ SOFR+5.75% due Jun 2028",
    debtPrincipal: 500_000_000,
    debtCoupon: 5.75, // Spread over SOFR
    debtMaturity: "2028-06-14",
    debtType: "secured",
    notes: "Secured by BTC collateral (~26,500 BTC)",
  },
  {
    date: "2021-06-21",
    filedDate: "2021-06-21",
    accessionNumber: "0001193125-21-195413",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521195413/0001193125-21-195413-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Purchase",
    description: "BTC purchase with term loan proceeds - 13,005 BTC for $489M",
    btcAcquired: 13005,
    btcPurchasePrice: 489_000_000,
    btcAvgPrice: 37617,
    btcCumulative: 105084,
    notes: "Deployed secured term loan proceeds. End Q2 2021: 105,084 BTC",
  },
  {
    date: "2021-08-24",
    filedDate: "2021-08-24",
    accessionNumber: "0001193125-21-254529",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521254529/0001193125-21-254529-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 3,907 BTC for $177M",
    btcAcquired: 3907,
    btcPurchasePrice: 177_000_000,
    btcAvgPrice: 45294,
    btcCumulative: 108992,
    notes: "SEC verified. Aug 2 - Aug 23 period.",
  },
  {
    date: "2021-09-13",
    filedDate: "2021-09-13",
    accessionNumber: "0001193125-21-270915",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521270915/0001193125-21-270915-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 5,050 BTC for $242.9M",
    btcAcquired: 5050,
    btcPurchasePrice: 242_900_000,
    btcAvgPrice: 48099,
    btcCumulative: 114042,
    notes: "SEC verified. End Q3 2021: 114,042 BTC",
  },
  {
    date: "2021-11-29",
    filedDate: "2021-11-29",
    accessionNumber: "0001193125-21-341815",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521341815/0001193125-21-341815-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 7,002 BTC for $414.4M",
    btcAcquired: 7002,
    btcPurchasePrice: 414_400_000,
    btcAvgPrice: 59187,
    btcCumulative: 121044,
    notes: "SEC verified.",
  },
  {
    date: "2021-12-09",
    filedDate: "2021-12-09",
    accessionNumber: "0001193125-21-352140",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521352140/0001193125-21-352140-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 1,434 BTC for $82.4M",
    btcAcquired: 1434,
    btcPurchasePrice: 82_400_000,
    btcAvgPrice: 57477,
    btcCumulative: 122478,
    notes: "SEC verified.",
  },
  {
    date: "2021-12-30",
    filedDate: "2021-12-30",
    accessionNumber: "0001193125-21-369767",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521369767/0001193125-21-369767-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 1,914 BTC for $94.2M",
    btcAcquired: 1914,
    btcPurchasePrice: 94_200_000,
    btcAvgPrice: 49229,
    btcCumulative: 124391,
    notes: "SEC verified. End of 2021: 124,391 BTC total.",
  },

  // ==================== 2022 - Bear Market Accumulation ====================
  {
    date: "2022-01-31",
    filedDate: "2022-02-01",
    accessionNumber: "0001193125-22-024027",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312522024027/0001193125-22-024027-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 660 BTC for $25M",
    btcAcquired: 660,
    btcPurchasePrice: 25_000_000,
    btcAvgPrice: 37865,
    btcCumulative: 125051,
    notes: "SEC verified. Dec 30, 2021 - Jan 31, 2022 period.",
  },
  {
    date: "2022-03-23",
    filedDate: "2022-03-29",
    accessionNumber: "0001193125-22-087494",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312522087494/d312252dex41.htm",
    type: "DEBT",
    item: "1.01",
    section: "Credit and Security Agreement",
    description: "Silvergate term loan - $205M @ SOFR+3.70%, floor 3.75%",
    debtPrincipal: 205_000_000,
    debtCoupon: 3.75,
    debtMaturity: "2025-03-23",
    debtType: "term",
    notes: "SEC verified. Collateralized by ~34,619 BTC (~$820M at closing).",
  },
  {
    date: "2022-04-04",
    filedDate: "2022-04-05",
    accessionNumber: "0001193125-22-095632",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312522095632/0001193125-22-095632-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 4,167 BTC for $190.5M",
    btcAcquired: 4167,
    btcPurchasePrice: 190_500_000,
    btcAvgPrice: 45714,
    btcCumulative: 129218,
    notes: "SEC verified. Feb 15 - Apr 4 period. MacroStrategy holds 115,110 BTC.",
  },
  {
    date: "2022-06-28",
    filedDate: "2022-06-29",
    accessionNumber: "0001193125-22-184423",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312522184423/0001193125-22-184423-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 480 BTC for $10M",
    btcAcquired: 480,
    btcPurchasePrice: 10_000_000,
    btcAvgPrice: 20817,
    btcCumulative: 129699,
    notes: "SEC verified. May 3 - Jun 28 period. Bear market buying.",
  },
  {
    date: "2022-09-09",
    filedDate: "2022-09-09",
    accessionNumber: "0001193125-22-242015",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312522242015/0001193125-22-242015-index.htm",
    type: "ATM",
    item: "1.01",
    section: "Sales Agreement",
    description: "$500M ATM program with Cowen and BTIG",
    atmCapacity: 500_000_000,
    atmSecurities: ["MSTR"],
    notes: "SEC verified. First ATM program.",
  },
  {
    date: "2022-09-19",
    filedDate: "2022-09-20",
    accessionNumber: "0001193125-22-247427",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312522247427/0001193125-22-247427-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 301 BTC for $6M",
    btcAcquired: 301,
    btcPurchasePrice: 6_000_000,
    btcAvgPrice: 19851,
    btcCumulative: 130000,
    notes: "SEC verified. Aug 2 - Sep 19 period. End Q3 2022: 130,000 BTC",
  },
  {
    date: "2022-12-27",
    filedDate: "2022-12-28",
    accessionNumber: "0001193125-22-313098",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312522313098/0001193125-22-313098-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "Net BTC acquisition +2,500 (acquired 3,205, sold 704 for tax loss, rebought 810)",
    btcAcquired: 2500, // Net: +2,395 (Nov1-Dec21) - 704 (Dec22 sale) + 810 (Dec24 rebuy)
    btcPurchasePrice: 50_000_000, // Approximate net spend
    btcAvgPrice: 16800, // Approximate weighted average
    btcCumulative: 132500,
    notes: "SEC verified. Complex event: sold 704 BTC on Dec 22 at $16,776 (tax loss), bought 810 on Dec 24 at $16,845. Year-end 2022: 132,500 BTC",
  },

  // ==================== 2023 - Recovery Year ====================
  {
    date: "2023-03-24",
    filedDate: "2023-03-27",
    accessionNumber: "0001193125-23-079839",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312523079839/0001193125-23-079839-index.htm",
    type: "DEBT_EVENT",
    item: "1.02",
    section: "Termination of a Material Definitive Agreement",
    description: "Silvergate loan voluntary prepayment - $161M payoff",
    debtPrincipal: -205_000_000, // Negative = debt reduction
    notes: "SEC verified. Prepaid full $205M principal with ~$161M (discount due to early payoff). Released 34,619 BTC collateral. Funded by ATM proceeds.",
  },
  {
    date: "2023-03-23",
    filedDate: "2023-03-27",
    accessionNumber: "0001193125-23-079839",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312523079839/0001193125-23-079839-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Activity",
    description: "BTC purchase - 6,455 BTC for $150M",
    btcAcquired: 6455,
    btcPurchasePrice: 150_000_000,
    btcAvgPrice: 23238,
    btcCumulative: 138955,
    notes: "SEC verified. Feb 16 - Mar 23 period. Funded via ATM equity sales.",
  },
  {
    date: "2023-04-04",
    filedDate: "2023-04-05",
    accessionNumber: "0001193125-23-091616",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312523091616/0001193125-23-091616-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 1,045 BTC for $29.3M",
    btcAcquired: 1045,
    btcPurchasePrice: 29_300_000,
    btcAvgPrice: 28016,
    btcCumulative: 140000,
    notes: "SEC verified. Mar 24 - Apr 4 period.",
  },
  {
    date: "2023-05-01",
    filedDate: "2023-05-01",
    accessionNumber: "0001193125-23-130703",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312523130703/0001193125-23-130703-index.htm",
    type: "ATM",
    item: "1.01",
    section: "Sales Agreement",
    description: "$625M ATM program with Cowen and Canaccord",
    atmCapacity: 625_000_000,
    atmSecurities: ["MSTR"],
    notes: "SEC verified. Replaced $500M ATM (sold $385.2M before termination).",
  },
  {
    date: "2023-06-27",
    filedDate: "2023-06-28",
    accessionNumber: "0001193125-23-176793",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312523176793/0001193125-23-176793-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 12,333 BTC for $347M",
    btcAcquired: 12333,
    btcPurchasePrice: 347_000_000,
    btcAvgPrice: 28136,
    btcCumulative: 152333,
    notes: "SEC verified. Apr 29 - Jun 27 period. Major Q2 2023 purchase.",
  },
  {
    date: "2023-08-01",
    filedDate: "2023-08-01",
    accessionNumber: "0001193125-23-200633",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312523200633/0001193125-23-200633-index.htm",
    type: "ATM",
    item: "1.01",
    section: "Sales Agreement",
    description: "$750M ATM program with Cowen, Canaccord, Berenberg",
    atmCapacity: 750_000_000,
    atmSecurities: ["MSTR"],
    notes: "SEC verified. Replaced $625M ATM (sold $333.5M before termination).",
  },
  {
    date: "2023-09-24",
    filedDate: "2023-09-25",
    accessionNumber: "0001193125-23-240932",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312523240932/0001193125-23-240932-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Other Events",
    description: "BTC purchase - 5,445 BTC for $147.3M",
    btcAcquired: 5445,
    btcPurchasePrice: 147_300_000,
    btcAvgPrice: 27053,
    btcCumulative: 158245,
    notes: "SEC verified. Aug 1 - Sep 24 period.",
  },
  {
    date: "2023-11-29",
    filedDate: "2023-11-30",
    accessionNumber: "0001193125-23-285756",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312523285756/0001193125-23-285756-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Activity Update",
    description: "BTC purchase - 16,130 BTC for $593.3M",
    btcAcquired: 16130,
    btcPurchasePrice: 593_300_000,
    btcAvgPrice: 36785,
    btcCumulative: 174530,
    notes: "SEC verified. Nov 1 - Nov 29 period. Also announced new $750M ATM.",
  },
  {
    date: "2023-12-26",
    filedDate: "2023-12-27",
    accessionNumber: "0001193125-23-303488",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312523303488/0001193125-23-303488-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Activity Update",
    description: "BTC purchase - 14,620 BTC for $615.7M",
    btcAcquired: 14620,
    btcPurchasePrice: 615_700_000,
    btcAvgPrice: 42110,
    btcCumulative: 189150,
    notes: "SEC verified. Nov 30 - Dec 26 period. End of 2023: 189,150 BTC.",
  },

  // ==================== 2024 - Major Expansion ====================
  // Q1 2024 - BTC purchases funded by ATM and convertibles
  {
    date: "2024-02-26",
    filedDate: "2024-02-26",
    accessionNumber: "0001193125-24-045396",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524045396/0001193125-24-045396-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 3,000 BTC for $155.4M",
    btcAcquired: 3000,
    btcPurchasePrice: 155_400_000,
    btcAvgPrice: 51813,
    btcCumulative: 193000,
    notes: "SEC verified. Feb 15-25 period. First 2024 purchase.",
  },
  {
    date: "2024-03-11",
    filedDate: "2024-03-11",
    accessionNumber: "0001193125-24-064321",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524064321/d749312dex41.htm",
    type: "DEBT",
    item: "1.01",
    section: "Indenture",
    description: "Convertible note - $800M @ 0.625% due Mar 2030",
    debtPrincipal: 800_000_000,
    debtCoupon: 0.625,
    debtMaturity: "2030-03-15",
    debtType: "convertible",
    conversionPrice: 118.0, // $1,180 pre-split / 10
    notes: "First convertible of 2024",
  },
  {
    date: "2024-03-11",
    filedDate: "2024-03-11",
    accessionNumber: "0001193125-24-064331",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524064331/0001193125-24-064331-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 12,000 BTC for $821.7M",
    btcAcquired: 12000,
    btcPurchasePrice: 821_700_000,
    btcAvgPrice: 68477,
    btcCumulative: 205000,
    notes: "SEC verified. Feb 26 - Mar 10 period. Funded by $800M convertible.",
  },
  {
    date: "2024-03-19",
    filedDate: "2024-03-19",
    accessionNumber: "0001193125-24-070793",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524070793/d792323dex41.htm",
    type: "DEBT",
    item: "1.01",
    section: "Indenture",
    description: "Convertible note - $603.75M @ 0.875% due Mar 2031",
    debtPrincipal: 603_750_000,
    debtCoupon: 0.875,
    debtMaturity: "2031-03-15",
    debtType: "convertible",
    conversionPrice: 125.0, // $1,250 pre-split / 10
    notes: "Second convertible of Q1 2024",
  },
  {
    date: "2024-03-19",
    filedDate: "2024-03-19",
    accessionNumber: "0001193125-24-070801",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524070801/0001193125-24-070801-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 9,245 BTC for $623M",
    btcAcquired: 9245,
    btcPurchasePrice: 623_000_000,
    btcAvgPrice: 67382,
    btcCumulative: 214246,
    notes: "SEC verified. Mar 11-18 period. Funded by $603.75M convertible.",
  },
  // Q2 2024
  {
    date: "2024-06-20",
    filedDate: "2024-06-20",
    accessionNumber: "0001193125-24-164009",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524164009/d857957dex41.htm",
    type: "DEBT",
    item: "1.01",
    section: "Indenture",
    description: "Convertible note - $800M @ 2.25% due Jun 2032",
    debtPrincipal: 800_000_000,
    debtCoupon: 2.25,
    debtMaturity: "2032-06-15",
    debtType: "convertible",
    conversionPrice: 135.0, // $1,350 pre-split / 10
    notes: "Third convertible of 2024",
  },
  {
    date: "2024-06-20",
    filedDate: "2024-06-20",
    accessionNumber: "0001193125-24-164014",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524164014/0001193125-24-164014-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 11,931 BTC for $786M",
    btcAcquired: 11931,
    btcPurchasePrice: 786_000_000,
    btcAvgPrice: 65883,
    btcCumulative: 226331,
    notes: "SEC verified. Apr 27 - Jun 19 period. Funded by $800M Jun convertible.",
  },
  // Q3 2024 - Stock split and post-split purchases
  {
    date: "2024-07-11",
    filedDate: "2024-07-11",
    accessionNumber: "0001193125-24-177515",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524177515/0001193125-24-177515-index.htm",
    type: "CORP",
    item: "5.03",
    section: "Amendment to Charter",
    description: "10:1 stock split announced",
    splitRatio: "10:1",
    notes:
      "Effective Aug 7, 2024. All pre-Aug 2024 share counts need 10x adjustment.",
  },
  {
    date: "2024-09-13",
    filedDate: "2024-09-13",
    accessionNumber: "0001193125-24-218462",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524218462/0001193125-24-218462-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 18,300 BTC for $1.11B",
    btcAcquired: 18300,
    btcPurchasePrice: 1_110_000_000,
    btcAvgPrice: 60408,
    btcCumulative: 244800,
    notes: "SEC verified. Aug 6 - Sep 12 period. First post-split BTC purchase.",
  },
  {
    date: "2024-09-20",
    filedDate: "2024-09-20",
    accessionNumber: "0001193125-24-222462",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524222462/d887785dex41.htm",
    type: "DEBT",
    item: "1.01",
    section: "Indenture",
    description: "Convertible note - $1.01B @ 0.625% due Sep 2028",
    debtPrincipal: 1_010_000_000,
    debtCoupon: 0.625,
    debtMaturity: "2028-09-15",
    debtType: "convertible",
    conversionPrice: 183.19, // Post-split price (issued Sep 2024)
    notes: "First post-split convertible",
  },
  {
    date: "2024-09-20",
    filedDate: "2024-09-20",
    accessionNumber: "0001193125-24-222498",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524222498/0001193125-24-222498-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 7,420 BTC for $458.2M",
    btcAcquired: 7420,
    btcPurchasePrice: 458_200_000,
    btcAvgPrice: 61750,
    btcCumulative: 252220,
    notes: "SEC verified. Sep 13-19 period. Funded by $1.01B Sep convertible. End of Q3: 252,220 BTC.",
  },
  // Q4 2024 - Massive ATM-funded accumulation
  {
    date: "2024-10-30",
    filedDate: "2024-10-30",
    accessionNumber: "0001193125-24-247543",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524247543/0001193125-24-247543-index.htm",
    type: "ATM",
    item: "1.01",
    section: "Sales Agreement",
    description: "$21B ATM program announced",
    atmCapacity: 21_000_000_000,
    atmSecurities: ["MSTR"],
    notes: "Massive ATM capacity for continued BTC accumulation",
  },
  {
    date: "2024-11-12",
    filedDate: "2024-11-12",
    accessionNumber: "0001193125-24-255184",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524255184/0001193125-24-255184-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 27,200 BTC for $2.03B",
    btcAcquired: 27200,
    btcPurchasePrice: 2_030_000_000,
    btcAvgPrice: 74463,
    btcCumulative: 279420,
    notes: "SEC verified. Oct 31 - Nov 10 period. First major post-ATM purchase.",
  },
  {
    date: "2024-11-18",
    filedDate: "2024-11-18",
    accessionNumber: "0001193125-24-260452",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524260452/0001193125-24-260452-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 51,780 BTC for $4.6B",
    btcAcquired: 51780,
    btcPurchasePrice: 4_600_000_000,
    btcAvgPrice: 88627,
    btcCumulative: 331200,
    notes: "SEC verified. Nov 11-17 period. Largest single-week purchase.",
  },
  {
    date: "2024-11-21",
    filedDate: "2024-11-21",
    accessionNumber: "0001193125-24-263404",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524263404/d905221dex41.htm",
    type: "DEBT",
    item: "1.01",
    section: "Indenture",
    description: "Convertible note - $3B @ 0% due Dec 2029",
    debtPrincipal: 3_000_000_000,
    debtCoupon: 0,
    debtMaturity: "2029-12-01",
    debtType: "convertible",
    conversionPrice: 672.4, // Post-split price (issued Nov 2024)
    notes: "Largest single convertible issuance in history",
  },
  {
    date: "2024-11-25",
    filedDate: "2024-11-25",
    accessionNumber: "0001193125-24-264733",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524264733/0001193125-24-264733-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 55,500 BTC for $5.4B",
    btcAcquired: 55500,
    btcPurchasePrice: 5_400_000_000,
    btcAvgPrice: 97862,
    btcCumulative: 386700,
    notes: "SEC verified. Nov 18-24 period. Funded by $3B convertible + ATM.",
  },
  {
    date: "2024-12-02",
    filedDate: "2024-12-02",
    accessionNumber: "0001193125-24-268429",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524268429/0001193125-24-268429-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 15,400 BTC for $1.5B",
    btcAcquired: 15400,
    btcPurchasePrice: 1_500_000_000,
    btcAvgPrice: 95976,
    btcCumulative: 402100,
    notes: "SEC verified. Nov 25 - Dec 1 period.",
  },
  {
    date: "2024-12-09",
    filedDate: "2024-12-09",
    accessionNumber: "0001193125-24-272923",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524272923/0001193125-24-272923-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 21,550 BTC for $2.1B",
    btcAcquired: 21550,
    btcPurchasePrice: 2_100_000_000,
    btcAvgPrice: 98783,
    btcCumulative: 423650,
    notes: "SEC verified. Dec 2-8 period.",
  },
  {
    date: "2024-12-16",
    filedDate: "2024-12-16",
    accessionNumber: "0001193125-24-279044",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524279044/0001193125-24-279044-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 15,350 BTC for $1.5B",
    btcAcquired: 15350,
    btcPurchasePrice: 1_500_000_000,
    btcAvgPrice: 100386,
    btcCumulative: 439000,
    notes: "SEC verified. Dec 9-15 period.",
  },
  {
    date: "2024-12-23",
    filedDate: "2024-12-23",
    accessionNumber: "0001193125-24-283686",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524283686/0001193125-24-283686-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 5,262 BTC for $561M",
    btcAcquired: 5262,
    btcPurchasePrice: 561_000_000,
    btcAvgPrice: 106662,
    btcCumulative: 444262,
    notes: "SEC verified. Dec 16-22 period.",
  },
  {
    date: "2024-12-30",
    filedDate: "2024-12-30",
    accessionNumber: "0001193125-24-286217",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524286217/0001193125-24-286217-index.htm",
    type: "BTC",
    item: "8.01",
    section: "Bitcoin Holdings Update",
    description: "BTC purchase - 2,138 BTC for $209M",
    btcAcquired: 2138,
    btcPurchasePrice: 209_000_000,
    btcAvgPrice: 97837,
    btcCumulative: 446400,
    notes: "SEC verified. Dec 23-29 period. End of 2024: 446,400 BTC (+257,250 YoY).",
  },

  // ==================== 2025 - Preferred Stock Era ====================
  // Weekly BTC Updates (Jan 2025)
  {
    date: "2025-01-05",
    filedDate: "2025-01-06",
    accessionNumber: "0001193125-25-001854",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525001854/0001193125-25-001854-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 1,070 BTC for $101M",
    btcAcquired: 1070,
    btcPurchasePrice: 101_000_000,
    btcAvgPrice: 94004,
    btcCumulative: 447470,
  },
  {
    date: "2025-01-12",
    filedDate: "2025-01-13",
    accessionNumber: "0001193125-25-005000",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525005000/0001193125-25-005000-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 2,530 BTC for $243M",
    btcAcquired: 2530,
    btcPurchasePrice: 243_000_000,
    btcAvgPrice: 95972,
    btcCumulative: 450000,
  },
  {
    date: "2025-01-20",
    filedDate: "2025-01-21",
    accessionNumber: "0001193125-25-009102",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525009102/0001193125-25-009102-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 11,000 BTC for $1.1B",
    btcAcquired: 11000,
    btcPurchasePrice: 1_100_000_000,
    btcAvgPrice: 101191,
    btcCumulative: 461000,
  },
  {
    date: "2025-01-24",
    filedDate: "2025-01-24",
    accessionNumber: "0001193125-25-011819",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525011819/0001193125-25-011819-index.htm",
    type: "CORP",
    item: "5.03",
    section: "Amendment to Charter",
    description: "Name change from MicroStrategy to Strategy Inc",
    newName: "Strategy Inc",
    notes: "Rebranding to reflect bitcoin treasury focus",
  },
  {
    date: "2025-02-21",
    filedDate: "2025-02-24",
    accessionNumber: "0001193125-25-032800",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525032800/d851880dex41.htm",
    type: "DEBT",
    item: "1.01",
    section: "Indenture",
    description: "Convertible note - $2B @ 0% due Mar 2030 (2030B Notes)",
    debtPrincipal: 2_000_000_000,
    debtCoupon: 0,
    debtMaturity: "2030-03-01",
    debtType: "convertible",
    conversionPrice: 433.43, // 2.3072 shares per $1,000
    notes:
      "Zero coupon convertible. Conversion price ~$433.43/share (2.3072 shares per $1,000). Third convertible issuance.",
  },
  // Weekly BTC Updates (Jan 27 - Apr 28, 2025)
  {
    date: "2025-01-26",
    filedDate: "2025-01-27",
    accessionNumber: "0001193125-25-012671",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525012671/0001193125-25-012671-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 10,107 BTC for $1.1B",
    btcAcquired: 10107,
    btcPurchasePrice: 1_100_000_000,
    btcAvgPrice: 105596,
    btcCumulative: 471107,
  },
  {
    date: "2025-02-09",
    filedDate: "2025-02-10",
    accessionNumber: "0001193125-25-023183",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525023183/0001193125-25-023183-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 7,633 BTC for $742.4M",
    btcAcquired: 7633,
    btcPurchasePrice: 742_400_000,
    btcAvgPrice: 97255,
    btcCumulative: 478740,
  },
  {
    date: "2025-02-23",
    filedDate: "2025-02-24",
    accessionNumber: "0000950170-25-025233",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000095017025025233/0000950170-25-025233-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 20,356 BTC for $1.99B",
    btcAcquired: 20356,
    btcPurchasePrice: 1_990_000_000,
    btcAvgPrice: 97514,
    btcCumulative: 499096,
    notes: "Purchased with $2B convertible proceeds",
  },
  {
    date: "2025-03-10",
    filedDate: "2025-03-10",
    accessionNumber: "0001193125-25-050411",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525050411/0001193125-25-050411-index.htm",
    type: "PREF",
    item: "3.03",
    section: "Material Modification to Rights of Security Holders",
    description: "STRK Stock IPO - 8% Perpetual Strike Preferred",
    prefTicker: "STRK",
    prefDividendRate: 8.0,
    notes: "First perpetual preferred stock issuance",
  },
  // Weekly BTC Updates (Mar-Apr 2025)
  {
    date: "2025-03-16",
    filedDate: "2025-03-17",
    accessionNumber: "0000950170-25-039835",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000095017025039835/0000950170-25-039835-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 130 BTC for $10.7M",
    btcAcquired: 130,
    btcPurchasePrice: 10_700_000,
    btcAvgPrice: 82981,
    btcCumulative: 499226,
    notes: "Smallest purchase in Q1 2025",
  },
  {
    date: "2025-03-23",
    filedDate: "2025-03-24",
    accessionNumber: "0000950170-25-043494",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000095017025043494/0000950170-25-043494-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 6,911 BTC for $584.1M",
    btcAcquired: 6911,
    btcPurchasePrice: 584_100_000,
    btcAvgPrice: 84529,
    btcCumulative: 506137,
  },
  {
    date: "2025-03-30",
    filedDate: "2025-03-31",
    accessionNumber: "0000950170-25-047219",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000095017025047219/0000950170-25-047219-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 22,048 BTC for $1.92B",
    btcAcquired: 22048,
    btcPurchasePrice: 1_920_000_000,
    btcAvgPrice: 86969,
    btcCumulative: 528185,
  },
  {
    date: "2025-04-13",
    filedDate: "2025-04-14",
    accessionNumber: "0000950170-25-053501",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000095017025053501/0000950170-25-053501-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 3,459 BTC for $285.8M",
    btcAcquired: 3459,
    btcPurchasePrice: 285_800_000,
    btcAvgPrice: 82618,
    btcCumulative: 531644,
  },
  {
    date: "2025-04-20",
    filedDate: "2025-04-21",
    accessionNumber: "0000950170-25-056007",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000095017025056007/0000950170-25-056007-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 6,556 BTC for $555.8M",
    btcAcquired: 6556,
    btcPurchasePrice: 555_800_000,
    btcAvgPrice: 84785,
    btcCumulative: 538200,
  },
  {
    date: "2025-04-27",
    filedDate: "2025-04-28",
    accessionNumber: "0000950170-25-058962",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000095017025058962/0000950170-25-058962-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 15,355 BTC for $1.42B",
    btcAcquired: 15355,
    btcPurchasePrice: 1_420_000_000,
    btcAvgPrice: 92737,
    btcCumulative: 553555,
    notes: "Last Q1 2025 purchase before May 1 ATM",
  },
  {
    date: "2025-05-01",
    filedDate: "2025-05-01",
    accessionNumber: "0001193125-25-109959",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525109959/0001193125-25-109959-index.htm",
    type: "ATM",
    item: "1.01",
    section: "Sales Agreement",
    description: "$21B common stock ATM + preferred ATM programs",
    atmCapacity: 21_000_000_000,
    atmSecurities: ["MSTR", "STRK", "STRF", "STRD"],
    notes: "Expanded ATM to cover all capital instruments",
  },
  {
    date: "2025-05-22",
    filedDate: "2025-05-22",
    accessionNumber: "0001193125-25-124568",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525124568/0001193125-25-124568-index.htm",
    type: "PREF",
    item: "3.03",
    section: "Material Modification to Rights of Security Holders",
    description: "STRF Stock - 10% Perpetual Strife Preferred",
    prefTicker: "STRF",
    prefDividendRate: 10.0,
    notes: "Second perpetual preferred series",
  },
  {
    date: "2025-07-07",
    filedDate: "2025-07-07",
    accessionNumber: "0001193125-25-155918",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525155918/0001193125-25-155918-index.htm",
    type: "PREF",
    item: "3.03",
    section: "Material Modification to Rights of Security Holders",
    description: "STRD Stock - 10% Perpetual Stride Preferred",
    prefTicker: "STRD",
    prefDividendRate: 10.0,
    notes: "Third perpetual preferred series",
  },
  {
    date: "2025-07-29",
    filedDate: "2025-07-29",
    accessionNumber: "0001193125-25-167987",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525167987/0001193125-25-167987-index.htm",
    type: "PREF",
    item: "3.03",
    section: "Material Modification to Rights of Security Holders",
    description: "STRC Stock IPO - Variable Rate Perpetual Stretch Preferred ($2.5B)",
    prefTicker: "STRC",
    prefShares: 28011111,
    prefGrossProceeds: 2_521_000_000,
    prefDividendRate: 9.0, // Initial rate, variable
    notes: "Variable rate preferred, $100 stated amount per share",
  },
  {
    date: "2025-11-04",
    filedDate: "2025-11-04",
    accessionNumber: "0001193125-25-263914",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525263914/0001193125-25-263914-index.htm",
    type: "ATM",
    item: "1.01",
    section: "Sales Agreement",
    description: "Omnibus ATM consolidation - $46B total capacity",
    atmCapacity: 46_000_000_000,
    atmSecurities: ["MSTR", "STRF", "STRC", "STRK", "STRD"],
    notes:
      "Consolidated all ATM programs: $15.9B common + $1.7B STRF + $4.2B STRC + $20.3B STRK + $4.1B STRD",
  },
  {
    date: "2025-11-12",
    filedDate: "2025-11-13",
    accessionNumber: "0001193125-25-280178",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525280178/0001193125-25-280178-index.htm",
    type: "PREF",
    item: "3.03",
    section: "Material Modification to Rights of Security Holders",
    description: "STRE Stock IPO - 10% Perpetual Stream Preferred (EUR denominated, $717M)",
    prefTicker: "STRE",
    prefShares: 7750000,
    prefGrossProceeds: 716_800_000,
    prefDividendRate: 10.0,
    notes: "Euro-denominated preferred, €100 stated amount per share",
  },

  // ==================== 2025 Weekly BTC Updates (May-Dec) ====================
  // Weekly filings with Item 8.01 "BTC Update" section
  {
    date: "2025-05-04",
    filedDate: "2025-05-05",
    accessionNumber: "0000950170-25-063168",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-063168-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 1,895 BTC for $180.3M",
    btcAcquired: 1895,
    btcPurchasePrice: 180_300_000,
    btcAvgPrice: 95167,
    btcCumulative: 555450,
  },
  {
    date: "2025-05-11",
    filedDate: "2025-05-12",
    accessionNumber: "0000950170-25-068580",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-068580-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 13,390 BTC for $1.34B",
    btcAcquired: 13390,
    btcPurchasePrice: 1_340_000_000,
    btcAvgPrice: 99856,
    btcCumulative: 568840,
  },
  {
    date: "2025-05-18",
    filedDate: "2025-05-19",
    accessionNumber: "0000950170-25-073962",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-073962-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 7,390 BTC for $764.9M",
    btcAcquired: 7390,
    btcPurchasePrice: 764_900_000,
    btcAvgPrice: 103498,
    btcCumulative: 576230,
  },
  {
    date: "2025-06-01",
    filedDate: "2025-06-02",
    accessionNumber: "0000950170-25-080022",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-080022-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 705 BTC for $75.1M",
    btcAcquired: 705,
    btcPurchasePrice: 75_100_000,
    btcAvgPrice: 106495,
    btcCumulative: 580955,
  },
  {
    date: "2025-06-08",
    filedDate: "2025-06-09",
    accessionNumber: "0000950170-25-083448",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-083448-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 1,045 BTC for $110.2M",
    btcAcquired: 1045,
    btcPurchasePrice: 110_200_000,
    btcAvgPrice: 105426,
    btcCumulative: 582000,
  },
  {
    date: "2025-06-15",
    filedDate: "2025-06-16",
    accessionNumber: "0000950170-25-086545",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-086545-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 10,100 BTC for $1.05B",
    btcAcquired: 10100,
    btcPurchasePrice: 1_051_200_000,
    btcAvgPrice: 104080,
    btcCumulative: 592100,
    notes: "Also completed STRD Offering ($979.7M net proceeds)",
  },
  {
    date: "2025-06-22",
    filedDate: "2025-06-23",
    accessionNumber: "0000950170-25-088711",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-088711-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 245 BTC for $26.0M",
    btcAcquired: 245,
    btcPurchasePrice: 26_000_000,
    btcAvgPrice: 105856,
    btcCumulative: 592345,
  },
  {
    date: "2025-06-29",
    filedDate: "2025-06-30",
    accessionNumber: "0000950170-25-091211",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-091211-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 4,980 BTC for $531.9M",
    btcAcquired: 4980,
    btcPurchasePrice: 531_900_000,
    btcAvgPrice: 106801,
    btcCumulative: 597325,
    // ATM sales (Jun 23-29, 2025)
    atmMstrShares: 1_354_500,
    atmMstrProceeds: 519_500_000,
    atmPrefSales: [
      { ticker: "STRK", shares: 276_071, proceeds: 28_900_000 },
      { ticker: "STRF", shares: 284_225, proceeds: 29_700_000 },
    ],
    atmTotalProceeds: 578_100_000,
    notes: "Q2 2025 close. Paid STRK and STRF dividends using MSTR ATM proceeds.",
  },
  {
    date: "2025-07-13",
    filedDate: "2025-07-14",
    accessionNumber: "0000950170-25-095461",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-095461-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 4,225 BTC for $472.5M",
    btcAcquired: 4225,
    btcPurchasePrice: 472_500_000,
    btcAvgPrice: 111827,
    btcCumulative: 601550,
    // ATM sales (Jul 7-13, 2025)
    atmMstrShares: 797_008,
    atmMstrProceeds: 330_900_000,
    atmPrefSales: [
      { ticker: "STRK", shares: 573_976, proceeds: 71_100_000 },
      { ticker: "STRF", shares: 444_005, proceeds: 55_300_000 },
      { ticker: "STRD", shares: 158_278, proceeds: 15_000_000 },
    ],
    atmTotalProceeds: 472_300_000,
  },
  {
    date: "2025-07-20",
    filedDate: "2025-07-21",
    accessionNumber: "0000950170-25-097081",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-097081-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 6,220 BTC for $739.8M",
    btcAcquired: 6220,
    btcPurchasePrice: 739_800_000,
    btcAvgPrice: 118940,
    btcCumulative: 607770,
    // ATM sales (Jul 14-20, 2025)
    atmMstrShares: 1_636_373,
    atmMstrProceeds: 736_400_000,
    atmPrefSales: [
      { ticker: "STRK", shares: 5_441, proceeds: 700_000 },
      { ticker: "STRF", shares: 2_000, proceeds: 200_000 },
      { ticker: "STRD", shares: 31_282, proceeds: 3_000_000 },
    ],
    atmTotalProceeds: 740_300_000,
  },
  {
    date: "2025-08-03",
    filedDate: "2025-08-04",
    accessionNumber: "0000950170-25-101634",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-101634-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 21,021 BTC for $2.46B",
    btcAcquired: 21021,
    btcPurchasePrice: 2_460_000_000,
    btcAvgPrice: 117256,
    btcCumulative: 628791,
    notes: "Purchased with proceeds from STRC Offering ($2.47B net)",
  },
  {
    date: "2025-08-10",
    filedDate: "2025-08-11",
    accessionNumber: "0000950170-25-106241",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-106241-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 155 BTC for $18.0M",
    btcAcquired: 155,
    btcPurchasePrice: 18_000_000,
    btcAvgPrice: 116401,
    btcCumulative: 628946,
    // ATM sales (Aug 4-10, 2025) - STRF only
    atmPrefSales: [
      { ticker: "STRF", shares: 115_169, proceeds: 13_600_000 },
    ],
    atmTotalProceeds: 13_600_000,
    notes: "Funded by STRF ATM + STRC Offering proceeds.",
  },
  {
    date: "2025-08-17",
    filedDate: "2025-08-18",
    accessionNumber: "0000950170-25-109566",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-109566-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 430 BTC for $51.4M",
    btcAcquired: 430,
    btcPurchasePrice: 51_400_000,
    btcAvgPrice: 119666,
    btcCumulative: 629376,
    // ATM sales (Aug 11-17, 2025) - preferred only, no MSTR common
    atmPrefSales: [
      { ticker: "STRK", shares: 179_687, proceeds: 19_300_000 },
      { ticker: "STRF", shares: 162_670, proceeds: 19_000_000 },
      { ticker: "STRD", shares: 140_789, proceeds: 12_100_000 },
    ],
    atmTotalProceeds: 50_400_000,
    notes: "Updated MSTR equity guidance: issue shares when mNAV < 2.5x. Funded by preferred ATM only.",
  },
  {
    date: "2025-08-24",
    filedDate: "2025-08-25",
    accessionNumber: "0000950170-25-111093",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-111093-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 3,081 BTC for $356.9M",
    btcAcquired: 3081,
    btcPurchasePrice: 356_900_000,
    btcAvgPrice: 115829,
    btcCumulative: 632457,
    // ATM sales (Aug 18-24, 2025)
    atmMstrShares: 875_301,
    atmMstrProceeds: 309_900_000,
    atmPrefSales: [
      { ticker: "STRK", shares: 210_100, proceeds: 20_400_000 },
      { ticker: "STRF", shares: 237_336, proceeds: 26_600_000 },
      { ticker: "STRD", shares: 944, proceeds: 100_000 },
    ],
    atmTotalProceeds: 357_000_000,
  },
  {
    date: "2025-09-07",
    filedDate: "2025-09-08",
    accessionNumber: "0000950170-25-113360",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/0000950170-25-113360-index.html",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 1,955 BTC for $217.4M",
    btcAcquired: 1955,
    btcPurchasePrice: 217_400_000,
    btcAvgPrice: 111196,
    btcCumulative: 638460,
    // ATM sales (Sep 2-7, 2025)
    atmMstrShares: 591_606,
    atmMstrProceeds: 200_500_000,
    atmPrefSales: [
      { ticker: "STRF", shares: 104_381, proceeds: 11_600_000 },
      { ticker: "STRK", shares: 54_558, proceeds: 5_200_000 },
    ],
    atmTotalProceeds: 217_300_000,
  },
  {
    date: "2025-09-14",
    filedDate: "2025-09-15",
    accessionNumber: "0001193125-25-202827",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525202827/0001193125-25-202827-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 525 BTC for $60.2M",
    btcAcquired: 525,
    btcPurchasePrice: 60_200_000,
    btcAvgPrice: 114562,
    btcCumulative: 638985,
    // ATM sales (Sep 8-14, 2025) - preferred only, no MSTR common
    atmPrefSales: [
      { ticker: "STRF", shares: 302_503, proceeds: 34_000_000 },
      { ticker: "STRK", shares: 181_228, proceeds: 17_300_000 },
      { ticker: "STRD", shares: 208_175, proceeds: 16_900_000 },
    ],
    atmTotalProceeds: 68_200_000,
    notes: "Funded entirely by preferred ATM sales. No MSTR common stock sold.",
  },
  {
    date: "2025-09-21",
    filedDate: "2025-09-22",
    accessionNumber: "0001193125-25-210048",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525210048/0001193125-25-210048-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 850 BTC for $99.7M",
    btcAcquired: 850,
    btcPurchasePrice: 99_700_000,
    btcAvgPrice: 117344,
    btcCumulative: 639835,
    // ATM sales (Sep 15-21, 2025) - MSTR + STRF
    atmMstrShares: 227_401,
    atmMstrProceeds: 80_600_000,
    atmPrefSales: [
      { ticker: "STRF", shares: 173_834, proceeds: 19_400_000 },
    ],
    atmTotalProceeds: 100_000_000,
  },
  {
    date: "2025-09-28",
    filedDate: "2025-09-29",
    accessionNumber: "0001193125-25-221772",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525221772/0001193125-25-221772-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 196 BTC for $22.1M",
    btcAcquired: 196,
    btcPurchasePrice: 22_100_000,
    btcAvgPrice: 113048,
    btcCumulative: 640031,
    // ATM sales (Sep 22-28, 2025) - MSTR + preferred
    atmMstrShares: 347_352,
    atmMstrProceeds: 116_400_000,
    atmPrefSales: [
      { ticker: "STRF", shares: 101_713, proceeds: 11_300_000 },
      { ticker: "STRD", shares: 5_000, proceeds: 400_000 },
    ],
    atmTotalProceeds: 128_100_000,
    notes: "End of Q3 2025: 640,031 BTC",
  },
  {
    date: "2025-10-19",
    filedDate: "2025-10-20",
    accessionNumber: "0001193125-25-243049",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525243049/0001193125-25-243049-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 168 BTC for $18.8M",
    btcAcquired: 168,
    btcPurchasePrice: 18_800_000,
    btcAvgPrice: 112051,
    btcCumulative: 640418,
    // ATM sales (Oct 13-19, 2025) - preferred only, no MSTR common
    atmPrefSales: [
      { ticker: "STRF", shares: 100_930, proceeds: 11_200_000 },
      { ticker: "STRK", shares: 57_636, proceeds: 5_100_000 },
      { ticker: "STRD", shares: 25_933, proceeds: 2_600_000 },
    ],
    atmTotalProceeds: 18_900_000,
    notes: "Oct 6 week had no purchases (Oct 13-19 period). Funded by preferred ATM only.",
  },
  {
    date: "2025-10-26",
    filedDate: "2025-10-27",
    accessionNumber: "0001193125-25-250751",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525250751/0001193125-25-250751-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 390 BTC for $43.4M",
    btcAcquired: 390,
    btcPurchasePrice: 43_400_000,
    btcAvgPrice: 111117,
    btcCumulative: 640808,
    // ATM sales (Oct 20-26, 2025) - preferred only, no MSTR common
    atmPrefSales: [
      { ticker: "STRF", shares: 174_900, proceeds: 19_400_000 },
      { ticker: "STRK", shares: 192_082, proceeds: 17_000_000 },
      { ticker: "STRD", shares: 70_179, proceeds: 7_000_000 },
    ],
    atmTotalProceeds: 43_400_000,
    notes: "Funded entirely by preferred ATM sales. No MSTR common stock sold.",
  },
  {
    date: "2025-11-02",
    filedDate: "2025-11-03",
    accessionNumber: "0001193125-25-261714",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525261714/0001193125-25-261714-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 397 BTC for $45.6M",
    btcAcquired: 397,
    btcPurchasePrice: 45_600_000,
    btcAvgPrice: 114771,
    btcCumulative: 641205,
    // ATM sales (Oct 27 - Nov 2, 2025) - first MSTR common sales + preferred
    atmMstrShares: 551_200,
    atmMstrProceeds: 54_400_000,
    atmPrefSales: [
      { ticker: "STRF", shares: 75_665, proceeds: 8_400_000 },
      { ticker: "STRK", shares: 49_813, proceeds: 4_400_000 },
      { ticker: "STRD", shares: 22_976, proceeds: 2_300_000 },
    ],
    atmTotalProceeds: 69_500_000,
    notes: "First week with MSTR common stock ATM sales in this period.",
  },
  {
    date: "2025-11-09",
    filedDate: "2025-11-10",
    accessionNumber: "0001193125-25-273310",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525273310/0001193125-25-273310-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 487 BTC for $49.9M",
    btcAcquired: 487,
    btcPurchasePrice: 49_900_000,
    btcAvgPrice: 102464,
    btcCumulative: 641692,
    // ATM sales (Nov 3-9, 2025) - preferred only, no MSTR common
    atmPrefSales: [
      { ticker: "STRF", shares: 165_614, proceeds: 18_300_000 },
      { ticker: "STRC", shares: 262_311, proceeds: 26_200_000 },
      { ticker: "STRK", shares: 50_881, proceeds: 4_500_000 },
      { ticker: "STRD", shares: 12_800, proceeds: 1_000_000 },
    ],
    atmTotalProceeds: 50_000_000,
    notes: "No MSTR common stock sold this week - funded by preferred ATM only.",
  },
  {
    date: "2025-11-16",
    filedDate: "2025-11-17",
    accessionNumber: "0001193125-25-283991",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525283991/0001193125-25-283991-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 8,178 BTC for $835.6M",
    btcAcquired: 8178,
    btcPurchasePrice: 835_600_000,
    btcAvgPrice: 102178,
    btcCumulative: 649870,
    // ATM sales (Nov 10-16, 2025) - preferred only, no MSTR common
    atmPrefSales: [
      { ticker: "STRF", shares: 39_957, proceeds: 4_400_000 },
      { ticker: "STRC", shares: 1_313_641, proceeds: 131_200_000 },
      { ticker: "STRK", shares: 5_513, proceeds: 500_000 },
    ],
    atmTotalProceeds: 136_100_000,
    notes: "Purchased with STRE Offering proceeds ($703.9M net) + ATM preferred sales. No MSTR common sold.",
  },
  // ==================== 2025 Q4 + 2026 Weekly BTC Updates ====================
  {
    date: "2025-11-30",
    filedDate: "2025-12-01",
    accessionNumber: "0001193125-25-303157",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525303157/0001193125-25-303157-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 130 BTC for $11.7M",
    btcAcquired: 130,
    btcPurchasePrice: 11_700_000,
    btcAvgPrice: 90000,
    btcCumulative: 650000,
    // ATM sales (Nov 17-30, 2025)
    atmMstrProceeds: 1_478_100_000,
    atmTotalProceeds: 1_478_100_000,
    notes: "Established $1.44B USD Reserve for preferred dividends. Large ATM, minimal BTC bought.",
  },
  {
    date: "2025-12-07",
    filedDate: "2025-12-08",
    accessionNumber: "0001193125-25-310607",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525310607/0001193125-25-310607-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 10,624 BTC for $962.7M",
    btcAcquired: 10624,
    btcPurchasePrice: 962_700_000,
    btcAvgPrice: 90613,
    btcCumulative: 660624,
    // ATM sales (Dec 1-7, 2025)
    atmMstrShares: 5_127_684,
    atmMstrProceeds: 928_100_000,
    atmPrefSales: [{ ticker: "STRD", shares: 442_536, proceeds: 34_900_000 }],
    atmTotalProceeds: 963_000_000,
  },
  {
    date: "2025-12-14",
    filedDate: "2025-12-15",
    accessionNumber: "0001193125-25-318468",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525318468/0001193125-25-318468-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 10,645 BTC for $980.3M",
    btcAcquired: 10645,
    btcPurchasePrice: 980_300_000,
    btcAvgPrice: 92089,
    btcCumulative: 671269,
    // ATM sales (Dec 8-14, 2025)
    atmMstrShares: 4_789_664,
    atmMstrProceeds: 888_200_000,
    atmPrefSales: [
      { ticker: "STRF", shares: 163_306, proceeds: 18_000_000 },
      { ticker: "STRK", shares: 7_036, proceeds: 600_000 },
      { ticker: "STRD", shares: 1_029_202, proceeds: 82_200_000 },
    ],
    atmTotalProceeds: 989_000_000,
  },
  {
    date: "2025-12-21",
    filedDate: "2025-12-22",
    accessionNumber: "0001193125-25-327598",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525327598/0001193125-25-327598-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - No BTC purchases (ATM only)",
    btcAcquired: 0,
    btcCumulative: 671268,
    // ATM sales (Dec 15-21, 2025) - raised capital but no BTC bought
    atmMstrProceeds: 747_800_000,
    atmTotalProceeds: 747_800_000,
    notes: "No BTC purchased this week despite ATM activity. USD Reserve reached $2.19B.",
  },
  {
    date: "2025-12-28",
    filedDate: "2025-12-29",
    accessionNumber: "0001193125-25-332296",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525332296/0001193125-25-332296-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 1,229 BTC for $108.8M",
    btcAcquired: 1229,
    btcPurchasePrice: 108_800_000,
    btcAvgPrice: 88527,
    btcCumulative: 672497,
    // ATM sales (Dec 22-28, 2025)
    atmMstrProceeds: 108_800_000,
    atmTotalProceeds: 108_800_000,
  },
  {
    date: "2025-12-31",
    filedDate: "2026-01-05",
    accessionNumber: "0001193125-26-001550",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312526001550/0001193125-26-001550-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Year-end BTC Update - 3 BTC for $0.3M",
    btcAcquired: 3,
    btcPurchasePrice: 300_000,
    btcAvgPrice: 88210,
    btcCumulative: 672500,
    // ATM sales (Dec 29-31, 2025)
    atmMstrProceeds: 195_900_000,
    atmTotalProceeds: 195_900_000,
    notes: "End of 2025: 672,500 BTC. Dec 29-31 period. ATM raised $196M but minimal BTC bought.",
  },
  {
    date: "2026-01-04",
    filedDate: "2026-01-05",
    accessionNumber: "0001193125-26-001550",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312526001550/0001193125-26-001550-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 1,283 BTC for $116.0M",
    btcAcquired: 1283,
    btcPurchasePrice: 116_000_000,
    btcAvgPrice: 90413,
    btcCumulative: 673783,
    // ATM sales (Jan 1-4, 2026)
    atmMstrProceeds: 116_300_000,
    atmTotalProceeds: 116_300_000,
    notes: "Jan 1-4 period (same filing as Dec 31 update)",
  },
  {
    date: "2026-01-11",
    filedDate: "2026-01-12",
    accessionNumber: "0001193125-26-009811",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312526009811/0001193125-26-009811-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 13,627 BTC for $1.247B",
    btcAcquired: 13627,
    btcPurchasePrice: 1_247_100_000,
    btcAvgPrice: 91518,
    btcCumulative: 687410,
    // ATM sales (Jan 5-11, 2026)
    atmMstrShares: 6_827_695,
    atmMstrProceeds: 1_128_500_000,
    atmPrefSales: [{ ticker: "STRC", shares: 1_192_262, proceeds: 119_100_000 }],
    atmTotalProceeds: 1_247_600_000,
  },
  {
    date: "2026-01-19",
    filedDate: "2026-01-20",
    accessionNumber: "0001193125-26-016002",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312526016002/0001193125-26-016002-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 22,305 BTC for $2.125B",
    btcAcquired: 22305,
    btcPurchasePrice: 2_125_300_000,
    btcAvgPrice: 95285,
    btcCumulative: 709715,
    // ATM sales (Jan 12-19, 2026)
    atmMstrShares: 10_399_650,
    atmMstrProceeds: 1_827_300_000,
    atmPrefSales: [
      { ticker: "STRC", shares: 2_945_371, proceeds: 294_300_000 },
      { ticker: "STRK", shares: 38_796, proceeds: 3_400_000 },
    ],
    atmTotalProceeds: 2_125_000_000,
    notes: "Largest weekly purchase of 2026 to date. Funded by massive ATM sales.",
  },
  {
    date: "2026-01-25",
    filedDate: "2026-01-26",
    accessionNumber: "0001193125-26-021726",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312526021726/0001193125-26-021726-index.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 2,932 BTC for $264.1M",
    btcAcquired: 2932,
    btcPurchasePrice: 264_100_000,
    btcAvgPrice: 90109,
    btcCumulative: 712647,
    // ATM sales (Jan 20-25, 2026)
    atmMstrShares: 1_569_770,
    atmMstrProceeds: 257_000_000,
    atmPrefSales: [{ ticker: "STRC", shares: 70_201, proceeds: 7_000_000 }],
    atmTotalProceeds: 264_000_000,
    notes: "Most recent filing as of Jan 26, 2026",
  },
  {
    date: "2026-02-08",
    filedDate: "2026-02-09",
    accessionNumber: "0001193125-26-041944",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312526041944/d947535d8k.htm",
    type: "BTC",
    item: "8.01",
    section: "BTC Update",
    description: "Weekly BTC Update - 7,633 BTC for $742.3M",
    btcAcquired: 7633,
    btcCost: 742300000,
    btcAvgPrice: 97255,
    btcTotal: 721135,
    atmCommonShares: 516413,
    atmCommonProceeds: 179300000,
    notes: "Auto-ingested, manually corrected",
  },
];

/**
 * Helper: Get events by type
 */
export function getEventsByType(type: CapitalEventType): CapitalEvent[] {
  return MSTR_CAPITAL_EVENTS.filter((e) => e.type === type);
}

/**
 * Helper: Get events in date range
 */
export function getEventsInRange(
  startDate: string,
  endDate: string
): CapitalEvent[] {
  return MSTR_CAPITAL_EVENTS.filter(
    (e) => e.date >= startDate && e.date <= endDate
  );
}

/**
 * Helper: Get total debt outstanding at a point in time
 * Note: This is a simplification - actual debt changes with conversions/redemptions
 */
export function getDebtIssuedByDate(asOfDate: string): number {
  return MSTR_CAPITAL_EVENTS.filter(
    (e) => e.type === "DEBT" && e.date <= asOfDate && e.debtPrincipal
  ).reduce((sum, e) => sum + (e.debtPrincipal || 0), 0);
}

/**
 * Helper: Get BTC holdings at a point in time (from 8-K events only)
 * Note: For authoritative BTC counts, use 10-Q/10-K from mstr-sec-history.ts
 */
export function getBtcHoldingsByDate(asOfDate: string): number | null {
  const events = MSTR_CAPITAL_EVENTS.filter(
    (e) => e.type === "BTC" && e.date <= asOfDate && e.btcCumulative
  );
  if (events.length === 0) return null;
  return events[events.length - 1].btcCumulative || null;
}
