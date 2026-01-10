"use client";

import { useQuery } from "@tanstack/react-query";

interface CryptoPrice {
  price: number;
  change24h: number;
}

interface StockPrice {
  price: number;
  change24h: number;
  volume: number;
  marketCap: number;
  isAfterHours?: boolean;
  regularPrice?: number;
}

interface PricesData {
  crypto: Record<string, CryptoPrice>;
  stocks: Record<string, StockPrice>;
  timestamp: string;
  marketOpen?: boolean;
}

async function fetchPrices(): Promise<PricesData> {
  // Add cache-busting and no-cache headers
  const response = await fetch("/api/prices", {
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to fetch prices");
  }
  return response.json();
}

export function usePrices() {
  return useQuery({
    queryKey: ["prices"],
    queryFn: fetchPrices,
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 0, // Always consider data stale so refetch works
    gcTime: 10000, // Keep in cache for 10 seconds
    refetchOnWindowFocus: true,
    refetchIntervalInBackground: true, // Keep refetching even when tab is not focused
  });
}
