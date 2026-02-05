/**
 * Stock split data for price adjustment
 * 
 * When Yahoo Finance or other sources don't properly adjust historical prices,
 * we apply these adjustments manually.
 * 
 * Format: ratio > 1 = reverse split (e.g., 30 = 1:30 reverse split, prices go up 30x)
 *         ratio < 1 = forward split (e.g., 0.1 = 10:1 split, prices go down 10x)
 */

export interface StockSplit {
  date: string;       // YYYY-MM-DD - effective date
  ratio: number;      // Multiplier for pre-split prices
  description: string;
}

export const STOCK_SPLITS: Record<string, StockSplit[]> = {
  // SBET - 1:30 reverse split
  'SBET': [
    {
      date: '2025-01-06',  // Effective date of reverse split
      ratio: 30,
      description: '1:30 reverse split',
    },
  ],
  
  // BMNR - 1:20 reverse split
  'BMNR': [
    {
      date: '2025-05-15',
      ratio: 20,
      description: '1:20 reverse split',
    },
  ],
  
  // HSDT - 1:50 reverse split
  'HSDT': [
    {
      date: '2025-06-20',  // Approximate
      ratio: 50,
      description: '1:50 reverse split',
    },
  ],
  
  // NXTT - 1:200 reverse split
  'NXTT': [
    {
      date: '2025-09-15',  // Approximate
      ratio: 200,
      description: '1:200 reverse split',
    },
  ],
  
  // 3350.T (Metaplanet) - 10:1 forward split
  '3350.T': [
    {
      date: '2024-10-01',
      ratio: 0.1,
      description: '10:1 forward split',
    },
  ],
};

/**
 * Get the adjustment factor for a price at a given date
 * Returns the multiplier to apply to normalize the price to current basis
 */
export function getSplitAdjustmentFactor(ticker: string, priceDate: string): number {
  const splits = STOCK_SPLITS[ticker.toUpperCase()];
  if (!splits || splits.length === 0) return 1;
  
  let factor = 1;
  const priceDateObj = new Date(priceDate);
  
  for (const split of splits) {
    const splitDateObj = new Date(split.date);
    // If price is from before the split, apply adjustment
    if (priceDateObj < splitDateObj) {
      factor *= split.ratio;
    }
  }
  
  return factor;
}

/**
 * Adjust an array of historical prices for stock splits
 */
export function adjustPricesForSplits(
  ticker: string,
  prices: Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }>
): Array<{ time: string; open: number; high: number; low: number; close: number; volume: number }> {
  const splits = STOCK_SPLITS[ticker.toUpperCase()];
  if (!splits || splits.length === 0) return prices;
  
  return prices.map(price => {
    const factor = getSplitAdjustmentFactor(ticker, price.time);
    if (factor === 1) return price;
    
    return {
      ...price,
      open: price.open * factor,
      high: price.high * factor,
      low: price.low * factor,
      close: price.close * factor,
      // Volume goes inverse of price
      volume: Math.round(price.volume / factor),
    };
  });
}
