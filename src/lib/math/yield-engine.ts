import { Company } from "@/lib/types";
import { NETWORK_STAKING_APY } from "@/lib/calculations/constants";

export interface StakingYieldResult {
  annualRevenueUsd: number;
  isSelfSustaining: boolean;
  yieldToBurnRatio: number;
  breakdown: {
    asset: string;
    amount: number;
    price: number;
    apy: number;
    stakedAmount: number;
    annualYieldUsd: number;
  }[];
}

/**
 * Calculates the annual staking revenue for a company.
 * 
 * Formula: Annual Revenue = sum(Asset Amount * Asset Price * APY * stakingPct)
 */
export function calculateStakingYield(
  company: Company,
  prices: { crypto: Record<string, { price: number }> } | null | undefined
): StakingYieldResult {
  const breakdown: StakingYieldResult["breakdown"] = [];
  let totalAnnualYieldUsd = 0;

  if (!prices) {
    return {
      annualRevenueUsd: 0,
      isSelfSustaining: false,
      yieldToBurnRatio: 0,
      breakdown: [],
    };
  }

  // 1. Process Multi-Asset holdings from D1 (if available)
  if (company.multiHoldings) {
    for (const [asset, amount] of Object.entries(company.multiHoldings)) {
      if (amount <= 0) continue;
      
      const price = prices.crypto[asset]?.price || 0;
      // Use company specific APY if provided, otherwise network default
      const apy = company.stakingApy ?? (NETWORK_STAKING_APY[asset] || 0);
      const stakingPct = company.stakingPct ?? 0;
      
      const stakedAmount = amount * stakingPct;
      const annualYieldUsd = stakedAmount * price * apy;
      
      totalAnnualYieldUsd += annualYieldUsd;
      
      breakdown.push({
        asset,
        amount,
        price,
        apy,
        stakedAmount,
        annualYieldUsd,
      });
    }
  } 
  // 2. Fallback to Primary Asset
  else if (company.holdings > 0 && company.asset && company.asset !== 'MULTI') {
    const asset = company.asset;
    const amount = company.holdings;
    const price = prices.crypto[asset]?.price || 0;
    const apy = company.stakingApy ?? (NETWORK_STAKING_APY[asset] || 0);
    const stakingPct = company.stakingPct ?? 0;
    
    const stakedAmount = amount * stakingPct;
    const annualYieldUsd = stakedAmount * price * apy;
    
    totalAnnualYieldUsd += annualYieldUsd;
    
    breakdown.push({
      asset,
      amount,
      price,
      apy,
      stakedAmount,
      annualYieldUsd,
    });
  }

  // 3. Process Crypto Investments (LSTs, Funds)
  // These are separate economic positions and are NOT deduplicated against multiHoldings
  if (company.cryptoInvestments) {
    for (const inv of company.cryptoInvestments) {
      const asset = inv.underlyingAsset;
      const price = prices.crypto[asset]?.price || 0;
      
      // For LSTs, we assume the yield is the network APY (since the company is getting the exchange rate appreciation)
      const apy = NETWORK_STAKING_APY[asset] || 0;
      
      const amount = inv.underlyingAmount || (inv.lstAmount ? inv.lstAmount * (inv.exchangeRate || 1) : 0);
      const annualYieldUsd = amount * price * apy;
      
      totalAnnualYieldUsd += annualYieldUsd;
      
      if (amount > 0) {
        breakdown.push({
          asset,
          amount,
          price,
          apy,
          stakedAmount: amount,
          annualYieldUsd,
        });
      }
    }
  }

  const annualizedBurn = (company.quarterlyBurnUsd || 0) * 4;
  const totalAnnualObligations = annualizedBurn + (company.debtInterestAnnual || 0) + (company.preferredDividendAnnual || 0);
  
  const yieldToBurnRatio = totalAnnualObligations > 0 ? totalAnnualYieldUsd / totalAnnualObligations : 0;
  const isSelfSustaining = totalAnnualObligations > 0 && totalAnnualYieldUsd > totalAnnualObligations;

  return {
    annualRevenueUsd: totalAnnualYieldUsd,
    isSelfSustaining,
    yieldToBurnRatio,
    breakdown,
  };
}
