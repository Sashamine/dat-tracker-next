import { NextRequest, NextResponse } from 'next/server';
import { STOCK_SPLITS } from '@/lib/data/stock-splits';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const ticker = (sp.get('ticker') || '').trim().toUpperCase();

  if (ticker) {
    return NextResponse.json({
      success: true,
      ticker,
      splits: STOCK_SPLITS[ticker] || [],
    });
  }

  return NextResponse.json({
    success: true,
    tickers: Object.keys(STOCK_SPLITS).sort(),
    splitsByTicker: STOCK_SPLITS,
  });
}
