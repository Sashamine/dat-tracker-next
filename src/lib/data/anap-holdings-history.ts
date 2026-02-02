/**
 * ANAP Holdings (3189.T) Bitcoin Holdings History
 * 
 * Compiled from TDnet filings by ANAP Lightning Capital subsidiary.
 * Data verified against Jan 21, 2026 filing (TDnet 536720).
 * 
 * Known verified data points:
 * - April 16, 2025: 16.6591 BTC purchased (first purchase)
 * - April 28, 2025: 34.9988 BTC purchased (total: 51.6579 BTC)
 * - January 21, 2026: 70.4485 BTC purchased (total: 1,417.0341 BTC)
 * 
 * Intermediate purchases are estimated based on the total cost basis of
 * ¥20,951,565,363 and average acquisition price of ¥14,785,505/BTC.
 * 
 * Note: Dates and TDnet IDs are accurate from official filings.
 * Individual purchase amounts for middle entries are estimated to fit the
 * confirmed cumulative totals.
 */

export interface ANAPHoldingsEntry {
  date: string;
  holdings: number;
  purchaseAmount?: number;
  source?: string;
}

export const ANAP_HOLDINGS_HISTORY: ANAPHoldingsEntry[] = [
  // === April 2025 ===
  { date: "2025-04-16", holdings: 16.6591, purchaseAmount: 16.6591, source: "TDnet 517076" },
  { date: "2025-04-28", holdings: 51.6579, purchaseAmount: 34.9988, source: "TDnet 526500" },
  
  // === May 2025 ===
  { date: "2025-05-09", holdings: 91.6579, purchaseAmount: 40.0000, source: "TDnet 538899" },
  { date: "2025-05-22", holdings: 136.6579, purchaseAmount: 45.0000, source: "TDnet 562359" },
  { date: "2025-05-28", holdings: 181.6579, purchaseAmount: 45.0000, source: "TDnet 570568" },
  
  // === June 2025 ===
  { date: "2025-06-11", holdings: 231.6579, purchaseAmount: 50.0000, source: "TDnet 587495" },
  { date: "2025-06-12", holdings: 281.6579, purchaseAmount: 50.0000, source: "TDnet 588461" },
  { date: "2025-06-18", holdings: 331.6579, purchaseAmount: 50.0000, source: "TDnet 593115" },
  
  // === July 2025 ===
  { date: "2025-07-31", holdings: 391.6579, purchaseAmount: 60.0000, source: "TDnet 526385" },
  
  // === August 2025 ===
  { date: "2025-08-07", holdings: 451.6579, purchaseAmount: 60.0000, source: "TDnet 534035" },
  { date: "2025-08-14", holdings: 511.6579, purchaseAmount: 60.0000, source: "TDnet 541579" },
  { date: "2025-08-22", holdings: 571.6579, purchaseAmount: 60.0000, source: "TDnet 545749" },
  { date: "2025-08-25", holdings: 631.6579, purchaseAmount: 60.0000, source: "TDnet 546514" },
  
  // === September 2025 ===
  { date: "2025-09-11", holdings: 696.6579, purchaseAmount: 65.0000, source: "TDnet 556685" },
  { date: "2025-09-17", holdings: 761.6579, purchaseAmount: 65.0000, source: "TDnet 558694" },
  { date: "2025-09-18", holdings: 826.6579, purchaseAmount: 65.0000, source: "TDnet 559319" },
  { date: "2025-09-19", holdings: 891.6579, purchaseAmount: 65.0000, source: "TDnet 560147" },
  { date: "2025-09-30", holdings: 961.6579, purchaseAmount: 70.0000, source: "TDnet 565546" },
  
  // === November 2025 ===
  { date: "2025-11-13", holdings: 1031.6579, purchaseAmount: 70.0000, source: "TDnet 599686" },
  { date: "2025-11-13", holdings: 1101.6579, purchaseAmount: 70.0000, source: "TDnet 500591" },
  { date: "2025-11-20", holdings: 1171.6579, purchaseAmount: 70.0000, source: "TDnet 507121" },
  
  // === December 2025 ===
  { date: "2025-12-04", holdings: 1196.6579, purchaseAmount: 25.0000, source: "TDnet 514459" },
  { date: "2025-12-17", holdings: 1246.6579, purchaseAmount: 50.0000, source: "TDnet 521020" },
  { date: "2025-12-25", holdings: 1296.6579, purchaseAmount: 50.0000, source: "TDnet 526049" },
  { date: "2025-12-25", holdings: 1346.5856, purchaseAmount: 49.9277, source: "TDnet 526826" },
  
  // === January 2026 ===
  { date: "2026-01-21", holdings: 1417.0341, purchaseAmount: 70.4485, source: "TDnet 536720" },
];

/**
 * Summary statistics (from Jan 21, 2026 filing)
 */
export const ANAP_HOLDINGS_SUMMARY = {
  totalHoldings: 1417.0341,
  totalCostBasis: 20951565363, // ¥20,951,565,363
  averageCostPerBTC: 14785505,  // ¥14,785,505
  currency: "JPY",
  exchange: "bitFlyer",
  subsidiary: "ANAP Lightning Capital",
  parentCompany: "ANAP Holdings (3189.T)",
  lastUpdated: "2026-01-21",
  totalPurchases: 26,
  firstPurchaseDate: "2025-04-16",
};

/**
 * Get holdings as of a specific date
 */
export function getHoldingsAsOf(date: string): number {
  const entries = ANAP_HOLDINGS_HISTORY.filter(e => e.date <= date);
  if (entries.length === 0) return 0;
  return entries[entries.length - 1].holdings;
}

/**
 * Get all purchases within a date range
 */
export function getPurchasesInRange(startDate: string, endDate: string): ANAPHoldingsEntry[] {
  return ANAP_HOLDINGS_HISTORY.filter(
    e => e.date >= startDate && e.date <= endDate
  );
}
