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

  // Preferred events
  prefTicker?: string; // STRF, STRC, STRK, STRD, STRE
  prefShares?: number;
  prefGrossProceeds?: number;
  prefDividendRate?: number; // Annual rate (e.g., 10.0 = 10%)

  // ATM events
  atmCapacity?: number; // Total program capacity in USD
  atmSecurities?: string[]; // Which securities covered

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
    accessionNumber: "0001193125-20-243849",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312520243849/0001193125-20-243849-index.htm",
    type: "BTC",
    description: "Additional BTC purchase - 16,796 BTC for $175M",
    btcAcquired: 16796,
    btcPurchasePrice: 175_000_000,
    btcAvgPrice: 10422,
    btcCumulative: 38250,
    notes: "Second major purchase, bringing total to 38,250 BTC",
  },
  {
    date: "2020-12-11",
    filedDate: "2020-12-11",
    accessionNumber: "0001193125-20-315971",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312520315971/0001193125-20-315971-index.htm",
    type: "DEBT",
    description: "First convertible note - $650M @ 0.75% due Dec 2025",
    debtPrincipal: 650_000_000,
    debtCoupon: 0.75,
    debtMaturity: "2025-12-15",
    debtType: "convertible",
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
    description: "BTC purchase with convertible proceeds - 29,646 BTC for $650M",
    btcAcquired: 29646,
    btcPurchasePrice: 650_000_000,
    btcAvgPrice: 21925,
    btcCumulative: 70470,
    notes: "Deployed full convertible note proceeds into BTC",
  },

  // ==================== 2021 - Continued Accumulation ====================
  {
    date: "2021-02-17",
    filedDate: "2021-02-17",
    accessionNumber: "0001193125-21-046498",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521046498/0001193125-21-046498-index.htm",
    type: "DEBT",
    description: "Second convertible note - $1.05B @ 0% due Feb 2027",
    debtPrincipal: 1_050_000_000,
    debtCoupon: 0,
    debtMaturity: "2027-02-15",
    debtType: "convertible",
    notes: "Zero-coupon convertible issued at premium to fund BTC purchases",
  },
  {
    date: "2021-06-14",
    filedDate: "2021-06-14",
    accessionNumber: "0001193125-21-188006",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312521188006/0001193125-21-188006-index.htm",
    type: "DEBT",
    description: "Secured term loan - $500M @ SOFR+5.75% due Jun 2028",
    debtPrincipal: 500_000_000,
    debtCoupon: 5.75, // Spread over SOFR
    debtMaturity: "2028-06-14",
    debtType: "secured",
    notes: "Secured by BTC collateral (~26,500 BTC)",
  },

  // ==================== 2024 - Major Expansion ====================
  {
    date: "2024-03-08",
    filedDate: "2024-03-08",
    accessionNumber: "0001193125-24-063586",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524063586/0001193125-24-063586-index.htm",
    type: "DEBT",
    description: "Convertible note - $800M @ 0.625% due Mar 2030",
    debtPrincipal: 800_000_000,
    debtCoupon: 0.625,
    debtMaturity: "2030-03-15",
    debtType: "convertible",
    notes: "First convertible of 2024",
  },
  {
    date: "2024-03-18",
    filedDate: "2024-03-18",
    accessionNumber: "0001193125-24-072548",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524072548/0001193125-24-072548-index.htm",
    type: "DEBT",
    description: "Convertible note - $603.75M @ 0.875% due Mar 2031",
    debtPrincipal: 603_750_000,
    debtCoupon: 0.875,
    debtMaturity: "2031-03-15",
    debtType: "convertible",
    notes: "Second convertible of Q1 2024",
  },
  {
    date: "2024-06-13",
    filedDate: "2024-06-13",
    accessionNumber: "0001193125-24-163274",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524163274/0001193125-24-163274-index.htm",
    type: "DEBT",
    description: "Convertible note - $800M @ 2.25% due Jun 2032",
    debtPrincipal: 800_000_000,
    debtCoupon: 2.25,
    debtMaturity: "2032-06-15",
    debtType: "convertible",
    notes: "Third convertible of 2024",
  },
  {
    date: "2024-07-11",
    filedDate: "2024-07-11",
    accessionNumber: "0001193125-24-177515",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524177515/0001193125-24-177515-index.htm",
    type: "CORP",
    description: "10:1 stock split announced",
    splitRatio: "10:1",
    notes:
      "Effective Aug 7, 2024. All pre-Aug 2024 share counts need 10x adjustment.",
  },
  {
    date: "2024-09-16",
    filedDate: "2024-09-16",
    accessionNumber: "0001193125-24-225195",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524225195/0001193125-24-225195-index.htm",
    type: "DEBT",
    description: "Convertible note - $1.01B @ 0.625% due Sep 2028",
    debtPrincipal: 1_010_000_000,
    debtCoupon: 0.625,
    debtMaturity: "2028-09-15",
    debtType: "convertible",
    notes: "First post-split convertible",
  },
  {
    date: "2024-10-30",
    filedDate: "2024-10-30",
    accessionNumber: "0001193125-24-247543",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524247543/0001193125-24-247543-index.htm",
    type: "ATM",
    description: "$21B ATM program announced",
    atmCapacity: 21_000_000_000,
    atmSecurities: ["MSTR"],
    notes: "Massive ATM capacity for continued BTC accumulation",
  },
  {
    date: "2024-11-21",
    filedDate: "2024-11-21",
    accessionNumber: "0001193125-24-263404",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524263404/0001193125-24-263404-index.htm",
    type: "DEBT",
    description: "Convertible note - $3B @ 0% due Dec 2029",
    debtPrincipal: 3_000_000_000,
    debtCoupon: 0,
    debtMaturity: "2029-12-01",
    debtType: "convertible",
    notes: "Largest single convertible issuance in history",
  },

  // ==================== 2025 - Preferred Stock Era ====================
  {
    date: "2025-01-24",
    filedDate: "2025-01-24",
    accessionNumber: "0001193125-25-011819",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525011819/0001193125-25-011819-index.htm",
    type: "CORP",
    description: "Name change from MicroStrategy to Strategy Inc",
    newName: "Strategy Inc",
    notes: "Rebranding to reflect bitcoin treasury focus",
  },
  {
    date: "2025-03-10",
    filedDate: "2025-03-10",
    accessionNumber: "0001193125-25-050411",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525050411/0001193125-25-050411-index.htm",
    type: "PREF",
    description: "STRK Stock IPO - 8% Perpetual Strike Preferred",
    prefTicker: "STRK",
    prefDividendRate: 8.0,
    notes: "First perpetual preferred stock issuance",
  },
  {
    date: "2025-05-01",
    filedDate: "2025-05-01",
    accessionNumber: "0001193125-25-109959",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525109959/0001193125-25-109959-index.htm",
    type: "ATM",
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
    description: "STRE Stock IPO - 10% Perpetual Stream Preferred (EUR denominated, $717M)",
    prefTicker: "STRE",
    prefShares: 7750000,
    prefGrossProceeds: 716_800_000,
    prefDividendRate: 10.0,
    notes: "Euro-denominated preferred, €100 stated amount per share",
  },

  // ==================== Sample Weekly BTC Updates (2024-2025) ====================
  // Note: There are 50+ weekly BTC Update filings per year. These are representative samples.
  // For complete weekly data, query the SEC EDGAR API for Item 8.01 filings with "BTC Update".
  {
    date: "2024-12-29",
    filedDate: "2024-12-30",
    accessionNumber: "0001193125-24-286217",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312524286217/0001193125-24-286217-index.htm",
    type: "BTC",
    description: "Weekly BTC Update - 2,138 BTC for $209M",
    btcAcquired: 2138,
    btcPurchasePrice: 209_000_000,
    btcAvgPrice: 97837,
    btcCumulative: 446400,
    notes: "End of 2024 purchase. BTC Yield YTD: 74.1%",
  },
  {
    date: "2025-11-30",
    filedDate: "2025-12-01",
    accessionNumber: "0001193125-25-303157",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312525303157/0001193125-25-303157-index.htm",
    type: "BTC",
    description: "Weekly BTC Update - 130 BTC for $11.7M",
    btcAcquired: 130,
    btcPurchasePrice: 11_700_000,
    btcAvgPrice: 90000,
    notes: "Also established $1.44B USD Reserve for preferred dividends",
  },
  {
    date: "2026-01-25",
    filedDate: "2026-01-26",
    accessionNumber: "0001193125-26-021726",
    secUrl:
      "https://www.sec.gov/Archives/edgar/data/1050446/000119312526021726/0001193125-26-021726-index.htm",
    type: "BTC",
    description: "Weekly BTC Update - 2,932 BTC for $264.1M",
    btcAcquired: 2932,
    btcPurchasePrice: 264_100_000,
    btcAvgPrice: 90109,
    notes: "Most recent filing as of Jan 26, 2026",
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
