"use client";

import { useState } from "react";
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

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileFilterSheet({ isOpen, onClose }: MobileFilterSheetProps) {
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

  const activeFilterCount =
    (assets.length > 0 ? 1 : 0) +
    (companyTypes.length > 0 ? 1 : 0) +
    (minMarketCap > 0 || maxMarketCap < Infinity ? 1 : 0) +
    (minMNAV > 0 || maxMNAV < Infinity ? 1 : 0) +
    (search.length > 0 ? 1 : 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 lg:hidden bg-white dark:bg-gray-900 rounded-t-2xl shadow-xl max-h-[85vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-100 text-indigo-700 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-sm text-gray-500"
              >
                Reset
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Search */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Search
            </Label>
            <Input
              type="text"
              placeholder="Ticker or company name..."
              value={search}
              onChange={(e) => setSearch(e.target.value || "")}
              className="h-11"
            />
          </div>

          {/* Asset Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Asset
            </Label>
            <div className="flex flex-wrap gap-2">
              {ASSETS.map((asset) => (
                <button
                  key={asset}
                  onClick={() => toggleAsset(asset)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg transition-colors border min-w-[48px]",
                    assets.includes(asset)
                      ? assetColors[asset] || "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 active:bg-gray-100"
                  )}
                >
                  {asset}
                </button>
              ))}
            </div>
          </div>

          {/* Company Type Filter */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Type
            </Label>
            <div className="flex flex-wrap gap-2">
              {COMPANY_TYPES.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleCompanyType(type)}
                  className={cn(
                    "px-4 py-2 text-sm rounded-lg transition-colors min-h-[44px]",
                    companyTypes.includes(type)
                      ? type === "Miner"
                        ? "bg-amber-600 text-white"
                        : "bg-gray-700 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 active:bg-gray-200"
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Market Cap Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Market Cap ($M)
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                value={minMarketCap > 0 ? minMarketCap : ""}
                onChange={(e) =>
                  setMinMarketCap(e.target.value ? parseFloat(e.target.value) : 0)
                }
                className="h-11"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                value={maxMarketCap < Infinity ? maxMarketCap : ""}
                onChange={(e) =>
                  setMaxMarketCap(
                    e.target.value ? parseFloat(e.target.value) : Infinity
                  )
                }
                className="h-11"
              />
            </div>
          </div>

          {/* mNAV Range */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              mNAV Range
            </Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="Min"
                value={minMNAV > 0 ? minMNAV : ""}
                onChange={(e) =>
                  setMinMNAV(e.target.value ? parseFloat(e.target.value) : 0)
                }
                className="h-11"
              />
              <span className="text-gray-400">to</span>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="Max"
                value={maxMNAV < Infinity ? maxMNAV : ""}
                onChange={(e) =>
                  setMaxMNAV(
                    e.target.value ? parseFloat(e.target.value) : Infinity
                  )
                }
                className="h-11"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <Button
            onClick={onClose}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </>
  );
}

// Filter button to trigger the sheet
export function MobileFilterButton({ onClick, activeCount }: { onClick: () => void; activeCount: number }) {
  return (
    <button
      onClick={onClick}
      className="lg:hidden flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 active:bg-gray-50"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
      </svg>
      Filter
      {activeCount > 0 && (
        <span className="px-1.5 py-0.5 text-xs bg-indigo-600 text-white rounded-full">
          {activeCount}
        </span>
      )}
    </button>
  );
}
