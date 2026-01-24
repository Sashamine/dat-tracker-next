/**
 * Admin Migration Endpoint
 *
 * Run database migrations. Requires manual confirmation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { migration } = body;

    if (migration === 'add-mnav-field') {
      // Add 'mnav' to discrepancy_field enum
      await query(`
        DO $$ BEGIN
          ALTER TYPE discrepancy_field ADD VALUE IF NOT EXISTS 'mnav';
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);

      return NextResponse.json({
        success: true,
        message: "Added 'mnav' to discrepancy_field enum",
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Unknown migration',
      available: ['add-mnav-field'],
    }, { status: 400 });

  } catch (error) {
    console.error('[Admin Migrate] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
