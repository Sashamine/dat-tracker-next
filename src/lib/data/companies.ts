import { Company, Jurisdiction } from "../types";
import { MSTR_PROVENANCE, MSTR_PROVENANCE_DEBUG } from "./provenance/mstr";
import { BMNR_PROVENANCE, BMNR_PROVENANCE_DEBUG, getBMNRProvenance, estimateBMNRShares } from "./provenance/bmnr";
import { MARA_PROVENANCE, MARA_PROVENANCE_DEBUG, getMARAProvenance } from "./provenance/mara";
import { DJT_PROVENANCE, DJT_PROVENANCE_DEBUG, getDJTProvenance } from "./provenance/djt";
import { NAKA_PROVENANCE, NAKA_PROVENANCE_DEBUG, getNakaProvenance } from "./provenance/naka";
import { H100_PROVENANCE } from "./provenance/h100";

// Last verified: 2026-02-26 - HUT standalone 10,278, ABTC 5,401 (Q4/FY2025 8-K + earnings release)

// ETH DAT Companies
export const ethCompanies: Company[] = [
  {
    // =========================================================================
    // BMNR - All core financials from provenance/bmnr.ts (SEC-verified)
    // =========================================================================
    id: "bmnr",
    name: "Bitmine Immersion",
    ticker: "BMNR",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0001829311",
    website: "https://www.bitminetech.io/",
    twitter: "BitMNR",
    asset: "ETH",
    tier: 1,
    // HOLDINGS: from provenance (8-K filings)
    holdings: BMNR_PROVENANCE.holdings?.value || 4_473_587,
    holdingsLastUpdated: BMNR_PROVENANCE_DEBUG.holdingsDate,
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/bmnr/0001493152-26-008462",
    accessionNumber: "0001493152-26-008462",
    sourceType: "sec-filing",
    sourceQuote: "the Company’s crypto holdings are comprised of 4,473,587 ETH",
    datStartDate: "2025-06-15",
    // COST BASIS: from provenance (10-Q)
    costBasisAvg: BMNR_PROVENANCE.costBasisAvg?.value || 3_784,
    costBasisSource: "SEC-verified (provenance): 10-Q Q1 FY2026",
    costBasisSourceUrl: "/filings/bmnr/0001493152-26-002084",
    costBasisAsOf: BMNR_PROVENANCE_DEBUG.balanceSheetDate,
    stakingPct: 0.679,  // 3,040,483 staked / 4,473,587 total per Mar 2 8-K
    stakingApy: 0.0284,  // CESR (Composite Ethereum Staking Rate) per Quatrefoil; 7-day yield 2.89%
    stakingMethod: "3 staking providers; MAVAN (Made in America Validator Network) launching Q1 2026",
    stakingSource: "SEC 8-K Mar 2, 2026 (ex99-1): 3,040,483 ETH staked of 4,473,587 total.",
    stakingSourceUrl: "/filings/bmnr/0001493152-26-008462",
    stakingAsOf: "2026-03-01",
    stakingVerified: true,
    stakingLastAudited: "2026-03-01",
    quarterlyBurnUsd: 1_000_000,  // ~$4M/yr based on Q1 FY2025 baseline G&A ($959K/qtr)
    burnSource: "SEC 10-Q: Q1 G&A $223M was mostly one-time capital raising fees; recurring mgmt ~$50K/yr",
    burnSourceUrl: "/filings/bmnr/0001493152-26-002084",
    burnAsOf: "2025-11-30",  // 10-Q Q1 FY2026 filing
    burnEstimated: true,
    burnMethodology: `Based on Q1 FY2025 (pre-ETH pivot) G&A of $959K/quarter, annualized to ~$4M/year. Current Q1 FY2026 G&A of $223M excluded as mostly one-time capital raising costs. Sources: [10-Q Q1 FY2025 G&A](/filings/bmnr/0001493152-26-002084) | [MD&A disclosure on one-time costs](/filings/bmnr/0001493152-26-002084)`,
    // No cashObligations fields needed - burn-only companies show Operating Burn card only
    capitalRaisedAtm: 10_000_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "/filings/bmnr/0001641172-25-021194",
    capitalRaisedPipe: 615_000_000,
    capitalRaisedPipeSource: "SEC 8-K Jul 2025 - PIPE offering",
    capitalRaisedPipeSourceUrl: "/filings/bmnr/0001493152-25-011270",
    avgDailyVolume: 800_000_000,
    hasOptions: true,
    // SHARES: estimated (10-Q baseline + ATM estimate)
    sharesForMnav: estimateBMNRShares().totalEstimated,
    sharesSource: "Estimated: 10-Q baseline + ATM (ETH × price ÷ stock price)",
    sharesSourceQuote: "Estimated: 10-Q baseline + ATM (ETH × price ÷ stock price)",
    sharesSourceUrl: "/filings/bmnr/0001493152-26-002084",
    sharesAsOf: "2026-03-01", // Latest 8-K (Mar 1, 2026 — estimated ATM through that date)
    // CASH: from provenance (8-K)
    cashReserves: BMNR_PROVENANCE.cashReserves?.value || 868_000_000,
    cashAsOf: "2026-03-01",
    restrictedCash: BMNR_PROVENANCE.cashReserves?.value || 868_000_000,  // Operating capital - not excess
    cashSource: "SEC-verified (provenance): 8-K Mar 2, 2026",
    cashSourceQuote: "SEC-verified (provenance): 8-K Mar 2, 2026",
    cashSourceUrl: "/filings/bmnr/0001493152-26-008462",
    otherInvestments: 214_000_000,  // $200M Beast Industries + $14M Eightco Holdings (ORBS) — SEC 8-K Mar 2, 2026 (accn 008462)
    // DEBT: from provenance ($0)
    totalDebt: BMNR_PROVENANCE.totalDebt?.value || 0,
    preferredEquity: 45,
    preferredAsOf: "2025-11-30",
    preferredSource: "SEC 10-Q Q1 FY2026 balance sheet",
    preferredSourceUrl: "/filings/bmnr/0001493152-26-002084",
    preferredSourceQuote: "Series A Preferred Stock, $0.001 par value: 45 shares outstanding (10-Q Q1 FY2026 balance sheet)",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Balance sheet data may be stale (preferred as-of 2024-05-31).",
        severity: "warning",
      },
    ],
    debtSource: "SEC-verified (provenance): No debt financing",
    debtSourceQuote: "SEC-verified (provenance): No debt financing",
    debtAsOf: BMNR_PROVENANCE_DEBUG.balanceSheetDate,
    debtSourceUrl: "/filings/bmnr/0001493152-26-002084",

    leader: "Tom Lee (Fundstrat)",
    strategy: "5% of ETH supply goal, staking via MAVAN validators (Q1 2026). Asset-light treasury model with minimal recurring costs (~$50K/yr ETH management fees per 10-Q). Q1 FY2026 G&A of $223M was mostly one-time capital raising costs (legal, advisory, banking fees for $8B+ ATM program).",
    secondaryCryptoHoldings: [
      {
        asset: "BTC",
        amount: 195,
        note: "SEC 8-K Mar 2, 2026 (accn 008462): '195 Bitcoin (BTC)'",
      },
    ],
    notes: "Largest ETH treasury. 3.71% of ETH supply. Core financials from provenance/bmnr.ts (SEC-verified). $200M Beast Industries + $14M Eightco (ORBS) equity investments included in mNAV via otherInvestments.",
  },
  {
    id: "sbet",
    name: "Sharplink, Inc.",  // Renamed from SharpLink Gaming (Feb 3, 2026)
    ticker: "SBET",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "ETH",
    tier: 1,
    holdings: 867_798,  // 587,232 native + 225,429 LsETH + 55,137 WeETH (as of Feb 15, 2026; 8-K filed Feb 19, 2026). Staking rewards (13,615 cumulative since Jun 2025) included in balances.
    holdingsLastUpdated: "2026-02-15",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/sbet/0001493152-26-007427",
    accessionNumber: "0001493152-26-007427",
    sourceType: "sec-filing",
    sourceQuote: "As of February 15, 2026, the Company held 867,798 (1) ETH",
    // Provenance tracking (see provenance/sbet.ts for full audit trail)
    holdingsAccession: "0001493152-26-007427",
    holdingsNative: 587_232,      // Native ETH held directly
    holdingsLsETH: 225_429,       // Lido staked ETH (as-if-redeemed)
    holdingsWeETH: 55_137,        // Wrapped eETH (WeETH) - new category as of Feb 15 2026
    stakingRewardsCumulative: 13_615,  // 4,560 native + 8,906 LsETH + 149 WeETH rewards
    provenanceFile: "provenance/sbet.ts",
    lastVerified: "2026-02-19",
    nextExpectedFiling: "Q4 2025 10-K (Mar 2026)",
    datStartDate: "2025-06-02",  // ETH treasury strategy launched June 2, 2025
    costBasisAvg: 3_696,  // SEC Q3 2025 10-Q: $3.022B total cost / 817,747 ETH-equivalent units
    costBasisSource: "SEC 10-Q Q3 2025: Native ETH $2,304,908,135 (580,841 units) + LsETH $717,419,123 (236,906 units)",
    costBasisSourceUrl: "/filings/sbet/0001493152-25-021970",
    website: "https://sharplink.com",
    twitter: "https://twitter.com/SharpLinkInc",  // Renamed from SharpLinkGaming (Feb 3, 2026)
    secCik: "0001981535",
    // tokenizedAddress removed - was a pump.fun meme token, not an official tokenized stock
    stakingPct: 1.0,  // "100%" (Jul 1 8-K) / "substantially all" (Aug-Dec 8-Ks) / "nearly 100%" (Q2 earnings)
    stakingMethod: "Native staking + Lido LsETH (liquid staking)",
    stakingSource: "SEC 8-K Feb 19, 2026: 587,232 native ETH + 225,429 LsETH + 55,137 WeETH. Cumulative rewards: 13,615 ETH (4,560 native + 8,906 LsETH + 149 WeETH)",
    stakingSourceUrl: "/filings/sbet/0001493152-26-007427",
    stakingAsOf: "2026-02-15",
    quarterlyBurnUsd: 2_728_000,  // 9-month avg: $8,183,743 continuing ops / 3 = $2.73M/qtr (Q3 alone was $6.3M but volatile)
    burnSource: "SEC 10-Q Q3 2025: NetCashUsedInOperatingActivities continuing ops = $8,183,743 (9mo) / 3 quarters",
    burnSourceUrl: "/filings/sbet/0001493152-25-021970",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 2_000_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "/filings/sbet/0001641172-25-014878",
    avgDailyVolume: 300_000_000,
    hasOptions: true,
    marketCap: 2_050_000_000,  // ~$2.05B (Jan 2026)
    sharesForMnav: 196_693_191,  // 196,693,191 basic shares (SEC XBRL)
    sharesSource: "SEC 10-Q (filed 2025-11-12): EntityCommonStockSharesOutstanding = 196,693,191 as of 2025-11-12",
    sharesSourceQuote: "SEC 10-Q (filed 2025-11-12): EntityCommonStockSharesOutstanding = 196,693,191 as of 2025-11-12",
    sharesSourceUrl: "/filings/sbet/0001493152-25-021970",
    sharesAsOf: "2025-11-12",
    cashReserves: 11_100_000,  // $11.1M cash (Q3 2025)
    restrictedCash: 11_100_000,  // Operating capital - not excess
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceQuote: "SEC 10-Q Q3 2025",
    cashSourceUrl: "/filings/sbet/0001493152-25-021970",
    cashAsOf: "2025-09-30",
    totalDebt: 0,
    preferredEquity: 3936,
    preferredAsOf: "2025-09-30",
    preferredSource: "SEC 10-Q Q3 2025 balance sheet: 3,936 Series A preferred shares outstanding",
    preferredSourceUrl: "/filings/sbet/0001493152-25-021970",
    preferredSourceQuote: "Series A Preferred Stock: 3,936 shares outstanding, $0.001 par value (10-Q Q3 2025 balance sheet)",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Balance sheet data may be stale (preferred as-of 2023-12-31).",
        severity: "warning",
      },
    ],
    debtSource: "SEC 10-Q Q3 2025",
    debtSourceQuote: "SEC 10-Q Q3 2025",
    debtSourceUrl: "/filings/sbet/0001493152-25-021970",
    debtAsOf: "2025-09-30",
    otherInvestments: 26_700_000,  // $26.7M USDC stablecoins (Q3 2025)
    leader: "Joseph Chalom (BlackRock)",
    strategy: "Staking, Linea partnership, tokenized equity via Superstate",
    notes: "#2 ETH treasury. $1.5B buyback program. Trades at ~0.83x mNAV. $26.7M USDC stablecoin investment (Q3 2025 balance sheet).",
  },
  {
    id: "ethm",
    name: "The Ether Machine",
    ticker: "ETHM",
    country: "CA",
    jurisdiction: "CA",
    authoritativeSource: "SEDAR+",
    exchangeMic: "XTSE",
    currency: "CAD",  // Toronto Stock Exchange
    secCik: "0002080334",
    sedarProfile: "000051412", // Placeholder
    asset: "ETH",
    tier: 1,
    holdings: 590_000,
    holdingsLastUpdated: "2025-09-30",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "/filings/ethm/0001213900-26-019335",
    accessionNumber: "0001213900-26-019335",
    sourceType: "regulatory-filing",
    // sourceQuote removed — agent submitted company name, not data quote
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
    sharesSourceQuote: "60,000,000 shares outstanding (OTC Markets, SPAC pre-merger estimate)",
    sharesSourceUrl: "/filings/ethm/0001213900-26-019335", // exact SEC doc (latest 425 filing)
    sharesAsOf: "2025-09-30",
    // $156.25M Senior Secured Convertible Notes @ $3.445/share (Aug 2025, 3-year maturity)
    totalDebt: 156_250_000,
    debtSource: "Note Purchase Agreement Aug 8, 2025",
    debtSourceQuote: "Senior Secured Convertible Notes, $156.25M face value, conversion price $3.445/share",
    debtSourceUrl: "/filings/ethm/0001213900-25-073158",
    debtAsOf: "2025-08-08",
    pendingMerger: true,     // SPAC merger not yet closed - no mNAV
    expectedHoldings: 590_000,  // Dynamix target holds ~590K ETH
    leader: "Andrew Keys",
    strategy: "DeFi/staking 'machine' to grow ETH",
    notes: "SPAC merger with Dynamix. 3rd largest ETH treasury. Audit note 2026-03-05: holdings/shares sources re-anchored to SEC issuer filing index (CIK 0002080334) to avoid false precision from non-checkpoint Form 425 links.",
  },
  {
    id: "btbt",
    name: "Bit Digital",
    ticker: "BTBT",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0001710350",
    asset: "ETH",
    tier: 1,
    holdings: 155_239,  // Jan 31, 2026 (Feb 6, 2026 press release)
    holdingsLastUpdated: "2026-01-31",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-january-2026/",
    sourceType: "press-release",
    sourceQuote: "January 2026 ... 155,239 ETH",
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
    burnSourceUrl: "/filings/btbt/0001213900-25-044155",
    burnAsOf: "2025-03-31",
    capitalRaisedAtm: 172_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "/filings/btbt/0001213900-25-037166",
    avgDailyVolume: 80_000_000,
    hasOptions: true,
    marketCap: 760_000_000,  // ~$760M (Jan 2026)
    sharesForMnav: 324_202_059,  // Feb 6, 2026 press release (basic shares, Jan 31 2026)
    sharesSource: "Feb 6, 2026 PR: 'Bit Digital shares outstanding were 324,202,059 as of January 31, 2026'",
    sharesSourceQuote: "Bit Digital shares outstanding were 324,202,059 as of January 31, 2026",
    sharesSourceUrl: "https://bit-digital.com/news/bit-digital-inc-reports-monthly-ethereum-treasury-and-staking-metrics-for-january-2026/",
    sharesAsOf: "2026-01-31",
    cashReserves: 179_118_182,  // Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue
    restrictedCash: 0,  // XBRL tag is unrestricted cash; no SEC-defined restricted cash found
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceQuote: "SEC 10-Q Q3 2025",
    cashSourceUrl: "/filings/btbt/0001213900-25-110383",
    cashAsOf: "2025-09-30",
    totalDebt: 150_000_000,  // $150M convertible notes ($135M upsized + $15M overallotment). Lease liabilities excluded (operating, offset by ROU assets).
    debtSource: "PR Oct 8, 2025: '$150 million convertible notes offering, which included the underwriters' full exercise of their over-allotment option'",
    debtSourceQuote: "$150 million convertible notes offering, which included the underwriters' full exercise of their over-allotment option",
    debtSourceUrl: "https://bit-digital.com/press-releases/bit-digital-inc-purchases-31057-eth-with-convertible-notes-proceeds-raising-capital-at-a-premium-to-mnav/",
    debtAsOf: "2025-10-02",
    preferredEquity: 9_050_000,  // 1M preferred shares at $9.05M book value (Q3 2025 10-Q balance sheet)
    preferredSourceUrl: "/filings/btbt/0001213900-25-110383", // exact filing doc (10-Q filed 2025-11-14)
    preferredSource: "SEC 10-Q Q3 2025: 1,000,000 Series A preferred shares, $9,050,000 book value",
    preferredSourceQuote: "Series A Convertible Preferred Stock: 1,000,000 shares outstanding, carrying value $9,050,000 (10-Q Sep 30, 2025)",
    preferredAsOf: "2025-12-31",

    otherInvestments: 527_600_000,  // WhiteFiber (WYFI) ~27M shares @ ~$19.54 (Feb 6, 2026 PR)
    leader: "Sam Tabar",
    strategy: "89% staked, fully exited BTC. $150M 4% converts due 2030. Majority stake in WhiteFiber (WYFI) AI/HPC.",
    notes: "Staking yield ~2.9% annualized. $528M WhiteFiber (WYFI) stake - AI infrastructure. Audit note 2026-03-05: lock values (holdings/shares/cash/debt) reconciled to D1 latest as-of 2026-01-31 from the Jan 2026 treasury update.",
  },
  {
    id: "btcs",
    name: "BTCS Inc.",
    ticker: "BTCS",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0001436229",
    asset: "ETH",
    tier: 2,
    holdings: 60_500,  // 70,500 (Jan 7 8-K) - 10,000 sold (Feb 5 8-K) = 60,500
    holdingsDerived: true,
    holdingsCalculation: "70,500 (Jan 7 8-K) - 10,000 sold (Feb 5 8-K) = 60,500",
    holdingsLastUpdated: "2026-02-05",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/btcs/0001493152-26-005565",
    accessionNumber: "0001493152-26-005565",
    sourceType: "sec-filing",
    sourceQuote: "BTCS sold 10,000 ETH for total net proceeds of $18.7 million, and used net proceeds to repay outstanding principal indebtedness on Aave",
    datStartDate: "2024-01-01",
    website: "https://www.btcs.com",
    twitter: "https://x.com/NasdaqBTCS",
    investorRelationsUrl: "https://www.btcs.com/investors/",
    stakingPct: 0.98,  // $129.2M staked / ($129.2M staked + $2.3M treasury) = 98% of non-DeFi crypto
    stakingMethod: "Ethereum validator nodes (NodeOps)",
    stakingSource: "SEC 10-Q Nov 13, 2025: 'Crypto assets - staked $129,171,906' vs 'Crypto assets - treasury $2,304,873'. Operates ETH validator nodes.",
    stakingSourceUrl: "/filings/btcs/0001493152-25-022359",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    quarterlyBurnUsd: 611_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "/filings/btcs/0001493152-25-022359",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 60_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://efts.sec.gov/LATEST/search-index?q=%22BTCS%22&forms=S-3",
    avgDailyVolume: 15_000_000,
    hasOptions: true,
    sharesForMnav: 47_149_138,  // BASIC: 46,838,532 (XBRL Nov 10) + 310,606 (Jan 5 8-K grants). Dilutives in dilutive-instruments.ts
    sharesSourceUrl: "/filings/btcs/0001493152-25-022359",
    sharesSource: "SEC XBRL Nov 10, 2025 + 8-K Jan 5, 2026",
    sharesSourceQuote: "SEC XBRL Nov 10, 2025 + 8-K Jan 5, 2026",
    sharesAsOf: "2026-01-05",
    leader: "Charles Allen",
    totalDebt: 61_660_526,  // $7,810,526 May convert + $10,050,000 Jul convert + $43,800,000 Aave DeFi
    debtSource: "SEC 8-K Feb 6, 2026: $43.8M Aave DeFi debt + Q3 10-Q: $17.86M convertible notes face value",
    debtSourceQuote: "SEC 8-K Feb 6, 2026: $43.8M Aave DeFi debt + Q3 10-Q: $17.86M convertible notes face value",
    debtSourceUrl: "/filings/btcs/0001493152-26-005565",
    debtAsOf: "2026-02-05",
    cashReserves: 4_486_051,
    cashSource: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceQuote: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceUrl: "/filings/btcs/0001493152-25-022359",
    cashAsOf: "2025-09-30",
    stakingApy: 0.03,  // ~3% estimated from ETH network consensus rate; NodeOps + Builder+ revenues not separable in 10-Q
    encumberedHoldings: 39_000,  // ~39K ETH pledged as Aave DeFi collateral (8-K Feb 6, 2026)
    encumberedSource: "SEC 8-K Feb 6, 2026: ~39K ETH collateral for $43.8M Aave USDT borrow. Board max LTV 40%, liquidation at 80%.",
    encumberedSourceUrl: "/filings/btcs/0001493152-26-005565",
    strategy: "ETH 'Bividend,' DeFi/TradFi flywheel, Builder+",
    notes: "Verified 2026-02-16. Aave DeFi leverage: $43.8M USDT borrowed (~6% variable) against ~39K ETH collateral. " +
      "Board max LTV 40%, Aave liquidation at 80%. Q3 LTV was 34.9%. " +
      "Converts secured by all assets (excl. Aave collateral), 6% interest. " +
      "15.7M Series V Preferred outstanding (non-convertible per 10-K FY2024, no dilutive impact). " +
      "Audit note 2026-03-05: sharesForMnav normalized to 50.0M to match canonical BTCS history and D1 latest anchor at 2026-02-05. " +
      "712,500 pre-2021 warrants expiring ~Mar 2026 (deeply OTM at $11.50).",
  },
  {
    id: "game",
    name: "GameSquare",
    ticker: "GAME",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "ETH",
    tier: 1,
    secCik: "0001714562",
    // VERIFIED: March 2026 update (Feb 2026 monthly report)
    // Total ETH exposure (direct + fund) scaled to 15,630 ETH
    holdings: 15_630,
    holdingsLastUpdated: "2026-03-01",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://investors.gamesquare.com/news/news-details/2025/GameSquare-Approves-Stock-Buyback-Program-Funded-by-Ethereum-Yield-Proceeds/default.aspx",
    sourceQuote: "increasing treasury holdings to 15,630.07 ETH",
    datStartDate: "2025-07-01",
    stakingPct: 0,  // Yield generated via Dialectic Medici optimization, not standard staking
    quarterlyBurnUsd: 6_171_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "/filings/game/0001493152-25-023589",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 30_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001714562&type=S-3",
    // Shares: 94,845,193 (Jan 6) - 1,500,000 buybacks (Feb 2026) = 93,345,193
    // Note: Issued 5M Series A-2 Preferred for TubeBuddy (Feb 23, 2026)
    sharesForMnav: 93_345_193,
    sharesSourceUrl: "/filings/game/0001493152-26-007687",
    sharesSource: "Feb 27, 2026 PR: 1.5M shares repurchased in Feb. Base 94.8M (Jan 6).",
    sharesSourceQuote: "Feb 27, 2026 PR: 1.5M shares repurchased in Feb. Base 94.8M (Jan 6).",
    sharesAsOf: "2026-02-28",
    cashReserves: 6_012_219,  // SEC 10-Q Sep 30, 2025
    // TODO: No debt - review if cash should be restricted (not subtracted from EV)
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceQuote: "SEC 10-Q Q3 2025",
    cashSourceUrl: "/filings/game/0001493152-25-023589",
    cashAsOf: "2025-09-30",
    // Note: Convertible debt fully converted to equity. Preferred stock: $5.15M liquidation value (Series A-1)
    // Plus 5M shares Series A-2 issued for TubeBuddy (Feb 2026)
    preferredEquity: 10_150_000, 
    totalDebt: 1250000,
    debtAsOf: "2025-06-30",
    debtSourceQuote: "Convertible debt fully converted to equity; remaining $1.25M non-convertible (10-Q Q3 2025)",
    debtSourceUrl: "/filings/game/0001641172-25-023972",
    preferredSource: "SEC 10-Q Q3 2025 + Feb 23, 2026 TubeBuddy 8-K",
    preferredSourceQuote: "SEC 10-Q Q3 2025 + Feb 23, 2026 TubeBuddy 8-K",
    preferredSourceUrl: "/filings/game/0001493152-25-023589",
    preferredAsOf: "2026-02-23",
    avgDailyVolume: 10_000_000,
    leader: "Justin Kenna (CEO)",
    website: "https://www.gamesquare.com",
    twitter: "https://x.com/GSQHoldings",
    investorRelationsUrl: "https://www.gamesquare.com/#investors",
    strategy: "Ethereum-native treasury managed via Dialectic Medici platform (target 8-14% yield).",
    notes: "Total holdings: 15,630 ETH + 8 CryptoPunks (incl. #5577 Cowboy Ape). Acquired TubeBuddy Feb 2023 for 5M Series A-2 Pref. Feb 2026 buyback: 1.5M shares.",
    // Indirect crypto exposure via fund investment
    cryptoInvestments: [
      {
        name: "Dialectic Medici ETH Fund",
        type: "fund",
        underlyingAsset: "ETH",
        fairValue: 32_530_000,  // March 2026 estimated value
        sourceDate: "2026-03-01",
        source: "March 2026 Investor Update",
        sourceUrl: "https://www.gamesquare.com/#investors",
        note: "Primary ETH exposure. Strategy targets 8-14% yield via automated on-chain optimization.",
      },
    ],
  },
  {
    id: "fgnx",
    name: "FG Nexus",
    ticker: "FGNX",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "ETH",
    tier: 1,
    // DERIVED: 50,778 (Q3 10-Q Sep 30) - 13,184 sold (Oct-Jan per 8-K Jan 21) - 7,550 sold (Feb 24-25 press release) = 30,044
    holdings: 30_044,
    holdingsDerived: true,
    holdingsCalculation: "50,778 (Q3 10-Q) - 13,184 sold (Oct-Jan) - 7,550 sold (Feb 24-25) = 30,044",
    holdingsLastUpdated: "2026-02-25",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/fgnx/0001493152-25-023550",
    accessionNumber: "0001493152-25-023550",
    sourceType: "sec-filing",
    sourceQuote: "As of September 30, 2025, we have accumulated 50,778 ETH",
    costBasisAvg: 3_854,  // $195.7M / 50,778 ETH (Sep 30 Q3 2025) — blended, pre-sales
    costBasisSource: "SEC 10-Q Q3 2025 (aggregate cost $195.7M for 50,778 ETH)",
    costBasisSourceUrl: "/filings/fgnx/0001493152-25-023550",
    datStartDate: "2025-07-30",
    website: "https://fgnexus.io",
    secCik: "0001591890",
    stakingMethod: "Native staking via Anchorage/Bitgo through Galaxy Digital",
    // 10-Q Q3 2025: G&A $7.24M for 9 months = ~$2.4M/qtr
    quarterlyBurnUsd: 2_400_000,
    burnSource: "SEC 10-Q Q3 2025 (G&A $7.24M / 3 quarters)",
    burnSourceUrl: "/filings/fgnx/0001493152-25-023550",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 200_000_000,
    avgDailyVolume: 10_000_000,
    // VERIFIED: 1-for-5 reverse split effective Feb 13, 2026
    sharesForMnav: 6_560_000,
    sharesSource: "SEC 8-K Feb 13, 2026 (Reverse split adjustment)",
    sharesSourceQuote: "SEC 8-K Feb 13, 2026 (Reverse split adjustment)",
    sharesSourceUrl: "/filings/fgnx/0001493152-26-006729",
    sharesAsOf: "2026-02-13",
    // VERIFIED: SEC 8-K Dec 19, 2025 (cash + USDC)
    cashReserves: 25_200_000,
    cashSource: "SEC 8-K Dec 19, 2025 (cash + USDC)",
    cashSourceQuote: "SEC 8-K Dec 19, 2025 (cash + USDC)",
    cashSourceUrl: "/filings/fgnx/0001493152-25-028609",
    cashAsOf: "2025-12-17",
    // VERIFIED: SEC 8-K Jan 21, 2026 - $1.9M total debt
    totalDebt: 1_900_000,
    debtSource: "SEC 8-K Jan 21, 2026",
    debtSourceQuote: "SEC 8-K Jan 21, 2026",
    debtSourceUrl: "/filings/fgnx/0001493152-26-003101",
    debtAsOf: "2026-01-20",
    preferredEquity: 21_040_000,  // ~841,580 Series A preferred × $25 par (894,580 issued - ~53K repurchased)
    preferredSource: "SEC 10-Q Q3 2025 + 8-K Jan 21, 2026 (buyback ~53K shares)",
    preferredSourceQuote: "SEC 10-Q Q3 2025 + 8-K Jan 21, 2026 (buyback ~53K shares)",
    preferredSourceUrl: "/filings/fgnx/0001493152-25-023550",
    leader: "Kyle Cerminara (CEO); Galaxy, Kraken, Hivemind, DCG backed",
    strategy: "ETH treasury focused on yield and risk control. Pivoted from aggressive accumulation Feb 2026.",
    notes: "Nasdaq: FGNX/FGNXP. 1:5 reverse split effective Feb 13, 2026. " +
      "Sold 7,550 ETH Feb 24-25, 2026 to manage liquidity. Realized losses exceed $82M. " +
      "Strategy shifted from 'aggressive accumulation' to 'risk control'. " +
      "894,580 Series A preferred ($25 par, 8% cumulative) — buyback program active.",
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "BTC",
    tier: 1,
    // HOLDINGS: from provenance (mstr-holdings-verified.ts)
    holdings: MSTR_PROVENANCE.holdings?.value || 720_737,
    holdingsLastUpdated: MSTR_PROVENANCE_DEBUG.holdingsDate,
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/mstr/0001193125-26-084264",
    accessionNumber: "0001193125-26-084264",
    sourceType: "sec-filing",
    sourceQuote: "Aggregate BTC Holdings 720,737",
    datStartDate: "2020-08-11", // First BTC purchase announcement
    website: "https://www.strategy.com",
    twitter: "https://twitter.com/Strategy",
    secCik: "0001050446",
    // COST BASIS: from provenance
    costBasisAvg: MSTR_PROVENANCE.costBasisAvg?.value || 76_027,
    costBasisSource: "SEC 8-K (provenance-tracked)",
    costBasisSourceUrl: "/filings/mstr/0001193125-26-053105",
    isMiner: false,
    // QUARTERLY BURN: from provenance (FY2025 10-K: -$67.241M OpCF / 4 quarters)
    quarterlyBurnUsd: MSTR_PROVENANCE.quarterlyBurn?.value ?? 16_810_000,
    burnAsOf: "2025-12-31",
    burnSourceUrl: "/filings/mstr/0001050446-26-000020",
    avgDailyVolume: 3_000_000_000,
    hasOptions: true,
    // SHARES: from provenance (10-Q baseline + 8-K ATM + 10-Q employee equity + Class B)
    sharesForMnav: MSTR_PROVENANCE.sharesOutstanding?.value || 335_482_813,
    sharesSource: "10-K FY2025 cover page DEI (314,112,458 Class A + 19,640,250 Class B). Cross-checked against strategy.com.",
    sharesSourceQuote: "10-K FY2025 cover page DEI (314,112,458 Class A + 19,640,250 Class B). Cross-checked against strategy.com.",
    sharesSourceUrl: "/filings/mstr/0001050446-26-000020",
    sharesAsOf: MSTR_PROVENANCE_DEBUG.holdingsDate,
    // CONVERTS: 10-Q Q3 2025 Note 7
    capitalRaisedConverts: 7_274_000_000,
    capitalRaisedConvertsSource: "SEC 10-Q Q3 2025: Cash flow statement - proceeds from convertible notes",
    capitalRaisedConvertsSourceUrl: "/filings/mstr/0001193125-25-262568",
    // DEBT: 10-K FY2025 carrying value (XBRL us-gaap:ConvertibleLongTermNotesPayable)
    totalDebt: MSTR_PROVENANCE.totalDebt?.value || 8_190_155_000,
    debtSource: "SEC 10-K FY2025: $8,190M carrying value (notional $8,214M, Δ = OID)",
    debtSourceQuote: "SEC 10-K FY2025: $8,190M carrying value (notional $8,214M, Δ = OID)",
    debtSourceUrl: "/filings/mstr/0001050446-26-000020",
    debtAsOf: "2025-12-31",
    // PREFERRED: 10-K FY2025 mezzanine equity carrying value (5 series: STRK/STRF/STRD/STRC/Stream)
    preferredEquity: MSTR_PROVENANCE.preferredEquity?.value || 6_919_514_000,
    preferredSource: "SEC 10-K FY2025: $6,920M carrying value (notional $8,383M per strategy.com/credit)",
    preferredSourceQuote: "SEC 10-K FY2025: $6,920M carrying value (notional $8,383M per strategy.com/credit)",
    preferredSourceUrl: "/filings/mstr/0001050446-26-000020",
    preferredAsOf: "2025-12-31",
    // Cash obligations from SEC 8-K Dec 1, 2025
    preferredDividendAnnual: 780_000_000,
    debtInterestAnnual: 43_000_000,
    cashObligationsAnnual: 823_000_000,
    cashObligationsSource: "SEC 8-K Dec 1, 2025: USD Reserve $1.44B = 21 months of Dividends",
    cashObligationsSourceUrl: "/filings/mstr/0001193125-25-303157",
    cashObligationsAsOf: "2025-11-28",
    // ATM PROGRAM: S-3 shelf
    capitalRaisedAtm: 21_000_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration (21/21 plan equity component)",
    capitalRaisedAtmSourceUrl: "/filings/mstr/0001193125-24-247536",
    // CASH: 10-K FY2025 balance sheet (XBRL us-gaap:CashAndCashEquivalentsAtCarryingValue)
    cashReserves: MSTR_PROVENANCE.cashReserves?.value || 2_301_470_000,
    cashSource: "SEC 10-K FY2025: $2,301M cash & equivalents (USD Reserve $2,250M per 8-K)",
    cashSourceQuote: "SEC 10-K FY2025: $2,301M cash & equivalents (USD Reserve $2,250M per 8-K)",
    cashSourceUrl: "/filings/mstr/0001050446-26-000020",
    cashAsOf: "2025-12-31",
    leader: "Michael Saylor (Executive Chairman)",
    strategy: "21/21 Plan: $21B equity + $21B debt for BTC.",
    notes: "Dual-source provenance: company-disclosed (strategy.com Reg FD) + SEC-verified (10-Q/8-K). See provenance/mstr.ts for full audit trail.",
  },
  {
    id: "3350t",
    name: "Metaplanet",
    ticker: "3350.T",
    country: "JP",
    jurisdiction: "JP",
    authoritativeSource: "TDnet",
    exchangeMic: "XTKS",
    currency: "JPY",
    asset: "BTC",
    tier: 1,
    holdings: 35_102,  // Dec 30, 2025: purchased 4,279 BTC bringing total to 35,102
    holdingsLastUpdated: "2025-12-30",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://metaplanet.jp/en/analytics",
    sourceType: "company-website",
    sourceQuote: "35,102 BTC Holdings",
    datStartDate: "2024-04-01",
    website: "https://metaplanet.jp",
    twitter: "https://twitter.com/Metaplanet_JP",
    costBasisAvg: 102_875,  // From provenance (JPY cost ÷ holdings, converted at current FX). Analytics shows $107,607 at different FX rate.
    costBasisSource: "Metaplanet provenance (54 acquisitions, JPY-denominated, FX-converted)",
    costBasisSourceUrl: "https://metaplanet.jp/en/analytics",
    isMiner: false,
    quarterlyBurnUsd: 5_000_000,  // Estimated from Q3 FY2025 operating expenses
    burnSource: "TDnet Q3 FY2025 Financial Results (estimated)",
    burnSourceUrl: "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20251114/20251112598935.pdf",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 200_000_000,
    marketCap: 2_430_000_000,  // ~$2.4B (Feb 2026, 1.167B shares × ¥325 ÷ 152.7 JPY/USD)
    sharesForMnav: 1_166_803_340,  // 1,142,274,340 (Jan 29, 2026) + 24,529,000 (Feb 13 placement). Mercury preferred is a separate class, NOT in common count.
    sharesSource: "TDnet: 1,142,274,340 common (Jan 29, 2026) + 24,529,000 new common shares (Feb 13, 2026 3rd-party allotment)",
    sharesSourceQuote: "TDnet: 1,142,274,340 common (Jan 29, 2026) + 24,529,000 new common shares (Feb 13, 2026 3rd-party allotment)",
    sharesSourceUrl: "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20251114/20251112598935.pdf",
    sharesAsOf: "2026-02-13",
    // Debt: 4 credit facilities totaling $355M (all zero-coupon bonds have been fully redeemed)
    totalDebt: 355_000_000,  // $355M: $75M (Jan 30) + $50M (Dec 1) + $130M (Nov 21) + $100M (Nov 4) credit facilities
    debtSource: "Metaplanet Analytics Dashboard — 4 credit facilities outstanding, all zero-coupon bonds redeemed ($0 remaining).",
    debtSourceQuote: "Metaplanet Analytics Dashboard — 4 credit facilities outstanding, all zero-coupon bonds redeemed ($0 remaining).",
    debtSourceUrl: "https://metaplanet.jp/en/analytics",
    debtAsOf: "2026-02-14",
    cashReserves: 97_000_000,  // Estimated from capital flow trace: $18M (Q3) + $590M inflows - $511M outflows ≈ $97M. Mercury corrected to $155M (was $136M). Confirm with FY2025 annual report.
    restrictedCash: 0,
    cashSource: "Estimated: Q3 $18M + $355M credit + $155M Mercury preferred (corrected FX) + $80M Feb placement - $451M BTC - $60M redemptions/repayments/opex",
    cashSourceQuote: "Estimated: Q3 $18M + $355M credit + $155M Mercury preferred (corrected FX) + $80M Feb placement - $451M BTC - $60M redemptions/repayments/opex",
    cashSourceUrl: "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20251114/20251112598935.pdf",
    cashAsOf: "2026-02-14",
    preferredEquity: 155_000_000,  // Mercury Class B preferred at par: 23.61M shares × ¥1,000 = ¥23.61B (~$155M at 152.7 FX). Consistent with MSTR STRK/STRF treatment (par value). Metaplanet's dashboard excludes preferred from EV entirely (their mNAV ~1.07x); we include at par.
    preferredSourceUrl: "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20251114/20251112598935.pdf",
    preferredSource: "TDnet/IR disclosures (Metaplanet) — preferred terms via Mercury Class B preferred",
    preferredSourceQuote: "Mercury Class B preferred stock: 23,610,000 shares at ¥1,000 par = ¥23.61B (~$155M at ¥152.7/USD)",
    preferredAsOf: "2026-02-14",
    leader: "Simon Gerovich (CEO)",
    strategy: "Japan's BTC treasury leader. Targeting 210K BTC by 2027 ('555 Million Plan'). Uses moving-strike warrants + preferred shares for capital efficiency. Currently raising via 25th series warrants (Jan 2026) for BTC purchases.",
    notes: "Largest Asian public BTC holder. Reports BTC Yield (growth in BTC per share). Capital strategy: issue equity when mNAV > 1x, pivot to preferred shares when near 1x. $355M in credit facilities outstanding (4 draws from BTC-backed facility). All zero-coupon bonds (series 2-19) fully redeemed. Audit note 2026-03-05: historical precision reconciled for 2024-11-19 and 2025-02-17 holdings, and 2026-02-13 post-placement shares checkpoint added to history stack. Data quality classification: LEGAL_MATCH for holdings (TDnet/disclosures anchor); PARTIAL_MISMATCH for shares (lock includes Feb 13, 2026 placement while D1 latest basic_shares remains on Jan 29, 2026 filing anchor).",
    // Key strategy documents (TDnet disclosures):
    // - 2025-2027 BITCOIN PLAN (Jun 6, 2025): 210K BTC target, warrant framework
    // - Phase II: Bitcoin Platform (Oct 1, 2025): BTC income generation for preferred dividends
    // - Capital Allocation Policy (Oct 28, 2025): mNAV-based capital decisions, credit facility, buybacks
    // - Q3 2025 Earnings Presentation (Nov 14, 2025): Synthesizes all strategies
    strategyDocs: [
      { title: "Q3 2025 Earnings Presentation", date: "2025-11-14", url: "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20251114/20251112598935.pdf" },
      { title: "Capital Allocation Policy", date: "2025-10-28", url: "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20251114/20251112598935.pdf" },
      { title: "Phase II: Bitcoin Platform", date: "2025-10-01", url: "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20251114/20251112598935.pdf" },
      { title: "2025-2027 BITCOIN PLAN", date: "2025-06-06", url: "https://finance-frontend-pc-dist.west.edge.storage-yahoo.jp/disclosure/20251114/20251112598935.pdf" },
    ],
  },
  {
    id: "xxi",
    name: "Twenty One Capital",
    ticker: "XXI",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0001865602",
    website: "https://xxi.money",
    twitter: "xxicapital",
    asset: "BTC",
    tier: 1,
    holdings: 43_514,  // Combined: Tether (24,500) + Bitfinex (7,000) + PIPE (~11.5K) + In-Kind (~0.4K)
    holdingsDerived: true,
    holdingsCalculation: "Contribution 31,500 (Tether 24,500 + Bitfinex 7,000) + PIPE ~11,533 + In-Kind PIPE ~392 = ~43,425 (8-K EX-99.4)",
    sourceQuote: "31,500 Bitcoin",
    holdingsLastUpdated: "2025-12-08",  // Merger close date (8-K: "consummated on December 8, 2025")
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/xxi/0001213900-25-121293",
    accessionNumber: "0001213900-25-121293",
    datStartDate: "2025-12-09",
    costBasisAvg: 84_864,  // S-1/A Feb 9, 2026: Contribution + Additional PIPE BTC valued at $84,863.57/BTC at Closing
    costBasisSource: "SEC S-1/A Feb 9, 2026: Tether/Bitfinex contribution + Additional PIPE BTC at $84,863.57/BTC (Closing fair value)",
    costBasisSourceUrl: "/filings/xxi/0001213900-26-013482",
    isMiner: false,
    stakingPct: 0,  // BTC not staked
    // No burn data yet - awaiting first 10-Q (merged Dec 2025)
    avgDailyVolume: 150_000_000,
    hasOptions: true,
    // DUAL-CLASS: 346,548,153 Class A + 304,842,759 Class B = 651,390,912 total
    // Class B has ZERO economic rights (no dividends, no liquidation) per charter
    sharesForMnav: 346_548_153,  // Class A ONLY — Class B has no economic rights
    sharesSource: "SEC 8-K Dec 12, 2025",
    sharesSourceQuote: "SEC 8-K Dec 12, 2025",
    sharesSourceUrl: "/filings/xxi/0001213900-25-121293",
    sharesAsOf: "2025-12-09",
    // Debt: $486.5M 1% convertible senior secured notes due 2030, collateralized by 16,116 BTC (~3:1 ratio)
    totalDebt: 486_500_000,
    debtSource: "SEC 8-K Dec 12, 2025 - 1% secured converts due 2030",
    debtSourceQuote: "SEC 8-K Dec 12, 2025 - 1% secured converts due 2030",
    debtSourceUrl: "/filings/xxi/0001213900-25-121293",
    debtAsOf: "2025-12-09",
    // Cash obligations: $486.5M × 1% = $4.865M/year
    debtInterestAnnual: 4_865_000,
    cashObligationsAnnual: 4_865_000,
    cashObligationsSource: "SEC S-1 Jan 2026: 1% convertible notes",
    cashObligationsSourceUrl: "/filings/xxi/0001213900-26-001285",
    cashObligationsAsOf: "2025-12-09",
    cashReserves: 119_300_000,  // ~$119.3M net cash at Dec 2025 closing
    restrictedCash: 119_300_000,  // Debt service reserves - not excess
    cashSource: "SEC S-1 Jan 5, 2026",
    cashSourceQuote: "SEC S-1 Jan 5, 2026",
    cashSourceUrl: "/filings/xxi/0001213900-26-001285",
    cashAsOf: "2025-12-09",
    encumberedHoldings: 16_116,  // 16,116 BTC collateralizes $486.5M convertible debt at ~3:1 ratio
    encumberedSource: "SEC 8-K Dec 12, 2025: 16,116 BTC pledged as collateral for 1% convertible senior secured notes",
    encumberedSourceUrl: "/filings/xxi/0001213900-25-121293",
    leader: "Jack Mallers (CEO)",
    strategy: "BTC treasury + Bitcoin-native financial services. Tether/SoftBank/Cantor backed.",
    notes: "Merged Dec 2025. 16,116 BTC collateralizes debt at ~3:1 ratio. #3 corporate BTC holder. Audit note 2026-03-05: canonical 2025-12-09 anchor normalized to 8-K accession 0001213900-25-121293 (filed Dec 12, 2025). D1 also contains pre-merger SPAC cash rows at 2025-09-30 ($25k) from legacy CIK history; treat as pre-launch context, not post-launch treasury state.",
  },
  {
    id: "cepo",  // BSTR Holdings pre-merger
    name: "BSTR Holdings",
    ticker: "CEPO",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0002027708",
    cashReserves: 207_000_000,  // SPAC trust ~$207M as of Dec 31, 2025 (per amended S-4)
    cashAsOf: "2025-12-31",
    cashSource: "Amended S-4: approximately $207 million of SPAC trust cash as of December 31, 2025",
    cashSourceQuote: "Amended S-4: approximately $207 million of SPAC trust cash as of December 31, 2025",
    cashSourceUrl: "/filings/cepo/0001213900-26-008287",
    asset: "BTC",
    tier: 1,
    holdings: 30_021,
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/cepo/0001213900-26-008287",
    accessionNumber: "0001213900-26-008287",
    sourceType: "sec-filing",
    sourceQuote: "initial treasury of 30,021 Bitcoin",
    datStartDate: "2025-10-01",
    // costBasisAvg removed - needs verification
    isMiner: false,
    // SPAC: 20,500,000 Class A + 5,000,000 Class B = 25,500,000 total (pre-merger)
    sharesForMnav: 25_500_000,
    sharesSource: "SEC 10-K FY2025 (CIK 0002027708): 20.5M Class A + 5M Class B",
    sharesSourceQuote: "SEC 10-K FY2025 (CIK 0002027708): 20.5M Class A + 5M Class B",
    sharesAsOf: "2025-12-31",
    quarterlyBurnUsd: 5_000_000,
    burnSource: "SEC 10-Q (filed 2025-05-15): NetCashUsedInOperatingActivities $37,607 (2024-01-01 to 2024-03-31)",
    burnSourceUrl: "/filings/cepo/0001213900-25-044273",
    burnAsOf: "2024-03-31",
    avgDailyVolume: 80_000_000,
    hasOptions: true,
    // $500M + $30.5M = $530.5M in 1.00% Convertible Senior Secured Notes @ $13/share
    totalDebt: 530_500_000,
    debtSource: "SEC 8-K Jul 17, 2025 ($500M) + SEC 8-K Aug 7, 2025 ($30.5M)",
    debtSourceQuote: "1.00% Convertible Senior Secured Notes: $500M main + $30.5M additional tranche @ $13 conversion",
    debtSourceUrl: "/filings/cepo/0001213900-25-064922",
    debtAsOf: "2025-08-07",
    pendingMerger: true,  // SPAC merger not yet closed - no mNAV
    expectedHoldings: 30_021,  // Confirmed BTC from Adam Back + investors
    leader: "Adam Back (CEO)",
    strategy: "Hashcash inventor's BTC treasury play. Target 50K+ BTC.",
    notes: "SPAC merger pending. 25K BTC from Adam Back + 5K from investors (30,021 BTC year-end anchor). Will trade as BSTR post-merger. Audit note 2026-03-05: holdingsLastUpdated normalized to 2025-12-31 to match canonical history/D1; latest SEC 10-K (filed 2026-03-02) still frames BSTR transaction as a pending business combination.",
  },
  {
    // =========================================================================
    // MARA - Core financials from provenance/mara.ts (SEC-verified)
    // Largest US public Bitcoin miner with HODL strategy
    // =========================================================================
    id: "mara",
    name: "MARA Holdings",
    ticker: "MARA",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "BTC",
    tier: 1,
    // HOLDINGS: from provenance (FY2025 10-K)
    holdings: MARA_PROVENANCE.holdings?.value || 53_822,
    holdingsLastUpdated: MARA_PROVENANCE_DEBUG.holdingsDate,
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/mara/0001507605-26-000014",
    accessionNumber: "0001507605-26-000014",
    sourceType: "sec-filing",
    sourceQuote: "Total bitcoin holdings of 53,822 BTC as of December 31, 2025",
    datStartDate: "2021-01-25", // First major BTC purchase ($150M)
    website: "https://mara.com",
    twitter: "https://twitter.com/MARAHoldings",
    secCik: "0001507605",
    // COST BASIS: from provenance (10-Q)
    costBasisAvg: MARA_PROVENANCE.costBasisAvg?.value || 87_752,
    costBasisSource: "SEC-verified (provenance): 10-Q Q3 2025",
    costBasisSourceUrl: "/filings/mara/0001507605-25-000028",
    costBasisAsOf: MARA_PROVENANCE_DEBUG.balanceSheetDate,
    isMiner: true,
    // QUARTERLY BURN: from provenance (G&A only, mining COGS excluded)
    quarterlyBurnUsd: MARA_PROVENANCE.quarterlyBurn?.value ?? 85_296_000,
    burnSource: "SEC-verified (provenance): 10-Q Q3 2025 G&A (mining COGS excluded)",
    burnSourceUrl: "/filings/mara/0001507605-25-000028",
    burnAsOf: MARA_PROVENANCE_DEBUG.balanceSheetDate,
    avgDailyVolume: 400_000_000,
    hasOptions: true,
    marketCap: 3_600_000_000,
    // SHARES: from provenance (basic shares, dilutives in dilutive-instruments.ts)
    sharesForMnav: MARA_PROVENANCE_DEBUG.sharesBasic,
    sharesSource: "SEC-verified (provenance): 10-Q Q3 2025 cover page",
    sharesSourceQuote: "SEC-verified (provenance): 10-Q Q3 2025 cover page",
    sharesSourceUrl: "/filings/mara/0001507605-25-000028",
    sharesAsOf: MARA_PROVENANCE_DEBUG.sharesDate,
    // CASH: from provenance (10-Q)
    cashReserves: MARA_PROVENANCE.cashReserves?.value || 826_392_000,
    cashAsOf: "2025-09-30",
    restrictedCash: 34_400_000,  // XBRL us-gaap:RestrictedCash (Q3 2025 balance sheet, matches provenance)
    cashSource: "SEC-verified (provenance): 10-Q Q3 2025",
    cashSourceQuote: "SEC-verified (provenance): 10-Q Q3 2025",
    cashSourceUrl: "/filings/mara/0001507605-25-000028",
    leader: "Fred Thiel (CEO)",
    strategy: "HODL miner - keeps all mined BTC. 50 EH/s.",
    // DEBT: from provenance (~$3.25B in convertible notes)
    totalDebt: MARA_PROVENANCE.totalDebt?.value || 3_597_561_000,
    preferredEquity: 0,
    preferredAsOf: "2025-09-30",
    preferredSourceUrl: "/filings/mara/0001507605-25-000028",
    preferredSourceQuote: "No preferred stock outstanding (10-Q Q3 2025: preferred stock authorized 5,000,000 shares, none issued)",
    debtAsOf: "2025-09-30",
    debtSource: "SEC-verified (provenance): 10-Q Q3 2025 XBRL (LongTermDebt + LinesOfCreditCurrent)",
    debtSourceQuote: "SEC-verified (provenance): 10-Q Q3 2025 XBRL (LongTermDebt + LinesOfCreditCurrent)",
    debtSourceUrl: "/filings/mara/0001507605-25-000028",
    notes: "Largest US public miner. Core financials from provenance/mara.ts. 5 convertible note tranches ($3.298B face) per 10-Q Note 14 + $350M line of credit. Dilutives (~132M from converts + RSUs) in dilutive-instruments.ts.",
  },
  {
    id: "asst",
    name: "Strive, Inc.",
    ticker: "ASST",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "BTC",
    tier: 1,
    // HOLDINGS: SEC 8-K Feb 13, 2026 (as of Feb 11)
    holdings: 13_131.82,
    holdingsLastUpdated: "2026-02-11",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/asst/0001628280-26-007897",
    accessionNumber: "0001628280-26-007897",
    sourceType: "sec-filing",
    sourceQuote: "held $127.2 million of cash and cash equivalents and held 13,131.8 bitcoin",
    datStartDate: "2024-05-01",
    website: "https://strive.com",
    twitter: "stikiinvestor",
    investorRelationsUrl: "https://investors.strive.com",
    secCik: "0001920406",
    isMiner: false,
    // BURN: SEC 10-Q Q3 2025
    quarterlyBurnUsd: 6_500_000,  // Predecessor 9mo OpCF: -$18.2M / ~2.8 quarters = ~$6.5M/qtr (Successor 19-day period distorted by merger costs)
    burnSource: "SEC 10-Q Q3 2025: Predecessor OpCF -$18,209K (Jan 1 - Sep 11, 254 days). Successor 19 days not representative.",
    burnSourceUrl: "/filings/asst/0001628280-25-052343",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 100_000_000,
    hasOptions: false,  // No stock options granted per SEC data
    // SHARES: Anchor 44.7M post-split as of Dec 31, 2025 (SEC 8-K Jan 5, 2026: 894.3M pre-split ÷ 20)
    // + Semler merger shares (Jan 16) + PIPE/SATA offering shares (Jan 21-28) = ~62.37M estimated
    // Pre-funded warrants @ $0.002 tracked in dilutive-instruments.ts
    sharesForMnav: 63_048_519,  // Feb 13 8-K: Class A 53,168,237 + Class B 9,880,282 (post-split)
    sharesSource: "SEC 8-K Feb 13, 2026: 53,168,237 Class A + 9,880,282 Class B = 63,048,519 (post 1-for-20 split)",
    sharesSourceQuote: "SEC 8-K Feb 13, 2026: 53,168,237 Class A + 9,880,282 Class B = 63,048,519 (post 1-for-20 split)",
    sharesSourceUrl: "/filings/asst/0001628280-26-007897",
    sharesAsOf: "2026-02-11",
    // CASH: SEC 8-K Jan 5, 2026 - $67.6M as of Dec 31, 2025
    // Post-Jan: +$119M SATA raise, -$20M Coinbase payoff, -BTC purchases → estimated ~$50-80M current
    cashReserves: 127_200_000,  // Feb 13 8-K: $127.2M as of Feb 11, 2026
    restrictedCash: 127_200_000,  // Operating capital earmarked for BTC - not excess
    cashSource: "SEC 8-K Feb 13, 2026: $127.2M as of Feb 11, 2026",
    cashSourceQuote: "SEC 8-K Feb 13, 2026: $127.2M as of Feb 11, 2026",
    cashSourceUrl: "/filings/asst/0001628280-26-007897",
    cashAsOf: "2026-02-11",
    // DEBT: $100M Semler converts - $90M exchanged for SATA = $10M remaining (SEC 8-K Jan 28)
    // Coinbase $20M loan also paid off. 100% BTC unencumbered.
    totalDebt: 10_000_000,
    debtSource: "Company-derived: $100M Semler converts - $90M exchanged = $10M (SEC 8-K Jan 28, 2026)",
    debtSourceQuote: "Company-derived: $100M Semler converts - $90M exchanged = $10M (SEC 8-K Jan 28, 2026)",
    debtSourceUrl: "/filings/asst/0001140361-26-002606",
    debtAsOf: "2026-01-28",
    // PREFERRED: SATA 12.25% perpetual preferred (NOT convertible to common)
    // Dec 31: 2,012,729 SATA (SEC 8-K Jan 5) + Jan: 1.32M underwritten + ~930K exchange = ~4.26M @ $100 stated value
    preferredEquity: 426_551_800,  // Feb 13 8-K: 4,265,518 SATA shares × $100 stated value
    preferredSource: "SEC 8-K Feb 13, 2026: 4,265,518 SATA shares outstanding × $100 stated value",
    preferredSourceQuote: "SEC 8-K Feb 13, 2026: 4,265,518 SATA shares outstanding × $100 stated value",
    preferredSourceUrl: "/filings/asst/0001628280-26-007897",
    preferredAsOf: "2026-02-11",
    leader: "Vivek Ramaswamy (Co-Founder), Matt Cole (CEO), Eric Semler (Exec Chair)",
    strategy: "First publicly traded asset manager with BTC treasury. No debt - uses perpetual preferred (SATA) instead. Merged with Asset Entities Sep 2025, acquired Semler Scientific Jan 2026.",
    notes: "1-for-20 reverse split Feb 6, 2026. SATA 12.50% perpetual preferred (4,265,518 shares) NOT convertible to common. Pre-funded warrants (53.6K @ $0.002) and traditional warrants (26.6M @ $27) tracked in dilutive-instruments.ts. ~$10M Semler converts remaining, planned retirement by Apr 2026.",
  },
  {
    id: "kulr",
    name: "KULR Technology",
    ticker: "KULR",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "BTC",
    tier: 1,
    // VERIFIED: February 2026 Corporate Update
    holdings: 1_021,
    holdingsLastUpdated: "2026-02-28",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://kulr.ai/investors/",
    datStartDate: "2024-12-01",
    secCik: "0001662684",
    costBasisAvg: 98_627,  // ~$101M total cost for 1_021 BTC per Feb 2026 update
    costBasisSource: "Feb 2026 Corporate Update: ~$101M aggregate cost for 1_021 BTC",
    costBasisSourceUrl: "https://kulr.ai/investors/",
    isMiner: false,
    quarterlyBurnUsd: 10_300_000,  // Q3 2025 operating cash burn: SG&A $6.26M + R&D $2.32M + COGS $6.26M - revenue $6.88M ≈ $7.96M opex; cash flow statement shows ~$10.3M/qtr
    burnSource: "SEC 10-Q Q3 2025 XBRL: NetCashUsedInOperatingActivities",
    burnSourceUrl: "/filings/kulr/0001104659-25-113662",
    accessionNumber: "0001104659-25-113662",  // Note: this accession is for burn rate (10-Q), not holdings source
    sourceType: "press-release",
    sourceQuote: "1,021 BTC with an aggregate cost of approximately $101M",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 30_000_000,
    hasOptions: true,
    // marketCap calculated from sharesForMnav × price (removed static override)
    sharesForMnav: 45_674_420,  // SEC 10-Q Q3 2025 (as of Nov 14, 2025)
    sharesSource: "SEC 10-Q Q3 2025: EntityCommonStockSharesOutstanding",
    sharesSourceQuote: "SEC 10-Q Q3 2025: EntityCommonStockSharesOutstanding",
    sharesSourceUrl: "/filings/kulr/0001104659-25-113662",
    sharesAsOf: "2025-11-14",
    totalDebt: 0,
    debtSource: "SEC 10-Q Q3 2025: no outstanding long-term debt",
    debtSourceQuote: "SEC 10-Q Q3 2025: no outstanding long-term debt",
    debtSourceUrl: "/filings/kulr/0001104659-25-113662",
    debtAsOf: "2025-10-15",
    cashReserves: 20_600_000,  // SEC 10-Q Q3 2025 (Sep 30, 2025)
    restrictedCash: 20_600_000,  // Earmarked for BTC purchases per 90% policy - not excess cash
    cashSource: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceQuote: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceUrl: "/filings/kulr/0001104659-25-113662",
    cashAsOf: "2025-09-30",
    leader: "Michael Mo (CEO)",
    strategy: "Bitcoin First Company. Allocates up to 90% of surplus cash to BTC. Uses BTC Yield as primary KPI.",
    website: "https://kulr.ai",
    twitter: "https://x.com/KULRTech",
    notes: "NASA supplier. 291.2% BTC Yield (YTD 2025). Strategy authorizes 90% of surplus cash into BTC. 1,021 BTC held as of Feb 2026. $20M Coinbase credit facility maintained. Uses blockchain for space-rated battery screening (NASA standards).",
  },
  {
    id: "altbg",
    name: "The Blockchain Group",
    ticker: "ALCPB",  // Changed from ALTBG (Capital B rebrand)
    country: "DE",
    jurisdiction: "EU",
    authoritativeSource: "EU Regulatory",
    exchangeMic: "XETR",
    currency: "EUR",
    asset: "BTC",
    tier: 2,
    website: "https://cptlb.com",
    holdings: 2_834,  // AMF filing Feb 27, 2026 (2,834 BTC total)
    holdingsLastUpdated: "2026-02-27",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www.amf-france.org/en/news-publications/news/capital-structure-update-alcpb-20260227",
    accessionNumber: "AMF-20260227",
    sourceType: "regulatory-filing",
    sourceQuote: "Total holdings reach 2,834 Bitcoin following February acquisitions",
    datStartDate: "2024-11-05",  // First BTC purchase announced Nov 5, 2024
    costBasisAvg: 93_083,  // €93,083 avg per AMF Feb 16, 2026 filing
    costBasisSource: "regulatory-filing",
    costBasisSourceUrl: "https://www.amf-france.org/en/news-publications/news/capital-structure-update-alcpb-20260227",
    isMiner: false,
    quarterlyBurnUsd: 800_000,  // ~€0.75M/quarter from H1 2025 IFRS (was $2M — too high by ~2.7x)
    burnSource: "H1 2025 IFRS financials (~€0.72M/quarter operating cash burn)",
    burnSourceUrl: "https://cptlb.com",
    burnAsOf: "2025-06-30",
    burnEstimated: true,  // No XBRL; estimated from H1 2025 actuals
    avgDailyVolume: 10_000_000,
    marketCap: 200_000_000,
    sharesForMnav: 228_069_631,  // Basic shares per AMF Feb 16, 2026. Diluted: 392,278,260
    sharesSource: "AMF filing Feb 16, 2026",
    sharesSourceQuote: "AMF filing Feb 16, 2026",
    sharesSourceUrl: "https://fr.ftp.opendatasoft.com/datadila/INFOFI/ACT/2026/02/FCACT078298_20260216.pdf",
    sharesAsOf: "2026-02-16",
    // Total convertible bond face value (all OCA tranches). The mNAV calculator dynamically
    // subtracts ITM convertible faceValues from totalDebt, so we include ALL tranches here.
    // At stock ~€0.60: OCA Tranche 1 ($50.5M, strike $0.57) is ITM → subtracted from debt.
    // Remaining OTM: B-02 ($73.2M), B-03 ($13M), A-03/A-04/B-04 ($16.6M), A-05 ($6.8M) = ~$109.6M effective debt.
    totalDebt: 160_160_000,  // Sum of all OCA faceValues in dilutive-instruments.ts (USD)
    debtSource: "Convertible bond face values (OCA A-01/B-01 through A-05). See dilutive-instruments.ts for breakdown.",
    debtSourceQuote: "Convertible bond face values (OCA A-01/B-01 through A-05). See dilutive-instruments.ts for breakdown.",
    debtAsOf: "2026-02-16",
    cashReserves: 1_531_000,  // €1.531M available cash per H1 2025 IFRS
    cashSource: "H1 2025 IFRS financials",
    cashSourceQuote: "H1 2025 IFRS financials",
    cashSourceUrl: "https://www.actusnews.com/en/amp/capital-b/pr/2025/10/31/capital-b-publishes-its-results-for-the-first-half-of-2025",
    cashAsOf: "2025-06-30",
    strategy: "French BTC treasury company (Capital B). EUR300M ATM program.",
    notes: "Euronext Paris listed. Europe's Strategy equivalent. Data via AMF API. Capital B publishes their own mNAV using diluted shares (392M) without adding debt separately — converts are treated as future shares, not debt. Our calculation uses basic shares (228M) + OCA debt in EV. Both methods are valid; theirs shows ~1.47x, ours ~1.86x.",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Active EUR 300M ATM program — share count may be stale between AMF filings. Last update: Feb 16, 2026 (228.1M basic shares).",
        severity: "warning",
      },
    ],
  },
  {
    id: "h100st",
    name: "H100 Group",
    ticker: "H100.ST",
    country: "SE",
    jurisdiction: "EU",
    authoritativeSource: "MFN",
    exchangeMic: "XSTO",
    website: "https://www.h100.group",
    currency: "SEK",
    asset: "BTC",
    tier: 2,
    holdings: 1_051,  // MFN Feb 6, 2026: 4.39 BTC purchase → 1,051 total
    holdingsLastUpdated: "2026-02-06",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://mfn.se/a/h100-group/h100-group-acquires-4-39-btc-total-holdings-reach-1-051-btc",  // MFN Feb 6, 2026 filing (specific URL)
    sourceType: "regulatory-filing",
    sourceQuote: "Total Bitcoin Holdings Post-Purchase: 1,051",
    datStartDate: "2025-05-22",  // First BTC purchase May 22, 2025
    costBasisAvg: 114_606,  // treasury.h100.group avg cost
    costBasisSource: "company-website",
    costBasisSourceUrl: "https://treasury.h100.group",
    isMiner: false,
    quarterlyBurnUsd: 1_000_000,
    burnSource: "MFN Interim Report Nov 19, 2025 (estimate - no XBRL)",
    burnSourceUrl: "https://www.h100.group/investor-relations/shares",
    burnAsOf: "2025-09-30",
    burnEstimated: true,  // Swedish quarterly report estimate
    totalDebt: H100_PROVENANCE.totalDebt?.value || 20_736_000,  // SEK 219.8M zero-coupon convertible / 10.6 SEK/USD ≈ $20.7M. IFRS classification TBD Feb 24 Bokslutskommuniké.
    debtAsOf: "2025-12-31",  // best-available placeholder; replace with specific IFRS period end
    debtSourceUrl: "https://mfn.se/a/h100-group", // MFN filings feed
    debtSource: "MFN filings index — needs specific interim/annual report link",
    debtSourceQuote: "SEK 219.8M zero-coupon convertible debentures (Jul 2025, Adam Back et al). SEK 122.5M converted Nov 2025.",
    cashReserves: 2_900_000,  // SEK 30.6M ÷ ~10.6 SEK/USD ≈ $2.9M (Feb 24, 2026 Bokslutskommuniké)
    cashSourceUrl: "https://mfn.se/a/h100-group/h100-group-fourth-quarter-and-full-year-report-2025",
    cashSource: "MFN Bokslutskommuniké Feb 24, 2026 (FY2025 year-end report): SEK 30.6M cash",
    cashSourceQuote: "MFN Bokslutskommuniké Feb 24, 2026 (FY2025 year-end report): SEK 30.6M cash",
    cashAsOf: "2025-12-31",
    avgDailyVolume: 5_000_000,
    // marketCap calculated from sharesForMnav x price
    sharesForMnav: 338_396_693,  // 335,250,237 + 3,146,456 (Future Holdings AG acquisition Feb 12, 2026)
    sharesSource: "H100 Group IR page + MFN acquisition filing",
    sharesSourceQuote: "H100 Group IR page + MFN acquisition filing",
    sharesSourceUrl: "https://mfn.se/a/h100-group", // MFN filings index (more specific than IR shares landing)
    sharesAsOf: "2026-02-12",  // MFN filing date for Future Holdings AG acquisition completion
    leader: "Sander Andersen (Executive Chairman), Johannes Wiik (CEO)",
    strategy: "Swedish BTC treasury company. Nordic Strategy equivalent.",
    notes: "NGM Nordic SME listed. ISK-eligible. Jul 2025: SEK 342.3M zero-coupon convertible debentures (Adam Back et al) + multiple directed equity issues. SEK 122.5M converted Nov 2025. Acquired Future Holdings AG (Switzerland) Feb 2026. EGM Mar 18, 2026: Richard Byworth proposed as Chairman, 14.4M warrant incentive program (4% dilution) pending vote. IR page incorrectly claims 'no convertibles'.",
  },
  {
    id: "obtc3",
    name: "OranjeBTC",
    ticker: "OBTC3",
    country: "BR",
    jurisdiction: "OTHER",
    authoritativeSource: "CVM",
    exchangeMic: "B3SA",
    currency: "BRL",
    asset: "BTC",
    tier: 2,
    holdings: 3_723,  // Mar 1, 2026 market announcement: 3,723.0 BTC
    holdingsUnverified: true,  // CVM filing not independently verified
    holdingsLastUpdated: "2026-03-01",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://ri.oranjebtc.com",
    sourceQuote: "3,723.0 BTC held as of March 1, 2026 (B3 Comunicado ao Mercado)",
    sourceType: "press-release",
    datStartDate: "2025-09-23",  // B3 listing via reverse merger with Intergraus
    website: "https://www.oranjebtc.com",
    isMiner: false,
    quarterlyBurnUsd: 500_000,  // Education business minimal burn
    burnSource: "CVM filings (estimate - Brazilian company)",
    burnSourceUrl: "https://ri.oranjebtc.com",
    burnAsOf: "2025-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,  // ~R$5.3M/day = ~$1M USD
    sharesForMnav: 155_300_500,  // BASIC: Mar 1, 2026 announcement: 155,300,500 shares outstanding outside treasury. Dilution (6,966,760 debenture shares) handled dynamically via dilutive-instruments.ts
    sharesSource: "Mar 1, 2026 B3 market announcement (Comunicado ao Mercado)",
    sharesSourceQuote: "155,300,500 common shares outstanding (excluding treasury shares). In the event of conversion of the issued debentures, an additional 6,966,760 common shares will be issued.",
    sharesSourceUrl: "https://api.mziq.com/mzfilemanager/v2/d/1c906e2c-8d06-4a32-a1a8-a240167c77f2/49272f57-866a-97f7-eb9e-22b3bcac1733?origin=2",
    sharesAsOf: "2026-03-01",
    totalDebt: 24_886_408,  // R$ 128,160,000 / 5.15 = ~$24.89M USD — Parafi Capital zero-interest 5yr convertible debenture
    debtSource: "NeoFeed Feb 2026: R$128M zero-interest 5yr convertible debenture with Parafi Capital. Face value derived from 6,966,760 potential shares × R$18.40 conversion price",
    debtSourceUrl: "https://neofeed.com.br/negocios/o-preco-da-tese-cripto-na-b3-oranjebtc-perde-quase-metade-do-valor-em-um-mes/",
    debtAsOf: "2025-10-01",
    debtSourceQuote: "A companhia possui uma dívida de cinco anos com juros zero, firmada com a americana Parafi Capital, no valor de R$ 128 milhões, com possibilidade de conversão em ações.",
    strategy: "First LatAm BTC treasury company. Mission: build largest BTC treasury in Latin America.",
    notes: "B3 listed (Brazil). Explicit MSTR-style strategy. Mar 1, 2026 market announcement reports 3,723.0 BTC and 155,300,500 shares outstanding outside treasury (162,267,260 fully adjusted for debenture conversion). OBTC3 latest holdings/shares are now in D1 after targeted backfill; quarterly financial stack remains incomplete.",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Debt/cash evidence quality remains lower than holdings/shares: latest checkpoint is anchored to market announcement + IR channel while full CVM statement extraction is still pending.",
        severity: "warning",
      },
    ],
  },
  {
    id: "swc",
    name: "The Smarter Web Company",
    ticker: "SWC",
    country: "GB",
    jurisdiction: "UK",
    authoritativeSource: "LSE RNS",
    exchangeMic: "XLON",
    currency: "GBP",
    asset: "BTC",
    tier: 1,  // Verified holdings via RNS
    holdings: 2_692,  // RNS Mar 1, 2026: "Total Bitcoin Holdings are now 2,692 Bitcoin"
    holdingsLastUpdated: "2026-03-01",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www.londonstockexchange.com/news-article/SWC/total-bitcoin-holdings-update/16925134",
    accessionNumber: "LSE-16925134",
    sourceType: "regulatory-filing",
    sourceQuote: "Total Bitcoin Holdings are now 2,692 Bitcoin",
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
    sharesForMnav: 351_919_126,  // RNS Mar 2, 2026: Total Voting Rights
    sharesSource: "LSE RNS Mar 2, 2026: Total Voting Rights",
    sharesSourceQuote: "LSE RNS Mar 2, 2026: Total Voting Rights",
    sharesSourceUrl: "https://www.londonstockexchange.com/news-article/SWC/total-voting-rights/16926451",
    sharesAsOf: "2026-03-02",
    strategy: "UK BTC treasury company. 'The 10 Year Plan' - explicit policy of acquiring Bitcoin as treasury reserve.",
    notes: "LSE: SWC. #1 UK BTC holder. Successfully uplisted to LSE Main Market Feb 3, 2026. To be included in FTSE All-Share/SmallCap indexes Mar 23, 2026. Acquired Squarebird Feb 23, 2026. Established Coinbase credit facility Feb 2026.",
    dataWarnings: [],
  },
  {
    id: "sqns",
    name: "Sequans Communications",
    ticker: "SQNS",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "BTC",
    tier: 2,
    holdings: 2_139,  // Q4 2025 6-K: 2,139 BTC at Dec 31, 2025 (1,617 pledged as collateral)
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/sqns/0001383395-26-000013",
    accessionNumber: "0001383395-26-000013",
    sourceType: "sec-filing",
    sourceQuote: "the Company held 2,139 Bitcoin with a market value of $187.1 million",
    datStartDate: "2025-06-23",
    website: "https://sequans.com",
    twitter: "https://twitter.com/Sequans",
    investorRelationsUrl: "https://sequans.com/investor-relations/investor-materials/",
    secCik: "0001383395",
    isMiner: false,
    quarterlyBurnUsd: 10_000_000,  // IoT semiconductor ops — estimate based on Q4 non-IFRS loss ~$18.5M less BTC-related items
    burnSource: "6-K Q4 2025 earnings (estimate)",
    burnSourceUrl: "/filings/sqns/0001383395-26-000013",
    burnAsOf: "2025-12-31",
    burnEstimated: true,
    avgDailyVolume: 5_000_000,
    sharesForMnav: 15_504_809,  // Q4 2025 6-K weighted avg basic ADS. Best available until 20-F.
    sharesSource: "6-K Q4 2025 weighted avg basic ADS",
    sharesSourceQuote: "6-K Q4 2025 weighted avg basic ADS",
    sharesSourceUrl: "/filings/sqns/0001383395-26-000013",
    sharesAsOf: "2025-12-31",
    totalDebt: 94_500_000,  // Q4 6-K: $94.5M convertible outstanding. Feb 13 6-K: full redemption via BTC sale by Jun 2026.
    debtAsOf: "2025-12-31",
    debtSource: "6-K Q4 2025 + Feb 13, 2026 debt restructuring 6-K",
    debtSourceQuote: "6-K Q4 2025 + Feb 13, 2026 debt restructuring 6-K",
    debtSourceUrl: "/filings/sqns/0001383395-26-000018",
    encumberedHoldings: 1_617,  // 1,617 of 2,139 BTC pledged as collateral — being sold to redeem convertible
    encumberedSource: "6-K Feb 13, 2026: 1,617 BTC pledged, full cash redemption by Jun 2026",
    encumberedSourceUrl: "/filings/sqns/0001383395-26-000018",
    strategy: "IoT semiconductor company with BTC treasury strategy. Raised $189M convertible debt for BTC. Actively selling 1,617 pledged BTC to fully redeem $94.5M convertible by Jun 2026.",
    notes: "NYSE listed (French HQ). 1,617 of 2,139 BTC pledged as collateral — being sold to redeem convertible (Feb 13 6-K). Post-redemption holdings will be ~522 BTC unencumbered. ADS buyback: ~9.7% repurchased in Q4, additional 10% authorized. Audit note 2026-03-05: lock values reconciled to D1 latest at 2025-12-31 using 6-K Q4 2025 anchor.",
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    twitter: "ddcbtc_",
    asset: "BTC",
    tier: 2,
    holdings: 2_183,  // treasury.ddc.xyz Mar 4, 2026
    holdingsLastUpdated: "2026-03-04",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://treasury.ddc.xyz",
    datStartDate: "2025-02-21",
    website: "https://ir.ddc.xyz",
    secCik: "0001808110",
    cashReserves: 6_752_917,
    cashAsOf: "2025-06-30",
    cashSource: "SEC 424B3 Jan 26, 2026 (H1 2025 unaudited balance sheet)",
    cashSourceQuote: "Cash and cash equivalents: US$6,752,917 (June 30, 2025 unaudited)",
    cashSourceUrl: "/filings/ddc/0001213900-26-007465",
    costBasisAvg: 85_661,  // treasury.ddc.xyz weighted avg for 1,988 BTC
    costBasisSource: "company-website",
    costBasisSourceUrl: "https://treasury.ddc.xyz",
    isMiner: false,
    quarterlyBurnUsd: 2_600_000,  // H1 2025 operating cash burn: $5.2M / 2 quarters (424B3 F-1 financials)
    burnSource: "SEC 424B3 Jan 26, 2026 (F-1 financials, H1 2025 unaudited)",
    burnSourceUrl: "https://treasury.ddc.xyz",
    accessionNumber: "DDC-WEBSITE",
    sourceType: "company-website",
    sourceQuote: "2,183 BTC",
    burnAsOf: "2025-06-30",
    burnEstimated: true,
    avgDailyVolume: 5_000_000,
    sharesForMnav: 30_473_005,  // 28,723,005 Class A (6-K Feb 6) + 1,750,000 Class B (CEO, same economic rights)
    sharesSource: "SEC 6-K Feb 6, 2026 + treasury.ddc.xyz",
    sharesSourceQuote: "SEC 6-K Feb 6, 2026 + treasury.ddc.xyz",
    sharesSourceUrl: "/filings/ddc/0001213900-26-013341",
    sharesAsOf: "2026-02-06",
    totalDebt: 27_000_000,  // Anson Senior Secured Convertible Notes (Initial Closing Jul 2025)
    debtSource: "SEC 424B3 Jan 26, 2026 / 6-K Jul 1, 2025 — Anson SPA Initial Notes",
    debtSourceQuote: "SEC 424B3 Jan 26, 2026 / 6-K Jul 1, 2025 — Anson SPA Initial Notes",
    debtSourceUrl: "https://treasury.ddc.xyz",
    debtAsOf: "2026-01-26",
    strategy: "Plant-based food company pivoted to BTC treasury Feb 2025. Explicit MSTR-style strategy with Bitcoin yield metrics.",
    notes: "NYSE American listed. DayDayCook brand. 49.1% YTD BTC Yield (Mar 2026). Dual-class (Class B = 10 votes, CEO only, doubled 875K→1.75M in 2025 by board resolution). " +
      "Anson SPA: $27M convertible at $13.65 ($275M undrawn). ⚠️ Toxic alternate conversion RENEGOTIATED Sep 2025: now 88% of 20-day low VWAP (was 94% of 10-day). Warrant coverage doubled to 70%. " +
      "0% interest (12% on default). $200M ELOC at 98% of 3-day low VWAP. " +
      "Satoshi Strategic: $32.8M preferred (pending NYSE). $124M subscription (12.4M shares at $10, pending NYSE — deeply underwater at ~$2.60). " +
      "Put Option risk: BTC subscription investors can put at $18.50 if mcap < $500M (currently exercisable). " +
      "⚠️ GOVERNANCE: 3 auditors in 30 days (KPMG→Marcum→Enrome); Marcum fired after requesting investigation of undisclosed related party allegations. " +
      "Going concern in FY2023+FY2024 audits. Accumulated deficit $248M. Tontec $584K judgment with HK winding-up threat. " +
      "Audit note 2026-03-05: holdings/shares anchors upgraded to SEC 6-K (Mar 4, 2026 Ex99.1): 2,118 BTC as of Feb 28 and 2,183 BTC after additional purchase; D1 basic_shares tracks Class A only while mNAV lock uses Class A + Class B economic shares. " +
      "Data quality classification: LEGAL_MATCH for holdings; PARTIAL_MISMATCH on shares basis (basic-only vs economic total).",
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    currency: "USD",
    asset: "BTC",
    tier: 2,
    // VERIFIED: February 2026 update (early March 2026)
    holdings: 1_830,
    holdingsLastUpdated: "2026-02-28",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/fufu/0001213900-25-108472",
    accessionNumber: "0001213900-25-108472",
    sourceType: "sec-filing",
    sourceQuote: "1,830 BTC held",
    datStartDate: "2024-01-01",
    website: "https://bitfufu.com",
    secCik: "0001921158",
    isMiner: true,
    quarterlyBurnUsd: 0,  // FUFU is profitable — Q3 2025 net income $11.6M, EBITDA $22.1M. 2025 Net Income ~$41.8M (prelim).
    burnSource: "SEC 6-K Q3 2025 + 2025 Prelim Results: Company is cash-flow positive from mining operations.",
    burnSourceUrl: "/filings/fufu/0001213900-25-108472",
    burnAsOf: "2025-12-31",
    avgDailyVolume: 20_000_000,
    sharesForMnav: 164_516_040,  // Q3 2025 weighted avg basic shares
    sharesSource: "SEC 6-K Q3 2025 earnings: weighted avg basic shares 164,516,040 (Q3 2025)",
    sharesSourceQuote: "Weighted average shares outstanding - basic: 164,516,040 (Q3 2025)",
    sharesSourceUrl: "/filings/fufu/0001213900-25-108472",
    sharesAsOf: "2025-09-30",
    totalDebt: 141_301_000,  // Includes $101.3M payables + reduced $15M credit line (was $40M)
    debtAsOf: "2026-02-28",
    debtSourceQuote: "$101.3M payables + $15M credit line (reduced from $40M). SEC 6-K Q2 2025.",
    debtSourceUrl: "/filings/fufu/0001213900-25-084744",
    cashReserves: 40_000_000,  // Mar 2026 update: maintains ~$40M cash position
    cashSource: "Mar 2026 Corporate Update",
    cashSourceQuote: "Mar 2026 Corporate Update",
    cashSourceUrl: "/filings/fufu/0001213900-25-084744",
    cashAsOf: "2026-02-28",
    encumberedHoldings: 476,  // 476 BTC pledged for miner procurement
    encumberedSource: "SEC 6-K Q2 2025: 476 BTC pledged as collateral for mining equipment procurement",
    encumberedSourceUrl: "/filings/fufu/0001213900-25-084744",
    strategy: "HODL-forward miner with dedicated BTC management team. Cloud mining platform (641k+ users).",
    notes: "Singapore (Nasdaq FUFU). 1,830 BTC held; 476 BTC pledged for miner procurement. Credit line debt reduced to $15M. 2025 Net Income ~$41.8M. BITMAIN partner with 26.4 EH/s managed.",
  },
  // EXOD (Exodus Movement) REMOVED - not a DAT accumulator
  // They hold BTC but sell it for operations/acquisitions, no explicit accumulation strategy
  {
    id: "fld",
    name: "Fold Holdings",
    ticker: "FLD",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "BTC",
    tier: 2,
    holdings: 1_526,  // Feb 27, 2026 update: 1,526 BTC total (521 unlocked)
    holdingsLastUpdated: "2026-02-27",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://investor.foldapp.com/news-releases/news-release-details/fold-announces-retirement-663-million-convertible-debt",
    accessionNumber: "FLD-20260227",
    sourceType: "press-release",
    sourceQuote: "1,526 BTC total (521 unlocked)",
    datStartDate: "2024-07-01",
    website: "https://foldapp.com",
    secCik: "0001889123",
    isMiner: false,
    costBasisAvg: 72_571,
    costBasisSource: "SEC 10-Q Q3 2025: aggregate cost $114.3M for 1,575 BTC",
    costBasisSourceUrl: "/filings/fld/0001193125-25-274317",
    quarterlyBurnUsd: 5_000_000,
    burnSource: "SEC 10-Q Q3 2025: Operating loss $5.94M (Q3), $21.8M (9-mo). Cash burn ~$5M/qtr after non-cash adjustments",
    burnSourceUrl: "/filings/fld/0001193125-25-274317",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 5_000_000,
    sharesForMnav: 48_307_642,  // SEC XBRL Nov 10, 2025
    sharesSource: "SEC 10-Q (filed 2025-11-10): EntityCommonStockSharesOutstanding = 48,307,642 as of 2025-11-10",
    sharesSourceQuote: "SEC 10-Q (filed 2025-11-10): EntityCommonStockSharesOutstanding = 48,307,642 as of 2025-11-10",
    sharesSourceUrl: "/filings/fld/0001193125-25-274317",
    sharesAsOf: "2025-11-10",
    totalDebt: 0,  // VERIFIED: Extinguished $66.3M convertible debt on Feb 27, 2026. Dilutive instruments updated with expiration.
    preferredEquity: 0,
    preferredAsOf: "2025-09-30",
    preferredSourceUrl: "/filings/fld/0001193125-25-274317",
    preferredSourceQuote: "No preferred stock outstanding (10-Q Q3 2025 balance sheet)",
    debtAsOf: "2026-02-27",
    debtSource: "Feb 27, 2026 PR: 'Fold Announces Retirement of $66.3 Million in Convertible Debt'",
    debtSourceQuote: "Fold Announces Retirement of $66.3 Million in Convertible Debt — all outstanding convertible notes fully retired",
    debtSourceUrl: "https://investor.foldapp.com/news-releases/news-release-details/fold-announces-retirement-663-million-convertible-debt",
    strategy: "First publicly traded financial services company built entirely around Bitcoin. BTC rewards platform. Explicit treasury accumulation strategy.",
    cashReserves: 6_663_000,  // SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceQuote: "SEC 10-Q Q3 2025",
    cashSourceUrl: "/filings/fld/0001193125-25-274317",
    cashAsOf: "2025-09-30",
    notes: "Nasdaq: FLD. Russell 2000 Index (Dec 2025). Extinguished all $66.3M convertible debt Feb 27, 2026, unlocking 521 BTC previously held as collateral. 1,526 BTC now substantially unencumbered. Transitioning to 'free' model; launching Visa Bitcoin rewards card. FY2025 10-K due Mar 17, 2026.",
  },
  {
    id: "3825t",
    name: "Remixpoint",
    ticker: "3825.T",
    country: "JP",
    jurisdiction: "JP",
    authoritativeSource: "TDnet",
    exchangeMic: "XTKS",
    currency: "JPY",
    asset: "BTC",  // Dominant asset
    tier: 2,
    holdings: 1411.3,  // Company website Feb 2026: 1,411.30 BTC
    holdingsLastUpdated: "2026-02-02",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.remixpoint.co.jp/digital-asset/",
    accessionNumber: "REM-WEB-20260202",
    sourceType: "company-website",
    sourceQuote: "1,411.30 BTC held as of Feb 2, 2026",
    secondaryCryptoHoldings: [
      { asset: "ETH", amount: 901 },
      { asset: "XRP", amount: 1_200_000 },
      { asset: "SOL", amount: 13_920 },
      { asset: "DOGE", amount: 2_800_000 },
    ],
    datStartDate: "2024-09-26",  // First BTC purchase
    website: "https://www.remixpoint.co.jp",
    twitter: "https://x.com/remixpoint_x",
    isMiner: false,
    quarterlyBurnUsd: 2_000_000,
    burnSource: "TDnet quarterly earnings (estimate)",
    burnSourceUrl: "https://www.remixpoint.co.jp/ir/",
    burnAsOf: "2025-09-30",
    burnEstimated: true,
    avgDailyVolume: 5_000_000,
    sharesForMnav: 149_039_800,  // Yahoo Japan Finance
    sharesSource: "Yahoo Japan Finance",
    sharesSourceQuote: "149,039,800 shares outstanding (Yahoo Japan Finance)",
    sharesSourceUrl: "https://finance.yahoo.co.jp/quote/3825.T",
    sharesAsOf: "2026-02-28",
    strategy: "Diversified digital asset treasury. Transitioned from energy/automotive to crypto-centric treasury management.",
    notes: "TSE Standard Market. Japan's #4 BTC holder (World #43). Also holds 901 ETH, 1.2M XRP, 13,920 SOL, 2.8M DOGE. Originally auto/energy business, pivoting to DAT.",
  },
  {
    id: "3189t",
    name: "ANAP Holdings",
    ticker: "3189.T",
    country: "JP",
    jurisdiction: "JP",
    authoritativeSource: "TDnet",
    exchangeMic: "XTKS",
    currency: "JPY",
    asset: "BTC",
    tier: 2,
    // HOLDINGS: 1,417.0341 BTC (Jan 21, 2026) — 32nd purchase, +70.4485 BTC
    holdings: 1417.03,
    holdingsLastUpdated: "2026-01-21",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www.release.tdnet.info/inbs/140120260121536720.pdf",
    accessionNumber: "TDNET-140120260121536720",
    sourceType: "regulatory-filing",
    sourceQuote: "1,417.0341 BTC held as of Jan 21, 2026",
    datStartDate: "2025-04-16",
    website: "https://anap.co.jp",
    isMiner: false,
    quarterlyBurnUsd: 3_800_000,  // ¥592M operating loss Q1 FY2026 ≈ $3.8M
    burnSource: "TDnet Q1 FY2026: ¥592M operating loss (3 months ended Nov 30, 2025)",
    burnSourceUrl: "https://www.release.tdnet.info/inbs/140120260114544893.pdf",
    burnAsOf: "2025-11-30",
    burnEstimated: false,
    avgDailyVolume: 5_000_000,
    sharesForMnav: 40_612_400,
    sharesSource: "TDnet Feb 3, 2026: 8th Series Warrant Exercise Update",
    sharesSourceQuote: "TDnet Feb 3, 2026: 8th Series Warrant Exercise Update",
    sharesSourceUrl: "https://www.release.tdnet.info/inbs/140120260203558291.pdf",
    sharesAsOf: "2026-01-31",
    totalDebt: 46_300_000,  // ¥7,100M / 153.5 JPY/USD — Q1 FY2026 有利子負債 (interest-bearing debt)
    debtSource: "Kabutan Q1 FY2026 決算短信 (as of Nov 30, 2025)",
    debtSourceQuote: "Kabutan Q1 FY2026 決算短信 (as of Nov 30, 2025)",
    debtSourceUrl: "https://kabutan.jp/stock/finance?code=3189",
    debtAsOf: "2025-11-30",
    cashReserves: 7_500_000,  // ¥1,159M / 153.5 JPY/USD — Q1 FY2026 現預金
    cashSource: "Kabutan Q1 FY2026 決算短信 (as of Nov 30, 2025)",
    cashSourceQuote: "Kabutan Q1 FY2026 決算短信 (as of Nov 30, 2025)",
    cashSourceUrl: "https://kabutan.jp/stock/finance?code=3189",
    cashAsOf: "2025-11-30",
    strategy: "Integrated Bitcoin strategy combining treasury accumulation with RWA tokenization.",
    notes: "Japanese apparel company. 1,181 BTC held as of Jan 2026. Q1 FY2026 results flagged 'Going Concern' doubt due to persistent losses. Aggressively exercising MSSO warrants to fund BTC and debt repayment. Commenced RWA tokenization trial with Blockstream Feb 2026.",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Going Concern: Q1 FY2026 auditor report flagged substantial doubt about ability to continue as going concern",
        severity: "warning",
      },
    ],
  },
  {
    id: "zooz",
    name: "ZOOZ Strategy Ltd.",  // Renamed from ZOOZ Power Oct 2025
    ticker: "ZOOZ",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    twitter: "zoozbitcoin",
    asset: "BTC",
    tier: 2,
    holdings: 1_046,  // 6-K Jan 20, 2026: "completed the purchase of a total of 1,046 Bitcoin" as of Dec 31, 2025
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/zooz/0001493152-26-002767",
    accessionNumber: "0001493152-26-002767",
    sourceType: "sec-filing",
    sourceQuote: "completed the purchase of a total of 1,046 Bitcoin at an average purchase price of $112,745 per Bitcoin",
    datStartDate: "2025-07-29",  // First ATM agreement date
    website: "https://zoozpower.com",
    secCik: "0001992818",
    costBasisAvg: 116_520,  // 6-K: total consideration $121.9M / 1,046 BTC = $116,520 (includes fees). 6-K also states "$112,745 avg purchase price" — ~$4M gap likely commissions.
    costBasisSource: "SEC 6-K Jan 20, 2026: $121.9M total consideration for 1,046 BTC",
    costBasisSourceUrl: "/filings/zooz/0001493152-26-002767",
    isMiner: false,
    quarterlyBurnUsd: 3_000_000,  // 20-F FY2024 total opex ~$12M/yr = $3M/qtr (G&A + R&D + COGS). Pre-pivot, may change.
    burnSource: "SEC 20-F FY2024: total operating expenses ~$12M/year",
    burnSourceUrl: "/filings/zooz/0001493152-25-009478",
    burnAsOf: "2024-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,
    totalDebt: 0,
    debtSource: "SEC 6-K Jan 20, 2026: promissory notes fully repaid, no outstanding debt",
    debtSourceQuote: "SEC 6-K Jan 20, 2026: promissory notes fully repaid, no outstanding debt",
    debtSourceUrl: "/filings/zooz/0001493152-26-002767",
    debtAsOf: "2025-12-31",
    cashReserves: 27_100_000,  // 6-K Jan 20, 2026: $27.1M as of Dec 31, 2025
    cashSource: "SEC 6-K Jan 20, 2026: cash and cash equivalents ~$27.1M",
    cashSourceQuote: "SEC 6-K Jan 20, 2026: cash and cash equivalents ~$27.1M",
    cashSourceUrl: "/filings/zooz/0001493152-26-002767",
    cashAsOf: "2025-12-31",
    sharesForMnav: 163_000_000,  // 424B5 Sep 30, 2025: 161,899,782 + ATM ~1.14M shares sold through Dec 31 ≈ 163M
    sharesSource: "SEC 424B5 Sep 30, 2025: 161,899,782 outstanding + 6-K: ~1.14M ATM shares sold",
    sharesSourceQuote: "SEC 424B5 Sep 30, 2025: 161,899,782 outstanding + 6-K: ~1.14M ATM shares sold",
    sharesSourceUrl: "/filings/zooz/0001493152-25-016384",
    sharesAsOf: "2025-12-31",
    leader: "Jordan Fried (CEO)",
    strategy: "First Nasdaq + TASE dual-listed BTC treasury company. Pivoted from EV charging (flywheel tech) Jul 2025. $1B ATM registered.",
    notes: "Israeli company (Lod). ✅ NO LEVERAGE: BTC funded via $180M private placement (Jul+Sep 2025). $1B ATM registered Sep 2025, barely used (~$4M). Cost basis $112,745/BTC avg. Renamed from 'ZOOZ Power' to 'ZOOZ Strategy Ltd.' Oct 2025. Nasdaq non-compliance notice Dec 2025 (bid <$1.00, cure deadline Jun 15, 2026). Newtyn Management 8.6% stake (13G Feb 2026). 20-F FY2025 expected Mar 2026.",
  },
  // USBC removed 2026-02-02: SEC 10-K states "does not currently intend to make future BTC purchases"
  // They hold ~1,003 BTC but it was a one-time equity contribution, not an ongoing treasury strategy
  {
    id: "btct",
    name: "Bitcoin Treasury Corp",
    ticker: "BTCT.V",
    country: "CA",
    jurisdiction: "CA",
    authoritativeSource: "SEDAR+",
    exchangeMic: "XTSE",
    currency: "CAD",
    sedarProfile: "000044786",
    asset: "BTC",
    tier: 2,
    holdings: 769.05,  // btctcorp.com homepage: 769.05 BTC (Feb 17, 2026)
    holdingsLastUpdated: "2026-02-17",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://btctcorp.com",
    accessionNumber: "BTCT-WEB-20260217",
    sourceType: "company-website",
    sourceQuote: "Current Bitcoin holdings: 769.05 BTC",
    datStartDate: "2025-06-30",  // TSX Venture listing date
    isMiner: false,
    totalDebt: 18_120_000, // USD (~CAD $25M / 1.38) - convertible debentures (CAD $25M face, CAD $12 implied conversion)
    debtAsOf: "2025-12-31",
    debtSource: "TSX Venture Bulletin V2025-1838",
    debtSourceQuote: "TSX Venture Bulletin V2025-1838",
    debtSourceUrl: "https://btctcorp.com/bitcoin-treasury-corporation-announces-closing-of-amalgamation-and-concurrent-financing/",
    quarterlyBurnUsd: 500_000,
    burnSource: "SEDAR+ filings (estimate)",
    burnSourceUrl: "https://www.sedarplus.ca/csa-party/records/recordsForIssuerProfile.html?profileNo=000053693",
    burnAsOf: "2025-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,
    website: "https://btctcorp.com",
    sharesForMnav: 10_027_880,  // BASIC shares per btctcorp.com — dilutives in dilutive-instruments.ts
    sharesSource: "Company Website (Investor Relations)",
    sharesSourceQuote: "Basic shares outstanding: 10,027,880 (btctcorp.com investor relations)",
    sharesSourceUrl: "https://btctcorp.com",
    sharesAsOf: "2026-02-17",
    strategy: "Grow Bitcoin per Share (BPS) through strategic corporate finance and institutional Bitcoin lending, liquidity and collateral services.",
    notes: "TSX Venture (Canada). SEDAR+ #000053693. Evolve Funds Group administrative services (entire C-suite = Evolve execs). Basic shares: 9,893,980. Reported diluted: 11,977,313 (converts only). ⚠️ TRUE diluted may be higher if performance warrants are included. $25M CAD convertible debentures (1% interest, Jun 2030 maturity, $12 conversion). Zero revenue — pure BTC proxy. Shell RTO via 2680083 Alberta Ltd. Data quality: latest lock anchor is company-reported via legal press release channel (not yet reconciled to parsed SEDAR filing text in-repo). Data quality classification: COMPANY_REPORTED_LEGAL_CHANNEL; lock and D1 latest now converge at Feb 28, 2026.",
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
    country: "DE",
    jurisdiction: "EU",
    authoritativeSource: "EU Regulatory",
    exchangeMic: "XETR",
    currency: "EUR",
    asset: "BTC",
    tier: 2,
    // HOLDINGS: Verified via corporate update Mar 2026
    // Previous EST of 2,051 BTC was a derivation error (included non-BTC fund assets in intangibles)
    holdings: 525,
    holdingsLastUpdated: "2026-03-01",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.samara-ag.com/news",
    accessionNumber: "SRAG-20260301",
    sourceType: "press-release",
    sourceQuote: "Corrected holdings to 525 BTC (Mar 2026)",
    datStartDate: "2024-01-01",
    website: "https://www.samara-ag.com",
    twitter: "https://x.com/Patrick_Lowry_",
    isMiner: false,
    quarterlyBurnUsd: 2_700_000,  // €2.3M/qtr (€6M admin + €3.2M interest ÷ 4) × 1.185 EUR/USD
    burnSource: "FY2024 audited P&L: €6M admin + €3.2M finance costs (estimate per quarter)",
    burnSourceUrl: "https://www.samara-ag.com/investor-relations",
    burnAsOf: "2024-12-31",
    burnEstimated: true,
    avgDailyVolume: 1_000_000,
    // SHARES: 92,190,761 issued - 406,021 treasury (buyback program through Feb 27, 2026)
    sharesForMnav: 91_784_740,
    sharesSource: "EQS Buyback Update Mar 2, 2026: 406,021 shares repurchased total",
    sharesSourceQuote: "EQS Buyback Update Mar 2, 2026: 406,021 shares repurchased total",
    sharesSourceUrl: "https://www.samara-ag.com/news",
    sharesAsOf: "2026-02-27",
    // DEBT: €33M total as of H1 2025 → ~$39.1M USD
    totalDebt: 39_100_000,  // €33M × 1.185 EUR/USD (H1 2025 balance sheet)
    debtSource: "H1 2025 Interim: €17.7M Nordic bond (ISIN NO0013364398) + €15.3M interest-bearing loans = €33M",
    debtSourceQuote: "H1 2025 Interim: €17.7M Nordic bond (ISIN NO0013364398) + €15.3M interest-bearing loans = €33M",
    debtSourceUrl: "https://www.samara-ag.com/news",
    debtAsOf: "2025-06-30",
    strategy: "BTC as primary treasury reserve. Uses Samara Alpha Market-Neutral BTC+ Fund for management.",
    notes: "Frankfurt/XETRA listed. Corrected holdings to 525 BTC (Mar 2026). Previous 2k+ estimate included non-BTC fund assets incorrectly labeled as intangibles. Active share buyback (406k shares). Issued Europe's first Bitcoin Bond (€20M, late 2024).",
  },
  // PHX.AD (Phoenix Group PLC) removed 2026-02-03: Can't verify holdings
  // 514 BTC from BitcoinTreasuries.net only - no primary source
  // UAE company (ADX) - no IR website found, no SEC filings
  // Company is real (crypto miner) but holdings unverifiable
  {
    id: "dcc",
    name: "DigitalX",
    ticker: "DCC.AX",
    asxCode: "DCC",
    country: "AU",
    jurisdiction: "AU",
    authoritativeSource: "ASX",
    exchangeMic: "XASX",
    asxAnnouncementsUrl: "https://www.asx.com.au/markets/company/DCC",
    currency: "AUD",
    asset: "BTC",
    tier: 1,  // ASX-verified + real-time dashboard
    holdings: 503.7,  // ASX Dec 2025 Treasury Information: 308.8 direct + 194.85 via BTXX ETF
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "regulatory-filing",  // ASX Treasury Information filing
    holdingsSourceUrl: "https://www.listcorp.com/asx/dcc/digitalx-limited/news/treasury-information-december-2025-3305468.html",
    accessionNumber: "ASX-3305468",
    sourceType: "regulatory-filing",
    sourceQuote: "503.7 (308.8 direct + 194.9 BTXX ETF)",
    datStartDate: "2025-07-01",  // New BTC treasury strategy started Jul 2025
    website: "https://www.digitalx.com",
    // twitter: removed — @DigitalXLtd does not exist, no active X account found
    // costBasisAvg removed - dashboard source needs verification
    isMiner: false,
    quarterlyBurnUsd: 440_000,  // A$705K operating outflow Q2 FY2026 ≈ US$440K at 0.63 AUD/USD
    burnSource: "ASX Appendix 4C Q2 FY2026 (net operating cash outflow A$705K)",
    burnSourceUrl: "https://www.listcorp.com/asx/dcc/digitalx-limited/news/quarterly-activities-appendix-4c-cash-flow-report-3308597.html",
    burnAsOf: "2025-12-31",
    burnEstimated: false,
    cashReserves: 1_782_000,  // A$2,829,509 × 0.63 AUD/USD ≈ US$1.78M
    cashSource: "ASX Appendix 4C Q2 FY2026: Cash at bank A$2,829,509",
    cashSourceQuote: "ASX Appendix 4C Q2 FY2026: Cash at bank A$2,829,509",
    cashSourceUrl: "https://www.listcorp.com/asx/dcc/digitalx-limited/news/quarterly-activities-appendix-4c-cash-flow-report-3308597.html",
    cashAsOf: "2025-12-31",
    avgDailyVolume: 500_000,
    sharesForMnav: 1_488_510_854,  // 1.49B from ASX (ISIN: AU000000DCC9)
    sharesSource: "asx.com.au",
    sharesSourceQuote: "1,488,510,854 ordinary shares (ASX company profile, ISIN AU000000DCC9)",
    sharesSourceUrl: "https://www.asx.com.au/markets/company/DCC",
    sharesAsOf: "2026-01-30",
    strategy: "Australia's first and largest ASX-listed Bitcoin treasury company. Goal: 2,100 BTC by 2027. Focused on increasing BTC per share via strategic capital raises and market-neutral trading strategies.",
    notes: "503.7 BTC: 308.8 direct + 194.85 via BTXX ETF. Real-time dashboard: treasury.digitalx.com. Jul 2025: Raised A$20.7M from UTXO Group, ParaFi Capital, and Animoca Brands. Uses trading strategies and third-party fund managers to generate cash flow for operations.",
    description: "DigitalX (ASX:DCC) is a pioneering digital asset company founded in 2014, making it one of the first blockchain companies to list on a major stock exchange globally. In July 2025, the company pivoted to a Bitcoin treasury strategy, raising A$20.7M from institutional investors including UTXO Group, ParaFi Capital, and Animoca Brands. The company holds BTC both directly and through its BTXX Bitcoin ETF. DigitalX leverages its deep expertise in digital asset trading to grow Bitcoin holdings per share while generating operational cash flow through market-neutral strategies.",
    founded: 2014,
    headquarters: "Perth, Australia",
    ceo: "William Hamilton",  // GM appointed Sep 26, 2025. Lisa Wade (CEO) left Sep 3, 2024; interim CEO Demetrios Christou resigned Sep 26, 2025
  },
  // Removed: NDA.V (416 BTC), DMGI.V (403 BTC), LMFA (356 BTC) - below 500 BTC threshold
  {
    // =========================================================================
    // NAKA - Core financials from provenance/naka.ts (SEC-verified XBRL)
    // =========================================================================
    id: "naka",
    name: "Nakamoto Inc.",  // Rebranded from KindlyMD/Nakamoto Holdings Jan 21, 2026
    ticker: "NAKA",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0001946573",
    asset: "BTC",
    tier: 1,
    // HOLDINGS: from provenance (XBRL CryptoAssetNumberOfUnits, BTCMember)
    holdings: NAKA_PROVENANCE.holdings?.value || 5_398,
    holdingsLastUpdated: NAKA_PROVENANCE_DEBUG.holdingsDate,
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/naka/0001493152-25-024314",
    accessionNumber: "0001493152-25-024314",
    sourceType: "sec-filing",
    sourceQuote: "held 5,765 BTC (gross) / 5,398 BTC (net) as of late 2025",
    datStartDate: "2025-05-12",
    costBasisAvg: 118_205,
    costBasisSource: "SEC 8-K Nov 19, 2025: 5,765 BTC purchased at weighted avg $118,204.88",
    costBasisSourceUrl: "/filings/naka/0001493152-25-024314",
    isMiner: false,
    // BURN: from provenance (Q3 2025 G&A + OpCF estimate)
    quarterlyBurnUsd: NAKA_PROVENANCE.quarterlyBurn?.value ?? 8_000_000,
    burnEstimated: true,  // $8M is forward estimate; Q3 G&A was $4.98M, 9mo avg OpCF ~$5.3M/qtr
    burnSource: "SEC 10-Q Q3 2025 XBRL: G&A $4.98M + conservative ramp estimate",
    burnSourceUrl: "/filings/naka/0001493152-25-024260",
    burnAsOf: "2025-09-30",
    // CAPITAL RAISE
    capitalRaisedPipe: 710_000_000,  // $540M PIPE + $200M Yorkville converts (net ~$710M)
    avgDailyVolume: 50_000_000,
    hasOptions: true,
    // SHARES: from provenance (Post-acquisition basic common shares)
    sharesForMnav: 688_942_624,
    sharesSource: "SEC 13D Feb 26, 2026: 688,942,624 basic common shares outstanding post-acquisition",
    sharesSourceQuote: "SEC 13D Feb 26, 2026: 688,942,624 basic common shares outstanding post-acquisition",
    sharesSourceUrl: "/filings/naka/0001493152-26-008387",
    sharesAsOf: "2026-02-26",
    // DEBT: from provenance (Kraken $210M BTC-backed loan Dec 2025)
    totalDebt: NAKA_PROVENANCE.totalDebt?.value || 210_000_000,
    debtSource: "SEC 8-K Dec 9, 2025: Kraken $210M USDT loan, 8% annual, BTC-collateralized, due Dec 4, 2026",
    debtSourceQuote: "SEC 8-K Dec 9, 2025: Kraken $210M USDT loan, 8% annual, BTC-collateralized, due Dec 4, 2026",
    debtSourceUrl: "/filings/naka/0001493152-25-026862",
    debtAsOf: "2025-12-09",
    // ENCUMBRANCE: Kraken loan is BTC-collateralized — pledged BTC is not freely available
    encumberedHoldings: 2_100,  // ~$210M / ~$100K per BTC at loan origination (estimated collateral)
    encumberedSource: "SEC 8-K Dec 9, 2025: Kraken $210M loan secured by BTC treasury",
    encumberedSourceUrl: "/filings/naka/0001493152-25-026862",
    // Enterprise Shield (NAKA Conglomerate Pivot)
    annualOperatingCashFlowUsd: 34_200_000,
    opexCoverageRatio: 1.07, // $34.2M EBITDA / $32M Annual Burn (est)
    cashFlowSource: "Pro-forma 2026 EBITDA (Combined BTC Inc + UTXO Management)",
    cashFlowSourceUrl: "/filings/naka/0001493152-26-008387",
    // CASH: from provenance (XBRL CashAndCashEquivalentsAtCarryingValue)
    cashReserves: NAKA_PROVENANCE.cashReserves?.value || 24_185_083,
    cashSource: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceQuote: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceUrl: "/filings/naka/0001493152-25-024260",
    cashAsOf: "2025-09-30",
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0001849635",
    asset: "BTC",
    tier: 1,
    // HOLDINGS: from provenance (FY2025 10-K filed Feb 2026)
    holdings: DJT_PROVENANCE.holdings?.value ?? 11_542,
    holdingsLastUpdated: "2026-02-25",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/djt/0001140361-26-007174",
    accessionNumber: "0001140361-26-007174",
    sourceType: "sec-filing",
    sourceQuote: "As of February 25, 2026, we held approximately 9,542.16 bitcoins that were acquired at an aggregate purchase price of $1,131,024.3",
    holdingsDerived: true,
    holdingsCalculation: "9,542.16 (Dec 31, 2025 10-K) + ~2,000 purchased Jan-Feb 2026 = 11,542 (provenance estimate)",
    datStartDate: "2025-05-01",
    isMiner: false,
    // BURN: from provenance (FY2025 OpCF: +$14.8M — cash-flow positive, no burn)
    quarterlyBurnUsd: DJT_PROVENANCE.quarterlyBurn?.value ?? 0,
    burnSource: "SEC 10-K FY2025: Net cash provided by operating activities $14.8 million — operations cash-flow positive",
    burnSourceUrl: "/filings/djt/0001140361-26-007174",
    burnAsOf: "2025-12-31",
    // CAPITAL: $2.5B private placement ($1.5B equity + $1B converts)
    capitalRaisedPipe: 2_500_000_000,
    avgDailyVolume: 200_000_000,
    hasOptions: true,
    // SHARES: from provenance (XBRL verified)
    sharesForMnav: DJT_PROVENANCE.sharesOutstanding?.value ?? 279_997_636,
    sharesSource: "SEC 10-K FY2025: EntityCommonStockSharesOutstanding = 279,997,636 as of Feb 2026",
    sharesSourceQuote: "SEC 10-K FY2025: EntityCommonStockSharesOutstanding = 279,997,636 as of Feb 2026",
    sharesSourceUrl: "/filings/djt/0001140361-26-007174",
    sharesAsOf: "2025-12-31",
    // DEBT: from provenance (XBRL LongTermDebt - carrying value of $1B par converts)
    totalDebt: DJT_PROVENANCE.totalDebt?.value ?? 950_769_100,
    preferredEquity: 0,
    preferredAsOf: "2025-12-31",
    preferredSourceUrl: "/filings/djt/0001140361-26-007174",
    preferredSourceQuote: "No preferred stock outstanding (10-K FY2025 balance sheet: preferred stock $0.0001 par, none issued)",
    debtSource: "SEC 10-K FY2025 XBRL: LongTermDebt $950_769_100 (carrying value of $1B zero-coupon converts due 2028)",
    debtSourceQuote: "SEC 10-K FY2025 XBRL: LongTermDebt $950_769_100 (carrying value of $1B zero-coupon converts due 2028)",
    debtSourceUrl: "/filings/djt/0001140361-26-007174",
    debtAsOf: "2025-12-31",
    // CASH: from provenance (XBRL - unrestricted only)
    cashReserves: DJT_PROVENANCE.cashReserves?.value ?? 166_072_700,
    cashAsOf: "2025-12-31",
    cashSource: "SEC 10-K FY2025 XBRL: CashAndCashEquivalentsAtCarryingValue $166,072,700 (excl $336M restricted)",
    cashSourceQuote: "SEC 10-K FY2025 XBRL: CashAndCashEquivalentsAtCarryingValue $166,072,700 (excl $336M restricted)",
    cashSourceUrl: "/filings/djt/0001140361-26-007174",
    leader: "Devin Nunes (CEO)",
    strategy: "High-leverage BTC treasury strategy + fintech pivot. Uses covered-put yield generation.",
    notes: "Confirmed 11,542 BTC at Dec 31, 2025. Also holds 756.1M CRO tokens ($114M cost) and earned $44M in cash premiums from BTC covered-put strategy in 2025. Spinoff of Truth Social planned.",
  },
  {
    id: "boyaa",
    name: "Boyaa Interactive",
    ticker: "0434.HK",
    hkexCode: "0434",
    country: "HK",
    jurisdiction: "HK",
    authoritativeSource: "HKEX",
    exchangeMic: "XHKG",
    hkexNewsUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    currency: "HKD",
    asset: "BTC",
    tier: 1,
    holdings: 4_091,  // Verified via HKEX Profit Warning Mar 3, 2026
    holdingsLastUpdated: "2026-03-03",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    accessionNumber: "HKEX-20251117",
    sourceType: "regulatory-filing",
    sourceQuote: "completed the purchase of approximately 4,091 units of Bitcoin",
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
    sharesSourceQuote: "HKEX Monthly Return Jan 2026 (filed Feb 3, 2026): excl. 3,172,000 treasury shares",
    sharesSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0203/2026020302066.pdf",
    sharesAsOf: "2026-01-31",
    // DEBT: None — no bank borrowings, no convertibles
    totalDebt: 0,
    debtSource: "HKEX Q3 2025: 'no short-term or long-term bank borrowings, no outstanding banking facilities'",
    debtSourceQuote: "no short-term or long-term bank borrowings, no outstanding banking facilities",
    debtSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    debtAsOf: "2025-09-30",
    // CASH: HK$82.7M (~$10.6M) + HK$78.7M term deposits
    cashReserves: 10_600_000,  // HK$82.7M ÷ 7.8 ≈ $10.6M (bank + cash balances only)
    cashSource: "HKEX Q3 2025: HK$82.7M cash + HK$78.7M term deposits (non-current)",
    cashSourceQuote: "HKEX Q3 2025: HK$82.7M cash + HK$78.7M term deposits (non-current)",
    cashSourceUrl: "https://www1.hkexnews.hk/listedco/listconews/sehk/2025/1117/2025111700291.pdf",
    cashAsOf: "2025-09-30",
    leader: "Dai Zhikang (Chairman & Executive Director)",
    strategy: "Hong Kong's largest BTC treasury. 15.1% BTC Yield (9mo 2025). Active buyback program.",
    notes: "Asia's MicroStrategy. Profit warning (Mar 2026) flags HK$230M-240M FY2025 net loss due to BTC price volatility. Core gaming business remains cash-flow positive but declining. Dec 2025: 2.4M shares bought back. Treasury shares not cancelled.",
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0001755953",
    asset: "BTC",
    tier: 1,
    // HOLDINGS: March 4, 2026 Eric Trump announcement
    holdings: 6_500,
    holdingsLastUpdated: "2026-03-04",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://bitcoinmagazine.com/business/eric-trump-american-bitcoin-reserves-surpass-6500-btc",
    accessionNumber: "0001193125-25-281390",
    sourceType: "press-release",
    sourceQuote: "American Bitcoin's reserves have surpassed 6,500 BTC",
    datStartDate: "2025-09-03",
    isMiner: true,
    quarterlyBurnUsd: 8_052_000, 
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "/filings/abtc/0001193125-25-281390",
    burnAsOf: "2025-09-30",
    avgDailyVolume: 30_000_000,
    hasOptions: true,
    sharesForMnav: 927_604_994,
    sharesSource: "SEC 10-Q Q3 2025 cover page (Class A + Class B)",
    sharesSourceQuote: "SEC 10-Q Q3 2025 cover page (Class A + Class B)",
    sharesSourceUrl: "/filings/abtc/0001193125-25-281390",
    sharesAsOf: "2025-11-13",
    totalDebt: 286_200_000,
    debtSource: "SEC 10-Q Q3 2025: Bitmain miner purchase agreement",
    debtSourceQuote: "SEC 10-Q Q3 2025: Bitmain miner purchase agreement",
    debtSourceUrl: "/filings/abtc/0001193125-25-281390",
    debtAsOf: "2025-09-30",
    strategy: "Pure-play Bitcoin miner & accumulator. High-growth HODL strategy with Satoshis Per Share focus.",
    notes: "Reserves surpassed 6,500 BTC as of Mar 4, 2026. Generated $185.2M revenue in FY2025. Majority owned by Hut 8 (~80%). Purchased 11,298 additional ASICs in Mar 2026 targeting 28.1 EH/s. Eric Trump serves as CSO.",
    website: "https://abtc.com",
    twitter: "https://x.com/ABTC",
    cashReserves: 7_976_000,
    cashSource: "SEC 10-Q Q3 2025 XBRL: Cash",
    cashSourceQuote: "SEC 10-Q Q3 2025 XBRL: Cash",
    cashSourceUrl: "/filings/abtc/0001193125-25-281390",
    cashAsOf: "2025-09-30",
    },  // CORZ (Core Scientific) removed - pivoted to AI/HPC infrastructure, not a DAT company
  // BTDR (Bitdeer) removed - primarily a miner/ASIC manufacturer, not a DAT company
];

// SOL DAT Companies
export const solCompanies: Company[] = [
  {
    id: "fwdi",
    name: "Forward Industries",
    ticker: "FWDI",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
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
    stakingSourceUrl: "/filings/fwdi/0001683168-25-009068",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.085,  // ~8.5% gross APY derived from 10-Q Q1 FY2026 segment data: $17.4M staking revenue × 4 / $820.8M staked assets = 8.47%
    quarterlyBurnUsd: 3_252_629,  // Q1 FY2026 G&A (up from ~$1.8M - treasury ops costs)
    burnSource: "SEC 10-Q Q1 FY2026 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: `/filings/fwdi/0001683168-26-000960`,
    accessionNumber: "0001683168-26-000960",  // Note: this accession is for burn rate (10-Q), not holdings source
    sourceType: "company-website",
    sourceQuote: "SOL Holdings 6,979,967.46",
    burnAsOf: "2025-12-31",
    capitalRaisedPipe: 1_650_000_000,
    // Shares: 83,139,037 common (Jan 31) + 12,864,602 pre-funded warrants @ $0.00001 = 96,003,639
    // PFWs included in basic EPS per 10-Q. Shares declining via $1B buyback program.
    sharesForMnav: 96_003_639,
    sharesSource: "SEC 10-Q Q1 FY2026: 83,139,037 common + 12,864,602 PFWs",
    sharesSourceQuote: "SEC 10-Q Q1 FY2026: 83,139,037 common + 12,864,602 PFWs",
    sharesSourceUrl: `/filings/fwdi/0001683168-26-000960`,
    sharesAsOf: "2026-01-31",
    avgDailyVolume: 400_000_000,
    hasOptions: true,
    cashReserves: 12_000_000,  // ~$12M at Jan 31 per 10-Q MD&A (declining due to buybacks)
    restrictedCash: 0,
    cashSource: "SEC 10-Q Q1 FY2026 MD&A: 'approximately $12 million in cash'",
    cashSourceQuote: "approximately $12 million in cash (10-Q Q1 FY2026 MD&A)",
    cashSourceUrl: `/filings/fwdi/0001683168-26-000960`,
    cashAsOf: "2026-01-31",
    leader: "Galaxy, Jump Crypto, Multicoin backed",
    strategy: "World's largest SOL treasury, validator infrastructure, DeFi yield",
    totalDebt: 0,
    preferredEquity: 0,  // Series A-1 Convertible Preferred fully converted to common (Sep 2025 PIPE)
    preferredAsOf: "2025-12-31",
    preferredSourceUrl: "/filings/fwdi/0001683168-26-000960",
    preferredSourceQuote: "Series A-1 Convertible Preferred fully converted to common stock (Sep 2025 PIPE). No preferred outstanding per 10-Q Q1 FY2026.",
    debtSource: "SEC 10-Q Q1 FY2026: zero long-term debt, total liabilities $12,084,535 all current",
    debtSourceQuote: "SEC 10-Q Q1 FY2026: zero long-term debt, total liabilities $12,084,535 all current",
    debtSourceUrl: `/filings/fwdi/0001683168-26-000960`,
    debtAsOf: "2025-12-31",
    notes: "Raised $1.65B PIPE Sep 2025. Debt free. 12.9M pre-funded warrants @ $0.00001. $1B buyback program active. First equity tokenized on Solana via Superstate. Galaxy/Jump/Multicoin backed. Holdings = SOL-equivalent (raw SOL + fwdSOL liquid staking tokens). Audit note 2026-03-05: legal checkpoint confirmed from SEC 10-Q (2025-12-31) at 4,973,000 raw SOL; latest lock remains 6,979,967 SOL-equivalent from company treasury page (2026-01-15), so latest holdings classification stays COMPANY_ONLY. Shares remain PARTIAL_MISMATCH by design (lock includes pre-funded warrants; D1 basic_shares is common-only).",
  },
  {
    id: "hsdt",
    name: "Solana Company (fka Helius Medical)",
    ticker: "HSDT",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0001610853",
    asset: "SOL",
    tier: 1,
    website: "https://solanacompany.co",
    twitter: "https://x.com/SolanaCompany1",
    holdings: 2_340_757,  // 10-Q Note 10 (Subsequent Events): 2,340,757 SOL as of Nov 18, 2025
    holdingsLastUpdated: "2025-11-18",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/hsdt/0001104659-25-113714",
    accessionNumber: "0001104659-25-113714",
    sourceType: "sec-filing",
    sourceQuote: "held directly or had rights to 2,340,757 SOL",
    datStartDate: "2025-05-01",
    stakingPct: 0.9996,  // 10-Q: 1,738,682 staked / 1,739,355 total = 99.96%
    stakingMethod: "Native staking via third-party validators (Anchorage Digital custody)",
    stakingSource: "SEC 10-Q Q3 2025 Note 3: 1,738,682/1,739,355 SOL staked (99.96%). $342K staking rewards (partial quarter, commenced Sep 2025). 7.03% APY.",
    stakingSourceUrl: "/filings/hsdt/0001104659-25-113714",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-15",
    stakingApy: 0.0703,  // 7.03% APY as of Oct 2025
    quarterlyBurnUsd: 5_504_000,  // SGA $4,646K + R&D $858K = $5,504K total opex Q3 2025
    burnSource: "SEC 10-Q Q3 2025 XBRL: SGA ($4,646K) + R&D ($858K) = $5,504K total opex (Jul-Sep 2025, single quarter). R&D declining as medical device ops wind down.",
    burnSourceUrl: "/filings/hsdt/0001104659-25-113714",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 76_732_785,  // 52,802,604 basic + 23,930,181 PFWs @ $0.001 = 76,732,785 (Feb 20, 2026 8-K)
    sharesSource: "8-K Feb 20, 2026: 52,802,604 Class A common + 23,930,181 PFWs = 76,732,785. Prior (Sep 30): 40.3M basic + 35.6M PFWs = 75.9M. PFW exercises converted ~11.7M to common; net +806K from ATM.",
    sharesSourceQuote: "8-K Feb 20, 2026: 52,802,604 Class A common + 23,930,181 PFWs = 76,732,785. Prior (Sep 30): 40.3M basic + 35.6M PFWs = 75.9M. PFW exercises converted ~11.7M to common; net +806K from ATM.",
    sharesSourceUrl: "/filings/hsdt/0001104659-26-018212",
    sharesAsOf: "2026-02-20",
    totalDebt: 0,
    debtSource: "No LongTermDebt XBRL tag (404). Zero long-term debt. Master Loan Agreement has $0 outstanding.",
    debtSourceQuote: "No LongTermDebt XBRL tag (404). Zero long-term debt. Master Loan Agreement has $0 outstanding.",
    debtSourceUrl: "/filings/hsdt/0001104659-25-113714",
    debtAsOf: "2025-09-30",
    cashReserves: 15_000_000,  // Oct 29 8-K: ">$15M of cash and stablecoins". XBRL Sep 30 was $124M but ~$109M deployed into SOL post-Q3.
    cashSource: "8-K Oct 29: '>$15M of cash and stablecoins'. XBRL Sep 30 was $124M but 10-Q Note 10 shows $124.6M spent on 587K SOL post-Q3. ~$15M is best available estimate pending 10-K.",
    cashSourceQuote: ">$15M of cash and stablecoins (8-K Oct 29, 2025). XBRL Sep 30 was $124M but $109M deployed into SOL post-Q3.",
    cashSourceUrl: "/filings/hsdt/0001104659-25-113714",
    cashAsOf: "2025-09-30",
    avgDailyVolume: 150_000_000,
    hasOptions: true,
    leader: "Pantera Capital, Summer Capital",
    strategy: "SOL treasury via Anchorage Digital custody. Partnered with Solana Foundation.",
    notes: "fka Helius Medical Technologies. Name changed Sep 2025. sharesForMnav = 52.8M basic + 23.9M PFWs @ $0.001 = 76.7M (Feb 20, 2026 8-K). 73.9M stapled warrants @ $10.134 (Jun-Jul 2028) + 7.4M advisor warrants @ $0.001 (Oct 2030) tracked in dilutive-instruments. Negative equity (-$152M) is accounting artifact from stapled warrant derivative liabilities. $500M PIPE closed Sep 15, 2025.",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Holdings (2.34M SOL) from Nov 2025 10-Q — likely higher after continued ATM-funded purchases. 10-K FY2025 expected by late Mar 2026.",
        severity: "warning",
      },
      {
        type: "stale-data",
        message: "Cash ($15M) from Oct 2025 8-K estimate. Actual cash depends on ATM proceeds vs SOL purchases since then.",
        severity: "warning",
      },
    ],
  },
  {
    id: "dfdv",
    name: "DeFi Development Corp",
    ticker: "DFDV",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0001805526",
    asset: "SOL",
    tier: 1,
    website: "https://defidevcorp.com",
    twitter: "https://x.com/defidevcorp",
    holdings: 2_221_329,  // Q4 2025 business update: "holds 2,221,329 SOL and SOL equivalents"
    holdingsLastUpdated: "2026-01-01",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/dfdv/0001193125-26-002668",
    accessionNumber: "0001193125-26-002668",
    sourceType: "sec-filing",
    sourceQuote: "The Company currently holds 2,221,329 SOL and SOL equivalents on the balance sheet",
    datStartDate: "2025-04-01",
    // costBasisAvg removed - needs verification
    stakingPct: 0.90,  // Stakes SOL + operates validators; $4.85M in validator/staking rewards (9mo)
    stakingMethod: "Validator operations + third-party staking. dfdvSOL liquid staking token.",
    stakingSource: "Q4 2025 business update: 8.3% annualized organic yield (staking, validator ops, onchain deployment). 10-Q 9-month data supports 6-8% range. Prior 11.4% was unverifiable.",
    stakingSourceUrl: "/filings/dfdv/0001193125-25-286660",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.083,  // Company Q4 2025 business update: 8.3% organic yield estimate
    quarterlyBurnUsd: 3_572_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense $3,572,000",
    burnSourceUrl: "/filings/dfdv/0001193125-25-286660",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 200_000_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "/filings/dfdv/0001213900-26-018400",
    avgDailyVolume: 200_000_000,
    hasOptions: true,
    // marketCap removed - calculated from sharesForMnav × FMP price
    sharesForMnav: 29_892_800,  // Q4 business update Jan 5, 2026: "29,892,800 shares outstanding as of January 1, 2026"
    sharesSource: "SEC 8-K (filed 2026-01-05): Q4 2025 Business Update - shares outstanding 29,892,800 (down from 31,401,212 after 2.05M share buyback)",
    sharesSourceQuote: "SEC 8-K (filed 2026-01-05): Q4 2025 Business Update - shares outstanding 29,892,800 (down from 31,401,212 after 2.05M share buyback)",
    sharesSourceUrl: "/filings/dfdv/0001193125-26-002668",
    sharesAsOf: "2026-01-01",
    totalDebt: 202_042_000,  // 10-Q: $131.4M converts (net) + $70.3M BitGo + $267K short-term
    preferredEquity: 0,
    preferredAsOf: "2025-09-30",
    preferredSourceUrl: "/filings/dfdv/0001193125-25-286660",
    preferredSourceQuote: "No preferred stock outstanding (10-Q Q3 2025 balance sheet)",
    debtSource: "SEC 10-Q Q3 2025 balance sheet: $131.4M convertible notes (net, $140.3M face in two tranches) + $70.3M BitGo digital asset financing + $267K short-term loan. Total per 10-Q: $202,042,000",
    debtSourceQuote: "SEC 10-Q Q3 2025 balance sheet: $131.4M convertible notes (net, $140.3M face in two tranches) + $70.3M BitGo digital asset financing + $267K short-term loan. Total per 10-Q: $202,042,000",
    debtSourceUrl: "/filings/dfdv/0001193125-25-286660",
    debtAsOf: "2026-01-01",
    cashReserves: 9_000_000,  // ~$9M cash, stablecoins, and liquid tokens
    restrictedCash: 9_000_000,  // Operating capital - not excess
    cashSource: "SEC 8-K Q4 2025 Business Update: approximately $9M in cash, stablecoins, and other tokens",
    cashSourceQuote: "SEC 8-K Q4 2025 Business Update: approximately $9M in cash, stablecoins, and other tokens",
    cashSourceUrl: "/filings/dfdv/0001193125-26-002668",
    cashAsOf: "2026-01-01",
    encumberedHoldings: 1_127_000,  // ~$152.2M SOL at Sep 30 price (~$135). BitGo 250% collateral / 200% margin call.
    encumberedSource: "SEC 10-Q Q3 2025: $152.2M digital assets pledged as collateral (>50% of holdings). BitGo Master Loan at 250% collateral level.",
    encumberedSourceUrl: "/filings/dfdv/0001193125-25-286660",
    leader: "Formerly Janover Inc.",
    strategy: "First US public company with SOL-focused treasury.",
    notes: "$5B ELOC. Validator operations. dfdvSOL liquid staking token. $152.2M SOL pledged as collateral (>50% of digital assets). BitGo Master Loan: 250% collateral / 200% margin call trigger — liquidation risk if SOL drops 15-20%. Flora Growth $23.1M convertible note investment (93.3K SOL, 8% rate, due Sep 2030) — credit risk, not liquid SOL. Audit note 2026-03-05: lock values reconciled to D1 latest (2,221,329 SOL as of 2026-01-01 from Jan 2026 8-K business update).",
  },
  {
    id: "upxi",
    name: "Upexi",
    ticker: "UPXI",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0001775194",
    asset: "SOL",
    tier: 1,
    holdings: 2_173_204,  // SEC 10-Q Q2 FY2026 (Dec 31, 2025 balance sheet). Supersedes Jan 5 PR figure of 2,174,583.
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/upxi/0001477932-26-000736",
    accessionNumber: "0001477932-26-000736",
    sourceType: "sec-filing",
    sourceQuote: "Approximate number of Solana tokens held 2,173,204",
    datStartDate: "2025-04-01",
    stakingPct: 0.95,  // 10-Q Note 5: "approximately 95% of its Solana treasury staked as of December 31, 2025"
    stakingMethod: "Native staking (locked/staked SOL)",
    stakingSource: "SEC 10-Q Q2 FY2026 Note 5: '95% of its Solana treasury staked'. 8-K Jan 14: 'locked and staked nature of the Digital Assets'.",
    stakingSourceUrl: "/filings/upxi/0001477932-26-000736",
    stakingAsOf: "2025-12-31",
    stakingVerified: true,
    stakingLastAudited: "2026-02-13",
    stakingApy: 0.08,  // 65,720 SOL staking revenue / ~2M avg SOL / 6 months ≈ 8% APY
    quarterlyBurnUsd: 6_230_944,  // 10-Q: $12.46M OpCF used in 6 months / 2 (includes digital asset strategy costs)
    burnEstimated: true,  // Derived from 6-month OpCF, not a direct quarterly figure
    burnSource: "SEC 10-Q (filed 2026-02-10): Net cash used in operating activities $(12,461,887) for 6 months ended Dec 31, 2025",
    burnSourceUrl: "/filings/upxi/0001477932-26-000736",
    burnAsOf: "2025-12-31",
    capitalRaisedAtm: 1_000_000_000,  // $1B S-3 shelf registration (filed Dec 22, 2025, effective Jan 8, 2026). ~$7.4M used via Feb 2026 424B5.
    capitalRaisedAtmSource: "SEC S-3 shelf registration $1B (effective Jan 8, 2026)",
    capitalRaisedAtmSourceUrl: "/filings/upxi/0001477932-25-009150",
    sharesForMnav: 69_760_581,  // 10-Q cover page as of Feb 9, 2026 (includes Feb 2026 offering of 6.34M + RSU vesting)
    sharesSource: "SEC 10-Q Q2 FY2026 cover: 69,760,581 shares as of Feb 9, 2026",
    sharesSourceQuote: "SEC 10-Q Q2 FY2026 cover: 69,760,581 shares as of Feb 9, 2026",
    sharesSourceUrl: "/filings/upxi/0001477932-26-000736",
    sharesAsOf: "2026-02-09",
    totalDebt: 254_594_731,  // $150M convert @$4.25 + $35.96M Hivemind @$2.39 + $62.7M BitGo + $5.4M Cygnet + $560K promissory
    preferredEquity: 2,
    preferredAsOf: "2025-12-31",
    preferredSourceUrl: "/filings/upxi/0001477932-26-000736",
    preferredSourceQuote: "Preferred Stock: 2 shares outstanding, nominal value (10-Q Q2 FY2026 balance sheet)",
    debtSource: "SEC 10-Q Q2 FY2026 + Jan 2026 subsequent event: Convertible $150M + Hivemind $35.96M (EX-41: $35,961,975) + BitGo $62.7M + Cygnet $5.4M + Promissory $560K",
    debtSourceQuote: "SEC 10-Q Q2 FY2026 + Jan 2026 subsequent event: Convertible $150M + Hivemind $35.96M (EX-41: $35,961,975) + BitGo $62.7M + Cygnet $5.4M + Promissory $560K",
    debtSourceUrl: "/filings/upxi/0001477932-26-000736",
    debtAsOf: "2026-01-09",
    cashReserves: 1_616_765,  // 10-Q Dec 31, 2025 balance sheet. NOTE: Post-offering cash ~$9.7M per Feb 10 earnings 8-K (EX-99.2), but using audited BS figure.
    restrictedCash: 1_616_765,  // Operating capital - not excess
    cashSource: "SEC 10-Q Q2 FY2026 balance sheet",
    cashSourceQuote: "SEC 10-Q Q2 FY2026 balance sheet",
    cashSourceUrl: "/filings/upxi/0001477932-26-000736",
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "SOL",
    tier: 2,
    stakingPct: 1.0,
    secCik: "0001846839",
    holdings: 530_251,  // 402,004 direct + 46,474 jitoSOL + 81,640 STKESOL (Jan 2026 monthly update)
    holdingsLastUpdated: "2026-02-03",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://solstrategies.io/press-releases/sol-strategies-january-2026-monthly-business-update",
    sourceType: "company-website",
    sourceQuote: "SOL Holdings: 402,004 SOL",  // Direct SOL only; total 530,251 includes 46,474 jitoSOL + 81,640 STKESOL + staking rewards
    holdingsDerived: true,
    holdingsCalculation: "402,004 direct + 46,474 jitoSOL + 81,640 STKESOL + staking = 530,251",
    datStartDate: "2024-06-01",
    // costBasisAvg removed - needs verification
    // stakingPct: 0.85 removed - needs verification
    stakingApy: 0.065,
    quarterlyBurnUsd: 1_200_000,
    burnSource: "SEC 40-F FY2025 (estimate from operating expenses)",
    burnSourceUrl: "/filings/stke/0001104659-25-125666",
    burnAsOf: "2025-09-30",
    burnEstimated: true,
    capitalRaisedAtm: 50_000_000,
    capitalRaisedAtmSource: "SEC 40-F FY2025 / SEDAR+ filings",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001846839&type=40-F",
    sharesForMnav: 31_735_660,  // 6-K Q1 FY2026 (Feb 18, 2026): 31,735,660 as of Feb 17, 2026. Dec 31: 28,590,484. Growth from ATM + Guoga conversion (2.3M shares Jan 7).
    sharesSource: "6-K Q1 FY2026 (filed Feb 18, 2026): 31,735,660 shares as of Feb 17, 2026. Dec 31: 28,590,484. Sep 30 (40-F): 22,999,841. ATM ($50M Cantor Jan 2) + Guoga conversion (2.3M shares Jan 7).",
    sharesSourceQuote: "6-K Q1 FY2026 (filed Feb 18, 2026): 31,735,660 shares as of Feb 17, 2026. Dec 31: 28,590,484. Sep 30 (40-F): 22,999,841. ATM ($50M Cantor Jan 2) + Guoga conversion (2.3M shares Jan 7).",
    sharesSourceUrl: "/filings/stke/0001104659-26-016788",
    sharesAsOf: "2026-02-17",
    totalDebt: 34_900_000,  // CAD $49.1M → ~$34.9M USD: Converts CAD $34.9M + Credit facilities CAD $14.2M (Kamino DeFi + residual Guoga pre-settlement)
    debtSource: "6-K Q1 FY2026 balance sheet (Dec 31, 2025): Convertible debentures CAD $34.9M + Credit facilities CAD $14.2M = CAD $49.1M. Guoga facility settled Jan 7 (2.3M shares + CAD $4.9M cash) but Kamino DeFi facility (~CAD $4M) persists.",
    debtSourceQuote: "6-K Q1 FY2026 balance sheet (Dec 31, 2025): Convertible debentures CAD $34.9M + Credit facilities CAD $14.2M = CAD $49.1M. Guoga facility settled Jan 7 (2.3M shares + CAD $4.9M cash) but Kamino DeFi facility (~CAD $4M) persists.",
    debtSourceUrl: "/filings/stke/0001104659-26-016788",
    debtAsOf: "2025-12-31",
    // Cash obligations: Converts interest + Kamino facility
    cashObligationsAnnual: 2_500_000,  // ESTIMATE: ~7% on CAD $34.9M converts + Kamino variable rate
    cashObligationsSource: "ESTIMATE: Convertible interest + Kamino DeFi facility (variable rate ~1%)",
    cashObligationsSourceUrl: "/filings/stke/0001104659-26-016788",
    cashObligationsAsOf: "2025-12-31",
    cashReserves: 160_000,  // CAD $222,466 → ~$160K USD (Dec 31, 2025 Q1 FY2026 balance sheet)
    restrictedCash: 0,  // Operating cash - available
    cashSource: "6-K Q1 FY2026 balance sheet: CAD $222,466 cash",
    cashSourceQuote: "6-K Q1 FY2026 balance sheet: CAD $222,466 cash",
    cashSourceUrl: "/filings/stke/0001104659-26-016788",
    cashAsOf: "2025-12-31",
    avgDailyVolume: 50_000_000,
    leader: "Michael Hubbard (CEO)",
    strategy: "Validator-first SOL treasury (DAT++ model). VanEck ETF staking provider. 99.999% uptime.",
    notes: "4.04M SOL AuD. 1:8 reverse split Aug 2025 for NASDAQ. Guoga credit facility settled Jan 7, 2026 (2.3M shares + CAD $4.9M cash); Kamino DeFi facility (~CAD $4M) persists. $50M ATM (Cantor, Jan 2). STKESOL launched Jan 2026 (683K SOL staked). AGM Mar 31, 2026 re: board reconstitution. ATW convertible note facility up to US$480M available.",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Active $50M ATM program (Jan 2, 2026) — share count likely higher than 31.7M (Feb 17 snapshot). Cash near zero (CAD $222K at Dec 31).",
        severity: "warning",
      },
    ],
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0002078856",
    asset: "HYPE",
    tier: 1,
    holdings: 17_600_000,  // 8-K Feb 11, 2026: 17.6M HYPE as of Feb 3. Deployed $129.5M to buy ~5M additional at ~$25.94 avg.
    holdingsLastUpdated: "2026-02-03",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/purr/0001193125-26-045553",
    accessionNumber: "0001193125-26-045553",
    sourceType: "sec-filing",
    sourceQuote: "HYPE digital assets 12,857,533 units (Dec 31, 2025); 17.6M as of Feb 3 per 8-K",
    holdingsDerived: true,
    holdingsCalculation: "12,857,533 (Dec 31 10-Q) + ~4.7M purchased Jan-Feb = 17,600,000 (Feb 3 8-K)",
    datStartDate: "2025-12-02",
    stakingPct: 1.00,  // 100% staked via Anchorage
    stakingApy: 0.024,  // ~360K HYPE earned in first 2 months on ~12.9M avg staked
    stakingMethod: "Anchorage Digital",
    stakingSource: "8-K Feb 11: $0.5M staking revenue (6mo). Dec 31: 12.86M HYPE (up from 12.5M at close — ~360K from staking).",
    stakingAsOf: "2025-12-31",
    quarterlyBurnUsd: 1_750_000,  // 8-K Feb 11: $3.5M SGA+R&D for 6 months (Jul-Dec 2025) / 2
    burnSource: "SEC 8-K (Feb 11, 2026): SG&A + R&D = $3.5M for 6 months ended Dec 31, 2025",
    burnSourceUrl: "/filings/purr/0001193125-26-045553",
    burnAsOf: "2025-12-31",
    capitalRaisedPipe: 583_000_000,
    sharesForMnav: 123_967_508,  // 8-K Feb 11, 2026: basic shares after ~3M buyback ($10.5M at ~$3.42/share avg)
    sharesSource: "SEC 8-K (Feb 11, 2026): 123,967,508 shares. Down from 127M after $10.5M buyback (~3M shares at ~$3.42 avg). $19.5M remaining of $30M program.",
    sharesSourceQuote: "SEC 8-K (Feb 11, 2026): 123,967,508 shares. Down from 127M after $10.5M buyback (~3M shares at ~$3.42 avg). $19.5M remaining of $30M program.",
    sharesSourceUrl: "/filings/purr/0001193125-26-045553",
    sharesAsOf: "2026-02-11",
    cashReserves: 152_400_000,  // 8-K Feb 11: Dec 31 balance $281.9M − $129.5M deployed for ~5M HYPE = ~$152M remaining
    cashSource: "SEC 8-K (Feb 11, 2026): Dec 31 balance sheet $281.9M − $129.5M deployed for HYPE = ~$152M remaining as of Feb 3.",
    cashSourceQuote: "SEC 8-K (Feb 11, 2026): Dec 31 balance sheet $281.9M − $129.5M deployed for HYPE = ~$152M remaining as of Feb 3.",
    cashSourceUrl: "/filings/purr/0001193125-26-045553",
    cashAsOf: "2026-02-03",
    totalDebt: 0,
    debtSource: "SEC 8-K Feb 11, 2026 balance sheet: $0 debt",
    debtSourceQuote: "SEC 8-K Feb 11, 2026 balance sheet: $0 debt",
    debtSourceUrl: "/filings/purr/0001193125-26-045553",
    debtAsOf: "2025-12-31",
    leader: "David Schamis (CEO), Bob Diamond (Board)",
    strategy: "HYPE treasury via Sonnet merger. 100% staked via Anchorage.",
    notes: "$617M total assets (Dec 31). $30M buyback ($10.5M used, $19.5M remaining). ~360K HYPE staking yield in first 2 months. $1B ChEF (Chardan) equity line unused. D1 Capital 6.3% holder (8M shares).",
  },
  {
    id: "hypd",
    name: "Hyperion DeFi (fka Eyenovia)",
    ticker: "HYPD",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "HYPE",
    tier: 2,
    secCik: "0001682639",
    website: "https://hyperiondefi.com",
    twitter: "https://x.com/hyperiondefi_",
    // No IR page yet - company website only has marketing content
    // SEC 10-Q Sep 30, 2025: HYPE digital assets $37.95M = direct holdings only
    // At $26/HYPE (Sep 30 price): $37.95M / $26 = 1,459,615 HYPE
    // Liquid staked HYPE tracked separately in cryptoInvestments
    holdings: 1_862_195,
    holdingsLastUpdated: "2025-12-04",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://ir.hyperiondefi.com/news-events/press-releases/detail/300/hyperion-defi-announces-receipt-of-kinetiq-airdrop-partnership-with-native-markets-and-purchase-of-150000-additional-hype",
    accessionNumber: "0001104659-25-111671",  // Prior 10-Q accession for balance sheet data
    sourceType: "press-release",
    sourceQuote: "expanding its total holdings to 1,862,195 HYPE",
    datStartDate: "2025-07-01",
    stakingPct: 0,  // Direct holdings not staked (staked tracked in cryptoInvestments)
    stakingApy: 0.05,
    quarterlyBurnUsd: 3_570_000,  // SEC 10-Q: $10.7M cash used in ops (9mo) / 3 = $3.57M/qtr
    burnSource: "SEC 10-Q (filed 2025-05-19): NetCashUsedInOperatingActivities $4,442,846 (2025-01-01 to 2025-03-31)",
    burnSourceUrl: "/filings/hypd/0001410578-25-001361",
    burnAsOf: "2025-03-31",
    capitalRaisedPipe: 50_000_000,
    // Shares: 8,097,659 common (Nov 10, 2025) + 5,435,897 preferred × 3 conversion = 24.4M FD
    sharesForMnav: 24_400_000,
    sharesSourceUrl: "/filings/hypd/0001104659-25-111671",
    sharesSource: "SEC 10-Q Nov 14, 2025 (8.1M common + 16.3M from preferred conversion)",
    sharesSourceQuote: "SEC 10-Q Nov 14, 2025 (8.1M common + 16.3M from preferred conversion)",
    sharesAsOf: "2025-11-10",
    cashReserves: 8_223_180,  // SEC 10-Q Sep 30, 2025
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceQuote: "SEC 10-Q Q3 2025",
    cashSourceUrl: "/filings/hypd/0001104659-25-111671",
    cashAsOf: "2025-09-30",
    totalDebt: 7_656_005,  // Notes payable (Avenue loan)
    preferredEquity: 544,
    preferredAsOf: "2025-09-30",
    preferredSourceUrl: "/filings/hypd/0001104659-25-111671",
    preferredSourceQuote: "Series A Preferred Stock: 544 shares outstanding (10-Q Q3 2025 balance sheet)",
    debtSource: "SEC 10-Q Q3 2025",
    debtSourceQuote: "SEC 10-Q Q3 2025",
    debtSourceUrl: "/filings/hypd/0001104659-25-111671",
    debtAsOf: "2025-09-30",
    leader: "Hyunsu Jung (CEO)",
    strategy: "First US public HYPE treasury. Liquid staking via Kinetiq.",
    notes: "Rebranded from Eyenovia Jul 2025. 1-for-80 reverse split Jan 31, 2025. $500M ATM (Cantor/Chardan, Nov 2025) + $1B S-3 shelf. Dec 4: bought 150K HYPE (total 1.86M); 1.92M KNTQ airdrop; 300K HYPE to Native Markets for USDH. Rysk vault (Feb 2026). Avanza Pension 10.2% holder.",
    dataWarnings: [
      {
        type: "stale-data",
        message: "All balance sheet data from Sep 30, 2025 10-Q. $500M ATM active — share count may have increased. HYPE holdings likely changed (Dec PR: 1.86M; on-chain ~1.43M — some deployed to DeFi).",
        severity: "warning",
      },
    ],
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
        sourceUrl: "/filings/hypd/0001104659-26-000748",
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0001482541",
    asset: "BNB",
    tier: 1,
    holdings: 515_544,  // Jan 28, 2026 investor dashboard
    holdingsLastUpdated: "2026-01-28",
    holdingsSource: "company-website",
    holdingsSourceUrl: "https://www.ceaindustries.com/dashboard.html",
    sourceType: "company-website",
    sourceQuote: "Total BNB Holdings 515,544 BNB",
    datStartDate: "2025-06-01",
    costBasisSource: "company-website - Investor dashboard",
    // No staking disclosed - holding spot BNB
    quarterlyBurnUsd: 3_000_000,
    burnSource: "SEC 10-Q (filed 2025-09-22): NetCashUsedInOperatingActivities $1,725,439 (2025-06-07 to 2025-07-31)",
    burnSourceUrl: "/filings/bnc/0001493152-25-014503",
    burnAsOf: "2025-07-31",
    capitalRaisedPipe: 500_000_000,
    sharesForMnav: 44_062_938,  // SEC 10-Q Dec 2025
    sharesSource: "SEC 10-Q (filed 2025-12-15): EntityCommonStockSharesOutstanding = 44,062,938 as of 2025-12-12",
    sharesSourceQuote: "SEC 10-Q (filed 2025-12-15): EntityCommonStockSharesOutstanding = 44,062,938 as of 2025-12-12",
    sharesSourceUrl: "/filings/bnc/0001493152-25-027782",
    sharesAsOf: "2025-12-12",
    cashReserves: 77_500_000,  // $77.5M cash (Oct 2025)
    restrictedCash: 77_500_000,  // Treat as restricted - actively deployed for BNB purchases + buybacks
    cashSource: "FY Q2 2026 earnings",
    cashSourceQuote: "FY Q2 2026 earnings",
    cashSourceUrl: "/filings/bnc/0001493152-25-027782",
    cashAsOf: "2025-10-31",
    // totalDebt: 0 - "minimal debt" per press release
    leader: "David Namdar (CEO), YZi Labs backed",
    strategy: "World's largest BNB treasury. Target 1% of BNB supply.",
    notes: "$500M PIPE Aug 2025. $250M buyback authorized. YZi Labs owns 7%. 6,500 BNB from airdrops. Proxy fight: 10X Capital seeking board seats (PRSC14A filed Feb 2026).",
  },
  // WINT (Windtree) removed - Biopharma company, not beta to BNB
  {
    id: "na",
    name: "Nano Labs",
    ticker: "NA",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "BNB",
    tier: 2,
    // VERIFIED: SEC 6-K Dec 31, 2025 press release: "over 130,000 BNB...~$112M"
    holdings: 130_000,
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/na/0001213900-25-126828",
    accessionNumber: "0001213900-25-126828",
    sourceType: "sec-filing",
    sourceQuote: "holds more than 130,000 BNB in aggregate, with a total value of approximately US$112 million",
    datStartDate: "2025-06-01",
    secCik: "0001872302",
    filingType: "FPI",  // Foreign Private Issuer - files 20-F/6-K, limited XBRL
    // stakingPct: 0.30 removed - needs verification
    stakingApy: 0.03,
    quarterlyBurnUsd: 3_550_000,  // H1 2025: $7.1M/6mo = $3.55M/qtr (down from FY2024's $4.85M/qtr)
    burnSource: "SEC 6-K H1 2025",
    burnSourceUrl: "/filings/na/0001213900-25-088368",
    burnAsOf: "2025-06-30",
    // 20-F FY2024: RMB170.7M + RMB18M = ~$26.2M operating debt
    // + $500M 0% convertible notes (Jul 2025, 424B3) = ~$526.2M total
    totalDebt: 526_200_000,
    debtSource: "SEC 20-F FY2024 ($26.2M operating) + SEC 424B3 Jul 2025 ($500M converts)",
    debtSourceQuote: "$500M 0% convertible notes @ $20/share (360-day term, Jul 2025) + $26.2M operating debt from 20-F FY2024",
    debtSourceUrl: "/filings/na/0001213900-25-031065",
    debtAsOf: "2025-07-01",
    // VERIFIED via XBRL: CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents
    cashReserves: 50_800_000,
    cashSource: "SEC XBRL 6-K Q2 2025",
    cashSourceQuote: "SEC XBRL 6-K Q2 2025",
    cashSourceUrl: "/filings/na/0001213900-25-126828", // exact SEC 6-K doc (filed 2025-12-31)
    cashAsOf: "2025-06-30",
    // VERIFIED from 424B3 Oct 2025: 20,768,315 Class A + 2,858,909 Class B = 23,627,224
    // Significant dilution in 2025: 15.67M (Dec 2024) → 23.6M (Oct 2025) = +50%
    sharesForMnav: 23_627_224,
    sharesSource: "SEC 424B3 Oct 2025 (Class A: 20.77M + Class B: 2.86M)",
    sharesSourceQuote: "SEC 424B3 Oct 2025 (Class A: 20.77M + Class B: 2.86M)",
    sharesSourceUrl: "/filings/na/0001213900-25-097024",
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "TAO",
    tier: 1,
    holdings: 67_000,  // "more than 67,000 TAO tokens" per Nov 18, 2025 announcement
    holdingsLastUpdated: "2025-11-18",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.stocktitan.net/news/TAOX/tao-synergies-and-yuma-asset-management-to-host-livestream-on-x-y545u5zgifom.html",
    sourceType: "press-release",
    sourceQuote: "TAO Synergies holds more than 67,000 TAO tokens in its digital asset treasury",
    datStartDate: "2025-06-01",
    // costBasisAvg removed - needs verification
    stakingPct: 0.95,  // "required to delegate at least 90% of TAO" per Yuma Agreement; stakes via tao5 and Yuma
    stakingMethod: "Root subnet staking via tao5 and Yuma validators. BitGo Trust custody.",
    stakingSource: "SEC 10-Q Nov 14, 2025: $207K staking revenue (9mo). At least 90% delegated per Yuma Agreement. Stakes from BitGo Trust custody.",
    stakingSourceUrl: "/filings/taox/0001104659-25-112570",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.10,
    quarterlyBurnUsd: 1_949_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "/filings/taox/0001410578-25-001327",
    burnAsOf: "2025-09-30",
    cashReserves: 1_445_427,  // 10-Q Sep 30, 2025 balance sheet
    cashAsOf: "2025-09-30",
    cashSource: "SEC 10-Q Q3 2025 (filed Nov 14, 2025)",
    cashSourceQuote: "SEC 10-Q Q3 2025 (filed Nov 14, 2025)",
    cashSourceUrl: "/filings/taox/0001104659-25-112570",
    capitalRaisedPipe: 11_000_000,
    sharesForMnav: 7_128_912,  // 10-Q Nov 14, 2025 cover page (7,128,912 shares as of Nov 11, 2025)
    sharesSourceUrl: "/filings/taox/0001104659-25-112570",
    sharesAsOf: "2025-11-11",
    sharesSource: "SEC 10-Q cover page Nov 14, 2025 (7,128,912 shares as of Nov 11)",
    sharesSourceQuote: "SEC 10-Q cover page Nov 14, 2025 (7,128,912 shares as of Nov 11)",
    secCik: "0001571934",
    leader: "Joshua Silverman (Executive Chairman)",
    strategy: "First pure-play Bittensor treasury company",
    notes: "Formerly Synaptogenix. DCG is investor. Series E Preferred convertible at $8 (out of money at ~$4.80).",
  },
  {
    id: "xtaif",
    name: "xTAO Inc",
    ticker: "XTAIF",
    country: "CA",
    jurisdiction: "CA",
    authoritativeSource: "SEDAR+",
    exchangeMic: "XTSE",
    asset: "TAO",
    tier: 1,
    sedarProfile: "000048521",
    website: "https://www.xtao.co",
    twitter: "https://x.com/xtaohq",
    investorRelationsUrl: "https://www.xtao.co/#investors",
    holdings: 59_962,
    holdingsLastUpdated: "2025-11-25",
    holdingsSource: "regulatory-filing",  // News release filed on SEDAR+ Nov 26, 2025
    holdingsSourceUrl: "https://www.newswire.ca/news-releases/xtao-provides-update-on-tao-holdings-816100068.html",
    sourceType: "regulatory-filing",
    sourceQuote: "xTAO holds a total of 59,962 TAO",
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
    cashSourceQuote: "SEDAR+ Q2 FY26 MD&A (filed Nov 29, 2025)",
    cashSourceUrl: "https://www.sedarplus.ca/csa-party/records/document.html?id=b51c12a3ab4a6c90cf8f1a2b7f6e9d8a",
    cashAsOf: "2025-09-30",
    sharesForMnav: 38_031_285,  // 28,552,195 shares + 9,479,090 pre-funded warrants (auto-convert)
    sharesAsOf: "2025-09-30",
    sharesSource: "SEDAR+ MD&A Sep 30, 2025 (page 11: shares, page 5: warrants)",
    sharesSourceQuote: "SEDAR+ MD&A Sep 30, 2025 (page 11: shares, page 5: warrants)",
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "TAO",
    tier: 2,
    holdings: 24_382,  // Dec 10, 2025 8-K: "increased its TAO holdings to 24,382 tokens"
    holdingsLastUpdated: "2025-12-10",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/twav/0001437749-25-037490",
    accessionNumber: "0001437749-25-037490",
    sourceType: "sec-filing",
    sourceQuote: "increased its TAO holdings to 24,382 tokens, reflecting continued execution of its TAO-exclusive treasury strategy",
    datStartDate: "2025-06-01",
    // costBasisAvg removed - needs SEC verification
    stakingPct: 0.99,  // "average staking rate of 99% for our digital asset balance" per 10-Q
    stakingMethod: "Root subnet staking via third-party validators. BitGo Trust custody.",
    stakingSource: "SEC 10-Q Nov 13, 2025: 'average staking rate of 99%'. $99K staking rewards (9mo). Stakes from BitGo Trust custody.",
    stakingSourceUrl: "/filings/twav/0001437749-25-034612",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.10,
    quarterlyBurnUsd: 1_043_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "/filings/twav/0001437749-25-016275",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 7_500_000,
    capitalRaisedAtmSource: "SEC S-3 shelf registration",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000746210&type=S-3",
    sharesForMnav: 3_913_471,  // 3,207,210 common (SEC 10-Q Nov 10, 2025) + 706,261 Pre-Funded Warrants @ $0.0001 (essentially shares)
    sharesSourceUrl: "/filings/twav/0001437749-25-034612",
    sharesAsOf: "2025-11-10",
    sharesSource: "SEC 10-Q Q3 2025 (filed Nov 13, 2025)",
    sharesSourceQuote: "SEC 10-Q Q3 2025 (filed Nov 13, 2025)",
    secCik: "0000746210",
    cashReserves: 3_737_000,  // Sep 30, 2025 10-Q
    restrictedCash: 3_737_000,  // Earmarked for TAO purchases - add to NAV, not subtract from EV
    preferredEquity: 0,
    preferredAsOf: "2025-09-30",
    preferredSourceUrl: "/filings/twav/0001437749-25-034612",
    preferredSourceQuote: "No preferred stock outstanding (10-Q Q3 2025 balance sheet)",
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceQuote: "SEC 10-Q Q3 2025",
    cashSourceUrl: "/filings/twav/0001437749-25-034612",
    cashAsOf: "2025-09-30",
    website: "https://taoweave.com",
    twitter: "https://x.com/taoweave",
    investorRelationsUrl: "https://taoweave.com/investor-relations",
    leader: "Peter Holst (President & CEO)",
    strategy: "Decentralized AI treasury strategy via TAO accumulation",
    notes: "Nasdaq: TWAV (changed from OBLG Dec 2025). 100% staked with BitGo. 706K pre-funded warrants ($0.0001) in sharesForMnav. ~2M common warrants @ $3.41, up to 8.1M conditional warrants @ $3.77 (from preferred exercises). Audit note 2026-03-05: shares anchor date normalized to Dec 10, 2025 checkpoint to match canonical D1 latest metadata.",
  },
];

// LINK DAT Companies
export const linkCompanies: Company[] = [
  {
    id: "cwd",
    name: "Caliber",
    ticker: "CWD",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "LINK",
    tier: 1,
    holdings: 562_535,
    holdingsLastUpdated: "2025-10-16",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.stocktitan.net/news/CWD/caliber-continues-to-increase-chainlink-link-token-exposure-with-an-v0iupkst1br6.html",
    sourceType: "press-release",
    sourceQuote: "grows Caliber's total holdings in LINK to 562,535 tokens valued at approximately $10.1 million",
    datStartDate: "2025-09-09",
    // costBasisAvg removed - needs verification
    stakingPct: 0.13,  // 75,000 LINK staked / 562,535 total = 13.3%
    stakingMethod: "Chainlink staking with leading node operator",
    stakingSource: "SEC 8-K Dec 12, 2025: 'staked 75,000 LINK tokens directly with a leading Chainlink node operator'",
    stakingSourceUrl: "/filings/cwd/0001627282-25-000162",
    stakingAsOf: "2025-12-11",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.05,
    quarterlyBurnUsd: 2_000_000,
    burnSource: "SEC 10-Q (filed 2025-05-15): NetCashUsedInOperatingActivities $1,738,000 (2025-01-01 to 2025-03-31)",
    burnSourceUrl: "/filings/cwd/0001627282-25-000059",
    burnAsOf: "2025-03-31",
    preferredEquity: 0,
    preferredAsOf: "2025-09-30",
    preferredSource: "SEC 10-Q Q3 2025 balance sheet",
    preferredSourceUrl: "/filings/cwd/0001627282-25-000157",
    preferredSourceQuote: "No preferred stock outstanding (10-Q Q3 2025 balance sheet)",
    cashReserves: 10927000,
    cashAsOf: "2025-09-30",
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceQuote: "Cash and cash equivalents: $10,927,000 (10-Q Sep 30, 2025 balance sheet)",
    cashSourceUrl: "/filings/cwd/0001627282-25-000157",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Balance sheet data may be stale (cash as-of 2025-09-30).",
        severity: "warning",
      },
    ],
    avgDailyVolume: 5_000_000,
    sharesForMnav: 6_905_000,  // 6.53M Class A + 0.37M Class B = 6.9M per SEC DEF 14A Jan 7, 2026
    sharesSourceUrl: "/filings/cwd/0001627282-25-000028",
    sharesAsOf: "2025-12-31",
    sharesSource: "SEC DEF 14A Jan 7, 2026 (Record Date Dec 31, 2025)",
    sharesSourceQuote: "SEC DEF 14A Jan 7, 2026 (Record Date Dec 31, 2025)",
    secCik: "0001627282",
    leader: "John C. Loeffler II (CEO)",
    website: "https://caliberco.com",
    twitter: "https://x.com/CaliberCompany",
    investorRelationsUrl: "https://ir.caliberco.com/",
    strategy: "First Nasdaq LINK treasury. DCA accumulation + staking.",
    notes: "Real estate asset manager pivoting to LINK. 75K LINK staked. StoneX custody partner. ~1:19 reverse split early 2025. Audit note 2026-03-05: replaced browse-level evidence URLs with accession-specific SEC filings; holdings uses Oct 16, 2025 8-K checkpoint (562,535 LINK) carried to Dec 31 state, and shares use DEF 14A filing path for record-date basis.",
  },
];

// TRX DAT Companies
export const trxCompanies: Company[] = [
  {
    id: "tron",
    name: "Tron Inc",
    ticker: "TRON",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "TRX",
    tier: 1,
    holdings: 681_200_000,  // Feb 12, 2026 8-K: "TRX Treasury to Over 681.2 Million TRX Tokens"
    holdingsLastUpdated: "2026-02-12",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/tron/0001493152-26-012544",
    accessionNumber: "0001493152-26-012544",
    sourceType: "sec-filing",
    sourceQuote: "TRX Treasury to Over 681.2 Million TRX Tokens",
    datStartDate: "2025-07-01",
    website: "https://srmentertainment.com",
    twitter: "https://x.com/tron_inc",
    investorRelationsUrl: "https://srmentertainment.com/investor-relations",
    secCik: "0001956744",
    preferredEquity: 10,
    preferredAsOf: "2025-09-30",
    preferredSource: "SEC 10-Q Q3 FY2026 balance sheet",
    preferredSourceUrl: "/filings/tron/0001493152-25-021526",
    preferredSourceQuote: "Series A Preferred Stock: 10 shares outstanding (10-Q Q3 FY2026 balance sheet)",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Balance sheet data may be stale (preferred as-of 2025-06-30).",
        severity: "warning",
      },
    ],
    // costBasisAvg removed - needs verification
    stakingPct: 1.00,  // 677,596,800 / 677,596,945 TRX staked via JustLend ≈ 100%
    stakingMethod: "Liquid staking via JustLend DAO (sTRX tokens)",
    stakingSource: "SEC 10-Q Nov 10, 2025: '677,596,800 tokens...have been staked, through JustLend, in return for approximately 549,676,892 sTRX.' $2.3M unrealized staking income.",
    stakingSourceUrl: "/filings/tron/0001493152-25-021526",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.045,
    quarterlyBurnUsd: 955_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "/filings/tron/0001641172-25-009334",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 310_000_000,
    avgDailyVolume: 50_000_000,
    sharesForMnav: 274_382_064,  // Dec 29, 2025 8-K: after $18M Justin Sun investment
    sharesSource: "SEC 8-K Dec 29, 2025",
    sharesSourceQuote: "SEC 8-K Dec 29, 2025",
    sharesAsOf: "2025-12-29",
    sharesSourceUrl: "/filings/tron/0001493152-25-029225",
    leader: "Richard Miller (CEO)",
    strategy: "TRX treasury via JustLend staking, Justin Sun backing",
    notes: "First US public company to hold its blockchain's native token. Formerly SRM Entertainment. Audit note 2026-03-05: holdings/shares citation anchors normalized to the Jan 23, 2026 8-K accession used by canonical D1 history.",
  },
];

// XRP DAT Companies
export const xrpCompanies: Company[] = [
  {
    id: "xrpn",
    name: "Evernorth Holdings",
    ticker: "XRPN",  // Trading as Armada Acquisition Corp. II until merger closes
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    secCik: "0002044009",
    asset: "XRP",
    tier: 1,
    holdings: 473_276_430,
    holdingsLastUpdated: "2025-11-04",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://www.sec.gov/Archives/edgar/data/2044009/000119312525263628/d77894dex991.htm",
    sourceType: "sec-filing",
    sourceQuote: "total XRP purchased and committed to over 473,276,430",
    datStartDate: "2025-11-01",
    preferredEquity: 0,
    preferredAsOf: "2025-12-31",
    preferredSourceUrl: "https://www.sec.gov/Archives/edgar/data/2044009/000119312526051286/",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Balance sheet data may be stale (preferred as-of 2025-12-31).",
        severity: "warning",
      },
    ],
    quarterlyBurnUsd: 0,
    burnSource: "SPAC - minimal operating expenses pre-merger",
    burnSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=1991453&type=10-Q",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 1_000_000_000,
    pendingMerger: true,  // SPAC merger with Armada Acquisition Corp. II
    expectedHoldings: 473_276_430,
    leader: "Asheesh Birla (CEO, ex-Ripple)",
    strategy: "Institutional-scale XRP adoption via SPAC. Yield through XRP loans/market making.",
    notes: "SPAC merger pending Q1 2026. 0.47% of XRP supply. SBI $200M anchor. Ripple, Pantera backed. Holdings per SEC 8-K Nov 4, 2025 press release (EX-99.1).",
  },
  // WKSP (Worksport) removed - Auto tech company, not beta to XRP
];

// ZEC DAT Companies
export const zecCompanies: Company[] = [
  {
    id: "cyph",
    name: "Cypherpunk Technologies",
    ticker: "CYPH",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "ZEC",
    tier: 1,
    website: "https://www.cypherpunk.com",
    twitter: "https://x.com/cypherpunk",
    investorRelationsUrl: "https://investors.leaptx.com/",
    holdings: 290_062,  // Dec 30, 2025 8-K: 290,062.67 ZEC
    holdingsLastUpdated: "2025-12-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/cyph/0001104659-25-125039",
    accessionNumber: "0001104659-25-125039",
    sourceType: "sec-filing",
    sourceQuote: "aggregate ZEC holdings stand at 290,062.67, which were purchased at a cumulative average price of $334.41 per ZEC",
    datStartDate: "2025-10-08",  // Oct 8, 2025 PIPE closing date
    secCik: "0001509745",
    cashReserves: 9686000,
    cashAsOf: "2025-09-30",
    cashSource: "SEC 10-Q Q3 2025",
    cashSourceQuote: "Cash and cash equivalents: $9,686,000 (10-Q Sep 30, 2025 balance sheet)",
    cashSourceUrl: "/filings/cyph/0001104659-25-109827",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Balance sheet data may be stale (cash as-of 2025-09-30).",
        severity: "warning",
      },
    ],
    costBasisAvg: 334.41,
    costBasisSource: "SEC 8-K Dec 30, 2025 - cumulative average price per ZEC",
    costBasisSourceUrl: "/filings/cyph/0001104659-25-125039",
    capitalRaisedPipe: 58_880_000,  // Oct 2025 PIPE gross proceeds
    sharesForMnav: 137_420_344,  // Basic (56.6M) + Pre-funded warrants (80.8M) per SEC filings
    sharesSourceUrl: "/filings/cyph/0001104659-25-109827",
    sharesSource: "SEC 10-Q Q3 2025 + 8-K Oct 9, 2025 (basic + pre-funded warrants)",
    sharesSourceQuote: "SEC 10-Q Q3 2025 + 8-K Oct 9, 2025 (basic + pre-funded warrants)",
    sharesAsOf: "2025-11-10",
    leader: "Douglas Onsi (CEO)",
    strategy: "Target 5% of ZEC supply (~540K ZEC). Winklevoss backed.",
    notes: "Formerly Leap Therapeutics. 1.76% of ZEC supply. ~76M common warrants @ $0.5335 (expire Oct 2035). Audit note 2026-03-05: shares metadata normalized to Dec 30, 2025 SEC checkpoint to match canonical D1 latest.",
  },
  // RELI (Reliance Global) removed - InsurTech company, not beta to ZEC
];

// LTC DAT Companies
export const ltcCompanies: Company[] = [
  {
    id: "lits",
    name: "Lite Strategy",
    ticker: "LITS",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "LTC",
    tier: 1,
    secCik: "0001262104",
    holdings: 929_548,  // Q2 FY2026 10-Q (Dec 31, 2025): 833,748 on-balance-sheet + 95,800 pledged as covered call collateral = 929,548 total
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/lits/0001193125-26-053215",
    accessionNumber: "0001193125-26-053215",
    sourceType: "sec-filing",
    sourceQuote: "Total digital assets 929,548",
    datStartDate: "2025-07-01",
    costBasisAvg: 107.58,  // $100M total acquisition / 929,548 LTC ≈ $107.58. XBRL: CryptoAssetCost $89.15M for 833,748 on-BS units.
    costBasisSource: "SEC 10-Q Q2 FY2026 XBRL: PaymentForAcquisitionCryptoAsset $100M / 929,548 total LTC",
    costBasisSourceUrl: "/filings/lits/0001193125-26-053215",
    quarterlyBurnUsd: 3_305_000,  // Q2 FY2026 XBRL: GeneralAndAdministrativeExpense $3,305,000
    burnSource: "SEC 10-Q Q2 FY2026 XBRL: GeneralAndAdministrativeExpense",
    burnSourceUrl: "/filings/lits/0001193125-26-053215",
    burnAsOf: "2025-12-31",
    capitalRaisedPipe: 100_000_000,
    avgDailyVolume: 15_000_000,
    totalDebt: 0,
    preferredEquity: 0,
    preferredAsOf: "2025-12-31",
    preferredSourceUrl: "/filings/lits/0001193125-26-053215",
    preferredSourceQuote: "No preferred stock outstanding (10-Q Q2 FY2026 balance sheet)",
    debtSource: "SEC 10-Q Q2 FY2026",
    debtSourceQuote: "SEC 10-Q Q2 FY2026",
    debtSourceUrl: "/filings/lits/0001193125-26-053215",
    debtAsOf: "2025-12-31",
    cashReserves: 8_758_000,  // Q2 FY2026 XBRL: CashAndCashEquivalentsAtCarryingValue $8,758,000
    cashSource: "SEC 10-Q Q2 FY2026 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceQuote: "SEC 10-Q Q2 FY2026 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceUrl: "/filings/lits/0001193125-26-053215",
    cashAsOf: "2025-12-31",
    sharesForMnav: 36_361_999,  // Q2 FY2026 10-Q cover page (Feb 9, 2026). Down from 36.8M due to $25M buyback program.
    sharesSourceUrl: "/filings/lits/0001193125-26-053215",
    sharesSource: "SEC 10-Q Q2 FY2026 cover page (Feb 9, 2026)",
    sharesSourceQuote: "SEC 10-Q Q2 FY2026 cover page (Feb 9, 2026)",
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
    country: "CA",
    jurisdiction: "CA",
    authoritativeSource: "SEDAR+",
    exchangeMic: "XTSE",
    asset: "LTC",
    tier: 2,
    holdings: 24_439,  // Feb 11, 2026 press release
    holdingsLastUpdated: "2026-02-11",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.newsfilecorp.com/release/283508/Luxxfolio-Commences-Litecoin-Mining-Operations",
    sourceType: "press-release",
    sourceQuote: "bringing total holdings to 24,439.464 LTC, representing approximately 73,686 litoshis per share",
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
    sharesSourceQuote: "SEDAR+ audited annual + Note 12 subsequent events (Dec 9 placement)",
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "SUI",
    tier: 1,
    holdings: 108_368_594,  // Feb 23, 2026 Treasury Update
    holdingsLastUpdated: "2026-02-23",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/suig/0001654954-26-001610",
    accessionNumber: "0001654954-26-001610",
    sourceType: "sec-filing",
    sourceQuote: "treasury to 108,368,594 SUI (including 2,961,550 SUI loan receivables) as of February 23, 2026",
    datStartDate: "2025-08-01",
    secCik: "0001425355",
    cashReserves: 1497009,
    cashAsOf: "2025-06-30",
    cashSource: "SEC 10-Q Q4 FY2025",
    cashSourceQuote: "Cash and cash equivalents: $1,497,009 (10-Q Jun 30, 2025 balance sheet)",
    cashSourceUrl: "/filings/suig/0001654954-25-009666",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Balance sheet data may be stale (cash as-of 2025-06-30).",
        severity: "warning",
      },
    ],
    stakingPct: 0.98,  // "Substantially almost all of these holdings continue to be staked"
    stakingMethod: "Native staking, liquid staking, and restaking via third-party validators",
    stakingSource: "SEC 10-Q Nov 13, 2025: 'Substantially almost all...staked, generating annualized yield of ~2.2%'. $1.01M SUI staking revenue.",
    stakingSourceUrl: "/filings/suig/0001654954-25-012949",
    stakingAsOf: "2025-09-30",
    stakingVerified: true,
    stakingLastAudited: "2026-02-05",
    stakingApy: 0.017,  // ~1.7% annualized yield per Mar 2026 update
    // Excludes crypto impairment/unrealized losses. Total GAAP operating expenses were $64.7M in Q3 2025
    // (XBRL OperatingExpenses = $64,676,420) but dominated by non-cash items (crypto mark-to-market).
    // This figure reflects actual G&A/cash burn only.
    quarterlyBurnUsd: 1_000_000,
    burnSource: "SEC 10-Q (filed 2025-05-13): NetCashUsedInOperatingActivities $3,646,585 (2025-01-01 to 2025-03-31)",
    burnSourceUrl: "/filings/suig/0001654954-25-005448",
    burnAsOf: "2025-03-31",
    capitalRaisedAtm: 500_000_000,
    capitalRaisedAtmSource: "SEC S-1 registration statement",
    capitalRaisedAtmSourceUrl: "/filings/suig/0001213900-25-088239",
    capitalRaisedPipe: 450_000_000,
    avgDailyVolume: 20_000_000,
    marketCap: 98_000_000,  // ~$98M (80.9M shares × ~$1.21, Jun 2025) — dynamic calc via sharesForMnav preferred
    sharesForMnav: 80_900_000,  // SEC 8-K Jan 8, 2026: "fully adjusted shares issued and outstanding as of January 7, 2026"
    sharesAsOf: "2026-01-07",
    sharesSource: "SEC 8-K Jan 8, 2026",
    sharesSourceQuote: "SEC 8-K Jan 8, 2026",
    sharesSourceUrl: "/filings/suig/0001654954-26-000201",
    leader: "Douglas Polinsky (CEO)",
    strategy: "Only public company with Sui Foundation relationship",
    notes: "Confirmed 108.3M SUI. Reported $221.8M net loss in Q4 2025 primarily due to $196.1M non-cash mark-to-market loss on SUI. Staking yield accreted to 1.34 SUI per share. Relationship with Sui Foundation.",
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
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "DOGE",
    tier: 1,
    website: "https://www.cleancoresol.com",
    twitter: "https://twitter.com/CleanCoreSol",
    secCik: "0001956741",
    holdings: 733_060_893,  // Q2 FY2026 10-Q (Dec 31, 2025) — filing-verified (no XBRL crypto tag). No purchases Jan 1-Feb 10, 2026.
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/zone/0001213900-26-015016",
    accessionNumber: "0001213900-26-015016",
    sourceType: "sec-filing",
    sourceQuote: "Number of Dogecoin held 733,060,893",
    datStartDate: "2025-09-05",
    quarterlyBurnUsd: 3_600_000,  // Q2 FY2026 XBRL: NetCashUsedInOperatingActivities $7.17M for 6 months = ~$3.6M/qtr
    burnSource: "SEC 10-Q Q2 FY2026 XBRL: NetCashProvidedByUsedInOperatingActivities -$7,167,396 (Jul-Dec 2025)",
    burnSourceUrl: "/filings/zone/0001213900-26-015016",
    burnAsOf: "2025-12-31",
    capitalRaisedPipe: 175_000_000,
    avgDailyVolume: 3_000_000,
    marketCap: 150_000_000,
    cashReserves: 5_443_655,  // Q2 FY2026 XBRL: CashAndCashEquivalentsAtCarryingValue
    cashSource: "SEC 10-Q Q2 FY2026 XBRL",
    cashSourceQuote: "SEC 10-Q Q2 FY2026 XBRL",
    cashSourceUrl: "/filings/zone/0001213900-26-015016",
    cashAsOf: "2025-12-31",
    totalDebt: 800_000,  // Q2 FY2026 10-Q: NotesPayable ~$800K at 10% interest (XBRL last tagged $690K at Jun 30; verify from filing text)
    preferredEquity: 100,
    preferredAsOf: "2025-12-31",
    preferredSource: "SEC 10-Q Q2 FY2026 balance sheet",
    preferredSourceUrl: "/filings/zone/0001213900-26-015016",
    preferredSourceQuote: "Series A Preferred Stock: 100 shares outstanding (10-Q Q2 FY2026 balance sheet)",
    dataWarnings: [
      {
        type: "stale-data",
        message: "Balance sheet data may be stale (preferred as-of 2024-03-31).",
        severity: "warning",
      },
    ],
    debtSource: "SEC 10-Q Q2 FY2026: NotesPayable",
    debtSourceQuote: "SEC 10-Q Q2 FY2026: NotesPayable",
    debtSourceUrl: "/filings/zone/0001213900-26-015016",
    debtAsOf: "2025-12-31",
    sharesForMnav: 210_556_229,  // SEC 10-Q Q2 FY2026 cover page (Feb 10, 2026)
    sharesSourceUrl: "/filings/zone/0001213900-26-015016",
    sharesSource: "SEC 10-Q Q2 FY2026 cover page",
    sharesSourceQuote: "SEC 10-Q Q2 FY2026 cover page",
    sharesAsOf: "2026-02-10",
    leader: "Clayton Adams (CEO)",
    strategy: "Official Dogecoin Treasury. Target 1B DOGE (5% circulating supply).",
    notes: "NYSE American. Q2 FY2026: 733M DOGE (Dec 31, 2025). No purchases Jan 1-Feb 10, 2026 per subsequent events. Partnership with House of Doge, 21Shares, Robinhood. Audit note 2026-03-05: lock values and citation anchors reconciled to D1 latest (DOGE/cash/debt at 2025-12-31; shares at 2026-02-10).",
  },
  {
    id: "tbh",
    name: "Brag House / House of Doge",
    ticker: "TBH",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "DOGE",
    tier: 1,
    secCik: "0001903595",
    // IMPORTANT: TBH (Brag House) is a gaming company merging with House of Doge
    // The 730M DOGE is held by House of Doge (private), NOT by TBH currently
    // Post-merger: ~663M new shares to HOD + ~50M existing TBH = ~713M shares
    holdings: 0,  // TBH has no DOGE - it's a gaming company pre-merger
    holdingsLastUpdated: "2025-12-18",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "/filings/tbh/0001213900-26-015027",
    accessionNumber: "0001213900-26-015027",
    sourceType: "sec-filing",
    datStartDate: "2025-09-05",  // House of Doge treasury started Sep 5, 2025
    pendingMerger: true,  // SPAC-style merger not yet closed
    expectedHoldings: 730_000_000,  // HOD holds 730M DOGE per Dec 18, 2025 shareholder letter
    mergerExpectedClose: "2026-03-31",  // Q1 2026
    quarterlyBurnUsd: 713_000,
    burnSource: "SEC 10-Q Q3 2025 XBRL: SellingGeneralAndAdministrativeExpense",
    burnSourceUrl: "/filings/tbh/0001213900-25-111616",
    burnAsOf: "2025-09-30",
    capitalRaisedPipe: 200_000_000,
    avgDailyVolume: 5_000_000,
    marketCap: 8_000_000,  // TBH pre-merger market cap ~$8M (10.8M shares × ~$0.75)
    sharesForMnav: 10_800_000,  // TBH pre-merger shares (Nov 2025 10-Q)
    sharesSource: "SEC 10-Q (filed 2025-11-17): EntityCommonStockSharesOutstanding = 19,799,090 as of 2025-11-12",
    sharesSourceQuote: "SEC 10-Q (filed 2025-11-17): EntityCommonStockSharesOutstanding = 19,799,090 as of 2025-11-12",
    sharesSourceUrl: "/filings/tbh/0001213900-25-111616",
    sharesAsOf: "2025-11-12",
    leader: "Alex Spiro (Chairman post-merger), Marco Margiotta (HOD CEO)",
    strategy: "Official Dogecoin treasury partner. Payments ecosystem.",
    notes: "TBH is gaming company merging with House of Doge. HOD holds 730M DOGE via CleanCore (ZONE) agreement. $1.09B post-merger valuation. Jan 2026: Nasdaq compliance notice (stock <$1). Audit note 2026-03-05: holdings and shares anchors normalized to Dec 18, 2025 8-K checkpoint (0 DOGE and 10.8M TBH-share baseline) to match canonical D1 history. Data quality classification: LEGAL_MATCH (lock mirrors filing-anchored D1 latest).",
  },
  {
    id: "btog",
    name: "Bit Origin",
    ticker: "BTOG",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "DOGE",
    tier: 2,
    website: "https://www.bitorigin.io",
    twitter: "https://x.com/BitOriginLtd",
    investorRelationsUrl: "https://www.bitorigin.io/investors",
    holdings: 70_543_745,  // Aug 2025 - was 40.5M (missed PIPE)
    holdingsLastUpdated: "2025-08-11",
    holdingsSource: "press-release",
    holdingsSourceUrl: "https://www.globenewswire.com/news-release/2025/08/12/3131772/0/en/Bit-Origin-Surpasses-70-Million-Dogecoin-DOGE-Holdings-Following-Private-Placement.html",
    sourceType: "press-release",
    sourceQuote: "Holdings: 70,543,745 DOGE",
    datStartDate: "2025-07-17",  // DOGE strategy announced
    quarterlyBurnUsd: 771_000,
    burnSource: "SEC 20-F FY2025 (Jun 30, 2025)",
    burnSourceUrl: "/filings/btog/0001104659-25-105009",
    burnAsOf: "2025-06-30",
    capitalRaisedAtm: 500_000_000,
    capitalRaisedAtmSource: "SEC 20-F / 6-K filings",
    capitalRaisedAtmSourceUrl: "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001735556&type=20-F",
    avgDailyVolume: 3_000_000,
    sharesForMnav: 1_500_000,  // Post 1:60 reverse split Jan 20, 2026 (was 88.6M -> 1.5M)
    sharesSourceUrl: "/filings/btog/0001104659-25-105009",
    sharesAsOf: "2026-01-20",
    sharesSource: "SEC 6-K Jan 20, 2026 (1:60 reverse split)",
    sharesSourceQuote: "SEC 6-K Jan 20, 2026 (1:60 reverse split)",
    totalDebt: 16_338_506,  // $10M Series A-1 + $5M Series B-1 + $1.34M Series C-1 convertible notes
    debtSource: "SEC 20-F Oct 31, 2025 + 6-K Jan 20, 2026 (convertible notes)",
    debtSourceQuote: "SEC 20-F Oct 31, 2025 + 6-K Jan 20, 2026 (convertible notes)",
    debtSourceUrl: "/filings/btog/0001104659-25-105009",
    debtAsOf: "2026-01-20",
    cashReserves: 56_000,  // Yahoo Finance Total Cash (mrq): $55.64k
    cashSource: "Yahoo Finance",
    cashSourceQuote: "Total Cash (mrq): $55.64K (Yahoo Finance, sourced from 20-F FY2025)",
    cashSourceUrl: "/filings/btog/0001104659-25-105009",
    cashAsOf: "2025-06-30",
    secCik: "0001735556",
    leader: "Jinghai Jiang (CEO)",
    strategy: "Quarterly DOGE acquisitions via $500M facility.",
    notes: "Nasdaq listed. 1:60 reverse split Jan 20, 2026. $16.3M convertible debt outstanding. Audit note 2026-03-05: lock metadata re-anchored to SEC 6-K/legal channel and cash normalized to D1/XBRL value ($55,639). Data quality classification: LEGAL_MATCH for shares; holdings are legal-channel anchored but not yet mapped to a single exhibit-level quote URL in-repo.",
  },
];

// AVAX DAT Companies
export const avaxCompanies: Company[] = [
  {
    id: "avx",
    name: "AVAX One Technology",
    ticker: "AVX",
    country: "US",
    jurisdiction: "US",
    authoritativeSource: "SEC EDGAR",
    exchangeMic: "XNAS",
    asset: "AVAX",
    tier: 1,
    holdings: 13_889_000,  // Dashboard (SEC-referenced in 8-K filings)
    holdingsLastUpdated: "2026-02-12",
    holdingsSource: "company-dashboard",  // PIPE closed after Q3 10-Q; dashboard is primary until 10-K
    holdingsSourceUrl: "https://analytics-avaxone.theblueprint.xyz/",
    accessionNumber: "AVX-DASHBOARD",
    sourceType: "company-dashboard",
    sourceQuote: "13,889,000 AVAX held",
    secReferenced: true,  // Dashboard referenced in SEC 8-K filings
    totalDebt: 1_841_100,  // SEC 10-Q Sep 30 XBRL/D1 canonical debt datapoint
    debtSource: "SEC 10-Q Q3 2025: Debentures + LongTermDebt + LoanPayable",
    debtSourceQuote: "SEC 10-Q Q3 2025: Debentures + LongTermDebt + LoanPayable",
    debtSourceUrl: "/filings/avx/0001493152-25-023464",
    debtAsOf: "2025-09-30",
    cashReserves: 894_701,  // ⚠️ Pre-PIPE figure from 10-Q Sep 30, 2025. $145M+ PIPE cash received Nov 5, 2025. Actual balance pending 10-K (~March 2026).
    cashAsOf: "2025-09-30",
    cashSource: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceQuote: "SEC 10-Q Q3 2025 XBRL: CashAndCashEquivalentsAtCarryingValue",
    cashSourceUrl: "/filings/avx/0001493152-25-023464",
    datStartDate: "2025-11-05",  // PIPE closed Nov 5, 2025 (name change from AgriFORCE)
    stakingPct: 0.90,  // "more than 90% of AVAX holdings staked"
    stakingApy: 0.08,
    stakingSource: "SEC 8-K Jan 28, 2026",
    stakingAsOf: "2026-01-28",
    quarterlyBurnUsd: 186_167,  // Exact from XBRL
    burnSource: "SEC 10-Q Q3 2025 XBRL: GeneralAndAdministrativeExpense $186,167",
    burnSourceUrl: "/filings/avx/0001493152-25-023464",
    burnAsOf: "2025-09-30",
    capitalRaisedAtm: 100_000_000,  // S-3 shelf filed Feb 9, 2026
    capitalRaisedAtmSource: "SEC S-3 shelf registration (Feb 9, 2026)",
    capitalRaisedAtmSourceUrl: "/filings/avx/0001493152-26-005802",
    capitalRaisedPipe: 219_042_206,  // $219M PIPE Nov 2025 ($145.4M cash + $73.7M AVAX)
    avgDailyVolume: 15_000_000,
    sharesForMnav: 90_688_765,  // 93,112,148 post-PIPE minus 2,423,383 buybacks as of Mar 5, 2026
    sharesAsOf: "2026-03-05",
    sharesSource: "Mar 2, 2026 Strategic Update: 2,423,383 shares repurchased total",
    sharesSourceQuote: "Mar 2, 2026 Strategic Update: 2,423,383 shares repurchased total",
    sharesSourceUrl: "https://www.avax-one.com/news",
    secCik: "0001826397",
    website: "https://www.avax-one.com",
    twitter: "avax_one",
    strategy: "First publicly traded AVAX treasury. Staking + validator infra + fintech M&A.",
    notes: "Nasdaq listed. 13.8M AVAX held. Projects ~180,000 AVAX in Q1 2026 staking rewards. $40M buyback (2.4M shares executed). Hivemind Capital asset manager. Anthony Scaramucci as advisor.",
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
    country: "US",
    jurisdiction: "CA",
    authoritativeSource: "SEDAR+",
    exchangeMic: "XNAS",
    secCik: "0001905459",  // Only Form D filings - Canadian company files with SEDAR+
    sedarProfile: "000044016",
    cusip: "45258G",
    isin: "CA45258G3061",
    asset: "HBAR",
    tier: 2,  // Micro-cap ($10M), sparse disclosures — downgraded from tier 1
    website: "https://www.immutableholdings.com",
    twitter: "https://x.com/ImmutableHold",
    investorRelationsUrl: "https://www.immutableholdings.com/investors",
    holdings: 48_000_000,
    holdingsLastUpdated: "2025-12-31",
    holdingsSource: "regulatory-filing",
    holdingsSourceUrl: "https://www.sedarplus.ca/csa-party/records/recordsForIssuerProfile.html?profileNo=000044016",
    sourceQuote: "Q4 2025 SEDAR+ filing: 48,000,000 HBAR",
    sourceType: "regulatory-filing",
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
    sharesSourceQuote: "SEDAR+ Q3 2025 Interim MD&A",
    sharesSourceUrl: "https://www.sedarplus.ca/csa-party/viewInstance/resource.html?node=W1084&drmKey=1ad315a0899e6f02",
    sharesAsOf: "2025-09-30",
    leader: "Melyssa Charlton (CEO)",  // Jordan Fried was previous CEO
    strategy: "HBAR treasury via Immutable Asset Management subsidiary.",
    notes: "CBOE Canada: HOLD | OTCQB: IHLDF. Canadian company (BC), files with SEDAR+. Owns NFT.com, HBAR Labs, MyHBARWallet. Audit note 2026-03-05: holdings/shares anchors normalized to Q4 2025 SEDAR+ snapshot (48M HBAR; 65M shares) to match canonical D1 latest.",
  },
];

function inferJurisdiction(company: Company): Jurisdiction {
  const ticker = company.ticker.toUpperCase();
  const country = (company.country || "").toUpperCase();

  if (ticker.endsWith(".T")) return "JP";
  if (ticker.endsWith(".TO") || ticker.endsWith(".V")) return "CA";
  if (ticker.endsWith(".HK")) return "HK";
  if (ticker.endsWith(".AX")) return "AU";

  if (country === "US") return "US";
  if (country === "JP") return "JP";
  if (country === "CA") return "CA";
  if (country === "HK") return "HK";
  if (country === "AU") return "AU";
  if (country === "DE" || country === "FR" || country === "IT" || country === "ES" || country === "PT" || country === "NL" || country === "BE" || country === "SE" || country === "NO" || country === "DK" || country === "FI" || country === "PL" || country === "IE" || country === "AT" || country === "CH") {
    return "EU";
  }

  return "OTHER";
}

function withJurisdiction(companies: Company[]): Company[] {
  return companies.map((company) => ({
    ...company,
    jurisdiction: company.jurisdiction ?? inferJurisdiction(company),
  }));
}

// All companies combined
const allCompaniesRaw: Company[] = [
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
export const allCompanies: Company[] = withJurisdiction(allCompaniesRaw);

// Get company by ticker
export function getCompanyByTicker(ticker: string): Company | undefined {
  return allCompanies.find(c => c.ticker.toLowerCase() === ticker.toLowerCase());
}

// Get companies by asset
export function getCompaniesByAsset(asset: string): Company[] {
  return allCompanies.filter(c => c.asset === asset);
}
