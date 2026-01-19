/**
 * Holdings Events API
 *
 * Returns holdings events with source attribution.
 * Supports filtering by ticker and getting latest or historical events.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

interface HoldingsEvent {
  id: number;
  ticker: string;
  companyName: string;
  asset: string;
  holdings: number;
  sourceType: string;
  sourceUrl: string | null;
  confidence: number;
  eventTime: string;
  createdAt: string;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');
  const limit = parseInt(searchParams.get('limit') || '50');
  const latest = searchParams.get('latest') === 'true';

  try {
    let sql: string;
    let params: (string | number)[];

    if (latest) {
      // Get latest event per company
      sql = `
        SELECT DISTINCT ON (c.ticker)
          he.id,
          c.ticker,
          c.name as company_name,
          a.symbol as asset,
          he.holdings,
          he.source_type,
          he.source_url,
          he.confidence,
          he.event_time,
          he.created_at
        FROM holdings_events he
        JOIN companies c ON he.company_id = c.id
        JOIN assets a ON c.asset_id = a.id
        ${ticker ? 'WHERE c.ticker = $1' : ''}
        ORDER BY c.ticker, he.event_time DESC
      `;
      params = ticker ? [ticker] : [];
    } else if (ticker) {
      // Get history for a specific ticker
      sql = `
        SELECT
          he.id,
          c.ticker,
          c.name as company_name,
          a.symbol as asset,
          he.holdings,
          he.source_type,
          he.source_url,
          he.confidence,
          he.event_time,
          he.created_at
        FROM holdings_events he
        JOIN companies c ON he.company_id = c.id
        JOIN assets a ON c.asset_id = a.id
        WHERE c.ticker = $1
        ORDER BY he.event_time DESC
        LIMIT $2
      `;
      params = [ticker, limit];
    } else {
      // Get recent events across all companies
      sql = `
        SELECT
          he.id,
          c.ticker,
          c.name as company_name,
          a.symbol as asset,
          he.holdings,
          he.source_type,
          he.source_url,
          he.confidence,
          he.event_time,
          he.created_at
        FROM holdings_events he
        JOIN companies c ON he.company_id = c.id
        JOIN assets a ON c.asset_id = a.id
        ORDER BY he.event_time DESC
        LIMIT $1
      `;
      params = [limit];
    }

    const rows = await query(sql, params);

    const events: HoldingsEvent[] = rows.map(row => ({
      id: row.id,
      ticker: row.ticker,
      companyName: row.company_name,
      asset: row.asset,
      holdings: parseFloat(row.holdings),
      sourceType: row.source_type,
      sourceUrl: row.source_url,
      confidence: parseFloat(row.confidence),
      eventTime: row.event_time,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      success: true,
      count: events.length,
      events,
    });
  } catch (error) {
    // If table doesn't exist yet, return empty
    if (error instanceof Error && error.message.includes('does not exist')) {
      return NextResponse.json({
        success: true,
        count: 0,
        events: [],
        note: 'Holdings events table not yet created. Run migration 005-holdings-events.sql',
      });
    }

    console.error('[Holdings Events API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
