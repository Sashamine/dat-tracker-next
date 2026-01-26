"use client";

import { useMemo } from "react";
import { Company } from "@/lib/types";
import { calculateMNAV } from "@/lib/calculations";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";

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
 *
 * Priority:
 * 1. officialMnav - From official company dashboard (e.g., SharpLink's FD mNAV)
 * 2. Calculated - Using our EV/CryptoNAV formula
 *
 * @param filterOutliers - If true, returns null for mNAV >= 10 (for stats). Default false (show all).
 */
export function getCompanyMNAV(
  company: Company,
  prices: PricesData,
  filterOutliers: boolean = false
): number | null {
  if (!prices || company.pendingMerger) return null;

  // Use official mNAV from company dashboard if available (e.g., SBET from SharpLink)
  // This ensures we match the company's published FD mNAV methodology
  if (company.officialMnav && company.officialMnav > 0) {
    return company.officialMnav;
  }

  const cryptoPrice = prices.crypto[company.asset]?.price || 0;
  const stockData = prices.stocks[company.ticker];
  // Use sharesForMnav × price for accurate FD market cap (not API market cap)
  const { marketCap, source } = getMarketCapForMnavSync(company, stockData, prices.forex);

  // Debug logging for Metaplanet and BTBT
  if (company.ticker === '3350.T' || company.ticker === 'BTBT') {
    console.log(`[mNAV Debug] ${company.ticker}:`, {
      stockPrice: stockData?.price,
      forexJPY: prices.forex?.JPY,
      sharesForMnav: company.sharesForMnav,
      calculatedMarketCap: marketCap,
      marketCapSource: source,
      cryptoPrice,
      holdings: company.holdings,
    });
  }

  // Calculate secondary crypto holdings value (for multi-asset treasury companies)
  let secondaryCryptoValue = 0;
  if (company.secondaryCryptoHoldings && company.secondaryCryptoHoldings.length > 0) {
    for (const holding of company.secondaryCryptoHoldings) {
      const price = prices.crypto[holding.asset]?.price || 0;
      secondaryCryptoValue += holding.amount * price;
    }
  }

  const mnav = calculateMNAV(
    marketCap,
    company.holdings,
    cryptoPrice,
    company.cashReserves || 0,
    company.otherInvestments || 0,
    company.totalDebt || 0,
    company.preferredEquity || 0,
    company.restrictedCash || 0,
    secondaryCryptoValue
  );

  // Return null for invalid mNAV
  // Sanity check: reject values <= 0 or absurdly high (> 1000x indicates data error)
  if (mnav === null || mnav <= 0 || mnav > 1000) return null;

  // Optionally filter outliers (mNAV >= 10) for stats calculations
  if (filterOutliers && mnav >= 10) return null;

  return mnav;
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
      return { median: 0, average: 0, count: 0, mnavs: [] };
    }

    // Filter outliers for stats (mNAV >= 10x companies like miners with small treasuries)
    const mnavs = companies
      .map((company) => getCompanyMNAV(company, prices, true))
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
