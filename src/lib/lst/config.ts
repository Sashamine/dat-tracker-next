/**
 * LST Configuration
 *
 * Registry of all supported LST tokens and their rate providers.
 * Add new LSTs here as they're supported.
 */

import { LSTConfig } from './types';

/**
 * Hyperliquid EVM RPC endpoint
 * Rate limit: 100 requests/minute per IP
 * See: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/hyperevm
 */
export const HYPERLIQUID_RPC = 'https://rpc.hyperliquid.xyz/evm';

/**
 * kHYPE - Kinetiq's public liquid staking token
 * Contract: 0xfD739d4e423301CE9385c1fb8850539D657C296D
 * Uses ERC-4626 vault standard with convertToAssets()
 *
 * Also used as proxy rate for iHYPE (institutional) since:
 * - Same underlying Hyperliquid staking yield (~2.2% APY)
 * - Same Kinetiq protocol architecture
 * - iHYPE contract not publicly disclosed
 */
export const KHYPE_CONFIG: LSTConfig = {
  id: 'khype',
  name: 'Kinetiq kHYPE',
  underlyingAsset: 'HYPE',
  provider: {
    type: 'contract',
    rpcUrl: HYPERLIQUID_RPC,
    contractAddress: '0xfD739d4e423301CE9385c1fb8850539D657C296D',
    chainId: 999, // Hyperliquid mainnet
    method: 'convertToAssets',
  },
  // Future: Add Kinetiq API when available
  // fallbacks: [
  //   {
  //     type: 'api',
  //     endpoint: 'https://api.kinetiq.xyz/v1/rates/khype',
  //     ratePath: 'data.exchangeRate',
  //   },
  // ],
  staticFallbackRate: 1.94, // Last verified rate (will be updated dynamically)
  cacheTtlMs: 60 * 60 * 1000, // 1 hour (rate only changes daily)
};

/**
 * iHYPE - Kinetiq's institutional liquid staking token
 *
 * PLACEHOLDER for future API integration.
 * Currently uses kHYPE rate as proxy since:
 * - Same underlying yield mechanics
 * - Same protocol architecture
 * - iHYPE contract is private (gated institutional product)
 *
 * When Kinetiq releases their API, update this config:
 * provider: {
 *   type: 'api',
 *   endpoint: 'https://api.kinetiq.xyz/v1/institutional/rates/ihype',
 *   apiKeyHeader: 'X-Kinetiq-API-Key',
 *   ratePath: 'data.exchangeRate',
 * }
 */
export const IHYPE_CONFIG: LSTConfig = {
  id: 'ihype',
  name: 'Kinetiq iHYPE (Institutional)',
  underlyingAsset: 'HYPE',
  // Use kHYPE contract as proxy until iHYPE API is available
  provider: {
    type: 'contract',
    rpcUrl: HYPERLIQUID_RPC,
    contractAddress: '0xfD739d4e423301CE9385c1fb8850539D657C296D', // kHYPE as proxy
    chainId: 999,
    method: 'convertToAssets',
  },
  // TODO: Add iHYPE API when Kinetiq releases it
  // provider: {
  //   type: 'api',
  //   endpoint: 'https://api.kinetiq.xyz/v1/institutional/rates',
  //   apiKeyHeader: 'X-Kinetiq-API-Key',
  //   ratePath: 'data.ihype.exchangeRate',
  // },
  staticFallbackRate: 1.94,
  cacheTtlMs: 60 * 60 * 1000, // 1 hour
};

/**
 * HiHYPE - Hyperion DeFi's institutional iHYPE wrapper
 *
 * Uses iHYPE rate since it's the same underlying mechanism.
 * Hyperion gets a custom ticker (HiHYPE) but same exchange rate.
 */
export const HIHYPE_CONFIG: LSTConfig = {
  id: 'hihype',
  name: 'Hyperion iHYPE (HiHYPE)',
  underlyingAsset: 'HYPE',
  // Same as iHYPE - uses kHYPE contract as proxy
  provider: {
    type: 'contract',
    rpcUrl: HYPERLIQUID_RPC,
    contractAddress: '0xfD739d4e423301CE9385c1fb8850539D657C296D',
    chainId: 999,
    method: 'convertToAssets',
  },
  staticFallbackRate: 1.94,
  cacheTtlMs: 60 * 60 * 1000,
};

/**
 * All registered LST configurations
 */
export const LST_CONFIGS: Record<string, LSTConfig> = {
  'khype': KHYPE_CONFIG,
  'ihype': IHYPE_CONFIG,
  'hihype': HIHYPE_CONFIG,
  // Future LSTs:
  // 'steth': STETH_CONFIG,
  // 'jitosol': JITOSOL_CONFIG,
};

/**
 * Mapping from company cryptoInvestment names to LST config IDs
 * Used to match company data with the correct LST rate provider
 */
export const LST_NAME_MAPPING: Record<string, string> = {
  'Kinetiq stHYPE': 'khype',    // Generic name used in our data
  'Kinetiq kHYPE': 'khype',
  'Kinetiq iHYPE': 'ihype',
  'HiHYPE': 'hihype',
  'Hyperion iHYPE': 'hihype',
};

/**
 * Get LST config by ID or name
 */
export function getLSTConfig(idOrName: string): LSTConfig | undefined {
  // First try direct ID lookup
  if (LST_CONFIGS[idOrName.toLowerCase()]) {
    return LST_CONFIGS[idOrName.toLowerCase()];
  }

  // Try name mapping
  const mappedId = LST_NAME_MAPPING[idOrName];
  if (mappedId) {
    return LST_CONFIGS[mappedId];
  }

  return undefined;
}
