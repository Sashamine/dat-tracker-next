"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { FilingsResponse, Filing } from "@/app/api/filings/[ticker]/route";

async function fetchFilings(ticker: string): Promise<FilingsResponse> {
  const response = await fetch(`/api/filings/${ticker}`);
  if (!response.ok) throw new Error("Failed to fetch filings");
  return response.json();
}

// Get form type description
function getFormDescription(type: string): string {
  const descriptions: Record<string, string> = {
    "8-K": "Current Report",
    "10-K": "Annual Report",
    "10-Q": "Quarterly Report",
    "4": "Insider Transaction",
    "DEF 14A": "Proxy Statement",
    "S-3": "Shelf Registration",
    "424B5": "Prospectus Supplement",
    "6-K": "Foreign Current Report",
    "20-F": "Foreign Annual Report",
  };
  for (const [form, desc] of Object.entries(descriptions)) {
    if (type.startsWith(form)) return desc;
  }
  return type;
}

// Get form type badge color
function getFormBadgeColor(type: string): string {
  if (type.startsWith("8-K") || type.startsWith("6-K")) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  if (type.startsWith("10-K") || type.startsWith("20-F")) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
  if (type.startsWith("10-Q")) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (type.startsWith("424")) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
}

export default function FilingsListPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ticker = (params.ticker as string).toUpperCase();
  
  // Filter params
  const typeFilter = searchParams.get("type"); // e.g., "8-K"
  const afterFilter = searchParams.get("after"); // e.g., "2025-10-29"
  const beforeFilter = searchParams.get("before"); // e.g., "2026-01-31"

  const { data, isLoading, error } = useQuery({
    queryKey: ["filings", ticker],
    queryFn: () => fetchFilings(ticker),
    staleTime: 30 * 60 * 1000,
  });

  // Apply filters
  const filteredFilings = data?.filings?.filter((filing) => {
    if (typeFilter && !filing.type.startsWith(typeFilter)) return false;
    if (afterFilter && filing.date < afterFilter) return false;
    if (beforeFilter && filing.date > beforeFilter) return false;
    return true;
  }) || [];

  // Build filter description
  const filterParts: string[] = [];
  if (typeFilter) filterParts.push(`Type: ${typeFilter}`);
  if (afterFilter) filterParts.push(`After: ${afterFilter}`);
  if (beforeFilter) filterParts.push(`Before: ${beforeFilter}`);
  const filterDescription = filterParts.length > 0 ? filterParts.join(" • ") : null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href={`/company/${ticker}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-2 inline-block"
          >
            ← Back to {ticker}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {ticker} SEC Filings
          </h1>
          {filterDescription && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Filtered: {filterDescription}
              </span>
              <Link
                href={`/filings/${ticker}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters
              </Link>
            </div>
          )}
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {isLoading ? "Loading..." : `${filteredFilings.length} filings`}
            {data?.filings && filteredFilings.length !== data.filings.length && 
              ` (${data.filings.length} total)`}
          </p>
        </div>

        {/* Filings list */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading filings...</div>
        ) : error ? (
          <div className="text-center py-12 text-red-500">Failed to load filings</div>
        ) : filteredFilings.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No filings match the current filters
          </div>
        ) : (
          <div className="space-y-2">
            {filteredFilings.map((filing, idx) => (
              <FilingRow key={`${filing.accession}-${idx}`} filing={filing} ticker={ticker} />
            ))}
          </div>
        )}

        {/* Provenance note */}
        {filterDescription && (
          <div className="mt-8 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-sm text-amber-800 dark:text-amber-200">
            <strong>📊 Provenance Note:</strong> This filtered view shows the SEC filings that 
            contribute to an aggregated data point. Each filing can be opened to verify the 
            specific values reported.
          </div>
        )}
      </div>
    </div>
  );
}

function FilingRow({ filing, ticker }: { filing: Filing; ticker: string }) {
  const formattedDate = new Date(filing.date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Link to our internal viewer if we have an accession number
  const viewerUrl = filing.accession 
    ? `/filings/${ticker}/${filing.accession}`
    : filing.url;
  const isInternal = !!filing.accession;

  return (
    <Link
      href={viewerUrl}
      target={isInternal ? undefined : "_blank"}
      rel={isInternal ? undefined : "noopener noreferrer"}
      className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors group"
    >
      <span className={cn("px-3 py-1.5 text-sm font-medium rounded", getFormBadgeColor(filing.type))}>
        {filing.type}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
          {filing.title || getFormDescription(filing.type)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          {formattedDate}
          {filing.accession && (
            <span className="ml-2 font-mono text-xs text-gray-400">
              {filing.accession}
            </span>
          )}
        </p>
      </div>
      <svg 
        className="w-5 h-5 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 flex-shrink-0" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        {isInternal ? (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        )}
      </svg>
    </Link>
  );
}
