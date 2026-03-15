import { NextRequest, NextResponse } from 'next/server';
import {
  getEntity,
  getLatestMetrics,
  getAllInstruments,
  getSecondaryHoldings,
  getInvestments,
} from '@/lib/d1';
import { CORE_D1_METRICS } from '@/lib/metrics';

/**
 * GET /api/v1/companies/:ticker
 *
 * Returns a single company's full profile from D1:
 * entity metadata, latest financial metrics with provenance,
 * instruments, secondary holdings, and investments.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const entityId = ticker.toUpperCase();

    const [entity, metrics, instruments, secondaryHoldings, investments] = await Promise.all([
      getEntity(entityId),
      getLatestMetrics(entityId, [...CORE_D1_METRICS]),
      getAllInstruments(entityId),
      getSecondaryHoldings(entityId),
      getInvestments(entityId),
    ]);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: `Company ${entityId} not found` },
        { status: 404 }
      );
    }

    // Build metrics with full provenance
    const metricsMap: Record<string, {
      value: number;
      as_of: string | null;
      reported_at: string | null;
      source_url: string | null;
      accession: string | null;
      citation_quote: string | null;
      citation_search_term: string | null;
      confidence: number | null;
      method: string | null;
    }> = {};

    for (const m of metrics) {
      metricsMap[m.metric] = {
        value: m.value,
        as_of: m.as_of,
        reported_at: m.reported_at,
        source_url: m.artifact?.source_url ?? null,
        accession: m.artifact?.accession ?? null,
        citation_quote: m.citation_quote,
        citation_search_term: m.citation_search_term,
        confidence: m.confidence,
        method: m.method,
      };
    }

    return NextResponse.json({
      success: true,
      company: {
        ticker: entity.entity_id,
        name: entity.name,
        asset: entity.asset,
        tier: entity.tier,
        country: entity.country,
        secCik: entity.sec_cik,
        isMiner: !!entity.is_miner,
        website: entity.website,
        twitter: entity.twitter,
        leader: entity.leader,
        strategy: entity.strategy,
        metrics: metricsMap,
        instruments: instruments.map(i => ({
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
        })),
        secondaryHoldings: secondaryHoldings.map(h => ({
          asset: h.asset,
          amount: h.amount,
          asOf: h.as_of,
          note: h.note,
        })),
        investments: investments.map(inv => ({
          name: inv.name,
          type: inv.type,
          underlyingAsset: inv.underlying_asset,
          fairValue: inv.fair_value,
          sourceDate: inv.source_date,
          lstAmount: inv.lst_amount,
          exchangeRate: inv.exchange_rate,
          underlyingAmount: inv.underlying_amount,
        })),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 30;
