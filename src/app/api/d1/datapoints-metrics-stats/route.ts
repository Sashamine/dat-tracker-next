import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

export const runtime = 'nodejs';

export async function GET(_request: NextRequest) {
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_D1_DATABASE_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    return NextResponse.json(
      {
        success: false,
        error:
          'Missing Cloudflare D1 env (need CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, CLOUDFLARE_API_TOKEN)',
      },
      { status: 500 }
    );
  }

  try {
    const d1 = D1Client.fromEnv();

    const datapoints = await d1.query<{ metric: string; cnt: number }>(
      `SELECT metric, COUNT(1) as cnt
       FROM datapoints
       GROUP BY metric
       ORDER BY cnt DESC
       LIMIT 200;`
    );

    const latest = await d1.query<{ metric: string; cnt: number }>(
      `SELECT metric, COUNT(1) as cnt
       FROM latest_datapoints
       GROUP BY metric
       ORDER BY cnt DESC
       LIMIT 200;`
    );

    return NextResponse.json({
      success: true,
      datapoints: datapoints.results,
      latest_datapoints: latest.results,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
