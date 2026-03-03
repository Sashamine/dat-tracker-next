"use client";

/**
 * Client-side adoption event helpers.
 *
 * - Anonymous session_id via localStorage (created once, persisted).
 * - Uses navigator.sendBeacon when available, else fetch with keepalive.
 * - Errors are swallowed — never breaks the UI.
 * - 2 s debounce per event type to avoid spamming on fast navigation.
 */

// ---------------------------------------------------------------------------
// Session ID (anonymous, persisted in localStorage)
// ---------------------------------------------------------------------------

const SESSION_KEY = "dat_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage full — fall back to in-memory id per page load
    return crypto.randomUUID();
  }
}

// ---------------------------------------------------------------------------
// Debounce guard  (event type → last-fire epoch)
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 2_000;
const lastFired = new Map<string, number>();

function shouldFire(event: string): boolean {
  const now = Date.now();
  const last = lastFired.get(event);
  if (last && now - last < DEBOUNCE_MS) return false;
  lastFired.set(event, now);
  return true;
}

// ---------------------------------------------------------------------------
// Core send (best-effort)
// ---------------------------------------------------------------------------

type EventPayload = {
  event: string;
  route?: string;
  ticker?: string;
  metric?: string;
  datapoint_id?: string;
  artifact_id?: string;
  run_id?: string;
  meta?: Record<string, unknown>;
};

export function sendEvent(payload: EventPayload): void {
  if (typeof window === "undefined") return;
  if (!shouldFire(payload.event)) return;

  const body = JSON.stringify({
    ...payload,
    session_id: getSessionId(),
    client: "web",
  });

  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/events", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // swallow
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export function trackPageView(route: string): void {
  sendEvent({ event: "page_view", route });
}

export function trackCompanyView(ticker: string, route: string): void {
  sendEvent({ event: "company_view", route, ticker: ticker.toUpperCase() });
}

export function trackHistoryView(ticker: string, metric: string, route?: string): void {
  sendEvent({ event: "history_view", ticker: ticker.toUpperCase(), metric, route });
}

export function trackCitationOpen(opts?: {
  ticker?: string;
  metric?: string;
  artifact_id?: string;
}): void {
  sendEvent({ event: "citation_modal_open", ...opts });
}

export function trackCitationSourceClick(opts?: {
  ticker?: string;
  metric?: string;
  artifact_id?: string;
  meta?: Record<string, unknown>;
}): void {
  sendEvent({ event: "citation_source_click", ...opts });
}
