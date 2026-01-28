/**
 * Smart Text Chunking for SEC Filings
 * 
 * Extracts relevant sections from 8-K and other filings to maximize
 * signal within token limits. Prioritizes:
 * 1. Relevant Item sections (7.01, 8.01, 2.01, etc.)
 * 2. Press release exhibits (EX-99.1)
 * 3. Tables with numbers
 * 4. Falls back to truncation only if nothing else works
 */

const MAX_CHUNK_SIZE = 8000;
const CRYPTO_KEYWORDS = [
  'bitcoin', 'btc', 'ethereum', 'eth', 'solana', 'sol', 'crypto', 'digital asset',
  'treasury', 'holdings', 'acquired', 'purchased', 'stake', 'staking', 'token',
  'avax', 'avalanche', 'tao', 'bittensor', 'link', 'chainlink', 'bnb', 'hype',
  'hyperliquid', 'xrp', 'doge', 'dogecoin', 'sui', 'trx', 'tron', 'zec', 'zcash',
  'ltc', 'litecoin', 'hbar', 'hedera'
];

interface ChunkResult {
  text: string;
  method: 'item-section' | 'exhibit' | 'keyword-context' | 'truncated';
  sections?: string[];
}

/**
 * Extract text around an Item section header in an 8-K
 * e.g., "Item 7.01 Regulation FD Disclosure"
 */
function extractItemSection(text: string, itemCode: string): string | null {
  // Various patterns for Item sections
  const patterns = [
    new RegExp(`Item\\s*${itemCode.replace('.', '\\.')}[^\\n]*\\n([\\s\\S]*?)(?=Item\\s*\\d+\\.\\d+|$)`, 'i'),
    new RegExp(`ITEM\\s*${itemCode.replace('.', '\\.')}[^\\n]*\\n([\\s\\S]*?)(?=ITEM\\s*\\d+\\.\\d+|$)`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const section = match[1].trim();
      // Only return if section has meaningful content
      if (section.length > 100) {
        return section;
      }
    }
  }
  return null;
}

/**
 * Extract exhibit content (press releases, shareholder letters)
 * These are typically EX-99.1, EX-99.2, etc.
 */
function extractExhibitContent(text: string): string | null {
  // Look for exhibit markers
  const exhibitPatterns = [
    /EXHIBIT\s*99[\s\S]*?(?=EXHIBIT\s*\d+|SIGNATURES|$)/i,
    /EX-99[\s\S]*?(?=EX-\d+|SIGNATURES|$)/i,
    /Press Release[\s\S]*?(?=###|SIGNATURES|$)/i,
  ];

  for (const pattern of exhibitPatterns) {
    const match = text.match(pattern);
    if (match && match[0].length > 200) {
      return match[0].trim();
    }
  }
  return null;
}

/**
 * Extract paragraphs containing crypto-related keywords
 * Returns surrounding context for each match
 */
function extractKeywordContext(text: string, contextChars: number = 500): string[] {
  const contexts: string[] = [];
  const lowerText = text.toLowerCase();

  for (const keyword of CRYPTO_KEYWORDS) {
    let pos = 0;
    while ((pos = lowerText.indexOf(keyword, pos)) !== -1) {
      const start = Math.max(0, pos - contextChars);
      const end = Math.min(text.length, pos + keyword.length + contextChars);
      
      // Expand to sentence boundaries if possible
      let expandedStart = start;
      let expandedEnd = end;
      
      // Find sentence start (look for period followed by space/newline before start)
      const beforeText = text.substring(Math.max(0, start - 100), start);
      const sentenceStartMatch = beforeText.match(/[.!?]\s+[A-Z][^.]*$/);
      if (sentenceStartMatch) {
        expandedStart = start - (beforeText.length - beforeText.lastIndexOf(sentenceStartMatch[0])) + 2;
      }
      
      // Find sentence end
      const afterText = text.substring(end, Math.min(text.length, end + 100));
      const sentenceEndMatch = afterText.match(/[.!?]/);
      if (sentenceEndMatch && sentenceEndMatch.index !== undefined) {
        expandedEnd = end + sentenceEndMatch.index + 1;
      }
      
      contexts.push(text.substring(expandedStart, expandedEnd).trim());
      pos = end; // Move past this occurrence
    }
  }

  // Deduplicate overlapping contexts
  const unique = Array.from(new Set(contexts));
  return unique;
}

/**
 * Extract tables that likely contain holdings/share data
 */
function extractRelevantTables(text: string): string | null {
  // Look for table-like structures with numbers
  const tablePatterns = [
    // HTML tables
    /<table[^>]*>[\s\S]*?<\/table>/gi,
    // Text tables with alignment
    /(?:^|\n)[\s|─┼┬┴┤├]+\n[\s\S]*?[\s|─┼┬┴┤├]+(?:\n|$)/gm,
  ];

  const tables: string[] = [];
  
  for (const pattern of tablePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const tableText = match[0];
      // Check if table contains crypto-related content
      const lowerTable = tableText.toLowerCase();
      if (CRYPTO_KEYWORDS.some(k => lowerTable.includes(k)) ||
          lowerTable.includes('holdings') ||
          lowerTable.includes('shares') ||
          lowerTable.includes('outstanding')) {
        tables.push(tableText);
      }
    }
  }

  return tables.length > 0 ? tables.join('\n\n') : null;
}

/**
 * Main chunking function - extracts relevant content from filing text
 */
export function chunkFilingText(
  text: string,
  options: {
    itemCodes?: string[];
    maxSize?: number;
  } = {}
): ChunkResult {
  const maxSize = options.maxSize || MAX_CHUNK_SIZE;
  const itemCodes = options.itemCodes || [];
  
  if (!text || text.length <= maxSize) {
    return { text, method: 'truncated' };
  }

  const chunks: string[] = [];
  const methods: ChunkResult['method'][] = [];
  const sections: string[] = [];

  // 1. Try to extract relevant Item sections
  const relevantItems = itemCodes.length > 0 
    ? itemCodes 
    : ['7.01', '8.01', '2.01', '2.02', '1.01']; // Default priority

  for (const item of relevantItems) {
    const section = extractItemSection(text, item);
    if (section) {
      chunks.push(`[Item ${item}]\n${section}`);
      sections.push(item);
      methods.push('item-section');
    }
  }

  // 2. Try to extract exhibit content (press releases)
  if (chunks.length === 0 || totalLength(chunks) < maxSize / 2) {
    const exhibit = extractExhibitContent(text);
    if (exhibit) {
      chunks.push(`[Press Release/Exhibit]\n${exhibit}`);
      methods.push('exhibit');
    }
  }

  // 3. Extract keyword context if still under limit
  if (chunks.length === 0 || totalLength(chunks) < maxSize / 2) {
    const contexts = extractKeywordContext(text);
    if (contexts.length > 0) {
      const contextText = contexts.slice(0, 5).join('\n\n---\n\n');
      chunks.push(`[Keyword Context]\n${contextText}`);
      methods.push('keyword-context');
    }
  }

  // 4. Try to extract relevant tables
  if (totalLength(chunks) < maxSize * 0.8) {
    const tables = extractRelevantTables(text);
    if (tables) {
      chunks.push(`[Tables]\n${tables}`);
    }
  }

  // Combine chunks up to max size
  let result = '';
  for (const chunk of chunks) {
    if (result.length + chunk.length + 4 <= maxSize) {
      result += (result ? '\n\n' : '') + chunk;
    } else {
      // Add partial chunk if we have room
      const remaining = maxSize - result.length - 4;
      if (remaining > 200) {
        result += '\n\n' + chunk.substring(0, remaining) + '...';
      }
      break;
    }
  }

  // Fall back to truncation if nothing extracted
  if (!result || result.length < 200) {
    return {
      text: text.substring(0, maxSize),
      method: 'truncated',
    };
  }

  // Determine primary method
  const primaryMethod = methods[0] || 'truncated';

  return {
    text: result,
    method: primaryMethod,
    sections: sections.length > 0 ? sections : undefined,
  };
}

function totalLength(chunks: string[]): number {
  return chunks.reduce((sum, c) => sum + c.length, 0);
}

/**
 * Quick relevance check - does this text likely contain crypto holdings info?
 */
export function isLikelyRelevant(text: string): boolean {
  const lowerText = text.toLowerCase();
  
  // Must have at least one crypto keyword
  const hasCrypto = CRYPTO_KEYWORDS.some(k => lowerText.includes(k));
  if (!hasCrypto) return false;
  
  // And should have some number-related content
  const hasNumbers = /\d{1,3}(,\d{3})*(\.\d+)?/.test(text) || 
                     /\$[\d,.]+/.test(text) ||
                     /\d+\s*(million|billion|thousand)/i.test(text);
  
  return hasNumbers;
}
