"use client";

import { formatHoldingsSource } from "@/lib/holdings-verification";
import { ExternalLink, AlertTriangle, Clock } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Freshness thresholds in days
const THRESHOLDS = {
  fresh: 14,      // < 2 weeks - green
  aging: 30,      // 2-4 weeks - yellow
  stale: 60,      // 1-2 months - orange
  // > 60 days = very-stale - red
};

function getDataFreshness(asOfDate: string | undefined) {
  if (!asOfDate) {
    return { level: "unknown", daysOld: -1, color: "text-muted-foreground" };
  }

  const asOf = new Date(asOfDate);
  const now = new Date();
  const daysOld = Math.floor((now.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOld < THRESHOLDS.fresh) {
    return { level: "fresh", daysOld, color: "text-green-600" };
  } else if (daysOld < THRESHOLDS.aging) {
    return { level: "aging", daysOld, color: "text-yellow-600" };
  } else if (daysOld < THRESHOLDS.stale) {
    return { level: "stale", daysOld, color: "text-orange-500" };
  } else {
    return { level: "very-stale", daysOld, color: "text-red-500" };
  }
}

function getFreshnessTooltip(level: string, daysOld: number): string {
  switch (level) {
    case "fresh": return `Data is current (${daysOld}d old)`;
    case "aging": return `Data is ${daysOld} days old - may need update`;
    case "stale": return `Data is ${daysOld} days old - likely outdated`;
    case "very-stale": return `Data is ${daysOld} days old - needs verification`;
    default: return "Date unknown";
  }
}

interface LastUpdatedProps {
  lastUpdated?: string;
  source?: string;
  sourceUrl?: string;
  showSource?: boolean;
  showFreshness?: boolean;
}

/**
 * Shows when holdings data was last updated with a link to the source
 * Now includes visual freshness indicator
 */
export function LastUpdated({
  lastUpdated,
  source,
  sourceUrl,
  showSource = false,
  showFreshness = true,
}: LastUpdatedProps) {
  if (!lastUpdated) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const date = new Date(lastUpdated);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined
  });

  const freshness = getDataFreshness(lastUpdated);
  const showWarning = freshness.level === "stale" || freshness.level === "very-stale";

  const content = (
    <span className={`inline-flex items-center gap-1 ${showFreshness ? freshness.color : 'text-muted-foreground'}`}>
      {showWarning && <AlertTriangle className="w-3 h-3" />}
      {formatted}
      {showSource && source && (
        <span className="text-muted-foreground">
          ({formatHoldingsSource(source)})
        </span>
      )}
    </span>
  );

  const wrappedContent = showFreshness ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-help">{content}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{getFreshnessTooltip(freshness.level, freshness.daysOld)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : content;

  // If we have a source URL, make it a link
  if (sourceUrl) {
    return (
      <a
        href={sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs hover:underline transition-colors"
      >
        {wrappedContent}
        <ExternalLink className="w-3 h-3 text-muted-foreground" />
      </a>
    );
  }

  return <span className="text-xs">{wrappedContent}</span>;
}

// Legacy exports for backwards compatibility
export function StalenessIndicator({
  lastUpdated,
  source,
  sourceUrl,
  showFreshness = true,
}: {
  lastUpdated?: string;
  source?: string;
  sourceUrl?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
  showFreshness?: boolean;
}) {
  return <LastUpdated lastUpdated={lastUpdated} source={source} sourceUrl={sourceUrl} showFreshness={showFreshness} />;
}

export function StalenessBadge({
  lastUpdated,
  source,
  sourceUrl,
  showFreshness = true,
}: {
  lastUpdated?: string;
  source?: string;
  sourceUrl?: string;
  showFreshness?: boolean;
}) {
  return <LastUpdated lastUpdated={lastUpdated} source={source} sourceUrl={sourceUrl} showSource showFreshness={showFreshness} />;
}

export function StalenessCompact({
  lastUpdated,
  sourceUrl,
  showFreshness = true,
}: {
  lastUpdated?: string;
  sourceUrl?: string;
  showFreshness?: boolean;
}) {
  return <LastUpdated lastUpdated={lastUpdated} sourceUrl={sourceUrl} showFreshness={showFreshness} />;
}

/**
 * Standalone freshness badge - shows age as badge with color coding
 */
export function FreshnessBadge({
  asOfDate,
  className = "",
}: {
  asOfDate?: string;
  className?: string;
}) {
  if (!asOfDate) return null;
  
  const freshness = getDataFreshness(asOfDate);
  if (freshness.level === "fresh") return null;  // Don't show for fresh data
  
  const bgColors: Record<string, string> = {
    aging: "bg-yellow-500/20",
    stale: "bg-orange-500/20",
    "very-stale": "bg-red-500/20",
  };

  const label = freshness.daysOld < 60 
    ? `${freshness.daysOld}d old`
    : `${Math.floor(freshness.daysOld / 30)}mo old`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${bgColors[freshness.level]} ${freshness.color} ${className}`}>
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{getFreshnessTooltip(freshness.level, freshness.daysOld)}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
