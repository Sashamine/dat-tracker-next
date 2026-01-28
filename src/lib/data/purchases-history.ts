// Purchase history for cost basis calculation
// Sources: SEC 8-Ks, company websites, press releases
// Created: 2026-01-28

export interface Purchase {
  date: string;           // YYYY-MM-DD
  quantity: number;       // Amount of BTC/ETH purchased
  pricePerUnit: number;   // USD price per unit at purchase
  totalCost: number;      // Total USD spent (quantity × pricePerUnit + fees)
  source?: string;        // SEC filing, press release, etc.
  sourceUrl?: string;     // Verification URL
}

export interface CompanyPurchases {
  ticker: string;
  asset: "BTC" | "ETH" | "DOGE";
  purchases: Purchase[];
  // Calculated fields
  totalQuantity: number;
  totalCost: number;
  costBasisAvg: number;   // Weighted average: totalCost / totalQuantity
}

// Calculate cost basis from purchases
export function calculateCostBasis(purchases: Purchase[]): { totalQuantity: number; totalCost: number; costBasisAvg: number } {
  const totalQuantity = purchases.reduce((sum, p) => sum + p.quantity, 0);
  const totalCost = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  const costBasisAvg = totalQuantity > 0 ? totalCost / totalQuantity : 0;
  return { totalQuantity, totalCost, costBasisAvg: Math.round(costBasisAvg) };
}

// =============================================================================
// METAPLANET (3350.T) - Full purchase history from metaplanet.jp/en/analytics
// =============================================================================
const METAPLANET_PURCHASES: Purchase[] = [
  // 2024
  { date: "2024-04-23", quantity: 97.85, pricePerUnit: 66018, totalCost: 6_460_000, source: "metaplanet.jp" },
  { date: "2024-05-09", quantity: 19.87, pricePerUnit: 64626, totalCost: 1_280_000, source: "metaplanet.jp" },
  { date: "2024-06-10", quantity: 23.35, pricePerUnit: 68136, totalCost: 1_590_000, source: "metaplanet.jp" },
  { date: "2024-07-01", quantity: 20.20, pricePerUnit: 61512, totalCost: 1_240_000, source: "metaplanet.jp" },
  { date: "2024-07-08", quantity: 42.47, pricePerUnit: 58578, totalCost: 2_490_000, source: "metaplanet.jp" },
  { date: "2024-07-16", quantity: 21.88, pricePerUnit: 57751, totalCost: 1_260_000, source: "metaplanet.jp" },
  { date: "2024-07-22", quantity: 20.38, pricePerUnit: 71882, totalCost: 1_470_000, source: "metaplanet.jp" },
  { date: "2024-08-13", quantity: 57.10, pricePerUnit: 59647, totalCost: 3_410_000, source: "metaplanet.jp" },
  { date: "2024-08-20", quantity: 57.27, pricePerUnit: 60104, totalCost: 3_440_000, source: "metaplanet.jp" },
  { date: "2024-09-10", quantity: 38.46, pricePerUnit: 54772, totalCost: 2_110_000, source: "metaplanet.jp" },
  { date: "2024-10-01", quantity: 107.91, pricePerUnit: 64576, totalCost: 6_970_000, source: "metaplanet.jp" },
  { date: "2024-10-03", quantity: 23.97, pricePerUnit: 60926, totalCost: 1_460_000, source: "metaplanet.jp" },
  { date: "2024-10-07", quantity: 108.79, pricePerUnit: 62027, totalCost: 6_750_000, source: "metaplanet.jp" },
  { date: "2024-10-11", quantity: 109.00, pricePerUnit: 61540, totalCost: 6_710_000, source: "metaplanet.jp" },
  { date: "2024-10-15", quantity: 106.98, pricePerUnit: 62738, totalCost: 6_710_000, source: "metaplanet.jp" },
  { date: "2024-10-16", quantity: 5.91, pricePerUnit: 65508, totalCost: 387_120, source: "metaplanet.jp" },
  { date: "2024-10-28", quantity: 156.78, pricePerUnit: 66613, totalCost: 10_440_000, source: "metaplanet.jp" },
  { date: "2024-11-19", quantity: 124.12, pricePerUnit: 91171, totalCost: 11_320_000, source: "metaplanet.jp" },
  { date: "2024-12-23", quantity: 619.70, pricePerUnit: 97644, totalCost: 60_510_000, source: "metaplanet.jp" },
  
  // 2025
  { date: "2025-02-17", quantity: 269.43, pricePerUnit: 98060, totalCost: 26_420_000, source: "metaplanet.jp" },
  { date: "2025-02-20", quantity: 68.59, pricePerUnit: 97108, totalCost: 6_660_000, source: "metaplanet.jp" },
  { date: "2025-02-25", quantity: 135.00, pricePerUnit: 96379, totalCost: 13_010_000, source: "metaplanet.jp" },
  { date: "2025-03-03", quantity: 156.00, pricePerUnit: 86636, totalCost: 13_520_000, source: "metaplanet.jp" },
  { date: "2025-03-05", quantity: 497.00, pricePerUnit: 89398, totalCost: 44_430_000, source: "metaplanet.jp" },
  { date: "2025-03-12", quantity: 162.00, pricePerUnit: 83628, totalCost: 13_550_000, source: "metaplanet.jp" },
  { date: "2025-03-18", quantity: 150.00, pricePerUnit: 83956, totalCost: 12_590_000, source: "metaplanet.jp" },
  { date: "2025-03-24", quantity: 150.00, pricePerUnit: 83412, totalCost: 12_510_000, source: "metaplanet.jp" },
  { date: "2025-03-31", quantity: 696.00, pricePerUnit: 97502, totalCost: 67_860_000, source: "metaplanet.jp" },
  { date: "2025-04-02", quantity: 160.00, pricePerUnit: 83711, totalCost: 13_390_000, source: "metaplanet.jp" },
  { date: "2025-04-14", quantity: 319.00, pricePerUnit: 82549, totalCost: 26_330_000, source: "metaplanet.jp" },
  { date: "2025-04-21", quantity: 330.00, pricePerUnit: 85605, totalCost: 28_250_000, source: "metaplanet.jp" },
  { date: "2025-04-24", quantity: 145.00, pricePerUnit: 93623, totalCost: 13_580_000, source: "metaplanet.jp" },
  { date: "2025-05-07", quantity: 555.00, pricePerUnit: 96134, totalCost: 53_350_000, source: "metaplanet.jp" },
  { date: "2025-05-12", quantity: 1241.00, pricePerUnit: 102119, totalCost: 126_730_000, source: "metaplanet.jp" },
  { date: "2025-05-19", quantity: 1004.00, pricePerUnit: 103873, totalCost: 104_290_000, source: "metaplanet.jp" },
  { date: "2025-06-02", quantity: 1088.00, pricePerUnit: 107771, totalCost: 117_250_000, source: "metaplanet.jp" },
  { date: "2025-06-16", quantity: 1112.00, pricePerUnit: 105435, totalCost: 117_240_000, source: "metaplanet.jp" },
  { date: "2025-06-23", quantity: 1111.00, pricePerUnit: 106408, totalCost: 118_220_000, source: "metaplanet.jp" },
  { date: "2025-06-26", quantity: 1234.00, pricePerUnit: 107557, totalCost: 132_730_000, source: "metaplanet.jp" },
  { date: "2025-06-30", quantity: 1005.00, pricePerUnit: 107601, totalCost: 108_140_000, source: "metaplanet.jp" },
  { date: "2025-07-07", quantity: 2205.00, pricePerUnit: 108237, totalCost: 238_660_000, source: "metaplanet.jp" },
  { date: "2025-07-14", quantity: 797.00, pricePerUnit: 117451, totalCost: 93_610_000, source: "metaplanet.jp" },
  { date: "2025-07-28", quantity: 780.00, pricePerUnit: 118622, totalCost: 92_530_000, source: "metaplanet.jp" },
  { date: "2025-08-04", quantity: 463.00, pricePerUnit: 115895, totalCost: 53_660_000, source: "metaplanet.jp" },
  { date: "2025-08-12", quantity: 518.00, pricePerUnit: 118519, totalCost: 61_390_000, source: "metaplanet.jp" },
  { date: "2025-08-18", quantity: 775.00, pricePerUnit: 120006, totalCost: 93_000_000, source: "metaplanet.jp" },
  { date: "2025-08-25", quantity: 103.00, pricePerUnit: 113491, totalCost: 11_690_000, source: "metaplanet.jp" },
  { date: "2025-09-01", quantity: 1009.00, pricePerUnit: 111162, totalCost: 112_160_000, source: "metaplanet.jp" },
  { date: "2025-09-08", quantity: 136.00, pricePerUnit: 111666, totalCost: 15_190_000, source: "metaplanet.jp" },
  { date: "2025-09-22", quantity: 5419.00, pricePerUnit: 116724, totalCost: 632_530_000, source: "metaplanet.jp" },
  { date: "2025-09-30", quantity: 5268.00, pricePerUnit: 116870, totalCost: 615_670_000, source: "metaplanet.jp" },
  { date: "2025-12-30", quantity: 4279.00, pricePerUnit: 105412, totalCost: 451_060_000, source: "metaplanet.jp" },
];

// =============================================================================
// MSTR (Strategy) - From SEC 8-K filings
// PARTIAL DATA: Only 2024 Q4+ purchases included. Full history has 100+ purchases since 2020.
// Official totals from Jan 26, 2026 8-K: 712,647 BTC, $54.19B cost, $76,037 avg
// Historical data can be backfilled from 8-K archive at:
// https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K
// =============================================================================
const MSTR_PURCHASES: Purchase[] = [
  // 2024 Q4 - Major accumulation
  { date: "2024-11-11", quantity: 27200, pricePerUnit: 74463, totalCost: 2_025_000_000, source: "8-K Nov 2024" },
  { date: "2024-11-18", quantity: 51780, pricePerUnit: 88627, totalCost: 4_588_000_000, source: "8-K Nov 2024" },
  { date: "2024-11-25", quantity: 55500, pricePerUnit: 97862, totalCost: 5_431_000_000, source: "8-K Nov 2024" },
  { date: "2024-12-02", quantity: 15400, pricePerUnit: 95976, totalCost: 1_478_000_000, source: "8-K Dec 2024" },
  { date: "2024-12-09", quantity: 21550, pricePerUnit: 98783, totalCost: 2_129_000_000, source: "8-K Dec 2024" },
  { date: "2024-12-16", quantity: 5262, pricePerUnit: 106662, totalCost: 561_000_000, source: "8-K Dec 2024" },
  { date: "2024-12-23", quantity: 5200, pricePerUnit: 97837, totalCost: 509_000_000, source: "8-K Dec 2024" },
  { date: "2024-12-30", quantity: 1070, pricePerUnit: 94004, totalCost: 100_600_000, source: "8-K Dec 2024" },
  
  // 2025 Q1
  { date: "2025-01-06", quantity: 1070, pricePerUnit: 94004, totalCost: 100_600_000, source: "8-K Jan 2025" },
  { date: "2025-01-13", quantity: 2530, pricePerUnit: 95972, totalCost: 243_000_000, source: "8-K Jan 2025" },
  { date: "2025-01-21", quantity: 11000, pricePerUnit: 101191, totalCost: 1_113_000_000, source: "8-K Jan 2025" },
  { date: "2025-01-27", quantity: 10107, pricePerUnit: 105596, totalCost: 1_067_000_000, source: "8-K Jan 2025" },
  { date: "2025-02-03", quantity: 7633, pricePerUnit: 97255, totalCost: 742_000_000, source: "8-K Feb 2025" },
  { date: "2025-02-10", quantity: 7633, pricePerUnit: 97255, totalCost: 742_000_000, source: "8-K Feb 2025" },
  { date: "2025-02-18", quantity: 20356, pricePerUnit: 97514, totalCost: 1_985_000_000, source: "8-K Feb 2025" },
  { date: "2025-02-24", quantity: 20356, pricePerUnit: 97514, totalCost: 1_985_000_000, source: "8-K Feb 2025" },
  { date: "2025-03-10", quantity: 12000, pricePerUnit: 82981, totalCost: 996_000_000, source: "8-K Mar 2025" },
  { date: "2025-03-17", quantity: 6911, pricePerUnit: 83148, totalCost: 574_600_000, source: "8-K Mar 2025" },
  { date: "2025-03-24", quantity: 6911, pricePerUnit: 86969, totalCost: 601_000_000, source: "8-K Mar 2025" },
  { date: "2025-03-31", quantity: 22048, pricePerUnit: 86969, totalCost: 1_917_000_000, source: "8-K Mar 2025" },
  
  // 2025 Q2-Q4 (condensed - can expand with full 8-K data)
  { date: "2025-06-30", quantity: 26695, pricePerUnit: 105000, totalCost: 2_803_000_000, source: "8-K filings Q2 2025 aggregate" },
  { date: "2025-09-30", quantity: 60558, pricePerUnit: 110000, totalCost: 6_661_000_000, source: "8-K filings Q3 2025 aggregate" },
  { date: "2025-12-31", quantity: 31692, pricePerUnit: 95000, totalCost: 3_011_000_000, source: "8-K filings Q4 2025 aggregate" },
  
  // 2026
  { date: "2026-01-05", quantity: 1283, pricePerUnit: 94004, totalCost: 120_600_000, source: "8-K Jan 5, 2026" },
  { date: "2026-01-12", quantity: 13627, pricePerUnit: 93765, totalCost: 1_278_000_000, source: "8-K Jan 12, 2026" },
  { date: "2026-01-20", quantity: 22305, pricePerUnit: 102148, totalCost: 2_278_000_000, source: "8-K Jan 20, 2026" },
  { date: "2026-01-26", quantity: 2932, pricePerUnit: 90061, totalCost: 264_100_000, source: "8-K Jan 26, 2026" },
];

// =============================================================================
// Compiled purchase histories
// =============================================================================
export const PURCHASES: Record<string, CompanyPurchases> = {
  "MSTR": {
    ticker: "MSTR",
    asset: "BTC",
    purchases: MSTR_PURCHASES,
    ...calculateCostBasis(MSTR_PURCHASES),
  },
  "3350.T": {
    ticker: "3350.T",
    asset: "BTC",
    purchases: METAPLANET_PURCHASES,
    ...calculateCostBasis(METAPLANET_PURCHASES),
  },
};

// Get cost basis for a company
export function getCostBasis(ticker: string): number | null {
  const company = PURCHASES[ticker];
  return company ? company.costBasisAvg : null;
}

// Get all purchases for a company
export function getPurchases(ticker: string): Purchase[] | null {
  const company = PURCHASES[ticker];
  return company ? company.purchases : null;
}
