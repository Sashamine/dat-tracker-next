import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

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
  const p = path.join(process.cwd(), 'infra', 'latest-verified.json');
  try {
    const raw = await fs.readFile(p, 'utf8');
    const j = JSON.parse(raw) as Manifest;

    // Keep it lightweight; do not echo full okTickers by default.
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
      return NextResponse.json(
        { error: 'missing_latest_verified', message: 'infra/latest-verified.json not found yet' },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: 'read_failed', message: String(err?.message || e) }, { status: 500 });
  }
}
