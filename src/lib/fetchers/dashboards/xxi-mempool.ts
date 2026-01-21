/**
 * XXI (Twenty One Capital) Dashboard Fetcher
 *
 * Fetches BTC holdings from XXI's mempool.space wallet tracker.
 * API endpoint: https://xxi.mempool.space/api/v1/wallet/xxi
 *
 * This provides on-chain proof of XXI's Bitcoin holdings.
 */

import { FetchResult, Fetcher } from '../types';

const XXI_WALLET_API = 'https://xxi.mempool.space/api/v1/wallet/xxi';

interface WalletStats {
  funded_txo_count: number;
  funded_txo_sum: number;  // satoshis
  spent_txo_count: number;
  spent_txo_sum: number;   // satoshis
  tx_count: number;
}

interface WalletAddress {
  address: string;
  transactions: Array<{
    txid: string;
    height: number;
    value: number;
    time: number;
  }>;
  stats: WalletStats;
  lastSync: number;
}

type WalletResponse = Record<string, WalletAddress>;

async function fetchWalletData(): Promise<WalletResponse | null> {
  try {
    const response = await fetch(XXI_WALLET_API, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DAT-Tracker/1.0)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[xxi-mempool] API error: ${response.status}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('[xxi-mempool] Error fetching wallet data:', error);
    return null;
  }
}

/**
 * Calculate total BTC balance from wallet addresses
 * Balance = sum of (funded - spent) across all addresses, converted from satoshis to BTC
 */
function calculateTotalBtc(walletData: WalletResponse): number {
  let totalSatoshis = 0;

  for (const [address, data] of Object.entries(walletData)) {
    const balance = data.stats.funded_txo_sum - data.stats.spent_txo_sum;
    totalSatoshis += balance;
  }

  // Convert satoshis to BTC (1 BTC = 100,000,000 satoshis)
  return totalSatoshis / 100_000_000;
}

/**
 * Get the most recent transaction time as the data date
 */
function getMostRecentDate(walletData: WalletResponse): string {
  let latestTime = 0;

  for (const data of Object.values(walletData)) {
    for (const tx of data.transactions) {
      if (tx.time > latestTime) {
        latestTime = tx.time;
      }
    }
  }

  if (latestTime === 0) {
    return new Date().toISOString().split('T')[0];
  }

  return new Date(latestTime * 1000).toISOString().split('T')[0];
}

export const xxiMempoolFetcher: Fetcher = {
  name: 'xxi.mempool.space',

  async fetch(tickers: string[]): Promise<FetchResult[]> {
    // This fetcher only supports XXI
    if (!tickers.includes('XXI')) {
      return [];
    }

    console.log('[xxi-mempool] Fetching XXI wallet data...');
    const results: FetchResult[] = [];
    const fetchedAt = new Date();

    const walletData = await fetchWalletData();
    if (!walletData || Object.keys(walletData).length === 0) {
      console.log('[xxi-mempool] No wallet data returned');
      return results;
    }

    const totalBtc = calculateTotalBtc(walletData);
    const sourceDate = getMostRecentDate(walletData);
    const addressCount = Object.keys(walletData).length;

    console.log(`[xxi-mempool] Found ${addressCount} addresses with ${totalBtc.toFixed(2)} BTC total`);

    // BTC Holdings
    results.push({
      ticker: 'XXI',
      field: 'holdings',
      value: totalBtc,
      source: {
        name: 'xxi.mempool.space',
        url: 'https://xxi.mempool.space',
        date: sourceDate,
      },
      fetchedAt,
      raw: {
        addressCount,
        addresses: Object.keys(walletData),
      },
    });

    console.log(`[xxi-mempool] Got ${results.length} data points for XXI`);
    return results;
  }
};

/**
 * Get list of tickers this fetcher supports
 */
export function getSupportedTickers(): string[] {
  return ['XXI'];
}
