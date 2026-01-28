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

  // ==================== TODO: Remaining Events ====================
  // The following events need to be parsed from 8-K filings:
  //
  // August 2025:
  // - Weekly ETH updates (multiple filings)
  // - ATM sales data
  //
  // September 2025:
  // - 10 weekly ETH updates
  // - Continued ATM sales
  // - ETH strategy acceleration
  //
  // October 2025:
  // - 7 weekly ETH updates
  // - ATM dilution tracking
  //
  // November 2025:
  // - 9 weekly ETH updates
  // - Passed 3M ETH milestone
  // - Share count grew to 408.6M
  //
  // December 2025:
  // - 9 weekly ETH updates
  // - Continued ATM sales
  //
  // January 2026:
  // - 9 weekly ETH updates (through Jan 26)
  // - Reached 4.2M ETH ($13.5B)
  // - 455M shares outstanding
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
