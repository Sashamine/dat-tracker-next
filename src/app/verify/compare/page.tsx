"use client";

import { useState } from "react";
import Link from "next/link";
import { MobileHeader } from "@/components/mobile-header";
import { ExternalLink, RefreshCw, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

// Companies grouped by tier
const TIER_1_COMPANIES = [
  { ticker: "MSTR", name: "Strategy (MicroStrategy)" },
  { ticker: "SBET", name: "SharpLink Gaming" },
  { ticker: "3350.T", name: "Metaplanet" },
  { ticker: "KULR", name: "KULR Technology" },
];

const TIER_2_COMPANIES = [
  { ticker: "LITS", name: "Lite Strategy" },
  { ticker: "UPXI", name: "Upexi" },
  { ticker: "ALTBG", name: "The Blockchain Group" },
  { ticker: "DFDV", name: "DeFi Development Corp" },
  { ticker: "XXI", name: "Twenty One Capital" },
];

interface FetchedValue {
  source: string;
  value: number;
  url: string;
  date: string;
  deviationPct?: string;
}

interface Comparison {
  ourValue: number | undefined;
  ourSource?: string;
  ourDate?: string;
  fetched: FetchedValue[];
}

interface ComparisonResult {
  ticker: string;
  company: {
    name: string;
    asset: string;
    tier: number;
  };
  ourValues: {
    holdings: number;
    holdingsSource?: string;
    holdingsDate?: string;
    sharesOutstanding?: number;
    totalDebt?: number;
    debtDate?: string;
    cashReserves?: number;
    cashDate?: string;
    calculatedMnav?: number;
  };
  comparisons: Record<string, Comparison>;
  errors?: Record<string, string>;
  sourcesQueried: string[];
}

type QueryStatus = "idle" | "loading" | "success" | "error";

interface CompanyState {
  status: QueryStatus;
  result: ComparisonResult | null;
  error: string | null;
}

function formatValue(value: number | undefined, field: string): string {
  if (value === undefined) return "-";
  if (field === "mnav") return `${value.toFixed(2)}x`;
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1000) return value.toLocaleString();
  if (value < 10) return value.toFixed(4);
  return value.toLocaleString();
}

function getDeviationSeverity(pct: string): "ok" | "minor" | "major" {
  const value = Math.abs(parseFloat(pct));
  if (value < 0.5) return "ok";
  if (value < 5) return "minor";
  return "major";
}

function CompanyRow({
  ticker,
  name,
  tier,
  state,
  onQuery,
}: {
  ticker: string;
  name: string;
  tier: number;
  state: CompanyState;
  onQuery: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const hasIssues = state.result?.comparisons && Object.values(state.result.comparisons).some(
    (c) => c.fetched.some((f) => {
      const severity = getDeviationSeverity(f.deviationPct || "0%");
      return severity === "minor" || severity === "major";
    })
  );

  const hasErrors = state.result?.errors && Object.keys(state.result.errors).length > 0;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div
        className={`flex items-center justify-between p-4 ${
          state.status === "success" && !hasIssues
            ? "bg-green-50"
            : hasIssues
            ? "bg-yellow-50"
            : "bg-white"
        }`}
      >
        <div className="flex items-center gap-4">
          <span className="text-xs text-gray-400">T{tier}</span>
          <div>
            <span className="font-medium text-gray-900">{ticker}</span>
            <span className="text-gray-500 ml-2">{name}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {state.status === "success" && !hasIssues && (
            <CheckCircle className="w-5 h-5 text-green-600" />
          )}
          {state.status === "success" && hasIssues && (
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          )}
          {state.status === "error" && (
            <XCircle className="w-5 h-5 text-red-600" />
          )}

          <button
            onClick={onQuery}
            disabled={state.status === "loading"}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
          >
            {state.status === "loading" ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {state.status === "loading" ? "Checking..." : "Check"}
          </button>

          {state.result && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-2 py-1 text-gray-500 hover:text-gray-700"
            >
              {expanded ? "Hide" : "Show"}
            </button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      {expanded && state.result && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {/* Our values summary */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Our Values</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              <div>
                <span className="text-gray-500">Holdings:</span>{" "}
                <span className="font-medium">
                  {formatValue(state.result.ourValues.holdings, "holdings")}
                </span>
              </div>
              {state.result.ourValues.sharesOutstanding && (
                <div>
                  <span className="text-gray-500">Shares:</span>{" "}
                  <span className="font-medium">
                    {(state.result.ourValues.sharesOutstanding / 1_000_000).toFixed(1)}M
                  </span>
                </div>
              )}
              {state.result.ourValues.totalDebt && (
                <div>
                  <span className="text-gray-500">Debt:</span>{" "}
                  <span className="font-medium">
                    {formatValue(state.result.ourValues.totalDebt, "debt")}
                  </span>
                </div>
              )}
              {state.result.ourValues.calculatedMnav && (
                <div>
                  <span className="text-gray-500">mNAV:</span>{" "}
                  <span className="font-medium">
                    {formatValue(state.result.ourValues.calculatedMnav, "mnav")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Comparisons */}
          {Object.keys(state.result.comparisons).length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Comparisons</h4>
              {Object.entries(state.result.comparisons).map(([field, comparison]) => (
                <div key={field} className="bg-white rounded border border-gray-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-gray-900 capitalize text-sm">
                      {field.replace("_", " ")}
                    </span>
                    <span className="text-xs text-gray-500">
                      Ours: {formatValue(comparison.ourValue, field)}
                      {comparison.ourDate && ` (${comparison.ourDate})`}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {comparison.fetched.map((f, i) => {
                      const severity = getDeviationSeverity(f.deviationPct || "0%");
                      return (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm"
                        >
                          <a
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {f.source}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-gray-700">
                            {formatValue(f.value, field)}
                          </span>
                          <span className="text-gray-400 text-xs">
                            ({f.date})
                          </span>
                          {f.deviationPct && (
                            <span
                              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                severity === "ok"
                                  ? "bg-green-100 text-green-800"
                                  : severity === "minor"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {f.deviationPct}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-green-700 bg-green-50 p-2 rounded">
              No discrepancies with newer data sources.
            </div>
          )}

          {/* Errors */}
          {hasErrors && (
            <div className="mt-3 text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
              <span className="font-medium">Fetcher errors:</span>{" "}
              {Object.entries(state.result.errors!).map(([src, err]) => (
                <span key={src} className="ml-2">{src}: {err}</span>
              ))}
            </div>
          )}

          {/* Sources */}
          <div className="mt-3 text-xs text-gray-500">
            Sources: {state.result.sourcesQueried.join(", ")}
          </div>
        </div>
      )}

      {/* Error state */}
      {state.status === "error" && (
        <div className="border-t border-gray-200 p-4 bg-red-50 text-red-700 text-sm">
          Error: {state.error}
        </div>
      )}
    </div>
  );
}

export default function AdversarialComparePage() {
  const [companyStates, setCompanyStates] = useState<Record<string, CompanyState>>({});

  const queryCompany = async (ticker: string) => {
    setCompanyStates((prev) => ({
      ...prev,
      [ticker]: { status: "loading", result: null, error: null },
    }));

    try {
      const response = await fetch(`/api/debug/compare/${ticker}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch");
      }
      const result = await response.json();
      setCompanyStates((prev) => ({
        ...prev,
        [ticker]: { status: "success", result, error: null },
      }));
    } catch (err) {
      setCompanyStates((prev) => ({
        ...prev,
        [ticker]: {
          status: "error",
          result: null,
          error: err instanceof Error ? err.message : "Unknown error",
        },
      }));
    }
  };

  const queryAllTier = async (companies: { ticker: string }[]) => {
    for (const company of companies) {
      await queryCompany(company.ticker);
    }
  };

  const getState = (ticker: string): CompanyState =>
    companyStates[ticker] || { status: "idle", result: null, error: null };

  return (
    <div className="min-h-screen bg-gray-50">
      <MobileHeader title="Adversarial Review" showBack />

      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Adversarial Data Review</h1>
          <p className="text-gray-600 mt-1">
            Compare our values against external sources. Only shows discrepancies with data newer than our sources.
          </p>
        </div>

        {/* Tier 1 */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Tier 1 Companies</h2>
            <button
              onClick={() => queryAllTier(TIER_1_COMPANIES)}
              className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded hover:bg-gray-900 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Check All Tier 1
            </button>
          </div>
          <div className="space-y-2">
            {TIER_1_COMPANIES.map((company) => (
              <CompanyRow
                key={company.ticker}
                ticker={company.ticker}
                name={company.name}
                tier={1}
                state={getState(company.ticker)}
                onQuery={() => queryCompany(company.ticker)}
              />
            ))}
          </div>
        </div>

        {/* Tier 2 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Tier 2 Companies</h2>
            <button
              onClick={() => queryAllTier(TIER_2_COMPANIES)}
              className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded hover:bg-gray-900 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Check All Tier 2
            </button>
          </div>
          <div className="space-y-2">
            {TIER_2_COMPANIES.map((company) => (
              <CompanyRow
                key={company.ticker}
                ticker={company.ticker}
                name={company.name}
                tier={2}
                state={getState(company.ticker)}
                onQuery={() => queryCompany(company.ticker)}
              />
            ))}
          </div>
        </div>

        {/* Link back */}
        <div className="mt-8 text-center">
          <Link href="/discrepancies" className="text-blue-600 hover:underline">
            View Historical Discrepancies →
          </Link>
        </div>
      </div>
    </div>
  );
}
