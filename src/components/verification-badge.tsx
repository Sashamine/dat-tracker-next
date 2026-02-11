"use client";

import { cn } from "@/lib/utils";

type VerificationStatus = "sec-verified" | "company-reported" | "estimated" | "interpolated" | "stale";

interface VerificationBadgeProps {
  status: VerificationStatus;
  sourceUrl?: string;
  asOf?: string;
  className?: string;
  compact?: boolean;
}

const statusConfig: Record<VerificationStatus, { 
  icon: string; 
  label: string; 
  color: string;
  tooltip: string;
}> = {
  "sec-verified": {
    icon: "📋",
    label: "SEC",
    color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800",
    tooltip: "Verified from SEC filing",
  },
  "company-reported": {
    icon: "🏢",
    label: "Co.",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    tooltip: "Company-reported (not SEC verified)",
  },
  "estimated": {
    icon: "📊",
    label: "Est.",
    color: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    tooltip: "Estimated value",
  },
  "interpolated": {
    icon: "📈",
    label: "Interp.",
    color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    tooltip: "Interpolated between SEC filings",
  },
  "stale": {
    icon: "⏰",
    label: "Stale",
    color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800",
    tooltip: "Data may be outdated",
  },
};

export function VerificationBadge({ 
  status, 
  sourceUrl, 
  asOf,
  className,
  compact = false,
}: VerificationBadgeProps) {
  const config = statusConfig[status];
  
  const badge = (
    <span 
      className={cn(
        "inline-flex items-center gap-1 rounded border text-xs font-medium",
        compact ? "px-1 py-0.5" : "px-1.5 py-0.5",
        config.color,
        className
      )}
      title={`${config.tooltip}${asOf ? ` (as of ${asOf})` : ""}`}
    >
      <span className="text-[10px]">{config.icon}</span>
      {!compact && <span>{config.label}</span>}
    </span>
  );

  if (sourceUrl) {
    return (
      <a 
        href={sourceUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        {badge}
      </a>
    );
  }

  return badge;
}

/**
 * Determine verification status from company data flags
 */
export function getVerificationStatus(
  sourceType?: string,
  sourceUrl?: string,
  asOf?: string,
  isEstimated?: boolean
): VerificationStatus {
  if (isEstimated) return "estimated";
  
  if (!sourceUrl && !sourceType) return "company-reported";
  
  // Check if source is SEC
  if (sourceType === "sec-filing" || sourceType === "xbrl" || sourceType === "sec-document") {
    // Check staleness (>90 days)
    if (asOf) {
      const daysSince = Math.floor((Date.now() - new Date(asOf).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 90) return "stale";
    }
    return "sec-verified";
  }
  
  if (sourceType === "company-website" || sourceType === "press-release") {
    return "company-reported";
  }
  
  if (sourceType === "interpolated" || sourceType === "derived") {
    return "interpolated";
  }
  
  return "company-reported";
}

/**
 * Inline verification indicator (smaller, for use in tables/lists)
 */
export function VerificationDot({ 
  status,
  className,
}: { 
  status: VerificationStatus;
  className?: string;
}) {
  const colors: Record<VerificationStatus, string> = {
    "sec-verified": "bg-green-500",
    "company-reported": "bg-blue-500",
    "estimated": "bg-amber-500",
    "interpolated": "bg-purple-500",
    "stale": "bg-red-500",
  };

  return (
    <span 
      className={cn(
        "inline-block w-2 h-2 rounded-full",
        colors[status],
        className
      )}
      title={statusConfig[status].tooltip}
    />
  );
}
