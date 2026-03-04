import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { headers } from 'next/headers';
import { logApiCallEvent } from '@/lib/events';

export const runtime = 'nodejs';

type Manifest = {
  schemaVersion?: string;
  generatedAt?: string;
  runId?: string;
  total?: number;
  okCount?: number;
  failCount?: number;
  okTickers?: string[];
  policyVersion?: string;
  policy?: unknown;
};

export async function GET() {
  const t0 = Date.now();
  const h = await headers();
  const clientHeader = h.get('x-client');
  const client =
    clientHeader === 'web' || clientHeader === 'agent' || clientHeader === 'cron' || clientHeader === 'unknown'
      ? clientHeader
      : undefined;
  const p = path.join(process.cwd(), 'infra', 'latest-verified.json');
  try {
    const raw = await fs.readFile(p, 'utf8');
    const j = JSON.parse(raw) as Manifest;

    // Keep it lightweight; do not echo full okTickers by default.
    logApiCallEvent({
      route: '/api/state/verification-summary',
      status: 200,
      latency_ms: Date.now() - t0,
      client,
    });

    const res = NextResponse.json(
      {
        schemaVersion: j.schemaVersion ?? null,
        generatedAt: j.generatedAt ?? null,
        runId: j.runId ?? null,
        total: j.total ?? null,
        okCount: j.okCount ?? null,
        failCount: j.failCount ?? null,
        policyVersion: j.policyVersion ?? null,
      },
      { status: 200 }
    );
    res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    return res;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const code = String(err?.code || 'unknown');
    if (code === 'ENOENT') {
      logApiCallEvent({
        route: '/api/state/verification-summary',
        status: 404,
        latency_ms: Date.now() - t0,
        client,
      });
      return NextResponse.json(
        { error: 'missing_latest_verified', message: 'infra/latest-verified.json not found yet' },
        { status: 404 }
      );
    }
    logApiCallEvent({
      route: '/api/state/verification-summary',
      status: 500,
      latency_ms: Date.now() - t0,
      client,
    });
    return NextResponse.json({ error: 'read_failed', message: String(err?.message || e) }, { status: 500 });
  }
}
