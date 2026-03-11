/**
 * Luxxfolio (LUXFF) Website News Scraper
 *
 * Scrapes luxxfolio.com/news for the latest press release containing
 * LTC holdings data. Press releases follow a consistent pattern:
 * - "Total LTC holdings: 24,439.464 LTC"
 * - "73,686 litoshis per share"
 * - "33,167,164 outstanding shares"
 *
 * The /news page lists all press releases with links to individual
 * articles at luxxfolio.com/{article-slug}/
 *
 * Currently supports: Luxxfolio Holdings (CSE: LUXX, OTCQB: LUXFF)
 */

export interface LuxxfolioData {
  ltcHoldings: number | null;
  sharesOutstanding: number | null;
  litoshisPerShare: number | null;
  asOfDate: string | null;
  sourceUrl: string | null;
}

/**
 * Fetch the news listing page, find the most recent press release with
 * LTC holdings data, fetch that article, and extract holdings.
 */
export async function fetchLuxxfolioNews(): Promise<LuxxfolioData> {
  // Step 1: Get the news listing page
  const listRes = await fetch('https://www.luxxfolio.com/news', {
    headers: {
      'User-Agent': 'dat-tracker-next/1.0 (+https://github.com/Sashamine/dat-tracker-next)',
      'Accept': 'text/html',
    },
  });

  if (!listRes.ok) throw new Error(`luxxfolio.com/news fetch failed: ${listRes.status}`);
  const listHtml = await listRes.text();

  // Step 2: Extract article URLs from the listing page
  const articleUrls = extractArticleUrls(listHtml);
  if (articleUrls.length === 0) {
    throw new Error('No article URLs found on luxxfolio.com/news');
  }

  // Step 3: Try the most recent articles (up to 3) looking for LTC data
  for (const url of articleUrls.slice(0, 3)) {
    const articleRes = await fetch(url, {
      headers: {
        'User-Agent': 'dat-tracker-next/1.0 (+https://github.com/Sashamine/dat-tracker-next)',
        'Accept': 'text/html',
      },
    });

    if (!articleRes.ok) continue;
    const articleHtml = await articleRes.text();
    const data = parseLuxxfolioArticle(articleHtml);

    if (data.ltcHoldings !== null) {
      data.sourceUrl = url;
      return data;
    }
  }

  // No article had LTC data
  return {
    ltcHoldings: null,
    sharesOutstanding: null,
    litoshisPerShare: null,
    asOfDate: null,
    sourceUrl: null,
  };
}

/**
 * Extract article URLs from the news listing page.
 * Links point to luxxfolio.com/{slug}/ pattern.
 */
export function extractArticleUrls(html: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();

  // Match href links to luxxfolio.com articles
  const LINK_RE = /href="(https?:\/\/(?:www\.)?luxxfolio\.com\/[a-z0-9-]+\/)"/gi;
  let match: RegExpExecArray | null;
  while ((match = LINK_RE.exec(html)) !== null) {
    const url = match[1];
    // Skip non-article pages
    if (url.includes('/news/') || url.includes('/contact') || url.includes('/about') ||
        url.includes('/privacy') || url.includes('/terms') || url.includes('/team') ||
        url.includes('/feed/') || url.includes('/wp-') || url.endsWith('/news/')) {
      continue;
    }
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}

/**
 * Parse LTC holdings from a Luxxfolio press release article.
 *
 * Patterns:
 * - "24,439.464 LTC" or "total LTC holdings: 24,439 LTC"
 * - "73,686 litoshis per share"
 * - "33,167,164 outstanding shares" or "XX,XXX,XXX shares"
 * - Date from "February 11, 2026" pattern in article
 */
export function parseLuxxfolioArticle(html: string): LuxxfolioData {
  const result: LuxxfolioData = {
    ltcHoldings: null,
    sharesOutstanding: null,
    litoshisPerShare: null,
    asOfDate: null,
    sourceUrl: null,
  };

  // Strip HTML to text
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  // Pattern 1: LTC holdings — "24,439.464 LTC" near "holdings" or "treasury"
  // Look for the largest LTC number (total holdings, not incremental)
  const ltcMatches: number[] = [];
  const LTC_RE = /([0-9,]+(?:\.\d+)?)\s*LTC/gi;
  let m: RegExpExecArray | null;
  while ((m = LTC_RE.exec(text)) !== null) {
    const n = parseFloat(m[1].replace(/,/g, ''));
    if (n >= 100 && n < 10_000_000) { // Sanity: >100 LTC, <10M LTC
      ltcMatches.push(n);
    }
  }
  if (ltcMatches.length > 0) {
    // Take the largest value (total holdings, not incremental purchases)
    result.ltcHoldings = Math.max(...ltcMatches);
  }

  // Pattern 2: Shares — "33,167,164 common shares outstanding" or "XX,XXX,XXX shares"
  const sharesMatch = text.match(/([0-9,]+)\s+(?:common\s+)?(?:outstanding\s+)?shares\s+(?:outstanding)?/i);
  if (sharesMatch) {
    const n = parseFloat(sharesMatch[1].replace(/,/g, ''));
    if (n >= 1_000_000 && n < 10_000_000_000) { // Sanity check
      result.sharesOutstanding = n;
    }
  }

  // Pattern 3: Litoshis per share — "73,686 litoshis per share"
  const litoshisMatch = text.match(/([0-9,]+)\s+litoshis\s+per\s+share/i);
  if (litoshisMatch) {
    result.litoshisPerShare = parseFloat(litoshisMatch[1].replace(/,/g, ''));
  }

  // Pattern 4: Date — "February 11, 2026"
  const dateMatch = text.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (dateMatch) {
    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };
    const month = months[dateMatch[1].toLowerCase()];
    const day = dateMatch[2].padStart(2, '0');
    const year = dateMatch[3];
    if (month) {
      result.asOfDate = `${year}-${month}-${day}`;
    }
  }

  return result;
}
