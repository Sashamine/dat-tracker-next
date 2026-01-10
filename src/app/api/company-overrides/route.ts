import { NextResponse } from "next/server";

/**
 * Fetches company data overrides from a published Google Sheet.
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a Google Sheet with columns:
 *    ticker, holdings, quarterlyBurnUsd, stakingPct, stakingApy, leverageRatio, notes
 * 2. File > Share > Publish to web
 * 3. Select "Comma-separated values (.csv)" and click Publish
 * 4. Copy the URL and set it as GOOGLE_SHEET_CSV_URL env variable
 *
 * Sheet format example:
 * | ticker | holdings | quarterlyBurnUsd | stakingPct | stakingApy | leverageRatio | notes |
 * |--------|----------|------------------|------------|------------|---------------|-------|
 * | MSTR   | 628791   | 15000000         |            |            | 1.5           |       |
 * | BMNR   | 15000    | 2000000          | 0.8        | 0.04       |               |       |
 */

// Cache for sheet data
let sheetCache: { data: Record<string, CompanyOverride>; timestamp: number } | null = null;
const CACHE_TTL = 300000; // 5 minutes (sheet data doesn't change often)

export interface CompanyOverride {
  ticker: string;
  holdings?: number;
  quarterlyBurnUsd?: number;
  stakingPct?: number;
  stakingApy?: number;
  leverageRatio?: number;
  costBasisAvg?: number;
  marketCap?: number;
  notes?: string;
  lastUpdated?: string;
}

// Parse CSV row into override object
function parseRow(headers: string[], values: string[]): CompanyOverride | null {
  const ticker = values[headers.indexOf("ticker")]?.trim().toUpperCase();
  if (!ticker) return null;

  const override: CompanyOverride = { ticker };

  // Parse numeric fields
  const numericFields = [
    "holdings",
    "quarterlyBurnUsd",
    "stakingPct",
    "stakingApy",
    "leverageRatio",
    "costBasisAvg",
    "marketCap",
  ];

  for (const field of numericFields) {
    const idx = headers.indexOf(field);
    if (idx !== -1 && values[idx]?.trim()) {
      const val = parseFloat(values[idx].replace(/,/g, ""));
      if (!isNaN(val)) {
        (override as any)[field] = val;
      }
    }
  }

  // Parse string fields
  const stringFields = ["notes", "lastUpdated"];
  for (const field of stringFields) {
    const idx = headers.indexOf(field);
    if (idx !== -1 && values[idx]?.trim()) {
      (override as any)[field] = values[idx].trim();
    }
  }

  return override;
}

// Parse CSV text into array of overrides
function parseCSV(csv: string): CompanyOverride[] {
  const lines = csv.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  // First line is headers
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());

  const overrides: CompanyOverride[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle CSV with quoted values containing commas
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current);

    const override = parseRow(headers, values);
    if (override) {
      overrides.push(override);
    }
  }

  return overrides;
}

export async function GET() {
  // Return cached data if fresh
  if (sheetCache && Date.now() - sheetCache.timestamp < CACHE_TTL) {
    return NextResponse.json({
      overrides: sheetCache.data,
      cached: true,
      timestamp: new Date(sheetCache.timestamp).toISOString(),
    });
  }

  const sheetUrl = process.env.GOOGLE_SHEET_CSV_URL;

  if (!sheetUrl) {
    return NextResponse.json({
      overrides: {},
      error: "GOOGLE_SHEET_CSV_URL not configured",
      timestamp: new Date().toISOString(),
    });
  }

  try {
    const response = await fetch(sheetUrl, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.status}`);
    }

    const csv = await response.text();
    const overrides = parseCSV(csv);

    // Convert to lookup by ticker
    const overrideMap: Record<string, CompanyOverride> = {};
    for (const override of overrides) {
      overrideMap[override.ticker] = override;
    }

    // Update cache
    sheetCache = { data: overrideMap, timestamp: Date.now() };

    return NextResponse.json({
      overrides: overrideMap,
      count: overrides.length,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching company overrides:", error);

    // Return stale cache if available
    if (sheetCache) {
      return NextResponse.json({
        overrides: sheetCache.data,
        cached: true,
        stale: true,
        error: String(error),
        timestamp: new Date(sheetCache.timestamp).toISOString(),
      });
    }

    return NextResponse.json({
      overrides: {},
      error: String(error),
      timestamp: new Date().toISOString(),
    });
  }
}
