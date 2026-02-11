"use client";

import { getFreshnessBadge, getDataFreshness, FreshnessLevel } from "@/lib/utils/data-freshness";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface FreshnessBadgeProps {
  asOfDate: string | undefined;
  showAlways?: boolean;  // Show even for fresh data
  className?: string;
}

/**
 * Shows a badge indicating how stale the data is.
 * Only appears for data > 2 weeks old by default.
 */
export function FreshnessBadge({ asOfDate, showAlways = false, className = "" }: FreshnessBadgeProps) {
  const badge = getFreshnessBadge(asOfDate);
  const freshness = getDataFreshness(asOfDate);
  
  if (!badge.show && !showAlways) return null;
  
  // For fresh data when showAlways is true
  if (freshness.level === "fresh" && showAlways) {
    return (
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium bg-green-500/20 text-green-600 ${className}`}>
        {freshness.label}
      </span>
    );
  }

  const tooltipText = getTooltipText(freshness.level, asOfDate);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${badge.className} ${className} cursor-help`}>
            {badge.text}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{tooltipText}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getTooltipText(level: FreshnessLevel, asOfDate: string | undefined): string {
  if (!asOfDate) return "No date available for this data";
  
  const formatted = new Date(asOfDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  switch (level) {
    case "fresh":
      return `Data as of ${formatted}`;
    case "aging":
      return `Data from ${formatted} - may need update soon`;
    case "stale":
      return `Data from ${formatted} - likely outdated`;
    case "very-stale":
      return `Data from ${formatted} - needs verification`;
    default:
      return `Data as of ${formatted}`;
  }
}

/**
 * Inline "as of" date display with freshness coloring
 */
export function AsOfDate({ date, className = "" }: { date: string | undefined; className?: string }) {
  if (!date) return null;
  
  const freshness = getDataFreshness(date);
  const formatted = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });

  return (
    <span className={`text-xs ${freshness.color} ${className}`}>
      as of {formatted}
    </span>
  );
}
