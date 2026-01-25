import { NextResponse } from "next/server";

const FMP_API_KEY = process.env.FMP_API_KEY || "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol") || "PURR";

  if (!FMP_API_KEY) {
    return NextResponse.json({ error: "FMP_API_KEY not configured" }, { status: 500 });
  }

  try {
    // Test SEC filings by symbol endpoint
    const fromDate = "2025-12-01";
    const toDate = "2026-01-31";

    const url = `https://financialmodelingprep.com/stable/sec-filings-search/symbol?symbol=${symbol}&from=${fromDate}&to=${toDate}&limit=20&apikey=${FMP_API_KEY}`;

    console.log(`[SEC Test] Fetching filings for ${symbol}...`);
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json({
        error: `FMP API error: ${response.status}`,
        details: text,
        url: url.replace(FMP_API_KEY, "***")
      }, { status: response.status });
    }

    const data = await response.json();

    return NextResponse.json({
      symbol,
      fromDate,
      toDate,
      filingCount: Array.isArray(data) ? data.length : 0,
      filings: data,
    });
  } catch (error) {
    return NextResponse.json({
      error: "Failed to fetch SEC filings",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
