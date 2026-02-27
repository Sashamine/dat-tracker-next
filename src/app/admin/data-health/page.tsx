import Link from 'next/link';

export const runtime = 'nodejs';

type VerificationSummary = {
  schemaVersion: string | null;
  generatedAt: string | null;
  runId: string | null;
  total: number | null;
  okCount: number | null;
  failCount: number | null;
  policyVersion: string | null;
};

type GapsTopIssue = { issue: string; count: number };

type GapsResponse = {
  generatedAt: string | null;
  runId: string | null;
  topIssues: GapsTopIssue[];
};

type UnverifiedRow = {
  ticker?: string;
  hardIssues?: unknown[];
  warnIssues?: unknown[];
};

type UnverifiedResponse = {
  runId: string;
  generatedAt: string | null;
  total: number | null;
  okCount: number | null;
  failCount: number | null;
  unverified: UnverifiedRow[];
  count: number;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return (await res.json()) as T;
}

function fmtTs(s: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString();
}

export default async function AdminDataHealthPage() {
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const [summary, gaps, unverified] = await Promise.all([
    getJson<VerificationSummary>(`${base}/api/state/verification-summary`),
    getJson<GapsResponse>(`${base}/api/state/gaps`),
    getJson<UnverifiedResponse>(`${base}/api/state/unverified?limit=50`),
  ]);

  const ok = (summary.failCount || 0) === 0;

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Data Health (Admin)</h1>
      <div style={{ color: '#666', marginBottom: 16 }}>
        Read-only dashboard over <code>/api/state/*</code> to quickly see verification status, gaps, and unverified tickers.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <div style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontWeight: 700 }}>Latest Verification Summary</div>
            <div style={{ fontSize: 12, color: ok ? '#0a7a2f' : '#b42318' }}>{ok ? 'OK' : 'HAS FAILURES'}</div>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
            <div><b>generatedAt:</b> {fmtTs(summary.generatedAt)}</div>
            <div><b>runId:</b> {summary.runId || '—'}</div>
            <div><b>ok / total:</b> {(summary.okCount ?? '—')} / {(summary.total ?? '—')}</div>
            <div><b>failCount:</b> {summary.failCount ?? '—'}</div>
            <div><b>policyVersion:</b> {summary.policyVersion || '—'}</div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <Link href="/api/state/verification-summary" target="_blank">Open JSON</Link>
          </div>
        </div>

        <div style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>Top Verification Gaps</div>
          <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
            <div><b>generatedAt:</b> {fmtTs(gaps.generatedAt)}</div>
            <div><b>runId:</b> {gaps.runId || '—'}</div>
          </div>
          <div style={{ marginTop: 10 }}>
            <ol style={{ margin: 0, paddingLeft: 18 }}>
              {(gaps.topIssues || []).slice(0, 12).map((g) => (
                <li key={g.issue} style={{ marginBottom: 4, fontSize: 13 }}>
                  <code>{g.issue}</code> — {g.count}
                </li>
              ))}
            </ol>
          </div>
          <div style={{ marginTop: 10, fontSize: 12 }}>
            <Link href="/api/state/gaps" target="_blank">Open JSON</Link>
          </div>
        </div>
      </div>

      <div style={{ border: '1px solid #e6e6e6', borderRadius: 8, padding: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ fontWeight: 700 }}>Unverified tickers (latest run)</div>
          <div style={{ fontSize: 12, color: '#666' }}>showing up to 50</div>
        </div>

        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5 }}>
          <div><b>runId:</b> {unverified.runId}</div>
          <div><b>generatedAt:</b> {fmtTs(unverified.generatedAt)}</div>
          <div><b>count:</b> {unverified.count}</div>
        </div>

        <div style={{ marginTop: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid #eee' }}>
                <th style={{ padding: '8px 6px' }}>Ticker</th>
                <th style={{ padding: '8px 6px' }}>Hard issues</th>
                <th style={{ padding: '8px 6px' }}>Warn issues</th>
              </tr>
            </thead>
            <tbody>
              {(unverified.unverified || []).map((r, idx) => (
                <tr key={`${r.ticker || 'unknown'}-${idx}`} style={{ borderBottom: '1px solid #f2f2f2' }}>
                  <td style={{ padding: '8px 6px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                    {r.ticker || '—'}
                  </td>
                  <td style={{ padding: '8px 6px' }}>{(r.hardIssues || []).length}</td>
                  <td style={{ padding: '8px 6px' }}>{(r.warnIssues || []).length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 10, fontSize: 12 }}>
          <Link href="/api/state/unverified?limit=200" target="_blank">Open JSON</Link>
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: '#666' }}>
        Tip: for a specific gap issue, hit <code>/api/state/gaps?issue=&lt;issue&gt;</code>.
      </div>
    </div>
  );
}
