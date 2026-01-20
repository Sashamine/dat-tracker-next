// Company data sources for verification and citations
// This file maps each company to their official dashboards, SEC filings, and data sources
// Used for: 1) Claude context 2) Citation UI 3) Data verification

export interface CompanyDataSources {
  ticker: string;
  name: string;
  // Official company resources
  officialDashboard?: string;  // Company's own holdings/NAV tracker
  officialDashboardName?: string;  // Display name for the dashboard (e.g., "strategy.com")
  officialMnav?: number;  // Official mNAV from company dashboard (for comparison note)
  officialMnavMethod?: "issued" | "diluted";  // What share count they use
  officialMnavNote?: string;  // Custom explanation for methodology difference (overrides default)
  investorRelations?: string;
  // SEC/regulatory filings
  secCik?: string;  // SEC Central Index Key
  secFilingsUrl?: string;
  exchange?: "NASDAQ" | "NYSE" | "TSE" | "HKEX" | "TSX" | "OTC" | "Euronext";
  // Third-party trackers
  trackers?: string[];
  blockworksUrl?: string;
  // Data methodology
  sharesSource: "diluted" | "basic" | "assumed_diluted" | "unknown";
  sharesNotes?: string;
  // What data is available
  reportsHoldingsFrequency?: "daily" | "weekly" | "monthly" | "quarterly" | "on_purchase";
  reportsMnavDaily?: boolean;
  // Verification notes
  notes?: string;
  lastVerified?: string;  // YYYY-MM-DD
}

export const COMPANY_SOURCES: Record<string, CompanyDataSources> = {
  // ==================== BTC COMPANIES ====================

  MSTR: {
    ticker: "MSTR",
    name: "Strategy (MicroStrategy)",
    officialDashboard: "https://www.strategy.com",
    officialDashboardName: "strategy.com",
    officialMnav: 1.07,  // Uses issued shares (330M), not FD shares
    officialMnavMethod: "issued",
    investorRelations: "https://www.strategy.com/investor-relations",
    secCik: "1050446",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446",
    exchange: "NASDAQ",
    trackers: ["mstrtracker.com", "saylortracker.com"],
    blockworksUrl: "https://blockworks.com/analytics/MSTR",
    sharesSource: "diluted",
    sharesNotes: "Uses WeightedAverageNumberOfDilutedSharesOutstanding from 10-Q. Reports 'Assumed Diluted Shares' in 8-K for BTC Yield KPI.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: false,
    notes: "Largest corporate BTC holder. 8-K filings include BTC Yield and assumed diluted shares.",
    lastVerified: "2026-01-18",
  },

  MARA: {
    ticker: "MARA",
    name: "MARA Holdings (Marathon Digital)",
    investorRelations: "https://ir.mara.com/",
    secCik: "1507605",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001507605",
    exchange: "NASDAQ",
    blockworksUrl: "https://blockworks.com/analytics/MARA",
    sharesSource: "diluted",
    sharesNotes: "Uses WeightedAverageNumberOfDilutedSharesOutstanding from 10-Q.",
    reportsHoldingsFrequency: "monthly",
    reportsMnavDaily: false,
    notes: "Largest US public miner. Monthly production updates include BTC holdings.",
    lastVerified: "2026-01-18",
  },

  RIOT: {
    ticker: "RIOT",
    name: "Riot Platforms",
    investorRelations: "https://www.riotplatforms.com/investors",
    secCik: "1167419",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001167419",
    exchange: "NASDAQ",
    blockworksUrl: "https://blockworks.com/analytics/RIOT",
    sharesSource: "diluted",
    sharesNotes: "Uses WeightedAverageNumberOfDilutedSharesOutstanding from 10-Q.",
    reportsHoldingsFrequency: "monthly",
    reportsMnavDaily: false,
    notes: "Monthly production updates include BTC holdings.",
    lastVerified: "2026-01-18",
  },

  CLSK: {
    ticker: "CLSK",
    name: "CleanSpark",
    investorRelations: "https://investors.cleanspark.com/",
    secCik: "827876",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000827876",
    exchange: "NASDAQ",
    blockworksUrl: "https://blockworks.com/analytics/CLSK",
    sharesSource: "diluted",
    sharesNotes: "Uses WeightedAverageNumberOfDilutedSharesOutstanding from 10-Q.",
    reportsHoldingsFrequency: "monthly",
    reportsMnavDaily: false,
    notes: "Monthly mining updates include BTC holdings.",
    lastVerified: "2026-01-18",
  },

  HUT: {
    ticker: "HUT",
    name: "Hut 8 Corp",
    investorRelations: "https://hut8.com/investors/",
    secCik: "1964789",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001964789",
    exchange: "NASDAQ",
    blockworksUrl: "https://blockworks.com/analytics/HUT",
    sharesSource: "diluted",
    sharesNotes: "Uses WeightedAverageNumberOfDilutedSharesOutstanding from 10-Q.",
    reportsHoldingsFrequency: "monthly",
    reportsMnavDaily: false,
    notes: "Merged with US Bitcoin Corp Nov 2023. Monthly reserve updates.",
    lastVerified: "2026-01-18",
  },

  CORZ: {
    ticker: "CORZ",
    name: "Core Scientific",
    investorRelations: "https://investors.corescientific.com/",
    secCik: "1839341",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001839341",
    exchange: "NASDAQ",
    sharesSource: "diluted",
    sharesNotes: "Estimated ~15% dilution from basic. Emerged from bankruptcy Jan 2024.",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Pivoting to AI/HPC. BTC holdings relatively small.",
    lastVerified: "2026-01-18",
  },

  BTDR: {
    ticker: "BTDR",
    name: "Bitdeer Technologies",
    investorRelations: "https://ir.bitdeer.com/",
    secCik: "1899123",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001899123",
    exchange: "NASDAQ",
    sharesSource: "diluted",
    sharesNotes: "Uses WeightedAverageNumberOfDilutedSharesOutstanding.",
    reportsHoldingsFrequency: "weekly",
    reportsMnavDaily: false,
    notes: "Weekly holdings updates. Started treasury strategy Nov 2024.",
    lastVerified: "2026-01-18",
  },

  "3350.T": {
    ticker: "3350.T",
    name: "Metaplanet",
    officialDashboard: "https://metaplanet.jp/en/analytics",
    investorRelations: "https://metaplanet.jp/en/shareholders/investor-relations",
    exchange: "TSE",
    sharesSource: "basic",
    sharesNotes: "TSE filings. Japan's first Bitcoin treasury company.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: true,
    notes: "Updates dashboard frequently. Simon Gerovich (former Metaco) is CEO.",
    lastVerified: "2026-01-18",
  },

  KULR: {
    ticker: "KULR",
    name: "KULR Technology",
    investorRelations: "https://kulr.ai/investors/",
    secCik: "1662684",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001662684",
    exchange: "NYSE",
    sharesSource: "diluted",
    sharesNotes: "1-for-8 reverse split June 23, 2025. Uses diluted shares.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: false,
    notes: "Bitcoin First company. Thermal management tech.",
    lastVerified: "2026-01-18",
  },

  // ==================== ETH COMPANIES ====================

  SBET: {
    ticker: "SBET",
    name: "SharpLink Gaming",
    officialDashboard: "https://www.sharplink.com/eth-dashboard",
    investorRelations: "https://investors.sharplink.com/",
    secCik: "1981535",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001981535",
    exchange: "NASDAQ",
    trackers: ["sbetnav.com", "sbettracker.com", "sbetmnav.com"],
    blockworksUrl: "https://blockworks.com/analytics/SBET",
    sharesSource: "basic",
    sharesNotes: "Using basic shares (196.69M) - matches reported mNAV. Fully diluted count (warrants, options, RSUs) not publicly available. Company reports 'Assumed Diluted Shares' for ETH Concentration metric but doesn't publish the number.",
    reportsHoldingsFrequency: "weekly",
    reportsMnavDaily: true,
    notes: "Largest ETH treasury. 1:12 reverse split May 6, 2025. Dashboard updates daily. Joe Lubin affiliated.",
    lastVerified: "2026-01-18",
  },

  BMNR: {
    ticker: "BMNR",
    name: "Bitmine Immersion",
    investorRelations: "https://www.bitminetech.io/investor-relations",
    secCik: "1866816",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001866816",
    exchange: "NASDAQ",
    sharesSource: "basic",
    sharesNotes: "Using EntityCommonStockSharesOutstanding from SEC filings.",
    reportsHoldingsFrequency: "weekly",
    reportsMnavDaily: false,
    notes: "World's largest ETH treasury. Weekly press releases on holdings.",
    lastVerified: "2026-01-18",
  },

  // ==================== SOL COMPANIES ====================

  DFDV: {
    ticker: "DFDV",
    name: "DeFi Development Corp",
    officialDashboard: "https://defidevcorp.com/dashboard",
    officialDashboardName: "defidevcorp.com",
    officialMnav: 0.72,  // Their formula: Market Cap / SOL NAV (no cash subtraction)
    officialMnavNote: "Market Cap / NAV (no EV adjustment)",  // They don't subtract cash
    investorRelations: "https://defidevcorp.com/investor",
    exchange: "NASDAQ",
    sharesSource: "basic",
    sharesNotes: "Using basic shares from SEC filings.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: false,
    notes: "SOL treasury company. Launched April 2025.",
    lastVerified: "2026-01-20",
  },

  UPXI: {
    ticker: "UPXI",
    name: "Upexi",
    secCik: "1622879",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001622879",
    exchange: "NASDAQ",
    sharesSource: "basic",
    sharesNotes: "Using EntityCommonStockSharesOutstanding from SEC filings.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: false,
    notes: "SOL treasury company. Launched April 2025.",
    lastVerified: "2026-01-18",
  },

  // ==================== OTHER ====================

  XXI: {
    ticker: "XXI",
    name: "Twenty One Capital",
    exchange: "NYSE",
    sharesSource: "basic",
    sharesNotes: "Newly public. Tether/SoftBank/Mallers backed.",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "3rd largest public BTC holder. Jack Mallers CEO.",
    lastVerified: "2026-01-18",
  },

  DJT: {
    ticker: "DJT",
    name: "Trump Media & Technology",
    secCik: "1849635",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001849635",
    exchange: "NASDAQ",
    sharesSource: "basic",
    sharesNotes: "Using EntityCommonStockSharesOutstanding from SEC filings.",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Started BTC treasury May 2025.",
    lastVerified: "2026-01-18",
  },
};

// Helper to get sources for a ticker
export function getCompanySources(ticker: string): CompanyDataSources | null {
  return COMPANY_SOURCES[ticker.toUpperCase()] || null;
}

// Get all companies with official dashboards
export function getCompaniesWithDashboards(): CompanyDataSources[] {
  return Object.values(COMPANY_SOURCES).filter(c => c.officialDashboard);
}

// Get all companies that report mNAV daily
export function getCompaniesWithDailyMnav(): CompanyDataSources[] {
  return Object.values(COMPANY_SOURCES).filter(c => c.reportsMnavDaily);
}
