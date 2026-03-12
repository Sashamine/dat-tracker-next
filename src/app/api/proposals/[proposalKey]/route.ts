/**
 * Proposal Action API - Approve or reject a specific proposal
 *
 * GET  /api/proposals/[proposalKey] — Get proposal details
 * POST /api/proposals/[proposalKey]?action=approve — Approve proposal
 * POST /api/proposals/[proposalKey]?action=reject  — Reject proposal
 */

import { NextRequest, NextResponse } from 'next/server';
import { D1Client } from '@/lib/d1';
import { getProposal, approveProposal, rejectProposal } from '@/lib/d1/proposals';
import { sendDiscordAlert } from '@/lib/discord';

type RouteContext = { params: Promise<{ proposalKey: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { proposalKey } = await context.params;
    const d1 = D1Client.fromEnv();

    const proposal = await getProposal(d1, proposalKey);
    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, proposal });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { proposalKey } = await context.params;
    const action = request.nextUrl.searchParams.get('action');

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { success: false, error: 'action must be "approve" or "reject"' },
        { status: 400 }
      );
    }

    const d1 = D1Client.fromEnv();

    // Get proposal details before action (for notification)
    const proposal = await getProposal(d1, proposalKey);
    if (!proposal) {
      return NextResponse.json(
        { success: false, error: 'Proposal not found' },
        { status: 404 }
      );
    }

    const result = action === 'approve'
      ? await approveProposal(d1, proposalKey)
      : await rejectProposal(d1, proposalKey);

    // Send Discord notification for the action
    if (result.success) {
      const emoji = action === 'approve' ? '✅' : '❌';
      const delta = proposal.delta != null ? ` (Δ ${proposal.delta > 0 ? '+' : ''}${proposal.delta.toLocaleString()})` : '';
      await sendDiscordAlert(
        `${emoji} Proposal ${action === 'approve' ? 'Approved' : 'Rejected'}`,
        `**${proposal.ticker}**: ${proposal.value.toLocaleString()} ${proposal.unit}${delta}\nConfidence: ${Math.round(proposal.confidence * 100)}% | Method: ${proposal.method || 'unknown'}`,
        action === 'approve' ? 'info' : 'warning',
        false
      );
    }

    return NextResponse.json({
      success: result.success,
      result,
      proposal,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
