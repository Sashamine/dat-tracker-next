/**
 * Extraction Accuracy Tracking
 * 
 * Records which extraction method (XBRL vs LLM) was correct when
 * they disagree and a manual resolution is made.
 * 
 * Over time, builds accuracy stats per company and method.
 * 
 * Priority 8 from sec-monitor-optimizations.md
 */

import { query, queryOne } from '../db';

// ============================================
// TYPES
// ============================================

export type ExtractionMethod = 'xbrl' | 'llm' | 'hybrid' | 'manual';

export interface ExtractionComparison {
  id?: number;
  ticker: string;
  accessionNumber: string;
  filedDate: string;
  
  // What each method extracted
  xbrlValue?: number;
  llmValue?: number;
  
  // What was actually correct
  resolvedValue?: number;
  resolvedMethod?: ExtractionMethod;  // Which method was right
  resolvedAt?: string;
  resolvedBy?: 'auto' | 'human';
  resolutionNotes?: string;
  
  // Metadata
  createdAt: string;
  discrepancyPct?: number;  // How far apart were they
}

interface DbExtractionComparison {
  id: number;
  ticker: string;
  accession_number: string;
  filed_date: string;
  xbrl_value: string | null;
  llm_value: string | null;
  resolved_value: string | null;
  resolved_method: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  created_at: string;
  discrepancy_pct: string | null;
}

export interface AccuracyStats {
  ticker: string;
  totalComparisons: number;
  xbrlCorrect: number;
  llmCorrect: number;
  xbrlAccuracy: number;  // 0-1
  llmAccuracy: number;   // 0-1
  pending: number;       // Unresolved
}

// ============================================
// RECORD OPERATIONS
// ============================================

/**
 * Record a new extraction comparison (when XBRL and LLM disagree)
 */
export async function recordExtractionComparison(
  comparison: Omit<ExtractionComparison, 'id' | 'createdAt'>
): Promise<ExtractionComparison> {
  try {
    // Calculate discrepancy percentage
    let discrepancyPct: number | undefined;
    if (comparison.xbrlValue && comparison.llmValue) {
      const max = Math.max(comparison.xbrlValue, comparison.llmValue);
      const min = Math.min(comparison.xbrlValue, comparison.llmValue);
      discrepancyPct = max > 0 ? ((max - min) / max) * 100 : 0;
    }
    
    const row = await queryOne<DbExtractionComparison>(
      `INSERT INTO extraction_comparisons (
        ticker, accession_number, filed_date,
        xbrl_value, llm_value,
        resolved_value, resolved_method, resolved_at, resolved_by,
        resolution_notes, discrepancy_pct
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (ticker, accession_number) DO UPDATE SET
        xbrl_value = COALESCE(EXCLUDED.xbrl_value, extraction_comparisons.xbrl_value),
        llm_value = COALESCE(EXCLUDED.llm_value, extraction_comparisons.llm_value),
        discrepancy_pct = EXCLUDED.discrepancy_pct
      RETURNING *`,
      [
        comparison.ticker,
        comparison.accessionNumber,
        comparison.filedDate,
        comparison.xbrlValue,
        comparison.llmValue,
        comparison.resolvedValue,
        comparison.resolvedMethod,
        comparison.resolvedAt,
        comparison.resolvedBy,
        comparison.resolutionNotes,
        discrepancyPct,
      ]
    );
    
    return toExtractionComparison(row!);
  } catch (error) {
    console.error('[Accuracy] Error recording comparison:', error);
    throw error;
  }
}

/**
 * Resolve a comparison (mark which method was correct)
 */
export async function resolveComparison(
  ticker: string,
  accessionNumber: string,
  resolution: {
    resolvedValue: number;
    resolvedMethod: ExtractionMethod;
    resolvedBy: 'auto' | 'human';
    resolutionNotes?: string;
  }
): Promise<ExtractionComparison | null> {
  try {
    const row = await queryOne<DbExtractionComparison>(
      `UPDATE extraction_comparisons SET
        resolved_value = $1,
        resolved_method = $2,
        resolved_at = NOW(),
        resolved_by = $3,
        resolution_notes = $4
      WHERE ticker = $5 AND accession_number = $6
      RETURNING *`,
      [
        resolution.resolvedValue,
        resolution.resolvedMethod,
        resolution.resolvedBy,
        resolution.resolutionNotes,
        ticker,
        accessionNumber,
      ]
    );
    
    return row ? toExtractionComparison(row) : null;
  } catch (error) {
    console.error('[Accuracy] Error resolving comparison:', error);
    return null;
  }
}

/**
 * Get pending (unresolved) comparisons
 */
export async function getPendingComparisons(
  ticker?: string
): Promise<ExtractionComparison[]> {
  try {
    let rows: DbExtractionComparison[];
    
    if (ticker) {
      rows = await query<DbExtractionComparison>(
        `SELECT * FROM extraction_comparisons
         WHERE ticker = $1 AND resolved_value IS NULL
         ORDER BY filed_date DESC`,
        [ticker]
      );
    } else {
      rows = await query<DbExtractionComparison>(
        `SELECT * FROM extraction_comparisons
         WHERE resolved_value IS NULL
         ORDER BY filed_date DESC
         LIMIT 100`
      );
    }
    
    return rows.map(toExtractionComparison);
  } catch (error) {
    console.error('[Accuracy] Error getting pending comparisons:', error);
    return [];
  }
}

// ============================================
// ACCURACY STATISTICS
// ============================================

/**
 * Get accuracy stats for a ticker
 */
export async function getAccuracyStats(ticker: string): Promise<AccuracyStats | null> {
  try {
    const row = await queryOne<{
      ticker: string;
      total_comparisons: string;
      xbrl_correct: string;
      llm_correct: string;
      pending: string;
    }>(
      `SELECT 
        ticker,
        COUNT(*) as total_comparisons,
        COUNT(*) FILTER (WHERE resolved_method = 'xbrl') as xbrl_correct,
        COUNT(*) FILTER (WHERE resolved_method = 'llm') as llm_correct,
        COUNT(*) FILTER (WHERE resolved_value IS NULL) as pending
       FROM extraction_comparisons
       WHERE ticker = $1
       GROUP BY ticker`,
      [ticker]
    );
    
    if (!row) return null;
    
    const total = parseInt(row.total_comparisons);
    const xbrlCorrect = parseInt(row.xbrl_correct);
    const llmCorrect = parseInt(row.llm_correct);
    const resolved = xbrlCorrect + llmCorrect;
    
    return {
      ticker: row.ticker,
      totalComparisons: total,
      xbrlCorrect,
      llmCorrect,
      xbrlAccuracy: resolved > 0 ? xbrlCorrect / resolved : 0,
      llmAccuracy: resolved > 0 ? llmCorrect / resolved : 0,
      pending: parseInt(row.pending),
    };
  } catch (error) {
    console.error('[Accuracy] Error getting stats:', error);
    return null;
  }
}

/**
 * Get accuracy stats for all companies
 */
export async function getAllAccuracyStats(): Promise<AccuracyStats[]> {
  try {
    const rows = await query<{
      ticker: string;
      total_comparisons: string;
      xbrl_correct: string;
      llm_correct: string;
      pending: string;
    }>(
      `SELECT 
        ticker,
        COUNT(*) as total_comparisons,
        COUNT(*) FILTER (WHERE resolved_method = 'xbrl') as xbrl_correct,
        COUNT(*) FILTER (WHERE resolved_method = 'llm') as llm_correct,
        COUNT(*) FILTER (WHERE resolved_value IS NULL) as pending
       FROM extraction_comparisons
       GROUP BY ticker
       ORDER BY total_comparisons DESC`
    );
    
    return rows.map(row => {
      const total = parseInt(row.total_comparisons);
      const xbrlCorrect = parseInt(row.xbrl_correct);
      const llmCorrect = parseInt(row.llm_correct);
      const resolved = xbrlCorrect + llmCorrect;
      
      return {
        ticker: row.ticker,
        totalComparisons: total,
        xbrlCorrect,
        llmCorrect,
        xbrlAccuracy: resolved > 0 ? xbrlCorrect / resolved : 0,
        llmAccuracy: resolved > 0 ? llmCorrect / resolved : 0,
        pending: parseInt(row.pending),
      };
    });
  } catch (error) {
    console.error('[Accuracy] Error getting all stats:', error);
    return [];
  }
}

/**
 * Get recommended extraction method for a ticker based on history
 */
export function getRecommendedMethod(stats: AccuracyStats): ExtractionMethod | null {
  // Need at least 3 resolved comparisons to make a recommendation
  const resolved = stats.xbrlCorrect + stats.llmCorrect;
  if (resolved < 3) return null;
  
  // If one method is significantly better (>20% difference), recommend it
  const diff = Math.abs(stats.xbrlAccuracy - stats.llmAccuracy);
  if (diff < 0.2) return 'hybrid';  // Both similar, use hybrid
  
  return stats.xbrlAccuracy > stats.llmAccuracy ? 'xbrl' : 'llm';
}

// ============================================
// HELPERS
// ============================================

function toExtractionComparison(row: DbExtractionComparison): ExtractionComparison {
  return {
    id: row.id,
    ticker: row.ticker,
    accessionNumber: row.accession_number,
    filedDate: row.filed_date,
    xbrlValue: row.xbrl_value ? parseFloat(row.xbrl_value) : undefined,
    llmValue: row.llm_value ? parseFloat(row.llm_value) : undefined,
    resolvedValue: row.resolved_value ? parseFloat(row.resolved_value) : undefined,
    resolvedMethod: row.resolved_method as ExtractionMethod | undefined,
    resolvedAt: row.resolved_at || undefined,
    resolvedBy: row.resolved_by as 'auto' | 'human' | undefined,
    resolutionNotes: row.resolution_notes || undefined,
    createdAt: row.created_at,
    discrepancyPct: row.discrepancy_pct ? parseFloat(row.discrepancy_pct) : undefined,
  };
}

// ============================================
// DATABASE MIGRATION
// ============================================

export const ACCURACY_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS extraction_comparisons (
  id SERIAL PRIMARY KEY,
  ticker VARCHAR(10) NOT NULL,
  accession_number VARCHAR(20) NOT NULL,
  filed_date DATE NOT NULL,
  
  xbrl_value DECIMAL(20, 2),
  llm_value DECIMAL(20, 2),
  
  resolved_value DECIMAL(20, 2),
  resolved_method VARCHAR(10),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(10),
  resolution_notes TEXT,
  
  discrepancy_pct DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(ticker, accession_number)
);

CREATE INDEX IF NOT EXISTS idx_comparisons_ticker ON extraction_comparisons(ticker);
CREATE INDEX IF NOT EXISTS idx_comparisons_pending ON extraction_comparisons(resolved_value) WHERE resolved_value IS NULL;
`;
