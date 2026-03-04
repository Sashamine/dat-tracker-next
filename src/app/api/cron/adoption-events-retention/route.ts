import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

export const runtime = 'nodejs';
export const maxDuration = 60;

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) return true;
  return authHeader === `Bearer ${cronSecret}`;
}

function parseDays(raw: string | null): number {
  const n = Number(raw || '90');
  if (!Number.isFinite(n)) return 90;
  return Math.max(7, Math.min(365, Math.trunc(n)));
}

type CountRow = { cnt?: number | string };

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const isManual = sp.get('manual') === 'true';
  const dryRun = sp.get('dryRun') === 'true';
  const retentionDays = parseDays(sp.get('retentionDays'));

  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  let d1: D1Client;
  try {
    d1 = D1Client.fromEnv();
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        skipped: true,
        reason: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }

  const thresholdExpr = `-${retentionDays} day`;

  try {
    const totalBeforeRes = await d1.query<CountRow>(
      'SELECT COUNT(*) AS cnt FROM adoption_events;'
    );
    const eligibleRes = await d1.query<CountRow>(
      "SELECT COUNT(*) AS cnt FROM adoption_events WHERE datetime(ts) < datetime('now', ?);",
      [thresholdExpr]
    );

    const totalBefore = Number(totalBeforeRes.results[0]?.cnt || 0);
    const eligibleForDeletion = Number(eligibleRes.results[0]?.cnt || 0);

    if (!dryRun && eligibleForDeletion > 0) {
      await d1.query(
        "DELETE FROM adoption_events WHERE datetime(ts) < datetime('now', ?);",
        [thresholdExpr]
      );
    }

    const totalAfterRes = await d1.query<CountRow>(
      'SELECT COUNT(*) AS cnt FROM adoption_events;'
    );
    const totalAfter = Number(totalAfterRes.results[0]?.cnt || 0);

    return NextResponse.json({
      success: true,
      dryRun,
      retentionDays,
      thresholdExpr,
      totalBefore,
      eligibleForDeletion,
      deleted: dryRun ? 0 : Math.max(0, totalBefore - totalAfter),
      totalAfter,
      now: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

