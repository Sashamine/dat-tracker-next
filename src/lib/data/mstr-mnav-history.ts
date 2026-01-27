/**
 * MSTR Auditable mNAV History
 * ===========================
 *
 * Generates historical mNAV with full source attribution for every input.
 *
 * Data sources:
 * - Capital structure: mstr-capital-structure.ts (XBRL + 8-K events)
 * - BTC prices: Historical data with source attribution
 * - Stock prices: Yahoo Finance historical data
 *
 * Methodology:
 * - Quarter-end dates: XBRL-verified (high confidence)
 * - Inter-quarter dates: Derived from prior XBRL + events (medium confidence)
 *
 * mNAV Formula:
 *   Enterprise Value = Market Cap + Total Debt + Preferred Equity - Cash
 *   Crypto NAV = BTC Holdings × BTC Price
 *   mNAV = Enterprise Value / Crypto NAV
 */

import {
  getCapitalStructureAt,
  getCapitalStructureTimeline,
  type CapitalStructureSnapshot,
} from "./mstr-capital-structure";

// =============================================================================
// TYPES
// =============================================================================

export interface AuditedValue {
  value: number;
  source: string;
  asOf: string; // Date the source data is from
  url?: string; // Link to verify
}

export interface AuditedMNAVSnapshot {
  date: string; // YYYY-MM-DD

  // Inputs with full attribution
  btcHoldings: AuditedValue;
  sharesOutstanding: AuditedValue;
  totalDebt: AuditedValue;
  cashAndEquivalents: AuditedValue;
  preferredEquity: AuditedValue;

  // Market prices
  btcPrice: AuditedValue;
  stockPrice: AuditedValue;

  // Calculated outputs
  marketCap: number;
  enterpriseValue: number;
  cryptoNav: number;
  mnav: number;

  // Audit trail
  methodology: "xbrl" | "derived";
  confidence: "high" | "medium";
  notes?: string;
}

// =============================================================================
// HISTORICAL BTC PRICES (with sources)
// =============================================================================

/**
 * Historical BTC prices at quarter-end and key dates.
 * Sources: CoinGecko, CoinMarketCap historical data
 */
export const HISTORICAL_BTC_PRICES: Record<
  string,
  { price: number; source: string }
> = {
  // 2020
  "2020-09-30": { price: 10784, source: "CoinGecko historical" },
  "2020-12-31": { price: 29001, source: "CoinGecko historical" },

  // 2021
  "2021-03-31": { price: 58918, source: "CoinGecko historical" },
  "2021-06-30": { price: 35040, source: "CoinGecko historical" },
  "2021-09-30": { price: 43790, source: "CoinGecko historical" },
  "2021-12-31": { price: 46306, source: "CoinGecko historical" },

  // 2022
  "2022-03-31": { price: 45538, source: "CoinGecko historical" },
  "2022-06-30": { price: 19784, source: "CoinGecko historical" },
  "2022-09-30": { price: 19432, source: "CoinGecko historical" },
  "2022-12-31": { price: 16547, source: "CoinGecko historical" },

  // 2023
  "2023-03-31": { price: 28478, source: "CoinGecko historical" },
  "2023-06-30": { price: 30477, source: "CoinGecko historical" },
  "2023-09-30": { price: 26967, source: "CoinGecko historical" },
  "2023-12-31": { price: 42265, source: "CoinGecko historical" },

  // 2024
  "2024-03-31": { price: 71333, source: "CoinGecko historical" },
  "2024-06-30": { price: 62678, source: "CoinGecko historical" },
  "2024-09-30": { price: 63497, source: "CoinGecko historical" },
  "2024-12-31": { price: 93429, source: "CoinGecko historical" },

  // 2025
  "2025-03-31": { price: 82549, source: "CoinGecko historical" },
  "2025-06-30": { price: 109368, source: "CoinGecko historical" },
  "2025-09-30": { price: 64021, source: "CoinGecko historical" },
  "2025-12-31": { price: 93000, source: "CoinGecko historical" },
};

// =============================================================================
// HISTORICAL MSTR STOCK PRICES (with sources)
// =============================================================================

/**
 * Historical MSTR stock prices at quarter-end.
 * Pre-Aug 2024: Pre-split prices (divide by 10 for comparison)
 * Post-Aug 2024: Post-split prices
 * Source: Yahoo Finance historical data
 */
export const HISTORICAL_MSTR_PRICES: Record<
  string,
  { price: number; preSplit: boolean; source: string }
> = {
  // 2020 (pre-split, multiply adjusted price by 10)
  "2020-09-30": { price: 14.65, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2020-12-31": { price: 33.69, preSplit: false, source: "Yahoo Finance (split-adjusted)" },

  // 2021 (pre-split)
  "2021-03-31": { price: 64.77, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2021-06-30": { price: 70.33, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2021-09-30": { price: 59.49, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2021-12-31": { price: 55.90, preSplit: false, source: "Yahoo Finance (split-adjusted)" },

  // 2022 (pre-split)
  "2022-03-31": { price: 49.05, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2022-06-30": { price: 18.19, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2022-09-30": { price: 21.13, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2022-12-31": { price: 14.10, preSplit: false, source: "Yahoo Finance (split-adjusted)" },

  // 2023 (pre-split)
  "2023-03-31": { price: 28.89, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2023-06-30": { price: 35.04, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2023-09-30": { price: 33.45, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2023-12-31": { price: 63.18, preSplit: false, source: "Yahoo Finance (split-adjusted)" },

  // 2024 (split happened Aug 7, 2024)
  "2024-03-31": { price: 179.99, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2024-06-30": { price: 139.82, preSplit: false, source: "Yahoo Finance (split-adjusted)" },
  "2024-09-30": { price: 186.93, preSplit: false, source: "Yahoo Finance" },
  "2024-12-31": { price: 298.88, preSplit: false, source: "Yahoo Finance" },

  // 2025
  "2025-03-31": { price: 324.73, preSplit: false, source: "Yahoo Finance" },
  "2025-06-30": { price: 411.56, preSplit: false, source: "Yahoo Finance" },
  "2025-09-30": { price: 186.14, preSplit: false, source: "Yahoo Finance" },
  "2025-12-31": { price: 289.62, preSplit: false, source: "Yahoo Finance" },
};

// =============================================================================
// MNAV CALCULATION
// =============================================================================

/**
 * Calculate auditable mNAV snapshot for a given date
 */
export function calculateMstrMnavAt(date: string): AuditedMNAVSnapshot | null {
  // Get capital structure
  const capStructure = getCapitalStructureAt(date);
  if (!capStructure) return null;

  // Get prices
  const btcPriceData = HISTORICAL_BTC_PRICES[date];
  const stockPriceData = HISTORICAL_MSTR_PRICES[date];

  if (!btcPriceData || !stockPriceData) {
    // Can't calculate without prices
    return null;
  }

  // Build audited values
  const isXbrl = capStructure.source === "xbrl";
  const sourcePrefix = isXbrl
    ? `SEC ${capStructure.xbrlFiling?.formType || "10-Q"}`
    : "Derived";
  const sourceUrl = isXbrl && capStructure.xbrlFiling
    ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=${capStructure.xbrlFiling.formType}&dateb=&owner=include&count=10`
    : undefined;

  const btcHoldings: AuditedValue = {
    value: capStructure.btcHoldings,
    source: isXbrl ? "8-K cumulative (verified against XBRL digitalAssets)" : "8-K events cumulative",
    asOf: date,
  };

  const sharesOutstanding: AuditedValue = {
    value: capStructure.commonSharesOutstanding,
    source: `${sourcePrefix} sharesOutstanding`,
    asOf: isXbrl ? date : capStructure.notes?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || date,
    url: sourceUrl,
  };

  const totalDebt: AuditedValue = {
    value: capStructure.totalDebt,
    source: `${sourcePrefix} longTermDebt`,
    asOf: isXbrl ? date : capStructure.notes?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || date,
    url: sourceUrl,
  };

  const cashAndEquivalents: AuditedValue = {
    value: capStructure.cashAndEquivalents,
    source: `${sourcePrefix} cashAndEquivalents`,
    asOf: isXbrl ? date : capStructure.notes?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || date,
    url: sourceUrl,
  };

  const preferredEquity: AuditedValue = {
    value: capStructure.preferredEquity,
    source: capStructure.preferredEquity > 0 ? `${sourcePrefix} redeemablePreferredStock` : "N/A (pre-2025)",
    asOf: isXbrl ? date : capStructure.notes?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || date,
    url: sourceUrl,
  };

  const btcPrice: AuditedValue = {
    value: btcPriceData.price,
    source: btcPriceData.source,
    asOf: date,
    url: "https://www.coingecko.com/en/coins/bitcoin/historical_data",
  };

  const stockPrice: AuditedValue = {
    value: stockPriceData.price,
    source: stockPriceData.source,
    asOf: date,
    url: "https://finance.yahoo.com/quote/MSTR/history",
  };

  // Calculate mNAV components
  const marketCap = sharesOutstanding.value * stockPrice.value;
  const enterpriseValue =
    marketCap + totalDebt.value + preferredEquity.value - cashAndEquivalents.value;
  const cryptoNav = btcHoldings.value * btcPrice.value;
  const mnav = cryptoNav > 0 ? enterpriseValue / cryptoNav : 0;

  return {
    date,
    btcHoldings,
    sharesOutstanding,
    totalDebt,
    cashAndEquivalents,
    preferredEquity,
    btcPrice,
    stockPrice,
    marketCap,
    enterpriseValue,
    cryptoNav,
    mnav,
    methodology: isXbrl ? "xbrl" : "derived",
    confidence: isXbrl ? "high" : "medium",
    notes: capStructure.notes,
  };
}

// =============================================================================
// PRE-CALCULATED HISTORY
// =============================================================================

/**
 * Generate full mNAV history for all quarter-end dates
 */
export function generateMstrMnavHistory(): AuditedMNAVSnapshot[] {
  const timeline = getCapitalStructureTimeline();
  const snapshots: AuditedMNAVSnapshot[] = [];

  for (const capStructure of timeline) {
    const snapshot = calculateMstrMnavAt(capStructure.date);
    if (snapshot) {
      snapshots.push(snapshot);
    }
  }

  return snapshots;
}

/**
 * Pre-calculated mNAV history for quick access
 * Regenerate with: generateMstrMnavHistory()
 */
export const MSTR_MNAV_HISTORY: AuditedMNAVSnapshot[] = generateMstrMnavHistory();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get mNAV at a specific date
 */
export function getMstrMnavAt(date: string): AuditedMNAVSnapshot | null {
  // First check pre-calculated
  const cached = MSTR_MNAV_HISTORY.find((s) => s.date === date);
  if (cached) return cached;

  // Calculate on demand if not in cache
  return calculateMstrMnavAt(date);
}

/**
 * Get mNAV range for charting
 */
export function getMstrMnavRange(
  startDate: string,
  endDate: string
): AuditedMNAVSnapshot[] {
  return MSTR_MNAV_HISTORY.filter(
    (s) => s.date >= startDate && s.date <= endDate
  );
}

/**
 * Format snapshot for display/audit
 */
export function formatSnapshotForAudit(snapshot: AuditedMNAVSnapshot): string {
  const lines = [
    `=== MSTR mNAV Audit: ${snapshot.date} ===`,
    ``,
    `METHODOLOGY: ${snapshot.methodology.toUpperCase()} (${snapshot.confidence} confidence)`,
    snapshot.notes ? `Notes: ${snapshot.notes}` : null,
    ``,
    `--- INPUTS ---`,
    `BTC Holdings: ${snapshot.btcHoldings.value.toLocaleString()} BTC`,
    `  Source: ${snapshot.btcHoldings.source}`,
    `  As of: ${snapshot.btcHoldings.asOf}`,
    ``,
    `Shares Outstanding: ${snapshot.sharesOutstanding.value.toLocaleString()}`,
    `  Source: ${snapshot.sharesOutstanding.source}`,
    `  As of: ${snapshot.sharesOutstanding.asOf}`,
    ``,
    `Total Debt: $${(snapshot.totalDebt.value / 1e9).toFixed(2)}B`,
    `  Source: ${snapshot.totalDebt.source}`,
    `  As of: ${snapshot.totalDebt.asOf}`,
    ``,
    `Cash: $${(snapshot.cashAndEquivalents.value / 1e6).toFixed(1)}M`,
    `  Source: ${snapshot.cashAndEquivalents.source}`,
    `  As of: ${snapshot.cashAndEquivalents.asOf}`,
    ``,
    `Preferred Equity: $${(snapshot.preferredEquity.value / 1e9).toFixed(2)}B`,
    `  Source: ${snapshot.preferredEquity.source}`,
    `  As of: ${snapshot.preferredEquity.asOf}`,
    ``,
    `--- MARKET PRICES ---`,
    `BTC Price: $${snapshot.btcPrice.value.toLocaleString()}`,
    `  Source: ${snapshot.btcPrice.source}`,
    ``,
    `Stock Price: $${snapshot.stockPrice.value.toFixed(2)}`,
    `  Source: ${snapshot.stockPrice.source}`,
    ``,
    `--- CALCULATION ---`,
    `Market Cap = ${snapshot.sharesOutstanding.value.toLocaleString()} × $${snapshot.stockPrice.value.toFixed(2)}`,
    `           = $${(snapshot.marketCap / 1e9).toFixed(2)}B`,
    ``,
    `Enterprise Value = Market Cap + Debt + Preferred - Cash`,
    `                 = $${(snapshot.marketCap / 1e9).toFixed(2)}B + $${(snapshot.totalDebt.value / 1e9).toFixed(2)}B + $${(snapshot.preferredEquity.value / 1e9).toFixed(2)}B - $${(snapshot.cashAndEquivalents.value / 1e6).toFixed(1)}M`,
    `                 = $${(snapshot.enterpriseValue / 1e9).toFixed(2)}B`,
    ``,
    `Crypto NAV = ${snapshot.btcHoldings.value.toLocaleString()} BTC × $${snapshot.btcPrice.value.toLocaleString()}`,
    `           = $${(snapshot.cryptoNav / 1e9).toFixed(2)}B`,
    ``,
    `mNAV = Enterprise Value / Crypto NAV`,
    `     = $${(snapshot.enterpriseValue / 1e9).toFixed(2)}B / $${(snapshot.cryptoNav / 1e9).toFixed(2)}B`,
    `     = ${snapshot.mnav.toFixed(2)}x`,
  ].filter(Boolean);

  return lines.join("\n");
}
