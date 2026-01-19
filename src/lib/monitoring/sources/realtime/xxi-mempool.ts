/**
 * XXI (Twenty One Capital) Mempool Source
 *
 * Fetches real-time Bitcoin holdings from XXI's proof-of-reserves page
 * powered by mempool.space.
 *
 * API: https://xxi.mempool.space/api/v1/wallet/xxi
 * Returns all wallet addresses with their transaction history and balances.
 */

import { query } from '@/lib/db';

interface WalletStats {
  funded_txo_count: number;
  funded_txo_sum: number;  // Total received in satoshis
  spent_txo_count: number;
  spent_txo_sum: number;   // Total spent in satoshis
  tx_count: number;
}

interface WalletAddress {
  address: string;
  transactions: unknown[];
  stats: WalletStats;
  lastSync: number;
}

interface XXIWalletResponse {
  [address: string]: WalletAddress;
}

interface XXIHoldingsResult {
  holdings: number;           // Total BTC
  holdingsSats: number;       // Total satoshis
  addressCount: number;       // Number of addresses
  addresses: {
    address: string;
    balanceSats: number;
    balanceBtc: number;
  }[];
  timestamp: Date;
  sourceUrl: string;
}

const XXI_API_URL = 'https://xxi.mempool.space/api/v1/wallet/xxi';
const SATS_PER_BTC = 100_000_000;

/**
 * Fetch XXI wallet data from mempool API
 */
async function fetchXXIWalletData(): Promise<XXIWalletResponse | null> {
  try {
    const response = await fetch(XXI_API_URL, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error(`[XXI Mempool] API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[XXI Mempool] Error fetching wallet data:', error);
    return null;
  }
}

/**
 * Calculate total BTC holdings from wallet data
 */
function calculateHoldings(walletData: XXIWalletResponse): XXIHoldingsResult {
  const addresses: XXIHoldingsResult['addresses'] = [];
  let totalSats = 0;

  for (const [address, data] of Object.entries(walletData)) {
    const balanceSats = data.stats.funded_txo_sum - data.stats.spent_txo_sum;

    if (balanceSats > 0) {
      addresses.push({
        address,
        balanceSats,
        balanceBtc: balanceSats / SATS_PER_BTC,
      });
      totalSats += balanceSats;
    }
  }

  // Sort by balance descending
  addresses.sort((a, b) => b.balanceSats - a.balanceSats);

  return {
    holdings: totalSats / SATS_PER_BTC,
    holdingsSats: totalSats,
    addressCount: addresses.length,
    addresses,
    timestamp: new Date(),
    sourceUrl: 'https://xxi.mempool.space',
  };
}

/**
 * Get current XXI holdings
 */
export async function getXXIHoldings(): Promise<XXIHoldingsResult | null> {
  console.log('[XXI Mempool] Fetching holdings...');

  const walletData = await fetchXXIWalletData();
  if (!walletData) {
    return null;
  }

  const result = calculateHoldings(walletData);
  console.log(`[XXI Mempool] Total holdings: ${result.holdings.toLocaleString()} BTC across ${result.addressCount} addresses`);

  return result;
}

/**
 * Record XXI holdings event to database
 */
export async function recordXXIHoldingsEvent(): Promise<{
  success: boolean;
  holdings?: number;
  changed?: boolean;
  error?: string;
}> {
  try {
    const result = await getXXIHoldings();
    if (!result) {
      return { success: false, error: 'Failed to fetch XXI holdings' };
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
      'XXI',
      result.holdings,
      'mempool',
      result.sourceUrl,
      'xxi',
      1.0,  // On-chain = highest confidence
      result.timestamp.toISOString(),
      JSON.stringify({
        holdingsSats: result.holdingsSats,
        addressCount: result.addressCount,
        topAddresses: result.addresses.slice(0, 5),
      }),
    ]);

    const eventId = eventResult[0]?.event_id;
    const changed = eventId !== null;

    if (changed) {
      console.log(`[XXI Mempool] Recorded event #${eventId}: ${result.holdings.toLocaleString()} BTC`);
    } else {
      console.log(`[XXI Mempool] No change detected, skipping event`);
    }

    return {
      success: true,
      holdings: result.holdings,
      changed,
    };
  } catch (error) {
    console.error('[XXI Mempool] Error recording event:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Poll XXI holdings (called by cron job)
 */
export async function pollXXIHoldings(): Promise<void> {
  const result = await recordXXIHoldingsEvent();

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
      WHERE source_id = 'xxi' AND source_type = 'mempool'
    `, [result.holdings]);
  } else {
    await query(`
      UPDATE realtime_sources
      SET
        last_polled_at = NOW(),
        error_count = error_count + 1,
        last_error = $1,
        updated_at = NOW()
      WHERE source_id = 'xxi' AND source_type = 'mempool'
    `, [result.error]);
  }
}
