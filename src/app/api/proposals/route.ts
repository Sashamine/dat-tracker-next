/**
 * Proposals API - List pending extraction proposals
 *
 * GET /api/proposals — Returns all pending (candidate) proposals for review
 * GET /api/proposals?status=approved — Filter by status
 */

import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';
import { getPendingProposals } from '@/lib/d1/proposals';

export async function GET(request: NextRequest) {
  try {
    const d1 = D1Client.fromEnv();
    const status = request.nextUrl.searchParams.get('status') || 'candidate';

    if (status === 'candidate') {
      const proposals = await getPendingProposals(d1);
      return NextResponse.json({
        success: true,
        count: proposals.length,
        proposals,
      });
    }

    // For other statuses, query directly
    const rows = await d1.query<{
      proposal_key: string;
      entity_id: string;
      value: number;
      unit: string;
      as_of: string | null;
      confidence: number | null;
      method: string | null;
      status: string;
      created_at: string;
    }>(
      `SELECT proposal_key, entity_id, value, unit, as_of, confidence, method, status, created_at
       FROM datapoints
       WHERE status = ?
         AND metric = 'holdings_native'
       ORDER BY created_at DESC
       LIMIT 100;`,
      [status]
    );

    return NextResponse.json({
      success: true,
      count: rows.results?.length || 0,
      proposals: rows.results || [],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
