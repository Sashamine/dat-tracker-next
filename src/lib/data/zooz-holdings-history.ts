// ZOOZ Power (ZOOZ) Bitcoin Holdings History
// Source: https://treasury.zoozpower.com
// Last updated: 2026-02-02

export interface ZOOZHoldingsEntry {
  date: string; // YYYY-MM-DD
  btcAcquired: number;
  avgCostUsd: number;
  totalCostUsd: number;
  cumulativeBtc: number;
  basicShares: number;
  dilutedShares: number;
  source?: string;
}

export const zoozHoldingsHistory: ZOOZHoldingsEntry[] = [
  {
    date: "2025-09-28",
    btcAcquired: 108,
    avgCostUsd: 110_501,
    totalCostUsd: 11_934_108,
    cumulativeBtc: 108,
    basicShares: 161_900_000,
    dilutedShares: 269_100_000,
    source: "First BTC purchase - treasury.zoozpower.com",
  },
  {
    date: "2025-09-29",
    btcAcquired: 137.68,
    avgCostUsd: 113_666,
    totalCostUsd: 15_650_000,
    cumulativeBtc: 245.68,
    basicShares: 161_900_000,
    dilutedShares: 269_100_000,
    source: "treasury.zoozpower.com",
  },
  {
    date: "2025-09-30",
    btcAcquired: 279.24,
    avgCostUsd: 114_487,
    totalCostUsd: 31_970_000,
    cumulativeBtc: 524.92,
    basicShares: 161_900_000,
    dilutedShares: 269_100_000,
    source: "treasury.zoozpower.com",
  },
  {
    date: "2025-10-06",
    btcAcquired: 329.11,
    avgCostUsd: 124_563,
    totalCostUsd: 40_990_000,
    cumulativeBtc: 854.03,
    basicShares: 161_900_000,
    dilutedShares: 269_100_000,
    source: "Largest single purchase - treasury.zoozpower.com",
  },
  {
    date: "2025-10-10",
    btcAcquired: 77.88,
    avgCostUsd: 111_285,
    totalCostUsd: 8_670_000,
    cumulativeBtc: 931.90,
    basicShares: 161_900_000,
    dilutedShares: 269_100_000,
    source: "treasury.zoozpower.com",
  },
  {
    date: "2025-10-11",
    btcAcquired: 16.17,
    avgCostUsd: 112_472,
    totalCostUsd: 1_820_000,
    cumulativeBtc: 948.07,
    basicShares: 161_900_000,
    dilutedShares: 269_100_000,
    source: "treasury.zoozpower.com",
  },
  {
    date: "2025-10-16",
    btcAcquired: 88.89,
    avgCostUsd: 111_415,
    totalCostUsd: 9_900_000,
    cumulativeBtc: 1036.96,
    basicShares: 161_900_000,
    dilutedShares: 269_100_000,
    source: "treasury.zoozpower.com",
  },
  {
    date: "2025-11-05",
    btcAcquired: 10,
    avgCostUsd: 101_902,
    totalCostUsd: 1_019_020,
    cumulativeBtc: 1046.96,
    basicShares: 162_000_000,
    dilutedShares: 269_200_000,
    source: "Latest purchase - treasury.zoozpower.com",
  },
];

/**
 * Get cumulative BTC holdings as of a specific date (for mNAV chart)
 */
export function getHoldingsAsOf(date: string): number {
  const entries = zoozHoldingsHistory.filter(e => e.date <= date);
  if (entries.length === 0) return 0;
  return entries[entries.length - 1].cumulativeBtc;
}

// Helper function to get full entry at a specific date
export function getHoldingsAtDate(targetDate: string): ZOOZHoldingsEntry | null {
  const entries = zoozHoldingsHistory.filter(e => e.date <= targetDate);
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

// Get total purchases in a date range
export function getPurchasesInRange(startDate: string, endDate: string): ZOOZHoldingsEntry[] {
  return zoozHoldingsHistory.filter(e => e.date >= startDate && e.date <= endDate);
}
