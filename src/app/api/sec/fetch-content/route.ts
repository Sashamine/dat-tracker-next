import { NextRequest, NextResponse } from "next/server";
import { D1Client } from "@/lib/d1";

export const dynamic = "force-dynamic";

// R2 bucket for cached filings
const R2_BASE_URL = "https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev";
const R2_PREFIXES = ["new-uploads", "batch1", "batch2", "batch3", "batch4", "batch5", "batch6", "external-sources"];

// Map tickers to CIKs
const TICKER_CIKS: Record<string, string> = {
  mstr: "1050446",
  mara: "1507605",
  riot: "1167419",
  clsk: "1515671",
  btbt: "1799290",
  kulr: "1662684",
  fufu: "1921158",
  naka: "1977303",
  abtc: "2068580",
  btcs: "1510079",
  bmnr: "1829311",
  game: "1825079",
  fgnx: "1591890",
  lits: "1411460",
  dfdv: "1652044",
  upxi: "1777319",
  hsdt: "1580063",
  tron: "1956744",
  cwd: "1627282",
  stke: "1846839",
  sqns: "1383395",
  twav: "746210",
  asst: "1920406",
  djt: "1849635",
  xxi: "2070457",
  fld: "1899287",
  sbet: "1869198",
  cepo: "2027708",
  avx: "1826397",
  ethm: "2028699",
  hypd: "1437107",
  purr: "2078856",
  na: "1872302",
  taox: "1539029",
  suig: "1425355",
  tbh: "1903595",
  btog: "1735556",
  zone: "1849430",
  xrpn: "1991453",
  cyph: "1509745",
  bnc: "1952979",
  ddc: "1808110",
  zooz: "1992818",
  fwdi: "38264",
  cifr: "1819989",
  coin: "1679788",
  corz: "1839341",
  glxy: "1859392",
  hive: "1062993",
  hood: "1783879",
  hut: "1731160",
  iren: "1878848",
  sdig: "1771124",
  smlr: "1564590",
  sq: "1628280",
  wulf: "1083301",
};

/**
 * Try to fetch filing from R2 cache first.
 * 1. Probe all prefix/{ticker}/{accession}.txt patterns
 * 2. Fall back to D1 artifact r2_key lookup (handles UUID-named external-sources files)
 */
async function fetchFromR2(ticker: string, accession: string): Promise<string | null> {
  const tickerLower = ticker.toLowerCase();
  for (const prefix of R2_PREFIXES) {
    const url = `${R2_BASE_URL}/${prefix}/${tickerLower}/${accession}.txt`;
    try {
      const res = await fetch(url);
      if (res.ok) {
        console.log(`[SEC Fetch] Found in R2: ${prefix}/${ticker}/${accession}`);
        return await res.text();
      }
    } catch {
      // Try next prefix
    }
  }

  // Fall back to D1 r2_key lookup (external-sources files use UUID filenames)
  try {
    const d1 = D1Client.fromEnv();
    const { results } = await d1.query<{ r2_key: string }>(
      `SELECT r2_key FROM artifacts WHERE accession = ? AND r2_key IS NOT NULL LIMIT 1`,
      [accession]
    );
    if (results.length > 0) {
      const r2Key = results[0].r2_key;
      // Skip JSON/PDF — we need text/html content
      if (!r2Key.endsWith('.json') && !r2Key.endsWith('.pdf')) {
        const url = `${R2_BASE_URL}/${r2Key}`;
        const res = await fetch(url);
        if (res.ok) {
          console.log(`[SEC Fetch] Found in R2 via D1 r2_key: ${r2Key}`);
          return await res.text();
        }
      }
    }
  } catch (err) {
    console.warn(`[SEC Fetch] D1 r2_key lookup failed for ${accession}:`, err);
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker")?.toLowerCase();
  const accession = searchParams.get("accession");
  const skipCache = searchParams.get("skipCache") === "true";

  if (!ticker || !accession) {
    return NextResponse.json(
      { error: "Missing ticker or accession parameter" },
      { status: 400 }
    );
  }

  // Try R2 cache first (unless skipCache=true) — works for all tickers including foreign
  if (!skipCache) {
    const r2Content = await fetchFromR2(ticker, accession);
    if (r2Content) {
      return new NextResponse(r2Content, {
        headers: {
          "Content-Type": "text/html",
          "Cache-Control": "public, max-age=86400",
          "X-Source": "r2-cache",
        },
      });
    }
  }

  // Fall back to SEC EDGAR (requires CIK mapping)
  const cik = TICKER_CIKS[ticker];
  if (!cik) {
    return NextResponse.json(
      { error: `No document found for ${ticker}/${accession}` },
      { status: 404 }
    );
  }

  console.log(`[SEC Fetch] Not in R2, fetching from SEC: ${ticker}/${accession}`);

  // Clean accession for SEC URL (remove dashes)
  const accessionClean = accession.replace(/-/g, "");

  try {
    // Fetch the filing index to find the primary document
    const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/index.json`;
    
    const indexRes = await fetch(indexUrl, {
      headers: { 
        "User-Agent": "DAT-Tracker research@dat-tracker.com",
        "Accept": "application/json",
      },
    });

    if (!indexRes.ok) {
      return NextResponse.json(
        { error: `SEC filing not found: ${indexRes.status}` },
        { status: 404 }
      );
    }

    const index = await indexRes.json();
    const items = index.directory?.item || [];

    // Find the primary document (prefer .htm over .txt)
    let primaryDoc = items.find(
      (item: { name: string }) =>
        item.name.endsWith(".htm") &&
        !item.name.toLowerCase().includes("ex") &&
        !item.name.startsWith("R")
    );
    
    if (!primaryDoc) {
      primaryDoc = items.find((item: { name: string }) => 
        item.name.endsWith(".htm") || item.name.endsWith(".txt")
      );
    }

    if (!primaryDoc) {
      return NextResponse.json(
        { error: "No document found in filing" },
        { status: 404 }
      );
    }

    // Fetch the actual document
    const docUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accessionClean}/${primaryDoc.name}`;
    
    const docRes = await fetch(docUrl, {
      headers: { 
        "User-Agent": "DAT-Tracker research@dat-tracker.com",
      },
    });

    if (!docRes.ok) {
      return NextResponse.json(
        { error: `Failed to fetch document: ${docRes.status}` },
        { status: 500 }
      );
    }

    const content = await docRes.text();

    return new NextResponse(content, {
      headers: {
        "Content-Type": primaryDoc.name.endsWith(".htm") ? "text/html" : "text/plain",
        "Cache-Control": "public, max-age=86400", // Cache for 1 day
        "X-Source": "sec-direct",
      },
    });

  } catch (error) {
    console.error("Error fetching SEC filing:", error);
    return NextResponse.json(
      { error: "Failed to fetch from SEC" },
      { status: 500 }
    );
  }
}
