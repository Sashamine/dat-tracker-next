"use client";

import { useFilters, ASSETS, COMPANY_TYPES } from "@/lib/hooks/use-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Asset colors for filter badges
const assetColors: Record<string, string> = {
  ETH: "bg-indigo-100 text-indigo-700 border-indigo-300",
  BTC: "bg-orange-100 text-orange-700 border-orange-300",
  SOL: "bg-purple-100 text-purple-700 border-purple-300",
  HYPE: "bg-green-100 text-green-700 border-green-300",
  BNB: "bg-yellow-100 text-yellow-700 border-yellow-300",
  TAO: "bg-cyan-100 text-cyan-700 border-cyan-300",
  LINK: "bg-blue-100 text-blue-700 border-blue-300",
  TRX: "bg-red-100 text-red-700 border-red-300",
  XRP: "bg-gray-100 text-gray-700 border-gray-300",
  ZEC: "bg-amber-100 text-amber-700 border-amber-300",
  LTC: "bg-slate-100 text-slate-700 border-slate-300",
  SUI: "bg-sky-100 text-sky-700 border-sky-300",
  DOGE: "bg-amber-100 text-amber-700 border-amber-300",
  AVAX: "bg-rose-100 text-rose-700 border-rose-300",
  ADA: "bg-blue-100 text-blue-700 border-blue-300",
  HBAR: "bg-gray-100 text-gray-700 border-gray-300",
};

export function FilterSidebar() {
  const {
    minMarketCap,
    maxMarketCap,
    minMNAV,
    maxMNAV,
    assets,
    companyTypes,
    search,
    setMinMarketCap,
    setMaxMarketCap,
    setMinMNAV,
    setMaxMNAV,
    setAssets,
    setCompanyTypes,
    setSearch,
    resetFilters,
    hasActiveFilters,
  } = useFilters();

  const toggleAsset = (asset: string) => {
    if (assets.includes(asset)) {
      setAssets(assets.filter((a) => a !== asset));
    } else {
      setAssets([...assets, asset]);
    }
  };

  const toggleCompanyType = (type: string) => {
    if (companyTypes.includes(type)) {
      setCompanyTypes(companyTypes.filter((t) => t !== type));
    } else {
      setCompanyTypes([...companyTypes, type]);
    }
  };

  return (
    <div className="w-64 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">
          Filters
        </h3>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-600 dark:text-gray-400">
          Search
        </Label>
        <Input
          type="text"
          placeholder="Ticker or company name..."
          value={search}
          onChange={(e) => setSearch(e.target.value || "")}
          className="h-9"
        />
      </div>

      {/* Asset Filter */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-600 dark:text-gray-400">
          Asset
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {ASSETS.map((asset) => (
            <button
              key={asset}
              onClick={() => toggleAsset(asset)}
              className={cn(
                "px-2 py-0.5 text-xs rounded-md transition-colors border",
                assets.includes(asset)
                  ? assetColors[asset] || "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white dark:bg-gray-800 text-gray-500 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
              )}
            >
              {asset}
            </button>
          ))}
        </div>
      </div>

      {/* Company Type Filter */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-600 dark:text-gray-400">
          Type
        </Label>
        <div className="flex flex-wrap gap-2">
          {COMPANY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleCompanyType(type)}
              className={cn(
                "px-3 py-1 text-sm rounded-full transition-colors",
                companyTypes.includes(type)
                  ? type === "Miner"
                    ? "bg-amber-600 text-white"
                    : "bg-gray-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Market Cap Range */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-600 dark:text-gray-400">
          Market Cap ($M)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minMarketCap > 0 ? minMarketCap : ""}
            onChange={(e) =>
              setMinMarketCap(e.target.value ? parseFloat(e.target.value) : 0)
            }
            className="h-9"
          />
          <span className="text-gray-400">—</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxMarketCap < Infinity ? maxMarketCap : ""}
            onChange={(e) =>
              setMaxMarketCap(
                e.target.value ? parseFloat(e.target.value) : Infinity
              )
            }
            className="h-9"
          />
        </div>
      </div>

      {/* mNAV Range */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-600 dark:text-gray-400">
          mNAV Range
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            step="0.1"
            placeholder="Min"
            value={minMNAV > 0 ? minMNAV : ""}
            onChange={(e) =>
              setMinMNAV(e.target.value ? parseFloat(e.target.value) : 0)
            }
            className="h-9"
          />
          <span className="text-gray-400">—</span>
          <Input
            type="number"
            step="0.1"
            placeholder="Max"
            value={maxMNAV < Infinity ? maxMNAV : ""}
            onChange={(e) =>
              setMaxMNAV(
                e.target.value ? parseFloat(e.target.value) : Infinity
              )
            }
            className="h-9"
          />
        </div>
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500">
            Active filters applied. Share URL to preserve filters.
          </p>
        </div>
      )}
    </div>
  );
}
