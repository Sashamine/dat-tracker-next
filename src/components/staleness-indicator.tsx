"use client";

import { calculateStaleness, formatHoldingsSource, StalenessInfo } from "@/lib/holdings-verification";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StalenessIndicatorProps {
  lastUpdated?: string;
  source?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}

// Staleness dot with color coding
function StalenessDot({ level, size = "sm" }: { level: StalenessInfo["level"]; size?: "sm" | "md" }) {
  const sizeClasses = size === "sm" ? "w-2 h-2" : "w-3 h-3";

  const colorClasses = {
    fresh: "bg-green-500",
    stale: "bg-yellow-500",
    very_stale: "bg-red-500",
    unknown: "bg-gray-400"
  };

  return (
    <span
      className={cn(
        sizeClasses,
        "rounded-full inline-block",
        colorClasses[level]
      )}
    />
  );
}

export function StalenessIndicator({
  lastUpdated,
  source,
  showLabel = false,
  size = "sm"
}: StalenessIndicatorProps) {
  const staleness = calculateStaleness(lastUpdated);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 cursor-help">
            <StalenessDot level={staleness.level} size={size} />
            {showLabel && (
              <span className={cn("text-xs", staleness.color)}>
                {staleness.label}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-sm">
            <p className="font-medium">Holdings Data</p>
            <p className={staleness.color}>
              {staleness.level === "unknown"
                ? "Update date not recorded"
                : `Updated ${staleness.label}`}
            </p>
            {source && (
              <p className="text-gray-500 text-xs mt-1">
                Source: {formatHoldingsSource(source)}
              </p>
            )}
            {staleness.lastUpdated && (
              <p className="text-gray-500 text-xs">
                {new Date(staleness.lastUpdated).toLocaleDateString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Badge version for more prominent display
export function StalenessBadge({
  lastUpdated,
  source
}: {
  lastUpdated?: string;
  source?: string;
}) {
  const staleness = calculateStaleness(lastUpdated);

  const bgClasses = {
    fresh: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    stale: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
    very_stale: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    unknown: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium cursor-help",
              bgClasses[staleness.level]
            )}
          >
            <StalenessDot level={staleness.level} size="sm" />
            {staleness.label}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="text-sm">
            <p className="font-medium">Holdings Data Freshness</p>
            {staleness.level === "fresh" && (
              <p className="text-green-600">Data is current</p>
            )}
            {staleness.level === "stale" && (
              <p className="text-yellow-600">Data may be outdated - verify with recent filings</p>
            )}
            {staleness.level === "very_stale" && (
              <p className="text-red-600">Data is likely outdated - needs verification</p>
            )}
            {staleness.level === "unknown" && (
              <p className="text-gray-600">No update date recorded</p>
            )}
            {source && (
              <p className="text-gray-500 text-xs mt-1">
                Source: {formatHoldingsSource(source)}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Compact indicator for table rows
export function StalenessCompact({ lastUpdated }: { lastUpdated?: string }) {
  const staleness = calculateStaleness(lastUpdated);

  if (staleness.level === "fresh") {
    return null; // Don't show anything for fresh data
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">
            <StalenessDot level={staleness.level} size="sm" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top">
          <span className={staleness.color}>
            Updated {staleness.label}
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
