/**
 * LSE RNS (London Stock Exchange Regulatory News Service) Fetcher
 *
 * Fetches RNS announcements via InvestEgate (server-rendered HTML aggregator)
 * since the LSE API is an Angular SPA with no public JSON news endpoint.
 *
 * InvestEgate URL pattern:
 *   Company page: https://www.investegate.co.uk/company/{TIDM}
 *   Announcement:  https://www.investegate.co.uk/announcement/rns/{company-slug}/{title-slug}/{articleId}
 *
 * Currently supports: The Smarter Web Company (SWC)
 *
 * SWC "Bitcoin Purchase" RNS announcements contain:
 *   "Total Bitcoin Holdings: 2,695 Bitcoin"
 *   "Total Average Purchase Price: £82,553 per Bitcoin"
 */

/** RNS announcement parsed from InvestEgate */
export interface RnsAnnouncement {
  title: string;
  url: string;
  articleId: string;
}

/** Known LSE company slugs on InvestEgate */
const LSE_COMPANIES: Record<string, {
  tidm: string;
  investegateSlug: string;
  name: string;
}> = {
  'SWC': {
    tidm: 'SWC',
    investegateSlug: 'the-smarter-web-company-plc--swc',
    name: 'The Smarter Web Company',
  },
};

/**
 * Fetch recent RNS announcements from InvestEgate for a company.
 * Returns only Bitcoin-related announcements.
 */
export async function getRnsAnnouncements(tidm: string): Promise<RnsAnnouncement[]> {
  const company = LSE_COMPANIES[tidm];
  if (!company) throw new Error(`Unknown LSE TIDM: ${tidm}`);

  const url = `https://www.investegate.co.uk/company/${tidm}`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'dat-tracker-next/1.0 (+https://github.com/Sashamine/dat-tracker-next)',
      'Accept': 'text/html',
    },
  });

  if (!res.ok) throw new Error(`InvestEgate fetch failed: ${res.status}`);
  const html = await res.text();

  return parseInvestegateHtml(html, company.investegateSlug);
}

/**
 * Parse InvestEgate company page HTML for Bitcoin-related RNS announcements.
 */
export function parseInvestegateHtml(html: string, companySlug: string): RnsAnnouncement[] {
  const announcements: RnsAnnouncement[] = [];
  const baseUrl = 'https://www.investegate.co.uk/announcement/rns/';

  // Match announcement links: href="https://www.investegate.co.uk/announcement/rns/{slug}/{title-slug}/{id}"
  const LINK_RE = new RegExp(
    `href="(https://www\\.investegate\\.co\\.uk/announcement/rns/${companySlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([^/]+)/(\\d+))"[^>]*>([^<]+)`,
    'gi'
  );

  let match: RegExpExecArray | null;
  while ((match = LINK_RE.exec(html)) !== null) {
    const url = match[1];
    const articleId = match[3];
    const title = match[4].trim();

    // Only include Bitcoin Purchase announcements and Total Bitcoin Holdings Updates
    const titleLower = title.toLowerCase();
    if (titleLower.includes('bitcoin purchase') || titleLower.includes('bitcoin holdings')) {
      announcements.push({ title, url, articleId });
    }
  }

  // Deduplicate by articleId
  const seen = new Set<string>();
  return announcements.filter(a => {
    if (seen.has(a.articleId)) return false;
    seen.add(a.articleId);
    return true;
  });
}

/**
 * Fetch the full text of an RNS announcement from InvestEgate.
 */
export async function fetchRnsAnnouncementText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'dat-tracker-next/1.0 (+https://github.com/Sashamine/dat-tracker-next)',
      'Accept': 'text/html',
    },
  });

  if (!res.ok) throw new Error(`InvestEgate announcement fetch failed: ${res.status}`);
  const html = await res.text();

  // Extract announcement body text from HTML
  // InvestEgate wraps the RNS text in a specific container
  // Strip all HTML tags to get plain text
  const bodyText = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&pound;/g, '£')
    .replace(/\s+/g, ' ')
    .trim();

  return bodyText;
}

/**
 * Parse BTC holdings from SWC RNS announcement text.
 *
 * Patterns found in SWC "Bitcoin Purchase" announcements:
 * - "Total Bitcoin Holdings: 2,695 Bitcoin"
 * - "Total Bitcoin Holdings are now 2,692 Bitcoin"
 * - "Total Average Purchase Price: £82,553 per Bitcoin ($110,531 per Bitcoin)"
 */
export function parseBtcFromRnsText(text: string): {
  totalBtc: number | null;
  avgPriceGbp: number | null;
  avgPriceUsd: number | null;
  purchasedBtc: number | null;
  date: string | null;
} {
  const result = {
    totalBtc: null as number | null,
    avgPriceGbp: null as number | null,
    avgPriceUsd: null as number | null,
    purchasedBtc: null as number | null,
    date: null as string | null,
  };

  // Pattern 1: "Total Bitcoin Holdings: 2,695 Bitcoin" or "Total Bitcoin Holdings are now 2,692 Bitcoin"
  const totalMatch = text.match(/Total\s+Bitcoin\s+Holdings[\s:]+(?:are\s+now\s+)?([\d,]+(?:\.\d+)?)\s*Bitcoin/i);
  if (totalMatch) {
    result.totalBtc = parseFloat(totalMatch[1].replace(/,/g, ''));
  }

  // Pattern 2: "purchased X Bitcoin" or "purchased X BTC"
  const purchasedMatch = text.match(/purchased?\s+([\d,]+(?:\.\d+)?)\s*Bitcoin/i);
  if (purchasedMatch) {
    result.purchasedBtc = parseFloat(purchasedMatch[1].replace(/,/g, ''));
  }

  // Pattern 3: "Total Average Purchase Price: £82,553 per Bitcoin"
  const avgGbpMatch = text.match(/Total\s+Average\s+Purchase\s+Price[:\s]+£([\d,]+(?:\.\d+)?)\s*per\s*Bitcoin/i);
  if (avgGbpMatch) {
    result.avgPriceGbp = parseFloat(avgGbpMatch[1].replace(/,/g, ''));
  }

  // Pattern 4: "$110,531 per Bitcoin" (USD equivalent)
  const avgUsdMatch = text.match(/\$([\d,]+(?:\.\d+)?)\s*per\s*Bitcoin/i);
  if (avgUsdMatch) {
    result.avgPriceUsd = parseFloat(avgUsdMatch[1].replace(/,/g, ''));
  }

  // Pattern 5: Date from announcement text — "10 March 2026" or "1 March 2026"
  const dateMatch = text.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i);
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const monthName = dateMatch[2];
    const year = dateMatch[3];
    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };
    const month = months[monthName.toLowerCase()];
    if (month) {
      result.date = `${year}-${month}-${day}`;
    }
  }

  return result;
}
