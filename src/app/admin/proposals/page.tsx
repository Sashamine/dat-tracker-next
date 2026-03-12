'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type Proposal = {
  proposalKey: string;
  ticker: string;
  metric: string;
  value: number;
  unit: string;
  asOf: string | null;
  confidence: number;
  method: string | null;
  status: string;
  createdAt: string;
  citationQuote: string | null;
  flags: Record<string, unknown> | null;
  currentHoldings: number | null;
  delta: number | null;
};

type ActionState = {
  proposalKey: string;
  action: 'approve' | 'reject';
  loading: boolean;
  result?: { success: boolean; error?: string };
};

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actions, setActions] = useState<Record<string, ActionState>>({});
  const [statusFilter, setStatusFilter] = useState<'candidate' | 'approved' | 'rejected'>('candidate');

  const fetchProposals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals?status=${statusFilter}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch');
      setProposals(data.proposals || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleAction = async (proposalKey: string, action: 'approve' | 'reject') => {
    setActions(prev => ({
      ...prev,
      [proposalKey]: { proposalKey, action, loading: true },
    }));

    try {
      const res = await fetch(`/api/proposals/${proposalKey}?action=${action}`, {
        method: 'POST',
      });
      const data = await res.json();

      setActions(prev => ({
        ...prev,
        [proposalKey]: { proposalKey, action, loading: false, result: data },
      }));

      // Remove from list after successful action
      if (data.success) {
        setTimeout(() => {
          setProposals(prev => prev.filter(p => p.proposalKey !== proposalKey));
        }, 1500);
      }
    } catch (err) {
      setActions(prev => ({
        ...prev,
        [proposalKey]: {
          proposalKey,
          action,
          loading: false,
          result: { success: false, error: err instanceof Error ? err.message : 'Network error' },
        },
      }));
    }
  };

  const confColor = (conf: number) => {
    if (conf >= 0.8) return '#0a7a2f';
    if (conf >= 0.6) return '#b45309';
    return '#b42318';
  };

  const fmtNum = (n: number | null) => n != null ? n.toLocaleString() : '—';

  const fmtDelta = (delta: number | null) => {
    if (delta == null) return '—';
    const sign = delta > 0 ? '+' : '';
    return `${sign}${delta.toLocaleString()}`;
  };

  const fmtDate = (s: string | null) => {
    if (!s) return '—';
    return s.slice(0, 10);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Extraction Proposals</h1>
      <div style={{ color: '#666', marginBottom: 10, fontSize: 14 }}>
        Review auto-extracted holdings from SEC 8-K filings. Approve to update D1, reject to discard.
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, fontSize: 13 }}>
        <Link href="/admin/data-health">Data Health</Link>
        <span style={{ color: '#bbb' }}>|</span>
        <Link href="/admin/corporate-actions">Corporate Actions</Link>
        <span style={{ color: '#bbb' }}>|</span>
        <Link href="/api/proposals" target="_blank">Raw JSON</Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['candidate', 'approved', 'rejected'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: statusFilter === s ? '2px solid #3b82f6' : '1px solid #d1d5db',
              background: statusFilter === s ? '#eff6ff' : '#fff',
              fontWeight: statusFilter === s ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {s === 'candidate' ? 'Pending' : s}
          </button>
        ))}
        <button
          onClick={fetchProposals}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid #d1d5db',
            background: '#fff',
            fontSize: 13,
            cursor: 'pointer',
            marginLeft: 'auto',
          }}
        >
          Refresh
        </button>
      </div>

      {loading && <div style={{ padding: 20, color: '#666' }}>Loading proposals...</div>}
      {error && <div style={{ padding: 20, color: '#b42318' }}>Error: {error}</div>}

      {!loading && !error && proposals.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: '#666', border: '1px solid #e5e7eb', borderRadius: 8 }}>
          No {statusFilter === 'candidate' ? 'pending' : statusFilter} proposals.
        </div>
      )}

      {!loading && proposals.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '10px 8px' }}>Ticker</th>
                <th style={{ padding: '10px 8px' }}>Extracted</th>
                <th style={{ padding: '10px 8px' }}>Current</th>
                <th style={{ padding: '10px 8px' }}>Delta</th>
                <th style={{ padding: '10px 8px' }}>Conf</th>
                <th style={{ padding: '10px 8px' }}>Method</th>
                <th style={{ padding: '10px 8px' }}>As-of</th>
                <th style={{ padding: '10px 8px' }}>Created</th>
                {statusFilter === 'candidate' && <th style={{ padding: '10px 8px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {proposals.map(p => {
                const actionState = actions[p.proposalKey];
                const isDone = actionState?.result?.success;

                return (
                  <tr
                    key={p.proposalKey}
                    style={{
                      borderBottom: '1px solid #f3f4f6',
                      opacity: isDone ? 0.5 : 1,
                      transition: 'opacity 0.3s',
                    }}
                  >
                    <td style={{ padding: '10px 8px', fontWeight: 600 }}>
                      <Link href={`/company/${p.ticker.toLowerCase()}`} style={{ color: '#2563eb' }}>
                        {p.ticker}
                      </Link>
                      <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 400 }}>{p.unit}</div>
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace' }}>
                      {fmtNum(p.value)}
                    </td>
                    <td style={{ padding: '10px 8px', fontFamily: 'monospace', color: '#6b7280' }}>
                      {fmtNum(p.currentHoldings)}
                    </td>
                    <td style={{
                      padding: '10px 8px',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                      color: p.delta != null && p.delta > 0 ? '#0a7a2f' : p.delta != null && p.delta < 0 ? '#b42318' : '#6b7280',
                    }}>
                      {fmtDelta(p.delta)}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <span style={{
                        color: confColor(p.confidence),
                        fontWeight: 600,
                      }}>
                        {Math.round(p.confidence * 100)}%
                      </span>
                    </td>
                    <td style={{ padding: '10px 8px', color: '#6b7280' }}>
                      {p.flags?.extractionMethod === 'llm' ? 'LLM' : 'Regex'}
                      {p.flags?.patternName ? (
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{String(p.flags.patternName)}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: '10px 8px', color: '#6b7280' }}>
                      {fmtDate(p.asOf)}
                    </td>
                    <td style={{ padding: '10px 8px', color: '#9ca3af', fontSize: 12 }}>
                      {fmtDate(p.createdAt)}
                    </td>
                    {statusFilter === 'candidate' && (
                      <td style={{ padding: '10px 8px' }}>
                        {isDone ? (
                          <span style={{
                            color: actionState.action === 'approve' ? '#0a7a2f' : '#b42318',
                            fontWeight: 600,
                            fontSize: 12,
                          }}>
                            {actionState.action === 'approve' ? 'Approved' : 'Rejected'}
                          </span>
                        ) : actionState?.loading ? (
                          <span style={{ color: '#6b7280', fontSize: 12 }}>...</span>
                        ) : (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => handleAction(p.proposalKey, 'approve')}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 4,
                                border: '1px solid #0a7a2f',
                                background: '#f0fdf4',
                                color: '#0a7a2f',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(p.proposalKey, 'reject')}
                              style={{
                                padding: '4px 10px',
                                borderRadius: 4,
                                border: '1px solid #b42318',
                                background: '#fef2f2',
                                color: '#b42318',
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {actionState?.result && !actionState.result.success && (
                          <div style={{ color: '#b42318', fontSize: 11, marginTop: 4 }}>
                            {actionState.result.error}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && proposals.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 12, color: '#9ca3af' }}>
          Showing {proposals.length} proposal{proposals.length !== 1 ? 's' : ''}.
          Proposals are created when the filing-check cron extracts holdings with {'>'}80% confidence.
        </div>
      )}
    </div>
  );
}
