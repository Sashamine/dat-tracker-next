"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EarningsCalendarEntry } from "@/lib/types";

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

interface EarningsCardProps {
  entry: EarningsCalendarEntry;
  onClick?: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string | null): string {
  if (!time) return "";
  switch (time) {
    case "BMO":
      return "Before Open";
    case "AMC":
      return "After Close";
    case "TNS":
      return "TBD";
    default:
      return "";
  }
}

export function EarningsCard({ entry, onClick }: EarningsCardProps) {
  const isToday = entry.daysUntil === 0;
  const isPast = entry.daysUntil < 0;
  const isUpcoming = entry.daysUntil > 0;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border cursor-pointer transition-colors",
        "hover:bg-gray-50 dark:hover:bg-gray-800/50",
        isToday && "border-green-500 bg-green-50/50 dark:bg-green-900/20",
        !isToday && "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Company info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {entry.ticker}
            </span>
            <Badge
              variant="outline"
              className={cn("text-xs", assetColors[entry.asset])}
            >
              {entry.asset}
            </Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
            {entry.companyName}
          </p>
        </div>

        {/* Right: Date and countdown */}
        <div className="text-right flex-shrink-0">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatDate(entry.earningsDate)}
          </div>
          {entry.earningsTime && (
            <div className="text-xs text-gray-500">
              {formatTime(entry.earningsTime)}
            </div>
          )}
          <div
            className={cn(
              "text-xs font-medium mt-1",
              isToday && "text-green-600",
              isUpcoming && entry.daysUntil <= 7 && "text-orange-600",
              isUpcoming && entry.daysUntil > 7 && "text-gray-500",
              isPast && "text-gray-400"
            )}
          >
            {isToday && "Today"}
            {isUpcoming && `In ${entry.daysUntil} day${entry.daysUntil > 1 ? "s" : ""}`}
            {isPast && `${Math.abs(entry.daysUntil)} day${Math.abs(entry.daysUntil) > 1 ? "s" : ""} ago`}
          </div>
        </div>
      </div>

      {/* Bottom row: Metrics (for reported earnings) */}
      {entry.status === "reported" && (
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          {entry.epsSurprisePct !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">EPS:</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  entry.epsSurprisePct >= 0
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                )}
              >
                {entry.epsSurprisePct >= 0 ? "+" : ""}
                {entry.epsSurprisePct.toFixed(1)}%
              </Badge>
            </div>
          )}
          {entry.holdingsPerShareGrowth !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">Yield:</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  entry.holdingsPerShareGrowth >= 0
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                )}
              >
                {entry.holdingsPerShareGrowth >= 0 ? "+" : ""}
                {entry.holdingsPerShareGrowth.toFixed(1)}%
              </Badge>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
