"use client";

import { useState } from "react";
import type { ProvenanceValue, XBRLSource, DocumentSource, DerivedSource } from "@/lib/data/types/provenance";
import { xbrlViewerUrl, edgarFilingUrl } from "@/lib/data/types/provenance";

interface ProvenanceValueProps {
  data: ProvenanceValue<number>;
  format?: "currency" | "number" | "compact";
  className?: string;
}

/** Format number for display */
function formatValue(value: number, format: "currency" | "number" | "compact" = "number"): string {
  if (format === "currency") {
    if (Math.abs(value) >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `$${(value / 1e6).toFixed(1)}M`;
    } else {
      return `$${value.toLocaleString()}`;
    }
  } else if (format === "compact") {
    if (Math.abs(value) >= 1e9) {
      return `${(value / 1e9).toFixed(2)}B`;
    } else if (Math.abs(value) >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    }
  }
  return value.toLocaleString();
}

/** Get verification URL based on source type */
function getVerifyUrl(source: XBRLSource | DocumentSource | DerivedSource): string | null {
  if (source.type === "xbrl") {
    return xbrlViewerUrl(source.cik, source.accession);
  } else if (source.type === "sec-document" && source.cik && source.accession) {
    return edgarFilingUrl(source.cik, source.accession);
  } else if (source.type === "sec-document" || source.type === "press-release" || 
             source.type === "company-website" || source.type === "regulatory") {
    return source.url;
  } else if (source.type === "derived") {
    // For derived, link to first input's source
    const firstInput = Object.values(source.inputs)[0];
    if (firstInput) {
      return getVerifyUrl(firstInput.source);
    }
  }
  return null;
}

/** Get source label */
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
      return "Derived";
  }
}

export default function ProvenanceValueDisplay({ data, format = "number", className = "" }: ProvenanceValueProps) {
  const [showDetails, setShowDetails] = useState(false);
  const verifyUrl = getVerifyUrl(data.source);
  
  return (
    <span className={`relative inline-block ${className}`}>
      {/* Main value - clickable */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="underline decoration-dotted decoration-gray-400 hover:decoration-blue-500 cursor-pointer"
        title="Click for source details"
      >
        {formatValue(data.value, format)}
      </button>
      
      {/* Source details popover */}
      {showDetails && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDetails(false)}
          />
          
          {/* Popover */}
          <div className="absolute left-0 top-full mt-2 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[320px] text-left">
            <div className="text-sm space-y-3">
              {/* Header */}
              <div className="flex justify-between items-start">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Data Provenance
                </span>
                <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                  {getSourceLabel(data.source)}
                </span>
              </div>
              
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
                      {data.source.fact}
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
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Filing</div>
                    <div className="text-gray-900 dark:text-gray-100">
                      {data.source.filingType} filed {data.source.filingDate}
                    </div>
                  </div>
                </>
              )}
              
              {/* Document-specific details */}
              {(data.source.type === "sec-document" || data.source.type === "press-release" || 
                data.source.type === "company-website" || data.source.type === "regulatory") && (
                <>
                  {data.source.quote && (
                    <div>
                      <div className="text-gray-600 dark:text-gray-400 text-xs">Source Quote</div>
                      <div className="text-gray-900 dark:text-gray-100 italic text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded">
                        "{data.source.quote}"
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Document Date</div>
                    <div className="text-gray-900 dark:text-gray-100">
                      {data.source.documentDate}
                    </div>
                  </div>
                </>
              )}
              
              {/* Derived-specific details */}
              {data.source.type === "derived" && (
                <>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Derivation</div>
                    <div className="text-gray-900 dark:text-gray-100">
                      {data.source.derivation}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Formula</div>
                    <div className="font-mono text-xs text-gray-900 dark:text-gray-100">
                      {data.source.formula}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-600 dark:text-gray-400 text-xs">Inputs</div>
                    <div className="space-y-1 mt-1">
                      {Object.entries(data.source.inputs).map(([key, input]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="font-mono text-gray-600 dark:text-gray-400">{key}:</span>
                          <span className="font-mono text-gray-900 dark:text-gray-100">
                            {input.value.toLocaleString()}
                          </span>
                        </div>
                      ))}
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
              
              {/* Verify button */}
              {verifyUrl && (
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                >
                  Verify at Source →
                </a>
              )}
              
              {/* Last verified */}
              <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
                Last verified: {data.lastVerified}
              </div>
            </div>
          </div>
        </>
      )}
    </span>
  );
}
