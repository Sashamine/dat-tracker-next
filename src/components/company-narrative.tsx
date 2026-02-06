"use client";

import { useState } from "react";
import { Company } from "@/lib/types";
import { HoldingsSnapshot } from "@/lib/data/holdings-history";
import {
  generateCompanyOverview,
  generateTreasuryNarrative,
  generateMNAVNarrative,
  generateDilutionNarrative,
  generateHistoryNarrative,
} from "@/lib/utils/narratives";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyNarrativeProps {
  company: Company;
  holdings?: HoldingsSnapshot[];
  cryptoPrice?: number;
  mnav?: number | null;
  marketCap?: number;
  nav?: number;
  className?: string;
}

/**
 * Auto-generated narrative summary for a company
 * Provides SEO-friendly text content that describes the company's treasury
 */
export function CompanyNarrative({
  company,
  holdings = [],
  cryptoPrice,
  mnav,
  marketCap,
  nav,
  className,
}: CompanyNarrativeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const latestHoldings = holdings.length > 0 ? holdings[holdings.length - 1] : undefined;

  // Generate all narratives
  const overview = generateCompanyOverview(company, latestHoldings, cryptoPrice);
  const treasury = generateTreasuryNarrative(company, holdings, cryptoPrice);
  const mnavText = mnav !== null && mnav !== undefined 
    ? generateMNAVNarrative(company, mnav, marketCap, nav)
    : "";
  const dilution = generateDilutionNarrative(company, holdings);
  const history = generateHistoryNarrative(company, holdings);

  // Combine for full narrative
  const fullNarrative = [overview, treasury, mnavText, dilution, history]
    .filter(Boolean)
    .join("\n\n");

  // Short preview (first 2 sentences of overview)
  const preview = overview.split(". ").slice(0, 2).join(". ") + ".";

  if (!fullNarrative) return null;

  return (
    <div
      className={cn(
        "bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800",
        className
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Summary
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        )}
      </button>

      {/* Always render content for SEO, but visually hide when collapsed */}
      <div
        className={cn(
          "px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed",
          !isExpanded && "sr-only" // Screen reader only when collapsed
        )}
      >
        {/* Structured sections for better readability */}
        <div className="space-y-3">
          {overview && (
            <p>{overview}</p>
          )}
          {treasury && (
            <p>{treasury}</p>
          )}
          {mnavText && (
            <p>{mnavText}</p>
          )}
          {dilution && (
            <p>{dilution}</p>
          )}
          {history && (
            <p className="text-xs text-gray-500 dark:text-gray-500 italic">
              {history}
            </p>
          )}
        </div>
      </div>

      {/* Preview shown when collapsed (visible to users) */}
      {!isExpanded && (
        <div className="px-4 pb-3 text-sm text-gray-500 dark:text-gray-500 line-clamp-2">
          {preview}
        </div>
      )}
    </div>
  );
}

/**
 * Inline narrative snippets for specific sections
 * Use these within existing UI sections to add textual context
 */
export function NarrativeSnippet({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  if (!text) return null;

  return (
    <p
      className={cn(
        "text-xs text-gray-500 dark:text-gray-500 leading-relaxed mt-2",
        className
      )}
    >
      {text}
    </p>
  );
}
