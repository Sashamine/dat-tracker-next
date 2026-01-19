"use client";

import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HoldingsSource } from "@/lib/types";

// Source type labels for display
const SOURCE_LABELS: Record<HoldingsSource, string> = {
  "on-chain": "On-chain verified",
  "sec-filing": "SEC Filing",
  "regulatory-filing": "Regulatory Filing",
  "press-release": "Press Release",
  "company-website": "Company Website",
  "aggregator": "Third-party Aggregator",
  "manual": "Manual Entry",
};

// Source type colors
const SOURCE_COLORS: Record<HoldingsSource, string> = {
  "on-chain": "text-green-400",
  "sec-filing": "text-blue-400",
  "regulatory-filing": "text-blue-300",
  "press-release": "text-yellow-400",
  "company-website": "text-purple-400",
  "aggregator": "text-orange-400",
  "manual": "text-gray-400",
};

export interface CitationProps {
  children: ReactNode;
  // Source information
  sourceType?: HoldingsSource;
  sourceUrl?: string;
  sourceDate?: string;  // ISO date string
  // Custom source label (overrides sourceType label)
  sourceLabel?: string;
  // Additional context
  methodology?: string;
  notes?: string;
  // Styling
  className?: string;
  showIndicator?: boolean;  // Show small indicator that citation exists
}

/**
 * Citation component - wraps a value and shows source info on hover
 *
 * Usage:
 * <Citation sourceType="sec-filing" sourceUrl="https://sec.gov/..." sourceDate="2026-01-15">
 *   687,000 BTC
 * </Citation>
 */
export function Citation({
  children,
  sourceType,
  sourceUrl,
  sourceDate,
  sourceLabel,
  methodology,
  notes,
  className = "",
  showIndicator = true,
}: CitationProps) {
  // If no source info, just render children
  if (!sourceType && !sourceUrl && !sourceLabel) {
    return <span className={className}>{children}</span>;
  }

  const label = sourceLabel || (sourceType ? SOURCE_LABELS[sourceType] : "Source");
  const colorClass = sourceType ? SOURCE_COLORS[sourceType] : "text-gray-400";

  // Format date for display
  const formattedDate = sourceDate
    ? new Date(sourceDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`cursor-help ${className} ${showIndicator ? "border-b border-dotted border-gray-400 dark:border-gray-600" : ""}`}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs bg-gray-900 dark:bg-gray-800 p-3 text-left"
        >
          <div className="space-y-1.5">
            {/* Source type */}
            <div className="flex items-center gap-2">
              <span className={`font-medium ${colorClass}`}>{label}</span>
              {formattedDate && (
                <span className="text-gray-400 text-[10px]">{formattedDate}</span>
              )}
            </div>

            {/* Methodology */}
            {methodology && (
              <p className="text-gray-300 text-[11px] leading-snug">{methodology}</p>
            )}

            {/* Notes */}
            {notes && (
              <p className="text-gray-400 text-[10px] leading-snug italic">{notes}</p>
            )}

            {/* Source link */}
            {sourceUrl && (
              <a
                href={sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[10px] text-blue-400 hover:text-blue-300 truncate mt-1"
                onClick={(e) => e.stopPropagation()}
              >
                View source
              </a>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * SimpleCitation - minimal citation with just a link
 */
export function SimpleCitation({
  children,
  url,
  label = "Source",
  className = "",
}: {
  children: ReactNode;
  url: string;
  label?: string;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help border-b border-dotted border-gray-400 dark:border-gray-600 ${className}`}>
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-gray-900 dark:bg-gray-800">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            {label}
          </a>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
