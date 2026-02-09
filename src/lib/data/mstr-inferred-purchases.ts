/**
 * MSTR Inferred BTC Purchases
 * ============================
 * 
 * These purchases are NOT in separate 8-K filings.
 * They are inferred from cumulative totals jumping between filings.
 * 
 * Each entry shows:
 * - The "before" filing with its cumulative total
 * - The "after" filing with its new cumulative total  
 * - The inferred purchase = (after_cumulative - before_cumulative - reported_purchase)
 */

export interface InferredPurchase {
  inferredBtc: number;
  inferredCost: number;
  inferredAvgPrice: number;
  reasoning: string;
  beforeFiling: {
    date: string;
    cumulative: number;
    secUrl: string;
  };
  afterFiling: {
    date: string;
    cumulative: number;
    reported: number;
    secUrl: string;
  };
}

export const MSTR_INFERRED_PURCHASES: InferredPurchase[] = [
  {
    // Gap 1: Feb 2021 convertible note proceeds ($1.03B)
    inferredBtc: 19452,
    inferredCost: 1026000000,  // $2.186B - $1.145B - $15M
    inferredAvgPrice: 52750,
    reasoning: "Purchased with $1.03B proceeds from Feb 19, 2021 convertible note offering. No separate 8-K announced this purchase.",
    beforeFiling: {
      date: "2021-02-02",
      cumulative: 71079,
      secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312521025369/d67809d8k.htm",
    },
    afterFiling: {
      date: "2021-03-01",
      cumulative: 90859,
      reported: 328,
      secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312521062322/d139633d8k.htm",
    },
  },
  {
    // Gap 2: Mid-2021 purchase (likely from June 2021 offering)
    inferredBtc: 13006,
    inferredCost: 489000000,  // Estimated from avg prices at the time (~$37.6K)
    inferredAvgPrice: 37600,
    reasoning: "Purchased between May-Aug 2021. Likely from June 2021 senior secured notes ($500M). No separate 8-K announced this purchase.",
    beforeFiling: {
      date: "2021-05-18",
      cumulative: 92079,
      secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312521164617/d166462d8k.htm",
    },
    afterFiling: {
      date: "2021-08-24",
      cumulative: 108992,
      reported: 3907,
      secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312521254452/d223448d8k.htm",
    },
  },
  {
    // Gap 3: Late 2022 - Early 2023 
    inferredBtc: 2500,
    inferredCost: 42500000,  // Estimated ~$17K avg
    inferredAvgPrice: 17000,
    reasoning: "Small accumulation during bear market (Q4 2022 - Q1 2023). May have been disclosed in 10-K/10-Q rather than 8-K.",
    beforeFiling: {
      date: "2022-09-20",
      cumulative: 130000,
      secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312522247427/d401193d8k.htm",
    },
    afterFiling: {
      date: "2023-03-27",
      cumulative: 138955,
      reported: 6455,
      secUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312523080814/d456232d8k.htm",
    },
  },
];

// Totals
export const INFERRED_TOTAL_BTC = MSTR_INFERRED_PURCHASES.reduce((s, p) => s + p.inferredBtc, 0);
// = 34,958 BTC

export const INFERRED_TOTAL_COST = MSTR_INFERRED_PURCHASES.reduce((s, p) => s + p.inferredCost, 0);
// = ~$1.56B
