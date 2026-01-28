/**
 * Health Check Endpoint
 * 
 * Returns system health status including:
 * - LLM API key configuration
 * - Discord webhook configuration  
 * - Database connection
 * 
 * Use for monitoring and debugging silent failures.
 */

import { NextResponse } from 'next/server';
import { runHealthCheck, formatHealthCheck } from '@/lib/monitoring/alerts';

export async function GET() {
  try {
    const result = await runHealthCheck();
    
    return NextResponse.json({
      status: result.healthy ? 'healthy' : 'degraded',
      checks: result.checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
