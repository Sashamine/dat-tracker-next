import { HKEXFiling, parseFilingUrl } from './hkex';

export async function discoverHkexFilings(params: {
  stockCode: string; // e.g. 00434
  limit?: number;
}): Promise<HKEXFiling[]> {
  const code = params.stockCode.replace(/\.HK$/i, '');
  const url = `https://www.hkexnews.hk/listedco/listconews/sehk/search/search_active_main.xhtml?stockcode=${encodeURIComponent(code)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`HKEX search fetch failed: ${res.status} ${res.statusText} ${text.slice(0, 200)}`);
  }

  const html = await res.text();

  // Extract PDF URLs.
  const re = /https:\/\/www1\.hkexnews\.hk\/listedco\/listconews\/sehk\/\d{4}\/\d{4}\/\d+\.pdf/g;
  const urls = Array.from(new Set(html.match(re) || []));

  const out: HKEXFiling[] = [];
  for (const pdfUrl of urls) {
    const p = parseFilingUrl(pdfUrl);
    if (!p) continue;

    // Date not easily extracted without deeper parsing of HTML table; store null-ish string.
    out.push({
      stockCode: code.replace(/^0+/, '') || code,
      documentType: 'other',
      title: 'HKEX filing (discovered)',
      date: `${p.year}-${p.monthDay.slice(0, 2)}-${p.monthDay.slice(2, 4)}`,
      url: pdfUrl,
      docId: p.docId,
    });
  }

  // Sort newest first by docId (generally increasing with date)
  out.sort((a, b) => (b.docId || '').localeCompare(a.docId || ''));

  return out.slice(0, params.limit ?? 10);
}
