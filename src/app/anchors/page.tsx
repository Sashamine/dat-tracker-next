"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileHeader } from "@/components/mobile-header";

interface AnchorEntry {
  ticker: string;
  filingType: string;
  filename: string;
  path: string;
  holdings: string | null;
  context: string;
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
      a.filename.toLowerCase().includes(filter.toLowerCase()) ||
      (a.holdings && a.holdings.includes(filter))
  );

  return (
    <div className="flex min-h-screen bg-background">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <MobileHeader />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold mb-2">SEC Filing Anchors</h1>
              <p className="text-muted-foreground">
                Files with <code className="bg-muted px-1 rounded">id="dat-btc-holdings"</code> anchors for citation linking
              </p>
            </div>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Filter by ticker, filename, or holdings..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full md:w-80 px-3 py-2 border rounded-md bg-background"
              />
            </div>

            {loading ? (
              <div className="text-muted-foreground">Scanning files...</div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 font-medium">Ticker</th>
                      <th className="text-left p-3 font-medium">Filing</th>
                      <th className="text-left p-3 font-medium">Date</th>
                      <th className="text-right p-3 font-medium">Holdings</th>
                      <th className="text-left p-3 font-medium">Context</th>
                      <th className="text-center p-3 font-medium">View</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((anchor, i) => (
                      <tr key={i} className="border-t hover:bg-muted/50">
                        <td className="p-3 font-mono uppercase">{anchor.ticker}</td>
                        <td className="p-3">
                          <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {anchor.filingType}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">{anchor.date}</td>
                        <td className="p-3 text-right font-mono">
                          {anchor.holdings ? (
                            <span className="text-green-600 dark:text-green-400">
                              {anchor.holdings} BTC
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground max-w-xs truncate">
                          {anchor.context}
                        </td>
                        <td className="p-3 text-center">
                          <a
                            href={`${anchor.path}#dat-btc-holdings`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Open →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    No anchors found matching "{filter}"
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              {filtered.length} of {anchors.length} anchored filings
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
