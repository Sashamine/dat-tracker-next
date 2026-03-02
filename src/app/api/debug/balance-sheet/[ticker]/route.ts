// GET /api/debug/balance-sheet/[ticker]
// Debug endpoint to surface the exact balance sheet parameters the site is using,
// along with basic provenance pointers.
import { NextResponse } from 'next/server';
import { getCompanyByTicker } from '@/lib/data/companies';

export const dynamic = 'force-dynamic';

type FieldDebug = {
  value: number | null;
  unit?: string;
  asOf?: string | null;
  source?: {
    kind: 'companies.ts';
    notes?: string;
    url?: string | null;
  };
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const t = (ticker || '').trim().toUpperCase();

    const company = getCompanyByTicker(t);
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const fields: Record<string, FieldDebug> = {
      holdings: {
        value: company.holdings ?? null,
        unit: company.asset,
        asOf: company.holdingsLastUpdated ?? null,
        source: {
          kind: 'companies.ts',
          notes: company.holdingsSource ?? undefined,
          url: company.holdingsSourceUrl ?? null,
        },
      },
      basicShares: {
        value: company.sharesForMnav ?? null,
        unit: 'shares',
        source: {
          kind: 'companies.ts',
          notes: 'sharesForMnav (basic shares used for per-share metrics)',
        },
      },
      cashReserves: {
        value: company.cashReserves ?? null,
        unit: 'USD',
        source: {
          kind: 'companies.ts',
        },
      },
      totalDebt: {
        value: company.totalDebt ?? null,
        unit: 'USD',
        source: {
          kind: 'companies.ts',
        },
      },
      preferredEquity: {
        value: company.preferredEquity ?? null,
        unit: 'USD',
        source: {
          kind: 'companies.ts',
        },
      },
      otherInvestments: {
        value: company.otherInvestments ?? null,
        unit: 'USD',
        source: {
          kind: 'companies.ts',
        },
      },
    };

    return NextResponse.json({
      ticker: company.ticker,
      name: company.name,
      asset: company.asset,
      fields,
      caveats: [
        'This endpoint currently reports the canonical snapshot values from companies.ts (same source as /api/db/companies/[ticker]).',
        'Follow-up: attach D1 datapoint provenance (artifact_id/r2_key/accession) per field once historical backfill is in place.',
      ],
    });
  } catch (err) {
    console.error('Error in debug balance-sheet endpoint:', err);
    return NextResponse.json({ error: 'Failed to generate debug payload' }, { status: 500 });
  }
}
