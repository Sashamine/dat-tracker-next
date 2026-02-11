/**
 * SBET (Sharplink, Inc.) - Provenance-tracked data
 * 
 * Company renamed from "SharpLink Gaming, Inc." to "Sharplink, Inc." on Feb 3, 2026
 * 
 * ETH Treasury company - holds native ETH + LsETH (Lido staked ETH)
 * 
 * Every value traces back to an SEC filing.
 */

import { pv, docSource, SECFilingType } from "../types/provenance";

// =============================================================================
// SEC IDENTIFIERS
// =============================================================================

export const SBET_CIK = "1981535";
export const SBET_TICKER = "SBET";

// =============================================================================
// KEY SEC FILINGS
// =============================================================================

interface SECFiling {
  accession: string;
  formType: SECFilingType;
  filedDate: string;
  periodDate: string;
  url: string;
}

const SEC_FILINGS: Record<string, SECFiling> = {
  // Latest holdings update
  holdings_dec_2025: {
    accession: "0001493152-25-028063",
    formType: "8-K",
    filedDate: "2025-12-17",
    periodDate: "2025-12-14",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225028063/",
  },
  // Q3 2025 10-Q (shares, cash, financials)
  q3_2025_10q: {
    accession: "0001493152-25-021970",
    formType: "10-Q",
    filedDate: "2025-11-12",
    periodDate: "2025-09-30",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/",
  },
  // Name change
  name_change_2026: {
    accession: "0001493152-26-004839",
    formType: "8-K",
    filedDate: "2026-02-03",
    periodDate: "2026-02-03",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315226004839/",
  },
};

// Helper to create SEC document source reference
function secDoc(filing: SECFiling, quote: string, exhibit?: string) {
  return docSource({
    type: "sec-document",
    cik: SBET_CIK,
    accession: filing.accession,
    filingType: filing.formType,
    filingDate: filing.filedDate,
    documentDate: filing.periodDate,
    url: filing.url + (exhibit || ""),
    quote,
  });
}

// =============================================================================
// CURRENT STATE (as of most recent filings)
// =============================================================================

export const SBET_PROVENANCE = {
  
  // ---------------------------------------------------------------------------
  // ETH HOLDINGS (from Dec 17, 2025 8-K, Ex 99.1)
  // ---------------------------------------------------------------------------
  
  // Total ETH holdings (native + LsETH as-if-redeemed)
  holdings: pv(863_424, secDoc(
    SEC_FILINGS.holdings_dec_2025,
    "Accumulated 863,424 ETH¹... ¹As of December 14, 2025, total ETH holdings were comprised of 639,241 native ETH and 224,183 ETH as-if redeemed from LsETH",
    "ex99-1.htm"
  ), "Dec 14, 2025: 639,241 native + 224,183 LsETH"),

  // Breakdown: Native ETH
  holdingsNative: pv(639_241, secDoc(
    SEC_FILINGS.holdings_dec_2025,
    "639,241 native ETH",
    "ex99-1.htm"
  ), "Native ETH held directly"),

  // Breakdown: LsETH (Lido staked ETH) as-if-redeemed
  holdingsLsETH: pv(224_183, secDoc(
    SEC_FILINGS.holdings_dec_2025,
    "224,183 ETH as-if redeemed from LsETH",
    "ex99-1.htm"
  ), "Lido staked ETH, valued at redemption rate"),

  // Staking rewards earned
  stakingRewards: pv(9_241, secDoc(
    SEC_FILINGS.holdings_dec_2025,
    "earned 9,241 ETH² in staking rewards... ²As of December 14, 2025, total ETH rewards were comprised of 3,350 from native ETH and 5,891 from LsETH",
    "ex99-1.htm"
  ), "3,350 native rewards + 5,891 LsETH rewards"),

  // ---------------------------------------------------------------------------
  // SHARES OUTSTANDING (from Q3 2025 10-Q XBRL)
  // ---------------------------------------------------------------------------
  
  sharesOutstanding: pv(196_693_191, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "EntityCommonStockSharesOutstanding: 196,693,191",
    "form10-q.htm"
  ), "Basic shares as of Nov 12, 2025 (cover page)"),

  // ---------------------------------------------------------------------------
  // CASH & FINANCIALS (from Q3 2025 10-Q)
  // ---------------------------------------------------------------------------
  
  cashReserves: pv(11_100_000, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "Cash and cash equivalents: $11.1 million",
    "form10-q.htm"
  ), "Operating cash - not excess (restricted for operations)"),

  totalDebt: pv(0, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "No long-term debt outstanding",
    "form10-q.htm"
  ), "Debt-free as of Q3 2025"),

  // USDC stablecoins (treated as other investments, not cash)
  usdcHoldings: pv(26_700_000, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "Digital assets - stablecoins: $26.7 million USDC",
    "form10-q.htm"
  ), "Stablecoin reserves"),

  // ---------------------------------------------------------------------------
  // COST BASIS (from Q3 2025 10-Q)
  // ---------------------------------------------------------------------------
  
  // Cost basis calculated from Q3 10-Q balance sheet
  // Native ETH: $2,304,908,135 for 580,841 units = $3,968/ETH
  // LsETH: $717,419,123 for 236,906 units = $3,028/ETH
  // Total: $3,022,327,258 for 817,747 units = $3,696/ETH weighted avg
  costBasisTotal: pv(3_022_327_258, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "Native ETH $2,304,908,135 (580,841 units) + LsETH $717,419,123 (236,906 units)",
    "form10-q.htm"
  ), "Total cost basis from Q3 2025 balance sheet"),

  costBasisAvg: pv(3_696, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "Calculated: $3,022,327,258 / 817,747 ETH-equivalent units",
    "form10-q.htm"
  ), "Weighted average cost per ETH"),

};

// =============================================================================
// HOLDINGS HISTORY - ETH Acquisitions by Date
// =============================================================================

export interface SBETAcquisition {
  date: string;           // YYYY-MM-DD (period date from filing)
  filedDate: string;      // When the 8-K was filed
  ethAcquired: number;    // ETH acquired in this period
  runningTotal: number;   // Total ETH after this acquisition
  accession: string;      // SEC accession number
  source: string;         // Brief description
}

// Holdings snapshots from 8-K filings (Item 7.01 / 8.01)
// Traced from SEC filings Aug-Dec 2025
export const SBET_HOLDINGS_HISTORY: SBETAcquisition[] = [
  // Dec 2025 - Leadership transition, latest holdings
  {
    date: "2025-12-14",
    filedDate: "2025-12-17",
    ethAcquired: 3_571, // 863,424 - 859,853
    runningTotal: 863_424,
    accession: "0001493152-25-028063",
    source: "8-K Ex 99.1: 639,241 native + 224,183 LsETH",
  },
  // Oct 2025 - First filing with native/LsETH breakdown
  {
    date: "2025-10-19",
    filedDate: "2025-10-21",
    ethAcquired: 21_701, // 859,853 - 838,152
    runningTotal: 859_853,
    accession: "0001493152-25-018731",
    source: "8-K Ex 99.1: 601,143 native + 258,710 LsETH. Staking rewards: 5,671 cumulative",
  },
  // Sep 2025
  {
    date: "2025-09-14",
    filedDate: "2025-09-16",
    ethAcquired: 922, // 838,152 - 837,230
    runningTotal: 838_152,
    accession: "0001493152-25-013634",
    source: "8-K Ex 99.1: 838,152 ETH valued at $3.86B. Staking rewards: 3,240 cumulative",
  },
  // Aug 2025 - End of month
  {
    date: "2025-08-31",
    filedDate: "2025-09-02",
    ethAcquired: 39_526, // 837,230 - 797,704
    runningTotal: 837_230,
    accession: "0001493152-25-012518",
    source: "8-K Ex 99.1: 837,230 ETH valued at $3.6B. Staking rewards: 2,318 cumulative",
  },
  // Aug 2025 - Mid-month
  {
    date: "2025-08-24",
    filedDate: "2025-08-26",
    ethAcquired: 200_904, // 797,704 - ~596,800 (prior week)
    runningTotal: 797_704,
    accession: "0001641172-25-025469",
    source: "8-K Ex 99.1: 797,704 ETH valued at $3.7B. Staking rewards: 1,799 cumulative",
  },
];

// =============================================================================
// COMPANY METADATA
// =============================================================================

export const SBET_METADATA = {
  name: "Sharplink, Inc.",
  formerName: "SharpLink Gaming, Inc.",
  nameChangeDate: "2026-02-03",
  nameChangeSource: SEC_FILINGS.name_change_2026.url,
  
  datStartDate: "2025-06-02", // "formally launching its ETH treasury business on June 2, 2025"
  
  stakingStrategy: {
    description: "Native staking + Lido LsETH (liquid staking)",
    stakingPct: 1.0, // "nearly 100%" / "substantially all"
    annualYield: 0.028, // ~2.8% staking yield
  },
  
  leader: "Joseph Chalom",
  leaderTitle: "Chief Executive Officer",
  leaderBackground: "Former BlackRock executive",
  
  capitalPrograms: {
    atmCapacity: 2_000_000_000, // $2B S-3 shelf registration
    buybackProgram: 1_500_000_000, // $1.5B buyback authorization
  },
};

// =============================================================================
// EXPORT FOR USE IN COMPANY DATA
// =============================================================================

export function getSBETCurrentHoldings() {
  return SBET_PROVENANCE.holdings.value;
}

export function getSBETCurrentShares() {
  return SBET_PROVENANCE.sharesOutstanding.value;
}
