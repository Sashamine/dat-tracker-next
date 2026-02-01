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
  lst?: Record<string, { exchangeRate: number; provider: string; fetchedAt: string }>;  // LST exchange rates
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
  // Also get inTheMoneyDebtValue and inTheMoneyWarrantProceeds for symmetric dilution treatment
  const { marketCap, source, inTheMoneyDebtValue, inTheMoneyWarrantProceeds } = getMarketCapForMnavSync(company, stockData, prices.forex);

  // Adjust debt by subtracting in-the-money convertible face values
  // This avoids double-counting: ITM converts are in diluted shares AND debt
  // We treat them as equity (in share count), so remove from debt
  const adjustedDebt = Math.max(0, (company.totalDebt || 0) - inTheMoneyDebtValue);

  // Add in-the-money warrant exercise proceeds to both cash and restricted cash
  // Symmetric treatment: if we count warrant dilution (shares), we should count the incoming cash
  // - Adding to cashReserves: keeps freeCash unchanged (doesn't distort EV)
  // - Adding to restrictedCash: adds to CryptoNAV (treat as "pre-crypto" cash)
  // This is analogous to how we subtract ITM convert face value from debt
  const adjustedCashReserves = (company.cashReserves || 0) + inTheMoneyWarrantProceeds;
  const adjustedRestrictedCash = (company.restrictedCash || 0) + inTheMoneyWarrantProceeds;

  // Debug logging for Metaplanet, BTBT, KULR, MSTR, HYPD, and TWAV
  if (company.ticker === '3350.T' || company.ticker === 'BTBT' || company.ticker === 'KULR' || company.ticker === 'MSTR' || company.ticker === 'HYPD' || company.ticker === 'TWAV') {
    console.log(`[mNAV Debug] ${company.ticker}:`, {
      stockPrice: stockData?.price,
      forexJPY: prices.forex?.JPY,
      sharesForMnav: company.sharesForMnav,
      calculatedMarketCap: marketCap,
      marketCapSource: source,
      cryptoPrice,
      holdings: company.holdings,
      cashReserves: company.cashReserves,
      adjustedCashReserves,
      restrictedCash: company.restrictedCash,
      adjustedRestrictedCash,
      totalDebt: company.totalDebt,
      inTheMoneyDebtValue,
      adjustedDebt,
      inTheMoneyWarrantProceeds,
      freeCash: adjustedCashReserves - adjustedRestrictedCash,  // Should equal original freeCash
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

  // Add crypto investments to Crypto NAV
  // - For LSTs: use dynamic exchange rate × lstAmount × cryptoPrice
  // - For funds/ETFs: use fairValue (static value from SEC filing)
  if (company.cryptoInvestments && company.cryptoInvestments.length > 0) {
    for (const investment of company.cryptoInvestments) {
      if (investment.type === "lst" && investment.lstAmount) {
        // LST: calculate underlying amount using dynamic exchange rate if available
        const price = prices.crypto[investment.underlyingAsset]?.price || 0;

        // Try to get dynamic exchange rate from prices.lst
        let exchangeRate = investment.exchangeRate || 1; // Static fallback
        if (investment.lstConfigId && prices.lst?.[investment.lstConfigId]) {
          exchangeRate = prices.lst[investment.lstConfigId].exchangeRate;
        }

        // Calculate: lstAmount × exchangeRate × cryptoPrice
        const underlyingAmount = investment.lstAmount * exchangeRate;
        secondaryCryptoValue += underlyingAmount * price;
      } else if (investment.type === "lst" && investment.underlyingAmount) {
        // LST with static underlyingAmount (legacy/fallback)
        const price = prices.crypto[investment.underlyingAsset]?.price || 0;
        secondaryCryptoValue += investment.underlyingAmount * price;
      } else {
        // Fund/ETF/equity: use fair value from balance sheet
        secondaryCryptoValue += investment.fairValue;
      }
    }
  }

  const mnav = calculateMNAV(
    marketCap,
    company.holdings,
    cryptoPrice,
    adjustedCashReserves,  // Use adjusted cash (+ ITM warrant exercise proceeds)
    company.otherInvestments || 0,
    adjustedDebt,  // Use adjusted debt (totalDebt - ITM convertible face values)
    company.preferredEquity || 0,
    adjustedRestrictedCash,  // Use adjusted restrictedCash (+ ITM warrant exercise proceeds)
    secondaryCryptoValue
  );

  // Debug: log calculated mNAV for KULR
  if (company.ticker === 'KULR') {
    const cryptoNav = company.holdings * cryptoPrice;
    const freeCash = (company.cashReserves || 0) - (company.restrictedCash || 0);
    const ev = marketCap + adjustedDebt + (company.preferredEquity || 0) - freeCash;
    console.log(`[mNAV Debug] ${company.ticker} calculation:`, {
      cryptoNav,
      ev,
      mnav,
      expectedMnav: ev / cryptoNav,
    });
  }

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
