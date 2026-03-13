/**
 * Price Capture Cron Endpoint
 * 
 * Called by Vercel Cron every 15 minutes during market hours.
 * Captures current stock prices and appends to historical files.
 */

import { NextRequest, NextResponse } from "next/server";

const FMP_API_KEY = process.env.FMP_API_KEY || "";

// All tickers to capture
const TICKERS = [
  "MSTR", "MARA", "RIOT", "CLSK", "KULR", "SMLR", "BTBT", "BTCS",
  "HUT", "WULF", "IREN", "CIFR", "HIVE", "BITF", "GREE", "ARBK",
  "SLNH", "DJT", "XXI", "ABTC", "CEPO", "EXOD", "BTOG", "NAKA",
  "ASST", "AVX", "STKE", "BNC", "BMNR", "SQNS", "ETHM", "CORZ",
  "BTDR", "MNMD", "BITO",
  "3350.T", "0434.HK", "DCC.AX", "BTCT.V"
];

// Simple in-memory store for prices (will persist to KV/DB in production)
// For now, we'll use the Vercel Blob storage or just log for verification

type QuoteOut = {
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
};

type FmpQuote = {
  symbol?: string;
  price?: number;
  open?: number;
  dayHigh?: number;
  dayLow?: number;
  volume?: number;
};

/**
 * Fetch current quotes from FMP
 */
async function fetchQuotes(): Promise<Record<string, QuoteOut>> {
  const tickerList = TICKERS.join(",");
  const url = `https://financialmodelingprep.com/stable/batch-quote?symbols=${tickerList}&apikey=${FMP_API_KEY}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`FMP error: ${response.status}`);
  }
  
  const data = (await response.json()) as FmpQuote[];
  const quotes: Record<string, QuoteOut> = {};

  for (const quote of data) {
    const symbol = quote.symbol;
    const price = quote.price;
    if (!symbol || typeof price !== 'number') continue;

    quotes[symbol] = {
      price,
      open: typeof quote.open === 'number' ? quote.open : price,
      high: typeof quote.dayHigh === 'number' ? quote.dayHigh : price,
      low: typeof quote.dayLow === 'number' ? quote.dayLow : price,
      volume: typeof quote.volume === 'number' ? quote.volume : 0,
    };
  }
  
  return quotes;
}

export async function GET(request: NextRequest) {
  // Verify cron secret (optional security)
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const startTime = Date.now();
  
  try {
    if (!FMP_API_KEY) {
      return NextResponse.json({ error: "No FMP API key" }, { status: 500 });
    }
    
    const quotes = await fetchQuotes();
    const timestamp = new Date().toISOString();
    
    // For now, we'll store to a simple endpoint that appends to files
    // In production, use Vercel KV, Blob, or external DB
    
    // Log for verification
    console.log(`[Price Capture] ${timestamp} - ${Object.keys(quotes).length} quotes`);
    
    // TODO: Persist to storage
    // Options:
    // 1. Vercel KV (Redis) - fast, good for recent data
    // 2. Vercel Blob - good for JSON files
    // 3. External DB (Supabase, PlanetScale)
    // 4. GitHub commit via API (for the JSON files approach)
    
    return NextResponse.json({
      success: true,
      timestamp,
      captured: Object.keys(quotes).length,
      duration: Date.now() - startTime,
      sample: Object.entries(quotes).slice(0, 3).map(([ticker, data]) => ({
        ticker,
        price: data.price,
      })),
    });
    
  } catch (error) {
    console.error("[Price Capture] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
