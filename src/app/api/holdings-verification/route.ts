import { NextResponse } from "next/server";
import { allCompanies } from "@/lib/data/companies";
import {
  calculateStaleness,
  calculateDiscrepancy,
  getCompaniesNeedingVerification,
  HoldingsDiscrepancy,
} from "@/lib/holdings-verification";

// Cache for external data
let btcTreasuriesCache: { data: any[]; timestamp: number } | null = null;
let secFilingsCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch BTC holdings from bitcointreasuries.net
 * They have a public API that returns company BTC holdings
 */
async function fetchBitcoinTreasuries(): Promise<any[]> {
  if (btcTreasuriesCache && Date.now() - btcTreasuriesCache.timestamp < CACHE_TTL) {
    return btcTreasuriesCache.data;
  }

  try {
    // bitcointreasuries.net exposes data via their public API
    const response = await fetch("https://api.bitcointreasuries.net/views/companies", {
      headers: {
        "Accept": "application/json",
        "User-Agent": "DAT-Tracker/1.0"
      },
      next: { revalidate: 1800 } // 30 min cache
    });

    if (!response.ok) {
      console.error("Bitcoin Treasuries API error:", response.status);
      return btcTreasuriesCache?.data || [];
    }

    const data = await response.json();
    btcTreasuriesCache = { data, timestamp: Date.now() };
    return data;
  } catch (error) {
    console.error("Bitcoin Treasuries fetch error:", error);
    return btcTreasuriesCache?.data || [];
  }
}

/**
 * Fetch recent 8-K filings from SEC EDGAR
 * Searches for filings mentioning Bitcoin/crypto purchases
 */
async function fetchRecentSECFilings(): Promise<any[]> {
  if (secFilingsCache && Date.now() - secFilingsCache.timestamp < CACHE_TTL) {
    return secFilingsCache.data;
  }

  try {
    // Get list of our tracked company CIKs
    const tickersWithCik: Record<string, string> = {
      "MSTR": "0001050446",
      "MARA": "0001507605",
      "RIOT": "0001167419",
      "CLSK": "0001785459",
      "COIN": "0001679788",
      "SMLR": "0001636692",
      "KULR": "0001662684",
      "DJT": "0001849635",
    };

    const filings: any[] = [];

    // Check each company for recent 8-K filings
    for (const [ticker, cik] of Object.entries(tickersWithCik)) {
      try {
        // SEC EDGAR API for company filings
        const url = `https://data.sec.gov/submissions/CIK${cik.padStart(10, '0')}.json`;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "DAT-Tracker contact@example.com",
            "Accept": "application/json"
          }
        });

        if (response.ok) {
          const data = await response.json();
          const recentFilings = data.filings?.recent;

          if (recentFilings) {
            // Find 8-K filings from last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            for (let i = 0; i < Math.min(20, recentFilings.form?.length || 0); i++) {
              if (recentFilings.form[i] === "8-K") {
                const filingDate = new Date(recentFilings.filingDate[i]);
                if (filingDate >= thirtyDaysAgo) {
                  filings.push({
                    ticker,
                    cik,
                    form: "8-K",
                    filingDate: recentFilings.filingDate[i],
                    accessionNumber: recentFilings.accessionNumber[i],
                    primaryDocument: recentFilings.primaryDocument[i],
                    description: recentFilings.primaryDocDescription?.[i] || "",
                  });
                }
              }
            }
          }
        }
      } catch (e) {
        console.error(`Error fetching SEC filings for ${ticker}:`, e);
      }
    }

    secFilingsCache = { data: filings, timestamp: Date.now() };
    return filings;
  } catch (error) {
    console.error("SEC filings fetch error:", error);
    return secFilingsCache?.data || [];
  }
}

/**
 * Match our companies with external BTC treasury data
 */
function matchWithBitcoinTreasuries(externalData: any[]): HoldingsDiscrepancy[] {
  const discrepancies: HoldingsDiscrepancy[] = [];

  // Create lookup by company name/ticker
  const externalLookup = new Map<string, any>();
  for (const item of externalData) {
    if (item.symbol) {
      externalLookup.set(item.symbol.toUpperCase(), item);
    }
    if (item.name) {
      externalLookup.set(item.name.toLowerCase(), item);
    }
  }

  // Check our BTC companies
  const btcCompanies = allCompanies.filter(c => c.asset === "BTC");

  for (const company of btcCompanies) {
    // Try to match by ticker or name
    let external = externalLookup.get(company.ticker);
    if (!external) {
      external = externalLookup.get(company.name.toLowerCase());
    }

    if (external && external.total_btc) {
      const externalHoldings = parseFloat(external.total_btc);
      const discrepancyPct = calculateDiscrepancy(company.holdings, externalHoldings);

      if (discrepancyPct > 0.1) { // Only track if there's any difference
        discrepancies.push({
          ticker: company.ticker,
          ourHoldings: company.holdings,
          externalHoldings,
          externalSource: "bitcointreasuries.net",
          discrepancyPct,
          lastChecked: new Date().toISOString()
        });
      }
    }
  }

  return discrepancies;
}

export async function GET() {
  try {
    // Fetch external data sources in parallel
    const [btcTreasuries, secFilings] = await Promise.all([
      fetchBitcoinTreasuries(),
      fetchRecentSECFilings()
    ]);

    // Cross-reference with our data
    const discrepancies = matchWithBitcoinTreasuries(btcTreasuries);

    // Get staleness info for all companies
    const stalenessReport = allCompanies.map(company => ({
      ticker: company.ticker,
      name: company.name,
      asset: company.asset,
      holdings: company.holdings,
      staleness: calculateStaleness(company.holdingsLastUpdated),
      source: company.holdingsSource || "unknown"
    }));

    // Get companies needing verification
    const needsVerification = getCompaniesNeedingVerification(
      allCompanies,
      discrepancies
    );

    // Filter SEC filings that might mention Bitcoin purchases
    const relevantFilings = secFilings.filter(f =>
      f.description?.toLowerCase().includes("bitcoin") ||
      f.description?.toLowerCase().includes("btc") ||
      f.description?.toLowerCase().includes("crypto") ||
      f.description?.toLowerCase().includes("digital asset")
    );

    return NextResponse.json({
      summary: {
        totalCompanies: allCompanies.length,
        freshData: stalenessReport.filter(s => s.staleness.level === "fresh").length,
        staleData: stalenessReport.filter(s => s.staleness.level === "stale").length,
        veryStaleData: stalenessReport.filter(s => s.staleness.level === "very_stale").length,
        unknownData: stalenessReport.filter(s => s.staleness.level === "unknown").length,
        discrepanciesFound: discrepancies.filter(d => d.discrepancyPct > 5).length,
        recentSECFilings: relevantFilings.length
      },
      stalenessReport,
      discrepancies,
      needsVerification,
      recentFilings: relevantFilings,
      externalSources: {
        bitcoinTreasuries: {
          available: btcTreasuries.length > 0,
          companiesMatched: discrepancies.length,
          lastFetched: btcTreasuriesCache?.timestamp
            ? new Date(btcTreasuriesCache.timestamp).toISOString()
            : null
        },
        secEdgar: {
          available: secFilings.length > 0,
          recentFilings: secFilings.length,
          relevantFilings: relevantFilings.length,
          lastFetched: secFilingsCache?.timestamp
            ? new Date(secFilingsCache.timestamp).toISOString()
            : null
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Holdings verification error:", error);
    return NextResponse.json({
      error: String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
