// SEC Filing Verification Endpoint
// Full pipeline: FMP monitor → Fetch content → LLM extract → Compare to stored data
// GET /api/sec/verify?ticker=MSTR (single company)
// GET /api/sec/verify (all companies with recent 8-Ks)

import { NextResponse } from "next/server";
import { getFilingsBySymbol, getFilingsByCik, filter8KFilings, filterFinancialReports, getDateRange } from "@/lib/sec/fmp-sec-client";
import { COMPANY_SOURCES } from "@/lib/data/company-sources";
import { allCompanies } from "@/lib/data/companies";
import { extractHoldingsFromText, createLLMConfigFromEnv } from "@/lib/sec/llm-extractor";
import type { ExtractionContext } from "@/lib/sec/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SEC_USER_AGENT = "DATTracker/1.0 (https://dat-tracker-next.vercel.app; contact@dattracker.com)";

interface VerificationResult {
  ticker: string;
  companyName: string;
  asset: string;
  storedHoldings: number;
  extractionMethod?: string;
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
  status: "verified" | "discrepancy" | "needs_review" | "no_filing" | "extraction_failed" | "error";
  details?: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get("ticker");
  const days = parseInt(searchParams.get("days") || "14", 10);
  const useLLM = searchParams.get("llm") === "true"; // Enable LLM fallback

  try {
    if (ticker) {
      // Verify single company
      const result = await verifyCompany(ticker.toUpperCase(), days, useLLM);
      return NextResponse.json(result);
    } else {
      // Verify all companies with recent 8-K filings
      const results = await verifyAllCompanies(days);
      return NextResponse.json({
        summary: {
          total: results.length,
          verified: results.filter(r => r.status === "verified").length,
          discrepancies: results.filter(r => r.status === "discrepancy").length,
          needsReview: results.filter(r => r.status === "needs_review").length,
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

async function verifyCompany(ticker: string, days: number, useLLM = false): Promise<VerificationResult> {
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

  // Get recent filings - first try 8-K (material events), then 10-Q/10-K (quarterly/annual)
  const { from, to } = getDateRange(days);
  let filings = await getFilingsBySymbol(ticker, from, to);

  // Fallback to CIK if needed
  if (filings.length === 0) {
    filings = await getFilingsByCik(secCik, from, to);
  }

  // Filter to 8-K only (most likely to have holdings updates)
  const eightKFilings = filter8KFilings(filings);

  // Try multiple 8-K filings until we find one with holdings data
  // (Not all 8-Ks contain holdings - some are just ATM updates)
  let extractedHoldings: number | null = null;
  let usedFiling = eightKFilings[0];
  let lastError = "";
  let lastContent = "";
  let extractionMethod = "pattern";
  const searchedFilingTypes = ["8-K"];

  for (const filing of eightKFilings.slice(0, 5)) { // Try up to 5 recent 8-Ks
    const content = await fetchFilingContent(filing.finalLink);

    if (!content) {
      lastError = "Could not fetch filing content";
      continue;
    }

    lastContent = content;

    // Step 1: Try pattern-based extraction (fast, free)
    const holdings = extractHoldingsFromContent(content, company.asset);
    if (holdings !== null) {
      extractedHoldings = holdings;
      usedFiling = filing;
      extractionMethod = "pattern";
      break;
    }

    lastError = `No ${company.asset} holdings found in filing`;
  }

  // Step 2: If no 8-K holdings found, try 10-Q/10-K with longer lookback (90 days)
  if (extractedHoldings === null) {
    const financialDays = Math.max(days, 90); // At least 90 days for quarterly reports
    const { from: financialFrom, to: financialTo } = getDateRange(financialDays);

    let financialFilings = await getFilingsBySymbol(ticker, financialFrom, financialTo);
    if (financialFilings.length === 0) {
      financialFilings = await getFilingsByCik(secCik, financialFrom, financialTo);
    }

    const quarterlyFilings = filterFinancialReports(financialFilings);
    searchedFilingTypes.push("10-Q", "10-K");

    for (const filing of quarterlyFilings.slice(0, 3)) { // Try up to 3 recent 10-Qs/10-Ks
      const content = await fetchFilingContent(filing.finalLink);

      if (!content) {
        lastError = "Could not fetch filing content";
        continue;
      }

      lastContent = content;

      // Try pattern-based extraction (stricter for 10-Q/10-K to avoid financial data false positives)
      const holdings = extractHoldingsFromContent(content, company.asset, true);
      if (holdings !== null) {
        extractedHoldings = holdings;
        usedFiling = filing;
        extractionMethod = "pattern (10-Q/10-K)";
        break;
      }

      lastError = `No ${company.asset} holdings found in 10-Q/10-K`;
    }
  }

  // Check if we have any filing to report
  if (!usedFiling && eightKFilings.length === 0) {
    return {
      ticker,
      companyName: company.name,
      asset: company.asset,
      storedHoldings: company.holdings,
      status: "no_filing",
      details: `No SEC filings found in last ${days} days (8-K) or ${Math.max(days, 90)} days (10-Q/10-K)`,
    };
  }

  // Step 2: If pattern extraction failed and LLM is enabled, try LLM extraction
  if (extractedHoldings === null && useLLM && lastContent) {
    const llmConfig = createLLMConfigFromEnv();
    if (llmConfig) {
      console.log(`[Verify] Pattern extraction failed for ${ticker}, trying LLM extraction...`);

      const context: ExtractionContext = {
        companyName: company.name,
        ticker: company.ticker,
        asset: company.asset,
        currentHoldings: company.holdings,
        currentSharesOutstanding: company.sharesForMnav,
      };

      try {
        const llmResult = await extractHoldingsFromText(lastContent, context, llmConfig);
        if (llmResult.holdings !== null && llmResult.confidence >= 0.6) {
          extractedHoldings = llmResult.holdings;
          extractionMethod = `llm (${llmResult.confidence.toFixed(2)} confidence)`;
          lastError = llmResult.reasoning;
        } else if (llmResult.holdings !== null) {
          lastError = `LLM extraction low confidence: ${llmResult.reasoning}`;
        } else {
          lastError = `LLM extraction failed: ${llmResult.reasoning}`;
        }
      } catch (error) {
        lastError = `LLM extraction error: ${error instanceof Error ? error.message : String(error)}`;
      }
    } else {
      lastError += " (LLM not configured - set ANTHROPIC_API_KEY or GROK_API_KEY)";
    }
  }

  if (extractedHoldings === null) {
    const filingInfo = usedFiling ? {
      date: usedFiling.filingDate,
      type: usedFiling.formType,
      url: usedFiling.finalLink,
    } : undefined;

    return {
      ticker,
      companyName: company.name,
      asset: company.asset,
      storedHoldings: company.holdings,
      filing: filingInfo,
      status: "extraction_failed",
      details: `Could not extract ${company.asset} holdings from filings (searched: ${searchedFilingTypes.join(", ")}). ${lastError}`,
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
      extractionMethod,
      filing: {
        date: usedFiling.filingDate,
        type: usedFiling.formType,
        url: usedFiling.finalLink,
      },
      extractedHoldings,
      status: "verified",
      details: `Holdings match within 1% (${percentageDiff.toFixed(2)}% difference)`,
    };
  } else if (Math.abs(percentageDiff) > 200) {
    // Massive discrepancy (>200%) - likely a false positive, needs manual review
    return {
      ticker,
      companyName: company.name,
      asset: company.asset,
      storedHoldings: company.holdings,
      extractionMethod,
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
      status: "needs_review",
      details: `Extracted ${extractedHoldings.toLocaleString()} ${company.asset} vs stored ${company.holdings.toLocaleString()} (${Math.abs(percentageDiff).toFixed(0)}% diff) - likely false positive, manual review needed`,
    };
  } else {
    // Discrepancy found (1-200% difference) - plausible, may need update
    return {
      ticker,
      companyName: company.name,
      asset: company.asset,
      storedHoldings: company.holdings,
      extractionMethod,
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

// Holdings extraction with pattern matching and smart table parsing
// Falls back to LLM extraction if enabled and patterns fail
// isQuarterlyReport = true for 10-Q/10-K (stricter matching to avoid false positives)
function extractHoldingsFromContent(content: string, asset: string, isQuarterlyReport = false): number | null {
  // Define asset-specific keywords for smart table extraction
  const assetKeywords: Record<string, string[]> = {
    BTC: ["aggregate btc holdings", "bitcoin holdings", "btc holdings", "total bitcoin", "bitcoin treasury"],
    ETH: ["aggregate eth holdings", "ethereum holdings", "eth holdings", "total ethereum", "ether holdings"],
    SOL: ["aggregate sol holdings", "solana holdings", "sol holdings", "total solana"],
    HYPE: ["aggregate hype holdings", "hype token holdings", "hype holdings", "hyperliquid holdings", "hype tokens"],
    DOGE: ["aggregate doge holdings", "dogecoin holdings", "doge holdings", "total dogecoin"],
    TRX: ["aggregate trx holdings", "tron holdings", "trx holdings", "total tron"],
    XRP: ["aggregate xrp holdings", "ripple holdings", "xrp holdings", "total xrp"],
    LTC: ["aggregate ltc holdings", "litecoin holdings", "ltc holdings", "total litecoin"],
    TAO: ["aggregate tao holdings", "bittensor holdings", "tao holdings", "total bittensor"],
    BNB: ["aggregate bnb holdings", "binance coin holdings", "bnb holdings", "total bnb"],
    SUI: ["aggregate sui holdings", "sui holdings", "total sui"],
    AVAX: ["aggregate avax holdings", "avalanche holdings", "avax holdings", "total avalanche"],
    HBAR: ["aggregate hbar holdings", "hedera holdings", "hbar holdings", "total hedera"],
  };

  // Define reasonable holdings ranges per asset (min, max)
  const holdingsRanges: Record<string, [number, number]> = {
    BTC: [100, 10_000_000],      // 100 to 10M BTC
    ETH: [1000, 100_000_000],    // 1K to 100M ETH
    SOL: [10000, 500_000_000],   // 10K to 500M SOL
    HYPE: [100000, 100_000_000], // 100K to 100M HYPE
    DOGE: [1_000_000, 100_000_000_000], // 1M to 100B DOGE
    TRX: [1_000_000, 10_000_000_000],   // 1M to 10B TRX
    XRP: [1_000_000, 10_000_000_000],   // 1M to 10B XRP
    LTC: [1000, 10_000_000],     // 1K to 10M LTC
    TAO: [100, 1_000_000],       // 100 to 1M TAO
    BNB: [1000, 10_000_000],     // 1K to 10M BNB
    SUI: [100000, 1_000_000_000], // 100K to 1B SUI
    AVAX: [10000, 100_000_000],   // 10K to 100M AVAX
    HBAR: [1_000_000, 100_000_000_000], // 1M to 100B HBAR
  };

  const keywords = assetKeywords[asset] || [];
  const [minHoldings, maxHoldings] = holdingsRanges[asset] || [100, 10_000_000_000];

  // Step 1: Try smart table extraction for any matching keyword
  // Only use this for BTC (MSTR-style format) where it's proven to work
  if (asset === "BTC") {
    for (const keyword of keywords) {
      const keywordRegex = new RegExp(keyword.replace(/\s+/g, "\\s+"), "i");
      const keywordMatch = content.match(keywordRegex);
      if (keywordMatch && keywordMatch.index !== undefined) {
        // Look at the next 800 characters after the keyword
        const afterKeyword = content.slice(keywordMatch.index, keywordMatch.index + 800);
        // Find all numbers that could be holdings (not dollar amounts)
        const numbers: number[] = [];
        const numberMatches = afterKeyword.matchAll(/(?<!\$\s?)(?<!\.\d)(\d{1,3}(?:,\d{3})+|\d{5,})(?!\.\d)/g);
        for (const m of numberMatches) {
          const val = parseInt(m[1].replace(/,/g, ""), 10);
          if (val >= minHoldings && val <= maxHoldings) {
            numbers.push(val);
          }
        }
        // Return the largest number found (likely the total, not period acquisition)
        if (numbers.length > 0) {
          return Math.max(...numbers);
        }
      }
    }
  }

  // Step 2: Try explicit regex patterns
  const assetPatterns: Record<string, RegExp[]> = {
    BTC: [
      /aggregate\s+btc\s+holdings[:\s]+(\d[\d,]*)/i,
      /btc\s+holdings[:\s]+(\d[\d,]*)/i,
      /held?\s+(?:approximately\s+)?(\d[\d,]*)\s+(?:bitcoin|btc)/i,
      /(\d[\d,]*)\s+(?:bitcoin|btc)\s+(?:held|holdings|in\s+treasury)/i,
      /total\s+(?:bitcoin|btc)\s+(?:held|holdings)[:\s]+(\d[\d,]*)/i,
      /bitcoin\s+holdings[:\s]+(\d[\d,]*)/i,
      /(?:bitcoin|btc)\s+treasury[:\s]+(\d[\d,]*)/i,
      /treasury\s+(?:holds?|contains?)[:\s]+(\d[\d,]*)\s+(?:bitcoin|btc)/i,
      // Purchase announcements
      /(?:acquired|purchased|bought)\s+(?:an\s+additional\s+)?(\d[\d,]*)\s+(?:bitcoin|btc)/i,
    ],
    ETH: [
      /aggregate\s+eth(?:ereum)?\s+holdings[:\s]+(\d[\d,]*)/i,
      /eth(?:ereum)?\s+holdings[:\s]+(\d[\d,]*)/i,
      /held?\s+(?:approximately\s+)?(\d[\d,]*)\s+(?:ethereum|ether|eth)\b/i,
      /(\d[\d,]*)\s+(?:ethereum|ether|eth)\s+(?:held|holdings|in\s+treasury)/i,
      /total\s+(?:ethereum|eth)\s+(?:held|holdings)[:\s]+(\d[\d,]*)/i,
      /(?:ethereum|eth)\s+treasury[:\s]+(\d[\d,]*)/i,
      /(?:acquired|purchased|bought)\s+(?:an\s+additional\s+)?(\d[\d,]*)\s+(?:ethereum|eth)/i,
    ],
    SOL: [
      /aggregate\s+sol(?:ana)?\s+holdings[:\s]+(\d[\d,]*)/i,
      /sol(?:ana)?\s+holdings[:\s]+(\d[\d,]*)/i,
      /held?\s+(?:approximately\s+)?(\d[\d,]*)\s+(?:solana|sol)\b/i,
      /(\d[\d,]*)\s+(?:solana|sol)\s+(?:held|holdings|in\s+treasury)/i,
      /total\s+sol(?:ana)?\s+(?:held|holdings)[:\s]+(\d[\d,]*)/i,
    ],
    HYPE: [
      /aggregate\s+hype\s+(?:token\s+)?holdings[:\s]+(\d[\d,]*)/i,
      /hype\s+(?:token\s+)?holdings[:\s]+(\d[\d,]*)/i,
      /held?\s+(?:approximately\s+)?(\d[\d,]*)\s+(?:hype|hyperliquid)\s+tokens?/i,
      /(\d[\d,]*)\s+(?:hype|hyperliquid)\s+(?:tokens?\s+)?(?:held|holdings|in\s+treasury)/i,
      // HYPE-specific: look for "X HYPE tokens" with number directly before
      /(\d[\d,\.]*)\s*(?:million\s+)?hype\s+tokens?(?:\s|$|,)/i,
      // "holds X HYPE" or "holding X HYPE"
      /(?:holds?|holding)\s+(\d[\d,\.]*)\s*(?:million\s+)?(?:hype|hyperliquid)/i,
    ],
    DOGE: [
      /aggregate\s+doge(?:coin)?\s+holdings[:\s]+(\d[\d,]*)/i,
      /doge(?:coin)?\s+holdings[:\s]+(\d[\d,]*)/i,
      /held?\s+(?:approximately\s+)?(\d[\d,]*)\s+(?:dogecoin|doge)/i,
      /(\d[\d,]*)\s+(?:dogecoin|doge)\s+(?:held|holdings|in\s+treasury)/i,
    ],
    TRX: [
      /aggregate\s+(?:trx|tron)\s+holdings[:\s]+(\d[\d,]*)/i,
      /(?:trx|tron)\s+holdings[:\s]+(\d[\d,]*)/i,
      /held?\s+(?:approximately\s+)?(\d[\d,]*)\s+(?:tron|trx)/i,
      /(\d[\d,]*)\s+(?:tron|trx)\s+(?:held|holdings|in\s+treasury)/i,
    ],
    XRP: [
      /aggregate\s+xrp\s+holdings[:\s]+(\d[\d,]*)/i,
      /xrp\s+holdings[:\s]+(\d[\d,]*)/i,
      /held?\s+(?:approximately\s+)?(\d[\d,]*)\s+(?:xrp|ripple)/i,
      /(\d[\d,]*)\s+(?:xrp|ripple)\s+(?:held|holdings|in\s+treasury)/i,
    ],
  };

  const patterns = assetPatterns[asset] || [];

  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      let value = parseFloat(match[1].replace(/,/g, ""));
      // Handle "million" multiplier
      if (/million/i.test(match[0])) {
        value *= 1_000_000;
      }
      if (!isNaN(value) && value >= minHoldings && value <= maxHoldings) {
        return Math.round(value);
      }
    }
  }

  // Step 3: Try generic "digital asset" patterns (for new/unusual assets)
  // Skip for 10-Q/10-K filings - too many false positives from financial data
  if (!isQuarterlyReport) {
    const genericPatterns = [
      /(?:holds?|holding|treasury)\s+(?:approximately\s+)?(\d[\d,\.]*)\s*(?:million\s+)?(?:tokens?|coins?)/i,
      /(?:token|coin)\s+(?:holdings?|treasury)[:\s]+(\d[\d,\.]*)/i,
      /(?:acquired|purchased)\s+(?:an?\s+additional\s+)?(\d[\d,\.]*)\s*(?:million\s+)?(?:tokens?|coins?)/i,
    ];

    for (const pattern of genericPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        let value = parseFloat(match[1].replace(/,/g, ""));
        if (/million/i.test(match[0])) {
          value *= 1_000_000;
        }
        if (!isNaN(value) && value >= minHoldings && value <= maxHoldings) {
          return Math.round(value);
        }
      }
    }
  }

  return null;
}
