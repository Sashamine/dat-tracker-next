"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTreasuryYieldLeaderboard } from "@/lib/hooks/use-earnings";
import { Asset } from "@/lib/types";
import { cn } from "@/lib/utils";

// Asset colors (matching data-table.tsx)
const assetColors: Record<string, string> = {
  ETH: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  BTC: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  SOL: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  HYPE: "bg-green-500/10 text-green-600 border-green-500/20",
  BNB: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  TAO: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  LINK: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  TRX: "bg-red-500/10 text-red-600 border-red-500/20",
  XRP: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  ZEC: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  LTC: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  SUI: "bg-sky-500/10 text-sky-600 border-sky-500/20",
  DOGE: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  AVAX: "bg-rose-500/10 text-rose-600 border-rose-500/20",
  ADA: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  HBAR: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

interface TreasuryYieldLeaderboardProps {
  period?: "QoQ" | "YTD" | "1Y";
  asset?: Asset;
  limit?: number;
  onPeriodChange?: (period: "QoQ" | "YTD" | "1Y") => void;
  className?: string;
}

export function TreasuryYieldLeaderboard({
  period = "1Y",
  asset,
  limit,
  onPeriodChange,
  className,
}: TreasuryYieldLeaderboardProps) {
  const router = useRouter();
  const { data, isLoading, error } = useTreasuryYieldLeaderboard({ period, asset });

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        {[...Array(limit || 10)].map((_, i) => (
          <div
            key={i}
            className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        Failed to load leaderboard
      </div>
    );
  }

  const leaderboard = limit ? data?.leaderboard.slice(0, limit) : data?.leaderboard;

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className={cn("text-center py-8 text-gray-500", className)}>
        No yield data available
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Period selector */}
      {onPeriodChange && (
        <div className="flex gap-2 mb-4">
          {(["QoQ", "YTD", "1Y"] as const).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "outline"}
              size="sm"
              onClick={() => onPeriodChange(p)}
              className="text-xs"
            >
              {p}
            </Button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Company</TableHead>
              <TableHead className="text-right">Growth</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Annualized</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaderboard.map((item) => (
              <TableRow
                key={item.ticker}
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={() => router.push(`/company/${item.ticker}`)}
              >
                <TableCell className="text-center font-medium text-gray-500">
                  {item.rank}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{item.ticker}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-xs", assetColors[item.asset])}
                    >
                      {item.asset}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-[150px]">
                    {item.companyName}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={cn(
                      "font-medium",
                      item.growthPct >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {item.growthPct >= 0 ? "+" : ""}
                    {item.growthPct.toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell className="text-right hidden sm:table-cell">
                  <span
                    className={cn(
                      "text-sm",
                      item.annualizedGrowthPct >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {item.annualizedGrowthPct >= 0 ? "+" : ""}
                    {item.annualizedGrowthPct.toFixed(1)}%
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
