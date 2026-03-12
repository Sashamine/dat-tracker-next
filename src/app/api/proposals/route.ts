/**
 * Proposals API - List extraction proposals from auto-extract pipeline
 *
 * GET /api/proposals — Returns pending (candidate) proposals for review
 * GET /api/proposals?status=approved — Filter by status
 *
 * All queries filter to auto-extract-8k source only (not XBRL/foreign pipeline data).
 */

import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';
import { getPendingProposals } from '@/lib/d1/proposals';
import { getCompanyByTicker } from '@/lib/data/companies';

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

    // For approved/rejected: also filter to auto-extraction proposals only
    const rows = await d1.query<{
      proposal_key: string;
      entity_id: string;
      metric: string;
      value: number;
      unit: string;
      as_of: string | null;
      confidence: number | null;
      method: string | null;
      status: string;
      created_at: string;
      flags_json: string | null;
    }>(
      `SELECT proposal_key, entity_id, metric, value, unit, as_of,
              confidence, method, status, created_at, flags_json
       FROM datapoints
       WHERE status = ?
         AND metric = 'holdings_native'
         AND flags_json LIKE '%auto-extract-8k%'
       ORDER BY created_at DESC
       LIMIT 100;`,
      [status]
    );

    // Enrich with company data (same shape as getPendingProposals)
    const proposals = (rows.results || []).map(row => {
      const company = getCompanyByTicker(row.entity_id);
      const currentHoldings = company?.holdings ?? null;
      const flags = row.flags_json ? JSON.parse(row.flags_json) : null;

      return {
        proposalKey: row.proposal_key,
        ticker: row.entity_id,
        metric: row.metric,
        value: row.value,
        unit: row.unit,
        asOf: row.as_of,
        confidence: row.confidence ?? 0,
        method: row.method,
        status: row.status,
        createdAt: row.created_at,
        citationQuote: null,
        flags,
        currentHoldings,
        delta: currentHoldings != null ? row.value - currentHoldings : null,
      };
    });

    return NextResponse.json({
      success: true,
      count: proposals.length,
      proposals,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
