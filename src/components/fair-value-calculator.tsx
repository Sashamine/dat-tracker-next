"use client";

import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  calculateFairValueExtended,
  formatPercent,
  formatMNAV,
  formatLargeNumber,
  NETWORK_STAKING_APY,
  RISK_FREE_RATE,
  STAKING_SPREAD,
  LEVERAGE_SPREAD,
  LEVERAGE_SPREAD_NON_YIELDING,
  DEFAULT_EXPECTED_RETURN,
  DEFAULT_EXPECTED_RETURN_NON_YIELDING,
  FINANCING_COST,
  VOL_HARVEST_BASE_RATE,
  VOL_HARVEST_PREMIUM_CAP,
  VOL_HARVEST_OPTIONALITY_RATE,
  VOL_HARVEST_LIQUIDITY_FLOOR,
  VOL_HARVEST_BASE_RATE_NON_YIELDING,
  VOL_HARVEST_PREMIUM_CAP_NON_YIELDING,
  VOL_HARVEST_OPTIONALITY_RATE_NON_YIELDING,
  VOL_HARVEST_LIQUIDITY_FLOOR_NON_YIELDING,
  VERDICT_THRESHOLD,
  NON_YIELDING_ASSETS,
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
  capitalRaisedConverts?: number;
  avgDailyVolume?: number;
  hasOptions?: boolean;
  optionsOi?: number;
}

export function FairValueCalculator({
  holdings,
  assetPrice,
  marketCap,
  asset,
  defaultStakingPct = 0,
  defaultStakingApy,
  defaultQuarterlyBurn = 0,
  capitalRaisedConverts = 0,
  avgDailyVolume = 0,
  hasOptions = false,
  optionsOi = 0,
}: FairValueCalculatorProps) {
  const networkApy = NETWORK_STAKING_APY[asset] || 0;
  const isNonYielding = NON_YIELDING_ASSETS.includes(asset);

  // Get asset-type-specific defaults for leverage (BTC credit company thesis)
  const defaultExpectedReturn = isNonYielding ? DEFAULT_EXPECTED_RETURN_NON_YIELDING : DEFAULT_EXPECTED_RETURN;
  const defaultLeverageSpread = isNonYielding ? LEVERAGE_SPREAD_NON_YIELDING : LEVERAGE_SPREAD;

  // Get asset-type-specific defaults for vol harvesting
  const defaultBaseVolRate = isNonYielding ? VOL_HARVEST_BASE_RATE_NON_YIELDING : VOL_HARVEST_BASE_RATE;
  const defaultPremiumCap = isNonYielding ? VOL_HARVEST_PREMIUM_CAP_NON_YIELDING : VOL_HARVEST_PREMIUM_CAP;
  const defaultOptionalityRate = isNonYielding ? VOL_HARVEST_OPTIONALITY_RATE_NON_YIELDING : VOL_HARVEST_OPTIONALITY_RATE;
  const defaultLiquidityFloor = isNonYielding ? VOL_HARVEST_LIQUIDITY_FLOOR_NON_YIELDING : VOL_HARVEST_LIQUIDITY_FLOOR;

  // Model toggles
  const [includeExcessYield, setIncludeExcessYield] = useState(true);
  const [includeLeverage, setIncludeLeverage] = useState(true);
  const [includeVolHarvest, setIncludeVolHarvest] = useState(true);

  // Base assumptions - use asset-type-specific defaults
  const [expectedReturn, setExpectedReturn] = useState(defaultExpectedReturn * 100);
  const [riskFreeRate, setRiskFreeRate] = useState(RISK_FREE_RATE * 100);
  const [stakingBenchmark, setStakingBenchmark] = useState(networkApy * 100);

  // Staking parameters
  const [stakingPct, setStakingPct] = useState(defaultStakingPct * 100);
  const [stakingApy, setStakingApy] = useState((defaultStakingApy || networkApy) * 100);
  const [quarterlyBurn, setQuarterlyBurn] = useState(defaultQuarterlyBurn / 1_000_000);

  // Component-specific spreads - use asset-type-specific defaults
  const [stakingSpread, setStakingSpread] = useState(STAKING_SPREAD * 100);
  const [leverageSpread, setLeverageSpread] = useState(defaultLeverageSpread * 100);

  // Vol Harvesting parameters - use asset-type-specific defaults
  const [baseVolRate, setBaseVolRate] = useState(defaultBaseVolRate * 100);
  const [premiumCap, setPremiumCap] = useState(defaultPremiumCap);
  const [optionalityRate, setOptionalityRate] = useState(defaultOptionalityRate * 100);
  const [liquidityFloor, setLiquidityFloor] = useState(defaultLiquidityFloor * 100);

  // Verdict thresholds
  const [cheapThreshold, setCheapThreshold] = useState(VERDICT_THRESHOLD * 100);
  const [expensiveThreshold, setExpensiveThreshold] = useState(VERDICT_THRESHOLD * 100);

  // Calculate fair value with extended model
  const fairValue = useMemo(() => {
    return calculateFairValueExtended({
      holdings,
      assetPrice,
      marketCap,
      asset,
      stakingPct: stakingPct / 100,
      companyStakingApy: stakingApy / 100,
      quarterlyBurnUsd: quarterlyBurn * 1_000_000,
      networkStakingApy: stakingBenchmark / 100,
      capitalRaisedConverts,
      avgDailyVolume,
      hasOptions,
      optionsOi,
      includeExcessYield,
      includeLeverage,
      includeVolHarvest,
      riskFreeRate: riskFreeRate / 100,
      stakingSpread: stakingSpread / 100,
      leverageSpread: leverageSpread / 100,
      expectedReturn: expectedReturn / 100,
      financingCost: FINANCING_COST,
      baseVolRate: baseVolRate / 100,
      premiumCap,
      optionalityRate: optionalityRate / 100,
      liquidityFloorRate: liquidityFloor / 100,
      cheapThreshold: cheapThreshold / 100,
      expensiveThreshold: expensiveThreshold / 100,
    });
  }, [
    holdings, assetPrice, marketCap, asset, stakingPct, stakingApy, quarterlyBurn,
    stakingBenchmark, capitalRaisedConverts, avgDailyVolume, hasOptions, optionsOi,
    includeExcessYield, includeLeverage, includeVolHarvest, riskFreeRate, stakingSpread,
    leverageSpread, expectedReturn, baseVolRate, premiumCap, optionalityRate,
    liquidityFloor, cheapThreshold, expensiveThreshold,
  ]);

  const resetToDefaults = () => {
    setIncludeExcessYield(true);
    setIncludeLeverage(true);
    setIncludeVolHarvest(true);
    // Use asset-type-specific defaults for leverage
    setExpectedReturn(defaultExpectedReturn * 100);
    setRiskFreeRate(RISK_FREE_RATE * 100);
    setStakingBenchmark(networkApy * 100);
    setStakingPct(defaultStakingPct * 100);
    setStakingApy((defaultStakingApy || networkApy) * 100);
    setQuarterlyBurn(defaultQuarterlyBurn / 1_000_000);
    setStakingSpread(STAKING_SPREAD * 100);
    setLeverageSpread(defaultLeverageSpread * 100);
    // Use asset-type-specific defaults for vol harvesting
    setBaseVolRate(defaultBaseVolRate * 100);
    setPremiumCap(defaultPremiumCap);
    setOptionalityRate(defaultOptionalityRate * 100);
    setLiquidityFloor(defaultLiquidityFloor * 100);
    setCheapThreshold(VERDICT_THRESHOLD * 100);
    setExpensiveThreshold(VERDICT_THRESHOLD * 100);
  };

  const nav = holdings * assetPrice;
  const currentMNAV = marketCap / nav;

  // Build formula display
  const activeComponents = ["1.0"];
  if (includeExcessYield) activeComponents.push("Excess Yield");
  if (includeLeverage && capitalRaisedConverts > 0) activeComponents.push("Leverage");
  if (includeVolHarvest) activeComponents.push("Vol Harvest");

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

      {/* Active Formula */}
      <div className={cn(
        "rounded-lg p-3",
        isNonYielding ? "bg-orange-50 dark:bg-orange-900/20" : "bg-blue-50 dark:bg-blue-900/20"
      )}>
        <div className="flex items-center gap-2 mb-1">
          <span className={cn(
            "text-xs px-2 py-0.5 rounded font-medium",
            isNonYielding
              ? "bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200"
              : "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200"
          )}>
            {isNonYielding ? "Non-Yielding" : "Yielding"}
          </span>
          <span className="text-xs text-gray-500">{asset}</span>
        </div>
        <p className={cn(
          "text-sm font-mono",
          isNonYielding ? "text-orange-800 dark:text-orange-200" : "text-blue-800 dark:text-blue-200"
        )}>
          Fair Premium = {activeComponents.join(" + ")}
        </p>
        {includeVolHarvest && (
          <p className={cn(
            "text-xs mt-1",
            isNonYielding ? "text-orange-600 dark:text-orange-300" : "text-blue-600 dark:text-blue-300"
          )}>
            Vol Harvest = Base×Liq×min(mNAV-1, Cap) + Optionality×Liq² + Floor×Liq
          </p>
        )}
      </div>

      {/* Component Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div className={cn(!includeExcessYield && "opacity-50")}>
          <p className="text-xs text-gray-500 dark:text-gray-400">Excess Yield</p>
          <p className={cn(
            "text-lg font-semibold",
            fairValue.excessYieldContribution >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {fairValue.excessYieldContribution >= 0 ? "+" : ""}{fairValue.excessYieldContribution.toFixed(3)}
          </p>
        </div>
        <div className={cn((!includeLeverage || capitalRaisedConverts === 0) && "opacity-50")}>
          <p className="text-xs text-gray-500 dark:text-gray-400">Leverage</p>
          <p className={cn(
            "text-lg font-semibold",
            fairValue.leverageContribution >= 0 ? "text-green-600" : "text-red-600"
          )}>
            {fairValue.leverageContribution >= 0 ? "+" : ""}{fairValue.leverageContribution.toFixed(3)}
          </p>
        </div>
        <div className={cn(!includeVolHarvest && "opacity-50")}>
          <p className="text-xs text-gray-500 dark:text-gray-400">Vol Harvest</p>
          <p className="text-lg font-semibold text-green-600">
            +{fairValue.volHarvestContribution.toFixed(3)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Liquidity Score</p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {(fairValue.liquidityScore * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Vol Harvest Sub-components (when enabled) */}
      {includeVolHarvest && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Vol Harvesting Breakdown
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center text-sm">
            <div>
              <p className="text-xs text-gray-400">Premium</p>
              <p className="font-semibold">+{fairValue.volHarvestPremium.toFixed(3)}</p>
              <p className="text-xs text-gray-400">from mNAV &gt;1</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Optionality</p>
              <p className="font-semibold">+{fairValue.volHarvestOptionality.toFixed(3)}</p>
              <p className="text-xs text-gray-400">Liq² value</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Floor</p>
              <p className="font-semibold">+{fairValue.volHarvestFloor.toFixed(3)}</p>
              <p className="text-xs text-gray-400">deep liquidity</p>
            </div>
          </div>
        </div>
      )}

      {/* Model Components Toggle */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Model Components
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Excess Yield</Label>
              <p className="text-xs text-gray-400">
                {isNonYielding ? "Burn drag" : "Yield above benchmark"}
              </p>
            </div>
            <Switch
              checked={includeExcessYield}
              onCheckedChange={setIncludeExcessYield}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Leverage Returns</Label>
              <p className="text-xs text-gray-400">
                {capitalRaisedConverts > 0
                  ? `$${(capitalRaisedConverts / 1_000_000).toFixed(0)}M converts`
                  : "No converts"}
              </p>
            </div>
            <Switch
              checked={includeLeverage}
              onCheckedChange={setIncludeLeverage}
              disabled={capitalRaisedConverts === 0}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">Vol Harvesting</Label>
              <p className="text-xs text-gray-400">ATM premium + optionality</p>
            </div>
            <Switch
              checked={includeVolHarvest}
              onCheckedChange={setIncludeVolHarvest}
            />
          </div>
        </div>
      </div>

      {/* Base Assumptions */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Base Assumptions
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Expected {asset} Return</Label>
              <span className="text-sm text-gray-500">{expectedReturn.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="-20"
              max="50"
              step="5"
              value={expectedReturn}
              onChange={(e) => setExpectedReturn(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Risk-Free Rate</Label>
              <span className="text-sm text-gray-500">{riskFreeRate.toFixed(1)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={riskFreeRate}
              onChange={(e) => setRiskFreeRate(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
          {!isNonYielding && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Staking Benchmark</Label>
                <span className="text-sm text-gray-500">{stakingBenchmark.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.1"
                value={stakingBenchmark}
                onChange={(e) => setStakingBenchmark(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="text-xs text-gray-400">Network: {formatPercent(networkApy)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Company Parameters */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Company Parameters
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {!isNonYielding && (
            <>
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
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Company APY</Label>
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
              </div>
            </>
          )}
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
        </div>
      </div>

      {/* Component Parameters */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Component Parameters
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Excess Yield */}
          <div className={cn("space-y-3", !includeExcessYield && "opacity-50")}>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Excess Yield</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Risk Spread</Label>
                <span className="text-xs text-gray-500">{stakingSpread.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={stakingSpread}
                onChange={(e) => setStakingSpread(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                disabled={!includeExcessYield}
              />
              <p className="text-xs text-gray-400">
                Discount: rf + {stakingSpread.toFixed(0)}% = {(riskFreeRate + stakingSpread).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Leverage */}
          <div className={cn("space-y-3", (!includeLeverage || capitalRaisedConverts === 0) && "opacity-50")}>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Leverage</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Risk Spread</Label>
                <span className="text-xs text-gray-500">{leverageSpread.toFixed(1)}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="40"
                step="1"
                value={leverageSpread}
                onChange={(e) => setLeverageSpread(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                disabled={!includeLeverage || capitalRaisedConverts === 0}
              />
              <p className="text-xs text-gray-400">
                Discount: rf + {leverageSpread.toFixed(0)}% = {(riskFreeRate + leverageSpread).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Vol Harvesting */}
          <div className={cn("space-y-3", !includeVolHarvest && "opacity-50")}>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Vol Harvesting</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Base Rate</Label>
                <span className="text-xs text-gray-500">{baseVolRate.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                step="1"
                value={baseVolRate}
                onChange={(e) => setBaseVolRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                disabled={!includeVolHarvest}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Premium Cap</Label>
                <span className="text-xs text-gray-500">{premiumCap.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={premiumCap}
                onChange={(e) => setPremiumCap(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                disabled={!includeVolHarvest}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Optionality Rate</Label>
                <span className="text-xs text-gray-500">{optionalityRate.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="15"
                step="0.5"
                value={optionalityRate}
                onChange={(e) => setOptionalityRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                disabled={!includeVolHarvest}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Liquidity Floor</Label>
                <span className="text-xs text-gray-500">{liquidityFloor.toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={liquidityFloor}
                onChange={(e) => setLiquidityFloor(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                disabled={!includeVolHarvest}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Verdict Thresholds */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Verdict Thresholds
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Cheap (below fair)</Label>
              <span className="text-sm text-gray-500">{cheapThreshold.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={cheapThreshold}
              onChange={(e) => setCheapThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Expensive (above fair)</Label>
              <span className="text-sm text-gray-500">{expensiveThreshold.toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="1"
              value={expensiveThreshold}
              onChange={(e) => setExpensiveThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

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

      {/* Model Documentation */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <details className="text-sm text-gray-600 dark:text-gray-400">
          <summary className="cursor-pointer font-medium hover:text-gray-900 dark:hover:text-gray-200">
            Model Documentation
          </summary>
          <div className="mt-4 space-y-4 text-xs">
            <div>
              <p className="font-medium">Formula: Fair Premium = 1 + Base + Leverage + Vol Harvesting</p>
            </div>

            {/* Asset Type Explanation */}
            <div className={cn(
              "rounded p-2",
              isNonYielding ? "bg-orange-50 dark:bg-orange-900/20" : "bg-indigo-50 dark:bg-indigo-900/20"
            )}>
              <p className="font-medium">
                {isNonYielding ? "Non-Yielding Asset (BTC Credit Company)" : "Yielding Asset (ETH-style)"}
              </p>
              {isNonYielding ? (
                <p className="text-gray-500">
                  No native staking yield. <strong>Leverage + Vol harvesting</strong> are the PRIMARY value drivers.
                  Leverage: E[Return] {(defaultExpectedReturn * 100).toFixed(0)}%, Spread {(defaultLeverageSpread * 100).toFixed(0)}%.
                  Vol Harvest: Base {(defaultBaseVolRate * 100).toFixed(0)}%, Floor {(defaultLiquidityFloor * 100).toFixed(0)}%.
                </p>
              ) : (
                <p className="text-gray-500">
                  Has native staking yield ({formatPercent(networkApy)} benchmark).
                  Staking is primary; leverage/vol harvest supplementary.
                  Leverage: E[Return] {(defaultExpectedReturn * 100).toFixed(0)}%, Spread {(defaultLeverageSpread * 100).toFixed(0)}%.
                </p>
              )}
            </div>

            <div>
              <p className="font-medium">Excess Yield (Base)</p>
              <p className="text-gray-500">
                {isNonYielding
                  ? "= Net Yield / (rf + spread) — No benchmark, burn drag reduces value"
                  : "= (Net Yield - Staking Benchmark) / (rf + spread) — Only EXCESS yield counts"}
              </p>
            </div>
            <div>
              <p className="font-medium">Leverage (BTC Credit Company Thesis)</p>
              <p className="text-gray-500">
                = ((E[Asset] - Financing Cost) × Debt) / Holdings / (rf + {(defaultLeverageSpread * 100).toFixed(0)}%)
              </p>
              <p className="text-gray-500">
                {isNonYielding
                  ? "Core thesis for BTC DATs like MSTR. Lower discount rate (15%) since leverage IS the strategy."
                  : "Supplementary for yielding assets. Higher discount rate (21%) due to added risk."}
              </p>
            </div>
            <div>
              <p className="font-medium">Vol Harvesting (3 components)</p>
              <ul className="text-gray-500 ml-4 list-disc">
                <li><strong>Premium:</strong> Base Rate × Liq × min(mNAV-1, Cap) - value from ATM at premium</li>
                <li><strong>Optionality:</strong> Rate × Liq² - deep liquidity even at NAV has value</li>
                <li><strong>Floor:</strong> Floor Rate × Liq - baseline for execution ability</li>
              </ul>
            </div>
            <div>
              <p className="font-medium">Liquidity Score</p>
              <ul className="text-gray-500 ml-4 list-disc">
                <li>Volume: 50% weight (BMNR = 100% at $800M/day)</li>
                <li>Options: 30% if deep OI (&gt;50K), 15% if shallow</li>
                <li>Index: 20% if included in major indices</li>
              </ul>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
