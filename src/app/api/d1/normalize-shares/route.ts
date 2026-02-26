import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';
import { normalizeShares, normalizePrice } from '@/lib/corporate-actions.ts';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get('ticker') || '').toUpperCase();
  const valueRaw = searchParams.get('value');
  const asOf = searchParams.get('as_of') || searchParams.get('asOf') || '';
  const basis = (searchParams.get('basis') || 'current') as 'current' | 'historical';
  const kind = (searchParams.get('kind') || 'shares') as 'shares' | 'price';

  if (!ticker) return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
  if (valueRaw == null) return NextResponse.json({ success: false, error: 'Missing value' }, { status: 400 });
  const value = Number(valueRaw);
  if (!Number.isFinite(value)) return NextResponse.json({ success: false, error: 'Invalid value' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
    return NextResponse.json({ success: false, error: 'Missing/invalid as_of (YYYY-MM-DD)' }, { status: 400 });
  }
  if (basis !== 'current' && basis !== 'historical') {
    return NextResponse.json({ success: false, error: 'Invalid basis' }, { status: 400 });
  }
  if (kind !== 'shares' && kind !== 'price') {
    return NextResponse.json({ success: false, error: 'Invalid kind' }, { status: 400 });
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
    const d1 = D1Client.fromEnv();
    const out = await d1.query(
      `SELECT action_id, entity_id, action_type, ratio, effective_date, source_artifact_id, source_url, quote, confidence, created_at
       FROM corporate_actions
       WHERE entity_id = ?
       ORDER BY effective_date ASC, created_at ASC;`,
      [ticker]
    );
    const actions = out.results as Array<{ effective_date: string; ratio: number }>;

    const normalized = kind === 'shares'
      ? normalizeShares(value, actions, asOf, basis)
      : normalizePrice(value, actions, asOf, basis);

    return NextResponse.json({
      success: true,
      ticker,
      as_of: asOf,
      basis,
      kind,
      input: value,
      normalized,
      actions,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
