"use client";

import { useEffect, useState } from "react";
import FilingViewer from "./FilingViewer";
import Link from "next/link";

interface FilingViewerClientProps {
  ticker: string;
  accession: string;
  searchQuery?: string;
}

export default function FilingViewerClient({ ticker, accession, searchQuery }: FilingViewerClientProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchContent() {
      setLoading(true);
      setError(null);
      
      const tickerLower = ticker.toLowerCase();
      
      // Normalize accession format
      const accessionWithDashes = accession.includes("-")
        ? accession
        : `${accession.slice(0, 10)}-${accession.slice(10, 12)}-${accession.slice(12)}`;
      
      // R2 bucket for SEC filings (primary), SEC EDGAR (fallback)
      const r2Base = "https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev";
      
      // Ticker to batch mapping
      const tickerBatches: Record<string, number> = {
        abtc: 1, asst: 1, avx: 1, bmnr: 1, bnc: 1, btbt: 1, btcs: 1, btdr: 1, btog: 1, cepo: 1, clsk: 1,
        corz: 2, cwd: 2, cyph: 2, dfdv: 2, djt: 2, ethm: 2, fgnx: 2, fwdi: 2,
        game: 3, hsdt: 3, hypd: 3, kulr: 3, lits: 3, mara: 3, mstr: 3, na: 3,
        naka: 4, nxtt: 4, purr: 4, riot: 4, sbet: 4, stke: 4, suig: 4,
        taox: 5, tbh: 5, tron: 5, twav: 5, upxi: 5, xrpn: 5, xxi: 5,
        zone: 6,
      };
      const batch = tickerBatches[tickerLower] || 1;
      
      // Try R2 first, then fall back to fetching from SEC via our API
      const urls = [
        `${r2Base}/batch${batch}/${tickerLower}/${accessionWithDashes}.txt`,
        `/api/sec/fetch-content?ticker=${tickerLower}&accession=${accessionWithDashes}`,
      ];
      
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const text = await res.text();
            setContent(text);
            setLoading(false);
            return;
          }
        } catch {
          continue;
        }
      }
      
      setError(`Filing not found: ${ticker}/${accession}`);
      setLoading(false);
    }
    
    fetchContent();
  }, [ticker, accession]);
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading filing {accession}...</p>
        </div>
      </div>
    );
  }
  
  if (error || !content) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">📄</div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Filing Not Found
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error || `Could not load ${ticker} filing ${accession}`}
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href={`/company/${ticker.toLowerCase()}`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to {ticker}
            </Link>
            <a
              href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${ticker}&type=&dateb=&owner=include&count=40`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Search SEC EDGAR
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <FilingViewer 
      ticker={ticker}
      accession={accession}
      content={content}
      searchQuery={searchQuery}
    />
  );
}
