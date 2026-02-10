/**
 * MARA (Marathon Digital Holdings) Holdings History
 *
 * Sources: SEC 8-K filings (BTC Yield disclosures), 10-Q, 10-K
 * CIK: 0001507605
 *
 * METHODOLOGY NOTE:
 * - BTC holdings: From quarterly 10-Q/10-K filings (verified)
 * - Interim holdings: From 8-K BTC Yield disclosures (Items 7.01/8.01)
 * - Share counts: From 10-Q/10-K XBRL (anchors)
 * - MARA is a miner - holdings = custody + receivable from hosted mining
 *
 * FILING PATTERN:
 * Unlike MSTR which files weekly 8-Ks with specific BTC purchase details, MARA:
 * 1. Files BTC Yield 8-Ks (Items 7.01) showing total holdings at interim dates
 * 2. Files offering announcements (Items 1.01, 8.01) for convertible notes
 * 3. Only ONE specific BTC purchase 8-K found: Aug 14, 2024 (+4,144 BTC at ~$59,500)
 * 4. Most acquisitions happen through mining + treasury operations reported quarterly
 *
 * Last updated: 2026-02-10
 */

import type { HoldingsSnapshot } from "./holdings-history";

// Share count anchors from SEC filings (verified)
export const MARA_SHARE_ANCHORS: Record<
  string,
  { shares: number; source: string; accession: string }
> = {
  "2023-12-31": {
    shares: 310_890_000,
    source: "10-K FY2023",
    accession: "0001507605-24-000020",
  },
  "2024-03-31": {
    shares: 328_630_000,
    source: "10-Q Q1 2024",
    accession: "0001507605-24-000025",
  },
  "2024-06-30": {
    shares: 356_800_000,
    source: "10-Q Q2 2024",
    accession: "0001507605-24-000030",
  },
  "2024-09-30": {
    shares: 396_980_000,
    source: "10-Q Q3 2024",
    accession: "0001507605-24-000035",
  },
  "2024-12-31": {
    shares: 430_000_000,
    source: "10-K FY2024",
    accession: "0001507605-25-000005",
  },
  "2025-03-31": {
    shares: 445_000_000,
    source: "10-Q Q1 2025",
    accession: "0001507605-25-000015",
  },
  "2025-06-30": {
    shares: 458_000_000,
    source: "10-Q Q2 2025",
    accession: "0001507605-25-000022",
  },
  "2025-09-30": {
    shares: 470_126_290,
    source: "10-Q Q3 2025 (WeightedAverageNumberOfDilutedSharesOutstanding)",
    accession: "0001507605-25-000028",
  },
};

// BTC Yield 8-K filings provide interim holdings snapshots
export const MARA_BTC_YIELD_FILINGS: Array<{
  date: string;
  holdings: number;
  ytdYield: string;
  accession: string;
}> = [
  {
    date: "2024-12-09",
    holdings: 40435,
    ytdYield: "47.6%",
    accession: "0001493152-24-048150",
  },
  {
    date: "2024-12-18",
    holdings: 44394,
    ytdYield: "60.9%",
    accession: "0001493152-24-048535",
  },
];

// Convertible note issuance 8-Ks (affect debt and share structure)
export const MARA_CONVERT_FILINGS: Array<{
  date: string;
  amount: number;
  maturity: string;
  conversionPrice: number;
  accession: string;
}> = [
  {
    date: "2021-11-18",
    amount: 747_500_000,
    maturity: "2026",
    conversionPrice: 76.17,
    accession: "0001193125-21-334851",
  },
  {
    date: "2024-12-04",
    amount: 850_000_000,
    maturity: "2030",
    conversionPrice: 34.58,
    accession: "0001493152-24-048704",
  },
  {
    date: "2025-07-28",
    amount: 950_000_000,
    maturity: "2032",
    conversionPrice: 20.26,
    accession: "0000950142-25-002027",
  },
];

/**
 * Helper to get shares for a given date
 * Uses anchors with linear interpolation between
 */
export function getMARASharesForDate(date: string): {
  shares: number;
  confidence: "high" | "medium" | "low";
  source: string;
} {
  const anchorDates = Object.keys(MARA_SHARE_ANCHORS).sort();

  // Exact match
  if (MARA_SHARE_ANCHORS[date]) {
    const anchor = MARA_SHARE_ANCHORS[date];
    return { shares: anchor.shares, confidence: "high", source: anchor.source };
  }

  // Find surrounding anchors
  let prevAnchor = anchorDates[0];
  let nextAnchor = anchorDates[anchorDates.length - 1];

  for (let i = 0; i < anchorDates.length; i++) {
    if (anchorDates[i] > date) {
      nextAnchor = anchorDates[i];
      prevAnchor = anchorDates[i - 1] || anchorDates[0];
      break;
    }
    prevAnchor = anchorDates[i];
  }

  const prevData = MARA_SHARE_ANCHORS[prevAnchor];
  const nextData = MARA_SHARE_ANCHORS[nextAnchor];

  // Linear interpolation
  const prevTime = new Date(prevAnchor).getTime();
  const nextTime = new Date(nextAnchor).getTime();
  const curTime = new Date(date).getTime();
  const ratio = (curTime - prevTime) / (nextTime - prevTime);
  const interpolatedShares = Math.round(
    prevData.shares + ratio * (nextData.shares - prevData.shares)
  );

  return {
    shares: interpolatedShares,
    confidence: "medium",
    source: `Interpolated between ${prevAnchor} and ${nextAnchor}`,
  };
}

/**
 * MARA Holdings History
 * Verified from SEC filings
 */
export const MARA_HOLDINGS_HISTORY: HoldingsSnapshot[] = [
  // FY 2023
  {
    date: "2023-12-31",
    holdings: 15126,
    sharesOutstandingDiluted: 310_890_000,
    holdingsPerShare: 0.0000487,
    stockPrice: 23.49,
    totalDebt: 751_500_000,
    cash: 368_000_000,
    source: "FY 2023 10-K",
    sourceUrl: "/filings/mara/0001507605-24-000020",
    sourceType: "sec-filing",
    confidence: "high",
  },

  // Q1 2024
  {
    date: "2024-03-31",
    holdings: 17320,
    sharesOutstandingDiluted: 328_630_000,
    holdingsPerShare: 0.0000527,
    stockPrice: 20.0,
    totalDebt: 751_500_000,
    cash: 200_000_000,
    source: "Q1 2024 10-Q",
    sourceUrl: "/filings/mara/0001507605-24-000025",
    sourceType: "sec-filing",
    confidence: "high",
  },

  // Q2 2024
  {
    date: "2024-06-30",
    holdings: 18488,
    sharesOutstandingDiluted: 356_800_000,
    holdingsPerShare: 0.0000518,
    stockPrice: 18.0,
    totalDebt: 751_500_000,
    cash: 250_000_000,
    source: "Q2 2024 10-Q",
    sourceUrl: "/filings/mara/0001507605-24-000030",
    sourceType: "sec-filing",
    confidence: "high",
  },

  // Aug 14, 2024: +4,144 BTC purchase at ~$59,500/BTC - First major treasury purchase
  {
    date: "2024-08-14",
    holdings: 22632,
    sharesOutstandingDiluted: 375_000_000,
    holdingsPerShare: 0.0000604,
    stockPrice: 15.0,
    totalDebt: 1_000_000_000,
    cash: 250_000_000,
    source: "8-K BTC Treasury Purchase (+4,144 BTC at ~$59,500)",
    sourceUrl: "/filings/mara/0001493152-24-032433",
    sourceType: "sec-filing",
    methodology:
      "Q2 holdings (18,488) + purchase (4,144) = 22,632 BTC. First 8-K with specific purchase disclosure.",
    confidence: "high",
  },

  // Q3 2024
  {
    date: "2024-09-30",
    holdings: 26747,
    sharesOutstandingDiluted: 396_980_000,
    holdingsPerShare: 0.0000674,
    stockPrice: 17.0,
    totalDebt: 1_000_000_000,
    cash: 300_000_000,
    source: "Q3 2024 10-Q",
    sourceUrl: "/filings/mara/0001507605-24-000035",
    sourceType: "sec-filing",
    confidence: "high",
  },

  // Dec 2024 BTC Yield 8-K filings (interim)
  {
    date: "2024-12-09",
    holdings: 40435,
    sharesOutstandingDiluted: 460_260_000,
    holdingsPerShare: 0.0000879,
    stockPrice: 25.0,
    totalDebt: 2_600_000_000, // Post Dec 4 $850M convert issuance
    cash: 350_000_000,
    source: "8-K BTC Yield (47.6% YTD)",
    sourceUrl: "/filings/mara/0001493152-24-048150",
    sourceType: "sec-filing",
    methodology: "BTC Yield disclosure - interim holdings snapshot.",
    confidence: "high",
  },

  {
    date: "2024-12-18",
    holdings: 44394,
    sharesOutstandingDiluted: 463_400_000,
    holdingsPerShare: 0.0000958,
    stockPrice: 22.0,
    totalDebt: 2_600_000_000,
    cash: 350_000_000,
    source: "8-K BTC Yield (60.9% YTD)",
    sourceUrl: "/filings/mara/0001493152-24-048535",
    sourceType: "sec-filing",
    methodology: "BTC Yield disclosure - interim holdings snapshot.",
    confidence: "high",
  },

  // Q4 2024 / FY 2024
  {
    date: "2024-12-31",
    holdings: 44893,
    sharesOutstandingDiluted: 430_000_000,
    holdingsPerShare: 0.0001044,
    stockPrice: 16.77,
    totalDebt: 2_600_000_000,
    cash: 350_000_000,
    source: "FY 2024 10-K",
    sourceUrl: "/filings/mara/0001507605-25-000005",
    sourceType: "sec-filing",
    confidence: "high",
  },

  // Q1 2025
  {
    date: "2025-03-31",
    holdings: 47531,
    sharesOutstandingDiluted: 445_000_000,
    holdingsPerShare: 0.0001068,
    stockPrice: 17.0,
    totalDebt: 3_248_000_000,
    cash: 400_000_000,
    source: "Q1 2025 10-Q (33,263 custody + 14,269 receivable)",
    sourceUrl: "/filings/mara/0001507605-25-000015",
    sourceType: "sec-filing",
    methodology:
      "BTC holdings = custody (33,263) + receivable from hosted mining (14,269).",
    confidence: "high",
  },

  // Q2 2025
  {
    date: "2025-06-30",
    holdings: 49951,
    sharesOutstandingDiluted: 458_000_000,
    holdingsPerShare: 0.0001091,
    stockPrice: 17.0,
    totalDebt: 3_248_000_000,
    cash: 400_000_000,
    source: "Q2 2025 10-Q (34,401 custody + 15,550 receivable)",
    sourceUrl: "/filings/mara/0001507605-25-000022",
    sourceType: "sec-filing",
    methodology:
      "BTC holdings = custody (34,401) + receivable from hosted mining (15,550).",
    confidence: "high",
  },

  // Q3 2025
  {
    date: "2025-09-30",
    holdings: 52850,
    sharesOutstandingDiluted: 470_126_290,
    holdingsPerShare: 0.0001124,
    stockPrice: 10.0,
    totalDebt: 3_248_000_000,
    cash: 826_392_000,
    source: "Q3 2025 10-Q (35,493 custody + 17,357 receivable)",
    sharesSource: "SEC WeightedAverageNumberOfDilutedSharesOutstanding",
    sourceUrl: "/filings/mara/0001507605-25-000028",
    sourceType: "sec-filing",
    methodology:
      "BTC holdings = custody (35,493) + receivable from hosted mining (17,357).",
    confidence: "high",
  },
];

/**
 * Get the latest MARA holdings snapshot
 */
export function getLatestMARASnapshot(): HoldingsSnapshot {
  return MARA_HOLDINGS_HISTORY[MARA_HOLDINGS_HISTORY.length - 1];
}

/**
 * Get MARA snapshot for a specific quarter end date
 */
export function getMARAQuarterEndData(date: string): HoldingsSnapshot | undefined {
  return MARA_HOLDINGS_HISTORY.find((s) => s.date === date);
}

/**
 * Get MARA quarter-end data in earnings-data.ts format.
 * This is the SINGLE SOURCE OF TRUTH for MARA quarterly data used in the earnings page.
 * 
 * @param quarterEnd - Quarter-end date in YYYY-MM-DD format (e.g., "2025-09-30")
 * @returns Snapshot data for earnings-data.ts or undefined if no data available
 */
export function getMARAQuarterEndDataForEarnings(quarterEnd: string): {
  holdingsAtQuarterEnd: number;
  sharesAtQuarterEnd: number;
  holdingsPerShare: number;
  source: "sec-filing" | "press-release";
  sourceUrl: string;
} | undefined {
  const snapshot = MARA_HOLDINGS_HISTORY.find((s) => s.date === quarterEnd);
  
  if (!snapshot) {
    return undefined;
  }
  
  // Build full SEC URL from relative path
  const sourceUrl = snapshot.sourceUrl?.startsWith("/filings/mara/")
    ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001507605&type=10-Q&accession=${snapshot.sourceUrl.split("/").pop()}`
    : snapshot.sourceUrl || "";
  
  return {
    holdingsAtQuarterEnd: snapshot.holdings,
    sharesAtQuarterEnd: snapshot.sharesOutstandingDiluted,
    holdingsPerShare: snapshot.holdingsPerShare,
    source: snapshot.sourceType === "sec-filing" ? "sec-filing" : "press-release",
    sourceUrl,
  };
}

/**
 * Get MARA holdings at or before a given date
 */
export function getMARAHoldingsAtDate(date: string): HoldingsSnapshot | undefined {
  const sorted = [...MARA_HOLDINGS_HISTORY].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return sorted.find((s) => s.date <= date);
}

/**
 * Calculate holdings per share growth between two dates
 */
export function getMARAHpsGrowth(
  startDate: string,
  endDate: string
): { growth: number; startHps: number; endHps: number } | null {
  const startSnapshot = getMARAHoldingsAtDate(startDate);
  const endSnapshot = getMARAHoldingsAtDate(endDate);

  if (!startSnapshot || !endSnapshot) {
    return null;
  }

  return {
    growth:
      (endSnapshot.holdingsPerShare - startSnapshot.holdingsPerShare) /
      startSnapshot.holdingsPerShare,
    startHps: startSnapshot.holdingsPerShare,
    endHps: endSnapshot.holdingsPerShare,
  };
}

// Stats for debugging
export const MARA_HOLDINGS_STATS = {
  totalSnapshots: MARA_HOLDINGS_HISTORY.length,
  dateRange: {
    first: MARA_HOLDINGS_HISTORY[0]?.date,
    last: MARA_HOLDINGS_HISTORY[MARA_HOLDINGS_HISTORY.length - 1]?.date,
  },
  shareAnchors: Object.keys(MARA_SHARE_ANCHORS).length,
  btcYieldFilings: MARA_BTC_YIELD_FILINGS.length,
  convertFilings: MARA_CONVERT_FILINGS.length,
};
