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
  pdfUrl?: string;    // PDF download URL if available
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
 * MFN renders press releases as <a> links with dates in the surrounding text.
 */
export function parseMfnHtml(html: string, slug: string): MfnRelease[] {
  const releases: MfnRelease[] = [];

  // MFN links follow pattern: /a/{slug}/{title-slug}
  // Each release has a date (YYYY-MM-DD) and title
  const RELEASE_RE = /<a[^>]*href="(\/a\/[^"]*)"[^>]*>([^<]+)<\/a>/gi;
  const DATE_RE = /(\d{4}-\d{2}-\d{2})\s+\d{2}:\d{2}/;

  // Split into chunks around each release link
  const chunks = html.split(/<a[^>]*href="\/a\//);

  for (const chunk of chunks.slice(1)) { // Skip first chunk (before any links)
    // Extract the URL
    const urlMatch = chunk.match(/^([^"]*)"[^>]*>([^<]*)</);
    if (!urlMatch) continue;

    const path = `/a/${urlMatch[1]}`;
    const title = urlMatch[2].trim();

    // Skip non-content links (navigation, etc.)
    if (!path.includes(slug)) continue;
    if (title.length < 10) continue;

    // Find the date near this link
    const dateMatch = chunk.match(DATE_RE) || html.slice(0, html.indexOf(chunk)).slice(-200).match(DATE_RE);
    const date = dateMatch ? dateMatch[1] : '';

    if (!date || !title) continue;

    // Check for PDF link
    const pdfMatch = chunk.match(/href="([^"]*\.pdf[^"]*)"/i);

    releases.push({
      title,
      date,
      url: `https://mfn.se${path}`,
      pdfUrl: pdfMatch ? pdfMatch[1] : undefined,
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
