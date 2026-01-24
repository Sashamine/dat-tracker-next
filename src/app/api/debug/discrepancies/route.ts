/**
 * Debug endpoint to check discrepancy records in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status') || 'all';

  try {
    let sql = `
      SELECT d.*, c.ticker
      FROM discrepancies d
      JOIN companies c ON d.company_id = c.id
    `;

    if (status !== 'all') {
      sql += ` WHERE d.status = $1`;
    }

    sql += ` ORDER BY d.created_at DESC LIMIT 50`;

    const rows = status !== 'all'
      ? await query(sql, [status])
      : await query(sql);

    // Get counts by status
    const counts = await query<{ status: string; count: string }>(`
      SELECT status, COUNT(*) as count
      FROM discrepancies
      GROUP BY status
    `);

    return NextResponse.json({
      counts: counts.reduce((acc, r) => ({ ...acc, [r.status]: parseInt(r.count) }), {}),
      records: rows,
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
