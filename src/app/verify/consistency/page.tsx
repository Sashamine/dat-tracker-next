"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Mismatch {
  ticker: string;
  field: string;
  expected: string | number;
  actual: string | number;
  source: string;
}

interface CompanyResult {
  ticker: string;
  name: string;
  status: "ok" | "mismatches" | "missing";
  mismatches: Mismatch[];
  checks: number;
}

interface Summary {
  total: number;
  ok: number;
  withMismatches: number;
  totalMismatches: number;
  totalChecks: number;
}

export default function ConsistencyPage() {
  const [results, setResults] = useState<CompanyResult[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "mismatches" | "ok">("all");

  useEffect(() => {
    fetch("/api/verify/data-consistency")
      .then((res) => res.json())
      .then((data) => {
        setResults(data.results || []);
        setSummary(data.summary || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredResults = results.filter((r) => {
    if (filter === "mismatches") return r.mismatches.length > 0;
    if (filter === "ok") return r.mismatches.length === 0;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-pulse">Running consistency checks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Data Consistency Check</h1>
          <p className="text-gray-400">
            Verifies that company pages display data matching our source files
          </p>
          <Link href="/verify" className="text-blue-400 hover:underline text-sm">
            ← Back to Verify
          </Link>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-5 gap-4 mb-8">
            <div className="bg-gray-900 p-4 rounded-lg">
              <div className="text-3xl font-bold">{summary.total}</div>
              <div className="text-gray-400 text-sm">Companies</div>
            </div>
            <div className="bg-green-900/30 p-4 rounded-lg">
              <div className="text-3xl font-bold text-green-400">{summary.ok}</div>
              <div className="text-gray-400 text-sm">Consistent</div>
            </div>
            <div className="bg-red-900/30 p-4 rounded-lg">
              <div className="text-3xl font-bold text-red-400">{summary.withMismatches}</div>
              <div className="text-gray-400 text-sm">With Issues</div>
            </div>
            <div className="bg-yellow-900/30 p-4 rounded-lg">
              <div className="text-3xl font-bold text-yellow-400">{summary.totalMismatches}</div>
              <div className="text-gray-400 text-sm">Total Mismatches</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-3xl font-bold">{summary.totalChecks}</div>
              <div className="text-gray-400 text-sm">Checks Run</div>
            </div>
          </div>
        )}

        {/* Filter */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded ${filter === "all" ? "bg-blue-600" : "bg-gray-800"}`}
          >
            All ({results.length})
          </button>
          <button
            onClick={() => setFilter("mismatches")}
            className={`px-4 py-2 rounded ${filter === "mismatches" ? "bg-red-600" : "bg-gray-800"}`}
          >
            Issues ({results.filter(r => r.mismatches.length > 0).length})
          </button>
          <button
            onClick={() => setFilter("ok")}
            className={`px-4 py-2 rounded ${filter === "ok" ? "bg-green-600" : "bg-gray-800"}`}
          >
            OK ({results.filter(r => r.mismatches.length === 0).length})
          </button>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {filteredResults.map((result) => (
            <div
              key={result.ticker}
              className={`p-4 rounded-lg ${
                result.mismatches.length > 0 ? "bg-red-900/20 border border-red-800" : "bg-gray-900"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-lg">{result.ticker}</span>
                  <span className="text-gray-400">{result.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500 text-sm">{result.checks} checks</span>
                  {result.mismatches.length === 0 ? (
                    <span className="text-green-400">✓ Consistent</span>
                  ) : (
                    <span className="text-red-400">{result.mismatches.length} issues</span>
                  )}
                </div>
              </div>

              {result.mismatches.length > 0 && (
                <div className="mt-3 space-y-2">
                  {result.mismatches.map((m, idx) => (
                    <div key={idx} className="bg-gray-950 p-3 rounded text-sm">
                      <div className="font-mono text-yellow-400 mb-1">{m.field}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-gray-500">Expected: </span>
                          <span className="text-green-400">
                            {typeof m.expected === "number" ? m.expected.toLocaleString() : m.expected}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Actual: </span>
                          <span className="text-red-400">
                            {typeof m.actual === "number" ? m.actual.toLocaleString() : m.actual}
                          </span>
                        </div>
                      </div>
                      <div className="text-gray-500 text-xs mt-1">{m.source}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
