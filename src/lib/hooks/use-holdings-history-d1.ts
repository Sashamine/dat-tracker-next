"use client";

import useSWR from "swr";
import { getHoldingsHistory, type HoldingsSnapshot, type CompanyHoldingsHistory } from "@/lib/data/holdings-history";

/**
 * D1 history row shape from /api/d1/history
 */
interface D1HistoryRow {
  value: number;
  as_of: string | null;
  artifact?: {
    source_url: string | null;
    source_type: string | null;
  };
  flags_json: string | null;
  confidence: number | null;
}

interface D1HistoryResponse {
  success: boolean;
  rows: D1HistoryRow[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

/**
 * Map D1 confidence number to the static format
 */
function mapConfidenceLabel(c: number | null): "high" | "medium" | "low" | undefined {
  if (c === null || c === undefined) return undefined;
  if (c >= 0.95) return "high";
  if (c >= 0.8) return "medium";
  return "low";
}

/**
 * Extract source label from flags_json
 */
function extractSourceLabel(flagsJson: string | null): string | undefined {
  if (!flagsJson) return undefined;
  try {
    const flags = JSON.parse(flagsJson);
    return flags?.source?.source_label || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Map D1 source_type to static sourceType format
 */
function mapSourceType(
  d1Type: string | null | undefined,
): HoldingsSnapshot["sourceType"] {
  if (!d1Type) return undefined;
  const map: Record<string, HoldingsSnapshot["sourceType"]> = {
    sec_filing: "sec-filing",
    sec_xbrl: "sec-filing",
    sec_companyfacts: "sec-filing",
    holdings_history_ts: "sec-filing",
    "company-website": "company-website",
    "press-release": "press-release",
    "regulatory-filing": "regulatory-filing",
    dashboard: "company-website",
  };
  return map[d1Type] || undefined;
}

/**
 * Transform D1 history rows into HoldingsSnapshot[] for the table.
 * Only holdings_native metric is fetched — the table only displays
 * holdings count, change, source, and filing link.
 */
function d1RowsToSnapshots(rows: D1HistoryRow[]): HoldingsSnapshot[] {
  return rows
    .filter((r) => r.as_of !== null)
    .map((r) => ({
      date: r.as_of!,
      holdings: r.value,
      // These fields aren't displayed in the table but are required by the type.
      // They'll be 0 — the table only reads holdings + source fields.
      sharesOutstanding: 0,
      holdingsPerShare: 0,
      source: extractSourceLabel(r.flags_json),
      sourceUrl: r.artifact?.source_url || undefined,
      sourceType: mapSourceType(r.artifact?.source_type),
      confidence: mapConfidenceLabel(r.confidence),
    }));
}

/**
 * Hook: fetch holdings history from D1, falling back to static data.
 *
 * Returns the same CompanyHoldingsHistory shape the table expects.
 */
export function useHoldingsHistoryD1(ticker: string): {
  data: CompanyHoldingsHistory | null;
  isLoading: boolean;
  isD1: boolean;
} {
  const { data: d1Data, error, isLoading } = useSWR<D1HistoryResponse>(
    `/api/d1/history?ticker=${encodeURIComponent(ticker)}&metric=holdings_native&limit=2000&order=asc`,
    fetcher,
    { revalidateOnFocus: false },
  );

  // Static fallback — always available synchronously
  const staticData = getHoldingsHistory(ticker);

  // D1 succeeded and has data
  if (d1Data?.success && d1Data.rows.length > 0) {
    const snapshots = d1RowsToSnapshots(d1Data.rows);
    return {
      data: staticData
        ? { ...staticData, history: snapshots }
        : {
            ticker: ticker.toUpperCase(),
            asset: "BTC",
            history: snapshots,
          },
      isLoading: false,
      isD1: true,
    };
  }

  // D1 loading or failed — use static
  if (isLoading) {
    return { data: staticData, isLoading: true, isD1: false };
  }

  // D1 returned empty or errored — fall back to static
  if (error || !d1Data?.success || d1Data.rows.length === 0) {
    return { data: staticData, isLoading: false, isD1: false };
  }

  return { data: staticData, isLoading: false, isD1: false };
}
