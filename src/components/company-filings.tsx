"use client";

import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { FilingsResponse, Filing } from "@/app/api/filings/[ticker]/route";

interface CompanyFilingsProps {
  ticker: string;
  companyName: string;
  className?: string;
}

async function fetchFilings(ticker: string): Promise<FilingsResponse> {
  const response = await fetch(`/api/filings/${ticker}`);
  if (!response.ok) throw new Error("Failed to fetch filings");
  return response.json();
}

// Get form type description
function getFormDescription(type: string): string {
  const descriptions: Record<string, string> = {
    // Operational filings
    "8-K": "Current Report",
    "10-K": "Annual Report",
    "10-Q": "Quarterly Report",
    "4": "Insider Transaction",
    "DEF 14A": "Proxy Statement",
    "DEFA14A": "Proxy Soliciting Materials",
    "SC 13D": "Beneficial Ownership (>5%)",
    "SC 13G": "Beneficial Ownership (>5%)",
    // Registration filings
    "S-1": "IPO Registration",
    "S-3": "Shelf Registration",
    "S-4": "M&A Registration",
    "F-1": "Foreign IPO Registration",
    "F-3": "Foreign Shelf Registration",
    "424B": "Prospectus",
    "POS AM": "Post-Effective Amendment",
    "EFFECT": "Notice of Effectiveness",
    // Foreign issuer filings
    "6-K": "Foreign Current Report",
    "20-F": "Foreign Annual Report",
    "40-F": "Canadian Annual Report",
    // Private offerings
    "D": "Private Offering (Reg D)",
    "D/A": "Private Offering Amendment",
  };

  // Check if type starts with any known form
  for (const [form, desc] of Object.entries(descriptions)) {
    if (type.startsWith(form)) return desc;
  }
  return type;
}

// Get form type badge color
function getFormBadgeColor(type: string): string {
  // Operational filings
  if (type.startsWith("8-K") || type.startsWith("6-K")) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  if (type.startsWith("10-K") || type.startsWith("20-F") || type.startsWith("40-F")) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  if (type.startsWith("10-Q")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (type === "4") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  if (type.startsWith("DEF") || type.startsWith("DEFA")) return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
  if (type.startsWith("SC 13")) return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
  // Registration filings
  if (type.startsWith("S-") || type.startsWith("F-") || type.startsWith("424") || type.startsWith("POS") || type === "EFFECT") {
    return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  }
  // Private offerings
  if (type === "D" || type.startsWith("D/")) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200";
  return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
}

function FilingRow({ filing }: { filing: Filing }) {
  const formattedDate = new Date(filing.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Get human-readable description
  const formDescription = getFormDescription(filing.type);
  
  // For Form 4 and similar, always show the description as the title
  // and use the SEC title as subtitle if it adds info
  const isInsiderForm = filing.type === "4" || filing.type.startsWith("SC 13");
  const displayTitle = isInsiderForm ? formDescription : (filing.title || formDescription);
  const displaySubtitle = isInsiderForm && filing.title && filing.title !== filing.type 
    ? filing.title.replace(/^FORM\s+\d+\s*[-–]?\s*/i, "").trim()
    : null;

  return (
    <a
      href={filing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
    >
      <span className={cn("px-2 py-1 text-xs font-medium rounded", getFormBadgeColor(filing.type))}>
        {filing.type}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {displayTitle}{displaySubtitle ? ` - ${displaySubtitle}` : ""}
        </p>
        <p className="text-xs text-gray-500">{formattedDate}</p>
      </div>
      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
      </svg>
    </a>
  );
}

export function CompanyFilings({ ticker, companyName, className }: CompanyFilingsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["filings", ticker],
    queryFn: () => fetchFilings(ticker),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  return (
    <div className={cn("bg-gray-50 dark:bg-gray-900 rounded-lg p-4", className)}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Regulatory Filings
            </h2>
            {data?.status === "pre-public" && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 rounded">
                Pre-Public
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {data?.source || "Loading..."} {data?.jurisdiction ? `(${data.jurisdiction})` : ""}
            {data?.status === "pre-public" && " - Private offerings only"}
          </p>
        </div>
        {data?.sourceUrl && data.sourceUrl !== "#" && (
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
          >
            View All
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[200px] text-gray-500">
          Loading filings...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-[200px] text-gray-500">
          Failed to load filings
        </div>
      ) : data?.filings && data.filings.length > 0 ? (
        <div className="space-y-1 max-h-[400px] overflow-y-auto">
          {data.filings.map((filing, idx) => (
            <FilingRow key={`${filing.type}-${filing.date}-${idx}`} filing={filing} />
          ))}
        </div>
      ) : data?.jurisdiction && data.jurisdiction !== "US" && data.jurisdiction !== "US-OTC" ? (
        <div className="flex flex-col items-center justify-center h-[200px] text-gray-500">
          <p className="text-lg font-medium mb-2">International Company</p>
          <p className="text-sm text-center mb-4">
            Filings are available through {data.source}.
          </p>
          {data.sourceUrl && data.sourceUrl !== "#" && (
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              Visit {data.source}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[200px] text-gray-500">
          <p className="text-lg font-medium">No Filings Available</p>
          <p className="text-sm mt-2">
            SEC filings for this company are not yet indexed.
          </p>
          {data?.sourceUrl && data.sourceUrl !== "#" && (
            <a
              href={data.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm flex items-center gap-1"
            >
              Search {data.source} directly
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
