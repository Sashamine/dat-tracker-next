/**
 * Source Monitor Cron — Dashboard & IR Page Change Detection
 *
 * Fetches company dashboards and IR pages, hashes content, and alerts
 * via Discord when pages change. This enables early detection of
 * holdings updates, new press releases, and other material changes.
 *
 * Schedule: 0 0,6,12,18 * * * (every 6 hours)
 *
 * Usage:
 *   GET /api/cron/source-monitor              (cron, requires CRON_SECRET)
 *   GET /api/cron/source-monitor?manual=true   (manual trigger)
 *   GET /api/cron/source-monitor?manual=true&dryRun=true  (no Discord send)
 *   GET /api/cron/source-monitor?manual=true&ticker=MSTR  (single company)
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { D1Client } from '@/lib/d1';
import { COMPANY_SOURCES, type CompanyDataSources } from '@/lib/data/company-sources';
import { sendDiscordEmbed } from '@/lib/discord';

// ── Config ──────────────────────────────────────────────────────────

/** Max time for a single page fetch (ms). */
const FETCH_TIMEOUT = 10_000;

/** Delay between fetches to avoid hammering servers. */
const FETCH_DELAY_MS = 1_500;

/** User-Agent for fetches. */
const USER_AGENT = 'DATTracker/1.0 (source-monitor; +https://dat-tracker-next.vercel.app)';

// ── Types ───────────────────────────────────────────────────────────

interface SourceToCheck {
  url: string;
  ticker: string;
  sourceType: 'dashboard' | 'ir_page';
  name: string;
}

interface CheckResult {
  url: string;
  ticker: string;
  sourceType: string;
  name: string;
  changed: boolean;
  isNew: boolean;
  oldHash?: string;
  newHash: string;
  snippet: string;
  error?: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

/**
 * Fetch a URL and extract text content, stripping HTML and normalizing
 * dynamic elements that change on every page load.
 */
async function fetchAndNormalize(url: string): Promise<{ text: string; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const resp = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      return { text: '', error: `HTTP ${resp.status}` };
    }

    const html = await resp.text();

    // Strip HTML tags
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ');
    text = text.replace(/<[^>]+>/g, ' ');

    // Decode HTML entities
    text = text
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');

    // Normalize whitespace
    text = text.replace(/\s+/g, ' ').trim();

    // Remove common dynamic elements that change every page load:
    // - Timestamps/dates in various formats (but keep year-month-day dates)
    // - Cache-busting query params
    // - Session tokens and nonces
    text = text.replace(/\b\d{10,13}\b/g, '[TS]');                    // Unix timestamps
    text = text.replace(/\b\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM|am|pm)?\b/g, '[TIME]');  // Time of day
    text = text.replace(/\b[a-f0-9]{32,64}\b/gi, '[HASH]');          // Hashes/tokens
    text = text.replace(/nonce="[^"]*"/gi, 'nonce="[N]"');           // CSP nonces

    // Remove live price tickers (e.g., "$97,234.56" but keep static values)
    // We keep numbers that are part of holdings counts
    text = text.replace(/\$[\d,]+\.\d{2}/g, '[PRICE]');

    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('abort')) {
      return { text: '', error: 'Timeout' };
    }
    return { text: '', error: msg };
  }
}

function hashContent(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Source Collection ────────────────────────────────────────────────

function getSourcesToCheck(tickerFilter?: string): SourceToCheck[] {
  const sources: SourceToCheck[] = [];

  for (const [ticker, src] of Object.entries(COMPANY_SOURCES)) {
    if (tickerFilter && ticker !== tickerFilter.toUpperCase()) continue;

    if (src.officialDashboard) {
      sources.push({
        url: src.officialDashboard,
        ticker,
        sourceType: 'dashboard',
        name: src.officialDashboardName || src.officialDashboard,
      });
    }

    if (src.investorRelations) {
      sources.push({
        url: src.investorRelations,
        ticker,
        sourceType: 'ir_page',
        name: `${ticker} IR`,
      });
    }
  }

  return sources;
}

// ── D1 Operations ───────────────────────────────────────────────────

async function ensureTable(d1: D1Client): Promise<void> {
  await d1.query(`
    CREATE TABLE IF NOT EXISTS source_hashes (
      url TEXT PRIMARY KEY,
      ticker TEXT NOT NULL,
      source_type TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      content_snippet TEXT,
      last_checked TEXT NOT NULL,
      last_changed TEXT,
      check_count INTEGER DEFAULT 1,
      consecutive_failures INTEGER DEFAULT 0,
      last_error TEXT
    );
  `);
}

async function getStoredHash(d1: D1Client, url: string): Promise<{
  content_hash: string;
  check_count: number;
  consecutive_failures: number;
} | null> {
  const result = await d1.query<{
    content_hash: string;
    check_count: number;
    consecutive_failures: number;
  }>(
    'SELECT content_hash, check_count, consecutive_failures FROM source_hashes WHERE url = ? LIMIT 1;',
    [url]
  );
  return result.results[0] || null;
}

async function upsertHash(
  d1: D1Client,
  url: string,
  ticker: string,
  sourceType: string,
  hash: string,
  snippet: string,
  changed: boolean,
  error?: string,
): Promise<void> {
  const now = new Date().toISOString();

  if (error) {
    // On error, increment failure count but don't update hash
    await d1.query(
      `INSERT INTO source_hashes (url, ticker, source_type, content_hash, content_snippet, last_checked, consecutive_failures, last_error)
       VALUES (?, ?, ?, '', '', ?, 1, ?)
       ON CONFLICT(url) DO UPDATE SET
         last_checked = ?,
         consecutive_failures = consecutive_failures + 1,
         last_error = ?,
         check_count = check_count + 1;`,
      [url, ticker, sourceType, now, error, now, error]
    );
    return;
  }

  await d1.query(
    `INSERT INTO source_hashes (url, ticker, source_type, content_hash, content_snippet, last_checked, last_changed, check_count, consecutive_failures)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)
     ON CONFLICT(url) DO UPDATE SET
       content_hash = ?,
       content_snippet = ?,
       last_checked = ?,
       last_changed = CASE WHEN ? = 1 THEN ? ELSE source_hashes.last_changed END,
       check_count = check_count + 1,
       consecutive_failures = 0,
       last_error = NULL;`,
    [
      url, ticker, sourceType, hash, snippet.slice(0, 200), now, changed ? now : null,
      hash, snippet.slice(0, 200), now, changed ? 1 : 0, now,
    ]
  );
}

// ── Main Logic ──────────────────────────────────────────────────────

async function checkSources(
  d1: D1Client,
  sources: SourceToCheck[],
): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  for (const src of sources) {
    const { text, error } = await fetchAndNormalize(src.url);

    if (error || !text) {
      await upsertHash(d1, src.url, src.ticker, src.sourceType, '', '', false, error || 'Empty response');
      results.push({
        url: src.url,
        ticker: src.ticker,
        sourceType: src.sourceType,
        name: src.name,
        changed: false,
        isNew: false,
        newHash: '',
        snippet: '',
        error: error || 'Empty response',
      });
      await sleep(FETCH_DELAY_MS);
      continue;
    }

    const newHash = hashContent(text);
    const snippet = text.slice(0, 200);
    const stored = await getStoredHash(d1, src.url);

    const isNew = !stored;
    const changed = stored ? stored.content_hash !== newHash : false;

    await upsertHash(d1, src.url, src.ticker, src.sourceType, newHash, snippet, changed);

    results.push({
      url: src.url,
      ticker: src.ticker,
      sourceType: src.sourceType,
      name: src.name,
      changed,
      isNew,
      oldHash: stored?.content_hash,
      newHash,
      snippet,
    });

    await sleep(FETCH_DELAY_MS);
  }

  return results;
}

function formatDiscordEmbed(results: CheckResult[]) {
  const changed = results.filter(r => r.changed);
  const errors = results.filter(r => r.error);
  const newSources = results.filter(r => r.isNew);
  const checked = results.length;

  if (changed.length === 0) {
    // No changes — don't send (silent success)
    return null;
  }

  const fields: Array<{ name: string; value: string; inline?: boolean }> = [];

  fields.push({
    name: 'Summary',
    value: `${checked} checked · ${changed.length} changed · ${errors.length} errors · ${newSources.length} new`,
    inline: false,
  });

  // Changed sources (the main event)
  const dashboardChanges = changed.filter(r => r.sourceType === 'dashboard');
  const irChanges = changed.filter(r => r.sourceType === 'ir_page');

  if (dashboardChanges.length > 0) {
    fields.push({
      name: 'Dashboard Changes',
      value: dashboardChanges
        .map(r => `**${r.ticker}** — [${r.name}](${r.url})`)
        .join('\n'),
    });
  }

  if (irChanges.length > 0) {
    fields.push({
      name: 'IR Page Changes',
      value: irChanges
        .map(r => `**${r.ticker}** — [${r.name}](${r.url})`)
        .join('\n'),
    });
  }

  // Persistent errors (>3 consecutive failures)
  const persistentErrors = errors.filter(r => !r.isNew);
  if (persistentErrors.length > 0) {
    fields.push({
      name: 'Fetch Errors',
      value: persistentErrors
        .slice(0, 5)
        .map(r => `${r.ticker}: ${r.error}`)
        .join('\n'),
      inline: false,
    });
  }

  const hasDashboardChange = dashboardChanges.length > 0;

  return {
    embed: {
      title: `Source Monitor: ${changed.length} page${changed.length === 1 ? '' : 's'} changed`,
      color: hasDashboardChange ? 0xf39c12 : 0x3498db,  // Orange for dashboards, blue for IR only
      fields,
    },
    shouldMention: hasDashboardChange,  // Mention for dashboard changes (more likely actionable)
  };
}

// ── Route Handler ───────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get('manual') === 'true';
  const dryRun = searchParams.get('dryRun') === 'true';
  const tickerFilter = searchParams.get('ticker') || undefined;

  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const d1 = D1Client.fromEnv();
  await ensureTable(d1);

  const sources = getSourcesToCheck(tickerFilter);
  const results = await checkSources(d1, sources);

  const changed = results.filter(r => r.changed);
  const errors = results.filter(r => r.error);
  const newSources = results.filter(r => r.isNew);

  let discordSent = false;
  if (!dryRun) {
    const formatted = formatDiscordEmbed(results);
    if (formatted) {
      discordSent = await sendDiscordEmbed(formatted.embed, formatted.shouldMention);
    }
  }

  return NextResponse.json({
    success: true,
    dryRun,
    discordSent,
    summary: {
      checked: results.length,
      changed: changed.length,
      errors: errors.length,
      newSources: newSources.length,
    },
    changed: changed.map(r => ({
      ticker: r.ticker,
      sourceType: r.sourceType,
      name: r.name,
      url: r.url,
    })),
    errors: errors.map(r => ({
      ticker: r.ticker,
      url: r.url,
      error: r.error,
    })),
    ...(tickerFilter ? { results } : {}),
  });
}

export const runtime = 'nodejs';
export const maxDuration = 120;  // 2 minutes — lots of sequential fetches
