"use client";

import { useState, useEffect } from "react";

interface DataPoint {
  ticker: string;
  asset: string;
  date: string;
  holdings: number;
  sharesOutstanding: number;
  holdingsPerShare: number;
  source: string;
  sourceUrl: string | null;
  sourceType: string;
  verified?: boolean;
}

export default function CitationVerificationPage() {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [selectedPoint, setSelectedPoint] = useState<DataPoint | null>(null);
  const [filter, setFilter] = useState<"all" | "unverified" | "verified">("all");
  const [tickerFilter, setTickerFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/holdings-verification")
      .then((res) => res.json())
      .then((data) => {
        setDataPoints(data.dataPoints || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredPoints = dataPoints.filter((dp) => {
    if (filter === "verified" && !dp.verified) return false;
    if (filter === "unverified" && dp.verified) return false;
    if (tickerFilter && !dp.ticker.toLowerCase().includes(tickerFilter.toLowerCase())) return false;
    return true;
  });

  const uniqueTickers = [...new Set(dataPoints.map((dp) => dp.ticker))].sort();

  const getDocumentUrl = (point: DataPoint): string | null => {
    if (!point.sourceUrl) return null;
    
    // If it's a local /filings/ URL, we need to redirect to SEC
    if (point.sourceUrl.startsWith("/filings/")) {
      // Extract ticker and accession from URL like /filings/mstr/0001050446-25-000123
      const parts = point.sourceUrl.replace("/filings/", "").split("/");
      if (parts.length >= 2) {
        const ticker = parts[0];
        const accession = parts[1].split("#")[0];
        return `/api/sec/fetch-filing?ticker=${ticker}&accession=${accession}`;
      }
    }
    
    // External URL - use directly
    return point.sourceUrl;
  };

  const formatNumber = (n: number): string => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-pulse">Loading verification data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 p-4">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Citation Verification</h1>
            <p className="text-gray-400 text-sm">
              {dataPoints.length} data points • {dataPoints.filter(d => d.verified).length} verified
            </p>
          </div>
          <div className="flex gap-4">
            <select
              value={tickerFilter}
              onChange={(e) => setTickerFilter(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="">All Companies</option>
              {uniqueTickers.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="all">All</option>
              <option value="unverified">Unverified</option>
              <option value="verified">Verified</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Data Points */}
        <div className="w-1/3 border-r border-gray-800 overflow-y-auto">
          <div className="p-2 space-y-1">
            {filteredPoints.map((point, idx) => (
              <button
                key={`${point.ticker}-${point.date}-${idx}`}
                onClick={() => setSelectedPoint(point)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedPoint?.ticker === point.ticker && selectedPoint?.date === point.date
                    ? "bg-blue-900/50 border border-blue-500"
                    : "bg-gray-900 hover:bg-gray-800 border border-transparent"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-blue-400">{point.ticker}</span>
                  <span className="text-xs text-gray-500">{point.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Holdings:</span>{" "}
                    <span className="text-white">{formatNumber(point.holdings)} {point.asset}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Shares:</span>{" "}
                    <span className="text-white">{formatNumber(point.sharesOutstanding)}</span>
                  </div>
                </div>
                <div className="mt-1 text-xs text-gray-400 truncate">
                  {point.source}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    point.sourceType === "sec-filing" ? "bg-green-900/50 text-green-400" :
                    point.sourceType === "regulatory-filing" ? "bg-yellow-900/50 text-yellow-400" :
                    point.sourceType === "press-release" ? "bg-purple-900/50 text-purple-400" :
                    "bg-gray-800 text-gray-400"
                  }`}>
                    {point.sourceType}
                  </span>
                  {point.verified && (
                    <span className="text-xs px-2 py-0.5 rounded bg-green-900/50 text-green-400">
                      ✓ Verified
                    </span>
                  )}
                  {!point.sourceUrl && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-900/50 text-red-400">
                      No URL
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right Panel - Document Viewer */}
        <div className="w-2/3 flex flex-col">
          {selectedPoint ? (
            <>
              {/* Document Header */}
              <div className="p-4 border-b border-gray-800 bg-gray-900">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-lg">
                      {selectedPoint.ticker} - {selectedPoint.date}
                    </h2>
                    <p className="text-sm text-gray-400">{selectedPoint.source}</p>
                  </div>
                  <div className="flex gap-2">
                    {selectedPoint.sourceUrl && (
                      <a
                        href={selectedPoint.sourceUrl.startsWith("http") ? selectedPoint.sourceUrl : `https://www.sec.gov${selectedPoint.sourceUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                      >
                        Open Original ↗
                      </a>
                    )}
                    <button
                      onClick={() => {
                        // TODO: Mark as verified via API
                        setDataPoints(prev => prev.map(dp => 
                          dp.ticker === selectedPoint.ticker && dp.date === selectedPoint.date
                            ? { ...dp, verified: true }
                            : dp
                        ));
                        setSelectedPoint(prev => prev ? { ...prev, verified: true } : null);
                      }}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-sm"
                    >
                      ✓ Mark Verified
                    </button>
                  </div>
                </div>
                
                {/* Data Point Details */}
                <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-gray-400">Holdings</div>
                    <div className="text-xl font-bold">{selectedPoint.holdings.toLocaleString()}</div>
                    <div className="text-gray-500">{selectedPoint.asset}</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-gray-400">Shares Outstanding</div>
                    <div className="text-xl font-bold">{formatNumber(selectedPoint.sharesOutstanding)}</div>
                    <div className="text-gray-500">diluted</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-gray-400">Holdings/Share</div>
                    <div className="text-xl font-bold">{selectedPoint.holdingsPerShare.toFixed(6)}</div>
                    <div className="text-gray-500">{selectedPoint.asset}/share</div>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="text-gray-400">Source Type</div>
                    <div className="text-xl font-bold capitalize">{selectedPoint.sourceType.replace("-", " ")}</div>
                  </div>
                </div>
              </div>

              {/* Document Frame */}
              <div className="flex-1 bg-white">
                {selectedPoint.sourceUrl ? (
                  <iframe
                    src={getDocumentUrl(selectedPoint) || ""}
                    className="w-full h-full"
                    title="Source Document"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <div className="text-4xl mb-4">📄</div>
                      <div>No source URL available for this data point</div>
                      <div className="text-sm mt-2">Source: {selectedPoint.source}</div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">👈</div>
                <div className="text-xl">Select a data point to view its source</div>
                <div className="text-sm mt-2">Click any entry on the left to load the document</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
