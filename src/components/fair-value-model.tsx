"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Company } from "@/lib/types";
import {
  calculateMNAV,
  formatLargeNumber,
  formatMNAV,
  formatPercent,
  NETWORK_STAKING_APY,
} from "@/lib/calculations";

interface PriceData {
  crypto: Record<string, { price: number; change24h: number }>;
  stocks: Record<string, { price: number; change24h: number; volume: number; marketCap: number }>;
}

interface ModelParams {
  riskFreeRate: number;
  spread: number;
  cheapThreshold: number;
  expensiveThreshold: number;
  volRate: number;
}

interface FairValueModelProps {
  companies: Company[];
  prices?: PriceData;
  assetFilter?: string;
}

// Calculate fair value with configurable parameters
function calculateFairValueWithParams(
  holdings: number,
  assetPrice: number,
  marketCap: number,
  stakingPct: number,
  stakingApy: number,
  quarterlyBurnUsd: number,
  networkStakingApy: number,
  params: ModelParams
): {
  mNAV: number;
  netYieldPct: number;
  excessYield: number;
  fairPremium: number;
  upside: number;
  verdict: "Cheap" | "Fair" | "Expensive" | "N/A";
} {
  const nav = holdings * assetPrice;
  const mNAV = nav > 0 ? marketCap / nav : 0;

  // Calculate staking yield
  const stakedTokens = holdings * stakingPct;
  const yieldTokens = stakedTokens * stakingApy;

  // Calculate burn
  const annualBurnUsd = quarterlyBurnUsd * 4;
  const annualBurnTokens = assetPrice > 0 ? annualBurnUsd / assetPrice : 0;

  // Net yield
  const netYieldTokens = yieldTokens - annualBurnTokens;
  const netYieldPct = holdings > 0 ? netYieldTokens / holdings : 0;

  // Excess yield over benchmark
  const hasNetworkStaking = networkStakingApy > 0;
  const excessYield = hasNetworkStaking ? netYieldPct - networkStakingApy : netYieldPct;

  // Discount rate
  const discountRate = params.riskFreeRate + params.spread;

  // Fair premium calculation
  // For staking assets: premium based on EXCESS yield over benchmark
  // For non-staking: premium based on vol harvesting potential
  let fairPremium: number;
  if (hasNetworkStaking) {
    fairPremium = Math.max(0.3, 1.0 + excessYield / discountRate);
  } else {
    // Vol harvesting model for non-yielding assets
    fairPremium = Math.max(0.3, 1.0 + params.volRate / discountRate);
  }

  // Verdict
  let verdict: "Cheap" | "Fair" | "Expensive" | "N/A" = "N/A";
  let upside = 0;

  if (mNAV > 0) {
    if (mNAV < fairPremium * (1 - params.cheapThreshold)) {
      verdict = "Cheap";
    } else if (mNAV > fairPremium * (1 + params.expensiveThreshold)) {
      verdict = "Expensive";
    } else {
      verdict = "Fair";
    }
    upside = fairPremium / mNAV - 1;
  }

  return {
    mNAV,
    netYieldPct,
    excessYield,
    fairPremium,
    upside,
    verdict,
  };
}

// Verdict colors
const verdictColors: Record<string, string> = {
  Cheap: "text-green-600 bg-green-50 dark:bg-green-900/20",
  Fair: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
  Expensive: "text-red-600 bg-red-50 dark:bg-red-900/20",
  "N/A": "text-gray-600 bg-gray-50 dark:bg-gray-900/20",
};

// Sensitivity Analysis: Vol Rate vs Liquidity Score
function SensitivityTable() {
  const volRates = [0.05, 0.10, 0.15, 0.20, 0.25];
  const liqScores = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">
              Liquidity
            </th>
            {volRates.map((vr) => (
              <th key={vr} className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">
                {(vr * 100).toFixed(0)}%
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {liqScores.map((liq) => (
            <tr key={liq} className="border-t border-gray-200 dark:border-gray-700">
              <td className="px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                {(liq * 100).toFixed(0)}%
              </td>
              {volRates.map((vr) => {
                const volContrib = vr * liq * 0.5 + 0.05 * (liq ** 2);
                const fair = 1.0 + volContrib;
                return (
                  <td key={vr} className="px-3 py-2 text-center font-mono text-gray-700 dark:text-gray-300">
                    {fair.toFixed(2)}x
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Regime Scenarios Table
function RegimeScenarios({ asset = "BTC" }: { asset?: string }) {
  const isBTC = asset === "BTC";
  const regimeData = isBTC
    ? [
        { regime: "Bull", prob: "25%", assetReturn: "+100%", volHarv: "25%", mNAV: "2.5x", datReturn: "+300%", color: "text-green-600" },
        { regime: "Base", prob: "40%", assetReturn: "+15%", volHarv: "15%", mNAV: "1.5x", datReturn: "+40%", color: "text-blue-600" },
        { regime: "Bear", prob: "25%", assetReturn: "-50%", volHarv: "5%", mNAV: "0.8x", datReturn: "-60%", color: "text-orange-600" },
        { regime: "Crisis", prob: "10%", assetReturn: "-80%", volHarv: "0%", mNAV: "0.4x", datReturn: "-90%", color: "text-red-600" },
      ]
    : [
        { regime: "Bull", prob: "25%", assetReturn: "+80%", volHarv: "20%", mNAV: "2.0x", datReturn: "+250%", color: "text-green-600" },
        { regime: "Base", prob: "40%", assetReturn: "+10%", volHarv: "10%", mNAV: "1.3x", datReturn: "+30%", color: "text-blue-600" },
        { regime: "Bear", prob: "25%", assetReturn: "-40%", volHarv: "3%", mNAV: "0.7x", datReturn: "-50%", color: "text-orange-600" },
        { regime: "Crisis", prob: "10%", assetReturn: "-70%", volHarv: "0%", mNAV: "0.3x", datReturn: "-85%", color: "text-red-600" },
      ];

  // Calculate expected return
  const evReturn = 0.25 * 3.00 + 0.40 * 0.40 + 0.25 * (-0.60) + 0.10 * (-0.90);
  const evAsset = 0.25 * 1.00 + 0.40 * 0.15 + 0.25 * (-0.50) + 0.10 * (-0.80);

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Regime</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">Prob</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">{asset}</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">Vol Harv</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">mNAV</th>
              <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">DAT Return</th>
            </tr>
          </thead>
          <tbody>
            {regimeData.map((row) => (
              <tr key={row.regime} className="border-t border-gray-200 dark:border-gray-700">
                <td className={cn("px-3 py-2 font-medium", row.color)}>{row.regime}</td>
                <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{row.prob}</td>
                <td className="px-3 py-2 text-center font-mono text-gray-700 dark:text-gray-300">{row.assetReturn}</td>
                <td className="px-3 py-2 text-center font-mono text-gray-700 dark:text-gray-300">{row.volHarv}</td>
                <td className="px-3 py-2 text-center font-mono text-gray-700 dark:text-gray-300">{row.mNAV}</td>
                <td className={cn("px-3 py-2 text-center font-mono font-medium", row.color)}>{row.datReturn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expected Values */}
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Expected {asset} Return</p>
          <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{(evAsset * 100).toFixed(0)}%</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Expected DAT Return</p>
          <p className="text-lg font-bold text-green-600">{(evReturn * 100).toFixed(0)}%</p>
        </div>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
        {isBTC
          ? "Non-yielding insight: BTC DATs are pure vol harvesting plays. In bull markets, massive ATM programs drive BTC/share growth. In bear markets, premium compresses and leverage becomes a liability."
          : "Yielding insight: Staking assets have a yield floor from native staking. Vol harvesting provides additional upside in bull markets."}
      </p>
    </div>
  );
}

export function FairValueModel({ companies, prices, assetFilter }: FairValueModelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<"sensitivity" | "regime">("sensitivity");

  // Model parameters
  const [riskFreeRate, setRiskFreeRate] = useState(0.04);
  const [spread, setSpread] = useState(0.06);
  const [cheapThreshold, setCheapThreshold] = useState(0.15);
  const [expensiveThreshold, setExpensiveThreshold] = useState(0.15);
  const [volRate, setVolRate] = useState(0.15);

  const params: ModelParams = {
    riskFreeRate,
    spread,
    cheapThreshold,
    expensiveThreshold,
    volRate,
  };

  const resetDefaults = () => {
    setRiskFreeRate(0.04);
    setSpread(0.06);
    setCheapThreshold(0.15);
    setExpensiveThreshold(0.15);
    setVolRate(0.15);
  };

  // Calculate results for filtered companies
  const filteredCompanies = assetFilter
    ? companies.filter((c) => c.asset === assetFilter)
    : companies;

  const results = filteredCompanies.map((company) => {
    const cryptoPrice = prices?.crypto[company.asset]?.price || 0;
    const stockData = prices?.stocks[company.ticker];
    const marketCap = stockData?.marketCap || company.marketCap || 0;
    const networkStakingApy = NETWORK_STAKING_APY[company.asset] || 0;

    const fv = calculateFairValueWithParams(
      company.holdings,
      cryptoPrice,
      marketCap,
      company.stakingPct || 0,
      company.stakingApy || networkStakingApy,
      company.quarterlyBurnUsd || 0,
      networkStakingApy,
      params
    );

    return {
      ...company,
      ...fv,
      marketCap,
      holdingsValue: company.holdings * cryptoPrice,
    };
  });

  // Sort by upside
  const sortedResults = [...results].sort((a, b) => b.upside - a.upside);

  // Summary stats
  const cheapCount = results.filter((r) => r.verdict === "Cheap").length;
  const fairCount = results.filter((r) => r.verdict === "Fair").length;
  const expensiveCount = results.filter((r) => r.verdict === "Expensive").length;
  const avgUpside = results.length > 0 ? results.reduce((sum, r) => sum + r.upside, 0) / results.length : 0;

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-800 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-600 transition-all"
      >
        <span className="font-semibold">Fair Value Model</span>
        <svg
          className={cn("w-5 h-5 transition-transform", isExpanded && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
          {/* Model Parameters */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Model Assumptions</h3>
              <button
                onClick={resetDefaults}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Reset to Defaults
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Risk-Free Rate */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Risk-Free Rate
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.5"
                  value={riskFreeRate * 100}
                  onChange={(e) => setRiskFreeRate(parseFloat(e.target.value) / 100)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                  {(riskFreeRate * 100).toFixed(1)}%
                </div>
              </div>

              {/* Discount Spread */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Discount Spread
                </label>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.5"
                  value={spread * 100}
                  onChange={(e) => setSpread(parseFloat(e.target.value) / 100)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                  {(spread * 100).toFixed(1)}%
                </div>
              </div>

              {/* Cheap Threshold */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Cheap Threshold
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={cheapThreshold * 100}
                  onChange={(e) => setCheapThreshold(parseFloat(e.target.value) / 100)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                  {(cheapThreshold * 100).toFixed(0)}% below fair
                </div>
              </div>

              {/* Expensive Threshold */}
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Expensive Threshold
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  step="1"
                  value={expensiveThreshold * 100}
                  onChange={(e) => setExpensiveThreshold(parseFloat(e.target.value) / 100)}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="text-sm font-mono text-gray-900 dark:text-gray-100 mt-1">
                  {(expensiveThreshold * 100).toFixed(0)}% above fair
                </div>
              </div>
            </div>

            {/* Vol Rate (for non-yielding) */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Vol Harvesting Rate (Non-Yielding Assets)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={volRate * 100}
                  onChange={(e) => setVolRate(parseFloat(e.target.value) / 100)}
                  className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <div className="text-sm font-mono text-gray-900 dark:text-gray-100 w-16 text-right">
                  {(volRate * 100).toFixed(0)}%
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Max annual crypto/share accretion from ATM at premium
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50">
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Avg Upside</p>
              <p className={cn("text-lg font-bold", avgUpside > 0 ? "text-green-600" : "text-red-600")}>
                {avgUpside > 0 ? "+" : ""}{(avgUpside * 100).toFixed(0)}%
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Cheap</p>
              <p className="text-lg font-bold text-green-600">{cheapCount}/{results.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Fair</p>
              <p className="text-lg font-bold text-blue-600">{fairCount}/{results.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">Expensive</p>
              <p className="text-lg font-bold text-red-600">{expensiveCount}/{results.length}</p>
            </div>
          </div>

          {/* Results Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-800">
                  <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-400">Company</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">Asset</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Value</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">mNAV</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Fair Premium</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-400">Upside</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-400">Verdict</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.slice(0, 15).map((result) => (
                  <tr key={result.id} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900 dark:text-gray-100">{result.ticker}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[150px]">{result.name}</div>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">{result.asset}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                      {formatLargeNumber(result.holdingsValue)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                      {formatMNAV(result.mNAV)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-gray-300">
                      {result.fairPremium.toFixed(2)}x
                    </td>
                    <td className={cn(
                      "px-3 py-2 text-right font-mono font-medium",
                      result.upside > 0 ? "text-green-600" : "text-red-600"
                    )}>
                      {result.upside > 0 ? "+" : ""}{(result.upside * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        verdictColors[result.verdict]
                      )}>
                        {result.verdict}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Advanced Analysis Toggle */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
            >
              <span>{showAdvanced ? "▼" : "▶"}</span>
              <span>Advanced Analysis</span>
            </button>

            {showAdvanced && (
              <div className="mt-4">
                {/* Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveTab("sensitivity")}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md transition-colors",
                      activeTab === "sensitivity"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                    )}
                  >
                    Sensitivity
                  </button>
                  <button
                    onClick={() => setActiveTab("regime")}
                    className={cn(
                      "px-3 py-1.5 text-sm rounded-md transition-colors",
                      activeTab === "regime"
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                    )}
                  >
                    Regime Scenarios
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === "sensitivity" ? (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Fair Premium: Vol Rate vs Liquidity Score
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      How fair premium changes with key assumptions
                    </p>
                    <SensitivityTable />
                  </div>
                ) : (
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Regime Scenarios
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      Expected outcomes across market conditions
                    </p>
                    <RegimeScenarios asset={assetFilter || "BTC"} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
