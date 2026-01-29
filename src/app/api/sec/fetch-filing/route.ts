// SEC Filing Content Fetcher
// Checks local storage first, then fetches from SEC EDGAR if not found
// GET /api/sec/fetch-filing?url=<SEC_URL>
// GET /api/sec/fetch-filing?ticker=<TICKER>&accession=<ACCESSION>

import { NextResponse } from "next/server";
import * as fs from "fs";
import * as path from "path";

export const dynamic = "force-dynamic";

// SEC requires a User-Agent with contact info
const SEC_USER_AGENT = "DATTracker/1.0 (https://dat-tracker-next.vercel.app; contact@dattracker.com)";

// Local content directory
const CONTENT_DIR = path.join(process.cwd(), "data", "sec-content");

// CIK to ticker mapping (loaded from metadata files)
let cikToTicker: Record<string, string> | null = null;

function loadCikMapping(): Record<string, string> {
  if (cikToTicker) return cikToTicker;
  
  cikToTicker = {};
  const metadataDir = path.join(process.cwd(), "src", "lib", "data", "sec-filings");
  
  try {
    const files = fs.readdirSync(metadataDir).filter(f => f.endsWith(".json"));
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(metadataDir, file), "utf-8"));
      if (data.cik && data.ticker) {
        // Store with and without leading zeros
        cikToTicker[data.cik] = data.ticker.toLowerCase();
        cikToTicker[data.cik.replace(/^0+/, "")] = data.ticker.toLowerCase();
      }
    }
  } catch (e) {
    console.error("[SEC Fetch] Failed to load CIK mapping:", e);
  }
  
  return cikToTicker;
}

// Parse SEC URL to extract CIK and accession number
// URL format: https://www.sec.gov/Archives/edgar/data/{CIK}/{accessionNoDashes}/form8-k.htm
function parseSecUrl(url: string): { cik: string; accession: string } | null {
  const match = url.match(/\/edgar\/data\/(\d+)\/(\d+)\//);
  if (!match) return null;
  
  const cik = match[1];
  const accessionNoDashes = match[2];
  
  // Convert 000149315226004069 to 0001493152-26-004069
  if (accessionNoDashes.length === 18) {
    const accession = `${accessionNoDashes.slice(0, 10)}-${accessionNoDashes.slice(10, 12)}-${accessionNoDashes.slice(12)}`;
    return { cik, accession };
  }
  
  return null;
}

// Try to read from local storage
function tryReadLocal(ticker: string, accession: string): string | null {
  const filepath = path.join(CONTENT_DIR, ticker.toLowerCase(), `${accession}.txt`);
  
  try {
    if (fs.existsSync(filepath)) {
      console.log(`[SEC Fetch] Found local: ${filepath}`);
      return fs.readFileSync(filepath, "utf-8");
    }
  } catch (e) {
    console.error(`[SEC Fetch] Error reading local file:`, e);
  }
  
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const ticker = searchParams.get("ticker");
  const accession = searchParams.get("accession");

  // Option 1: Direct ticker + accession lookup
  if (ticker && accession) {
    const localContent = tryReadLocal(ticker, accession);
    if (localContent) {
      const cleanedContent = cleanHtmlContent(localContent);
      return NextResponse.json({
        source: "local",
        ticker,
        accession,
        contentLength: localContent.length,
        cleanedLength: cleanedContent.length,
        content: cleanedContent.substring(0, 50000),
        timestamp: new Date().toISOString(),
      });
    }
    return NextResponse.json({ error: "Filing not found locally" }, { status: 404 });
  }

  // Option 2: URL-based lookup
  if (!url) {
    return NextResponse.json({ error: "url or (ticker + accession) required" }, { status: 400 });
  }

  // Only allow SEC URLs
  if (!url.includes("sec.gov")) {
    return NextResponse.json({ error: "Only SEC URLs are allowed" }, { status: 400 });
  }

  // Try local first
  const parsed = parseSecUrl(url);
  if (parsed) {
    const mapping = loadCikMapping();
    const tickerFromCik = mapping[parsed.cik];
    
    if (tickerFromCik) {
      const localContent = tryReadLocal(tickerFromCik, parsed.accession);
      if (localContent) {
        const cleanedContent = cleanHtmlContent(localContent);
        return NextResponse.json({
          source: "local",
          url,
          ticker: tickerFromCik.toUpperCase(),
          accession: parsed.accession,
          contentLength: localContent.length,
          cleanedLength: cleanedContent.length,
          content: cleanedContent.substring(0, 50000),
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // Fall back to SEC
  try {
    console.log(`[SEC Fetch] Fetching from SEC: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": SEC_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,text/plain,application/xml",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({
        error: `SEC returned ${response.status}`,
        url,
      }, { status: response.status });
    }

    const content = await response.text();
    const cleanedContent = cleanHtmlContent(content);

    return NextResponse.json({
      source: "sec",
      url,
      contentLength: content.length,
      cleanedLength: cleanedContent.length,
      content: cleanedContent.substring(0, 50000),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[SEC Fetch] Error:", error);
    return NextResponse.json({
      error: "Failed to fetch filing",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

// Clean HTML/text content to extract readable text
function cleanHtmlContent(html: string): string {
  return html
    // Remove style tags and content
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    // Remove script tags and content
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, "")
    // Replace common entities
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    // Remove all HTML tags
    .replace(/<[^>]*>/g, " ")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}
