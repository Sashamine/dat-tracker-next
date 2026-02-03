import { NextRequest, NextResponse } from "next/server";
import { getCompanyByTicker } from "@/lib/data/companies";

export interface Filing {
  type: string;           // Form type (8-K, 10-Q, 10-K, etc.)
  title: string;          // Filing description
  date: string;           // Filing date (YYYY-MM-DD)
  url: string;            // Link to the filing
}

export interface FilingsResponse {
  filings: Filing[];
  source: string;         // e.g., "SEC EDGAR", "TSE", etc.
  sourceUrl: string;      // Link to the source page
  jurisdiction: string;   // US, Japan, Hong Kong, etc.
  status?: "public" | "pre-public" | "international";  // Filing status
}

// Determine jurisdiction from ticker format
function getJurisdiction(ticker: string): string {
  if (ticker.endsWith(".T")) return "Japan";
  if (ticker.endsWith(".HK")) return "Hong Kong";
  if (ticker.endsWith(".ST")) return "Sweden";
  if (ticker.endsWith(".AX")) return "Australia";
  // Canadian tickers - check specific ones we know
  const canadianTickers = ["STKE", "LUXFF", "XTAIF", "CYPH"];
  if (canadianTickers.includes(ticker.toUpperCase())) return "Canada";
  // French tickers
  if (ticker.toUpperCase() === "ALTBG") return "France";
  // OTC/Pink sheets
  if (ticker.toUpperCase() === "IHLDF") return "US-OTC";
  // Default to US
  return "US";
}

// Map tickers to SEC CIK numbers (Central Index Key)
const tickerToCIK: Record<string, string> = {
  // BTC
  "MSTR": "0001050446",
  "MARA": "0001507605",
  "RIOT": "0001167419",
  "CLSK": "0001515671",
  "SMLR": "0001490161",
  "KULR": "0001662684",
  "NAKA": "0001977303",
  "DJT": "0001849635",
  "XXI": "0002019757",
  "CEPO": "0002019757", // BSTR Holdings SPAC
  "ASST": "0001955745", // Strive Enterprises
  "NXTT": "0001831978",
  "ABTC": "0002068580", // American Bitcoin Corp
  // ETH
  "BMNR": "0001866292",
  "SBET": "0001869198",
  "ETHM": "0002028699", // Dynamix Corp (The Ether Machine)
  "BTBT": "0001799290",
  "BTCS": "0001510079",
  "GAME": "0001825079",
  "FGNX": "0001437925",
  // SOL
  "FWDI": "0000038264",
  "HSDT": "0001580063",
  "DFDV": "0001652044",
  "UPXI": "0001777319",
  // HYPE
  "PURR": "0002078856", // Hyperliquid Strategies
  "HYPD": "0001437107",
  // BNB - BNC may be pre-IPO
  "NA": "0001847577",
  // TAO
  "TAOX": "0001539029",
  "TWAV": "0001319927",
  // LINK
  "CWD": "0001627282",  // CaliberCos Inc.
  // TRX
  "TRON": "0001956744", // Tron Inc
  // XRP - XRPN may be pre-IPO SPAC
  // ZEC - CYPH is Canadian
  // LTC
  "LITS": "0001411460",
  // SUI
  "SUIG": "0001066923",
  // DOGE
  "ZONE": "0001814329",
  "TBH": "0001903595", // Brag House Holdings
  "BTOG": "0001833498",
  // AVAX
  "AVX": "0001826397",  // AVAX One Technology (formerly AgriFORCE)
  // HBAR (OTC)
  "IHLDF": "0001905459", // Immutable Holdings
};

// Fetch SEC EDGAR filings
async function fetchSECFilings(ticker: string): Promise<{ filings: Filing[]; isPrePublic: boolean }> {
  const cik = tickerToCIK[ticker.toUpperCase()];
  if (!cik) {
    console.log(`No CIK found for ticker: ${ticker}`);
    return { filings: [], isPrePublic: false };
  }

  try {
    // Use SEC EDGAR API
    // Format CIK without leading zeros for the API
    const cikNum = cik.replace(/^0+/, "");
    const url = `https://data.sec.gov/submissions/CIK${cik}.json`;

    const response = await fetch(url, {
      headers: {
        // SEC requires a user-agent with contact info
        "User-Agent": "DAT-Tracker contact@example.com",
        "Accept": "application/json",
      },
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) {
      console.error(`SEC API error: ${response.status}`);
      return { filings: [], isPrePublic: false };
    }

    const data = await response.json();

    // Extract recent filings
    const filings: Filing[] = [];
    const recentFilings = data.filings?.recent;
    let hasPublicFilings = false;
    let hasFormD = false;

    if (recentFilings && recentFilings.form) {
      const count = Math.min(recentFilings.form.length, 40);

      for (let i = 0; i < count; i++) {
        const formType = recentFilings.form[i];

        // Track filing types
        const isFormD = formType === "D" || formType.startsWith("D/A");
        if (isFormD) hasFormD = true;

        // Public company forms (operational + registration)
        const publicForms = [
          // Operational filings
          "8-K", "10-K", "10-Q", "4", "DEF 14A", "DEFA14A", "SC 13D", "SC 13G",
          // Registration filings
          "S-1", "S-3", "S-4", "S-11", "F-1", "F-3", "F-4",
          "424B", "POS AM", "EFFECT",
          // Foreign issuer filings
          "6-K", "20-F", "40-F",
        ];
        const isPublicForm = publicForms.some(f => formType.startsWith(f));
        if (isPublicForm) hasPublicFilings = true;

        // Include both public forms and Form D
        if (!isPublicForm && !isFormD) continue;

        const accessionNumber = recentFilings.accessionNumber[i].replace(/-/g, "");
        const primaryDoc = recentFilings.primaryDocument[i];

        filings.push({
          type: formType,
          title: recentFilings.primaryDocDescription?.[i] || (isFormD ? "Private Offering (Regulation D)" : formType),
          date: recentFilings.filingDate[i],
          url: `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accessionNumber}/${primaryDoc}`,
        });

        // Limit to 20 filings for display
        if (filings.length >= 20) break;
      }
    }

    return { filings, isPrePublic: hasFormD && !hasPublicFilings };
  } catch (error) {
    console.error("Error fetching SEC filings:", error);
    return { filings: [], isPrePublic: false };
  }
}

// Company-specific filing URLs for international companies
const internationalFilingUrls: Record<string, { source: string; sourceUrl: string; note?: string }> = {
  // Canada - SEDAR+ search links
  "STKE": {
    source: "SEDAR+",
    sourceUrl: "https://www.sedarplus.ca/csa-party/records/search?searchText=Sol%20Strategies",
    note: "Search for 'Sol Strategies' on SEDAR+",
  },
  "LUXFF": {
    source: "SEDAR+",
    sourceUrl: "https://www.sedarplus.ca/csa-party/records/search?searchText=Luxxfolio",
    note: "Search for 'Luxxfolio' on SEDAR+",
  },
  "XTAIF": {
    source: "SEDAR+",
    sourceUrl: "https://www.sedarplus.ca/csa-party/records/search?searchText=xTAO",
    note: "Search for 'xTAO' on SEDAR+",
  },
  "CYPH": {
    source: "SEDAR+",
    sourceUrl: "https://www.sedarplus.ca/csa-party/records/search?searchText=Cypherpunk",
    note: "Search for 'Cypherpunk' on SEDAR+",
  },
  // Japan
  "3350.T": {
    source: "JPX / TDnet",
    sourceUrl: "https://www2.jpx.co.jp/disc/33500/140120241125527959.pdf",
    note: "Metaplanet disclosures on JPX",
  },
  // Hong Kong
  "0434.HK": {
    source: "HKEX",
    sourceUrl: "https://www.hkexnews.hk/listedco/listconews/SEHK/2024/0126/2024012600063.pdf",
    note: "Boyaa Interactive announcements on HKEX",
  },
  // Sweden
  "H100.ST": {
    source: "Nasdaq Nordic",
    sourceUrl: "https://www.nasdaqomxnordic.com/shares/company/h100",
    note: "H100 Group on Nasdaq Nordic",
  },
  // France
  "ALTBG": {
    source: "Euronext Paris",
    sourceUrl: "https://live.euronext.com/en/product/equities/FR001400RU69-ALXP",
    note: "The Blockchain Group on Euronext",
  },
  // Australia
  "DCC.AX": {
    source: "ASX",
    sourceUrl: "https://www.asx.com.au/asx/v2/statistics/announcements.do?by=asxCode&asxCode=DCC&timeframe=Y&period=M6",
    note: "DigitalX announcements on ASX",
  },
};

// Get filing source info for international companies
function getInternationalFilingInfo(ticker: string, jurisdiction: string, companyName: string): FilingsResponse {
  // Check for company-specific URLs first
  const specificInfo = internationalFilingUrls[ticker.toUpperCase()];
  if (specificInfo) {
    return {
      filings: [],
      source: specificInfo.source,
      sourceUrl: specificInfo.sourceUrl,
      jurisdiction,
      status: "international",
    };
  }

  // Fallback to generic jurisdiction URLs
  const jurisdictionInfo: Record<string, { source: string; sourceUrl: string }> = {
    "Japan": {
      source: "TDnet / EDINET",
      sourceUrl: "https://www.jpx.co.jp/english/listing/disclosed-information/",
    },
    "Hong Kong": {
      source: "HKEX",
      sourceUrl: "https://www.hkexnews.hk/listedco/listconews/advancedsearch/search_active_main.aspx",
    },
    "Sweden": {
      source: "Finansinspektionen",
      sourceUrl: "https://www.fi.se/en/our-registers/",
    },
    "Canada": {
      source: "SEDAR+",
      sourceUrl: `https://www.sedarplus.ca/csa-party/records/search?searchText=${encodeURIComponent(companyName)}`,
    },
    "France": {
      source: "AMF / Euronext",
      sourceUrl: "https://www.amf-france.org/en",
    },
    "Australia": {
      source: "ASX",
      sourceUrl: "https://www.asx.com.au/asx/v2/statistics/announcements.do",
    },
  };

  const info = jurisdictionInfo[jurisdiction] || {
    source: "Local Exchange",
    sourceUrl: "#",
  };

  return {
    filings: [],
    source: info.source,
    sourceUrl: info.sourceUrl,
    jurisdiction,
    status: "international",
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  const company = getCompanyByTicker(ticker);
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const jurisdiction = getJurisdiction(ticker);

  // For US companies, fetch from SEC
  if (jurisdiction === "US" || jurisdiction === "US-OTC") {
    const { filings, isPrePublic } = await fetchSECFilings(ticker);

    // Get CIK for direct EDGAR link
    const cik = tickerToCIK[ticker.toUpperCase()];
    const cikNum = cik?.replace(/^0+/, "") || "";

    return NextResponse.json({
      filings,
      source: "SEC EDGAR",
      sourceUrl: cik
        ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cikNum}&type=&dateb=&owner=include&count=40`
        : `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(company.name)}&CIK=&type=&dateb=&owner=include&count=40&action=getcompany`,
      jurisdiction,
      status: isPrePublic ? "pre-public" : "public",
    } as FilingsResponse);
  }

  // For international companies, return source info
  return NextResponse.json(getInternationalFilingInfo(ticker, jurisdiction, company.name));
}
