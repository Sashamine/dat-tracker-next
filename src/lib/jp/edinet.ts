/**
 * Minimal EDINET API v2 client.
 *
 * Docs index: https://disclosure2dl.edinet-fsa.go.jp/guide/static/disclosure/WZEK0110.html
 * Base URL: https://api.edinet-fsa.go.jp/api/v2
 */

export type EdinetDocumentListItem = {
  docID: string;
  edinetCode: string;
  secCode?: string;
  filerName: string;
  docDescription?: string;
  formCode?: string;
  ordinanceCode?: string;
  submitDateTime?: string;
  periodStart?: string;
  periodEnd?: string;
  docTypeCode?: string;
};

export type EdinetDocumentListResponse = {
  metadata?: any;
  results?: EdinetDocumentListItem[];
};

const EDINET_BASE = 'https://api.edinet-fsa.go.jp/api/v2';

function getKey(): string {
  const key = process.env.EDINET_API_KEY;
  if (!key) throw new Error('Missing EDINET_API_KEY');
  return key;
}

export async function edinetListDocuments(params: {
  date: string; // YYYY-MM-DD
  type?: 1 | 2; // 2: metadata+list (commonly used)
}): Promise<EdinetDocumentListResponse> {
  const key = getKey();
  const url = new URL(`${EDINET_BASE}/documents.json`);
  url.searchParams.set('date', params.date);
  url.searchParams.set('type', String(params.type ?? 2));
  url.searchParams.set('Subscription-Key', key);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`EDINET documents.json failed: ${res.status} ${res.statusText} ${text.slice(0, 300)}`);
  }
  return (await res.json()) as EdinetDocumentListResponse;
}

export async function edinetDownloadDocument(params: {
  docID: string;
  type?: number; // 1: XBRL zip
}): Promise<Uint8Array> {
  const key = getKey();
  const url = new URL(`${EDINET_BASE}/documents/${encodeURIComponent(params.docID)}`);
  url.searchParams.set('type', String(params.type ?? 1));
  url.searchParams.set('Subscription-Key', key);

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`EDINET document download failed: ${res.status} ${res.statusText} ${text.slice(0, 300)}`);
  }

  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}
