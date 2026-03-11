/**
 * CVM (Comissão de Valores Mobiliários) Fetcher — Brazilian Securities Regulator
 *
 * Fetches filings from the CVM open data portal for Brazilian DAT companies.
 *
 * Pipeline:
 * 1. Download yearly IPE ZIP from dados.cvm.gov.br
 * 2. Extract CSV index, filter by company CVM code + Bitcoin-related titles
 * 3. Download individual PDFs from RAD/ENET
 * 4. Extract BTC holdings from Portuguese text using pdf-parse
 *
 * Currently supports: OranjeBTC (OBTC3) — CVM code 27910
 *
 * OranjeBTC publishes weekly "Comunicado ao Mercado" filings containing:
 * - "Total BTC em reservas: 3.723,0 BTC"
 * - "155.300.500 ações ON emitidas fora de tesouraria"
 * - BTC Yield metrics
 */

/** CVM filing parsed from the IPE CSV index */
export interface CvmFiling {
  cnpj: string;
  companyName: string;
  cvmCode: string;
  referenceDate: string;   // YYYY-MM-DD
  category: string;        // "Comunicado ao Mercado", "Fato Relevante", etc.
  type: string;
  subject: string;         // Filing title/description
  deliveryDate: string;    // YYYY-MM-DD
  protocol: string;
  version: string;
  downloadUrl: string;
}

/** Known CVM companies */
const CVM_COMPANIES: Record<string, {
  cvmCode: string;
  cnpj: string;
  name: string;
}> = {
  'OBTC3': {
    cvmCode: '27910',
    cnpj: '59.693.110/0001-29',
    name: 'OranjeBTC',
  },
};

const CVM_DATA_BASE = 'https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/IPE/DADOS';

/**
 * Fetch the IPE CSV index for a given year from CVM.
 * Downloads the ZIP, extracts the CSV, and returns parsed rows.
 */
export async function getCvmFilingIndex(year: number): Promise<CvmFiling[]> {
  const zipUrl = `${CVM_DATA_BASE}/ipe_cia_aberta_${year}.zip`;
  const res = await fetch(zipUrl, {
    headers: {
      'User-Agent': 'dat-tracker-next/1.0 (+https://github.com/Sashamine/dat-tracker-next)',
      'Accept': '*/*',
    },
  });

  if (!res.ok) throw new Error(`CVM ZIP fetch failed: ${res.status}`);
  const zipBuf = await res.arrayBuffer();

  // Extract CSV from ZIP using built-in DecompressionStream
  const csvText = await extractCsvFromZip(new Uint8Array(zipBuf));
  return parseCvmCsv(csvText);
}

/**
 * Extract the CSV file from a CVM ZIP archive.
 * Uses manual ZIP parsing since we know there's exactly one CSV file.
 */
async function extractCsvFromZip(zipData: Uint8Array): Promise<string> {
  // ZIP local file header signature = PK\x03\x04
  // Find the compressed data and decompress with DecompressionStream
  const view = new DataView(zipData.buffer, zipData.byteOffset);

  // Verify ZIP signature
  if (view.getUint32(0, true) !== 0x04034b50) {
    throw new Error('Not a valid ZIP file');
  }

  // Parse local file header
  const compressionMethod = view.getUint16(8, true);
  const compressedSize = view.getUint32(18, true);
  const filenameLength = view.getUint16(26, true);
  const extraLength = view.getUint16(28, true);
  const dataOffset = 30 + filenameLength + extraLength;

  const compressedData = zipData.slice(dataOffset, dataOffset + compressedSize);

  if (compressionMethod === 0) {
    // Stored (no compression)
    return new TextDecoder('latin1').decode(compressedData);
  }

  if (compressionMethod === 8) {
    // Deflate — use DecompressionStream
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressedData);
    writer.close();

    const reader = ds.readable.getReader();
    const chunks: Uint8Array[] = [];
    let done = false;
    while (!done) {
      const result = await reader.read();
      if (result.done) { done = true; break; }
      chunks.push(result.value);
    }

    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }

    return new TextDecoder('latin1').decode(combined);
  }

  throw new Error(`Unsupported ZIP compression method: ${compressionMethod}`);
}

/**
 * Parse CVM IPE CSV into structured filings.
 * CSV is semicolon-delimited with Latin-1 encoding.
 */
function parseCvmCsv(csvText: string): CvmFiling[] {
  const lines = csvText.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  // Skip header line
  return lines.slice(1).map(line => {
    const fields = line.split(';');
    return {
      cnpj: fields[0] || '',
      companyName: fields[1] || '',
      cvmCode: fields[2] || '',
      referenceDate: fields[3] || '',
      category: fields[4] || '',
      type: fields[5] || '',
      subject: fields[7] || '',
      deliveryDate: fields[8] || '',
      protocol: fields[10] || '',
      version: fields[11] || '',
      downloadUrl: fields[12] || '',
    };
  });
}

/**
 * Filter CVM filings to Bitcoin-related announcements for a company.
 */
export function filterBitcoinFilings(filings: CvmFiling[], ticker: string): CvmFiling[] {
  const company = CVM_COMPANIES[ticker];
  if (!company) throw new Error(`Unknown CVM ticker: ${ticker}`);

  return filings.filter(f => {
    if (f.cvmCode !== company.cvmCode) return false;
    const subject = f.subject.toLowerCase();
    return subject.includes('bitcoin') || subject.includes('btc');
  });
}

/**
 * Download a CVM filing PDF.
 * CVM's ASP.NET server requires browser-like headers for complete downloads.
 */
export async function downloadCvmPdf(downloadUrl: string): Promise<ArrayBuffer> {
  const res = await fetch(downloadUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; dat-tracker-next/1.0)',
      'Accept': 'application/pdf,*/*',
    },
  });

  if (!res.ok) throw new Error(`CVM PDF download failed: ${res.status}`);
  return res.arrayBuffer();
}

/**
 * Parse BTC holdings from OranjeBTC CVM filing PDF text (Portuguese).
 *
 * Key patterns in weekly "Comunicado ao Mercado":
 * - "Total BTC em reservas: 3.723,0 BTC"
 * - "totalizando 155.300.500 ações ON emitidas fora de tesouraria"
 * - "Bitcoin adquiridos: 0,7"
 * - "BTC Yield Acumulado: 2,54%"
 *
 * Note: Brazilian number format uses . for thousands, , for decimals
 */
export function parseBtcFromCvmPdf(text: string): {
  totalBtc: number | null;
  sharesOutstanding: number | null;
  btcAcquired: number | null;
  btcYield: number | null;
  periodStart: string | null;
  periodEnd: string | null;
} {
  const result = {
    totalBtc: null as number | null,
    sharesOutstanding: null as number | null,
    btcAcquired: null as number | null,
    btcYield: null as number | null,
    periodStart: null as string | null,
    periodEnd: null as string | null,
  };

  // Pattern 1: "Total BTC em reservas: 3.723,0 BTC"
  const totalMatch = text.match(/Total\s+BTC\s+em\s+reservas[:\s]+([\d.]+,\d+)\s*BTC/i);
  if (totalMatch) {
    result.totalBtc = parseBrazilianNumber(totalMatch[1]);
  }

  // Pattern 2: "totalizando 155.300.500 ações ON emitidas fora de tesouraria"
  const sharesMatch = text.match(/totalizando\s+([\d.]+)\s+a[çc][õo]es\s+ON\s+emitidas\s+fora/i);
  if (sharesMatch) {
    result.sharesOutstanding = parseBrazilianNumber(sharesMatch[1]);
  }

  // Pattern 3: "Bitcoin adquiridos: 0,7" or "Bitcoin adquiridos: 25,3"
  const acquiredMatch = text.match(/Bitcoin\s+adquiridos[:\s]+([\d.,]+)/i);
  if (acquiredMatch) {
    result.btcAcquired = parseBrazilianNumber(acquiredMatch[1]);
  }

  // Pattern 4: "BTC Yield Acumulado: 2,54%"
  const yieldMatch = text.match(/BTC\s+Yield\s+Acumulado[:\s]+([\d.,]+)%/i);
  if (yieldMatch) {
    result.btcYield = parseBrazilianNumber(yieldMatch[1]);
  }

  // Pattern 5: Period dates — "entre 23/02/2026 e 01/03/2026"
  const periodMatch = text.match(/entre\s+(\d{2})\/(\d{2})\/(\d{4})\s+e\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  if (periodMatch) {
    result.periodStart = `${periodMatch[3]}-${periodMatch[2]}-${periodMatch[1]}`;
    result.periodEnd = `${periodMatch[6]}-${periodMatch[5]}-${periodMatch[4]}`;
  }

  return result;
}

/**
 * Parse a Brazilian-format number (. = thousands, , = decimal).
 * "3.723,0" → 3723.0
 * "155.300.500" → 155300500
 */
function parseBrazilianNumber(str: string): number {
  // Remove thousand separators (.), replace decimal comma with dot
  const normalized = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized);
}
