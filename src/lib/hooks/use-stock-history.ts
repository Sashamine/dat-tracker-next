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

async function fetchStockHistory(ticker: string): Promise<HistoricalPrice[]> {
  const response = await fetch(`/api/stocks/${ticker}/history`);
  if (!response.ok) {
    throw new Error("Failed to fetch stock history");
  }
  return response.json();
}

export function useStockHistory(ticker: string) {
  return useQuery({
    queryKey: ["stockHistory", ticker],
    queryFn: () => fetchStockHistory(ticker),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!ticker,
  });
}
