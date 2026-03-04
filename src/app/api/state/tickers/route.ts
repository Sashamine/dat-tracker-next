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
  const mode = (searchParams.get('mode') || 'verified').toLowerCase();
  const preferVerified = mode !== 'raw';

  const root = path.join(process.cwd(), 'states');
  let verifiedSet: Set<string> | null = null;
  if (preferVerified) {
    try {
      const vRaw = await fs.readFile(path.join(process.cwd(), 'infra', 'latest-verified.json'), 'utf8');
      const v = JSON.parse(vRaw) as { okTickers?: string[] };
      verifiedSet = new Set((v.okTickers || []).map((t) => String(t)));
    } catch {
      verifiedSet = null;
    }
  }
  try {
    const entries = await fs.readdir(root, { withFileTypes: true });
    const tickers = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((t) => !t.startsWith('.'))
      .filter((t) => (verifiedSet ? verifiedSet.has(t) : true))
      .sort((a, b) => a.localeCompare(b));

    logApiCallEvent({
      route: '/api/state/tickers',
      status: 200,
      latency_ms: Date.now() - t0,
      client,
    });
    const res = NextResponse.json({ tickers, count: tickers.length, mode: preferVerified ? 'verified' : 'raw' }, { status: 200 });
    res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    return res;
  } catch (e: unknown) {
    const err = e as { message?: string };
    logApiCallEvent({
      route: '/api/state/tickers',
      status: 500,
      latency_ms: Date.now() - t0,
      client,
    });
    return NextResponse.json(
      { error: 'read_failed', message: String(err?.message || e) },
      { status: 500 }
    );
  }
}

// auto-commit test marker
