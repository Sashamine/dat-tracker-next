/**
 * Health Check Endpoint
 * 
 * Returns system health status including:
 * - LLM API key configuration
 * - Discord webhook configuration  
 * - Database connection
 * - Filing cache stats
 * 
 * Use for monitoring and debugging silent failures.
 */

import { NextResponse } from 'next/server';
import { runHealthCheck, formatHealthCheck } from '@/lib/monitoring/alerts';
import { getCacheStats } from '@/lib/sec/filing-cache';

export async function GET() {
  try {
    const result = await runHealthCheck();
    
    // Get cache stats
    let cacheStats = null;
    try {
      cacheStats = await getCacheStats();
    } catch {
      // Cache table might not exist yet
    }
    
    return NextResponse.json({
      status: result.healthy ? 'healthy' : 'degraded',
      checks: result.checks,
      cache: cacheStats ? {
        totalCached: cacheStats.totalCached,
        totalMB: Math.round(cacheStats.totalBytes / 1024 / 1024 * 100) / 100,
        byFormType: cacheStats.byFormType,
      } : null,
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
