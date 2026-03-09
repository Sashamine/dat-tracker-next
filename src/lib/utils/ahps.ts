import type { Company } from "@/lib/types";
import {
  dilutiveInstruments,
  getEffectiveShares,
  getEffectiveSharesAt,
} from "@/lib/data/dilutive-instruments";
import { findSnapshotOnOrBefore } from "@/lib/utils/growth-snapshots";

export type AhpsMethod = "dilution-adjusted" | "basic-shares-only";

export interface AhpsHistoryEntry {
  date: string;
  holdings: number;
  sharesOutstanding: number;
  holdingsPerShare: number;
  stockPrice?: number;
}

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
  history?: AhpsHistoryEntry[];
  currentStockPrice?: number;
}

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

  return {
    ahps: holdings / result.diluted,
    diluted: result.diluted,
    adjusted: result.diluted !== basicShares,
  };
}

export function getCompanyAhpsMetrics({
  ticker,
  company,
  history,
  currentStockPrice,
}: AhpsInput): AhpsMetrics {
  const basicShares = company.sharesForMnav ?? 0;
  const holdings = company.holdings ?? 0;

  const current = computeAhpsAt(ticker, holdings, basicShares, currentStockPrice);
  const method: AhpsMethod = current.adjusted ? "dilution-adjusted" : "basic-shares-only";

  let ahpsGrowth90d: number | null = null;
  let ahpsGrowth90dAnnualized: number | null = null;

  if (history && history.length >= 2) {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Don't count the PIPE agreement: use datStartDate as the earliest valid baseline.
    // PIPE capital hits the balance sheet immediately, so the first post-datStartDate
    // snapshot is the true starting point. Growth before that is PIPE deployment, not
    // organic premium harvesting.
    const datStart = company.datStartDate ? new Date(company.datStartDate) : null;

    if (datStart && ninetyDaysAgo < datStart) {
      return {
        currentAhps: current.ahps,
        ahpsGrowth90d: null,
        ahpsGrowth90dAnnualized: null,
        method,
        usesAdjustedShares: current.adjusted,
        basicShares,
        dilutedShares: current.diluted,
        notes: current.adjusted
          ? `Dilution-adjusted (${dilutiveInstruments[ticker]?.length ?? 0} instruments tracked). Basic: ${basicShares.toLocaleString()}, diluted: ${current.diluted.toLocaleString()}.`
          : "AHPS growth not yet available — less than 90 days since DAT strategy started.",
      };
    }

    const snapshot90d = findSnapshotOnOrBefore(history, ninetyDaysAgo, {
      getDate: (snapshot) => snapshot.date,
      // No maxLagDays: carry-forward is correct. A baseline from 6 months ago
      // means nothing changed — company should show 0% growth, not "no data".
    });

    if (snapshot90d && snapshot90d.sharesOutstanding > 0) {
      const historicalPrice = snapshot90d.stockPrice ?? currentStockPrice;
      const past = computeAhpsAt(
        ticker,
        snapshot90d.holdings,
        snapshot90d.sharesOutstanding,
        historicalPrice,
        snapshot90d.date
      );

      if (past.ahps > 0 && current.ahps > 0) {
        ahpsGrowth90d = ((current.ahps - past.ahps) / past.ahps) * 100;

        const latestDate = company.holdingsLastUpdated
          ? new Date(company.holdingsLastUpdated)
          : now;
        const pastDate = new Date(snapshot90d.date);
        const daysBetween =
          (latestDate.getTime() - pastDate.getTime()) / (1000 * 60 * 60 * 24);

        if (daysBetween > 30) {
          const periodYears = daysBetween / 365.25;
          ahpsGrowth90dAnnualized =
            (Math.pow(current.ahps / past.ahps, 1 / periodYears) - 1) * 100;
        }
      }
    }
  }

  const hasInstruments = (dilutiveInstruments[ticker]?.length ?? 0) > 0;
  const instrumentCount = dilutiveInstruments[ticker]?.length ?? 0;
  const notes = current.adjusted
    ? `Dilution-adjusted (${instrumentCount} instruments tracked). Basic: ${basicShares.toLocaleString()}, diluted: ${current.diluted.toLocaleString()}.`
    : hasInstruments && !currentStockPrice
      ? `Has ${instrumentCount} dilutive instruments but no stock price available for ITM calc. Using basic shares.`
      : !hasInstruments
        ? "No dilutive instruments tracked. AHPS equals HPS."
        : "All instruments out of the money at the available stock price. AHPS equals HPS.";

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

export function getAhpsTimeSeries(
  ticker: string,
  history: AhpsHistoryEntry[],
  stockPrices?: Map<string, number>
): AhpsTimePoint[] {
  return history
    .filter((snapshot) => snapshot.holdings > 0 && snapshot.sharesOutstanding > 0)
    .map((snapshot) => {
      const price = stockPrices?.get(snapshot.date) ?? snapshot.stockPrice;
      const { ahps, diluted } = computeAhpsAt(
        ticker,
        snapshot.holdings,
        snapshot.sharesOutstanding,
        price,
        snapshot.date
      );

      return {
        date: snapshot.date,
        ahps,
        holdings: snapshot.holdings,
        basicShares: snapshot.sharesOutstanding,
        dilutedShares: diluted,
      };
    });
}
