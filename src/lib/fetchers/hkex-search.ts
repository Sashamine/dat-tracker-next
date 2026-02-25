import { HKEXFiling, parseFilingUrl } from './hkex';

export async function discoverHkexFilings(params: {
  stockCode: string; // e.g. 00434
  limit?: number;
  searchUrlOverride?: string;
}): Promise<HKEXFiling[]> {
  const code = params.stockCode.replace(/\.HK$/i, '');

  const candidates = [
    ...(params.searchUrlOverride ? [params.searchUrlOverride] : []),
    `https://www.hkexnews.hk/listedco/listconews/sehk/search/search_active_main.xhtml?stockcode=${encodeURIComponent(code)}`,
    `https://www.hkexnews.hk/listedco/listconews/sehk/search/search_active_main.aspx?stockcode=${encodeURIComponent(code)}`,
    `https://www.hkexnews.hk/listedco/listconews/advancedsearch/search_active_main.aspx?stockcode=${encodeURIComponent(code)}`,
    `https://www1.hkexnews.hk/listedco/listconews/sehk/search/search_active_main.aspx?stockcode=${encodeURIComponent(code)}`,
  ];

  let res: Response | null = null;

  for (const url of candidates) {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (r.ok) {
      res = r;
      break;
    }
  }

  if (!res) {
    throw new Error('HKEX search fetch failed: all candidate URLs returned non-200');
  }

  const html = await res.text();

  // Extract PDF URLs.
  const re = /https:\/\/www1\.hkexnews\.hk\/listedco\/listconews\/sehk\/\d{4}\/\d{4}\/\d+\.pdf/g;
  const urls = Array.from(new Set(html.match(re) || []));

  const out: HKEXFiling[] = [];
  for (const pdfUrl of urls) {
    const p = parseFilingUrl(pdfUrl);
    if (!p) continue;

    out.push({
      stockCode: code.replace(/^0+/, '') || code,
      documentType: 'other',
      title: 'HKEX filing (discovered)',
      date: `${p.year}-${p.monthDay.slice(0, 2)}-${p.monthDay.slice(2, 4)}`,
      url: pdfUrl,
      docId: p.docId,
    });
  }

  out.sort((a, b) => (b.docId || '').localeCompare(a.docId || ''));

  return out.slice(0, params.limit ?? 10);
}
