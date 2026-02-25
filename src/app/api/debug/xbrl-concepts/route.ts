import { NextRequest, NextResponse } from 'next/server';
import { extractXBRLData } from '@/lib/sec/xbrl-extractor';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Debug: list available XBRL fact concepts for a ticker that look crypto-related.
 * This helps us map the correct concept names for bitcoin_holdings_usd.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = (searchParams.get('ticker') || '').trim().toUpperCase();
  const isManual = searchParams.get('manual') === 'true';

  if (!ticker) {
    return NextResponse.json({ success: false, error: 'Missing ticker' }, { status: 400 });
  }

  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Piggyback on extractor: it fetches companyfacts internally.
  const out = await extractXBRLData(ticker);

  // rawConcepts isn't currently populated, so this endpoint will be upgraded once we add it.
  return NextResponse.json({
    success: true,
    ticker,
    extracted: {
      bitcoinHoldings: out.bitcoinHoldings,
      bitcoinHoldingsUnit: out.bitcoinHoldingsUnit,
      bitcoinHoldingsDate: out.bitcoinHoldingsDate,
      accessionNumber: out.accessionNumber,
      filingType: out.filingType,
      error: out.error,
    },
    note: 'TODO: extend extractor to return raw concept keys; currently only shows extracted fields.',
  });
}

export const runtime = 'nodejs';
export const maxDuration = 60;
