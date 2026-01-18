import { NextResponse } from "next/server";
import { allCompanies } from "@/lib/data/companies";
import { formatHoldingsSource } from "@/lib/holdings-verification";

// Cache for SEC filings
let secFilingsCache: { data: any[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Fetch recent 8-K filings from SEC EDGAR
 */
async function fetchRecentSECFilings(): Promise<any[]> {
  if (secFilingsCache && Date.now() - secFilingsCache.timestamp < CACHE_TTL) {
    return secFilingsCache.data;
  }

  try {
    const tickersWithCik: Record<string, string> = {
      "MSTR": "0001050446",
      "MARA": "0001507605",
      "RIOT": "0001167419",
      "CLSK": "0001785459",
      "COIN": "0001679788",
      "ASST": "0001920406",
      "KULR": "0001662684",
      "DJT": "0001849635",
      "HUT": "0001964789",
      "CORZ": "0001878848",
    };

    const filings: any[] = [];

    for (const [ticker, cik] of Object.entries(tickersWithCik)) {
      try {
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

export async function GET() {
  try {
    const secFilings = await fetchRecentSECFilings();

    // Simple company report - just date and source
    const companiesReport = allCompanies.map(company => ({
      ticker: company.ticker,
      name: company.name,
      asset: company.asset,
      holdings: company.holdings,
      lastUpdated: company.holdingsLastUpdated || null,
      source: company.holdingsSource || "unknown",
      sourceLabel: formatHoldingsSource(company.holdingsSource),
      sourceUrl: company.holdingsSourceUrl || null,
    })).sort((a, b) => {
      // Sort by last updated (most recent first), nulls last
      if (!a.lastUpdated) return 1;
      if (!b.lastUpdated) return -1;
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    });

    // Filter SEC filings that mention crypto
    const relevantFilings = secFilings.filter(f =>
      f.description?.toLowerCase().includes("bitcoin") ||
      f.description?.toLowerCase().includes("btc") ||
      f.description?.toLowerCase().includes("crypto") ||
      f.description?.toLowerCase().includes("digital asset")
    );

    return NextResponse.json({
      summary: {
        totalCompanies: allCompanies.length,
        recentSECFilings: relevantFilings.length,
      },
      companies: companiesReport,
      recentFilings: relevantFilings,
      externalSources: {
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
