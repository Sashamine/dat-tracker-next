import { Company, CryptoInvestment } from "@/lib/types";
import { getMarketCapForMnavSync } from "@/lib/utils/market-cap";
import { calculateMNAV } from "@/lib/calculations";

export type PricesData = {
  crypto: Record<string, { price: number }>;
  stocks: Record<string, any>;
  forex?: Record<string, number>;
  lst?: Record<string, { exchangeRate: number; provider: string; fetchedAt: string }>;
} | null | undefined;

export interface MNAVCalculationResult {
  mnav: number | null;
  cryptoNavUsd: number;
  evUsd: number;
  assets: string[];
  warnings: string[];
}

/**
 * Calculates the value of a single CryptoInvestment (Fund, ETF, LST).
 */
function getInvestmentValue(inv: CryptoInvestment, prices: PricesData, warnings: string[]): number {
  if (!prices) return inv.fairValue || 0;

  const price = prices.crypto[inv.underlyingAsset]?.price;
  if (inv.type === "lst" && (inv.lstAmount || inv.underlyingAmount)) {
    if (!price) {
      warnings.push(`Missing price for ${inv.underlyingAsset} (Investment: ${inv.name})`);
      return 0;
    }
    
    if (inv.lstAmount) {
      let exchangeRate = inv.exchangeRate || 1;
      if (inv.lstConfigId && prices.lst?.[inv.lstConfigId]) {
        exchangeRate = prices.lst[inv.lstConfigId].exchangeRate;
      }
      return inv.lstAmount * exchangeRate * price;
    } 
    
    return (inv.underlyingAmount || 0) * price;
  }

  // Funds and Equities usually report a static USD fairValue in filings
  if (!inv.fairValue) {
    warnings.push(`Static fair value is 0 or missing for ${inv.name}`);
  }
  return inv.fairValue || 0;
}

/**
 * Calculates the Total Crypto NAV for a company, summing all verified holdings.
 */
export function calculateTotalCryptoNAV(
  company: Company,
  prices: PricesData
): { totalUsd: number; primaryAssetAmount: number; primaryAssetPrice: number; secondaryCryptoValue: number; assets: string[]; warnings: string[] } {
  const warnings: string[] = [];
  const assets: string[] = [];
  
  if (!prices) return { totalUsd: 0, primaryAssetAmount: 0, primaryAssetPrice: 0, secondaryCryptoValue: 0, assets, warnings: ["No price data available"] };

  const primaryAsset = company.asset === 'MULTI' ? 'BTC' : company.asset;
  let primaryAssetAmount = company.holdings || 0;
  let primaryAssetPrice = prices.crypto[primaryAsset]?.price || 0;
  
  if (primaryAssetAmount > 0) {
    assets.push(primaryAsset);
    if (primaryAssetPrice === 0) warnings.push(`Missing price for primary asset ${primaryAsset}`);
  }

  let secondaryCryptoValue = 0;

  // 1. Process Multi-Asset holdings from D1 (if available)
  if (company.multiHoldings) {
    for (const [asset, amount] of Object.entries(company.multiHoldings)) {
      if (amount <= 0) continue;
      const price = prices.crypto[asset]?.price || 0;
      
      if (!assets.includes(asset)) assets.push(asset);
      if (price === 0) warnings.push(`Missing price for ${asset}`);

      if (asset === primaryAsset) {
        primaryAssetAmount = amount;
        primaryAssetPrice = price;
      } else {
        secondaryCryptoValue += amount * price;
      }
    }
  }

  // 2. Add static secondaryCryptoHoldings (Direct holdings not yet in D1)
  if (company.secondaryCryptoHoldings) {
    for (const holding of company.secondaryCryptoHoldings) {
      // DEDUPE: Only skip if the exact asset is already in D1 multiHoldings
      if (company.multiHoldings && company.multiHoldings[holding.asset] !== undefined) continue;
      
      const price = prices.crypto[holding.asset]?.price || 0;
      if (!assets.includes(holding.asset)) assets.push(holding.asset);
      if (price === 0) warnings.push(`Missing price for ${holding.asset}`);
      
      secondaryCryptoValue += holding.amount * price;
    }
  }

  // 3. Add Crypto Investments (Funds, LSTs, Equity)
  // These are NEVER deduplicated against direct holdings
  if (company.cryptoInvestments) {
    for (const investment of company.cryptoInvestments) {
      if (!assets.includes(investment.underlyingAsset)) assets.push(investment.underlyingAsset);
      secondaryCryptoValue += getInvestmentValue(investment, prices, warnings);
    }
  }

  const totalUsd = (primaryAssetAmount * primaryAssetPrice) + secondaryCryptoValue;

  return { totalUsd, primaryAssetAmount, primaryAssetPrice, secondaryCryptoValue, assets, warnings };
}

/**
 * Centralized mNAV engine.
 */
export function getCompanyMNAV(
  company: Company,
  prices: PricesData,
  filterOutliers: boolean = false
): number | null {
  const result = getCompanyMNAVDetailed(company, prices, filterOutliers);
  return result.mnav;
}

/**
 * Detailed mNAV engine that returns warnings and component breakdown.
 */
export function getCompanyMNAVDetailed(
  company: Company,
  prices: PricesData,
  filterOutliers: boolean = false
): MNAVCalculationResult {
  const empty: MNAVCalculationResult = { mnav: null, cryptoNavUsd: 0, evUsd: 0, assets: [], warnings: [] };
  
  if (!prices || company.pendingMerger) return empty;

  // Use official mNAV if provided (manual override)
  if (company.officialMnav && company.officialMnav > 0) {
    return { ...empty, mnav: company.officialMnav, warnings: ["Using official company-reported mNAV"] };
  }

  const stockData = prices.stocks[company.ticker];
  const { marketCap, inTheMoneyDebtValue, inTheMoneyWarrantProceeds } = getMarketCapForMnavSync(company, stockData, prices.forex);

  if (!marketCap || marketCap <= 0) return { ...empty, warnings: [`Missing market cap for ${company.ticker}`] };

  const { totalUsd: cryptoNav, primaryAssetAmount, primaryAssetPrice, secondaryCryptoValue, assets, warnings } = calculateTotalCryptoNAV(company, prices);

  const totalCV = cryptoNav + inTheMoneyWarrantProceeds;
  if (totalCV <= 0) return { ...empty, assets, warnings: [...warnings, "Total Crypto NAV is zero"] };

  const adjustedDebt = Math.max(0, (company.totalDebt ?? 0) - inTheMoneyDebtValue);
  // Warrant proceeds add to cash but NOT restricted cash — they represent
  // real incoming cash that increases free cash and reduces EV.
  const adjustedCashReserves = (company.cashReserves ?? 0) + inTheMoneyWarrantProceeds;
  const adjustedRestrictedCash = (company.restrictedCash ?? 0);

  const mnav = calculateMNAV(
    marketCap,
    primaryAssetAmount,
    primaryAssetPrice,
    adjustedCashReserves,
    company.otherInvestments ?? 0,
    adjustedDebt,
    company.preferredEquity ?? 0,
    adjustedRestrictedCash,
    secondaryCryptoValue
  );

  const finalMnav = (filterOutliers && mnav !== null && mnav >= 10) ? null : mnav;

  return {
    mnav: finalMnav,
    cryptoNavUsd: totalCV,
    evUsd: marketCap + adjustedDebt + (company.preferredEquity || 0) - (company.cashReserves || 0) - (company.otherInvestments ?? 0),
    assets,
    warnings
  };
}
