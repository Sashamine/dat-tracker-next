/**
 * Data Freshness Utilities
 * 
 * Indicates how stale company data is based on last update dates.
 */

export type FreshnessLevel = "fresh" | "aging" | "stale" | "very-stale";

export interface FreshnessInfo {
  level: FreshnessLevel;
  daysOld: number;
  label: string;
  color: string;  // Tailwind color class
}

// Thresholds in days
const THRESHOLDS = {
  fresh: 14,      // < 2 weeks
  aging: 30,      // 2-4 weeks  
  stale: 60,      // 1-2 months
  // > 60 days = very-stale
};

/**
 * Calculate how fresh/stale a data point is
 */
export function getDataFreshness(asOfDate: string | undefined): FreshnessInfo {
  if (!asOfDate) {
    return {
      level: "very-stale",
      daysOld: -1,
      label: "Unknown date",
      color: "text-red-500",
    };
  }

  const asOf = new Date(asOfDate);
  const now = new Date();
  const daysOld = Math.floor((now.getTime() - asOf.getTime()) / (1000 * 60 * 60 * 24));

  if (daysOld < THRESHOLDS.fresh) {
    return {
      level: "fresh",
      daysOld,
      label: `${daysOld}d ago`,
      color: "text-green-500",
    };
  } else if (daysOld < THRESHOLDS.aging) {
    return {
      level: "aging",
      daysOld,
      label: `${daysOld}d ago`,
      color: "text-yellow-500",
    };
  } else if (daysOld < THRESHOLDS.stale) {
    return {
      level: "stale",
      daysOld,
      label: `${Math.floor(daysOld / 7)}w ago`,
      color: "text-orange-500",
    };
  } else {
    return {
      level: "very-stale",
      daysOld,
      label: `${Math.floor(daysOld / 30)}mo ago`,
      color: "text-red-500",
    };
  }
}

/**
 * Format a date for display with freshness indicator
 */
export function formatDateWithFreshness(asOfDate: string | undefined): {
  formatted: string;
  freshness: FreshnessInfo;
} {
  if (!asOfDate) {
    return {
      formatted: "Unknown",
      freshness: getDataFreshness(undefined),
    };
  }

  const date = new Date(asOfDate);
  const formatted = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return {
    formatted,
    freshness: getDataFreshness(asOfDate),
  };
}

/**
 * Get freshness badge props for UI
 */
export function getFreshnessBadge(asOfDate: string | undefined): {
  show: boolean;
  text: string;
  className: string;
} {
  const freshness = getDataFreshness(asOfDate);
  
  // Only show badge for aging or worse
  if (freshness.level === "fresh") {
    return { show: false, text: "", className: "" };
  }

  const baseClass = "text-xs px-1.5 py-0.5 rounded-full font-medium";
  
  switch (freshness.level) {
    case "aging":
      return {
        show: true,
        text: freshness.label,
        className: `${baseClass} bg-yellow-500/20 text-yellow-600`,
      };
    case "stale":
      return {
        show: true,
        text: freshness.label,
        className: `${baseClass} bg-orange-500/20 text-orange-600`,
      };
    case "very-stale":
      return {
        show: true,
        text: freshness.label,
        className: `${baseClass} bg-red-500/20 text-red-600`,
      };
    default:
      return { show: false, text: "", className: "" };
  }
}
