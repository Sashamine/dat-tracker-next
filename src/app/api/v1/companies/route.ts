import { NextRequest, NextResponse } from 'next/server';
import { getEntities } from '@/lib/d1';
import { getLatestMetrics } from '@/lib/d1';
import { CORE_D1_METRICS } from '@/lib/metrics';

/**
 * GET /api/v1/companies
 *
 * Returns all entities with their latest financial metrics from D1.
 * Supports ?asset=BTC to filter by primary asset.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assetFilter = searchParams.get('asset')?.toUpperCase();

    let entities = await getEntities();
    if (assetFilter) {
      entities = entities.filter(e => e.asset.toUpperCase() === assetFilter);
    }

    // Fetch latest metrics for all entities in parallel
    const results = await Promise.all(
      entities.map(async (entity) => {
        const metrics = await getLatestMetrics(entity.entity_id, [...CORE_D1_METRICS]);

        const metricsMap: Record<string, {
          value: number;
          as_of: string | null;
          source_url: string | null;
          citation_quote: string | null;
          confidence: number | null;
        }> = {};

        for (const m of metrics) {
          metricsMap[m.metric] = {
            value: m.value,
            as_of: m.as_of,
            source_url: m.artifact?.source_url ?? null,
            citation_quote: m.citation_quote,
            confidence: m.confidence,
          };
        }

        return {
          ticker: entity.entity_id,
          name: entity.name,
          asset: entity.asset,
          tier: entity.tier,
          isMiner: !!entity.is_miner,
          metrics: metricsMap,
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: results.length,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 60;
