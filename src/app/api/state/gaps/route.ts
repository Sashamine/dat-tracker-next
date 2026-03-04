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
  const issue = (searchParams.get('issue') || '').trim();

  const p = path.join(process.cwd(), 'infra', 'verification-gaps.json');
  try {
    const raw = await fs.readFile(p, 'utf8');
    const j = JSON.parse(raw) as { generatedAt?: string; runId?: string; gaps?: Record<string, string[]> };

    const gaps = j.gaps || {};
    if (issue) {
      const tickers = gaps[issue] || [];
      const res = NextResponse.json(
        { issue, tickers, count: tickers.length, generatedAt: j.generatedAt ?? null, runId: j.runId ?? null },
        { status: 200 }
      );
      logApiCallEvent({
        route: '/api/state/gaps',
        metric: issue || undefined,
        status: 200,
        latency_ms: Date.now() - t0,
        client,
      });
      res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
      return res;
    }

    const top = Object.entries(gaps)
      .map(([k, v]) => ({ issue: k, count: v.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);

    const res = NextResponse.json(
      { generatedAt: j.generatedAt ?? null, runId: j.runId ?? null, topIssues: top },
      { status: 200 }
    );
    logApiCallEvent({
      route: '/api/state/gaps',
      status: 200,
      latency_ms: Date.now() - t0,
      client,
    });
    res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    return res;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const code = String(err?.code || 'unknown');
    if (code === 'ENOENT') {
      logApiCallEvent({
        route: '/api/state/gaps',
        status: 404,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json(
        { error: 'missing_gaps', message: 'infra/verification-gaps.json not found yet' },
        { status: 404 }
      );
    }
    logApiCallEvent({
      route: '/api/state/gaps',
      status: 500,
      latency_ms: Date.now() - t0,
      client,
    });
    return NextResponse.json({ error: 'read_failed', message: String(err?.message || e) }, { status: 500 });
  }
}
