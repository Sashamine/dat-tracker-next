"use client";

import { useQueryState, parseAsFloat, parseAsString, parseAsArrayOf, parseAsStringLiteral } from "nuqs";

// Available sort fields
export const SORT_FIELDS = [
  "holdingsValue",
  "mNAV",
  "upside",
  "marketCap",
  "holdings",
  "ticker",
] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortDirection = "asc" | "desc";

// Verdict options
export const VERDICTS = ["Cheap", "Fair", "Expensive"] as const;
export type Verdict = (typeof VERDICTS)[number];

export function useFilters() {
  // Market cap range (in millions)
  const [minMarketCap, setMinMarketCap] = useQueryState(
    "minMcap",
    parseAsFloat.withDefault(0)
  );
  const [maxMarketCap, setMaxMarketCap] = useQueryState(
    "maxMcap",
    parseAsFloat.withDefault(Infinity)
  );

  // mNAV range
  const [minMNAV, setMinMNAV] = useQueryState(
    "minMnav",
    parseAsFloat.withDefault(0)
  );
  const [maxMNAV, setMaxMNAV] = useQueryState(
    "maxMnav",
    parseAsFloat.withDefault(Infinity)
  );

  // Upside range (as percentage, -100 to 1000)
  const [minUpside, setMinUpside] = useQueryState(
    "minUp",
    parseAsFloat.withDefault(-100)
  );
  const [maxUpside, setMaxUpside] = useQueryState(
    "maxUp",
    parseAsFloat.withDefault(1000)
  );

  // Verdict filter (multi-select)
  const [verdicts, setVerdicts] = useQueryState(
    "verdict",
    parseAsArrayOf(parseAsString).withDefault([])
  );

  // Sort state
  const [sortField, setSortField] = useQueryState(
    "sort",
    parseAsString.withDefault("holdingsValue")
  );
  const [sortDir, setSortDir] = useQueryState(
    "dir",
    parseAsStringLiteral(["asc", "desc"] as const).withDefault("desc")
  );

  // Search query
  const [search, setSearch] = useQueryState(
    "q",
    parseAsString.withDefault("")
  );

  // Reset all filters
  const resetFilters = () => {
    setMinMarketCap(0);
    setMaxMarketCap(Infinity);
    setMinMNAV(0);
    setMaxMNAV(Infinity);
    setMinUpside(-100);
    setMaxUpside(1000);
    setVerdicts([]);
    setSearch("");
  };

  // Check if any filters are active
  const hasActiveFilters =
    minMarketCap > 0 ||
    maxMarketCap < Infinity ||
    minMNAV > 0 ||
    maxMNAV < Infinity ||
    minUpside > -100 ||
    maxUpside < 1000 ||
    verdicts.length > 0 ||
    search.length > 0;

  return {
    // Filter values
    minMarketCap,
    maxMarketCap,
    minMNAV,
    maxMNAV,
    minUpside,
    maxUpside,
    verdicts,
    search,
    sortField,
    sortDir,

    // Setters
    setMinMarketCap,
    setMaxMarketCap,
    setMinMNAV,
    setMaxMNAV,
    setMinUpside,
    setMaxUpside,
    setVerdicts,
    setSearch,
    setSortField,
    setSortDir,

    // Helpers
    resetFilters,
    hasActiveFilters,
  };
}
