/**
 * Debug endpoint to test dismissal logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker') || 'BTDR';
  const field = request.nextUrl.searchParams.get('field') || 'cash';

  try {
    // Get company_id
    const companies = await query<{ id: number }>(
      'SELECT id FROM companies WHERE ticker = $1',
      [ticker]
    );
    const companyId = companies[0]?.id;

    if (!companyId) {
      return NextResponse.json({ error: `Company ${ticker} not found` }, { status: 404 });
    }

    // Get dismissed records
    const dismissed = await query<{ id: number; source_values: unknown; created_at: string }>(
      `SELECT id, source_values, created_at FROM discrepancies
       WHERE company_id = $1
         AND field = $2
         AND status = 'dismissed'
         AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC
       LIMIT 1`,
      [companyId, field]
    );

    // Get current pending if exists
    const pending = await query<{ id: number; source_values: unknown; created_at: string }>(
      `SELECT id, source_values, created_at FROM discrepancies
       WHERE company_id = $1
         AND field = $2
         AND status = 'pending'
       ORDER BY created_at DESC
       LIMIT 1`,
      [companyId, field]
    );

    // Test the logic
    let wouldSkip = false;
    let debugInfo: Record<string, unknown> = {};

    if (dismissed.length > 0 && pending.length > 0) {
      const dismissedSources = typeof dismissed[0].source_values === 'string'
        ? JSON.parse(dismissed[0].source_values)
        : dismissed[0].source_values;

      const pendingSources = typeof pending[0].source_values === 'string'
        ? JSON.parse(pending[0].source_values)
        : pending[0].source_values;

      debugInfo = {
        dismissedSourcesType: typeof dismissed[0].source_values,
        dismissedSources,
        pendingSources,
      };

      // Check each pending source against dismissed
      for (const [sourceName, sourceData] of Object.entries(pendingSources as Record<string, { value: number }>)) {
        const dismissedSource = dismissedSources[sourceName];
        if (dismissedSource) {
          const dismissedValue = dismissedSource.value;
          const currentValue = sourceData.value;
          const tolerance = Math.abs(dismissedValue) * 0.001;
          const diff = Math.abs(dismissedValue - currentValue);

          debugInfo[`comparison_${sourceName}`] = {
            dismissedValue,
            currentValue,
            tolerance,
            diff,
            wouldMatch: diff <= tolerance,
          };

          if (diff <= tolerance) {
            wouldSkip = true;
          }
        }
      }
    }

    return NextResponse.json({
      ticker,
      field,
      companyId,
      dismissedCount: dismissed.length,
      pendingCount: pending.length,
      dismissed: dismissed[0] || null,
      pending: pending[0] || null,
      wouldSkip,
      debugInfo,
    });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined },
      { status: 500 }
    );
  }
}
