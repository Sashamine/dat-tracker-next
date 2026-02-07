"use client";

import { useState, useEffect } from "react";

interface XBRLFact {
  fact: string;
  value: number;
  unit: string;
  periodStart?: string;
  periodEnd: string;
  form: string;
  filed: string;
}

interface XBRLViewerProps {
  ticker: string;
  cik: string;
  accession: string;
  highlightFact?: string; // Fact to highlight/scroll to
}

// Key financial facts we care about for treasury companies
const PRIORITY_FACTS = [
  // Holdings & Assets
  "IndefiniteLivedIntangibleAssetsExcludingGoodwill",
  "IntangibleAssetsNetExcludingGoodwill",
  "DigitalAssets",
  "CryptoAssetHeld",
  
  // Cash Flow
  "NetCashProvidedByUsedInOperatingActivities",
  "NetCashProvidedByUsedInInvestingActivities", 
  "NetCashProvidedByUsedInFinancingActivities",
  "PaymentsToAcquireIntangibleAssets",
  
  // Shares
  "CommonStockSharesOutstanding",
  "CommonStockSharesIssued",
  "WeightedAverageNumberOfSharesOutstandingBasic",
  
  // Debt & Equity
  "LongTermDebt",
  "ConvertibleNotesPayable",
  "PreferredStockValue",
  "StockholdersEquity",
  
  // Performance
  "Revenues",
  "NetIncomeLoss",
  "OperatingIncomeLoss",
  
  // Other
  "CashAndCashEquivalentsAtCarryingValue",
  "Assets",
  "Liabilities",
];

export default function XBRLViewer({ ticker, cik, accession, highlightFact }: XBRLViewerProps) {
  const [facts, setFacts] = useState<XBRLFact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"priority" | "all">("priority");
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function fetchXBRL() {
      try {
        setLoading(true);
        
        // Fetch from our API route (which proxies to SEC with proper headers)
        const res = await fetch(`/api/xbrl/${cik}?accession=${accession}`);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch XBRL: ${res.status}`);
        }
        
        const data = await res.json();
        setFacts(data.facts || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load XBRL data");
      } finally {
        setLoading(false);
      }
    }
    
    fetchXBRL();
  }, [cik, accession]);

  // Filter facts
  const filteredFacts = facts.filter(f => {
    // Search filter
    if (search && !f.fact.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Priority filter
    if (filter === "priority") {
      return PRIORITY_FACTS.some(pf => f.fact.includes(pf));
    }
    return true;
  });

  // Sort with priority facts first
  const sortedFacts = [...filteredFacts].sort((a, b) => {
    const aIdx = PRIORITY_FACTS.findIndex(pf => a.fact.includes(pf));
    const bIdx = PRIORITY_FACTS.findIndex(pf => b.fact.includes(pf));
    if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
    if (aIdx >= 0) return -1;
    if (bIdx >= 0) return 1;
    return a.fact.localeCompare(b.fact);
  });

  // Format value for display
  function formatValue(value: number, unit: string): string {
    if (unit === "USD") {
      if (Math.abs(value) >= 1e9) {
        return `$${(value / 1e9).toFixed(2)}B`;
      } else if (Math.abs(value) >= 1e6) {
        return `$${(value / 1e6).toFixed(2)}M`;
      } else if (Math.abs(value) >= 1e3) {
        return `$${(value / 1e3).toFixed(0)}K`;
      }
      return `$${value.toLocaleString()}`;
    } else if (unit === "shares") {
      if (Math.abs(value) >= 1e6) {
        return `${(value / 1e6).toFixed(2)}M shares`;
      }
      return `${value.toLocaleString()} shares`;
    }
    return value.toLocaleString();
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading XBRL data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600 dark:text-red-400 mb-2">⚠️ {error}</p>
        <a
          href={`https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${accession.replace(/-/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          View on SEC.gov →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("priority")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
              filter === "priority"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            Key Facts ({facts.filter(f => PRIORITY_FACTS.some(pf => f.fact.includes(pf))).length})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded text-sm font-medium transition ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            All Facts ({facts.length})
          </button>
        </div>
        
        <input
          type="text"
          placeholder="Search facts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm flex-1 min-w-[200px]"
        />
      </div>

      {/* Facts table */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Fact</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">Value</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-gray-300">Period</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedFacts.map((fact, i) => {
              const isHighlighted = highlightFact && fact.fact.includes(highlightFact);
              const isPriority = PRIORITY_FACTS.some(pf => fact.fact.includes(pf));
              
              return (
                <tr 
                  key={`${fact.fact}-${fact.periodEnd}-${i}`}
                  id={fact.fact}
                  className={`
                    ${isHighlighted ? "bg-yellow-50 dark:bg-yellow-900/20" : ""}
                    ${isPriority ? "bg-blue-50/50 dark:bg-blue-900/10" : ""}
                    hover:bg-gray-50 dark:hover:bg-gray-800/50
                  `}
                >
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs text-gray-900 dark:text-gray-100">
                      {fact.fact.replace("us-gaap:", "").replace("dei:", "")}
                    </div>
                    {isPriority && (
                      <span className="text-xs text-blue-600 dark:text-blue-400">★ Key metric</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900 dark:text-gray-100">
                    {formatValue(fact.value, fact.unit)}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {fact.periodStart ? (
                      <span className="text-xs">
                        {fact.periodStart} → {fact.periodEnd}
                      </span>
                    ) : (
                      <span className="text-xs">As of {fact.periodEnd}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {sortedFacts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No matching facts found
          </div>
        )}
      </div>

      {/* SEC link */}
      <div className="text-center text-sm text-gray-500">
        <a
          href={`https://www.sec.gov/cgi-bin/viewer?action=view&cik=${cik}&accession_number=${accession.replace(/-/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          View original on SEC.gov →
        </a>
      </div>
    </div>
  );
}
