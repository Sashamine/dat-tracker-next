"use client";

import { useEffect, useState } from "react";
import FilingViewer from "./FilingViewer";
import XBRLViewer from "./XBRLViewer";
import Link from "next/link";

// Ticker to CIK mapping
const TICKER_CIKS: Record<string, string> = {
  mstr: "1050446", mara: "1507605", riot: "1167419", clsk: "1515671",
  btbt: "1799290", kulr: "1662684", bmnr: "1829311", corz: "1878848",
  abtc: "2068580", btcs: "1510079", game: "1825079", fgnx: "1437925",
  dfdv: "1652044", upxi: "1777319", hsdt: "1580063", tron: "1956744",
  cwd: "1627282", stke: "1846839", djt: "1849635", naka: "1977303",
  tbh: "1903595", fwdi: "38264", hypd: "1830131", xxi: "1949556",
  sbet: "1981535", avx: "1826397",
};

interface FilingViewerClientProps {
  ticker: string;
  accession: string;
  searchQuery?: string;
  anchor?: string; // Section anchor like "btc-holdings" or "staking"
  initialTab?: "document" | "xbrl"; // Which tab to show initially
  highlightFact?: string; // XBRL fact to highlight
  highlightPeriod?: string; // XBRL period end date to match
}

export default function FilingViewerClient({ ticker, accession, searchQuery, anchor, initialTab, highlightFact, highlightPeriod }: FilingViewerClientProps) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"document" | "xbrl">(initialTab || "document");
  
  const cik = TICKER_CIKS[ticker.toLowerCase()];
  
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Tab navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-4">
              <Link 
                href={`/company/${ticker.toLowerCase()}`}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ← {ticker}
              </Link>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                {accession}
              </span>
            </div>
            
            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("document")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  activeTab === "document"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                📄 Document
              </button>
              <button
                onClick={() => setActiveTab("xbrl")}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition ${
                  activeTab === "xbrl"
                    ? "bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                📊 XBRL Data
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      {activeTab === "document" ? (
        <FilingViewer 
          ticker={ticker}
          accession={accession}
          content={content}
          searchQuery={searchQuery}
          anchor={anchor}
        />
      ) : (
        <div className="max-w-7xl mx-auto p-4">
          {cik ? (
            <XBRLViewer
              ticker={ticker}
              cik={cik}
              accession={accession}
              highlightFact={highlightFact}
              highlightPeriod={highlightPeriod}
            />
          ) : (
            <div className="text-center py-8 text-gray-500">
              CIK not found for {ticker}. XBRL data unavailable.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
