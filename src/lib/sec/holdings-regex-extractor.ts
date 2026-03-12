/**
 * Deterministic Holdings Extractor for 8-K Filings
 *
 * Regex-based extraction of crypto holdings from SEC filing text.
 * Catches the most common disclosure patterns without LLM costs.
 * Falls through to LLM extractor for ambiguous cases.
 *
 * Patterns covered:
 * - "holds approximately X,XXX Bitcoin"
 * - "acquired X,XXX BTC for $X million"
 * - "total of X,XXX Dogecoin"
 * - "aggregate holdings of approximately X,XXX ETH"
 */

import { cleanHtmlText } from './content-extractor';

// ============================================
// TYPES
// ============================================

export interface RegexExtractionResult {
  /** Extracted holdings count (null if not found) */
  holdings: number | null;
  /** The crypto asset mentioned */
  asset: string | null;
  /** Whether this is a total or a transaction amount */
  type: 'total' | 'purchase' | 'sale' | null;
  /** Transaction amount if type is purchase/sale */
  transactionAmount: number | null;
  /** Cost in USD if mentioned */
  costUsd: number | null;
  /** As-of date if found (YYYY-MM-DD) */
  asOfDate: string | null;
  /** Shares outstanding if found */
  sharesOutstanding: number | null;
  /** Confidence score (0-1) */
  confidence: number;
  /** The matched text snippet */
  matchedText: string;
  /** Which pattern matched */
  patternName: string;
}

// ============================================
// NUMBER PARSING
// ============================================

/**
 * Parse a number from text, handling commas and approximate language
 * "1,234,567" → 1234567
 * "approximately 1.2 million" → 1200000
 * "~$50M" → 50000000
 */
function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(/[$€£¥]/g, '');

  // Try "X.X million/billion" pattern first
  const millionMatch = cleaned.match(/([\d,.]+)\s*(million|billion|trillion)/i);
  if (millionMatch) {
    const base = parseFloat(millionMatch[1].replace(/,/g, ''));
    const multiplier = millionMatch[2].toLowerCase();
    if (isNaN(base)) return null;
    switch (multiplier) {
      case 'million': return Math.round(base * 1_000_000);
      case 'billion': return Math.round(base * 1_000_000_000);
      case 'trillion': return Math.round(base * 1_000_000_000_000);
    }
  }

  // Try "X.XM/B" shorthand
  const shortMatch = cleaned.match(/([\d,.]+)\s*([MBT])\b/);
  if (shortMatch) {
    const base = parseFloat(shortMatch[1].replace(/,/g, ''));
    if (isNaN(base)) return null;
    switch (shortMatch[2]) {
      case 'M': return Math.round(base * 1_000_000);
      case 'B': return Math.round(base * 1_000_000_000);
      case 'T': return Math.round(base * 1_000_000_000_000);
    }
  }

  // Plain number with commas
  const plainMatch = cleaned.match(/([\d,]+(?:\.\d+)?)/);
  if (plainMatch) {
    const num = parseFloat(plainMatch[1].replace(/,/g, ''));
    if (!isNaN(num)) return Math.round(num);
  }

  return null;
}

// ============================================
// ASSET NAME MAPPING
// ============================================

/** Map of asset names/variations to canonical ticker */
const ASSET_NAMES: Record<string, string> = {
  'bitcoin': 'BTC', 'btc': 'BTC', 'bitcoins': 'BTC',
  'ethereum': 'ETH', 'ether': 'ETH', 'eth': 'ETH',
  'solana': 'SOL', 'sol': 'SOL',
  'dogecoin': 'DOGE', 'doge': 'DOGE',
  'litecoin': 'LTC', 'ltc': 'LTC',
  'ripple': 'XRP', 'xrp': 'XRP',
  'chainlink': 'LINK', 'link': 'LINK',
  'avalanche': 'AVAX', 'avax': 'AVAX',
  'bittensor': 'TAO', 'tao': 'TAO',
  'hyperliquid': 'HYPE', 'hype': 'HYPE',
  'hedera': 'HBAR', 'hbar': 'HBAR',
  'tron': 'TRX', 'trx': 'TRX',
  'sui': 'SUI',
  'zcash': 'ZEC', 'zec': 'ZEC',
  'bnb': 'BNB', 'binance coin': 'BNB',
  'cardano': 'ADA', 'ada': 'ADA',
};

const ASSET_PATTERN = Object.keys(ASSET_NAMES)
  .sort((a, b) => b.length - a.length) // Longest first to avoid partial matches
  .join('|');

function normalizeAsset(name: string): string | null {
  return ASSET_NAMES[name.toLowerCase()] || null;
}

// ============================================
// EXTRACTION PATTERNS
// ============================================

interface ExtractionPattern {
  name: string;
  regex: RegExp;
  type: 'total' | 'purchase' | 'sale';
  /** Extract result from match groups */
  extract: (match: RegExpMatchArray) => Partial<RegexExtractionResult>;
  confidence: number;
}

/**
 * Build extraction patterns dynamically based on asset names
 * Each pattern captures: amount, asset name, and optionally cost/date
 */
function buildPatterns(): ExtractionPattern[] {
  const A = ASSET_PATTERN; // Asset name alternation
  const NUM = `([\\d,]+(?:\\.\\d+)?(?:\\s*(?:million|billion|M|B))?)`;

  return [
    // === TOTAL HOLDINGS PATTERNS (highest confidence) ===
    {
      name: 'holds_total',
      regex: new RegExp(`(?:holds?|holding|treasury\\s+of|maintain)\\s+(?:approximately\\s+|~\\s*)?${NUM}\\s+(?:units?\\s+of\\s+)?(${A})`, 'gi'),
      type: 'total',
      extract: (m) => ({ holdings: parseNumber(m[1]), asset: normalizeAsset(m[2]) }),
      confidence: 0.9,
    },
    {
      name: 'total_of',
      regex: new RegExp(`(?:total|aggregate|combined)\\s+(?:of\\s+|to\\s+|holdings\\s+of\\s+)?(?:approximately\\s+|~\\s*)?${NUM}\\s+(?:units?\\s+of\\s+)?(${A})`, 'gi'),
      type: 'total',
      extract: (m) => ({ holdings: parseNumber(m[1]), asset: normalizeAsset(m[2]) }),
      confidence: 0.9,
    },
    {
      name: 'num_asset_holdings',
      regex: new RegExp(`(?:approximately\\s+)?${NUM}\\s+(${A})\\s+(?:in\\s+)?(?:total\\s+)?(?:holdings|held|in\\s+(?:its?|our)\\s+treasury)`, 'gi'),
      type: 'total',
      extract: (m) => ({ holdings: parseNumber(m[1]), asset: normalizeAsset(m[2]) }),
      confidence: 0.85,
    },
    {
      name: 'currently_holds',
      regex: new RegExp(`(?:currently|now|presently)\\s+(?:holds?|own(?:s|ing)?)\\s+(?:approximately\\s+|~\\s*)?${NUM}\\s+(?:units?\\s+of\\s+)?(${A})`, 'gi'),
      type: 'total',
      extract: (m) => ({ holdings: parseNumber(m[1]), asset: normalizeAsset(m[2]) }),
      confidence: 0.9,
    },
    {
      name: 'holdings_as_of',
      regex: new RegExp(`(${A})\\s+holdings?\\s+(?:of\\s+)?(?:approximately\\s+)?${NUM}`, 'gi'),
      type: 'total',
      extract: (m) => ({ holdings: parseNumber(m[2]), asset: normalizeAsset(m[1]) }),
      confidence: 0.8,
    },

    // === PURCHASE PATTERNS ===
    {
      name: 'acquired_for',
      regex: new RegExp(`(?:acquired|purchased|bought)\\s+(?:an\\s+additional\\s+|approximately\\s+)?${NUM}\\s+(?:units?\\s+of\\s+)?(${A})\\s+(?:for|at)\\s+(?:approximately\\s+|an\\s+aggregate\\s+(?:purchase\\s+)?price\\s+of\\s+)?\\$?${NUM}`, 'gi'),
      type: 'purchase',
      extract: (m) => ({
        transactionAmount: parseNumber(m[1]),
        asset: normalizeAsset(m[2]),
        costUsd: parseNumber(m[3]),
      }),
      confidence: 0.85,
    },
    {
      name: 'acquired_simple',
      regex: new RegExp(`(?:acquired|purchased|bought)\\s+(?:an\\s+additional\\s+|approximately\\s+)?${NUM}\\s+(?:units?\\s+of\\s+)?(${A})`, 'gi'),
      type: 'purchase',
      extract: (m) => ({
        transactionAmount: parseNumber(m[1]),
        asset: normalizeAsset(m[2]),
      }),
      confidence: 0.8,
    },

    // === SALE PATTERNS ===
    {
      name: 'sold',
      regex: new RegExp(`(?:sold|disposed\\s+of|transferred)\\s+(?:approximately\\s+)?${NUM}\\s+(?:units?\\s+of\\s+)?(${A})`, 'gi'),
      type: 'sale',
      extract: (m) => ({
        transactionAmount: parseNumber(m[1]),
        asset: normalizeAsset(m[2]),
      }),
      confidence: 0.8,
    },

    // === SHARES OUTSTANDING (bonus extraction) ===
    // These are captured separately as they often appear alongside holdings
  ];
}

// Shares outstanding patterns (separate from holdings)
const SHARES_PATTERNS = [
  /(?:approximately\s+)?([\d,]+(?:\.\d+)?(?:\s*million)?)\s+(?:shares?\s+of\s+)?(?:common\s+stock|ordinary\s+shares?|shares?)\s+(?:outstanding|issued\s+and\s+outstanding)/gi,
  /(?:shares?\s+)?outstanding(?:\s+(?:of|as\s+of))?\s*:?\s*(?:approximately\s+)?([\d,]+(?:\.\d+)?(?:\s*million)?)/gi,
];

// Date patterns for as-of extraction
const DATE_PATTERNS = [
  /as\s+of\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
  /through\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
  /(?:dated?|on|between\s+.*?and)\s+(\w+\s+\d{1,2},?\s+\d{4})/gi,
  /(\d{4}-\d{2}-\d{2})/g, // ISO date
];

const MONTH_MAP: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04',
  may: '05', june: '06', july: '07', august: '08',
  september: '09', october: '10', november: '11', december: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12',
};

function parseDate(dateStr: string): string | null {
  // ISO format
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return dateStr;

  // "January 15, 2026" or "Jan 15 2026"
  const textMatch = dateStr.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (textMatch) {
    const month = MONTH_MAP[textMatch[1].toLowerCase()];
    if (month) {
      return `${textMatch[3]}-${month}-${textMatch[2].padStart(2, '0')}`;
    }
  }

  return null;
}

// ============================================
// TABLE-FORMAT EXTRACTION
// ============================================

/**
 * Extract holdings from table-format filings (e.g., MSTR weekly BTC Update).
 *
 * In these filings, after HTML cleaning, the format is:
 *   "Aggregate BTC Holdings ... 17,994 $1.28 $70,946 738,731 $56.04 $75,862"
 *
 * The table has headers (BTC Acquired, Aggregate BTC Holdings) followed by values.
 * We find "Aggregate ASSET Holdings" and then collect all non-dollar numbers
 * in the vicinity, picking the largest as the total holdings.
 */
function extractFromTable(
  text: string,
  expectedAsset?: string
): RegexExtractionResult[] {
  const results: RegexExtractionResult[] = [];
  const A = ASSET_PATTERN;

  // Look for "Aggregate ASSET Holdings" pattern
  const headerRegex = new RegExp(`[Aa]ggregate\\s+(${A})\\s+[Hh]oldings`, 'gi');
  let headerMatch: RegExpExecArray | null;

  while ((headerMatch = headerRegex.exec(text)) !== null) {
    const asset = normalizeAsset(headerMatch[1]);
    if (!asset) continue;
    if (expectedAsset && asset !== expectedAsset) continue;

    // Get text window after the header (where values appear)
    const afterHeader = text.substring(headerMatch.index, Math.min(text.length, headerMatch.index + 500));

    // Find all plain numbers (not preceded by $) in the window
    const numberRegex = /(?<!\$)([\d,]{4,})(?!\.\d{2}\b)/g;
    let numMatch: RegExpExecArray | null;
    const plainNumbers: number[] = [];

    while ((numMatch = numberRegex.exec(afterHeader)) !== null) {
      const num = parseFloat(numMatch[1].replace(/,/g, ''));
      if (!isNaN(num) && num >= 100) { // Min threshold to avoid noise
        plainNumbers.push(num);
      }
    }

    if (plainNumbers.length === 0) continue;

    // The largest plain number is most likely the total holdings
    // (Aggregate BTC Holdings > BTC Acquired in any filing)
    const maxNum = Math.max(...plainNumbers);

    // Also look for acquired amount (typically second-largest plain number)
    const sortedNums = [...new Set(plainNumbers)].sort((a, b) => b - a);
    const acquiredNum = sortedNums.length > 1 ? sortedNums[1] : null;

    // Try to find as-of date
    let asOfDate: string | null = null;
    const nearbyText = text.substring(
      Math.max(0, headerMatch.index - 300),
      Math.min(text.length, headerMatch.index + 500)
    );
    for (const datePattern of DATE_PATTERNS) {
      datePattern.lastIndex = 0;
      const dateMatch = datePattern.exec(nearbyText);
      if (dateMatch) {
        asOfDate = parseDate(dateMatch[1]);
        if (asOfDate) break;
      }
    }

    // Add total holdings
    results.push({
      holdings: maxNum,
      asset,
      type: 'total',
      transactionAmount: null,
      costUsd: null,
      asOfDate,
      sharesOutstanding: null,
      confidence: 0.85,
      matchedText: afterHeader.substring(0, 200).trim(),
      patternName: 'aggregate_table',
    });

    // Add acquired amount if found
    if (acquiredNum && acquiredNum !== maxNum) {
      results.push({
        holdings: null,
        asset,
        type: 'purchase',
        transactionAmount: acquiredNum,
        costUsd: null,
        asOfDate,
        sharesOutstanding: null,
        confidence: 0.75,
        matchedText: afterHeader.substring(0, 200).trim(),
        patternName: 'acquired_table',
      });
    }
  }

  return results;
}

// ============================================
// MAIN EXTRACTION FUNCTION
// ============================================

/**
 * Extract crypto holdings from filing text using regex patterns.
 * Returns all matches found, sorted by confidence.
 *
 * @param html Raw HTML or plain text from SEC filing
 * @param expectedAsset Optional: the asset this company is expected to hold
 * @returns Array of extraction results, highest confidence first
 */
export function extractHoldingsRegex(
  html: string,
  expectedAsset?: string
): RegexExtractionResult[] {
  const text = cleanHtmlText(html);
  const patterns = buildPatterns();
  const results: RegexExtractionResult[] = [];

  for (const pattern of patterns) {
    // Reset regex state
    pattern.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.regex.exec(text)) !== null) {
      const extracted = pattern.extract(match);

      // Skip if no meaningful data extracted
      if (!extracted.holdings && !extracted.transactionAmount) continue;

      // Skip if asset doesn't match expected (when specified)
      if (expectedAsset && extracted.asset && extracted.asset !== expectedAsset) continue;

      // Get context window for the match
      const contextStart = Math.max(0, match.index - 100);
      const contextEnd = Math.min(text.length, match.index + match[0].length + 100);
      const matchedText = text.substring(contextStart, contextEnd);

      // Try to extract date from nearby context
      let asOfDate: string | null = null;
      const nearbyText = text.substring(
        Math.max(0, match.index - 300),
        Math.min(text.length, match.index + match[0].length + 300)
      );
      for (const datePattern of DATE_PATTERNS) {
        datePattern.lastIndex = 0;
        const dateMatch = datePattern.exec(nearbyText);
        if (dateMatch) {
          asOfDate = parseDate(dateMatch[1]);
          if (asOfDate) break;
        }
      }

      // Try to extract shares from nearby context
      let sharesOutstanding: number | null = null;
      for (const sharesPattern of SHARES_PATTERNS) {
        sharesPattern.lastIndex = 0;
        const sharesMatch = sharesPattern.exec(nearbyText);
        if (sharesMatch) {
          sharesOutstanding = parseNumber(sharesMatch[1]);
          break;
        }
      }

      // Boost confidence if asset matches expected
      let confidence = pattern.confidence;
      if (expectedAsset && extracted.asset === expectedAsset) {
        confidence = Math.min(1.0, confidence + 0.05);
      }

      results.push({
        holdings: extracted.holdings ?? null,
        asset: extracted.asset ?? null,
        type: pattern.type,
        transactionAmount: extracted.transactionAmount ?? null,
        costUsd: extracted.costUsd ?? null,
        asOfDate,
        sharesOutstanding,
        confidence,
        matchedText: matchedText.trim(),
        patternName: pattern.name,
      });
    }
  }

  // Try table-format extraction (MSTR weekly 8-K style)
  const tableResults = extractFromTable(text, expectedAsset);
  results.push(...tableResults);

  // Deduplicate: if same holdings number appears multiple times, keep highest confidence
  const deduped = deduplicateResults(results);

  // Sort by confidence (highest first)
  deduped.sort((a, b) => b.confidence - a.confidence);

  return deduped;
}

/**
 * Deduplicate results by holdings value, keeping highest confidence match
 */
function deduplicateResults(results: RegexExtractionResult[]): RegexExtractionResult[] {
  const seen = new Map<string, RegexExtractionResult>();

  for (const r of results) {
    const key = `${r.type}:${r.holdings ?? r.transactionAmount}:${r.asset}`;
    const existing = seen.get(key);
    if (!existing || r.confidence > existing.confidence) {
      seen.set(key, r);
    }
  }

  return Array.from(seen.values());
}

/**
 * Get the best extraction result for a specific asset.
 * Prefers total holdings over transaction amounts.
 */
export function getBestResult(
  results: RegexExtractionResult[],
  expectedAsset?: string
): RegexExtractionResult | null {
  // Filter to expected asset if specified
  const filtered = expectedAsset
    ? results.filter(r => r.asset === expectedAsset || r.asset === null)
    : results;

  // Prefer total holdings
  const totals = filtered.filter(r => r.type === 'total' && r.holdings !== null);
  if (totals.length > 0) return totals[0]; // Already sorted by confidence

  // Fall back to transactions
  const transactions = filtered.filter(r => r.transactionAmount !== null);
  if (transactions.length > 0) return transactions[0];

  return null;
}
