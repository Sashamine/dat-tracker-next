/**
 * Generate Daily MSTR mNAV History
 *
 * Combines:
 * - Daily BTC prices (from MCP financial-datasets API)
 * - Daily MSTR stock prices (from Yahoo Finance)
 * - Capital structure at each date (from getCapitalStructureAt)
 * - Dilutive instruments (convertibles in-the-money at each stock price)
 *
 * mNAV Formula:
 *   Market Cap = Fully Diluted Shares × Stock Price
 *   Enterprise Value = Market Cap + Total Debt + Preferred Equity - Cash
 *   Crypto NAV = BTC Holdings × BTC Price
 *   mNAV = Enterprise Value / Crypto NAV
 *
 * Diluted shares include convertible notes that are "in the money"
 * (stock price > conversion price) at each historical date.
 *
 * Run with: npx tsx scripts/generate-daily-mnav.ts
 */

import * as fs from "fs";
import * as path from "path";

// Import capital structure functions
import {
  getCapitalStructureAt,
  type CapitalStructureSnapshot,
} from "../src/lib/data/mstr-capital-structure";

// Import dilutive instruments for fully diluted share count
import { getEffectiveSharesAt } from "../src/lib/data/dilutive-instruments";

interface PriceData {
  ticker: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  time: string;
}

interface DailyMnavSnapshot {
  date: string;

  // Prices
  btcPrice: number;
  stockPrice: number;

  // Capital structure (from getCapitalStructureAt)
  btcHoldings: number;
  basicShares: number; // Basic shares from capital structure
  dilutedShares: number; // Fully diluted (includes in-the-money convertibles)
  totalDebt: number;
  preferredEquity: number;
  cashAndEquivalents: number;

  // Calculated values (using diluted shares)
  marketCap: number;
  enterpriseValue: number;
  cryptoNav: number;
  mnav: number;

  // Accretion metric
  btcPerShare: number; // BTC holdings / diluted shares

  // Metadata
  capitalStructureSource: "xbrl" | "derived";
}

// Read BTC prices from the saved MCP tool output files
function readBtcPricesFromFiles(): Map<string, number> {
  const prices = new Map<string, number>();

  const baseDir = path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    ".claude/projects/C--Users-edwin/d96697ab-8689-406c-9031-71a219ade234/tool-results"
  );

  const files = [
    "mcp-financial-datasets-get_historical_crypto_prices-1769490528779.txt", // 2024
    "mcp-financial-datasets-get_historical_crypto_prices-1769490549322.txt", // 2020-2023
    "mcp-financial-datasets-get_historical_crypto_prices-1769490556885.txt", // 2025
    "mcp-financial-datasets-get_historical_crypto_prices-2026.txt", // 2026
  ];

  for (const file of files) {
    const filePath = path.join(baseDir, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const wrapper = JSON.parse(content);
        const data: PriceData[] = JSON.parse(wrapper.result);

        for (const item of data) {
          const date = item.time.split("T")[0];
          prices.set(date, Math.round(item.close));
        }
        console.log(`  Loaded ${data.length} BTC prices from ${file}`);
      } catch (e) {
        console.error(`  Error reading ${file}:`, e);
      }
    } else {
      console.log(`  File not found: ${filePath}`);
    }
  }

  return prices;
}

// Fetch MSTR prices from Yahoo Finance
async function fetchMstrPrices(
  startDate: string,
  endDate: string
): Promise<Map<string, number>> {
  const prices = new Map<string, number>();

  const start = Math.floor(new Date(startDate).getTime() / 1000);
  const end = Math.floor(new Date(endDate).getTime() / 1000);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/MSTR?period1=${start}&period2=${end}&interval=1d`;

  console.log(`Fetching MSTR prices from Yahoo Finance...`);

  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Yahoo Finance API error: ${response.status}`);
  }

  const data = await response.json();
  const result = data.chart?.result?.[0];

  if (!result) {
    throw new Error("No data returned from Yahoo Finance");
  }

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];

  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null) {
      const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
      prices.set(date, Math.round(closes[i] * 100) / 100);
    }
  }

  console.log(`  Got ${prices.size} MSTR prices`);
  return prices;
}

// Calculate mNAV for a single date using fully diluted shares
function calculateDailyMnav(
  date: string,
  btcPrice: number,
  stockPrice: number,
  capStructure: CapitalStructureSnapshot
): DailyMnavSnapshot {
  const basicShares = capStructure.commonSharesOutstanding;

  // Get fully diluted shares at this date and stock price
  // Only includes convertibles that existed at this date and are in-the-money
  const effectiveShares = getEffectiveSharesAt(
    "MSTR",
    basicShares,
    stockPrice,
    date
  );
  const dilutedShares = effectiveShares.diluted;

  // Use diluted shares for market cap calculation
  const marketCap = dilutedShares * stockPrice;
  const enterpriseValue =
    marketCap +
    capStructure.totalDebt +
    capStructure.preferredEquity -
    capStructure.cashAndEquivalents;
  const cryptoNav = capStructure.btcHoldings * btcPrice;
  const mnav = cryptoNav > 0 ? enterpriseValue / cryptoNav : 0;

  // Accretion metric: BTC per diluted share
  const btcPerShare =
    dilutedShares > 0 ? capStructure.btcHoldings / dilutedShares : 0;

  return {
    date,
    btcPrice,
    stockPrice,
    btcHoldings: capStructure.btcHoldings,
    basicShares,
    dilutedShares,
    totalDebt: capStructure.totalDebt,
    preferredEquity: capStructure.preferredEquity,
    cashAndEquivalents: capStructure.cashAndEquivalents,
    marketCap,
    enterpriseValue,
    cryptoNav,
    mnav,
    btcPerShare,
    capitalStructureSource: capStructure.source,
  };
}

// Generate the TypeScript output file
function generateOutputFile(snapshots: DailyMnavSnapshot[]): string {
  const firstDate = snapshots[0]?.date || "N/A";
  const lastDate = snapshots[snapshots.length - 1]?.date || "N/A";

  let content = `/**
 * MSTR Daily mNAV History
 * =======================
 *
 * Daily mNAV calculations with full balance sheet data.
 * Auto-generated: ${new Date().toISOString()}
 *
 * Date range: ${firstDate} to ${lastDate}
 * Total entries: ${snapshots.length}
 *
 * Sources:
 * - BTC prices: Financial Datasets API
 * - MSTR prices: Yahoo Finance (split-adjusted)
 * - Capital structure: SEC XBRL + 8-K events via getCapitalStructureAt()
 * - Dilution: Convertible notes via getEffectiveSharesAt()
 *
 * mNAV Formula:
 *   Market Cap = Fully Diluted Shares × Stock Price
 *   Enterprise Value = Market Cap + Total Debt + Preferred Equity - Cash
 *   Crypto NAV = BTC Holdings × BTC Price
 *   mNAV = Enterprise Value / Crypto NAV
 *
 * Diluted shares include convertible notes "in the money" at each date's stock price.
 *
 * DO NOT EDIT MANUALLY - regenerate with:
 * npx tsx scripts/generate-daily-mnav.ts
 */

export interface DailyMnavSnapshot {
  date: string;

  // Prices
  btcPrice: number;
  stockPrice: number;

  // Capital structure
  btcHoldings: number;
  basicShares: number;   // Basic shares from capital structure
  dilutedShares: number; // Includes in-the-money convertibles
  totalDebt: number;
  preferredEquity: number;
  cashAndEquivalents: number;

  // Calculated values (using diluted shares)
  marketCap: number;
  enterpriseValue: number;
  cryptoNav: number;
  mnav: number;

  // Accretion metric
  btcPerShare: number; // BTC holdings / diluted shares

  // Metadata
  capitalStructureSource: "xbrl" | "derived";
}

/**
 * Daily mNAV history array (chronologically sorted)
 */
export const MSTR_DAILY_MNAV: DailyMnavSnapshot[] = [
`;

  for (const snapshot of snapshots) {
    content += `  {
    date: "${snapshot.date}",
    btcPrice: ${snapshot.btcPrice},
    stockPrice: ${snapshot.stockPrice},
    btcHoldings: ${snapshot.btcHoldings},
    basicShares: ${snapshot.basicShares},
    dilutedShares: ${snapshot.dilutedShares},
    totalDebt: ${snapshot.totalDebt},
    preferredEquity: ${snapshot.preferredEquity},
    cashAndEquivalents: ${snapshot.cashAndEquivalents},
    marketCap: ${Math.round(snapshot.marketCap)},
    enterpriseValue: ${Math.round(snapshot.enterpriseValue)},
    cryptoNav: ${Math.round(snapshot.cryptoNav)},
    mnav: ${snapshot.mnav.toFixed(4)},
    btcPerShare: ${snapshot.btcPerShare.toFixed(8)},
    capitalStructureSource: "${snapshot.capitalStructureSource}",
  },
`;
  }

  content += `];

/**
 * Get mNAV snapshot for a specific date
 */
export function getDailyMnavAt(date: string): DailyMnavSnapshot | null {
  return MSTR_DAILY_MNAV.find(s => s.date === date) || null;
}

/**
 * Get mNAV snapshots in a date range
 */
export function getDailyMnavRange(startDate: string, endDate: string): DailyMnavSnapshot[] {
  return MSTR_DAILY_MNAV.filter(s => s.date >= startDate && s.date <= endDate);
}

/**
 * Get all available dates
 */
export function getAvailableDates(): string[] {
  return MSTR_DAILY_MNAV.map(s => s.date);
}
`;

  return content;
}

async function main() {
  console.log("=== Generating Daily MSTR mNAV History ===\n");

  // Step 1: Read BTC prices from saved files
  console.log("Step 1: Reading BTC prices from saved MCP tool outputs...");
  const btcPrices = readBtcPricesFromFiles();
  console.log(`  Total BTC prices: ${btcPrices.size}\n`);

  if (btcPrices.size === 0) {
    console.error("ERROR: No BTC prices found. Run the MCP tool first to fetch prices.");
    process.exit(1);
  }

  // Step 2: Fetch MSTR prices from Yahoo Finance
  console.log("Step 2: Fetching MSTR prices from Yahoo Finance...");
  const mstrPrices = await fetchMstrPrices("2020-08-01", "2026-12-31");
  console.log(`  Total MSTR prices: ${mstrPrices.size}\n`);

  // Step 3: Calculate daily mNAV for dates where we have both prices
  console.log("Step 3: Calculating daily mNAV with full balance sheet...");

  const allDates = new Set([...btcPrices.keys(), ...mstrPrices.keys()]);
  const sortedDates = Array.from(allDates).sort();

  const snapshots: DailyMnavSnapshot[] = [];
  let skippedNoPrices = 0;
  let skippedNoCapStructure = 0;

  for (const date of sortedDates) {
    const btcPrice = btcPrices.get(date);
    const stockPrice = mstrPrices.get(date);

    if (!btcPrice || !stockPrice) {
      skippedNoPrices++;
      continue;
    }

    // Get capital structure for this date
    const capStructure = getCapitalStructureAt(date);
    if (!capStructure) {
      skippedNoCapStructure++;
      continue;
    }

    // Calculate mNAV
    const snapshot = calculateDailyMnav(date, btcPrice, stockPrice, capStructure);
    snapshots.push(snapshot);
  }

  console.log(`  Generated ${snapshots.length} daily mNAV snapshots`);
  console.log(`  Skipped ${skippedNoPrices} dates (missing price data)`);
  console.log(`  Skipped ${skippedNoCapStructure} dates (no capital structure data)`);

  // Show sample of results
  if (snapshots.length > 0) {
    console.log("\n  Sample snapshots:");
    const samples = [
      snapshots[0],
      snapshots[Math.floor(snapshots.length / 2)],
      snapshots[snapshots.length - 1],
    ];
    for (const s of samples) {
      const dilutionPct = ((s.dilutedShares - s.basicShares) / s.basicShares * 100).toFixed(1);
      console.log(
        `    ${s.date}: mNAV=${s.mnav.toFixed(2)}x, BTC/share=${s.btcPerShare.toFixed(6)}, ` +
        `dilution=${dilutionPct}%, shares=${(s.dilutedShares / 1e6).toFixed(1)}M`
      );
    }
  }

  // Step 4: Generate output file
  console.log("\nStep 4: Generating output file...");
  const content = generateOutputFile(snapshots);

  const outputPath = path.join(
    __dirname,
    "../src/lib/data/mstr-daily-mnav.ts"
  );
  fs.writeFileSync(outputPath, content);
  console.log(`  Written to: ${outputPath}`);

  console.log("\n=== Done! ===");
}

main().catch(console.error);
