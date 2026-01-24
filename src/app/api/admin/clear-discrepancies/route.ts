/**
 * Admin endpoint to clear all pending discrepancies
 * Usage: /api/admin/clear-discrepancies?confirm=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  const confirm = request.nextUrl.searchParams.get('confirm');

  if (confirm !== 'true') {
    return NextResponse.json({
      error: 'Add ?confirm=true to actually clear discrepancies',
      warning: 'This will delete all pending discrepancies from the database',
    }, { status: 400 });
  }

  try {
    // Get count before clearing
    const beforeCount = await query<{ count: string }>(
      "SELECT COUNT(*) as count FROM discrepancies WHERE status = 'pending'"
    );

    // Clear all pending discrepancies
    await query("DELETE FROM discrepancies WHERE status = 'pending'");

    // Also clear fetch_results from today to ensure clean slate
    await query("DELETE FROM fetch_results WHERE DATE(fetched_at) = CURRENT_DATE");

    return NextResponse.json({
      success: true,
      cleared: parseInt(beforeCount[0]?.count || '0'),
      message: 'All pending discrepancies cleared. Run the comparison job to regenerate.',
    });

  } catch (error) {
    console.error('[Admin] Failed to clear discrepancies:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
