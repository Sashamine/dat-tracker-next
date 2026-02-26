import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (process.env.DEBUG_ENDPOINTS_ENABLED !== 'true') {
    return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
  }
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const table = (searchParams.get('table') || '').trim();
  if (!table) {
    return NextResponse.json({ success: false, error: 'Missing table' }, { status: 400 });
  }

  // minimal allowlist
  const allowed = new Set(['datapoints', 'artifacts', 'latest_datapoints']);
  if (!allowed.has(table)) {
    return NextResponse.json({ success: false, error: `Table not allowed: ${table}` }, { status: 400 });
  }

  const d1 = D1Client.fromEnv();
  const out = await d1.query<any>(`PRAGMA foreign_key_list(${table});`);

  return NextResponse.json({ success: true, table, fks: out.results });
}

export const runtime = 'nodejs';
export const maxDuration = 30;
