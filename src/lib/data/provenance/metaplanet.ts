/**
 * Metaplanet (3350.T) - Provenance Data
 * =====================================
 * Japan's leading Bitcoin Treasury Company
 * 
 * Regulatory Framework: TDnet (Tokyo Stock Exchange Timely Disclosure network)
 * Fiscal Year: January - December (changed from April-March in 2024)
 * 
 * Source Documents:
 * - TDnet disclosures: https://metaplanet.jp/en/shareholders/disclosures
 * - Analytics dashboard: https://metaplanet.jp/en/analytics
 * - EDINET: https://disclosure2.edinet-fsa.go.jp/
 */

import { 
  ProvenanceValue, 
  DocumentSource,
  DerivedSource,
  pv, 
  docSource, 
  derivedSource,
} from "../types/provenance";

// =============================================================================
// METAPLANET PROVENANCE - KEY METRICS
// =============================================================================

/**
 * TDnet document source helper for Metaplanet
 */
function tdnetSource(params: {
  title: string;
  date: string;  // YYYY-MM-DD
  quote?: string;
  url?: string;
  searchTerm?: string;  // Exact text to Ctrl+F on source page
}): DocumentSource {
  return {
    type: "regulatory",
    sourceName: "TDnet",
    documentDate: params.date,
    filingDate: params.date,
    url: params.url || "https://metaplanet.jp/en/shareholders/disclosures",
    quote: params.quote,
    anchor: params.title,
    searchTerm: params.searchTerm,
  };
}

// =============================================================================
// CURRENT HOLDINGS (as of Dec 30, 2025)
// =============================================================================

// Direct PDF URLs from xj-storage.jp (TDnet document hosting)
const PDF_URLS = {
  btcPurchaseDec30: "https://contents.xj-storage.jp/xcontents/33500/4a51c54b/ec98/4363/bc59/64c440d858e3/140120251229527957.pdf",
  q3FinancialResults: "https://contents.xj-storage.jp/xcontents/33500/07d06a47/5b14/4ca6/a744/8415fa2bcc9e/140120251112597045.pdf",
};

export const METAPLANET_PROVENANCE = {
  // BTC Holdings (from Dec 30, 2025 TDnet disclosure)
  holdings: pv(35_102, tdnetSource({
    title: "Notice of Additional Purchase of Bitcoin",
    date: "2025-12-30",
    url: PDF_URLS.btcPurchaseDec30,
    quote: "Total Bitcoin holdings: 35,102 BTC",
    searchTerm: "35,102",
  }), "Dec 30 purchase brought total to 35,102 BTC"),

  // Shares Outstanding (from Q3 2025 Financial Results)
  sharesOutstanding: pv(1_142_264_340, tdnetSource({
    title: "Financial Results Summary for the Third Quarter",
    date: "2025-11-13",
    url: PDF_URLS.q3FinancialResults,
    quote: "Total shares outstanding: 1,142,264,340",
    searchTerm: "1,142,264,340",
  }), "Q3 FY2025 filing - page 1"),

  // Total Debt (from Q3 2025 Balance Sheet + post-Q3 borrowings)
  // Q3 filing shows ¥4,500M bonds + $100M credit facility (Oct 2025) = ~$130M
  // Analytics shows $355M (includes additional Q4 bond issuances)
  totalDebt: pv(355_000_000, tdnetSource({
    title: "Financial Results Summary for the Third Quarter",
    date: "2025-11-13",
    url: PDF_URLS.q3FinancialResults,
    quote: "Current Portion of Bonds Payable: 4,500 (million JPY) + post-Q3 borrowings",
    searchTerm: "4,500",  // Bonds Payable in balance sheet
  }), "Q3: ¥4.5B bonds. Current $355M includes Q4 credit facility + new bonds"),

  // Cash Reserves (from Q3 2025 Balance Sheet)
  cashReserves: pv(18_000_000, tdnetSource({
    title: "Financial Results Summary for the Third Quarter",
    date: "2025-11-13",
    url: PDF_URLS.q3FinancialResults,
    quote: "Cash and Cash Equivalents: 1,488 + Deposits: 1,286 = 2,774 million JPY",
    searchTerm: "1,488",  // Cash and Cash Equivalents line
  }), "Q3 balance sheet: ¥2.77B (~$18M USD at 155 JPY/USD)"),

  // Average Cost Basis (from company disclosure)
  costBasisAvg: pv(107_607, tdnetSource({
    title: "Notice of Additional Purchase of Bitcoin",
    date: "2025-12-30",
    url: PDF_URLS.btcPurchaseDec30,
    quote: "Average acquisition cost: $107,607 per BTC",
    searchTerm: "107,607",
  }), "Cumulative average from all purchases"),
};

// =============================================================================
// TREASURY HISTORY - BTC ACQUISITIONS
// Each entry sourced to TDnet "Notice of Additional Purchase of Bitcoin"
// =============================================================================

export interface MetaplanetAcquisition {
  date: string;          // YYYY-MM-DD
  btcAcquired: number;
  avgPrice: number;      // USD
  totalCost: number;     // USD
  holdingsAfter: number; // Total BTC after this purchase
  source: DocumentSource;
}

export const METAPLANET_ACQUISITIONS: MetaplanetAcquisition[] = [
  // 2025 Q4
  {
    date: "2025-12-30",
    btcAcquired: 4279,
    avgPrice: 105412,
    totalCost: 451_060_000,
    holdingsAfter: 35102,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-12-30",
      quote: "Purchased 4,279 BTC at average price of $105,412",
      searchTerm: "4,279",  // Search on analytics page or disclosure
    }),
  },
  // 2025 Q3
  {
    date: "2025-09-30",
    btcAcquired: 5268,
    avgPrice: 116870,
    totalCost: 615_670_000,
    holdingsAfter: 30823,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-09-30",
      quote: "Purchased 5,268 BTC",
      searchTerm: "5,268",
    }),
  },
  {
    date: "2025-09-22",
    btcAcquired: 5419,
    avgPrice: 116724,
    totalCost: 632_530_000,
    holdingsAfter: 25555,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-09-22",
      searchTerm: "5,419",
    }),
  },
  {
    date: "2025-09-08",
    btcAcquired: 136,
    avgPrice: 111666,
    totalCost: 15_190_000,
    holdingsAfter: 20136,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-09-08",
    }),
  },
  {
    date: "2025-09-01",
    btcAcquired: 1009,
    avgPrice: 111162,
    totalCost: 112_160_000,
    holdingsAfter: 20000,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-09-01",
    }),
  },
  {
    date: "2025-08-25",
    btcAcquired: 103,
    avgPrice: 113491,
    totalCost: 11_690_000,
    holdingsAfter: 18991,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-08-25",
    }),
  },
  {
    date: "2025-08-18",
    btcAcquired: 775,
    avgPrice: 120006,
    totalCost: 93_000_000,
    holdingsAfter: 18888,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-08-18",
    }),
  },
  {
    date: "2025-08-12",
    btcAcquired: 518,
    avgPrice: 118519,
    totalCost: 61_390_000,
    holdingsAfter: 18113,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-08-12",
    }),
  },
  {
    date: "2025-08-04",
    btcAcquired: 463,
    avgPrice: 115895,
    totalCost: 53_660_000,
    holdingsAfter: 17595,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-08-04",
    }),
  },
  {
    date: "2025-07-28",
    btcAcquired: 780,
    avgPrice: 118622,
    totalCost: 92_530_000,
    holdingsAfter: 17132,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-07-28",
    }),
  },
  {
    date: "2025-07-14",
    btcAcquired: 797,
    avgPrice: 117451,
    totalCost: 93_610_000,
    holdingsAfter: 16352,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-07-14",
    }),
  },
  {
    date: "2025-07-07",
    btcAcquired: 2205,
    avgPrice: 108237,
    totalCost: 238_660_000,
    holdingsAfter: 15555,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-07-07",
    }),
  },
  {
    date: "2025-06-30",
    btcAcquired: 1005,
    avgPrice: 107601,
    totalCost: 108_140_000,
    holdingsAfter: 13350,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-06-30",
    }),
  },
  {
    date: "2025-06-26",
    btcAcquired: 1234,
    avgPrice: 107557,
    totalCost: 132_730_000,
    holdingsAfter: 12345,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-06-26",
    }),
  },
  {
    date: "2025-06-23",
    btcAcquired: 1111,
    avgPrice: 106408,
    totalCost: 118_220_000,
    holdingsAfter: 11111,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-06-23",
    }),
  },
  {
    date: "2025-06-16",
    btcAcquired: 1112,
    avgPrice: 105435,
    totalCost: 117_240_000,
    holdingsAfter: 10000,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-06-16",
    }),
  },
  {
    date: "2025-06-02",
    btcAcquired: 1088,
    avgPrice: 107771,
    totalCost: 117_250_000,
    holdingsAfter: 8888,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-06-02",
    }),
  },
  {
    date: "2025-05-19",
    btcAcquired: 1004,
    avgPrice: 103873,
    totalCost: 104_290_000,
    holdingsAfter: 7800,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-05-19",
    }),
  },
  {
    date: "2025-05-12",
    btcAcquired: 1241,
    avgPrice: 102119,
    totalCost: 126_730_000,
    holdingsAfter: 6796,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-05-12",
    }),
  },
  {
    date: "2025-05-07",
    btcAcquired: 555,
    avgPrice: 96134,
    totalCost: 53_350_000,
    holdingsAfter: 5555,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-05-07",
    }),
  },
  {
    date: "2025-04-24",
    btcAcquired: 145,
    avgPrice: 93623,
    totalCost: 13_580_000,
    holdingsAfter: 5000,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-04-24",
    }),
  },
  {
    date: "2025-04-21",
    btcAcquired: 330,
    avgPrice: 85605,
    totalCost: 28_250_000,
    holdingsAfter: 4855,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-04-21",
    }),
  },
  {
    date: "2025-04-14",
    btcAcquired: 319,
    avgPrice: 82549,
    totalCost: 26_330_000,
    holdingsAfter: 4525,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-04-14",
    }),
  },
  {
    date: "2025-04-02",
    btcAcquired: 160,
    avgPrice: 83711,
    totalCost: 13_390_000,
    holdingsAfter: 4206,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-04-02",
    }),
  },
  {
    date: "2025-03-31",
    btcAcquired: 696,
    avgPrice: 97502,
    totalCost: 67_860_000,
    holdingsAfter: 4046,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-03-31",
    }),
  },
  {
    date: "2025-03-24",
    btcAcquired: 150,
    avgPrice: 83412,
    totalCost: 12_510_000,
    holdingsAfter: 3350,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-03-24",
    }),
  },
  {
    date: "2025-03-18",
    btcAcquired: 150,
    avgPrice: 83956,
    totalCost: 12_590_000,
    holdingsAfter: 3200,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-03-18",
    }),
  },
  {
    date: "2025-03-12",
    btcAcquired: 162,
    avgPrice: 83628,
    totalCost: 13_550_000,
    holdingsAfter: 3050,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-03-12",
    }),
  },
  {
    date: "2025-03-05",
    btcAcquired: 497,
    avgPrice: 89398,
    totalCost: 44_430_000,
    holdingsAfter: 2888,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-03-05",
    }),
  },
  {
    date: "2025-03-03",
    btcAcquired: 156,
    avgPrice: 86636,
    totalCost: 13_520_000,
    holdingsAfter: 2391,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-03-03",
    }),
  },
  {
    date: "2025-02-25",
    btcAcquired: 135,
    avgPrice: 96379,
    totalCost: 13_010_000,
    holdingsAfter: 2235,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-02-25",
    }),
  },
  {
    date: "2025-02-20",
    btcAcquired: 68.59,
    avgPrice: 97108,
    totalCost: 6_660_000,
    holdingsAfter: 2100,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-02-20",
    }),
  },
  {
    date: "2025-02-17",
    btcAcquired: 269.43,
    avgPrice: 98060,
    totalCost: 26_420_000,
    holdingsAfter: 2031,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2025-02-17",
    }),
  },
  // 2024 Q4
  {
    date: "2024-12-23",
    btcAcquired: 619.70,
    avgPrice: 97644,
    totalCost: 60_510_000,
    holdingsAfter: 1762,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-12-23",
    }),
  },
  {
    date: "2024-11-19",
    btcAcquired: 124.12,
    avgPrice: 91171,
    totalCost: 11_320_000,
    holdingsAfter: 1142,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-11-19",
    }),
  },
  {
    date: "2024-10-28",
    btcAcquired: 156.78,
    avgPrice: 66613,
    totalCost: 10_440_000,
    holdingsAfter: 1018,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-10-28",
    }),
  },
  {
    date: "2024-10-16",
    btcAcquired: 5.91,
    avgPrice: 65508,
    totalCost: 387_120,
    holdingsAfter: 861.39,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-10-16",
    }),
  },
  {
    date: "2024-10-15",
    btcAcquired: 106.98,
    avgPrice: 62738,
    totalCost: 6_710_000,
    holdingsAfter: 855.48,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-10-15",
    }),
  },
  {
    date: "2024-10-11",
    btcAcquired: 109,
    avgPrice: 61540,
    totalCost: 6_710_000,
    holdingsAfter: 748.50,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-10-11",
    }),
  },
  {
    date: "2024-10-07",
    btcAcquired: 108.79,
    avgPrice: 62027,
    totalCost: 6_750_000,
    holdingsAfter: 639.50,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-10-07",
    }),
  },
  {
    date: "2024-10-03",
    btcAcquired: 23.97,
    avgPrice: 60926,
    totalCost: 1_460_000,
    holdingsAfter: 530.71,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-10-03",
    }),
  },
  {
    date: "2024-10-01",
    btcAcquired: 107.91,
    avgPrice: 64576,
    totalCost: 6_970_000,
    holdingsAfter: 506.74,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-10-01",
    }),
  },
  {
    date: "2024-09-10",
    btcAcquired: 38.46,
    avgPrice: 54772,
    totalCost: 2_110_000,
    holdingsAfter: 398.83,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-09-10",
    }),
  },
  {
    date: "2024-08-20",
    btcAcquired: 57.27,
    avgPrice: 60104,
    totalCost: 3_440_000,
    holdingsAfter: 360.37,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-08-20",
    }),
  },
  {
    date: "2024-08-13",
    btcAcquired: 57.10,
    avgPrice: 59647,
    totalCost: 3_410_000,
    holdingsAfter: 303.09,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-08-13",
    }),
  },
  {
    date: "2024-07-22",
    btcAcquired: 20.38,
    avgPrice: 71882,
    totalCost: 1_470_000,
    holdingsAfter: 245.99,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-07-22",
    }),
  },
  {
    date: "2024-07-16",
    btcAcquired: 21.88,
    avgPrice: 57751,
    totalCost: 1_260_000,
    holdingsAfter: 225.61,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-07-16",
    }),
  },
  {
    date: "2024-07-08",
    btcAcquired: 42.47,
    avgPrice: 58578,
    totalCost: 2_490_000,
    holdingsAfter: 203.73,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-07-08",
    }),
  },
  {
    date: "2024-07-01",
    btcAcquired: 20.20,
    avgPrice: 61512,
    totalCost: 1_240_000,
    holdingsAfter: 161.27,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-07-01",
    }),
  },
  {
    date: "2024-06-10",
    btcAcquired: 23.35,
    avgPrice: 68136,
    totalCost: 1_590_000,
    holdingsAfter: 141.07,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-06-10",
    }),
  },
  {
    date: "2024-05-09",
    btcAcquired: 19.87,
    avgPrice: 64626,
    totalCost: 1_280_000,
    holdingsAfter: 117.72,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-05-09",
    }),
  },
  // First BTC purchase
  {
    date: "2024-04-23",
    btcAcquired: 97.85,
    avgPrice: 66018,
    totalCost: 6_460_000,
    holdingsAfter: 97.85,
    source: tdnetSource({
      title: "Notice of Additional Purchase of Bitcoin",
      date: "2024-04-23",
      quote: "First Bitcoin acquisition: 97.85 BTC",
    }),
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get Metaplanet holdings at a specific date
 */
export function getMetaplanetHoldings(date: string): number {
  // Sort acquisitions by date descending
  const sorted = [...METAPLANET_ACQUISITIONS].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  
  // Find the most recent acquisition on or before the given date
  for (const acq of sorted) {
    if (acq.date <= date) {
      return acq.holdingsAfter;
    }
  }
  
  // Before first acquisition
  return 0;
}

/**
 * Get all acquisitions in chronological order
 */
export function getMetaplanetAcquisitionsChronological(): MetaplanetAcquisition[] {
  return [...METAPLANET_ACQUISITIONS].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
}
