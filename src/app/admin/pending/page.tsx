"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { MobileHeader } from "@/components/mobile-header";

interface PendingUpdate {
  id: number;
  companyId: number;
  ticker: string;
  companyName: string;
  asset: string;
  detectedHoldings: number;
  previousHoldings: number | null;
  confidenceScore: number;
  sourceType: string;
  sourceUrl: string | null;
  sourceText: string | null;
  sourceDate: string | null;
  trustLevel: "official" | "verified" | "community" | "unverified";
  llmModel: string | null;
  extractionReasoning: string | null;
  status: string;
  autoApproved: boolean;
  autoApproveReason: string | null;
  createdAt: string;
}

interface MonitoringStatus {
  lastRun: {
    id: number;
    runType: string;
    startedAt: string;
    completedAt: string;
    status: string;
    updatesDetected: number;
    errorsCount: number;
  } | null;
  pendingCounts: {
    pending: number;
    approvedToday: number;
    rejectedToday: number;
  };
  recentRuns: Array<{
    id: number;
    runType: string;
    startedAt: string;
    status: string;
    updatesDetected: number;
    errorsCount: number;
  }>;
  sourceStats: Array<{
    sourceType: string;
    total: number;
    approved: number;
    pending: number;
    avgConfidence: number;
  }>;
}

async function fetchPendingUpdates(status: string): Promise<{
  updates: PendingUpdate[];
  counts: Record<string, number>;
}> {
  const response = await fetch(`/api/monitoring/pending?status=${status}`);
  if (!response.ok) throw new Error("Failed to fetch pending updates");
  return response.json();
}

async function fetchMonitoringStatus(): Promise<MonitoringStatus> {
  const response = await fetch("/api/monitoring/status");
  if (!response.ok) throw new Error("Failed to fetch status");
  return response.json();
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function calculateChange(prev: number | null, current: number): { pct: number; direction: string } {
  if (!prev || prev === 0) return { pct: 0, direction: "new" };
  const pct = ((current - prev) / prev) * 100;
  return { pct, direction: pct >= 0 ? "up" : "down" };
}

const trustColors: Record<string, string> = {
  official: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  verified: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  community: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  unverified: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const sourceIcons: Record<string, string> = {
  sec_8k: "SEC 8-K",
  sec_10q: "SEC 10-Q",
  sec_10k: "SEC 10-K",
  btc_treasuries: "BTC Treasuries",
  twitter: "Twitter/X",
  ir_page: "IR Page",
};

export default function PendingUpdatesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const { data: updatesData, isLoading: updatesLoading } = useQuery({
    queryKey: ["pending-updates", statusFilter],
    queryFn: () => fetchPendingUpdates(statusFilter),
    refetchInterval: 30000, // Refresh every 30s
  });

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["monitoring-status"],
    queryFn: fetchMonitoringStatus,
    refetchInterval: 60000, // Refresh every minute
  });

  const actionMutation = useMutation({
    mutationFn: async ({ updateId, action, notes }: { updateId: number; action: string; notes?: string }) => {
      const response = await fetch("/api/monitoring/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateId, action, notes }),
      });
      if (!response.ok) throw new Error("Failed to process update");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-updates"] });
      queryClient.invalidateQueries({ queryKey: ["monitoring-status"] });
      setExpandedId(null);
      setReviewNotes("");
    },
  });

  const isLoading = updatesLoading || statusLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  const updates = updatesData?.updates || [];
  const counts = updatesData?.counts || {};

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <MobileHeader title="Pending Updates" showBack />

      <main className="container mx-auto px-3 py-4 lg:px-4 lg:py-8">
        {/* Breadcrumb */}
        <div className="mb-6 hidden lg:block">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            &larr; Back to tracker
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Holdings Update Queue
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Review and approve detected holdings changes
            </p>
          </div>
          <Link
            href="/api/cron/monitoring?manual=true"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-center"
          >
            Run Monitoring Now
          </Link>
        </div>

        {/* Status Cards */}
        {statusData && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <p className="text-sm text-yellow-600">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {statusData.pendingCounts.pending}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <p className="text-sm text-green-600">Approved Today</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {statusData.pendingCounts.approvedToday}
              </p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <p className="text-sm text-red-600">Rejected Today</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                {statusData.pendingCounts.rejectedToday}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-500">Last Run</p>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {statusData.lastRun
                  ? new Date(statusData.lastRun.completedAt || statusData.lastRun.startedAt).toLocaleTimeString()
                  : "Never"}
              </p>
              {statusData.lastRun && (
                <p className="text-xs text-gray-500">
                  {statusData.lastRun.status} - {statusData.lastRun.updatesDetected} updates
                </p>
              )}
            </div>
          </div>
        )}

        {/* Status Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["pending", "approved", "rejected"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium capitalize whitespace-nowrap transition-colors",
                statusFilter === status
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              {status} ({counts[status] || 0})
            </button>
          ))}
        </div>

        {/* Updates List */}
        {updates.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-gray-500">No {statusFilter} updates</p>
          </div>
        ) : (
          <div className="space-y-4">
            {updates.map((update) => {
              const change = calculateChange(update.previousHoldings, update.detectedHoldings);
              const isExpanded = expandedId === update.id;

              return (
                <div
                  key={update.id}
                  className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden"
                >
                  {/* Main Row */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : update.id)}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Company Info */}
                      <div className="flex items-center gap-3 min-w-[200px]">
                        <div>
                          <Link
                            href={`/company/${update.ticker}`}
                            className="font-mono font-bold text-indigo-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {update.ticker}
                          </Link>
                          <p className="text-sm text-gray-500 truncate max-w-[150px]">
                            {update.companyName}
                          </p>
                        </div>
                        <Badge variant="outline">{update.asset}</Badge>
                      </div>

                      {/* Holdings Change */}
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Previous</p>
                          <p className="font-mono">
                            {update.previousHoldings
                              ? formatNumber(update.previousHoldings)
                              : "N/A"}
                          </p>
                        </div>
                        <span className="text-gray-400">&rarr;</span>
                        <div>
                          <p className="text-sm text-gray-500">Detected</p>
                          <p className="font-mono font-bold">
                            {formatNumber(update.detectedHoldings)}
                          </p>
                        </div>
                        <div
                          className={cn(
                            "px-2 py-1 rounded text-sm font-medium",
                            change.direction === "up"
                              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                              : change.direction === "down"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800"
                          )}
                        >
                          {change.direction === "new"
                            ? "New"
                            : `${change.pct >= 0 ? "+" : ""}${change.pct.toFixed(1)}%`}
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={trustColors[update.trustLevel]}>
                          {update.trustLevel}
                        </Badge>
                        <Badge variant="outline">
                          {sourceIcons[update.sourceType] || update.sourceType}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {Math.round(update.confidenceScore * 100)}% conf
                        </span>
                      </div>

                      {/* Action Buttons (only for pending) */}
                      {update.status === "pending" && (
                        <div className="flex gap-2 ml-auto">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              actionMutation.mutate({
                                updateId: update.id,
                                action: "approve",
                              });
                            }}
                            disabled={actionMutation.isPending}
                            className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              actionMutation.mutate({
                                updateId: update.id,
                                action: "reject",
                              });
                            }}
                            disabled={actionMutation.isPending}
                            className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Source Info */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Source Information
                          </h4>
                          <dl className="space-y-1 text-sm">
                            <div className="flex gap-2">
                              <dt className="text-gray-500 w-24">Type:</dt>
                              <dd>{sourceIcons[update.sourceType] || update.sourceType}</dd>
                            </div>
                            {update.sourceUrl && (
                              <div className="flex gap-2">
                                <dt className="text-gray-500 w-24">URL:</dt>
                                <dd>
                                  <a
                                    href={update.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-indigo-600 hover:underline truncate block max-w-[300px]"
                                  >
                                    {update.sourceUrl}
                                  </a>
                                </dd>
                              </div>
                            )}
                            {update.sourceDate && (
                              <div className="flex gap-2">
                                <dt className="text-gray-500 w-24">Date:</dt>
                                <dd>{new Date(update.sourceDate).toLocaleDateString()}</dd>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <dt className="text-gray-500 w-24">Detected:</dt>
                              <dd>{formatDate(update.createdAt)}</dd>
                            </div>
                            {update.llmModel && (
                              <div className="flex gap-2">
                                <dt className="text-gray-500 w-24">LLM:</dt>
                                <dd>{update.llmModel}</dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        {/* Reasoning */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Extraction Reasoning
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                            {update.extractionReasoning || update.autoApproveReason || "No reasoning provided"}
                          </p>
                        </div>
                      </div>

                      {/* Source Text */}
                      {update.sourceText && (
                        <div className="mt-4">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Source Text
                          </h4>
                          <pre className="text-xs bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-48 whitespace-pre-wrap">
                            {update.sourceText}
                          </pre>
                        </div>
                      )}

                      {/* Review Form (for pending) */}
                      {update.status === "pending" && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                            Review Notes (Optional)
                          </h4>
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Add notes about this review..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
                            rows={2}
                          />
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => {
                                actionMutation.mutate({
                                  updateId: update.id,
                                  action: "approve",
                                  notes: reviewNotes,
                                });
                              }}
                              disabled={actionMutation.isPending}
                              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              Approve with Notes
                            </button>
                            <button
                              onClick={() => {
                                actionMutation.mutate({
                                  updateId: update.id,
                                  action: "reject",
                                  notes: reviewNotes,
                                });
                              }}
                              disabled={actionMutation.isPending}
                              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject with Notes
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Source Statistics */}
        {statusData && statusData.sourceStats.length > 0 && (
          <div className="mt-8 bg-gray-50 dark:bg-gray-900 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              Source Statistics (Last 7 Days)
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700">
                    <th className="p-2">Source</th>
                    <th className="p-2 text-right">Total</th>
                    <th className="p-2 text-right">Approved</th>
                    <th className="p-2 text-right">Pending</th>
                    <th className="p-2 text-right">Avg Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {statusData.sourceStats.map((stat) => (
                    <tr
                      key={stat.sourceType}
                      className="border-t border-gray-100 dark:border-gray-800"
                    >
                      <td className="p-2 font-medium">
                        {sourceIcons[stat.sourceType] || stat.sourceType}
                      </td>
                      <td className="p-2 text-right font-mono">{stat.total}</td>
                      <td className="p-2 text-right font-mono text-green-600">
                        {stat.approved}
                      </td>
                      <td className="p-2 text-right font-mono text-yellow-600">
                        {stat.pending}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {(stat.avgConfidence * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
