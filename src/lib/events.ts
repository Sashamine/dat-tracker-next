/**
 * Adoption event helpers.
 *
 * Best-effort logging — failures are swallowed so they never block app behaviour.
 */

import { D1Client } from '@/lib/d1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdoptionEvent = {
  event: string;
  client?: 'web' | 'agent' | 'cron' | 'unknown';
  session_id: string;
  route?: string;
  ticker?: string;
  metric?: string;
  datapoint_id?: string;
  artifact_id?: string;
  run_id?: string;
  meta?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// In-memory rate-limit map  (session_id:event → last-insert epoch ms)
// Best-effort, per-process only — no shared state needed.
// TODO(rate-limit): move to shared storage if we need cross-instance enforcement.
// ---------------------------------------------------------------------------

const RATE_LIMIT_MS = 2_000; // 1 event per 2 s per (session, event type)
const rateLimitMap = new Map<string, number>();

// Prune map periodically so it doesn't leak.
const PRUNE_INTERVAL_MS = 60_000;
let lastPrune = Date.now();

function pruneRateLimitMap() {
  const now = Date.now();
  if (now - lastPrune < PRUNE_INTERVAL_MS) return;
  lastPrune = now;
  const cutoff = now - RATE_LIMIT_MS * 2;
  for (const [key, ts] of rateLimitMap) {
    if (ts < cutoff) rateLimitMap.delete(key);
  }
}

function isRateLimited(sessionId: string, event: string): boolean {
  pruneRateLimitMap();
  const key = `${sessionId}:${event}`;
  const last = rateLimitMap.get(key);
  const now = Date.now();
  if (last && now - last < RATE_LIMIT_MS) return true;
  rateLimitMap.set(key, now);
  return false;
}

function stripWrappingQuotes(value: string): string {
  let out = value.trim();
  while (
    out.length >= 2 &&
    ((out.startsWith('"') && out.endsWith('"')) || (out.startsWith("'") && out.endsWith("'")))
  ) {
    out = out.slice(1, -1).trim();
  }
  return out;
}

function sanitizeLoggedTicker(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = stripWrappingQuotes(value);
  if (!cleaned) return undefined;
  return cleaned.toUpperCase();
}

function sanitizeLoggedRoute(value?: string): string | undefined {
  if (!value) return undefined;
  const cleaned = stripWrappingQuotes(value);
  return cleaned || undefined;
}

function sanitizeLoggedMetric(value?: string): string | undefined {
  if (!value) return undefined;
  const noQuotes = stripWrappingQuotes(value);
  if (!noQuotes) return undefined;
  const first = noQuotes.split(',')[0];
  const cleaned = stripWrappingQuotes(first);
  return cleaned || undefined;
}

// ---------------------------------------------------------------------------
// Core insert (best-effort, never throws)
// ---------------------------------------------------------------------------

export async function insertEvent(evt: AdoptionEvent): Promise<boolean> {
  try {
    if (isRateLimited(evt.session_id, evt.event)) return false;

    const d1 = D1Client.fromEnv();
    const id = crypto.randomUUID();
    const ts = new Date().toISOString();

    await d1.query(
      `INSERT INTO adoption_events
         (id, ts, event, client, session_id, route, ticker, metric,
          datapoint_id, artifact_id, run_id, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        ts,
        evt.event,
        evt.client ?? 'unknown',
        evt.session_id,
        evt.route ?? null,
        evt.ticker ?? null,
        evt.metric ?? null,
        evt.datapoint_id ?? null,
        evt.artifact_id ?? null,
        evt.run_id ?? null,
        evt.meta ? JSON.stringify(evt.meta) : null,
      ]
    );
    return true;
  } catch {
    // Best-effort — swallow errors so app is never blocked.
    return false;
  }
}

// ---------------------------------------------------------------------------
// Convenience: log an API-call event from a server route
// ---------------------------------------------------------------------------

export function logApiCallEvent(opts: {
  route: string;
  ticker?: string;
  metric?: string;
  status: number;
  latency_ms: number;
  sessionId?: string;
  client?: 'web' | 'agent' | 'cron' | 'unknown';
}): void {
  const route = sanitizeLoggedRoute(opts.route);
  const ticker = sanitizeLoggedTicker(opts.ticker);
  const metric = sanitizeLoggedMetric(opts.metric);

  // Fire-and-forget — do NOT await.
  insertEvent({
    event: 'api_call',
    client: opts.client ?? 'cron',
    session_id: opts.sessionId ?? 'server',
    route,
    ticker,
    metric,
    meta: { status: opts.status, latency_ms: opts.latency_ms },
  }).catch(() => {});
}
