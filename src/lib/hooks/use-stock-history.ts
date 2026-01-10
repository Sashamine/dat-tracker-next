"use client";

import { useQuery } from "@tanstack/react-query";

export interface HistoricalPrice {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type TimeRange = "1d" | "7d" | "1mo" | "1y" | "all";

async function fetchStockHistory(ticker: string, range: TimeRange): Promise<HistoricalPrice[]> {
  const response = await fetch(`/api/stocks/${ticker}/history?range=${range}`);
  if (!response.ok) {
    throw new Error("Failed to fetch stock history");
  }
  return response.json();
}

export function useStockHistory(ticker: string, range: TimeRange = "1y") {
  return useQuery({
    queryKey: ["stockHistory", ticker, range],
    queryFn: () => fetchStockHistory(ticker, range),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!ticker,
  });
}
