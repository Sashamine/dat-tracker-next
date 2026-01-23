/**
 * Discrepancies API Endpoint
 *
 * Returns recent discrepancies from the database for the review UI.
 * Supports filtering by status, severity, and ticker.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

interface DiscrepancyRow {
  id: number;
  company_id: number;
  ticker: string;
  company_name: string;
  field: string;
  our_value: number;
  source_values: Record<string, { value: number; url: string; date: string }>;
  severity: 'minor' | 'moderate' | 'major';
  max_deviation_pct: number;
  status: 'pending' | 'resolved' | 'dismissed';
  resolved_value: number | null;
  resolution_source: string | null;
  resolution_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  created_date: string;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Optional filters
    const status = searchParams.get('status'); // pending, resolved, dismissed
    const severity = searchParams.get('severity'); // minor, moderate, major
    const ticker = searchParams.get('ticker');
    const days = parseInt(searchParams.get('days') || '7', 10); // Default last 7 days

    // Build query with filters
    let sql = `
      SELECT
        d.id,
        d.company_id,
        c.ticker,
        c.name as company_name,
        d.field,
        d.our_value,
        d.source_values,
        d.severity,
        d.max_deviation_pct,
        d.status,
        d.resolved_value,
        d.resolution_source,
        d.resolution_notes,
        d.resolved_by,
        d.resolved_at,
        d.created_at,
        d.created_date
      FROM discrepancies d
      JOIN companies c ON d.company_id = c.id
      WHERE d.created_at > NOW() - INTERVAL '${days} days'
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (severity) {
      sql += ` AND d.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (ticker) {
      sql += ` AND c.ticker = $${paramIndex}`;
      params.push(ticker.toUpperCase());
      paramIndex++;
    }

    sql += ` ORDER BY d.created_at DESC`;

    const rows = await query<DiscrepancyRow>(sql, params);

    // Group by status for summary
    const summary = {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      resolved: rows.filter((r) => r.status === 'resolved').length,
      dismissed: rows.filter((r) => r.status === 'dismissed').length,
      bySeverity: {
        major: rows.filter((r) => r.severity === 'major').length,
        moderate: rows.filter((r) => r.severity === 'moderate').length,
        minor: rows.filter((r) => r.severity === 'minor').length,
      },
    };

    return NextResponse.json({
      success: true,
      summary,
      discrepancies: rows,
    });
  } catch (error) {
    console.error('[Discrepancies API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
