import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET(req: Request) {
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
    res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
    return res;
  } catch (e: any) {
    const code = String(e?.code || 'unknown');
    if (code === 'ENOENT') {
      return NextResponse.json(
        { error: 'missing_gaps', message: 'infra/verification-gaps.json not found yet' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: 'read_failed', message: String(e?.message || e) }, { status: 500 });
  }
}
