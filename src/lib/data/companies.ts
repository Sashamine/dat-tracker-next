import { Company } from "../types";

// Last verified: 2026-01-20 - HUT standalone 10,278, ABTC 5,427

// ETH DAT Companies
export const ethCompanies: Company[] = [
  {
    id: "bmnr",
    name: "Bitmine Immersion",
    ticker: "BMNR",
    secCik: "0001829311",
    asset: "ETH",
    tier: 1,
    holdings: 4_243_338,  // Jan 26, 2026 8-K: acquired 40,302 ETH in past week
    holdingsLastUpdated: "2026-01-25",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226003536/ex99-1.htm",
    datStartDate: "2025-07-01",
    costBasisAvg: 2_839,  // Calculated from purchase history (purchases-history.ts)
    stakingPct: 0.85,
    stakingMethod: "MAVAN validators",
    quarterlyBurnUsd: 2_500_000,
    capitalRaisedAtm: 10_000_000_000,
    capitalRaisedPipe: 615_000_000,
    avgDailyVolume: 800_000_000,
    hasOptions: true,
    sharesForMnav: 455_000_000,  // 455M diluted shares (Q3 2025)
    cashReserves: 682_000_000,  // $682M cash (Jan 25, 2026)
    restrictedCash: 682_000_000,  // Operating capital - not excess
    cashSource: "SEC 8-K Jan 26, 2026",
    cashAsOf: "2026-01-25",
    otherInvestments: 219_000_000,  // $200M Beast Industries + $19M Eightco Holdings (OCTO)
    totalDebt: 0,  // No debt financing - ETH purchases funded via equity (ATM + PIPE)
    debtSource: "SEC 10-Q Q1 FY2026 - no convertibles, no credit facilities drawn",
    debtAsOf: "2025-11-30",
    leader: "Tom Lee (Fundstrat)",
    strategy: "5% of ETH supply goal, staking via MAVAN validators (Q1 2026). Also holds $219M in non-crypto investments (Beast Industries, OCTO) not reflected in mNAV.",
    notes: "Largest ETH treasury. 3.52% of ETH supply. $200M Beast Industries (MrBeast) + $19M Eightco (OCTO) equity investments.",
  },
  {
    id: "sbet",
    name: "SharpLink Gaming",
    ticker: "SBET",
    asset: "ETH",
    tier: 1,
    holdings: 863_424,  // 639,241 native + 224,183 LsETH (Dec 14, 2025)
    holdingsLastUpdated: "2025-12-14",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225028063/ex99-1.htm",
    datStartDate: "2025-05-01",
    costBasisAvg: 3_050,  // Calculated from purchase history (purchases-history.ts)
    website: "https://sharplink.com",
    twitter: "https://twitter.com/SharpLinkGaming",
    secCik: "0001981535",
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
    totalDebt: 0,  // Debt-free per SEC 10-Q Q3 2025 (was $12.8M in 2023, paid off)
    otherInvestments: 26_700_000,  // $26.7M USDC stablecoins (Q3 2025)
    leader: "Joseph Chalom (BlackRock)",
    strategy: "Staking, Linea partnership, tokenized equity via Superstate",
    notes: "#2 ETH treasury. $1.5B buyback program. Trades at ~0.83x mNAV.",
  },
  {
    id: "ethm",
    name: "The Ether Machine",
    ticker: "ETHM",
    secCik: "0002080334",
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
    secCik: "0001710350",
    asset: "ETH",
    tier: 1,
    holdings: 155_227,  // Dec 31, 2025 (Jan 7, 2026 press release)
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/",
    datStartDate: "2025-01-01",
    website: "https://bitdigital.com",
    twitter: "https://twitter.com/Aboringcompany",
    costBasisAvg: 3_045,  // Jan 7, 2026 press release: "total average ETH acquisition price"
    stakingPct: 0.89,  // 138,263 / 155,227 = 89% staked (Jan 7, 2026 PR)
    stakingApy: 0.035,  // 3.5% annualized yield (Jan 7, 2026 PR)
    stakingMethod: "Native staking",
    quarterlyBurnUsd: 8_500_000,
    capitalRaisedAtm: 172_000_000,
    avgDailyVolume: 80_000_000,
    hasOptions: true,
    marketCap: 760_000_000,  // ~$760M (Jan 2026)
    sharesForMnav: 323_792_059,  // Jan 7, 2026 press release (basic shares)
    cashReserves: 179_100_000,  // $179.1M cash (Q3 2025)
    restrictedCash: 179_100_000,  // Operating capital (miner) - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashAsOf: "2025-09-30",
    totalDebt: 207_000_000,  // $165M converts (Oct 2025) + $42M lease liabilities (SEC 10-Q Q3 2025)
    debtSource: "SEC 8-K Oct 2, 2025 (converts) + 10-Q Q3 2025 (leases)",
    debtAsOf: "2025-10-02",
    otherInvestments: 427_300_000,  // WhiteFiber (WYFI) ~27M shares @ ~$15.83 (Jan 7, 2026 PR)
    leader: "Sam Tabar",
    strategy: "89% staked, fully exited BTC. $165M 4% converts due 2030.",
    notes: "Staking yield ~3.5% annualized. $427M WhiteFiber (WYFI) stake - AI infrastructure.",
  },
  {
    id: "btcs",
    name: "BTCS Inc.",
    ticker: "BTCS",
    secCik: "0001436229",
    asset: "ETH",
    tier: 2,
    holdings: 70_500,  // Dec 31, 2025 shareholder letter
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.btcs.com/news-media/2026-shareholder-letter/",
    datStartDate: "2024-01-01",
    website: "https://www.btcs.com",
    twitter: "https://twitter.com/BTCSInc",
    investorRelationsUrl: "https://www.btcs.com/investors/",
    stakingPct: 0.75,
    stakingMethod: "Builder+ validators",
    quarterlyBurnUsd: 1_800_000,
    capitalRaisedAtm: 60_000_000,
    avgDailyVolume: 15_000_000,
    hasOptions: true,
    marketCap: 136_000_000,  // ~$136M (Jan 2026)
    sharesForMnav: 47_149_138,  // BASIC: 46,838,532 (XBRL Nov 10) + 310,606 (Jan 5 8-K grants). Dilutives in dilutive-instruments.ts
    sharesSource: "SEC XBRL Nov 10, 2025 + 8-K Jan 5, 2026",
    sharesAsOf: "2026-01-05",
    leader: "Charles Allen",
    strategy: "ETH 'Bividend,' DeFi/TradFi flywheel, Builder+",
    notes: "Verified 2026-01-29. Q3→Q4: +0.3% HPS growth. Options ITM at ~$2.87 (Jan 2026 price).",
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
    // TODO: No debt - review if cash should be restricted (not subtracted from EV)
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
    holdings: 712_647,  // SEC 8-K Jan 26, 2026 (+2,932 BTC Jan 20-25)
    holdingsLastUpdated: "2026-01-25",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K",
    datStartDate: "2024-01-01",
    website: "https://www.strategy.com",
    twitter: "https://twitter.com/Strategy",
    secCik: "0001050446",  // SEC CIK for EDGAR lookups
    costBasisAvg: 76_037,  // Updated per Jan 26 8-K ($54.19B / 712,647 BTC)
    isMiner: false,
    quarterlyBurnUsd: 15_204_000,  // SEC 10-Q Q3 2025: "Net cash used in operating activities" $45.6M / 3 quarters
    avgDailyVolume: 3_000_000_000,
    hasOptions: true,
    optionsOi: 500_000,  // Deep options market
    // marketCap calculated from sharesForMnav × price (removed static override)
    sharesForMnav: 331_748_000,  // Basic shares outstanding per strategy.com/shares (Jan 25, 2026). Diluted shares (364M) are wrong for market cap calculation.
    capitalRaisedConverts: 7_200_000_000,  // ~$7.2B in convertible notes outstanding
    // Debt: ~$8.2B convertible notes (0%, 0.625%, 0.75%, 0.875% various maturities 2027-2032)
    totalDebt: 8_214_000_000,  // $8.214B per strategy.com/debt (Jan 26, 2026)
    debtSource: "strategy.com/debt (official IR, real-time)",
    debtSourceUrl: "https://www.strategy.com/debt",
    debtAsOf: "2026-01-26",
    // SEC cross-ref: 10-Q Q3 2025 (filed Nov 3, 2025) for quarterly audit
    preferredEquity: 8_382_000_000,  // $8.382B per strategy.com/credit (Jan 26, 2026)
    // Preferred breakdown: STRF $1,284M + STRC $3,379M + STRE $914M + STRK $1,402M + STRD $1,402M
    capitalRaisedAtm: 21_000_000_000,  // 21/21 plan ATM component
    cashReserves: 2_250_000_000,  // $2.25B USD reserves (mNAV Jan 2026)
    restrictedCash: 2_250_000_000,  // Debt service reserves - not excess
    cashSource: "SEC 8-K Jan 5, 2026 (USD Reserve)",
    cashAsOf: "2026-01-04",
    leader: "Michael Saylor (Executive Chairman)",
    strategy: "21/21 Plan: $21B equity + $21B debt for BTC.",
    notes: "712K BTC @ $75K avg. 5 perpetual preferred classes: STRF/STRC/STRE/STRK/STRD. Bitcoin credit company thesis.",
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
    costBasisAvg: 107_607,  // metaplanet.jp/en/analytics (Jan 2026)
    isMiner: false,
    quarterlyBurnUsd: 5_000_000,
    avgDailyVolume: 200_000_000,
    marketCap: 4_010_000_000,  // ~$4.0B (Jan 2026, 1.142B shares × ¥548 ÷ 156 USD/JPY)
    sharesForMnav: 1_118_664_340,  // 1.142B common - 23.6M Mercury converts (¥1000 strike, OTM at ¥540)
    // Debt: Zero-coupon yen-denominated bonds (~¥44B, ~$280M) - no interest payments, principal at maturity
    totalDebt: 280_000_000,  // $280M per TDnet Q3 FY2025 Financial Results (Nov 2025)
    debtSource: "TDnet Q3 FY2025 Financial Results",
    debtSourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    debtAsOf: "2025-09-30",
    cashReserves: 150_000_000,  // ~$150M - calibrated to match mNAV. TODO: extract exact value from quarterly report
    restrictedCash: 150_000_000,  // Debt service reserves (zero-coupon bonds) - not excess
    cashSource: "TDnet Q3 FY2025 Financial Results",
    cashSourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    cashAsOf: "2025-09-30",
    leader: "Simon Gerovich (CEO)",
    strategy: "Japan's BTC treasury leader. Targeting 100K BTC by 2026.",
    notes: "Largest Asian public BTC holder. Zero-interest bonds. Reports BTC Yield.",
    leverageRatio: 1.3,
  },
  {
    id: "xxi",
    name: "Twenty One Capital",
    ticker: "XXI",
    secCik: "0002070457",  // Post-merger CIK (was 0001865602 Cantor SPAC)
    asset: "BTC",
    tier: 1,
    holdings: 43_514,  // Combined: Tether (~31K) + SoftBank (~10K) + other (~2.5K)
    holdingsLastUpdated: "2025-12-09",  // Merger close date
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0002070457&type=8-K",
    // Note: SEC XBRL shows 10,500 BTC (pre-merger entity). 43,514 is post-merger combined holdings.
    datStartDate: "2025-12-09",
    costBasisAvg: 92_902,  // Calculated from purchase history (purchases-history.ts)
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
    ticker: "CEPO",
    secCik: "0001865602",  // Pre-merger SPAC, will become BSTR
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
    holdings: 53_250,  // Sep 30, 2025 - Q3 2025 earnings report (SEC 10-Q shows 52,850)
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001507605&type=10-Q",
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
    cashReserves: 826_392_000,  // SEC 10-Q Q3 2025: $826,392K
    restrictedCash: 12_000_000,  // SEC 10-Q Q3 2025: $12,000K restricted cash
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001507605&type=10-Q",
    cashAsOf: "2025-09-30",
    leader: "Fred Thiel (CEO)",
    strategy: "HODL miner - keeps all mined BTC. 50 EH/s.",
    // Debt: $350M line of credit + ~$2.9B convertible notes (0% 2030 + 2031 + 2032 series)
    // Q3 2025: Issued additional ~$1B in 0% converts
    totalDebt: 3_248_000_000,  // SEC 10-Q Q3 2025 XBRL: LongTermDebt
    debtSource: "SEC 10-Q Q3 2025 XBRL",
    debtSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001507605&type=10-Q",
    debtAsOf: "2025-09-30",
    notes: "Largest US public miner. $350M credit facility + ~$2.9B in 0% convertible notes (2030 + 2031 + 2032 series). Q3 2025 issued ~$1B new converts.",
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
    secCik: "0000827876",  // Verified 2026-01-28 (was incorrectly 0001785459)
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
    costBasisAvg: 101_895,  // Calculated from purchase history (purchases-history.ts)
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
    website: "https://cptlb.com",
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
    dataWarnings: [
      {
        type: "unverified-shares",
        message: "Share counts sourced from mNAV dashboard (cptlb.com/analytics), not primary AMF/Euronext filings. Company lacks public IR infrastructure.",
        severity: "info",
      },
    ],
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
    name: "Nakamoto Inc.",  // Rebranded from KindlyMD/Nakamoto Holdings Jan 21, 2026
    ticker: "NAKA",
    asset: "BTC",
    tier: 1,
    holdings: 5_398,
    holdingsLastUpdated: "2025-11-12",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000149315225024314/ex99-1.htm",
    datStartDate: "2025-05-12",
    costBasisAvg: 118_205,  // SEC 8-K Nov 19, 2025: "weighted average price of $118,204.88"
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
    cashReserves: 24_185_083,  // SEC 10-Q Q3 2025 balance sheet
    // TODO: No debt - review if cash should be restricted (not subtracted from EV)
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001946573&type=10-Q",
    cashAsOf: "2025-09-30",
    secCik: "0001946573",
    leader: "David Bailey (CEO, Bitcoin Magazine)",
    strategy: "First publicly traded Bitcoin conglomerate. Acquires Bitcoin-native companies.",
    notes: "$710M PIPE (largest crypto PIPE ever). Goal: 1M BTC ('one Nakamoto'). Share buyback authorized Dec 2025 as mNAV < 1.",
  },
  {
    id: "djt",
    name: "Trump Media & Technology",
    ticker: "DJT",
    secCik: "0001849635",
    asset: "BTC",
    tier: 1,
    holdings: 11_542,  // Verified: SEC 10-Q Q3 2025 filing (per holdings-history)
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001849635&type=10-Q",
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
    holdings: 4_091,  // Q3 2025 report (Sep 30, 2025) - confirmed same as of Nov 17, 2025
    holdingsLastUpdated: "2025-11-17",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    datStartDate: "2024-01-26",
    costBasisAvg: 68_114,  // Q3 2025 report: "average cost of approximately US$68,114 per unit"
    isMiner: false,
    quarterlyBurnUsd: 2_000_000,
    avgDailyVolume: 20_000_000,
    // Shares: 768,004,730 (Dec 31, 2025 Monthly Return - excluding 2,972,000 treasury shares)
    // Pre-Sep 2025 placement: 711,003,730 → Post-placement: 770,976,730 (+59,973,000 @ HK$6.95)
    // Buybacks: 2,972,000 shares repurchased (held as treasury, not cancelled)
    sharesForMnav: 768_004_730,
    sharesSource: "HKEx Monthly Return Dec 2025 (filed Jan 5, 2026)",
    sharesAsOf: "2025-12-31",
    // FY end: Dec 31 (calendar year)
    // TODO: Extract from annual/interim reports:
    // - Cash reserves
    // - Total debt
    leader: "Dai Zhikang (Chairman & Executive Director)",
    strategy: "Hong Kong's largest BTC treasury. 15.1% BTC Yield (9mo 2025). Active buyback program.",
    notes: "Asia's MicroStrategy. Sep 2025 raised HK$410M via placement for BTC. Dec 2025: 2.4M shares bought back. Treasury shares not cancelled.",
  },
  {
    id: "nxtt",
    name: "Next Technology Holding",
    ticker: "NXTT",
    secCik: "0001784970",
    asset: "BTC",
    tier: 1,
    holdings: 1_015,  // Calculated from SEC 10-Q Q3 2025 XBRL: $98.5M fair value ÷ $97K
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001784970&type=10-Q",
    datStartDate: "2024-06-01",
    costBasisAvg: 65_000,
    isMiner: false,
    quarterlyBurnUsd: 5_000_000,
    avgDailyVolume: 15_000_000,
    sharesForMnav: 2_865_730,  // SEC 10-Q Oct 2025 + 8-K Sep 12 2025 (post 200:1 reverse split)
    strategy: "AI software company with BTC treasury. Actively acquiring via debt/equity.",
    notes: "Formerly WeTrade Group. Shenzhen-based. $500M shelf for BTC acquisitions. 200:1 reverse split Sep 2025.",
  },
  // GNS (Genius Group) removed - AI education company, not beta to BTC
  // HUT (Hut 8) removed - pivoted to AI/HPC infrastructure, not a DAT company
  {
    id: "abtc",
    name: "American Bitcoin",
    ticker: "ABTC",
    secCik: "0001755953",  // Post-merger CIK (was Gryphon Digital Mining)
    asset: "BTC",
    tier: 1,
    holdings: 4_004,  // Nov 5, 2025 - verified PR Newswire
    holdingsLastUpdated: "2025-11-05",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.prnewswire.com/news-releases/american-bitcoin-adds-139-bitcoin-increasing-strategic-reserve-to-4-004-bitcoin-302608175.html",
    datStartDate: "2025-09-03",  // Nasdaq listing after Gryphon merger
    costBasisAvg: 85_000,
    isMiner: true,
    btcMinedAnnual: 2_000,
    quarterlyBurnUsd: 15_000_000,
    avgDailyVolume: 30_000_000,
    hasOptions: true,
    // Shares: 899,489,426 diluted per Q3 2025 10-Q
    sharesForMnav: 899_489_426,
    leader: "Eric Trump, Donald Trump Jr. (Co-Founders)",
    strategy: "Pure-play Bitcoin miner focused on HODL strategy.",
    notes: "80% owned by Hut 8. Merged with Gryphon Sep 2025. SPS metric: 432 satoshis/share (Nov 5).",
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
    secCik: "0000038264",
    asset: "SOL",
    tier: 1,
    holdings: 6_979_967,  // Jan 15, 2026 treasury update
    holdingsLastUpdated: "2026-01-15",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.forwardindustries.com/",
    datStartDate: "2025-09-11",  // $1.65B PIPE closed Sep 11, 2025
    // Fiscal year end: September 30
    costBasisAvg: 232.08,  // $1.59B / 6.85M SOL per SEC XBRL
    stakingPct: 0.99,
    stakingApy: 0.0673,  // 6.73% gross APY per Jan 2026 update
    quarterlyBurnUsd: 3_400_000,
    capitalRaisedPipe: 1_650_000_000,
    // Shares: 86,145,514 basic (SEC 10-K) + 26,359,600 pre-funded warrants @ $0.03 = 112,505,114 FD
    sharesForMnav: 112_505_114,
    avgDailyVolume: 400_000_000,
    hasOptions: true,
    cashReserves: 30_000_000,  // ~$30M operating capital (cash + USDC, Dec 2025)
    restrictedCash: 30_000_000,  // Operating capital - not excess
    cashSource: "Press release Dec 2025",
    cashAsOf: "2025-12-31",
    leader: "Galaxy, Jump Crypto, Multicoin backed",
    strategy: "World's largest SOL treasury, validator infrastructure, DeFi yield",
    notes: "Raised $1.65B PIPE Sep 2025. Debt free. 26.4M pre-funded warrants @ $0.03. First equity on Solana via Superstate.",
  },
  {
    id: "hsdt",
    name: "Solana Company (fka Helius Medical)",
    ticker: "HSDT",
    secCik: "0001610853",
    asset: "SOL",
    tier: 1,
    website: "https://solanacompany.co",
    twitter: "https://x.com/SolanaCompany1",
    holdings: 2_300_000,  // Oct 29, 2025 press release - 2.3M SOL
    holdingsLastUpdated: "2025-10-29",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1610853/000110465925103714/hsdt-20251029xex99d1.htm",
    datStartDate: "2025-05-01",
    costBasisAvg: 227.00,
    stakingPct: 0.95,
    stakingApy: 0.0703,  // 7.03% APY as of Oct 2025
    quarterlyBurnUsd: 12_000_000,
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 75_900_000,  // Q3 2025 10-Q press release: "75.9 million common shares and pre-funded warrants outstanding"
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
    secCik: "0001805526",
    asset: "SOL",
    tier: 1,
    website: "https://defidevcorp.com",
    twitter: "https://x.com/defidevcorp",
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
    // marketCap removed - calculated from sharesForMnav × FMP price
    sharesForMnav: 29_892_800,  // Company press release Jan 5, 2026 (Q4 business update); SEC 8-K Nov 13, 2025 showed 31.4M pre-buyback
    totalDebt: 186_000_000,  // $186M: $134M converts (OTM) + $52M SOL/DeFi loans (defidevcorp.com/dashboard Jan 2026)
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
    secCik: "0001775194",
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
    sharesForMnav: 61_761_756,  // 58.9M (10-Q Sep) + 3.29M (Dec PIPE) - 0.42M (buybacks) = 61.76M
    totalDebt: 200_000_000,  // $200M: $150M convert @$4.25 + $36M convert @$2.39 + $14M other
    cashReserves: 2_200_000,  // $2.2M cash (SEC 10-Q Sep 2025)
    restrictedCash: 2_200_000,  // Operating capital - not excess
    cashSource: "SEC 10-Q Sep 2025",
    cashAsOf: "2025-09-30",
    capitalRaisedPipe: 210_000_000,  // $200M (prior) + $10M (Dec 2025 PIPE)
    avgDailyVolume: 120_000_000,
    hasOptions: true,
    leader: "Arthur Hayes (advisory)",
    strategy: "SOL treasury + consumer brands. 95% staked. Discounted locked token purchases.",
    notes: "$50M buyback approved Nov 2025. Dec 2025: $10M PIPE + 3.29M warrants @$4. Jan 2026: $36M Hivemind convertible for locked SOL. Verified 2026-01-29.",
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
    secCik: "0002078856",
    asset: "HYPE",
    tier: 1,
    holdings: 12_000_000,  // 12M HYPE staked via Anchorage (Dec 4, 2025)
    holdingsLastUpdated: "2025-12-04",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://cryptorank.io/news/feed/hyperliquid-strategies-hype-stake",
    datStartDate: "2025-12-02",
    costBasisAvg: 46.27,
    stakingPct: 1.00,  // 100% staked via Anchorage
    stakingApy: 0.024,  // ~288K HYPE/year on 12M staked
    stakingMethod: "Anchorage Digital",
    quarterlyBurnUsd: 2_000_000,
    capitalRaisedPipe: 583_000_000,
    sharesForMnav: 127_025_563,  // SEC 10-Q filed Dec 8, 2025
    cashReserves: 300_000_000,  // $300M+ cash (Dec 2025)
    restrictedCash: 300_000_000,  // No debt = cash not encumbered, don't subtract from EV
    cashSource: "Trefis Dec 5, 2025 analysis",
    cashAsOf: "2025-12-05",
    totalDebt: 0,
    leader: "David Schamis (CEO), Bob Diamond (Board)",
    strategy: "HYPE treasury via Sonnet merger. 100% staked via Anchorage.",
    notes: "$888M combined assets. $30M buyback. ~288K HYPE projected annual staking yield.",
  },
  {
    id: "hypd",
    name: "Hyperion DeFi (fka Eyenovia)",
    ticker: "HYPD",
    asset: "HYPE",
    tier: 2,
    secCik: "1682639",
    // SEC 10-Q Sep 30, 2025: HYPE digital assets $37.95M = direct holdings only
    // At $26/HYPE (Sep 30 price): $37.95M / $26 = 1,459,615 HYPE
    // Liquid staked HYPE tracked separately in cryptoInvestments
    holdings: 1_459_615,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1682639&type=10-Q",
    datStartDate: "2025-07-01",
    costBasisAvg: 38.25,
    stakingPct: 0,  // Direct holdings not staked (staked tracked in cryptoInvestments)
    stakingApy: 0.05,
    quarterlyBurnUsd: 1_500_000,
    capitalRaisedPipe: 50_000_000,
    // Shares: 8,097,659 common (Nov 10, 2025) + 5,435,897 preferred × 3 conversion = 24.4M FD
    sharesForMnav: 24_400_000,
    sharesSource: "SEC 10-Q Nov 14, 2025 (8.1M common + 16.3M from preferred conversion)",
    sharesAsOf: "2025-11-10",
    cashReserves: 8_223_180,  // SEC 10-Q Sep 30, 2025
    cashSource: "SEC 10-Q Q3 2025",
    cashAsOf: "2025-09-30",
    totalDebt: 7_656_005,  // Notes payable (Avenue loan)
    debtSource: "SEC 10-Q Q3 2025",
    debtAsOf: "2025-09-30",
    leader: "Hyunsu Jung (CEO)",
    strategy: "First US public HYPE treasury. Liquid staking via Kinetiq.",
    notes: "Rebranded from Eyenovia Jul 2025. 1-for-80 reverse split Jan 31, 2025.",
    // Liquid staked HYPE via Kinetiq iHYPE (institutional product)
    // SEC 10-Q Sep 30, 2025: "Digital intangible assets" $35.02M
    // Uses kHYPE exchange rate as proxy (same underlying yield mechanism)
    // Exchange rate fetched dynamically from kHYPE contract
    cryptoInvestments: [
      {
        name: "Kinetiq iHYPE",
        type: "lst",
        underlyingAsset: "HYPE",
        fairValue: 35_020_000,  // SEC 10-Q Sep 30, 2025 "Digital intangible assets"
        sourceDate: "2025-09-30",
        source: "SEC 10-Q Q3 2025",
        sourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1682639&type=10-Q",
        note: "Institutional liquid staking via Kinetiq (HiHYPE wrapper)",
        lstConfigId: "ihype",   // Links to LST config for dynamic rate lookup
        lstAmount: 694_290,     // iHYPE tokens held (derived from SEC fair value / market price)
        exchangeRate: 1.94,     // Static fallback if dynamic rate unavailable
        underlyingAmount: 1_346_922,  // Static fallback (694,290 × 1.94)
      },
    ],
  },
];

// BNB DAT Companies
export const bnbCompanies: Company[] = [
  {
    id: "bnc",
    name: "CEA Industries (BNC)",
    ticker: "BNC",
    secCik: "0001482541",
    asset: "BNB",
    tier: 1,
    holdings: 515_544,  // Jan 28, 2026 investor dashboard
    holdingsLastUpdated: "2026-01-28",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.ceaindustries.com/dashboard.html",
    datStartDate: "2025-06-01",
    costBasisAvg: 855.00,  // Investor dashboard: "Avg. Cost Basis $855.00"
    // No staking disclosed - holding spot BNB
    quarterlyBurnUsd: 3_000_000,
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 52_800_000,  // ~49.5M PIPE + 2.5M pre-existing + ~0.8M from warrant exercises (Jan 2026 dashboard implied)
    cashReserves: 77_500_000,  // $77.5M cash (Oct 2025)
    restrictedCash: 77_500_000,  // Treat as restricted - actively deployed for BNB purchases + buybacks
    cashSource: "FY Q2 2026 earnings",
    cashAsOf: "2025-10-31",
    // totalDebt: 0 - "minimal debt" per press release
    leader: "David Namdar (CEO), YZi Labs backed",
    strategy: "World's largest BNB treasury. Target 1% of BNB supply.",
    notes: "$500M PIPE Aug 2025. $250M buyback authorized. YZi Labs owns 7%. 6,500 BNB from airdrops.",
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
    sharesForMnav: 15_674_052,  // SEC 20-F FY2024: 12,815,143 Class A + 2,858,909 Class B
    sharesSource: "SEC 20-F FY2024",
    sharesSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1872302&type=20-F",
    sharesAsOf: "2024-12-31",
    // Note: Check 6-K filings for more recent share counts (possible issuances after FY2024)
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
    sharesForMnav: 7_000_000,  // ~6.85M per SEC DEF 14A Oct 2025; Series E convertible ($8 strike) out of money
    sharesAsOf: "2025-10-31",
    sharesSource: "SEC DEF 14A Nov 17, 2025 (6,848,912 shares as of Oct 31)",
    secCik: "1571934",
    leader: "Joshua Silverman (Executive Chairman)",
    strategy: "First pure-play Bittensor treasury company",
    notes: "Formerly Synaptogenix. DCG is investor. Series E Preferred convertible at $8 (out of money at ~$4.80).",
  },
  {
    id: "xtaif",
    name: "xTAO Inc",
    ticker: "XTAIF",
    asset: "TAO",
    tier: 1,
    holdings: 59_962,
    holdingsLastUpdated: "2025-11-25",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.newswire.ca/news-releases/xtao-provides-update-on-tao-holdings-816100068.html",
    datStartDate: "2025-07-22",
    costBasisAvg: 350.00,
    stakingPct: 1.00,
    stakingApy: 0.10,
    quarterlyBurnUsd: 400_000,
    capitalRaisedPipe: 30_100_000,  // $22.78M IPO (Jul 2025) + $7.3M Off the Chain (Nov 2025)
    sharesForMnav: 38_031_285,  // 28,552,195 shares + 9,479,090 pre-funded warrants (auto-convert)
    sharesAsOf: "2025-09-30",
    sharesSource: "SEDAR+ MD&A Sep 30, 2025 (page 11: shares, page 5: warrants)",
    lowLiquidity: true,  // Canadian OTC - limited data feed coverage
    leader: "Karia Samaroo",
    strategy: "Validator operations and TAO treasury accumulation",
    notes: "TSX Venture Exchange (XTAO.U). World's largest public TAO holder. Off the Chain Capital is major investor.",
  },
  {
    id: "twav",
    name: "TaoWeave (fka Oblong)",
    ticker: "TWAV",
    asset: "TAO",
    tier: 2,
    holdings: 24_382,  // Dec 10, 2025 8-K: "increased its TAO holdings to 24,382 tokens"
    holdingsLastUpdated: "2025-12-10",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/746210/0001437749-25-037490-index.html",
    datStartDate: "2025-06-01",
    costBasisAvg: 384.00,
    stakingPct: 1.00,
    stakingApy: 0.10,
    quarterlyBurnUsd: 150_000,
    capitalRaisedAtm: 7_500_000,
    sharesForMnav: 3_207_210,  // SEC 10-Q Nov 13, 2025 (as of Nov 10, 2025)
    sharesAsOf: "2025-11-10",
    sharesSource: "SEC 10-Q Q3 2025 (filed Nov 13, 2025)",
    secCik: "746210",
    cashReserves: 3_737_000,  // Sep 30, 2025 10-Q
    // TODO: No debt - review if cash should be restricted (not subtracted from EV)
    cashSource: "SEC 10-Q Q3 2025",
    cashAsOf: "2025-09-30",
    leader: "Peter Holst (President & CEO)",
    strategy: "Decentralized AI treasury strategy via TAO accumulation",
    notes: "Nasdaq: TWAV (changed from OBLG Dec 2025). 100% staked with BitGo.",
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
    sharesForMnav: 6_905_000,  // 6.53M Class A + 0.37M Class B = 6.9M per SEC DEF 14A Jan 7, 2026
    sharesAsOf: "2025-12-31",
    sharesSource: "SEC DEF 14A Jan 7, 2026 (Record Date Dec 31, 2025)",
    secCik: "1627282",
    leader: "John C. Loeffler II (CEO)",
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
    website: "https://srmentertainment.com",
    twitter: "https://x.com/tron_inc",
    investorRelationsUrl: "https://srmentertainment.com/investor-relations",
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
    // TODO: No debt - review if cash should be restricted (not subtracted from EV)
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
    holdings: 20_226,  // SEDAR+ FY2025 audited annual (Aug 31, 2025)
    holdingsLastUpdated: "2025-08-31",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www.sedarplus.ca/csa-party/service/create.html?targetAppCode=csa-party&service=searchDocuments",
    datStartDate: "2024-06-01",
    costBasisAvg: 80.00,
    stakingPct: 0.042,
    stakingApy: 0.03,
    quarterlyBurnUsd: 200_000,
    capitalRaisedAtm: 100_000_000,
    capitalRaisedPipe: 3_286_080,  // $2.5M Jul 2025 + $786K Dec 2025
    avgDailyVolume: 500_000,
    // SEDAR+ profile: 000044736 (for automated lookups)
    // Dec 9, 2025: 26,930,164 (Aug 31) + 4,624,000 (Dec placement) = 31,554,164
    sharesForMnav: 31_554_164,  // SEDAR+ FY2025 + Dec 9, 2025 private placement
    sharesAsOf: "2025-12-09",
    sharesSource: "SEDAR+ audited annual + Note 12 subsequent events (Dec 9 placement)",
    leader: "Tomek Antoniak (CEO)",
    strategy: "Target 1M LTC by 2026. Validator operations.",
    notes: "Canadian (CSE: LUXX). Charlie Lee + David Schwartz on advisory. 1:10 reverse split Mar 21, 2025. All dilutive instruments (14.1M) OTM at current price. ⚠️ Canadian disclosure: No 8-K equivalent for routine treasury updates - holdings data from quarterly/annual SEDAR+ filings only (less frequent than US filers).",
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
    // TODO: No debt - review if cash should be restricted (not subtracted from EV)
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
    sharesForMnav: 1_500_000,  // Post 1:60 reverse split Jan 20, 2026 (was 88.6M -> 1.5M)
    sharesAsOf: "2026-01-20",
    sharesSource: "SEC 6-K Jan 20, 2026 (1:60 reverse split)",
    totalDebt: 16_338_506,  // $10M Series A-1 + $5M Series B-1 + $1.34M Series C-1 convertible notes
    debtSource: "SEC 6-K Jan 20, 2026",
    debtAsOf: "2026-01-20",
    secCik: "1735556",
    leader: "Jinghai Jiang (CEO)",
    strategy: "Quarterly DOGE acquisitions via $500M facility.",
    notes: "Nasdaq listed. 1:60 reverse split Jan 20, 2026. $16.3M convertible debt outstanding.",
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
    holdings: 13_871_000,  // ⚠️ Dashboard only - not SEC verified until Q4 10-K
    holdingsLastUpdated: "2026-01-28",
    holdingsSource: "company-dashboard",  // Not SEC - PIPE closed after Q3 10-Q period
    holdingsSourceUrl: "https://analytics-avaxone.theblueprint.xyz/",
    totalDebt: 1_414_415,  // SEC 10-Q Sep 30, 2025 (legacy debentures, pre-PIPE)
    datStartDate: "2025-11-05",  // PIPE closed Nov 5, 2025 (name change from AgriFORCE)
    costBasisAvg: 11.73,
    stakingPct: 0.90,  // 8-K Jan 28, 2026: "more than 90% of AVAX holdings staked"
    stakingApy: 0.08,
    quarterlyBurnUsd: 1_000_000,
    capitalRaisedAtm: 40_000_000,
    capitalRaisedPipe: 219_000_000,  // $219M PIPE Nov 2025 ($145M cash + $73.7M AVAX)
    avgDailyVolume: 15_000_000,
    marketCap: 193_000_000,
    sharesForMnav: 93_112_148,  // 10-Q Nov 14, 2025 cover page
    sharesAsOf: "2025-11-14",
    sharesSource: "SEC 10-Q Nov 14, 2025",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1826397/000149315225023464/form10-q.htm",
    secCik: "1826397",
    strategy: "Regulated AVAX exposure for US capital markets.",
    notes: "Nasdaq listed. $40M buyback program (649K repurchased thru Jan 25). Hivemind asset manager. 6.1M pre-funded warrants ITM.",
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
    secCik: "0001905459",
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
