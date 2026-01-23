"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MobileHeader } from "@/components/mobile-header";
import { ExternalLink, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

interface Discrepancy {
  id: number;
  company_id: number;
  ticker: string;
  company_name: string;
  field: string;
  our_value: number;
  source_values: Record<string, { value: number; url: string; date: string }>;
  severity: "minor" | "moderate" | "major";
  max_deviation_pct: number;
  status: "pending" | "resolved" | "dismissed";
  resolved_value: number | null;
  resolution_source: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  created_date: string;
}

interface Summary {
  total: number;
  pending: number;
  resolved: number;
  dismissed: number;
  bySeverity: {
    major: number;
    moderate: number;
    minor: number;
  };
}

const SEVERITY_COLORS = {
  major: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  minor: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const STATUS_COLORS = {
  pending: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  dismissed: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const STATUS_ICONS = {
  pending: Clock,
  resolved: CheckCircle,
  dismissed: XCircle,
};

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(2)}B`;
  } else if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`;
  } else if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toFixed(0);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DiscrepancyCard({ discrepancy }: { discrepancy: Discrepancy }) {
  const StatusIcon = STATUS_ICONS[discrepancy.status];
  const sources = Object.entries(discrepancy.source_values);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Link
            href={`/company/${discrepancy.ticker}`}
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            {discrepancy.ticker}
          </Link>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {discrepancy.field.replace("_", " ")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[discrepancy.severity]}`}>
            {discrepancy.severity}
          </span>
          <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${STATUS_COLORS[discrepancy.status]}`}>
            <StatusIcon className="w-3 h-3" />
            {discrepancy.status}
          </span>
        </div>
      </div>

      {/* Values comparison */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">Our value:</span>
          <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
            {formatNumber(discrepancy.our_value)}
          </span>
        </div>

        {sources.map(([sourceName, sourceData]) => (
          <div key={sourceName} className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {sourceName}:
              {sourceData.url && (
                <a
                  href={sourceData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </span>
            <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
              {formatNumber(sourceData.value)}
            </span>
          </div>
        ))}

        <div className="flex items-center justify-between text-sm pt-1 border-t border-gray-100 dark:border-gray-800">
          <span className="text-gray-500 dark:text-gray-400">Deviation:</span>
          <span className={`font-mono font-medium ${
            discrepancy.severity === "major" ? "text-red-600 dark:text-red-400" :
            discrepancy.severity === "moderate" ? "text-yellow-600 dark:text-yellow-400" :
            "text-gray-600 dark:text-gray-400"
          }`}>
            {discrepancy.max_deviation_pct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Resolution info (if resolved) */}
      {discrepancy.status === "resolved" && discrepancy.resolution_notes && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Resolution:</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{discrepancy.resolution_notes}</p>
          {discrepancy.resolved_by && (
            <p className="text-xs text-gray-400 mt-1">
              by {discrepancy.resolved_by} on {discrepancy.resolved_at ? formatDate(discrepancy.resolved_at) : "N/A"}
            </p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-800">
        <p className="text-xs text-gray-400">
          Detected: {formatDate(discrepancy.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function DiscrepanciesPage() {
  const [discrepancies, setDiscrepancies] = useState<Discrepancy[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [severityFilter, setSeverityFilter] = useState<string>("");
  const [days, setDays] = useState<number>(7);

  useEffect(() => {
    async function fetchDiscrepancies() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (statusFilter) params.set("status", statusFilter);
        if (severityFilter) params.set("severity", severityFilter);
        params.set("days", days.toString());

        const response = await fetch(`/api/discrepancies?${params}`);
        const data = await response.json();

        if (!data.success) {
          throw new Error(data.error || "Failed to fetch discrepancies");
        }

        setDiscrepancies(data.discrepancies);
        setSummary(data.summary);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchDiscrepancies();
  }, [statusFilter, severityFilter, days]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <MobileHeader />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <Link href="/" className="hover:text-gray-700 dark:hover:text-gray-300">
              Home
            </Link>
            <span>/</span>
            <span>Discrepancies</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Data Discrepancies
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            Review discrepancies between our data and external sources.
            Use Claude Code to investigate and resolve.
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Pending</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.pending}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Major</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.bySeverity.major}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Resolved</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.resolved}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Total (last {days}d)</div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summary.total}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-sm"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Severity</label>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-sm"
            >
              <option value="">All</option>
              <option value="major">Major (&gt;5%)</option>
              <option value="moderate">Moderate (1-5%)</option>
              <option value="minor">Minor (&lt;1%)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">Time Range</label>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md text-sm"
            >
              <option value="1">Last 24 hours</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="text-gray-500 dark:text-gray-400 mt-4">Loading discrepancies...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-red-800 dark:text-red-300">{error}</p>
          </div>
        ) : discrepancies.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No discrepancies found for the selected filters.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {discrepancies.map((d) => (
              <DiscrepancyCard key={d.id} discrepancy={d} />
            ))}
          </div>
        )}

        {/* Help Section */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            How to Investigate
          </h2>
          <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400 space-y-2">
            <p><strong>1.</strong> Open Claude Code in the dat-tracker-next project</p>
            <p><strong>2.</strong> Ask: "Investigate the [TICKER] [field] discrepancy"</p>
            <p><strong>3.</strong> Claude will follow the adversarial process in CLAUDE.md:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Check where our value came from (git history, source URL)</li>
              <li>Verify the cited source actually says that value</li>
              <li>Check where the comparison value came from</li>
              <li>Determine which is correct and why</li>
            </ul>
            <p><strong>4.</strong> Claude will either fix the data or explain why it's correct</p>
          </div>
        </div>
      </main>
    </div>
  );
}
