"use client";

import { useState } from "react";

interface SECFiling {
  date: string;
  filedDate: string;
  holdings?: number;
  holdingsChange?: number;
  accession: string;
  formType: string;
  items?: string;
  url: string;
  hasHoldingsUpdate: boolean;
}

interface SECFilingTimelineProps {
  ticker: string;
  cik: string;
  filings: SECFiling[];
  asset: string;
}

// Format date as "MMM d, yyyy" without date-fns
function formatDate(date: Date, includeYear = true): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  return includeYear ? `${month} ${day}, ${year}` : `${month} ${day}`;
}

export function SECFilingTimeline({ ticker, cik, filings, asset }: SECFilingTimelineProps) {
  const [showAll, setShowAll] = useState(false);
  
  const displayFilings = showAll ? filings : filings.slice(0, 5);
  const hasMore = filings.length > 5;

  const formatNumber = (n: number) => {
    if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
    if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toLocaleString();
  };

  return (
    <div className="rounded-lg border bg-card p-4">
      <h4 className="font-medium mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>📑</span>
          <span>SEC Filing Timeline</span>
        </div>
        <a
          href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=8-K&count=40`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          View all on EDGAR →
        </a>
      </h4>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-border" />
        
        {/* Filings */}
        <div className="space-y-4">
          {displayFilings.map((filing) => {
            const isHoldingsUpdate = filing.hasHoldingsUpdate;
            const filedDate = new Date(filing.filedDate);
            const periodDate = new Date(filing.date);
            
            return (
              <div key={filing.accession} className="relative pl-8">
                {/* Timeline dot */}
                <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full border-2 ${
                  isHoldingsUpdate 
                    ? "bg-green-500 border-green-500" 
                    : "bg-background border-muted-foreground"
                }`} />
                
                <div className={`rounded-lg p-3 ${
                  isHoldingsUpdate ? "bg-green-50 dark:bg-green-950/20" : "bg-muted/30"
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {filing.formType}
                        </span>
                        {isHoldingsUpdate && (
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded">
                            Holdings Update
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Filed {formatDate(filedDate)}
                        {filing.date !== filing.filedDate && (
                          <span> (period: {formatDate(periodDate, false)})</span>
                        )}
                      </div>
                      {filing.items && (
                        <div className="text-xs text-muted-foreground">
                          Items: {filing.items}
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right">
                      {filing.holdings && (
                        <div className="font-mono text-sm">
                          {formatNumber(filing.holdings)} {asset}
                        </div>
                      )}
                      {filing.holdingsChange && filing.holdingsChange !== 0 && (
                        <div className={`text-xs font-mono ${
                          filing.holdingsChange > 0 
                            ? "text-green-600 dark:text-green-400" 
                            : "text-red-600 dark:text-red-400"
                        }`}>
                          {filing.holdingsChange > 0 ? "+" : ""}{formatNumber(filing.holdingsChange)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Link to filing */}
                  <a
                    href={filing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block"
                  >
                    View filing →
                  </a>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Show more/less button */}
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-4 ml-8 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showAll ? "Show less" : `Show ${filings.length - 5} more filings`}
          </button>
        )}
      </div>
    </div>
  );
}

// Helper to convert provenance data to timeline format
export function provenanceToTimeline(
  holdings: Array<{
    date: string;
    filedDate: string;
    holdings: number;
    accession: string;
    url: string;
  }>,
  allFilings?: Array<{
    accession: string;
    formType: string;
    filedDate: string;
    periodDate: string;
    items: string;
    url: string;
    hasHoldingsUpdate: boolean;
  }>
): SECFiling[] {
  // If we have all filings, use them with enriched holdings data
  if (allFilings) {
    const holdingsMap = new Map(holdings.map(h => [h.accession, h]));
    
    return allFilings.map((f, idx) => {
      const holdingsData = holdingsMap.get(f.accession);
      const prevHoldings = idx > 0 ? holdingsMap.get(allFilings[idx - 1].accession)?.holdings : undefined;
      
      return {
        date: f.periodDate,
        filedDate: f.filedDate,
        holdings: holdingsData?.holdings,
        holdingsChange: holdingsData && prevHoldings 
          ? holdingsData.holdings - prevHoldings 
          : undefined,
        accession: f.accession,
        formType: f.formType,
        items: f.items,
        url: f.url,
        hasHoldingsUpdate: f.hasHoldingsUpdate,
      };
    });
  }
  
  // Otherwise, just use holdings updates
  return holdings.map((h, idx) => ({
    date: h.date,
    filedDate: h.filedDate,
    holdings: h.holdings,
    holdingsChange: idx > 0 ? h.holdings - holdings[idx - 1].holdings : undefined,
    accession: h.accession,
    formType: "8-K",
    url: h.url,
    hasHoldingsUpdate: true,
  }));
}
