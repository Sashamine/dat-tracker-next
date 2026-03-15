import { NextRequest, NextResponse } from 'next/server';
import { getAllInstruments, getEntity } from '@/lib/d1';

/**
 * GET /api/v1/companies/:ticker/instruments
 *
 * Returns all dilutive instruments (convertibles, warrants, options) for a company.
 * Supports ?stockPrice=X to show in-the-money status.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const entityId = ticker.toUpperCase();
    const { searchParams } = new URL(request.url);
    const stockPrice = parseFloat(searchParams.get('stockPrice') ?? '');

    const [entity, instruments] = await Promise.all([
      getEntity(entityId),
      getAllInstruments(entityId),
    ]);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: `Company ${entityId} not found` },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    const results = instruments.map(i => {
      const isExpired = i.expiration ? i.expiration <= today : false;
      const isInTheMoney = !isNaN(stockPrice) && stockPrice > i.strike_price && !isExpired;

      return {
        type: i.type,
        name: i.name,
        strikePrice: i.strike_price,
        potentialShares: i.potential_shares,
        faceValue: i.face_value,
        issuedDate: i.issued_date,
        expiration: i.expiration,
        includedInBase: !!i.included_in_base,
        status: i.status,
        source: i.source,
        sourceUrl: i.source_url,
        ...(isExpired ? { expired: true } : {}),
        ...(!isNaN(stockPrice) ? { inTheMoney: isInTheMoney } : {}),
      };
    });

    const active = results.filter(r => !r.expired && !r.includedInBase);
    const totalPotentialShares = active.reduce((sum, r) => sum + r.potentialShares, 0);
    const itmShares = !isNaN(stockPrice)
      ? active.filter(r => r.inTheMoney).reduce((sum, r) => sum + r.potentialShares, 0)
      : null;

    return NextResponse.json({
      success: true,
      ticker: entityId,
      count: results.length,
      activeCount: active.length,
      totalPotentialShares,
      ...(itmShares !== null ? { inTheMoneyShares: itmShares, stockPrice } : {}),
      instruments: results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 15;
