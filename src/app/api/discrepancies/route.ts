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

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ticker, field, status, resolution_notes, resolved_by } = body;

    // Allow updating by ID or by ticker+field combo
    if (!id && !(ticker && field)) {
      return NextResponse.json(
        { success: false, error: 'Must provide id or (ticker + field)' },
        { status: 400 }
      );
    }

    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be pending, resolved, or dismissed' },
        { status: 400 }
      );
    }

    let sql: string;
    let params: any[];

    // Set resolved_at if status is resolved or dismissed
    const shouldSetResolvedAt = status === 'resolved' || status === 'dismissed';

    if (id) {
      sql = shouldSetResolvedAt
        ? `
          UPDATE discrepancies
          SET status = $1::discrepancy_status,
              resolution_notes = $2,
              resolved_by = $3,
              resolved_at = NOW()
          WHERE id = $4
          RETURNING id
        `
        : `
          UPDATE discrepancies
          SET status = $1::discrepancy_status,
              resolution_notes = $2,
              resolved_by = $3,
              resolved_at = NULL
          WHERE id = $4
          RETURNING id
        `;
      params = [status, resolution_notes || null, resolved_by || 'system', id];
    } else {
      // Update all pending discrepancies for this ticker+field
      sql = shouldSetResolvedAt
        ? `
          UPDATE discrepancies d
          SET status = $1::discrepancy_status,
              resolution_notes = $2,
              resolved_by = $3,
              resolved_at = NOW()
          FROM companies c
          WHERE d.company_id = c.id
            AND c.ticker = $4
            AND d.field = $5::discrepancy_field
            AND d.status = 'pending'
          RETURNING d.id
        `
        : `
          UPDATE discrepancies d
          SET status = $1::discrepancy_status,
              resolution_notes = $2,
              resolved_by = $3,
              resolved_at = NULL
          FROM companies c
          WHERE d.company_id = c.id
            AND c.ticker = $4
            AND d.field = $5::discrepancy_field
            AND d.status = 'pending'
          RETURNING d.id
        `;
      params = [status, resolution_notes || null, resolved_by || 'system', ticker.toUpperCase(), field];
    }

    const result = await query<{ id: number }>(sql, params);

    return NextResponse.json({
      success: true,
      updated: result.length,
      ids: result.map(r => r.id),
    });
  } catch (error) {
    console.error('[Discrepancies API] PATCH Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
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

    // Convert PostgreSQL DECIMAL strings to numbers
    const discrepancies = rows.map((row) => ({
      ...row,
      our_value: parseFloat(row.our_value as unknown as string) || 0,
      max_deviation_pct: parseFloat(row.max_deviation_pct as unknown as string) || 0,
      resolved_value: row.resolved_value ? parseFloat(row.resolved_value as unknown as string) : null,
    }));

    // Group by status for summary
    const summary = {
      total: discrepancies.length,
      pending: discrepancies.filter((r) => r.status === 'pending').length,
      resolved: discrepancies.filter((r) => r.status === 'resolved').length,
      dismissed: discrepancies.filter((r) => r.status === 'dismissed').length,
      bySeverity: {
        major: discrepancies.filter((r) => r.severity === 'major').length,
        moderate: discrepancies.filter((r) => r.severity === 'moderate').length,
        minor: discrepancies.filter((r) => r.severity === 'minor').length,
      },
    };

    return NextResponse.json({
      success: true,
      summary,
      discrepancies,
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
