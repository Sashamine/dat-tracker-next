// Company intelligence: press releases, strategy summaries, and recent developments
// Last updated: January 26, 2026

import { getMstrDevelopments } from "./mstr-developments";

export interface PressRelease {
  date: string; // YYYY-MM-DD
  title: string;
  summary?: string;
  url?: string;
}

export interface StrategyDoc {
  title: string;
  date: string; // YYYY-MM-DD
  description: string;
  url: string;
}

export interface CompanyIntel {
  ticker: string;
  pressReleases: PressRelease[];
  strategySummary: string;
  recentDevelopments: string[];
  keyBackers?: string[];
  strategyDocs?: StrategyDoc[];
  outlook2026?: string;
  lastResearched: string; // YYYY-MM-DD
}

// =============================================================================
// BTC TREASURY COMPANIES
// =============================================================================

const MSTR_INTEL: CompanyIntel = {
  ticker: "MSTR",
  lastResearched: "2026-01-26",
  pressReleases: [
    { date: "2026-01-19", title: "Purchased 22,305 BTC for $2.2B", summary: "Largest weekly purchase of 2026, funded by $1.8B ATM sales", url: "https://www.strategy.com/press" },
    { date: "2026-01-12", title: "Purchased 13,627 BTC for $1.25B", summary: "At $91,519/BTC average", url: "https://www.strategy.com/press/strategy-acquires-13627-btc" },
    { date: "2025-11-12", title: "$46B Omnibus ATM Program", summary: "Announced capacity for 2B Class A shares + preferred (STRK, STRF, STRD, STRC, STRE)", url: "https://www.sec.gov/Archives/edgar/data/1050446/000119312525243601/0001193125-25-243601-index.htm" },
    { date: "2025-11-12", title: "STRE 10% Perpetual Preferred Launched", summary: "Fifth preferred class, completing preferred stock suite", url: "https://www.sec.gov/Archives/edgar/data/1050446/000119312525280178/0001193125-25-280178-index.htm" },
    { date: "2025-02-01", title: "Rebranded from MicroStrategy to Strategy", summary: "Corporate name change reflecting Bitcoin focus", url: "https://www.strategy.com/press/microstrategy-rebrands-to-strategy" },
  ],
  strategySummary: "The 'Bitcoin Treasury Company' - pioneered corporate BTC accumulation starting Aug 2020. Executing the '42/42 Plan' targeting $84B in capital ($42B equity + $42B fixed-income). Operates as a Bitcoin credit company: issues convertible notes at 0-2.25% to buy BTC, captures BTC appreciation minus low cost of capital. Has 5 perpetual preferred classes (STRK, STRF, STRD, STRC, STRE) at 8-10% yields for income investors. Reports 'BTC Yield' metric - BTC per share growth rate.",
  // recentDevelopments: Generated dynamically from mstr-developments.ts
  recentDevelopments: [], // Placeholder - overridden in getCompanyIntel()
  keyBackers: [
    "Michael Saylor (Executive Chairman, founder of BTC treasury strategy)",
    "Phong Le (President & CEO since 2022)",
    "Andrew Kang (CFO)",
    "Funded via public markets: convertibles, ATM equity, preferred stock",
  ],
  outlook2026: `
**Debt Schedule:**
- Feb 2027: $1.05B @ 0% convertible matures (conversion price ~$143)
- Jun 2028: $500M secured term loan + $1.01B convertible
- Dec 2029: $3B @ 0% convertible (largest tranche)
- 2030-2032: $4.2B in convertibles maturing

**Catalysts:**
- S&P 500 inclusion possible if GAAP profitable (BTC fair value accounting helps)
- 42/42 Plan ~20% deployed - $70B+ capacity remaining
- Sub-$100K BTC enables aggressive accumulation at lower cost basis

**Risks:**
- Regulatory uncertainty around Bitcoin corporate holdings
`.trim(),
  strategyDocs: [
    { title: "42/42 Plan Announcement", date: "2025-10-30", description: "Capital plan: $42B equity + $42B fixed income over 3 years", url: "https://www.strategy.com/press/microstrategy-announces-42-billion-capital-plan" },
    { title: "Q4 2025 Earnings Presentation", date: "2026-02-05", description: "Latest quarterly strategy update and BTC metrics", url: "https://www.strategy.com/investor-relations" },
    { title: "Bitcoin Treasury Reserve Policy", date: "2024-08-10", description: "Original corporate treasury strategy framework", url: "https://www.strategy.com/bitcoin" },
    { title: "Preferred Stock Overview", date: "2025-11-12", description: "STRK, STRF, STRD, STRC, STRE - full preferred suite", url: "https://www.strategy.com/investor-relations/preferred-stock" },
  ],
};

const METAPLANET_INTEL: CompanyIntel = {
  ticker: "3350.T",
  lastResearched: "2026-02-11",
  pressReleases: [
    { date: "2026-01-29", title: "New Share + 25th Series Warrant Issuance", summary: "Raising capital for BTC purchases via EVO FUND warrants", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { date: "2025-12-30", title: "Holdings lifted to 35,102 BTC", summary: "620 BTC purchased at $96,570 avg", url: "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20251230/20251229527957.pdf" },
    { date: "2025-10-28", title: "Capital Allocation Policy Announced", summary: "mNAV-based framework: equity when >1x, preferred when ~1x", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { date: "2025-10-01", title: "Phase II: Bitcoin Platform", summary: "Expansion into BTC income generation for preferred dividends", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { date: "2025-06-06", title: "2025-2027 BITCOIN PLAN ('555 Million Plan')", summary: "Targeting 210,000 BTC by 2027", url: "https://metaplanet.jp/en/shareholders/disclosures" },
  ],
  strategySummary: "Japan's Bitcoin treasury leader targeting 210K BTC by 2027 ('555 Million Plan'). Uses moving-strike warrants via EVO FUND for capital-efficient accumulation. Reports 'BTC Yield' (growth in BTC per fully-diluted share). Capital allocation governed by mNAV: issue equity when mNAV > 1x, pivot to preferred shares when near 1x. Currently raising via 25th series warrants (Jan 2026) for BTC purchases. $355M BTC-backed credit facility provides additional flexibility.",
  recentDevelopments: [
    "Currently in warrant cycle - 25th series issuance (Jan 29, 2026) pending exercise",
    "No BTC purchases since Dec 30, 2025 while capital raise in progress",
    "4th largest corporate Bitcoin treasury globally, largest in Asia",
    "$355M drawn on $500M BTC-collateralized credit facility",
    "Phase II: Bitcoin income generation via option premiums",
    "Zero-coupon yen bonds (no interest, principal at maturity)",
  ],
  keyBackers: ["Simon Gerovich (CEO)", "Dylan LeClair (Strategic Advisor)"],
  strategyDocs: [
    { title: "Q3 2025 Earnings Presentation", date: "2025-11-14", description: "Full strategy synthesis", url: "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20251114/20251112598935.pdf" },
    { title: "Capital Allocation Policy", date: "2025-10-28", description: "mNAV decision framework", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { title: "Phase II: Bitcoin Platform", date: "2025-10-01", description: "Income generation expansion", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    { title: "2025-2027 BITCOIN PLAN", date: "2025-06-06", description: "210K BTC target ('555 Million Plan')", url: "https://metaplanet.jp/en/shareholders/disclosures" },
  ],
  outlook2026: `**Current Status:
• 35,102 BTC held (as of Dec 30, 2025)
• Q1 2026 BTC Yield: 0% (waiting for warrant proceeds)
• mNAV ~1.22x - still above 1x

**Catalysts:**
• 25th series warrant exercises → BTC purchases resume
• TSE approval for preferred share listing
• Yen weakness continues to favor accumulation strategy`,
};

const XXI_INTEL: CompanyIntel = {
  ticker: "XXI",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-12-09", title: "Began trading on NYSE under ticker XXI", summary: "Over 43,500 BTC in holdings at debut", url: "https://www.xxi.com/newsroom" },
    { date: "2025-12-09", title: "Shares dropped 20-25% on first trading day", summary: "Despite rising BTC price", url: "https://www.xxi.com/newsroom" },
    { date: "2025-04-23", title: "Announced merger with Cantor Equity Partners SPAC", summary: "Transaction valued at $3.6B pro-forma", url: "https://www.xxi.com/newsroom" },
  ],
  strategySummary: "Majority-owned by Tether and Bitfinex with significant SoftBank minority stake. Led by Jack Mallers (Strike founder). Plans to build Bitcoin-focused businesses including brokerage, exchange, credit, and lending services. Positioned as direct competitor to Strategy (MSTR). Entered market as instant 3rd largest public corporate BTC holder.",
  recentDevelopments: [
    "43,500+ BTC at NYSE debut",
    "Went public via SPAC merger with Cantor Equity Partners",
    "JPMorgan closed Jack Mallers' personal accounts around IPO time",
    "Trading near PIPE pricing of ~$10 after volatile debut",
  ],
  keyBackers: ["Jack Mallers (CEO)", "Tether", "Bitfinex", "SoftBank", "Cantor Fitzgerald"],
  outlook2026: "Building out Bitcoin-native financial services. Competing directly with MSTR for institutional BTC treasury leadership.",
  strategyDocs: [
    { title: "SPAC Merger Announcement", date: "2025-04-23", description: "Twenty One Capital formation via Cantor Equity Partners", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&company=twenty+one&type=&dateb=&owner=include&count=40" },
    { title: "S-4 Registration Statement", date: "2025-08-15", description: "Full merger details and pro forma financials", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001964789&type=S-4" },
    { title: "Investor Presentation", date: "2025-12-09", description: "NYSE debut and Bitcoin treasury strategy", url: "https://www.xxi.com/investors" },
  ],
};

const CEPO_INTEL: CompanyIntel = {
  ticker: "CEPO",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-07-17", title: "SPAC merger announced with Cantor Equity Partners I", summary: "To go public as BSTR on Nasdaq", url: "https://blockstream.com/press/" },
    { date: "2025-07-16", title: "CEPO surged 25% on deal announcement", summary: "Market enthusiasm for Adam Back's company", url: "https://blockstream.com/press/" },
    { date: "2025-08-16", title: "Set to challenge MARA in BTC holdings", summary: "$2.1B treasury play", url: "https://blockstream.com/press/" },
  ],
  strategySummary: "Led by Dr. Adam Back (inventor of Hashcash, referenced in Bitcoin white paper) and Sean Bill (CIO). Raising up to $1.5B via PIPE ($400M equity, $750M convertible notes, $350M preferred stock). Goal: debut with 30,000+ BTC, grow beyond 50,000 BTC. Would immediately become 4th largest public Bitcoin holder. 25,000 BTC contributed from Adam Back's personal holdings.",
  recentDevelopments: [
    "30,021 BTC holdings (~$2.7B value)",
    "Nasdaq listing pending as 'BSTR'",
    "Adam Back: 'Bitcoin was created as sound money and BSTR is being created to bring that same integrity to modern capital markets'",
    "Poised to potentially overtake MARA as second-largest corporate BTC holder",
  ],
  keyBackers: ["Dr. Adam Back (CEO, Blockstream founder)", "Sean Bill (CIO)"],
  outlook2026: "Complete Nasdaq listing as BSTR. Target 50,000+ BTC holdings.",
};

const MARA_INTEL: CompanyIntel = {
  ticker: "MARA",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-10-03", title: "September production: 218 blocks (5% increase)", summary: "Continued operational improvement", url: "https://ir.mara.com/news-events/press-releases" },
    { date: "2025-08-01", title: "Acquired 64% stake in Exaion (EDF subsidiary)", summary: "Expanding into low-carbon energy", url: "https://ir.mara.com/news-events/press-releases" },
    { date: "2025-07-01", title: "Surpassed 50,000 BTC holdings", summary: "Produced 703 BTC in July", url: "https://ir.mara.com/news-events/press-releases" },
    { date: "2025-06-01", title: "Mid-year outlook: targeting 75 EH/s by EOY", summary: "40% hashrate growth target", url: "https://ir.mara.com/news-events/press-releases" },
    { date: "2025-05-01", title: "Record month: 282 blocks (38% increase)", summary: "950 BTC produced", url: "https://ir.mara.com/news-events/press-releases" },
    { date: "2025-04-01", title: "Completed 50 MW Ohio expansion", summary: "100 MW total at facility", url: "https://ir.mara.com/news-events/press-releases" },
  ],
  strategySummary: "HODL miner strategy - keeps all mined BTC rather than selling. 1.7 GW of captive capacity (1.1 GW operational). Growth pipeline exceeding 3 GW of low-cost power opportunities. Completed $950M offering of 0.00% Convertible Senior Notes due 2032. Texas wind farm fully deployed, on track for Q4 full operational status. 2nd largest publicly traded Bitcoin holder globally.",
  recentDevelopments: [
    "52,000+ BTC holdings (~$5B in liquid assets)",
    "Acquired stake in Exaion, subsidiary of EDF (one of world's largest low-carbon energy producers)",
    "Most BTC produced since April 2024 halving event in May 2025",
    "Targeting 75 EH/s hashrate",
  ],
  keyBackers: ["Fred Thiel (CEO)"],
  outlook2026: "Continue HODL strategy. Expand to 75 EH/s. Leverage Exaion partnership for low-carbon mining.",
  strategyDocs: [
    { title: "Q3 2025 Investor Presentation", date: "2025-11-05", description: "HODL strategy and operational metrics", url: "https://ir.mara.com/news-events/presentations" },
    { title: "2025 Annual Report", date: "2026-02-28", description: "Full year mining and treasury performance", url: "https://ir.mara.com/financial-information/annual-reports" },
    { title: "Bitcoin Mining & HODL Strategy", date: "2024-01-01", description: "Core strategy: mine and hold all BTC", url: "https://www.mara.com/bitcoin" },
  ],
};

const CLSK_INTEL: CompanyIntel = {
  ticker: "CLSK",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2026-01-06", title: "December 2025 update: mined 622 BTC", summary: "Continued strong production", url: "https://ir.cleanspark.com/news-events/press-releases" },
    { date: "2025-11-01", title: "Closed $1.15B zero-coupon convertible notes", summary: "Major financing milestone", url: "https://ir.cleanspark.com/news-events/press-releases" },
    { date: "2025-10-01", title: "Initiated AI/HPC strategy", summary: "Hired Jeffrey Thomas; acquired 271 acres near Houston", url: "https://ir.cleanspark.com/news-events/press-releases" },
    { date: "2025-09-01", title: "50 EH/s hashrate achieved", summary: "First publicly traded miner to reach milestone with self-operated centers", url: "https://ir.cleanspark.com/news-events/press-releases" },
  ],
  strategySummary: "First publicly traded BTC miner to reach 30 EH/s (Oct 2024) and 50 EH/s (June 2025) with fully self-operated data centers. Expanded contracted power to 1.45 GW. AI data center development: acquired land near Houston with 285 MW long-term power agreements. Partnership with Submer for next-gen compute infrastructure. Acquired GRIID Infrastructure (TVA-powered Tennessee pipeline).",
  recentDevelopments: [
    "13,099 BTC holdings - mined 7,746 BTC in 2025 (10%+ YoY growth)",
    "Demand response capability: powered down 11 Tennessee sites within 10 minutes during TVA emergency",
    "$1.15B zero-coupon convertible notes closed",
    "Seeking Alpha 'Strong Buy' rating; trading at 63% discount to peers",
  ],
  keyBackers: ["Zach Bradford (CEO)"],
  outlook2026: "AI/HPC diversification. Leverage TVA relationship. Target 60+ EH/s.",
};

const ASST_INTEL: CompanyIntel = {
  ticker: "ASST",
  lastResearched: "2026-02-12",
  pressReleases: [
    { date: "2026-02-03", title: "1-for-20 reverse stock split effective", summary: "Class A: 29.6M, Class B: 11.1M post-split", url: "https://www.sec.gov/Archives/edgar/data/1920406/000095010326001560/" },
    { date: "2026-01-28", title: "Holdings reached 13,131.82 BTC", summary: "Continued accumulation post-merger", url: "https://www.sec.gov/Archives/edgar/data/1920406/000114036126002606/" },
    { date: "2026-01-16", title: "Completed acquisition of Semler Scientific", summary: "Combined BTC treasuries", url: "https://investors.strive.com" },
    { date: "2025-09-01", title: "Completed merger with Asset Entities", summary: "Became Strive, Inc.", url: "https://www.strive.com/press" },
    { date: "2025-05-27", title: "Secured $750M PIPE funding", summary: "For Bitcoin purchases", url: "https://www.strive.com/press" },
  ],
  strategySummary: "First publicly traded asset management firm with Bitcoin treasury strategy. Founded in 2022 by Vivek Ramaswamy and Anson Frericks. Merged with Asset Entities Sep 2025, acquired Semler Scientific Jan 2026. Uses perpetual preferred stock (SATA 12.25%) instead of debt. Over $2B AUM across 13 ETFs, CITs, and direct indexing platform. Plans to monetize Semler's healthcare diagnostics business while maintaining aggressive BTC accumulation.",
  recentDevelopments: [
    "13,132 BTC holdings (~$1.3B) as of Jan 28, 2026",
    "1-for-20 reverse split effective Feb 3, 2026 (40.77M shares post-split)",
    "SATA 12.25% perpetual preferred ($200M) - NOT convertible to common stock",
    "No debt - uses perpetual preferred instead of convertibles",
    "Semler acquisition completed Jan 16, 2026",
    "Pre-funded warrants (3.2M @ $0.002) + Traditional warrants (26.7M @ $27) outstanding",
  ],
  keyBackers: ["Vivek Ramaswamy (Co-Founder)", "Matt Cole (CEO)", "Eric Semler (Exec Chair)", "Anson Frericks"],
  outlook2026: "Post-merger integration. Monetize Semler healthcare ops. Continue aggressive BTC accumulation.",
  strategyDocs: [
    { title: "Jan 28, 2026 8-K (Holdings Update)", date: "2026-01-28", description: "13,131.82 BTC holdings confirmed", url: "https://www.sec.gov/Archives/edgar/data/1920406/000114036126002606/0001140361-26-002606-index.htm" },
    { title: "Feb 3, 2026 8-K (Stock Split)", date: "2026-02-03", description: "1-for-20 reverse split details", url: "https://www.sec.gov/Archives/edgar/data/1920406/000095010326001560/0000950103-26-001560-index.htm" },
    { title: "Q3 2025 10-Q", date: "2025-11-14", description: "5,886 BTC holdings at Sep 30, 2025", url: "https://www.sec.gov/Archives/edgar/data/1920406/000162828025052343/0001628280-25-052343-index.htm" },
  ],
};

const SMLR_INTEL: CompanyIntel = {
  ticker: "SMLR",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-08-04", title: "Q2 results: $195.4M BTC purchases, 31.3% BTC yield YTD", summary: "Strong treasury performance", url: "https://ir.semlerscientific.com/press-releases" },
    { date: "2025-07-01", title: "Appointed Joe Burnett as Director of Bitcoin Strategy", summary: "Key hire for treasury operations", url: "https://ir.semlerscientific.com/press-releases" },
    { date: "2025-02-04", title: "Acquired 871 BTC", summary: "Continued accumulation", url: "https://ir.semlerscientific.com/press-releases" },
    { date: "2025-12-01", title: "Announced merger with Strive", summary: "All-stock Bitcoin treasury transaction", url: "https://ir.semlerscientific.com/press-releases" },
  ],
  strategySummary: "Targets: 10,000 BTC by end 2025, 42,000 by end 2026, 105,000 by end 2027. Second U.S. public company (after MicroStrategy) to adopt Bitcoin as primary treasury reserve. Core business: Medical devices and software for peripheral arterial disease detection. Q2 2025: $110.4M unrealized gains, 31.3% BTC yield.",
  recentDevelopments: [
    "5,021 BTC holdings (~$455M)",
    "Benchmark initiated coverage with Buy rating and $101 price target",
    "Joe Burnett: 'The trend to adopt Bitcoin as part of corporate treasury is clearly accelerating'",
    "Merging with Strive Asset Management",
  ],
  keyBackers: ["Eric Semler (Chairman)", "Joe Burnett (Director of Bitcoin Strategy)"],
  outlook2026: "Complete Strive merger. Target 42,000 BTC by end of year.",
};

const KULR_INTEL: CompanyIntel = {
  ticker: "KULR",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-11-24", title: "Counter-UAS Directed Energy Battery System prototype completed", summary: "Defense tech milestone", url: "https://ir.kulrtechnology.com/press-releases" },
    { date: "2025-11-18", title: "Q3 2025 earnings: Bitcoin holdings ~$120M", summary: "Treasury growth", url: "https://ir.kulrtechnology.com/press-releases" },
    { date: "2025-05-20", title: "Expanded holdings to 800 BTC", summary: "220.2% BTC yield reported", url: "https://ir.kulrtechnology.com/press-releases" },
    { date: "2025-01-01", title: "Purchased 213.42 BTC", summary: "Initial 2025 accumulation", url: "https://ir.kulrtechnology.com/press-releases" },
  ],
  strategySummary: "Board committed to allocating up to 90% of surplus cash to Bitcoin (December 2024). Uses combination of surplus cash, Coinbase credit facility, and ATM equity program. New hosting partnership with Soluna Holdings for 3.3 MW Bitcoin mining in Kentucky. Core business: Thermal management and battery safety (NASA/aerospace origins). Reports 'BTC Yield' metric.",
  recentDevelopments: [
    "1,021 BTC holdings (~$101-120M)",
    "291.2% BTC Yield YTD",
    "$6.7M grant from Texas Space Commission for space exploration tech",
    "Collaboration with NASA Johnson Space Center and South 8 Technologies",
    "Counter-UAS battery system entering production in 2026",
  ],
  keyBackers: ["Michael Mo (CEO)", "NASA", "Texas Space Commission"],
  outlook2026: "Counter-UAS production. Continued BTC accumulation. Space tech partnerships.",
};

const ALTBG_INTEL: CompanyIntel = {
  ticker: "ALCPB",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-07-21", title: "Confirmed 1,955 BTC holdings", summary: "1,373% BTC Yield YTD", url: "https://www.thebitcoincompany.fr/en/press" },
    { date: "2025-06-11", title: "Shareholders approved EUR 10B+ financing capacity", summary: "Massive expansion authorization", url: "https://www.thebitcoincompany.fr/en/press" },
    { date: "2025-05-12", title: "Adam Back subscribed EUR 12.1M BTC-denominated convertible bond", summary: "Blockstream founder backing", url: "https://www.thebitcoincompany.fr/en/press" },
    { date: "2025-05-09", title: "EUR 9.9M capital increase at 61.7% premium", summary: "Strong investor demand", url: "https://www.thebitcoincompany.fr/en/press" },
    { date: "2025-03-01", title: "Issued EUR 48.6M convertible bonds; purchased 580 BTC", summary: "Accelerated accumulation", url: "https://www.thebitcoincompany.fr/en/press" },
  ],
  strategySummary: "Europe's first Bitcoin Treasury Company (Euronext Growth Paris). Long-term targets: 21,000-42,000 BTC by 2029; 170,000-260,000 BTC by 2033 (~1% of Bitcoin supply). Subsidiaries in Data Intelligence, AI, and decentralized tech consulting. Positioned as 'French MicroStrategy.'",
  recentDevelopments: [
    "1,955 BTC holdings (~EUR 177M at EUR 90,526/BTC average)",
    "Aiming to raise EUR 10 billion+ to accelerate Bitcoin Treasury strategy",
    "Predicts major French banks will enter Bitcoin in late 2025/early 2026",
  ],
  keyBackers: ["Adam Back (Blockstream)", "Fulgur Ventures", "UTXO Management", "TOBAM"],
  outlook2026: "EUR 10B+ raise. Target 5,000+ BTC. French institutional adoption catalyst.",
};

const H100ST_INTEL: CompanyIntel = {
  ticker: "H100.ST",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2026-01-01", title: "Acquisition of Future Holdings AG (Swiss BTC treasury)", summary: "First expansion outside Nordics", url: "https://www.h100group.com/press" },
    { date: "2025-09-01", title: "Holdings reached ~1,005 BTC", summary: "Continued accumulation", url: "https://www.h100group.com/press" },
    { date: "2025-06-11", title: "Raised $10.5M from Adam Back, UTXO Management", summary: "Key investor support", url: "https://www.h100group.com/press" },
    { date: "2025-05-01", title: "First public BTC treasury in Sweden", summary: "Purchased 4.39 BTC to start", url: "https://www.h100group.com/press" },
  ],
  strategySummary: "Swedish health-tech company pivoted to Bitcoin Treasury strategy. Leading Bitcoin Treasury Company in the Nordics. Mission: maximize Bitcoin exposure per share via innovative financial instruments. June 2025 raise: SEK 69.65M shares + SEK 31.35M zero-interest convertible loans.",
  recentDevelopments: [
    "1,046 BTC holdings (~$108M at cost)",
    "Largest Bitcoin treasury in the Nordics",
    "Stock surged ~400% within first month of Bitcoin strategy adoption",
    "Future Holdings AG co-founded by Adam Back, Richard Byworth, Sebastien Hess (November 2025)",
  ],
  keyBackers: ["Adam Back (investor)", "UTXO Management", "Richard Byworth"],
  outlook2026: "Complete Future Holdings AG acquisition. Nordic expansion.",
};

const NAKA_INTEL: CompanyIntel = {
  ticker: "NAKA",
  lastResearched: "2026-01-20",
  pressReleases: [
    { date: "2025-12-15", title: "Board authorizes share buyback program", summary: "Repurchases as mNAV < 1", url: "https://nakamoto.com/update" },
    { date: "2025-08-19", title: "Acquired 5,744 BTC for $679M", summary: "First purchase post-merger at $118K avg", url: "https://nakamoto.com/update/kindlymd-acquires-5-744-btc-to-expand-nakamoto-bitcoin-treasury" },
    { date: "2025-08-01", title: "Merger with KindlyMD closed", summary: "Completed business combination", url: "https://nakamoto.com/update/kindlymd-completes-merger-with-nakamoto-to-establish-bitcoin-treasury" },
  ],
  strategySummary: "Founded by David Bailey (BTC Inc., Bitcoin Magazine founder). Vision: first publicly traded conglomerate of Bitcoin companies. Plans to bring Bitcoin Magazine, Bitcoin Conference, and 210k Capital hedge fund under Nakamoto Inc. PIPE at $1.12/share; $210M Kraken BTC-backed loan (8% annual, due Dec 2026). Goal: acquire 1M BTC ('one Nakamoto').",
  recentDevelopments: [
    "5,398 BTC holdings (~$484M) - sold 367 BTC in Nov 2025",
    "Share buyback authorized Dec 2025 - stock trading below NAV",
    "Nasdaq compliance deadline June 8, 2026 (must achieve $1+ price)",
    "mNAV ~0.84x - market cap below BTC holdings value",
  ],
  keyBackers: ["David Bailey (Founder, BTC Inc.)"],
  outlook2026: "Must regain Nasdaq compliance by June 2026. Share buyback may help. $5B ATM shelf available for future BTC purchases.",
};

const DJT_INTEL: CompanyIntel = {
  ticker: "DJT",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-12-31", title: "Announced digital token distribution to shareholders", summary: "One token per whole share", url: "https://ir.tmtgcorp.com/news-events/press-releases" },
    { date: "2025-10-01", title: "Unveiled Truth Predict platform with Crypto.com", summary: "Prediction markets expansion", url: "https://ir.tmtgcorp.com/news-events/press-releases" },
    { date: "2025-08-01", title: "Partnership: Treasury for Cronos (Crypto.com's token)", summary: "Strategic crypto alliance", url: "https://ir.tmtgcorp.com/news-events/press-releases" },
    { date: "2025-06-05", title: "Filed SEC registration for Truth Social Bitcoin ETF", summary: "ETF product development", url: "https://ir.tmtgcorp.com/news-events/press-releases" },
    { date: "2025-05-30", title: "Closed $2.5B Bitcoin treasury deal", summary: "$1.44B stock + $1B convertible notes", url: "https://ir.tmtgcorp.com/news-events/press-releases" },
  ],
  strategySummary: "Operates Truth Social, Truth+, and Truth.Fi. $2B in BTC, plus $300M allocated to options strategy for BTC-related securities. Crypto.com as exclusive Bitcoin custodian, prime execution agent, and liquidity provider. Planning Truth Social Bitcoin ETF.",
  recentDevelopments: [
    "~$2B in Bitcoin and BTC-related securities (as of July 2025)",
    "Part of ~$3B total liquid assets",
    "Each shareholder to receive one digital token per whole share of DJT",
    "Partnership with Crypto.com expanding into prediction markets",
    "Stock volatile; down ~33% from July highs",
  ],
  keyBackers: ["Devin Nunes (CEO)", "Crypto.com"],
  outlook2026: "Truth Social Bitcoin ETF launch. Token distribution to shareholders.",
};

const BOYAA_INTEL: CompanyIntel = {
  ticker: "0434.HK",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-08-01", title: "Added 290 BTC for ~$32-33 million", summary: "Continued accumulation", url: "https://www.boyaa.com.hk/en/ir/" },
    { date: "2024-11-01", title: "Converted ETH holdings to 2,083 BTC", summary: "Strategic shift to BTC-only", url: "https://www.boyaa.com.hk/en/ir/" },
    { date: "2024-01-26", title: "Acquired initial 1,100 BTC", summary: "Treasury strategy launch", url: "https://www.boyaa.com.hk/en/ir/" },
  ],
  strategySummary: "Leading online gaming company (digital card and board games). One of the largest public Bitcoin holders among Hong Kong-listed companies. Views Bitcoin as resilient store of value and hedge against macroeconomic uncertainties. Pioneer in integrating digital assets into corporate treasury in Hong Kong. Converted all ETH holdings to Bitcoin.",
  recentDevelopments: [
    "4,091 BTC holdings at avg cost ~$68,114/BTC (~$278.6M total cost basis)",
    "Converted Ethereum holdings to Bitcoin as part of Bitcoin-centric treasury strategy",
    "One of the first Hong Kong-listed companies to adopt significant Bitcoin treasury position",
    "'MicroStrategy of Asia' positioning",
  ],
  keyBackers: ["Dai Zhikang (Chairman & Executive Director)"],
  outlook2026: "Continued BTC accumulation. Hong Kong crypto hub positioning.",
};

// NXTT_INTEL removed - company has history of false financial reports (Nov 2023), shareholder lawsuits

const ABTC_INTEL: CompanyIntel = {
  ticker: "ABTC",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-11-14", title: "Q3 profit: $3.47M (vs $576K loss YoY)", summary: "Turnaround to profitability", url: "https://ir.americanbitcoin.com/news" },
    { date: "2025-09-03", title: "Began trading on Nasdaq under ABTC", summary: "$5B+ market cap at debut", url: "https://ir.americanbitcoin.com/news" },
    { date: "2025-08-28", title: "Announced September trading target", summary: "Pre-IPO update", url: "https://ir.americanbitcoin.com/news" },
    { date: "2025-05-12", title: "Announced going public via Gryphon Digital Mining merger", summary: "SPAC transaction", url: "https://ir.americanbitcoin.com/news" },
    { date: "2025-03-01", title: "Founded by Eric Trump, Donald Trump Jr., and Hut 8", summary: "Joint venture launch", url: "https://ir.americanbitcoin.com/news" },
  ],
  strategySummary: "Joint venture: Eric Trump + Donald Trump Jr. + Hut 8 (80% ownership). Hut 8 contributed vast majority of Bitcoin mining ASICs. Operates 60,000+ ASIC miners as of May 2025. Contracted to purchase additional 17,280 Bitmain machines. Eric Trump serves as co-founder and Chief Strategy Officer. Pure-play Bitcoin miner focused on HODL strategy.",
  recentDevelopments: [
    "4,004 BTC holdings (~$415M) - 25th largest BTC-holding company",
    "Stock surged 60% to $13+ on debut before settling to ~$9.50",
    "Hut 8 jumped 12%, Gryphon Digital Mining soared 200%+ on merger news",
    "Q3 2025 marked turnaround to profitability with $64.2M revenue (5x YoY)",
  ],
  keyBackers: ["Eric Trump (Co-Founder, Chief Strategy Officer)", "Donald Trump Jr. (Co-Founder)", "Hut 8"],
  outlook2026: "Scale mining operations. Continue HODL strategy.",
};

// =============================================================================
// ETH TREASURY COMPANIES
// =============================================================================

const BMNR_INTEL: CompanyIntel = {
  ticker: "BMNR",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2026-01-12", title: "ETH holdings reach 4.168M tokens, $14.0B total", summary: "Continued aggressive accumulation", url: "https://bitminerstrategy.com/news" },
    { date: "2026-01-02", title: "Chairman's message on authorized share increase vote", summary: "January 15 shareholder meeting", url: "https://bitminerstrategy.com/news" },
    { date: "2025-12-28", title: "ETH holdings reach 4.11M tokens, $13.2B total", summary: "Year-end milestone", url: "https://bitminerstrategy.com/news" },
    { date: "2025-12-08", title: "Added $435M of ETH to treasury", summary: "Major single purchase", url: "https://bitminerstrategy.com/news" },
    { date: "2025-11-24", title: "Added nearly 70K ETH in one week", summary: "Now holding 3% of ETH supply", url: "https://bitminerstrategy.com/news" },
    { date: "2025-06-30", title: "Initial $250M private placement announced", summary: "Treasury strategy launch", url: "https://bitminerstrategy.com/news" },
  ],
  strategySummary: "World's largest ETH treasury (3.45% of total supply), targeting 5% of ETH supply. Transitioned from immersion-cooled Bitcoin mining to aggressive ETH accumulation. MAVAN (Made in America Validator Network): Proprietary staking solution launching early 2026. Projected staking income: $360-480M annually once fully operational. Trading among top 50 most-traded US stocks (~$980M avg daily volume).",
  recentDevelopments: [
    "4.168M ETH holdings (~$14.0B total crypto + cash + moonshots)",
    "Represents 3.45% of total ETH supply",
    "Annual Stockholders Meeting: January 15, 2026 at Wynn Las Vegas",
    "Voting on authorized share increase from 500M to 50B shares",
  ],
  keyBackers: ["Tom Lee (Chairman, Fundstrat)", "ARK (Cathie Wood)", "MOZAYYX", "Founders Fund", "Bill Miller III", "Pantera", "Kraken", "DCG", "Galaxy Digital"],
  outlook2026: "MAVAN validator launch Q1. Target 5% ETH supply. $360-480M annual staking income.",
  strategyDocs: [
    { title: "ETH Treasury Strategy Overview", date: "2025-06-30", description: "Initial $250M private placement and strategy launch", url: "https://bitminerstrategy.com/investors" },
    { title: "MAVAN Validator Network", date: "2025-12-01", description: "Made in America Validator Network: proprietary staking infrastructure", url: "https://bitminerstrategy.com/mavan" },
    { title: "5% ETH Supply Target", date: "2025-11-24", description: "Roadmap to holding 5% of total ETH supply", url: "https://bitminerstrategy.com/news" },
    { title: "Q3 2025 Shareholder Letter", date: "2025-11-12", description: "Chairman Tom Lee's strategic vision", url: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001940804&type=10-Q" },
  ],
};

const SBET_INTEL: CompanyIntel = {
  ticker: "SBET",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-12-15", title: "Joseph Chalom appointed sole CEO", summary: "Former BlackRock exec takes helm", url: "https://sharplinkinc.com/news" },
    { date: "2025-10-21", title: "Added $75M in ETH, holdings exceed $3.5B", summary: "Resumed purchases", url: "https://sharplinkinc.com/news" },
    { date: "2025-10-20", title: "Executive appointments from BlackRock, Wall Street, crypto giants", summary: "Major team expansion", url: "https://sharplinkinc.com/news" },
    { date: "2025-08-31", title: "ETH holdings rise to 837,230", summary: "Treasury growth", url: "https://sharplinkinc.com/news" },
    { date: "2025-07-25", title: "Joseph Chalom (BlackRock) joins as Co-CEO", summary: "Key hire", url: "https://sharplinkinc.com/news" },
    { date: "2025-06-02", title: "ETH treasury business launched", summary: "Strategy pivot", url: "https://sharplinkinc.com/news" },
  ],
  strategySummary: "Pivoted to ETH treasury strategy in June 2025. Raised $2.6 billion in capital since launch. Q3 2025: Revenue up 1,100% YoY to $10.8M; Net income $104.3M. Joe Lubin (Ethereum co-founder) as Chairman. Institutional ownership increased from low single digits to >30%. Stock experienced 2,600% spike then 86% correction; now trades at ~0.9x ETH holdings value.",
  recentDevelopments: [
    "863,424 ETH holdings (~$2.66B)",
    "#2 ETH treasury globally",
    "Key team: Matthew Sheffield (ex-FalconX, Bridgewater) CIO, Mandy Campbell (ex-Bain Capital Crypto) CMO, Michael Camarda (ex-Consensys, J.P. Morgan) CDO",
  ],
  keyBackers: ["Joseph Chalom (CEO, ex-BlackRock)", "Joseph Lubin (Chairman, Ethereum co-founder)"],
  outlook2026: "Institutional buildout. Target consistent premium to NAV.",
  strategyDocs: [
    { title: "ETH Treasury Strategy Launch", date: "2025-06-02", description: "Pivot from gaming to Ethereum treasury company", url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225014970/form8-k.htm" },
    { title: "Q3 2025 10-Q", date: "2025-11-12", description: "First full quarter financials post-pivot: +1,100% revenue YoY", url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/form10-q.htm" },
    { title: "Leadership Expansion", date: "2025-10-20", description: "BlackRock, Bridgewater, Bain Capital executives join", url: "https://sharplinkinc.com/news" },
  ],
};

const ETHM_INTEL: CompanyIntel = {
  ticker: "ETHM",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-09-16", title: "Form S-4 confidential submission to SEC", summary: "SPAC merger filing", url: "https://ethmgroup.com/news" },
    { date: "2025-08-27", title: "Ticker symbol changed from DYNX to ETHM", summary: "Reflecting ETH focus", url: "https://ethmgroup.com/news" },
    { date: "2025-07-21", title: "$1.5B+ backing announced for Nasdaq listing", summary: "Major capital commitment", url: "https://ethmgroup.com/news" },
    { date: "2025-07-01", title: "SPAC merger announced with Dynamix", summary: "$1.6B transaction", url: "https://ethmgroup.com/news" },
  ],
  strategySummary: "$1.6B gross proceeds expected from transaction. Three core strategies: Alpha generation through staking/DeFi, Ethereum ecosystem catalysis, infrastructure solutions. Andrew Keys (Ethereum pioneer) contributed ~$645M / 169,984 ETH. Additional 150,000 ETH ($654M) invested by Blockchains Founder Jeffrey Berns. Will become largest public Ether generation company at launch.",
  recentDevelopments: [
    "400,000+ ETH expected at listing",
    "$800M+ common stock financing from institutional investors",
    "Up to $170M from Dynamix trust account",
    "Expected close: Q4 2025 (may have closed)",
  ],
  keyBackers: ["Andrew Keys (Chairman)", "David Merin (CEO)", "Jeffrey Berns (Blockchains)", "Roundtable Partners/10T Holdings", "Archetype", "Blockchain.com", "Cyber Fund", "Electric Capital", "Kraken", "Pantera Capital"],
  outlook2026: "Complete SPAC merger. Launch yield generation and DeFi strategies.",
};

const BTBT_INTEL: CompanyIntel = {
  ticker: "BTBT",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2026-01-06", title: "December 2025 ETH treasury and staking metrics", summary: "89% staked, 3.5% yield", url: "https://ir.bitbt.com/news" },
    { date: "2025-11-01", title: "Q3 FY2025 financial results", summary: "Treasury performance update", url: "https://ir.bitbt.com/news" },
    { date: "2025-10-31", title: "Holdings reached 153,547 ETH (~$590.5M)", summary: "Continued growth", url: "https://ir.bitbt.com/news" },
    { date: "2025-07-18", title: "Expanded to ~120,000 ETH", summary: "Reinforcing treasury strategy", url: "https://ir.bitbt.com/news" },
    { date: "2025-07-07", title: "Completed transition to Ethereum treasury; sold 280 BTC", summary: "Full pivot from BTC to ETH", url: "https://ir.bitbt.com/news" },
  ],
  strategySummary: "Full pivot from BTC to ETH completed July 2025. Sold approximately 280 BTC and converted to ETH. Raised ~$172M in public offering to fund ETH purchases. Operates one of largest institutional Ethereum staking infrastructures globally. Holds majority stake in WhiteFiber (Nasdaq: WYFI) - AI infrastructure/HPC solutions.",
  recentDevelopments: [
    "155,227 ETH holdings (~$460.5M at $2,967/ETH)",
    "89% staked (~138,263 ETH)",
    "December staking rewards: ~389.6 ETH (3.5% annualized yield)",
    "CEO Sam Tabar: 'Ethereum as foundational to the next phase of digital financial infrastructure'",
  ],
  keyBackers: ["Sam Tabar (CEO)"],
  outlook2026: "AI infrastructure expansion via WhiteFiber. Maximize staking yield.",
};

const BTCS_INTEL: CompanyIntel = {
  ticker: "BTCS",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2026-01-07", title: "2026 Shareholder Letter - record $16M revenue, 70,500+ ETH", summary: "290% revenue increase vs 2024", url: "https://www.btcs.com/news" },
    { date: "2025-06-20", title: "1,000 ETH purchase via AAVE DeFi lending (no dilution)", summary: "Innovative treasury approach", url: "https://www.btcs.com/news" },
    { date: "2025-06-02", title: "1,000 ETH purchase, holdings reach ~13,500 ETH", summary: "Continued accumulation", url: "https://www.btcs.com/news" },
    { date: "2025-05-14", title: "$57.8M convertible note facility with ATW Partners", summary: "Financing secured", url: "https://www.btcs.com/news" },
  ],
  strategySummary: "Not just a treasury company - operates revenue-generating infrastructure. Builder+: MEV-optimized block building using advanced algorithms. Selects and sequences transactions from public mempool and private order flow. Maximizes gas fee revenue and block rewards for validators. Unique approach: Used AAVE DeFi lending to acquire ETH without shareholder dilution.",
  recentDevelopments: [
    "70,500+ ETH holdings",
    "2025 Revenue: ~$16 million (290% increase vs 2024)",
    "2026 focus: Enhance Ethereum-centric cryptocurrency revenue infrastructure",
    "Expand Imperium business and ecosystem partnerships",
  ],
  keyBackers: [],
  outlook2026: "Builder+ expansion. Diversified revenue-generating operations.",
};

const GAME_INTEL: CompanyIntel = {
  ticker: "GAME",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-11-01", title: "Q3 2025 results - $81.5M DAT + cash, no debt, 49.4% margin", summary: "Strong financial position", url: "https://ir.gamingandleisure.com/news" },
    { date: "2025-10-01", title: "Treasury program expanded to $250M; new $10M NFT yield strategy", summary: "Expanded mandate", url: "https://ir.gamingandleisure.com/news" },
    { date: "2025-08-01", title: "Purchased 2,717 ETH for ~$10M, total exceeds 15,630 ETH", summary: "Continued accumulation", url: "https://ir.gamingandleisure.com/news" },
    { date: "2025-08-01", title: "Launched Dialectic yield strategy", summary: "Yield optimization", url: "https://ir.gamingandleisure.com/news" },
    { date: "2025-07-01", title: "Initial $5M ETH purchase (~1,818 ETH)", summary: "Treasury strategy launch", url: "https://ir.gamingandleisure.com/news" },
  ],
  strategySummary: "Gaming company with ETH treasury. Yield Strategy Partner: Dialectic's Medici platform using ML models and automated optimization. Target yields: 8-14% (vs 3-4% standard staking). Q3 2025: Unrealized gain of $6.9M on ETH holdings. Buyback program: Net income from ETH yield funds stock buybacks below $1.50/share.",
  recentDevelopments: [
    "15,600 ETH holdings (~$48.2M)",
    "Treasury authorization expanded from $100M to $250M",
    "CEO Justin Kenna: 'We're not just holding Ethereum, we're putting it to work in a proprietary way with best-in-class partners'",
  ],
  keyBackers: ["Justin Kenna (CEO)", "Dialectic"],
  outlook2026: "8-14% yield target via Dialectic. Stock buybacks from yield income.",
};

const FGNX_INTEL: CompanyIntel = {
  ticker: "FGNX",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-11-20", title: "Sold ~11K ETH to fund share buyback", summary: "Stock down >95% from peak", url: "https://ir.fgnx.com/news" },
    { date: "2025-10-30", title: "Presented at ThinkEquity conference in NYC", summary: "Investor outreach", url: "https://ir.fgnx.com/news" },
    { date: "2025-10-02", title: "Tokenized Nasdaq shares on Ethereum via Securitize", summary: "First to tokenize on ETH", url: "https://ir.fgnx.com/news" },
    { date: "2025-08-11", title: "47,331 ETH purchase announced", summary: "Initial treasury build", url: "https://ir.fgnx.com/news" },
    { date: "2025-08-11", title: "Ticker changed to FGNX", summary: "Rebranding complete", url: "https://ir.fgnx.com/news" },
    { date: "2025-08-05", title: "$200M private placement closed", summary: "Treasury funding", url: "https://ir.fgnx.com/news" },
    { date: "2025-07-30", title: "Announced ETH strategy on Ethereum's 10th birthday", summary: "Strategy launch", url: "https://ir.fgnx.com/news" },
  ],
  strategySummary: "Goal: Become largest corporate ETH holder; achieve 10% stake in Ethereum network. Filed $5 billion shelf registration. Tokenization pioneer: First to tokenize Nasdaq-listed shares on Ethereum. Strategy includes staking, restaking, tokenized RWAs, and stablecoin yield. Formerly Fundamental Global.",
  recentDevelopments: [
    "~36K ETH (after November sales) - initially acquired 47,331 ETH",
    "Stock down >95% from 2025 peak",
    "Had to sell ETH to fund buyback, signaling liquidity pressure",
  ],
  keyBackers: ["Kyle Cerminara (CEO)", "Maja Vujinovic (CEO of Digital Assets)", "Joe Moglia (ex-TD Ameritrade)", "Galaxy Digital", "Kraken", "Hivemind Capital", "Syncracy Capital", "DCG", "Kenetic"],
  outlook2026: "Stabilize stock price. Resume accumulation. Tokenization expansion.",
};

// =============================================================================
// SOL TREASURY COMPANIES
// =============================================================================

const FWDI_INTEL: CompanyIntel = {
  ticker: "FWDI",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-12-18", title: "Tokenized FWDI shares launched on Solana via Superstate", summary: "First public equity usable as DeFi collateral", url: "https://ir.forward.one/news-events" },
    { date: "2025-12-02", title: "Shareholder update - 6.9M SOL treasury", summary: "Holdings milestone", url: "https://ir.forward.one/news-events" },
    { date: "2025-12-02", title: "fwdSOL liquid staking token launch with Sanctum", summary: "~1.73M fwdSOL representing 25% of holdings", url: "https://ir.forward.one/news-events" },
    { date: "2025-11-17", title: "Holdings rise to 6.9M SOL", summary: "Continued accumulation", url: "https://ir.forward.one/news-events" },
    { date: "2025-11-14", title: "Ticker change from FORD to FWDI", summary: "Corporate rebranding", url: "https://ir.forward.one/news-events" },
    { date: "2025-09-11", title: "$1.65B PIPE deal closed", summary: "Largest SOL-focused treasury raise ever", url: "https://ir.forward.one/news-events" },
    { date: "2025-09-07", title: "Initial $1.65B announcement", summary: "Galaxy, Jump, Multicoin led", url: "https://ir.forward.one/news-events" },
  ],
  strategySummary: "World's largest publicly traded SOL holder. Key Products: fwdSOL (Liquid staking token via Sanctum partnership), PropAMM (Proprietary AMM backed by Galaxy with Jump Crypto infrastructure), Tokenized Shares (First public company equity usable as DeFi collateral via Superstate/Kamino). Staking Performance: 6.82%-7.01% gross APY, outperforming peer validators. Nearly all SOL holdings are staked.",
  recentDevelopments: [
    "6,921,342 SOL holdings (~$1.59B cost basis at $232.08/SOL average)",
    "Net Asset Value: ~$832 million (more than next 3 largest SOL DATs combined)",
    "First public company to have tokenized equity usable as DeFi collateral on Solana",
    "Completed the largest Solana-focused treasury raise to date ($1.65B)",
  ],
  keyBackers: ["Galaxy Digital", "Jump Crypto", "Multicoin Capital"],
  outlook2026: "PropAMM launch. Expand DeFi integrations. Target >7M SOL.",
};

const HSDT_INTEL: CompanyIntel = {
  ticker: "HSDT",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-11-12", title: "Tokenizing shares through Superstate", summary: "Following FWDI precedent", url: "https://ir.solanacompany.com/news" },
    { date: "2025-11-05", title: "Investor Update released", summary: "Treasury strategy progress", url: "https://ir.solanacompany.com/news" },
    { date: "2025-10-23", title: "Staking agreements with Helius and Twinstake", summary: "Yield optimization", url: "https://ir.solanacompany.com/news" },
    { date: "2025-10-20", title: "PIPE share unlock amid stock decline", summary: "Stock fell 60-70% from peak", url: "https://ir.solanacompany.com/news" },
    { date: "2025-09-29", title: "Corporate name change to 'Solana Company'", summary: "Formerly Helius Medical", url: "https://ir.solanacompany.com/news" },
    { date: "2025-09-18", title: "$508M PIPE closed", summary: "Major funding round", url: "https://ir.solanacompany.com/news" },
    { date: "2025-09-15", title: "Initial $500M+ funding announcement", summary: "Pantera/Summer led", url: "https://ir.solanacompany.com/news" },
  ],
  strategySummary: "PIPE Potential: Up to $1.25B in gross proceeds. Staking Yield: ~7% (outperforming top-ten validator average of 6.7%). Letter of Intent with Solana Foundation including: conducting all on-chain activity solely on Solana, institutional partnership referrals, option to purchase SOL from Foundation at a discount. Approved $100M stock repurchase program.",
  recentDevelopments: [
    "~2,300,000 SOL holdings (~$327M value)",
    "Q3 2025: $697K revenue (including $342K staking rewards), net loss of $352.8M",
    "Stock experienced significant volatility - surged above $25 post-PIPE, then fell 60-70%",
  ],
  keyBackers: ["Joseph Chee (Executive Chairman, ex-UBS)", "Pantera Capital", "Summer Capital", "HashKey Capital", "Animoca Brands", "Dan Morehead (Strategic Advisor)", "Cosmo Jiang (Board Observer)"],
  outlook2026: "Solana Foundation partnership execution. Stabilize stock price.",
};

const DFDV_INTEL: CompanyIntel = {
  ticker: "DFDV",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2026-01-07", title: "2025 Year in Review - 853% return, top Nasdaq performer", summary: "Third-best stock on Nasdaq in 2025", url: "https://ir.dfdv.one/news-events" },
    { date: "2025-11-26", title: "Executive open-market stock purchases", summary: "Insider confidence", url: "https://ir.dfdv.one/news-events" },
    { date: "2025-09-04", title: "Surpassed 2M SOL holdings", summary: "Major milestone", url: "https://ir.dfdv.one/news-events" },
    { date: "2025-07-24", title: "Mayan partnership for cross-chain DFDVx", summary: "Cross-chain equity trading", url: "https://ir.dfdv.one/news-events" },
    { date: "2025-06-23", title: "First US-listed crypto treasury to tokenize stock on Solana", summary: "Via Kraken partnership", url: "https://ir.dfdv.one/news-events" },
    { date: "2025-06-06", title: "dfdvSOL listed on Drift Protocol", summary: "LST trading enabled", url: "https://ir.dfdv.one/news-events" },
    { date: "2025-05-06", title: "$11.2M SOL purchase, surpassed 400K tokens", summary: "Accelerated accumulation", url: "https://ir.dfdv.one/news-events" },
  ],
  strategySummary: "First US public SOL treasury (launched April 2025). Key Metric: SOL Per Share (SPS) - currently 0.0743 (as of Jan 1, 2026), targeting 1.0 SPS by December 2028. Key Products: dfdvSOL (Liquid staking token built with Sanctum, listed on Drift Protocol), DFDVx (Tokenized equity on Solana via Kraken, tradeable cross-chain via Mayan). Validator Business: Own validator infrastructure + community validators with BONK and WIF.",
  recentDevelopments: [
    "2,221,329 SOL holdings (~$300M)",
    "Capital Raised: ~$378 million in 9 months",
    "Top-performing crypto stock of 2025 with +853% return",
    "First Digital Asset Treasury to introduce both LST (dfdvSOL) and tokenized equity (DFDVx)",
    "Rang Nasdaq Closing Bell with Solana Foundation",
  ],
  keyBackers: ["Blake E. Janover (CCO & Director)"],
  outlook2026: "Target 1.0 SPS by December 2028. Validator expansion.",
};

const UPXI_INTEL: CompanyIntel = {
  ticker: "UPXI",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2026-01-07", title: "High-yield treasury strategy for 2026", summary: "Risk-adjusted optimization", url: "https://ir.upexi.com/news" },
    { date: "2025-12-23", title: "Filed for up to $1B capital raise", summary: "Shelf registration", url: "https://ir.upexi.com/news" },
    { date: "2025-09-30", title: "SOL Big Brain joins advisory committee", summary: "Solana ecosystem leader", url: "https://ir.upexi.com/news" },
    { date: "2025-09-11", title: "129% increase in adjusted SOL per share", summary: "Since treasury launch", url: "https://ir.upexi.com/news" },
    { date: "2025-08-12", title: "Arthur Hayes joins advisory committee", summary: "BitMEX co-founder", url: "https://ir.upexi.com/news" },
  ],
  strategySummary: "SOL treasury + consumer brands hybrid model. Staking Yield: ~8% (~$105,000/day in staking revenue). SOL Breakdown: ~53% in locked SOL (purchased at mid-teens discount). Adjusted SOL Per Share: 0.0197 (~$4.37), up 129% since treasury launch. Consumer Brands: Cure Mushrooms (medicinal products), Lucky Tail (pet care). $500M equity line of credit with Alliance Global Partners.",
  recentDevelopments: [
    "2,174,583 SOL holdings (as of Jan 5, 2026)",
    "$1B shelf registration filed December 2025",
    "Stock down ~52% from 52-week highs (was above $22 in April, now ~$2.13)",
    "CEO Allan Marshall purchased 200,000 shares in December 2025",
  ],
  keyBackers: ["Arthur Hayes (BitMEX co-founder, CIO of Maelstrom)", "SOL Big Brain"],
  outlook2026: "Implement risk-adjusted high-yield strategy. Consumer brands profitability.",
};

const STKE_INTEL: CompanyIntel = {
  ticker: "STKE",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2026-01-08", title: "December 2025 Monthly Business Update", summary: "Validator and treasury metrics", url: "https://www.stakedsol.com/news" },
    { date: "2026-01-02", title: "$50M ATM program with Cantor Fitzgerald", summary: "New funding capacity", url: "https://www.stakedsol.com/news" },
    { date: "2025-12-31", title: "Credit facility restructuring with Tony Guoga", summary: "Balance sheet optimization", url: "https://www.stakedsol.com/news" },
    { date: "2025-11-17", title: "Selected as staking provider for VanEck Solana ETF", summary: "Major institutional mandate", url: "https://www.stakedsol.com/news" },
  ],
  strategySummary: "Validator-first business model (DAT++ model). First publicly traded company to combine SOL treasury + validator operations. ISO 27001 and SOC 2 certified. 99.999% uptime. December revenue: ~925 SOL. Peak APY: 6.63% (vs network average 6.28%). Lane Validator: 22 months uninterrupted uptime (since Feb 2024). VanEck Solana ETF staking provider via Orangefin validator.",
  recentDevelopments: [
    "523,134 SOL treasury (~CAD 101.5M)",
    "3,354,203 SOL Assets Under Delegation (~CAD 610M)",
    "26,908 unique wallets served",
    "6 institutional-grade validators (4 proprietary, 2 white-label)",
    "FY2025 validator revenue: $5.4M",
    "SOL Treasury grew from $21M to $126M (YoY through Sep 30, 2025)",
    "Shareholder meeting Mar 31, 2026 for board reconstitution vote",
    "Stock down 95% from 52W high ($30.80 → $1.57)",
    "Corrective disclosure Nov 2025 (accounting reclassification, not fraud)",
    "Equity investments: NGRAVE NV (hardware wallet), Chia Network, Animoca Brands",
  ],
  keyBackers: ["Tony Guoga (19.7% shareholder, activist)", "Max Kaplan (activist shareholder)", "VanEck (staking mandate)"],
  outlook2026: "Board governance resolution. Validator scale. Secure new institutional mandates from ETF issuers.",
};

// =============================================================================
// HYPE TREASURY COMPANIES
// =============================================================================

const PURR_INTEL: CompanyIntel = {
  ticker: "PURR",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-12-08", title: "Announced $30 million stock repurchase program", summary: "Buyback authorization", url: "https://purrdigitalassets.com/press" },
    { date: "2025-12-03", title: "Began trading on Nasdaq as PURR", summary: "Post-merger debut", url: "https://purrdigitalassets.com/press" },
    { date: "2025-12-02", title: "Closed business combination with Sonnet BioTherapeutics", summary: "SPAC merger complete", url: "https://purrdigitalassets.com/press" },
    { date: "2025-10-01", title: "Filed S-1 for $1 billion shelf registration", summary: "Capital raising capacity", url: "https://purrdigitalassets.com/press" },
  ],
  strategySummary: "HYPE digital asset treasury reserve company, maximizing shareholder value through accumulating HYPE tokens, staking, yield optimization, and active ecosystem engagement. Plans to stake 'substantially all of its HYPE holdings' or deploy in DeFi activities. Scheduled 1.2M HYPE unlock for core contributors on January 6, 2026, with monthly unlocks continuing.",
  recentDevelopments: [
    "~12.6M HYPE holdings",
    "Bob Diamond (former Barclays CEO) serves as Chairman",
    "Strategic backers: D1 Capital, Galaxy Digital, Pantera Capital, Republic Digital, 683 Capital, Atlas Merchant Capital, Paradigm Operations",
  ],
  keyBackers: ["Bob Diamond (Chairman, ex-Barclays CEO)", "David Schamis (CEO)", "D1 Capital", "Galaxy Digital", "Pantera Capital", "Republic Digital", "683 Capital", "Atlas Merchant Capital", "Paradigm"],
  outlook2026: "Staking deployment. Hyperliquid ecosystem engagement. Token unlock management.",
};

const HYPD_INTEL: CompanyIntel = {
  ticker: "HYPD",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-11-01", title: "Q3 2025 results with record net income of $6.6 million", summary: "Profitability milestone", url: "https://hyperiondefi.com/news" },
    { date: "2025-09-25", title: "Acquired additional 176,422 HYPE tokens", summary: "+$10M to treasury", url: "https://hyperiondefi.com/news" },
    { date: "2025-07-14", title: "Added $5 million in HYPE to treasury holdings", summary: "Continued accumulation", url: "https://hyperiondefi.com/news" },
    { date: "2025-07-03", title: "Eyenovia rebranded to Hyperion DeFi, ticker changed to HYPD", summary: "Corporate pivot complete", url: "https://hyperiondefi.com/news" },
  ],
  strategySummary: "First U.S. publicly listed company building a long-term strategic HYPE treasury. Total holdings: 1,712,195 HYPE at average price of $38.25/token. Launched co-branded validator with Kinetiq for yield generation. Q4 2025 revenues projected $475,000-$515,000 (31-43% QoQ growth).",
  recentDevelopments: [
    "1,712,195 HYPE holdings (~$77.8M market value as of Sep 30, 2025)",
    "Expects operating cash flow to turn positive in 2026",
    "Kinetiq validator partnership for yield",
  ],
  keyBackers: ["Kinetiq (validator partner)"],
  outlook2026: "Positive operating cash flow. Validator yield optimization.",
};

// =============================================================================
// BNB TREASURY COMPANIES
// =============================================================================

const BNC_INTEL: CompanyIntel = {
  ticker: "BNC",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-08-10", title: "Purchased 200,000 BNB, becoming largest corporate BNB holder globally", summary: "$160M purchase", url: "https://ir.ceaindustries.com/news" },
    { date: "2025-07-01", title: "Closed $500 million PIPE led by YZi Labs and 10X Capital", summary: "Major funding round", url: "https://ir.ceaindustries.com/news" },
    { date: "2026-01-01", title: "YZi Labs launched activist campaign/boardroom coup", summary: "Governance conflict ongoing", url: "https://ir.ceaindustries.com/news" },
  ],
  strategySummary: "Adopted BNB as primary treasury reserve asset. Target 1% of BNB supply. Stock surged 600%+ in July 2025 but has since declined over 92%. Major conflict between YZi Labs (CZ's family office) and current management over treasury strategy execution and governance.",
  recentDevelopments: [
    "~515,000 BNB holdings (~$412M at $851/unit average cost)",
    "YZi Labs challenging company's poison pill defense and board changes",
    "David Namdar (Galaxy Digital co-founder) as CEO; Russell Read (former CalPERS CIO) as CIO",
    "Stock down >92% from peak",
  ],
  keyBackers: ["YZi Labs (CZ family office)", "10X Capital", "David Namdar (CEO, Galaxy co-founder)", "Russell Read (CIO, ex-CalPERS)"],
  outlook2026: "Resolve governance conflict with YZi Labs. Stabilize treasury operations.",
};

const NA_INTEL: CompanyIntel = {
  ticker: "NA",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-11-26", title: "Launched 'NBNB Program' for RWA infrastructure", summary: "New initiative", url: "https://www.nano-labs.com/news" },
    { date: "2025-07-30", title: "Invested in CEA Industries (BNC)", summary: "Strategic BNB ecosystem investment", url: "https://www.nano-labs.com/news" },
    { date: "2025-07-22", title: "Expanded holdings to 120,000 BNB (~$90 million)", summary: "Continued accumulation", url: "https://www.nano-labs.com/news" },
    { date: "2025-07-04", title: "Bought $50 million BNB (74,315 BNB at $672.45 avg)", summary: "Initial purchase", url: "https://www.nano-labs.com/news" },
    { date: "2025-06-26", title: "Priced $50 million registered direct offering", summary: "Treasury funding", url: "https://www.nano-labs.com/news" },
    { date: "2025-06-24", title: "Announced $500 million convertible notes private placement", summary: "Major financing", url: "https://www.nano-labs.com/news" },
  ],
  strategySummary: "Hong Kong-based Web3 infrastructure company targeting $1 billion BNB treasury allocation and up to 10% of BNB total supply. Total digital asset reserves (including BTC and BNB) reached approximately $160 million. NBNB Program for RWA infrastructure development.",
  recentDevelopments: [
    "120,000 BNB holdings (~$90M)",
    "Target: $1B BNB treasury, 10% of supply",
    "Invested in BNC (CEA Industries)",
  ],
  keyBackers: [],
  outlook2026: "NBNB Program development. Target $1B BNB allocation.",
};

// =============================================================================
// TAO TREASURY COMPANIES
// =============================================================================

const TAOX_INTEL: CompanyIntel = {
  ticker: "TAOX",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-10-01", title: "Secured $11 million private financing from DCG, James Altucher", summary: "Key investor backing", url: "https://www.taoxholdings.com/news" },
    { date: "2025-08-26", title: "Joseph Jacks (OSS Capital founder) joined as advisor", summary: "Bittensor leader added", url: "https://www.taoxholdings.com/news" },
    { date: "2025-08-05", title: "Accumulated 42,111 TAO tokens", summary: "Treasury growth", url: "https://www.taoxholdings.com/news" },
    { date: "2025-07-19", title: "Became largest publicly traded TAO holder with $10M purchase", summary: "29,899 TAO at $334 avg", url: "https://www.taoxholdings.com/news" },
    { date: "2025-06-01", title: "Pivoted to TAO treasury strategy", summary: "Formerly Synaptogenix", url: "https://www.taoxholdings.com/news" },
  ],
  strategySummary: "First pure-play decentralized AI treasury company exclusively allocated to Bittensor (TAO). Generates revenue through staking while supporting the Bittensor ecosystem. James Altucher leads digital asset strategy as advisor. Holdings exceeded 54,000 TAO after October financing.",
  recentDevelopments: [
    "54,058 TAO holdings",
    "Largest publicly traded TAO holder (as of July 2025, before xTAO surpassed)",
    "Staking to root network earning ~10% annual yield",
  ],
  keyBackers: ["James Altucher (Advisor)", "DCG", "Joseph Jacks (OSS Capital)"],
  outlook2026: "Expand TAO staking. Bittensor ecosystem development.",
};

const XTAIF_INTEL: CompanyIntel = {
  ticker: "XTAIF",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-11-25", title: "Holdings reached 59,962 TAO - world's largest publicly traded holder", summary: "Surpassed TAOX", url: "https://www.xtao.ai/news" },
    { date: "2025-11-01", title: "$7.3 million investment from Off the Chain Capital", summary: "Institutional backing", url: "https://www.xtao.ai/news" },
    { date: "2025-09-01", title: "Partnered with BitGo for institutional custody", summary: "Security upgrade", url: "https://www.xtao.ai/news" },
    { date: "2025-07-30", title: "Disclosed 41,538 TAO holdings", summary: "Initial disclosure", url: "https://www.xtao.ai/news" },
    { date: "2025-07-22", title: "Listed on TSX Venture Exchange", summary: "Public market debut", url: "https://www.xtao.ai/news" },
  ],
  strategySummary: "Building Bittensor ecosystem infrastructure and making strategic investments. Staking TAO holdings to root network earning ~10% annual yield. BitGo institutional custody partnership. TSX Venture Exchange listed.",
  recentDevelopments: [
    "59,962 TAO holdings - world's largest publicly traded holder",
    "Initial funding: $22.8 million from Digital Currency Group, Animoca Brands, Arca, Borderless Capital, FalconX",
    "$7.3M from Off the Chain Capital (November 2025)",
  ],
  keyBackers: ["Karia Samaroo", "Digital Currency Group", "Animoca Brands", "Arca", "Borderless Capital", "FalconX", "Off the Chain Capital"],
  outlook2026: "Maintain largest public TAO holder status. Ecosystem infrastructure development.",
};

const TWAV_INTEL: CompanyIntel = {
  ticker: "TWAV",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-12-10", title: "Ticker changed from OBLG to TWAV", summary: "Trading under new symbol", url: "https://www.taoweave.com/news" },
    { date: "2025-12-08", title: "Corporate name changed to TaoWeave, Inc.", summary: "Rebranding complete", url: "https://www.taoweave.com/news" },
    { date: "2025-11-12", title: "Holdings of 21,943 TAO tokens", summary: "Treasury update", url: "https://www.taoweave.com/news" },
    { date: "2025-08-14", title: "Q2 2025 results; $8M TAO treasury with 21,613 tokens staked", summary: "All tokens staked", url: "https://www.taoweave.com/news" },
    { date: "2025-06-01", title: "Adopted TAO-exclusive treasury policy", summary: "Strategic pivot", url: "https://www.taoweave.com/news" },
  ],
  strategySummary: "First publicly traded company with TAO-exclusive treasury strategy. All tokens staked on Bittensor network using BitGo institutional custody. Debt-free with $3.7M cash + $6.6M in TAO (total $10.3M liquid assets as of Q3 2025). Formerly Oblong Inc.",
  recentDevelopments: [
    "21,943 TAO holdings (~$8M)",
    "All tokens staked on Bittensor network",
    "BitGo institutional custody",
    "Debt-free balance sheet",
  ],
  keyBackers: ["BitGo (custody)"],
  outlook2026: "Continue TAO-exclusive strategy. Maximize staking yield.",
};

// =============================================================================
// OTHER ASSET TREASURY COMPANIES
// =============================================================================

const CWD_INTEL: CompanyIntel = {
  ticker: "CWD",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-12-11", title: "Staked 75,000 LINK with Chainlink node operator", summary: "Yield generation started", url: "https://ir.caliberco.com/news" },
    { date: "2025-11-17", title: "Regained Nasdaq compliance", summary: "Stock price recovery", url: "https://ir.caliberco.com/news" },
    { date: "2025-10-16", title: "Additional $2M purchase; total 562,535 tokens (~$10.2M)", summary: "Continued accumulation", url: "https://ir.caliberco.com/news" },
    { date: "2025-09-25", title: "$4M additional purchase (183,421 tokens)", summary: "DCA strategy", url: "https://ir.caliberco.com/news" },
    { date: "2025-09-18", title: "Purchased $6.5M LINK (278,011 tokens at $23.38)", summary: "Major buy", url: "https://ir.caliberco.com/news" },
    { date: "2025-09-09", title: "Completed initial LINK purchase", summary: "Treasury launched", url: "https://ir.caliberco.com/news" },
    { date: "2025-08-28", title: "Established LINK token treasury strategy", summary: "Strategy announced", url: "https://ir.caliberco.com/news" },
  ],
  strategySummary: "First Nasdaq-listed company with treasury policy centered on Chainlink (LINK). Real estate asset manager pivoting to LINK. 75,000 LINK staked with Chainlink node operator. DCA accumulation strategy.",
  recentDevelopments: [
    "562,535 LINK holdings (~$10.2M)",
    "75,000 LINK staked (December 2025)",
    "Chainlink partnered with US Department of Commerce",
    "Bitwise and Grayscale filed for spot Chainlink ETFs",
  ],
  keyBackers: ["Chris Loeffler (CEO)"],
  outlook2026: "Expand LINK staking. Benefit from potential LINK ETF approvals.",
};

const TRON_INTEL: CompanyIntel = {
  ticker: "TRON",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-12-29", title: "Secured $18M strategic investment from Justin Sun via Black Anthem", summary: "Founder backing", url: "https://www.trontech.io/news" },
    { date: "2025-09-02", title: "$110M TRX-focused investment", summary: "Treasury expansion", url: "https://www.trontech.io/news" },
    { date: "2025-07-17", title: "Rebranded from SRM Entertainment; filed $1 billion shelf statement", summary: "Justin Sun rang Nasdaq bell", url: "https://www.trontech.io/news" },
  ],
  strategySummary: "Largest public holder of TRX with over 677 million tokens (0.716% of total supply). Company pivoted from toy manufacturing to TRON blockchain treasury play with Justin Sun as advisor. Q2-Q3 2025 moved to net income; shareholders' equity exceeded $239M. JustLend staking for yield.",
  recentDevelopments: [
    "677,596,945 TRX holdings (~$193M)",
    "0.716% of total TRX supply",
    "$18M investment from Justin Sun (December 2025)",
    "First US public company to hold its blockchain's native token",
  ],
  keyBackers: ["Justin Sun (Advisor)", "Richard Miller (CEO)"],
  outlook2026: "Expand TRX staking via JustLend. Scale treasury operations.",
};

const XRPN_INTEL: CompanyIntel = {
  ticker: "XRPN",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-10-20", title: "Announced public launch and SPAC merger with Armada Acquisition Corp II", summary: "Expected to trade as XRPN on Nasdaq", url: "https://www.xrpholdings.com/news" },
    { date: "2025-10-01", title: "Accumulated 388+ million XRP tokens ($1B+)", summary: "Massive treasury", url: "https://www.xrpholdings.com/news" },
  ],
  strategySummary: "Building world's largest institutional XRP treasury with yield-generation strategies and DeFi deployment. Expected to close Q1 2026. Asheesh Birla (former Ripple senior executive) as CEO; David Schwartz (Ripple CTO) as strategic advisor. $200M from SBI Holdings; additional from Ripple, Rippleworks, Pantera Capital, Kraken, GSR. Chris Larsen invested 50M XRP.",
  recentDevelopments: [
    "388M+ XRP holdings ($1B+)",
    "0.47% of XRP supply",
    "SPAC merger with Armada Acquisition Corp II pending",
    "Q1 2026 close expected",
  ],
  keyBackers: ["Asheesh Birla (CEO, ex-Ripple)", "David Schwartz (Strategic Advisor, Ripple CTO)", "Chris Larsen (50M XRP)", "SBI Holdings", "Ripple", "Pantera Capital", "Kraken", "GSR"],
  outlook2026: "Complete SPAC merger. Begin trading on Nasdaq as XRPN.",
};

const CYPH_INTEL: CompanyIntel = {
  ticker: "CYPH",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-12-31", title: "Holdings reached 290,062 ZEC (1.76% of supply)", summary: "After $28M purchase", url: "https://www.cypherstrategy.com/news" },
    { date: "2025-12-09", title: "Zooko Wilcox (Zcash creator) joined as Strategic Advisor", summary: "Key hire", url: "https://www.cypherstrategy.com/news" },
    { date: "2025-12-01", title: "Purchased additional $18M ZEC", summary: "Accelerated accumulation", url: "https://www.cypherstrategy.com/news" },
    { date: "2025-11-12", title: "Began trading as CYPH after rebranding from Leap Therapeutics", summary: "Ticker change", url: "https://www.cypherstrategy.com/news" },
    { date: "2025-10-01", title: "Closed $58.88M private placement led by Winklevoss Capital", summary: "Seed funding", url: "https://www.cypherstrategy.com/news" },
  ],
  strategySummary: "Targeting 5% of Zcash total supply (~540K ZEC). Winklevoss describes ZEC as 'encrypted bitcoin' and 'digital cash.' Will McEvoy (Winklevoss Capital principal) as CIO and Board member. Formerly Leap Therapeutics.",
  recentDevelopments: [
    "290,062 ZEC holdings (~$152M)",
    "1.76% of circulating ZEC supply",
    "Zooko Wilcox (Zcash creator) as Strategic Advisor",
    "Target: 5% of ZEC supply",
  ],
  keyBackers: ["Winklevoss Capital", "Cameron Winklevoss", "Tyler Winklevoss", "Zooko Wilcox (Strategic Advisor)", "Will McEvoy (CIO)"],
  outlook2026: "Target 5% ZEC supply. Leverage Winklevoss/Zooko backing.",
};

const LITS_INTEL: CompanyIntel = {
  ticker: "LITS",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-11-17", title: "Q1 FY2026 results; highlighted successful treasury strategy launch", summary: "First quarterly report", url: "https://www.litestrategy.com/news" },
    { date: "2025-10-13", title: "Celebrated Litecoin's 14th anniversary", summary: "Community engagement", url: "https://www.litestrategy.com/news" },
    { date: "2025-09-11", title: "Rebranded to Lite Strategy, ticker LITS", summary: "Formerly MEI Pharma", url: "https://www.litestrategy.com/news" },
    { date: "2025-08-05", title: "Acquired 929,548 LTC at $107.58 avg (~$100M)", summary: "First US public LTC treasury", url: "https://www.litestrategy.com/news" },
  ],
  strategySummary: "First U.S.-listed public company with Litecoin as primary reserve asset. Partnership with GSR for treasury management. Charlie Lee (Litecoin creator) on Board. Joshua Riezman (GSR US Chief Strategy Officer) on board.",
  recentDevelopments: [
    "929,548 LTC holdings (~$100M at $107.58 average)",
    "Charlie Lee (Litecoin creator) on Board",
    "GSR as treasury manager",
    "Justin File as CEO",
  ],
  keyBackers: ["Charlie Lee (Board, Litecoin creator)", "GSR", "Justin File (CEO)", "Joshua Riezman (Board, GSR)"],
  outlook2026: "Expand LTC holdings. Leverage GSR treasury management.",
};

const LUXFF_INTEL: CompanyIntel = {
  ticker: "LUXFF",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2026-01-08", title: "Update on private placement; first tranche closed December 9", summary: "$786,080 raised", url: "https://www.litecointreasury.com/news" },
    { date: "2025-10-01", title: "Appointed Ieva Guoga to board and Dustin Zinger as Strategic Advisor", summary: "Team expansion", url: "https://www.litecointreasury.com/news" },
    { date: "2025-08-28", title: "Filed CAD$100M shelf prospectus", summary: "Capital raising capacity", url: "https://www.litecointreasury.com/news" },
    { date: "2025-06-01", title: "Charlie Lee and David Schwartz joined Advisory Board", summary: "Key advisors added", url: "https://www.litecointreasury.com/news" },
  ],
  strategySummary: "Targeting 1 million LTC by end of 2026. Deploying cbLTC into DeFi protocols for yield. Advancing Litecoin infrastructure including ZK-rollups and Layer 2 innovations. Canadian company.",
  recentDevelopments: [
    "20,084 LTC holdings",
    "Target: 1 million LTC by 2026",
    "CAD$100M shelf prospectus filed",
    "Q2 2025 net loss of $197,000; $112,000 cash on hand",
  ],
  keyBackers: ["Charlie Lee (Advisory Board)", "David Schwartz (Advisory Board)", "Tomek Antoniak (CEO)"],
  outlook2026: "Scale toward 1M LTC target. DeFi yield via cbLTC.",
};

const SUIG_INTEL: CompanyIntel = {
  ticker: "SUIG",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-11-01", title: "Total holdings ~102 million tokens (~$403M)", summary: "Treasury update", url: "https://www.suig.io" },
    { date: "2025-09-30", title: "Holdings exceeded 105 million SUI tokens", summary: "Major milestone", url: "https://www.sec.gov/Archives/edgar/data/1425355/000165495425012949/mcvt_10q.htm" },
    { date: "2025-08-26", title: "Rebranded to SUI Group Holdings, ticker changed to SUIG", summary: "Formerly Mill City Ventures", url: "https://www.sec.gov/Archives/edgar/data/1425355/000121390025080829/ea0254593-8k_suigroup.htm" },
    { date: "2025-08-01", title: "Closed $450M PIPE; pivoted to SUI treasury strategy", summary: "Strategic transformation", url: "https://www.sec.gov/Archives/edgar/data/1425355/000165495425008758/mcvt_8k.htm" },
  ],
  strategySummary: "Only publicly traded company with official Sui Foundation partnership. Staking all SUI earning ~$26,000/day. Galaxy Asset Management serves as Asset Manager. Big Brain Holdings, Pantera Capital, Electric Capital, GSR, ParaFi, Borderless, FalconX as investors.",
  recentDevelopments: [
    "108,098,436 SUI holdings (~$403M)",
    "~2.9% of SUI supply",
    "Only company with Sui Foundation relationship",
    "Q4 2025 earnings expected mid-March 2026",
    "Sui Foundation Developer Summit February 10-12, 2026",
  ],
  keyBackers: ["Douglas Polinsky (CEO)", "Sui Foundation", "Galaxy Asset Management", "Big Brain Holdings", "Pantera Capital", "Electric Capital", "GSR", "ParaFi", "Borderless", "FalconX"],
  outlook2026: "Sui Foundation Developer Summit. Expand Sui ecosystem presence.",
};

const ZONE_INTEL: CompanyIntel = {
  ticker: "ZONE",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-11-13", title: "Q1 FY2026 results; 733.1M DOGE holdings", summary: "Treasury update", url: "https://www.cleancore.co/news" },
    { date: "2025-10-07", title: "710M DOGE with $20M unrealized gains", summary: "Profit milestone", url: "https://www.cleancore.co/news" },
    { date: "2025-09-16", title: "Holdings exceeded 600M DOGE", summary: "Rapid accumulation", url: "https://www.cleancore.co/news" },
    { date: "2025-09-08", title: "Acquired 285M DOGE; targeting 1 billion in 30 days", summary: "Aggressive strategy", url: "https://www.cleancore.co/news" },
    { date: "2025-09-02", title: "Announced $175M private placement for Official Dogecoin Treasury", summary: "Dogecoin Foundation partnership", url: "https://www.cleancore.co/news" },
  ],
  strategySummary: "Official Dogecoin Treasury sponsored by Dogecoin Foundation. Long-term goal: 5% of DOGE circulating supply. Partnership with Bitstamp USA/Robinhood for trading. NYSE American listed.",
  recentDevelopments: [
    "733M DOGE holdings (Q1 FY2026)",
    "$20M+ unrealized gains",
    "Official Dogecoin Treasury status",
    "House of Doge partnership",
  ],
  keyBackers: ["Clayton Adams (CEO)", "Dogecoin Foundation", "House of Doge"],
  outlook2026: "Target 1B DOGE. 5% of circulating supply goal.",
};

const TBH_INTEL: CompanyIntel = {
  ticker: "TBH",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-12-18", title: "2025 shareholder letter; 730M DOGE treasury", summary: "Year-end update", url: "https://ir.houseofdoge.com/news" },
    { date: "2025-12-04", title: "Valuation report of ~$1.09 billion disclosed", summary: "Pre-merger valuation", url: "https://ir.houseofdoge.com/news" },
    { date: "2025-10-13", title: "House of Doge to list on Nasdaq through merger with Brag House", summary: "SPAC merger announced", url: "https://ir.houseofdoge.com/news" },
    { date: "2025-08-29", title: "Alex Spiro (Elon Musk's lawyer) announced as planned chairman", summary: "High-profile appointment", url: "https://ir.houseofdoge.com/news" },
  ],
  strategySummary: "House of Doge is the official corporate arm of Dogecoin Foundation. 10-year asset management agreement with CleanCore (ZONE) managing 730M+ DOGE. Upon merger completion, HOD shareholders will own ~92.8% of combined company. Q1 2026 plans: rewards debit card, embeddable Dogecoin wallet, merchant tools.",
  recentDevelopments: [
    "730M DOGE under management",
    "$1.09B valuation",
    "Alex Spiro as planned Chairman",
    "Nasdaq merger pending Q1 2026",
  ],
  keyBackers: ["Alex Spiro (Chairman, Elon Musk's lawyer)", "Marco Margiotta (CEO)", "Dogecoin Foundation"],
  outlook2026: "Complete Nasdaq merger. Launch payments ecosystem (debit card, wallet, merchant tools).",
};

const BTOG_INTEL: CompanyIntel = {
  ticker: "BTOG",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-09-30", title: "Partnered with BitGo for custody", summary: "Security upgrade", url: "https://www.bitogl.com/news" },
    { date: "2025-08-29", title: "Received 180-day Nasdaq compliance extension", summary: "Stock price challenge", url: "https://www.bitogl.com/news" },
    { date: "2025-08-11", title: "Holdings reached 70.5M DOGE at $0.2268 avg", summary: "Accumulation milestone", url: "https://www.bitogl.com/news" },
    { date: "2025-07-21", title: "Initial purchase of 40.5M DOGE at $0.2466", summary: "Treasury launch", url: "https://www.bitogl.com/news" },
    { date: "2025-07-17", title: "Secured $500M equity/debt facilities for DOGE treasury", summary: "Funding capacity", url: "https://www.bitogl.com/news" },
  ],
  strategySummary: "First publicly listed company on major US exchange with Dogecoin-focused treasury. Singapore-based company sees DOGE utility potential for micropayments reaching inflection point. BitGo custody partnership. $500M facilities available.",
  recentDevelopments: [
    "70.5M DOGE holdings at $0.2268 average",
    "BitGo institutional custody",
    "$500M equity/debt facilities secured",
    "Nasdaq compliance extension received",
  ],
  keyBackers: ["Jinghai Jiang (CEO)", "BitGo (custody)"],
  outlook2026: "Scale DOGE accumulation. Meet Nasdaq compliance requirements.",
};

const AVX_INTEL: CompanyIntel = {
  ticker: "AVX",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2026-01-06", title: "Launched institutional-grade Avalanche treasury dashboard", summary: "Transparency tool", url: "https://www.avaxone.com/news" },
    { date: "2025-11-20", title: "Authorized $40M stock buyback program", summary: "Shareholder return", url: "https://www.avaxone.com/news" },
    { date: "2025-11-23", title: "Treasury holdings reach over 13.8M AVAX", summary: "After $110M purchase", url: "https://www.avaxone.com/news" },
    { date: "2025-11-13", title: "Rebranded from AgriFORCE to AVAX One Technology; ticker AVX", summary: "Corporate pivot complete", url: "https://www.avaxone.com/news" },
  ],
  strategySummary: "First publicly traded Avalanche Treasury company. Building institutional gateway to onchain financial economy. Holdings: 13.8M+ AVAX with $35M+ cash available. Anthony Scaramucci heads advisory board. $40M stock buyback program authorized.",
  recentDevelopments: [
    "13,800,000 AVAX holdings (~$110M cost at $11.73 avg)",
    "Institutional-grade treasury dashboard launched",
    "$40M buyback authorized",
    "Anthony Scaramucci advisory board",
  ],
  keyBackers: ["Anthony Scaramucci (Advisory Board)"],
  outlook2026: "Scale AVAX treasury. Institutional product development.",
};

const IHLDF_INTEL: CompanyIntel = {
  ticker: "IHLDF",
  lastResearched: "2026-01-13",
  pressReleases: [
    { date: "2025-07-28", title: "Strategic update on HBAR treasury; management change", summary: "Melyssa Charlton appointed interim CEO", url: "https://www.immutableholdings.com/news" },
  ],
  strategySummary: "Digital asset treasury focused on long-term HBAR holding. Previously managed one of first institutional HBAR funds (IHO1) which completed in-kind distributions fall 2024. Jordan Fried (founding team member of Hedera) as Chairman. Views HBAR as high-quality asset with enterprise-grade performance, low transaction costs, carbon-negative operations, and growing adoption.",
  recentDevelopments: [
    "48+ million HBAR holdings via Immutable Asset Management LLC subsidiary",
    "Jordan Fried (Hedera founding team) as Chairman",
    "Melyssa Charlton as interim CEO (July 2025)",
    "Owns NFT.com, HBAR Labs, MyHBARWallet",
  ],
  keyBackers: ["Jordan Fried (Chairman, Hedera founding team)", "Melyssa Charlton (interim CEO)"],
  outlook2026: "Stabilize management. HBAR ecosystem development.",
};

// =============================================================================
// EXPORT MAP
// =============================================================================

export const COMPANY_INTEL: Record<string, CompanyIntel> = {
  // BTC
  MSTR: MSTR_INTEL,
  "3350.T": METAPLANET_INTEL,
  XXI: XXI_INTEL,
  CEPO: CEPO_INTEL,
  MARA: MARA_INTEL,
  CLSK: CLSK_INTEL,
  ASST: ASST_INTEL,
  SMLR: SMLR_INTEL,
  KULR: KULR_INTEL,
  ALCPB: ALTBG_INTEL,
  "H100.ST": H100ST_INTEL,
  NAKA: NAKA_INTEL,
  DJT: DJT_INTEL,
  "0434.HK": BOYAA_INTEL,
  // NXTT removed
  ABTC: ABTC_INTEL,
  // ETH
  BMNR: BMNR_INTEL,
  SBET: SBET_INTEL,
  ETHM: ETHM_INTEL,
  BTBT: BTBT_INTEL,
  BTCS: BTCS_INTEL,
  GAME: GAME_INTEL,
  FGNX: FGNX_INTEL,
  // SOL
  FWDI: FWDI_INTEL,
  HSDT: HSDT_INTEL,
  DFDV: DFDV_INTEL,
  UPXI: UPXI_INTEL,
  STKE: STKE_INTEL,
  // HYPE
  PURR: PURR_INTEL,
  HYPD: HYPD_INTEL,
  // BNB
  BNC: BNC_INTEL,
  NA: NA_INTEL,
  // TAO
  TAOX: TAOX_INTEL,
  XTAIF: XTAIF_INTEL,
  TWAV: TWAV_INTEL,
  // Other
  CWD: CWD_INTEL,
  TRON: TRON_INTEL,
  XRPN: XRPN_INTEL,
  CYPH: CYPH_INTEL,
  LITS: LITS_INTEL,
  LUXFF: LUXFF_INTEL,
  SUIG: SUIG_INTEL,
  ZONE: ZONE_INTEL,
  TBH: TBH_INTEL,
  BTOG: BTOG_INTEL,
  AVX: AVX_INTEL,
  IHLDF: IHLDF_INTEL,
};

// Helper function to get intel for a company
export function getCompanyIntel(ticker: string): CompanyIntel | null {
  const intel = COMPANY_INTEL[ticker.toUpperCase()] || COMPANY_INTEL[ticker] || null;

  if (!intel) return null;

  // For MSTR, dynamically generate recentDevelopments from capital events
  if (ticker.toUpperCase() === "MSTR") {
    return {
      ...intel,
      recentDevelopments: getMstrDevelopments(6), // 6 months of milestones
    };
  }

  return intel;
}
