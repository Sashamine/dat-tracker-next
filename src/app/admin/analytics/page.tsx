'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type AnalyticsData = {
  success: boolean;
  period: { days: number; cutoff: string };
  summary: {
    totalEvents: number;
    uniqueSessions: number;
    citationClickRate: string;
    citationOpens: number;
    citationClicks: number;
    medianSessionDurationSec: number;
    activeSessions: number;
  };
  eventsByType: { event: string; cnt: number }[];
  eventsByDay: { day: string; cnt: number; sessions: number }[];
  topTickers: { ticker: string; views: number; citations: number }[];
  topRoutes: { route: string; cnt: number }[];
  recentEvents: { ts: string; event: string; ticker: string | null; route: string | null; session_id: string }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/analytics?days=${days}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fmtDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return s > 0 ? `${min}m ${s}s` : `${min}m`;
  };

  const fmtTime = (ts: string) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString();
  };

  const eventColor: Record<string, string> = {
    page_view: '#3b82f6',
    company_view: '#8b5cf6',
    history_view: '#06b6d4',
    citation_modal_open: '#f59e0b',
    citation_source_click: '#10b981',
    api_call: '#6b7280',
  };

  const s = data?.summary;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Usage Analytics</h1>
      <div style={{ color: '#666', marginBottom: 10, fontSize: 14 }}>
        Adoption metrics from client-side event tracking.
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, fontSize: 13 }}>
        <Link href="/admin/data-health">Data Health</Link>
        <span style={{ color: '#bbb' }}>|</span>
        <Link href="/admin/proposals">Proposals</Link>
        <span style={{ color: '#bbb' }}>|</span>
        <Link href="/admin/corporate-actions">Corporate Actions</Link>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {([7, 14, 30] as const).map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: days === d ? '2px solid #3b82f6' : '1px solid #d1d5db',
              background: days === d ? '#eff6ff' : '#fff',
              fontWeight: days === d ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {d}d
          </button>
        ))}
        <button
          onClick={fetchData}
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

      {loading && <div style={{ padding: 20, color: '#666' }}>Loading analytics...</div>}
      {error && <div style={{ padding: 20, color: '#b42318' }}>Error: {error}</div>}

      {!loading && s && (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Total Events', value: s.totalEvents.toLocaleString() },
              { label: 'Unique Sessions', value: s.uniqueSessions.toLocaleString() },
              { label: 'Citation Click Rate', value: s.citationClickRate },
              { label: 'Median Session', value: fmtDuration(s.medianSessionDurationSec) },
              { label: 'Citation Opens', value: s.citationOpens.toLocaleString() },
              { label: 'Citation Clicks', value: s.citationClicks.toLocaleString() },
            ].map(card => (
              <div key={card.label} style={{
                padding: '16px 14px',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                background: '#fafafa',
              }}>
                <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>{card.value}</div>
              </div>
            ))}
          </div>

          {/* Daily activity */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Daily Activity</h2>
            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 120 }}>
              {[...(data?.eventsByDay || [])].reverse().map(d => {
                const maxCnt = Math.max(...(data?.eventsByDay || []).map(x => x.cnt), 1);
                const h = Math.max(4, (d.cnt / maxCnt) * 100);
                return (
                  <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <div style={{ fontSize: 10, color: '#6b7280' }}>{d.cnt}</div>
                    <div style={{
                      width: '100%',
                      maxWidth: 40,
                      height: h,
                      background: '#3b82f6',
                      borderRadius: '4px 4px 0 0',
                    }} />
                    <div style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>
                      {d.day.slice(5)}
                    </div>
                    <div style={{ fontSize: 9, color: '#9ca3af' }}>
                      {d.sessions}u
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Two-column layout */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            {/* Events by type */}
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Event Breakdown</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data?.eventsByType.map(e => {
                  const maxCnt = Math.max(...(data?.eventsByType || []).map(x => x.cnt), 1);
                  const pct = (e.cnt / maxCnt) * 100;
                  return (
                    <div key={e.event} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 140, fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>
                        {e.event}
                      </div>
                      <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 18 }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: eventColor[e.event] || '#6b7280',
                          borderRadius: 4,
                          minWidth: 2,
                        }} />
                      </div>
                      <div style={{ width: 50, textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                        {e.cnt}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top tickers */}
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Top Companies</h2>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>Ticker</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>Views</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>Citations</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.topTickers.slice(0, 10).map(t => (
                    <tr key={t.ticker} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '4px 8px', fontWeight: 600 }}>
                        <Link href={`/company/${t.ticker.toLowerCase()}`} style={{ color: '#2563eb' }}>
                          {t.ticker}
                        </Link>
                      </td>
                      <td style={{ textAlign: 'right', padding: '4px 8px' }}>{t.views}</td>
                      <td style={{ textAlign: 'right', padding: '4px 8px', color: t.citations > 0 ? '#10b981' : '#9ca3af' }}>
                        {t.citations}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top routes */}
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Top Routes</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {data?.topRoutes.slice(0, 10).map(r => {
                const maxCnt = Math.max(...(data?.topRoutes || []).map(x => x.cnt), 1);
                const pct = (r.cnt / maxCnt) * 100;
                return (
                  <div key={r.route} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 200, fontSize: 12, color: '#374151', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.route}
                    </div>
                    <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 4, height: 16 }}>
                      <div style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: '#8b5cf6',
                        borderRadius: 4,
                        minWidth: 2,
                      }} />
                    </div>
                    <div style={{ width: 40, textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#374151' }}>
                      {r.cnt}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live feed */}
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Recent Events</h2>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Time</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Event</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Ticker</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Route</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Session</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.recentEvents.map((e, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '4px 8px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fmtTime(e.ts)}</td>
                      <td style={{ padding: '4px 8px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 600,
                          background: (eventColor[e.event] || '#6b7280') + '20',
                          color: eventColor[e.event] || '#6b7280',
                        }}>
                          {e.event}
                        </span>
                      </td>
                      <td style={{ padding: '4px 8px', fontWeight: e.ticker ? 600 : 400, color: e.ticker ? '#111' : '#d1d5db' }}>
                        {e.ticker || '-'}
                      </td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: '#6b7280', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {e.route || '-'}
                      </td>
                      <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: '#9ca3af', fontSize: 10 }}>
                        {e.session_id.slice(0, 8)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
