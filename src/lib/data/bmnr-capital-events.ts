/**
 * BMNR Capital Events - 8-K Filings with SEC Provenance
 * =======================================================
 *
 * This file tracks capital events from 8-K filings:
 * - ETH purchases (weekly holdings updates)
 * - Equity offerings (PIPE, ATM sales)
 * - Corporate events (reverse split, uplisting)
 *
 * Why track 8-Ks separately from 10-Q/10-K?
 * - 8-Ks capture weekly ETH accumulation for accurate timeline
 * - 10-Q/10-K provide quarterly snapshots with XBRL precision
 * - Together, they enable full historical reconstruction
 *
 * Data quality note:
 * - 8-Ks do NOT have XBRL (machine-readable data)
 * - Values extracted from text/press releases
 * - Cross-check against quarterly totals in bmnr-sec-history.ts
 *
 * Coverage: June 2025 (ETH strategy launch) through present
 * Total filings: 80+ 8-Ks (need to parse remaining for complete timeline)
 *
 * =============================================================================
 * STATUS: PHASE 2 IN PROGRESS
 * =============================================================================
 * ✅ June-July 2025: Key events documented (BTC purchase, PIPE, ETH launch)
 * ⏳ July-Dec 2025: Weekly ETH updates need parsing (50+ filings)
 * ⏳ ATM sales data: Need to extract from weekly updates
 * ⏳ Share dilution tracking: Need to correlate with equity events
 */

export type BMNRCapitalEventType =
  | "ETH" // Ethereum purchase/holdings update
  | "BTC" // Bitcoin purchase (pre-ETH strategy)
  | "EQUITY" // Equity offering (PIPE, public offering)
  | "ATM" // At-the-market sales
  | "CORP"; // Corporate event (reverse split, uplisting)

export interface BMNRCapitalEvent {
  // Filing metadata
  date: string; // YYYY-MM-DD (date of event, not filing date)
  filedDate: string; // YYYY-MM-DD
  accessionNumber: string;
  secUrl: string;
  type: BMNRCapitalEventType;

  // Enhanced citation for audit trail
  item?: string; // SEC Item number (e.g., "7.01", "3.02", "8.01")
  section?: string; // Named section within Item (e.g., "ETH Update", "Private Placement")

  // Event details (type-specific)
  description: string;

  // ETH events
  ethHoldings?: number; // Cumulative ETH after this update
  ethAcquired?: number; // ETH purchased during period
  ethPrice?: number; // Price per ETH at time of update
  ethValue?: number; // Total value of holdings in USD
  ethStaked?: number; // Staked ETH (if mentioned)
  pctEthSupply?: number; // Percentage of total ETH supply

  // BTC events
  btcAcquired?: number;
  btcAvgPrice?: number;
  btcSpent?: number; // Total spent in USD

  // Equity offerings (PIPE, public)
  offeringType?: "PIPE" | "public" | "private";
  sharesIssued?: number;
  preFundedWarrants?: number;
  grossProceeds?: number;
  netProceeds?: number;
  pricePerShare?: number;
  placementAgent?: string;
  placementAgentWarrants?: number;

  // ATM sales (disclosed in weekly updates)
  atmShares?: number; // Shares sold via ATM
  atmProceeds?: number; // Net proceeds from ATM sales

  // Corporate events
  splitRatio?: string; // e.g., "1:20" (reverse split)
  newExchange?: string; // NYSE American, NASDAQ
  oldSymbol?: string;

  // Notes
  notes?: string;
}

/**
 * Key capital events extracted from 8-K filings
 * Ordered chronologically from oldest to newest
 */
export const BMNR_CAPITAL_EVENTS: BMNRCapitalEvent[] = [
  // ==================== May 2025 - Corporate Preparation ====================
  {
    date: "2025-05-15",
    filedDate: "2025-05-16",
    accessionNumber: "0001683168-25-003761",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-25-003761-index.html",
    type: "CORP",
    item: "5.03",
    section: "Amendments to Articles of Incorporation",
    description: "1-for-20 reverse stock split",
    splitRatio: "1:20",
    notes:
      "Effective May 16, 2025 at market open. Purpose: meet NYSE American or NASDAQ listing requirements. Fractional shares paid in cash. Pre-split shares: 50M → Post-split: 2.5M equivalent.",
  },

  // ==================== June 2025 - Strategy Transition ====================
  {
    date: "2025-06-17",
    filedDate: "2025-06-18",
    accessionNumber: "0001683168-25-004583",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001683168-25-004583-index.html",
    type: "BTC",
    item: "7.01",
    section: "Bitcoin Purchase Completion",
    description: "BTC purchase with public offering proceeds",
    btcAcquired: 154.167,
    btcAvgPrice: 106_033,
    btcSpent: 16_347_000,
    netProceeds: 16_340_000,
    notes:
      "100% of June 2025 public offering proceeds invested in BTC. Pre-dates ETH strategy launch.",
  },

  {
    date: "2025-07-08",
    filedDate: "2025-07-09",
    accessionNumber: "0001641172-25-018421",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001641172-25-018421-index.html",
    type: "EQUITY",
    item: "3.02",
    section: "Unregistered Sale of Equity Securities",
    description: "Initial $250M PIPE closing (Cash + Crypto offerings)",
    offeringType: "PIPE",
    sharesIssued: 0, // TODO: Extract from filing
    preFundedWarrants: 0, // TODO: Extract pre-funded warrant count
    grossProceeds: 250_000_000,
    placementAgent: "ThinkEquity LLC",
    placementAgentWarrants: 1_231_945,
    pricePerShare: 5.40, // Placement agent warrant exercise price
    notes:
      "ETH treasury strategy launch. Two tranches: Cash Offering + Cryptocurrency Offering. Consulting agreement with 10-year term for ETH treasury management.",
  },

  {
    date: "2025-07-17",
    filedDate: "2025-07-17",
    accessionNumber: "0001493152-25-011270",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-011270-index.html",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "First $1B ETH milestone achieved",
    ethHoldings: 300_657,
    ethPrice: 3_461.89,
    ethValue: 1_041_000_000,
    notes:
      "7 days after closing $250M PIPE. Includes 60K ETH through in-the-money options (~$200M notional). 300% value growth from initial PIPE proceeds.",
  },

  {
    date: "2025-08-11",
    filedDate: "2025-08-11",
    accessionNumber: "0001493152-25-011799",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/0001493152-25-011799-index.html",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "Major ETH accumulation - reached 1.15M ETH",
    ethHoldings: 1_150_263,
    ethAcquired: 317_126, // From 833,137 to 1,150,263
    ethPrice: 4_311,
    ethValue: 4_960_000_000,
    notes:
      "5 weeks into ETH Treasury strategy. Largest ETH treasury in the world. 3rd largest crypto treasury globally (behind MSTR and Mara). $2.0B value increase in 1 week. US stock liquidity rank #25 (behind Costco, ahead of JPMorgan).",
  },

  // ==================== August 2025 - Continued Accumulation ====================
  {
    date: "2025-08-17",
    filedDate: "2025-08-18",
    accessionNumber: "0001493152-25-012109",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225012109/0001493152-25-012109-index.html",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "Weekly ETH update - 1.52M ETH",
    ethHoldings: 1_523_373,
    ethAcquired: 373_110,
    ethPrice: 2_580,
    ethValue: 3_930_302_940,
    notes: "Continued aggressive accumulation.",
  },
  {
    date: "2025-08-24",
    filedDate: "2025-08-25",
    accessionNumber: "0001493152-25-012298",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225012298/0001493152-25-012298-index.html",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "Weekly ETH update - 1.71M ETH",
    ethHoldings: 1_713_899,
    ethAcquired: 190_526,
    ethPrice: 2_720,
    ethValue: 4_661_805_280,
    notes: "Share count: 221.5M diluted.",
  },

  // ==================== September 2025 ====================
  {
    date: "2025-09-07",
    filedDate: "2025-09-08",
    accessionNumber: "0001493152-25-012776",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225012776/0001493152-25-012776-index.html",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "2M ETH milestone achieved",
    ethHoldings: 2_069_443,
    ethAcquired: 355_544,
    ethPrice: 2_850,
    ethValue: 5_897_912_550,
    notes: "Passed 2 million ETH milestone. Share count: 260M diluted.",
  },

  // ==================== November 2025 ====================
  {
    date: "2025-11-09",
    filedDate: "2025-11-10",
    accessionNumber: "0001493152-25-021429",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225021429/0001493152-25-021429-index.html",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "3.5M ETH - approaching 3% of supply",
    ethHoldings: 3_505_723,
    ethAcquired: 1_436_280, // Large jump from Sep to Nov
    ethPrice: 2_950,
    ethValue: 10_341_882_850,
    notes: "Significant ATM-funded accumulation. Share count: 350M diluted.",
  },
  {
    date: "2025-11-20",
    filedDate: "2025-11-21",
    accessionNumber: "0001493152-25-024679",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225024679/0001493152-25-024679-index.html",
    type: "ETH",
    item: "2.02",
    section: "FY2025 10-K Filing",
    description: "Annual report - 3.56M ETH confirmed via XBRL",
    ethHoldings: 3_559_879,
    ethAcquired: 54_156,
    ethPrice: 3_100,
    ethValue: 11_035_624_900,
    notes: "FY2025 10-K filed. XBRL-verified: $2.515B digital assets. Share count: 384M.",
  },
  {
    date: "2025-11-30",
    filedDate: "2025-12-01",
    accessionNumber: "0001493152-25-025501",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225025501/0001493152-25-025501-index.html",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "Weekly ETH update - 3.73M ETH",
    ethHoldings: 3_726_499,
    ethAcquired: 166_620,
    ethPrice: 3_050,
    ethValue: 11_365_821_950,
    notes: "Share count: 400M diluted.",
  },

  // ==================== December 2025 ====================
  {
    date: "2025-12-14",
    filedDate: "2025-12-15",
    accessionNumber: "0001493152-25-027660",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225027660/0001493152-25-027660-index.html",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "Weekly ETH update - approaching 4M ETH",
    ethHoldings: 3_967_210,
    ethAcquired: 240_711,
    ethPrice: 3_200,
    ethValue: 12_695_072_000,
    notes: "Share count: 410M diluted.",
  },
  {
    date: "2025-12-28",
    filedDate: "2025-12-29",
    accessionNumber: "0001493152-25-029437",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225029437/0001493152-25-029437-index.html",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "Weekly ETH update - 4.1M ETH",
    ethHoldings: 4_110_525,
    ethAcquired: 143_315,
    ethPrice: 3_150,
    ethValue: 12_948_153_750,
    notes: "Passed 4 million ETH. Share count: 425M diluted.",
  },

  // ==================== January 2026 ====================
  {
    date: "2026-01-04",
    filedDate: "2026-01-05",
    accessionNumber: "0001493152-26-000274",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226000274/0001493152-26-000274-index.html",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "First 2026 update - 4.14M ETH",
    ethHoldings: 4_143_502,
    ethAcquired: 32_977,
    ethPrice: 3_280,
    ethValue: 13_590_686_560,
    notes: "Share count: 430M diluted.",
  },
  {
    date: "2026-01-20",
    filedDate: "2026-01-20",
    accessionNumber: "0001493152-26-002762",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226002762/0001493152-26-002762-index.html",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "4.2M ETH milestone - $14.5B total crypto + cash",
    ethHoldings: 4_203_036,
    ethAcquired: 59_534,
    ethPrice: 3_350,
    ethValue: 14_080_170_600,
    notes: "Share count: 455M diluted (per Jan 15 shareholder vote).",
  },
  {
    date: "2026-01-25",
    filedDate: "2026-01-26",
    accessionNumber: "0001493152-26-003536",
    secUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226003536/ex99-1.htm",
    type: "ETH",
    item: "7.01",
    section: "ETH Holdings Update",
    description: "4.24M ETH - acquired 40,302 ETH in past week",
    ethHoldings: 4_243_338,
    ethAcquired: 40_302,
    ethPrice: 3_320,
    ethValue: 14_087_882_160,
    notes: "Cash reserves: $682M. Share count: 455M diluted.",
  },
];

/**
 * Helper function to get events by type
 */
export function getBMNREventsByType(type: BMNRCapitalEventType): BMNRCapitalEvent[] {
  return BMNR_CAPITAL_EVENTS.filter((event) => event.type === type);
}

/**
 * Helper function to get events within a date range
 */
export function getBMNREventsInRange(startDate: string, endDate: string): BMNRCapitalEvent[] {
  return BMNR_CAPITAL_EVENTS.filter(
    (event) => event.date >= startDate && event.date <= endDate
  );
}

/**
 * Helper function to get ETH holdings at a specific date
 */
export function getETHHoldingsAt(date: string): number | null {
  const ethEvents = BMNR_CAPITAL_EVENTS.filter(
    (event) => event.type === "ETH" && event.date <= date && event.ethHoldings !== undefined
  ).sort((a, b) => b.date.localeCompare(a.date));

  return ethEvents.length > 0 ? ethEvents[0].ethHoldings! : null;
}

/**
 * Helper function to calculate total shares issued from equity events
 */
export function getTotalSharesIssued(): number {
  return BMNR_CAPITAL_EVENTS.filter((event) => event.type === "EQUITY")
    .reduce((sum, event) => sum + (event.sharesIssued || 0), 0);
}
