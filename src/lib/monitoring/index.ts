/**
 * Monitoring System Orchestrator
 * Coordinates all monitoring sources and handles the update workflow
 */

import { query } from '@/lib/db';
import { allCompanies } from '@/lib/data/companies';
import {
  MonitoringConfig,
  MonitoringResult,
  SourceCheckResult,
  PendingUpdate,
  MonitoringRun,
  SocialSource,
} from './types';
import { checkBTCTreasuriesDiscrepancies } from './sources/btc-treasuries';
import { checkSECFilingsForUpdates, checkSECFilingsEnhanced } from './sources/sec-edgar';
import { checkTwitterForUpdates, createGrokConfig } from './sources/twitter';
import { checkIRPages } from './sources/ir-pages';
import { checkHoldingsPages } from './sources/holdings-pages';
import { checkAggregatorsForUpdates, getAggregatorOnlyCompanies } from './sources/aggregators';
import { getSECMonitoredCompanies, getCompanySource } from './sources/company-sources';
import { extractHoldingsFromText, createLLMConfigFromEnv, validateExtraction } from './parsers/llm-extractor';
import { evaluateAutoApproval, checkForDuplicates, getApprovalSummary } from './workflow/approval';
import {
  createDiscordNotificationService,
  buildHoldingsUpdateEmbed,
  buildStaleDataEmbed,
  buildDiscrepancyEmbed,
  buildRunSummaryEmbed,
  buildErrorEmbed,
} from './notifications/discord';
import { calculateStaleness } from '@/lib/holdings-verification';

/**
 * Get companies from database/static data with their IDs
 */
async function getCompaniesToMonitor(companyIds?: number[]) {
  // For now, use static data with generated IDs
  // In production, this would query the database
  const companies = allCompanies.map((c, index) => ({
    id: index + 1,
    ticker: c.ticker,
    name: c.name,
    asset: c.asset,
    holdings: c.holdings,
    holdingsLastUpdated: c.holdingsLastUpdated,
  }));

  if (companyIds && companyIds.length > 0) {
    return companies.filter(c => companyIds.includes(c.id));
  }

  return companies;
}

/**
 * Get social sources from database
 */
async function getSocialSources(): Promise<SocialSource[]> {
  try {
    const rows = await query(`
      SELECT
        id,
        company_id as "companyId",
        platform,
        account_handle as "accountHandle",
        account_type as "accountType",
        trust_level as "trustLevel",
        keywords,
        is_active as "isActive",
        last_checked as "lastChecked",
        last_post_id as "lastPostId"
      FROM social_sources
      WHERE is_active = true
    `);
    return rows || [];
  } catch (error) {
    console.error('Error fetching social sources:', error);
    return [];
  }
}

/**
 * Get existing pending updates from database
 */
async function getExistingPendingUpdates() {
  try {
    const rows = await query(`
      SELECT
        company_id as "companyId",
        detected_holdings as "detectedHoldings",
        source_type as "sourceType",
        status,
        created_at as "createdAt"
      FROM pending_updates
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    return rows || [];
  } catch (error) {
    console.error('Error fetching pending updates:', error);
    return [];
  }
}

/**
 * Create a monitoring run record
 */
async function createMonitoringRun(runType: string): Promise<number> {
  try {
    const rows = await query(`
      INSERT INTO monitoring_runs (run_type, started_at, status)
      VALUES ($1, NOW(), 'running')
      RETURNING id
    `, [runType]);
    return rows[0]?.id || 0;
  } catch (error) {
    console.error('Error creating monitoring run:', error);
    return 0;
  }
}

/**
 * Update monitoring run with results
 */
async function updateMonitoringRun(
  runId: number,
  status: 'completed' | 'failed',
  stats: Partial<MonitoringRun>
) {
  try {
    await query(`
      UPDATE monitoring_runs
      SET
        completed_at = NOW(),
        duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
        status = $1,
        sources_checked = $2,
        companies_checked = $3,
        updates_detected = $4,
        updates_auto_approved = $5,
        updates_pending_review = $6,
        notifications_sent = $7,
        errors_count = $8,
        error_details = $9
      WHERE id = $10
    `, [
      status,
      stats.sourcesChecked || 0,
      stats.companiesChecked || 0,
      stats.updatesDetected || 0,
      stats.updatesAutoApproved || 0,
      stats.updatesPendingReview || 0,
      stats.notificationsSent || 0,
      stats.errorsCount || 0,
      stats.errorDetails ? JSON.stringify(stats.errorDetails) : null,
      runId,
    ]);
  } catch (error) {
    console.error('Error updating monitoring run:', error);
  }
}

/**
 * Create a pending update record
 */
async function createPendingUpdate(
  update: Partial<PendingUpdate>,
  monitoringRunId: number
): Promise<number> {
  try {
    const rows = await query(`
      INSERT INTO pending_updates (
        company_id, detected_holdings, detected_shares_outstanding,
        previous_holdings, confidence_score, source_type, source_url,
        source_text, source_date, trust_level, llm_model,
        extraction_reasoning, status, auto_approved, auto_approve_reason,
        monitoring_run_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id
    `, [
      update.companyId,
      update.detectedHoldings,
      update.detectedSharesOutstanding,
      update.previousHoldings,
      update.confidenceScore,
      update.sourceType,
      update.sourceUrl,
      update.sourceText?.substring(0, 10000), // Limit text size
      update.sourceDate,
      update.trustLevel,
      update.llmModel,
      update.extractionReasoning,
      update.status || 'pending',
      update.autoApproved || false,
      update.autoApproveReason,
      monitoringRunId,
    ]);
    return rows[0]?.id || 0;
  } catch (error) {
    console.error('Error creating pending update:', error);
    return 0;
  }
}

/**
 * Approve a pending update (creates holdings snapshot)
 */
async function approvePendingUpdate(updateId: number, reviewer: string, notes?: string) {
  try {
    await query(`SELECT approve_pending_update($1, $2, $3)`, [updateId, reviewer, notes]);
  } catch (error) {
    console.error('Error approving pending update:', error);
    throw error;
  }
}

/**
 * Main monitoring agent function
 */
export async function runMonitoringAgent(
  config: MonitoringConfig
): Promise<MonitoringResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  // Create monitoring run record
  const runId = await createMonitoringRun(config.runType);

  // Initialize services
  const discord = createDiscordNotificationService();
  const llmConfig = createLLMConfigFromEnv();
  const grokConfig = createGrokConfig();

  // Get companies and existing data
  const companies = await getCompaniesToMonitor(config.companyIds);
  const socialSources = await getSocialSources();
  const existingUpdates = await getExistingPendingUpdates();

  // Calculate since date (check last 24 hours)
  const sinceDate = new Date();
  sinceDate.setHours(sinceDate.getHours() - 24);

  let updatesDetected = 0;
  let updatesAutoApproved = 0;
  let updatesPendingReview = 0;
  let notificationsSent = 0;
  let sourcesChecked = 0;

  const allResults: SourceCheckResult[] = [];

  try {
    // === PRIMARY SOURCES (Official/Verified) ===

    // 1. Check SEC EDGAR (for US companies) - highest trust
    if (config.sources.includes('sec_edgar')) {
      sourcesChecked++;
      console.log('[Monitoring] Checking SEC EDGAR filings...');
      const usCompanies = companies.filter(c =>
        !c.ticker.includes('.') // Simple heuristic for US tickers
      );

      if (usCompanies.length > 0) {
        const secResults = await checkSECFilingsForUpdates(usCompanies, sinceDate);
        allResults.push(...secResults);
      }
    }

    // 2. Check Direct Holdings Pages (KULR tracker, Metaplanet, etc.) - official company data
    if (config.sources.includes('holdings_pages')) {
      sourcesChecked++;
      console.log('[Monitoring] Checking holdings pages...');
      const holdingsResults = await checkHoldingsPages(companies);
      allResults.push(...holdingsResults);
    }

    // 3. Check IR Pages (company investor relations pages) - official announcements
    if (config.sources.includes('ir_pages')) {
      sourcesChecked++;
      console.log('[Monitoring] Checking IR pages...');
      const irResults = await checkIRPages(companies, sinceDate);
      allResults.push(...irResults);
    }

    // === SECONDARY SOURCES ===

    // 4. Check Twitter (if Grok is configured and we have social sources)
    if (config.sources.includes('twitter') && grokConfig && socialSources.length > 0) {
      sourcesChecked++;
      console.log('[Monitoring] Checking Twitter...');
      const twitterResults = await checkTwitterForUpdates(
        companies,
        socialSources,
        sinceDate,
        grokConfig
      );
      allResults.push(...twitterResults);
    }

    // === AGGREGATORS (Verification/Fallback only) ===

    // 5. Check Aggregators (Bitbo, BitcoinTreasuries.net)
    if (config.sources.includes('aggregators')) {
      sourcesChecked++;
      console.log('[Monitoring] Checking aggregators (Bitbo, BitcoinTreasuries.net)...');
      const aggResults = await checkAggregatorsForUpdates(companies);
      allResults.push(...aggResults);
    }

    // 6. Check BTC Treasuries API (aggregator - for discrepancy detection)
    if (config.sources.includes('btc_treasuries')) {
      sourcesChecked++;
      console.log('[Monitoring] Checking BTC Treasuries for discrepancies...');
      const btcCompanies = companies.filter(c => c.asset === 'BTC');

      if (btcCompanies.length > 0) {
        // Only use for discrepancy detection, not as primary source
        const discrepancies = await checkBTCTreasuriesDiscrepancies(btcCompanies);
        for (const disc of discrepancies.filter(d => d.discrepancyPct > 5)) {
          if (discord) {
            await discord.sendDiscrepancyWarning({
              companyName: disc.companyName,
              ticker: disc.ticker,
              asset: 'BTC',
              ourHoldings: disc.ourHoldings,
              externalHoldings: disc.externalHoldings,
              externalSource: disc.externalSource,
              discrepancyPct: disc.discrepancyPct,
            });
            notificationsSent++;
          }
        }
      }
    }

    // 7. Process all results
    for (const result of allResults) {
      const company = companies.find(c => c.id === result.companyId);
      if (!company) continue;

      // Check for duplicates
      const dupCheck = checkForDuplicates(
        {
          companyId: result.companyId,
          detectedHoldings: result.detectedHoldings || 0,
          sourceType: result.sourceType,
        },
        existingUpdates.map(u => ({
          ...u,
          createdAt: new Date(u.createdAt),
        }))
      );

      if (dupCheck.isDuplicate) {
        continue;
      }

      // If no holdings detected yet (SEC/Twitter), use LLM to extract
      let detectedHoldings = result.detectedHoldings;
      let confidence = result.confidence;
      let reasoning = '';

      if (detectedHoldings === undefined && result.sourceText && llmConfig) {
        const extraction = await extractHoldingsFromText(
          result.sourceText,
          {
            companyName: company.name,
            ticker: company.ticker,
            asset: company.asset,
            currentHoldings: company.holdings,
          },
          llmConfig
        );

        detectedHoldings = extraction.holdings || undefined;
        confidence = extraction.confidence;
        reasoning = extraction.reasoning;

        // Validate extraction
        if (detectedHoldings !== undefined) {
          const validation = validateExtraction(extraction, {
            companyName: company.name,
            ticker: company.ticker,
            asset: company.asset,
            currentHoldings: company.holdings,
          });

          if (!validation.valid) {
            reasoning += ` [Validation issues: ${validation.issues.join(', ')}]`;
            confidence *= 0.7; // Reduce confidence
          }
        }
      }

      // Skip if no holdings found
      if (detectedHoldings === undefined || detectedHoldings === company.holdings) {
        continue;
      }

      updatesDetected++;

      // Evaluate auto-approval
      const approval = evaluateAutoApproval(
        {
          detectedHoldings,
          confidenceScore: confidence,
          sourceType: result.sourceType,
          trustLevel: result.trustLevel,
        },
        { id: company.id, ticker: company.ticker, holdings: company.holdings }
      );

      // Create pending update
      const updateId = await createPendingUpdate(
        {
          companyId: company.id,
          detectedHoldings,
          previousHoldings: company.holdings,
          confidenceScore: confidence,
          sourceType: result.sourceType,
          sourceUrl: result.sourceUrl,
          sourceText: result.sourceText,
          sourceDate: result.sourceDate,
          trustLevel: result.trustLevel,
          llmModel: llmConfig?.model,
          extractionReasoning: reasoning,
          autoApproved: approval.shouldAutoApprove,
          autoApproveReason: approval.reason,
          status: approval.shouldAutoApprove ? 'approved' : 'pending',
        },
        runId
      );

      // Auto-approve if appropriate
      if (approval.shouldAutoApprove && updateId) {
        try {
          await approvePendingUpdate(updateId, 'system', approval.reason);
          updatesAutoApproved++;
        } catch (error) {
          errors.push(`Failed to auto-approve update ${updateId}: ${error}`);
        }
      } else {
        updatesPendingReview++;
      }

      // Send Discord notification
      if (discord && updateId) {
        await discord.sendHoldingsUpdate({
          companyName: company.name,
          ticker: company.ticker,
          asset: company.asset,
          previousHoldings: company.holdings,
          newHoldings: detectedHoldings,
          sourceType: result.sourceType,
          sourceUrl: result.sourceUrl,
          confidence,
          autoApproved: approval.shouldAutoApprove,
          reasoning: reasoning || approval.reason,
        });
        notificationsSent++;
      }
    }

    // 5. Check for stale data and send alert
    const staleCompanies = companies
      .map(c => ({
        ticker: c.ticker,
        asset: c.asset,
        daysOld: c.holdingsLastUpdated
          ? Math.floor((Date.now() - new Date(c.holdingsLastUpdated).getTime()) / (1000 * 60 * 60 * 24))
          : 999,
        source: 'unknown',
      }))
      .filter(c => c.daysOld > 7);

    if (staleCompanies.length > 0 && discord) {
      await discord.sendStaleDataAlert({ companies: staleCompanies });
      notificationsSent++;
    }

    // Update monitoring run
    await updateMonitoringRun(runId, 'completed', {
      sourcesChecked,
      companiesChecked: companies.length,
      updatesDetected,
      updatesAutoApproved,
      updatesPendingReview,
      notificationsSent,
      errorsCount: errors.length,
      errorDetails: errors.length > 0 ? { errors } : undefined,
    });

    // Send run summary
    if (discord && (updatesDetected > 0 || errors.length > 0)) {
      await discord.sendRunSummary({
        runType: config.runType,
        duration: Date.now() - startTime,
        sourcesChecked,
        updatesDetected,
        updatesAutoApproved,
        updatesPendingReview,
        errors: errors.length,
      });
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    errors.push(errorMsg);

    await updateMonitoringRun(runId, 'failed', {
      sourcesChecked,
      companiesChecked: companies.length,
      updatesDetected,
      updatesAutoApproved,
      updatesPendingReview,
      notificationsSent,
      errorsCount: errors.length,
      errorDetails: { errors },
    });

    if (discord) {
      await discord.sendError({
        title: 'Monitoring Run Failed',
        error: errorMsg,
        context: `Run ID: ${runId}, Type: ${config.runType}`,
      });
    }
  }

  return {
    runId,
    duration: Date.now() - startTime,
    sourcesChecked,
    companiesChecked: companies.length,
    updatesDetected,
    updatesAutoApproved,
    updatesPendingReview,
    notificationsSent,
    errors,
  };
}

/**
 * Get monitoring system status
 */
export async function getMonitoringStatus() {
  try {
    const [lastRunRows, pendingCountRows, recentRunsRows] = await Promise.all([
      query(`
        SELECT * FROM monitoring_runs
        ORDER BY started_at DESC
        LIMIT 1
      `),
      query(`
        SELECT COUNT(*) as count FROM pending_updates
        WHERE status = 'pending'
      `),
      query(`
        SELECT * FROM monitoring_runs
        ORDER BY started_at DESC
        LIMIT 10
      `),
    ]);

    return {
      lastRun: lastRunRows[0] || null,
      pendingUpdates: parseInt((pendingCountRows[0] as any)?.count || '0'),
      recentRuns: recentRunsRows || [],
    };
  } catch (error) {
    console.error('Error getting monitoring status:', error);
    return { lastRun: null, pendingUpdates: 0, recentRuns: [] };
  }
}
