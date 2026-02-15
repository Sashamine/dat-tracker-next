// Company data sources for verification and citations
// This file maps each company to their official dashboards, SEC filings, and data sources
// Used for: 1) Claude context 2) Citation UI 3) Data verification

export interface CompanyDataSources {
  ticker: string;
  name: string;
  // Official company resources
  officialDashboard?: string;  // Company's own holdings/NAV tracker
  officialDashboardName?: string;  // Display name for the dashboard (e.g., "strategy.com")
  officialMnavNote?: string;  // Methodology difference note (e.g., "issued shares" or "no cash adjustment")
  investorRelations?: string;
  // SEC/regulatory filings (US)
  secCik?: string;  // SEC Central Index Key
  secFilingsUrl?: string;
  // EDINET filings (Japan)
  edinetCode?: string;  // EDINET code for Japanese companies
  edinetFilingsUrl?: string;
  // HKEX filings (Hong Kong)
  hkexStockCode?: string;  // HKEX stock code for Hong Kong companies
  hkexFilingsUrl?: string;
  // Euronext filings (France/Europe)
  euronextIsin?: string;  // ISIN code for Euronext companies
  euronextFilingsUrl?: string;
  // NGM filings (Sweden - Nordic Growth Market)
  ngmIsin?: string;  // ISIN code for NGM companies
  ngmFilingsUrl?: string;
  // SEDAR+ filings (Canada)
  sedarIsin?: string;  // ISIN code for Canadian companies
  sedarFilingsUrl?: string;
  exchange?: "NASDAQ" | "NYSE" | "TSE" | "HKEX" | "TSX" | "OTC" | "Euronext" | "NGM" | "CSE" | "CBOE" | "TSX-V";
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
    officialMnavNote: "issued shares (not fully diluted)",
    investorRelations: "https://www.strategy.com/investor-relations",
    secCik: "1050446",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446",
    exchange: "NASDAQ",
    trackers: ["mstrtracker.com", "saylortracker.com"],
    blockworksUrl: "https://blockworks.com/analytics/MSTR",
    sharesSource: "diluted",
    sharesNotes: "Uses WeightedAverageNumberOfDilutedSharesOutstanding from 10-Q. Reports 'Assumed Diluted Shares' in 8-K for BTC Yield KPI.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: true,
    notes: "Largest corporate BTC holder. 8-K filings include BTC Yield and assumed diluted shares. Dashboard shows live mNAV.",
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

  // HUT removed - pivoted to AI/HPC infrastructure, not a DAT company

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
    edinetCode: "E02978",
    edinetFilingsUrl: "https://irbank.net/E02978",
    exchange: "TSE",
    sharesSource: "basic",
    sharesNotes: "TSE filings. Japan's first Bitcoin treasury company.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: true,
    notes: "Updates dashboard frequently. Simon Gerovich (former Metaco) is CEO.",
    lastVerified: "2026-01-22",
  },

  KULR: {
    ticker: "KULR",
    name: "KULR Technology",
    officialDashboard: "https://kulrbitcointracker.com",
    officialDashboardName: "kulrbitcointracker.com",
    officialMnavNote: "Shows mNAV, cost basis, implied core value",
    investorRelations: "https://kulr.ai/investors/",
    secCik: "1662684",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001662684",
    exchange: "NYSE",
    sharesSource: "diluted",
    sharesNotes: "1-for-8 reverse split June 23, 2025. Uses diluted shares.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: true,
    notes: "Bitcoin First company. Thermal management tech. Dashboard shows live mNAV.",
    lastVerified: "2026-01-24",
  },

  // ==================== ETH COMPANIES ====================

  SBET: {
    ticker: "SBET",
    name: "Sharplink, Inc.",  // Renamed from SharpLink Gaming (Feb 3, 2026)
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
    secCik: "1829311",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001829311",
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
    officialMnavNote: "Market Cap / NAV (no cash adjustment)",
    investorRelations: "https://defidevcorp.com/investor",
    secCik: "1805526",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001805526",
    exchange: "NASDAQ",
    sharesSource: "basic",
    sharesNotes: "Using basic shares from SEC filings.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: true,
    notes: "SOL treasury company. Launched April 2025. Dashboard shows live mNAV.",
    lastVerified: "2026-01-20",
  },

  UPXI: {
    ticker: "UPXI",
    name: "Upexi",
    officialDashboard: "https://www.upexi.com",
    officialDashboardName: "upexi.com",
    officialMnavNote: "Shows Fully-Loaded mNAV on homepage",
    secCik: "1775194",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001775194",
    exchange: "NASDAQ",
    sharesSource: "basic",
    sharesNotes: "Using EntityCommonStockSharesOutstanding from SEC filings.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: true,
    notes: "SOL treasury company. Dashboard shows live mNAV.",
    lastVerified: "2026-01-24",
  },

  // ==================== LTC COMPANIES ====================

  LITS: {
    ticker: "LITS",
    name: "Lite Strategy",
    officialDashboard: "https://www.litestrategy.com/dashboard/",
    officialDashboardName: "litestrategy.com",
    officialMnavNote: "Market Cap / NAV (shows mNAV on dashboard)",
    investorRelations: "https://investor.litestrategy.com/",
    secCik: "1262104",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001262104",
    exchange: "NASDAQ",
    sharesSource: "basic",
    sharesNotes: "Formerly MEI Pharma. Rebranded Sep 2025.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: true,
    notes: "First US-listed LTC treasury. Charlie Lee on board. GSR as treasury manager.",
    lastVerified: "2026-01-21",
  },

  // ==================== OTHER ====================

  XXI: {
    ticker: "XXI",
    name: "Twenty One Capital",
    officialDashboard: "https://xxi.mempool.space",
    officialDashboardName: "xxi.mempool.space",
    officialMnavNote: "On-chain proof via mempool.space wallet tracker",
    secCik: "2070457",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002070457",
    exchange: "NYSE",
    sharesSource: "basic",
    sharesNotes: "Newly public. Tether/SoftBank/Mallers backed.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: true,
    notes: "3rd largest public BTC holder. Jack Mallers CEO. On-chain BTC proof via mempool.space.",
    lastVerified: "2026-01-21",
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

  // ==================== ETH COMPANIES ====================

  BTCS: {
    ticker: "BTCS",
    name: "BTCS Inc",
    secCik: "1436229",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229",
    exchange: "NASDAQ",
    sharesSource: "diluted",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    lastVerified: "2026-01-22",
  },

  BTBT: {
    ticker: "BTBT",
    name: "Bit Digital",
    secCik: "1710350",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001710350",
    exchange: "NASDAQ",
    sharesSource: "diluted",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "ETH miner and holder. Cayman Islands incorporated.",
    lastVerified: "2026-01-22",
  },

  GAME: {
    ticker: "GAME",
    name: "GameSquare Holdings",
    secCik: "1714562",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001714562",
    exchange: "NASDAQ",
    sharesSource: "diluted",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Esports company with ETH treasury.",
    lastVerified: "2026-01-22",
  },

  ETHM: {
    ticker: "ETHM",
    name: "Ether Machine",
    secCik: "2080334",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002080334",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "SPAC merger with Dynamix. 3rd largest ETH treasury. Andrew Keys.",
    lastVerified: "2026-01-22",
  },

  // ==================== HYPE COMPANIES ====================

  HYPD: {
    ticker: "HYPD",
    name: "Hyperion DeFi",
    secCik: "1682639",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001682639",
    exchange: "NASDAQ",
    sharesSource: "basic",
    sharesNotes: "Formerly Eyenovia, Inc. Rebranded Jul 2025.",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "First US public HYPE treasury. Validator node via Kinetiq.",
    lastVerified: "2026-01-22",
  },

  PURR: {
    ticker: "PURR",
    name: "Hyperliquid Strategies",
    secCik: "2078856",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002078856",
    exchange: "NYSE",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "HYPE treasury via Sonnet merger. David Schamis CEO, Bob Diamond board.",
    lastVerified: "2026-01-22",
  },

  // ==================== BNB COMPANIES ====================

  NA: {
    ticker: "NA",
    name: "Nano Labs",
    secCik: "1872302",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001872302",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Semiconductor company with BNB treasury. China-based.",
    lastVerified: "2026-01-22",
  },

  // ==================== BTC COMPANIES (Additional) ====================

  CEPO: {
    ticker: "CEPO",
    name: "Cantor Equity Partners I (BSTR Holdings)",
    secCik: "2027708",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002027708",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: false,
    notes: "SPAC for BSTR Holdings. Adam Back CEO. Will trade as BSTR post-merger.",
    lastVerified: "2026-01-22",
  },

  // NXTT removed - history of false financial reports, shareholder lawsuits

  NAKA: {
    ticker: "NAKA",
    name: "Nakamoto Holdings",
    secCik: "1946573",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001946573",
    exchange: "NASDAQ",
    sharesSource: "diluted",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: false,
    notes: "Merged with KindlyMD. David Bailey founded.",
    lastVerified: "2026-01-22",
  },

  ABTC: {
    ticker: "ABTC",
    name: "American Bitcoin Corp",
    secCik: "2068580",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002068580",
    exchange: "NASDAQ",
    sharesSource: "diluted",
    reportsHoldingsFrequency: "monthly",
    reportsMnavDaily: false,
    notes: "Pure-play BTC miner with HODL strategy. 80% owned by Hut 8. Active accumulation.",
    lastVerified: "2026-01-23",
  },

  ASST: {
    ticker: "ASST",
    name: "Strive, Inc.",
    investorRelations: "https://investors.strive.com",
    secCik: "1920406",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001920406",
    exchange: "NASDAQ",
    sharesSource: "basic",
    sharesNotes: "Post 1-for-20 split (Feb 3, 2026): 40.77M basic (Class A 29.6M + Class B 11.1M). Pre-funded warrants (3.2M @ $0.002) and traditional warrants (26.7M @ $27) tracked in dilutive-instruments.ts.",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: false,
    notes: "First publicly traded asset manager with BTC treasury. Merged with Asset Entities Sep 2025, acquired Semler Scientific Jan 2026. 1-for-20 reverse split Feb 3, 2026. SATA 12.25% perpetual preferred is NOT convertible to common.",
    lastVerified: "2026-02-12",
  },

  FGNX: {
    ticker: "FGNX",
    name: "FG Nexus",
    secCik: "1591890",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001591890",
    exchange: "NASDAQ",
    sharesSource: "diluted",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Formerly Fundamental Global. ETH treasury company.",
    lastVerified: "2026-01-22",
  },

  // ==================== SOL COMPANIES ====================

  FWDI: {
    ticker: "FWDI",
    name: "Forward Industries",
    secCik: "38264",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000038264",
    exchange: "NASDAQ",
    sharesSource: "diluted",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Hardware/software design company with SOL treasury.",
    lastVerified: "2026-01-22",
  },

  HSDT: {
    ticker: "HSDT",
    name: "Helius Medical Technologies",
    secCik: "1610853",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001610853",
    exchange: "NASDAQ",
    sharesSource: "diluted",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Neurotech company with SOL treasury.",
    lastVerified: "2026-01-22",
  },

  // ==================== BTC COMPANIES (Additional) ====================

  TAOX: {
    ticker: "TAOX",
    name: "TAO Synergies Inc.",
    secCik: "1571934",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001571934",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Formerly Synaptogenix. BTC treasury company.",
    lastVerified: "2026-01-22",
  },

  TWAV: {
    ticker: "TWAV",
    name: "TaoWeave, Inc.",
    secCik: "746210",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000746210",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Formerly Oblong, Inc. BTC treasury company.",
    lastVerified: "2026-01-22",
  },

  CWD: {
    ticker: "CWD",
    name: "CaliberCos Inc.",
    secCik: "1627282",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001627282",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Real estate company with BTC treasury.",
    lastVerified: "2026-01-22",
  },

  // ==================== BNB COMPANIES ====================

  BNC: {
    ticker: "BNC",
    name: "CEA Industries Inc. (BNB Network Company)",
    secCik: "1482541",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001482541",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Formerly CEA Industries. Ticker changed to BNC Aug 2025. YZi Labs (CZ) backed.",
    lastVerified: "2026-01-22",
  },

  // ==================== TRX COMPANIES ====================

  TRON: {
    ticker: "TRON",
    name: "Tron Inc.",
    secCik: "1956744",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001956744",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Formerly SRM Entertainment. Ticker changed to TRON Jul 2025.",
    lastVerified: "2026-01-22",
  },

  // ==================== XRP COMPANIES ====================

  XRPN: {
    ticker: "XRPN",
    name: "Armada Acquisition Corp. II (Evernorth)",
    secCik: "2044009",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002044009",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "SPAC merging with Evernorth Holdings. Ticker changed from AACI Oct 2025.",
    lastVerified: "2026-01-22",
  },

  // ==================== ZEC COMPANIES ====================

  CYPH: {
    ticker: "CYPH",
    name: "Cypherpunk Technologies Inc.",
    secCik: "1509745",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001509745",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Formerly Leap Therapeutics. Ticker changed to CYPH Nov 2025. Winklevoss backed.",
    lastVerified: "2026-01-22",
  },

  // ==================== SUI COMPANIES ====================

  SUIG: {
    ticker: "SUIG",
    name: "SUI Group Holdings",
    secCik: "1425355",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001425355",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Formerly Mill City Ventures. Ticker changed to SUIG Aug 2025.",
    lastVerified: "2026-01-22",
  },

  // ==================== DOGE COMPANIES ====================

  ZONE: {
    ticker: "ZONE",
    name: "CleanCore Solutions, Inc.",
    secCik: "1956741",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001956741",
    exchange: "NYSE",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "DOGE treasury company. House of Doge as treasury manager.",
    lastVerified: "2026-01-22",
  },

  TBH: {
    ticker: "TBH",
    name: "Brag House Holdings, Inc. (House of Doge)",
    secCik: "1903595",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001903595",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Merging with House of Doge (Dogecoin Foundation). Alex Spiro chairman.",
    lastVerified: "2026-01-22",
  },

  BTOG: {
    ticker: "BTOG",
    name: "Bit Origin Ltd",
    secCik: "1735556",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001735556",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "DOGE treasury company. Formerly China Xiangtai Food. Singapore-based.",
    lastVerified: "2026-01-22",
  },

  // ==================== AVAX COMPANIES ====================

  AVX: {
    ticker: "AVX",
    name: "AVAX One Technology Ltd.",
    secCik: "1826397",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001826397",
    exchange: "NASDAQ",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Formerly AgriFORCE Growing Systems. Ticker changed to AVX Nov 2025.",
    lastVerified: "2026-01-22",
  },

  // ==================== HKEX COMPANIES ====================

  "0434.HK": {
    ticker: "0434.HK",
    name: "Boyaa Interactive (博雅互動國際有限公司)",
    hkexStockCode: "00434",
    hkexFilingsUrl: "https://www.hkexnews.hk/listedco/listconews/sehk/search/search_active_main.xhtml?stockcode=00434",
    exchange: "HKEX",
    sharesSource: "basic",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "Hong Kong's largest BTC treasury. Board games company. Cayman Islands incorporated.",
    lastVerified: "2026-01-22",
  },

  // ==================== EURONEXT COMPANIES ====================

  ALTBG: {
    ticker: "ALTBG",
    name: "Capital B (fka The Blockchain Group)",
    officialDashboard: "https://cptlb.com/analytics/",
    officialDashboardName: "cptlb.com",
    officialMnavNote: "Shows NAV per Share (mNAV = Price / NAV per Share)",
    euronextIsin: "FR0011053636",
    euronextFilingsUrl: "https://live.euronext.com/en/product/equities/FR0011053636-ALXP",
    exchange: "Euronext",
    sharesSource: "basic",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: true,
    notes: "Europe's first BTC Treasury Company. Rebranded from The Blockchain Group Jul 2025. EUR 300M ATM program. Dashboard shows NAV per share.",
    lastVerified: "2026-01-22",
  },

  // ==================== NGM COMPANIES (Sweden) ====================

  "H100.ST": {
    ticker: "H100.ST",
    name: "H100 Group AB",
    investorRelations: "https://www.h100.group/investor-relations/shares",
    ngmIsin: "SE0009580756",
    ngmFilingsUrl: "https://www.h100.group/investor-relations/shares",
    exchange: "NGM",
    sharesSource: "basic",
    sharesNotes: "NGM Nordic SME. Official ticker is H100 (H100.ST is vendor suffix).",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: false,
    notes: "Swedish BTC treasury. Adam Back investor. ISK-eligible for Swedish investors.",
    lastVerified: "2026-01-22",
  },

  // ==================== CANADIAN COMPANIES ====================

  STKE: {
    ticker: "STKE",
    name: "Sol Strategies Inc.",
    investorRelations: "https://solstrategies.io/investor-relations/",
    sedarIsin: "CA83411A2056",
    sedarFilingsUrl: "https://thecse.com/listings/sol-strategies-inc/sedar-filings/",
    secCik: "1846839",
    secFilingsUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001846839",
    exchange: "CSE",
    sharesSource: "basic",
    sharesNotes: "CSE: HODL, NASDAQ: STKE. 1:8 consolidation Aug 2025.",
    reportsHoldingsFrequency: "monthly",
    reportsMnavDaily: false,
    notes: "Largest SOL validator. VanEck staking provider. Dual-listed CSE + NASDAQ.",
    lastVerified: "2026-01-22",
  },

  XTAIF: {
    ticker: "XTAIF",
    name: "xTAO Inc.",
    investorRelations: "https://www.newswire.ca/news-releases/?organization=xtao",
    sedarIsin: "KYG9T27M1036",
    sedarFilingsUrl: "https://www.sedarplus.ca",
    exchange: "TSX-V",
    sharesSource: "basic",
    sharesNotes: "TSX-V: XTAO.U, OTCQB: XTAIF. Cayman Islands incorporated (KY ISIN).",
    reportsHoldingsFrequency: "on_purchase",
    reportsMnavDaily: false,
    notes: "World's largest public TAO holder. Bittensor validator infrastructure.",
    lastVerified: "2026-01-22",
  },

  LUXFF: {
    ticker: "LUXFF",
    name: "Luxxfolio Holdings Inc.",
    investorRelations: "https://www.luxxfolio.com/",
    sedarIsin: "CA55069Q3026",
    sedarFilingsUrl: "https://thecse.com/listings/luxxfolio-holdings-inc/sedar-filings/",
    exchange: "CSE",
    sharesSource: "basic",
    sharesNotes: "CSE: LUXX, OTCQB: LUXFF. 1:10 consolidation Mar 2025.",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "LTC treasury company. Charlie Lee + David Schwartz advisors.",
    lastVerified: "2026-01-22",
  },

  IHLDF: {
    ticker: "IHLDF",
    name: "Immutable Holdings Inc.",
    investorRelations: "https://www.immutableholdings.com/investors",
    sedarIsin: "CA45258G1081",
    sedarFilingsUrl: "https://www.sedarplus.ca",
    exchange: "CBOE",
    sharesSource: "basic",
    sharesNotes: "CBOE Canada: HOLD, OTCQB: IHLDF.",
    reportsHoldingsFrequency: "quarterly",
    reportsMnavDaily: false,
    notes: "HBAR treasury company. Jordan Fried (Hedera founding team). Owns NFT.com.",
    lastVerified: "2026-01-22",
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
