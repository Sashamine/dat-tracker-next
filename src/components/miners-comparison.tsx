"use client";

import { useMemo } from "react";
import Link from "next/link";
import { HOLDINGS_HISTORY } from "@/lib/data/holdings-history";
import { Company } from "@/lib/types";

interface MinersComparisonProps {
  companies: Company[];
  prices?: any;
  compact?: boolean;
}

interface MinerStats {
  ticker: string;
  name: string;
  currentHPS: number;
  hps30dAgo: number;
  hps90dAgo: number;
  hps1yAgo: number;
  growth30d: number | null;
  growth90d: number | null;
  growth1y: number | null;
  currentHoldings: number;
  currentShares: number;
  latestDate: string;
}

function getHPSAtDate(ticker: string, targetDate: Date): number | null {
  const history = HOLDINGS_HISTORY[ticker]?.history;
  if (!history || history.length === 0) return null;

  // Find the closest snapshot on or before the target date
  const sorted = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (const snapshot of sorted) {
    if (new Date(snapshot.date) <= targetDate) {
      return snapshot.holdingsPerShare;
    }
  }
  return null;
}

function calculateMinerStats(company: Company): MinerStats | null {
  const history = HOLDINGS_HISTORY[company.ticker]?.history;
  if (!history || history.length === 0) return null;

  // Get latest snapshot
  const sorted = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const latest = sorted[0];
  
  const now = new Date();
  const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const d90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const d1y = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

  const currentHPS = latest.holdingsPerShare;
  const hps30dAgo = getHPSAtDate(company.ticker, d30) || currentHPS;
  const hps90dAgo = getHPSAtDate(company.ticker, d90) || currentHPS;
  const hps1yAgo = getHPSAtDate(company.ticker, d1y);

  return {
    ticker: company.ticker,
    name: company.name,
    currentHPS,
    hps30dAgo,
    hps90dAgo,
    hps1yAgo: hps1yAgo || 0,
    growth30d: hps30dAgo ? ((currentHPS - hps30dAgo) / hps30dAgo) * 100 : null,
    growth90d: hps90dAgo ? ((currentHPS - hps90dAgo) / hps90dAgo) * 100 : null,
    growth1y: hps1yAgo ? ((currentHPS - hps1yAgo) / hps1yAgo) * 100 : null,
    currentHoldings: latest.holdings,
    currentShares: latest.sharesOutstandingDiluted,
    latestDate: latest.date,
  };
}

export function MinersComparison({ companies, prices, compact }: MinersComparisonProps) {
  const minerStats = useMemo(() => {
    const miners = companies.filter(c => c.isMiner);
    return miners
      .map(calculateMinerStats)
      .filter((s): s is MinerStats => s !== null)
      .sort((a, b) => (b.growth1y || 0) - (a.growth1y || 0));
  }, [companies]);

  if (minerStats.length === 0) return null;

  const formatGrowth = (growth: number | null) => {
    if (growth === null) return "—";
    const sign = growth >= 0 ? "+" : "";
    return `${sign}${growth.toFixed(1)}%`;
  };

  const getGrowthColor = (growth: number | null) => {
    if (growth === null) return "text-gray-400";
    if (growth > 0) return "text-green-600 dark:text-green-400";
    if (growth < 0) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  if (compact) {
    // Compact view for sidebar
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
          <span>Miner</span>
          <span>HPS Growth (1Y)</span>
        </div>
        {minerStats.slice(0, 5).map((miner) => (
          <Link
            key={miner.ticker}
            href={`/company/${miner.ticker.toLowerCase()}`}
            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <div>
              <span className="font-medium text-gray-900 dark:text-gray-100">{miner.ticker}</span>
              <span className="text-xs text-gray-500 ml-1">⛏️</span>
            </div>
            <span className={`text-sm font-semibold ${getGrowthColor(miner.growth1y)}`}>
              {formatGrowth(miner.growth1y)}
            </span>
          </Link>
        ))}
      </div>
    );
  }

  // Full table view
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Miner</th>
            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Holdings</th>
            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">HPS</th>
            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">30D</th>
            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">90D</th>
            <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">1Y</th>
          </tr>
        </thead>
        <tbody>
          {minerStats.map((miner) => (
            <tr 
              key={miner.ticker}
              className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="py-2 px-3">
                <Link href={`/company/${miner.ticker.toLowerCase()}`} className="hover:underline">
                  <span className="font-medium text-gray-900 dark:text-gray-100">{miner.ticker}</span>
                  <span className="text-xs text-gray-500 ml-1">⛏️</span>
                </Link>
              </td>
              <td className="text-right py-2 px-3 text-gray-900 dark:text-gray-100">
                {miner.currentHoldings.toLocaleString()}
              </td>
              <td className="text-right py-2 px-3 font-mono text-gray-600 dark:text-gray-400">
                {(miner.currentHPS * 1000000).toFixed(1)}
              </td>
              <td className={`text-right py-2 px-3 font-semibold ${getGrowthColor(miner.growth30d)}`}>
                {formatGrowth(miner.growth30d)}
              </td>
              <td className={`text-right py-2 px-3 font-semibold ${getGrowthColor(miner.growth90d)}`}>
                {formatGrowth(miner.growth90d)}
              </td>
              <td className={`text-right py-2 px-3 font-semibold ${getGrowthColor(miner.growth1y)}`}>
                {formatGrowth(miner.growth1y)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2 px-3">
        HPS = Holdings per share (×10⁶). Growth based on SEC filings.
      </p>
    </div>
  );
}
