/**
 * HKEX BTC Holdings Extractor (Deterministic)
 *
 * Extracts BTC holdings from HKEX filing PDFs using regex patterns.
 * Replaces the LLM-based approach in hkex-pdf-extractor.ts for the
 * specific case of BTC treasury companies.
 *
 * Supports: Boyaa Interactive (0434.HK) — English and Chinese filings
 *
 * Boyaa's filings contain:
 * - "as at [date], the Group held approximately [N] Bitcoins"
 * - "total of approximately [N] BTC"
 * - "Bitcoin ([N] BTC)" in balance sheet notes
 * - "approximately [N] Bitcoins with an aggregate cost of approximately US$[M]"
 */

export interface HkexBtcExtraction {
  candidates: Array<{
    value: number;
    label: string;
    context: string;
    confidence: 'high' | 'medium';
  }>;
  periodEnd: string | null;
  periodEndNote: string;
  avgCost: number | null;
}

/**
 * Parse BTC holdings from HKEX filing text.
 */
export function parseHkexBtcHoldings(text: string): HkexBtcExtraction {
  const candidates: HkexBtcExtraction['candidates'] = [];
  let avgCost: number | null = null;

  // Pattern 1: "held approximately X,XXX Bitcoins" or "held X,XXX BTC" or "held X,XXX units of BTC"
  const HELD_RE = /held\s+(?:approximately\s+)?([\d,]+(?:\.\d+)?)\s*(?:units?\s+of\s+)?(?:Bitcoins?|BTC)/gi;
  let m: RegExpExecArray | null;
  while ((m = HELD_RE.exec(text)) !== null) {
    const raw = m[1].replace(/,/g, '');
    const n = parseFloat(raw);
    if (!isFinite(n) || n < 10 || n > 1_000_000) continue;

    const ctxStart = Math.max(0, m.index - 60);
    const ctx = text.slice(ctxStart, m.index + m[0].length + 60);

    candidates.push({
      value: n,
      label: 'held Bitcoins',
      context: ctx.replace(/\s+/g, ' ').trim(),
      confidence: 'high',
    });
  }

  // Pattern 2: "total of approximately X,XXX BTC" or "total of X,XXX Bitcoin" or "total of X,XXX units of BTC"
  const TOTAL_RE = /total\s+of\s+(?:approximately\s+)?([\d,]+(?:\.\d+)?)\s*(?:units?\s+of\s+)?(?:Bitcoins?|BTC)/gi;
  while ((m = TOTAL_RE.exec(text)) !== null) {
    const raw = m[1].replace(/,/g, '');
    const n = parseFloat(raw);
    if (!isFinite(n) || n < 10 || n > 1_000_000) continue;

    const ctxStart = Math.max(0, m.index - 40);
    const ctx = text.slice(ctxStart, m.index + m[0].length + 40);

    candidates.push({
      value: n,
      label: 'total BTC',
      context: ctx.replace(/\s+/g, ' ').trim(),
      confidence: 'high',
    });
  }

  // Pattern 3: "Bitcoin (X,XXX BTC)" or "Bitcoin X,XXX BTC" in balance sheet
  const BALANCE_RE = /Bitcoin[s]?\s*[(\s]*([\d,]+(?:\.\d+)?)\s*BTC/gi;
  while ((m = BALANCE_RE.exec(text)) !== null) {
    const raw = m[1].replace(/,/g, '');
    const n = parseFloat(raw);
    if (!isFinite(n) || n < 10 || n > 1_000_000) continue;

    const ctxStart = Math.max(0, m.index - 40);
    const ctx = text.slice(ctxStart, m.index + m[0].length + 40);

    // Check if already captured
    if (candidates.some(c => c.value === n)) continue;

    candidates.push({
      value: n,
      label: 'Bitcoin balance',
      context: ctx.replace(/\s+/g, ' ').trim(),
      confidence: 'medium',
    });
  }

  // Pattern 4: "BTC Yield" section with holdings figure (Boyaa-specific)
  const BTC_YIELD_RE = /BTC\s+Yield[\s\S]{0,500}?([\d,]+(?:\.\d+)?)\s*(?:Bitcoins?|BTC)/gi;
  while ((m = BTC_YIELD_RE.exec(text)) !== null) {
    const raw = m[1].replace(/,/g, '');
    const n = parseFloat(raw);
    if (!isFinite(n) || n < 10 || n > 1_000_000) continue;
    if (candidates.some(c => c.value === n)) continue;

    candidates.push({
      value: n,
      label: 'BTC Yield section',
      context: m[0].slice(0, 120).replace(/\s+/g, ' ').trim(),
      confidence: 'medium',
    });
  }

  // Extract average cost: "aggregate cost of approximately US$X million" or "average cost of approximately US$X per unit"
  const COST_RE = /(?:aggregate|average)\s+cost\s+(?:of\s+)?(?:approximately\s+)?(?:US?\$|USD\s*)?([\d,]+(?:\.\d+)?)\s*(million|billion|per\s+unit)?/gi;
  const costMatch = COST_RE.exec(text);
  if (costMatch) {
    let cost = parseFloat(costMatch[1].replace(/,/g, ''));
    const qualifier = costMatch[2]?.toLowerCase().trim();
    if (qualifier === 'million') cost *= 1_000_000;
    if (qualifier === 'billion') cost *= 1_000_000_000;

    if (qualifier === 'per unit') {
      // Already per-unit cost
      avgCost = Math.round(cost);
    } else {
      // Aggregate cost — divide by holdings to get per-unit
      const bestHoldings = [...candidates].sort((a, b) => {
        if (a.confidence !== b.confidence) return a.confidence === 'high' ? -1 : 1;
        return b.value - a.value;
      })[0];
      if (bestHoldings && bestHoldings.value > 0) {
        avgCost = Math.round(cost / bestHoldings.value);
      }
    }
  }

  // Extract period end date
  let periodEnd: string | null = null;
  let periodEndNote = '';

  // "as at 30 June 2025" or "as at June 30, 2025"
  const AS_AT_RE = /as\s+(?:at|of)\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;
  const asAtMatch = AS_AT_RE.exec(text);
  if (asAtMatch) {
    const day = parseInt(asAtMatch[1]);
    const month = monthToNumber(asAtMatch[2]);
    const year = parseInt(asAtMatch[3]);
    periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    periodEndNote = `Extracted from "as at ${asAtMatch[1]} ${asAtMatch[2]} ${asAtMatch[3]}"`;
  }

  // "For the six months ended 30 June 2025"
  if (!periodEnd) {
    const PERIOD_RE = /(?:ended|ending)\s+(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;
    const periodMatch = PERIOD_RE.exec(text);
    if (periodMatch) {
      const day = parseInt(periodMatch[1]);
      const month = monthToNumber(periodMatch[2]);
      const year = parseInt(periodMatch[3]);
      periodEnd = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      periodEndNote = `Extracted from period "ended ${periodMatch[1]} ${periodMatch[2]} ${periodMatch[3]}"`;
    }
  }

  return { candidates, periodEnd, periodEndNote, avgCost };
}

const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function monthToNumber(name: string): number {
  return MONTH_MAP[name.toLowerCase()] || 1;
}
