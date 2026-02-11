"use client";

import { Company } from "@/lib/types";
import { formatDistanceToNow, parseISO } from "date-fns";

interface DataFreshnessIndicatorProps {
  company: Company;
}

export function DataFreshnessIndicator({ company }: DataFreshnessIndicatorProps) {
  const lastVerified = company.lastVerified;
  const lastUpdated = company.holdingsLastUpdated;
  const nextFiling = company.nextExpectedFiling;
  const accession = company.holdingsAccession;
  
  if (!lastUpdated && !lastVerified) {
    return null;
  }

  const updatedDate = lastUpdated ? parseISO(lastUpdated) : null;
  const verifiedDate = lastVerified ? parseISO(lastVerified) : null;
  
  const daysSinceUpdate = updatedDate 
    ? Math.floor((Date.now() - updatedDate.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  // Freshness indicator color
  const getFreshnessColor = () => {
    if (!daysSinceUpdate) return "text-muted-foreground";
    if (daysSinceUpdate <= 7) return "text-green-600 dark:text-green-400";
    if (daysSinceUpdate <= 30) return "text-yellow-600 dark:text-yellow-400";
    if (daysSinceUpdate <= 90) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getFreshnessIcon = () => {
    if (!daysSinceUpdate) return "📋";
    if (daysSinceUpdate <= 7) return "✅";
    if (daysSinceUpdate <= 30) return "🟡";
    if (daysSinceUpdate <= 90) return "🟠";
    return "🔴";
  };

  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <h4 className="font-medium mb-2 flex items-center gap-2">
        <span>📋</span>
        <span>Data Provenance</span>
      </h4>
      
      <div className="space-y-2 text-muted-foreground">
        {/* Last holdings update */}
        {lastUpdated && (
          <div className="flex items-center justify-between">
            <span>Holdings Updated</span>
            <span className={`font-medium ${getFreshnessColor()}`}>
              {getFreshnessIcon()} {formatDistanceToNow(updatedDate!, { addSuffix: true })}
            </span>
          </div>
        )}
        
        {/* SEC Accession link */}
        {accession && (
          <div className="flex items-center justify-between">
            <span>SEC Filing</span>
            <a 
              href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${company.secCik}&type=8-K`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs"
            >
              {accession.replace(/^0+/, '')}
            </a>
          </div>
        )}
        
        {/* Last verified */}
        {lastVerified && (
          <div className="flex items-center justify-between">
            <span>Verified</span>
            <span className="font-medium">
              {verifiedDate?.toLocaleDateString()}
            </span>
          </div>
        )}
        
        {/* Next expected filing */}
        {nextFiling && (
          <div className="flex items-center justify-between">
            <span>Next Filing</span>
            <span className="text-xs">{nextFiling}</span>
          </div>
        )}
        
        {/* Provenance file link */}
        {company.provenanceFile && (
          <div className="pt-2 border-t mt-2">
            <a 
              href={`https://github.com/Sashamine/dat-tracker-next/blob/master/src/lib/data/${company.provenanceFile}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>📁</span>
              <span>View full audit trail</span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
