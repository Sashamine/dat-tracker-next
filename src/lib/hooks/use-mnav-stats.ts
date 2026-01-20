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

export type PricesData = {
  crypto: Record<string, { price: number }>;
  stocks: Record<string, any>;
  forex?: Record<string, number>;  // Live forex rates (e.g., JPY: 156)
} | null | undefined;

// Calculate median of array
function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate mNAV for a single company.
 * This is the single source of truth for mNAV calculation.
 * Used by both individual company pages and aggregate stats.
 */
export function getCompanyMNAV(
  company: Company,
  prices: PricesData
): number | null {
  if (!prices || company.pendingMerger) return null;

  const cryptoPrice = prices.crypto[company.asset]?.price || 0;
  const stockData = prices.stocks[company.ticker];
  // Use live forex rates for non-USD stocks (e.g., Metaplanet)
  const { marketCap } = getMarketCap(company, stockData, prices.forex);

  const mnav = calculateMNAV(
    marketCap,
    company.holdings,
    cryptoPrice,
    company.cashReserves || 0,
    company.otherInvestments || 0,
    company.totalDebt || 0,
    company.preferredEquity || 0
  );

  // Return null for invalid mNAV (same filtering as stats)
  if (mnav === null || mnav <= 0 || mnav >= 10) return null;
  return mnav;
}

/**
 * Single source of truth for mNAV statistics.
 * Uses getCompanyMNAV for each company to ensure consistency.
 */
export function useMNAVStats(
  companies: Company[],
  prices: PricesData
): MNAVStats {
  return useMemo(() => {
    if (!companies.length || !prices) {
      return { median: 0, average: 0, count: 0, mnavs: [] };
    }

    const mnavs = companies
      .map((company) => getCompanyMNAV(company, prices))
      .filter((mnav): mnav is number => mnav !== null);

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
