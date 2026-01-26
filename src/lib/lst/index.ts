/**
 * LST Exchange Rate Fetcher
 *
 * Fetches real-time exchange rates for Liquid Staking Tokens (LSTs).
 * Supports multiple providers: on-chain contracts, APIs, and static fallbacks.
 *
 * Usage:
 *   import { getLSTExchangeRate } from '@/lib/lst';
 *   const result = await getLSTExchangeRate('khype');
 *   console.log(result.exchangeRate); // 1.94 (1 kHYPE = 1.94 HYPE)
 */

import {
  LSTConfig,
  LSTRateResult,
  LSTRateCacheEntry,
  LSTContractProvider,
  LSTApiProvider,
} from './types';
import { LST_CONFIGS, getLSTConfig, LST_NAME_MAPPING } from './config';

// In-memory cache for LST rates
const rateCache: Map<string, LSTRateCacheEntry> = new Map();

/**
 * ERC-4626 convertToAssets function selector
 * keccak256("convertToAssets(uint256)") = 0x07a2d13a
 */
const CONVERT_TO_ASSETS_SELECTOR = '0x07a2d13a';

/**
 * Encode convertToAssets(1e18) call data
 * Returns the function selector + 1e18 as 32-byte padded uint256
 */
function encodeConvertToAssetsCall(): string {
  // 1e18 = 1000000000000000000 = 0xDE0B6B3A7640000
  // Pad to 32 bytes (64 hex chars)
  const amount = '0000000000000000000000000000000000000000000000000de0b6b3a7640000';
  return CONVERT_TO_ASSETS_SELECTOR + amount;
}

/**
 * Parse uint256 result from eth_call response
 */
function parseUint256Result(hexResult: string): bigint {
  // Remove 0x prefix if present
  const cleaned = hexResult.startsWith('0x') ? hexResult.slice(2) : hexResult;
  return BigInt('0x' + cleaned);
}

/**
 * Fetch exchange rate from on-chain contract (ERC-4626)
 */
async function fetchFromContract(
  provider: LSTContractProvider
): Promise<number> {
  const callData = encodeConvertToAssetsCall();

  const response = await fetch(provider.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [
        {
          to: provider.contractAddress,
          data: callData,
        },
        'latest',
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`RPC request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(`RPC error: ${json.error.message || JSON.stringify(json.error)}`);
  }

  if (!json.result || json.result === '0x') {
    throw new Error('Empty result from contract call');
  }

  // Parse result: convertToAssets(1e18) returns how many underlying tokens 1e18 shares are worth
  const resultBigInt = parseUint256Result(json.result);

  // Convert to decimal (both LST and underlying typically have 18 decimals)
  // Result is in wei, divide by 1e18 to get the exchange rate
  const exchangeRate = Number(resultBigInt) / 1e18;

  // Sanity check: rate should be >= 1 (LSTs accrue value)
  if (exchangeRate < 0.5 || exchangeRate > 100) {
    throw new Error(`Suspicious exchange rate: ${exchangeRate}`);
  }

  return exchangeRate;
}

/**
 * Fetch exchange rate from external API
 */
async function fetchFromApi(
  provider: LSTApiProvider
): Promise<number> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...provider.headers,
  };

  // Add API key if configured (would come from env var)
  if (provider.apiKeyHeader) {
    const apiKey = process.env[`LST_API_KEY_${provider.apiKeyHeader.toUpperCase().replace(/-/g, '_')}`];
    if (apiKey) {
      headers[provider.apiKeyHeader] = apiKey;
    }
  }

  const response = await fetch(provider.endpoint, { headers });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();

  // Extract rate using JSON path (e.g., "data.exchangeRate")
  const pathParts = provider.ratePath.split('.');
  let value: unknown = json;
  for (const part of pathParts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      throw new Error(`Could not find rate at path: ${provider.ratePath}`);
    }
  }

  const rate = Number(value);
  if (isNaN(rate) || rate <= 0) {
    throw new Error(`Invalid rate value: ${value}`);
  }

  return rate;
}

/**
 * Get exchange rate for an LST token
 *
 * @param lstIdOrName - LST identifier (e.g., "khype") or name (e.g., "Kinetiq stHYPE")
 * @param forceRefresh - Skip cache and fetch fresh rate
 * @returns Exchange rate result with provider info
 */
export async function getLSTExchangeRate(
  lstIdOrName: string,
  forceRefresh = false
): Promise<LSTRateResult> {
  const config = getLSTConfig(lstIdOrName);

  if (!config) {
    // Return static fallback for unknown LSTs
    return {
      lstId: lstIdOrName,
      exchangeRate: 1.0,
      provider: 'static',
      providerDetails: 'Unknown LST - using 1:1 rate',
      fetchedAt: new Date(),
      fromCache: false,
      error: `Unknown LST: ${lstIdOrName}`,
    };
  }

  // Check cache first
  if (!forceRefresh) {
    const cached = rateCache.get(config.id);
    if (cached && cached.expiresAt > new Date()) {
      return {
        lstId: config.id,
        exchangeRate: cached.rate,
        provider: cached.provider,
        providerDetails: cached.providerDetails,
        fetchedAt: cached.fetchedAt,
        fromCache: true,
      };
    }
  }

  // Try primary provider
  const providers = [config.provider, ...(config.fallbacks || [])];
  let lastError: string | undefined;

  for (const provider of providers) {
    try {
      let rate: number;
      let providerDetails: string;

      switch (provider.type) {
        case 'contract':
          rate = await fetchFromContract(provider);
          providerDetails = `Contract ${provider.contractAddress} via ${provider.rpcUrl}`;
          break;

        case 'api':
          rate = await fetchFromApi(provider);
          providerDetails = `API ${provider.endpoint}`;
          break;

        case 'static':
          rate = provider.rate;
          providerDetails = `Static rate as of ${provider.asOf}`;
          break;

        default:
          continue;
      }

      // Cache the result
      const fetchedAt = new Date();
      const cacheTtl = config.cacheTtlMs || 60 * 60 * 1000; // Default 1 hour
      rateCache.set(config.id, {
        rate,
        provider: provider.type,
        providerDetails,
        fetchedAt,
        expiresAt: new Date(fetchedAt.getTime() + cacheTtl),
      });

      return {
        lstId: config.id,
        exchangeRate: rate,
        provider: provider.type,
        providerDetails,
        fetchedAt,
        fromCache: false,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.warn(`[LST] Failed to fetch ${config.id} from ${provider.type}:`, lastError);
      // Continue to next provider
    }
  }

  // All providers failed - use static fallback
  console.warn(`[LST] All providers failed for ${config.id}, using static fallback`);
  return {
    lstId: config.id,
    exchangeRate: config.staticFallbackRate,
    provider: 'static',
    providerDetails: 'Static fallback (all providers failed)',
    fetchedAt: new Date(),
    fromCache: false,
    error: lastError,
  };
}

/**
 * Get exchange rates for multiple LSTs
 */
export async function getLSTExchangeRates(
  lstIds: string[],
  forceRefresh = false
): Promise<Map<string, LSTRateResult>> {
  const results = new Map<string, LSTRateResult>();

  // Fetch all rates in parallel
  const promises = lstIds.map(async (id) => {
    const result = await getLSTExchangeRate(id, forceRefresh);
    return { id, result };
  });

  const resolved = await Promise.all(promises);
  for (const { id, result } of resolved) {
    results.set(id, result);
  }

  return results;
}

/**
 * Clear the rate cache (useful for testing or forcing refresh)
 */
export function clearLSTCache(): void {
  rateCache.clear();
}

/**
 * Get all supported LST IDs
 */
export function getSupportedLSTIds(): string[] {
  return Object.keys(LST_CONFIGS);
}

/**
 * Resolve LST name to config ID
 * Used when company data has a display name like "Kinetiq stHYPE"
 */
export function resolveLSTId(nameOrId: string): string | undefined {
  // Direct ID match
  if (LST_CONFIGS[nameOrId.toLowerCase()]) {
    return nameOrId.toLowerCase();
  }

  // Name mapping
  return LST_NAME_MAPPING[nameOrId];
}

// Re-export types and config
export * from './types';
export { getLSTConfig, LST_CONFIGS, LST_NAME_MAPPING } from './config';
