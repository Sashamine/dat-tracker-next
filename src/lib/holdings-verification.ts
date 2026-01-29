/**
 * Holdings verification utilities
 * Tracks data freshness, cross-references external sources, and flags stale data
 */

// Staleness thresholds (in days)
export const STALENESS_THRESHOLDS = {
  FRESH: 7,      // Green: updated within 7 days
  STALE: 30,     // Yellow: 7-30 days old
  VERY_STALE: 90 // Red: 30+ days old
};

export type StalenessLevel = "fresh" | "stale" | "very_stale" | "unknown";

export interface StalenessInfo {
  level: StalenessLevel;
  daysOld: number | null;
  lastUpdated: string | null;
  source: string | null;
  color: string;
  label: string;
}

/**
 * Calculate staleness level for holdings data
 */
export function calculateStaleness(lastUpdated?: string): StalenessInfo {
  if (!lastUpdated) {
    return {
      level: "unknown",
      daysOld: null,
      lastUpdated: null,
      source: null,
      color: "text-gray-400",
      label: "Unknown"
    };
  }

  const updateDate = new Date(lastUpdated);
  const now = new Date();
  const diffMs = now.getTime() - updateDate.getTime();
  const daysOld = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysOld <= STALENESS_THRESHOLDS.FRESH) {
    return {
      level: "fresh",
      daysOld,
      lastUpdated,
      source: null,
      color: "text-green-600",
      label: daysOld === 0 ? "Today" : daysOld === 1 ? "1 day ago" : `${daysOld} days ago`
    };
  } else if (daysOld <= STALENESS_THRESHOLDS.STALE) {
    return {
      level: "stale",
      daysOld,
      lastUpdated,
      source: null,
      color: "text-yellow-600",
      label: `${daysOld} days ago`
    };
  } else {
    return {
      level: "very_stale",
      daysOld,
      lastUpdated,
      source: null,
      color: "text-red-600",
      label: daysOld > 365 ? `${Math.floor(daysOld / 365)}y ago` : `${daysOld} days ago`
    };
  }
}

/**
 * Format holdings source for display
 */
export function formatHoldingsSource(source?: string): string {
  if (!source) return "Unknown";

  const sourceLabels: Record<string, string> = {
    "8-K filing": "SEC 8-K",
    "press release": "Press Release",
    "company website": "Company Website",
    "company-website": "Company Website",
    "company-dashboard": "Company Dashboard",
    "bitcointreasuries.net": "BTC Treasuries",
    "manual": "Manual Entry",
    "api": "API"
  };

  return sourceLabels[source] || source;
}

/**
 * Holdings discrepancy between our data and external source
 */
export interface HoldingsDiscrepancy {
  ticker: string;
  ourHoldings: number;
  externalHoldings: number;
  externalSource: string;
  discrepancyPct: number;
  lastChecked: string;
}

/**
 * Calculate discrepancy percentage between two holdings values
 */
export function calculateDiscrepancy(our: number, external: number): number {
  if (external === 0) return our === 0 ? 0 : 100;
  return Math.abs((our - external) / external) * 100;
}

/**
 * Check if discrepancy is significant (>5% difference)
 */
export function isSignificantDiscrepancy(discrepancyPct: number): boolean {
  return discrepancyPct > 5;
}

/**
 * Companies that need verification (stale or have discrepancies)
 */
export interface VerificationNeeded {
  ticker: string;
  reason: "stale" | "very_stale" | "discrepancy" | "unknown";
  priority: "high" | "medium" | "low";
  details: string;
}

/**
 * Get companies that need verification
 */
export function getCompaniesNeedingVerification(
  companies: Array<{ ticker: string; holdingsLastUpdated?: string; holdings: number }>,
  discrepancies: HoldingsDiscrepancy[]
): VerificationNeeded[] {
  const needs: VerificationNeeded[] = [];

  for (const company of companies) {
    const staleness = calculateStaleness(company.holdingsLastUpdated);

    // Check for discrepancies first (highest priority)
    const discrepancy = discrepancies.find(d => d.ticker === company.ticker);
    if (discrepancy && isSignificantDiscrepancy(discrepancy.discrepancyPct)) {
      needs.push({
        ticker: company.ticker,
        reason: "discrepancy",
        priority: "high",
        details: `${discrepancy.discrepancyPct.toFixed(1)}% difference vs ${discrepancy.externalSource}`
      });
      continue;
    }

    // Check staleness
    if (staleness.level === "very_stale") {
      needs.push({
        ticker: company.ticker,
        reason: "very_stale",
        priority: "high",
        details: `Last updated ${staleness.daysOld} days ago`
      });
    } else if (staleness.level === "stale") {
      needs.push({
        ticker: company.ticker,
        reason: "stale",
        priority: "medium",
        details: `Last updated ${staleness.daysOld} days ago`
      });
    } else if (staleness.level === "unknown") {
      needs.push({
        ticker: company.ticker,
        reason: "unknown",
        priority: "low",
        details: "No update date recorded"
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return needs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
