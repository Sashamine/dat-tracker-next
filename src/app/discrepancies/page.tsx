"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { MobileHeader } from "@/components/mobile-header";
import { ExternalLink, AlertTriangle, CheckCircle, XCircle, Clock, ChevronDown, ChevronRight } from "lucide-react";

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

interface CompanyGroup {
  ticker: string;
  companyName: string;
  discrepancies: Discrepancy[];
  majorCount: number;
  moderateCount: number;
  minorCount: number;
  maxDeviation: number;
  worstSeverity: "major" | "moderate" | "minor";
}

const SEVERITY_COLORS = {
  major: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  minor: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
};

const SEVERITY_BORDER_COLORS = {
  major: "border-l-red-500",
  moderate: "border-l-yellow-500",
  minor: "border-l-gray-400",
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

function FieldDiscrepancyRow({ discrepancy }: { discrepancy: Discrepancy }) {
  const StatusIcon = STATUS_ICONS[discrepancy.status];
  const sources = Object.entries(discrepancy.source_values);

  return (
    <div className="py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {discrepancy.field.replace(/_/g, " ")}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS[discrepancy.severity]}`}>
            {discrepancy.severity}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${STATUS_COLORS[discrepancy.status]}`}>
            <StatusIcon className="w-3 h-3" />
            {discrepancy.status}
          </span>
        </div>
        <span className={`text-sm font-mono ${
          discrepancy.severity === "major" ? "text-red-600 dark:text-red-400" :
          discrepancy.severity === "moderate" ? "text-yellow-600 dark:text-yellow-400" :
          "text-gray-600 dark:text-gray-400"
        }`}>
          {discrepancy.max_deviation_pct.toFixed(1)}% off
        </span>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 dark:text-gray-400">Ours:</span>
          <span className="font-mono text-gray-900 dark:text-gray-100">{formatNumber(discrepancy.our_value)}</span>
        </div>
        {sources.map(([sourceName, sourceData]) => (
          <div key={sourceName} className="flex items-center gap-2">
            <span className="text-gray-500 dark:text-gray-400">{sourceName}:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{formatNumber(sourceData.value)}</span>
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
          </div>
        ))}
      </div>

      {discrepancy.status === "resolved" && discrepancy.resolution_notes && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
          <span className="font-medium">Resolution:</span> {discrepancy.resolution_notes}
        </div>
      )}
    </div>
  );
}

function CompanyCard({ group, defaultExpanded }: { group: CompanyGroup; defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded ?? group.worstSeverity === "major");

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden border-l-4 ${SEVERITY_BORDER_COLORS[group.worstSeverity]}`}>
      {/* Company Header - Clickable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <Link
            href={`/company/${group.ticker}`}
            onClick={(e) => e.stopPropagation()}
            className="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            {group.ticker}
          </Link>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {group.companyName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {group.majorCount > 0 && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS.major}`}>
              {group.majorCount} major
            </span>
          )}
          {group.moderateCount > 0 && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS.moderate}`}>
              {group.moderateCount} mod
            </span>
          )}
          {group.minorCount > 0 && (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${SEVERITY_COLORS.minor}`}>
              {group.minorCount} minor
            </span>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800">
          <div className="pt-3">
            {group.discrepancies.map((d) => (
              <FieldDiscrepancyRow key={d.id} discrepancy={d} />
            ))}
          </div>

          {/* Investigation Prompt */}
          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">To investigate, run in Claude Code:</p>
            <code className="block bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 text-sm text-gray-800 dark:text-gray-200 font-mono">
              /review-change {group.ticker}
            </code>
          </div>
        </div>
      )}
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

  // Group discrepancies by company
  const companyGroups = useMemo(() => {
    const groups = new Map<string, CompanyGroup>();

    for (const d of discrepancies) {
      let group = groups.get(d.ticker);
      if (!group) {
        group = {
          ticker: d.ticker,
          companyName: d.company_name,
          discrepancies: [],
          majorCount: 0,
          moderateCount: 0,
          minorCount: 0,
          maxDeviation: 0,
          worstSeverity: "minor",
        };
        groups.set(d.ticker, group);
      }

      group.discrepancies.push(d);
      group.maxDeviation = Math.max(group.maxDeviation, d.max_deviation_pct);

      if (d.severity === "major") {
        group.majorCount++;
        group.worstSeverity = "major";
      } else if (d.severity === "moderate") {
        group.moderateCount++;
        if (group.worstSeverity !== "major") {
          group.worstSeverity = "moderate";
        }
      } else {
        group.minorCount++;
      }
    }

    // Sort: major companies first, then by max deviation
    return Array.from(groups.values()).sort((a, b) => {
      const severityOrder = { major: 0, moderate: 1, minor: 2 };
      const severityDiff = severityOrder[a.worstSeverity] - severityOrder[b.worstSeverity];
      if (severityDiff !== 0) return severityDiff;
      return b.maxDeviation - a.maxDeviation;
    });
  }, [discrepancies]);

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

      <main className="max-w-4xl mx-auto px-4 py-8">
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
            Review discrepancies between our data and external sources, grouped by company.
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
        ) : companyGroups.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No discrepancies found for the selected filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {companyGroups.length} {companyGroups.length === 1 ? "company" : "companies"} with discrepancies
            </p>
            {companyGroups.map((group) => (
              <CompanyCard key={group.ticker} group={group} />
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
            <p><strong>2.</strong> Run the review command: <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">/review-change TICKER FIELD VALUE</code></p>
            <p><strong>3.</strong> The adversarial review process will:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li><strong>Proposer</strong>: Find and verify the primary source</li>
              <li><strong>Challenger</strong>: Independently verify and check against known patterns</li>
              <li>Render decision: APPROVE, REJECT, REQUEST_MORE_INFO, or ESCALATE</li>
            </ul>
            <p><strong>4.</strong> If approved, apply the change with <code className="bg-gray-200 dark:bg-gray-800 px-1 rounded">/apply-change</code></p>
          </div>
        </div>
      </main>
    </div>
  );
}
