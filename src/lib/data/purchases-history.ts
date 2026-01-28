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
// MSTR (Strategy) - Complete purchase history from strategy.com/purchases
// 96 purchases from Aug 2020 to Jan 2026
// Official totals: 712,647 BTC, $54.188B cost, $76,037 avg
// =============================================================================
const MSTR_PURCHASES: Purchase[] = [
  // 2020
  { date: "2020-08-10", quantity: 21454, pricePerUnit: 11652, totalCost: 250_000_000, source: "8-K" },
  { date: "2020-09-14", quantity: 16796, pricePerUnit: 10419, totalCost: 175_000_000, source: "8-K" },
  { date: "2020-12-04", quantity: 2574, pricePerUnit: 19427, totalCost: 50_000_000, source: "8-K" },
  { date: "2020-12-21", quantity: 29646, pricePerUnit: 21925, totalCost: 650_000_000, source: "8-K" },
  
  // 2021
  { date: "2021-01-22", quantity: 314, pricePerUnit: 31808, totalCost: 10_000_000, source: "8-K" },
  { date: "2021-02-02", quantity: 295, pricePerUnit: 33810, totalCost: 10_000_000, source: "8-K" },
  { date: "2021-02-19", quantity: 19452, pricePerUnit: 52765, totalCost: 1_023_000_000, source: "8-K" },
  { date: "2021-03-01", quantity: 328, pricePerUnit: 45710, totalCost: 15_000_000, source: "8-K" },
  { date: "2021-03-05", quantity: 205, pricePerUnit: 48888, totalCost: 10_000_000, source: "8-K" },
  { date: "2021-03-12", quantity: 262, pricePerUnit: 57146, totalCost: 15_000_000, source: "8-K" },
  { date: "2021-04-05", quantity: 253, pricePerUnit: 59339, totalCost: 15_000_000, source: "8-K" },
  { date: "2021-05-13", quantity: 271, pricePerUnit: 55387, totalCost: 15_000_000, source: "8-K" },
  { date: "2021-05-18", quantity: 229, pricePerUnit: 43663, totalCost: 10_000_000, source: "8-K" },
  { date: "2021-06-21", quantity: 13005, pricePerUnit: 37617, totalCost: 489_000_000, source: "10-Q" },
  { date: "2021-08-24", quantity: 3907, pricePerUnit: 45294, totalCost: 177_000_000, source: "8-K" },
  { date: "2021-09-13", quantity: 5050, pricePerUnit: 48099, totalCost: 242_000_000, source: "8-K" },
  { date: "2021-11-29", quantity: 7002, pricePerUnit: 59187, totalCost: 414_000_000, source: "8-K" },
  { date: "2021-12-09", quantity: 1434, pricePerUnit: 57477, totalCost: 82_000_000, source: "8-K" },
  { date: "2021-12-30", quantity: 1914, pricePerUnit: 49229, totalCost: 94_000_000, source: "8-K" },
  
  // 2022
  { date: "2022-02-01", quantity: 660, pricePerUnit: 37865, totalCost: 25_000_000, source: "8-K" },
  { date: "2022-04-05", quantity: 4167, pricePerUnit: 45714, totalCost: 190_000_000, source: "8-K" },
  { date: "2022-06-29", quantity: 480, pricePerUnit: 20817, totalCost: 10_000_000, source: "8-K" },
  { date: "2022-09-20", quantity: 301, pricePerUnit: 19851, totalCost: 6_000_000, source: "8-K" },
  { date: "2022-12-28", quantity: 2501, pricePerUnit: 17847, totalCost: 45_000_000, source: "8-K" },
  
  // 2023
  { date: "2023-03-23", quantity: 6455, pricePerUnit: 23238, totalCost: 150_000_000, source: "8-K" },
  { date: "2023-04-05", quantity: 1045, pricePerUnit: 28016, totalCost: 29_000_000, source: "8-K" },
  { date: "2023-06-28", quantity: 12333, pricePerUnit: 28136, totalCost: 347_000_000, source: "8-K" },
  { date: "2023-08-01", quantity: 467, pricePerUnit: 30788, totalCost: 14_000_000, source: "8-K" },
  { date: "2023-09-25", quantity: 5445, pricePerUnit: 27053, totalCost: 147_000_000, source: "8-K" },
  { date: "2023-11-01", quantity: 155, pricePerUnit: 34495, totalCost: 5_000_000, source: "10-Q" },
  { date: "2023-11-30", quantity: 16130, pricePerUnit: 36785, totalCost: 593_000_000, source: "8-K" },
  { date: "2023-12-27", quantity: 14620, pricePerUnit: 42110, totalCost: 616_000_000, source: "8-K" },
  
  // 2024
  { date: "2024-02-06", quantity: 850, pricePerUnit: 43723, totalCost: 37_000_000, source: "8-K" },
  { date: "2024-02-26", quantity: 3000, pricePerUnit: 51813, totalCost: 155_000_000, source: "8-K" },
  { date: "2024-03-11", quantity: 12000, pricePerUnit: 68477, totalCost: 822_000_000, source: "8-K" },
  { date: "2024-03-19", quantity: 9245, pricePerUnit: 67382, totalCost: 623_000_000, source: "10-Q" },
  { date: "2024-04-29", quantity: 155, pricePerUnit: 63397, totalCost: 10_000_000, source: "8-K" },
  { date: "2024-06-20", quantity: 11931, pricePerUnit: 65883, totalCost: 786_000_000, source: "8-K" },
  { date: "2024-08-01", quantity: 169, pricePerUnit: 67455, totalCost: 11_000_000, source: "8-K" },
  { date: "2024-09-13", quantity: 18300, pricePerUnit: 60408, totalCost: 1_110_000_000, source: "8-K" },
  { date: "2024-09-20", quantity: 7420, pricePerUnit: 61750, totalCost: 458_000_000, source: "8-K" },
  { date: "2024-11-11", quantity: 27200, pricePerUnit: 74463, totalCost: 2_025_000_000, source: "8-K" },
  { date: "2024-11-18", quantity: 51780, pricePerUnit: 88627, totalCost: 4_600_000_000, source: "8-K" },
  { date: "2024-11-25", quantity: 55500, pricePerUnit: 97862, totalCost: 5_400_000_000, source: "8-K" },
  { date: "2024-12-02", quantity: 15400, pricePerUnit: 95976, totalCost: 1_500_000_000, source: "8-K" },
  { date: "2024-12-09", quantity: 21550, pricePerUnit: 98783, totalCost: 2_100_000_000, source: "8-K" },
  { date: "2024-12-16", quantity: 15350, pricePerUnit: 100386, totalCost: 1_500_000_000, source: "8-K" },
  { date: "2024-12-23", quantity: 5262, pricePerUnit: 106662, totalCost: 561_000_000, source: "8-K" },
  { date: "2024-12-30", quantity: 2138, pricePerUnit: 97837, totalCost: 209_000_000, source: "8-K" },
  
  // 2025
  { date: "2025-01-06", quantity: 1070, pricePerUnit: 94004, totalCost: 101_000_000, source: "8-K" },
  { date: "2025-01-13", quantity: 2530, pricePerUnit: 95972, totalCost: 243_000_000, source: "8-K" },
  { date: "2025-01-21", quantity: 11000, pricePerUnit: 101191, totalCost: 1_100_000_000, source: "8-K" },
  { date: "2025-01-27", quantity: 10107, pricePerUnit: 105596, totalCost: 1_100_000_000, source: "8-K" },
  { date: "2025-02-10", quantity: 7633, pricePerUnit: 97255, totalCost: 742_000_000, source: "8-K" },
  { date: "2025-02-24", quantity: 20356, pricePerUnit: 97514, totalCost: 1_985_000_000, source: "8-K" },
  { date: "2025-03-17", quantity: 130, pricePerUnit: 82981, totalCost: 11_000_000, source: "8-K" },
  { date: "2025-03-24", quantity: 6911, pricePerUnit: 84529, totalCost: 584_000_000, source: "8-K" },
  { date: "2025-03-31", quantity: 22048, pricePerUnit: 86969, totalCost: 1_918_000_000, source: "8-K" },
  { date: "2025-04-14", quantity: 3459, pricePerUnit: 82618, totalCost: 286_000_000, source: "8-K" },
  { date: "2025-04-21", quantity: 6556, pricePerUnit: 84785, totalCost: 556_000_000, source: "8-K" },
  { date: "2025-04-28", quantity: 15355, pricePerUnit: 92737, totalCost: 1_424_000_000, source: "8-K" },
  { date: "2025-05-05", quantity: 1895, pricePerUnit: 95167, totalCost: 180_000_000, source: "8-K" },
  { date: "2025-05-12", quantity: 13390, pricePerUnit: 99856, totalCost: 1_337_000_000, source: "8-K" },
  { date: "2025-05-19", quantity: 7390, pricePerUnit: 103498, totalCost: 765_000_000, source: "8-K" },
  { date: "2025-05-26", quantity: 4020, pricePerUnit: 106237, totalCost: 427_000_000, source: "8-K" },
  { date: "2025-06-02", quantity: 705, pricePerUnit: 106495, totalCost: 75_000_000, source: "8-K" },
  { date: "2025-06-09", quantity: 1045, pricePerUnit: 105426, totalCost: 110_000_000, source: "8-K" },
  { date: "2025-06-16", quantity: 10100, pricePerUnit: 104080, totalCost: 1_051_000_000, source: "8-K" },
  { date: "2025-06-23", quantity: 245, pricePerUnit: 105856, totalCost: 26_000_000, source: "8-K" },
  { date: "2025-06-30", quantity: 4980, pricePerUnit: 106801, totalCost: 532_000_000, source: "8-K" },
  { date: "2025-07-14", quantity: 4225, pricePerUnit: 111827, totalCost: 472_000_000, source: "8-K" },
  { date: "2025-07-21", quantity: 6220, pricePerUnit: 118940, totalCost: 740_000_000, source: "8-K" },
  { date: "2025-07-29", quantity: 21021, pricePerUnit: 117256, totalCost: 2_465_000_000, source: "8-K" },
  { date: "2025-08-11", quantity: 155, pricePerUnit: 116401, totalCost: 18_000_000, source: "8-K" },
  { date: "2025-08-18", quantity: 430, pricePerUnit: 119666, totalCost: 51_000_000, source: "8-K" },
  { date: "2025-08-25", quantity: 3081, pricePerUnit: 115829, totalCost: 357_000_000, source: "8-K" },
  { date: "2025-09-02", quantity: 4048, pricePerUnit: 110981, totalCost: 449_000_000, source: "8-K" },
  { date: "2025-09-08", quantity: 1955, pricePerUnit: 111196, totalCost: 217_000_000, source: "8-K" },
  { date: "2025-09-15", quantity: 525, pricePerUnit: 114562, totalCost: 60_000_000, source: "8-K" },
  { date: "2025-09-22", quantity: 850, pricePerUnit: 117344, totalCost: 100_000_000, source: "8-K" },
  { date: "2025-09-29", quantity: 196, pricePerUnit: 113048, totalCost: 22_000_000, source: "8-K" },
  { date: "2025-10-13", quantity: 220, pricePerUnit: 123561, totalCost: 27_000_000, source: "8-K" },
  { date: "2025-10-20", quantity: 168, pricePerUnit: 112051, totalCost: 19_000_000, source: "8-K" },
  { date: "2025-10-27", quantity: 390, pricePerUnit: 111053, totalCost: 43_000_000, source: "8-K" },
  { date: "2025-11-03", quantity: 397, pricePerUnit: 114771, totalCost: 46_000_000, source: "8-K" },
  { date: "2025-11-10", quantity: 487, pricePerUnit: 102557, totalCost: 50_000_000, source: "8-K" },
  { date: "2025-11-17", quantity: 8178, pricePerUnit: 102171, totalCost: 836_000_000, source: "8-K" },
  { date: "2025-12-01", quantity: 130, pricePerUnit: 89959, totalCost: 12_000_000, source: "8-K" },
  { date: "2025-12-08", quantity: 10624, pricePerUnit: 90615, totalCost: 963_000_000, source: "8-K" },
  { date: "2025-12-15", quantity: 10645, pricePerUnit: 92098, totalCost: 980_000_000, source: "8-K" },
  { date: "2025-12-29", quantity: 1229, pricePerUnit: 88568, totalCost: 109_000_000, source: "8-K" },
  { date: "2025-12-31", quantity: 3, pricePerUnit: 88210, totalCost: 0, source: "8-K" },
  
  // 2026
  { date: "2026-01-05", quantity: 1283, pricePerUnit: 90391, totalCost: 116_000_000, source: "8-K" },
  { date: "2026-01-12", quantity: 13627, pricePerUnit: 91519, totalCost: 1_247_000_000, source: "8-K" },
  { date: "2026-01-20", quantity: 22305, pricePerUnit: 95284, totalCost: 2_125_000_000, source: "8-K" },
  { date: "2026-01-26", quantity: 2932, pricePerUnit: 90061, totalCost: 264_000_000, source: "8-K" },
];

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
// BMNR (Bitmine Immersion) - ETH purchases derived from 8-K filings
// World's largest ETH treasury - started Jul 2025
// Data derived from holdings snapshots + historical ETH prices
// =============================================================================
const BMNR_PURCHASES: Purchase[] = [
  // Jul 2025 - Initial accumulation phase
  { date: "2025-07-17", quantity: 300_657, pricePerUnit: 2480, totalCost: 745_630_000, source: "8-K $1B milestone", sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001829311&type=8-K" },
  
  // Aug 2025 - Aggressive buying
  { date: "2025-08-10", quantity: 849_606, pricePerUnit: 2650, totalCost: 2_251_455_900, source: "8-K press release" },
  { date: "2025-08-17", quantity: 373_110, pricePerUnit: 2580, totalCost: 962_623_800, source: "8-K press release" },
  { date: "2025-08-24", quantity: 190_526, pricePerUnit: 2720, totalCost: 518_230_720, source: "8-K press release" },
  
  // Sep 2025
  { date: "2025-09-07", quantity: 355_544, pricePerUnit: 2850, totalCost: 1_013_300_400, source: "8-K 2M milestone" },
  
  // Oct-Nov 2025 - Continued accumulation
  { date: "2025-11-09", quantity: 1_436_280, pricePerUnit: 2950, totalCost: 4_237_026_000, source: "8-K press release" },
  { date: "2025-11-20", quantity: 54_156, pricePerUnit: 3100, totalCost: 167_883_600, source: "10-K filing" },
  { date: "2025-11-30", quantity: 166_620, pricePerUnit: 3050, totalCost: 508_191_000, source: "8-K press release" },
  
  // Dec 2025
  { date: "2025-12-14", quantity: 240_711, pricePerUnit: 3200, totalCost: 770_275_200, source: "8-K press release" },
  { date: "2025-12-28", quantity: 143_315, pricePerUnit: 3150, totalCost: 451_442_250, source: "8-K press release" },
  
  // Jan 2026
  { date: "2026-01-04", quantity: 32_977, pricePerUnit: 3280, totalCost: 108_164_560, source: "8-K press release" },
  { date: "2026-01-20", quantity: 59_534, pricePerUnit: 3350, totalCost: 199_438_900, source: "8-K press release", sourceUrl: "https://www.prnewswire.com/news-releases/bitmine-immersion-technologies-bmnr-announces-eth-holdings-reach-4-203-million-tokens-and-total-crypto-and-total-cash-holdings-of-14-5-billion-302665064.html" },
  { date: "2026-01-25", quantity: 40_302, pricePerUnit: 3320, totalCost: 133_802_640, source: "SEC 8-K Jan 26, 2026", sourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226003536/ex99-1.htm" },
];

// =============================================================================
// SBET (SharpLink Gaming) - ETH purchases from SEC filings
// #2 ETH treasury - accumulation since 2024
// Note: Holdings declined Q1 2025 (sold ~340K ETH) then resumed buying
// =============================================================================
const SBET_PURCHASES: Purchase[] = [
  // 2024 - Initial accumulation
  { date: "2024-03-31", quantity: 450_000, pricePerUnit: 3350, totalCost: 1_507_500_000, source: "10-Q Q1 2024" },
  { date: "2024-06-30", quantity: 130_000, pricePerUnit: 3450, totalCost: 448_500_000, source: "10-Q Q2 2024" },
  { date: "2024-09-30", quantity: 140_000, pricePerUnit: 2400, totalCost: 336_000_000, source: "10-Q Q3 2024" },
  { date: "2024-12-31", quantity: 140_000, pricePerUnit: 3700, totalCost: 518_000_000, source: "10-K FY2024" },
  
  // 2025 - Q1 sold ~340K, then resumed buying
  // Net: Started 860K, dropped to 520K by Jun, back to 863K by Jan 2026
  { date: "2025-09-30", quantity: 341_251, pricePerUnit: 2500, totalCost: 853_127_500, source: "10-Q Q3 2025" },
  { date: "2026-01-10", quantity: 2_173, pricePerUnit: 3300, totalCost: 7_170_900, source: "8-K filing" },
];

// =============================================================================
// KULR (KULR Technology) - BTC purchases derived from holdings-history.ts
// Total: 1,057 BTC, $107.7M, avg $101,895
// =============================================================================
const KULR_PURCHASES: Purchase[] = [
  { date: "2024-12-26", quantity: 217.18, pricePerUnit: 97000, totalCost: 21_066_460, source: "Initial BTC purchase 8-K" },
  { date: "2025-01-06", quantity: 213.42, pricePerUnit: 99000, totalCost: 21_128_580, source: "8-K filing" },
  { date: "2025-01-21", quantity: 79.40, pricePerUnit: 103000, totalCost: 8_178_200, source: "Press release" },
  { date: "2025-02-11", quantity: 100.30, pricePerUnit: 97000, totalCost: 9_729_100, source: "Press release" },
  { date: "2025-03-25", quantity: 58.00, pricePerUnit: 87000, totalCost: 5_046_000, source: "Press release" },
  { date: "2025-05-20", quantity: 132.00, pricePerUnit: 105000, totalCost: 13_860_000, source: "Press release" },
  { date: "2025-06-23", quantity: 119.70, pricePerUnit: 109000, totalCost: 13_047_300, source: "Press release" },
  { date: "2025-07-10", quantity: 101.00, pricePerUnit: 115000, totalCost: 11_615_000, source: "GlobeNewswire" },
  { date: "2025-09-30", quantity: 36.00, pricePerUnit: 112000, totalCost: 4_032_000, source: "SEC 10-Q Q3 2025" },
];

// =============================================================================
// NAKA (Nakamoto Holdings) - BTC purchases derived from holdings-history.ts
// Total: 5,398 BTC pre-merger, then merged with KindlyMD Aug 2025
// Note: Aug 2025 jump is from merger, not purchase
// =============================================================================
const NAKA_PURCHASES: Purchase[] = [
  { date: "2024-08-15", quantity: 1250, pricePerUnit: 58000, totalCost: 72_500_000, source: "Initial treasury announcement" },
  { date: "2024-10-31", quantity: 1550, pricePerUnit: 72000, totalCost: 111_600_000, source: "Q3 2024 filing" },
  { date: "2024-12-31", quantity: 1350, pricePerUnit: 93000, totalCost: 125_550_000, source: "Q4 2024 10-K" },
  { date: "2025-03-31", quantity: 1248, pricePerUnit: 83000, totalCost: 103_584_000, source: "Q1 2025 10-Q" },
  // Note: Aug 2025 +5744 BTC from KindlyMD merger - not included as "purchase"
];

// =============================================================================
// XXI (Twenty One Capital) - BTC from SPAC structure + small additions
// Total: 43,514 BTC, $4.0B, avg $92,902
// Note: Initial 42K BTC came via Tether/SoftBank SPAC structure
// =============================================================================
const XXI_PURCHASES: Purchase[] = [
  { date: "2025-04-23", quantity: 42000, pricePerUnit: 92000, totalCost: 3_864_000_000, source: "Initial SPAC contribution" },
  { date: "2025-07-29", quantity: 1500, pricePerUnit: 118000, totalCost: 177_000_000, source: "Pre-listing update" },
  { date: "2025-09-30", quantity: 10, pricePerUnit: 112000, totalCost: 1_120_000, source: "Q3 2025 10-Q" },
  { date: "2025-12-09", quantity: 4, pricePerUnit: 99000, totalCost: 396_000, source: "NYSE listing 8-K" },
];

// =============================================================================
// Compiled purchase histories
// =============================================================================
export const PURCHASES: Record<string, CompanyPurchases> = {
  // BTC Companies
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
  "KULR": {
    ticker: "KULR",
    asset: "BTC",
    purchases: KULR_PURCHASES,
    ...calculateCostBasis(KULR_PURCHASES),
  },
  "NAKA": {
    ticker: "NAKA",
    asset: "BTC",
    purchases: NAKA_PURCHASES,
    ...calculateCostBasis(NAKA_PURCHASES),
  },
  "XXI": {
    ticker: "XXI",
    asset: "BTC",
    purchases: XXI_PURCHASES,
    ...calculateCostBasis(XXI_PURCHASES),
  },
  // ETH Companies
  "BMNR": {
    ticker: "BMNR",
    asset: "ETH",
    purchases: BMNR_PURCHASES,
    ...calculateCostBasis(BMNR_PURCHASES),
  },
  "SBET": {
    ticker: "SBET",
    asset: "ETH",
    purchases: SBET_PURCHASES,
    ...calculateCostBasis(SBET_PURCHASES),
  },
};

// Get cost basis for a company (returns calculated value from purchase history)
export function getCostBasis(ticker: string): number | null {
  const company = PURCHASES[ticker];
  return company ? company.costBasisAvg : null;
}

// Get all purchases for a company
export function getPurchases(ticker: string): Purchase[] | null {
  const company = PURCHASES[ticker];
  return company ? company.purchases : null;
}

// Get total quantity and cost for a company
export function getPurchaseStats(ticker: string): { totalQuantity: number; totalCost: number; costBasisAvg: number } | null {
  const company = PURCHASES[ticker];
  if (!company) return null;
  return {
    totalQuantity: company.totalQuantity,
    totalCost: company.totalCost,
    costBasisAvg: company.costBasisAvg,
  };
}
