import { NextRequest, NextResponse } from 'next/server';
import { getEntity } from '@/lib/d1';
import { getPurchasesFromD1, getPurchaseStatsFromD1 } from '@/lib/d1-read';

/**
 * GET /api/v1/companies/:ticker/purchases
 *
 * Returns purchase history and cost basis for a company.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const entityId = ticker.toUpperCase();

    const [entity, purchases, stats] = await Promise.all([
      getEntity(entityId),
      getPurchasesFromD1(entityId),
      getPurchaseStatsFromD1(entityId),
    ]);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: `Company ${entityId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ticker: entityId,
      count: purchases.length,
      stats: stats ? {
        totalQuantity: stats.totalQuantity,
        totalCost: stats.totalCost,
        costBasisAvg: stats.costBasisAvg,
      } : null,
      purchases: purchases.map(p => ({
        date: p.date,
        asset: p.asset,
        quantity: p.quantity,
        pricePerUnit: p.price_per_unit,
        totalCost: p.total_cost,
        source: p.source,
        sourceUrl: p.source_url,
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 15;
