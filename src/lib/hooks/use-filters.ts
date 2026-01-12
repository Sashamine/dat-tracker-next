"use client";

import { useQueryState, parseAsFloat, parseAsString, parseAsArrayOf, parseAsStringLiteral } from "nuqs";

// Available sort fields
export const SORT_FIELDS = [
  "holdingsValue",
  "mNAV",
  "marketCap",
  "holdings",
  "ticker",
  "stockVolume",
] as const;

export type SortField = (typeof SORT_FIELDS)[number];
export type SortDirection = "asc" | "desc";

// Asset options
export const ASSETS = ["ETH", "BTC", "SOL", "HYPE", "BNB", "TAO", "LINK", "TRX", "XRP", "ZEC", "LTC", "SUI", "DOGE", "AVAX", "ADA", "HBAR"] as const;
export type Asset = (typeof ASSETS)[number];

// Company type options
export const COMPANY_TYPES = ["Treasury", "Miner"] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

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

  // Asset filter (multi-select)
  const [assets, setAssets] = useQueryState(
    "asset",
    parseAsArrayOf(parseAsString).withDefault([])
  );

  // Company type filter (multi-select)
  const [companyTypes, setCompanyTypes] = useQueryState(
    "type",
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
    setAssets([]);
    setCompanyTypes([]);
    setSearch("");
  };

  // Check if any filters are active
  const hasActiveFilters =
    minMarketCap > 0 ||
    maxMarketCap < Infinity ||
    minMNAV > 0 ||
    maxMNAV < Infinity ||
    assets.length > 0 ||
    companyTypes.length > 0 ||
    search.length > 0;

  return {
    // Filter values
    minMarketCap,
    maxMarketCap,
    minMNAV,
    maxMNAV,
    assets,
    companyTypes,
    search,
    sortField,
    sortDir,

    // Setters
    setMinMarketCap,
    setMaxMarketCap,
    setMinMNAV,
    setMaxMNAV,
    setAssets,
    setCompanyTypes,
    setSearch,
    setSortField,
    setSortDir,

    // Helpers
    resetFilters,
    hasActiveFilters,
  };
}
