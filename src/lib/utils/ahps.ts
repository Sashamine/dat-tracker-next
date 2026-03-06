/**
 * AHPS (Adjusted Holdings Per Share) Growth
 *
 * Core metric: crypto units / dilution-adjusted shares
 * Isolates management skill from crypto price movement.
 *
 * - Numerator: native crypto units (BTC, ETH, etc.) — NOT USD
 * - Denominator: basic shares + in-the-money dilutive instruments
 * - Crypto price has zero effect on this metric
 * - Positive: accretive purchases, buybacks, operating CF conversion
 * - Negative: dilution without matching accumulation, disposals
 * - Neutral: price appreciation, mNAV expansion
 *
 * For companies without dilutive instruments data, falls back to
 * basic shares (HPS). The `method` field indicates which was used.
 */

import type { Company } from "@/lib/types";
import type { HoldingsSnapshot } from "@/lib/data/holdings-history";
import {
  getEffectiveShares,
  getEffectiveSharesAt,
  dilutiveInstruments,
} from "@/lib/data/dilutive-instruments";

export type AhpsMethod = "dilution-adjusted" | "basic-shares-only";

export interface AhpsMetrics {
  currentAhps: number;
  ahpsGrowth90d: number | null;
  ahpsGrowth90dAnnualized: number | null;
  method: AhpsMethod;
  usesAdjustedShares: boolean;
  basicShares: number;
  dilutedShares: number;
  notes: string;
}

export interface AhpsTimePoint {
  date: string;
  ahps: number;
  holdings: number;
  basicShares: number;
  dilutedShares: number;
}

interface AhpsInput {
  ticker: string;
  company: Company;
  history?: HoldingsSnapshot[];
  currentStockPrice?: number;
}

/**
 * Compute AHPS at a single point in time.
 *
 * If stockPrice is provided and the company has dilutive instruments,
 * uses dilution-adjusted shares. Otherwise falls back to basic shares.
 */
function computeAhpsAt(
  ticker: string,
  holdings: number,
  basicShares: number,
  stockPrice: number | undefined,
  asOfDate?: string
): { ahps: number; diluted: number; adjusted: boolean } {
  if (basicShares <= 0 || holdings <= 0) {
    return { ahps: 0, diluted: basicShares, adjusted: false };
  }

  const hasInstruments = (dilutiveInstruments[ticker]?.length ?? 0) > 0;

  if (!hasInstruments || !stockPrice || stockPrice <= 0) {
    return {
      ahps: holdings / basicShares,
      diluted: basicShares,
      adjusted: false,
    };
  }

  const result = asOfDate
    ? getEffectiveSharesAt(ticker, basicShares, stockPrice, asOfDate)
    : getEffectiveShares(ticker, basicShares, stockPrice);

  const diluted = result.diluted;
  return {
    ahps: holdings / diluted,
    diluted,
    adjusted: diluted !== basicShares,
  };
}

/**
 * Find the closest snapshot on or before targetDate.
 */
function snapshotAtDate(
  history: HoldingsSnapshot[],
  targetDate: Date
): HoldingsSnapshot | null {
  const target = targetDate.toISOString().split("T")[0];
  let best: HoldingsSnapshot | null = null;
  for (const s of history) {
    if (s.date <= target) {
      if (!best || s.date > best.date) best = s;
    }
  }
  return best;
}

/**
 * Canonical AHPS metrics for a company.
 *
 * Reusable by homepage leaderboard, company page, and charts.
 * All inputs are synchronous — caller is responsible for fetching
 * history and stock prices before calling.
 */
export function getCompanyAhpsMetrics({
  ticker,
  company,
  history,
  currentStockPrice,
}: AhpsInput): AhpsMetrics {
  const basicShares = company.sharesForMnav ?? 0;
  const holdings = company.holdings ?? 0;

  // Current AHPS
  const current = computeAhpsAt(
    ticker,
    holdings,
    basicShares,
    currentStockPrice
  );

  const method: AhpsMethod = current.adjusted
    ? "dilution-adjusted"
    : "basic-shares-only";

  // 90-day growth
  let ahpsGrowth90d: number | null = null;
  let ahpsGrowth90dAnnualized: number | null = null;

  if (history && history.length >= 2) {
    const now = new Date();
    const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const snapshot90d = snapshotAtDate(history, d90);

    if (snapshot90d && snapshot90d.sharesOutstanding > 0) {
      // Use stock price from snapshot if available, else current price
      const historicalPrice = snapshot90d.stockPrice ?? currentStockPrice;

      const past = computeAhpsAt(
        ticker,
        snapshot90d.holdings,
        snapshot90d.sharesOutstanding,
        historicalPrice,
        snapshot90d.date
      );

      if (past.ahps > 0 && current.ahps > 0) {
        ahpsGrowth90d =
          ((current.ahps - past.ahps) / past.ahps) * 100;

        // Annualize: figure out actual days between snapshots
        const latestDate = company.holdingsLastUpdated
          ? new Date(company.holdingsLastUpdated)
          : now;
        const pastDate = new Date(snapshot90d.date);
        const daysBetween =
          (latestDate.getTime() - pastDate.getTime()) /
          (1000 * 60 * 60 * 24);

        if (daysBetween > 30) {
          const periodYears = daysBetween / 365.25;
          ahpsGrowth90dAnnualized =
            (Math.pow(current.ahps / past.ahps, 1 / periodYears) - 1) *
            100;
        }
      }
    }
  }

  // Build notes
  const hasInstruments = (dilutiveInstruments[ticker]?.length ?? 0) > 0;
  const instrumentCount = dilutiveInstruments[ticker]?.length ?? 0;
  const notes = current.adjusted
    ? `Dilution-adjusted (${instrumentCount} instruments tracked). ` +
      `Basic: ${basicShares.toLocaleString()}, Diluted: ${current.diluted.toLocaleString()}.`
    : hasInstruments && !currentStockPrice
      ? `Has ${instrumentCount} dilutive instruments but no stock price available for ITM calc. Using basic shares.`
      : !hasInstruments
        ? "No dilutive instruments tracked. AHPS equals HPS."
        : "All instruments out-of-the-money. AHPS equals HPS.";

  return {
    currentAhps: current.ahps,
    ahpsGrowth90d,
    ahpsGrowth90dAnnualized,
    method,
    usesAdjustedShares: current.adjusted,
    basicShares,
    dilutedShares: current.diluted,
    notes,
  };
}

/**
 * Compute AHPS time series from holdings history.
 *
 * For each snapshot, computes AHPS using dilution-adjusted shares
 * when stock price data is available.
 */
export function getAhpsTimeSeries(
  ticker: string,
  history: HoldingsSnapshot[],
  stockPrices?: Map<string, number>
): AhpsTimePoint[] {
  return history
    .filter((s) => s.holdings > 0 && s.sharesOutstanding > 0)
    .map((s) => {
      const price = stockPrices?.get(s.date) ?? s.stockPrice;
      const { ahps, diluted } = computeAhpsAt(
        ticker,
        s.holdings,
        s.sharesOutstanding,
        price,
        s.date
      );
      return {
        date: s.date,
        ahps,
        holdings: s.holdings,
        basicShares: s.sharesOutstanding,
        dilutedShares: diluted,
      };
    });
}
