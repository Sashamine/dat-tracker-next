import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tickerRaw = (searchParams.get('ticker') || '').trim();
  const rawMode = (searchParams.get('raw') || '').trim();
  const preferVerified = rawMode !== '1' && rawMode.toLowerCase() !== 'true';

  if (!tickerRaw) {
    return NextResponse.json(
      { error: 'missing_ticker', message: 'Provide ?ticker=BMNR (see /api/state/tickers)' },
      { status: 400 }
    );
  }

  // Prefer verified tickers unless ?raw=1
  if (preferVerified) {
    try {
      const vRaw = await fs.readFile(path.join(process.cwd(), 'infra', 'latest-verified.json'), 'utf8');
      const v = JSON.parse(vRaw) as { okTickers?: string[] };
      const ok = new Set((v.okTickers || []).map((t) => String(t).toUpperCase()));
      if (!ok.has(tickerRaw.toUpperCase())) {
        const vm = v as { generatedAt?: string; okCount?: number; total?: number; runId?: string };
        const meta = { generatedAt: vm.generatedAt ?? null, okCount: vm.okCount ?? null, total: vm.total ?? null, runId: vm.runId ?? null };
        return NextResponse.json(
          { error: 'not_verified', message: `Ticker ${tickerRaw} is not in latest-verified set. Use ?raw=1 to bypass.`, latestVerified: meta },
          { status: 404 }
        );
      }
    } catch {
      // If the manifest is missing/unreadable, fall back to raw behavior.
    }
  }

  // Be tolerant: states are stored as directory names (case-sensitive FS), so try exact then uppercased.
  const ticker = tickerRaw;
  const pExact = path.join(process.cwd(), 'states', ticker, 'latest.json');
  const pUpper = path.join(process.cwd(), 'states', ticker.toUpperCase(), 'latest.json');
  try {
    let raw: string;
    try {
      raw = await fs.readFile(pExact, 'utf8');
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (String(err?.code || '') !== 'ENOENT') throw e;
      raw = await fs.readFile(pUpper, 'utf8');
    }

    const json = JSON.parse(raw);
    const res = NextResponse.json(json, { status: 200 });
    res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    return res;
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const code = String(err?.code || 'unknown');
    if (code === 'ENOENT') {
      return NextResponse.json(
        {
          error: 'not_found',
          message: `No latest state found for ticker=${tickerRaw}. See /api/state/tickers.`,
        },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'read_failed', message: String(err?.message || e) },
      { status: 500 }
    );
  }
}
