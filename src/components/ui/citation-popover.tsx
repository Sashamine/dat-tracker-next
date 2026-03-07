"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { trackCitationSourceClick } from "@/lib/client-events";

type CitationPopoverProps = {
  children?: React.ReactNode;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  ticker?: string;
  metric?: string;
  confidenceScore?: number | null;
  jurisdiction?: string | null;
  legacy?: boolean;
  className?: string;
  sourceQuote?: string | null;
};

/**
 * Extract a short, high-signal search snippet from a sourceQuote.
 * Prefers formatted numbers (e.g. "4,473,587") since they're unique in documents.
 * Falls back to first ~50 chars of the quote.
 */
function extractSearchSnippet(quote: string): string {
  // Look for formatted numbers with commas (most unique in SEC filings)
  const numberMatch = quote.match(/[\d,]+\.\d+|[\d]{1,3}(?:,\d{3})+/);
  if (numberMatch) return numberMatch[0];
  // Fall back to first ~50 chars, trimmed to word boundary
  const trimmed = quote.slice(0, 60);
  const lastSpace = trimmed.lastIndexOf(" ");
  return lastSpace > 30 ? trimmed.slice(0, lastSpace) : trimmed;
}

/** Check if a URL points to our internal filing viewer */
function isFilingViewerUrl(url: string): boolean {
  return url.startsWith("/filings/");
}

function confidenceLabel(score: number): "High" | "Medium" | "Low" | "Danger" {
  if (score >= 0.85) return "High";
  if (score >= 0.55) return "Medium";
  if (score > 0) return "Low";
  return "Danger";
}

export function CitationPopover({
  children,
  sourceUrl,
  sourceLabel,
  ticker,
  metric,
  confidenceScore,
  jurisdiction,
  legacy = false,
  className,
  sourceQuote,
}: CitationPopoverProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const hasSource = Boolean(sourceUrl);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  const isLowConfidence = typeof confidenceScore === "number" && confidenceScore < 0.55;

  if (!hasSource) {
    return (
      <span className={cn("relative inline-flex items-center", className)}>
        {children}
        {legacy && (
          <span
            className="ml-1.5 inline-flex items-center rounded border border-amber-300 bg-amber-50 px-1 py-0.5 text-[9px] font-bold uppercase tracking-tight text-amber-700 leading-none"
            title="Metric is currently resolved from legacy fallback metadata while D1 provenance is still loading."
          >
            Legacy
          </span>
        )}
      </span>
    );
  }

  return (
    <span
      ref={rootRef}
      className={cn("relative inline-flex items-center", className)}
    >
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          "inline-flex items-center gap-1 transition-all rounded px-0.5 -mx-0.5",
          isLowConfidence 
            ? "ring-1 ring-red-200 bg-red-50 hover:bg-red-100" 
            : "hover:bg-gray-100 dark:hover:bg-gray-800"
        )}
        title={isLowConfidence ? "Warning: Low Confidence Source" : "View citation details"}
      >
        {children}
        {isLowConfidence ? (
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse ml-1" />
        ) : (
          <span className="text-[10px] text-blue-500/70 ml-1">↗</span>
        )}
      </button>

      {open && sourceUrl && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-xl dark:border-gray-700 dark:bg-gray-900 animate-in fade-in zoom-in duration-100">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="font-semibold text-gray-900 dark:text-gray-100">Citation</span>
            {jurisdiction ? (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                {jurisdiction}
              </span>
            ) : null}
          </div>

          <div className="space-y-1 text-gray-600 dark:text-gray-300 text-left">
            <div className="font-medium text-gray-900 dark:text-gray-100 truncate" title={sourceLabel || sourceUrl}>
              {sourceLabel || "Primary source"}
            </div>
            {typeof confidenceScore === "number" ? (
              <div className={cn(
                "font-medium mt-1",
                isLowConfidence ? "text-red-600" : "text-gray-900 dark:text-gray-100"
              )}>
                Confidence: {Math.round(confidenceScore * 100)}% - {confidenceLabel(confidenceScore)}
              </div>
            ) : (
              <div className="mt-1">Confidence: N/A</div>
            )}
            
            {sourceQuote && (
              <div className="mt-2 border-t border-gray-100 dark:border-gray-800 pt-2">
                <div className="text-[10px] text-gray-400 mb-1">Source Quote</div>
                <div className="text-[11px] italic text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-1.5 rounded leading-snug">
                  &ldquo;{sourceQuote}&rdquo;
                </div>
              </div>
            )}

            <div className="mt-2 text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
              Metric: <code className="bg-gray-50 dark:bg-gray-800 px-1 rounded">{metric || "unknown"}</code>
            </div>

            <a
              href={(() => {
                if (!sourceUrl) return sourceUrl;
                // Only append ?q= for our internal filing viewer URLs
                if (sourceQuote && isFilingViewerUrl(sourceUrl)) {
                  const snippet = extractSearchSnippet(sourceQuote);
                  const sep = sourceUrl.includes('?') ? '&' : '?';
                  return `${sourceUrl}${sep}q=${encodeURIComponent(snippet)}`;
                }
                return sourceUrl;
              })()}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                trackCitationSourceClick({ href: sourceUrl, ticker, metric });
                setOpen(false);
              }}
              className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded bg-blue-600 px-2 py-1.5 text-white hover:bg-blue-700 transition-colors font-medium"
            >
              Open source
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </span>
  );
}
