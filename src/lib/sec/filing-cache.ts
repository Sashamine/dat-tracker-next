/**
 * SEC Filing Content Cache
 * 
 * Caches SEC filing content by accession number.
 * Filings are immutable once published, so cache indefinitely.
 * 
 * Priority 6 from sec-monitor-optimizations.md
 * 
 * Storage options:
 * 1. Database (PostgreSQL) - default, simple
 * 2. S3/R2 - better for large files, future option
 */

import { query, queryOne } from '../db';
import { fetchWithRateLimit } from './rate-limiter';

// ============================================
// TYPES
// ============================================

export interface CachedFiling {
  accessionNumber: string;
  ticker: string;
  formType: string;
  filedDate: string;
  documentName: string;
  documentUrl: string;
  content: string;
  contentLength: number;
  cachedAt: string;
  cacheSource: 'sec_edgar';
}

interface DbCachedFiling {
  accession_number: string;
  ticker: string;
  form_type: string;
  filed_date: string;
  document_name: string;
  document_url: string;
  content: string;
  content_length: number;
  cached_at: string;
  cache_source: string;
}

// ============================================
// CACHE OPERATIONS
// ============================================

/**
 * Get cached filing content by accession number
 */
export async function getCachedFiling(
  accessionNumber: string,
  documentName?: string
): Promise<CachedFiling | null> {
  try {
    const normalizedAccession = normalizeAccessionNumber(accessionNumber);
    
    let row: DbCachedFiling | null;
    
    if (documentName) {
      row = await queryOne<DbCachedFiling>(
        `SELECT * FROM filing_content_cache 
         WHERE accession_number = $1 AND document_name = $2`,
        [normalizedAccession, documentName]
      );
    } else {
      // Get any cached document for this filing
      row = await queryOne<DbCachedFiling>(
        `SELECT * FROM filing_content_cache 
         WHERE accession_number = $1 
         ORDER BY content_length DESC 
         LIMIT 1`,
        [normalizedAccession]
      );
    }
    
    if (!row) return null;
    
    return {
      accessionNumber: row.accession_number,
      ticker: row.ticker,
      formType: row.form_type,
      filedDate: row.filed_date,
      documentName: row.document_name,
      documentUrl: row.document_url,
      content: row.content,
      contentLength: row.content_length,
      cachedAt: row.cached_at,
      cacheSource: row.cache_source as 'sec_edgar',
    };
  } catch (error) {
    // Cache miss on error - fall through to fetch
    console.error('[Filing Cache] Error reading cache:', error);
    return null;
  }
}

/**
 * Cache filing content
 */
export async function cacheFiling(
  filing: Omit<CachedFiling, 'cachedAt' | 'contentLength'>
): Promise<void> {
  try {
    const normalizedAccession = normalizeAccessionNumber(filing.accessionNumber);
    
    await query(
      `INSERT INTO filing_content_cache (
        accession_number, ticker, form_type, filed_date,
        document_name, document_url, content, content_length,
        cached_at, cache_source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
      ON CONFLICT (accession_number, document_name) 
      DO UPDATE SET
        content = EXCLUDED.content,
        content_length = EXCLUDED.content_length,
        cached_at = NOW()`,
      [
        normalizedAccession,
        filing.ticker,
        filing.formType,
        filing.filedDate,
        filing.documentName,
        filing.documentUrl,
        filing.content,
        filing.content.length,
        filing.cacheSource,
      ]
    );
    
    console.log(`[Filing Cache] Cached ${filing.documentName} for ${filing.ticker} (${filing.content.length} chars)`);
  } catch (error) {
    // Don't fail on cache write errors
    console.error('[Filing Cache] Error writing cache:', error);
  }
}

/**
 * Check if filing is cached
 */
export async function isFilingCached(
  accessionNumber: string,
  documentName?: string
): Promise<boolean> {
  try {
    const normalizedAccession = normalizeAccessionNumber(accessionNumber);
    
    let result;
    if (documentName) {
      result = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM filing_content_cache 
         WHERE accession_number = $1 AND document_name = $2`,
        [normalizedAccession, documentName]
      );
    } else {
      result = await queryOne<{ count: string }>(
        `SELECT COUNT(*) as count FROM filing_content_cache 
         WHERE accession_number = $1`,
        [normalizedAccession]
      );
    }
    
    return result ? parseInt(result.count) > 0 : false;
  } catch (error) {
    return false;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalCached: number;
  totalBytes: number;
  oldestCache: string | null;
  newestCache: string | null;
  byFormType: Record<string, number>;
}> {
  try {
    const stats = await queryOne<{
      total_cached: string;
      total_bytes: string;
      oldest_cache: string | null;
      newest_cache: string | null;
    }>(
      `SELECT 
        COUNT(*) as total_cached,
        COALESCE(SUM(content_length), 0) as total_bytes,
        MIN(cached_at) as oldest_cache,
        MAX(cached_at) as newest_cache
       FROM filing_content_cache`
    );
    
    const byFormType = await query<{ form_type: string; count: string }>(
      `SELECT form_type, COUNT(*) as count 
       FROM filing_content_cache 
       GROUP BY form_type`
    );
    
    const formTypeCounts: Record<string, number> = {};
    for (const row of byFormType) {
      formTypeCounts[row.form_type] = parseInt(row.count);
    }
    
    return {
      totalCached: parseInt(stats?.total_cached || '0'),
      totalBytes: parseInt(stats?.total_bytes || '0'),
      oldestCache: stats?.oldest_cache || null,
      newestCache: stats?.newest_cache || null,
      byFormType: formTypeCounts,
    };
  } catch (error) {
    console.error('[Filing Cache] Error getting stats:', error);
    return {
      totalCached: 0,
      totalBytes: 0,
      oldestCache: null,
      newestCache: null,
      byFormType: {},
    };
  }
}

/**
 * Normalize accession number format
 * SEC uses both "0001234567-12-123456" and "000123456712123456" formats
 */
function normalizeAccessionNumber(accession: string): string {
  // Remove dashes and store in compact format
  return accession.replace(/-/g, '');
}

// ============================================
// FETCH WITH CACHE
// ============================================

/**
 * Fetch filing content with caching
 * Returns cached content if available, otherwise fetches and caches
 */
export async function fetchFilingWithCache(
  url: string,
  metadata: {
    accessionNumber: string;
    ticker: string;
    formType: string;
    filedDate: string;
    documentName: string;
  }
): Promise<string | null> {
  // Check cache first
  const cached = await getCachedFiling(metadata.accessionNumber, metadata.documentName);
  if (cached) {
    console.log(`[Filing Cache] HIT: ${metadata.documentName} for ${metadata.ticker}`);
    return cached.content;
  }
  
  console.log(`[Filing Cache] MISS: ${metadata.documentName} for ${metadata.ticker}, fetching...`);
  
  // Fetch from SEC with rate limiting
  try {
    const response = await fetchWithRateLimit(url, {
      headers: {
        'User-Agent': 'DAT-Tracker/1.0 (https://dattracker.com; admin@dattracker.com)',
        'Accept': 'text/html,application/xhtml+xml,text/plain',
      },
    });
    
    if (!response.ok) {
      console.error(`[Filing Cache] Fetch failed: ${response.status}`);
      return null;
    }
    
    const content = await response.text();
    
    // Cache the content
    await cacheFiling({
      accessionNumber: metadata.accessionNumber,
      ticker: metadata.ticker,
      formType: metadata.formType,
      filedDate: metadata.filedDate,
      documentName: metadata.documentName,
      documentUrl: url,
      content,
      cacheSource: 'sec_edgar',
    });
    
    return content;
  } catch (error) {
    console.error(`[Filing Cache] Fetch error:`, error);
    return null;
  }
}

// ============================================
// DATABASE MIGRATION
// ============================================

/**
 * SQL to create the cache table
 * Run this migration to enable caching
 */
export const CACHE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS filing_content_cache (
  id SERIAL PRIMARY KEY,
  accession_number VARCHAR(20) NOT NULL,
  ticker VARCHAR(10) NOT NULL,
  form_type VARCHAR(10) NOT NULL,
  filed_date DATE NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_url TEXT NOT NULL,
  content TEXT NOT NULL,
  content_length INTEGER NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cache_source VARCHAR(20) DEFAULT 'sec_edgar',
  
  UNIQUE(accession_number, document_name)
);

CREATE INDEX IF NOT EXISTS idx_filing_cache_ticker ON filing_content_cache(ticker);
CREATE INDEX IF NOT EXISTS idx_filing_cache_form_type ON filing_content_cache(form_type);
CREATE INDEX IF NOT EXISTS idx_filing_cache_filed_date ON filing_content_cache(filed_date);
`;
