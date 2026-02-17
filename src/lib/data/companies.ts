import { Company } from "../types";
import { MSTR_PROVENANCE, MSTR_PROVENANCE_DEBUG } from "./provenance/mstr";
import { BMNR_PROVENANCE, BMNR_PROVENANCE_DEBUG, getBMNRProvenance, estimateBMNRShares } from "./provenance/bmnr";
import { MARA_PROVENANCE, MARA_PROVENANCE_DEBUG, getMARAProvenance } from "./provenance/mara";
import { DJT_PROVENANCE, DJT_PROVENANCE_DEBUG, getDJTProvenance } from "./provenance/djt";
import { NAKA_PROVENANCE, NAKA_PROVENANCE_DEBUG, getNakaProvenance } from "./provenance/naka";
import { H100_PROVENANCE, H100_PROVENANCE_DEBUG, getH100Provenance } from "./provenance/h100";

// Last verified: 2026-01-20 - HUT standalone 10,278, ABTC 5,098 (PR Dec 14; 5,427 ref'd Jan 20 but no public source found — await Feb 26 10-K)

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
    costBasisAvg: BMNR_PROVENANCE.costBasisAvg?.value || 3_893,
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
    otherInvestments: 219_000_000,  // $200M Beast Industries + $19M Eightco Holdings (OCTO) — SEC 8-K Feb 9, 2026 (accn 005707)
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
    datStartDate: "2025-06-02",  // ETH treasury strategy launched June 2, 2025
    costBasisAvg: 3_696,  // SEC Q3 2025 10-Q: $3.022B total cost / 817,747 ETH-equivalent units
    costBasisSource: "SEC 10-Q Q3 2025: Native ETH $2,304,908,135 (580,841 units) + LsETH $717,419,123 (236,906 units)",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/form10-q.htm",
    website: "https://sharplink.com",
    twitter: "https://twitter.com/SharpLinkInc",  // Renamed from SharpLinkGaming (Feb 3, 2026)
    secCik: "0001981535",
    // tokenizedAddress removed - was a pump.fun meme token, not an official tokenized stock
    stakingPct: 1.0,  // "100%" (Jul 1 8-K) / "substantially all" (Aug-Dec 8-Ks) / "nearly 100%" (Q2 earnings)
    stakingMethod: "Native staking + Lido LsETH (liquid staking)",
    stakingSource: "SEC 8-K Dec 17, 2025: 639,241 native ETH + 224,183 LsETH as-if-redeemed. Cumulative rewards: 9,241 ETH (3,350 native + 5,891 LsETH)",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225028063/form8-k.htm",
    stakingAsOf: "2025-12-14",
    quarterlyBurnUsd: 2_728_000,  // 9-month avg: $8,183,743 continuing ops / 3 = $2.73M/qtr (Q3 alone was $6.3M but volatile)
    burnSource: "SEC 10-Q Q3 2025: NetCashUsedInOperatingActivities continuing ops = $8,183,743 (9mo) / 3 quarters",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/form10-q.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 2_000_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225014878/forms-3asr.htm",
    avgDailyVolume: 300_000_000,
    hasOptions: true,
    marketCap: 2_050_000_000,  // ~$2.05B (Jan 2026)
    sharesForMnav: 196_690_000,  // 196.69M basic shares (matches SBET dashboard methodology)
    sharesSource: "SEC 10-Q (filed 2025-11-12): EntityCommonStockSharesOutstanding = 196,693,191 as of 2025-11-12",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/form10-q.htm",
    sharesAsOf: "2025-11-12",
    cashReserves: 11_100_000,  // $11.1M cash (Q3 2025)
    restrictedCash: 11_100_000,  // Operating capital - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/form10-q.htm",
    cashAsOf: "2025-09-30",
    totalDebt: 0,  // Debt-free per SEC 10-Q Q3 2025 (was $12.8M in 2023, paid off)
    debtSource: "SEC 10-Q Q3 2025",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/form10-q.htm",
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
    holdings: 155_239,  // Jan 31, 2026 (Feb 6, 2026 press release)
    holdingsLastUpdated: "2026-01-31",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-january-2026/",
    datStartDate: "2025-01-01",
    website: "https://bit-digital.com",
    twitter: "https://x.com/BitDigital_BTBT",
    investorRelationsUrl: "https://bit-digital.com/investors/",
    costBasisAvg: 3_045,
    costBasisSource: "PR Jan 7, 2026 - 'total average ETH acquisition price'",
    costBasisSourceUrl: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-december-2025/",
    stakingPct: 0.89,  // 138,263 / 155,227 = 89% staked
    stakingApy: 0.029,  // 2.9% annualized yield (Jan 2026 PR)
    stakingMethod: "Native staking (via Figment, with EigenLayer restaking)",
    stakingSource: "PR Feb 6, 2026: ~2.9% annualized yield (Jan 2026). Dec PR: 138,263/155,227 ETH staked (89%).",
    stakingSourceUrl: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-january-2026/",
    stakingAsOf: "2026-01-31",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    quarterlyBurnUsd: 0,  // Q1 2025 OpCF was +$17.4M (inflow, not outflow). Post-pivot burn unclear — await FY2025 10-K.
    burnSource: "SEC 10-Q Q1 2025 XBRL: OpCF +$17.4M (cash positive). Pre-pivot figure, not representative.",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1710350/000121390025044155/ea0241656-10q_bitdigital.htm",
    burnAsOf: "2025-03-31",
    capitalRaisedAtm: 172_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/Archives/edgar/data/1710350/000121390025037166/",
    avgDailyVolume: 80_000_000,
    hasOptions: true,
    marketCap: 760_000_000,  // ~$760M (Jan 2026)
    sharesForMnav: 324_202_059,  // Feb 6, 2026 press release (basic shares, Jan 31 2026)
    sharesSource: "Feb 6, 2026 PR: 'Bit Digital shares outstanding were 324,202,059 as of January 31, 2026'",
    sharesSourceUrl: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-january-2026/",
    sharesAsOf: "2026-01-31",
    cashReserves: 179_118_182,  // Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue
    restrictedCash: 179_118_182,  // Operating capital (miner) - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1710350/000121390025110383/ea0263546-10q_bitdigital.htm",
    cashAsOf: "2025-09-30",
    totalDebt: 150_000_000,  // $150M convertible notes ($135M upsized + $15M overallotment). Lease liabilities excluded (operating, offset by ROU assets).
    debtSource: "PR Oct 8, 2025: '$150 million convertible notes offering, which included the underwriters' full exercise of their over-allotment option'",
    debtSourceUrl: "https://bit-digital.com/press-releases/bit-digital-inc-purchases-31057-eth-with-convertible-notes-proceeds-raising-capital-at-a-premium-to-mnav/",
    debtAsOf: "2025-10-02",
    preferredEquity: 9_050_000,  // 1M preferred shares at $9.05M book value (Q3 2025 10-Q balance sheet)

    otherInvestments: 527_600_000,  // WhiteFiber (WYFI) ~27M shares @ ~$19.54 (Feb 6, 2026 PR)
    leader: "Sam Tabar",
    strategy: "89% staked, fully exited BTC. $150M 4% converts due 2030. Majority stake in WhiteFiber (WYFI) AI/HPC.",
    notes: "Staking yield ~2.9% annualized. $528M WhiteFiber (WYFI) stake - AI infrastructure.",
  },
  {
    id: "btcs",
    name: "BTCS Inc.",
    ticker: "BTCS",
    secCik: "0001436229",
    asset: "ETH",
    tier: 2,
    holdings: 60_500,  // Feb 5, 2026 8-K
    holdingsLastUpdated: "2026-02-05",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1436229/000149315226005565/form8-k.htm",
    datStartDate: "2024-01-01",
    website: "https://www.btcs.com",
    twitter: "https://x.com/NasdaqBTCS",
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1436229/000149315225022359/form10-q.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 60_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://efts.sec.gov/LATEST/search-index?q=%22BTCS%22&forms=S-3",
    avgDailyVolume: 15_000_000,
    hasOptions: true,
    sharesForMnav: 47_149_138,  // BASIC: 46,838,532 (XBRL Nov 10) + 310,606 (Jan 5 8-K grants). Dilutives in dilutive-instruments.ts
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1436229/000149315225022359/form10-q.htm",
    sharesSource: "SEC XBRL Nov 10, 2025 + 8-K Jan 5, 2026",
    sharesAsOf: "2026-01-05",
    leader: "Charles Allen",
    totalDebt: 61_660_526,  // $7,810,526 May convert + $10,050,000 Jul convert + $43,800,000 Aave DeFi
    debtSource: "SEC 8-K Feb 6, 2026: $43.8M Aave DeFi debt + Q3 10-Q: $17.86M convertible notes face value",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1436229/000149315226005565/form8-k.htm",
    debtAsOf: "2026-02-05",
    cashReserves: 4_486_051,
    cashSource: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1436229/000149315225022359/form10-q.htm",
    cashAsOf: "2025-09-30",
    stakingApy: 0.03,  // ~3% estimated from ETH network consensus rate; NodeOps + Builder+ revenues not separable in 10-Q
    strategy: "ETH 'Bividend,' DeFi/TradFi flywheel, Builder+",
    notes: "Verified 2026-02-16. Aave DeFi leverage: $43.8M USDT borrowed (~6% variable) against ~39K ETH collateral. " +
      "Board max LTV 40%, Aave liquidation at 80%. Q3 LTV was 34.9%. " +
      "Converts secured by all assets (excl. Aave collateral), 6% interest. " +
      "15.7M Series V Preferred outstanding (non-convertible per 10-K FY2024, no dilutive impact). " +
      "712,500 pre-2021 warrants expiring ~Mar 2026 (deeply OTM at $11.50).",
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1714562/000149315225023589/form10-q.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 30_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001714562&type=S-3",
    // Shares: 98,380,767 (SEC 10-Q Sep 30) - 3,535,574 buybacks (Oct-Jan) = 94,845,193
    sharesForMnav: 94_845_193,
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1714562/000149315225023589/form10-q.htm",
    sharesSource: "SEC 10-Q Sep 30 (98.4M) - 3.54M buybacks through Jan 6, 2026",
    sharesAsOf: "2026-01-06",
    cashReserves: 6_012_219,  // SEC 10-Q Sep 30, 2025
    // TODO: No debt - review if cash should be restricted (not subtracted from EV)
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1714562/000149315225023589/form10-q.htm",
    cashAsOf: "2025-09-30",
    // Note: Convertible debt fully converted to equity. Preferred stock: $5.15M liquidation value
    preferredEquity: 5_150_000,  // Series A-1 Preferred (3,433 shares @ $1.50 liquidation preference on as-converted basis)
    preferredSource: "SEC 10-Q Q3 2025: PreferredStockValue $5,150,000 (3,433 Series A-1 shares)",
    preferredSourceUrl: "https://www.sec.gov/Archives/edgar/data/1714562/000149315225023589/form10-q.htm",
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
    costBasisAvg: 3_854,  // $195.7M / 50,778 ETH (Sep 30 Q3 2025) — blended, pre-sales
    costBasisSource: "SEC 10-Q Q3 2025 (aggregate cost $195.7M for 50,778 ETH)",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315225023550/form10-q.htm",
    datStartDate: "2025-07-30",
    website: "https://fgnexus.io",
    secCik: "1591890",
    stakingMethod: "Native staking via Anchorage/Bitgo through Galaxy Digital",
    // 10-Q Q3 2025: G&A $7.24M for 9 months = ~$2.4M/qtr
    quarterlyBurnUsd: 2_400_000,
    burnSource: "SEC 10-Q Q3 2025 (G&A $7.24M / 3 quarters)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315225023550/form10-q.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 200_000_000,
    avgDailyVolume: 10_000_000,
    // VERIFIED: SEC 8-K Jan 21, 2026 (33.6M pre-split) ÷ 5 (1:5 reverse split Feb 13, 2026)
    sharesForMnav: 6_720_000,
    sharesSource: "SEC 8-K Jan 21, 2026 (33.6M pre-split incl PFWs) ÷ 5 (1:5 reverse split Feb 13, 2026)",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315226006729/form8-k.htm",
    sharesAsOf: "2026-02-13",
    // VERIFIED: SEC 8-K Dec 19, 2025 (cash + USDC)
    cashReserves: 25_200_000,
    cashSource: "SEC 8-K Dec 19, 2025 (cash + USDC)",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315225028609/ex99-1.htm",
    cashAsOf: "2025-12-17",
    // VERIFIED: SEC 8-K Jan 21, 2026 - $1.9M total debt
    totalDebt: 1_900_000,
    debtSource: "SEC 8-K Jan 21, 2026",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315226003101/ex99-1.htm",
    debtAsOf: "2026-01-20",
    preferredEquity: 21_040_000,  // ~841,580 Series A preferred × $25 par (894,580 issued - ~53K repurchased)
    preferredSource: "SEC 10-Q Q3 2025 + 8-K Jan 21, 2026 (buyback ~53K shares)",
    preferredSourceUrl: "https://www.sec.gov/Archives/edgar/data/1591890/000149315225023550/form10-q.htm",
    leader: "Kyle Cerminara (CEO); Galaxy, Kraken, Hivemind, DCG backed",
    strategy: "Premier ETH pure-play treasury. $5B fundraise plan.",
    notes: "Nasdaq: FLD/FGNXP. Formerly Fundamental Global. 1:5 reverse split effective Feb 13, 2026. " +
      "Peaked at ~50.8K ETH Oct 2025, sold ~13K for buybacks through Jan 2026. " +
      "894,580 Series A preferred ($25 par, 8% cumulative, non-convertible, ticker FGNXP) — buyback program active. " +
      "ATM ($5B shelf with ThinkEquity) suspended since Oct 2025. $10M crypto loan facility (evergreen, 7.9%, currently repaid). " +
      "Staking ETH via Anchorage/Bitgo through Galaxy Digital. Deutsche Börse listing as LU51.",
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
    holdings: MSTR_PROVENANCE.holdings?.value || 714_644,
    holdingsLastUpdated: MSTR_PROVENANCE_DEBUG.holdingsDate,
    holdingsSource: "sec-filing",
    holdingsSourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K`,
    datStartDate: "2024-01-01",
    website: "https://www.strategy.com",
    twitter: "https://twitter.com/Strategy",
    secCik: "0001050446",
    // COST BASIS: from provenance
    costBasisAvg: MSTR_PROVENANCE.costBasisAvg?.value || 76_056,
    costBasisSource: "SEC 8-K (provenance-tracked)",
    costBasisSourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K`,
    isMiner: false,
    // QUARTERLY BURN: from provenance
    quarterlyBurnUsd: MSTR_PROVENANCE.quarterlyBurn?.value ?? 15_200_000,
    burnAsOf: "2025-11-03",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312525262568/mstr-20250930.htm",
    avgDailyVolume: 3_000_000_000,
    hasOptions: true,
    // SHARES: from provenance (10-Q baseline + 8-K ATM + 10-Q employee equity + Class B)
    sharesForMnav: MSTR_PROVENANCE.sharesOutstanding?.value || 333_083_000,
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
    cashObligationsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312525303157/d69948d8k.htm",
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
    costBasisAvg: 102_875,  // From provenance (JPY cost ÷ holdings, converted at current FX). Analytics shows $107,607 at different FX rate.
    costBasisSource: "Metaplanet provenance (54 acquisitions, JPY-denominated, FX-converted)",
    costBasisSourceUrl: "https://metaplanet.jp/en/analytics",
    isMiner: false,
    quarterlyBurnUsd: 5_000_000,  // Estimated from Q3 FY2025 operating expenses
    burnSource: "TDnet Q3 FY2025 Financial Results (estimated)",
    burnSourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 200_000_000,
    marketCap: 2_430_000_000,  // ~$2.4B (Feb 2026, 1.167B shares × ¥325 ÷ 152.7 JPY/USD)
    sharesForMnav: 1_166_803_340,  // 1,142,274,340 (Jan 29, 2026) + 24,529,000 (Feb 13 placement). Mercury preferred is a separate class, NOT in common count.
    sharesSource: "TDnet: 1,142,274,340 common (Jan 29, 2026) + 24,529,000 new common shares (Feb 13, 2026 3rd-party allotment)",
    sharesSourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    sharesAsOf: "2026-02-13",
    // Debt: 4 credit facilities totaling $355M (all zero-coupon bonds have been fully redeemed)
    totalDebt: 355_000_000,  // $355M: $75M (Jan 30) + $50M (Dec 1) + $130M (Nov 21) + $100M (Nov 4) credit facilities
    debtSource: "Metaplanet Analytics Dashboard — 4 credit facilities outstanding, all zero-coupon bonds redeemed ($0 remaining).",
    debtSourceUrl: "https://metaplanet.jp/en/analytics",
    debtAsOf: "2026-02-14",
    cashReserves: 97_000_000,  // Estimated from capital flow trace: $18M (Q3) + $590M inflows - $511M outflows ≈ $97M. Mercury corrected to $155M (was $136M). Confirm with FY2025 annual report.
    restrictedCash: 0,
    cashSource: "Estimated: Q3 $18M + $355M credit + $155M Mercury preferred (corrected FX) + $80M Feb placement - $451M BTC - $60M redemptions/repayments/opex",
    cashSourceUrl: "https://metaplanet.jp/en/shareholders/disclosures",
    cashAsOf: "2026-02-14",
    preferredEquity: 155_000_000,  // Mercury Class B preferred at par: 23.61M shares × ¥1,000 = ¥23.61B (~$155M at 152.7 FX). Consistent with MSTR STRK/STRF treatment (par value). Metaplanet's dashboard excludes preferred from EV entirely (their mNAV ~1.07x); we include at par.
    leader: "Simon Gerovich (CEO)",
    strategy: "Japan's BTC treasury leader. Targeting 210K BTC by 2027 ('555 Million Plan'). Uses moving-strike warrants + preferred shares for capital efficiency. Currently raising via 25th series warrants (Jan 2026) for BTC purchases.",
    notes: "Largest Asian public BTC holder. Reports BTC Yield (growth in BTC per share). Capital strategy: issue equity when mNAV > 1x, pivot to preferred shares when near 1x. $355M in credit facilities outstanding (4 draws from BTC-backed facility). All zero-coupon bonds (series 2-19) fully redeemed.",
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
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390025121293/ea026946001ex99-4_twenty.htm#:~:text=31%2C500%20Bitcoin",
    // Breakdown: Contribution 31,500 + PIPE Bitcoin ~11,533 + In-Kind PIPE ~392 = ~43,425
    datStartDate: "2025-12-09",
    costBasisAvg: 91_400,  // Blended: $3,977,198,487 / 43,514.113 BTC per S-1/A (31,500 at $90,560 FV + PIPE at various prices)
    costBasisSource: "SEC S-1/A Feb 9, 2026: Blended cost basis from Tether/Bitfinex contribution ($90,560.40/BTC) + PIPE purchases ($85K-$108K/BTC)",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390026001285/ea0270549-s1_twenty.htm",
    isMiner: false,
    stakingPct: 0,  // BTC not staked
    // No burn data yet - awaiting first 10-Q (merged Dec 2025)
    avgDailyVolume: 150_000_000,
    hasOptions: true,
    // DUAL-CLASS: 346,548,153 Class A + 304,842,759 Class B = 651,390,912 total
    // Class B has ZERO economic rights (no dividends, no liquidation) per charter
    sharesForMnav: 346_548_153,  // Class A ONLY — Class B has no economic rights
    sharesSource: "SEC 8-K Dec 12, 2025",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390025121293/0001213900-25-121293-index.htm",
    sharesAsOf: "2025-12-09",
    // Debt: $486.5M 1% convertible senior secured notes due 2030, collateralized by 16,116 BTC (~3:1 ratio)
    totalDebt: 486_500_000,
    debtSource: "SEC 8-K Dec 12, 2025 - 1% secured converts due 2030",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390025121293/ea0269460-8k_twenty.htm",
    debtAsOf: "2025-12-09",
    // Cash obligations: $486.5M × 1% = $4.865M/year
    debtInterestAnnual: 4_865_000,
    cashObligationsAnnual: 4_865_000,
    cashObligationsSource: "SEC S-1 Jan 2026: 1% convertible notes",
    cashObligationsSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390026001285/ea0270549-s1_twenty.htm",
    cashObligationsAsOf: "2025-12-09",
    cashReserves: 119_300_000,  // ~$119.3M net cash at Dec 2025 closing
    restrictedCash: 119_300_000,  // Debt service reserves - not excess
    cashSource: "SEC S-1 Jan 5, 2026",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/2070457/000121390026001285/ea0270549-s1_twenty.htm",
    cashAsOf: "2025-12-09",
    leader: "Jack Mallers (CEO)",
    strategy: "BTC treasury + Bitcoin-native financial services. Tether/SoftBank/Cantor backed.",
    notes: "Merged Dec 2025. 16,116 BTC collateralizes debt at ~3:1 ratio. #3 corporate BTC holder.",
  },
  {
    id: "cepo",  // BSTR Holdings pre-merger
    name: "BSTR Holdings",
    ticker: "CEPO",
    secCik: "0002027708",  // BSTR/Blockstream SPAC (0001865602 was Cantor → XXI)
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1865602/000121390025044273/ea0241012-10q_cantor.htm",
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
    costBasisAvg: MARA_PROVENANCE.costBasisAvg?.value || 87_752,
    costBasisSource: "SEC-verified (provenance): 10-Q Q3 2025",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm",
    costBasisAsOf: MARA_PROVENANCE_DEBUG.balanceSheetDate,
    isMiner: true,
    // QUARTERLY BURN: from provenance (G&A only, mining COGS excluded)
    quarterlyBurnUsd: MARA_PROVENANCE.quarterlyBurn?.value ?? 85_296_000,
    burnSource: "SEC-verified (provenance): 10-Q Q3 2025 G&A (mining COGS excluded)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm",
    burnAsOf: MARA_PROVENANCE_DEBUG.balanceSheetDate,
    avgDailyVolume: 400_000_000,
    hasOptions: true,
    marketCap: 3_600_000_000,
    // SHARES: from provenance (basic shares, dilutives in dilutive-instruments.ts)
    sharesForMnav: MARA_PROVENANCE_DEBUG.sharesBasic,
    sharesSource: "SEC-verified (provenance): 10-Q Q3 2025 cover page",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm",
    sharesAsOf: MARA_PROVENANCE_DEBUG.sharesDate,
    // CASH: from provenance (10-Q)
    cashReserves: MARA_PROVENANCE.cashReserves?.value || 826_392_000,
    restrictedCash: 12_000_000,  // SEC 10-Q Q3 2025: $12,000K restricted cash
    cashSource: "SEC-verified (provenance): 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm",
    cashAsOf: MARA_PROVENANCE_DEBUG.balanceSheetDate,
    leader: "Fred Thiel (CEO)",
    strategy: "HODL miner - keeps all mined BTC. 50 EH/s.",
    // DEBT: from provenance (~$3.25B in convertible notes)
    totalDebt: MARA_PROVENANCE.totalDebt?.value || 3_597_561_000,
    debtSource: "SEC-verified (provenance): 10-Q Q3 2025 XBRL (LongTermDebt + LinesOfCreditCurrent)",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1507605/000150760525000028/mara-20250930.htm",
    debtAsOf: MARA_PROVENANCE_DEBUG.balanceSheetDate,
    notes: "Largest US public miner. Core financials from provenance/mara.ts. 5 convertible note tranches ($3.298B face) per 10-Q Note 14 + $350M line of credit. Dilutives (~132M from converts + RSUs) in dilutive-instruments.ts.",
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
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000162828026007897/asst-20260213.htm",
    datStartDate: "2024-05-01",
    website: "https://strive.com",
    twitter: "stikiinvestor",
    investorRelationsUrl: "https://investors.strive.com",
    secCik: "0001920406",
    isMiner: false,
    // BURN: SEC 10-Q Q3 2025
    quarterlyBurnUsd: 6_500_000,  // Predecessor 9mo OpCF: -$18.2M / ~2.8 quarters = ~$6.5M/qtr (Successor 19-day period distorted by merger costs)
    burnSource: "SEC 10-Q Q3 2025: Predecessor OpCF -$18,209K (Jan 1 - Sep 11, 254 days). Successor 19 days not representative.",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000162828025052343/asst-20250930.htm",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 100_000_000,
    hasOptions: false,  // No stock options granted per SEC data
    // SHARES: Anchor 44.7M post-split as of Dec 31, 2025 (SEC 8-K Jan 5, 2026: 894.3M pre-split ÷ 20)
    // + Semler merger shares (Jan 16) + PIPE/SATA offering shares (Jan 21-28) = ~62.37M estimated
    // Pre-funded warrants @ $0.002 tracked in dilutive-instruments.ts
    sharesForMnav: 63_048_519,  // Feb 13 8-K: Class A 53,168,237 + Class B 9,880,282 (post-split)
    sharesSource: "SEC 8-K Feb 13, 2026: 53,168,237 Class A + 9,880,282 Class B = 63,048,519 (post 1-for-20 split)",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000162828026007897/asst-20260213.htm",
    sharesAsOf: "2026-02-11",
    // CASH: SEC 8-K Jan 5, 2026 - $67.6M as of Dec 31, 2025
    // Post-Jan: +$119M SATA raise, -$20M Coinbase payoff, -BTC purchases → estimated ~$50-80M current
    cashReserves: 127_200_000,  // Feb 13 8-K: $127.2M as of Feb 11, 2026
    restrictedCash: 127_200_000,  // Operating capital earmarked for BTC - not excess
    cashSource: "SEC 8-K Feb 13, 2026: $127.2M as of Feb 11, 2026",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000162828026007897/asst-20260213.htm",
    cashAsOf: "2026-02-11",
    // DEBT: $100M Semler converts - $90M exchanged for SATA = $10M remaining (SEC 8-K Jan 28)
    // Coinbase $20M loan also paid off. 100% BTC unencumbered.
    totalDebt: 10_000_000,
    debtSource: "Company-derived: $100M Semler converts - $90M exchanged = $10M (SEC 8-K Jan 28, 2026)",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000114036126002606/ny20063534x6_8k.htm",
    debtAsOf: "2026-01-28",
    // PREFERRED: SATA 12.25% perpetual preferred (NOT convertible to common)
    // Dec 31: 2,012,729 SATA (SEC 8-K Jan 5) + Jan: 1.32M underwritten + ~930K exchange = ~4.26M @ $100 stated value
    preferredEquity: 426_551_800,  // Feb 13 8-K: 4,265,518 SATA shares × $100 stated value
    preferredSource: "SEC 8-K Feb 13, 2026: 4,265,518 SATA shares outstanding × $100 stated value",
    preferredSourceUrl: "https://www.sec.gov/Archives/edgar/data/1920406/000162828026007897/asst-20260213.htm",
    preferredAsOf: "2026-02-11",
    leader: "Vivek Ramaswamy (Co-Founder), Matt Cole (CEO), Eric Semler (Exec Chair)",
    strategy: "First publicly traded asset manager with BTC treasury. No debt - uses perpetual preferred (SATA) instead. Merged with Asset Entities Sep 2025, acquired Semler Scientific Jan 2026.",
    notes: "1-for-20 reverse split Feb 6, 2026. SATA 12.50% perpetual preferred (4,265,518 shares) NOT convertible to common. Pre-funded warrants (53.6K @ $0.002) and traditional warrants (26.6M @ $27) tracked in dilutive-instruments.ts. ~$10M Semler converts remaining, planned retirement by Apr 2026.",
  },
  {
    id: "kulr",
    name: "KULR Technology",
    ticker: "KULR",
    asset: "BTC",
    tier: 1,
    holdings: 1_057,  // Q3 2025 10-Q: 1,056.7 BTC held (excludes 70 BTC pledged as collateral). Total incl. collateral = 1,127.
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
    datStartDate: "2024-12-01",
    secCik: "1662684",
    costBasisAvg: 101_024,  // SEC 10-Q Q3 2025: $106,785,454 cost basis / 1,057 BTC
    costBasisSource: "SEC 10-Q Q3 2025: digital assets cost basis $106,785,454 (1,057 BTC)",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
    isMiner: false,
    quarterlyBurnUsd: 10_300_000,  // Q3 2025 operating cash burn: SG&A $6.26M + R&D $2.32M + COGS $6.26M - revenue $6.88M ≈ $7.96M opex; cash flow statement shows ~$10.3M/qtr
    burnSource: "SEC 10-Q Q3 2025 XBRL: NetCashUsedInOperatingActivities (~$10.3M/qtr from cash flow)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 30_000_000,
    hasOptions: true,
    // marketCap calculated from sharesForMnav × price (removed static override)
    sharesForMnav: 45_674_420,  // SEC 10-Q Q3 2025 (as of Nov 14, 2025)
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
    sharesSource: "SEC 10-Q Q3 2025",
    sharesAsOf: "2025-11-14",
    totalDebt: 0,  // Coinbase loan repaid in full Oct 15, 2025 (10-Q subsequent events). Dec 22, 2025 8-K: "carries no debt". $20M facility available but undrawn.
    debtSource: "SEC 10-Q Q3 2025 subsequent events + Dec 22, 2025 8-K",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
    debtAsOf: "2025-10-15",
    cashReserves: 20_600_000,  // SEC 10-Q Q3 2025 (Sep 30, 2025)
    restrictedCash: 20_600_000,  // Earmarked for BTC purchases per 90% policy - not excess cash
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1662684/000110465925113662/tmb-20250930x10q.htm",
    cashAsOf: "2025-09-30",
    leader: "Michael Mo (CEO)",
    strategy: "Bitcoin First Company. 90% of excess cash to BTC. Reports BTC Yield.",
    website: "https://kulr.ai",
    twitter: "https://x.com/KULRTech",
    notes: "NASA supplier. 291% BTC Yield YTD. ATM paused Dec 2025 through Jun 2026. Coinbase loan repaid Oct 15, 2025 — carries no debt. 70 BTC collateral likely released post-repayment.",
  },
  {
    id: "altbg",
    name: "The Blockchain Group",
    ticker: "ALCPB",  // Changed from ALTBG (Capital B rebrand)
    currency: "EUR",
    asset: "BTC",
    tier: 2,
    website: "https://cptlb.com",
    holdings: 2_828,  // AMF filing Feb 9, 2026 (2,828 BTC total)
    holdingsLastUpdated: "2026-02-09",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2026/02/FCACT078219_20260209.pdf",
    datStartDate: "2024-12-01",
    // costBasisAvg removed - needs verification
    isMiner: false,
    quarterlyBurnUsd: 800_000,  // ~€0.75M/quarter from H1 2025 IFRS (was $2M — too high by ~2.7x)
    burnSource: "H1 2025 IFRS financials (~€0.72M/quarter operating cash burn)",
    burnSourceUrl: "https://cptlb.com",
    burnAsOf: "2025-06-30",
    burnEstimated: true,  // No XBRL; estimated from H1 2025 actuals
    avgDailyVolume: 10_000_000,
    marketCap: 200_000_000,
    sharesForMnav: 227_468_631,  // Basic shares per Feb 9, 2026 press release. Diluted: ~390M (389,888,020)
    sharesSource: "Company press release Feb 9, 2026",
    sharesSourceUrl: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2026/02/FCACT078219_20260209.pdf",
    sharesAsOf: "2026-02-09",
    // Total convertible bond face value (all OCA tranches). The mNAV calculator dynamically
    // subtracts ITM convertible faceValues from totalDebt, so we include ALL tranches here.
    // At stock ~€0.60: OCA Tranche 1 ($50.5M, strike $0.57) is ITM → subtracted from debt.
    // Remaining OTM: B-02 ($73.2M), B-03 ($13M), A-03/A-04/B-04 ($16.6M), A-05 ($6.8M) = ~$109.6M effective debt.
    totalDebt: 160_160_000,  // Sum of all OCA faceValues in dilutive-instruments.ts (USD)
    debtSource: "Convertible bond face values (OCA A-01/B-01 through A-05). See dilutive-instruments.ts for breakdown.",
    debtAsOf: "2026-02-09",
    cashReserves: 0,  // TODO: Update from FY 2025 financials when available. Company raised significant capital via ATM + OCA convertibles, but cash position unclear without IFRS statements.
    cashSource: "Needs FY 2025 IFRS financials",
    cashAsOf: "2025-06-30",  // Last known: H1 2025 IFRS
    strategy: "French BTC treasury company (Capital B). EUR300M ATM program.",
    notes: "Euronext Paris listed. Europe's Strategy equivalent. Data via AMF API.",
    dataWarnings: [
      {
        type: "unverified-shares",
        message: "Share counts sourced from company press release (Feb 9, 2026 AMF filing). Company IR pages are JS-rendered and not crawlable.",
        severity: "info",
      },
      {
        type: "stale-data",
        message: "Active EUR 300M ATM program — share count may be stale between AMF filings. Last update: Feb 9, 2026 (227.5M basic shares).",
        severity: "warning",
      },
    ],
  },
  {
    id: "h100st",
    name: "H100 Group",
    ticker: "H100.ST",
    website: "https://www.h100.group",
    currency: "SEK",
    asset: "BTC",
    tier: 2,
    holdings: 1_051,  // MFN Feb 6, 2026: 4.39 BTC purchase → 1,051 total
    holdingsLastUpdated: "2026-02-06",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://mfn.se/a/h100-group/h100-group-acquires-4-39-btc-total-holdings-reach-1-051-btc",  // MFN Feb 6, 2026 filing (specific URL)
    datStartDate: "2025-05-22",  // First BTC purchase May 22, 2025
    costBasisAvg: 114_606,  // treasury.h100.group avg cost
    costBasisSource: "company-website",
    costBasisSourceUrl: "https://treasury.h100.group",
    isMiner: false,
    quarterlyBurnUsd: 1_000_000,
    burnSource: "MFN Interim Report Nov 19, 2025 (estimate - no XBRL)",
    burnSourceUrl: "https://mfn.se/a/h100-group",
    burnAsOf: "2025-09-30",
    burnEstimated: true,  // Swedish quarterly report estimate
    totalDebt: 0,  // Unknown — pending Feb 24, 2026 Bokslutskommuniké. Convertible SEK 219.8M (~$20.7M) outstanding but may be equity-classified under IFRS.
    cashReserves: 0,  // Unknown — pending Feb 24, 2026 Bokslutskommuniké
    avgDailyVolume: 5_000_000,
    // marketCap calculated from sharesForMnav x price
    sharesForMnav: 338_396_693,  // 335,250,237 + 3,146,456 (Future Holdings AG acquisition Feb 12, 2026)
    sharesSource: "H100 Group IR page + MFN acquisition filing",
    sharesSourceUrl: "https://www.h100.group/investor-relations/shares",
    sharesAsOf: "2026-02-12",  // MFN filing date for Future Holdings AG acquisition completion
    leader: "Sander Andersen (Executive Chairman), Johannes Wiik (CEO)",
    strategy: "Swedish BTC treasury company. Nordic Strategy equivalent.",
    notes: "NGM Nordic SME listed. ISK-eligible. Jul 2025: SEK 342.3M zero-coupon convertible debentures (Adam Back et al) + multiple directed equity issues. SEK 122.5M converted Nov 2025. Acquired Future Holdings AG (Switzerland) Feb 2026. IR page incorrectly claims 'no convertibles'.",
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
    holdings: 2_689,  // RNS Feb 11, 2026: "Total Bitcoin Holdings are now 2,689 Bitcoin"
    holdingsLastUpdated: "2026-02-11",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www.smarterwebcompany.co.uk/bitcoin-treasury/analytics-/",  // RNS PDF was at _files/ugd/6ffd5f_aa5f1f919c42462a81cf286f54dd191d.pdf but returns 404 (Wix site reorganized)
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
    sharesForMnav: 396_602_526,  // Company analytics + RNS Feb 9, 2026 admission update
    sharesSource: "Company analytics page + RNS Feb 9, 2026",
    sharesSourceUrl: "https://www.smarterwebcompany.co.uk/bitcoin-treasury/analytics-/",
    sharesAsOf: "2026-02-09",
    strategy: "UK BTC treasury company. 'The 10 Year Plan' - explicit policy of acquiring Bitcoin as treasury reserve.",
    notes: "LSE: SWC | OTCQB: TSWCF | FRA: 3M8. #1 UK BTC holder. Total invested GBP 222.19M at avg GBP 82,630/BTC (RNS Feb 11, 2026). Companies House shows ~696M total shares but latest publicly displayed company-reported fully diluted share count is 396.6M; difference likely includes deferred shares from shell restructuring (was Uranium Energy Exploration PLC until Apr 2025). Using company-reported fully diluted figure for mNAV.",
    dataWarnings: [],
  },
  {
    id: "sqns",
    name: "Sequans Communications",
    ticker: "SQNS",
    asset: "BTC",
    tier: 2,
    holdings: 2_139,  // Q4 2025 6-K: 2,139 BTC at Dec 31, 2025 (1,617 pledged as collateral)
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1383395/000138339526000013/q42025earningspressrelease.htm",
    datStartDate: "2025-06-23",
    website: "https://sequans.com",
    twitter: "https://twitter.com/Sequans",
    investorRelationsUrl: "https://sequans.com/investor-relations/investor-materials/",
    secCik: "0001383395",
    isMiner: false,
    quarterlyBurnUsd: 10_000_000,  // IoT semiconductor ops — estimate based on Q4 non-IFRS loss ~$18.5M less BTC-related items
    burnSource: "6-K Q4 2025 earnings (estimate)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1383395/000138339526000013/q42025earningspressrelease.htm",
    burnAsOf: "2025-12-31",
    burnEstimated: true,
    avgDailyVolume: 5_000_000,
    sharesForMnav: 15_504_809,  // Q4 2025 6-K weighted avg basic ADS. Best available until 20-F.
    sharesSource: "6-K Q4 2025 weighted avg basic ADS (1,599,589,702 ordinary shares / ~100 ADS ratio)",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1383395/000138339526000013/q42025earningspressrelease.htm",
    sharesAsOf: "2025-12-31",
    totalDebt: 94_500_000,  // Q4 6-K: $94.5M convertible outstanding. Feb 13 6-K: full redemption via BTC sale by Jun 2026.
    debtSource: "6-K Q4 2025 + Feb 13, 2026 debt restructuring 6-K",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1383395/000138339526000018/form6k-2026xfebruaryxdebtr.htm",
    strategy: "IoT semiconductor company with BTC treasury strategy. Raised $189M convertible debt for BTC. Actively selling 1,617 pledged BTC to fully redeem $94.5M convertible by Jun 2026.",
    notes: "NYSE listed (French HQ). 1,617 of 2,139 BTC pledged as collateral — being sold to redeem convertible (Feb 13 6-K). Post-redemption holdings will be ~522 BTC unencumbered. ADS buyback: ~9.7% repurchased in Q4, additional 10% authorized.",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Holdings declining: 1,617 BTC being sold to redeem convertible debt by Jun 2026",
        severity: "warning",
      },
    ],
  },
  {
    id: "ddc",
    name: "DDC Enterprise",
    ticker: "DDC",
    twitter: "ddcbtc_",
    asset: "BTC",
    tier: 2,
    holdings: 1_988,  // treasury.ddc.xyz Feb 11, 2026
    holdingsLastUpdated: "2026-02-11",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://treasury.ddc.xyz",
    datStartDate: "2025-02-21",
    website: "https://ir.ddc.xyz",
    secCik: "0001808110",
    costBasisAvg: 85_661,  // treasury.ddc.xyz weighted avg for 1,988 BTC
    costBasisSource: "company-website",
    costBasisSourceUrl: "https://treasury.ddc.xyz",
    isMiner: false,
    quarterlyBurnUsd: 2_600_000,  // H1 2025 operating cash burn: $5.2M / 2 quarters (424B3 F-1 financials)
    burnSource: "SEC 424B3 Jan 26, 2026 (F-1 financials, H1 2025 unaudited)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1808110/000121390026007463/ea0274060-424b3_ddcenter.htm",
    burnAsOf: "2025-06-30",
    burnEstimated: true,
    avgDailyVolume: 5_000_000,
    sharesForMnav: 30_473_005,  // 28,723,005 Class A (6-K Feb 6) + 1,750,000 Class B (CEO, same economic rights)
    sharesSource: "SEC 6-K Feb 6, 2026 + treasury.ddc.xyz",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1808110/000121390026013341/ea027596901-6k_ddcenter.htm",
    sharesAsOf: "2026-02-06",
    totalDebt: 27_000_000,  // Anson Senior Secured Convertible Notes (Initial Closing Jul 2025)
    debtSource: "SEC 424B3 Jan 26, 2026 / 6-K Jul 1, 2025 — Anson SPA Initial Notes",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1808110/000121390026007463/ea0274060-424b3_ddcenter.htm",
    debtAsOf: "2026-01-26",
    strategy: "Plant-based food company pivoted to BTC treasury Feb 2025. Explicit MSTR-style strategy with Bitcoin yield metrics.",
    notes: "NYSE American listed. DayDayCook brand. Dual-class (Class B = 10 votes, CEO only, doubled 875K→1.75M in 2025 by board resolution). " +
      "Anson SPA: $27M convertible at $13.65 ($275M undrawn). ⚠️ Toxic alternate conversion RENEGOTIATED Sep 2025: now 88% of 20-day low VWAP (was 94% of 10-day). Warrant coverage doubled to 70%. " +
      "0% interest (12% on default). $200M ELOC at 98% of 3-day low VWAP. " +
      "Satoshi Strategic: $32.8M preferred (pending NYSE). $124M subscription (12.4M shares at $10, pending NYSE — deeply underwater at ~$2.60). " +
      "Put Option risk: BTC subscription investors can put at $18.50 if mcap < $500M (currently exercisable). " +
      "⚠️ GOVERNANCE: 3 auditors in 30 days (KPMG→Marcum→Enrome); Marcum fired after requesting investigation of undisclosed related party allegations. " +
      "Going concern in FY2023+FY2024 audits. Accumulated deficit $248M. Tontec $584K judgment with HK winding-up threat.",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Going concern: FY2023+FY2024 auditors flagged substantial doubt about ability to continue as going concern",
        severity: "warning",
      },
      {
        type: "stale-data",
        message: "Burn rate uses operating cash flow ($2.6M/qtr); food business gross profit partially offsets",
        severity: "info",
      },
      {
        type: "stale-data",
        message: "$124M subscription at $10/share likely dead — stock at ~$2.60 (3.8x premium to market)",
        severity: "warning",
      },
    ],
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
    holdings: 1_796,  // SEC 6-K Feb 5, 2026 (Jan 2026 Update) - includes 252 BTC pledged
    holdingsLastUpdated: "2026-01-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1921158/000121390026012561/ea027576101ex99-1_bitfufu.htm",
    datStartDate: "2024-01-01",
    website: "https://bitfufu.com",
    secCik: "0001921158",
    isMiner: true,
    quarterlyBurnUsd: 0,  // FUFU is profitable — Q3 2025 net income $11.6M, EBITDA $22.1M. Mining revenue covers all operating costs.
    burnSource: "SEC 6-K Q3 2025: Revenue $180.7M, COGS $173.5M, Net Income $11.6M. Company is cash-flow positive from mining operations. G&A alone is ~$2M/qtr but revenue exceeds total costs.",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1921158/000121390025108472/ea026476001ex99-1_bitfufu.htm",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 20_000_000,
    sharesForMnav: 164_131_946,  // SEC XBRL Jun 2025
    sharesSource: "SEC 6-K (filed 2025-09-05): CommonStockSharesOutstanding = 164,131,946 as of 2025-06-30",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1921158/000121390025084744/ea025548901ex99-1_bitfufu.htm",
    sharesAsOf: "2025-06-30",
    totalDebt: 141_301_000,  // SEC XBRL Jun 2025: LongTermDebt $101.3M (payables) + LongTermLoansPayable $40M (loans)
    debtAsOf: "2025-06-30",
    debtSource: "SEC 6-K H1 2025 XBRL: LongTermDebt $101,301K + LongTermLoansPayable $40,000K",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1921158/000121390025084744/ea025548901ex99-1_bitfufu.htm",
    cashReserves: 40_086_000,  // SEC XBRL Jun 2025: CashAndCashEquivalentsAtCarryingValue. Q3 2025 PR shows $32.6M but no XBRL filing for Sep 30 (FPI: only H1/FY have XBRL).
    cashSource: "SEC 6-K H1 2025 XBRL: CashAndCashEquivalentsAtCarryingValue = $40,086,000 (Q3 PR shows $32.6M but unaudited, no XBRL)",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1921158/000121390025084744/ea025548901ex99-1_bitfufu.htm",
    cashAsOf: "2025-06-30",
    strategy: "HODL-forward miner with dedicated BTC management team. Cloud mining platform (641k+ users).",
    notes: "Singapore (Nasdaq FUFU). BITMAIN partner. 3.7 EH/s self-owned, 29.6 EH/s under management. 520 MW hosting. 252 BTC pledged for loans.",
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
    costBasisAvg: 72_571,
    costBasisSource: "SEC 10-Q Q3 2025: aggregate cost $114.3M for 1,575 BTC",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1889123/000119312525274317/fld-20250930.htm",
    quarterlyBurnUsd: 5_000_000,
    burnSource: "SEC 10-Q Q3 2025: Operating loss $5.94M (Q3), $21.8M (9-mo). Cash burn ~$5M/qtr after non-cash adjustments",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1889123/000119312525274317/fld-20250930.htm",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 5_000_000,
    sharesForMnav: 48_307_642,  // SEC XBRL Nov 10, 2025
    sharesSource: "SEC 10-Q (filed 2025-11-10): EntityCommonStockSharesOutstanding = 48,307,642 as of 2025-11-10",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1889123/000119312525274317/fld-20250930.htm",
    sharesAsOf: "2025-11-10",
    totalDebt: 66_300_000,  // SEC 10-Q Sep 2025: $20M June convert + $46.3M March convert (principal, not fair value)
    debtAsOf: "2025-09-30",
    debtSource: "SEC 10-Q Q3 2025",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1889123/000119312525274317/fld-20250930.htm",
    strategy: "First publicly traded financial services company built entirely around Bitcoin. BTC rewards platform. Explicit treasury accumulation strategy.",
    cashReserves: 6_663_000,  // SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1889123/000119312525274317/fld-20250930.htm",
    cashAsOf: "2025-09-30",
    notes: "Nasdaq: FLD (warrants: FLDDW). Fold Card debit with BTC rewards. Went public Feb 2025 (SPAC merger with FTAC Emerald). " +
      "Russell 2000 (Dec 2025). Two Prime BTC-collateralized revolving facility ($45M max, 8.5% interest, matures Oct 2026). " +
      "$250M equity purchase facility (ATM-like, $3.5M used as of Sep 30). " +
      "800 BTC restricted as collateral (300 BTC for $20M note + 500 BTC for $46.3M note). " +
      "SATS Credit Fund (related party) holds $46.3M convertible + 750K closing shares.",
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
    burnSourceUrl: "https://www.release.tdnet.info/inbs/140120260114533179.pdf",
    burnAsOf: "2026-01-14",
    burnEstimated: true,
    avgDailyVolume: 2_000_000,
    sharesForMnav: 40_609_400,  // Updated: 39,954,400 base + 655,000 from 8th Series warrant exercises (Dec 2025). Per Yahoo Finance JP and TDnet Feb 3, 2026 filing.
    sharesSource: "TDnet 8th Series warrant exercise report (Feb 3, 2026) + Q1 FY2026 決算短信",
    sharesSourceUrl: "https://www.release.tdnet.info/inbs/140120260114533179.pdf",
    sharesAsOf: "2026-01-31",
    totalDebt: 46_300_000,  // ¥7,100M / 153.5 JPY/USD — Q1 FY2026 有利子負債 (interest-bearing debt)
    debtSource: "Kabutan Q1 FY2026 決算短信 (as of Nov 30, 2025)",
    debtSourceUrl: "https://kabutan.jp/stock/finance?code=3189",
    debtAsOf: "2025-11-30",
    cashReserves: 7_500_000,  // ¥1,159M / 153.5 JPY/USD — Q1 FY2026 現預金
    cashSource: "Kabutan Q1 FY2026 決算短信 (as of Nov 30, 2025)",
    cashSourceUrl: "https://kabutan.jp/stock/finance?code=3189",
    cashAsOf: "2025-11-30",
    strategy: "Explicit 'hyperbitcoinization' mission. Runs 'Bitcoin Dojo' teaching other companies BTC treasury strategy.",
    notes: "TSE Standard. Fashion company pivot. ANAP Lightning Capital subsidiary (Feb 2025). Blockstream partnership (Dec 2025, 'Project ORANGE LEGEND'). First BTC purchase Apr 16, 2025. Total cost basis ¥20.95B (~$139M). ⚠️ Going concern doubt flagged in Q1 FY2026 決算短信. 8th Series warrants actively being exercised — 304,300 units remaining (~30.4M potential shares at ~¥271 strike).",
  },
  {
    id: "zooz",
    name: "ZOOZ Strategy Ltd.",  // Renamed from ZOOZ Power Oct 2025
    ticker: "ZOOZ",
    twitter: "zoozbitcoin",
    asset: "BTC",
    tier: 2,
    holdings: 1_046,  // 6-K Jan 20, 2026: "completed the purchase of a total of 1,046 Bitcoin" as of Dec 31, 2025
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1992818/000149315226002767/ex99-1.htm",
    datStartDate: "2025-07-29",  // First ATM agreement date
    website: "https://zoozpower.com",
    secCik: "0001992818",
    costBasisAvg: 116_520,  // 6-K: total consideration $121.9M / 1,046 BTC = $116,520 (includes fees). 6-K also states "$112,745 avg purchase price" — ~$4M gap likely commissions.
    costBasisSource: "SEC 6-K Jan 20, 2026: $121.9M total consideration for 1,046 BTC. Stated avg price $112,745 (ex-fees).",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1992818/000149315226002767/ex99-1.htm",
    isMiner: false,
    quarterlyBurnUsd: 3_000_000,  // 20-F FY2024 total opex ~$12M/yr = $3M/qtr (G&A + R&D + COGS). Pre-pivot, may change.
    burnSource: "SEC 20-F FY2024: total operating expenses ~$12M/year (estimated quarterly)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1992818/000149315225009478/form20-f.htm",
    burnAsOf: "2024-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,
    totalDebt: 0,  // 6-K Jan 20, 2026: "no outstanding debt" + promissory notes fully repaid
    debtSource: "SEC 6-K Jan 20, 2026: promissory notes fully repaid, no outstanding debt",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1992818/000149315226002767/ex99-1.htm",
    debtAsOf: "2025-12-31",
    cashReserves: 27_100_000,  // 6-K Jan 20, 2026: $27.1M as of Dec 31, 2025
    cashSource: "SEC 6-K Jan 20, 2026: cash and cash equivalents ~$27.1M",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1992818/000149315226002767/ex99-1.htm",
    cashAsOf: "2025-12-31",
    sharesForMnav: 163_000_000,  // 424B5 Sep 30, 2025: 161,899,782 + ATM ~1.14M shares sold through Dec 31 ≈ 163M
    sharesSource: "SEC 424B5 Sep 30, 2025: 161,899,782 outstanding + 6-K: ~1.14M ATM shares sold",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1992818/000149315225016384/form424b5.htm",
    sharesAsOf: "2025-12-31",
    leader: "Jordan Fried (CEO)",
    strategy: "First Nasdaq + TASE dual-listed BTC treasury company. Pivoted from EV charging (flywheel tech) Jul 2025. $1B ATM registered.",
    notes: "Israeli company (Lod). ✅ NO LEVERAGE: BTC funded via $180M private placement (Jul+Sep 2025). $1B ATM registered Sep 2025, barely used (~$4M). Cost basis $112,745/BTC avg. Renamed from 'ZOOZ Power' to 'ZOOZ Strategy Ltd.' Oct 2025. Exploring Bitcoin ecosystem cash-flow businesses.",
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
    holdings: 769,  // btctcorp.com homepage: 769.05 BTC (Feb 17, 2026)
    holdingsLastUpdated: "2026-02-17",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://btctcorp.com",
    datStartDate: "2025-06-30",  // TSX Venture listing date
    // costBasisAvg removed - third-party source only
    isMiner: false,
    totalDebt: 25_000_000, // CAD - convertible debentures ($25M face, $12 implied conversion)
    debtSource: "TSX Venture Bulletin V2025-1838",
    debtSourceUrl: "https://btctcorp.com",
    quarterlyBurnUsd: 500_000,
    burnSource: "SEDAR+ filings (estimate - new company)",
    burnSourceUrl: "https://www.sedarplus.ca/csa-party/records/recordsForIssuerProfile.html?profileNo=000053693",
    burnAsOf: "2025-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,
    website: "https://btctcorp.com",
    sedarProfile: "000053693",  // SEDAR+ profile number
    // Shares: 10,027,880 basic, 12,111,213 diluted (accounts for convertible debentures)
    sharesForMnav: 10_027_880,  // BASIC shares per btctcorp.com — dilutives in dilutive-instruments.ts
    sharesSource: "btctcorp.com homepage + SEDAR+ filings",
    sharesSourceUrl: "https://btctcorp.com",
    sharesAsOf: "2026-02-17",
    // Note: Convertible debentures (~2.08M shares) tracked in dilutive-instruments.ts
    strategy: "Grow Bitcoin per Share (BPS) through strategic corporate finance and institutional Bitcoin lending, liquidity and collateral services.",
    notes: "TSX Venture (Canada). SEDAR+ #000053693. Evolve Funds Group administrative services (entire C-suite = Evolve execs). Basic shares: 10,027,880. Website 'diluted': 12,111,213 (converts only). ⚠️ TRUE diluted: ~14.5M (adds 2.43M performance warrants @ $0.001 that website excludes). $25M CAD convertible debentures (1% interest, Jun 2030 maturity, $12 conversion). Zero revenue — pure BTC proxy. Shell RTO via 2680083 Alberta Ltd.",
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
    // HOLDINGS: Q3 2025 balance sheet shows €199.8M in intangible assets (digital assets/BTC)
    // At €97,441/BTC (CoinGecko Sep 30, 2025), implies ~2,051 BTC
    // Previously: 540 BTC at Dec 2024 (FY2024 Note 10: 480 direct + 60 in DeFi)
    // H1 2025: sold most direct BTC (€40M proceeds), then massively re-accumulated in Q3 2025
    // Most BTC managed by Samara Alpha via Market-Neutral BTC+ Fund
    // ⚠️ EST: exact BTC count not disclosed — derived from €199.8M intangibles ÷ €97,441/BTC
    // ⚠️ Intangible assets MAY include non-BTC digital assets
    // ⚠️ "Market-neutral" strategy means BTC may be actively traded, not HODLed
    holdings: 2_051,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "regulatory-filing",  // Derived from unaudited Q3 2025 IFRS balance sheet intangibles (€199.8M) ÷ BTC price — EST confidence
    holdingsSourceUrl: "https://cdn.prod.website-files.com/687df2df76e1c946ba38115c/6953b14e79c15dbc18d6c7b0_2025.12_SAG%20Corporate%20Presentation_compressed.pdf",  // Dec 2025 corp pres, appendix p16: Q3 2025 balance sheet
    datStartDate: "2024-01-01",
    website: "https://www.samara-ag.com",
    twitter: "https://x.com/Patrick_Lowry_",
    isMiner: false,
    quarterlyBurnUsd: 2_700_000,  // €2.3M/qtr (€6M admin + €3.2M interest ÷ 4) × 1.185 EUR/USD
    burnSource: "FY2024 audited P&L: €6M admin + €3.2M finance costs (estimate per quarter)",
    burnSourceUrl: "https://cdn.prod.website-files.com/660cd1216e255a8a370aa5ac/685d308f24fa70f5ffd193c2_SAG-Consolidated-2024-Signed%20financial%20statements_compressed.pdf",
    burnAsOf: "2024-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,
    // SHARES: 92,190,761 confirmed in H1 2025 Interim Note 15 (reviewed by Grant Thornton)
    // Verification: €4,609,538 share capital ÷ €0.05 nominal = 92,190,760 shares
    // Authorized: 121,000,000 (increased from 64M at Jan 2024 EGM)
    // Unchanged between Dec 2024 and Jun 2025 — no new issuances in H1 2025
    sharesForMnav: 92_190_761,
    sharesSource: "H1 2025 Interim Financial Statements, Note 15 (reviewed by Grant Thornton Malta)",
    sharesSourceUrl: "https://cdn.prod.website-files.com/687df2df76e1c946ba38115c/68d4e60b8aafa8c7f4b1eac9_ce52c3a4ca8b19bbf175eb980afc729e_SAG%20Consolidated%20-%20Signed%20Interim%20Financial%20Statements%2030%20June%202025-final.pdf",
    sharesAsOf: "2025-06-30",
    // DEBT: €33M total as of H1 2025 → ~$39.1M USD
    // €17.7M Nordic bond (ISIN NO0013364398, Euribor+7.5%, matures Nov 2029)
    // €15.3M interest-bearing loans (third party)
    // Bond is senior secured, NOT convertible — no dilutive impact
    // Note: Company bought back €2M of its own bonds (net outstanding €18M face)
    totalDebt: 39_100_000,  // €33M × 1.185 EUR/USD (H1 2025 balance sheet)
    debtSource: "H1 2025 Interim: €17.7M Nordic bond (ISIN NO0013364398) + €15.3M interest-bearing loans = €33M",
    debtSourceUrl: "https://cdn.prod.website-files.com/687df2df76e1c946ba38115c/68d4e60b8aafa8c7f4b1eac9_ce52c3a4ca8b19bbf175eb980afc729e_SAG%20Consolidated%20-%20Signed%20Interim%20Financial%20Statements%2030%20June%202025-final.pdf",
    debtAsOf: "2025-06-30",
    strategy: "BTC as primary treasury reserve. Issued Europe's first Bitcoin Bond (€20M, Q4 2024). Uses Samara Alpha Market-Neutral BTC+ Fund for BTC treasury management. Aims to rival MSTR.",
    notes: "Frankfurt/XETRA listed (Malta HQ, ISIN MT0001770107). Formerly Cryptology Asset Group. GAV €415.8M, NAV €377.5M as of Q3 2025. 49% of GAV in Bitcoin & Crypto. Audited by Grant Thornton Malta. No SEC filings — IFRS reporting. Donates to Brink (BTC development).",
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
    quarterlyBurnUsd: 440_000,  // A$705K operating outflow Q2 FY2026 ≈ US$440K at 0.63 AUD/USD
    burnSource: "ASX Appendix 4C Q2 FY2026 (net operating cash outflow A$705K)",
    burnSourceUrl: "https://www.listcorp.com/asx/dcc/digitalx-limited/news/quarterly-activities-appendix-4c-cash-flow-report-3308597.html",
    burnAsOf: "2025-12-31",
    burnEstimated: false,
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
    ceo: "Daniel Retzke",  // Lisa Wade resigned Sep 26, 2025; Daniel Retzke appointed GM
  },
  // Removed: NDA.V (416 BTC), DMGI.V (403 BTC), LMFA (356 BTC) - below 500 BTC threshold
  {
    // =========================================================================
    // NAKA - Core financials from provenance/naka.ts (SEC-verified XBRL)
    // =========================================================================
    id: "naka",
    name: "Nakamoto Inc.",  // Rebranded from KindlyMD/Nakamoto Holdings Jan 21, 2026
    ticker: "NAKA",
    asset: "BTC",
    tier: 1,
    // HOLDINGS: from provenance (XBRL CryptoAssetNumberOfUnits, BTCMember)
    holdings: NAKA_PROVENANCE.holdings?.value || 5_398,
    holdingsLastUpdated: NAKA_PROVENANCE_DEBUG.holdingsDate,
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000149315225024314/ex99-1.htm",
    datStartDate: "2025-05-12",
    costBasisAvg: 118_205,
    costBasisSource: "SEC 8-K Nov 19, 2025: 5,765 BTC purchased at weighted avg $118,204.88",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000149315225024314/ex99-1.htm",
    isMiner: false,
    // BURN: from provenance (Q3 2025 G&A + OpCF estimate)
    quarterlyBurnUsd: NAKA_PROVENANCE.quarterlyBurn?.value ?? 8_000_000,
    burnEstimated: true,  // $8M is forward estimate; Q3 G&A was $4.98M, 9mo avg OpCF ~$5.3M/qtr
    burnSource: "SEC 10-Q Q3 2025 XBRL: G&A $4.98M + conservative ramp estimate",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000149315225024260/form10-q.htm",
    burnAsOf: "2025-09-30",
    // CAPITAL RAISE
    capitalRaisedPipe: 710_000_000,  // $540M PIPE + $200M Yorkville converts (net ~$710M)
    avgDailyVolume: 50_000_000,
    hasOptions: true,
    // SHARES: from provenance (XBRL EntityCommonStockSharesOutstanding + pre-funded warrants)
    sharesForMnav: NAKA_PROVENANCE.sharesOutstanding?.value || 511_555_864,
    sharesSource: "SEC 10-Q Q3 2025 XBRL: 439,850,889 common + 71,704,975 pre-funded warrants ($0.001 exercise)",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000149315225024260/form10-q.htm",
    sharesAsOf: NAKA_PROVENANCE_DEBUG.sharesDate,
    // DEBT: from provenance (Kraken $210M BTC-backed loan Dec 2025)
    totalDebt: NAKA_PROVENANCE.totalDebt?.value || 210_000_000,
    debtSource: "SEC 8-K Dec 9, 2025: Kraken $210M USDT loan, 8% annual, BTC-collateralized, due Dec 4, 2026",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000149315225026862/form8-k.htm",
    debtAsOf: "2025-12-09",
    // CASH: from provenance (XBRL CashAndCashEquivalentsAtCarryingValue)
    cashReserves: NAKA_PROVENANCE.cashReserves?.value || 24_185_083,
    cashSource: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1946573/000149315225024260/form10-q.htm",
    cashAsOf: "2025-09-30",
    secCik: "0001946573",
    leader: "David Bailey (CEO, Bitcoin Magazine)",
    website: "https://nakamoto.com",
    twitter: "@nakamotoinc",
    strategy: "First publicly traded Bitcoin conglomerate. Acquires Bitcoin-native companies across finance, media, and advisory.",
    notes: "$710M PIPE (largest crypto PIPE ever). Goal: 1M BTC ('one Nakamoto'). $5B ATM authorized. Share buyback authorized Dec 2025 as mNAV < 1. Strategic investments: Metaplanet $30M, Treasury BV $15M, FUTURE Holdings $6M.",
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
    holdings: DJT_PROVENANCE.holdings?.value ?? 11_542,
    holdingsLastUpdated: DJT_PROVENANCE_DEBUG.holdingsDate,
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/djt/0001140361-25-040977?tab=document&q=11%2C542",
    datStartDate: "2025-05-01",
    isMiner: false,
    // BURN: from provenance (Q1 2025 OpCF as proxy for core burn)
    quarterlyBurnUsd: DJT_PROVENANCE.quarterlyBurn?.value ?? 9_737_800,
    burnSource: "SEC 10-Q Q1 2025 XBRL: NetCashProvidedByUsedInOperatingActivities -$9,737,800",
    burnSourceUrl: "/filings/djt/0001140361-25-018209",
    burnAsOf: "2025-03-31",
    // CAPITAL: $2.5B private placement ($1.5B equity + $1B converts)
    capitalRaisedPipe: 2_500_000_000,
    avgDailyVolume: 200_000_000,
    hasOptions: true,
    // SHARES: from provenance (XBRL verified)
    sharesForMnav: DJT_PROVENANCE.sharesOutstanding?.value ?? 279_997_636,
    sharesSource: "SEC 10-Q Q3 2025 XBRL: EntityCommonStockSharesOutstanding = 279,997,636 as of 2025-11-05",
    sharesSourceUrl: "/filings/djt/0001140361-25-040977",
    sharesAsOf: DJT_PROVENANCE_DEBUG.sharesDate,
    // DEBT: from provenance (XBRL LongTermDebt - carrying value of $1B par converts)
    totalDebt: DJT_PROVENANCE.totalDebt?.value ?? 950_769_100,
    debtSource: "SEC 10-Q Q3 2025 XBRL: LongTermDebt $950,769,100 (carrying value of $1B zero-coupon converts due 2028)",
    debtSourceUrl: "/filings/djt/0001140361-25-040977",
    debtAsOf: "2025-09-30",
    // CASH: from provenance (XBRL - unrestricted only)
    cashReserves: DJT_PROVENANCE.cashReserves?.value ?? 166_072_700,
    cashAsOf: "2025-09-30",
    cashSource: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue $166,072,700 (excl $336M restricted)",
    cashSourceUrl: "/filings/djt/0001140361-25-040977",
    leader: "Devin Nunes (CEO)",
    strategy: "$2.5B private placement for BTC treasury. Crypto.com + Anchorage custody.",
    notes: "Truth Social parent. $1.5B equity + $1B zero-coupon converts due 2028. Also holds CRO tokens + $300M BTC options strategy. DJTWW warrants (legacy SPAC) outstanding. Custodians: Crypto.com + Anchorage Digital.",
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
    quarterlyBurnUsd: 0,  // Boyaa is cash-flow POSITIVE: 9M 2025 OpCF = HK$43.4M (~$5.6M). Gaming revenue covers costs.
    burnSource: "HKEX Q3 2025: 9M OpCF HK$43.4M positive. Core gaming revenue HK$329M, ~73% gross margin.",
    burnSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 20_000_000,
    // Shares: 768,004,730 (Dec 31, 2025 Monthly Return - excluding 2,972,000 treasury shares)
    // Pre-Sep 2025 placement: 711,003,730 → Post-placement: 770,976,730 (+59,973,000 @ HK$6.95)
    // Buybacks: 2,972,000 shares repurchased (held as treasury, not cancelled)
    sharesForMnav: 767_804_730,  // Jan 2026 Monthly Return: 770,976,730 total - 3,172,000 treasury = 767,804,730
    sharesSource: "HKEX Monthly Return Jan 2026 (filed Feb 3, 2026): excl. 3,172,000 treasury shares",
    sharesSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0203/2026020302066.pdf",
    sharesAsOf: "2026-01-31",
    // DEBT: None — no bank borrowings, no convertibles
    totalDebt: 0,
    debtSource: "HKEX Q3 2025: 'no short-term or long-term bank borrowings, no outstanding banking facilities'",
    debtSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    debtAsOf: "2025-09-30",
    // CASH: HK$82.7M (~$10.6M) + HK$78.7M term deposits
    cashReserves: 10_600_000,  // HK$82.7M ÷ 7.8 ≈ $10.6M (bank + cash balances only)
    cashSource: "HKEX Q3 2025: HK$82.7M cash + HK$78.7M term deposits (non-current)",
    cashSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    cashAsOf: "2025-09-30",
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
    // costBasisAvg: not verified - needs Q3 10-Q access
    isMiner: true,
    quarterlyBurnUsd: 8_052_000,  // Q3 2025 G&A
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense $8,052,000 (2025-07-01 to 2025-09-30). G&A only — excludes mining COGS. Likely inflated by one-time merger costs; pre-merger run rate was ~$1.6M/qtr.",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/abtc-20250930.htm",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 30_000_000,
    hasOptions: true,
    // Shares: 927,604,994 from Q3 2025 10-Q cover page (as of Nov 13, 2025)
    // Class A: 195,380,091 + Class B: 732,224,903 (Hut 8's ~80% stake)
    // NOTE: 899,489,426 was WRONG — that's diluted weighted avg for EPS, not actual outstanding
    sharesForMnav: 927_604_994,
    sharesSource: "SEC 10-Q Q3 2025 cover page: Class A 195,380,091 + Class B 732,224,903 = 927,604,994",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/abtc-20250930.htm",
    sharesAsOf: "2025-11-13",
    leader: "Eric Trump, Donald Trump Jr. (Co-Founders)",
    strategy: "Bitcoin accumulation platform focused on HODL strategy. Integrates scaled self-mining with disciplined accumulation. Tracks SPS (Satoshis Per Share) and Bitcoin Yield metrics.",
    notes: "80% owned by Hut 8. Merged with Gryphon Sep 2025. SPS metric: ~550 sats/share (Dec 14). Trump family co-founded. Pure-play BTC miner with HODL commitment.",
    website: "https://abtc.com",
    twitter: "https://x.com/ABTC",
    // IR: https://abtc.com/investors
    cashReserves: 7_976_000,  // XBRL: us-gaap:Cash as of Sep 30, 2025
    cashSource: "SEC 10-Q Q3 2025 XBRL: Cash",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/abtc-20250930.htm",
    cashAsOf: "2025-09-30",
    totalDebt: 286_200_000,  // Bitmain miner purchase agreement — BTC pledged at fixed price for mining equipment. 24-month redemption window. Per Q3 2025 10-Q.
    debtSource: "Bitmain miner purchase agreement — BTC pledged at fixed price for mining equipment. 24-month redemption window. Per Q3 2025 10-Q. Operating leases ($185.6M) and intercompany payable ($103.8M to Hut 8) excluded.",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1755953/000119312525281390/abtc-20250930.htm",
    debtAsOf: "2025-09-30",
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
    website: "https://www.forwardindustries.com",
    twitter: "https://x.com/FWDI_io",
    holdings: 6_979_967,  // Jan 15, 2026 SOL-equivalent (raw SOL + LSTs like fwdSOL)
    holdingsLastUpdated: "2026-01-15",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://forwardindustries.com/sol-treasury",
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
    stakingApy: 0.085,  // ~8.5% gross APY derived from 10-Q Q1 FY2026 segment data: $17.4M staking revenue × 4 / $820.8M staked assets = 8.47%
    quarterlyBurnUsd: 3_252_629,  // Q1 FY2026 G&A (up from ~$1.8M - treasury ops costs)
    burnSource: "SEC 10-Q Q1 FY2026 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: `/filings/fwdi/0001683168-26-000960?tab=xbrl&fact=us-gaap%3AGeneralAndAdministrativeExpense`,
    burnAsOf: "2025-12-31",
    capitalRaisedPipe: 1_650_000_000,
    // Shares: 83,139,037 common (Jan 31) + 12,864,602 pre-funded warrants @ $0.00001 = 96,003,639
    // PFWs included in basic EPS per 10-Q. Shares declining via $1B buyback program.
    sharesForMnav: 96_003_639,
    sharesSource: "SEC 10-Q Q1 FY2026: 83,139,037 common + 12,864,602 PFWs",
    sharesSourceUrl: `/filings/fwdi/0001683168-26-000960`,
    sharesAsOf: "2026-01-31",
    avgDailyVolume: 400_000_000,
    hasOptions: true,
    cashReserves: 12_000_000,  // ~$12M at Jan 31 per 10-Q MD&A (declining due to buybacks)
    restrictedCash: 0,
    cashSource: "SEC 10-Q Q1 FY2026 MD&A: 'approximately $12 million in cash'",
    cashSourceUrl: `/filings/fwdi/0001683168-26-000960?tab=document&q=approximately%20%2412%20million`,
    cashAsOf: "2026-01-31",
    leader: "Galaxy, Jump Crypto, Multicoin backed",
    strategy: "World's largest SOL treasury, validator infrastructure, DeFi yield",
    totalDebt: 0,  // Debt free — total liabilities $12.1M are all current (taxes, accrued expenses, lease)
    debtSource: "SEC 10-Q Q1 FY2026: zero long-term debt, total liabilities $12,084,535 all current",
    debtSourceUrl: `/filings/fwdi/0001683168-26-000960`,
    debtAsOf: "2025-12-31",
    notes: "Raised $1.65B PIPE Sep 2025. Debt free. 12.9M pre-funded warrants @ $0.00001. $1B buyback program active. First equity tokenized on Solana via Superstate. Galaxy/Jump/Multicoin backed. Holdings = SOL-equivalent (raw SOL + fwdSOL liquid staking tokens).",
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
    holdings: 2_340_757,  // 10-Q Note 10 (Subsequent Events): 2,340,757 SOL as of Nov 18, 2025
    holdingsLastUpdated: "2025-11-18",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/hsdt-20250930x10q.htm",
    datStartDate: "2025-05-01",
    stakingPct: 0.9996,  // 10-Q: 1,738,682 staked / 1,739,355 total = 99.96%
    stakingMethod: "Native staking via third-party validators (Anchorage Digital custody)",
    stakingSource: "SEC 10-Q Q3 2025 Note 3: 1,738,682/1,739,355 SOL staked (99.96%). $342K staking rewards (partial quarter, commenced Sep 2025). 7.03% APY.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/hsdt-20250930x10q.htm",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-15",
    stakingApy: 0.0703,  // 7.03% APY as of Oct 2025
    quarterlyBurnUsd: 5_504_000,  // SGA $4,646K + R&D $858K = $5,504K total opex Q3 2025
    burnSource: "SEC 10-Q Q3 2025 XBRL: SGA ($4,646K) + R&D ($858K) = $5,504K total opex (Jul-Sep 2025, single quarter). R&D declining as medical device ops wind down.",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/hsdt-20250930x10q.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 75_926_867,  // 40,299,228 basic (Sep 30) + 35,627,639 PFWs @ $0.001 (Sep 30) = 75,926,867. Consistent date avoids PFW exercise double-counting.
    sharesSource: "10-Q: 40,299,228 basic (Sep 30 balance sheet) + 35,627,639 PFWs @ $0.001 (Note 6 warrant table Sep 30) = 75,926,867. Press release rounds to '75.9M'. Nov 17 cover shows 41,301,400 basic (includes ~1M PFW exercises).",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/hsdt-20250930x10q.htm",
    sharesAsOf: "2025-09-30",
    totalDebt: 0,  // No LongTermDebt in XBRL (404)
    debtSource: "No LongTermDebt XBRL tag (404). Zero long-term debt. Master Loan Agreement has $0 outstanding.",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/hsdt-20250930x10q.htm",
    debtAsOf: "2025-09-30",
    cashReserves: 15_000_000,  // Oct 29 8-K: ">$15M of cash and stablecoins". XBRL Sep 30 was $124M but ~$109M deployed into SOL post-Q3.
    cashSource: "8-K Oct 29: '>$15M of cash and stablecoins'. XBRL Sep 30 was $124M but 10-Q Note 10 shows $124.6M spent on 587K SOL post-Q3. ~$15M is best available estimate pending 10-K.",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1610853/000110465925113714/hsdt-20250930x10q.htm",
    cashAsOf: "2025-09-30",
    avgDailyVolume: 150_000_000,
    hasOptions: true,
    leader: "Pantera Capital, Summer Capital",
    strategy: "SOL treasury via Anchorage Digital custody. Partnered with Solana Foundation.",
    notes: "fka Helius Medical Technologies. Name changed Sep 2025. sharesForMnav = 40.3M basic + 35.6M PFWs @ $0.001 = 75.9M (Sep 30 consistent date). 73.9M stapled warrants @ $10.134 (Jun-Jul 2028) + 7.4M advisor warrants @ $0.001 (Oct 2030) tracked in dilutive-instruments. Negative equity (-$152M) is accounting artifact from stapled warrant derivative liabilities. $500M PIPE closed Sep 15, 2025.",
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
    holdings: 2_221_329,  // Q4 2025 business update: "holds 2,221,329 SOL and SOL equivalents"
    holdingsLastUpdated: "2026-01-01",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1805526/000119312526002668/dfdv-ex99_1.htm",
    datStartDate: "2025-04-01",
    // costBasisAvg removed - needs verification
    stakingPct: 0.90,  // Stakes SOL + operates validators; $4.85M in validator/staking rewards (9mo)
    stakingMethod: "Validator operations + third-party staking. dfdvSOL liquid staking token.",
    stakingSource: "Q4 2025 business update: 8.3% annualized organic yield (staking, validator ops, onchain deployment). 10-Q 9-month data supports 6-8% range. Prior 11.4% was unverifiable.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1805526/000119312525286660/dfdv-20250930.htm",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.083,  // Company Q4 2025 business update: 8.3% organic yield estimate
    quarterlyBurnUsd: 3_572_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense $3,572,000",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1805526/000119312525286660/dfdv-20250930.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 200_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001805526&type=S-3&dateb=&owner=include&count=10",
    avgDailyVolume: 200_000_000,
    hasOptions: true,
    // marketCap removed - calculated from sharesForMnav × FMP price
    sharesForMnav: 29_892_800,  // Q4 business update Jan 5, 2026: "29,892,800 shares outstanding as of January 1, 2026"
    sharesSource: "SEC 8-K (filed 2026-01-05): Q4 2025 Business Update - shares outstanding 29,892,800 (down from 31,401,212 after 2.05M share buyback)",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1805526/000119312526002668/dfdv-20260105.htm",
    sharesAsOf: "2026-01-01",
    totalDebt: 202_042_000,  // 10-Q: $131.4M converts (net) + $70.3M BitGo + $267K short-term
    debtSource: "SEC 10-Q Q3 2025 balance sheet: $131.4M convertible notes (net, $140.3M face in two tranches) + $70.3M BitGo digital asset financing + $267K short-term loan. Total per 10-Q: $202,042,000",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1805526/000119312525286660/dfdv-20250930.htm",
    debtAsOf: "2026-01-01",
    cashReserves: 9_000_000,  // ~$9M cash, stablecoins, and liquid tokens
    restrictedCash: 9_000_000,  // Operating capital - not excess
    cashSource: "SEC 8-K Q4 2025 Business Update: approximately $9M in cash, stablecoins, and other tokens",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1805526/000119312526002668/dfdv-ex99_1.htm",
    cashAsOf: "2026-01-01",
    leader: "Formerly Janover Inc.",
    strategy: "First US public company with SOL-focused treasury.",
    notes: "$5B ELOC. Validator operations. dfdvSOL liquid staking token. $152.2M SOL pledged as collateral (>50% of digital assets). BitGo Master Loan: 250% collateral / 200% margin call trigger — liquidation risk if SOL drops 15-20%. Flora Growth $23.1M convertible note investment (93.3K SOL, 8% rate, due Sep 2030) — credit risk, not liquid SOL.",
  },
  {
    id: "upxi",
    name: "Upexi",
    ticker: "UPXI",
    secCik: "0001775194",
    asset: "SOL",
    tier: 1,
    holdings: 2_174_583,  // Jan 5, 2026 press release (10-Q Dec 31 shows 2,173,204). NOTE: Hivemind 265,500 locked SOL (Jan 9) NOT included — that was a subsequent event after this date.
    holdingsLastUpdated: "2026-01-05",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/news-release/2026/01/07/3214451/0/en/Upexi-Moves-to-High-Return-Treasury-Strategy.html",
    datStartDate: "2025-04-01",
    stakingPct: 0.95,  // 10-Q Note 5: "approximately 95% of its Solana treasury staked as of December 31, 2025"
    stakingMethod: "Native staking (locked/staked SOL)",
    stakingSource: "SEC 10-Q Q2 FY2026 Note 5: '95% of its Solana treasury staked'. 8-K Jan 14: 'locked and staked nature of the Digital Assets'.",
    stakingSourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
    stakingAsOf: "2025-12-31",
    stakingVerified: true,
    stakingLastAudited: "2026-02-13",
    stakingApy: 0.08,  // 65,720 SOL staking revenue / ~2M avg SOL / 6 months ≈ 8% APY
    quarterlyBurnUsd: 6_230_944,  // 10-Q: $12.46M OpCF used in 6 months / 2 (includes digital asset strategy costs)
    burnEstimated: true,  // Derived from 6-month OpCF, not a direct quarterly figure
    burnSource: "SEC 10-Q (filed 2026-02-10): Net cash used in operating activities $(12,461,887) for 6 months ended Dec 31, 2025",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
    burnAsOf: "2025-12-31",
    capitalRaisedAtm: 1_000_000_000,  // $1B S-3 shelf registration (filed Dec 22, 2025, effective Jan 8, 2026). ~$7.4M used via Feb 2026 424B5.
    capitalRaisedAtmSource: "SEC S-3 shelf registration $1B (effective Jan 8, 2026)",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793225009150/upxi_s3.htm",
    sharesForMnav: 69_760_581,  // 10-Q cover page as of Feb 9, 2026 (includes Feb 2026 offering of 6.34M + RSU vesting)
    sharesSource: "SEC 10-Q Q2 FY2026 cover: 69,760,581 shares as of Feb 9, 2026",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
    sharesAsOf: "2026-02-09",
    totalDebt: 254_594_731,  // $150M convert @$4.25 + $35.96M Hivemind @$2.39 + $62.7M BitGo + $5.4M Cygnet + $560K promissory
    debtSource: "SEC 10-Q Q2 FY2026 + Jan 2026 subsequent event: Convertible $150M + Hivemind $35.96M (EX-41: $35,961,975) + BitGo $62.7M + Cygnet $5.4M + Promissory $560K",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
    debtAsOf: "2026-01-09",
    cashReserves: 1_616_765,  // 10-Q Dec 31, 2025 balance sheet. NOTE: Post-offering cash ~$9.7M per Feb 10 earnings 8-K (EX-99.2), but using audited BS figure.
    restrictedCash: 1_616_765,  // Operating capital - not excess
    cashSource: "SEC 10-Q Q2 FY2026 balance sheet",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1775194/000147793226000736/upxi_10q.htm",
    cashAsOf: "2025-12-31",
    capitalRaisedPipe: 217_400_000,  // $47M (Jul 2025) + $151M converts (Jul 2025) + $10M (Dec PIPE) + $7.4M (Feb 2026 offering)
    avgDailyVolume: 120_000_000,
    hasOptions: true,
    leader: "Allan Marshall (CEO), Arthur Hayes (advisory)",
    strategy: "SOL treasury + consumer brands. 95% staked. Discounted locked token purchases. Three value drivers: capital issuance, staking yield, locked SOL discounts.",
    notes: "$50M buyback approved Nov 2025 ($800K executed). Feb 2026: 6.34M shares + warrants @$1.50. Dec warrants amended from $4→$2.83. Jan 2026: $36M Hivemind for 265.5K locked SOL. GSR asset mgr terminated (arbitration). Verified 2026-02-13.",
  },
  {
    id: "stke",
    name: "Sol Strategies",
    ticker: "STKE",
    asset: "SOL",
    tier: 2,
    secCik: "1846839",
    holdings: 530_251,  // 402,004 direct + 46,474 jitoSOL + 81,640 STKESOL (Jan 2026 monthly update)
    holdingsLastUpdated: "2026-02-03",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://solstrategies.io/press-releases/sol-strategies-january-2026-monthly-business-update",
    datStartDate: "2024-06-01",
    // costBasisAvg removed - needs verification
    // stakingPct: 0.85 removed - needs verification
    stakingApy: 0.065,
    quarterlyBurnUsd: 1_200_000,
    burnSource: "SEC 40-F FY2025 (estimate from operating expenses)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930x40f.htm",
    burnAsOf: "2025-09-30",
    burnEstimated: true,
    capitalRaisedAtm: 50_000_000,
    capitalRaisedAtmSource: "SEC 40-F FY2025 / SEDAR+ filings",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001846839&type=40-F",
    sharesForMnav: 25_300_567,  // Post 1:8 reverse split (Aug 2025): 22,999,841 (40-F) + 2,300,726 (Jan 7 credit facility)
    sharesSource: "SEC 40-F FY2025 + Jan 7 2026 credit facility conversion",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930x40f.htm",
    sharesAsOf: "2025-09-30",
    totalDebt: 25_400_000,  // CAD $35.75M → ~$25.4M USD: Convertibles only (credit facility fully settled Dec 2025)
    debtSource: "SEC 40-F FY2025 + Dec 31, 2025 6-K: Convertibles only (CAD $35.7M), credit facility settled",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930x40f.htm",
    debtAsOf: "2025-12-31",
    // Cash obligations: Credit facility + converts interest (rates not disclosed in 40-F summary)
    // Need to verify from full 40-F filing - flagging as estimate
    cashObligationsAnnual: 2_500_000,  // ESTIMATE: ~7% on CAD $35.7M converts only (credit facility settled Dec 2025)
    cashObligationsSource: "ESTIMATE: Convertible interest only — credit facility settled Dec 2025",
    cashObligationsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930x40f.htm",
    cashObligationsAsOf: "2025-12-31",
    cashReserves: 1_300_000,  // CAD $1.79M → ~$1.3M USD
    restrictedCash: 0,  // Operating cash - available
    cashSource: "SEC 40-F FY2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1846839/000110465925125666/stke-20250930x40f.htm",
    cashAsOf: "2025-09-30",
    avgDailyVolume: 50_000_000,
    leader: "Michael Hubbard (Interim CEO)",
    strategy: "Validator-first SOL treasury (DAT++ model). VanEck ETF staking provider. 99.999% uptime.",
    notes: "4.04M SOL AuD. 1:8 reverse split Aug 2025 for NASDAQ. Credit facility fully settled Dec 2025. $50M ATM program est. Jan 2, 2026 (Cantor/Roth). STKESOL liquid staking launched Jan 2026 (683K SOL staked). Q1 FY2026 results March 17, 2026. Shareholder meeting Mar 31, 2026 re: board reconstitution. Equity investments: NGRAVE NV, Chia Network, Animoca Brands.",
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/2078856/000119312525311400/d47504d10q.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 583_000_000,
    sharesForMnav: 127_025_563,  // SEC 10-Q filed Dec 8, 2025
    sharesSource: "SEC 10-Q (filed 2025-12-08): EntityCommonStockSharesOutstanding = 127,025,563 as of 2025-12-05",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/2078856/000119312525311400/d47504d10q.htm",
    sharesAsOf: "2025-12-05",
    cashReserves: 300_000_000,  // $300M+ cash (Dec 2025) - from $555M PIPE minus HYPE purchase
    restrictedCash: 300_000_000,  // No debt = cash not encumbered, don't subtract from EV
    cashSource: "Derived: $555M PIPE (SEC 8-K) - $255M HYPE purchase = ~$300M cash",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/2078856/000119312525311400/d47504d10q.htm",
    cashAsOf: "2025-12-05",
    totalDebt: 0,
    debtSource: "SEC 10-Q Q3 2025: No debt",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/2078856/000119312525311400/d47504d10q.htm",
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1682639/000141057825001361/eyen-20250331x10q.htm",
    burnAsOf: "2025-03-31",
    capitalRaisedPipe: 50_000_000,
    // Shares: 8,097,659 common (Nov 10, 2025) + 5,435,897 preferred × 3 conversion = 24.4M FD
    sharesForMnav: 24_400_000,
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1682639/000110465925111671/hypd-20250930x10q.htm",
    sharesSource: "SEC 10-Q Nov 14, 2025 (8.1M common + 16.3M from preferred conversion)",
    sharesAsOf: "2025-11-10",
    cashReserves: 8_223_180,  // SEC 10-Q Sep 30, 2025
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1682639/000110465925111671/hypd-20250930x10q.htm",
    cashAsOf: "2025-09-30",
    totalDebt: 7_656_005,  // Notes payable (Avenue loan)
    debtSource: "SEC 10-Q Q3 2025",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1682639/000110465925111671/hypd-20250930x10q.htm",
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1482541/000149315225014503/form10-q.htm",
    burnAsOf: "2025-07-31",
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 44_062_938,  // SEC 10-Q Dec 2025
    sharesSource: "SEC 10-Q (filed 2025-12-15): EntityCommonStockSharesOutstanding = 44,062,938 as of 2025-12-12",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1482541/000149315225027782/form10-q.htm",
    sharesAsOf: "2025-12-12",
    cashReserves: 77_500_000,  // $77.5M cash (Oct 2025)
    restrictedCash: 77_500_000,  // Treat as restricted - actively deployed for BNB purchases + buybacks
    cashSource: "FY Q2 2026 earnings",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1482541/000149315225027782/form10-q.htm",
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000141057825001327/snpx-20250331x10q.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 11_000_000,
    sharesForMnav: 7_000_000,  // ~6.85M per SEC DEF 14A Oct 2025; Series E convertible ($8 strike) out of money
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1571934/000110465925112570/taox-20250930x10q.htm",
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/746210/000143774925016275/oblg20250331_10q.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 7_500_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000746210&type=S-3",
    sharesForMnav: 3_207_210,  // SEC 10-Q Nov 13, 2025 (as of Nov 10, 2025)
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/746210/000143774925034612/oblg20250930_10q.htm",
    sharesAsOf: "2025-11-10",
    sharesSource: "SEC 10-Q Q3 2025 (filed Nov 13, 2025)",
    secCik: "746210",
    cashReserves: 3_737_000,  // Sep 30, 2025 10-Q
    restrictedCash: 3_737_000,  // Earmarked for TAO purchases - add to NAV, not subtract from EV
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/746210/000143774925034612/oblg20250930_10q.htm",
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1627282/000162728225000059/cwd-20250331.htm",
    burnAsOf: "2025-03-31",
    avgDailyVolume: 5_000_000,
    sharesForMnav: 6_905_000,  // 6.53M Class A + 0.37M Class B = 6.9M per SEC DEF 14A Jan 7, 2026
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1627282/000162728225000028/cwd-20241231.htm",
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956744/000164117225009334/form10-q.htm",
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
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1509745/000110465925125039/tm2534480d2_8k.htm",
    datStartDate: "2025-10-08",  // Oct 8, 2025 PIPE closing date
    secCik: "1509745",
    costBasisAvg: 334.41,
    costBasisSource: "SEC 8-K Dec 30, 2025 - cumulative average price per ZEC",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1509745/000110465925125039/tm2534480d2_8k.htm",
    capitalRaisedPipe: 58_880_000,  // Oct 2025 PIPE gross proceeds
    sharesForMnav: 137_420_344,  // Basic (56.6M) + Pre-funded warrants (80.8M) per SEC filings
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1509745/000110465925109827/tmb-20250930x10q.htm",
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
    holdings: 929_548,  // Q2 FY2026 10-Q (Dec 31, 2025): 833,748 on-balance-sheet + 95,800 pledged as covered call collateral = 929,548 total
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312526053215/lits-20251231.htm",
    datStartDate: "2025-07-01",
    costBasisAvg: 107_580,  // $100M total acquisition / 929,548 LTC ≈ $107.58. XBRL: CryptoAssetCost $89.15M for 833,748 on-BS units.
    costBasisSource: "SEC 10-Q Q2 FY2026 XBRL: PaymentForAcquisitionCryptoAsset $100M / 929,548 total LTC",
    costBasisSourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312526053215/lits-20251231.htm",
    quarterlyBurnUsd: 3_305_000,  // Q2 FY2026 XBRL: GeneralAndAdministrativeExpense $3,305,000
    burnSource: "SEC 10-Q Q2 FY2026 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312526053215/lits-20251231.htm",
    burnAsOf: "2025-12-31",
    capitalRaisedPipe: 100_000_000,
    avgDailyVolume: 15_000_000,
    totalDebt: 0,  // Q2 FY2026: No interest-bearing debt. MLA with Galaxy undrawn. Only $1.3M operating liabilities.
    debtSource: "SEC 10-Q Q2 FY2026",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312526053215/lits-20251231.htm",
    debtAsOf: "2025-12-31",
    cashReserves: 8_758_000,  // Q2 FY2026 XBRL: CashAndCashEquivalentsAtCarryingValue $8,758,000
    cashSource: "SEC 10-Q Q2 FY2026 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312526053215/lits-20251231.htm",
    cashAsOf: "2025-12-31",
    sharesForMnav: 36_361_999,  // Q2 FY2026 10-Q cover page (Feb 9, 2026). Down from 36.8M due to $25M buyback program.
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1262104/000119312526053215/lits-20251231.htm",
    sharesSource: "SEC 10-Q Q2 FY2026 cover page (Feb 9, 2026)",
    sharesAsOf: "2026-02-09",
    leader: "Justin File (CEO)",
    strategy: "First US-listed LTC treasury. GSR as treasury manager. Covered call options program generating ~$600K/qtr in premiums.",
    notes: "Formerly MEI Pharma. Charlie Lee on board. $25M share buyback program ($203K used, $24.8M remaining). 95,800 LTC pledged as covered call collateral. XBRL: 833,748 on-BS + 95,800 collateral = 929,548 total.",
    website: "https://www.litestrategy.com",
    twitter: "https://x.com/LiteStrategy",
    investorRelationsUrl: "https://www.litestrategy.com",
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
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000165495426000201/suig_ex991.htm",
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
    // Excludes crypto impairment/unrealized losses. Total GAAP operating expenses were $64.7M in Q3 2025
    // (XBRL OperatingExpenses = $64,676,420) but dominated by non-cash items (crypto mark-to-market).
    // This figure reflects actual G&A/cash burn only.
    quarterlyBurnUsd: 1_000_000,
    burnSource: "SEC 10-Q (filed 2025-05-13): NetCashUsedInOperatingActivities $3,646,585 (2025-01-01 to 2025-03-31)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000165495425005448/mcvt_10q.htm",
    burnAsOf: "2025-03-31",
    capitalRaisedAtm: 500_000_000,
    capitalRaisedAtmSource: "SEC S-1 registration statement",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000121390025088239/ea0253998-03.htm",
    capitalRaisedPipe: 450_000_000,
    avgDailyVolume: 20_000_000,
    marketCap: 98_000_000,  // ~$98M (80.9M shares × ~$1.21, Jun 2025) — dynamic calc via sharesForMnav preferred
    sharesForMnav: 80_900_000,  // SEC 8-K Jan 8, 2026: "fully adjusted shares issued and outstanding as of January 7, 2026"
    sharesAsOf: "2026-01-07",
    sharesSource: "SEC 8-K Jan 8, 2026",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1425355/000165495426000201/suig_8k.htm",
    leader: "Douglas Polinsky (CEO)",
    strategy: "Only public company with Sui Foundation relationship",
    notes: "Formerly Mill City Ventures. ~2.9% of SUI supply. Q4 2025: repurchased 7.8M shares.",
    website: "https://www.suig.io",
    twitter: "officialSUIG",
    investorRelationsUrl: "https://www.suig.io/investor-relations",
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
    holdings: 733_060_893,  // Q2 FY2026 10-Q (Dec 31, 2025) — filing-verified (no XBRL crypto tag). No purchases Jan 1-Feb 10, 2026.
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956741/000121390026015016/ea0276195-10q_cleancore.htm",
    datStartDate: "2025-09-05",
    quarterlyBurnUsd: 3_600_000,  // Q2 FY2026 XBRL: NetCashUsedInOperatingActivities $7.17M for 6 months = ~$3.6M/qtr
    burnSource: "SEC 10-Q Q2 FY2026 XBRL: NetCashProvidedByUsedInOperatingActivities -$7,167,396 (Jul-Dec 2025)",
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956741/000121390026015016/ea0276195-10q_cleancore.htm",
    burnAsOf: "2025-12-31",
    capitalRaisedPipe: 175_000_000,
    avgDailyVolume: 3_000_000,
    marketCap: 150_000_000,
    cashReserves: 5_443_655,  // Q2 FY2026 XBRL: CashAndCashEquivalentsAtCarryingValue
    cashSource: "SEC 10-Q Q2 FY2026 XBRL",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956741/000121390026015016/ea0276195-10q_cleancore.htm",
    cashAsOf: "2025-12-31",
    totalDebt: 800_000,  // Q2 FY2026 10-Q: NotesPayable ~$800K at 10% interest (XBRL last tagged $690K at Jun 30; verify from filing text)
    debtSource: "SEC 10-Q Q2 FY2026: NotesPayable",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956741/000121390026015016/ea0276195-10q_cleancore.htm",
    debtAsOf: "2025-12-31",
    sharesForMnav: 210_556_229,  // SEC 10-Q Q2 FY2026 cover page (Feb 10, 2026)
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1956741/000121390026015016/ea0276195-10q_cleancore.htm",
    sharesSource: "SEC 10-Q Q2 FY2026 cover page",
    sharesAsOf: "2026-02-10",
    leader: "Clayton Adams (CEO)",
    strategy: "Official Dogecoin Treasury. Target 1B DOGE (5% circulating supply).",
    notes: "NYSE American. Q2 FY2026: 733M DOGE (Dec 31, 2025). No purchases Jan 1-Feb 10, 2026 per subsequent events. Partnership with House of Doge, 21Shares, Robinhood.",
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1903595/000121390025111616/ea0263575-10q_brag.htm",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 200_000_000,
    avgDailyVolume: 5_000_000,
    marketCap: 8_000_000,  // TBH pre-merger market cap ~$8M (10.8M shares × ~$0.75)
    sharesForMnav: 10_800_000,  // TBH pre-merger shares (Nov 2025 10-Q)
    sharesSource: "SEC 10-Q (filed 2025-11-17): EntityCommonStockSharesOutstanding = 19,799,090 as of 2025-11-12",
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1903595/000121390025111616/ea0263575-10q_brag.htm",
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
    burnSourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465925105009/btog-20250630x20f.htm",
    burnAsOf: "2025-06-30",
    capitalRaisedAtm: 500_000_000,
    capitalRaisedAtmSource: "SEC 20-F / 6-K filings",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001735556&type=20-F",
    avgDailyVolume: 3_000_000,
    sharesForMnav: 1_500_000,  // Post 1:60 reverse split Jan 20, 2026 (was 88.6M -> 1.5M)
    sharesSourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465925105009/btog-20250630x20f.htm",
    sharesAsOf: "2026-01-20",
    sharesSource: "SEC 6-K Jan 20, 2026 (1:60 reverse split)",
    totalDebt: 16_338_506,  // $10M Series A-1 + $5M Series B-1 + $1.34M Series C-1 convertible notes
    debtSource: "SEC 20-F Oct 31, 2025 + 6-K Jan 20, 2026 (convertible notes)",
    debtSourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465925105009/btog-20250630x20f.htm",
    debtAsOf: "2026-01-20",
    cashReserves: 56_000,  // Yahoo Finance Total Cash (mrq): $55.64k
    cashSource: "Yahoo Finance",
    cashSourceUrl: "https://www.sec.gov/Archives/edgar/data/1735556/000110465925105009/btog-20250630x20f.htm",
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
    cashReserves: 894_701,  // ⚠️ Pre-PIPE figure from 10-Q Sep 30, 2025. $145M+ PIPE cash received Nov 5, 2025. Actual balance pending 10-K (~March 2026).
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
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/Archives/edgar/data/1826397/000149315226005802/forms-3.htm",
    capitalRaisedPipe: 219_042_206,  // $219M PIPE Nov 2025 ($145.4M cash + $73.7M AVAX)
    avgDailyVolume: 15_000_000,
    sharesForMnav: 92_672_000,  // Dashboard (post-PIPE 93.1M minus ~440K buybacks)
    sharesAsOf: "2026-02-12",
    sharesSource: "Company dashboard (post-PIPE 93,112,148 minus buybacks)",
    sharesSourceUrl: "https://analytics-avaxone.theblueprint.xyz/",
    secCik: "1826397",
    website: "https://www.avax-one.com",
    twitter: "avax_one",
    strategy: "First publicly traded AVAX treasury. Staking + validator infra + fintech M&A.",
    notes: "Nasdaq listed. $40M buyback ($1.1M executed thru Jan 25, 649.8K shares at avg $1.71). Hivemind Capital (Matt Zhang) asset manager. 6.1M pre-funded warrants @ $0.0001 (functionally common). Scaramucci as advisor. $100M S-3 shelf filed Feb 2026.",
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
