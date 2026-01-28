/**
 * Smart Content Extractor for SEC Filings
 * 
 * Extracts relevant sections from 8-K filings instead of truncating.
 * Parses Item section boundaries and prioritizes exhibits.
 * 
 * Priority 3 from sec-monitor-optimizations.md
 */

import { TIER_1_ITEMS, TIER_2_ITEMS, CRYPTO_KEYWORDS } from './item-filter';

// ============================================
// TYPES
// ============================================

export interface ExtractedSection {
  itemCode: string;
  title: string;
  content: string;
  startIndex: number;
  endIndex: number;
}

export interface ExhibitInfo {
  name: string;
  url: string;
  type: 'press_release' | 'shareholder_letter' | 'agreement' | 'other';
  priority: number;  // Lower = higher priority
}

export interface ExtractionResult {
  sections: ExtractedSection[];
  exhibits: ExhibitInfo[];
  combinedText: string;
  method: 'item_sections' | 'keyword_context' | 'full_truncated';
  totalChars: number;
  truncated: boolean;
}

// ============================================
// ITEM SECTION PARSING
// ============================================

/**
 * Regex patterns for finding Item section headers in 8-K documents
 * Handles various formats:
 * - "Item 7.01" / "ITEM 7.01"
 * - "Item 7.01." / "Item 7.01:"
 * - "Item 7.01 Regulation FD Disclosure"
 */
const ITEM_HEADER_PATTERNS = [
  // Standard format: Item X.XX with optional title
  /(?:^|\n)\s*(?:ITEM|Item)\s+(\d+\.\d+)\.?\s*[-–—:]?\s*([^\n]*?)(?=\n)/gi,
  // All caps with underline
  /(?:^|\n)\s*ITEM\s+(\d+\.\d+)\s*[-–—.]?\s*([A-Z][A-Z\s]*?)(?=\n)/gi,
];

/**
 * Item section title mappings
 */
const ITEM_TITLES: Record<string, string> = {
  '1.01': 'Entry into a Material Definitive Agreement',
  '1.02': 'Termination of a Material Definitive Agreement',
  '1.03': 'Bankruptcy or Receivership',
  '1.04': 'Mine Safety',
  '1.05': 'Cybersecurity Incidents',
  '2.01': 'Completion of Acquisition or Disposition of Assets',
  '2.02': 'Results of Operations and Financial Condition',
  '2.03': 'Creation of a Direct Financial Obligation',
  '2.04': 'Triggering Events That Accelerate or Increase a Direct Financial Obligation',
  '2.05': 'Costs Associated with Exit or Disposal Activities',
  '2.06': 'Material Impairments',
  '3.01': 'Notice of Delisting or Failure to Satisfy a Continued Listing Rule',
  '3.02': 'Unregistered Sales of Equity Securities',
  '3.03': 'Material Modification to Rights of Security Holders',
  '4.01': 'Changes in Registrant\'s Certifying Accountant',
  '4.02': 'Non-Reliance on Previously Issued Financial Statements',
  '5.01': 'Changes in Control of Registrant',
  '5.02': 'Departure of Directors or Certain Officers',
  '5.03': 'Amendments to Articles of Incorporation or Bylaws',
  '5.04': 'Temporary Suspension of Trading Under Registrant\'s Employee Benefit Plans',
  '5.05': 'Amendment to Registrant\'s Code of Ethics',
  '5.06': 'Change in Shell Company Status',
  '5.07': 'Submission of Matters to a Vote of Security Holders',
  '5.08': 'Shareholder Director Nominations',
  '7.01': 'Regulation FD Disclosure',
  '8.01': 'Other Events',
  '9.01': 'Financial Statements and Exhibits',
};

/**
 * Find all Item section boundaries in an 8-K document
 */
export function parseItemSections(text: string): ExtractedSection[] {
  const sections: ExtractedSection[] = [];
  const foundItems: Array<{ itemCode: string; title: string; startIndex: number }> = [];
  
  // Find all item headers
  for (const pattern of ITEM_HEADER_PATTERNS) {
    let match: RegExpExecArray | null;
    // Reset regex state
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(text)) !== null) {
      const itemCode = match[1];
      const titleFromDoc = match[2]?.trim() || '';
      const title = titleFromDoc || ITEM_TITLES[itemCode] || `Item ${itemCode}`;
      const matchIndex = match.index;
      
      // Avoid duplicates
      if (!foundItems.some(f => f.itemCode === itemCode && Math.abs(f.startIndex - matchIndex) < 100)) {
        foundItems.push({
          itemCode,
          title,
          startIndex: matchIndex,
        });
      }
    }
  }
  
  // Sort by position
  foundItems.sort((a, b) => a.startIndex - b.startIndex);
  
  // Extract content between sections
  for (let i = 0; i < foundItems.length; i++) {
    const current = foundItems[i];
    const next = foundItems[i + 1];
    
    // Find the end of this section (start of next, or end of document)
    const endIndex = next ? next.startIndex : text.length;
    
    // Extract content (skip the header line itself)
    const headerEnd = text.indexOf('\n', current.startIndex);
    const contentStart = headerEnd > 0 ? headerEnd + 1 : current.startIndex;
    const content = text.substring(contentStart, endIndex).trim();
    
    sections.push({
      itemCode: current.itemCode,
      title: current.title,
      content,
      startIndex: current.startIndex,
      endIndex,
    });
  }
  
  return sections;
}

/**
 * Filter sections to only those relevant for crypto holdings
 */
export function filterRelevantSections(
  sections: ExtractedSection[],
  targetItems?: string[]
): ExtractedSection[] {
  // If specific items requested, filter to those
  if (targetItems && targetItems.length > 0) {
    return sections.filter(s => targetItems.includes(s.itemCode));
  }
  
  // Otherwise, return Tier 1 + Tier 2 items
  const relevantItems = [...TIER_1_ITEMS, ...TIER_2_ITEMS];
  return sections.filter(s => relevantItems.includes(s.itemCode));
}

// ============================================
// EXHIBIT HANDLING
// ============================================

/**
 * Exhibit filename patterns with priorities
 * Lower priority number = check first
 */
const EXHIBIT_PATTERNS: Array<{ pattern: RegExp; type: ExhibitInfo['type']; priority: number }> = [
  // Press releases (highest priority)
  { pattern: /ex99[-_]?1/i, type: 'press_release', priority: 1 },
  { pattern: /ex[-_]?99[-_]?1/i, type: 'press_release', priority: 1 },
  { pattern: /pressrelease/i, type: 'press_release', priority: 2 },
  { pattern: /press[-_]?release/i, type: 'press_release', priority: 2 },
  
  // Shareholder communications
  { pattern: /shareholder/i, type: 'shareholder_letter', priority: 3 },
  { pattern: /investor[-_]?letter/i, type: 'shareholder_letter', priority: 3 },
  
  // Other exhibits
  { pattern: /ex99[-_]?2/i, type: 'other', priority: 4 },
  { pattern: /ex99/i, type: 'other', priority: 5 },
  
  // Agreements (lower priority for crypto extraction)
  { pattern: /ex10[-_]?1/i, type: 'agreement', priority: 6 },
  { pattern: /ex4[-_]?1/i, type: 'agreement', priority: 7 },
  { pattern: /agreement/i, type: 'agreement', priority: 8 },
  { pattern: /indenture/i, type: 'agreement', priority: 9 },
];

/**
 * Classify and prioritize exhibits from a filing index
 */
export function classifyExhibits(
  documents: Array<{ name: string; size?: number }>,
  baseUrl: string
): ExhibitInfo[] {
  const exhibits: ExhibitInfo[] = [];
  
  for (const doc of documents) {
    // Only consider HTML files
    if (!doc.name.match(/\.htm[l]?$/i)) continue;
    
    // Skip the main 8-K document
    if (doc.name.match(/^[a-z]+-8k/i)) continue;
    
    // Check against patterns
    for (const { pattern, type, priority } of EXHIBIT_PATTERNS) {
      if (pattern.test(doc.name)) {
        exhibits.push({
          name: doc.name,
          url: `${baseUrl}/${doc.name}`,
          type,
          priority,
        });
        break;  // Only match first pattern
      }
    }
  }
  
  // Sort by priority (lower = better)
  exhibits.sort((a, b) => a.priority - b.priority);
  
  return exhibits;
}

// ============================================
// SMART EXTRACTION
// ============================================

/**
 * Extract relevant content from 8-K filing with smart chunking
 * 
 * Strategy:
 * 1. Try to extract specific Item sections
 * 2. If sections found, combine relevant ones
 * 3. If no sections found or too short, fall back to keyword context
 * 4. Last resort: truncate full text
 */
export function extractRelevantContent(
  text: string,
  options: {
    targetItems?: string[];
    maxChars?: number;
    includeExhibitRefs?: boolean;
  } = {}
): ExtractionResult {
  const { targetItems, maxChars = 12000, includeExhibitRefs = true } = options;
  
  // Clean the text first
  const cleanedText = cleanHtmlText(text);
  
  // Try to parse Item sections
  const allSections = parseItemSections(cleanedText);
  const relevantSections = filterRelevantSections(allSections, targetItems);
  
  // If we found relevant sections, combine them
  if (relevantSections.length > 0) {
    let combinedText = '';
    const includedSections: ExtractedSection[] = [];
    
    for (const section of relevantSections) {
      const sectionHeader = `\n--- Item ${section.itemCode}: ${section.title} ---\n`;
      const sectionContent = section.content;
      
      // Check if adding this section would exceed limit
      if (combinedText.length + sectionHeader.length + sectionContent.length > maxChars) {
        // If we have nothing yet, include truncated section
        if (combinedText.length === 0) {
          const truncatedContent = sectionContent.substring(0, maxChars - sectionHeader.length - 50);
          combinedText = sectionHeader + truncatedContent + '\n[...truncated...]';
          includedSections.push(section);
        }
        break;
      }
      
      combinedText += sectionHeader + sectionContent + '\n';
      includedSections.push(section);
    }
    
    if (combinedText.length > 0) {
      return {
        sections: includedSections,
        exhibits: [],
        combinedText: combinedText.trim(),
        method: 'item_sections',
        totalChars: combinedText.length,
        truncated: combinedText.length >= maxChars,
      };
    }
  }
  
  // Fallback: Extract context around crypto keywords
  const keywordContext = extractKeywordContext(cleanedText, maxChars);
  if (keywordContext.length > 500) {
    return {
      sections: [],
      exhibits: [],
      combinedText: keywordContext,
      method: 'keyword_context',
      totalChars: keywordContext.length,
      truncated: keywordContext.length >= maxChars,
    };
  }
  
  // Last resort: Truncate full text
  const truncated = cleanedText.substring(0, maxChars);
  return {
    sections: [],
    exhibits: [],
    combinedText: truncated,
    method: 'full_truncated',
    totalChars: truncated.length,
    truncated: true,
  };
}

/**
 * Extract context around crypto keywords
 * Better than simple truncation - finds the most relevant parts
 */
function extractKeywordContext(text: string, maxChars: number): string {
  const lowerText = text.toLowerCase();
  const contexts: Array<{ start: number; end: number; score: number }> = [];
  
  // Find all keyword matches and score them
  for (const keyword of CRYPTO_KEYWORDS) {
    let index = 0;
    while ((index = lowerText.indexOf(keyword.toLowerCase(), index)) !== -1) {
      // Calculate context window (2000 chars around keyword)
      const contextSize = 2000;
      const start = Math.max(0, index - contextSize / 2);
      const end = Math.min(text.length, index + keyword.length + contextSize / 2);
      
      // Score based on keyword importance
      let score = 1;
      if (['holdings', 'acquired', 'purchased', 'treasury'].some(k => keyword.includes(k))) {
        score = 3;  // High-value keywords
      } else if (['bitcoin', 'btc', 'ethereum', 'eth'].some(k => keyword.includes(k))) {
        score = 2;  // Asset names
      }
      
      contexts.push({ start, end, score });
      index += keyword.length;
    }
  }
  
  if (contexts.length === 0) {
    return '';
  }
  
  // Sort by score (highest first)
  contexts.sort((a, b) => b.score - a.score);
  
  // Merge overlapping contexts and build result
  const mergedRanges: Array<{ start: number; end: number }> = [];
  let totalChars = 0;
  
  for (const ctx of contexts) {
    if (totalChars >= maxChars) break;
    
    // Check for overlap with existing ranges
    let merged = false;
    for (const range of mergedRanges) {
      if (ctx.start <= range.end && ctx.end >= range.start) {
        // Merge ranges
        range.start = Math.min(range.start, ctx.start);
        range.end = Math.max(range.end, ctx.end);
        merged = true;
        break;
      }
    }
    
    if (!merged) {
      mergedRanges.push({ start: ctx.start, end: ctx.end });
      totalChars += ctx.end - ctx.start;
    }
  }
  
  // Sort ranges by position and extract text
  mergedRanges.sort((a, b) => a.start - b.start);
  
  const parts: string[] = [];
  for (const range of mergedRanges) {
    const part = text.substring(range.start, range.end).trim();
    if (part.length > 0) {
      parts.push(part);
    }
  }
  
  return parts.join('\n\n[...]\n\n');
}

/**
 * Clean HTML text - remove tags, normalize whitespace
 */
export function cleanHtmlText(html: string): string {
  return html
    // Remove style and script blocks
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove HTML tags
    .replace(/<[^>]*>/g, ' ')
    // Decode common entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&#34;/g, '"')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&bull;/g, '•')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Combine exhibit content with 8-K sections
 * Prioritizes exhibit content (press releases) over 8-K body
 */
export async function extractWithExhibits(
  mainContent: string,
  exhibits: ExhibitInfo[],
  fetchFn: (url: string) => Promise<string | null>,
  options: {
    targetItems?: string[];
    maxChars?: number;
    maxExhibits?: number;
  } = {}
): Promise<ExtractionResult> {
  const { targetItems, maxChars = 15000, maxExhibits = 2 } = options;
  
  const parts: string[] = [];
  let totalChars = 0;
  const includedExhibits: ExhibitInfo[] = [];
  
  // Try to fetch priority exhibits first (press releases)
  const priorityExhibits = exhibits.filter(e => e.type === 'press_release' || e.type === 'shareholder_letter');
  
  for (const exhibit of priorityExhibits.slice(0, maxExhibits)) {
    if (totalChars >= maxChars) break;
    
    try {
      const content = await fetchFn(exhibit.url);
      if (content) {
        const cleaned = cleanHtmlText(content);
        const remaining = maxChars - totalChars;
        const exhibitContent = cleaned.substring(0, remaining);
        
        parts.push(`\n--- Exhibit: ${exhibit.name} (${exhibit.type}) ---\n${exhibitContent}`);
        totalChars += exhibitContent.length;
        includedExhibits.push(exhibit);
      }
    } catch (error) {
      console.error(`Error fetching exhibit ${exhibit.name}:`, error);
    }
  }
  
  // If we have room, add relevant sections from main 8-K
  if (totalChars < maxChars) {
    const mainExtraction = extractRelevantContent(mainContent, {
      targetItems,
      maxChars: maxChars - totalChars,
    });
    
    if (mainExtraction.combinedText.length > 0) {
      parts.push(`\n--- 8-K Body ---\n${mainExtraction.combinedText}`);
      totalChars += mainExtraction.combinedText.length;
    }
  }
  
  return {
    sections: [],  // Combined in parts
    exhibits: includedExhibits,
    combinedText: parts.join('\n').trim(),
    method: includedExhibits.length > 0 ? 'item_sections' : 'full_truncated',
    totalChars,
    truncated: totalChars >= maxChars,
  };
}
