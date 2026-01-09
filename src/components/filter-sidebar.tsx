"use client";

import { useFilters, VERDICTS } from "@/lib/hooks/use-filters";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FilterSidebar() {
  const {
    minMarketCap,
    maxMarketCap,
    minMNAV,
    maxMNAV,
    minUpside,
    maxUpside,
    verdicts,
    search,
    setMinMarketCap,
    setMaxMarketCap,
    setMinMNAV,
    setMaxMNAV,
    setMinUpside,
    setMaxUpside,
    setVerdicts,
    setSearch,
    resetFilters,
    hasActiveFilters,
  } = useFilters();

  const toggleVerdict = (verdict: string) => {
    if (verdicts.includes(verdict)) {
      setVerdicts(verdicts.filter((v) => v !== verdict));
    } else {
      setVerdicts([...verdicts, verdict]);
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

      {/* Verdict Filter */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-600 dark:text-gray-400">
          Verdict
        </Label>
        <div className="flex flex-wrap gap-2">
          {VERDICTS.map((verdict) => (
            <button
              key={verdict}
              onClick={() => toggleVerdict(verdict)}
              className={cn(
                "px-3 py-1 text-sm rounded-full transition-colors",
                verdicts.includes(verdict)
                  ? verdict === "Cheap"
                    ? "bg-green-600 text-white"
                    : verdict === "Fair"
                    ? "bg-blue-600 text-white"
                    : "bg-red-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
              )}
            >
              {verdict}
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

      {/* Upside Range */}
      <div className="space-y-2">
        <Label className="text-sm text-gray-600 dark:text-gray-400">
          Upside (%)
        </Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minUpside > -100 ? minUpside : ""}
            onChange={(e) =>
              setMinUpside(e.target.value ? parseFloat(e.target.value) : -100)
            }
            className="h-9"
          />
          <span className="text-gray-400">—</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxUpside < 1000 ? maxUpside : ""}
            onChange={(e) =>
              setMaxUpside(e.target.value ? parseFloat(e.target.value) : 1000)
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
