/**
 * D1 Proposal Management
 *
 * Handles the lifecycle of extraction proposals:
 * - Write proposals from auto-extraction results
 * - Auto-approve high-confidence results (≥90%)
 * - Surface edge cases (80-89%) for human review
 * - List pending proposals for review
 * - Approve/reject proposals
 *
 * Confidence tiers:
 * - ≥90%: Auto-approved, written to D1 as 'approved'
 * - 80-89%: Written as 'candidate', needs human review
 * - <80%: Already filtered out by getProposedUpdates()
 */

import crypto from 'node:crypto';
import { D1Client } from '../d1';
import { writeSecFilingHoldingsNativeDatapoint, type SecFilingHoldingsNativeWriteResult } from './sec-filing-holdings-native';
import type { AutoExtractionResult } from '../sec/auto-extract-8k';
import { getCompanyByTicker } from '../data/companies';
import { sendDiscordEmbed } from '../discord';

// Auto-approve threshold: ≥90% confidence results are approved without human review
const AUTO_APPROVE_THRESHOLD = 0.9;

// ============================================
// TYPES
// ============================================

export interface ProposalRow {
  datapoint_id: string;
  entity_id: string;
  metric: string;
  value: number;
  unit: string;
  as_of: string | null;
  reported_at: string | null;
  confidence: number | null;
  method: string | null;
  status: string;
  proposal_key: string;
  created_at: string;
  citation_quote: string | null;
  flags_json: string | null;
  artifact_id: string | null;
}

export interface ProposalSummary {
  proposalKey: string;
  ticker: string;
  metric: string;
  value: number;
  unit: string;
  asOf: string | null;
  confidence: number;
  method: string | null;
  status: string;
  createdAt: string;
  citationQuote: string | null;
  flags: Record<string, unknown> | null;
  // Enriched from companies.ts
  currentHoldings: number | null;
  delta: number | null;
}

export interface ProposalActionResult {
  success: boolean;
  proposalKey: string;
  action: 'approved' | 'rejected';
  previousStatus: string;
  error?: string;
}

// ============================================
// WRITE PROPOSALS FROM EXTRACTION
// ============================================

/**
 * Write an auto-extraction result to D1 as a candidate proposal.
 * Uses the existing writeSecFilingHoldingsNativeDatapoint() infrastructure.
 */
export async function writeExtractionProposal(
  d1: D1Client,
  result: AutoExtractionResult,
  runId: string,
): Promise<SecFilingHoldingsNativeWriteResult> {
  if (!result.extracted || result.holdings == null) {
    return { status: 'skipped', reason: 'not extracted or no holdings' };
  }

  const company = getCompanyByTicker(result.ticker);
  const asset = result.asset || company?.asset || 'BTC';

  // Build filing URL from accession number
  const filingUrl = result.accessionNumber
    ? `/filings/${result.ticker.toLowerCase()}/${result.accessionNumber}`
    : null;

  const flags: Record<string, unknown> = {
    extractionMethod: result.extractionMethod,
    patternName: result.patternName,
    formType: result.formType,
    type: result.type,
    transactionAmount: result.transactionAmount,
    currentHoldings: result.currentHoldings,
    holdingsDelta: result.holdingsDelta,
    costUsd: result.costUsd,
    sharesOutstanding: result.sharesOutstanding,
    source: 'auto-extract-8k',
  };

  return writeSecFilingHoldingsNativeDatapoint(d1, {
    ticker: result.ticker,
    holdingsNative: result.holdings,
    assetUnit: asset,
    asOf: result.asOfDate || result.filedDate,
    reportedAt: result.filedDate,
    filingUrl,
    accession: result.accessionNumber,
    filingType: result.formType,
    confidence: result.confidence,
    runId,
    flags,
  });
}

export interface ProposalWriteStats {
  written: number;
  autoApproved: number;
  needsReview: number;
  skipped: number;
  errors: number;
  details: SecFilingHoldingsNativeWriteResult[];
}

/**
 * Write extraction results to D1 and auto-approve high-confidence ones.
 *
 * - ≥90% confidence: Written to D1 then immediately auto-approved
 * - 80-89% confidence: Written as 'candidate' for human review
 * - Discord notification sent for each auto-approved result
 */
export async function writeExtractionProposals(
  d1: D1Client,
  results: AutoExtractionResult[],
  runId: string,
): Promise<ProposalWriteStats> {
  const details: SecFilingHoldingsNativeWriteResult[] = [];
  let written = 0;
  let autoApproved = 0;
  let needsReview = 0;
  let skipped = 0;
  let errors = 0;

  for (const result of results) {
    const writeResult = await writeExtractionProposal(d1, result, runId);
    details.push(writeResult);

    if (writeResult.status === 'inserted' || writeResult.status === 'updated') {
      written++;

      // Auto-approve high-confidence results
      if (result.confidence >= AUTO_APPROVE_THRESHOLD && writeResult.proposalKey) {
        const approveResult = await approveProposal(d1, writeResult.proposalKey);
        if (approveResult.success) {
          autoApproved++;
          // Notify Discord
          const delta = result.holdingsDelta;
          const deltaStr = delta != null ? ` (${delta > 0 ? '+' : ''}${delta.toLocaleString()})` : '';
          const method = result.extractionMethod === 'llm' ? 'LLM' : 'Regex';
          await sendDiscordEmbed({
            title: `Auto-Approved: ${result.ticker}`,
            description: [
              `**${result.holdings?.toLocaleString()}** ${result.asset}${deltaStr}`,
              `Confidence: ${Math.round(result.confidence * 100)}% | Method: ${method} (\`${result.patternName}\`)`,
              result.asOfDate ? `As-of: ${result.asOfDate}` : null,
              `Filing: ${result.formType} ${result.accessionNumber}`,
            ].filter(Boolean).join('\n'),
            color: 0x2ecc71, // Green
          }, false);
        }
      } else {
        needsReview++;
      }
    } else if (writeResult.status === 'error') {
      errors++;
    } else {
      skipped++;
    }
  }

  return { written, autoApproved, needsReview, skipped, errors, details };
}

// ============================================
// READ PROPOSALS
// ============================================

/**
 * Get pending proposals from auto-extraction only (not legacy D1 candidates).
 * Filters by flags_json containing 'auto-extract-8k' source marker.
 */
export async function getPendingProposals(d1: D1Client): Promise<ProposalSummary[]> {
  const rows = await d1.query<ProposalRow>(
    `SELECT
       datapoint_id, entity_id, metric, value, unit,
       as_of, reported_at, confidence, method, status,
       proposal_key, created_at, citation_quote, flags_json, artifact_id
     FROM datapoints
     WHERE status = 'candidate'
       AND metric = 'holdings_native'
       AND flags_json LIKE '%auto-extract-8k%'
     ORDER BY created_at DESC
     LIMIT 100;`
  );

  return (rows.results || []).map(row => {
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
      citationQuote: row.citation_quote,
      flags,
      currentHoldings,
      delta: currentHoldings != null ? row.value - currentHoldings : null,
    };
  });
}

/**
 * Get a single proposal by its proposal_key.
 */
export async function getProposal(d1: D1Client, proposalKey: string): Promise<ProposalSummary | null> {
  const rows = await d1.query<ProposalRow>(
    `SELECT
       datapoint_id, entity_id, metric, value, unit,
       as_of, reported_at, confidence, method, status,
       proposal_key, created_at, citation_quote, flags_json, artifact_id
     FROM datapoints
     WHERE proposal_key = ?
     LIMIT 1;`,
    [proposalKey]
  );

  const row = rows.results?.[0];
  if (!row) return null;

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
    citationQuote: row.citation_quote,
    flags,
    currentHoldings,
    delta: currentHoldings != null ? row.value - currentHoldings : null,
  };
}

// ============================================
// APPROVE / REJECT
// ============================================

/**
 * Approve a proposal — updates status from 'candidate' to 'approved'.
 */
export async function approveProposal(
  d1: D1Client,
  proposalKey: string,
): Promise<ProposalActionResult> {
  // Get current state
  const current = await getProposal(d1, proposalKey);
  if (!current) {
    return { success: false, proposalKey, action: 'approved', previousStatus: 'unknown', error: 'Proposal not found' };
  }

  if (current.status === 'approved') {
    return { success: true, proposalKey, action: 'approved', previousStatus: 'approved' };
  }

  const result = await d1.query(
    `UPDATE datapoints
     SET status = 'approved'
     WHERE proposal_key = ?
       AND status = 'candidate';`,
    [proposalKey]
  );

  const changed = Number(result.meta?.changes || 0) > 0;
  return {
    success: changed,
    proposalKey,
    action: 'approved',
    previousStatus: current.status,
    error: changed ? undefined : 'No rows updated (status may have changed)',
  };
}

/**
 * Reject a proposal — updates status from 'candidate' to 'rejected'.
 */
export async function rejectProposal(
  d1: D1Client,
  proposalKey: string,
): Promise<ProposalActionResult> {
  const current = await getProposal(d1, proposalKey);
  if (!current) {
    return { success: false, proposalKey, action: 'rejected', previousStatus: 'unknown', error: 'Proposal not found' };
  }

  if (current.status === 'rejected') {
    return { success: true, proposalKey, action: 'rejected', previousStatus: 'rejected' };
  }

  const result = await d1.query(
    `UPDATE datapoints
     SET status = 'rejected'
     WHERE proposal_key = ?
       AND status = 'candidate';`,
    [proposalKey]
  );

  const changed = Number(result.meta?.changes || 0) > 0;
  return {
    success: changed,
    proposalKey,
    action: 'rejected',
    previousStatus: current.status,
    error: changed ? undefined : 'No rows updated (status may have changed)',
  };
}
