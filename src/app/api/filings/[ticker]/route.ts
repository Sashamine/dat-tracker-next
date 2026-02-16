import { NextRequest, NextResponse } from "next/server";
import { getCompanyByTicker } from "@/lib/data/companies";

export interface Filing {
  type: string;           // Form type (8-K, 10-Q, 10-K, etc.)
  title: string;          // Filing description
  date: string;           // Filing date (YYYY-MM-DD)
  url: string;            // Link to the filing
  accession?: string;     // SEC accession number (for internal viewer)
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
  if (ticker.toUpperCase() === "ALCPB") return "France";
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
  "XXI": "0002070457",  // Post-merger CIK (was 0001865602 Cantor SPAC)
  "CEPO": "0002019757", // BSTR Holdings SPAC
  "ASST": "0001955745", // Strive Enterprises
  "NXTT": "0001831978",
  "ABTC": "0002068580", // American Bitcoin Corp
  // ETH
  "BMNR": "0001829311",  // Bitmine Immersion Technologies
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
      const count = Math.min(recentFilings.form.length, 100);  // Process more to get 50 filtered

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

        // Limit to 50 filings for display (MSTR has many weekly 8-Ks)
        if (filings.length >= 50) break;
      }
    }

    return { filings, isPrePublic: hasFormD && !hasPublicFilings };
  } catch (error) {
    console.error("Error fetching SEC filings:", error);
    return { filings: [], isPrePublic: false };
  }
}

// Static filings for international companies without API access
const staticFilings: Record<string, Filing[]> = {
  "3350.T": [
    // 2025 Q4 / 2026
    { type: "BTC Purchase", title: "BTC Purchase - Total: 35,102 BTC", date: "2025-12-30", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    // 2025 Q3
    { type: "Quarterly", title: "Q3 FY2025 Results - 30,823 BTC", date: "2025-09-30", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 25,555 BTC", date: "2025-09-22", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 20,136 BTC", date: "2025-09-08", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 20,000 BTC", date: "2025-09-01", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 18,991 BTC", date: "2025-08-25", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 18,888 BTC", date: "2025-08-18", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 18,113 BTC", date: "2025-08-12", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 17,595 BTC", date: "2025-08-04", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 17,132 BTC", date: "2025-07-28", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 16,352 BTC", date: "2025-07-14", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 15,555 BTC", date: "2025-07-07", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    // 2025 Q2
    { type: "Quarterly", title: "Q2 FY2025 Results - 13,350 BTC", date: "2025-06-30", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 12,345 BTC", date: "2025-06-26", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 11,111 BTC", date: "2025-06-23", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 10,000 BTC", date: "2025-06-16", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 8,888 BTC", date: "2025-06-02", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 7,800 BTC", date: "2025-05-19", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 6,796 BTC", date: "2025-05-12", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 5,555 BTC", date: "2025-05-07", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 5,000 BTC", date: "2025-04-24", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 4,855 BTC", date: "2025-04-21", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 4,525 BTC", date: "2025-04-14", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 4,206 BTC", date: "2025-04-02", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    // 2025 Q1
    { type: "Quarterly", title: "Q1 FY2025 Results - 4,046 BTC", date: "2025-03-31", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 3,350 BTC", date: "2025-03-24", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 3,200 BTC", date: "2025-03-18", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 3,050 BTC", date: "2025-03-12", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 2,888 BTC", date: "2025-03-05", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 2,391 BTC", date: "2025-03-03", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 2,235 BTC", date: "2025-02-25", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 2,100 BTC", date: "2025-02-20", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 2,031 BTC", date: "2025-02-17", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    // 2024 Q4
    { type: "BTC Purchase", title: "BTC Purchase - Total: 1,762 BTC", date: "2024-12-23", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 1,142 BTC", date: "2024-11-19", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 1,018 BTC", date: "2024-10-28", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 861 BTC", date: "2024-10-16", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 855 BTC", date: "2024-10-15", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 749 BTC", date: "2024-10-11", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 640 BTC", date: "2024-10-07", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 531 BTC", date: "2024-10-03", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "Stock Split", title: "10:1 Stock Split Effective", date: "2024-10-01", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 507 BTC", date: "2024-10-01", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    // 2024 Q3
    { type: "BTC Purchase", title: "BTC Purchase - Total: 399 BTC", date: "2024-09-10", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 360 BTC", date: "2024-08-20", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 303 BTC", date: "2024-08-13", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 246 BTC", date: "2024-07-22", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 226 BTC", date: "2024-07-16", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 204 BTC", date: "2024-07-08", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 161 BTC", date: "2024-07-01", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    // 2024 Q2
    { type: "BTC Purchase", title: "BTC Purchase - Total: 141 BTC", date: "2024-06-10", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Purchase", title: "BTC Purchase - Total: 118 BTC", date: "2024-05-09", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Strategy", title: "Initial BTC Purchase - 98 BTC", date: "2024-04-23", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { type: "BTC Strategy", title: "Adoption of Bitcoin Treasury Strategy", date: "2024-04-08", url: "https://metaplanet.jp/en/shareholders/disclosures" },
  ],
  "DCC.AX": [
    {
      type: "Quarterly Report",
      title: "Quarterly Activities/Appendix 4C Cash Flow Report (Q2 FY26)",
      date: "2026-01-30",
      url: "https://hotcopper.com.au/threads/8999179/",
    },
    {
      type: "Substantial Holder",
      title: "Becoming a substantial holder",
      date: "2026-01-30",
      url: "https://hotcopper.com.au/threads/8998117/",
    },
    {
      type: "Treasury Update",
      title: "Treasury Information - December 2025",
      date: "2026-01-23",
      url: "https://hotcopper.com.au/threads/8987722/",
    },
    {
      type: "Treasury Update",
      title: "Treasury Information - November 2025",
      date: "2025-12-17",
      url: "https://hotcopper.com.au/threads/8943127/",
    },
    {
      type: "AGM Results",
      title: "Results of Annual General Meeting",
      date: "2025-11-27",
      url: "https://hotcopper.com.au/threads/8907901/",
    },
    {
      type: "Treasury Update",
      title: "Treasury Information - October 2025",
      date: "2025-11-07",
      url: "https://hotcopper.com.au/threads/8872795/",
    },
    {
      type: "Quarterly Report",
      title: "Quarterly Activities/Appendix 4C Cash Flow Report (Q1 FY26)",
      date: "2025-10-31",
      url: "https://hotcopper.com.au/threads/8860141/",
    },
    {
      type: "Annual Report",
      title: "Annual Report to Shareholders",
      date: "2025-09-30",
      url: "https://hotcopper.com.au/threads/8799181/",
    },
  ],
};

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
    source: "TDnet / Metaplanet IR",
    sourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    note: "Metaplanet investor relations disclosures",
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
  "ALCPB": {
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
  const upperTicker = ticker.toUpperCase();
  
  // Get static filings if available
  const filings = staticFilings[upperTicker] || [];
  
  // Check for company-specific URLs first
  const specificInfo = internationalFilingUrls[upperTicker];
  if (specificInfo) {
    return {
      filings,
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
