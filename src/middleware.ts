import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/api/rate-limit';

/**
 * Next.js middleware — rate limiting for public API routes.
 *
 * Applies to /api/v1/* only. Internal API routes are unaffected.
 * 60 requests per minute per IP (generous for a data API).
 */
export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const { allowed, limit, remaining, resetAt } = checkRateLimit(ip, 60, 60_000);

  if (!allowed) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rate limit exceeded. Max 60 requests per minute.',
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
          'Retry-After': String(Math.ceil((resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

  // CORS headers for public API
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export const config = {
  matcher: '/api/v1/:path*',
};
