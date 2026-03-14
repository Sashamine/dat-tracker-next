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

export interface AhpsGrowthPeriod {
  days: number;
  growth: number | null;
  annualized: number | null;
  startDate?: string;
  startAhps?: number;
}

export interface AhpsMetrics {
  currentAhps: number;
  ahpsGrowth90d: number | null;
  ahpsGrowth90dAnnualized: number | null;
  /** Multi-period growth keyed by days (30, 90, 365, etc.) */
  periods: Record<number, AhpsGrowthPeriod>;
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
  /** Which lookback periods to compute (default: [90]) */
  lookbackDays?: number[];
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
  lookbackDays = [90],
}: AhpsInput): AhpsMetrics {
  const basicShares = company.sharesForMnav ?? 0;
  const holdings = company.holdings ?? 0;

  const current = computeAhpsAt(ticker, holdings, basicShares, currentStockPrice);
  const method: AhpsMethod = current.adjusted ? "dilution-adjusted" : "basic-shares-only";

  const hasInstruments = (dilutiveInstruments[ticker]?.length ?? 0) > 0;
  const instrumentCount = dilutiveInstruments[ticker]?.length ?? 0;
  const notes = current.adjusted
    ? `Dilution-adjusted (${instrumentCount} instruments tracked). Basic: ${basicShares.toLocaleString()}, diluted: ${current.diluted.toLocaleString()}.`
    : hasInstruments && !currentStockPrice
      ? `Has ${instrumentCount} dilutive instruments but no stock price available for ITM calc. Using basic shares.`
      : !hasInstruments
        ? "No dilutive instruments tracked. AHPS equals HPS."
        : "All instruments out of the money at the available stock price. AHPS equals HPS.";

  // Don't count the PIPE agreement: use datStartDate as the earliest valid baseline.
  const datStart = company.datStartDate ? new Date(company.datStartDate) : null;
  const now = new Date();

  const periods: Record<number, AhpsGrowthPeriod> = {};

  for (const days of lookbackDays) {
    const period: AhpsGrowthPeriod = { days, growth: null, annualized: null };
    periods[days] = period;

    if (!history || history.length < 2) continue;

    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Skip if DAT strategy started after the lookback window
    if (datStart && cutoff < datStart) continue;

    const snapshot = findSnapshotOnOrBefore(history, cutoff, {
      getDate: (s) => s.date,
      // No maxLagDays: carry-forward is correct. A baseline from further back
      // means nothing changed — company should show 0% growth, not "no data".
    });

    if (!snapshot || snapshot.sharesOutstanding <= 0) continue;

    const historicalPrice = snapshot.stockPrice ?? currentStockPrice;
    const past = computeAhpsAt(
      ticker,
      snapshot.holdings,
      snapshot.sharesOutstanding,
      historicalPrice,
      snapshot.date
    );

    if (past.ahps > 0 && current.ahps > 0) {
      period.growth = ((current.ahps - past.ahps) / past.ahps) * 100;
      period.startDate = snapshot.date;
      period.startAhps = past.ahps;

      const latestDate = company.holdingsLastUpdated
        ? new Date(company.holdingsLastUpdated)
        : now;
      const pastDate = new Date(snapshot.date);
      const daysBetween =
        (latestDate.getTime() - pastDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysBetween > 30) {
        const periodYears = daysBetween / 365.25;
        period.annualized =
          (Math.pow(current.ahps / past.ahps, 1 / periodYears) - 1) * 100;
      }
    }
  }

  // Backwards-compatible 90d fields
  const p90 = periods[90];

  return {
    currentAhps: current.ahps,
    ahpsGrowth90d: p90?.growth ?? null,
    ahpsGrowth90dAnnualized: p90?.annualized ?? null,
    periods,
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
