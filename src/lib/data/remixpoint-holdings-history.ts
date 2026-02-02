/**
 * Remixpoint (3825.T) Bitcoin Holdings History
 *
 * Compiled from TDnet filings, BitcoinTreasuries.net, and news sources.
 * Remixpoint began its crypto treasury strategy in late September 2024.
 *
 * NOTE: Unlike ANAP's detailed purchase-by-purchase filings, Remixpoint's
 * purchase data is harder to extract (PDFs not machine-readable). The early
 * 2024-2025 entries are estimated/milestone-based. Later entries from
 * BitcoinTreasuries have exact purchase amounts.
 *
 * Current verified data points:
 * - Nov 20, 2024: ~215.76 BTC (from Coinpost Japan)
 * - Late Nov 2024: ~250 BTC (after ¥500M announcement)
 * - Jan-Feb 2025: Individual purchases from TDnet PDFs
 * - Feb 2026: 1,411.30 BTC (from company website)
 *
 * Social:
 * - X/Twitter: https://x.com/remixpoint_x
 * - YouTube: https://www.youtube.com/@remixpoint_y
 */

export interface RemixpointHoldingsEntry {
  date: string;
  holdings: number;
  purchaseAmount?: number;
  source?: string;
  estimated?: boolean;
}

export const REMIXPOINT_HOLDINGS_HISTORY: RemixpointHoldingsEntry[] = [
  // === September 2024 - First Purchase ===
  {
    date: "2024-09-26",
    holdings: 50,
    purchaseAmount: 50,
    source: "TDnet - First crypto purchase",
    estimated: true,
  },
  {
    date: "2024-09-27",
    holdings: 75,
    purchaseAmount: 25,
    source: "TDnet progress update",
    estimated: true,
  },

  // === October 2024 ===
  {
    date: "2024-10-16",
    holdings: 125,
    purchaseAmount: 50,
    source: "TDnet progress update",
    estimated: true,
  },

  // === November 2024 ===
  {
    date: "2024-11-01",
    holdings: 160,
    purchaseAmount: 35,
    source: "TDnet - Crypto evaluation",
    estimated: true,
  },
  {
    date: "2024-11-14",
    holdings: 190,
    purchaseAmount: 30,
    source: "TDnet - BTC purchase announcement",
    estimated: true,
  },
  {
    date: "2024-11-20",
    holdings: 215.76,
    purchaseAmount: 25.76,
    source: "Coinpost Japan (verified)",
    estimated: false,
  },
  {
    date: "2024-11-25",
    holdings: 250.13,
    purchaseAmount: 34.37,
    source: "TDnet - ¥500M purchase announcement",
    estimated: false,
  },
  {
    date: "2024-11-28",
    holdings: 275,
    purchaseAmount: 24.87,
    source: "TDnet",
    estimated: true,
  },

  // === December 2024 ===
  {
    date: "2024-12-05",
    holdings: 310,
    purchaseAmount: 35,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2024-12-09",
    holdings: 345,
    purchaseAmount: 35,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2024-12-11",
    holdings: 380,
    purchaseAmount: 35,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2024-12-17",
    holdings: 420,
    purchaseAmount: 40,
    source: "TDnet",
    estimated: true,
  },

  // === January 2025 ===
  {
    date: "2025-01-06",
    holdings: 455,
    purchaseAmount: 35,
    source: "TDnet - Crypto evaluation",
    estimated: true,
  },
  {
    date: "2025-01-09",
    holdings: 490,
    purchaseAmount: 35,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-01-10",
    holdings: 525,
    purchaseAmount: 35,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-01-14",
    holdings: 560,
    purchaseAmount: 35,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-01-20",
    holdings: 595,
    purchaseAmount: 35,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-01-21",
    holdings: 630,
    purchaseAmount: 35,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-01-22",
    holdings: 665,
    purchaseAmount: 35,
    source: "TDnet",
    estimated: true,
  },
  // Verified from BitcoinTreasuries
  {
    date: "2025-01-28",
    holdings: 696.07,
    purchaseAmount: 31.0655484,
    source: "TDnet PDF (verified via BitcoinTreasuries)",
    estimated: false,
  },
  {
    date: "2025-01-30",
    holdings: 720,
    purchaseAmount: 23.93,
    source: "TDnet - Stock option announcement",
    estimated: true,
  },
  // Verified from BitcoinTreasuries
  {
    date: "2025-01-31",
    holdings: 750.9,
    purchaseAmount: 30.83564601,
    source: "TDnet PDF (verified via BitcoinTreasuries)",
    estimated: false,
  },

  // === February 2025 ===
  // Verified from BitcoinTreasuries
  {
    date: "2025-02-03",
    holdings: 778.09,
    purchaseAmount: 27.19238613,
    source: "TDnet PDF (verified via BitcoinTreasuries)",
    estimated: false,
  },
  {
    date: "2025-02-04",
    holdings: 810,
    purchaseAmount: 31.91,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-02-14",
    holdings: 845,
    purchaseAmount: 35,
    source: "TDnet - Q3 earnings",
    estimated: true,
  },
  // Verified from BitcoinTreasuries
  {
    date: "2025-02-27",
    holdings: 884.37,
    purchaseAmount: 39.37007874,
    source: "TDnet PDF (verified via BitcoinTreasuries)",
    estimated: false,
  },
  // Verified from BitcoinTreasuries
  {
    date: "2025-02-28",
    holdings: 924.48,
    purchaseAmount: 40.10748807,
    source: "TDnet PDF (verified via BitcoinTreasuries)",
    estimated: false,
  },

  // === March 2025 ===
  {
    date: "2025-03-03",
    holdings: 960,
    purchaseAmount: 35.52,
    source: "TDnet - Holdings status update",
    estimated: true,
  },

  // === April 2025 ===
  {
    date: "2025-04-24",
    holdings: 1010,
    purchaseAmount: 50,
    source: "TDnet",
    estimated: true,
  },

  // === May 2025 ===
  {
    date: "2025-05-14",
    holdings: 1050,
    purchaseAmount: 40,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-05-26",
    holdings: 1085,
    purchaseAmount: 35,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-05-27",
    holdings: 1120,
    purchaseAmount: 35,
    source: "TDnet",
    estimated: true,
  },

  // === June 2025 ===
  {
    date: "2025-06-05",
    holdings: 1145,
    purchaseAmount: 25,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-06-06",
    holdings: 1165,
    purchaseAmount: 20,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-06-09",
    holdings: 1185,
    purchaseAmount: 20,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-06-10",
    holdings: 1205,
    purchaseAmount: 20,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-06-11",
    holdings: 1225,
    purchaseAmount: 20,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-06-12",
    holdings: 1245,
    purchaseAmount: 20,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-06-13",
    holdings: 1265,
    purchaseAmount: 20,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-06-16",
    holdings: 1285,
    purchaseAmount: 20,
    source: "TDnet",
    estimated: true,
  },

  // === July 2025 ===
  {
    date: "2025-07-11",
    holdings: 1305,
    purchaseAmount: 20,
    source: "TDnet",
    estimated: true,
  },

  // === August 2025 ===
  {
    date: "2025-08-15",
    holdings: 1330,
    purchaseAmount: 25,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-08-25",
    holdings: 1355,
    purchaseAmount: 25,
    source: "TDnet",
    estimated: true,
  },

  // === September 2025 ===
  {
    date: "2025-09-18",
    holdings: 1375,
    purchaseAmount: 20,
    source: "TDnet",
    estimated: true,
  },

  // === October 2025 ===
  {
    date: "2025-10-06",
    holdings: 1385,
    purchaseAmount: 10,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-10-08",
    holdings: 1390,
    purchaseAmount: 5,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-10-09",
    holdings: 1395,
    purchaseAmount: 5,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-10-14",
    holdings: 1400,
    purchaseAmount: 5,
    source: "TDnet",
    estimated: true,
  },
  {
    date: "2025-10-15",
    holdings: 1405,
    purchaseAmount: 5,
    source: "TDnet",
    estimated: true,
  },

  // === November 2025 ===
  {
    date: "2025-11-04",
    holdings: 1411.3,
    purchaseAmount: 6.3,
    source: "TDnet - Final verified holdings",
    estimated: false,
  },
];

/**
 * Summary statistics
 * Note: Cost basis data not available from public sources
 */
export const REMIXPOINT_HOLDINGS_SUMMARY = {
  totalHoldings: 1411.29831101,
  totalCostBasis: null, // Not disclosed in detail
  averageCostPerBTC: null, // Not disclosed in detail
  currency: "JPY",
  parentCompany: "Remixpoint, Inc. (3825.T)",
  sharesOutstanding: 149039800,
  lastUpdated: "2026-02-02",
  firstPurchaseDate: "2024-09-26",
  // Other crypto holdings (from company website)
  otherHoldings: {
    ETH: 901.44672542,
    XRP: 1191204.799501,
    SOL: 13920.07255868,
    DOGE: 2802311.99657,
  },
  rankings: {
    japan: 4,
    world: 43,
  },
  social: {
    twitter: "https://x.com/remixpoint_x",
    youtube: "https://www.youtube.com/@remixpoint_y",
  },
};

/**
 * Get holdings as of a specific date
 */
export function getHoldingsAsOf(date: string): number {
  const entries = REMIXPOINT_HOLDINGS_HISTORY.filter((e) => e.date <= date);
  if (entries.length === 0) return 0;
  return entries[entries.length - 1].holdings;
}

/**
 * Get all purchases within a date range
 */
export function getPurchasesInRange(
  startDate: string,
  endDate: string
): RemixpointHoldingsEntry[] {
  return REMIXPOINT_HOLDINGS_HISTORY.filter(
    (e) => e.date >= startDate && e.date <= endDate
  );
}

/**
 * Get only verified (non-estimated) entries
 */
export function getVerifiedEntries(): RemixpointHoldingsEntry[] {
  return REMIXPOINT_HOLDINGS_HISTORY.filter((e) => !e.estimated);
}
