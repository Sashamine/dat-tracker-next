"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";
import { trackCitationSourceClick } from "@/lib/client-events";

interface AnchorEntry {
  ticker: string;
  name: string;
  asset: string;
  holdings: number;
  holdingsSource: string | null;
  holdingsSourceUrl: string | null;
  sourceQuote: string | null;
  accessionNumber: string | null;
  filingUrl: string | null;
  date: string;
}

export default function AnchorsPage() {
  const [anchors, setAnchors] = useState<AnchorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetch("/api/anchors")
      .then((res) => res.json())
      .then((data) => {
        setAnchors(data.anchors || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load anchors:", err);
        setLoading(false);
      });
  }, []);

  const filtered = anchors.filter(
    (a) =>
      a.ticker.toLowerCase().includes(filter.toLowerCase()) ||
      a.name.toLowerCase().includes(filter.toLowerCase()) ||
      (a.sourceQuote && a.sourceQuote.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">Source Citations</h1>
              <p className="text-muted-foreground">
                Companies with SEC filings or source documents linked to holdings data
              </p>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Filter by ticker, name, or quote..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full md:w-80 px-3 py-2 border rounded-md bg-background"
              />
            </div>

            {loading ? (
              <div className="text-muted-foreground">Loading citations...</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Company</th>
                      <th className="text-left p-3 font-medium">Asset</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-right p-3 font-medium">Holdings</th>
                      <th className="text-left p-3 font-medium">Source</th>
                      <th className="text-left p-3 font-medium">Quote</th>
                      <th className="text-center p-3 font-medium">Filing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((anchor) => (
                      <tr key={anchor.ticker} className="border-t hover:bg-muted/50">
                        <td className="p-3">
                          <Link href={`/company/${anchor.ticker}`} className="font-medium text-blue-600 hover:underline">
                            {anchor.ticker}
                          </Link>
                          <span className="block text-xs text-muted-foreground">{anchor.name}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">{anchor.asset}</span>
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">{anchor.date}</td>
                        <td className="p-3 text-right font-mono">
                          {anchor.holdings.toLocaleString()}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {anchor.holdingsSource || "—"}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[250px]">
                          {anchor.sourceQuote ? (
                            <span className="line-clamp-2" title={anchor.sourceQuote}>
                              &ldquo;{anchor.sourceQuote}&rdquo;
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {anchor.filingUrl ? (
                            <a
                              href={anchor.filingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                trackCitationSourceClick({
                                  href: anchor.filingUrl || "",
                                  ticker: anchor.ticker,
                                  metric: "holdings_native",
                                })
                              }
                              className="text-blue-600 hover:underline"
                            >
                              R2 Filing
                            </a>
                          ) : anchor.holdingsSourceUrl ? (
                            <a
                              href={anchor.holdingsSourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() =>
                                trackCitationSourceClick({
                                  href: anchor.holdingsSourceUrl || "",
                                  ticker: anchor.ticker,
                                  metric: "holdings_native",
                                })
                              }
                              className="text-blue-600 hover:underline"
                            >
                              Source
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No citations found matching &quot;{filter}&quot;
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              {filtered.length} of {anchors.length} cited companies
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
