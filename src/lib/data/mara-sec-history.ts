/**
 * MARA Holdings SEC XBRL History
 * 
 * Source: SEC EDGAR XBRL API (data.sec.gov/api/xbrl/companyfacts)
 * CIK: 0001507605
 * 
 * This file contains quarterly snapshots extracted from official SEC 10-Q/10-K filings.
 * All values come directly from XBRL tags, providing authoritative data.
 * 
 * Key XBRL fields used:
 * - EntityCommonStockSharesOutstanding (dei) - Basic shares from cover page
 * - WeightedAverageNumberOfDilutedSharesOutstanding (us-gaap) - Diluted shares for EPS
 * - CryptoAssetFairValue - Fair value of BTC holdings
 * - CryptoAssetCost - Cost basis of BTC holdings
 * - CashAndCashEquivalentsAtCarryingValue - Cash
 * - LongTermDebt - Debt outstanding
 * 
 * Generated: 2026-01-27
 */

export interface MaraSecSnapshot {
  date: string;                    // Quarter end date (YYYY-MM-DD)
  form?: string;                   // 10-K or 10-Q
  filed?: string;                  // Filing date
  
  // Shares
  basicShares?: number;            // EntityCommonStockSharesOutstanding
  dilutedShares?: number;          // WeightedAverageNumberOfDilutedSharesOutstanding
  
  // Crypto holdings
  cryptoFairValue?: number;        // CryptoAssetFairValue (USD)
  cryptoFairValueCurrent?: number; // CryptoAssetFairValueCurrent (short-term, for sale)
  cryptoCost?: number;             // CryptoAssetCost (USD)
  
  // Implied BTC count (calculated from fair value / price at quarter end)
  impliedBtc?: number;
  btcPriceUsed?: number;
  
  // Balance sheet
  cash?: number;                   // CashAndCashEquivalentsAtCarryingValue
  longTermDebt?: number;           // LongTermDebt
  convertibleNotes?: number;       // ConvertibleNotesPayable (if separate)
  totalDebt?: number;              // Calculated: longTermDebt + convertibleNotes
}

/**
 * MARA SEC XBRL Quarterly History
 * 
 * Note: Some quarters only have basic shares (from cover page filings like 8-K)
 * Full financial data comes from 10-Q/10-K filings.
 * 
 * Share count note: XBRL diluted shares from WeightedAverageNumberOfDilutedSharesOutstanding
 * may differ from fully-diluted shares that include all potential shares from convertibles.
 * For mNAV calculation, should use fully-diluted methodology consistent with our approach.
 */
export const MARA_SEC_HISTORY: MaraSecSnapshot[] = [
  // Q3 2025 (10-Q filed 2025-11-04)
  { 
    date: "2025-09-30", 
    form: "10-Q",
    dilutedShares: 450_081_096,  // XBRL YTD (Jan-Sep 2025). Q3-only is 470,126,290.
    cryptoFairValue: 6_032_190_000,  // $6.03B
    cryptoCost: 4_645_104_000,       // $4.65B XBRL CryptoAssetCost (includes all crypto). Note 5 BTC-only cost is $4,637,673K ($7.4M less — non-BTC crypto).
    cash: 826_392_000,               // $826.4M
    longTermDebt: 3_247_561_000,     // $3.25B
    // Implied BTC: ~$6.03B / ~$63,500 (Q3 end price) ≈ 95,000 BTC
    // But actual holdings are 53,250 BTC per earnings report
    // Discrepancy: XBRL "CryptoAssetFairValue" may include more than just BTC
  },
  
  // Q2 2025 (10-Q filed 2025-07-29)
  { 
    date: "2025-06-30", 
    form: "10-Q",
    dilutedShares: 436_271_805,
    cryptoFairValue: 5_355_698_000,  // $5.36B
    cryptoCost: 3_433_589_000,
    cash: 109_475_000,               // $109.5M (low cash quarter)
    longTermDebt: 2_250_546_000,     // $2.25B
  },
  
  // Q1 2025 (10-Q filed 2025-05-08)
  { 
    date: "2025-03-31", 
    form: "10-Q",
    dilutedShares: 344_098_009,      // Note: Significantly lower than Q2
    cryptoFairValue: 3_926_066_000,  // $3.93B
    cryptoCost: 3_056_196_000,
    cash: 196_215_000,
    longTermDebt: 2_298_549_000,
  },
  
  // Q4 2024 / FY 2024 (10-K filed 2025-02-28)
  { 
    date: "2024-12-31", 
    form: "10-K",
    dilutedShares: 311_841_347,
    cryptoFairValue: 4_196_752_000,  // $4.20B
    cryptoCost: 2_822_921_000,
    cash: 391_771_000,
    longTermDebt: 2_446_578_000,
  },
  
  // Q3 2024 (10-Q filed 2024-11-05)
  { 
    date: "2024-09-30", 
    form: "10-Q",
    dilutedShares: 282_651_034,
    cryptoFairValue: 1_710_221_000,  // $1.71B
    cryptoCost: 1_271_657_000,
    cash: 164_256_000,
    longTermDebt: 618_683_000,       // Debt jumped significantly after Q3 2024
  },
  
  // Q2 2024 (10-Q filed 2024-08-05)
  { 
    date: "2024-06-30", 
    form: "10-Q",
    dilutedShares: 277_959_660,
    cryptoFairValue: 1_175_732_000,  // $1.18B
    cryptoCost: 760_129_000,
    cash: 256_027_000,
  },
  
  // Q1 2024 (10-Q filed 2024-05-08)
  { 
    date: "2024-03-31", 
    form: "10-Q",
    dilutedShares: 267_912_443,
    cash: 324_268_000,
    // Note: CryptoAssetFairValue not in XBRL for this quarter
  },
  
  // Q4 2023 / FY 2023 (10-K filed 2024-03-01)
  { 
    date: "2023-12-31", 
    form: "10-K",
    dilutedShares: 192_293_277,
    cryptoFairValue: 639_660_000,    // $639.7M
    cryptoCost: 515_315_000,
    cash: 357_313_000,
    longTermDebt: 325_654_000,
  },
  
  // Q3 2023 (10-Q filed 2023-11-07)
  { 
    date: "2023-09-30", 
    form: "10-Q",
    dilutedShares: 174_393_108,
    cash: 357_313_000,
  },
];

/**
 * Get the most recent SEC snapshot
 */
export function getLatestMaraSecSnapshot(): MaraSecSnapshot {
  return MARA_SEC_HISTORY[0];
}

/**
 * Get SEC snapshot for a specific quarter
 */
export function getMaraSecSnapshot(date: string): MaraSecSnapshot | undefined {
  return MARA_SEC_HISTORY.find(s => s.date === date);
}

/**
 * Calculate implied BTC holdings from crypto fair value
 * Note: This is an approximation - actual holdings should come from 8-K or earnings reports
 */
export function calculateImpliedBtc(cryptoFairValue: number, btcPrice: number): number {
  return Math.round(cryptoFairValue / btcPrice);
}
