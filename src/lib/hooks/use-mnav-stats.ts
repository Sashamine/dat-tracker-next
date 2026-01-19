"use client";

import { useMemo } from "react";
import { Company } from "@/lib/types";
import { calculateMNAV } from "@/lib/calculations";
import { getMarketCap } from "@/lib/utils/market-cap";

export interface MNAVStats {
  median: number;
  average: number;
  count: number;
  mnavs: number[]; // Individual mNAV values for distribution charts
}

// Calculate median of array
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Single source of truth for mNAV statistics.
 * Filters out:
 * - Pending merger SPACs
 * - Companies with mNAV <= 0 or >= 10 (outliers)
 */
export function useMNAVStats(
  companies: Company[],
  prices: { crypto: Record<string, { price: number }>; stocks: Record<string, any> } | null | undefined
): MNAVStats {
  return useMemo(() => {
    if (!companies.length || !prices) {
      return { median: 0, average: 0, count: 0, mnavs: [] };
    }

    const mnavs = companies
      .filter((company) => !company.pendingMerger) // Exclude pre-merger SPACs
      .map((company) => {
        const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
        const stockData = prices?.stocks[company.ticker];
        const { marketCap } = getMarketCap(company, stockData);
        return calculateMNAV(
          marketCap,
          company.holdings,
          cryptoPrice,
          company.cashReserves || 0,
          company.otherInvestments || 0,
          company.totalDebt || 0,
          company.preferredEquity || 0
        );
      })
      .filter((mnav): mnav is number => mnav !== null && mnav > 0 && mnav < 10);

    if (mnavs.length === 0) {
      return { median: 0, average: 0, count: 0, mnavs: [] };
    }

    return {
      median: median(mnavs),
      average: mnavs.reduce((a, b) => a + b, 0) / mnavs.length,
      count: mnavs.length,
      mnavs,
    };
  }, [companies, prices]);
}
