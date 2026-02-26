import { NextRequest, NextResponse } from 'next/server';
import { getCorporateActions } from '@/lib/d1';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get('ticker') || '').toUpperCase();

  if (!ticker) {
    return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
  }

  // Fail loudly with JSON if D1 env isn't configured in this runtime.
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
    const actions = await getCorporateActions(ticker);
    return NextResponse.json({ success: true, ticker, actions });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
