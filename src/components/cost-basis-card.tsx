"use client";

import { Company } from "@/lib/types";
import { getAssetConfig } from "@/lib/asset-configs";

interface CostBasisCardProps {
  company: Company;
  assetPrice: number;
}

export function CostBasisCard({ company, assetPrice }: CostBasisCardProps) {
  const costBasis = company.costBasisAvg;
  
  if (!costBasis) {
    return null;
  }

  const assetConfig = getAssetConfig(company.asset);
  const symbol = assetConfig?.symbol || company.asset;
  
  const formatUsd = (n: number) => {
    if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${n.toLocaleString()}`;
  };

  // Calculate unrealized P&L
  const holdings = company.holdings;
  const totalCostBasis = costBasis * holdings;
  const currentValue = assetPrice * holdings;
  const unrealizedPnL = currentValue - totalCostBasis;
  const unrealizedPnLPct = ((assetPrice - costBasis) / costBasis) * 100;
  
  const isProfit = unrealizedPnL >= 0;
  const pnlColor = isProfit 
    ? "text-green-600 dark:text-green-400" 
    : "text-red-600 dark:text-red-400";
  const pnlBgColor = isProfit 
    ? "bg-green-50 dark:bg-green-950/30" 
    : "bg-red-50 dark:bg-red-950/30";

  return (
    <div className="rounded-lg border bg-card p-4">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <span>💰</span>
        <span>Cost Basis & P/L</span>
      </h4>
      
      <div className="space-y-3 text-sm">
        {/* Average cost basis */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Avg Cost Basis</span>
          <span className="font-medium font-mono">
            ${costBasis.toLocaleString()} / {symbol}
          </span>
        </div>
        
        {/* Current price */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Current Price</span>
          <span className="font-medium font-mono">
            ${assetPrice.toLocaleString()} / {symbol}
          </span>
        </div>
        
        {/* Total cost basis */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Total Cost</span>
          <span className="font-mono">{formatUsd(totalCostBasis)}</span>
        </div>
        
        {/* Current value */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Current Value</span>
          <span className="font-mono">{formatUsd(currentValue)}</span>
        </div>
        
        {/* Unrealized P&L */}
        <div className={`rounded-lg p-3 ${pnlBgColor} mt-2`}>
          <div className="flex items-center justify-between">
            <span className="font-medium">Unrealized P/L</span>
            <div className={`text-right ${pnlColor}`}>
              <span className="font-bold font-mono">
                {isProfit ? "+" : ""}{formatUsd(unrealizedPnL)}
              </span>
              <span className="ml-2 text-xs">
                ({isProfit ? "+" : ""}{unrealizedPnLPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </div>
        
        {/* Source */}
        {company.costBasisSourceUrl && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            <a 
              href={company.costBasisSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              📋 Source: {company.costBasisSource || "SEC Filing"}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
