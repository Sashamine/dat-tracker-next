/**
 * Remixpoint (3825.T) Website Scraper
 *
 * Extracts BTC holdings from remixpoint.co.jp/digital-asset/ page.
 * The site displays precise crypto holdings as static HTML:
 * - Bitcoin (BTC): 1,411.29831101
 * - Ethereum (ETH): 901.44672542
 * - XRP: 1,191,204.799501
 * - Solana (SOL): 13,920.07255868
 * - Dogecoin (DOGE): 2,802,311.99657
 *
 * Note: No explicit "as of" date on the page — we use the fetch date.
 *
 * Currently supports: Remixpoint (3825.T)
 */

export interface RemixpointWebsiteData {
  btcHoldings: number | null;
  ethHoldings: number | null;
  xrpHoldings: number | null;
  solHoldings: number | null;
  dogeHoldings: number | null;
}

/**
 * Fetch and parse crypto holdings from remixpoint.co.jp.
 */
export async function fetchRemixpointWebsite(): Promise<RemixpointWebsiteData> {
  const res = await fetch('https://www.remixpoint.co.jp/digital-asset/', {
    headers: {
      'User-Agent': 'dat-tracker-next/1.0 (+https://github.com/Sashamine/dat-tracker-next)',
      'Accept': 'text/html',
      'Accept-Language': 'ja,en;q=0.9',
    },
  });

  if (!res.ok) throw new Error(`remixpoint.co.jp fetch failed: ${res.status}`);
  const html = await res.text();

  return parseRemixpointPage(html);
}

/**
 * Parse crypto holdings from Remixpoint digital-asset page HTML.
 *
 * The page has rows with asset name and precise holding amounts.
 * Pattern in HTML: "Bitcoin（BTC）" near "1,411.29831101"
 */
export function parseRemixpointPage(html: string): RemixpointWebsiteData {
  const result: RemixpointWebsiteData = {
    btcHoldings: null,
    ethHoldings: null,
    xrpHoldings: null,
    solHoldings: null,
    dogeHoldings: null,
  };

  // Strip HTML tags for text matching
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Pattern: "Bitcoin（BTC）" followed by a number with many decimals
  const btcMatch = text.match(/Bitcoin[^0-9]*BTC[^0-9]*([0-9,]+\.\d+)/i);
  if (btcMatch) {
    result.btcHoldings = parseFloat(btcMatch[1].replace(/,/g, ''));
  }

  // Ethereum
  const ethMatch = text.match(/Ethereum[^0-9]*ETH[^0-9]*([0-9,]+\.\d+)/i);
  if (ethMatch) {
    result.ethHoldings = parseFloat(ethMatch[1].replace(/,/g, ''));
  }

  // XRP
  const xrpMatch = text.match(/XRP[^0-9]*([0-9,]+\.\d+)/i);
  if (xrpMatch) {
    result.xrpHoldings = parseFloat(xrpMatch[1].replace(/,/g, ''));
  }

  // Solana
  const solMatch = text.match(/Solana[^0-9]*SOL[^0-9]*([0-9,]+\.\d+)/i);
  if (solMatch) {
    result.solHoldings = parseFloat(solMatch[1].replace(/,/g, ''));
  }

  // Dogecoin
  const dogeMatch = text.match(/Dogecoin[^0-9]*DOGE[^0-9]*([0-9,]+\.\d+)/i);
  if (dogeMatch) {
    result.dogeHoldings = parseFloat(dogeMatch[1].replace(/,/g, ''));
  }

  return result;
}
