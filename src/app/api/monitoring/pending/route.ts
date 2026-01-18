/**
 * Pending Updates API
 * GET: Fetch pending updates
 * POST: Approve/reject an update
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { allCompanies } from '@/lib/data/companies';

// Build a lookup map from company ID to company data
const companyById = new Map<number, typeof allCompanies[0]>();
allCompanies.forEach((c, index) => {
  companyById.set(index + 1, c);
});

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const updates = await query(`
      SELECT
        pu.id,
        pu.company_id as "companyId",
        pu.detected_holdings as "detectedHoldings",
        pu.detected_shares_outstanding as "detectedSharesOutstanding",
        pu.previous_holdings as "previousHoldings",
        pu.confidence_score as "confidenceScore",
        pu.source_type as "sourceType",
        pu.source_url as "sourceUrl",
        pu.source_text as "sourceText",
        pu.source_date as "sourceDate",
        pu.trust_level as "trustLevel",
        pu.llm_model as "llmModel",
        pu.extraction_reasoning as "extractionReasoning",
        pu.status,
        pu.auto_approved as "autoApproved",
        pu.auto_approve_reason as "autoApproveReason",
        pu.reviewed_by as "reviewedBy",
        pu.reviewed_at as "reviewedAt",
        pu.review_notes as "reviewNotes",
        pu.created_at as "createdAt"
      FROM pending_updates pu
      WHERE pu.status = $1
      ORDER BY
        CASE pu.trust_level
          WHEN 'official' THEN 1
          WHEN 'verified' THEN 2
          WHEN 'community' THEN 3
          ELSE 4
        END,
        pu.confidence_score DESC,
        pu.created_at DESC
      LIMIT $2 OFFSET $3
    `, [status, limit, offset]);

    // Enrich with company data from static source
    const enrichedUpdates = updates.map((update: any) => {
      const company = companyById.get(update.companyId);
      return {
        ...update,
        ticker: company?.ticker || 'UNKNOWN',
        companyName: company?.name || 'Unknown Company',
        asset: company?.asset || 'BTC',
      };
    });

    // Get counts by status
    const counts = await query(`
      SELECT
        status,
        COUNT(*) as count
      FROM pending_updates
      GROUP BY status
    `);

    const statusCounts: Record<string, number> = {};
    for (const row of counts as any[]) {
      statusCounts[row.status] = parseInt(row.count);
    }

    return NextResponse.json({
      updates: enrichedUpdates,
      counts: statusCounts,
      pagination: {
        limit,
        offset,
        total: statusCounts[status] || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching pending updates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending updates' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updateId, action, reviewer, notes } = body;

    if (!updateId || !action) {
      return NextResponse.json(
        { error: 'updateId and action are required' },
        { status: 400 }
      );
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    if (action === 'approve') {
      // Use the approve function which creates a holdings snapshot
      await query(`SELECT approve_pending_update($1, $2, $3)`, [
        updateId,
        reviewer || 'admin',
        notes || null,
      ]);
    } else {
      // Reject - just update the status
      await query(`
        UPDATE pending_updates
        SET
          status = 'rejected',
          reviewed_by = $1,
          reviewed_at = NOW(),
          review_notes = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [reviewer || 'admin', notes || null, updateId]);
    }

    return NextResponse.json({ success: true, action, updateId });
  } catch (error) {
    console.error('Error processing pending update:', error);
    return NextResponse.json(
      { error: 'Failed to process update' },
      { status: 500 }
    );
  }
}
