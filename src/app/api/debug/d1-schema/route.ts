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
  const { searchParams } = new URL(request.url);
  const table = (searchParams.get('table') || '').trim();
  if (!table) {
    return NextResponse.json({ success: false, error: 'Missing table' }, { status: 400 });
  }

  // Always require auth (debug endpoint)
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Very small allowlist for safety
  const allowed = new Set(['artifacts', 'datapoints', 'runs']);
  if (!allowed.has(table)) {
    return NextResponse.json({ success: false, error: `Table not allowed: ${table}` }, { status: 400 });
  }

  const d1 = D1Client.fromEnv();
  const info = await d1.query<any>(`PRAGMA table_info(${table});`);

  return NextResponse.json({ success: true, table, columns: info.results });
}

export const runtime = 'nodejs';
export const maxDuration = 30;
