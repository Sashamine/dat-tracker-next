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
// Build this by tracing each 8-K with holdings disclosures
export const SBET_HOLDINGS_HISTORY: SBETAcquisition[] = [
  // Latest - Dec 2025
  {
    date: "2025-12-14",
    filedDate: "2025-12-17",
    ethAcquired: 0, // This was a leadership change filing, total disclosed
    runningTotal: 863_424,
    accession: "0001493152-25-028063",
    source: "8-K Ex 99.1: 639,241 native + 224,183 LsETH",
  },
  // TODO: Trace earlier 8-Ks to build complete acquisition history
  // Key filings to check:
  // - 2025-10-28: Items 8.01, 9.01
  // - 2025-10-21: Items 7.01, 8.01, 9.01
  // - 2025-10-17: Items 1.01, 8.01, 9.01
  // - 2025-09-25: Items 5.03, 5.07, 9.01
  // - 2025-09-25: Items 8.01, 9.01
  // - 2025-09-16: Items 7.01, 8.01, 9.01
  // - 2025-09-09: Items 8.01, 9.01
  // - 2025-09-02: Items 8.01, 9.01
  // - 2025-08-26: Items 8.01, 9.01
  // - 2025-08-22: Multiple 8-Ks
  // - 2025-08-19/20: Multiple 8-Ks (early acquisitions)
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
