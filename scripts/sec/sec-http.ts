import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export type SecFetchOptions = {
  cacheDir: string;
  /** Cache TTL in milliseconds. Default: 7 days */
  ttlMs?: number;
  /** Min delay between requests to the same host. Default: 1100ms */
  minDelayMs?: number;
  /** Max retry attempts. Default: 5 */
  maxAttempts?: number;
  /** Override UA; otherwise uses process.env.SEC_USER_AGENT */
  userAgent?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function sha1(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

type CacheMeta = {
  url: string;
  fetchedAt: string;
  status: number;
  contentType?: string;
};

const lastByHost = new Map<string, number>();

async function rateLimit(url: URL, minDelayMs: number) {
  const host = url.host;
  const now = Date.now();
  const last = lastByHost.get(host) ?? 0;
  const wait = last + minDelayMs - now;
  if (wait > 0) await sleep(wait);
  lastByHost.set(host, Date.now());
}

function backoffMs(attempt: number) {
  // attempt starts at 1
  const base = 400;
  const jitter = Math.floor(Math.random() * 250);
  return Math.min(10_000, base * 2 ** (attempt - 1) + jitter);
}

export async function secFetchText(urlStr: string, opts: SecFetchOptions): Promise<{ text: string; fromCache: boolean; meta: CacheMeta }> {
  const url = new URL(urlStr);
  const ttlMs = opts.ttlMs ?? 7 * 24 * 60 * 60 * 1000;
  const minDelayMs = opts.minDelayMs ?? 1100;
  const maxAttempts = opts.maxAttempts ?? 5;
  const userAgent = opts.userAgent ?? process.env.SEC_USER_AGENT;

  if (!userAgent) {
    throw new Error('SEC_USER_AGENT env var is required (must include contact info).');
  }

  await ensureDir(opts.cacheDir);
  const key = sha1(urlStr);
  const bodyPath = path.join(opts.cacheDir, `${key}.body`);
  const metaPath = path.join(opts.cacheDir, `${key}.json`);

  try {
    const metaRaw = await fs.readFile(metaPath, 'utf8');
    const meta: CacheMeta = JSON.parse(metaRaw);
    const age = Date.now() - new Date(meta.fetchedAt).getTime();
    if (age <= ttlMs) {
      const text = await fs.readFile(bodyPath, 'utf8');
      return { text, fromCache: true, meta };
    }
  } catch {
    // cache miss
  }

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await rateLimit(url, minDelayMs);

      const res = await fetch(urlStr, {
        headers: {
          'User-Agent': userAgent,
          'Accept': 'application/json,text/html,text/plain,*/*',
          'Accept-Encoding': 'gzip, deflate, br',
        },
      });

      const contentType = res.headers.get('content-type') ?? undefined;
      const status = res.status;
      const text = await res.text();

      if (!res.ok) {
        // SEC will sometimes return 403/429; retry those.
        if ([403, 429, 500, 502, 503, 504].includes(status) && attempt < maxAttempts) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new Error(`SEC fetch failed: ${status} ${res.statusText} for ${urlStr}`);
      }

      const meta: CacheMeta = { url: urlStr, fetchedAt: new Date().toISOString(), status, contentType };
      await fs.writeFile(bodyPath, text, 'utf8');
      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2), 'utf8');
      return { text, fromCache: false, meta };
    } catch (e) {
      lastErr = e;
      if (attempt < maxAttempts) {
        await sleep(backoffMs(attempt));
        continue;
      }
    }
  }

  throw lastErr;
}
