import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

type LatestVerified = {
  schemaVersion?: string;
  generatedAt?: string;
  runId?: string;
  total?: number;
  okCount?: number;
  failCount?: number;
  policyVersion?: string;
};

export async function GET() {
  const repoRoot = process.cwd();
  const statesRoot = path.join(repoRoot, 'states');
  const verifiedPath = path.join(repoRoot, 'infra', 'latest-verified.json');

  let tickersCount: number | null = null;
  try {
    const entries = await fs.readdir(statesRoot, { withFileTypes: true });
    tickersCount = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.')).length;
  } catch {
    tickersCount = null;
  }

  let verified: LatestVerified | null = null;

  // Optional: include top gaps summary
  let topIssues: { issue: string; count: number }[] | null = null;
  try {
    const gapsRaw = await fs.readFile(path.join(repoRoot, 'infra', 'verification-gaps.json'), 'utf8');
    const gaps = JSON.parse(gapsRaw) as { gaps?: Record<string, string[]> };
    const ent = Object.entries(gaps.gaps || {}).map(([k, v]) => ({ issue: k, count: (v || []).length }));
    ent.sort((a, b) => b.count - a.count);
    topIssues = ent.slice(0, 10);
  } catch {
    topIssues = null;
  }
  try {
    const raw = await fs.readFile(verifiedPath, 'utf8');
    verified = JSON.parse(raw);
  } catch {
    verified = null;
  }

  const res = NextResponse.json(
    {
      ok: true,
      tickersCount,
      verified,
      topIssues,
      generatedAt: new Date().toISOString(),
    },
    { status: 200 }
  );
  res.headers.set('Cache-Control', 'public, max-age=30, s-maxage=30');
  return res;
}
