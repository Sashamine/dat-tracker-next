/**
 * KULR Bitcoin Treasury Tracker Source
 *
 * Fetches holdings from the independent KULR Bitcoin Treasury Tracker.
 * Data is parsed from SEC filings and press releases.
 *
 * API: https://kulrbitcointracker.com/api/holdings
 */

import { query } from '@/lib/db';

interface KULRHoldingsResponse {
  ok: boolean;
  data: {
    asOfDate: string;           // ISO date of last update
    btcTotal: string;           // Total BTC holdings
    totalUsdCost: string;       // Total cost basis in USD
    btcSpotUsd: string;         // Current BTC spot price
    markToMarketUsd: string;    // Current USD value
    pnlUsd: string;             // Unrealized P&L
    wacUsd: string;             // Weighted average cost per BTC
  };
}

interface KULRHoldingsResult {
  holdings: number;
  costBasisUsd: number;
  weightedAvgCost: number;
  currentValueUsd: number;
  unrealizedPnlUsd: number;
  btcSpotPrice: number;
  asOfDate: Date;
  sourceUrl: string;
}

const KULR_API_URL = 'https://kulrbitcointracker.com/api/holdings';

/**
 * Fetch KULR holdings from the tracker API
 */
async function fetchKULRHoldings(): Promise<KULRHoldingsResponse | null> {
  try {
    const response = await fetch(KULR_API_URL, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[KULR Tracker] API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[KULR Tracker] Error fetching holdings:', error);
    return null;
  }
}

/**
 * Get current KULR holdings
 */
export async function getKULRHoldings(): Promise<KULRHoldingsResult | null> {
  console.log('[KULR Tracker] Fetching holdings...');

  const response = await fetchKULRHoldings();
  if (!response || !response.ok || !response.data) {
    console.error('[KULR Tracker] Invalid response');
    return null;
  }

  const data = response.data;
  const result: KULRHoldingsResult = {
    holdings: parseFloat(data.btcTotal),
    costBasisUsd: parseFloat(data.totalUsdCost),
    weightedAvgCost: parseFloat(data.wacUsd),
    currentValueUsd: parseFloat(data.markToMarketUsd),
    unrealizedPnlUsd: parseFloat(data.pnlUsd),
    btcSpotPrice: parseFloat(data.btcSpotUsd),
    asOfDate: new Date(data.asOfDate),
    sourceUrl: 'https://kulrbitcointracker.com',
  };

  console.log(`[KULR Tracker] Holdings: ${result.holdings.toLocaleString()} BTC (as of ${result.asOfDate.toISOString().split('T')[0]})`);

  return result;
}

/**
 * Record KULR holdings event to database
 */
export async function recordKULRHoldingsEvent(): Promise<{
  success: boolean;
  holdings?: number;
  changed?: boolean;
  error?: string;
}> {
  try {
    const result = await getKULRHoldings();
    if (!result) {
      return { success: false, error: 'Failed to fetch KULR holdings' };
    }

    // Insert holdings event using the database function
    const eventResult = await query(`
      SELECT insert_holdings_event(
        $1::VARCHAR,      -- ticker
        $2::DECIMAL,      -- holdings
        $3::holdings_source,  -- source_type
        $4::VARCHAR,      -- source_url
        $5::VARCHAR,      -- source_id
        $6::DECIMAL,      -- confidence
        $7::TIMESTAMPTZ,  -- event_time
        $8::JSONB         -- raw_data
      ) as event_id
    `, [
      'KULR',
      result.holdings,
      'tracker',
      result.sourceUrl,
      'kulrbitcointracker',
      0.95,  // High confidence - data from SEC filings, but not on-chain
      result.asOfDate.toISOString(),
      JSON.stringify({
        costBasisUsd: result.costBasisUsd,
        weightedAvgCost: result.weightedAvgCost,
        currentValueUsd: result.currentValueUsd,
        unrealizedPnlUsd: result.unrealizedPnlUsd,
        btcSpotPrice: result.btcSpotPrice,
      }),
    ]);

    const eventId = eventResult[0]?.event_id;
    const changed = eventId !== null;

    if (changed) {
      console.log(`[KULR Tracker] Recorded event #${eventId}: ${result.holdings.toLocaleString()} BTC`);
    } else {
      console.log(`[KULR Tracker] No change detected, skipping event`);
    }

    return {
      success: true,
      holdings: result.holdings,
      changed,
    };
  } catch (error) {
    console.error('[KULR Tracker] Error recording event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Poll KULR holdings (called by cron job)
 */
export async function pollKULRHoldings(): Promise<void> {
  const result = await recordKULRHoldingsEvent();

  // Update realtime_sources tracking
  if (result.success) {
    await query(`
      UPDATE realtime_sources
      SET
        last_polled_at = NOW(),
        last_holdings = $1,
        error_count = 0,
        last_error = NULL,
        updated_at = NOW()
      WHERE source_id = 'kulrbitcointracker' AND source_type = 'tracker'
    `, [result.holdings]);
  } else {
    await query(`
      UPDATE realtime_sources
      SET
        last_polled_at = NOW(),
        error_count = error_count + 1,
        last_error = $1,
        updated_at = NOW()
      WHERE source_id = 'kulrbitcointracker' AND source_type = 'tracker'
    `, [result.error]);
  }
}
