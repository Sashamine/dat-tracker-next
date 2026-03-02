import React from 'react';
import { formatLargeNumber } from '@/lib/calculations';
import type { DatapointRow } from '@/lib/hooks/use-company-metric-history';
import { useD1Artifact } from '@/lib/hooks/use-d1-artifact';

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

function shortId(id: string, n: number = 6) {
  return id.length > n * 2 ? `${id.slice(0, n)}…${id.slice(-n)}` : id;
}

function formatValue(row: DatapointRow): string {
  if (row.unit === 'USD') return `$${formatLargeNumber(row.value)}`;
  if (row.unit === 'shares') return `${formatLargeNumber(row.value)} shares`;
  return `${formatLargeNumber(row.value)} ${row.unit}`;
}

function HistoryRow(props: { metric: string; row: DatapointRow }) {
  const { metric, row } = props;
  const { data } = useD1Artifact(row.artifact_id);
  const artifact = data?.artifact;

  const href = artifact?.source_url || null;
  const label = href
    ? 'SEC'
    : artifact?.accession
      ? artifact.accession
      : row.artifact_id
        ? shortId(row.artifact_id)
        : '—';

  return (
    <tr className="border-b last:border-b-0 border-gray-100 dark:border-gray-800">
      <td className="py-2 pr-4 font-medium text-gray-900 dark:text-gray-100">{labelForMetric(metric)}</td>
      <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{row.as_of || '—'}</td>
      <td className="py-2 pr-4 text-gray-900 dark:text-gray-100">{formatValue(row)}</td>
      <td className="py-2 pr-4 text-gray-500 dark:text-gray-400">{row.method || '—'}</td>
      <td className="py-2 text-gray-500 dark:text-gray-400">
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {label}
          </a>
        ) : (
          <span title={row.artifact_id || ''}>{label}</span>
        )}
      </td>
    </tr>
  );
}

export function CompanyMetricHistorySection(props: {
  title?: string;
  series: Record<string, DatapointRow[]>;
  metrics: string[];
  defaultExpanded?: boolean;
  perMetricLimit?: number;
}) {
  const {
    title = 'Balance sheet history',
    series,
    metrics,
    defaultExpanded = false,
    perMetricLimit = 12,
  } = props;

  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const latestRows = metrics
    .map(metric => {
      const first = (series?.[metric] || [])[0];
      return { metric, row: first };
    })
    .filter(x => x.row);

  if (!latestRows.length) return null;

  const renderTable = (rows: Array<{ metric: string; row: DatapointRow }>, caption?: string) => (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800">
            <th className="py-2 pr-4">Metric</th>
            <th className="py-2 pr-4">As of</th>
            <th className="py-2 pr-4">Value</th>
            <th className="py-2 pr-4">Method</th>
            <th className="py-2">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ metric, row }, idx) => (
            <HistoryRow key={`${metric}-${row.datapoint_id}-${idx}`} metric={metric} row={row} />
          ))}
        </tbody>
      </table>
      {caption && <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">{caption}</div>}
    </div>
  );

  const expandedRows: Array<{ metric: string; row: DatapointRow }> = [];
  if (expanded) {
    for (const metric of metrics) {
      const rows = (series?.[metric] || []).slice(0, perMetricLimit);
      for (const row of rows) expandedRows.push({ metric, row });
    }
  }

  return (
    <section className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {expanded ? `Showing up to ${perMetricLimit} rows per metric` : 'Latest per metric'}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="text-xs px-3 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          {expanded ? 'Collapse' : 'Show full series'}
        </button>
      </div>

      {!expanded && renderTable(latestRows as any)}
      {expanded && renderTable(expandedRows, 'Note: rows are ordered by as_of (desc) within each metric; methods may differ across runs.')}
    </section>
  );
}
