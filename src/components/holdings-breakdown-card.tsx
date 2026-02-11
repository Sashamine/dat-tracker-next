"use client";

import { Company } from "@/lib/types";

interface HoldingsBreakdownCardProps {
  company: Company;
  assetPrice: number;
}

export function HoldingsBreakdownCard({ company, assetPrice }: HoldingsBreakdownCardProps) {
  const hasBreakdown = company.holdingsNative || company.holdingsLsETH || company.holdingsStaked;
  
  if (!hasBreakdown) {
    return null;
  }

  const symbol = company.asset;
  
  const formatNumber = (n: number) => n.toLocaleString();
  const formatUsd = (n: number) => {
    if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
    return `$${n.toLocaleString()}`;
  };

  // Calculate totals
  const nativeHoldings = company.holdingsNative || 0;
  const lsETHHoldings = company.holdingsLsETH || 0;
  const stakedHoldings = company.holdingsStaked || 0;
  const stakingRewards = company.stakingRewardsCumulative || 0;
  
  const totalHoldings = company.holdings;
  const totalValue = totalHoldings * assetPrice;
  
  // Calculate percentages
  const nativePct = totalHoldings > 0 ? (nativeHoldings / totalHoldings) * 100 : 0;
  const stakedPct = totalHoldings > 0 ? ((lsETHHoldings || stakedHoldings) / totalHoldings) * 100 : 0;

  return (
    <div className="rounded-lg border bg-card p-4">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <span>🏦</span>
        <span>Holdings Breakdown</span>
      </h4>
      
      {/* Visual bar */}
      <div className="h-3 rounded-full overflow-hidden bg-muted mb-4 flex">
        {nativeHoldings > 0 && (
          <div 
            className="bg-blue-500 h-full" 
            style={{ width: `${nativePct}%` }}
            title={`Native ${symbol}: ${nativePct.toFixed(1)}%`}
          />
        )}
        {(lsETHHoldings > 0 || stakedHoldings > 0) && (
          <div 
            className="bg-purple-500 h-full" 
            style={{ width: `${stakedPct}%` }}
            title={`Staked: ${stakedPct.toFixed(1)}%`}
          />
        )}
      </div>
      
      {/* Legend */}
      <div className="space-y-2 text-sm">
        {nativeHoldings > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Native {symbol}</span>
            </div>
            <div className="text-right">
              <span className="font-medium">{formatNumber(nativeHoldings)}</span>
              <span className="text-muted-foreground ml-2 text-xs">
                {formatUsd(nativeHoldings * assetPrice)}
              </span>
            </div>
          </div>
        )}
        
        {lsETHHoldings > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>LsETH (Lido)</span>
            </div>
            <div className="text-right">
              <span className="font-medium">{formatNumber(lsETHHoldings)}</span>
              <span className="text-muted-foreground ml-2 text-xs">
                {formatUsd(lsETHHoldings * assetPrice)}
              </span>
            </div>
          </div>
        )}
        
        {stakedHoldings > 0 && !lsETHHoldings && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500" />
              <span>Staked</span>
            </div>
            <div className="text-right">
              <span className="font-medium">{formatNumber(stakedHoldings)}</span>
              <span className="text-muted-foreground ml-2 text-xs">
                {formatUsd(stakedHoldings * assetPrice)}
              </span>
            </div>
          </div>
        )}
        
        {/* Total */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="font-medium">Total</span>
          <div className="text-right">
            <span className="font-medium">{formatNumber(totalHoldings)}</span>
            <span className="text-muted-foreground ml-2 text-xs">
              {formatUsd(totalValue)}
            </span>
          </div>
        </div>
        
        {/* Staking rewards */}
        {stakingRewards > 0 && (
          <div className="flex items-center justify-between text-green-600 dark:text-green-400">
            <div className="flex items-center gap-2">
              <span>🌱</span>
              <span>Staking Rewards</span>
            </div>
            <div className="text-right">
              <span className="font-medium">+{formatNumber(stakingRewards)}</span>
              <span className="ml-2 text-xs">
                {formatUsd(stakingRewards * assetPrice)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
