/**
 * Risk-Adjusted Holdings Per Share
 * 
 * Adjusts raw HPS growth for:
 * 1. mNAV premium/discount - paying more means growth is worth less
 * 2. Leverage - debt-funded growth carries more risk
 * 
 * Formula: Adjusted HPS Growth = Raw HPS Growth / mNAV × (1 - leverage)
 * Where:
 *   - mNAV = Market Cap / Crypto NAV
 *   - leverage = Net Debt / Crypto NAV
 *   - (1 - leverage) = "distance to blowup" - how much crypto can drop before equity wipeout
 */

import { getHoldingsHistory, HoldingsSnapshot } from './holdings-history';

export interface AdjustedHPSSnapshot extends HoldingsSnapshot {
  // Crypto price at this date (needed for NAV calculation)
  cryptoPrice: number;
  
  // Calculated values
  cryptoNav: number;           // holdings × cryptoPrice
  equityNav: number;           // cryptoNav + cash - debt
  mNav: number;                // marketCap / cryptoNav
  leverage: number;            // netDebt / cryptoNav (0 if net cash)
  
  // Adjusted metrics
  adjustedHPS: number;         // HPS adjusted for leverage (in crypto terms)
  
  // Growth (vs previous period)
  rawHPSGrowth?: number;       // (hps_t1 - hps_t0) / hps_t0
  adjustedHPSGrowth?: number;  // rawGrowth / mNAV × (1 - leverage)
}

export interface AdjustedHPSHistory {
  ticker: string;
  asset: string;
  history: AdjustedHPSSnapshot[];
  
  // Summary metrics (latest period)
  latestRawGrowth?: number;
  latestAdjustedGrowth?: number;
  latestMNav?: number;
  latestLeverage?: number;
  
  // Cumulative (all time)
  cumulativeRawGrowth?: number;
  cumulativeAdjustedGrowth?: number;
}

/**
 * Calculate adjusted HPS history for a company
 * Only includes data points where we have all required fields
 */
export function getAdjustedHPSHistory(
  ticker: string,
  cryptoPrices: Record<string, number> // date -> price mapping
): AdjustedHPSHistory | null {
  const rawHistory = getHoldingsHistory(ticker);
  if (!rawHistory) return null;
  
  const adjustedHistory: AdjustedHPSSnapshot[] = [];
  
  for (let i = 0; i < rawHistory.history.length; i++) {
    const snapshot = rawHistory.history[i];
    
    // Need stock price and crypto price to calculate mNAV
    const cryptoPrice = cryptoPrices[snapshot.date] || snapshot.stockPrice; // fallback
    const stockPrice = snapshot.stockPrice;
    
    // Skip if missing required data
    if (!stockPrice || !cryptoPrice) continue;
    
    const holdings = snapshot.holdings;
    const shares = snapshot.sharesOutstandingDiluted;
    const debt = snapshot.totalDebt || 0;
    const cash = snapshot.cash || 0;
    const hps = snapshot.holdingsPerShare;
    
    // Calculate NAVs
    const cryptoNav = holdings * cryptoPrice;
    const netDebt = Math.max(0, debt - cash);
    const equityNav = cryptoNav + cash - debt;
    
    // Calculate mNAV and leverage
    const marketCap = stockPrice * shares;
    const mNav = cryptoNav > 0 ? marketCap / cryptoNav : 1;
    const leverage = cryptoNav > 0 ? netDebt / cryptoNav : 0;
    
    // Adjusted HPS (in crypto terms, accounting for leverage)
    // This represents "equity-equivalent holdings per share"
    const adjustedHPS = hps * (1 - leverage);
    
    // Calculate growth vs previous point
    let rawHPSGrowth: number | undefined;
    let adjustedHPSGrowth: number | undefined;
    
    if (adjustedHistory.length > 0) {
      const prev = adjustedHistory[adjustedHistory.length - 1];
      
      if (prev.holdingsPerShare > 0) {
        rawHPSGrowth = (hps - prev.holdingsPerShare) / prev.holdingsPerShare;
      }
      
      // Adjusted growth = raw growth / mNAV × (1 - leverage)
      if (rawHPSGrowth !== undefined) {
        adjustedHPSGrowth = rawHPSGrowth / mNav * (1 - leverage);
      }
    }
    
    adjustedHistory.push({
      ...snapshot,
      cryptoPrice,
      cryptoNav,
      equityNav,
      mNav,
      leverage,
      adjustedHPS,
      rawHPSGrowth,
      adjustedHPSGrowth,
    });
  }
  
  if (adjustedHistory.length === 0) return null;
  
  // Calculate summary metrics
  const latest = adjustedHistory[adjustedHistory.length - 1];
  const first = adjustedHistory[0];
  
  // Cumulative growth
  const cumulativeRawGrowth = first.holdingsPerShare > 0
    ? (latest.holdingsPerShare - first.holdingsPerShare) / first.holdingsPerShare
    : undefined;
  
  const cumulativeAdjustedGrowth = first.adjustedHPS > 0
    ? (latest.adjustedHPS - first.adjustedHPS) / first.adjustedHPS
    : undefined;
  
  return {
    ticker,
    asset: rawHistory.asset,
    history: adjustedHistory,
    latestRawGrowth: latest.rawHPSGrowth,
    latestAdjustedGrowth: latest.adjustedHPSGrowth,
    latestMNav: latest.mNav,
    latestLeverage: latest.leverage,
    cumulativeRawGrowth,
    cumulativeAdjustedGrowth,
  };
}

/**
 * Calculate adjusted growth for a single period
 * Useful for displaying in earnings table
 */
export function calculateAdjustedGrowth(
  rawGrowth: number,
  mNav: number,
  leverage: number
): number {
  return rawGrowth / mNav * (1 - leverage);
}

/**
 * Break down the adjustment into components
 * Shows how much each factor penalizes/rewards growth
 */
export function getGrowthBreakdown(
  rawGrowth: number,
  mNav: number,
  leverage: number
): {
  rawGrowth: number;
  afterMNavPenalty: number;
  afterLeveragePenalty: number;
  mNavDrag: number;
  leverageDrag: number;
} {
  const afterMNavPenalty = rawGrowth / mNav;
  const afterLeveragePenalty = afterMNavPenalty * (1 - leverage);
  
  return {
    rawGrowth,
    afterMNavPenalty,
    afterLeveragePenalty,
    mNavDrag: rawGrowth - afterMNavPenalty,
    leverageDrag: afterMNavPenalty - afterLeveragePenalty,
  };
}
