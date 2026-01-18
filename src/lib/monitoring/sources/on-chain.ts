/**
 * On-Chain Verification Module
 * Verifies BTC holdings directly from the blockchain using public APIs
 *
 * This is the highest-trust data source - blockchain data is immutable and verifiable.
 */

import { SourceCheckResult } from '../types';

interface WalletBalance {
  address: string;
  balance: number; // in BTC
  lastUpdated: Date;
}

interface OnChainVerificationResult {
  totalBalance: number;
  walletBalances: WalletBalance[];
  verified: boolean;
  error?: string;
}

/**
 * Fetch BTC balance for a single address using blockchain.info API
 * Free, no API key required, rate limited
 */
async function fetchBTCBalance(address: string): Promise<number> {
  try {
    // blockchain.info returns balance in satoshis
    const response = await fetch(
      `https://blockchain.info/q/addressbalance/${address}`,
      {
        headers: {
          'Accept': 'text/plain',
          'User-Agent': 'DAT-Tracker/1.0',
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.error(`Blockchain API error for ${address}:`, response.status);
      return 0;
    }

    const satoshis = parseInt(await response.text(), 10);
    return satoshis / 100_000_000; // Convert satoshis to BTC
  } catch (error) {
    console.error(`Error fetching balance for ${address}:`, error);
    return 0;
  }
}

/**
 * Verify total BTC holdings for a company using their known wallet addresses
 */
export async function verifyOnChainHoldings(
  walletAddresses: string[]
): Promise<OnChainVerificationResult> {
  if (!walletAddresses || walletAddresses.length === 0) {
    return {
      totalBalance: 0,
      walletBalances: [],
      verified: false,
      error: 'No wallet addresses provided',
    };
  }

  try {
    // Fetch balances for all addresses (with rate limiting)
    const walletBalances: WalletBalance[] = [];
    let totalBalance = 0;

    for (const address of walletAddresses) {
      // Add small delay between requests to avoid rate limiting
      if (walletBalances.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const balance = await fetchBTCBalance(address);
      walletBalances.push({
        address,
        balance,
        lastUpdated: new Date(),
      });
      totalBalance += balance;
    }

    return {
      totalBalance,
      walletBalances,
      verified: true,
    };
  } catch (error) {
    return {
      totalBalance: 0,
      walletBalances: [],
      verified: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check on-chain holdings for companies with known wallet addresses
 */
export async function checkOnChainForUpdates(
  companies: Array<{
    id: number;
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
    walletAddresses?: string[];
  }>
): Promise<SourceCheckResult[]> {
  const results: SourceCheckResult[] = [];

  // Only check BTC companies with wallet addresses
  const btcCompaniesWithWallets = companies.filter(
    c => c.asset === 'BTC' && c.walletAddresses && c.walletAddresses.length > 0
  );

  for (const company of btcCompaniesWithWallets) {
    const verification = await verifyOnChainHoldings(company.walletAddresses!);

    if (verification.verified && verification.totalBalance > 0) {
      const discrepancyPct = company.holdings > 0
        ? Math.abs((company.holdings - verification.totalBalance) / company.holdings) * 100
        : 100;

      // Only report if there's a meaningful difference (>0.1%)
      if (discrepancyPct > 0.1) {
        results.push({
          sourceType: 'on-chain',
          companyId: company.id,
          ticker: company.ticker,
          asset: company.asset,
          detectedHoldings: verification.totalBalance,
          confidence: 1.0, // On-chain data is 100% accurate
          sourceUrl: `https://blockchain.info/address/${company.walletAddresses![0]}`,
          sourceText: `On-chain verification: ${verification.totalBalance.toLocaleString()} BTC across ${verification.walletBalances.length} wallet(s)`,
          trustLevel: 'official',
        });
      }
    }
  }

  return results;
}

/**
 * Get current on-chain balance for a specific company
 */
export async function getOnChainBalance(
  walletAddresses: string[]
): Promise<{ balance: number; verified: boolean; wallets: WalletBalance[] }> {
  const result = await verifyOnChainHoldings(walletAddresses);
  return {
    balance: result.totalBalance,
    verified: result.verified,
    wallets: result.walletBalances,
  };
}
