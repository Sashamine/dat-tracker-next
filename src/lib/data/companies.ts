import { Company } from "../types";

// Last verified: 2026-01-20 - HUT standalone 10,278, ABTC 5,427

// ETH DAT Companies
export const ethCompanies: Company[] = [
  {
    id: "bmnr",
    name: "Bitmine Immersion",
    ticker: "BMNR",
    asset: "ETH",
    tier: 1,
    holdings: 4_144_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://ir.bitmineimmersion.com/press-releases",
    datStartDate: "2025-07-01",
    stakingPct: 0.85,
    stakingMethod: "MAVAN validators",
    quarterlyBurnUsd: 2_500_000,
    capitalRaisedAtm: 10_000_000_000,
    capitalRaisedPipe: 615_000_000,
    avgDailyVolume: 800_000_000,
    hasOptions: true,
    sharesForMnav: 455_000_000,  // 455M diluted shares (Q3 2025)
    cashReserves: 915_000_000,  // $915M cash (Jan 2026)
    otherInvestments: 25_000_000,  // $25M Eightco Holdings stake
    leader: "Tom Lee (Fundstrat)",
    strategy: "5% of ETH supply goal, staking, MAVAN validators Q1 2026",
    notes: "Largest ETH treasury. NAV ~$30/share. Trades at 0.8x book.",
  },
  {
    id: "sbet",
    name: "SharpLink Gaming",
    ticker: "SBET",
    asset: "ETH",
    tier: 1,
    holdings: 863_424,  // Updated Jan 2026
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1981535&type=8-K",
    datStartDate: "2025-05-01",
    website: "https://sharplink.com",
    twitter: "https://twitter.com/SharpLinkGaming",
    tokenizedAddress: "SBETxQGMcKL7oPBqJgUm7gXmMFqLz4PnPuRGqDfvpump",
    tokenizedChain: "Solana",
    stakingPct: 0.95,
    stakingMethod: "Linea/Lido",
    quarterlyBurnUsd: 2_850_000,
    capitalRaisedAtm: 2_000_000_000,
    avgDailyVolume: 300_000_000,
    hasOptions: true,
    marketCap: 2_050_000_000,  // ~$2.05B (Jan 2026)
    sharesForMnav: 196_690_000,  // 196.69M basic shares (matches SBET dashboard methodology)
    cashReserves: 11_100_000,  // $11.1M cash (Q3 2025)
    otherInvestments: 26_700_000,  // $26.7M USDC stablecoins (Q3 2025)
    leader: "Joseph Chalom (BlackRock)",
    strategy: "Staking, Linea partnership, tokenized equity via Superstate",
    notes: "#2 ETH treasury. $1.5B buyback program. Trades at ~0.83x mNAV.",
  },
  {
    id: "ethm",
    name: "The Ether Machine",
    ticker: "ETHM",
    asset: "ETH",
    tier: 1,
    holdings: 495_362,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=2080334&type=8-K",
    datStartDate: "2025-10-01",
    stakingPct: 1.0,
    stakingMethod: "Native staking",
    quarterlyBurnUsd: 800_000,
    avgDailyVolume: 100_000_000,
    hasOptions: true,
    marketCap: 230_000_000,  // ~$230M (Jan 2026)
    sharesForMnav: 60_000_000,  // From holdings-history.ts
    pendingMerger: true,     // SPAC merger not yet closed - no mNAV
    leader: "Andrew Keys",
    strategy: "DeFi/staking 'machine' to grow ETH",
    notes: "SPAC merger with Dynamix. 3rd largest ETH treasury.",
  },
  {
    id: "btbt",
    name: "Bit Digital",
    ticker: "BTBT",
    asset: "ETH",
    tier: 1,
    holdings: 154_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1710350&type=8-K",
    datStartDate: "2025-01-01",
    website: "https://bitdigital.com",
    twitter: "https://twitter.com/Aboringcompany",
    stakingPct: 0.86,
    stakingMethod: "Native staking",
    quarterlyBurnUsd: 8_500_000,
    capitalRaisedAtm: 172_000_000,
    avgDailyVolume: 80_000_000,
    hasOptions: true,
    marketCap: 760_000_000,  // ~$760M (Jan 2026)
    sharesForMnav: 335_000_000,  // From holdings-history.ts
    cashReserves: 179_100_000,  // $179.1M cash (Q3 2025)
    leader: "Sam Tabar",
    strategy: "86% staked, fully exited BTC. Avg cost $3,045/ETH.",
    notes: "Staking yield ~2.93% annualized. mNAV $3.84/share.",
  },
  {
    id: "btcs",
    name: "BTCS Inc.",
    ticker: "BTCS",
    asset: "ETH",
    tier: 2,
    holdings: 70_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1436229&type=8-K",
    datStartDate: "2024-01-01",
    stakingPct: 0.75,
    stakingMethod: "Builder+ validators",
    quarterlyBurnUsd: 1_800_000,
    capitalRaisedAtm: 60_000_000,
    avgDailyVolume: 15_000_000,
    hasOptions: true,
    marketCap: 136_000_000,  // ~$136M (Jan 2026)
    sharesForMnav: 49_000_000,  // From holdings-history.ts
    strategy: "ETH 'Bividend,' DeFi/TradFi flywheel, Builder+",
  },
  {
    id: "game",
    name: "GameSquare",
    ticker: "GAME",
    asset: "ETH",
    tier: 1,
    holdings: 15_600,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1714562&type=8-K",
    datStartDate: "2025-07-01",
    stakingPct: 0.90,
    stakingMethod: "Dialectic Medici platform",
    quarterlyBurnUsd: 5_000_000,
    capitalRaisedAtm: 30_000_000,
    sharesForMnav: 160_000_000,  // From holdings-history.ts
    avgDailyVolume: 10_000_000,
    leader: "Justin Kenna (CEO)",
    strategy: "$250M ETH treasury. 7.84% yield via Dialectic platform.",
    notes: "Targeting Q3 profitability. $5M stock buyback from yield.",
  },
  {
    id: "fgnx",
    name: "FG Nexus",
    ticker: "FGNX",
    asset: "ETH",
    tier: 1,
    holdings: 40_005,  // Updated Jan 2026 - sold 10,922 ETH in Nov 2025
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1591890&type=8-K",
    datStartDate: "2025-07-30",
    stakingPct: 0.80,
    stakingMethod: "Native staking",
    quarterlyBurnUsd: 2_000_000,
    capitalRaisedPipe: 200_000_000,
    avgDailyVolume: 10_000_000,
    marketCap: 110_000_000,  // ~$110M (Jan 2026)
    sharesForMnav: 92_000_000,  // From holdings-history.ts
    leader: "Galaxy, Kraken, Hivemind, DCG backed",
    strategy: "Premier ETH pure-play treasury. $5B fundraise plan.",
    notes: "Formerly Fundamental Global. Peaked at 50K ETH Sep 2025, sold some Nov 2025.",
  },
  // ICG (Intchains) removed - ASIC chip company, not beta to ETH
];

// BTC DAT Companies
export const btcCompanies: Company[] = [
  {
    id: "mstr",
    name: "Strategy (fka MicroStrategy)",
    ticker: "MSTR",
    asset: "BTC",
    tier: 1,
    holdings: 687_410,  // SEC 8-K Jan 12, 2026
    holdingsLastUpdated: "2026-01-12",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K&dateb=&owner=include&count=40",
    datStartDate: "2024-01-01",
    website: "https://www.strategy.com",
    twitter: "https://twitter.com/Strategy",
    secCik: "0001050446",  // SEC CIK for EDGAR lookups
    costBasisAvg: 75_353,  // Updated per Jan 12 8-K
    isMiner: false,
    quarterlyBurnUsd: 15_000_000,
    avgDailyVolume: 3_000_000_000,
    hasOptions: true,
    optionsOi: 500_000,  // Deep options market
    marketCap: 55_500_000_000,  // ~$55.5B per strategy.com (~320M shares, Jan 2026)
    sharesForMnav: 340_000_000,  // From holdings-history.ts
    capitalRaisedConverts: 7_200_000_000,  // ~$7.2B in convertible notes outstanding
    totalDebt: 8_244_000_000,  // $8.244B per strategy.com (Jan 2026)
    preferredEquity: 8_064_000_000,  // $8.064B per strategy.com (Jan 2026)
    capitalRaisedAtm: 21_000_000_000,  // 21/21 plan ATM component
    cashReserves: 2_250_000_000,  // $2.25B USD reserves (Jan 2026 8-K)
    leader: "Michael Saylor (Executive Chairman)",
    strategy: "21/21 Plan: $21B equity + $21B debt for BTC.",
    notes: "687K BTC @ $75K avg. STRK/STRF 8% perpetual preferred. Bitcoin credit company thesis.",
    leverageRatio: 1.5, // ~$21B debt provides leveraged BTC exposure via converts
  },
  {
    id: "3350t",
    name: "Metaplanet",
    ticker: "3350.T",
    asset: "BTC",
    tier: 1,
    holdings: 35_102,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://metaplanet.jp/en/analytics",
    datStartDate: "2024-04-01",
    website: "https://metaplanet.jp",
    twitter: "https://twitter.com/Metaplanet_JP",
    costBasisAvg: 107_912,
    isMiner: false,
    quarterlyBurnUsd: 5_000_000,
    avgDailyVolume: 200_000_000,
    marketCap: 4_010_000_000,  // ~$4.0B (Jan 2026, 1.142B shares × ¥548 ÷ 156 USD/JPY)
    sharesForMnav: 1_142_274_340,  // Official: Nov 20, 2025 filing (xj-storage.jp) - post Sept 2025 $1.4B offering
    totalDebt: 280_000_000,  // $280M per metaplanet.jp/analytics (Jan 2026)
    cashReserves: 150_000_000,  // ~$150M - calibrated to match metaplanet.jp mNAV (~1.24x). TODO: verify from filing
    leader: "Simon Gerovich (CEO)",
    strategy: "Japan's BTC treasury leader. Targeting 100K BTC by 2026.",
    notes: "Largest Asian public BTC holder. Zero-interest bonds. Reports BTC Yield.",
    leverageRatio: 1.3,
  },
  {
    id: "xxi",
    name: "Twenty One Capital",
    ticker: "XXI",
    asset: "BTC",
    tier: 1,
    holdings: 43_514,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002019757&type=8-K",
    datStartDate: "2025-12-09",
    costBasisAvg: 93_000,
    isMiner: false,
    quarterlyBurnUsd: 10_000_000,
    avgDailyVolume: 150_000_000,
    hasOptions: true,
    marketCap: 6_120_000_000,  // ~$6.1B (651M shares × $9.40, Jan 2026)
    // DUAL-CLASS: 346,548,153 Class A + 304,842,759 Class B = 651,390,912 total
    sharesForMnav: 651_390_912,  // Total shares (both classes)
    totalDebt: 486_500_000,  // $486.5M 1% convertible senior secured notes due 2030
    cashReserves: 119_300_000,  // ~$119.3M net cash at Dec 2025 closing
    leader: "Jack Mallers (CEO)",
    strategy: "BTC treasury + Bitcoin-native financial services.",
    notes: "Tether/SoftBank/Mallers venture. No SEC 10-Q/10-K filings yet - holdings unverified by regulatory filings.",
  },
  {
    id: "cepo",  // BSTR Holdings pre-merger
    name: "BSTR Holdings",
    ticker: "CEPO",  // Pre-merger SPAC, will become BSTR
    asset: "BTC",
    tier: 1,
    holdings: 30_021,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002027708&type=8-K",
    datStartDate: "2025-10-01",
    costBasisAvg: 85_000,
    isMiner: false,
    quarterlyBurnUsd: 5_000_000,
    avgDailyVolume: 80_000_000,
    hasOptions: true,
    pendingMerger: true,  // SPAC merger not yet closed - no mNAV
    expectedHoldings: 30_021,  // Confirmed BTC from Adam Back + investors
    leader: "Adam Back (CEO)",
    strategy: "Hashcash inventor's BTC treasury play. Target 50K+ BTC.",
    notes: "SPAC merger pending (expected Q1 2026). 25K BTC from Adam Back + 5K from investors. Will trade as BSTR post-merger.",
  },
  {
    id: "mara",
    name: "MARA Holdings",
    ticker: "MARA",
    asset: "BTC",
    tier: 1,
    holdings: 52_850,
    holdingsLastUpdated: "2026-01-17",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001507605&type=8-K&dateb=&owner=include&count=40",
    datStartDate: "2024-01-01",
    website: "https://mara.com",
    twitter: "https://twitter.com/MARAHoldings",
    secCik: "0001507605",
    costBasisAvg: 43_000,
    isMiner: true,
    btcMinedAnnual: 18_000,
    quarterlyBurnUsd: 85_000_000,
    avgDailyVolume: 400_000_000,
    hasOptions: true,
    marketCap: 3_600_000_000,
    sharesForMnav: 470_000_000,  // 470M diluted shares (Q3 2025)
    cashReserves: 124_000_000,  // ~$124M cash (Q2 2025)
    leader: "Fred Thiel (CEO)",
    strategy: "HODL miner - keeps all mined BTC. 50 EH/s.",
    totalDebt: 1_800_000_000,  // $1.8B in 0% convertible notes
    notes: "Largest US public miner. $1.8B in 0% converts.",
  },
  {
    id: "riot",
    name: "Riot Platforms",
    ticker: "RIOT",
    asset: "BTC",
    tier: 1,
    holdings: 19_287,  // SEC 8-K Oct 30, 2025
    holdingsLastUpdated: "2025-10-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001167419&type=8-K&dateb=&owner=include&count=40",
    datStartDate: "2024-01-01",
    website: "https://riotplatforms.com",
    twitter: "https://twitter.com/RiotPlatforms",
    secCik: "0001167419",
    costBasisAvg: 39_000,
    isMiner: true,
    btcMinedAnnual: 6_000,
    quarterlyBurnUsd: 120_000_000,
    avgDailyVolume: 350_000_000,
    hasOptions: true,
    marketCap: 5_220_000_000,
    sharesForMnav: 403_000_000,  // 403M diluted shares (Q3 2025)
    cashReserves: 330_700_000,  // $330.7M unrestricted cash (Q3 2025)
    leader: "Jason Les (CEO)",
    strategy: "HODL miner + treasury. Converts fund BTC buys. 1 GW Corsicana.",
    totalDebt: 794_000_000,  // $594M 0.75% converts + $200M BTC-backed credit
    notes: "Adopted DAT playbook Dec 2024. $594M converts used for $510M BTC purchase. 3rd largest corporate holder.",
  },
  {
    id: "clsk",
    name: "CleanSpark",
    ticker: "CLSK",
    asset: "BTC",
    tier: 1,
    holdings: 13_099,
    holdingsLastUpdated: "2026-01-17",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001785459&type=8-K&dateb=&owner=include&count=40",
    datStartDate: "2024-01-01",
    website: "https://cleanspark.com",
    twitter: "https://twitter.com/CleanSpark_Inc",
    secCik: "0001785459",
    costBasisAvg: 45_000,
    isMiner: true,
    btcMinedAnnual: 9_000,
    quarterlyBurnUsd: 65_000_000,
    avgDailyVolume: 250_000_000,
    hasOptions: true,
    marketCap: 3_040_000_000,
    sharesForMnav: 329_000_000,  // 329M diluted shares (Q3 2025)
    cashReserves: 43_000_000,  // $43M cash (Sep 2025)
    leader: "Zach Bradford (CEO)",
    strategy: "Efficient US miner. 50 EH/s. DAM derivatives program.",
    totalDebt: 1_150_000_000,  // $650M 0% converts + $400M BTC-backed credit + $100M facility
    notes: "$650M 0% converts. $400M BTC-backed credit.",
  },
  {
    id: "asst",
    name: "Strive (Strive + Semler)",
    ticker: "ASST",
    asset: "BTC",
    tier: 1,
    holdings: 12_798,  // SEC 8-K Jan 16, 2026 (12,797.9 rounded)
    holdingsLastUpdated: "2026-01-16",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001920406&type=8-K&dateb=&owner=include&count=40",
    datStartDate: "2024-05-01",
    secCik: "0001920406",
    costBasisAvg: 95_000,  // Blended avg after merger
    isMiner: false,
    quarterlyBurnUsd: 15_000_000,  // Combined burn
    avgDailyVolume: 100_000_000,  // Increased post-merger
    hasOptions: true,
    marketCap: 850_000_000,  // ~$850M per Yahoo Finance (Jan 2026)
    sharesForMnav: 45_000_000,  // From holdings-history.ts
    cashReserves: 77_780_000,  // Combined cash
    preferredEquity: 200_000_000,  // SATA 12.25% perpetual preferred (2M shares × $100 stated)
    leader: "Vivek Ramaswamy (Co-Founder), Matt Cole (CEO), Eric Semler (Exec Chair)",
    strategy: "First asset mgmt BTC treasury. No debt - perpetual preferred only. Plans to monetize Semler healthcare ops.",
    notes: "Acquired Semler Scientific Jan 2026. SATA 12.25% perpetual preferred. 11th largest corporate BTC holder.",
  },
  {
    id: "kulr",
    name: "KULR Technology",
    ticker: "KULR",
    asset: "BTC",
    tier: 1,
    holdings: 1_021,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://kulrbitcointracker.com/",
    datStartDate: "2024-12-01",
    costBasisAvg: 97_000,
    isMiner: false,
    quarterlyBurnUsd: 4_000_000,
    avgDailyVolume: 30_000_000,
    hasOptions: true,
    marketCap: 600_000_000,
    sharesForMnav: 49_000_000,  // From holdings-history.ts
    cashReserves: 20_000_000,  // ~$20M cash (Q3 2025)
    leader: "Michael Mo (CEO)",
    strategy: "Bitcoin First Company. 90% of excess cash to BTC. Reports BTC Yield.",
    notes: "NASA supplier. 291% BTC Yield YTD. ATM + Coinbase credit facility.",
  },
  {
    id: "altbg",
    name: "The Blockchain Group",
    ticker: "ALTBG",
    asset: "BTC",
    tier: 2,
    holdings: 1_653,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.theblockchain-group.com/investor/share/",
    datStartDate: "2024-12-01",
    costBasisAvg: 85_000,
    isMiner: false,
    quarterlyBurnUsd: 2_000_000,
    avgDailyVolume: 10_000_000,
    marketCap: 200_000_000,
    sharesForMnav: 50_000_000,  // From holdings-history.ts
    strategy: "French BTC treasury company. EUR300M ATM program.",
    notes: "Euronext Paris listed. Europe's Strategy equivalent.",
  },
  {
    id: "h100st",
    name: "H100 Group",
    ticker: "H100.ST",
    asset: "BTC",
    tier: 2,
    holdings: 958,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.h100.group/investor-relations/corporate-governance",
    datStartDate: "2025-01-01",
    costBasisAvg: 90_000,
    isMiner: false,
    quarterlyBurnUsd: 1_000_000,
    avgDailyVolume: 5_000_000,
    marketCap: 150_000_000,
    sharesForMnav: 35_000_000,  // From holdings-history.ts
    leader: "Adam Back (investor)",
    strategy: "Swedish BTC treasury company. Nordic Strategy equivalent.",
    notes: "Stockholm listed. ISK-eligible for Swedish investors. SEK 265M financing.",
  },
  {
    id: "naka",
    name: "Nakamoto Holdings",
    ticker: "NAKA",
    asset: "BTC",
    tier: 1,
    holdings: 5_398,
    holdingsLastUpdated: "2025-11-19",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://nakamoto.com/update/kindlymd-acquires-5-744-btc-to-expand-nakamoto-bitcoin-treasury",
    datStartDate: "2025-05-12",
    costBasisAvg: 118_205,
    isMiner: false,
    quarterlyBurnUsd: 8_000_000,
    avgDailyVolume: 50_000_000,
    hasOptions: true,
    marketCap: 1_500_000_000,
    sharesForMnav: 500_000_000,  // From holdings-history.ts
    totalDebt: 410_000_000,  // $200M Yorkville converts + $210M Kraken BTC-backed loan
    leader: "David Bailey (CEO, Bitcoin Magazine)",
    strategy: "First publicly traded Bitcoin conglomerate. Acquires Bitcoin-native companies.",
    notes: "$710M PIPE (largest crypto PIPE ever). Goal: 1M BTC ('one Nakamoto'). Share buyback authorized Dec 2025 as mNAV < 1.",
  },
  {
    id: "djt",
    name: "Trump Media & Technology",
    ticker: "DJT",
    asset: "BTC",
    tier: 1,
    holdings: 11_542,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://ir.tmtgcorp.com/financials/sec-filings/",
    datStartDate: "2025-05-01",
    costBasisAvg: 100_000,
    isMiner: false,
    quarterlyBurnUsd: 10_000_000,
    capitalRaisedPipe: 2_500_000_000,
    avgDailyVolume: 200_000_000,
    hasOptions: true,
    marketCap: 6_400_000_000,
    sharesForMnav: 288_000_000,  // From holdings-history.ts
    totalDebt: 1_000_000_000,  // $1B zero-coupon converts
    leader: "Devin Nunes (CEO)",
    strategy: "$2.5B private placement for BTC treasury. Crypto.com + Anchorage custody.",
    notes: "Truth Social parent. $1.5B equity + $1B zero-coupon converts.",
  },
  {
    id: "boyaa",
    name: "Boyaa Interactive",
    ticker: "0434.HK",
    asset: "BTC",
    tier: 1,
    holdings: 3_351,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.hkexnews.hk/listedco/listconews/SEHK/2024/0129/2024012900251.pdf",
    datStartDate: "2024-01-26",
    costBasisAvg: 58_628,
    isMiner: false,
    quarterlyBurnUsd: 2_000_000,
    avgDailyVolume: 20_000_000,
    marketCap: 500_000_000,
    sharesForMnav: 700_000_000,  // From holdings-history.ts
    leader: "Zhang Wei (Chairman)",
    strategy: "Hong Kong's largest BTC treasury. Converted ETH to BTC.",
    notes: "MicroStrategy of Asia. Board games company. Top 15 global corporate holder.",
  },
  {
    id: "nxtt",
    name: "Next Technology Holding",
    ticker: "NXTT",
    asset: "BTC",
    tier: 1,
    holdings: 5_833,
    holdingsLastUpdated: "2025-06-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001831978&type=8-K",
    datStartDate: "2024-06-01",
    costBasisAvg: 65_000,
    isMiner: false,
    quarterlyBurnUsd: 5_000_000,
    avgDailyVolume: 15_000_000,
    marketCap: 600_000_000,
    sharesForMnav: 98_000_000,  // From holdings-history.ts
    strategy: "AI software company with BTC treasury. Actively acquiring via debt/equity.",
    notes: "Formerly WeTrade Group. Shenzhen-based. $500M shelf for BTC acquisitions. Pending: MOU with Global Nexgen (Nov 2025) to buy up to 10,000 BTC at $84K/BTC within 1 year - would nearly triple holdings.",
  },
  // GNS (Genius Group) removed - AI education company, not beta to BTC
  {
    id: "abtc",
    name: "American Bitcoin",
    ticker: "ABTC",
    asset: "BTC",
    tier: 1,
    holdings: 5_427,  // Jan 2, 2026 - company announcement
    holdingsLastUpdated: "2026-01-02",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.abtc.com/content/american-bitcoin-enters-top-20-publicly-traded-bitcoin-treasury-companies-by-holdings",
    datStartDate: "2025-06-01",
    costBasisAvg: 85_000,
    isMiner: true,
    btcMinedAnnual: 2_000,
    quarterlyBurnUsd: 15_000_000,
    avgDailyVolume: 30_000_000,
    hasOptions: true,
    marketCap: 800_000_000,
    sharesForMnav: 920_000_000,  // From holdings-history.ts
    leader: "Eric Trump, Donald Trump Jr. (Co-Founders)",
    strategy: "Pure-play Bitcoin miner focused on HODL strategy.",
    notes: "80% owned by Hut 8 (HUT). ⚠️ No SEC 10-Q/10-K filings - holdings unverified by regulatory filings.",
  },
  {
    id: "hut",
    name: "Hut 8",
    ticker: "HUT",
    asset: "BTC",
    tier: 1,
    holdings: 10_278,  // Standalone (excludes ABTC subsidiary) - Q3 2025
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001964789&type=10-Q",
    datStartDate: "2024-01-01",
    secCik: "0001964789",
    costBasisAvg: 24_000,
    isMiner: true,
    btcMinedAnnual: 4_500,
    quarterlyBurnUsd: 45_000_000,
    avgDailyVolume: 150_000_000,
    hasOptions: true,
    marketCap: 6_770_000_000,  // ~$6.77B (Jan 2026)
    sharesForMnav: 108_000_000,  // 108M diluted shares (Q3 2025)
    totalDebt: 490_000_000,  // ~$490M (EV $8.09B - Market Cap $7.6B)
    cashReserves: 35_000_000,  // ~$35M cash
    leader: "Asher Genoot (CEO)",
    strategy: "HODL miner with diversified revenue streams (hosting, HPC).",
    notes: "Standalone holdings (ABTC listed separately). Owns 80% of ABTC. Merged with US Bitcoin Corp 2023.",
  },
  {
    id: "corz",
    name: "Core Scientific",
    ticker: "CORZ",
    asset: "BTC",
    tier: 1,
    holdings: 2_116,
    holdingsLastUpdated: "2026-01-17",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001878848&type=8-K&dateb=&owner=include&count=40",
    datStartDate: "2024-01-01",
    secCik: "0001878848",
    costBasisAvg: 35_000,
    isMiner: true,
    btcMinedAnnual: 8_000,
    quarterlyBurnUsd: 80_000_000,
    avgDailyVolume: 200_000_000,
    hasOptions: true,
    marketCap: 4_500_000_000,
    sharesForMnav: 356_000_000,  // From holdings-history.ts
    totalDebt: 1_000_000_000,  // ~$1B convertible notes (2029 + 2031)
    cashReserves: 200_000_000,
    leader: "Adam Sullivan (CEO)",
    strategy: "Largest US miner by hashrate. AI/HPC pivot with CoreWeave deal.",
    notes: "Emerged from bankruptcy Jan 2024. 200MW AI hosting deal with CoreWeave.",
  },
  {
    id: "btdr",
    name: "Bitdeer Technologies",
    ticker: "BTDR",
    asset: "BTC",
    tier: 1,
    holdings: 2_470,
    holdingsLastUpdated: "2026-01-17",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://ir.bitdeer.com/news-releases",
    datStartDate: "2024-01-01",
    costBasisAvg: 40_000,
    isMiner: true,
    btcMinedAnnual: 3_000,
    quarterlyBurnUsd: 50_000_000,
    avgDailyVolume: 80_000_000,
    hasOptions: true,
    marketCap: 2_800_000_000,
    sharesForMnav: 225_000_000,  // From holdings-history.ts
    totalDebt: 1_100_000_000,  // ~$1.1B convertible notes (2029 + 2031 series)
    cashReserves: 150_000_000,
    leader: "Jihan Wu (Co-Founder)",
    strategy: "Vertically integrated - develops own ASIC chips (SEALMINER).",
    notes: "Cayman Islands company. Files 6-K (foreign issuer) - no SEC 10-Q/10-K to verify holdings.",
  },
];

// SOL DAT Companies
export const solCompanies: Company[] = [
  {
    id: "fwdi",
    name: "Forward Industries",
    ticker: "FWDI",
    asset: "SOL",
    tier: 1,
    holdings: 6_979_967,  // Jan 15, 2026 treasury update
    holdingsLastUpdated: "2026-01-15",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.forwardindustries.com/",
    datStartDate: "2025-09-01",  // Initiated SOL strategy Sept 2025
    costBasisAvg: 232.08,
    stakingPct: 0.99,
    stakingApy: 0.0673,  // 6.73% gross APY per Jan 2026 update
    quarterlyBurnUsd: 3_400_000,
    capitalRaisedPipe: 1_650_000_000,
    sharesForMnav: 42_000_000,  // From holdings-history.ts
    avgDailyVolume: 400_000_000,
    hasOptions: true,
    cashReserves: 30_000_000,  // ~$30M operating capital (cash + USDC, Dec 2025)
    leader: "Galaxy, Jump Crypto, Multicoin backed",
    strategy: "World's largest SOL treasury, validator infrastructure, DeFi yield",
    notes: "Raised $1.65B PIPE. Debt free. 133K+ SOL staking rewards since Sept 2025. First equity on Solana via Superstate.",
  },
  {
    id: "hsdt",
    name: "Solana Company (fka Helius Medical)",
    ticker: "HSDT",
    asset: "SOL",
    tier: 1,
    holdings: 2_200_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1610853&type=8-K",
    datStartDate: "2025-05-01",
    costBasisAvg: 227.00,
    stakingPct: 0.95,
    stakingApy: 0.065,
    quarterlyBurnUsd: 12_000_000,
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 58_000_000,  // From holdings-history.ts
    avgDailyVolume: 150_000_000,
    hasOptions: true,
    leader: "Pantera Capital, Summer Capital",
    strategy: "SOL treasury via Anchorage Digital custody",
    notes: "Partnered with Solana Foundation.",
  },
  {
    id: "dfdv",
    name: "DeFi Development Corp",
    ticker: "DFDV",
    asset: "SOL",
    tier: 1,
    holdings: 2_221_329,  // Updated Jan 2026
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1805526&type=8-K",
    datStartDate: "2025-04-01",
    costBasisAvg: 110.00,
    stakingPct: 0.90,
    stakingApy: 0.114,
    quarterlyBurnUsd: 1_500_000,
    capitalRaisedAtm: 200_000_000,
    avgDailyVolume: 200_000_000,
    hasOptions: true,
    marketCap: 240_000_000,  // ~$240M (Jan 2026)
    sharesForMnav: 30_000_000,  // From holdings-history.ts
    cashReserves: 9_000_000,  // ~$9M cash, stablecoins, and liquid tokens
    leader: "Formerly Janover Inc.",
    strategy: "First US public company with SOL-focused treasury.",
    notes: "$5B ELOC. Validator operations. dfdvSOL liquid staking token.",
  },
  {
    id: "upxi",
    name: "Upexi",
    ticker: "UPXI",
    asset: "SOL",
    tier: 1,
    holdings: 2_106_989,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001775194&type=8-K",
    datStartDate: "2025-04-01",
    costBasisAvg: 157.66,
    stakingPct: 0.95,
    stakingApy: 0.08,
    quarterlyBurnUsd: 2_500_000,
    capitalRaisedAtm: 100_000_000,
    sharesForMnav: 62_000_000,  // From holdings-history.ts
    capitalRaisedPipe: 200_000_000,
    avgDailyVolume: 120_000_000,
    hasOptions: true,
    leader: "Arthur Hayes (advisory)",
    strategy: "SOL treasury + consumer brands",
    notes: "$50M buyback approved Nov 2025.",
  },
  {
    id: "stke",
    name: "Sol Strategies",
    ticker: "STKE",
    asset: "SOL",
    tier: 2,
    holdings: 526_637,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://solstrategies.io/investor-relations/",
    datStartDate: "2024-06-01",
    costBasisAvg: 130.00,
    stakingPct: 0.85,
    stakingApy: 0.065,
    quarterlyBurnUsd: 1_200_000,
    capitalRaisedAtm: 50_000_000,
    sharesForMnav: 135_000_000,  // From holdings-history.ts
    avgDailyVolume: 50_000_000,
    leader: "Canadian company",
    strategy: "Validator operations, VanEck staking provider",
    notes: "3.7M SOL delegated.",
  },
];

// HYPE DAT Companies
export const hypeCompanies: Company[] = [
  {
    id: "purr",
    name: "Hyperliquid Strategies",
    ticker: "PURR",
    asset: "HYPE",
    tier: 1,
    holdings: 12_600_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.hypestrat.xyz",
    datStartDate: "2025-12-01",
    costBasisAvg: 46.27,
    stakingPct: 0.80,
    stakingApy: 0.05,
    quarterlyBurnUsd: 2_000_000,
    capitalRaisedPipe: 583_000_000,
    sharesForMnav: 32_000_000,  // From holdings-history.ts
    leader: "David Schamis (CEO), Bob Diamond (Board)",
    strategy: "HYPE treasury via Sonnet merger.",
    notes: "$888M combined assets. $30M buyback.",
  },
  {
    id: "hypd",
    name: "Hyperion DeFi (fka Eyenovia)",
    ticker: "HYPD",
    asset: "HYPE",
    tier: 2,
    holdings: 1_712_195,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://ir.hyperiondefi.com/",
    datStartDate: "2025-07-01",
    costBasisAvg: 38.25,
    stakingPct: 0.90,
    stakingApy: 0.05,
    quarterlyBurnUsd: 1_500_000,
    capitalRaisedPipe: 50_000_000,
    sharesForMnav: 25_000_000,  // From holdings-history.ts
    leader: "First US public HYPE treasury",
    strategy: "Validator node via Kinetiq.",
    notes: "Rebranded from Eyenovia Jul 2025.",
  },
];

// BNB DAT Companies
export const bnbCompanies: Company[] = [
  {
    id: "bnc",
    name: "BNB Network Company",
    ticker: "BNC",
    asset: "BNB",
    tier: 1,
    holdings: 500_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/",
    datStartDate: "2025-06-01",
    costBasisAvg: 870.00,
    stakingPct: 0.50,
    stakingApy: 0.03,
    quarterlyBurnUsd: 3_000_000,
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 65_000_000,  // From holdings-history.ts
    leader: "YZi Labs (CZ family office) backed",
    strategy: "Target 1% of BNB supply.",
    notes: "YZi Labs owns 7%.",
  },
  // WINT (Windtree) removed - Biopharma company, not beta to BNB
  {
    id: "na",
    name: "Nano Labs",
    ticker: "NA",
    asset: "BNB",
    tier: 2,
    holdings: 130_000,  // Updated Jan 2026
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://ir.nano.cn/",
    datStartDate: "2025-06-01",
    costBasisAvg: 600.00,
    stakingPct: 0.30,
    stakingApy: 0.03,
    quarterlyBurnUsd: 5_000_000,
    capitalRaisedConverts: 500_000_000,
    totalDebt: 500_000_000,  // $500M convertible notes
    leader: "Hong Kong Web3 infrastructure",
    strategy: "BNB treasury via convertible notes",
    notes: "$500M convertible notes Jun 2025.",
  },
];

// TAO DAT Companies
export const taoCompanies: Company[] = [
  {
    id: "taox",
    name: "TAO Synergies",
    ticker: "TAOX",
    asset: "TAO",
    tier: 1,
    holdings: 54_058,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://ir.taosynergies.com/",
    datStartDate: "2025-06-01",
    costBasisAvg: 334.00,
    stakingPct: 1.00,
    stakingApy: 0.10,
    quarterlyBurnUsd: 500_000,
    capitalRaisedPipe: 11_000_000,
    sharesForMnav: 28_000_000,  // From holdings-history.ts
    leader: "James Altucher (advisor)",
    strategy: "First pure-play Bittensor treasury company",
    notes: "Formerly Synaptogenix. DCG is investor.",
  },
  {
    id: "xtaif",
    name: "xTAO Inc",
    ticker: "XTAIF",
    asset: "TAO",
    tier: 1,
    holdings: 59_962,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.newswire.ca/",
    datStartDate: "2025-07-22",
    costBasisAvg: 350.00,
    stakingPct: 1.00,
    stakingApy: 0.10,
    quarterlyBurnUsd: 400_000,
    capitalRaisedPipe: 30_100_000,
    sharesForMnav: 21_000_000,  // From holdings-history.ts
    lowLiquidity: true,  // Canadian OTC - limited data feed coverage
    leader: "Karia Samaroo",
    strategy: "Validator operations and TAO treasury accumulation",
    notes: "TSX Venture Exchange. World's largest public TAO holder.",
  },
  {
    id: "twav",
    name: "TaoWeave (fka Oblong)",
    ticker: "TWAV",
    asset: "TAO",
    tier: 2,
    holdings: 21_943,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.taoweave.ai/",
    datStartDate: "2025-06-01",
    costBasisAvg: 384.00,
    stakingPct: 1.00,
    stakingApy: 0.10,
    quarterlyBurnUsd: 150_000,
    capitalRaisedAtm: 7_500_000,
    sharesForMnav: 18_000_000,  // From holdings-history.ts
    strategy: "Decentralized AI treasury strategy via TAO accumulation",
    notes: "Nasdaq: TWAV (changed from OBLG Dec 2025).",
  },
];

// LINK DAT Companies
export const linkCompanies: Company[] = [
  {
    id: "cwd",
    name: "Caliber",
    ticker: "CWD",
    asset: "LINK",
    tier: 1,
    holdings: 562_535,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://ir.caliberco.com/",
    datStartDate: "2025-09-09",
    costBasisAvg: 22.50,
    stakingPct: 0.13,
    stakingApy: 0.05,
    quarterlyBurnUsd: 2_000_000,
    avgDailyVolume: 5_000_000,
    sharesForMnav: 25_000_000,  // From holdings-history.ts
    leader: "Chris Loeffler (CEO)",
    strategy: "First Nasdaq LINK treasury. DCA accumulation + staking.",
    notes: "Real estate asset manager pivoting to LINK. 75K LINK staked.",
  },
];

// TRX DAT Companies
export const trxCompanies: Company[] = [
  {
    id: "tron",
    name: "Tron Inc",
    ticker: "TRON",
    asset: "TRX",
    tier: 1,
    holdings: 677_596_945,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/",
    datStartDate: "2025-07-01",
    costBasisAvg: 0.28,
    stakingPct: 0.81,
    stakingApy: 0.045,
    quarterlyBurnUsd: 500_000,
    capitalRaisedPipe: 310_000_000,
    avgDailyVolume: 50_000_000,
    marketCap: 578_620_000,
    sharesForMnav: 85_000_000,  // From holdings-history.ts
    leader: "Richard Miller (CEO)",
    strategy: "TRX treasury via JustLend staking, Justin Sun backing",
    notes: "First US public company to hold its blockchain's native token.",
  },
];

// XRP DAT Companies
export const xrpCompanies: Company[] = [
  {
    id: "xrpn",
    name: "Evernorth Holdings",
    ticker: "XRPN",  // Trading as Armada Acquisition Corp. II until merger closes
    asset: "XRP",
    tier: 1,
    holdings: 473_276_430,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.prnewswire.com/news-releases/evernorth-acquires-additional-214m-in-xrp-bringing-total-xrp-purchased-and-committed-to-over-473-276-430--302603558.html",
    datStartDate: "2025-11-01",
    costBasisAvg: 2.00,  // ~$2.00-2.44 avg across purchases
    quarterlyBurnUsd: 0,
    capitalRaisedPipe: 1_000_000_000,
    pendingMerger: true,  // SPAC merger with Armada Acquisition Corp. II
    expectedHoldings: 473_276_430,
    leader: "Asheesh Birla (CEO, ex-Ripple)",
    strategy: "Institutional-scale XRP adoption via SPAC. Yield through XRP loans/market making.",
    notes: "SPAC merger pending Q1 2026. 0.47% of XRP supply. SBI $200M anchor. Ripple, Pantera backed.",
  },
  // WKSP (Worksport) removed - Auto tech company, not beta to XRP
];

// ZEC DAT Companies
export const zecCompanies: Company[] = [
  {
    id: "cyph",
    name: "Cypherpunk Technologies",
    ticker: "CYPH",
    asset: "ZEC",
    tier: 1,
    holdings: 290_062,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://investors.leaptx.com/",
    datStartDate: "2025-10-01",
    costBasisAvg: 334.41,
    quarterlyBurnUsd: 3_100_000,
    capitalRaisedAtm: 200_000_000,
    capitalRaisedPipe: 58_880_000,
    avgDailyVolume: 10_000_000,
    marketCap: 65_720_000,
    sharesForMnav: 125_000_000,  // From holdings-history.ts
    leader: "Douglas Onsi (CEO)",
    strategy: "Target 5% of ZEC supply (~540K ZEC). Winklevoss backed.",
    notes: "Formerly Leap Therapeutics. 1.76% of ZEC supply.",
  },
  // RELI (Reliance Global) removed - InsurTech company, not beta to ZEC
];

// LTC DAT Companies
export const ltcCompanies: Company[] = [
  {
    id: "lits",
    name: "Lite Strategy",
    ticker: "LITS",
    asset: "LTC",
    tier: 1,
    holdings: 929_548,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://investor.litestrategy.com/",
    datStartDate: "2025-07-01",
    costBasisAvg: 107.58,
    quarterlyBurnUsd: 3_600_000,
    capitalRaisedPipe: 100_000_000,
    avgDailyVolume: 15_000_000,
    marketCap: 65_000_000,
    sharesForMnav: 35_655_155,  // From holdings-history.ts
    leader: "Justin File (CEO)",
    strategy: "First US-listed LTC treasury. GSR as treasury manager.",
    notes: "Formerly MEI Pharma. Charlie Lee on board.",
  },
  {
    id: "luxff",
    name: "Luxxfolio Holdings",
    ticker: "LUXFF",
    asset: "LTC",
    tier: 2,
    holdings: 20_084,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.luxxfolio.com/",
    datStartDate: "2024-06-01",
    costBasisAvg: 80.00,
    stakingPct: 0.042,
    stakingApy: 0.03,
    quarterlyBurnUsd: 200_000,
    capitalRaisedAtm: 100_000_000,
    capitalRaisedPipe: 2_500_000,
    avgDailyVolume: 500_000,
    marketCap: 3_860_000,
    sharesForMnav: 220_000_000,  // From holdings-history.ts
    leader: "Tomek Antoniak (CEO)",
    strategy: "Target 1M LTC by 2026. Validator operations.",
    notes: "Canadian. Charlie Lee + David Schwartz on advisory.",
  },
];

// SUI DAT Companies
export const suiCompanies: Company[] = [
  {
    id: "suig",
    name: "SUI Group Holdings",
    ticker: "SUIG",
    asset: "SUI",
    tier: 1,
    holdings: 108_098_436,  // Updated Jan 2026
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://suig.io/investor-relations",
    datStartDate: "2025-08-01",
    costBasisAvg: 2.23,
    stakingPct: 1.0,
    stakingApy: 0.022,
    quarterlyBurnUsd: 1_000_000,
    capitalRaisedAtm: 500_000_000,
    capitalRaisedPipe: 450_000_000,
    avgDailyVolume: 20_000_000,
    marketCap: 160_000_000,
    sharesForMnav: 48_000_000,  // From holdings-history.ts
    leader: "Douglas Polinsky (CEO)",
    strategy: "Only public company with Sui Foundation relationship",
    notes: "Formerly Mill City Ventures. ~2.9% of SUI supply.",
  },
];

// DOGE DAT Companies
export const dogeCompanies: Company[] = [
  {
    id: "zone",
    name: "CleanCore Solutions",
    ticker: "ZONE",
    asset: "DOGE",
    tier: 1,
    holdings: 710_000_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/",
    datStartDate: "2025-09-05",
    costBasisAvg: 0.25,
    quarterlyBurnUsd: 500_000,
    capitalRaisedPipe: 175_000_000,
    avgDailyVolume: 10_000_000,
    marketCap: 150_000_000,
    sharesForMnav: 60_000_000,  // From holdings-history.ts
    leader: "Clayton Adams (CEO)",
    strategy: "Target 1B DOGE. House of Doge as treasury manager.",
    notes: "NYSE listed. $20M+ unrealized gains.",
  },
  {
    id: "tbh",
    name: "Brag House / House of Doge",
    ticker: "TBH",
    asset: "DOGE",
    tier: 1,
    holdings: 730_000_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://investors.braghouse.com/",
    datStartDate: "2025-08-01",
    costBasisAvg: 0.20,
    quarterlyBurnUsd: 1_000_000,
    capitalRaisedPipe: 200_000_000,
    avgDailyVolume: 5_000_000,
    marketCap: 200_000_000,
    sharesForMnav: 62_000_000,  // From holdings-history.ts
    leader: "Alex Spiro (Chairman, Elon Musk's lawyer)",
    strategy: "Official Dogecoin treasury partner. Payments ecosystem.",
    notes: "Nasdaq merger pending Q1 2026. Largest institutional DOGE manager.",
  },
  {
    id: "btog",
    name: "Bit Origin",
    ticker: "BTOG",
    asset: "DOGE",
    tier: 2,
    holdings: 40_500_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/",
    datStartDate: "2025-07-01",
    costBasisAvg: 0.25,
    quarterlyBurnUsd: 2_000_000,
    capitalRaisedAtm: 500_000_000,
    avgDailyVolume: 3_000_000,
    marketCap: 50_000_000,
    sharesForMnav: 78_000_000,  // From holdings-history.ts
    leader: "Bo Zhao (CEO)",
    strategy: "Quarterly DOGE acquisitions via $500M facility.",
    notes: "Nasdaq listed. Crypto mining + infrastructure.",
  },
];

// AVAX DAT Companies
export const avaxCompanies: Company[] = [
  {
    id: "avx",
    name: "AVAX One Technology",
    ticker: "AVX",
    asset: "AVAX",
    tier: 1,
    holdings: 13_800_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://avax-one.com/",
    datStartDate: "2025-10-01",
    costBasisAvg: 11.73,
    stakingPct: 0.80,
    stakingApy: 0.08,
    quarterlyBurnUsd: 1_000_000,
    capitalRaisedAtm: 40_000_000,
    capitalRaisedPipe: 110_000_000,
    avgDailyVolume: 15_000_000,
    marketCap: 193_000_000,
    sharesForMnav: 40_000_000,  // From holdings-history.ts
    strategy: "Regulated AVAX exposure for US capital markets.",
    notes: "Nasdaq listed. $40M share repurchase program.",
  },
];

// ADA DAT Companies
// CBLO removed - diversified multi-chain mining company (BTC mining + ETH + ADA + DOG), not pure ADA beta
export const adaCompanies: Company[] = [];

// HBAR DAT Companies
export const hbarCompanies: Company[] = [
  {
    id: "imtl",
    name: "Immutable Holdings",
    ticker: "IHLDF",
    asset: "HBAR",
    tier: 1,
    holdings: 48_000_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.immutableholdings.com/",
    datStartDate: "2025-07-01",
    costBasisAvg: 0.10,
    stakingPct: 0.50,
    stakingApy: 0.065,
    quarterlyBurnUsd: 500_000,
    capitalRaisedPipe: 5_000_000,
    avgDailyVolume: 1_000_000,
    marketCap: 10_000_000,
    sharesForMnav: 65_000_000,  // From holdings-history.ts
    leader: "Jordan Fried (CEO, Hedera founding team)",
    strategy: "HBAR treasury via Immutable Asset Management subsidiary.",
    notes: "OTC. Owns NFT.com, HBAR Labs, MyHBARWallet.",
  },
];

// All companies combined
export const allCompanies: Company[] = [
  ...ethCompanies,
  ...btcCompanies,
  ...solCompanies,
  ...hypeCompanies,
  ...bnbCompanies,
  ...taoCompanies,
  ...linkCompanies,
  ...trxCompanies,
  ...xrpCompanies,
  ...zecCompanies,
  ...ltcCompanies,
  ...suiCompanies,
  ...dogeCompanies,
  ...avaxCompanies,
  ...adaCompanies,
  ...hbarCompanies,
];

// Get company by ticker
export function getCompanyByTicker(ticker: string): Company | undefined {
  return allCompanies.find(c => c.ticker.toLowerCase() === ticker.toLowerCase());
}

// Get companies by asset
export function getCompaniesByAsset(asset: string): Company[] {
  return allCompanies.filter(c => c.asset === asset);
}
