import { NextRequest, NextResponse } from 'next/server';
import { getEntity, getCapitalEvents } from '@/lib/d1';

/**
 * GET /api/v1/companies/:ticker/events
 *
 * Returns capital events timeline (BTC purchases, debt issuances, preferred, ATM, etc.).
 * Supports ?type=BTC|DEBT|PREF|ATM|DEBT_EVENT|CORP to filter.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const entityId = ticker.toUpperCase();
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type')?.toUpperCase();

    const [entity, events] = await Promise.all([
      getEntity(entityId),
      getCapitalEvents(entityId),
    ]);

    if (!entity) {
      return NextResponse.json(
        { success: false, error: `Company ${entityId} not found` },
        { status: 404 }
      );
    }

    let filtered = events;
    if (typeFilter) {
      filtered = events.filter(e => e.type === typeFilter);
    }

    return NextResponse.json({
      success: true,
      ticker: entityId,
      count: filtered.length,
      events: filtered.map(e => {
        const data = e.data_json ? JSON.parse(e.data_json) : {};
        return {
          date: e.date,
          type: e.type,
          description: e.description,
          filedDate: e.filed_date,
          accessionNumber: e.accession_number,
          sourceUrl: e.source_url,
          data,
        };
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 15;
