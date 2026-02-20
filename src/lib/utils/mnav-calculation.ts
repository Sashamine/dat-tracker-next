/**
 * Server-safe mNAV Calculation
 * ============================
 * 
 * Pure functions for mNAV calculation that can be used in both
 * client components and server-side API routes.
 * 
 * This is extracted from use-mnav-stats.ts to avoid "use client" issues.
 */

import { Company } from "@/lib/types";
import { calculateMNAV } from "@/lib/calculations";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";

export type PricesData = {
  crypto: Record<string, { price: number }>;
  stocks: Record<string, any>;
  forex?: Record<string, number>;
  lst?: Record<string, { exchangeRate: number; provider: string; fetchedAt: string }>;
} | null | undefined;

/**
 * Calculate mNAV for a single company.
 * This is the single source of truth for mNAV calculation.
 * 
 * @param filterOutliers - If true, returns null for mNAV >= 10 (for stats). Default false.
 */
export function getCompanyMNAV(
  company: Company,
  prices: PricesData,
  filterOutliers: boolean = false
): number | null {
  if (!prices || company.pendingMerger) return null;

  // Use official mNAV from company dashboard if available
  if (company.officialMnav && company.officialMnav > 0) {
    return company.officialMnav;
  }

  const cryptoPrice = prices.crypto[company.asset]?.price || 0;
  const stockData = prices.stocks[company.ticker];
  
  // Get market cap with dilution adjustments
  const { marketCap, inTheMoneyDebtValue, inTheMoneyWarrantProceeds } = getMarketCapForMnavSync(company, stockData, prices.forex);

  // If we have no market cap data at all, mNAV is meaningless — return null
  // (This happens when stock price feeds are unavailable, e.g. no FMP API key,
  // or the stock isn't in FALLBACK_STOCKS. Without market cap, EV is just
  // debt + preferred - cash, which produces a misleadingly low mNAV.)
  if (!marketCap || marketCap <= 0) return null;

  // Adjust debt by subtracting in-the-money convertible face values
  const adjustedDebt = Math.max(0, (company.totalDebt || 0) - inTheMoneyDebtValue);

  // Add in-the-money warrant exercise proceeds to cash
  const adjustedCashReserves = (company.cashReserves || 0) + inTheMoneyWarrantProceeds;
  const adjustedRestrictedCash = (company.restrictedCash || 0) + inTheMoneyWarrantProceeds;

  // Calculate secondary crypto holdings value
  let secondaryCryptoValue = 0;
  if (company.secondaryCryptoHoldings && company.secondaryCryptoHoldings.length > 0) {
    for (const holding of company.secondaryCryptoHoldings) {
      const price = prices.crypto[holding.asset]?.price || 0;
      secondaryCryptoValue += holding.amount * price;
    }
  }

  // Add crypto investments to Crypto NAV
  if (company.cryptoInvestments && company.cryptoInvestments.length > 0) {
    for (const investment of company.cryptoInvestments) {
      if (investment.type === "lst" && investment.lstAmount) {
        const price = prices.crypto[investment.underlyingAsset]?.price || 0;
        let exchangeRate = investment.exchangeRate || 1;
        if (investment.lstConfigId && prices.lst?.[investment.lstConfigId]) {
          exchangeRate = prices.lst[investment.lstConfigId].exchangeRate;
        }
        const underlyingAmount = investment.lstAmount * exchangeRate;
        secondaryCryptoValue += underlyingAmount * price;
      } else if (investment.type === "lst" && investment.underlyingAmount) {
        const price = prices.crypto[investment.underlyingAsset]?.price || 0;
        secondaryCryptoValue += investment.underlyingAmount * price;
      } else {
        secondaryCryptoValue += investment.fairValue;
      }
    }
  }

  const mnav = calculateMNAV(
    marketCap,
    company.holdings,
    cryptoPrice,
    adjustedCashReserves,
    company.otherInvestments || 0,
    adjustedDebt,
    company.preferredEquity || 0,
    adjustedRestrictedCash,
    secondaryCryptoValue
  );

  // Filter outliers if requested (for aggregate stats)
  if (filterOutliers && mnav !== null && mnav >= 10) {
    return null;
  }

  return mnav;
}
