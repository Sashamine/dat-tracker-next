/**
 * MFN (Modular Finance) Fetcher — Swedish Press Release Platform
 *
 * Scrapes press releases from mfn.se for Swedish DAT companies.
 * MFN is server-side rendered HTML with no public API.
 *
 * Currently supports: H100 Group (H100.ST)
 *
 * Filing titles contain BTC holdings:
 * - "Acquires 4.39 BTC – Total Holdings Reach 1,051 BTC"
 * - "Acquires 26.75 BTC through Zero-Coupon Convertible Debentures"
 * - "Total Bitcoin Holdings Post-Purchase: 1,051"
 */

/** MFN press release parsed from HTML */
export interface MfnRelease {
  title: string;
  date: string;       // YYYY-MM-DD
  url: string;        // Full URL to the release
}

/** Known MFN company slugs */
const MFN_COMPANIES: Record<string, { slug: string; name: string }> = {
  'H100.ST': { slug: 'h100-group', name: 'H100 Group' },
};

/**
 * Fetch recent press releases from MFN for a company.
 */
export async function getMfnReleases(ticker: string, limit = 20): Promise<MfnRelease[]> {
  const company = MFN_COMPANIES[ticker];
  if (!company) throw new Error(`Unknown MFN ticker: ${ticker}`);

  const url = `https://mfn.se/a/${company.slug}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'dat-tracker-next/1.0 (+https://github.com/Sashamine/dat-tracker-next)',
      'Accept': 'text/html',
      'Accept-Language': 'en,sv;q=0.9',
    },
  });

  if (!res.ok) throw new Error(`MFN fetch failed: ${res.status}`);
  const html = await res.text();

  return parseMfnHtml(html, company.slug).slice(0, limit);
}

/**
 * Parse MFN HTML feed into structured releases.
 *
 * MFN renders each release as a `.short-item` div with:
 * - onclick="goToNewsItem(event, '/a/{slug}/{title-slug}')"
 * - <span class="compressed-date">2026-02-06</span>
 * - Title text inside <a href="/a/...">Title</a>
 */
export function parseMfnHtml(html: string, slug: string): MfnRelease[] {
  const releases: MfnRelease[] = [];

  // Match each short-item block that links to this company
  const ITEM_RE = /goToNewsItem\(event,\s*'(\/a\/[^']+)'\)/g;
  let match: RegExpExecArray | null;

  while ((match = ITEM_RE.exec(html)) !== null) {
    const path = match[1];
    if (!path.includes(slug)) continue;

    // Extract surrounding context — title-link appears AFTER goToNewsItem
    const start = Math.max(0, match.index - 300);
    const end = Math.min(html.length, match.index + 1000);
    const context = html.slice(start, end);

    // Extract date from compressed-date span
    const dateMatch = context.match(/compressed-date[^>]*>(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : '';

    // Extract title from <a class="title-link item-link" ...>Title</a>
    const titleMatch = context.match(/title-link\s+item-link[^>]*>([^<]+)/);
    let title = titleMatch ? titleMatch[1].trim() : '';

    // Fallback: derive title from URL slug
    if (!title) {
      const slugPart = path.split('/').pop() || '';
      title = slugPart.replace(/-/g, ' ');
    }

    if (!date || title.length < 5) continue;

    releases.push({
      title,
      date,
      url: `https://mfn.se${path}`,
    });
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  return releases.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

/**
 * Parse BTC holdings from MFN press release title.
 *
 * H100 Group title patterns:
 * - "Acquires 4.39 BTC – Total Holdings Reach 1,051 BTC"
 * - "Total Bitcoin Holdings Post-Purchase: 1,051"
 * - "Acquires 26.75 BTC through Zero-Coupon Convertible Debentures"
 * - "Total Holdings Reach 1,047 BTC"
 */
export function parseBtcFromMfnTitle(title: string): number | null {
  // Pattern 1: "Total Holdings Reach X,XXX BTC" or "Total Holdings Reach X BTC"
  const reachMatch = title.match(/[Tt]otal\s+[Hh]oldings?\s+[Rr]each\s+([\d,]+(?:\.\d+)?)\s*BTC/i);
  if (reachMatch) {
    return parseFloat(reachMatch[1].replace(/,/g, ''));
  }

  // Pattern 2: "Total Bitcoin Holdings Post-Purchase: X,XXX"
  const postPurchaseMatch = title.match(/[Tt]otal\s+(?:Bitcoin\s+)?[Hh]oldings?\s+(?:Post-Purchase|after)[\s:]+(\d[\d,]*(?:\.\d+)?)/i);
  if (postPurchaseMatch) {
    return parseFloat(postPurchaseMatch[1].replace(/,/g, ''));
  }

  // Pattern 3: "total of X BTC" (similar to AMF)
  const totalOfMatch = title.match(/total\s+of\s+([\d,]+(?:\.\d+)?)\s*BTC/i);
  if (totalOfMatch) {
    return parseFloat(totalOfMatch[1].replace(/,/g, ''));
  }

  // Pattern 4: "holdings to X BTC"
  const holdingsToMatch = title.match(/holdings?\s+to\s+([\d,]+(?:\.\d+)?)\s*BTC/i);
  if (holdingsToMatch) {
    return parseFloat(holdingsToMatch[1].replace(/,/g, ''));
  }

  return null;
}
