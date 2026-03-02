import React from 'react';
import { formatLargeNumber } from '@/lib/calculations';
import type { DatapointRow } from '@/lib/hooks/use-company-metric-history';

function labelForMetric(metric: string): string {
  switch (metric) {
    case 'cash_usd': return 'Cash';
    case 'restricted_cash_usd': return 'Restricted cash';
    case 'other_investments_usd': return 'Other investments';
    case 'debt_usd': return 'Debt';
    case 'preferred_equity_usd': return 'Preferred equity';
    case 'basic_shares': return 'Basic shares';
    case 'bitcoin_holdings_usd': return 'BTC holdings (USD)';
    default: return metric;
  }
}

function formatValue(row: DatapointRow): string {
  if (row.unit === 'USD') return `$${formatLargeNumber(row.value)}`;
  if (row.unit === 'shares') return `${formatLargeNumber(row.value)} shares`;
  return `${formatLargeNumber(row.value)} ${row.unit}`;
}

export function CompanyMetricHistorySection(props: {
  title?: string;
  series: Record<string, DatapointRow[]>;
  metrics: string[];
}) {
  const { title = 'Balance sheet history', series, metrics } = props;

  const rows = metrics
    .map(metric => {
      const first = (series?.[metric] || [])[0];
      return { metric, row: first };
    })
    .filter(x => x.row);

  if (!rows.length) return null;

  return (
    <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">(latest per metric)</span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
              <th className="py-2 pr-4">Metric</th>
              <th className="py-2 pr-4">As of</th>
              <th className="py-2 pr-4">Value</th>
              <th className="py-2">Method</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ metric, row }) => (
              <tr key={metric} className="border-b last:border-b-0 border-gray-100 dark:border-gray-800">
                <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">{labelForMetric(metric)}</td>
                <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{row!.as_of || '—'}</td>
                <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{formatValue(row!)}</td>
                <td className="py-2 text-gray-500 dark:text-gray-400">{row!.method || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
