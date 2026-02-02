// DDC Enterprise (DDC) Bitcoin Holdings History
// Source: SEC filings & https://treasury.ddc.xyz
// Last updated: 2026-02-02

export interface DDCHoldingsEntry {
  date: string; // YYYY-MM-DD
  btcAcquired: number;
  avgCostUsd: number;
  totalCostUsd: number;
  cumulativeBtc: number;
  basicShares: number;
  dilutedShares: number;
  source?: string;
  filingUrl?: string;
}

export const ddcHoldingsHistory: DDCHoldingsEntry[] = [
  {
    date: "2025-05-23",
    btcAcquired: 22,
    avgCostUsd: 46022,
    totalCostUsd: 1012484,
    cumulativeBtc: 22,
    basicShares: 4910000,
    dilutedShares: 6080000,
    source: "First BTC purchase - treasury.ddc.xyz",
  },
  {
    date: "2025-05-29",
    btcAcquired: 78,
    avgCostUsd: 42970,
    totalCostUsd: 3351660,
    cumulativeBtc: 100,
    basicShares: 5650000,
    dilutedShares: 6820000,
    source: "100 BTC milestone - treasury.ddc.xyz",
  },
  {
    date: "2025-06-12",
    btcAcquired: 37.69,
    avgCostUsd: 104093,
    totalCostUsd: 3923264,
    cumulativeBtc: 137.69,
    basicShares: 6500000,
    dilutedShares: 7680000,
    source: "treasury.ddc.xyz",
  },
  {
    date: "2025-07-07",
    btcAcquired: 230,
    avgCostUsd: 109067,
    totalCostUsd: 25085410,
    cumulativeBtc: 367.69,
    basicShares: 8310000,
    dilutedShares: 14680000,
    source: "Post $27M Anson financing - treasury.ddc.xyz",
  },
  {
    date: "2025-08-14",
    btcAcquired: 120,
    avgCostUsd: 123169,
    totalCostUsd: 14780280,
    cumulativeBtc: 487.69,
    basicShares: 8310000,
    dilutedShares: 15000000,
    source: "treasury.ddc.xyz",
  },
  {
    date: "2025-08-18",
    btcAcquired: 100,
    avgCostUsd: 118759,
    totalCostUsd: 11875900,
    cumulativeBtc: 587.69,
    basicShares: 8310000,
    dilutedShares: 15050000,
    source: "treasury.ddc.xyz",
  },
  {
    date: "2025-08-21",
    btcAcquired: 100,
    avgCostUsd: 71304,
    totalCostUsd: 7130400,
    cumulativeBtc: 687.69,
    basicShares: 8310000,
    dilutedShares: 15150000,
    source: "treasury.ddc.xyz",
  },
  {
    date: "2025-08-25",
    btcAcquired: 200,
    avgCostUsd: 71304,
    totalCostUsd: 14260800,
    cumulativeBtc: 887.69,
    basicShares: 8310000,
    dilutedShares: 15250000,
    source: "treasury.ddc.xyz",
  },
  {
    date: "2025-08-27",
    btcAcquired: 120,
    avgCostUsd: 71304,
    totalCostUsd: 8556480,
    cumulativeBtc: 1007.69,
    basicShares: 8310000,
    dilutedShares: 15320000,
    source: "1,000 BTC milestone - treasury.ddc.xyz",
  },
  {
    date: "2025-09-24",
    btcAcquired: 50.31,
    avgCostUsd: 113676,
    totalCostUsd: 5719076,
    cumulativeBtc: 1058,
    basicShares: 8310000,
    dilutedShares: 15710000,
    source: "treasury.ddc.xyz",
  },
  {
    date: "2025-10-16",
    btcAcquired: 25,
    avgCostUsd: 112663,
    totalCostUsd: 2816575,
    cumulativeBtc: 1083,
    basicShares: 10000000,
    dilutedShares: 16620000,
    source: "treasury.ddc.xyz",
  },
  {
    date: "2025-11-26",
    btcAcquired: 100,
    avgCostUsd: 87742,
    totalCostUsd: 8774200,
    cumulativeBtc: 1183,
    basicShares: 23310000,
    dilutedShares: 29750000,
    source: "treasury.ddc.xyz",
  },
  {
    date: "2026-01-15",
    btcAcquired: 200,
    avgCostUsd: 79167,
    totalCostUsd: 15833400,
    cumulativeBtc: 1383,
    basicShares: 23310000,
    dilutedShares: 29750000,
    source: "SEC 424B3 - treasury.ddc.xyz",
    filingUrl: "https://www.sec.gov/Archives/edgar/data/1808110/000121390026007463/",
  },
  {
    date: "2026-01-22",
    btcAcquired: 200,
    avgCostUsd: 81768,
    totalCostUsd: 16353600,
    cumulativeBtc: 1583,
    basicShares: 23310000,
    dilutedShares: 29750000,
    source: "treasury.ddc.xyz",
  },
  {
    date: "2026-01-28",
    btcAcquired: 100,
    avgCostUsd: 88130,
    totalCostUsd: 8813000,
    cumulativeBtc: 1683,
    basicShares: 23310000,
    dilutedShares: 29750000,
    source: "Press release - treasury.ddc.xyz",
  },
  {
    date: "2026-01-29",
    btcAcquired: 100,
    avgCostUsd: 88170,
    totalCostUsd: 8817000,
    cumulativeBtc: 1783,
    basicShares: 23310000,
    dilutedShares: 29750000,
    source: "Press release - treasury.ddc.xyz",
    filingUrl: "https://ir.ddc.xyz/news-events/press-releases/detail/76/",
  },
];

// Summary statistics
export const ddcSummary = {
  ticker: "DDC",
  name: "DDC Enterprise Limited",
  exchange: "NYSE American",
  cik: "0001808110",
  
  // Current holdings (as of latest entry)
  currentBtc: 1783,
  avgCostPerBtc: 88112,
  totalCostBasis: 157102549, // Sum of all totalCostUsd
  
  // Key dates
  treasuryPolicyDate: "2025-02-21",
  firstPurchaseDate: "2025-05-23",
  latestPurchaseDate: "2026-01-29",
  
  // Share data
  currentBasicShares: 23310000,
  currentDilutedShares: 29750000,
  btcPerShare: 0.059925, // BTC per 1,000 shares
  
  // Performance metrics (from Jan 29, 2026 press release)
  btcYieldYtd2026: 0.507, // 50.7%
  btcYieldH22025: 2.63, // 263%
  globalRanking: 36, // Among public companies
  
  // Financing
  ansonFinancing: {
    initialClosing: 27000000, // $27M
    additionalCapacity: 275000000, // Up to $275M
    elocCapacity: 200000000, // Up to $200M ELOC
    closingDate: "2025-07-01",
  },
  
  // Accumulation targets (from May 15, 2025)
  targets: {
    immediate: { btc: 100, achieved: true, date: "2025-05-29" },
    sixMonths: { btc: 500, achieved: true, date: "2025-08-14" },
    thirtySixMonths: { btc: 5000, achieved: false },
  },
  
  // Links
  irWebsite: "https://ir.ddc.xyz",
  treasuryTracker: "https://treasury.ddc.xyz",
  secFilings: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001808110",
  
  // Social (no Twitter/X found)
  social: {
    facebook: "https://www.facebook.com/daydaycooker",
    instagram: "https://www.instagram.com/daydaycooker/",
    tiktok: "https://www.tiktok.com/@lovedaydaycook",
    linkedin: "https://hk.linkedin.com/company/daydaycook",
    youtube: "https://www.youtube.com/daydaycookkitchen",
    twitter: null, // No official Twitter/X account found
  },
};

// Helper function to get holdings at a specific date
export function getHoldingsAtDate(targetDate: string): DDCHoldingsEntry | null {
  const entries = ddcHoldingsHistory.filter(e => e.date <= targetDate);
  return entries.length > 0 ? entries[entries.length - 1] : null;
}

/**
 * Get cumulative BTC holdings as of a specific date (for mNAV chart)
 */
export function getHoldingsAsOf(date: string): number {
  const entries = ddcHoldingsHistory.filter(e => e.date <= date);
  if (entries.length === 0) return 0;
  return entries[entries.length - 1].cumulativeBtc;
}

// Helper function to calculate BTC per share at a date
export function getBtcPerShareAtDate(targetDate: string): number | null {
  const entry = getHoldingsAtDate(targetDate);
  if (!entry) return null;
  return entry.cumulativeBtc / entry.dilutedShares;
}

// Get total purchases in a date range
export function getPurchasesInRange(startDate: string, endDate: string): DDCHoldingsEntry[] {
  return ddcHoldingsHistory.filter(e => e.date >= startDate && e.date <= endDate);
}
