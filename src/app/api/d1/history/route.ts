import { NextRequest, NextResponse } from 'next/server';
import { getMetricHistory } from '@/lib/d1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get('ticker') || '').toUpperCase();
  const metric = (searchParams.get('metric') || '').trim();
  const limitRaw = searchParams.get('limit');
  const orderRaw = (searchParams.get('order') || 'desc').toLowerCase();

  if (!ticker) {
    return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
  }
  if (!metric) {
    return NextResponse.json({ success: false, error: 'Missing metric' }, { status: 400 });
  }

  const limit = limitRaw ? Number(limitRaw) : undefined;
  const order = orderRaw === 'asc' ? 'asc' : 'desc';

  try {
    const rows = await getMetricHistory(ticker, metric, { limit, order });
    return NextResponse.json({ success: true, ticker, metric, rows });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
