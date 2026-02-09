"use client";

import { useMemo } from "react";
import { Company } from "@/lib/types";
// Import and re-export server-safe getCompanyMNAV for backwards compatibility
import { getCompanyMNAV, type PricesData } from "@/lib/utils/mnav-calculation";
export { getCompanyMNAV, type PricesData };

export interface MNAVStats {
  median: number;
  average: number;
  count: number;
  mnavs: number[]; // Individual mNAV values for distribution charts
  contributors: { ticker: string; mnav: number }[]; // Companies that contributed to stats
  excluded: string[]; // Companies that couldn't calculate mNAV
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
 * Uses getCompanyMNAV for each company to ensure consistency.
 * Filters out outliers (mNAV >= 10) to avoid skewing median/average.
 */
export function useMNAVStats(
  companies: Company[],
  prices: PricesData
): MNAVStats {
  return useMemo(() => {
    if (!companies.length || !prices) {
      return { median: 0, average: 0, count: 0, mnavs: [], contributors: [], excluded: [] };
    }

    // Track which companies contribute and which are excluded
    const contributors: { ticker: string; mnav: number }[] = [];
    const excluded: string[] = [];

    // Filter outliers for stats (mNAV >= 10x companies like miners with small treasuries)
    companies.forEach((company) => {
      const mnav = getCompanyMNAV(company, prices, true);
      if (mnav !== null) {
        contributors.push({ ticker: company.ticker, mnav });
      } else {
        excluded.push(company.ticker);
      }
    });

    // Sort contributors by mNAV for display
    contributors.sort((a, b) => a.mnav - b.mnav);

    const mnavs = contributors.map(c => c.mnav);

    if (mnavs.length === 0) {
      return { median: 0, average: 0, count: 0, mnavs: [], contributors: [], excluded };
    }

    return {
      median: median(mnavs),
      average: mnavs.reduce((a, b) => a + b, 0) / mnavs.length,
      count: mnavs.length,
      mnavs,
      contributors,
      excluded,
    };
  }, [companies, prices]);
}
