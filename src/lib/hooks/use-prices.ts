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
}

interface PricesData {
  crypto: Record<string, CryptoPrice>;
  stocks: Record<string, StockPrice>;
  timestamp: string;
}

async function fetchPrices(): Promise<PricesData> {
  const response = await fetch("/api/prices");
  if (!response.ok) {
    throw new Error("Failed to fetch prices");
  }
  return response.json();
}

export function usePrices() {
  return useQuery({
    queryKey: ["prices"],
    queryFn: fetchPrices,
    refetchInterval: 5000, // Poll every 5 seconds for snappy updates
    staleTime: 3000, // Consider data stale after 3 seconds
    placeholderData: (previousData) => previousData, // Keep previous data while fetching (zero flicker!)
  });
}
