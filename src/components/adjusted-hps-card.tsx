"use client";

import { useMemo } from "react";
import { getGrowthBreakdown } from "@/lib/data/adjusted-hps";
import { cn } from "@/lib/utils";

interface AdjustedHPSCardProps {
  rawGrowth: number;      // e.g., 0.10 for 10%
  mNav: number;           // e.g., 1.5
  leverage: number;       // e.g., 0.3
  period?: string;        // e.g., "Q3 2025" or "YTD"
  className?: string;
}

export function AdjustedHPSCard({
  rawGrowth,
  mNav,
  leverage,
  period = "Period",
  className,
}: AdjustedHPSCardProps) {
  const breakdown = useMemo(
    () => getGrowthBreakdown(rawGrowth, mNav, leverage),
    [rawGrowth, mNav, leverage]
  );
  
  const formatPct = (n: number) => {
    const pct = n * 100;
    const sign = pct >= 0 ? "+" : "";
    return `${sign}${pct.toFixed(1)}%`;
  };
  
  const adjustedGrowth = breakdown.afterLeveragePenalty;
  const isPositive = adjustedGrowth >= 0;
  
  return (
    <div className={cn(
      "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800",
      "rounded-xl border border-slate-200 dark:border-slate-700 p-5",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
          Risk-Adjusted HPS Growth
        </h3>
        <span className="text-xs text-slate-500 dark:text-slate-500">
          {period}
        </span>
      </div>
      
      {/* Main adjusted growth number */}
      <div className="mb-5">
        <span className={cn(
          "text-4xl font-bold",
          isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        )}>
          {formatPct(adjustedGrowth)}
        </span>
        <span className="text-slate-500 dark:text-slate-400 ml-2 text-sm">
          adjusted
        </span>
      </div>
      
      {/* Breakdown waterfall */}
      <div className="space-y-3 text-sm">
        {/* Raw Growth */}
        <div className="flex items-center justify-between">
          <span className="text-slate-600 dark:text-slate-400">Raw HPS Growth</span>
          <span className={cn(
            "font-mono font-semibold",
            rawGrowth >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatPct(rawGrowth)}
          </span>
        </div>
        
        {/* mNAV adjustment */}
        <div className="flex items-center justify-between pl-4 border-l-2 border-amber-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-500">mNAV Drag</span>
            <span className="text-xs text-slate-400">÷{mNav.toFixed(2)}x</span>
          </div>
          <span className="font-mono text-amber-600 dark:text-amber-400">
            {formatPct(-breakdown.mNavDrag)}
          </span>
        </div>
        
        {/* After mNAV */}
        <div className="flex items-center justify-between pl-4 text-slate-500">
          <span className="text-xs">After premium adjustment</span>
          <span className="font-mono text-xs">
            {formatPct(breakdown.afterMNavPenalty)}
          </span>
        </div>
        
        {/* Leverage adjustment */}
        <div className="flex items-center justify-between pl-4 border-l-2 border-red-400">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-500">Leverage Drag</span>
            <span className="text-xs text-slate-400">×{(1 - leverage).toFixed(2)}</span>
          </div>
          <span className="font-mono text-red-600 dark:text-red-400">
            {formatPct(-breakdown.leverageDrag)}
          </span>
        </div>
        
        {/* Divider */}
        <div className="border-t border-slate-200 dark:border-slate-700 my-2" />
        
        {/* Final */}
        <div className="flex items-center justify-between font-semibold">
          <span className="text-slate-700 dark:text-slate-300">Adjusted Growth</span>
          <span className={cn(
            "font-mono",
            isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )}>
            {formatPct(adjustedGrowth)}
          </span>
        </div>
      </div>
      
      {/* Context */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <div className="flex justify-between text-xs text-slate-500">
          <div>
            <span className="font-medium">mNAV:</span> {mNav.toFixed(2)}x
            <span className="ml-1 text-slate-400">
              ({mNav > 1 ? `${((mNav - 1) * 100).toFixed(0)}% premium` : `${((1 - mNav) * 100).toFixed(0)}% discount`})
            </span>
          </div>
          <div>
            <span className="font-medium">Leverage:</span> {(leverage * 100).toFixed(0)}%
            <span className="ml-1 text-slate-400">
              ({((1 - leverage) * 100).toFixed(0)}% cushion)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
