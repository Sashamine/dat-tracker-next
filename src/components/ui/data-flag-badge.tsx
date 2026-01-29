"use client";

import { DataFlag } from "@/lib/types";

interface DataFlagBadgeProps {
  flags?: DataFlag[];
  field?: "shares" | "debt" | "cash" | "holdings";
  className?: string;
}

const FLAG_LABELS: Record<DataFlag, { label: string; tooltip: string }> = {
  shares_unverified: {
    label: "⚠",
    tooltip: "Share count from non-XBRL source (needs verification)",
  },
  shares_xbrl_stale: {
    label: "⚠",
    tooltip: "XBRL share count outdated (FPI filings have less frequent updates)",
  },
  debt_unverified: {
    label: "⚠",
    tooltip: "Debt from narrative disclosure (not in XBRL)",
  },
  cash_unverified: {
    label: "⚠",
    tooltip: "Cash figure needs verification",
  },
  holdings_estimated: {
    label: "~",
    tooltip: "Holdings estimated from fair value (unit count not disclosed)",
  },
};

// Map field names to relevant flags
const FIELD_FLAGS: Record<string, DataFlag[]> = {
  shares: ["shares_unverified", "shares_xbrl_stale"],
  debt: ["debt_unverified"],
  cash: ["cash_unverified"],
  holdings: ["holdings_estimated"],
};

/**
 * Displays a warning badge for data that needs verification
 * Shows tooltip on hover explaining the issue
 */
export function DataFlagBadge({ flags, field, className = "" }: DataFlagBadgeProps) {
  if (!flags || flags.length === 0) return null;

  // Filter to relevant flags for this field (if specified)
  const relevantFlags = field
    ? flags.filter((f) => FIELD_FLAGS[field]?.includes(f))
    : flags;

  if (relevantFlags.length === 0) return null;

  // Get the first relevant flag's info
  const flagInfo = FLAG_LABELS[relevantFlags[0]];
  if (!flagInfo) return null;

  return (
    <span
      className={`inline-flex items-center text-amber-500 dark:text-amber-400 cursor-help ${className}`}
      title={flagInfo.tooltip}
    >
      {flagInfo.label}
    </span>
  );
}

/**
 * Shows FPI badge for Foreign Private Issuers
 */
export function FPIBadge({ filingType, className = "" }: { filingType?: string; className?: string }) {
  if (filingType !== "FPI") return null;

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 cursor-help ${className}`}
      title="Foreign Private Issuer - files 20-F/6-K instead of 10-Q/10-K. Less frequent XBRL updates."
    >
      FPI
    </span>
  );
}
