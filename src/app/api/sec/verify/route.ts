// SEC Filing Verification Endpoint
// Full pipeline: FMP monitor → Fetch content → LLM extract → Compare to stored data
// GET /api/sec/verify?ticker=MSTR (single company)
// GET /api/sec/verify (all companies with recent 8-Ks)

import { NextResponse } from "next/server";
import { getFilingsBySymbol, getFilingsByCik, filter8KFilings, getDateRange } from "@/lib/sec/fmp-sec-client";
import { COMPANY_SOURCES } from "@/lib/data/company-sources";
import { allCompanies } from "@/lib/data/companies";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SEC_USER_AGENT = "DATTracker/1.0 (https://dat-tracker-next.vercel.app; contact@dattracker.com)";

interface VerificationResult {
  ticker: string;
  companyName: string;
  asset: string;
  storedHoldings: number;
  filing?: {
    date: string;
    type: string;
    url: string;
  };
  extractedHoldings?: number;
  discrepancy?: {
    absolute: number;
    percentage: number;
    direction: "higher" | "lower";
  };
  status: "verified" | "discrepancy" | "no_filing" | "extraction_failed" | "error";
  details?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const days = parseInt(searchParams.get("days") || "14", 10);

  try {
    if (ticker) {
      // Verify single company
      const result = await verifyCompany(ticker.toUpperCase(), days);
      return NextResponse.json(result);
    } else {
      // Verify all companies with recent 8-K filings
      const results = await verifyAllCompanies(days);
      return NextResponse.json({
        summary: {
          total: results.length,
          verified: results.filter(r => r.status === "verified").length,
          discrepancies: results.filter(r => r.status === "discrepancy").length,
          noFiling: results.filter(r => r.status === "no_filing").length,
          errors: results.filter(r => r.status === "error" || r.status === "extraction_failed").length,
        },
        results,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    return NextResponse.json({
      error: "Verification failed",
      details: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

async function verifyCompany(ticker: string, days: number): Promise<VerificationResult> {
  // Get company data
  const company = allCompanies.find(c => c.ticker.toUpperCase() === ticker);
  const sources = COMPANY_SOURCES[ticker];

  if (!company) {
    return {
      ticker,
      companyName: "Unknown",
      asset: "Unknown",
      storedHoldings: 0,
      status: "error",
      details: `Company ${ticker} not found in database`,
    };
  }

  const secCik = sources?.secCik;
  if (!secCik) {
    return {
      ticker,
      companyName: company.name,
      asset: company.asset,
      storedHoldings: company.holdings,
      status: "error",
      details: `No SEC CIK configured for ${ticker}`,
    };
  }

  // Get recent filings
  const { from, to } = getDateRange(days);
  let filings = await getFilingsBySymbol(ticker, from, to);

  // Fallback to CIK if needed
  if (filings.length === 0) {
    filings = await getFilingsByCik(secCik, from, to);
  }

  // Filter to 8-K only (most likely to have holdings updates)
  const eightKFilings = filter8KFilings(filings);

  if (eightKFilings.length === 0) {
    return {
      ticker,
      companyName: company.name,
      asset: company.asset,
      storedHoldings: company.holdings,
      status: "no_filing",
      details: `No 8-K filings found in last ${days} days`,
    };
  }

  // Try multiple 8-K filings until we find one with holdings data
  // (Not all 8-Ks contain holdings - some are just ATM updates)
  let extractedHoldings: number | null = null;
  let usedFiling = eightKFilings[0];
  let lastError = "";

  for (const filing of eightKFilings.slice(0, 5)) { // Try up to 5 recent 8-Ks
    const content = await fetchFilingContent(filing.finalLink);

    if (!content) {
      lastError = "Could not fetch filing content";
      continue;
    }

    // Check if this filing has holdings data
    const holdings = extractHoldingsFromContent(content, company.asset);
    if (holdings !== null) {
      extractedHoldings = holdings;
      usedFiling = filing;
      break;
    }

    lastError = `No ${company.asset} holdings found in filing`;
  }

  if (extractedHoldings === null) {
    return {
      ticker,
      companyName: company.name,
      asset: company.asset,
      storedHoldings: company.holdings,
      filing: {
        date: usedFiling.filingDate,
        type: usedFiling.formType,
        url: usedFiling.finalLink,
      },
      status: "extraction_failed",
      details: `Could not extract ${company.asset} holdings from ${eightKFilings.length} 8-K filings (${lastError})`,
    };
  }

  // Compare to stored data
  const absoluteDiff = extractedHoldings - company.holdings;
  const percentageDiff = (absoluteDiff / company.holdings) * 100;

  if (Math.abs(percentageDiff) < 1) {
    // Within 1% - verified
    return {
      ticker,
      companyName: company.name,
      asset: company.asset,
      storedHoldings: company.holdings,
      filing: {
        date: usedFiling.filingDate,
        type: usedFiling.formType,
        url: usedFiling.finalLink,
      },
      extractedHoldings,
      status: "verified",
      details: `Holdings match within 1% (${percentageDiff.toFixed(2)}% difference)`,
    };
  } else {
    // Discrepancy found
    return {
      ticker,
      companyName: company.name,
      asset: company.asset,
      storedHoldings: company.holdings,
      filing: {
        date: usedFiling.filingDate,
        type: usedFiling.formType,
        url: usedFiling.finalLink,
      },
      extractedHoldings,
      discrepancy: {
        absolute: absoluteDiff,
        percentage: percentageDiff,
        direction: absoluteDiff > 0 ? "higher" : "lower",
      },
      status: "discrepancy",
      details: `SEC filing shows ${extractedHoldings.toLocaleString()} ${company.asset}, we have ${company.holdings.toLocaleString()} (${percentageDiff > 0 ? "+" : ""}${percentageDiff.toFixed(2)}%)`,
    };
  }
}

async function verifyAllCompanies(days: number): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Get companies with SEC CIKs
  const companiesWithSec = allCompanies.filter(c => {
    const sources = COMPANY_SOURCES[c.ticker];
    return sources?.secCik;
  });

  console.log(`[Verify] Checking ${companiesWithSec.length} companies with SEC CIKs...`);

  // Process in batches
  const batchSize = 3;
  for (let i = 0; i < companiesWithSec.length; i += batchSize) {
    const batch = companiesWithSec.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(c => verifyCompany(c.ticker, days))
    );

    results.push(...batchResults);

    // Rate limiting
    if (i + batchSize < companiesWithSec.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return results;
}

async function fetchFilingContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": SEC_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,text/plain",
      },
      cache: "no-store",
    });

    if (!response.ok) return null;

    const html = await response.text();

    // Clean HTML
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&#160;/g, " ")
      .replace(/&#8217;/g, "'")
      .replace(/&#8220;/g, '"')
      .replace(/&#8221;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  } catch (error) {
    console.error(`[Verify] Error fetching ${url}:`, error);
    return null;
  }
}

// Simple pattern-based holdings extraction
// For production, use the LLM extractor for better accuracy
function extractHoldingsFromContent(content: string, asset: string): number | null {
  // Special handling for MSTR-style table format
  // Look for "Aggregate BTC Holdings" and find the largest number after it
  if (asset === "BTC") {
    const aggregateMatch = content.match(/aggregate\s+btc\s+holdings/i);
    if (aggregateMatch && aggregateMatch.index !== undefined) {
      // Look at the next 800 characters after the keyword
      const afterKeyword = content.slice(aggregateMatch.index, aggregateMatch.index + 800);
      // Find all numbers that are 100,000+ (6+ digits when stripped of commas)
      const numbers: number[] = [];
      const numberMatches = afterKeyword.matchAll(/(?<!\$\s?)(?<!\.\d)(\d{1,3}(?:,\d{3})+|\d{6,})(?!\.\d)/g);
      for (const m of numberMatches) {
        const val = parseInt(m[1].replace(/,/g, ""), 10);
        if (val >= 100000 && val < 10000000) { // Reasonable BTC holdings range
          numbers.push(val);
        }
      }
      // Return the largest number found (likely the total, not period acquisition)
      if (numbers.length > 0) {
        return Math.max(...numbers);
      }
    }
  }

  const assetPatterns: Record<string, RegExp[]> = {
    BTC: [
      // Direct format: "Aggregate BTC Holdings   709,715"
      /aggregate\s+btc\s+holdings[:\s]+(\d[\d,]*)/i,
      /btc\s+holdings[:\s]+(\d[\d,]*)/i,
      // Standard formats
      /held?\s+(?:approximately\s+)?(\d[\d,]*)\s+(?:bitcoin|btc)/i,
      /(\d[\d,]*)\s+(?:bitcoin|btc)\s+(?:held|holdings|in\s+treasury)/i,
      /total\s+(?:bitcoin|btc)\s+(?:held|holdings)[:\s]+(\d[\d,]*)/i,
      /bitcoin\s+holdings[:\s]+(\d[\d,]*)/i,
      // Treasury format
      /(?:bitcoin|btc)\s+treasury[:\s]+(\d[\d,]*)/i,
      /treasury\s+(?:holds?|contains?)[:\s]+(\d[\d,]*)\s+(?:bitcoin|btc)/i,
    ],
    ETH: [
      // Aggregate format
      /aggregate\s+eth(?:ereum)?\s+holdings[:\s]+(\d[\d,]*)/i,
      /eth(?:ereum)?\s+holdings[:\s]+(\d[\d,]*)/i,
      // Standard formats
      /held?\s+(?:approximately\s+)?(\d[\d,]*)\s+(?:ethereum|ether|eth)/i,
      /(\d[\d,]*)\s+(?:ethereum|ether|eth)\s+(?:held|holdings|in\s+treasury)/i,
      /total\s+(?:ethereum|eth)\s+(?:held|holdings)[:\s]+(\d[\d,]*)/i,
      /(?:ethereum|eth)\s+treasury[:\s]+(\d[\d,]*)/i,
    ],
    SOL: [
      /aggregate\s+sol(?:ana)?\s+holdings[:\s]+(\d[\d,]*)/i,
      /sol(?:ana)?\s+holdings[:\s]+(\d[\d,]*)/i,
      /held?\s+(?:approximately\s+)?(\d[\d,]*)\s+(?:solana|sol)/i,
      /(\d[\d,]*)\s+(?:solana|sol)\s+(?:held|holdings|in\s+treasury)/i,
      /total\s+sol(?:ana)?\s+(?:held|holdings)[:\s]+(\d[\d,]*)/i,
    ],
    HYPE: [
      /aggregate\s+hype\s+(?:token\s+)?holdings[:\s]+(\d[\d,]*)/i,
      /hype\s+(?:token\s+)?holdings[:\s]+(\d[\d,]*)/i,
      /held?\s+(?:approximately\s+)?(\d[\d,]*)\s+(?:hype|hyperliquid)/i,
      /(\d[\d,]*)\s+(?:hype|hyperliquid)\s+(?:tokens?|held|holdings)/i,
    ],
  };

  const patterns = assetPatterns[asset] || [];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const value = parseInt(match[1].replace(/,/g, ""), 10);
      if (!isNaN(value) && value > 0) {
        return value;
      }
    }
  }

  return null;
}
