"use client";

import { DebtMaturityStats } from "@/lib/math/debt-engine";
import { formatLargeNumber, formatPercent } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface DebtMaturityChartProps {
  stats: DebtMaturityStats;
  className?: string;
}

export function DebtMaturityChart({ stats, className }: DebtMaturityChartProps) {
  if (stats.ladder.length === 0) {
    return (
      <div className={cn("bg-white dark:bg-gray-800 rounded-lg p-6 text-center border border-gray-200 dark:border-gray-700", className)}>
        <p className="text-gray-500 dark:text-gray-400">No debt maturity schedule modeled.</p>
      </div>
    );
  }

  const maxAmount = Math.max(...stats.ladder.map(l => l.amount));

  return (
    <div className={cn("bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden", className)}>
      <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
        <div>
          <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-tight">Debt Maturity Ladder</h3>
          <p className="text-[10px] text-gray-500 uppercase">Principal repayments by year</p>
        </div>
        <div className="text-right">
          <div className={cn(
            "text-xs font-bold px-2 py-0.5 rounded",
            stats.maturityConcentration > 0.25 ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
          )}>
            {formatPercent(stats.maturityConcentration)} Due &lt; 24mo
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-end gap-3 h-48 mb-6">
          {stats.ladder.map((l) => {
            const heightPct = (l.amount / maxAmount) * 100;
            const isNearTerm = l.year <= new Date().getFullYear() + 2;

            return (
              <div key={l.year} className="flex-1 flex flex-col items-center group relative">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 text-white text-[10px] p-2 rounded shadow-lg whitespace-nowrap">
                    <p className="font-bold">{l.year}: {formatLargeNumber(l.amount)}</p>
                    <p className="text-gray-400">{l.count} instrument{l.count > 1 ? 's' : ''}</p>
                  </div>
                </div>

                <div 
                  className={cn(
                    "w-full rounded-t-sm transition-all duration-200 border-x border-t",
                    isNearTerm ? "bg-red-500/80 hover:bg-red-500 border-red-600" : "bg-blue-500/80 hover:bg-blue-500 border-blue-600",
                    l.requiresCash && "opacity-100 ring-2 ring-amber-400 ring-offset-1 dark:ring-offset-gray-900"
                  )}
                  style={{ height: `${Math.max(heightPct, 4)}%` }}
                >
                  {l.requiresCash && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-1">
                      <span className="text-[8px] bg-amber-500 text-white px-1 rounded font-bold whitespace-nowrap">CASH REPAY</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] mt-2 font-mono text-gray-500 dark:text-gray-400">{l.year}</span>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-[10px] text-gray-500 uppercase mb-1">Annual Interest Drag</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatLargeNumber(stats.annualInterestExpense)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-gray-500 uppercase mb-1">Liquidity Coverage (2yr)</p>
            <p className={cn(
              "text-lg font-bold",
              stats.liquidityCoverageRatio < 1 ? "text-red-600" : stats.liquidityCoverageRatio < 2 ? "text-amber-600" : "text-green-600"
            )}>
              {stats.liquidityCoverageRatio === 100 ? "∞" : stats.liquidityCoverageRatio.toFixed(1) + "x"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
