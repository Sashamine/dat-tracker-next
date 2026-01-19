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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTreasuryYieldLeaderboard } from "@/lib/hooks/use-earnings";
import { Asset, CalendarQuarter } from "@/lib/types";
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

// Format quarter for display: "Q4-2025" -> "Q4 2025"
function formatQuarter(quarter: string): string {
  return quarter.replace("-", " ");
}

interface TreasuryYieldLeaderboardProps {
  quarter?: CalendarQuarter;
  asset?: Asset;
  limit?: number;
  onQuarterChange?: (quarter: CalendarQuarter) => void;
  className?: string;
}

export function TreasuryYieldLeaderboard({
  quarter,
  asset,
  limit,
  onQuarterChange,
  className,
}: TreasuryYieldLeaderboardProps) {
  const router = useRouter();

  // Fetch data - always quarterly now
  const { data, isLoading, error } = useTreasuryYieldLeaderboard({
    quarter: quarter || undefined,
    asset,
  });

  // Get the effective quarter (either selected or first available)
  const effectiveQuarter = quarter || data?.availableQuarters?.[0];
  const availableQuarters = data?.availableQuarters || [];

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

  return (
    <div className={className}>
      {/* Quarter selector */}
      {onQuarterChange && availableQuarters.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-500">Quarter:</span>
          <Select
            value={effectiveQuarter}
            onValueChange={(val) => onQuarterChange(val as CalendarQuarter)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select quarter" />
            </SelectTrigger>
            <SelectContent>
              {availableQuarters.map((q) => (
                <SelectItem key={q} value={q}>
                  {formatQuarter(q)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* No data message */}
      {(!leaderboard || leaderboard.length === 0) && (
        <div className="text-center py-8 text-gray-500">
          No yield data available for {effectiveQuarter ? formatQuarter(effectiveQuarter) : "this quarter"}
        </div>
      )}

      {/* Table */}
      {leaderboard && leaderboard.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800/50">
                <TableHead className="w-12 text-center">#</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Yield</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Data Period</TableHead>
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
                        "font-semibold text-lg",
                        item.growthPct >= 0 ? "text-green-600" : "text-red-600"
                      )}
                    >
                      {item.growthPct >= 0 ? "+" : ""}
                      {item.growthPct.toFixed(1)}%
                    </span>
                    <div className="text-xs text-gray-400">
                      {item.annualizedGrowthPct >= 0 ? "+" : ""}
                      {item.annualizedGrowthPct.toFixed(0)}% ann.
                    </div>
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    <div className="text-xs text-gray-500">
                      {new Date(item.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" → "}
                      {new Date(item.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div className="text-xs text-gray-400">
                      {item.daysCovered}d
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
