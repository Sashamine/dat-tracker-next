import { Company } from "../types";
import { MSTR_PROVENANCE, MSTR_PROVENANCE_DEBUG } from "./provenance/mstr";
import { BMNR_PROVENANCE, BMNR_PROVENANCE_DEBUG, getBMNRProvenance, estimateBMNRShares } from "./provenance/bmnr";
import { MARA_PROVENANCE, MARA_PROVENANCE_DEBUG, getMARAProvenance } from "./provenance/mara";
import { DJT_PROVENANCE, DJT_PROVENANCE_DEBUG, getDJTProvenance } from "./provenance/djt";

// Last verified: 2026-01-20 - HUT standalone 10,278, ABTC 5,427

// ETH DAT Companies
export const ethCompanies: Company[] = [
  {
    // =========================================================================
    // BMNR - All core financials from provenance/bmnr.ts (SEC-verified)
    // =========================================================================
    id: "bmnr",
    name: "Bitmine Immersion",
    ticker: "BMNR",
    secCik: "0001829311",
    website: "https://www.bitminetech.io/",
    twitter: "BitMNR",
    asset: "ETH",
    tier: 1,
    // HOLDINGS: from provenance (8-K filings)
    holdings: BMNR_PROVENANCE.holdings?.value || 4_325_738,
    holdingsLastUpdated: BMNR_PROVENANCE_DEBUG.holdingsDate,
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226005707/ex99-1.htm#:~:text=4%2C325%2C738%20ETH",
    datStartDate: "2025-07-01",
    // COST BASIS: from provenance (10-Q)
    costBasisAvg: BMNR_PROVENANCE.costBasisAvg?.value || 4_002,
    costBasisSource: "SEC-verified (provenance): 10-Q Q1 FY2026",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226002084/form10-q.htm#:~:text=cost%20basis",
    costBasisAsOf: BMNR_PROVENANCE_DEBUG.balanceSheetDate,
    stakingPct: 0.670,  // 2,897,459 staked / 4,325,738 total per Feb 9 8-K
    stakingApy: 0.0281,  // CESR (Composite Ethereum Staking Rate) per Quatrefoil
    stakingMethod: "3 staking providers; MAVAN (Made in America Validator Network) launching Q1 2026",
    stakingSource: "SEC 8-K Feb 9, 2026 (ex99-1): 2,897,459 ETH staked of 4,325,738 total.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226005707/ex99-1.htm#:~:text=2%2C897%2C459",
    stakingAsOf: "2026-02-08",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    quarterlyBurnUsd: 1_000_000,  // ~$4M/yr based on Q1 FY2025 baseline G&A ($959K/qtr)
    burnSource: "SEC 10-Q: Q1 G&A $223M was mostly one-time capital raising fees; recurring mgmt ~$50K/yr",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226002084/form10-q.htm#:~:text=General%20and%20administrative",
    burnAsOf: "2025-11-30",  // 10-Q Q1 FY2026 filing
    burnEstimated: true,
    burnMethodology: `Based on Q1 FY2025 (pre-ETH pivot) G&A of $959K/quarter, annualized to ~$4M/year. Current Q1 FY2026 G&A of $223M excluded as mostly one-time capital raising costs. Sources: [10-Q Q1 FY2025 G&A](/filings/bmnr/2026-01-13?type=10-q#operating-burn) | [MD&A disclosure on one-time costs](/filings/bmnr/2026-01-13?type=10-q#operating-burn-mda)`,
    // No cashObligations fields needed - burn-only companies show Operating Burn card only
    capitalRaisedAtm: 10_000_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000164117225021194/bmnr_s3asr.htm#:~:text=%2410%2C000%2C000%2C000",
    capitalRaisedPipe: 615_000_000,
    capitalRaisedPipeSource: "SEC 8-K Jul 2025 - PIPE offering",
    capitalRaisedPipeSourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315225011270/ex99-1.htm#:~:text=PIPE",
    avgDailyVolume: 800_000_000,
    hasOptions: true,
    // SHARES: estimated (10-Q baseline + ATM estimate)
    sharesForMnav: estimateBMNRShares().totalEstimated,
    sharesSource: "Estimated: 10-Q baseline + ATM (ETH × price ÷ stock price)",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226002084/form10-q.htm#:~:text=454%2C862%2C451",
    sharesAsOf: new Date().toISOString().split("T")[0], // Today (estimated)
    // CASH: from provenance (8-K)
    cashReserves: BMNR_PROVENANCE.cashReserves?.value || 595_000_000,
    restrictedCash: BMNR_PROVENANCE.cashReserves?.value || 595_000_000,  // Operating capital - not excess
    cashSource: "SEC-verified (provenance): 8-K Feb 9, 2026",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1829311/000149315226005707/ex99-1.htm#:~:text=%24595%20million",
    cashAsOf: BMNR_PROVENANCE_DEBUG.holdingsDate,
    otherInvestments: 219_000_000,  // $200M Beast Industries + $19M Eightco Holdings (OCTO)
    // DEBT: from provenance ($0)
    totalDebt: BMNR_PROVENANCE.totalDebt?.value || 0,
    debtSource: "SEC-verified (provenance): No debt financing",
    debtAsOf: BMNR_PROVENANCE_DEBUG.balanceSheetDate,
    leader: "Tom Lee (Fundstrat)",
    strategy: "5% of ETH supply goal, staking via MAVAN validators (Q1 2026). Asset-light treasury model with minimal recurring costs (~$50K/yr ETH management fees per 10-Q). Q1 FY2026 G&A of $223M was mostly one-time capital raising costs (legal, advisory, banking fees for $8B+ ATM program).",
    notes: "Largest ETH treasury. 3.58% of ETH supply. Core financials from provenance/bmnr.ts (SEC-verified). $200M Beast Industries + $19M Eightco (OCTO) equity investments not in mNAV.",
  },
  {
    id: "sbet",
    name: "Sharplink, Inc.",  // Renamed from SharpLink Gaming (Feb 3, 2026)
    ticker: "SBET",
    asset: "ETH",
    tier: 1,
    holdings: 863_424,  // 639,241 native + 224,183 LsETH (Dec 14, 2025)
    holdingsLastUpdated: "2025-12-14",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225028063/ex99-1.htm",
    // Provenance tracking (see provenance/sbet.ts for full audit trail)
    holdingsAccession: "0001493152-25-028063",
    holdingsNative: 639_241,      // Native ETH held directly
    holdingsLsETH: 224_183,       // Lido staked ETH (as-if-redeemed)
    stakingRewardsCumulative: 9_241,  // 3,350 native + 5,891 LsETH rewards
    provenanceFile: "provenance/sbet.ts",
    lastVerified: "2026-02-11",
    nextExpectedFiling: "Q4 2025 10-K (Mar 2026)",
    datStartDate: "2025-05-01",
    costBasisAvg: 3_696,  // SEC Q3 2025 10-Q: $3.022B total cost / 817,747 ETH-equivalent units
    costBasisSource: "SEC 10-Q Q3 2025: Native ETH $2,304,908,135 (580,841 units) + LsETH $717,419,123 (236,906 units)",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/",
    website: "https://sharplink.com",
    twitter: "https://twitter.com/SharpLinkInc",  // Renamed from SharpLinkGaming (Feb 3, 2026)
    secCik: "0001981535",
    // tokenizedAddress removed — was a pump.fun meme token, not an official tokenized stock
    stakingPct: 1.0,  // "100%" (Jul 1 8-K) / "substantially all" (Aug-Dec 8-Ks) / "nearly 100%" (Q2 earnings)
    stakingMethod: "Native staking + Lido LsETH (liquid staking)",
    stakingSource: "SEC 8-K Dec 17, 2025: 639,241 native ETH + 224,183 LsETH as-if-redeemed. Cumulative rewards: 9,241 ETH (3,350 native + 5,891 LsETH)",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225028063/form8-k.htm",
    stakingAsOf: "2025-12-14",
    quarterlyBurnUsd: 2_850_000,
    burnSource: "SEC 10-Q (filed 2025-05-15): NetCashUsedInOperatingActivities $514,085 (2025-01-01 to 2025-03-31)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225010881/",
    burnAsOf: "2025-03-31",
    capitalRaisedAtm: 2_000_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001981535&type=S-3",
    avgDailyVolume: 300_000_000,
    hasOptions: true,
    marketCap: 2_050_000_000,  // ~$2.05B (Jan 2026)
    sharesForMnav: 196_690_000,  // 196.69M basic shares (matches SBET dashboard methodology)
    sharesSource: "SEC 10-Q (filed 2025-11-12): EntityCommonStockSharesOutstanding = 196,693,191 as of 2025-11-12",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/",
    sharesAsOf: "2025-11-12",
    cashReserves: 11_100_000,  // $11.1M cash (Q3 2025)
    restrictedCash: 11_100_000,  // Operating capital - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/",
    cashAsOf: "2025-09-30",
    totalDebt: 0,  // Debt-free per SEC 10-Q Q3 2025 (was $12.8M in 2023, paid off)
    debtSource: "SEC 10-Q Q3 2025",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315224012028/",
    debtAsOf: "2025-09-30",
    otherInvestments: 26_700_000,  // $26.7M USDC stablecoins (Q3 2025)
    leader: "Joseph Chalom (BlackRock)",
    strategy: "Staking, Linea partnership, tokenized equity via Superstate",
    notes: "#2 ETH treasury. $1.5B buyback program. Trades at ~0.83x mNAV.",
  },
  {
    id: "ethm",
    name: "The Ether Machine",
    ticker: "ETHM",
    currency: "CAD",  // Toronto Stock Exchange
    secCik: "0002080334",
    asset: "ETH",
    tier: 1,
    holdings: 590_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www.sedarplus.ca/landingpage/",
    datStartDate: "2025-10-01",
    // stakingPct removed - SPAC pending, needs verification
    stakingMethod: "Native staking",
    quarterlyBurnUsd: 800_000,
    burnSource: "SPAC - minimal operating expenses pre-merger",
    burnSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=2080334&type=8-K",
    burnAsOf: "2025-09-30",
    burnEstimated: true,  // No XBRL available
    avgDailyVolume: 100_000_000,
    hasOptions: true,
    marketCap: 230_000_000,  // ~$230M (Jan 2026)
    sharesForMnav: 60_000_000,  // From holdings-history.ts
    sharesSource: "OTC Markets company page",
    sharesSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=2080334&type=8-K",
    sharesAsOf: "2025-09-30",
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
    costBasisAvg: 3_045,
    costBasisSource: "PR Jan 7, 2026 - 'total average ETH acquisition price'",
    costBasisSourceUrl: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/",
    stakingPct: 0.89,  // 138,263 / 155,227 = 89% staked
    stakingApy: 0.035,  // 3.5% annualized yield
    stakingMethod: "Native staking (via Figment, with EigenLayer restaking)",
    stakingSource: "PR Jan 7, 2026: 138,263/155,227 ETH staked (89%). Confirmed by SEC 10-Q Nov 14, 2025: $3.79M staking revenue (9mo).",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1710350/000121390025110383/ea0263546-10q_bitdigital.htm",
    stakingAsOf: "2025-12-31",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    quarterlyBurnUsd: 8_500_000,
    burnSource: "SEC 10-Q (filed 2025-05-15): NetCashUsedInOperatingActivities $17,401,915 (2025-01-01 to 2025-03-31)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1710350/000121390025044155/",
    burnAsOf: "2025-03-31",
    capitalRaisedAtm: 172_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001710350&type=S-3",
    avgDailyVolume: 80_000_000,
    hasOptions: true,
    marketCap: 760_000_000,  // ~$760M (Jan 2026)
    sharesForMnav: 323_792_059,  // Jan 7, 2026 press release (basic shares)
    sharesSource: "SEC 10-Q (filed 2025-11-14): EntityCommonStockSharesOutstanding = 323,674,831 as of 2025-11-10",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1710350/000121390025110383/",
    sharesAsOf: "2025-11-10",
    cashReserves: 179_100_000,  // $179.1M cash (Q3 2025)
    restrictedCash: 179_100_000,  // Operating capital (miner) - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1710350/000121390025110383/",
    cashAsOf: "2025-09-30",
    totalDebt: 207_000_000,  // $165M converts (Oct 2025) + $42M lease liabilities (SEC 10-Q Q3 2025)
    debtSource: "SEC 8-K Oct 2, 2025 (converts) + 10-Q Q3 2025 (leases)",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1710350/000121390023033401/",
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
    stakingPct: 0.98,  // $129.2M staked / ($129.2M staked + $2.3M treasury) = 98% of non-DeFi crypto
    stakingMethod: "Ethereum validator nodes (NodeOps)",
    stakingSource: "SEC 10-Q Nov 13, 2025: 'Crypto assets - staked $129,171,906' vs 'Crypto assets - treasury $2,304,873'. Operates ETH validator nodes.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1436229/000149315225022359/form10-q.htm",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    quarterlyBurnUsd: 611_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1436229/000164117225010401/",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 60_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001436229&type=S-3",
    avgDailyVolume: 15_000_000,
    hasOptions: true,
    marketCap: 136_000_000,  // ~$136M (Jan 2026)
    sharesForMnav: 47_149_138,  // BASIC: 46,838,532 (XBRL Nov 10) + 310,606 (Jan 5 8-K grants). Dilutives in dilutive-instruments.ts
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1436229/000149315225022359/",
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
    quarterlyBurnUsd: 6_171_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1714562/000164117225010979/",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 30_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001714562&type=S-3",
    // Shares: 98,380,767 (SEC 10-Q Sep 30) - 3,535,574 buybacks (Oct-Jan) = 94,845,193
    sharesForMnav: 94_845_193,
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1714562/000149315225023589/",
    sharesSource: "SEC 10-Q Sep 30 (98.4M) - 3.54M buybacks through Jan 6, 2026",
    sharesAsOf: "2026-01-06",
    cashReserves: 6_012_219,  // SEC 10-Q Sep 30, 2025
    // TODO: No debt - review if cash should be restricted (not subtracted from EV)
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1714562/000149315225023589/",
    cashAsOf: "2025-09-30",
    // Note: Convertible debt fully converted to equity. Preferred stock: $5.15M liquidation value
    preferredEquity: 5_150_000,  // Series A-1 Preferred (3,433 shares @ $1.50 liquidation preference on as-converted basis)
    preferredSource: "SEC 10-Q Q3 2025: PreferredStockValue $5,150,000 (3,433 Series A-1 shares)",
    preferredSourceUrl: "https://www.sec.gov/Archives/edgar/data/1714562/000149315225023589/",
    preferredAsOf: "2025-09-30",
    avgDailyVolume: 10_000_000,
    leader: "Justin Kenna (CEO)",
    website: "https://www.gamesquare.com",
    twitter: "https://x.com/GSQHoldings",
    investorRelationsUrl: "https://www.gamesquare.com/#investors",
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
    // VERIFIED: SEC 8-K Jan 21, 2026
    holdings: 37_594,
    holdingsLastUpdated: "2026-01-21",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315226003101/ex99-1.htm",
    datStartDate: "2025-07-30",
    secCik: "1591890",
    // stakingPct removed - FGNX "intends to stake its ETH" per 8-K Jan 2026, but no confirmed active staking yet
    stakingMethod: "Native staking (planned)",
    // VERIFIED: 10-Q Q3 2025 - 9mo burn $4.75M = $1.58M/qtr
    quarterlyBurnUsd: 1_580_000,
    burnSource: "SEC 10-Q Q3 2025",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315225023550/form10-q.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 200_000_000,
    avgDailyVolume: 10_000_000,
    // VERIFIED: SEC 8-K Jan 21, 2026 - 33.6M common + 0.8M preferred
    sharesForMnav: 33_600_000,
    sharesSource: "SEC 8-K Jan 21, 2026",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315226003101/ex99-1.htm",
    sharesAsOf: "2026-01-20",
    // VERIFIED: SEC 10-Q Q3 2025 balance sheet
    cashReserves: 7_500_000,
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315225023550/form10-q.htm",
    cashAsOf: "2025-09-30",
    // VERIFIED: SEC 8-K Jan 21, 2026 - $1.9M total debt
    totalDebt: 1_900_000,
    debtSource: "SEC 8-K Jan 21, 2026",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315226003101/ex99-1.htm",
    debtAsOf: "2026-01-20",
    leader: "Kyle Cerminara (CEO); Galaxy, Kraken, Hivemind, DCG backed",
    strategy: "Premier ETH pure-play treasury. $5B fundraise plan.",
    notes: "Formerly Fundamental Global. Peaked at 50K ETH Sep 2025, sold some for buybacks. 0.8M preferred shares also outstanding.",
  },
  // ICG (Intchains) removed - ASIC chip company, not beta to ETH
];

// BTC DAT Companies
export const btcCompanies: Company[] = [
  {
    // =========================================================================
    // MSTR - All core financials from provenance/mstr.ts (SEC-verified)
    // =========================================================================
    id: "mstr",
    name: "Strategy (fka MicroStrategy)",
    ticker: "MSTR",
    asset: "BTC",
    tier: 1,
    // HOLDINGS: from provenance (mstr-holdings-verified.ts)
    holdings: MSTR_PROVENANCE.holdings?.value || 713_502,
    holdingsLastUpdated: MSTR_PROVENANCE_DEBUG.holdingsDate,
    holdingsSource: "sec-filing",
    holdingsSourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K`,
    datStartDate: "2024-01-01",
    website: "https://www.strategy.com",
    twitter: "https://twitter.com/Strategy",
    secCik: "0001050446",
    // COST BASIS: from provenance
    costBasisAvg: MSTR_PROVENANCE.costBasisAvg?.value || 76_052,
    costBasisSource: "SEC 8-K (provenance-tracked)",
    costBasisSourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K`,
    isMiner: false,
    // QUARTERLY BURN: from provenance
    quarterlyBurnUsd: MSTR_PROVENANCE.quarterlyBurn?.value || 15_200_000,
    burnAsOf: "2025-11-03",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312525262568/",
    avgDailyVolume: 3_000_000_000,
    hasOptions: true,
    // SHARES: from provenance (10-Q baseline + 8-K ATM + 10-Q employee equity + Class B)
    sharesForMnav: MSTR_PROVENANCE.sharesOutstanding?.value || 332_431_000,
    sharesSource: "Company (strategy.com) + SEC audit (10-Q + ATM 8-Ks). See provenance for dual-source breakdown.",
    sharesSourceUrl: "https://www.strategy.com/shares",
    sharesAsOf: MSTR_PROVENANCE_DEBUG.holdingsDate,
    // CONVERTS: 10-Q Q3 2025 Note 7
    capitalRaisedConverts: 7_274_000_000,
    capitalRaisedConvertsSource: "SEC 10-Q Q3 2025: Cash flow statement - proceeds from convertible notes",
    capitalRaisedConvertsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312525262568/d893246d10q.htm#:~:text=Convertible%20Senior%20Notes",
    // DEBT: Company current (strategy.com/debt) + SEC audit (Q3 10-Q)
    totalDebt: MSTR_PROVENANCE.totalDebt?.value || 8_214_000_000,
    debtSource: "Company (strategy.com/debt $8,214M notional) + SEC (Q3 10-Q $8,174M book). Δ$40M = OID.",
    debtSourceUrl: "https://www.strategy.com/debt",
    debtAsOf: "2026-02-12",
    // PREFERRED: Company current (strategy.com/credit) + SEC audit (Q3 10-Q + 8-Ks)
    preferredEquity: MSTR_PROVENANCE.preferredEquity?.value || 8_383_000_000,
    preferredSource: "Company (strategy.com/credit $8,383M) + SEC (Q3 10-Q $5,786M + post-Q3 8-Ks)",
    preferredSourceUrl: "https://www.strategy.com/credit",
    preferredAsOf: "2026-02-12",
    // Cash obligations from SEC 8-K Dec 1, 2025
    preferredDividendAnnual: 780_000_000,
    debtInterestAnnual: 43_000_000,
    cashObligationsAnnual: 823_000_000,
    cashObligationsSource: "SEC 8-K Dec 1, 2025: USD Reserve $1.44B = 21 months of Dividends",
    cashObligationsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312525303157/",
    cashObligationsAsOf: "2025-11-28",
    // ATM PROGRAM: S-3 shelf
    capitalRaisedAtm: 21_000_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration (21/21 plan equity component)",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312524254726/d866aboringprospectus.htm#:~:text=%2421%2C000%2C000%2C000",
    // CASH: from provenance
    cashReserves: MSTR_PROVENANCE.cashReserves?.value || 2_250_000_000,
    cashSource: "SEC-verified (provenance): 8-K USD Reserve",
    cashSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K",
    cashAsOf: "2026-01-04",
    leader: "Michael Saylor (Executive Chairman)",
    strategy: "21/21 Plan: $21B equity + $21B debt for BTC.",
    notes: "Dual-source provenance: company-disclosed (strategy.com Reg FD) + SEC-verified (10-Q/8-K). See provenance/mstr.ts for full audit trail.",
  },
  {
    id: "3350t",
    name: "Metaplanet",
    ticker: "3350.T",
    currency: "JPY",
    asset: "BTC",
    tier: 1,
    holdings: 35_102,  // Dec 30, 2025: purchased 4,279 BTC bringing total to 35,102
    holdingsLastUpdated: "2025-12-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://metaplanet.jp/en/analytics",
    datStartDate: "2024-04-01",
    website: "https://metaplanet.jp",
    twitter: "https://twitter.com/Metaplanet_JP",
    costBasisAvg: 107_607,
    costBasisSource: "company-website",
    costBasisSourceUrl: "https://metaplanet.jp/en/analytics",
    isMiner: false,
    quarterlyBurnUsd: 5_000_000,  // Estimated from Q3 FY2025 operating expenses
    burnSource: "TDnet Q3 FY2025 Financial Results (estimated)",
    burnSourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 200_000_000,
    marketCap: 4_010_000_000,  // ~$4.0B (Jan 2026, 1.142B shares × ¥548 ÷ 156 USD/JPY)
    sharesForMnav: 1_143_204_340,  // 1.167B common (1,142,274,340 + 24,530,000 Feb 13 placement) - 23.6M Mercury converts (¥1000 strike, OTM at ¥540)
    sharesSource: "TDnet: 1,142,274,340 (Jan 29, 2026) + 24,530,000 new shares (Feb 13, 2026 3rd-party allotment) - 23.6M Mercury converts",
    sharesSourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    sharesAsOf: "2026-02-13",
    // Debt: Zero-coupon yen-denominated bonds - no interest payments, principal at maturity
    totalDebt: 280_000_000,  // ~$280M (~¥43B) — multiple sources report deleveraging from $355M. Pending confirmation in Feb 16 annual report.
    debtSource: "Metaplanet Analytics Dashboard + CoinDesk (Feb 6, 2026). Part of $137M raise allocated to credit facility repayment.",
    debtSourceUrl: "https://metaplanet.jp/en/analytics",
    debtAsOf: "2026-02-06",
    cashReserves: 18_000_000,  // Q3 FY2025: ¥2.77B (¥1,488M cash + ¥1,286M deposits) = ~$18M USD
    restrictedCash: 0,  // No restricted cash indicated in Q3 filing
    cashSource: "TDnet Q3 FY2025 Financial Results",
    cashSourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    cashAsOf: "2025-09-30",
    leader: "Simon Gerovich (CEO)",
    strategy: "Japan's BTC treasury leader. Targeting 210K BTC by 2027 ('555 Million Plan'). Uses moving-strike warrants + preferred shares for capital efficiency. Currently raising via 25th series warrants (Jan 2026) for BTC purchases.",
    notes: "Largest Asian public BTC holder. Reports BTC Yield (growth in BTC per share). Capital strategy: issue equity when mNAV > 1x, pivot to preferred shares when near 1x. $355M BTC-backed credit facility.",
    // Key strategy documents (TDnet disclosures):
    // - 2025-2027 BITCOIN PLAN (Jun 6, 2025): 210K BTC target, warrant framework
    // - Phase II: Bitcoin Platform (Oct 1, 2025): BTC income generation for preferred dividends
    // - Capital Allocation Policy (Oct 28, 2025): mNAV-based capital decisions, credit facility, buybacks
    // - Q3 2025 Earnings Presentation (Nov 14, 2025): Synthesizes all strategies
    strategyDocs: [
      { title: "Q3 2025 Earnings Presentation", date: "2025-11-14", url: "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20251114/20251112598935.pdf" },
      { title: "Capital Allocation Policy", date: "2025-10-28", url: "https://metaplanet.jp/en/shareholders/disclosures" },
      { title: "Phase II: Bitcoin Platform", date: "2025-10-01", url: "https://metaplanet.jp/en/shareholders/disclosures" },
      { title: "2025-2027 BITCOIN PLAN", date: "2025-06-06", url: "https://metaplanet.jp/en/shareholders/disclosures" },
    ],
  },
  {
    id: "xxi",
    name: "Twenty One Capital",
    ticker: "XXI",
    secCik: "0002070457",  // Post-merger CIK (was 0001865602 Cantor SPAC)
    website: "https://xxi.money",
    twitter: "xxicapital",
    asset: "BTC",
    tier: 1,
    holdings: 43_514,  // Combined: Tether (24,500) + Bitfinex (7,000) + PIPE (~11.5K) + In-Kind (~0.4K)
    holdingsLastUpdated: "2025-12-09",  // Merger close date
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390025121293/0001213900-25-121293-index.htm",
    // Breakdown: Contribution 31,500 + PIPE Bitcoin ~11,533 + In-Kind PIPE ~392 = ~43,425
    datStartDate: "2025-12-09",
    costBasisAvg: 91_509,  // S-1 Jan 2026: Initial ~42K BTC at $90,560.40 (closing date FV) + 1,500 post-close at ~$118K
    costBasisSource: "SEC S-1 Jan 5, 2026: Bitcoin valued at $90,560.40 per BTC (Closing date Dec 8, 2025). PIPE BTC: $458.7M (4,812 BTC) + $99.5M (917 BTC) + $147.5M (1,381 BTC)",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390026001285/ea0270549-s1_twenty.htm",
    isMiner: false,
    stakingPct: 0,  // BTC not staked
    // No burn data yet - awaiting first 10-Q (merged Dec 2025)
    avgDailyVolume: 150_000_000,
    hasOptions: true,
    // DUAL-CLASS: 346,548,153 Class A + 304,842,759 Class B = 651,390,912 total
    sharesForMnav: 651_390_912,  // Total shares (both classes)
    sharesSource: "SEC 8-K Dec 12, 2025",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390025121293/0001213900-25-121293-index.htm",
    sharesAsOf: "2025-12-09",
    // Debt: $486.5M 1% convertible senior secured notes due 2030, collateralized by 16,116 BTC (~3:1 ratio)
    totalDebt: 486_500_000,
    debtSource: "SEC 8-K Dec 12, 2025 - 1% secured converts due 2030",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390026001285/ea0270549-s1_twenty.htm",
    debtAsOf: "2025-12-09",
    // Cash obligations: $486.5M × 1% = $4.865M/year
    debtInterestAnnual: 4_865_000,
    cashObligationsAnnual: 4_865_000,
    cashObligationsSource: "SEC S-1 Jan 2026: 1% convertible notes",
    cashObligationsSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390026001285/ea0270549-s1_twenty.htm",
    cashObligationsAsOf: "2025-12-09",
    cashReserves: 119_300_000,  // ~$119.3M net cash at Dec 2025 closing
    restrictedCash: 119_300_000,  // Debt service reserves - not excess
    cashSource: "SEC 8-K Dec 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390025123918/",
    cashAsOf: "2025-12-09",
    leader: "Jack Mallers (CEO)",
    strategy: "BTC treasury + Bitcoin-native financial services. Tether/SoftBank/Cantor backed.",
    notes: "Merged Dec 2025. 16,116 BTC collateralizes debt at ~3:1 ratio. #3 corporate BTC holder.",
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
    // costBasisAvg removed - needs verification
    isMiner: false,
    quarterlyBurnUsd: 5_000_000,
    burnSource: "SEC 10-Q (filed 2025-05-15): NetCashUsedInOperatingActivities $37,607 (2024-01-01 to 2024-03-31)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1865602/000121390025044273/",
    burnAsOf: "2024-03-31",
    avgDailyVolume: 80_000_000,
    hasOptions: true,
    pendingMerger: true,  // SPAC merger not yet closed - no mNAV
    expectedHoldings: 30_021,  // Confirmed BTC from Adam Back + investors
    leader: "Adam Back (CEO)",
    strategy: "Hashcash inventor's BTC treasury play. Target 50K+ BTC.",
    notes: "SPAC merger pending (expected Q1 2026). 25K BTC from Adam Back + 5K from investors. Will trade as BSTR post-merger.",
  },
  {
    // =========================================================================
    // MARA - Core financials from provenance/mara.ts (SEC-verified)
    // Largest US public Bitcoin miner with HODL strategy
    // =========================================================================
    id: "mara",
    name: "MARA Holdings",
    ticker: "MARA",
    asset: "BTC",
    tier: 1,
    // HOLDINGS: from provenance (10-Q filing)
    holdings: MARA_PROVENANCE.holdings?.value || 52_850,
    holdingsLastUpdated: MARA_PROVENANCE_DEBUG.holdingsDate,
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm",
    datStartDate: "2024-01-01",
    website: "https://mara.com",
    twitter: "https://twitter.com/MARAHoldings",
    secCik: "0001507605",
    // COST BASIS: from provenance (10-Q)
    costBasisAvg: MARA_PROVENANCE.costBasisAvg?.value || 87_760,
    costBasisSource: "SEC-verified (provenance): 10-Q Q3 2025",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/",
    costBasisAsOf: MARA_PROVENANCE_DEBUG.balanceSheetDate,
    isMiner: true,
    // QUARTERLY BURN: from provenance (G&A only, mining COGS excluded)
    quarterlyBurnUsd: MARA_PROVENANCE.quarterlyBurn?.value || 85_296_000,
    burnSource: "SEC-verified (provenance): 10-Q Q3 2025 G&A (mining COGS excluded)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/",
    burnAsOf: MARA_PROVENANCE_DEBUG.balanceSheetDate,
    avgDailyVolume: 400_000_000,
    hasOptions: true,
    marketCap: 3_600_000_000,
    // SHARES: from provenance (basic shares, dilutives in dilutive-instruments.ts)
    sharesForMnav: MARA_PROVENANCE_DEBUG.sharesBasic,
    sharesSource: "SEC-verified (provenance): 10-Q Q3 2025 cover page",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/",
    sharesAsOf: MARA_PROVENANCE_DEBUG.sharesDate,
    // CASH: from provenance (10-Q)
    cashReserves: MARA_PROVENANCE.cashReserves?.value || 826_392_000,
    restrictedCash: 12_000_000,  // SEC 10-Q Q3 2025: $12,000K restricted cash
    cashSource: "SEC-verified (provenance): 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/",
    cashAsOf: MARA_PROVENANCE_DEBUG.balanceSheetDate,
    leader: "Fred Thiel (CEO)",
    strategy: "HODL miner - keeps all mined BTC. 50 EH/s.",
    // DEBT: from provenance (~$3.25B in convertible notes)
    totalDebt: MARA_PROVENANCE.totalDebt?.value || 3_248_000_000,
    debtSource: "SEC-verified (provenance): 10-Q Q3 2025 XBRL",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/",
    debtAsOf: MARA_PROVENANCE_DEBUG.balanceSheetDate,
    notes: "Largest US public miner. Core financials from provenance/mara.ts. ~$3.25B in 0% convertible notes (2026, 2030, 2032 series). Dilutives (~81M from converts) in dilutive-instruments.ts.",
  },
  {
    // =========================================================================
    // STRV (Strive, Inc.) - First publicly traded asset manager with BTC treasury
    // Trades as ASST on NASDAQ. Merged with Asset Entities Sep 2025.
    // Acquired Semler Scientific Jan 2026. 1-for-20 reverse split Feb 3, 2026.
    // All data from provenance/strv.ts (SEC-verified)
    // =========================================================================
    id: "asst",
    name: "Strive, Inc.",
    ticker: "ASST",
    asset: "BTC",
    tier: 1,
    // HOLDINGS: SEC 8-K Jan 28, 2026
    holdings: 13_131.82,
    holdingsLastUpdated: "2026-01-28",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://investors.strive.com/news-events/news-releases/news-details/2026/Strive-Announces-Closing-of-Upsized--Oversubscribed-Follow-On-Offering-of-SATA-Stock-and-Concurrent-Exchange-of-Semler-Notes/default.aspx",
    datStartDate: "2024-05-01",
    website: "https://strive.com",
    twitter: "stikiinvestor",
    investorRelationsUrl: "https://investors.strive.com",
    secCik: "0001920406",
    isMiner: false,
    // BURN: SEC 10-Q Q3 2025
    quarterlyBurnUsd: 15_000_000,
    burnSource: "SEC 10-Q Q3 2025",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000162828025052343/asst-20250930.htm",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 100_000_000,
    hasOptions: false,  // No stock options granted per SEC data
    // SHARES: Anchor 44.7M post-split as of Dec 31, 2025 (SEC 8-K Jan 5, 2026: 894.3M pre-split ÷ 20)
    // + Semler merger shares (Jan 16) + PIPE/SATA offering shares (Jan 21-28) = ~62.37M estimated
    // Pre-funded warrants @ $0.002 tracked in dilutive-instruments.ts
    sharesForMnav: 62_370_000,
    sharesSource: "Company-derived: 44.7M verified (8-K Jan 5: 894.3M pre-split ÷ 20) + ~17.7M from merger/PIPE",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000162828026000225/asst-20260105.htm",
    sharesAsOf: "2026-01-28",
    // CASH: SEC 8-K Jan 5, 2026 — $67.6M as of Dec 31, 2025
    // Post-Jan: +$119M SATA raise, -$20M Coinbase payoff, -BTC purchases → estimated ~$50-80M current
    cashReserves: 67_600_000,
    restrictedCash: 67_600_000,  // Operating capital earmarked for BTC - not excess
    cashSource: "SEC 8-K Jan 5, 2026 (preliminary, as of Dec 31, 2025)",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000162828026000225/asst-20260105.htm",
    cashAsOf: "2025-12-31",
    // DEBT: $100M Semler converts - $90M exchanged for SATA = $10M remaining (SEC 8-K Jan 28)
    // Coinbase $20M loan also paid off. 100% BTC unencumbered.
    totalDebt: 10_000_000,
    debtSource: "Company-derived: $100M Semler converts - $90M exchanged = $10M (SEC 8-K Jan 28, 2026)",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000114036126002606/ny20063534x6_8k.htm",
    debtAsOf: "2026-01-28",
    // PREFERRED: SATA 12.25% perpetual preferred (NOT convertible to common)
    // Dec 31: 2,012,729 SATA (SEC 8-K Jan 5) + Jan: 1.32M underwritten + ~930K exchange = ~4.26M @ $100 stated value
    preferredEquity: 426_000_000,
    preferredSource: "Company-derived: 2.01M verified (8-K Jan 5) + 1.32M underwritten + ~930K exchange = ~4.26M @ $100",
    preferredSourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000162828026000225/asst-20260105.htm",
    preferredAsOf: "2026-01-28",
    leader: "Vivek Ramaswamy (Co-Founder), Matt Cole (CEO), Eric Semler (Exec Chair)",
    strategy: "First publicly traded asset manager with BTC treasury. No debt - uses perpetual preferred (SATA) instead. Merged with Asset Entities Sep 2025, acquired Semler Scientific Jan 2026.",
    notes: "1-for-20 reverse split Feb 3, 2026. SATA 12.25% perpetual preferred NOT convertible to common. Pre-funded warrants (3.2M @ $0.002) and traditional warrants (26.7M @ $27) tracked in dilutive-instruments.ts.",
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
    costBasisAvg: 101_024,  // SEC 10-Q Q3 2025: $106,785,454 cost basis / 1,057 BTC
    costBasisSource: "SEC 10-Q Q3 2025: digital assets cost basis $106,785,454 (1,057 BTC)",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
    isMiner: false,
    quarterlyBurnUsd: 6_264_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: SellingGeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000141057825001326/",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 30_000_000,
    hasOptions: true,
    // marketCap calculated from sharesForMnav × price (removed static override)
    sharesForMnav: 45_674_420,  // SEC 10-Q Q3 2025 (as of Nov 14, 2025)
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/",
    sharesSource: "SEC 10-Q Q3 2025",
    sharesAsOf: "2025-11-14",
    totalDebt: 3_800_000,  // Coinbase credit facility loan - SEC 10-Q Q3 2025
    debtSource: "SEC 10-Q Q3 2025",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/",
    debtAsOf: "2025-09-30",
    cashReserves: 20_600_000,  // SEC 10-Q Q3 2025 (Sep 30, 2025)
    restrictedCash: 20_600_000,  // Earmarked for BTC purchases per 90% policy - not excess cash
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/",
    cashAsOf: "2025-09-30",
    leader: "Michael Mo (CEO)",
    strategy: "Bitcoin First Company. 90% of excess cash to BTC. Reports BTC Yield.",
    notes: "NASA supplier. 291% BTC Yield YTD. ATM paused Dec 2025 through Jun 2026. 70 BTC pledged as collateral for Coinbase loan.",
  },
  {
    id: "altbg",
    name: "The Blockchain Group",
    ticker: "ALCPB",  // Changed from ALTBG (Capital B rebrand)
    currency: "EUR",
    asset: "BTC",
    tier: 2,
    website: "https://cptlb.com",
    holdings: 2_823,  // AMF filing Nov 25, 2025
    holdingsLastUpdated: "2025-11-25",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2025/11/FCACT077244_20251125.pdf",
    datStartDate: "2024-12-01",
    // costBasisAvg removed - needs verification
    isMiner: false,
    quarterlyBurnUsd: 2_000_000,
    burnSource: "AMF filings (estimate - French IFRS reports)",
    burnSourceUrl: "https://cptlb.com/investor-relations/",
    burnAsOf: "2025-09-30",
    burnEstimated: true,  // No XBRL; company-reported estimate
    avgDailyVolume: 10_000_000,
    marketCap: 200_000_000,
    sharesForMnav: 226_884_068,  // Basic shares per mNAV.com Jan 2026. Diluted: ~392M (via convertibles)
    sharesSource: "Euronext Paris listing - company-reported",
    sharesSourceUrl: "https://cptlb.com/investor-relations/",
    sharesAsOf: "2025-12-31",
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
    currency: "SEK",
    asset: "BTC",
    tier: 2,
    holdings: 1_047,  // MFN Sep 17, 2025: "Total Holdings Reach 1,046" (1,046.66 per treasury tracker)
    holdingsLastUpdated: "2025-09-17",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://mfn.se/a/h100-group",  // Swedish MFN regulatory filings
    datStartDate: "2025-05-22",  // First BTC purchase May 22, 2025
    costBasisAvg: 114_808,  // treasury.h100.group avg cost
    costBasisSource: "company-website",
    costBasisSourceUrl: "https://treasury.h100.group",
    isMiner: false,
    quarterlyBurnUsd: 1_000_000,
    burnSource: "MFN Interim Report Nov 19, 2025 (estimate - no XBRL)",
    burnSourceUrl: "https://mfn.se/a/h100-group",
    burnAsOf: "2025-09-30",
    burnEstimated: true,  // Swedish quarterly report estimate
    avgDailyVolume: 5_000_000,
    // marketCap calculated from sharesForMnav x price
    sharesForMnav: 335_250_237,  // IR page share capital table (basic shares)
    sharesSource: "h100.group/investor-relations/shares",
    sharesSourceUrl: "https://www.h100group.com",
    sharesAsOf: "2025-09-30",
    leader: "Sander Andersen (Executive Chairman), Johannes Wiik (CEO)",
    strategy: "Swedish BTC treasury company. Nordic Strategy equivalent.",
    notes: "NGM Nordic SME listed. ISK-eligible. SEK 516M convertible (Jul 2025, Adam Back et al), SEK 122.5M converted Nov 2025. Acquiring Future Holdings AG (Switzerland). IR page incorrectly claims 'no convertibles'.",
  },
  {
    id: "obtc3",
    name: "OranjeBTC",
    ticker: "OBTC3",
    currency: "BRL",
    asset: "BTC",
    tier: 2,
    holdings: 0,  // TBD - CVM filings hard to access, IR sparse
    holdingsLastUpdated: "2026-02-02",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://ri.oranjebtc.com",
    datStartDate: "2025-01-01",
    website: "https://www.oranjebtc.com",
    isMiner: false,
    quarterlyBurnUsd: 500_000,  // Education business minimal burn
    burnSource: "CVM filings (estimate - Brazilian company)",
    burnSourceUrl: "https://ri.oranjebtc.com",
    burnAsOf: "2025-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,  // ~R$5.3M/day = ~$1M USD
    marketCap: 450_000_000,  // ~R$2.51B = ~$450M USD (Feb 2026)
    sharesForMnav: 318_000_000,  // Estimated from market cap / price
    sharesSource: "B3 Exchange listing",
    sharesSourceUrl: "https://ri.oranjebtc.com",
    sharesAsOf: "2025-12-31",
    totalDebt: 0,  // Per StatusInvest - no debt
    strategy: "First LatAm BTC treasury company. Mission: build largest BTC treasury in Latin America.",
    notes: "B3 listed (Brazil). Explicit MSTR-style strategy. Holdings TBD - CVM filings system difficult to navigate. Market cap suggests significant BTC holdings.",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Holdings not yet verified from CVM filings. Brazilian regulatory system (CVM) lacks API. Market cap (~$450M) suggests substantial BTC holdings.",
        severity: "warning",
      },
    ],
  },
  {
    id: "swc",
    name: "The Smarter Web Company",
    ticker: "SWC",
    currency: "GBP",
    asset: "BTC",
    tier: 1,  // Verified holdings via RNS
    holdings: 2_674,  // RNS Jan 22, 2026: "Total Bitcoin Holdings: 2,674 Bitcoin"
    holdingsLastUpdated: "2026-01-22",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www.aquis.eu/stock-exchange/announcements/5562558",
    datStartDate: "2025-04-01",
    website: "https://www.smarterwebcompany.co.uk",
    twitter: "https://x.com/smarterwebuk",
    isMiner: false,
    quarterlyBurnUsd: 500_000,
    burnSource: "AQSE RNS announcements (estimate)",
    burnSourceUrl: "https://www.aquis.eu/stock-exchange/announcements?search=SWC",
    burnAsOf: "2025-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,
    sharesForMnav: 395_188_479,  // Company website "Fully Diluted Shares" (Feb 2026) - used for mNAV calc
    sharesSource: "AQSE listing - company-reported",
    sharesSourceUrl: "https://www.smarterwebcompany.co.uk/investor-information",
    sharesAsOf: "2026-01-31",
    strategy: "UK BTC treasury company. 'The 10 Year Plan' - explicit policy of acquiring Bitcoin as treasury reserve.",
    notes: "AQUIS: SWC | OTCQB: TSWCF | FRA: 3M8. #1 UK BTC holder. Total invested £221.4M at avg £82,800/BTC. Companies House shows ~696M total shares but company reports 395M fully diluted - difference likely deferred shares from shell restructuring (was Uranium Energy Exploration PLC until Apr 2025). Using company-reported figure for mNAV.",
    dataWarnings: [],
  },
  {
    id: "sqns",
    name: "Sequans Communications",
    ticker: "SQNS",
    asset: "BTC",
    tier: 2,
    holdings: 2_264,  // Nov 4, 2025 (was 3,234, sold 970 to repay debt)
    holdingsLastUpdated: "2025-11-04",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://sequans.com/bitcoin-treasury/",
    datStartDate: "2025-06-23",
    website: "https://sequans.com",
    twitter: "https://twitter.com/Sequans",
    investorRelationsUrl: "https://sequans.com/investor-relations/investor-materials/",
    secCik: "0001383395",
    // costBasisAvg removed - was estimate
    isMiner: false,
    quarterlyBurnUsd: 10_000_000,  // IoT semiconductor ops
    burnSource: "SEC 6-K filings (estimate - foreign private issuer)",
    burnSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1383395&type=6-K",
    burnAsOf: "2025-09-30",
    burnEstimated: true,
    avgDailyVolume: 5_000_000,
    sharesForMnav: 13_933_963,  // SEC 6-K Q3 2025 weighted avg diluted ADS (verified Feb 2, 2026)
    sharesSource: "SEC 20-F (filed 2025-04-30): EntityCommonStockSharesOutstanding = 251,408,922 as of 2024-12-31",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1383395/000138339525000018/",
    sharesAsOf: "2024-12-31",
    totalDebt: 189_000_000,  // $189M convertible debt (July 2025)
    debtSource: "SEC Form 6-K",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1383395/000138339525000018/",
    strategy: "IoT semiconductor company with BTC treasury strategy. Raised $189M convertible debt for BTC.",
    notes: "NYSE listed (French HQ). Dedicated bitcoin-treasury page with live KPIs. BTC pledged as collateral, later amended. Sold 970 BTC to repay portion of debt.",
  },
  {
    id: "ddc",
    name: "DDC Enterprise",
    ticker: "DDC",
    twitter: "ddcbtc_",
    asset: "BTC",
    tier: 2,
    holdings: 1_783,  // treasury.ddc.xyz Jan 29, 2026
    holdingsLastUpdated: "2026-01-29",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://treasury.ddc.xyz",
    datStartDate: "2025-02-21",
    website: "https://ir.ddc.xyz",
    secCik: "0001808110",
    costBasisAvg: 88_112,
    costBasisSource: "company-website",
    costBasisSourceUrl: "https://treasury.ddc.xyz",
    isMiner: false,
    quarterlyBurnUsd: 3_395_000,
    burnSource: "SEC 6-K filings (estimate - foreign private issuer)",
    burnSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1808110&type=6-K",
    burnAsOf: "2025-09-30",
    burnEstimated: true,
    avgDailyVolume: 5_000_000,
    sharesForMnav: 23_310_000,  // treasury.ddc.xyz basic shares (matches their 0.43x mNAV calc)
    sharesSource: "SEC 20-F FY2024",
    sharesSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001808110&type=20-F",
    strategy: "Plant-based food company pivoted to BTC treasury Feb 2025. Explicit MSTR-style strategy with Bitcoin yield metrics.",
    notes: "NYSE American listed. DayDayCook brand. Dual-class structure (Class B = 10 votes). ⚠️ HOLDINGS: Company reports 1,783 BTC, SEC 424B3 Jan 26 shows 1,383 BTC. ⚠️ DILUTIVE INSTRUMENTS: $300M convertible note (Anson, OTM), $200M ELOC undrawn, 1.8M Pre-IPO options, 2023 ESOP pool. Fully diluted: 29.75M shares (0.47x mNAV).",
  },
  // HIVE Digital Technologies (HIVE) REMOVED 2026-02-02
  // Reason: Not a DAT accumulator. SEC XBRL shows only $24.4M crypto (Sep 2025) = ~313 BTC
  // Despite claiming 2,805 BTC HODL in Dec 2024, they sold ~2,500 BTC during 2025 to fund Paraguay expansion
  // They mine and sell, not mine and hold. Does not meet DAT criteria.
  {
    id: "fufu",
    name: "BITFUFU",
    ticker: "FUFU",
    currency: "USD",
    asset: "BTC",
    tier: 2,
    holdings: 1_780,  // SEC 6-K Jan 7, 2026 (Dec 2025 Update) - includes 274 BTC pledged
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://ir.bitfufu.com/press-viewer/?i=160927",
    datStartDate: "2024-01-01",
    website: "https://bitfufu.com",
    secCik: "0001921158",
    isMiner: true,
    quarterlyBurnUsd: 2_046_500,  // H1 2025: $4,093,000 / 2
    burnSource: "SEC 6-K H1 2025 XBRL: GeneralAndAdministrativeExpense $4,093,000 (H1 2025) / 2",
    burnSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1921158&type=6-K",
    burnAsOf: "2025-06-30",
    avgDailyVolume: 20_000_000,
    sharesForMnav: 164_131_946,  // SEC XBRL Jun 2025
    sharesSource: "SEC 6-K (filed 2025-09-05): CommonStockSharesOutstanding = 164,131,946 as of 2025-06-30",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1921158/000121390025084744/",
    sharesAsOf: "2025-06-30",
    totalDebt: 101_301_000,  // SEC XBRL Jun 2025: Long Term Debt
    debtAsOf: "2025-06-30",
    debtSource: "SEC 20-F/6-K XBRL",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1921158/000121390025084744/",
    strategy: "HODL-forward miner with dedicated BTC management team. Cloud mining platform (648k+ users).",
    notes: "Singapore (Nasdaq FUFU). BITMAIN partner. 3.7 EH/s self-owned, 26.1 EH/s under management. 478 MW hosting. 274 BTC pledged for loans.",
  },
  // EXOD (Exodus Movement) REMOVED - not a DAT accumulator
  // They hold BTC but sell it for operations/acquisitions, no explicit accumulation strategy
  {
    id: "fld",
    name: "Fold Holdings",
    ticker: "FLD",
    asset: "BTC",
    tier: 2,
    holdings: 1_526,  // Q3 2025 Earnings PR (Nov 10, 2025) - also 800 BTC restricted/collateral
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://investor.foldapp.com/news-releases/news-release-details/fold-holdings-inc-nasdaq-fld-announces-third-quarter-2025",
    datStartDate: "2024-07-01",
    website: "https://foldapp.com",
    secCik: "0001889123",
    isMiner: false,
    quarterlyBurnUsd: 3_000_000,
    burnSource: "SEC 20-F FY2024 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1889123/000095017025072818/",
    burnAsOf: "2025-03-31",
    avgDailyVolume: 5_000_000,
    sharesForMnav: 48_307_642,  // SEC XBRL Nov 10, 2025
    sharesSource: "SEC 10-Q (filed 2025-11-10): EntityCommonStockSharesOutstanding = 48,307,642 as of 2025-11-10",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1889123/000119312525274317/",
    sharesAsOf: "2025-11-10",
    totalDebt: 66_300_000,  // SEC 10-Q Sep 2025: $20M June convert + $46.3M March convert (principal, not fair value)
    debtAsOf: "2025-09-30",
    debtSource: "SEC 10-Q Q3 2025",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1889123/000119312525274317/",
    strategy: "First publicly traded financial services company built entirely around Bitcoin. BTC rewards platform. Explicit treasury accumulation strategy.",
    notes: "Nasdaq: FLD. Fold Card debit with BTC rewards. Went public July 2024. Russell 2000 (Dec 2025). Also 800 BTC restricted as collateral.",
  },
  {
    id: "3825t",
    name: "Remixpoint",
    ticker: "3825.T",
    currency: "JPY",
    asset: "MULTI",  // BTC + ETH + XRP + SOL + DOGE
    tier: 2,
    holdings: 1_411,  // Company website Feb 2026: 1,411.30 BTC
    holdingsLastUpdated: "2026-02-02",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.remixpoint.co.jp/digital-asset/",
    datStartDate: "2024-09-26",  // First BTC purchase
    website: "https://www.remixpoint.co.jp",
    twitter: "https://x.com/remixpoint_x",
    isMiner: false,
    quarterlyBurnUsd: 2_000_000,
    burnSource: "TDnet quarterly earnings (estimate - no XBRL)",
    burnSourceUrl: "https://www.remixpoint.co.jp/ir/",
    burnAsOf: "2025-09-30",
    burnEstimated: true,
    avgDailyVolume: 5_000_000,
    sharesForMnav: 149_039_800,  // Yahoo Japan Finance
    sharesSource: "TDnet quarterly earnings report",
    sharesSourceUrl: "https://www.remixpoint.co.jp/ir/",
    sharesAsOf: "2025-09-30",
    strategy: "Japanese company with explicit Digital Asset Management division. Actively accumulates with press releases for each purchase.",
    notes: "TSE Standard Market. Japan's #4 BTC holder (World #43). Also holds 901 ETH, 1.2M XRP, 13,920 SOL, 2.8M DOGE. Originally auto/energy business, pivoting to DAT.",
  },
  {
    id: "3189t",
    name: "ANAP Holdings",
    ticker: "3189.T",
    currency: "JPY",
    asset: "BTC",
    tier: 2,
    holdings: 1_417,  // TDnet Jan 21, 2026: 1,417.0341 BTC
    holdingsLastUpdated: "2026-01-21",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www.release.tdnet.info/inbs/140120260121536720.pdf",
    datStartDate: "2025-04-16",  // First BTC purchase
    website: "https://anap.co.jp",
    isMiner: false,
    // costBasisAvg removed - calculation needs verification
    quarterlyBurnUsd: 1_000_000,
    burnSource: "TDnet Q1 FY2026 決算短信 (estimate)",
    burnSourceUrl: "https://www.release.tdnet.info/inbs/",
    burnAsOf: "2026-01-14",
    burnEstimated: true,
    avgDailyVolume: 2_000_000,
    sharesForMnav: 39_954_400,  // TDnet Q1 FY2026 earnings (Jan 14, 2026)
    sharesSource: "TDnet Q1 FY2026 決算短信",
    sharesSourceUrl: "https://www.release.tdnet.info/inbs/",
    sharesAsOf: "2026-01-14",
    strategy: "Explicit 'hyperbitcoinization' mission. Runs 'Bitcoin Dojo' teaching other companies BTC treasury strategy.",
    notes: "TSE Standard. Fashion company pivot. ANAP Lightning Capital subsidiary (Feb 2025). Blockstream partnership (Dec 2025). First BTC purchase Apr 16, 2025. Total cost basis ¥20.95B (~$139M).",
  },
  {
    id: "zooz",
    name: "ZOOZ Power",
    ticker: "ZOOZ",
    twitter: "zoozbitcoin",
    asset: "BTC",
    tier: 2,
    holdings: 1_047,  // treasury.zoozpower.com Feb 2, 2026 (1,046.96 BTC)
    holdingsLastUpdated: "2026-02-02",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://treasury.zoozpower.com",
    datStartDate: "2025-09-28",
    website: "https://zoozpower.com",
    secCik: "0001992818",
    isMiner: false,
    quarterlyBurnUsd: 3_000_000,
    burnSource: "SEC 20-F FY2024 XBRL: GeneralAndAdministrativeExpense (estimated quarterly)",
    burnSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1992818&type=20-F",
    burnAsOf: "2024-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,
    sharesForMnav: 162_000_000,  // treasury.zoozpower.com basic shares
    sharesSource: "SEC 20-F (filed 2025-03-07): EntityCommonStockSharesOutstanding = 12,105,496 as of 2024-12-31",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1992818/000149315225009478/",
    sharesAsOf: "2024-12-31",
    // costBasisAvg removed - needs verification
    strategy: "EV charging company (flywheel tech) pivoted to BTC treasury Sep 2025. First NIS-denominated Bitcoin exposure on TASE.",
    notes: "Nasdaq + TASE dual-listed (Israel). ✅ NO LEVERAGE: BTC funded via $180M equity raise (Jul 2025). Underwater on BTC ($116k avg). Dilutive: 269M fully diluted (warrants @ $3.06 strike, 5yr). Renamed to 'ZOOZ Strategy Ltd.' Oct 2025.",
  },
  // USBC removed 2026-02-02: SEC 10-K states "does not currently intend to make future BTC purchases"
  // They hold ~1,003 BTC but it was a one-time equity contribution, not an ongoing treasury strategy
  {
    id: "btct",
    name: "Bitcoin Treasury Corp",
    ticker: "BTCT.V",
    currency: "CAD",
    asset: "BTC",
    tier: 2,
    holdings: 771,  // btctcorp.com homepage: 771.37 BTC (Feb 2026)
    holdingsLastUpdated: "2026-02-02",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://btctcorp.com",
    datStartDate: "2025-06-30",  // TSX Venture listing date
    // costBasisAvg removed - third-party source only
    isMiner: false,
    quarterlyBurnUsd: 500_000,
    burnSource: "SEDAR+ filings (estimate - new company)",
    burnSourceUrl: "https://www.sedarplus.ca/csa-party/records/record.html?id=e0b8c2a1f3d4e5c6",
    burnAsOf: "2025-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,
    website: "https://btctcorp.com",
    sedarProfile: "000053693",  // SEDAR+ profile number
    // Shares: 10,075,080 basic, 12,158,413 diluted (accounts for convertible debentures)
    sharesForMnav: 12_158_413,  // Diluted per btctcorp.com - includes convertible debentures
    sharesSource: "btctcorp.com homepage + SEDAR+ filings",
    sharesSourceUrl: "https://btctcorp.com",
    sharesAsOf: "2026-02-02",
    // Note: Diluted shares include convertible debentures - indicates leverage via converts
    strategy: "Grow Bitcoin per Share (BPS) through strategic corporate finance and institutional Bitcoin lending, liquidity and collateral services.",
    notes: "TSX Venture (Canada). SEDAR+ #000053693. Evolve Funds Group administrative services. BPS: ₿0.0000634 (diluted). Basic shares: 10,075,080. Convertible debentures outstanding increase diluted count to 12.16M. First Canadian Bitcoin-native treasury company.",
  },
  // AKER (Aker ASA) removed 2026-02-02: Cannot verify BTC holdings
  // Seetee not listed among major unlisted investments in Q3 2025 report
  // Website only mentions "first purchase 1,170 BTC" with no current figure
  // No Bitcoin disclosure in quarterly reports - possibly sold or too small to report
  
  // SATS.L (Satsuma Technology) removed 2026-02-02: Cannot verify BTC holdings
  // 620 BTC figure only from BitcoinTreasuries.net (secondary source)
  // No RNS filings found mentioning Bitcoin holdings
  // Stock crashed 99% (27.5p -> 0.31p), trading below NAV if holdings are real
  
  // CASH3 (Méliuz) removed 2026-02-02: Cannot verify 605 BTC figure
  // CoinDesk + securities filing show only 45.72 BTC purchased (Mar 2025)
  // 605 BTC from BitcoinTreasuries.net is unverified/likely wrong
  // Re-add when they disclose verified holdings via CVM filing
  
  // 377030.KQ (bitmax) removed 2026-02-02: 551 BTC grossly inflated
  // DART filing Mar 10, 2025 shows only 50 BTC + 268 ETH purchase
  // Even with all reported purchases (50+38+37) = ~125 BTC max
  // Re-add with verified DART totals when available
  
  // ARLP (Alliance Resource Partners) removed 2026-02-02: Not a DAT
  // Coal company (~$3-4B) that mines BTC as side venture using excess power
  // 541 BTC ($42M) is ~1% of company value - not a treasury strategy
  // 75x mNAV misleading - you're buying coal, not BTC exposure
  {
    id: "srag",
    name: "Samara Asset Group",
    ticker: "SRAG.DU",
    currency: "EUR",
    asset: "BTC",
    tier: 2,
    holdings: 525,  // CEO Patrick Lowry X post Nov 30, 2024
    holdingsLastUpdated: "2024-11-30",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://x.com/Patrick_Lowry_/status/1863071308914864387",
    datStartDate: "2024-01-01",
    twitter: "https://x.com/Patrick_Lowry_",
    // costBasisAvg removed - was estimate
    isMiner: false,
    quarterlyBurnUsd: 2_000_000,
    burnSource: "German Bundesanzeiger filings (estimate)",
    burnSourceUrl: "https://samara.ag/investor-relations/",
    burnAsOf: "2024-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,
    sharesForMnav: 20_000_000,  // Estimated
    sharesSource: "Samara AG annual report",
    sharesSourceUrl: "https://samara.ag/investor-relations/",
    sharesAsOf: "2024-12-31",
    strategy: "BTC as primary treasury reserve. Issuing €30M bonds specifically to buy more BTC. Aims to match MicroStrategy.",
    notes: "Frankfurt listed (Malta HQ). CEO aspires to rival MSTR holdings. Donates to Brink (BTC development).",
  },
  // PHX.AD (Phoenix Group PLC) removed 2026-02-03: Can't verify holdings
  // 514 BTC from BitcoinTreasuries.net only - no primary source
  // UAE company (ADX) - no IR website found, no SEC filings
  // Company is real (crypto miner) but holdings unverifiable
  {
    id: "dcc",
    name: "DigitalX",
    ticker: "DCC.AX",
    currency: "AUD",
    asset: "BTC",
    tier: 1,  // ASX-verified + real-time dashboard
    holdings: 504,  // ASX Dec 2025: 503.7 (308.8 direct + 194.9 BTXX ETF)
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "regulatory-filing",  // ASX Treasury Information filing
    holdingsSourceUrl: "https://www.listcorp.com/asx/dcc/digitalx-limited/news/treasury-information-december-2025-3305468.html",
    datStartDate: "2025-07-01",  // New BTC treasury strategy started Jul 2025
    website: "https://www.digitalx.com",
    twitter: "https://twitter.com/DigitalXLtd",
    // costBasisAvg removed - dashboard source needs verification
    isMiner: false,
    quarterlyBurnUsd: 1_000_000,
    burnSource: "ASX Treasury Information filings (estimate)",
    burnSourceUrl: "https://www.asx.com.au/markets/company/DCC",
    burnAsOf: "2025-12-31",
    burnEstimated: true,
    avgDailyVolume: 500_000,
    sharesForMnav: 1_488_510_854,  // 1.49B from ASX (ISIN: AU000000DCC9)
    sharesSource: "asx.com.au",
    sharesSourceUrl: "https://www.asx.com.au/markets/company/DCC",
    sharesAsOf: "2026-01-30",
    strategy: "Australia's first and largest ASX-listed Bitcoin treasury company. Goal: 2,100 BTC by 2027. Focused on increasing BTC per share via strategic capital raises and market-neutral trading strategies.",
    notes: "503.7 BTC: 308.8 direct + 194.85 via BTXX ETF. Real-time dashboard: treasury.digitalx.com. Jul 2025: Raised A$20.7M from UTXO Group, ParaFi Capital, and Animoca Brands. Uses trading strategies and third-party fund managers to generate cash flow for operations.",
    description: "DigitalX (ASX:DCC) is a pioneering digital asset company founded in 2014, making it one of the first blockchain companies to list on a major stock exchange globally. In July 2025, the company pivoted to a Bitcoin treasury strategy, raising A$20.7M from institutional investors including UTXO Group, ParaFi Capital, and Animoca Brands. The company holds BTC both directly and through its BTXX Bitcoin ETF. DigitalX leverages its deep expertise in digital asset trading to grow Bitcoin holdings per share while generating operational cash flow through market-neutral strategies.",
    founded: 2014,
    headquarters: "Perth, Australia",
    ceo: "Lisa Wade",
  },
  // Removed: NDA.V (416 BTC), DMGI.V (403 BTC), LMFA (356 BTC) - below 500 BTC threshold
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
    costBasisAvg: 118_205,
    costBasisSource: "SEC 8-K Nov 19, 2025",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000149315225024314/ex99-1.htm",
    isMiner: false,
    quarterlyBurnUsd: 8_000_000,
    burnSource: "SEC 10-Q (filed 2025-05-08): NetCashUsedInOperatingActivities $865,083 (2025-01-01 to 2025-03-31)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000164117225009328/",
    burnAsOf: "2025-03-31",
    avgDailyVolume: 50_000_000,
    hasOptions: true,
    // marketCap calculated from sharesForMnav × price (removed static override)
    sharesForMnav: 511_555_864,  // SEC 10-Q Nov 2025: 439.85M shares + 71.7M pre-funded warrants = 511.56M fully diluted
    sharesSource: "SEC 10-Q (filed 2025-11-19): EntityCommonStockSharesOutstanding = 439,850,889 as of 2025-11-14",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000149315225024260/",
    sharesAsOf: "2025-11-14",
    // Debt: $210M Kraken BTC-backed loan only - Yorkville converts redeemed Oct 2025 via Two Prime, then refinanced Dec 2025
    totalDebt: 210_000_000,  // Kraken loan Dec 2025 (replaced Two Prime which replaced Yorkville)
    debtSource: "Kraken credit facility Dec 2025",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000164117225009328/",
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
    // =========================================================================
    // DJT - Core financials from provenance/djt.ts (SEC-verified XBRL)
    // =========================================================================
    id: "djt",
    name: "Trump Media & Technology",
    ticker: "DJT",
    secCik: "0001849635",
    asset: "BTC",
    tier: 1,
    // HOLDINGS: from provenance (8-K treasury updates, Dec 2025)
    holdings: DJT_PROVENANCE.holdings?.value || 11_542,
    holdingsLastUpdated: DJT_PROVENANCE_DEBUG.holdingsDate,
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/djt/0001140361-25-040977?tab=document&q=11%2C542",
    datStartDate: "2025-05-01",
    isMiner: false,
    // BURN: from provenance (Q1 2025 OpCF as proxy for core burn)
    quarterlyBurnUsd: DJT_PROVENANCE.quarterlyBurn?.value || 9_737_800,
    burnSource: "SEC 10-Q Q1 2025 XBRL: NetCashProvidedByUsedInOperatingActivities -$9,737,800",
    burnSourceUrl: "/filings/djt/0001140361-25-018209",
    burnAsOf: "2025-03-31",
    // CAPITAL: $2.5B private placement ($1.5B equity + $1B converts)
    capitalRaisedPipe: 2_500_000_000,
    avgDailyVolume: 200_000_000,
    hasOptions: true,
    // SHARES: from provenance (XBRL verified)
    sharesForMnav: DJT_PROVENANCE.sharesOutstanding?.value || 279_997_636,
    sharesSource: "SEC 10-Q Q3 2025 XBRL: EntityCommonStockSharesOutstanding = 279,997,636 as of 2025-11-05",
    sharesSourceUrl: "/filings/djt/0001140361-25-040977",
    sharesAsOf: DJT_PROVENANCE_DEBUG.sharesDate,
    // DEBT: from provenance (XBRL LongTermDebt — carrying value of $1B par converts)
    totalDebt: DJT_PROVENANCE.totalDebt?.value || 950_769_100,
    debtSource: "SEC 10-Q Q3 2025 XBRL: LongTermDebt $950,769,100 (carrying value of $1B zero-coupon converts due 2030)",
    debtSourceUrl: "/filings/djt/0001140361-25-040977",
    debtAsOf: "2025-09-30",
    // CASH: from provenance (XBRL — unrestricted only)
    cashReserves: DJT_PROVENANCE.cashReserves?.value || 166_072_700,
    cashAsOf: "2025-09-30",
    cashSource: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue $166,072,700 (excl $336M restricted)",
    cashSourceUrl: "/filings/djt/0001140361-25-040977",
    leader: "Devin Nunes (CEO)",
    strategy: "$2.5B private placement for BTC treasury. Crypto.com + Anchorage custody.",
    notes: "Truth Social parent. $1.5B equity + $1B zero-coupon converts due 2030. Also holds CRO tokens + $300M BTC options strategy. DJTWW warrants (legacy SPAC) outstanding. Custodians: Crypto.com + Anchorage Digital.",
  },
  {
    id: "boyaa",
    name: "Boyaa Interactive",
    ticker: "0434.HK",
    currency: "HKD",
    asset: "BTC",
    tier: 1,
    holdings: 4_091,  // Q3 2025 report (Sep 30, 2025) - confirmed same as of Nov 17, 2025
    holdingsLastUpdated: "2025-11-17",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    datStartDate: "2024-01-26",
    costBasisAvg: 68_114,
    costBasisSource: "Q3 2025 report - 'average cost of approximately US$68,114 per unit'",
    costBasisSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    isMiner: false,
    quarterlyBurnUsd: 2_000_000,
    burnSource: "HKEx Q3 2025 Report (estimate)",
    burnSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    burnAsOf: "2025-09-30",
    burnEstimated: true,
    avgDailyVolume: 20_000_000,
    // Shares: 768,004,730 (Dec 31, 2025 Monthly Return - excluding 2,972,000 treasury shares)
    // Pre-Sep 2025 placement: 711,003,730 → Post-placement: 770,976,730 (+59,973,000 @ HK$6.95)
    // Buybacks: 2,972,000 shares repurchased (held as treasury, not cancelled)
    sharesForMnav: 768_004_730,
    sharesSource: "HKEx Monthly Return Dec 2025 (filed Jan 5, 2026)",
    sharesSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0106/2026010600040.pdf",
    sharesAsOf: "2025-12-31",
    // FY end: Dec 31 (calendar year)
    // TODO: Extract from annual/interim reports:
    // - Cash reserves
    // - Total debt
    leader: "Dai Zhikang (Chairman & Executive Director)",
    strategy: "Hong Kong's largest BTC treasury. 15.1% BTC Yield (9mo 2025). Active buyback program.",
    notes: "Asia's MicroStrategy. Sep 2025 raised HK$410M via placement for BTC. Dec 2025: 2.4M shares bought back. Treasury shares not cancelled.",
  },
  // NXTT (Next Technology Holding) removed - formerly WeTrade Group, history of "untrue" financial reports (Nov 2023),
  // internal investigation found inconsistent expenditures, shareholder lawsuits, derivative suits against former officers.
  // Market trades at 5% of NAV reflecting zero confidence in reported holdings.
  // GNS (Genius Group) removed - AI education company, not beta to BTC
  // HUT (Hut 8) removed - pivoted to AI/HPC infrastructure, not a DAT company
  {
    id: "abtc",
    name: "American Bitcoin",
    ticker: "ABTC",
    secCik: "0001755953",  // Post-merger CIK (was Gryphon Digital Mining)
    asset: "BTC",
    tier: 1,
    holdings: 5_098,  // Dec 14, 2025 - PR Newswire Top 20 milestone
    holdingsLastUpdated: "2025-12-14",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.prnewswire.com/news-releases/american-bitcoin-enters-top-20-publicly-traded-bitcoin-treasury-companies-by-holdings-302643079.html",
    datStartDate: "2025-09-03",  // Nasdaq listing after Gryphon merger
    // costBasisAvg removed - needs verification
    isMiner: true,
    // btcMinedAnnual removed - not citable from SEC filings
    quarterlyBurnUsd: 8_052_000,  // Q3 2025 G&A
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense $8,052,000 (2025-07-01 to 2025-09-30)",
    burnSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001755953&type=10-Q",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 30_000_000,
    hasOptions: true,
    // Shares: 899,489,426 diluted per Q3 2025 10-Q
    sharesForMnav: 899_489_426,
    sharesSource: "SEC 10-Q (filed 2025-08-14): EntityCommonStockSharesOutstanding = 82,802,406 as of 2025-08-14",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1755953/000121390025076632/",
    sharesAsOf: "2025-08-14",
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
    costBasisSource: "SEC XBRL - $1.59B / 6.85M SOL",
    stakingPct: 0.99,  // "staking the majority of the SOL in our treasury" per 10-K; 6.73% APY confirms active staking
    stakingMethod: "Native staking via white-label validators + third-party validators",
    stakingSource: "SEC 10-K Dec 11, 2025: 'staking the majority of the SOL in our treasury to earn a staking yield.' Delegates to own and third-party validators.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316825009068/forward_i10k-093025.htm",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.0673,  // 6.73% gross APY per Jan 2026 update
    quarterlyBurnUsd: 1_799_000,
    burnSource: "SEC 10-Q Q2 FY2026 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316824000976/",
    burnAsOf: "2025-06-30",
    capitalRaisedPipe: 1_650_000_000,
    // Shares: 86,145,514 basic (SEC 10-K) + 26,359,600 pre-funded warrants @ $0.03 = 112,505,114 FD
    sharesForMnav: 112_505_114,
    sharesSource: "SEC 10-K (filed 2025-12-11): EntityCommonStockSharesOutstanding = 86,459,465 as of 2025-12-05",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000168316825009068/",
    sharesAsOf: "2025-12-05",
    avgDailyVolume: 400_000_000,
    hasOptions: true,
    cashReserves: 30_000_000,  // ~$30M operating capital (cash + USDC, Dec 2025)
    restrictedCash: 30_000_000,  // Operating capital - not excess
    cashSource: "Press release Dec 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/38264/000100329716000907/",
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
    // costBasisAvg removed - needs verification
    stakingPct: 0.95,  // "commenced native staking with acquired SOL in September of 2025"
    stakingMethod: "Native staking via third-party validators (Anchorage Digital custody)",
    stakingSource: "SEC 10-Q Nov 18, 2025: $342K staking rewards revenue, ~7% native staking yield. Commenced native staking Sep 2025.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/hsdt-20250930x10q.htm",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.0703,  // 7.03% APY as of Oct 2025
    quarterlyBurnUsd: 4_646_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: SellingGeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1610853/000155837025006120/",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 75_900_000,  // Q3 2025 10-Q press release: "75.9 million common shares and pre-funded warrants outstanding"
    sharesSource: "SEC 10-Q (filed 2025-11-18): EntityCommonStockSharesOutstanding = 41,301,400 as of 2025-11-17",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/",
    sharesAsOf: "2025-11-17",
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
    // costBasisAvg removed - needs verification
    stakingPct: 0.90,  // Stakes SOL + operates validators; $4.85M in validator/staking rewards (9mo)
    stakingMethod: "Validator operations + third-party staking. dfdvSOL liquid staking token.",
    stakingSource: "SEC 10-Q Nov 19, 2025: Revenue from 'staking our SOL holdings with third party platforms and from operating validator nodes.' $4.85M staking/validator rewards.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1805526/000119312525286660/dfdv-20250930.htm",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.114,
    quarterlyBurnUsd: 3_572_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1805526/000121390025042977/",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 200_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001805526&type=S-3",
    avgDailyVolume: 200_000_000,
    hasOptions: true,
    // marketCap removed - calculated from sharesForMnav × FMP price
    sharesForMnav: 29_892_800,  // Company press release Jan 5, 2026 (Q4 business update); SEC 8-K Nov 13, 2025 showed 31.4M pre-buyback
    sharesSource: "SEC 10-Q (filed 2025-11-19): EntityCommonStockSharesOutstanding = 31,401,212 as of 2025-11-19",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1805526/000119312525286660/",
    sharesAsOf: "2025-11-19",
    totalDebt: 186_000_000,  // $186M: $134M converts (OTM) + $52M SOL/DeFi loans (defidevcorp.com/dashboard Jan 2026)
    debtSource: "SEC 10-Q Q3 2025: $134M convertible notes + defidevcorp.com dashboard for $52M SOL/DeFi loans",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1805526/000119312525286660/",
    debtAsOf: "2025-09-30",
    cashReserves: 9_000_000,  // ~$9M cash, stablecoins, and liquid tokens
    restrictedCash: 9_000_000,  // Operating capital - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1805526/000121390025042977/",
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
    // costBasisAvg removed - needs verification
    stakingPct: 0.95,  // 8-K confirms SOL is "locked and staked" — transfer required no unstaking
    stakingMethod: "Native staking (locked/staked SOL)",
    stakingSource: "SEC 8-K Jan 14, 2026: 'locked and staked nature of the Digital Assets' — transfer effected without unstaking.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000207/upxi_8k.htm",
    stakingAsOf: "2026-01-14",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.08,
    quarterlyBurnUsd: 2_500_000,
    burnSource: "SEC 10-Q (filed 2025-11-12): NetCashUsedInOperatingActivities $9,780,221 (2025-07-01 to 2025-09-30)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793225008025/",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 100_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001775194&type=S-3",
    sharesForMnav: 61_761_756,  // 58.9M (10-Q Sep) + 3.29M (Dec PIPE) - 0.42M (buybacks) = 61.76M
    sharesSource: "SEC 10-Q (filed 2025-11-12): EntityCommonStockSharesOutstanding = 59,918,609 as of 2025-11-12",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793225008025/",
    sharesAsOf: "2025-11-12",
    totalDebt: 200_000_000,  // $200M: $150M convert @$4.25 + $36M convert @$2.39 + $14M other
    debtSource: "SEC 10-Q Q3 2025: Convertible notes payable $186M + other debt",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793225008025/",
    debtAsOf: "2025-09-30",
    cashReserves: 2_200_000,  // $2.2M cash (SEC 10-Q Sep 2025)
    restrictedCash: 2_200_000,  // Operating capital - not excess
    cashSource: "SEC 10-Q Sep 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793222007297/",
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
    // costBasisAvg removed - needs verification
    // stakingPct: 0.85 removed - needs verification
    stakingApy: 0.065,
    quarterlyBurnUsd: 1_200_000,
    burnSource: "SEC 40-F FY2025 (estimate from operating expenses)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/",
    burnAsOf: "2025-09-30",
    burnEstimated: true,
    capitalRaisedAtm: 50_000_000,
    capitalRaisedAtmSource: "SEC 40-F FY2025 / SEDAR+ filings",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001846839&type=40-F",
    sharesForMnav: 25_300_567,  // Post 1:8 reverse split (Aug 2025): 22,999,841 (40-F) + 2,300,726 (Jan 7 credit facility)
    sharesSource: "SEC 40-F FY2025 + Jan 7 2026 credit facility conversion",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/",
    sharesAsOf: "2025-09-30",
    totalDebt: 37_000_000,  // CAD $51.9M → ~$37M USD: Credit facility ($16.2M) + Convertibles ($14.5M current + $21.3M LT)
    debtSource: "SEC 40-F FY2025: Credit facility CAD $16.2M + Convertibles CAD $35.7M",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/",
    debtAsOf: "2025-09-30",
    // Cash obligations: Credit facility + converts interest (rates not disclosed in 40-F summary)
    // Need to verify from full 40-F filing - flagging as estimate
    cashObligationsAnnual: 2_500_000,  // ESTIMATE: ~6-7% blended rate on CAD $52M
    cashObligationsSource: "ESTIMATE: SEC 40-F FY2025 - rates not explicitly disclosed",
    cashObligationsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/",
    cashObligationsAsOf: "2025-09-30",
    cashReserves: 1_300_000,  // CAD $1.79M → ~$1.3M USD
    restrictedCash: 0,  // Operating cash - available
    cashSource: "SEC 40-F FY2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/",
    cashAsOf: "2025-09-30",
    avgDailyVolume: 50_000_000,
    leader: "Michael Hubbard (Interim CEO)",
    strategy: "Validator-first SOL treasury (DAT++ model). VanEck ETF staking provider. 99.999% uptime.",
    notes: "3.35M SOL AuD. 1:8 reverse split Aug 2025 for NASDAQ. Shareholder meeting Mar 31, 2026 re: board reconstitution (Tony Guoga + Max Kaplan requisition). Equity investments: NGRAVE NV, Chia Network, Animoca Brands.",
    website: "https://solstrategies.io/",
    twitter: "https://x.com/SolStrategies",
    investorRelationsUrl: "https://solstrategies.io/investor-relations",
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
    stakingPct: 1.00,  // 100% staked via Anchorage
    stakingApy: 0.024,  // ~288K HYPE/year on 12M staked
    stakingMethod: "Anchorage Digital",
    stakingSource: "PR Dec 4, 2025 - 12M HYPE staked",
    stakingAsOf: "2025-12-04",
    quarterlyBurnUsd: 2_000_000,
    burnSource: "SEC 10-Q (filed 2025-12-08): NetCashUsedInOperatingActivities $0 (2025-07-02 to 2025-09-30)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/2078856/000119312525311400/",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 583_000_000,
    sharesForMnav: 127_025_563,  // SEC 10-Q filed Dec 8, 2025
    sharesSource: "SEC 10-Q (filed 2025-12-08): EntityCommonStockSharesOutstanding = 127,025,563 as of 2025-12-05",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/2078856/000119312525311400/",
    sharesAsOf: "2025-12-05",
    cashReserves: 300_000_000,  // $300M+ cash (Dec 2025) - from $555M PIPE minus HYPE purchase
    restrictedCash: 300_000_000,  // No debt = cash not encumbered, don't subtract from EV
    cashSource: "Derived: $555M PIPE (SEC 8-K) - $255M HYPE purchase = ~$300M cash",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/2078856/000119312525311400/",
    cashAsOf: "2025-12-05",
    totalDebt: 0,
    debtSource: "SEC 10-Q Q3 2025: No debt",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/2078856/000119312525311400/",
    debtAsOf: "2025-09-30",
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
    website: "https://hyperiondefi.com",
    twitter: "https://x.com/hyperiondefi_",
    // No IR page yet - company website only has marketing content
    // SEC 10-Q Sep 30, 2025: HYPE digital assets $37.95M = direct holdings only
    // At $26/HYPE (Sep 30 price): $37.95M / $26 = 1,459,615 HYPE
    // Liquid staked HYPE tracked separately in cryptoInvestments
    holdings: 1_459_615,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1682639&type=10-Q",
    datStartDate: "2025-07-01",
    stakingPct: 0,  // Direct holdings not staked (staked tracked in cryptoInvestments)
    stakingApy: 0.05,
    quarterlyBurnUsd: 3_570_000,  // SEC 10-Q: $10.7M cash used in ops (9mo) / 3 = $3.57M/qtr
    burnSource: "SEC 10-Q (filed 2025-05-19): NetCashUsedInOperatingActivities $4,442,846 (2025-01-01 to 2025-03-31)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1682639/000141057825001361/",
    burnAsOf: "2025-03-31",
    capitalRaisedPipe: 50_000_000,
    // Shares: 8,097,659 common (Nov 10, 2025) + 5,435,897 preferred × 3 conversion = 24.4M FD
    sharesForMnav: 24_400_000,
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1682639/000110465925111671/",
    sharesSource: "SEC 10-Q Nov 14, 2025 (8.1M common + 16.3M from preferred conversion)",
    sharesAsOf: "2025-11-10",
    cashReserves: 8_223_180,  // SEC 10-Q Sep 30, 2025
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1682639/000110465925111671/",
    cashAsOf: "2025-09-30",
    totalDebt: 7_656_005,  // Notes payable (Avenue loan)
    debtSource: "SEC 10-Q Q3 2025",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1682639/000110465921104176/",
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
    costBasisSource: "company-website - Investor dashboard",
    // No staking disclosed - holding spot BNB
    quarterlyBurnUsd: 3_000_000,
    burnSource: "SEC 10-Q (filed 2025-09-22): NetCashUsedInOperatingActivities $1,725,439 (2025-06-07 to 2025-07-31)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1482541/000149315225014503/",
    burnAsOf: "2025-07-31",
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 44_062_938,  // SEC 10-Q Dec 2025
    sharesSource: "SEC 10-Q (filed 2025-12-15): EntityCommonStockSharesOutstanding = 44,062,938 as of 2025-12-12",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1482541/000149315225027782/",
    sharesAsOf: "2025-12-12",
    cashReserves: 77_500_000,  // $77.5M cash (Oct 2025)
    restrictedCash: 77_500_000,  // Treat as restricted - actively deployed for BNB purchases + buybacks
    cashSource: "FY Q2 2026 earnings",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1482541/000149315225027782/",
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
    // VERIFIED: SEC 6-K Dec 31, 2025 press release: "over 130,000 BNB...~$112M"
    holdings: 130_000,
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1872302/000121390025126828/ea027141101ex99-1_nano.htm",
    datStartDate: "2025-06-01",
    secCik: "1872302",
    filingType: "FPI",  // Foreign Private Issuer - files 20-F/6-K, limited XBRL
    // stakingPct: 0.30 removed - needs verification
    stakingApy: 0.03,
    quarterlyBurnUsd: 3_550_000,  // H1 2025: $7.1M/6mo = $3.55M/qtr (down from FY2024's $4.85M/qtr)
    burnSource: "SEC 6-K H1 2025",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1872302/000121390025088368/ea025544701ex99-2_nano.htm",
    burnAsOf: "2025-06-30",
    // VERIFIED from 20-F FY2024: Long-term RMB170.7M ($23.7M) + Short-term RMB18M ($2.5M) = ~$26.2M
    totalDebt: 26_200_000,
    debtSource: "SEC 20-F FY2024 balance sheet",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1872302/000121390025031065/ea0235323-20f_nanolabs.htm",
    debtAsOf: "2024-12-31",
    // VERIFIED via XBRL: CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents
    cashReserves: 50_800_000,
    cashSource: "SEC XBRL 6-K Q2 2025",
    cashSourceUrl: "https://data.sec.gov/api/xbrl/companyfacts/CIK0001872302.json",
    cashAsOf: "2025-06-30",
    // VERIFIED from 424B3 Oct 2025: 20,768,315 Class A + 2,858,909 Class B = 23,627,224
    // Significant dilution in 2025: 15.67M (Dec 2024) → 23.6M (Oct 2025) = +50%
    sharesForMnav: 23_627_224,
    sharesSource: "SEC 424B3 Oct 2025 (Class A: 20.77M + Class B: 2.86M)",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1872302/000121390025097024/ea0204760-11.htm",
    sharesAsOf: "2025-10-07",
    leader: "Jianping Kong (CEO)",
    strategy: "BNB treasury - target $1B, 5-10% of BNB supply. First US-listed BNB anchor.",
    notes: "$25M buyback commenced Dec 2025. Shares verified from 20-F (15.67M as of Dec 2024) - 2025 offerings may have increased count. Press releases mention BTC but no amount.",
    website: "https://www.nano.cn",
    twitter: "https://x.com/nano_labs_NA",
    investorRelationsUrl: "https://www.nano.cn/investor-relations",
    // FPI data quality flags - shares verified from 20-F but excludes 2025 offerings
    // dataFlags removed - debt now verified from 20-F
    // REMOVED: secondaryCryptoHoldings BTC - 6-K mentions "BNB and BTC" but no amount disclosed
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
    // costBasisAvg removed - needs verification
    stakingPct: 0.95,  // "required to delegate at least 90% of TAO" per Yuma Agreement; stakes via tao5 and Yuma
    stakingMethod: "Root subnet staking via tao5 and Yuma validators. BitGo Trust custody.",
    stakingSource: "SEC 10-Q Nov 14, 2025: $207K staking revenue (9mo). At least 90% delegated per Yuma Agreement. Stakes from BitGo Trust custody.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.10,
    quarterlyBurnUsd: 1_949_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000141057825001327/",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 11_000_000,
    sharesForMnav: 7_000_000,  // ~6.85M per SEC DEF 14A Oct 2025; Series E convertible ($8 strike) out of money
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/",
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
    website: "https://www.xtao.co",
    twitter: "https://x.com/xtaohq",
    investorRelationsUrl: "https://www.xtao.co/#investors",
    holdings: 59_962,
    holdingsLastUpdated: "2025-11-25",
    holdingsSource: "regulatory-filing",  // News release filed on SEDAR+ Nov 26, 2025
    holdingsSourceUrl: "https://www.newswire.ca/news-releases/xtao-provides-update-on-tao-holdings-816100068.html",
    datStartDate: "2025-07-22",
    // costBasisAvg removed - needs SEDAR verification
    // stakingPct: 1.00 removed - needs SEDAR verification
    stakingApy: 0.10,
    quarterlyBurnUsd: 450_000,  // SEDAR+ Q2 FY26 MD&A: ~$450K quarterly ops burn
    burnSource: "SEDAR+ Q2 FY26 MD&A (Sep 30, 2025)",
    burnSourceUrl: "https://www.sedarplus.ca/csa-party/records/document.html?id=b51c12a3ab4a6c90cf8f1a2b7f6e9d8a",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 30_100_000,  // $22.78M IPO (Jul 2025) + $7.3M Off the Chain (Nov 2025)
    cashReserves: 4_132_218,  // SEDAR+ Q2 FY26 MD&A (Sep 30, 2025)
    cashSource: "SEDAR+ Q2 FY26 MD&A (filed Nov 29, 2025)",
    cashSourceUrl: "https://www.sedarplus.ca/csa-party/records/document.html?id=b51c12a3ab4a6c90cf8f1a2b7f6e9d8a",
    cashAsOf: "2025-09-30",
    sharesForMnav: 38_031_285,  // 28,552,195 shares + 9,479,090 pre-funded warrants (auto-convert)
    sharesAsOf: "2025-09-30",
    sharesSource: "SEDAR+ MD&A Sep 30, 2025 (page 11: shares, page 5: warrants)",
    sharesSourceUrl: "https://www.sedarplus.ca/csa-party/records/document.html?id=b51c12a3ab4a6c90cf8f1a2b7f6e9d8a",
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
    // costBasisAvg removed - needs SEC verification
    stakingPct: 0.99,  // "average staking rate of 99% for our digital asset balance" per 10-Q
    stakingMethod: "Root subnet staking via third-party validators. BitGo Trust custody.",
    stakingSource: "SEC 10-Q Nov 13, 2025: 'average staking rate of 99%'. $99K staking rewards (9mo). Stakes from BitGo Trust custody.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/746210/000143774925034612/oblg20250930_10q.htm",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.10,
    quarterlyBurnUsd: 1_043_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/746210/000143774925016275/",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 7_500_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000746210&type=S-3",
    sharesForMnav: 3_207_210,  // SEC 10-Q Nov 13, 2025 (as of Nov 10, 2025)
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/746210/000143774925034612/",
    sharesAsOf: "2025-11-10",
    sharesSource: "SEC 10-Q Q3 2025 (filed Nov 13, 2025)",
    secCik: "746210",
    cashReserves: 3_737_000,  // Sep 30, 2025 10-Q
    restrictedCash: 3_737_000,  // Earmarked for TAO purchases - add to NAV, not subtract from EV
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/746210/000143774925034612/",
    cashAsOf: "2025-09-30",
    website: "https://taoweave.com",
    twitter: "https://x.com/taoweave",
    investorRelationsUrl: "https://taoweave.com/investor-relations",
    leader: "Peter Holst (President & CEO)",
    strategy: "Decentralized AI treasury strategy via TAO accumulation",
    notes: "Nasdaq: TWAV (changed from OBLG Dec 2025). 100% staked with BitGo. ~2.3M warrants @ $1.72.",
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
    // costBasisAvg removed - needs verification
    stakingPct: 0.13,  // 75,000 LINK staked / 562,535 total = 13.3%
    stakingMethod: "Chainlink staking with leading node operator",
    stakingSource: "SEC 8-K Dec 12, 2025: 'staked 75,000 LINK tokens directly with a leading Chainlink node operator'",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1627282/000162728225000162/cwd-20251211.htm",
    stakingAsOf: "2025-12-11",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.05,
    quarterlyBurnUsd: 2_000_000,
    burnSource: "SEC 10-Q (filed 2025-05-15): NetCashUsedInOperatingActivities $1,738,000 (2025-01-01 to 2025-03-31)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1627282/000162728225000059/",
    burnAsOf: "2025-03-31",
    avgDailyVolume: 5_000_000,
    sharesForMnav: 6_905_000,  // 6.53M Class A + 0.37M Class B = 6.9M per SEC DEF 14A Jan 7, 2026
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1627282/000162728225000028/",
    sharesAsOf: "2025-12-31",
    sharesSource: "SEC DEF 14A Jan 7, 2026 (Record Date Dec 31, 2025)",
    secCik: "1627282",
    leader: "John C. Loeffler II (CEO)",
    website: "https://caliberco.com",
    twitter: "https://x.com/CaliberCompany",
    investorRelationsUrl: "https://ir.caliberco.com/",
    strategy: "First Nasdaq LINK treasury. DCA accumulation + staking.",
    notes: "Real estate asset manager pivoting to LINK. 75K LINK staked. StoneX custody partner. ~1:19 reverse split early 2025.",
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
    // costBasisAvg removed - needs verification
    stakingPct: 1.00,  // 677,596,800 / 677,596,945 TRX staked via JustLend ≈ 100%
    stakingMethod: "Liquid staking via JustLend DAO (sTRX tokens)",
    stakingSource: "SEC 10-Q Nov 10, 2025: '677,596,800 tokens...have been staked, through JustLend, in return for approximately 549,676,892 sTRX.' $2.3M unrealized staking income.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956744/000149315225021526/form10-q.htm",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.045,
    quarterlyBurnUsd: 955_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956744/000164117225009334/",
    burnAsOf: "2025-09-30",
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
    quarterlyBurnUsd: 0,
    burnSource: "SPAC - minimal operating expenses pre-merger",
    burnSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1991453&type=10-Q",
    burnAsOf: "2025-09-30",
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
    website: "https://www.cypherpunk.com",
    twitter: "https://x.com/cypherpunk",
    investorRelationsUrl: "https://investors.leaptx.com/",
    holdings: 290_062,  // Dec 30, 2025 8-K: 290,062.67 ZEC
    holdingsLastUpdated: "2025-12-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1509745/0001104659-25-125039-index.html",
    datStartDate: "2025-10-08",  // Oct 8, 2025 PIPE closing date
    secCik: "1509745",
    costBasisAvg: 334.41,
    costBasisSource: "SEC 8-K Dec 30, 2025 - cumulative average price per ZEC",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1509745/000110465925125039/tm2534480d2_8k.htm",
    capitalRaisedPipe: 58_880_000,  // Oct 2025 PIPE gross proceeds
    sharesForMnav: 137_420_344,  // Basic (56.6M) + Pre-funded warrants (80.8M) per SEC filings
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1509745/000110465925109827/",
    sharesSource: "SEC 10-Q Q3 2025 + 8-K Oct 9, 2025 (basic + pre-funded warrants)",
    sharesAsOf: "2025-11-10",
    leader: "Douglas Onsi (CEO)",
    strategy: "Target 5% of ZEC supply (~540K ZEC). Winklevoss backed.",
    notes: "Formerly Leap Therapeutics. 1.76% of ZEC supply. ~76M common warrants @ $0.5335 (expire Oct 2035).",
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
    quarterlyBurnUsd: 3_098_000,  // Trailing avg: FY2025 $20.8M/yr + Q1 FY2026 $4.5M
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312525283111/",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 100_000_000,
    avgDailyVolume: 15_000_000,
    sharesForMnav: 36_769_677,  // DEF 14A Record Date Dec 15, 2025
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312525283111/",
    sharesSource: "SEC DEF 14A Dec 30, 2025",
    sharesAsOf: "2025-12-15",
    // Cash ($10.1M) is opex runway per 10-Q - neutral for mNAV (not for LTC, not excess)
    // Removed from mNAV calculation entirely - will be burned on operations
    // No interest-bearing debt per SEC 10-Q Q1 FY2026 (only $1.07M operating liabilities)
    leader: "Justin File (CEO)",
    strategy: "First US-listed LTC treasury. GSR as treasury manager.",
    notes: "Formerly MEI Pharma. Charlie Lee on board. Dashboard: litestrategy.com/dashboard",
    website: "https://www.litestrategy.com",
    twitter: "https://x.com/litestrategyco",
    investorRelationsUrl: "https://investors.litestrategy.com",
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
    // stakingPct: 0.042 removed - needs verification
    stakingApy: 0.03,
    quarterlyBurnUsd: 200_000,
    burnSource: "SEDAR+ FY2025 audited annual (Aug 31, 2025)",
    burnSourceUrl: "https://www.sedarplus.ca/csa-party/records/record.html?id=000044736",
    burnAsOf: "2025-08-31",
    burnEstimated: true,
    capitalRaisedAtm: 100_000_000,
    capitalRaisedAtmSource: "SEDAR+ filings (Canadian)",
    capitalRaisedAtmSourceUrl: "https://www.sedarplus.ca/csa-party/records/record.html?id=000044736",
    capitalRaisedPipe: 3_286_080,  // $2.5M Jul 2025 + $786K Dec 2025
    avgDailyVolume: 500_000,
    sedarProfile: "000044736",
    // Dec 9, 2025: 26,930,164 (Aug 31) + 4,624,000 (Dec placement) = 31,554,164
    sharesForMnav: 31_554_164,  // SEDAR+ FY2025 + Dec 9, 2025 private placement
    sharesAsOf: "2025-12-09",
    sharesSource: "SEDAR+ audited annual + Note 12 subsequent events (Dec 9 placement)",
    sharesSourceUrl: "https://www.sedarplus.ca/csa-party/records/record.html?id=000044736",
    leader: "Tomek Antoniak (CEO)",
    website: "https://www.luxxfolio.com",
    twitter: "https://x.com/luxxfolio",
    investorRelationsUrl: "https://www.luxxfolio.com/shareholder-documents/",
    strategy: "Target 1M LTC by 2026. Validator operations.",
    notes: "Canadian (CSE: LUXX). Charlie Lee + David Schwartz on advisory. 1:10 reverse split Mar 21, 2025. All dilutive instruments (14.1M) OTM at current price. Canadian disclosure: No 8-K equivalent for routine treasury updates - holdings data from quarterly/annual SEDAR+ filings only (less frequent than US filers).",
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
    stakingPct: 0.98,  // "Substantially almost all of these holdings continue to be staked"
    stakingMethod: "Native staking, liquid staking, and restaking via third-party validators",
    stakingSource: "SEC 10-Q Nov 13, 2025: 'Substantially almost all...staked, generating annualized yield of ~2.2%'. $1.01M SUI staking revenue.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000165495425012949/mcvt_10q.htm",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.022,
    quarterlyBurnUsd: 1_000_000,
    burnSource: "SEC 10-Q (filed 2025-05-13): NetCashUsedInOperatingActivities $3,646,585 (2025-01-01 to 2025-03-31)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000165495425005448/",
    burnAsOf: "2025-03-31",
    capitalRaisedAtm: 500_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001425355&type=S-3",
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
    website: "https://www.suig.io",
    twitter: "https://x.com/suig_io",
    investorRelationsUrl: "https://www.suig.io/investors",
    // otherInvestments: ~$20.7M legacy portfolio (short-term loans, commercial loans, common stock) - not included in mNAV
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
    website: "https://www.cleancoresol.com",
    twitter: "https://twitter.com/CleanCoreSol",
    secCik: "1956741",
    holdings: 733_100_000,  // Nov 12, 2025 press release (Q1 FY2026 results)
    holdingsLastUpdated: "2025-11-12",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/news-release/2025/11/13/3187485/0/en/CleanCore-Solutions-Reports-Fiscal-First-Quarter-2026-Financial-Results-and-Provides-Update-on-its-DOGE-Treasury-Strategy.html",
    datStartDate: "2025-09-05",
    quarterlyBurnUsd: 500_000,
    burnSource: "SEC 10-Q (filed 2025-11-13): NetCashUsedInOperatingActivities $3,796,652 (2025-07-01 to 2025-09-30)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956741/000121390025109642/",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 175_000_000,
    avgDailyVolume: 10_000_000,
    marketCap: 150_000_000,
    cashReserves: 12_900_000,  // Sep 30, 2025 10-Q
    restrictedCash: 12_900_000,  // 10-Q: "restricted cash...to be used for the purchase of Dogecoin"
    cashSource: "SEC 10-Q Q1 FY2026",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956741/000121390025109642/",
    cashAsOf: "2025-09-30",
    totalDebt: 0,  // Minimal liabilities per 10-Q
    sharesForMnav: 201_309_022,  // SEC 10-Q Q1 FY2026 cover page (Nov 10, 2025)
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956741/000121390025109642/",
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
    quarterlyBurnUsd: 713_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: SellingGeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1903595/000121390025065688/",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 200_000_000,
    avgDailyVolume: 5_000_000,
    marketCap: 8_000_000,  // TBH pre-merger market cap ~$8M (10.8M shares × ~$0.75)
    sharesForMnav: 10_800_000,  // TBH pre-merger shares (Nov 2025 10-Q)
    sharesSource: "SEC 10-Q (filed 2025-11-17): EntityCommonStockSharesOutstanding = 19,799,090 as of 2025-11-12",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1903595/000121390025111616/",
    sharesAsOf: "2025-11-12",
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
    website: "https://www.bitorigin.io",
    twitter: "https://x.com/BitOriginLtd",
    investorRelationsUrl: "https://www.bitorigin.io/investors",
    holdings: 70_543_745,  // Aug 2025 - was 40.5M (missed PIPE)
    holdingsLastUpdated: "2025-08-11",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/news-release/2025/08/12/3131772/0/en/Bit-Origin-Surpasses-70-Million-Dogecoin-DOGE-Holdings-Following-Private-Placement.html",
    datStartDate: "2025-07-17",  // DOGE strategy announced
    quarterlyBurnUsd: 771_000,
    burnSource: "SEC 20-F FY2025 (Jun 30, 2025)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465925105009/",
    burnAsOf: "2025-06-30",
    capitalRaisedAtm: 500_000_000,
    capitalRaisedAtmSource: "SEC 20-F / 6-K filings",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001735556&type=20-F",
    avgDailyVolume: 3_000_000,
    sharesForMnav: 1_500_000,  // Post 1:60 reverse split Jan 20, 2026 (was 88.6M -> 1.5M)
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465925105009/",
    sharesAsOf: "2026-01-20",
    sharesSource: "SEC 6-K Jan 20, 2026 (1:60 reverse split)",
    totalDebt: 16_338_506,  // $10M Series A-1 + $5M Series B-1 + $1.34M Series C-1 convertible notes
    debtSource: "SEC 20-F Oct 31, 2025 + 6-K Jan 20, 2026 (convertible notes)",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465925105009/",
    debtAsOf: "2026-01-20",
    cashReserves: 56_000,  // Yahoo Finance Total Cash (mrq): $55.64k
    cashSource: "Yahoo Finance",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465925105009/",
    cashAsOf: "2025-06-30",
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
    holdings: 13_889_000,  // Dashboard (SEC-referenced in 8-K filings)
    holdingsLastUpdated: "2026-02-12",
    holdingsSource: "company-dashboard",  // PIPE closed after Q3 10-Q; dashboard is primary until 10-K
    holdingsSourceUrl: "https://analytics-avaxone.theblueprint.xyz/",
    secReferenced: true,  // Dashboard referenced in SEC 8-K filings
    totalDebt: 1_689_415,  // SEC 10-Q Sep 30: debentures $1,372,679 + LT $41,736 + loan $275,000
    debtSource: "SEC 10-Q Q3 2025: Debentures + LongTermDebt + LoanPayable",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1826397/000149315225023464/form10-q.htm",
    debtAsOf: "2025-09-30",
    cashReserves: 894_701,  // ⚠️ PRE-PIPE. $145M+ cash came in Nov 5. TBD in 10-K.
    cashAsOf: "2025-09-30",
    cashSource: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1826397/000149315225023464/form10-q.htm",
    datStartDate: "2025-11-05",  // PIPE closed Nov 5, 2025 (name change from AgriFORCE)
    stakingPct: 0.90,  // "more than 90% of AVAX holdings staked"
    stakingApy: 0.08,
    stakingSource: "SEC 8-K Jan 28, 2026",
    stakingAsOf: "2026-01-28",
    quarterlyBurnUsd: 186_167,  // Exact from XBRL
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense $186,167",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1826397/000149315225023464/form10-q.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 100_000_000,  // S-3 shelf filed Feb 9, 2026
    capitalRaisedAtmSource: "SEC S-3 shelf registration (Feb 9, 2026)",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/Archives/edgar/data/1826397/000149315226005802/",
    capitalRaisedPipe: 219_042_206,  // $219M PIPE Nov 2025 ($145.4M cash + $73.7M AVAX)
    avgDailyVolume: 15_000_000,
    sharesForMnav: 92_672_000,  // Dashboard (post-PIPE 93.1M minus ~440K buybacks)
    sharesAsOf: "2026-02-12",
    sharesSource: "Company dashboard (post-PIPE 93,112,148 minus buybacks)",
    sharesSourceUrl: "https://analytics-avaxone.theblueprint.xyz/",
    secCik: "1826397",
    website: "https://www.avax-one.com",
    strategy: "First publicly traded AVAX treasury. Staking + validator infra + fintech M&A.",
    notes: "Nasdaq listed. $40M buyback ($1.1M executed thru Jan 25). Hivemind Capital (Matt Zhang) asset manager. 6.1M pre-funded warrants @ $0.0001 (functionally common). Scaramucci as advisor. $100M S-3 shelf filed Feb 2026.",
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
    secCik: "0001905459",  // Only Form D filings - Canadian company files with SEDAR+
    sedarProfile: "000044016",
    cusip: "45258G",
    isin: "CA45258G3061",
    asset: "HBAR",
    tier: 1,
    website: "https://www.immutableholdings.com",
    twitter: "https://x.com/ImmutableHold",
    investorRelationsUrl: "https://www.immutableholdings.com/investors",
    holdings: 48_000_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.immutableholdings.com/",
    datStartDate: "2025-07-01",
    // stakingPct: 0.50 removed - needs verification
    stakingApy: 0.065,
    quarterlyBurnUsd: 500_000,
    burnSource: "SEDAR+ Q3 2025 Interim MD&A (estimate)",
    burnSourceUrl: "https://www.sedarplus.ca/csa-party/viewInstance/resource.html?node=W1084&drmKey=1ad315a0899e6f02",
    burnAsOf: "2025-09-30",
    burnEstimated: true,
    capitalRaisedPipe: 5_000_000,
    avgDailyVolume: 1_000_000,
    marketCap: 10_000_000,
    sharesForMnav: 65_000_000,  // From holdings-history.ts
    sharesSource: "SEDAR+ Q3 2025 Interim MD&A",
    sharesSourceUrl: "https://www.sedarplus.ca/csa-party/viewInstance/resource.html?node=W1084&drmKey=1ad315a0899e6f02",
    sharesAsOf: "2025-09-30",
    leader: "Melyssa Charlton (CEO)",  // Jordan Fried was previous CEO
    strategy: "HBAR treasury via Immutable Asset Management subsidiary.",
    notes: "CBOE Canada: HOLD | OTCQB: IHLDF. Canadian company (BC), files with SEDAR+. Owns NFT.com, HBAR Labs, MyHBARWallet.",
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
