import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { logApiCallEvent } from '@/lib/events';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const t0 = Date.now();
  const clientHeader = req.headers.get('x-client');
  const client =
    clientHeader === 'web' || clientHeader === 'agent' || clientHeader === 'cron' || clientHeader === 'unknown'
      ? clientHeader
      : undefined;
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(500, Number(searchParams.get('limit') || '200')));

  const repoRoot = process.cwd();
  const runsRoot = path.join(repoRoot, 'verification-runs', 'company-state');

  try {
    // pick latest run dir by mtime
    const dirs = await fs.readdir(runsRoot);
    const stats = await Promise.all(
      dirs.map(async (d) => {
        const p = path.join(runsRoot, d);
        const st = await fs.stat(p);
        return { d, p, mtime: st.mtimeMs };
      })
    );
    stats.sort((a, b) => b.mtime - a.mtime);
    const latest = stats[0];
    if (!latest) {
      logApiCallEvent({
        route: '/api/state/unverified',
        status: 404,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json({ error: 'no_runs', message: 'No verification runs found yet' }, { status: 404 });
    }

    const reportPath = path.join(latest.p, 'report.json');
    const reportRaw = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(reportRaw) as {
      runId?: string;
      generatedAt?: string;
      total?: number;
      okCount?: number;
      failCount?: number;
      results?: Array<{
        ok?: boolean;
        ticker?: string;
        hardIssues?: unknown[];
        warnIssues?: unknown[];
      }>;
    };

    const unverified = (report.results || [])
      .filter((r) => !r.ok)
      .map((r) => ({ ticker: r.ticker, hardIssues: r.hardIssues || [], warnIssues: r.warnIssues || [] }))
      .slice(0, limit);

    logApiCallEvent({
      route: '/api/state/unverified',
      status: 200,
      latency_ms: Date.now() - t0,
      client,
    });
    const res = NextResponse.json(
      {
        runId: report.runId ?? latest.d,
        generatedAt: report.generatedAt ?? null,
        total: report.total ?? null,
        okCount: report.okCount ?? null,
        failCount: report.failCount ?? null,
        unverified,
        count: unverified.length,
      },
      { status: 200 }
    );
    res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    return res;
  } catch (e: unknown) {
    const err = e as { message?: string };
    logApiCallEvent({
      route: '/api/state/unverified',
      status: 500,
      latency_ms: Date.now() - t0,
      client,
    });
    return NextResponse.json({ error: 'read_failed', message: String(err?.message || e) }, { status: 500 });
  }
}
