'use client';

import { useState } from 'react';

// Companies available for comparison
const COMPANIES = [
  { ticker: 'MSTR', name: 'Strategy (MicroStrategy)' },
  { ticker: 'SBET', name: 'SharpLink Gaming' },
  { ticker: 'KULR', name: 'KULR Technology' },
  { ticker: 'LITS', name: 'Lite Strategy' },
  { ticker: 'UPXI', name: 'Upexi' },
  { ticker: 'ALTBG', name: 'The Blockchain Group' },
  { ticker: '3350.T', name: 'Metaplanet' },
  { ticker: 'DFDV', name: 'DeFi Development Corp' },
  { ticker: 'XXI', name: 'Twenty One Capital' },
];

interface ComparisonResult {
  ticker: string;
  company: {
    name: string;
    asset: string;
    tier: number;
  };
  ourValues: {
    holdings: number;
    holdingsSource?: string;
    holdingsDate?: string;
    sharesOutstanding?: number;
    sharesSource?: string;
    sharesDate?: string;
    totalDebt?: number;
    debtSource?: string;
    debtDate?: string;
    cashReserves?: number;
    cashSource?: string;
    cashDate?: string;
    preferredEquity?: number;
    calculatedMnav?: number;
  };
  comparisons: Record<string, {
    ourValue: number | undefined;
    ourSource?: string;
    ourDate?: string;
    fetched: Array<{
      source: string;
      value: number;
      url: string;
      date: string;
      deviationPct?: string;
    }>;
  }>;
  errors?: Record<string, string>;
  sourcesQueried: string[];
}

function formatNumber(value: number | undefined): string {
  if (value === undefined) return '-';
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1000) return value.toLocaleString();
  if (value < 10) return value.toFixed(4);
  return value.toLocaleString();
}

function DeviationBadge({ pct }: { pct: string }) {
  const value = parseFloat(pct);
  const isZero = Math.abs(value) < 0.01;
  const isSmall = Math.abs(value) < 5;

  const bgColor = isZero
    ? 'bg-green-100 text-green-800'
    : isSmall
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-red-100 text-red-800';

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${bgColor}`}>
      {pct}
    </span>
  );
}

export default function CompareDebugPage() {
  const [selectedTicker, setSelectedTicker] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = async () => {
    if (!selectedTicker) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch(`/api/debug/compare/${selectedTicker}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch comparison');
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Company Data Comparison
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Company
              </label>
              <select
                value={selectedTicker}
                onChange={(e) => setSelectedTicker(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a company --</option>
                {COMPANIES.map((company) => (
                  <option key={company.ticker} value={company.ticker}>
                    {company.ticker} - {company.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleQuery}
              disabled={!selectedTicker || loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : 'Query'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="space-y-6">
            {/* Company Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                {result.company.name} ({result.ticker})
              </h2>
              <p className="text-sm text-gray-600">
                Asset: {result.company.asset} | Tier: {result.company.tier}
              </p>
            </div>

            {/* Our Values */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Our Values</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Holdings:</span>{' '}
                  <span className="font-medium">{formatNumber(result.ourValues.holdings)}</span>
                  {result.ourValues.holdingsDate && (
                    <span className="text-gray-400 ml-2">({result.ourValues.holdingsDate})</span>
                  )}
                </div>
                {result.ourValues.sharesOutstanding && (
                  <div>
                    <span className="text-gray-500">Shares:</span>{' '}
                    <span className="font-medium">{(result.ourValues.sharesOutstanding / 1_000_000).toFixed(1)}M</span>
                  </div>
                )}
                {result.ourValues.totalDebt && (
                  <div>
                    <span className="text-gray-500">Debt:</span>{' '}
                    <span className="font-medium">{formatNumber(result.ourValues.totalDebt)}</span>
                  </div>
                )}
                {result.ourValues.cashReserves && (
                  <div>
                    <span className="text-gray-500">Cash:</span>{' '}
                    <span className="font-medium">{formatNumber(result.ourValues.cashReserves)}</span>
                  </div>
                )}
                {result.ourValues.calculatedMnav && (
                  <div>
                    <span className="text-gray-500">mNAV:</span>{' '}
                    <span className="font-medium">{result.ourValues.calculatedMnav.toFixed(2)}x</span>
                  </div>
                )}
              </div>
            </div>

            {/* Comparisons */}
            {Object.keys(result.comparisons).length > 0 ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-md font-semibold text-gray-900 mb-4">Comparisons</h3>
                <div className="space-y-6">
                  {Object.entries(result.comparisons).map(([field, comparison]) => (
                    <div key={field} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900 capitalize">
                          {field.replace('_', ' ')}
                        </span>
                        <span className="text-sm text-gray-500">
                          Our value: {formatNumber(comparison.ourValue)}
                        </span>
                        {comparison.ourDate && (
                          <span className="text-xs text-gray-400">
                            ({comparison.ourDate})
                          </span>
                        )}
                      </div>
                      <div className="ml-4 space-y-2">
                        {comparison.fetched.map((f, i) => (
                          <div key={i} className="flex items-center gap-3 text-sm">
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {f.source}
                            </a>
                            <span className="text-gray-700">{formatNumber(f.value)}</span>
                            <span className="text-gray-400">({f.date})</span>
                            {f.deviationPct && <DeviationBadge pct={f.deviationPct} />}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800">No discrepancies found with newer data sources.</p>
              </div>
            )}

            {/* Errors */}
            {result.errors && Object.keys(result.errors).length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-md font-semibold text-yellow-800 mb-2">Fetcher Errors</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  {Object.entries(result.errors).map(([source, error]) => (
                    <li key={source}>{source}: {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sources Queried */}
            <div className="text-sm text-gray-500">
              Sources queried: {result.sourcesQueried.join(', ')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
