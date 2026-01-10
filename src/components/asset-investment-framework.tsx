"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  RISK_FREE_RATE,
  EQUITY_RISK_SPREAD,
  DISCOUNT_RATE,
  BURN_DRAG_DIVISOR,
  YIELDING_OPTIONALITY_FACTOR,
  BASE_OPTIONALITY_PREMIUM,
  NETWORK_STAKING_APY,
  NON_YIELDING_ASSETS,
} from "@/lib/calculations";

interface AssetInvestmentFrameworkProps {
  asset: string;
}

export function AssetInvestmentFramework({ asset }: AssetInvestmentFrameworkProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isYielding = !NON_YIELDING_ASSETS.includes(asset);
  const networkApy = NETWORK_STAKING_APY[asset] || 0;
  const optionalityPremium = BASE_OPTIONALITY_PREMIUM[asset] || 0.15;

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between px-4 py-3 text-white rounded-lg transition-all",
          isYielding
            ? "bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500"
            : "bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500"
        )}
      >
        <span className="font-semibold">
          {isYielding ? "Yielding Asset Framework" : "Non-Yielding Asset Framework"}
        </span>
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
          {isYielding ? (
            /* Yielding Assets Framework */
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">📈</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {asset} is a Yielding Asset
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Native staking APY: {(networkApy * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Benchmark:</p>
                    <p>Staking {asset} directly at {(networkApy * 100).toFixed(1)}% APY</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Key Question:</p>
                    <p>Does this DAT generate returns above DIY staking?</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Value Sources:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Excess Yield</strong> — yield above {(networkApy * 100).toFixed(1)}% benchmark</li>
                      <li><strong>Efficiency</strong> — low burn rate preserves value</li>
                      <li><strong>Optionality</strong> — institutional access, liquidity (50% weight)</li>
                      <li><strong>Leverage</strong> — debt amplifies returns if {asset} outperforms</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Fair Value Formula:</p>
                  <div className="font-mono text-sm bg-white dark:bg-gray-900 rounded p-3">
                    <code>Fair Value = 1.0 + (Excess Yield / {(DISCOUNT_RATE * 100).toFixed(0)}%) + Optionality×0.5</code>
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>Model Parameters:</strong></p>
                    <p>• Risk-free rate: {(RISK_FREE_RATE * 100).toFixed(0)}%</p>
                    <p>• Equity spread: {(EQUITY_RISK_SPREAD * 100).toFixed(0)}%</p>
                    <p>• Discount rate: {(DISCOUNT_RATE * 100).toFixed(0)}%</p>
                    <p>• {asset} optionality premium: {(optionalityPremium * 100).toFixed(0)}% (applied at 50%)</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Non-Yielding Assets Framework */
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">💎</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {asset} is a Non-Yielding Asset
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No native staking yield — value from optionality
                  </p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Benchmark:</p>
                    <p>Just holding {asset} directly (1.0x NAV)</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Key Question:</p>
                    <p>Does the optionality/leverage justify paying above NAV?</p>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Value Sources:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Optionality</strong> — institutional access, volatility harvesting</li>
                      <li><strong>Leverage</strong> — debt/converts amplify {asset} exposure</li>
                      <li><strong>Vol Harvesting</strong> — issuing shares at premium to buy more {asset}</li>
                    </ul>
                  </div>

                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">Detractors:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Burn Drag</strong> — cash burn dilutes {asset}/share</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Fair Value Formula:</p>
                  <div className="font-mono text-sm bg-white dark:bg-gray-900 rounded p-3">
                    <code>Fair Value = 1.0 + (Optionality × Leverage) - Burn Drag</code>
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    <p><strong>Model Parameters:</strong></p>
                    <p>• {asset} base optionality: {(optionalityPremium * 100).toFixed(0)}%</p>
                    <p>• Leverage multiplier: 1.0x - 2.0x (based on debt usage)</p>
                    <p>• Burn drag divisor: {(BURN_DRAG_DIVISOR * 100).toFixed(0)}% (10% burn = 1x penalty)</p>
                  </div>

                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p><strong>Example:</strong></p>
                    <p>Company with 1.5x leverage, 2% burn rate:</p>
                    <p className="font-mono">1.0 + ({(optionalityPremium * 100).toFixed(0)}% × 1.5) - (2% / 10%) = {(1.0 + optionalityPremium * 1.5 - 0.2).toFixed(2)}x</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
