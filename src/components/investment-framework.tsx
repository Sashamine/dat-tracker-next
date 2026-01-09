"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function InvestmentFramework() {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-lg hover:from-slate-700 hover:to-slate-600 transition-all"
      >
        <span className="font-semibold">Investment Framework</span>
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
          <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-200 dark:divide-gray-700">
            {/* Yielding Assets Column */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <span className="text-green-500">📈</span> Yielding Assets
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                ETH · SOL · BNB · TAO · LINK · TRX · SUI · AVAX · ADA · HBAR
              </p>

              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Benchmark:</p>
                  <p>Native staking APY</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Key Question:</p>
                  <p>Is this DAT beating DIY staking?</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Value Sources:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Excess Yield</strong> — yield above what you'd earn staking yourself</li>
                    <li><strong>Efficiency</strong> — low burn rate, more flows to shareholders</li>
                    <li><strong>Leverage</strong> — debt amplifies returns when asset outperforms financing cost</li>
                    <li><strong>Vol Harvesting</strong> — issuing shares at premium to buy more crypto</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 font-mono text-xs">
                  <p className="font-semibold mb-1">Fair Value Formula:</p>
                  <code>1 + Excess Yield + Leverage + Vol Harv</code>
                </div>
              </div>
            </div>

            {/* Non-Yielding Assets Column */}
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                <span className="text-blue-500">💎</span> Non-Yielding Assets
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                BTC · HYPE · XRP · ZEC · LTC · DOGE
              </p>

              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Benchmark:</p>
                  <p>1.0x NAV (just hold)</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Key Question:</p>
                  <p>Is vol harvesting worth the premium?</p>
                </div>

                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Value Sources:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li><strong>Vol Harvesting</strong> — issuing at premium to grow crypto/share <em>(primary)</em></li>
                    <li><strong>Optionality</strong> — deep liquidity = option to harvest later, even at 1x NAV</li>
                    <li><strong>Leverage</strong> — debt returns when asset appreciates</li>
                  </ul>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded p-3 font-mono text-xs">
                  <p className="font-semibold mb-1">Fair Value Formula:</p>
                  <code>1 + Vol Harvesting</code>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
