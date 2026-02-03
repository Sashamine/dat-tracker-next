"use client";

import { ReactNode, createContext, useContext, useState } from "react";
import Link from "next/link";

interface CitationSource {
  id: number;
  label: string;
  url: string;
  date?: string;
  type?: string;
}

interface CitationContextType {
  sources: CitationSource[];
  addSource: (source: Omit<CitationSource, "id">) => number;
}

const CitationContext = createContext<CitationContextType | null>(null);

/**
 * Provider for managing citations on a page
 */
export function CitationProvider({ children }: { children: ReactNode }) {
  const [sources, setSources] = useState<CitationSource[]>([]);

  const addSource = (source: Omit<CitationSource, "id">) => {
    // Check if source already exists (by URL)
    const existing = sources.find((s) => s.url === source.url);
    if (existing) return existing.id;

    const id = sources.length + 1;
    setSources((prev) => [...prev, { ...source, id }]);
    return id;
  };

  return (
    <CitationContext.Provider value={{ sources, addSource }}>
      {children}
    </CitationContext.Provider>
  );
}

/**
 * Wikipedia-style [1] citation link
 */
export function Cite({
  label,
  url,
  date,
  type,
}: {
  label: string;
  url: string;
  date?: string;
  type?: string;
}) {
  const context = useContext(CitationContext);
  
  if (!context) {
    // Fallback if no provider - just show link
    return (
      <Link
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-blue-500 hover:text-blue-400 align-super ml-0.5"
      >
        [src]
      </Link>
    );
  }

  const id = context.addSource({ label, url, date, type });

  return (
    <Link
      href={`#cite-${id}`}
      className="text-[10px] text-blue-500 hover:text-blue-400 align-super ml-0.5 no-underline"
      title={label}
    >
      [{id}]
    </Link>
  );
}

/**
 * Inline citation that links directly to filing viewer
 * Shows filing type like [8-K ↗] or [10-Q ↗]
 */
export function FilingCite({
  ticker,
  date,
  highlight,
  filingType = "8-K",
}: {
  ticker: string;
  date: string;
  highlight?: string;
  filingType?: "8-K" | "10-Q" | "10-K" | "S-3" | "424B3";
}) {
  const url = `/filings/${ticker.toLowerCase()}/${date}${highlight ? `?highlight=${encodeURIComponent(highlight)}` : ""}`;
  
  return (
    <Link
      href={url}
      className="text-[10px] text-blue-500 hover:text-blue-400 align-super ml-1 no-underline whitespace-nowrap"
      title={`View ${filingType} filing from ${date}`}
    >
      [{filingType}&nbsp;↗]
    </Link>
  );
}

/**
 * References section at bottom of page
 */
export function References() {
  const context = useContext(CitationContext);
  
  if (!context || context.sources.length === 0) return null;

  return (
    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
        References
      </h3>
      <ol className="text-xs text-gray-600 dark:text-gray-400 space-y-1.5 list-none">
        {context.sources.map((source) => (
          <li key={source.id} id={`cite-${source.id}`} className="flex gap-2">
            <span className="text-gray-400 w-4">{source.id}.</span>
            <div>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-400 hover:underline"
              >
                {source.label}
              </a>
              {source.date && (
                <span className="text-gray-500 ml-2">({source.date})</span>
              )}
              {source.type && (
                <span className="text-gray-500 ml-2">• {source.type}</span>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
