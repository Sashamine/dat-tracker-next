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
    holdings: 4_203_036,
    holdingsLastUpdated: "2026-01-20",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.prnewswire.com/news-releases/bitmine-immersion-technologies-bmnr-announces-eth-holdings-reach-4-203-million-tokens-and-total-crypto-and-total-cash-holdings-of-14-5-billion-302665064.html",
    datStartDate: "2025-07-01",
    stakingPct: 0.85,
    stakingMethod: "MAVAN validators",
    quarterlyBurnUsd: 2_500_000,
    capitalRaisedAtm: 10_000_000_000,
    capitalRaisedPipe: 615_000_000,
    avgDailyVolume: 800_000_000,
    hasOptions: true,
    sharesForMnav: 455_000_000,  // 455M diluted shares (Q3 2025)
    cashReserves: 979_000_000,  // $979M cash (Jan 20, 2026)
    restrictedCash: 979_000_000,  // Operating capital - not excess
    cashSource: "Press release Jan 2026",
    cashAsOf: "2026-01-20",
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
    restrictedCash: 11_100_000,  // Operating capital - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashAsOf: "2025-09-30",
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
    holdings: 155_227,  // Jan 7, 2026 - company announcement
    holdingsLastUpdated: "2026-01-07",
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
    sharesForMnav: 324_000_000,  // SEC 10-Q Q3 2025 (diluted)
    cashReserves: 179_100_000,  // $179.1M cash (Q3 2025)
    restrictedCash: 179_100_000,  // Operating capital (miner) - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashAsOf: "2025-09-30",
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
    holdings: 70_500,  // Dec 31, 2025 shareholder letter
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.btcs.com/news-media/2026-shareholder-letter/",
    datStartDate: "2024-01-01",
    stakingPct: 0.75,
    stakingMethod: "Builder+ validators",
    quarterlyBurnUsd: 1_800_000,
    capitalRaisedAtm: 60_000_000,
    avgDailyVolume: 15_000_000,
    hasOptions: true,
    marketCap: 136_000_000,  // ~$136M (Jan 2026)
    sharesForMnav: 47_075_189,  // BASIC shares from 10-Q Q3 2025. Dilution (options, convertibles) calculated dynamically via dilutive-instruments.ts
    strategy: "ETH 'Bividend,' DeFi/TradFi flywheel, Builder+",
    dataWarnings: [
      {
        type: "equity-sale",
        message: "8-K Jan 5: Unregistered equity sale - share count may change",
        filingDate: "2026-01-05",
        filingUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229&type=8-K",
        severity: "warning",
      },
    ],
  },
  {
    id: "game",
    name: "GameSquare",
    ticker: "GAME",
    asset: "ETH",
    tier: 1,
    secCik: "1714562",
    // Direct ETH holdings only: $4,020,415 / $2,500 = 1,608 ETH (SEC 10-Q Sep 30, 2025)
    // Most exposure is via Dialectic fund - tracked separately in cryptoInvestments
    holdings: 1_608,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1714562&type=10-Q",
    datStartDate: "2025-07-01",
    stakingPct: 0,  // Direct holdings not staked - yield is via Dialectic fund
    quarterlyBurnUsd: 5_000_000,
    capitalRaisedAtm: 30_000_000,
    // Shares: 98,380,767 (SEC 10-Q Sep 30) - 3,535,574 buybacks (Oct-Jan) = 94,845,193
    sharesForMnav: 94_845_193,
    sharesSource: "SEC 10-Q Sep 30 (98.4M) - 3.54M buybacks through Jan 6, 2026",
    sharesAsOf: "2026-01-06",
    cashReserves: 6_012_219,  // SEC 10-Q Sep 30, 2025
    cashSource: "SEC 10-Q Q3 2025",
    cashAsOf: "2025-09-30",
    // Note: Convertible debt fully converted to equity. Preferred stock: $5.15M liquidation value
    preferredEquity: 5_150_000,  // Series A Preferred
    avgDailyVolume: 10_000_000,
    leader: "Justin Kenna (CEO)",
    strategy: "$250M ETH treasury via Dialectic. 7.84% yield funds buybacks.",
    notes: "Most ETH exposure via Dialectic Medici fund, not direct custody. Buyback: 3.54M shares.",
    // Indirect crypto exposure via fund investment
    cryptoInvestments: [
      {
        name: "Dialectic Medici ETH Fund",
        type: "fund",
        underlyingAsset: "ETH",
        fairValue: 64_539_714,  // SEC 10-Q Sep 30, 2025 - "Investment in ETH Fund"
        sourceDate: "2025-09-30",
        source: "SEC 10-Q Q3 2025",
        sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1714562&type=10-Q",
        note: "ETH yield fund via Dialectic platform - generates 7.84% yield for buybacks",
      },
    ],
  },
  {
    id: "fgnx",
    name: "FG Nexus",
    ticker: "FGNX",
    asset: "ETH",
    tier: 1,
    holdings: 37_594,  // Jan 21, 2026 press release - sold more for buybacks
    holdingsLastUpdated: "2026-01-21",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/news-release/2026/01/21/3222681/0/en/FG-Nexus-Provides-Update-on-Common-and-Preferred-Share-Buyback-Programs-and-ETH-Holdings.html",
    datStartDate: "2025-07-30",
    secCik: "1591890",
    stakingPct: 0.80,
    stakingMethod: "Native staking",
    quarterlyBurnUsd: 2_000_000,
    capitalRaisedPipe: 200_000_000,
    avgDailyVolume: 10_000_000,
    marketCap: 110_000_000,  // ~$110M (Jan 2026)
    sharesForMnav: 33_600_000,  // Jan 21, 2026 press release (after 9.9M buybacks)
    sharesSource: "Press release Jan 21, 2026",
    sharesAsOf: "2026-01-20",
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
    holdings: 709_715,  // strategy.com + mNAV.com Jan 21, 2026
    holdingsLastUpdated: "2026-01-21",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.strategy.com/",
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
    // marketCap calculated from sharesForMnav × price (removed static override)
    sharesForMnav: 362_606_000,  // mNAV.com fully diluted shares Jan 21, 2026
    capitalRaisedConverts: 7_200_000_000,  // ~$7.2B in convertible notes outstanding
    // Debt: ~$7.2B convertible notes (0%, 0.625%, 0.75%, 0.875% various maturities 2027-2032), down from $10B after redemptions
    totalDebt: 8_200_000_000,  // $8.2B after note redemptions (Q4 2025)
    debtSource: "SEC 10-Q Q4 2025",
    debtAsOf: "2025-12-31",
    preferredEquity: 13_000_000_000,  // $13B per strategy.com API (Jan 2026)
    capitalRaisedAtm: 21_000_000_000,  // 21/21 plan ATM component
    cashReserves: 2_250_000_000,  // $2.25B USD reserves (mNAV Jan 2026)
    restrictedCash: 2_250_000_000,  // Debt service reserves - not excess
    cashSource: "mNAV.com",
    cashAsOf: "2026-01-21",
    leader: "Michael Saylor (Executive Chairman)",
    strategy: "21/21 Plan: $21B equity + $21B debt for BTC.",
    notes: "709K BTC @ $75K avg. STRK/STRF 8% perpetual preferred. Bitcoin credit company thesis.",
    leverageRatio: 1.5, // ~$21B debt provides leveraged BTC exposure via converts
  },
  {
    id: "3350t",
    name: "Metaplanet",
    ticker: "3350.T",
    asset: "BTC",
    tier: 1,
    holdings: 35_102,  // Dec 30, 2025: purchased 4,279 BTC bringing total to 35,102
    holdingsLastUpdated: "2025-12-30",
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
    sharesForMnav: 1_118_664_340,  // 1.142B common - 23.6M Mercury converts (¥1000 strike, OTM at ¥540)
    // Debt: Zero-coupon yen-denominated bonds (~¥44B, ~$280M) - no interest payments, principal at maturity
    totalDebt: 280_000_000,  // $280M per metaplanet.jp/analytics (Jan 2026)
    debtSource: "metaplanet.jp/analytics",
    debtAsOf: "2026-01-21",
    cashReserves: 150_000_000,  // ~$150M - calibrated to match metaplanet.jp mNAV (~1.24x). TODO: verify from filing
    restrictedCash: 150_000_000,  // Debt service reserves (zero-coupon bonds) - not excess
    cashSource: "metaplanet.jp/analytics",
    cashAsOf: "2026-01-21",
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
    // marketCap calculated from sharesForMnav × price (removed static override)
    // DUAL-CLASS: 346,548,153 Class A + 304,842,759 Class B = 651,390,912 total
    sharesForMnav: 651_390_912,  // Total shares (both classes)
    // Debt: $486.5M 1% convertible senior secured notes due 2030, collateralized by 16,116 BTC (~3:1 ratio)
    totalDebt: 486_500_000,
    debtSource: "SEC 8-K Dec 2025",
    debtAsOf: "2025-12-09",
    cashReserves: 119_300_000,  // ~$119.3M net cash at Dec 2025 closing
    restrictedCash: 119_300_000,  // Debt service reserves - not excess
    cashSource: "SEC 8-K Dec 2025",
    cashAsOf: "2025-12-09",
    leader: "Jack Mallers (CEO)",
    strategy: "BTC treasury + Bitcoin-native financial services.",
    notes: "Tether/SoftBank/Mallers. Secured converts at 33% LTV. 3rd largest corporate BTC holder.",
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
    holdings: 53_250,  // Q3 2025 earnings report
    holdingsLastUpdated: "2025-11-04",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://ir.mara.com/news-events/press-releases/detail/1409/mara-announces-third-quarter-2025-results",
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
    cashReserves: 826_000_000,  // $826M per mNAV.com Jan 2026
    restrictedCash: 826_000_000,  // Operating capital (miner) - not excess
    cashSource: "mNAV.com",
    cashAsOf: "2026-01-21",
    leader: "Fred Thiel (CEO)",
    strategy: "HODL miner - keeps all mined BTC. 50 EH/s.",
    // Debt: $1B 0% converts due 2030 (Nov 2024) + $950M 0% converts due 2032 (Jul 2025) + earlier 1% notes
    totalDebt: 3_640_000_000,  // $3.64B per mNAV.com Jan 2026
    debtSource: "mNAV.com",
    debtAsOf: "2026-01-21",
    notes: "Largest US public miner. $1.95B in 0% convertible notes (2030 + 2032 series).",
  },
  {
    id: "riot",
    name: "Riot Platforms",
    ticker: "RIOT",
    asset: "BTC",
    tier: 1,
    holdings: 18_005,  // Jan 7, 2026 - sold 1,818 BTC in Dec 2025
    holdingsLastUpdated: "2026-01-07",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.riotplatforms.com/riot-announces-december-2025-production-and-operations-updates/",
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
    // Note: RIOT reports "unrestricted cash" separately from restricted cash in SEC filings
    cashReserves: 330_700_000,  // $330.7M unrestricted cash (Q3 2025)
    restrictedCash: 330_700_000,  // Operating capital (miner) - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashAsOf: "2025-09-30",
    leader: "Jason Les (CEO)",
    strategy: "HODL miner + treasury. Converts fund BTC buys. 1 GW Corsicana.",
    // Debt: $594M 0.75% convertible notes due 2030 (Dec 2024) + $200M Coinbase BTC-backed credit facility
    totalDebt: 794_000_000,
    debtSource: "SEC 10-Q + press releases",
    debtAsOf: "2025-12-31",
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
    sharesForMnav: 255_750_361,  // SEC DEF 14A Jan 22, 2026 (record date Jan 9, 2026)
    cashReserves: 43_000_000,  // $43M cash (Sep 2025)
    restrictedCash: 43_000_000,  // Operating capital (miner) - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashAsOf: "2025-09-30",
    leader: "Zach Bradford (CEO)",
    strategy: "Efficient US miner. 50 EH/s. DAM derivatives program.",
    // Debt: $550M 0% converts due 2030 (Dec 2024) + $1.15B 0% converts due 2032 (Nov 2025) = $1.7B total
    totalDebt: 1_700_000_000,  // $550M (2030) + $1.15B (2032) convertible notes
    debtSource: "SEC filings Dec 2024 + Nov 2025",
    debtAsOf: "2025-11-13",
    notes: "$1.7B total converts: $550M due 2030 + $1.15B due 2032. $400M BTC-backed credit (largely undrawn).",
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
    marketCap: 1_110_000_000,  // ~$1.11B per Stock Analysis (Jan 2026)
    sharesForMnav: 1_247_436_814,  // SEC DEF 14C Jan 16, 2026: 1.05B Class A + 198M Class B
    cashReserves: 77_780_000,  // Combined cash (Strive + Semler)
    restrictedCash: 77_780_000,  // Operating capital - not excess
    cashSource: "SEC 8-K Jan 2026",
    cashAsOf: "2026-01-16",
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
    holdings: 1_057,  // Q3 2025 10-Q: Total BTC = $120.5M fair value (~987 held + 70 collateral)
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
    datStartDate: "2024-12-01",
    secCik: "1662684",
    costBasisAvg: 97_000,
    isMiner: false,
    quarterlyBurnUsd: 4_000_000,
    avgDailyVolume: 30_000_000,
    hasOptions: true,
    // marketCap calculated from sharesForMnav × price (removed static override)
    sharesForMnav: 45_674_420,  // SEC 10-Q Q3 2025 (as of Nov 14, 2025)
    sharesSource: "SEC 10-Q Q3 2025",
    sharesAsOf: "2025-11-14",
    totalDebt: 3_800_000,  // Coinbase credit facility loan - SEC 10-Q Q3 2025
    debtSource: "SEC 10-Q Q3 2025",
    debtAsOf: "2025-09-30",
    cashReserves: 20_600_000,  // SEC 10-Q Q3 2025 (Sep 30, 2025)
    restrictedCash: 20_600_000,  // Earmarked for BTC purchases per 90% policy - not excess cash
    cashSource: "SEC 10-Q Q3 2025",
    cashAsOf: "2025-09-30",
    leader: "Michael Mo (CEO)",
    strategy: "Bitcoin First Company. 90% of excess cash to BTC. Reports BTC Yield.",
    notes: "NASA supplier. 291% BTC Yield YTD. ATM paused Dec 2025 through Jun 2026. 70 BTC pledged as collateral for Coinbase loan.",
  },
  {
    id: "altbg",
    name: "The Blockchain Group",
    ticker: "ALTBG",
    asset: "BTC",
    tier: 2,
    holdings: 2_823,  // AMF filing Nov 25, 2025
    holdingsLastUpdated: "2025-11-25",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2025/11/FCACT077244_20251125.pdf",
    datStartDate: "2024-12-01",
    costBasisAvg: 85_000,
    isMiner: false,
    quarterlyBurnUsd: 2_000_000,
    avgDailyVolume: 10_000_000,
    marketCap: 200_000_000,
    sharesForMnav: 226_884_068,  // Basic shares per mNAV.com Jan 2026. Diluted: ~392M (via convertibles)
    strategy: "French BTC treasury company (Capital B). EUR300M ATM program.",
    notes: "Euronext Paris listed. Europe's Strategy equivalent. Data via AMF API.",
  },
  {
    id: "h100st",
    name: "H100 Group",
    ticker: "H100.ST",
    asset: "BTC",
    tier: 2,
    holdings: 1_046,  // Jan 2, 2026 shareholder letter confirms 1,046 BTC
    holdingsLastUpdated: "2026-01-02",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.h100.group/",  // Official website shows ₿1,046.66
    datStartDate: "2025-05-22",  // First BTC purchase May 22, 2025
    costBasisAvg: 90_000,
    isMiner: false,
    quarterlyBurnUsd: 1_000_000,
    avgDailyVolume: 5_000_000,
    marketCap: 62_000_000,  // SEK 645M / 10.4 = $62M (Jan 23, 2026)
    sharesForMnav: 335_250_237,  // Official IR page: 335,250,237 shares
    sharesSource: "h100.group/investor-relations/shares (official)",
    sharesAsOf: "2026-01-23",
    leader: "Sander Andersen (Executive Chairman), Johannes Wiik (CEO)",
    strategy: "Swedish BTC treasury company. Nordic Strategy equivalent.",
    notes: "NGM Nordic SME listed. ISK-eligible. Adam Back invested SEK 492M. Acquiring Future Holdings AG (Switzerland).",
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
    // marketCap calculated from sharesForMnav × price (removed static override)
    sharesForMnav: 511_555_864,  // SEC 10-Q Nov 2025: 439.85M shares + 71.7M pre-funded warrants = 511.56M fully diluted
    // Debt: $210M Kraken BTC-backed loan only - Yorkville converts redeemed Oct 2025 via Two Prime, then refinanced Dec 2025
    totalDebt: 210_000_000,  // Kraken loan Dec 2025 (replaced Two Prime which replaced Yorkville)
    debtSource: "Kraken credit facility Dec 2025",
    debtAsOf: "2025-12-31",
    cashReserves: 24_200_000,  // $24.2M per nakamoto.com/dashboard (mNAV.com)
    // restrictedCash: 0 - cash is free, subtracted from EV
    cashSource: "nakamoto.com/dashboard",
    cashAsOf: "2026-01-24",
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
    holdings: 15_000,  // Jan 2026 - was 11,542
    holdingsLastUpdated: "2026-01-21",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.theblock.co/treasuries/djt",
    datStartDate: "2025-05-01",
    costBasisAvg: 100_000,
    isMiner: false,
    quarterlyBurnUsd: 10_000_000,
    capitalRaisedPipe: 2_500_000_000,
    avgDailyVolume: 200_000_000,
    hasOptions: true,
    // marketCap calculated from sharesForMnav × price (removed static override)
    sharesForMnav: 279_997_636,  // SEC 10-Q Q3 2025 (Nov 5, 2025)
    // Debt: $1B 0% convertible senior secured notes due 2030, part of $2.5B private placement (May 2025)
    totalDebt: 1_000_000_000,  // $1B zero-coupon converts
    debtSource: "SEC 8-K May 2025",
    debtAsOf: "2025-05-29",
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
    holdings: 4_091,  // Sep 2025 after HK$370M placement purchase
    holdingsLastUpdated: "2025-09-18",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/0923/2025092301140.pdf",
    datStartDate: "2024-01-26",
    costBasisAvg: 58_628,
    isMiner: false,
    quarterlyBurnUsd: 2_000_000,
    avgDailyVolume: 20_000_000,
    marketCap: 500_000_000,
    sharesForMnav: 729_120_000,  // Stock Analysis Jan 2026 (after Sep 2025 ~60M share placement)
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
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001784970&type=10-Q",
    datStartDate: "2024-06-01",
    costBasisAvg: 65_000,
    isMiner: false,
    quarterlyBurnUsd: 5_000_000,
    avgDailyVolume: 15_000_000,
    sharesForMnav: 4_082_556,  // Jan 2026 per TipRanks/Morningstar (post-split + equity issuances)
    strategy: "AI software company with BTC treasury. Actively acquiring via debt/equity.",
    notes: "Formerly WeTrade Group. Shenzhen-based. $500M shelf for BTC acquisitions. 200:1 reverse split Sep 2025.",
  },
  // GNS (Genius Group) removed - AI education company, not beta to BTC
  // HUT (Hut 8) removed - pivoted to AI/HPC infrastructure, not a DAT company
  {
    id: "abtc",
    name: "American Bitcoin",
    ticker: "ABTC",
    asset: "BTC",
    tier: 1,
    holdings: 5_427,  // Jan 2, 2026 - company announcement
    holdingsLastUpdated: "2026-01-02",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.prnewswire.com/news-releases/american-bitcoin-adds-139-bitcoin-increasing-strategic-reserve-to-4-004-bitcoin-302608175.html",
    datStartDate: "2025-06-01",
    costBasisAvg: 85_000,
    isMiner: true,
    btcMinedAnnual: 2_000,
    quarterlyBurnUsd: 15_000_000,
    avgDailyVolume: 30_000_000,
    hasOptions: true,
    marketCap: 800_000_000,
    sharesForMnav: 920_000_000,
    leader: "Eric Trump, Donald Trump Jr. (Co-Founders)",
    strategy: "Pure-play Bitcoin miner focused on HODL strategy.",
    notes: "80% owned by Hut 8. Active BTC accumulation - added 1,064 BTC in Dec 2025.",
  },
  // CORZ (Core Scientific) removed - pivoted to AI/HPC infrastructure, not a DAT company
  // BTDR (Bitdeer) removed - primarily a miner/ASIC manufacturer, not a DAT company
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
    sharesForMnav: 86_459_465,  // SEC 10-K Dec 11, 2025 (as of Sep 30, 2025, post $1.65B PIPE)
    avgDailyVolume: 400_000_000,
    hasOptions: true,
    cashReserves: 30_000_000,  // ~$30M operating capital (cash + USDC, Dec 2025)
    restrictedCash: 30_000_000,  // Operating capital - not excess
    cashSource: "Press release Dec 2025",
    cashAsOf: "2025-12-31",
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
    holdings: 2_300_000,  // Oct 29, 2025 press release - 2.3M SOL
    holdingsLastUpdated: "2025-10-29",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://ir.heliusmedical.com/news-releases/news-release-details/solana-company-nasdaqhsdt-formerly-helius-continues-amassing-sol",
    datStartDate: "2025-05-01",
    costBasisAvg: 227.00,
    stakingPct: 0.95,
    stakingApy: 0.0703,  // 7.03% APY as of Oct 2025
    quarterlyBurnUsd: 12_000_000,
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 84_130_257,  // Nov 4, 2025 investor update - includes pre-funded + penny warrants (exercisable at $0.0001)
    avgDailyVolume: 150_000_000,
    hasOptions: true,
    leader: "Pantera Capital, Summer Capital",
    strategy: "SOL treasury via Anchorage Digital custody",
    notes: "Partnered with Solana Foundation. sharesForMnav includes pre-funded warrants.",
  },
  {
    id: "dfdv",
    name: "DeFi Development Corp",
    ticker: "DFDV",
    asset: "SOL",
    tier: 1,
    holdings: 2_221_329,  // Q4 2025 business update
    holdingsLastUpdated: "2026-01-01",
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
    sharesForMnav: 29_892_800,  // Company press release Jan 5, 2026 (Q4 business update); SEC 8-K Nov 13, 2025 showed 31.4M pre-buyback
    cashReserves: 9_000_000,  // ~$9M cash, stablecoins, and liquid tokens
    restrictedCash: 9_000_000,  // Operating capital - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashAsOf: "2025-09-30",
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
    holdings: 2_174_583,  // Jan 5, 2026 - was 2,106,989
    holdingsLastUpdated: "2026-01-05",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/news-release/2026/01/07/3214451/0/en/Upexi-Moves-to-High-Return-Treasury-Strategy.html",
    datStartDate: "2025-04-01",
    costBasisAvg: 157.66,
    stakingPct: 0.95,
    stakingApy: 0.08,
    quarterlyBurnUsd: 2_500_000,
    capitalRaisedAtm: 100_000_000,
    sharesForMnav: 59_000_000,  // SEC 10-Q Sep 2025: 58.9M basic. Convertibles ($150M@$4.25, $36M@$2.39) OUT of money at ~$2.12
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
    secCik: "1846839",
    holdings: 523_134,  // 426,619 direct + 96,515 via jitoSOL (Dec 2025 monthly update)
    holdingsLastUpdated: "2026-01-06",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://solstrategies.io/press-releases/sol-strategies-december-2025-monthly-business-update",
    datStartDate: "2024-06-01",
    costBasisAvg: 130.00,
    stakingPct: 0.85,
    stakingApy: 0.065,
    quarterlyBurnUsd: 1_200_000,
    capitalRaisedAtm: 50_000_000,
    sharesForMnav: 25_300_567,  // Post 1:8 reverse split (Aug 2025): 22,999,841 (40-F) + 2,300,726 (Jan 7 credit facility)
    sharesSource: "SEC 40-F FY2025 + Jan 7 2026 credit facility conversion",
    avgDailyVolume: 50_000_000,
    leader: "Leah Wald (CEO)",
    strategy: "Validator operations, VanEck staking provider, STKESOL LST",
    notes: "3.35M SOL AuD. 1:8 reverse split Aug 2025 for NASDAQ listing.",
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
    holdings: 12_500_000,  // ~12.5M HYPE from business combination
    holdingsLastUpdated: "2025-12-02",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/2078856/000149315225025886/form8-k.htm",
    datStartDate: "2025-12-02",
    costBasisAvg: 46.27,
    stakingPct: 0.80,
    stakingApy: 0.05,
    quarterlyBurnUsd: 2_000_000,
    capitalRaisedPipe: 583_000_000,
    sharesForMnav: 127_025_563,  // SEC 10-Q filed Dec 8, 2025
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
    holdings: 1_427_178,  // Jan 2026 - corrected from 1.7M
    holdingsLastUpdated: "2026-01-21",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.theblock.co/treasuries/hypd",
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
    name: "CEA Industries (BNC)",
    ticker: "BNC",
    asset: "BNB",
    tier: 1,
    holdings: 512_000,  // 502,441 + 9,491 on exchanges (Oct 31, 2025)
    holdingsLastUpdated: "2025-10-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.globenewswire.com/news-release/2025/12/15/3205902/0/en/CEA-Industries-BNC-Reports-FY-Q2-2026-Earnings-Results.html",
    datStartDate: "2025-06-01",
    costBasisAvg: 870.00,
    stakingPct: 0.50,
    stakingApy: 0.03,
    quarterlyBurnUsd: 3_000_000,
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 44_062_938,  // SEC 10-Q Dec 12, 2025
    cashReserves: 77_500_000,  // $77.5M unencumbered cash (Oct 2025)
    // restrictedCash: 0 - cash is free
    cashSource: "FY Q2 2026 earnings",
    cashAsOf: "2025-10-31",
    // totalDebt: 0 - "minimal debt" per press release
    leader: "David Namdar (CEO), YZi Labs backed",
    strategy: "World's largest BNB treasury. Target 1% of BNB supply.",
    notes: "$500M PIPE Aug 2025. $250M buyback authorized. YZi Labs owns 7%.",
  },
  // WINT (Windtree) removed - Biopharma company, not beta to BNB
  {
    id: "na",
    name: "Nano Labs",
    ticker: "NA",
    asset: "BNB",
    tier: 2,
    holdings: 130_000,  // Dec 31, 2025 6-K: "over 130,000 BNB"
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1872302&type=6-K",
    datStartDate: "2025-06-01",
    secCik: "1872302",
    costBasisAvg: 600.00,
    stakingPct: 0.30,
    stakingApy: 0.03,
    quarterlyBurnUsd: 5_000_000,
    capitalRaisedConverts: 500_000_000,
    totalDebt: 500_000_000,  // $500M convertible notes (360-day maturity, 0% interest)
    sharesForMnav: 20_700_000,  // ~20.7M Class A shares (companiesmarketcap.com Jan 2026)
    sharesSource: "companiesmarketcap.com",
    sharesAsOf: "2026-01-01",
    leader: "Jianping Kong (CEO)",
    strategy: "BNB treasury - target $1B, 5-10% of BNB supply. First US-listed BNB anchor.",
    notes: "$25M buyback authorized.",
    secondaryCryptoHoldings: [
      { asset: "BTC", amount: 1_000, note: "passive hold from convertible deal" },
    ],
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
    holdings: 24_382,  // Dec 10, 2025 - was 21,943
    holdingsLastUpdated: "2025-12-10",
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
    holdings: 677_000_000,  // Jan 23, 2026 8-K: "more than 677 million TRX in total"
    holdingsLastUpdated: "2026-01-23",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1956744&type=8-K",
    datStartDate: "2025-07-01",
    secCik: "1956744",
    costBasisAvg: 0.28,
    stakingPct: 0.81,
    stakingApy: 0.045,
    quarterlyBurnUsd: 500_000,
    capitalRaisedPipe: 310_000_000,
    avgDailyVolume: 50_000_000,
    sharesForMnav: 274_382_064,  // Dec 29, 2025 8-K: after $18M Justin Sun investment
    sharesSource: "SEC 8-K Dec 29, 2025",
    sharesAsOf: "2025-12-29",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956744/000149315225029225/0001493152-25-029225-index.html",
    leader: "Richard Miller (CEO)",
    strategy: "TRX treasury via JustLend staking, Justin Sun backing",
    notes: "First US public company to hold its blockchain's native token. Formerly SRM Entertainment.",
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
    holdings: 290_062,  // Dec 30, 2025 8-K: 290,062.67 ZEC
    holdingsLastUpdated: "2025-12-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1509745/0001104659-25-125039-index.html",
    datStartDate: "2025-10-08",  // Oct 8, 2025 PIPE closing date
    secCik: "1509745",
    costBasisAvg: 334.41,  // Per Dec 30, 2025 8-K
    quarterlyBurnUsd: 3_100_000,
    capitalRaisedPipe: 58_880_000,  // Oct 2025 PIPE gross proceeds
    sharesForMnav: 137_420_344,  // Basic (56.6M) + Pre-funded warrants (80.8M) per SEC filings
    sharesSource: "SEC 10-Q Q3 2025 + 8-K Oct 9, 2025 (basic + pre-funded warrants)",
    sharesAsOf: "2025-11-10",
    leader: "Douglas Onsi (CEO)",
    strategy: "Target 5% of ZEC supply (~540K ZEC). Winklevoss backed.",
    notes: "Formerly Leap Therapeutics. 1.76% of ZEC supply. ~72M common warrants outstanding at $0.5335.",
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
    secCik: "1262104",
    holdings: 929_548,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.litestrategy.com/dashboard/",
    datStartDate: "2025-07-01",
    costBasisAvg: 107.58,
    quarterlyBurnUsd: 3_600_000,
    capitalRaisedPipe: 100_000_000,
    avgDailyVolume: 15_000_000,
    sharesForMnav: 36_769_677,  // DEF 14A Record Date Dec 15, 2025
    sharesSource: "SEC DEF 14A Dec 30, 2025",
    sharesAsOf: "2025-12-15",
    cashReserves: 10_113_000,  // $10.1M cash (SEC 10-Q Q1 FY2026)
    cashSource: "SEC 10-Q Q1 FY2026",
    cashAsOf: "2025-09-30",
    // No interest-bearing debt per SEC 10-Q Q1 FY2026 (only $1.07M operating liabilities)
    leader: "Justin File (CEO)",
    strategy: "First US-listed LTC treasury. GSR as treasury manager.",
    notes: "Formerly MEI Pharma. Charlie Lee on board. Dashboard: litestrategy.com/dashboard",
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
    holdings: 108_098_436,  // Jan 7, 2026 8-K treasury update
    holdingsLastUpdated: "2026-01-07",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000165495426000201/suig_8k.htm",
    datStartDate: "2025-08-01",
    secCik: "1425355",
    costBasisAvg: 2.23,
    stakingPct: 1.0,
    stakingApy: 0.022,
    quarterlyBurnUsd: 1_000_000,
    capitalRaisedAtm: 500_000_000,
    capitalRaisedPipe: 450_000_000,
    avgDailyVolume: 20_000_000,
    marketCap: 160_000_000,
    sharesForMnav: 80_900_000,  // SEC 8-K Jan 8, 2026: "fully adjusted shares issued and outstanding as of January 7, 2026"
    sharesAsOf: "2026-01-07",
    sharesSource: "SEC 8-K Jan 8, 2026",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000165495426000201/suig_8k.htm",
    leader: "Douglas Polinsky (CEO)",
    strategy: "Only public company with Sui Foundation relationship",
    notes: "Formerly Mill City Ventures. ~2.9% of SUI supply. Q4 2025: repurchased 7.8M shares.",
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
    secCik: "1956741",
    holdings: 733_100_000,  // Nov 12, 2025 press release (Q1 FY2026 results)
    holdingsLastUpdated: "2025-11-12",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/news-release/2025/11/13/3187485/0/en/CleanCore-Solutions-Reports-Fiscal-First-Quarter-2026-Financial-Results-and-Provides-Update-on-its-DOGE-Treasury-Strategy.html",
    datStartDate: "2025-09-05",
    costBasisAvg: 0.23,  // $163.8M fair value / 703.6M DOGE at Sep 30
    quarterlyBurnUsd: 500_000,
    capitalRaisedPipe: 175_000_000,
    avgDailyVolume: 10_000_000,
    marketCap: 150_000_000,
    cashReserves: 12_900_000,  // Sep 30, 2025 10-Q
    cashSource: "SEC 10-Q Q1 FY2026",
    cashAsOf: "2025-09-30",
    totalDebt: 0,  // Minimal liabilities per 10-Q
    sharesForMnav: 201_309_022,  // SEC 10-Q Q1 FY2026 cover page (Nov 10, 2025)
    sharesSource: "SEC 10-Q Q1 FY2026 cover page",
    sharesAsOf: "2025-11-10",
    leader: "Clayton Adams (CEO)",
    strategy: "Official Dogecoin Treasury. Target 1B DOGE (5% circulating supply).",
    notes: "NYSE American. Q1 FY2026: 703.6M DOGE at $163.8M fair value. Partnership with House of Doge, 21Shares, Robinhood.",
  },
  {
    id: "tbh",
    name: "Brag House / House of Doge",
    ticker: "TBH",
    asset: "DOGE",
    tier: 1,
    secCik: "1903595",
    // IMPORTANT: TBH (Brag House) is a gaming company merging with House of Doge
    // The 730M DOGE is held by House of Doge (private), NOT by TBH currently
    // Post-merger: ~663M new shares to HOD + ~50M existing TBH = ~713M shares
    holdings: 0,  // TBH has no DOGE - it's a gaming company pre-merger
    holdingsLastUpdated: "2026-01-26",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001903595",
    datStartDate: "2025-09-05",  // House of Doge treasury started Sep 5, 2025
    pendingMerger: true,  // SPAC-style merger not yet closed
    expectedHoldings: 730_000_000,  // HOD holds 730M DOGE per Dec 18, 2025 shareholder letter
    mergerExpectedClose: "2026-Q1",
    costBasisAvg: 0.20,
    quarterlyBurnUsd: 1_000_000,
    capitalRaisedPipe: 200_000_000,
    avgDailyVolume: 5_000_000,
    marketCap: 8_000_000,  // TBH pre-merger market cap ~$8M (10.8M shares × ~$0.75)
    sharesForMnav: 10_800_000,  // TBH pre-merger shares (Nov 2025 10-Q)
    leader: "Alex Spiro (Chairman post-merger), Marco Margiotta (HOD CEO)",
    strategy: "Official Dogecoin treasury partner. Payments ecosystem.",
    notes: "TBH is gaming company merging with House of Doge. HOD holds 730M DOGE via CleanCore (ZONE) agreement. $1.09B post-merger valuation. Jan 2026: Nasdaq compliance notice (stock <$1).",
  },
  {
    id: "btog",
    name: "Bit Origin",
    ticker: "BTOG",
    asset: "DOGE",
    tier: 2,
    holdings: 70_543_745,  // Aug 2025 - was 40.5M (missed PIPE)
    holdingsLastUpdated: "2025-08-11",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/news-release/2025/08/12/3131772/0/en/Bit-Origin-Surpasses-70-Million-Dogecoin-DOGE-Holdings-Following-Private-Placement.html",
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
    datStartDate: "2025-11-05",  // PIPE closed Nov 5, 2025 (name change from AgriFORCE)
    costBasisAvg: 11.73,
    stakingPct: 0.80,
    stakingApy: 0.08,
    quarterlyBurnUsd: 1_000_000,
    capitalRaisedAtm: 40_000_000,
    capitalRaisedPipe: 219_000_000,  // $219M PIPE Nov 2025 ($145M cash + $73.7M AVAX)
    avgDailyVolume: 15_000_000,
    marketCap: 193_000_000,
    sharesForMnav: 93_112_148,  // 8-K Nov 6, 2025: shares after PIPE closing
    sharesAsOf: "2025-11-05",
    sharesSource: "SEC 8-K Nov 6, 2025",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1826397/000149315225021006/form8-k.htm",
    secCik: "1826397",
    strategy: "Regulated AVAX exposure for US capital markets.",
    notes: "Nasdaq listed. $40M share repurchase program. Hivemind asset manager.",
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
