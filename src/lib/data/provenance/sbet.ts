/**
 * SBET (Sharplink, Inc.) - Provenance-tracked data
 * 
 * Company renamed from "SharpLink Gaming, Inc." to "Sharplink, Inc." on Feb 3, 2026
 * 
 * ETH Treasury company - holds native ETH + LsETH (Lido staked ETH)
 * 
 * Every value traces back to an SEC filing.
 * 
 * LAST VERIFIED: 2026-02-11
 * LAST HOLDINGS UPDATE: 2025-12-17 (as of Dec 14, 2025)
 * NO HOLDINGS 8-Ks FILED IN JAN/FEB 2026
 */

import { pv, docSource, SECFilingType } from "../types/provenance";

// =============================================================================
// SEC IDENTIFIERS
// =============================================================================

export const SBET_CIK = "1981535";
export const SBET_TICKER = "SBET";

// =============================================================================
// ALL 8-K FILINGS (Complete list Jun 2025 - Feb 2026)
// =============================================================================

interface SECFiling {
  accession: string;
  formType: SECFilingType;
  filedDate: string;
  periodDate: string;
  items: string;
  url: string;
  hasHoldingsUpdate: boolean;
}

const SEC_FILINGS: Record<string, SECFiling> = {
  // =========================================================================
  // 2026 FILINGS
  // =========================================================================
  
  // Name change - NO holdings update
  name_change_feb_2026: {
    accession: "0001493152-26-004839",
    formType: "8-K",
    filedDate: "2026-02-03",
    periodDate: "2026-02-03",
    items: "5.03, 7.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315226004839/",
    hasHoldingsUpdate: false,
  },

  // =========================================================================
  // 2025 FILINGS (Dec → Jun, reverse chronological)
  // =========================================================================
  
  // Dec 17, 2025 - LATEST HOLDINGS UPDATE
  holdings_dec_2025: {
    accession: "0001493152-25-028063",
    formType: "8-K",
    filedDate: "2025-12-17",
    periodDate: "2025-12-14",
    items: "5.02, 5.03, 7.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225028063/",
    hasHoldingsUpdate: true,
  },

  // Nov 13, 2025 - Amended earnings (corrected holdings)
  holdings_nov_2025_amended: {
    accession: "0001493152-25-022065",
    formType: "8-K/A",
    filedDate: "2025-11-13",
    periodDate: "2025-11-09",
    items: "2.02, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225022065/",
    hasHoldingsUpdate: true,
  },

  // Nov 12, 2025 - Earnings (original)
  earnings_q3_2025: {
    accession: "0001493152-25-022012",
    formType: "8-K",
    filedDate: "2025-11-12",
    periodDate: "2025-11-09",
    items: "2.02, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225022012/",
    hasHoldingsUpdate: false,
  },

  // Q3 2025 10-Q
  q3_2025_10q: {
    accession: "0001493152-25-021970",
    formType: "10-Q",
    filedDate: "2025-11-12",
    periodDate: "2025-09-30",
    items: "10-Q",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/",
    hasHoldingsUpdate: true, // Has official quarter-end holdings
  },

  // Oct 28, 2025
  filing_oct_28_2025: {
    accession: "0001493152-25-019828",
    formType: "8-K",
    filedDate: "2025-10-28",
    periodDate: "2025-10-28",
    items: "8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225019828/",
    hasHoldingsUpdate: false,
  },

  // Oct 21, 2025 - Holdings update
  holdings_oct_2025: {
    accession: "0001493152-25-018731",
    formType: "8-K",
    filedDate: "2025-10-21",
    periodDate: "2025-10-19",
    items: "7.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225018731/",
    hasHoldingsUpdate: true,
  },

  // Oct 17, 2025
  filing_oct_17_2025: {
    accession: "0001493152-25-018379",
    formType: "8-K",
    filedDate: "2025-10-17",
    periodDate: "2025-10-17",
    items: "1.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225018379/",
    hasHoldingsUpdate: false,
  },

  // Sep 25, 2025 (2 filings)
  filing_sep_25_2025_a: {
    accession: "0001493152-25-014949",
    formType: "8-K",
    filedDate: "2025-09-25",
    periodDate: "2025-09-25",
    items: "5.03, 5.07, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225014949/",
    hasHoldingsUpdate: false,
  },
  filing_sep_25_2025_b: {
    accession: "0001493152-25-014866",
    formType: "8-K",
    filedDate: "2025-09-25",
    periodDate: "2025-09-25",
    items: "8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225014866/",
    hasHoldingsUpdate: false,
  },

  // Sep 16, 2025 - Holdings update
  holdings_sep_16_2025: {
    accession: "0001493152-25-013634",
    formType: "8-K",
    filedDate: "2025-09-16",
    periodDate: "2025-09-14",
    items: "7.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225013634/",
    hasHoldingsUpdate: true,
  },

  // Sep 9, 2025
  filing_sep_09_2025: {
    accession: "0001493152-25-012846",
    formType: "8-K",
    filedDate: "2025-09-09",
    periodDate: "2025-09-09",
    items: "7.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225012846/",
    hasHoldingsUpdate: false,
  },

  // Sep 2, 2025 - Holdings update (Aug 31 period)
  holdings_sep_02_2025: {
    accession: "0001493152-25-012518",
    formType: "8-K",
    filedDate: "2025-09-02",
    periodDate: "2025-08-31",
    items: "7.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225012518/",
    hasHoldingsUpdate: true,
  },

  // Aug 26, 2025 - Holdings update
  holdings_aug_26_2025: {
    accession: "0001641172-25-025469",
    formType: "8-K",
    filedDate: "2025-08-26",
    periodDate: "2025-08-24",
    items: "7.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225025469/",
    hasHoldingsUpdate: true,
  },

  // Aug 22, 2025 (2 filings)
  filing_aug_22_2025_a: {
    accession: "0001641172-25-025235",
    formType: "8-K",
    filedDate: "2025-08-22",
    periodDate: "2025-08-22",
    items: "5.02, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225025235/",
    hasHoldingsUpdate: false,
  },
  filing_aug_22_2025_b: {
    accession: "0001641172-25-025218",
    formType: "8-K",
    filedDate: "2025-08-22",
    periodDate: "2025-08-22",
    items: "1.01, 7.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225025218/",
    hasHoldingsUpdate: false,
  },

  // Aug 20, 2025
  filing_aug_20_2025: {
    accession: "0001641172-25-024925",
    formType: "8-K",
    filedDate: "2025-08-20",
    periodDate: "2025-08-20",
    items: "1.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225024925/",
    hasHoldingsUpdate: false,
  },

  // Aug 19, 2025 - Holdings update
  holdings_aug_19_2025: {
    accession: "0001641172-25-024734",
    formType: "8-K",
    filedDate: "2025-08-19",
    periodDate: "2025-08-17",
    items: "7.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225024734/",
    hasHoldingsUpdate: true,
  },

  // Aug 15, 2025 - Q2 Earnings
  earnings_q2_2025: {
    accession: "0001641172-25-024278",
    formType: "8-K",
    filedDate: "2025-08-15",
    periodDate: "2025-08-13",
    items: "2.02, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225024278/",
    hasHoldingsUpdate: false,
  },

  // Aug 12, 2025 - Holdings update
  holdings_aug_12_2025: {
    accession: "0001641172-25-023115",
    formType: "8-K",
    filedDate: "2025-08-12",
    periodDate: "2025-08-10",
    items: "1.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225023115/",
    hasHoldingsUpdate: true,
  },

  // Aug 8, 2025
  filing_aug_08_2025: {
    accession: "0001641172-25-022680",
    formType: "8-K",
    filedDate: "2025-08-08",
    periodDate: "2025-08-08",
    items: "1.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225022680/",
    hasHoldingsUpdate: false,
  },

  // Aug 5, 2025 - Holdings update
  holdings_aug_05_2025: {
    accession: "0001641172-25-022149",
    formType: "8-K",
    filedDate: "2025-08-05",
    periodDate: "2025-08-03",
    items: "7.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225022149/",
    hasHoldingsUpdate: true,
  },

  // Jul 29, 2025 - Holdings update
  holdings_jul_29_2025: {
    accession: "0001641172-25-021266",
    formType: "8-K",
    filedDate: "2025-07-29",
    periodDate: "2025-07-27",
    items: "7.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225021266/",
    hasHoldingsUpdate: true,
  },

  // Jul 28, 2025 - Amendment
  filing_jul_28_2025: {
    accession: "0001641172-25-021111",
    formType: "8-K/A",
    filedDate: "2025-07-28",
    periodDate: "2025-07-28",
    items: "5.07",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225021111/",
    hasHoldingsUpdate: false,
  },

  // Jul 25, 2025 (2 filings)
  filing_jul_25_2025_a: {
    accession: "0001641172-25-020953",
    formType: "8-K",
    filedDate: "2025-07-25",
    periodDate: "2025-07-25",
    items: "5.02, 5.03, 5.07, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225020953/",
    hasHoldingsUpdate: false,
  },
  filing_jul_25_2025_b: {
    accession: "0001641172-25-020947",
    formType: "8-K",
    filedDate: "2025-07-25",
    periodDate: "2025-07-25",
    items: "5.02, 7.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225020947/",
    hasHoldingsUpdate: false,
  },

  // Jul 22, 2025 - Holdings update
  holdings_jul_22_2025: {
    accession: "0001641172-25-020521",
    formType: "8-K",
    filedDate: "2025-07-22",
    periodDate: "2025-07-20",
    items: "7.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225020521/",
    hasHoldingsUpdate: true,
  },

  // Jul 17, 2025
  filing_jul_17_2025: {
    accession: "0001641172-25-020054",
    formType: "8-K",
    filedDate: "2025-07-17",
    periodDate: "2025-07-17",
    items: "1.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225020054/",
    hasHoldingsUpdate: false,
  },

  // Jul 15, 2025 - Holdings update
  holdings_jul_15_2025: {
    accession: "0001641172-25-019635",
    formType: "8-K",
    filedDate: "2025-07-15",
    periodDate: "2025-07-13",
    items: "7.01, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225019635/",
    hasHoldingsUpdate: true,
  },

  // Jul 11, 2025 - Ethereum Foundation purchase
  eth_foundation_jul_2025: {
    accession: "0001641172-25-018680",
    formType: "8-K",
    filedDate: "2025-07-11",
    periodDate: "2025-07-11",
    items: "1.01, 7.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225018680/",
    hasHoldingsUpdate: true,
  },

  // Jul 9, 2025
  filing_jul_09_2025: {
    accession: "0001641172-25-018312",
    formType: "8-K",
    filedDate: "2025-07-09",
    periodDate: "2025-07-09",
    items: "4.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225018312/",
    hasHoldingsUpdate: false,
  },

  // Jul 8, 2025 - Holdings update
  holdings_jul_08_2025: {
    accession: "0001641172-25-018094",
    formType: "8-K",
    filedDate: "2025-07-08",
    periodDate: "2025-07-04",
    items: "7.01, 8.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225018094/",
    hasHoldingsUpdate: true,
  },

  // Jul 1, 2025 - Holdings update (Jun 27 period)
  holdings_jul_01_2025: {
    accession: "0001641172-25-017278",
    formType: "8-K",
    filedDate: "2025-07-01",
    periodDate: "2025-06-27",
    items: "7.01, 8.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225017278/",
    hasHoldingsUpdate: true,
  },

  // Jun 24, 2025 - Holdings update
  holdings_jun_24_2025: {
    accession: "0001641172-25-016228",
    formType: "8-K",
    filedDate: "2025-06-24",
    periodDate: "2025-06-20",
    items: "7.01, 8.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225016228/",
    hasHoldingsUpdate: true,
  },

  // Jun 13, 2025 - First holdings update post-pivot
  holdings_jun_13_2025: {
    accession: "0001641172-25-014970",
    formType: "8-K",
    filedDate: "2025-06-13",
    periodDate: "2025-06-12",
    items: "7.01, 8.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225014970/",
    hasHoldingsUpdate: true,
  },

  // Jun 5, 2025 - Strategy launch announcement
  strategy_launch_jun_2025: {
    accession: "0001641172-25-013718",
    formType: "8-K",
    filedDate: "2025-06-05",
    periodDate: "2025-06-02",
    items: "8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225013718/",
    hasHoldingsUpdate: false,
  },

  // May 30, 2025 - DAT pivot announcement
  dat_pivot_may_2025: {
    accession: "0001641172-25-013081",
    formType: "8-K",
    filedDate: "2025-05-30",
    periodDate: "2025-05-30",
    items: "1.01, 3.02, 5.02, 8.01, 9.01",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225013081/",
    hasHoldingsUpdate: false,
  },
};

// Helper to create SEC document source reference
function secDoc(filing: SECFiling, quote: string, exhibit?: string, searchTerm?: string) {
  return docSource({
    type: "sec-document",
    cik: SBET_CIK,
    accession: filing.accession,
    filingType: filing.formType,
    filingDate: filing.filedDate,
    documentDate: filing.periodDate,
    url: filing.url + (exhibit || ""),
    quote,
    searchTerm, // Exact text to Ctrl+F in the document
  });
}

// =============================================================================
// CURRENT STATE (as of most recent filings)
// =============================================================================

export const SBET_PROVENANCE = {
  
  // ---------------------------------------------------------------------------
  // ETH HOLDINGS (from Dec 17, 2025 8-K, Ex 99.1)
  // Source: https://www.sec.gov/Archives/edgar/data/1981535/000149315225028063/ex99-1.htm
  // ---------------------------------------------------------------------------
  
  // Total ETH holdings (native + LsETH as-if-redeemed)
  holdings: pv(863_424, secDoc(
    SEC_FILINGS.holdings_dec_2025,
    "Accumulated 863,424 ETH¹... ¹As of December 14, 2025, total ETH holdings were comprised of 639,241 native ETH and 224,183 ETH as-if redeemed from LsETH",
    "ex99-1.htm",
    "863,424"  // Ctrl+F search term
  ), "Dec 14, 2025: 639,241 native + 224,183 LsETH"),

  // Breakdown: Native ETH
  holdingsNative: pv(639_241, secDoc(
    SEC_FILINGS.holdings_dec_2025,
    "639,241 native ETH",
    "ex99-1.htm",
    "639,241"
  ), "Native ETH held directly"),

  // Breakdown: LsETH (Lido staked ETH) as-if-redeemed
  holdingsLsETH: pv(224_183, secDoc(
    SEC_FILINGS.holdings_dec_2025,
    "224,183 ETH as-if redeemed from LsETH",
    "ex99-1.htm",
    "224,183"
  ), "Lido staked ETH, valued at redemption rate"),

  // Staking rewards earned
  stakingRewards: pv(9_241, secDoc(
    SEC_FILINGS.holdings_dec_2025,
    "earned 9,241 ETH² in staking rewards... ²As of December 14, 2025, total ETH rewards were comprised of 3,350 from native ETH and 5,891 from LsETH",
    "ex99-1.htm",
    "9,241"
  ), "3,350 native rewards + 5,891 LsETH rewards"),

  // ---------------------------------------------------------------------------
  // SHARES OUTSTANDING (from Q3 2025 10-Q XBRL)
  // Source: https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/form10-q.htm
  // ---------------------------------------------------------------------------
  
  sharesOutstanding: pv(196_693_191, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "196,693,191 shares of common stock outstanding as of November 12, 2025",
    "form10-q.htm",
    "196,693,191"
  ), "Basic shares as of Nov 12, 2025 (cover page)"),

  // ---------------------------------------------------------------------------
  // CASH & FINANCIALS (from Q3 2025 10-Q)
  // Source: https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/form10-q.htm
  // ---------------------------------------------------------------------------
  
  cashReserves: pv(11_100_000, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "Cash and cash equivalents $11,122,966",
    "form10-q.htm",
    "11,122,966"
  ), "Operating cash - not excess (restricted for operations)"),

  totalDebt: pv(0, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "Total debt $0 (Convertible promissory notes - related party were paid off)",
    "form10-q.htm",
    "Convertible promissory notes"
  ), "Debt-free as of Q3 2025"),

  // USDC stablecoins (treated as other investments, not cash)
  usdcHoldings: pv(26_700_000, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "Digital assets - stablecoins $26,749,285 (USDC)",
    "form10-q.htm",
    "26,749,285"
  ), "Stablecoin reserves"),

  // ---------------------------------------------------------------------------
  // COST BASIS (from Q3 2025 10-Q Balance Sheet)
  // Source: https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/form10-q.htm
  // Note: Q3 10-Q shows 817,747 ETH (580,841 native + 236,906 LsETH), cost basis is from that date
  // ---------------------------------------------------------------------------
  
  costBasisTotal: pv(3_022_327_258, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "Digital assets - native Ethereum, at cost $2,304,908,135 (580,841 units) + Digital assets - Lido staked Ethereum, at cost $717,419,123 (236,906 units)",
    "form10-q.htm",
    "2,304,908,135"
  ), "Total cost basis from Q3 2025 balance sheet (Sep 30, 2025 holdings)"),

  costBasisAvg: pv(3_696, secDoc(
    SEC_FILINGS.q3_2025_10q,
    "Calculated from balance sheet: ($2,304,908,135 + $717,419,123) / (580,841 + 236,906) = $3,696 per ETH",
    "form10-q.htm",
    "3,022,327,258"  // Sum of cost bases
  ), "Weighted average cost per ETH at Sep 30, 2025"),

};

// =============================================================================
// HOLDINGS HISTORY - Complete list with SEC accession numbers
// =============================================================================

export interface SBETHoldingsSnapshot {
  date: string;           // Period date (YYYY-MM-DD)
  filedDate: string;      // When 8-K was filed
  holdings: number;       // Total ETH (native + LsETH as-if-redeemed)
  holdingsNative?: number;    // Native ETH (when disclosed separately)
  holdingsLsETH?: number;     // LsETH as-if-redeemed (when disclosed)
  stakingRewards?: number;    // Cumulative staking rewards (when disclosed)
  accession: string;      // SEC accession number
  url: string;            // Direct link to filing
}

// All holdings snapshots from 8-K filings (Items 7.01, 8.01)
export const SBET_HOLDINGS_HISTORY: SBETHoldingsSnapshot[] = [
  // Dec 2025
  {
    date: "2025-12-14",
    filedDate: "2025-12-17",
    holdings: 863_424,
    holdingsNative: 639_241,
    holdingsLsETH: 224_183,
    stakingRewards: 9_241,
    accession: "0001493152-25-028063",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225028063/",
  },
  // Nov 2025 (corrected via 8-K/A)
  {
    date: "2025-11-09",
    filedDate: "2025-11-13",
    holdings: 861_251,
    holdingsNative: 637_752,
    holdingsLsETH: 223_499,
    accession: "0001493152-25-022065",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225022065/",
  },
  // Oct 2025
  {
    date: "2025-10-19",
    filedDate: "2025-10-21",
    holdings: 859_853,
    holdingsNative: 601_143,
    holdingsLsETH: 258_710,
    stakingRewards: 5_671,
    accession: "0001493152-25-018731",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225018731/",
  },
  // Q3 2025 10-Q (official quarter-end)
  {
    date: "2025-09-30",
    filedDate: "2025-11-12",
    holdings: 817_747,
    holdingsNative: 580_841,
    holdingsLsETH: 236_906,
    accession: "0001493152-25-021970",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225021970/",
  },
  // Sep 2025
  {
    date: "2025-09-14",
    filedDate: "2025-09-16",
    holdings: 838_152,
    stakingRewards: 3_240,
    accession: "0001493152-25-013634",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225013634/",
  },
  // Aug 2025
  {
    date: "2025-08-31",
    filedDate: "2025-09-02",
    holdings: 837_230,
    stakingRewards: 2_318,
    accession: "0001493152-25-012518",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000149315225012518/",
  },
  {
    date: "2025-08-24",
    filedDate: "2025-08-26",
    holdings: 797_704,
    stakingRewards: 1_799,
    accession: "0001641172-25-025469",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225025469/",
  },
  {
    date: "2025-08-17",
    filedDate: "2025-08-19",
    holdings: 740_760,
    accession: "0001641172-25-024734",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225024734/",
  },
  {
    date: "2025-08-10",
    filedDate: "2025-08-12",
    holdings: 598_800,
    accession: "0001641172-25-023115",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225023115/",
  },
  {
    date: "2025-08-03",
    filedDate: "2025-08-05",
    holdings: 521_939,
    accession: "0001641172-25-022149",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225022149/",
  },
  // Jul 2025
  {
    date: "2025-07-27",
    filedDate: "2025-07-29",
    holdings: 438_190,
    accession: "0001641172-25-021266",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225021266/",
  },
  {
    date: "2025-07-20",
    filedDate: "2025-07-22",
    holdings: 360_807,
    accession: "0001641172-25-020521",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225020521/",
  },
  {
    date: "2025-07-13",
    filedDate: "2025-07-15",
    holdings: 280_706,
    accession: "0001641172-25-019635",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225019635/",
  },
  // Jul 11 - Ethereum Foundation 10K ETH purchase
  {
    date: "2025-07-11",
    filedDate: "2025-07-11",
    holdings: 270_000, // Estimated - 10K ETH from EF added
    accession: "0001641172-25-018680",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225018680/",
  },
  {
    date: "2025-07-04",
    filedDate: "2025-07-08",
    holdings: 205_634,
    accession: "0001641172-25-018094",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225018094/",
  },
  // Jun 2025
  {
    date: "2025-06-27",
    filedDate: "2025-07-01",
    holdings: 198_167,
    accession: "0001641172-25-017278",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225017278/",
  },
  {
    date: "2025-06-20",
    filedDate: "2025-06-24",
    holdings: 188_478,
    accession: "0001641172-25-016228",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225016228/",
  },
  {
    date: "2025-06-12",
    filedDate: "2025-06-13",
    holdings: 176_270,
    accession: "0001641172-25-014970",
    url: "https://www.sec.gov/Archives/edgar/data/1981535/000164117225014970/",
  },
];

// =============================================================================
// COMPANY METADATA
// =============================================================================

export const SBET_METADATA = {
  name: "Sharplink, Inc.",
  formerName: "SharpLink Gaming, Inc.",
  nameChangeDate: "2026-02-03",
  nameChangeAccession: "0001493152-26-004839",
  
  datStartDate: "2025-06-02",
  datAnnouncementAccession: "0001641172-25-013081",
  
  stakingStrategy: {
    description: "Native staking + Lido LsETH (liquid staking)",
    stakingPct: 1.0,
    annualYield: 0.028,
  },
  
  leader: "Joseph Chalom",
  leaderTitle: "Chief Executive Officer",
  leaderBackground: "Former BlackRock executive",
  
  capitalPrograms: {
    atmCapacity: 2_000_000_000,
    buybackProgram: 1_500_000_000,
  },
  
  // Last verification
  lastVerified: "2026-02-11",
  lastHoldingsUpdate: "2025-12-17",
  nextExpectedUpdate: "Q4 2025 10-K (expected Mar 2026)",
};

// =============================================================================
// EXPORT HELPERS
// =============================================================================

export function getSBETCurrentHoldings() {
  return SBET_PROVENANCE.holdings.value;
}

export function getSBETCurrentShares() {
  return SBET_PROVENANCE.sharesOutstanding.value;
}

export function getSBETFilingsList() {
  return Object.values(SEC_FILINGS);
}

export function getSBETHoldingsFilings() {
  return Object.values(SEC_FILINGS).filter(f => f.hasHoldingsUpdate);
}
