"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { 
  ProvenanceValue, 
  XBRLSource, 
  DocumentSource, 
  DerivedSource 
} from "@/lib/data/types/provenance";

interface ProvenanceMetricProps {
  label: string;
  data: ProvenanceValue<number>;
  format?: "currency" | "number" | "btc" | "eth" | "shares" | "mnav";
  subLabel?: string;
  tooltip?: string;
  className?: string;
  ticker?: string;
  /** Optional id for linking from other metrics */
  id?: string;
}

/** Format number for display */
function formatValue(value: number, format: string): string {
  if (format === "currency") {
    if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1e3) {
      return `$${(value / 1e3).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  } else if (format === "btc") {
    return value.toLocaleString() + " BTC";
  } else if (format === "eth") {
    return value.toLocaleString() + " ETH";
  } else if (format === "shares") {
    if (Math.abs(value) >= 1e9) {
      return `${(value / 1e9).toFixed(2)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    }
    return value.toLocaleString();
  } else if (format === "mnav") {
    return `${value.toFixed(2)}x`;
  }
  return value.toLocaleString();
}

/** Get source type label */
function getSourceLabel(source: XBRLSource | DocumentSource | DerivedSource): string {
  switch (source.type) {
    case "xbrl":
      return `SEC XBRL (${source.filingType})`;
    case "sec-document":
      return `SEC ${source.filingType || "Filing"}`;
    case "press-release":
      return "Press Release";
    case "company-website":
      return "Company Website";
    case "regulatory":
      return source.sourceName || "Regulatory Filing";
    case "derived":
      return "Calculated";
  }
}

/** Get searchTerm from source (if available) */
function getSearchTerm(source: XBRLSource | DocumentSource | DerivedSource): string | undefined {
  if (source.type === "xbrl" || source.type === "sec-document" || 
      source.type === "press-release" || source.type === "company-website" || 
      source.type === "regulatory") {
    return source.searchTerm;
  }
  return undefined;
}

/** Copy button component */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }, [text]);
  
  return (
    <button
      onClick={handleCopy}
      className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
      title="Copy to clipboard"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

/** Check if URL is external */
function isExternalUrl(url: string | undefined): boolean {
  return !!url && (url.startsWith("http://") || url.startsWith("https://"));
}

/** Check if URL is internal (starts with /) */
function isInternalUrl(url: string | undefined): boolean {
  return !!url && url.startsWith("/");
}

/** Get source URL - prefers external URL when available, falls back to internal viewer */
function getViewerUrl(source: XBRLSource | DocumentSource | DerivedSource, ticker: string = "mstr"): string | null {
  if (source.type === "xbrl") {
    // XBRL always uses internal viewer (we can render it)
    const period = source.periodEnd ? `&period=${encodeURIComponent(source.periodEnd)}` : "";
    return `/filings/${ticker}/${source.accession}?tab=xbrl&fact=${encodeURIComponent(source.fact)}${period}`;
  } else if (source.type === "sec-document" || source.type === "press-release" || 
             source.type === "company-website" || source.type === "regulatory") {
    const docSource = source as DocumentSource;
    // Priority 1: Use external URL if available (most reliable for verification)
    if (isExternalUrl(docSource.url)) {
      return docSource.url!;
    }
    // Priority 2: Use internal URL if it's a local path
    if (isInternalUrl(docSource.url)) {
      return docSource.url!;
    }
    // Priority 3: Build internal viewer URL from accession (may not have the exhibit)
    if (docSource.accession) {
      const searchTerm = docSource.anchor || docSource.quote?.slice(0, 50);
      const query = searchTerm ? `&q=${encodeURIComponent(searchTerm)}` : "";
      return `/filings/${ticker}/${docSource.accession}?tab=document${query}`;
    }
    return null;
  } else if (source.type === "derived") {
    // Link to first input's source
    const firstInput = Object.values(source.inputs)[0];
    if (firstInput) {
      return getViewerUrl(firstInput.source, ticker);
    }
  }
  return null;
}

export function ProvenanceMetric({ 
  label, 
  data, 
  format = "number",
  subLabel,
  tooltip,
  className = "",
  ticker = "mstr",
  id
}: ProvenanceMetricProps) {
  const [showPopover, setShowPopover] = useState(false);
  const viewerUrl = getViewerUrl(data.source, ticker);

  return (
    <div id={id} className={`bg-gray-50 dark:bg-gray-900 rounded-lg p-4 relative ${className}`}>
      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
        {label}
        {tooltip && (
          <span 
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] text-gray-500 dark:text-gray-400 cursor-help"
            title={tooltip}
          >?</span>
        )}
      </p>
      
      {/* Clickable value */}
      <button
        onClick={() => setShowPopover(!showPopover)}
        className="text-2xl font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer text-left"
        title="Click for source details"
      >
        {formatValue(data.value, format)}
        <span className="text-xs text-blue-500 ml-1 align-super">ⓘ</span>
      </button>
      
      {subLabel && (
        <p className="text-xs text-gray-400">{subLabel}</p>
      )}

      {/* Provenance popover */}
      {showPopover && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowPopover(false)}
          />
          
          {/* Popover */}
          <div className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[300px] max-w-[400px] text-left">
            <div className="text-sm space-y-3">
              {/* Header */}
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Data Source
                </span>
                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded whitespace-nowrap">
                  {getSourceLabel(data.source)}
                </span>
              </div>
              
              {/* Search Term - prominent at top */}
              {getSearchTerm(data.source) && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="text-xs text-green-700 dark:text-green-400 font-medium mb-1">🔍 Ctrl+F in document:</div>
                  <div className="flex items-center justify-between">
                    <code className="font-mono text-green-900 dark:text-green-100 font-bold text-lg">
                      {getSearchTerm(data.source)}
                    </code>
                    <CopyButton text={getSearchTerm(data.source)!} />
                  </div>
                </div>
              )}
              
              {/* Value */}
              <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
                <div className="text-gray-600 dark:text-gray-400 text-xs">Displayed Value</div>
                <div className="font-mono text-gray-900 dark:text-gray-100">
                  {formatValue(data.value, format)}
                </div>
              </div>
              
              {/* XBRL-specific details */}
              {data.source.type === "xbrl" && (
                <>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">XBRL Fact</div>
                    <div className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">
                      {data.source.fact.replace("us-gaap:", "")}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Raw Value</div>
                    <div className="font-mono text-gray-900 dark:text-gray-100">
                      {data.source.rawValue.toLocaleString()} {data.source.unit}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Period</div>
                    <div className="text-gray-900 dark:text-gray-100">
                      {data.source.periodStart 
                        ? `${data.source.periodStart} to ${data.source.periodEnd}`
                        : `As of ${data.source.periodEnd}`
                      }
                    </div>
                  </div>
                </>
              )}
              
              {/* Document-specific details */}
              {(data.source.type === "sec-document" || data.source.type === "company-website") && (
                <>
                  {data.source.quote && (
                    <div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs">Source Quote</div>
                      <div className="text-gray-900 dark:text-gray-100 italic text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        &ldquo;{data.source.quote}&rdquo;
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Derived-specific details */}
              {data.source.type === "derived" && (
                <>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Calculation</div>
                    <div className="text-gray-900 dark:text-gray-100 text-sm">
                      {data.source.derivation}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs mb-2">Inputs (click to view source)</div>
                    <div className="space-y-2">
                      {Object.entries(data.source.inputs).map(([key, input]) => {
                        const inputUrl = getViewerUrl(input.source, ticker);
                        const sourceLabel = getSourceLabel(input.source);
                        return (
                          <div key={key} className="bg-gray-50 dark:bg-gray-900 p-2 rounded text-xs">
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-gray-600 dark:text-gray-400">{key}</span>
                              <span className="text-xs px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                {sourceLabel}
                              </span>
                            </div>
                            <div className="font-mono text-gray-900 dark:text-gray-100 mt-1">
                              {input.value.toLocaleString()}
                            </div>
                            {inputUrl && (
                              isExternalUrl(inputUrl) ? (
                                <a
                                  href={inputUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                                  onClick={() => setShowPopover(false)}
                                >
                                  View on SEC ↗
                                </a>
                              ) : (
                                <Link
                                  href={inputUrl}
                                  className="text-blue-600 dark:text-blue-400 hover:underline mt-1 inline-block"
                                  onClick={() => setShowPopover(false)}
                                >
                                  {inputUrl.startsWith("#") ? "See below ↓" : "View Source →"}
                                </Link>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              
              {/* Notes */}
              {data.notes && (
                <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-2 rounded">
                  ⚠️ {data.notes}
                </div>
              )}
              
              {/* Source link + Last verified */}
              <div className="text-xs text-gray-500 flex justify-between items-center border-t border-gray-100 dark:border-gray-700 pt-2 mt-2">
                <span>Last verified: {data.lastVerified}</span>
                {/* Only show link for non-derived sources (derived has links on each input) */}
                {viewerUrl && data.source.type !== "derived" && (
                  isExternalUrl(viewerUrl) ? (
                    <a
                      href={viewerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-400"
                      onClick={() => setShowPopover(false)}
                    >
                      SEC Filing ↗
                    </a>
                  ) : (
                    <Link
                      href={viewerUrl}
                      className="text-blue-500 hover:text-blue-400"
                      onClick={() => setShowPopover(false)}
                    >
                      View Filing →
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Grid of provenance metrics for a company
 */
interface ProvenanceMetricsGridProps {
  metrics: Array<{
    label: string;
    data: ProvenanceValue<number>;
    format?: "currency" | "number" | "btc" | "eth" | "shares" | "mnav";
    subLabel?: string;
    tooltip?: string;
  }>;
  className?: string;
}

export function ProvenanceMetricsGrid({ metrics, className = "" }: ProvenanceMetricsGridProps) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ${className}`}>
      {metrics.map((metric, i) => (
        <ProvenanceMetric key={i} {...metric} />
      ))}
    </div>
  );
}
