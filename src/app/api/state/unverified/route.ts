import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';

export const runtime = 'nodejs';

export async function GET(req: Request) {
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
      return NextResponse.json({ error: 'no_runs', message: 'No verification runs found yet' }, { status: 404 });
    }

    const reportPath = path.join(latest.p, 'report.json');
    const reportRaw = await fs.readFile(reportPath, 'utf8');
    const report = JSON.parse(reportRaw) as any;

    const unverified = (report.results || [])
      .filter((r: any) => !r.ok)
      .map((r: any) => ({ ticker: r.ticker, hardIssues: r.hardIssues || [], warnIssues: r.warnIssues || [] }))
      .slice(0, limit);

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
  } catch (e: any) {
    return NextResponse.json({ error: 'read_failed', message: String(e?.message || e) }, { status: 500 });
  }
}
