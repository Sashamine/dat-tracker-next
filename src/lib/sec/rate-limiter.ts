/**
 * SEC EDGAR Rate Limiter
 * 
 * Implements polite rate limiting and exponential backoff for SEC API.
 * SEC has unofficial limits (~10 req/sec). This module helps avoid 429s.
 * 
 * Priority 9 from sec-monitor-optimizations.md
 */

// ============================================
// CONFIGURATION
// ============================================

interface RateLimitConfig {
  minDelayMs: number;        // Minimum delay between requests (default: 100ms)
  maxDelayMs: number;        // Maximum delay after backoff (default: 30s)
  backoffMultiplier: number; // Multiplier on each retry (default: 2)
  maxRetries: number;        // Max retries before giving up (default: 3)
}

const DEFAULT_CONFIG: RateLimitConfig = {
  minDelayMs: 100,           // 10 req/sec max
  maxDelayMs: 30000,         // 30 second max backoff
  backoffMultiplier: 2,
  maxRetries: 3,
};

// ============================================
// STATE
// ============================================

let lastRequestTime = 0;
let currentBackoff = 0;
let consecutiveFailures = 0;

// ============================================
// RATE LIMITING
// ============================================

/**
 * Wait for rate limit before making a request
 */
export async function waitForRateLimit(config: Partial<RateLimitConfig> = {}): Promise<void> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  // Calculate required delay
  const requiredDelay = Math.max(cfg.minDelayMs, currentBackoff);
  
  if (timeSinceLastRequest < requiredDelay) {
    const waitTime = requiredDelay - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
}

/**
 * Record a successful request (reset backoff)
 */
export function recordSuccess(): void {
  consecutiveFailures = 0;
  currentBackoff = 0;
}

/**
 * Record a rate limit hit (increase backoff)
 */
export function recordRateLimit(config: Partial<RateLimitConfig> = {}): number {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  consecutiveFailures++;
  
  // Exponential backoff: 200ms -> 400ms -> 800ms -> ...
  currentBackoff = Math.min(
    cfg.minDelayMs * Math.pow(cfg.backoffMultiplier, consecutiveFailures),
    cfg.maxDelayMs
  );
  
  console.warn(`[Rate Limit] Hit rate limit, backing off ${currentBackoff}ms (failure #${consecutiveFailures})`);
  
  return currentBackoff;
}

/**
 * Check if we should retry after rate limit
 */
export function shouldRetry(config: Partial<RateLimitConfig> = {}): boolean {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  return consecutiveFailures < cfg.maxRetries;
}

/**
 * Get current rate limit state
 */
export function getRateLimitState(): {
  consecutiveFailures: number;
  currentBackoff: number;
  lastRequestTime: number;
} {
  return {
    consecutiveFailures,
    currentBackoff,
    lastRequestTime,
  };
}

/**
 * Reset rate limit state
 */
export function resetRateLimitState(): void {
  consecutiveFailures = 0;
  currentBackoff = 0;
  lastRequestTime = 0;
}

// ============================================
// FETCH WITH RATE LIMITING
// ============================================

/**
 * Fetch with automatic rate limiting and retries
 */
export async function fetchWithRateLimit(
  url: string,
  options: RequestInit = {},
  config: Partial<RateLimitConfig> = {}
): Promise<Response> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  // Ensure we have SEC user agent
  const headers = new Headers(options.headers);
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)');
  }
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    // Wait for rate limit
    await waitForRateLimit(cfg);
    
    try {
      const response = await fetch(url, { ...options, headers });
      
      // Handle rate limit responses
      if (response.status === 429) {
        recordRateLimit(cfg);
        
        // Check for Retry-After header
        const retryAfter = response.headers.get('Retry-After');
        if (retryAfter) {
          const retryMs = parseInt(retryAfter) * 1000;
          if (!isNaN(retryMs)) {
            currentBackoff = Math.min(retryMs, cfg.maxDelayMs);
            console.log(`[Rate Limit] Retry-After header: ${retryAfter}s`);
          }
        }
        
        if (!shouldRetry(cfg)) {
          throw new Error(`Rate limited after ${cfg.maxRetries} retries`);
        }
        
        continue;  // Retry
      }
      
      // Success - reset backoff
      recordSuccess();
      return response;
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Network errors might also warrant retry
      if (attempt < cfg.maxRetries) {
        recordRateLimit(cfg);
        continue;
      }
    }
  }
  
  throw lastError || new Error('Max retries exceeded');
}

// ============================================
// BATCH PROCESSING HELPER
// ============================================

/**
 * Process items in batches with rate limiting
 */
export async function processBatchWithRateLimit<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    batchDelayMs?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<Array<{ item: T; result?: R; error?: string }>> {
  const { batchSize = 5, batchDelayMs = 500, onProgress } = options;
  const results: Array<{ item: T; result?: R; error?: string }> = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        await waitForRateLimit();
        
        try {
          const result = await processor(item);
          recordSuccess();
          return { item, result };
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate')) {
            recordRateLimit();
          }
          return { item, error: errMsg };
        }
      })
    );
    
    results.push(...batchResults);
    
    if (onProgress) {
      onProgress(results.length, items.length);
    }
    
    // Delay between batches
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, batchDelayMs));
    }
  }
  
  return results;
}
