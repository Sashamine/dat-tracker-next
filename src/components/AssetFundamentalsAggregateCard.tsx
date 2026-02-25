import { useEffect, useMemo, useState } from 'react';
import { formatLargeNumber } from '@/lib/calculations';

type LatestRow = {
  metric: string;
  value: number;
  unit: string;
  as_of: string | null;
  reported_at: string | null;
  method: string | null;
};

type ApiResponse = {
  success: boolean;
  tickers?: number;
  results?: Record<string, LatestRow[]>;
};

function sumMetric(results: Record<string, LatestRow[]>, metric: string): { total: number; covered: number } {
  let total = 0;
  let covered = 0;
  for (const rows of Object.values(results)) {
    const row = rows?.find(r => r.metric === metric);
    if (row && typeof row.value === 'number') {
      covered += 1;
      total += row.value;
    }
  }
  return { total, covered };
}

export function AssetFundamentalsAggregateCard({ tickers }: { tickers: string[] }) {
  const [data, setData] = useState<ApiResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch('/api/d1/latest-metrics/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tickers }),
        });
        const json = (await res.json()) as ApiResponse;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ success: false });
      }
    }

    if (tickers.length) run();
    return () => {
      cancelled = true;
    };
  }, [tickers]);

  const agg = useMemo(() => {
    const results = data?.success && data.results ? data.results : null;
    if (!results) return null;

    const n = tickers.length;
    const cash = sumMetric(results, 'cash_usd');
    const debt = sumMetric(results, 'debt_usd');
    const shares = sumMetric(results, 'basic_shares');
    const btc = sumMetric(results, 'bitcoin_holdings_usd');

    return {
      n,
      cash,
      debt,
      shares,
      btc,
    };
  }, [data, tickers.length]);

  // Hide silently if unavailable or not configured
  if (!agg) return null;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Fundamentals (last filed)</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Coverage:
            {agg.cash.covered > 0 ? ` cash ${agg.cash.covered}/${agg.n}` : ''}
            {agg.debt.covered > 0 ? `${agg.cash.covered > 0 ? ' ·' : ''} debt ${agg.debt.covered}/${agg.n}` : ''}
            {agg.shares.covered > 0 ? `${agg.cash.covered > 0 || agg.debt.covered > 0 ? ' ·' : ''} shares ${agg.shares.covered}/${agg.n}` : ''}
            {agg.btc.covered > 0 ? `${agg.cash.covered > 0 || agg.debt.covered > 0 || agg.shares.covered > 0 ? ' ·' : ''} crypto ${agg.btc.covered}/${agg.n}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4">
        {agg.cash.covered > 0 && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Cash</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatLargeNumber(agg.cash.total)}</p>
          </div>
        )}
        {agg.debt.covered > 0 && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Debt</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatLargeNumber(agg.debt.total)}</p>
          </div>
        )}
        {agg.shares.covered > 0 && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Basic Shares</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatLargeNumber(agg.shares.total)}</p>
          </div>
        )}
        {agg.btc.covered > 0 && (
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Crypto Holdings (USD FV)</p>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{formatLargeNumber(agg.btc.total)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
