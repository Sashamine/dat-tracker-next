"use client";

import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  calculateFairValue,
  formatPercent,
  formatMNAV,
  formatLargeNumber,
  NETWORK_STAKING_APY,
} from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface FairValueCalculatorProps {
  holdings: number;
  assetPrice: number;
  marketCap: number;
  asset: string;
  defaultStakingPct?: number;
  defaultStakingApy?: number;
  defaultQuarterlyBurn?: number;
}

export function FairValueCalculator({
  holdings,
  assetPrice,
  marketCap,
  asset,
  defaultStakingPct = 0,
  defaultStakingApy,
  defaultQuarterlyBurn = 0,
}: FairValueCalculatorProps) {
  const networkApy = NETWORK_STAKING_APY[asset] || 0;

  // Model parameters
  const [stakingPct, setStakingPct] = useState(defaultStakingPct * 100); // Store as percentage for display
  const [stakingApy, setStakingApy] = useState((defaultStakingApy || networkApy) * 100);
  const [quarterlyBurn, setQuarterlyBurn] = useState(defaultQuarterlyBurn / 1_000_000); // Store in millions
  const [riskFreeRate, setRiskFreeRate] = useState(4); // 4%
  const [spread, setSpread] = useState(networkApy > 0 ? 6 : 10); // 6% for staking assets, 10% for non-staking

  // Calculate fair value with current parameters
  const fairValue = useMemo(() => {
    return calculateFairValue(
      holdings,
      assetPrice,
      marketCap,
      stakingPct / 100,
      stakingApy / 100,
      quarterlyBurn * 1_000_000,
      networkApy,
      riskFreeRate / 100,
      asset,
      1.0 // Default leverage ratio
    );
  }, [holdings, assetPrice, marketCap, stakingPct, stakingApy, quarterlyBurn, networkApy, riskFreeRate, asset]);

  // Calculate with benchmark (network staking for all)
  const benchmarkValue = useMemo(() => {
    return calculateFairValue(
      holdings,
      assetPrice,
      marketCap,
      1.0, // 100% staked at network rate
      networkApy,
      0, // No burn
      networkApy,
      riskFreeRate / 100,
      asset,
      1.0
    );
  }, [holdings, assetPrice, marketCap, networkApy, riskFreeRate, asset]);

  const resetToDefaults = () => {
    setStakingPct(defaultStakingPct * 100);
    setStakingApy((defaultStakingApy || networkApy) * 100);
    setQuarterlyBurn(defaultQuarterlyBurn / 1_000_000);
    setRiskFreeRate(4);
    setSpread(networkApy > 0 ? 6 : 10);
  };

  const nav = holdings * assetPrice;
  const currentMNAV = marketCap / nav;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Fair Value Calculator
        </h3>
        <Button variant="ghost" size="sm" onClick={resetToDefaults}>
          Reset
        </Button>
      </div>

      {/* Results Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Current mNAV</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {formatMNAV(currentMNAV)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Fair Premium</p>
          <p className={cn(
            "text-2xl font-bold",
            fairValue.fairPremium > currentMNAV ? "text-green-600" : "text-red-600"
          )}>
            {formatMNAV(fairValue.fairPremium)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Upside</p>
          <p className={cn(
            "text-2xl font-bold",
            fairValue.upside > 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatPercent(fairValue.upside, true)}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Verdict</p>
          <p className={cn(
            "text-2xl font-bold",
            fairValue.verdict === "Cheap" ? "text-green-600" :
            fairValue.verdict === "Fair" ? "text-blue-600" :
            fairValue.verdict === "Expensive" ? "text-red-600" :
            "text-gray-600"
          )}>
            {fairValue.verdict}
          </p>
        </div>
      </div>

      {/* Yield Breakdown */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gross Yield</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatPercent((stakingPct / 100) * (stakingApy / 100))}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Burn Rate</p>
          <p className="text-lg font-semibold text-red-600">
            -{formatPercent(quarterlyBurn * 4 * 1_000_000 / nav)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Net Yield</p>
          <p className={cn(
            "text-lg font-semibold",
            fairValue.netYieldPct > 0 ? "text-green-600" : "text-red-600"
          )}>
            {formatPercent(fairValue.netYieldPct, true)}
          </p>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Model Parameters
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Staking Percentage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Staking %</Label>
              <span className="text-sm text-gray-500">{stakingPct.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={stakingPct}
              onChange={(e) => setStakingPct(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          {/* Staking APY */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Staking APY</Label>
              <span className="text-sm text-gray-500">{stakingApy.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="20"
              step="0.1"
              value={stakingApy}
              onChange={(e) => setStakingApy(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
            <p className="text-xs text-gray-400">
              Network benchmark: {formatPercent(networkApy)}
            </p>
          </div>

          {/* Quarterly Burn */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Quarterly Burn ($M)</Label>
              <span className="text-sm text-gray-500">${quarterlyBurn.toFixed(1)}M</span>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="0.5"
              value={quarterlyBurn}
              onChange={(e) => setQuarterlyBurn(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>

          {/* Risk-Free Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Risk-Free Rate</Label>
              <span className="text-sm text-gray-500">{riskFreeRate.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="0.1"
              value={riskFreeRate}
              onChange={(e) => setRiskFreeRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      {/* Comparison with Benchmark */}
      {networkApy > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Benchmark Comparison
          </h4>
          <p className="text-xs text-gray-500 mb-3">
            If 100% staked at network rate ({formatPercent(networkApy)}) with no burn
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400">Benchmark Fair</p>
              <p className="text-sm font-semibold">{formatMNAV(benchmarkValue.fairPremium)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">vs Current Model</p>
              <p className={cn(
                "text-sm font-semibold",
                fairValue.fairPremium >= benchmarkValue.fairPremium ? "text-green-600" : "text-red-600"
              )}>
                {formatPercent((fairValue.fairPremium / benchmarkValue.fairPremium) - 1, true)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Excess Yield</p>
              <p className={cn(
                "text-sm font-semibold",
                fairValue.excessYield > 0 ? "text-green-600" : "text-red-600"
              )}>
                {formatPercent(fairValue.excessYield, true)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Implied Target Price */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Implied Values
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-400">Fair Market Cap</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {formatLargeNumber(fairValue.fairPremium * nav)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Current vs Fair Gap</p>
            <p className={cn(
              "text-lg font-bold",
              fairValue.upside > 0 ? "text-green-600" : "text-red-600"
            )}>
              {formatLargeNumber((fairValue.fairPremium * nav) - marketCap)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
