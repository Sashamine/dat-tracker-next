"use client";

import { useQuery } from "@tanstack/react-query";

export interface YesterdayMnavData {
  [ticker: string]: {
    mnav: number | null;
    stockPrice: number;
    cryptoPrice: number;
    date: string;
  };
}

/**
 * Fetch yesterday's mNAV for all companies.
 * Used to calculate actual 24h mNAV change (measured, not estimated).
 */
export function useYesterdayMnav() {
  return useQuery({
    queryKey: ["yesterdayMnav"],
    queryFn: async (): Promise<YesterdayMnavData> => {
      const res = await fetch("/api/mnav/yesterday");
      if (!res.ok) {
        throw new Error("Failed to fetch yesterday mNAV");
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}
