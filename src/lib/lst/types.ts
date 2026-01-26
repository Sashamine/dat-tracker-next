/**
 * LST (Liquid Staking Token) Types
 *
 * Defines types for LST exchange rate providers and configurations.
 * Designed to be extensible for future API sources.
 */

import { Asset } from '@/lib/types';

/**
 * LST provider types
 * - contract: Query on-chain contract (ERC-4626 convertToAssets)
 * - api: Query external API endpoint
 * - static: Use hardcoded fallback rate
 */
export type LSTProviderType = 'contract' | 'api' | 'static';

/**
 * Configuration for an LST token
 */
export interface LSTConfig {
  /** Unique identifier for this LST (e.g., "khype", "ihype", "steth") */
  id: string;

  /** Display name (e.g., "Kinetiq kHYPE") */
  name: string;

  /** The underlying asset this LST represents (e.g., "HYPE", "ETH") */
  underlyingAsset: Asset;

  /** Primary provider for exchange rate */
  provider: LSTProvider;

  /** Fallback providers in order of preference */
  fallbacks?: LSTProvider[];

  /** Static fallback rate if all providers fail */
  staticFallbackRate: number;

  /** Cache TTL in milliseconds (default: 1 hour) */
  cacheTtlMs?: number;
}

/**
 * Provider configuration for fetching exchange rate
 */
export type LSTProvider =
  | LSTContractProvider
  | LSTApiProvider
  | LSTStaticProvider;

/**
 * On-chain contract provider (ERC-4626 style)
 */
export interface LSTContractProvider {
  type: 'contract';
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Contract address */
  contractAddress: string;
  /** Chain ID for reference */
  chainId?: number;
  /** Function to call (default: convertToAssets) */
  method?: 'convertToAssets' | 'getExchangeRate' | 'pricePerShare';
}

/**
 * External API provider (for future iHYPE API, etc.)
 */
export interface LSTApiProvider {
  type: 'api';
  /** API endpoint URL */
  endpoint: string;
  /** Optional API key header name */
  apiKeyHeader?: string;
  /** JSON path to extract exchange rate from response */
  ratePath: string;
  /** Optional request headers */
  headers?: Record<string, string>;
}

/**
 * Static rate provider (manual fallback)
 */
export interface LSTStaticProvider {
  type: 'static';
  /** Fixed exchange rate */
  rate: number;
  /** When this rate was last verified */
  asOf: string;
}

/**
 * Result from fetching an LST exchange rate
 */
export interface LSTRateResult {
  /** LST identifier */
  lstId: string;

  /** Exchange rate (1 LST = X underlying) */
  exchangeRate: number;

  /** Which provider was used */
  provider: LSTProviderType;

  /** Provider details (e.g., contract address, API endpoint) */
  providerDetails: string;

  /** When the rate was fetched */
  fetchedAt: Date;

  /** Whether this is a cached result */
  fromCache: boolean;

  /** Error message if fetch failed and using fallback */
  error?: string;
}

/**
 * Cache entry for LST rates
 */
export interface LSTRateCacheEntry {
  rate: number;
  provider: LSTProviderType;
  providerDetails: string;
  fetchedAt: Date;
  expiresAt: Date;
}
