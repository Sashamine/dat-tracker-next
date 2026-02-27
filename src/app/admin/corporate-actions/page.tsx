'use client';

import { useEffect, useMemo, useState } from 'react';

type Stats = {
  success: boolean;
  ticker: string | null;
  total: number;
  byTicker: Array<{ entity_id: string; cnt: number; last_created_at: string }>;
  byType: Array<{ action_type: string; cnt: number }>;
  multiDateSameRatio: Array<{ entity_id: string; action_type: string; ratio: number; dates: number }>;
};

type Action = {
  action_id: string;
  entity_id: string;
  action_type: string;
  ratio: number;
  effective_date: string;
  source_artifact_id: string | null;
  source_url: string | null;
  quote: string | null;
  confidence: number | null;
  created_at: string;
};

type ActionsResponse = { success: boolean; ticker: string; actions: Action[] };

function fmtDate(s: string) {
  if (!s) return '';
  return s.replace('T', ' ').replace('Z', '');
}

export default function CorporateActionsAdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [selected, setSelected] = useState<string | null>(null);
  const [actions, setActions] = useState<Action[] | null>(null);
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [loadingActions, setLoadingActions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setStatsError(null);
        const res = await fetch(`/api/d1/corporate-actions-stats?t=${Date.now()}`);
        const json = (await res.json()) as Stats;
        if (!res.ok || !json.success) throw new Error((json as any)?.error || `HTTP ${res.status}`);
        if (!cancelled) setStats(json);
      } catch (e) {
        if (!cancelled) setStatsError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reviewSet = useMemo(() => {
    const s = new Set<string>();
    for (const r of stats?.multiDateSameRatio || []) s.add(r.entity_id);
    return s;
  }, [stats]);

  const filteredTickers = useMemo(() => {
    const q = search.trim().toUpperCase();
    const list = stats?.byTicker || [];
    if (!q) return list;
    return list.filter(t => t.entity_id.toUpperCase().includes(q));
  }, [stats, search]);

  async function loadTicker(ticker: string) {
    setSelected(ticker);
    setActions(null);
    setActionsError(null);
    setLoadingActions(true);
    try {
      const res = await fetch(`/api/d1/corporate-actions?ticker=${encodeURIComponent(ticker)}&t=${Date.now()}`);
      const json = (await res.json()) as ActionsResponse;
      if (!res.ok || !json.success) throw new Error((json as any)?.error || `HTTP ${res.status}`);
      setActions(json.actions || []);
    } catch (e) {
      setActionsError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingActions(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Corporate Actions (Admin)</h1>
      <div style={{ color: '#666', marginBottom: 16 }}>
        Read-only view of extracted splits / reverse splits from D1.
      </div>

      {statsError && (
        <div style={{ background: '#fee', border: '1px solid #fbb', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          Failed to load stats: {statsError}
        </div>
      )}

      {stats && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
          <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8, minWidth: 180 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Total actions</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.total}</div>
          </div>
          <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8, minWidth: 180 }}>
            <div style={{ fontSize: 12, color: '#666' }}>Tickers w/ actions</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{stats.byTicker.length}</div>
          </div>
          <div style={{ padding: 12, border: '1px solid #ddd', borderRadius: 8, minWidth: 260 }}>
            <div style={{ fontSize: 12, color: '#666' }}>By type</div>
            <div style={{ fontSize: 14 }}>
              {(stats.byType || []).map(t => (
                <div key={t.action_type}>
                  <code>{t.action_type}</code>: {t.cnt}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 16 }}>
        <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #eee', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ fontWeight: 700 }}>Tickers</div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              style={{ flex: 1, padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6 }}
            />
          </div>
          <div style={{ maxHeight: 520, overflow: 'auto' }}>
            {(filteredTickers || []).map(t => (
              <button
                key={t.entity_id}
                onClick={() => loadTicker(t.entity_id)}
                style={{
                  width: '100%', textAlign: 'left', padding: 12,
                  border: 'none', borderBottom: '1px solid #f2f2f2',
                  background: selected === t.entity_id ? '#f5f7ff' : 'white',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.entity_id}</div>
                    <div style={{ fontSize: 12, color: '#666' }}>last: {fmtDate(t.last_created_at)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{t.cnt}</div>
                    {reviewSet.has(t.entity_id) && (
                      <div style={{ fontSize: 11, color: '#8a6d3b' }}>review</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {!filteredTickers?.length && (
              <div style={{ padding: 12, color: '#666' }}>No tickers.</div>
            )}
          </div>
        </div>

        <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: 12, borderBottom: '1px solid #eee' }}>
            <div style={{ fontWeight: 700 }}>Actions {selected ? `— ${selected}` : ''}</div>
            <div style={{ fontSize: 12, color: '#666' }}>
              Click a ticker on the left to load its actions.
            </div>
          </div>

          <div style={{ padding: 12, maxHeight: 520, overflow: 'auto' }}>
            {loadingActions && <div>Loading…</div>}
            {actionsError && (
              <div style={{ background: '#fee', border: '1px solid #fbb', padding: 12, borderRadius: 8 }}>
                Failed to load actions: {actionsError}
              </div>
            )}
            {actions && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {actions.length === 0 && <div style={{ color: '#666' }}>(No actions)</div>}
                {actions.map(a => (
                  <div key={a.action_id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>
                          <code>{a.action_type}</code> ratio={a.ratio}
                        </div>
                        <div style={{ fontSize: 12, color: '#666' }}>
                          effective: <code>{a.effective_date}</code>
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', textAlign: 'right' }}>
                        created: {fmtDate(a.created_at)}
                      </div>
                    </div>

                    {a.quote && (
                      <div style={{ marginTop: 8, fontSize: 13 }}>
                        <div style={{ fontSize: 12, color: '#666' }}>quote</div>
                        <div style={{ whiteSpace: 'pre-wrap' }}>{a.quote.slice(0, 600)}{a.quote.length > 600 ? '…' : ''}</div>
                      </div>
                    )}

                    <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 12 }}>
                      <div>
                        artifact: <code>{a.source_artifact_id || '(none)'}</code>
                      </div>
                      {a.source_url && (
                        <a href={a.source_url} target="_blank" rel="noreferrer">source_url</a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
