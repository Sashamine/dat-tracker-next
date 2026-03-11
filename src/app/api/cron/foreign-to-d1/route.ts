/**
 * Foreign Filing → D1 Cron Endpoint
 *
 * Unified endpoint that orchestrates all foreign filing fetchers and writes
 * extracted data points to D1 with full citation chains.
 *
 * Currently supports:
 * - TDnet (Japan): Metaplanet (3350.T) — shares + BTC holdings from earnings PDFs
 * - HKEX (Hong Kong): Boyaa (0434.HK) — BTC holdings from filing PDFs
 * - AMF (France): ALCPB — BTC holdings from filing titles
 * - MFN (Sweden): H100.ST — BTC holdings from press release titles
 * - ASX (Australia): DCC.AX — BTC holdings from treasury information PDFs
 * - LSE RNS (UK): SWC — BTC holdings from Bitcoin Purchase announcements
 *
 * Usage:
 *   GET /api/cron/foreign-to-d1?manual=true
 *   GET /api/cron/foreign-to-d1?manual=true&systems=tdnet,hkex,amf
 *   GET /api/cron/foreign-to-d1?manual=true&systems=tdnet&dryRun=true
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { D1Client } from '@/lib/d1';
import {
  type ForeignDataPoint,
  type ForeignFetcherResult,
  ingestForeignDataPoints,
  generateForeignCitation,
} from '@/lib/fetchers/foreign-extraction';
import { sendDiscordChannelMessage } from '@/lib/notifications/discord-channel';

function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  if (!authHeader) return false;
  return authHeader === `Bearer ${cronSecret}`;
}

// ─── TDnet Fetcher (Japan) ──────────────────────────────────────────────────

async function fetchTdnet(): Promise<ForeignFetcherResult[]> {
  const results: ForeignFetcherResult[] = [];

  try {
    const {
      ingestByDateRange,
      ENTITY_ID,
      BTC_METRIC,
      BTC_METHOD,
    } = await import('@/lib/fetchers/tdnet/metaplanet');

    const endDate = new Date();
    const startDate = new Date();
    // TDnet has ~45 days of listings, but scraping is slow (2s rate limit + retries).
    // Use 7 days for cron to stay within Vercel 120s timeout. Earnings are quarterly
    // so 7 days is sufficient for catching new filings.
    startDate.setDate(startDate.getDate() - 7);

    const extraction = await ingestByDateRange({ startDate, endDate });

    const dataPoints: ForeignDataPoint[] = [];

    // Convert BTC data points
    for (const btcDp of extraction.btcDataPoints) {
      const cite = generateForeignCitation({
        metric: BTC_METRIC,
        value: btcDp.value,
        unit: 'BTC',
        filingSystem: 'tdnet',
        asOf: btcDp.asOf,
        accession: btcDp.artifact.artifactId,
      });

      dataPoints.push({
        entityId: ENTITY_ID,
        metric: 'holdings_native',
        value: btcDp.value,
        unit: 'BTC',
        asOf: btcDp.asOf,
        reportedAt: btcDp.artifact.publishedAt || btcDp.asOf,
        filingSystem: 'tdnet',
        accession: `TDNET-${btcDp.artifact.artifactId.slice(0, 16)}`,
        sourceUrl: btcDp.sourceUrl,
        sourceType: 'tdnet_earnings_pdf',
        citationQuote: cite.citation_quote,
        citationSearchTerm: cite.citation_search_term,
        method: BTC_METHOD,
        confidence: 0.85,
      });
    }

    // Convert share data points
    for (const shareDp of extraction.dataPoints) {
      const cite = generateForeignCitation({
        metric: 'basic_shares',
        value: shareDp.value,
        unit: 'shares',
        filingSystem: 'tdnet',
        asOf: shareDp.asOf,
        accession: shareDp.artifact.artifactId,
      });

      dataPoints.push({
        entityId: ENTITY_ID,
        metric: 'basic_shares',
        value: shareDp.value,
        unit: 'shares',
        asOf: shareDp.asOf,
        reportedAt: shareDp.artifact.publishedAt || shareDp.asOf,
        filingSystem: 'tdnet',
        accession: `TDNET-${shareDp.artifact.artifactId.slice(0, 16)}`,
        sourceUrl: shareDp.sourceUrl,
        sourceType: 'tdnet_earnings_pdf',
        citationQuote: cite.citation_quote,
        citationSearchTerm: cite.citation_search_term,
        method: 'jp_tdnet_pdf',
        confidence: 0.9,
      });
    }

    results.push({
      ticker: ENTITY_ID,
      filingSystem: 'tdnet',
      dataPoints,
      skipped: extraction.skipped.map(s => ({ id: s.pdfUrl, reason: s.reason })),
    });
  } catch (err) {
    results.push({
      ticker: '3350.T',
      filingSystem: 'tdnet',
      dataPoints: [],
      skipped: [],
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}

// ─── HKEX Fetcher (Hong Kong) ───────────────────────────────────────────────

async function fetchHkex(): Promise<ForeignFetcherResult[]> {
  const results: ForeignFetcherResult[] = [];

  try {
    const { getKnownFilings, fetchFilingPdf, BOYAA_EXTRACTED_DATA } = await import('@/lib/fetchers/hkex');
    const { parseHkexBtcHoldings } = await import('@/lib/fetchers/hkex-btc-extractor');

    const filings = getKnownFilings('434');
    const dataPoints: ForeignDataPoint[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    const R2_BASE = 'https://pub-1e4356c7aea34102aad6e3493b0c62f1.r2.dev';

    for (const filing of filings.slice(0, 3)) { // Check last 3 filings
      // Try R2 cache first (HKEX geo-blocks Vercel's US servers)
      const stockCode = filing.stockCode.replace(/^0+/, '') || filing.stockCode;
      const r2Url = `${R2_BASE}/hkex/${stockCode}/${filing.docId}.pdf`;
      let pdfBuf: ArrayBuffer | null = null;
      try {
        const r2Res = await fetch(r2Url);
        if (r2Res.ok) {
          pdfBuf = await r2Res.arrayBuffer();
        }
      } catch { /* fall through to direct fetch */ }

      if (!pdfBuf) {
        pdfBuf = await fetchFilingPdf(filing.url);
      }
      if (!pdfBuf) {
        skipped.push({ id: filing.docId, reason: 'Failed to fetch PDF from R2 and HKEX' });
        continue;
      }

      // Extract text from PDF (pdf-parse v1 — pinned in package.json)
      // Import the inner lib directly to skip index.js which has a module-level
      // side effect that reads a test PDF file (fails on Vercel where the file
      // doesn't exist). pdf-parse is externalized via serverExternalPackages
      // in next.config.ts to preserve CJS→ESM interop.
      let text: string;
      try {
        // @ts-expect-error - pdf-parse/lib/pdf-parse has no type declarations
        const mod = await import('pdf-parse/lib/pdf-parse');
        const pdfParse = typeof mod === 'function' ? mod : mod.default;
        if (typeof pdfParse !== 'function') {
          throw new Error(`pdf-parse resolved to ${typeof pdfParse}, keys: ${Object.keys(mod).join(',')}`);
        }
        const result = await pdfParse(Buffer.from(pdfBuf));
        text = result.text;
      } catch (e) {
        skipped.push({ id: filing.docId, reason: `pdf-parse failed: ${e instanceof Error ? e.message : String(e)}` });
        continue;
      }

      const extraction = parseHkexBtcHoldings(text);

      if (extraction.candidates.length === 0) {
        skipped.push({ id: filing.docId, reason: 'No BTC holdings found in PDF text' });
        continue;
      }

      const best = [...extraction.candidates].sort((a, b) => {
        if (a.confidence !== b.confidence) return a.confidence === 'high' ? -1 : 1;
        return b.value - a.value;
      })[0];

      const asOf = extraction.periodEnd || filing.date;

      const cite = generateForeignCitation({
        metric: 'holdings_native',
        value: best.value,
        unit: 'BTC',
        filingSystem: 'hkex',
        asOf,
        accession: filing.docId,
      });

      dataPoints.push({
        entityId: '0434.HK',
        metric: 'holdings_native',
        value: best.value,
        unit: 'BTC',
        asOf,
        reportedAt: filing.date,
        filingSystem: 'hkex',
        accession: `HKEX-${filing.docId}`,
        sourceUrl: filing.url,
        sourceType: 'hkex_pdf',
        citationQuote: cite.citation_quote,
        citationSearchTerm: cite.citation_search_term,
        method: 'hkex_pdf_regex',
        confidence: 0.85,
      });
    }

    results.push({
      ticker: '0434.HK',
      filingSystem: 'hkex',
      dataPoints,
      skipped,
    });
  } catch (err) {
    results.push({
      ticker: '0434.HK',
      filingSystem: 'hkex',
      dataPoints: [],
      skipped: [],
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}

// ─── AMF Fetcher (France) ───────────────────────────────────────────────────

async function fetchAmf(): Promise<ForeignFetcherResult[]> {
  const results: ForeignFetcherResult[] = [];

  try {
    const { amfFetcher, getAmfFilings, parseBtcHoldingsFromTitle } = await import('@/lib/fetchers/amf');

    const filings = await getAmfFilings('ALCPB', 10);
    const dataPoints: ForeignDataPoint[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const filing of filings) {
      const holdings = parseBtcHoldingsFromTitle(filing.title);
      if (holdings === null) {
        skipped.push({ id: filing.filingDate, reason: `No BTC holdings in title: "${filing.title.slice(0, 60)}"` });
        continue;
      }

      const cite = generateForeignCitation({
        metric: 'holdings_native',
        value: holdings,
        unit: 'BTC',
        filingSystem: 'amf',
        asOf: filing.filingDate,
        accession: `AMF-${filing.filingDate}`,
      });

      dataPoints.push({
        entityId: 'ALCPB',
        metric: 'holdings_native',
        value: holdings,
        unit: 'BTC',
        asOf: filing.filingDate,
        reportedAt: filing.filingDate,
        filingSystem: 'amf',
        accession: `AMF-${filing.filingDate}-${holdings}`,
        sourceUrl: filing.pdfUrl || `https://info-financiere.fr/recherche?search=FR0011053636`,
        sourceType: 'amf_regulatory_filing',
        citationQuote: cite.citation_quote,
        citationSearchTerm: cite.citation_search_term,
        method: 'amf_title_parse',
        confidence: 0.95,
      });
    }

    // Only keep the most recent holding per as_of date
    const byDate = new Map<string, ForeignDataPoint>();
    for (const dp of dataPoints) {
      if (!byDate.has(dp.asOf) || dp.value > (byDate.get(dp.asOf)?.value ?? 0)) {
        byDate.set(dp.asOf, dp);
      }
    }

    results.push({
      ticker: 'ALCPB',
      filingSystem: 'amf',
      dataPoints: [...byDate.values()],
      skipped,
    });
  } catch (err) {
    results.push({
      ticker: 'ALCPB',
      filingSystem: 'amf',
      dataPoints: [],
      skipped: [],
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}

// ─── MFN Fetcher (Sweden) ───────────────────────────────────────────────────

async function fetchMfn(): Promise<ForeignFetcherResult[]> {
  const results: ForeignFetcherResult[] = [];

  try {
    const { getMfnReleases, parseBtcFromMfnTitle } = await import('@/lib/fetchers/mfn');

    const releases = await getMfnReleases('H100.ST', 15);
    const dataPoints: ForeignDataPoint[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const release of releases) {
      const holdings = parseBtcFromMfnTitle(release.title);
      if (holdings === null) {
        skipped.push({ id: release.date, reason: `No BTC holdings in title: "${release.title.slice(0, 60)}"` });
        continue;
      }

      const cite = generateForeignCitation({
        metric: 'holdings_native',
        value: holdings,
        unit: 'BTC',
        filingSystem: 'mfn',
        asOf: release.date,
        accession: `MFN-${release.date}`,
      });

      dataPoints.push({
        entityId: 'H100.ST',
        metric: 'holdings_native',
        value: holdings,
        unit: 'BTC',
        asOf: release.date,
        reportedAt: release.date,
        filingSystem: 'mfn',
        accession: `MFN-${release.date}-${holdings}`,
        sourceUrl: release.url,
        sourceType: 'mfn_press_release',
        citationQuote: cite.citation_quote,
        citationSearchTerm: cite.citation_search_term,
        method: 'mfn_title_parse',
        confidence: 0.95,
      });
    }

    // Keep only the most recent holding per date
    const byDate = new Map<string, ForeignDataPoint>();
    for (const dp of dataPoints) {
      if (!byDate.has(dp.asOf) || dp.value > (byDate.get(dp.asOf)?.value ?? 0)) {
        byDate.set(dp.asOf, dp);
      }
    }

    results.push({
      ticker: 'H100.ST',
      filingSystem: 'mfn',
      dataPoints: [...byDate.values()],
      skipped,
    });
  } catch (err) {
    results.push({
      ticker: 'H100.ST',
      filingSystem: 'mfn',
      dataPoints: [],
      skipped: [],
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}

// ─── LSE RNS Fetcher (UK) ────────────────────────────────────────────────────

async function fetchLseRns(): Promise<ForeignFetcherResult[]> {
  const results: ForeignFetcherResult[] = [];

  try {
    const {
      getRnsAnnouncements,
      fetchRnsAnnouncementText,
      parseBtcFromRnsText,
    } = await import('@/lib/fetchers/lse-rns');

    const announcements = await getRnsAnnouncements('SWC');
    const dataPoints: ForeignDataPoint[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    // Process the most recent 3 Bitcoin Purchase announcements
    for (const ann of announcements.slice(0, 3)) {
      // Rate-limit InvestEgate fetches
      await new Promise(r => setTimeout(r, 1000));

      let text: string;
      try {
        text = await fetchRnsAnnouncementText(ann.url);
      } catch (e) {
        skipped.push({ id: ann.articleId, reason: `Fetch failed: ${e instanceof Error ? e.message : String(e)}` });
        continue;
      }

      const extraction = parseBtcFromRnsText(text);

      if (extraction.totalBtc === null) {
        skipped.push({ id: ann.articleId, reason: `No total BTC in text: "${ann.title}"` });
        continue;
      }

      const asOf = extraction.date || new Date().toISOString().slice(0, 10);

      const cite = generateForeignCitation({
        metric: 'holdings_native',
        value: extraction.totalBtc,
        unit: 'BTC',
        filingSystem: 'lse_rns',
        asOf,
        accession: ann.articleId,
      });

      dataPoints.push({
        entityId: 'SWC',
        metric: 'holdings_native',
        value: extraction.totalBtc,
        unit: 'BTC',
        asOf,
        reportedAt: asOf,
        filingSystem: 'lse_rns',
        accession: `RNS-${ann.articleId}`,
        sourceUrl: ann.url,
        sourceType: 'rns_announcement',
        citationQuote: cite.citation_quote,
        citationSearchTerm: cite.citation_search_term,
        method: 'rns_text_parse',
        confidence: 0.95,
      });
    }

    // Keep only the most recent holding per date
    const byDate = new Map<string, ForeignDataPoint>();
    for (const dp of dataPoints) {
      if (!byDate.has(dp.asOf) || dp.value > (byDate.get(dp.asOf)?.value ?? 0)) {
        byDate.set(dp.asOf, dp);
      }
    }

    results.push({
      ticker: 'SWC',
      filingSystem: 'lse_rns',
      dataPoints: [...byDate.values()],
      skipped,
    });
  } catch (err) {
    results.push({
      ticker: 'SWC',
      filingSystem: 'lse_rns',
      dataPoints: [],
      skipped: [],
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}

// ─── ASX Fetcher (Australia) ─────────────────────────────────────────────────

async function fetchAsx(): Promise<ForeignFetcherResult[]> {
  const results: ForeignFetcherResult[] = [];

  try {
    const {
      getAsxAnnouncements,
      filterTreasuryAnnouncements,
      getAsxPdfUrl,
      parseBtcFromAsxTreasuryPdf,
    } = await import('@/lib/fetchers/asx');

    const announcements = await getAsxAnnouncements('DCC.AX', 50);
    const treasuryFilings = filterTreasuryAnnouncements(announcements);
    const dataPoints: ForeignDataPoint[] = [];
    const skipped: Array<{ id: string; reason: string }> = [];

    for (const filing of treasuryFilings.slice(0, 3)) {
      // Download PDF
      const pdfUrl = getAsxPdfUrl(filing.documentKey);
      let pdfBuf: ArrayBuffer;
      try {
        const res = await fetch(pdfUrl, {
          headers: { 'User-Agent': 'dat-tracker-next/1.0' },
        });
        if (!res.ok) {
          skipped.push({ id: filing.documentKey, reason: `PDF fetch failed: ${res.status}` });
          continue;
        }
        pdfBuf = await res.arrayBuffer();
      } catch (e) {
        skipped.push({ id: filing.documentKey, reason: `PDF fetch error: ${e instanceof Error ? e.message : String(e)}` });
        continue;
      }

      // Extract text from PDF
      let text: string;
      try {
        // @ts-expect-error - pdf-parse/lib/pdf-parse has no type declarations
        const mod = await import('pdf-parse/lib/pdf-parse');
        const pdfParse = typeof mod === 'function' ? mod : mod.default;
        if (typeof pdfParse !== 'function') {
          throw new Error(`pdf-parse resolved to ${typeof pdfParse}`);
        }
        const result = await pdfParse(Buffer.from(pdfBuf));
        text = result.text;
      } catch (e) {
        skipped.push({ id: filing.documentKey, reason: `pdf-parse failed: ${e instanceof Error ? e.message : String(e)}` });
        continue;
      }

      const extraction = parseBtcFromAsxTreasuryPdf(text);

      if (extraction.totalBtc === null) {
        skipped.push({ id: filing.documentKey, reason: 'No BTC holdings found in PDF' });
        continue;
      }

      const asOf = extraction.periodEnd || filing.date.slice(0, 10);

      const cite = generateForeignCitation({
        metric: 'holdings_native',
        value: extraction.totalBtc,
        unit: 'BTC',
        filingSystem: 'asx',
        asOf,
        accession: filing.documentKey,
      });

      dataPoints.push({
        entityId: 'DCC.AX',
        metric: 'holdings_native',
        value: extraction.totalBtc,
        unit: 'BTC',
        asOf,
        reportedAt: filing.date.slice(0, 10),
        filingSystem: 'asx',
        accession: `ASX-${filing.documentKey}`,
        sourceUrl: pdfUrl,
        sourceType: 'asx_treasury_pdf',
        citationQuote: cite.citation_quote,
        citationSearchTerm: cite.citation_search_term,
        method: 'asx_pdf_regex',
        confidence: 0.95,
      });
    }

    results.push({
      ticker: 'DCC.AX',
      filingSystem: 'asx',
      dataPoints,
      skipped,
    });
  } catch (err) {
    results.push({
      ticker: 'DCC.AX',
      filingSystem: 'asx',
      dataPoints: [],
      skipped: [],
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return results;
}

// ─── Main Handler ───────────────────────────────────────────────────────────

const SYSTEM_FETCHERS: Record<string, () => Promise<ForeignFetcherResult[]>> = {
  tdnet: fetchTdnet,
  hkex: fetchHkex,
  amf: fetchAmf,
  mfn: fetchMfn,
  asx: fetchAsx,
  lse_rns: fetchLseRns,
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isManual = searchParams.get('manual') === 'true';
  const dryRun = searchParams.get('dryRun') === 'true';
  const systemsParam = searchParams.get('systems');

  if (!isManual && !verifyCronSecret(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const systems = systemsParam
    ? systemsParam.split(',').map(s => s.trim().toLowerCase()).filter(s => s in SYSTEM_FETCHERS)
    : Object.keys(SYSTEM_FETCHERS);

  if (systems.length === 0) {
    return NextResponse.json({
      success: false,
      error: `No valid systems. Available: ${Object.keys(SYSTEM_FETCHERS).join(', ')}`,
    }, { status: 400 });
  }

  const d1 = D1Client.fromEnv();
  const runId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  // Create run record
  if (!dryRun) {
    await d1.query(
      `INSERT OR REPLACE INTO runs (run_id, started_at, trigger, notes)
       VALUES (?, ?, ?, ?);`,
      [runId, startedAt, isManual ? 'manual' : 'scheduled', `foreign-to-d1 systems=${systems.join(',')}`]
    );
  }

  // Run all selected fetchers
  const allResults: ForeignFetcherResult[] = [];
  for (const system of systems) {
    const fetcher = SYSTEM_FETCHERS[system];
    const fetcherResults = await fetcher();
    allResults.push(...fetcherResults);
  }

  // Collect all data points
  const allDataPoints = allResults.flatMap(r => r.dataPoints);
  const allErrors = allResults.filter(r => r.error);

  // Ingest into D1
  let ingestionResult = { inserted: 0, updated: 0, noop: 0, errors: [] as Array<{ entityId: string; metric: string; error: string }> };
  if (!dryRun && allDataPoints.length > 0) {
    ingestionResult = await ingestForeignDataPoints(d1, runId, allDataPoints);
  }

  // Update run record
  if (!dryRun) {
    await d1.query(`UPDATE runs SET ended_at = ? WHERE run_id = ?;`, [new Date().toISOString(), runId]);
  }

  // Discord notification on errors
  const updatesChannelId = process.env.DISCORD_UPDATES_CHANNEL_ID;
  if (!dryRun && updatesChannelId && (allErrors.length > 0 || ingestionResult.errors.length > 0)) {
    const msg = [
      `Foreign→D1: ${systems.join(',')}`,
      `runId: ${runId}`,
      `datapoints: +${ingestionResult.inserted} inserted, ~${ingestionResult.updated} updated, ${ingestionResult.noop} noop`,
      allErrors.length ? `fetcher errors: ${allErrors.map(e => `${e.ticker}: ${e.error}`).join('; ')}` : undefined,
      ingestionResult.errors.length ? `ingestion errors: ${ingestionResult.errors.map(e => `${e.entityId}/${e.metric}: ${e.error}`).join('; ')}` : undefined,
    ].filter(Boolean).join('\n');
    await sendDiscordChannelMessage(updatesChannelId, msg);
  }

  return NextResponse.json({
    success: allErrors.length === 0 && ingestionResult.errors.length === 0,
    runId,
    startedAt,
    dryRun,
    systems,
    fetcherResults: allResults.map(r => ({
      ticker: r.ticker,
      filingSystem: r.filingSystem,
      dataPointCount: r.dataPoints.length,
      skippedCount: r.skipped.length,
      error: r.error || null,
      dataPoints: r.dataPoints.map(dp => ({
        entityId: dp.entityId,
        metric: dp.metric,
        value: dp.value,
        unit: dp.unit,
        asOf: dp.asOf,
        accession: dp.accession,
        method: dp.method,
      })),
      skipped: r.skipped,
    })),
    ingestion: dryRun ? null : {
      inserted: ingestionResult.inserted,
      updated: ingestionResult.updated,
      noop: ingestionResult.noop,
      errors: ingestionResult.errors,
    },
  });
}

export const runtime = 'nodejs';
export const maxDuration = 120;
