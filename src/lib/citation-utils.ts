/**
 * Shared utilities for citation extraction from documents.
 *
 * Used by verification scripts and citation backfill pipelines to:
 * - Strip HTML to plain text
 * - Generate numeric value search patterns
 * - Find a value in a document and extract a surrounding quote
 */

/** Strip HTML tags and decode common entities to plain text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, ' ')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Generate multiple string representations of a numeric value
 * so we can search for it in documents that may format it differently.
 *
 * Examples for 677000000:
 *   "677,000,000", "677000000", "677,000", "677.0", "677", "677 million"
 */
export function formatValuePatterns(
  value: number,
  metric: string,
): string[] {
  const patterns: string[] = [];
  const abs = Math.abs(value);
  if (abs === 0) return [];

  // With commas (US locale)
  patterns.push(abs.toLocaleString('en-US'));

  // Raw number
  if (abs >= 1000) patterns.push(abs.toString());

  // In thousands (when value is exact thousands of millions)
  if (abs >= 1_000_000 && abs % 1000 === 0) {
    patterns.push((abs / 1000).toLocaleString('en-US'));
  }

  // In millions
  if (abs >= 1_000_000) {
    const inM = abs / 1_000_000;
    patterns.push(inM.toFixed(1));
    patterns.push(inM.toFixed(0));
    if (inM >= 1000) {
      patterns.push(
        inM.toLocaleString('en-US', {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }),
      );
      patterns.push(Math.round(inM).toLocaleString('en-US'));
    }
    if (Number.isInteger(inM)) {
      patterns.push(`${inM.toLocaleString('en-US')} million`);
      patterns.push(`${inM} million`);
    } else {
      patterns.push(`${inM.toFixed(1)} million`);
      patterns.push(`${inM.toFixed(2)} million`);
    }
  }

  // In billions
  if (abs >= 1_000_000_000) {
    const inB = abs / 1_000_000_000;
    patterns.push(inB.toFixed(1));
    patterns.push(inB.toFixed(2));
    patterns.push(inB.toFixed(3));
    patterns.push(`${inB.toFixed(1)} billion`);
    patterns.push(`${inB.toFixed(2)} billion`);
  }

  // Decimal values
  if (!Number.isInteger(value)) {
    patterns.push(
      abs.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 6,
      }),
    );
    patterns.push(abs.toString());
    patterns.push(
      abs.toLocaleString('en-US', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    );
    patterns.push(
      abs.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
  }

  // Share counts sometimes reported in thousands
  if (metric === 'basic_shares' && abs > 1_000_000) {
    const inK = abs / 1000;
    if (Number.isInteger(inK)) patterns.push(inK.toLocaleString('en-US'));
  }

  // Generic "in thousands" for round numbers
  if (abs >= 1000 && abs % 1000 === 0) {
    const inK = abs / 1000;
    patterns.push(inK.toLocaleString('en-US'));
    if (inK >= 1000) patterns.push(inK.toString());
  }

  return [...new Set(patterns)].filter((p) => p.length >= 4);
}

export type CitationMatch = {
  /** Surrounding text passage containing the matched value. */
  quote: string;
  /** The specific pattern string that matched. */
  searchTerm: string;
};

/**
 * Search a document for a numeric value and return a surrounding quote.
 *
 * Automatically strips HTML if the document contains tags.
 * Skips patterns that match more than 20 times (too generic).
 * Extracts ~200 chars of context on each side, snapping to sentence boundaries.
 */
export function findValueInDocument(
  rawDoc: string,
  patterns: string[],
): CitationMatch | null {
  const doc = rawDoc.includes('<') ? stripHtml(rawDoc) : rawDoc;

  for (const pattern of patterns) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const flexPattern = escaped.replace(/\s+/g, '\\s+');
    const regex = new RegExp(flexPattern, 'g');
    const match = regex.exec(doc);
    if (!match) continue;

    // Skip overly common patterns
    const allMatches = doc.match(new RegExp(flexPattern, 'g'));
    if (allMatches && allMatches.length > 20) continue;

    const matchStart = match.index;
    const matchEnd = matchStart + match[0].length;

    // Expand to ~200 chars each side
    let quoteStart = Math.max(0, matchStart - 200);
    let quoteEnd = Math.min(doc.length, matchEnd + 200);

    // Snap left boundary to sentence start
    const leftChunk = doc.slice(quoteStart, matchStart);
    const sentenceStart = leftChunk.search(/(?:^|\.\s+|\n)[A-Z]/);
    if (sentenceStart >= 0) {
      quoteStart = quoteStart + sentenceStart;
      if (doc[quoteStart] === '.' || doc[quoteStart] === '\n') quoteStart++;
      while (quoteStart < matchStart && /\s/.test(doc[quoteStart]))
        quoteStart++;
    }

    // Snap right boundary to sentence end
    const rightChunk = doc.slice(matchEnd, quoteEnd);
    const sentenceEnd = rightChunk.search(/\.\s|\n/);
    if (sentenceEnd >= 0) quoteEnd = matchEnd + sentenceEnd + 1;

    const quote = doc
      .slice(quoteStart, quoteEnd)
      .replace(/\s+/g, ' ')
      .trim();
    if (quote.length < 10) continue;

    return { quote: quote.slice(0, 500), searchTerm: pattern };
  }

  return null;
}
