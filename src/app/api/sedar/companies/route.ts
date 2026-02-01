/**
 * SEDAR Companies API
 * 
 * Returns the list of Canadian companies being monitored.
 */

import { NextResponse } from 'next/server';
import { CANADIAN_COMPANIES } from '@/lib/sedar/canadian-companies';

export async function GET() {
  return NextResponse.json({
    success: true,
    companies: CANADIAN_COMPANIES,
  });
}
