import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  try {
    const d1 = D1Client.fromEnv();
    const sql = `
      SELECT * FROM corporate_adoption_events 
      WHERE ticker = ? 
      ORDER BY event_date DESC
    `;
    const out = await d1.query(sql, [ticker.toUpperCase()]);

    return NextResponse.json({
      success: true,
      results: out.results,
    });
  } catch (err) {
    console.error(`[API] Error fetching adoption events for ${ticker}:`, err);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
