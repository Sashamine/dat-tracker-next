"use client";

import { useQuery } from "@tanstack/react-query";

export interface HistoricalPrice {
  time: string; // YYYY-MM-DD or Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeRange = "1d" | "7d" | "1mo" | "1y" | "all";
export type ChartInterval = "5m" | "15m" | "1h" | "1d";

// Valid intervals per time range (based on Yahoo Finance limits)
export const VALID_INTERVALS: Record<TimeRange, ChartInterval[]> = {
  "1d": ["5m", "15m", "1h"],      // Intraday only
  "7d": ["15m", "1h", "1d"],      // Mix of intraday and daily
  "1mo": ["1h", "1d"],            // Hourly or daily
  "1y": ["1d"],                   // Daily only
  "all": ["1d"],                  // Daily only
};

// Default interval per time range (optimized for readability)
export const DEFAULT_INTERVAL: Record<TimeRange, ChartInterval> = {
  "1d": "5m",   // 5-minute candles (~78 per trading day)
  "7d": "1h",   // Hourly candles (~45 per week)
  "1mo": "1d",  // Daily candles - avoids weekend/overnight gaps
  "1y": "1d",   // Daily candles
  "all": "1d",  // Daily candles
};

// Human-readable interval labels
export const INTERVAL_LABELS: Record<ChartInterval, string> = {
  "5m": "5min",
  "15m": "15min",
  "1h": "1hr",
  "1d": "1D",
};

async function fetchStockHistory(
  ticker: string,
  range: TimeRange,
  interval?: ChartInterval
): Promise<HistoricalPrice[]> {
  const params = new URLSearchParams({ range });
  if (interval) {
    params.set("interval", interval);
  }
  const response = await fetch(`/api/stocks/${ticker}/history?${params}`);
  if (!response.ok) {
    throw new Error("Failed to fetch stock history");
  }
  return response.json();
}

export function useStockHistory(
  ticker: string,
  range: TimeRange = "1y",
  interval?: ChartInterval
) {
  return useQuery({
    queryKey: ["stockHistory", ticker, range, interval],
    queryFn: () => fetchStockHistory(ticker, range, interval),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!ticker,
  });
}
