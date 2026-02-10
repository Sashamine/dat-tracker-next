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

// Valid intervals per time range (daily preferred for FMP reliability)
export const VALID_INTERVALS: Record<TimeRange, ChartInterval[]> = {
  "1d": ["1d"],                   // Daily (FMP)
  "7d": ["1d"],                   // Daily (FMP)
  "1mo": ["1d"],                  // Daily (FMP)
  "1y": ["1d"],                   // Daily (FMP)
  "all": ["1d"],                  // Daily (FMP)
};

// Default interval per time range (optimized for FMP compatibility)
export const DEFAULT_INTERVAL: Record<TimeRange, ChartInterval> = {
  "1d": "1d",   // Daily candles (FMP primary, intraday unreliable)
  "7d": "1d",   // Daily candles 
  "1mo": "1d",  // Daily candles
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
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000,   // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on tab switch
    retry: 1, // Only retry once on failure
    enabled: !!ticker,
  });
}
