"use client";

import { useQuery } from "@tanstack/react-query";
import { TimeRange, ChartInterval, DEFAULT_INTERVAL } from "./use-stock-history";
import { MSTR_DAILY_MNAV, type DailyMnavSnapshot } from "@/lib/data/mstr-daily-mnav";
import { getEffectiveSharesAt } from "@/lib/data/dilutive-instruments";

interface MnavDataPoint {
  time: string; // Unix timestamp (seconds) for intraday, YYYY-MM-DD for daily
  mnav: number;
  btcPrice: number;
  stockPrice: number;
  // Optional detailed data (only for daily pre-calculated)
  btcHoldings?: number;
  dilutedShares?: number;
  totalDebt?: number;
  btcPerShare?: number;
}

interface CryptoHistoryPoint {
  time: string;
  price: number;
}

interface StockHistoryPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Current MSTR capital structure (for intraday calculation)
// These values don't change intraday - from latest SEC filing + 8-K events
const MSTR_CURRENT_CAPITAL = {
  btcHoldings: 471_107, // As of Jan 2026 weekly 8-K
  basicShares: 295_025_000, // Q4 2025 estimated
  totalDebt: 7_270_600_000, // From capital structure
  preferredEquity: 1_615_000_000, // STRK + STRF + STRD + STRC + STRE
  cashAndEquivalents: 38_400_000,
};

// Align intraday timestamps to nearest interval
function alignTimestamps(
  btcData: CryptoHistoryPoint[],
  stockData: StockHistoryPoint[],
  intervalMs: number
): { time: string; btcPrice: number; stockPrice: number }[] {
  const result: { time: string; btcPrice: number; stockPrice: number }[] = [];

  // Create a map of stock prices by aligned timestamp
  const stockByTime = new Map<number, number>();
  for (const point of stockData) {
    const ts = parseInt(point.time) * 1000;
    const aligned = Math.floor(ts / intervalMs) * intervalMs;
    stockByTime.set(aligned, point.close);
  }

  // For each BTC price point, find matching stock price
  for (const btc of btcData) {
    const ts = parseInt(btc.time) * 1000;
    const aligned = Math.floor(ts / intervalMs) * intervalMs;

    // Find closest stock price (within interval)
    let stockPrice = stockByTime.get(aligned);
    if (!stockPrice) {
      // Try adjacent intervals
      stockPrice = stockByTime.get(aligned - intervalMs) || stockByTime.get(aligned + intervalMs);
    }

    if (stockPrice) {
      result.push({
        time: btc.time,
        btcPrice: btc.price,
        stockPrice,
      });
    }
  }

  return result;
}

// Calculate mNAV from prices and capital structure
function calculateIntradayMnav(
  btcPrice: number,
  stockPrice: number,
  capital: typeof MSTR_CURRENT_CAPITAL
): number {
  // Get diluted shares based on current stock price
  const effectiveShares = getEffectiveSharesAt(
    "MSTR",
    capital.basicShares,
    stockPrice,
    new Date().toISOString().split("T")[0]
  );

  const marketCap = effectiveShares.diluted * stockPrice;
  const enterpriseValue =
    marketCap + capital.totalDebt + capital.preferredEquity - capital.cashAndEquivalents;
  const cryptoNav = capital.btcHoldings * btcPrice;

  return cryptoNav > 0 ? enterpriseValue / cryptoNav : 0;
}

// Fetch intraday mNAV data
async function fetchIntradayMnav(
  range: TimeRange,
  interval: ChartInterval
): Promise<MnavDataPoint[]> {
  // Fetch BTC and MSTR prices in parallel
  const [btcRes, stockRes] = await Promise.all([
    fetch(`/api/crypto/BTC/history?range=${range}`),
    fetch(`/api/stocks/MSTR/history?range=${range}&interval=${interval}`),
  ]);

  if (!btcRes.ok || !stockRes.ok) {
    throw new Error("Failed to fetch price data");
  }

  const btcData: CryptoHistoryPoint[] = await btcRes.json();
  const stockData: StockHistoryPoint[] = await stockRes.json();

  if (btcData.length === 0 || stockData.length === 0) {
    return [];
  }

  // Interval in milliseconds for alignment
  const intervalMs =
    interval === "5m" ? 5 * 60 * 1000 :
    interval === "15m" ? 15 * 60 * 1000 :
    interval === "1h" ? 60 * 60 * 1000 :
    24 * 60 * 60 * 1000;

  // Align timestamps and pair prices
  const aligned = alignTimestamps(btcData, stockData, intervalMs);

  // Calculate mNAV for each point
  return aligned.map(({ time, btcPrice, stockPrice }) => ({
    time,
    btcPrice,
    stockPrice,
    mnav: calculateIntradayMnav(btcPrice, stockPrice, MSTR_CURRENT_CAPITAL),
  }));
}

// Get daily mNAV from pre-calculated data
function getDailyMnav(range: TimeRange): MnavDataPoint[] {
  const now = new Date();
  let startDate: Date;

  switch (range) {
    case "1y":
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      break;
    case "all":
      startDate = new Date("2020-01-01");
      break;
    default:
      startDate = new Date("2020-01-01");
  }

  return MSTR_DAILY_MNAV
    .filter((s) => new Date(s.date) >= startDate)
    .map((s) => ({
      time: s.date,
      mnav: s.mnav,
      btcPrice: s.btcPrice,
      stockPrice: s.stockPrice,
      btcHoldings: s.btcHoldings,
      dilutedShares: s.dilutedShares,
      totalDebt: s.totalDebt,
      btcPerShare: s.btcPerShare,
    }));
}

export function useMnavHistory(
  ticker: string,
  range: TimeRange,
  interval?: ChartInterval
) {
  const isMstr = ticker.toUpperCase() === "MSTR";
  const effectiveInterval = interval || DEFAULT_INTERVAL[range];

  // Use intraday calculation for short ranges, pre-calculated for long ranges
  const useIntraday = isMstr && (range === "1d" || range === "7d" || range === "1mo");

  return useQuery({
    queryKey: ["mnavHistory", ticker, range, effectiveInterval, useIntraday],
    queryFn: async (): Promise<MnavDataPoint[]> => {
      if (!isMstr) {
        // For non-MSTR companies, return empty (no intraday mNAV support yet)
        return [];
      }

      if (useIntraday) {
        return fetchIntradayMnav(range, effectiveInterval);
      } else {
        return getDailyMnav(range);
      }
    },
    staleTime: useIntraday ? 60 * 1000 : 5 * 60 * 1000, // 1 min for intraday, 5 min for daily
    enabled: isMstr,
  });
}

export type { MnavDataPoint };
