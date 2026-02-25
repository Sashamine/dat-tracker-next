import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET() {
  const repoRoot = process.cwd();
  const verifiedPath = path.join(repoRoot, 'infra', 'latest-verified.json');
  const statesRoot = path.join(repoRoot, 'states');

  let verified = null;
  try {
    const raw = await fs.readFile(verifiedPath, 'utf8');
    verified = JSON.parse(raw);
  } catch {
    verified = null;
  }

  let tickersCount: number | null = null;
  try {
    const entries = await fs.readdir(statesRoot, { withFileTypes: true });
    tickersCount = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).length;
  } catch {
    tickersCount = null;
  }

  const payload = {
    ok: true,
    verified,
    tickersCount,
    generatedAt: verified?.generatedAt ?? new Date().toISOString(),
  };

  const res = NextResponse.json(payload, { status: 200 });
  res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
  return res;
}
