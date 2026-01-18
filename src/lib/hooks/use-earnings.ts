// Hook to fetch earnings data
import { useQuery } from "@tanstack/react-query";
import { EarningsCalendarEntry, TreasuryYieldMetrics, EarningsRecord, Asset, YieldPeriod } from "../types";

interface EarningsCalendarResponse {
  entries: EarningsCalendarEntry[];
  count: number;
}

interface YieldLeaderboardResponse {
  leaderboard: TreasuryYieldMetrics[];
  period: string;
  count: number;
}

interface CompanyEarningsResponse {
  earnings: EarningsRecord[];
  nextEarnings: EarningsRecord | null;
}

// Fetch earnings calendar
export function useEarningsCalendar(options?: {
  days?: number;
  asset?: Asset;
  upcoming?: boolean;
}) {
  const { days = 90, asset, upcoming = true } = options || {};

  return useQuery<EarningsCalendarResponse>({
    queryKey: ["earnings-calendar", days, asset, upcoming],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("days", String(days));
      if (asset) params.set("asset", asset);
      params.set("upcoming", String(upcoming));

      const res = await fetch(`/api/earnings?${params}`);
      if (!res.ok) throw new Error("Failed to fetch earnings calendar");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Fetch treasury yield leaderboard
export function useTreasuryYieldLeaderboard(options?: {
  period?: YieldPeriod;
  asset?: Asset;
}) {
  const { period = "1Y", asset } = options || {};

  return useQuery<YieldLeaderboardResponse>({
    queryKey: ["yield-leaderboard", period, asset],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("period", period);
      if (asset) params.set("asset", asset);

      const res = await fetch(`/api/earnings/yield-leaderboard?${params}`);
      if (!res.ok) throw new Error("Failed to fetch yield leaderboard");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Fetch earnings for a specific company
export function useCompanyEarnings(ticker: string) {
  return useQuery<CompanyEarningsResponse>({
    queryKey: ["company-earnings", ticker],
    queryFn: async () => {
      const res = await fetch(`/api/earnings/${ticker}`);
      if (!res.ok) throw new Error("Failed to fetch company earnings");
      return res.json();
    },
    enabled: !!ticker,
    staleTime: 5 * 60 * 1000,
  });
}
