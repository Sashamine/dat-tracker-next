/**
 * BTCT.V (Bitcoin Treasury Corp) Website Scraper
 *
 * Extracts BTC holdings and share count from btctcorp.com homepage.
 * The site displays key metrics as static HTML (manually updated):
 * - Bitcoin Holdings: 761.63
 * - Shares Outstanding: 9,893,980
 * - Diluted Shares Outstanding: 11,977,313
 * - Bitcoin per Share (BPS): ₿0.00006359
 * - "As of February 28, 2026"
 *
 * Currently supports: Bitcoin Treasury Corp (BTCT.V / BTCTF)
 */

export interface BtctWebsiteData {
  btcHoldings: number | null;
  sharesOutstanding: number | null;
  dilutedShares: number | null;
  btcPerShare: number | null;
  asOfDate: string | null;
}

/**
 * Fetch and parse BTC holdings from btctcorp.com homepage.
 */
export async function fetchBtctWebsite(): Promise<BtctWebsiteData> {
  const res = await fetch('https://btctcorp.com', {
    headers: {
      'User-Agent': 'dat-tracker-next/1.0 (+https://github.com/Sashamine/dat-tracker-next)',
      'Accept': 'text/html',
    },
  });

  if (!res.ok) throw new Error(`btctcorp.com fetch failed: ${res.status}`);
  const html = await res.text();

  return parseBtctHomepage(html);
}

/**
 * Parse BTC holdings data from btctcorp.com HTML.
 *
 * The page structure has metrics in heading/paragraph pairs:
 * - "Bitcoin Holdings" heading with "761.63" value
 * - "Shares Outstanding" heading with "9,893,980" value
 * - "As of February 28, 2026" date reference
 */
export function parseBtctHomepage(html: string): BtctWebsiteData {
  const result: BtctWebsiteData = {
    btcHoldings: null,
    sharesOutstanding: null,
    dilutedShares: null,
    btcPerShare: null,
    asOfDate: null,
  };

  // Strip HTML tags for text matching
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  // Pattern 1: "Bitcoin Holdings" followed by a number
  const holdingsMatch = text.match(/Bitcoin\s+Holdings[:\s]+([0-9,]+(?:\.\d+)?)/i);
  if (holdingsMatch) {
    result.btcHoldings = parseFloat(holdingsMatch[1].replace(/,/g, ''));
  }

  // Pattern 2: "Shares Outstanding" followed by a number
  const sharesMatch = text.match(/Shares\s+Outstanding[:\s]+([0-9,]+)/i);
  if (sharesMatch) {
    result.sharesOutstanding = parseFloat(sharesMatch[1].replace(/,/g, ''));
  }

  // Pattern 3: "Diluted Shares Outstanding" followed by a number
  const dilutedMatch = text.match(/Diluted\s+Shares\s+Outstanding[:\s]+([0-9,]+)/i);
  if (dilutedMatch) {
    result.dilutedShares = parseFloat(dilutedMatch[1].replace(/,/g, ''));
  }

  // Pattern 4: "Bitcoin per Share" or "BPS" followed by a number
  const bpsMatch = text.match(/Bitcoin\s+per\s+Share[^0-9]*([0-9.]+)/i);
  if (bpsMatch) {
    result.btcPerShare = parseFloat(bpsMatch[1]);
  }

  // Pattern 5: "As of Month DD, YYYY"
  const dateMatch = text.match(/As\s+of\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
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
