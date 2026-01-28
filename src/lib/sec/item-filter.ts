/**
 * 8-K Item Code Filter
 * 
 * Filters 8-K filings by Item codes to prioritize crypto-relevant filings
 * and skip irrelevant ones (HR changes, mine safety, etc.)
 * 
 * Reference: specs/8k-item-codes.md
 */

// Tier 1: Always process - high probability of crypto relevance
export const TIER_1_ITEMS = [
  '7.01',  // Regulation FD Disclosure - most BTC announcements
  '8.01',  // Other Events - catch-all for material crypto news
  '2.01',  // Acquisition/Disposition of Assets - crypto buys/sells
  '2.02',  // Results of Operations - earnings with holdings updates
];

// Tier 2: Process if crypto keywords found in content
export const TIER_2_ITEMS = [
  '1.01',  // Material Agreements - convertible notes, credit facilities
  '2.03',  // Financial Obligations - debt for BTC purchases
  '2.06',  // Material Impairments - crypto writedowns
  '3.02',  // Unregistered Equity Sales - ATM offerings
  '5.01',  // Control Changes - M&A affecting treasury
];

// Tier 3: Skip unless specifically flagged - low relevance
export const TIER_3_ITEMS = [
  '1.02',  // Termination of Material Agreement
  '1.03',  // Bankruptcy
  '1.05',  // Cybersecurity
  '2.04',  // Debt Triggering Events
  '3.01',  // Delisting Notice
  '3.03',  // Modification to Security Holder Rights
  '4.02',  // Non-Reliance on Prior Financials
  '5.02',  // Officer/Director Changes
  '5.03',  // Amendments to Articles/Bylaws
  '5.06',  // Shell Company Status
  '5.07',  // Shareholder Votes
];

// Tier 4: Always skip - not relevant to DAT tracking
export const SKIP_ITEMS = [
  '1.04',  // Mine Safety
  '4.01',  // Accountant Changes
  '5.04',  // Employee Benefit Plan Suspension
  '5.05',  // Code of Ethics Changes
  '5.08',  // Shareholder Director Nominations
  '6.01',  // ABS Informational Material
  '6.02',  // ABS Servicer/Trustee Change
  '6.03',  // ABS Credit Enhancement Change
  '6.04',  // ABS Distribution Failure
  '6.05',  // ABS Securities Act Updating
];

// Item 9.01 is just exhibits - ignore for filtering purposes
export const EXHIBIT_ONLY_ITEMS = ['9.01'];

export type FilterTier = 1 | 2 | 3 | 4;

export interface ItemFilterResult {
  shouldProcess: boolean;
  tier: FilterTier;
  matchedItems: string[];
  reason: string;
  requiresKeywordScan: boolean;
}

/**
 * Parse items string from SEC JSON into array
 * SEC provides items as comma-separated string: "7.01,8.01,9.01"
 */
export function parseItemsString(itemsStr: string | null | undefined): string[] {
  if (!itemsStr || itemsStr.trim() === '') {
    return [];
  }
  return itemsStr
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
}

/**
 * Filter 8-K filing by item codes
 * Returns whether to process and at what priority tier
 */
export function filterByItemCodes(items: string[]): ItemFilterResult {
  // Remove exhibit-only items from consideration
  const significantItems = items.filter(item => !EXHIBIT_ONLY_ITEMS.includes(item));
  
  if (significantItems.length === 0) {
    // Filing only has 9.01 (exhibits) - unusual, but process it as Tier 2
    return {
      shouldProcess: true,
      tier: 2,
      matchedItems: items,
      reason: 'Only exhibits (9.01) - unusual filing, processing with keyword scan',
      requiresKeywordScan: true,
    };
  }

  // Check Tier 1 first - always process
  const tier1Matches = significantItems.filter(item => TIER_1_ITEMS.includes(item));
  if (tier1Matches.length > 0) {
    return {
      shouldProcess: true,
      tier: 1,
      matchedItems: tier1Matches,
      reason: `Tier 1 items: ${tier1Matches.join(', ')}`,
      requiresKeywordScan: false,
    };
  }

  // Check Tier 2 - process with keyword scan
  const tier2Matches = significantItems.filter(item => TIER_2_ITEMS.includes(item));
  if (tier2Matches.length > 0) {
    return {
      shouldProcess: true,
      tier: 2,
      matchedItems: tier2Matches,
      reason: `Tier 2 items: ${tier2Matches.join(', ')} - requires keyword verification`,
      requiresKeywordScan: true,
    };
  }

  // Check if all items are in skip list
  const skipMatches = significantItems.filter(item => SKIP_ITEMS.includes(item));
  if (skipMatches.length === significantItems.length) {
    return {
      shouldProcess: false,
      tier: 4,
      matchedItems: skipMatches,
      reason: `Skip items only: ${skipMatches.join(', ')}`,
      requiresKeywordScan: false,
    };
  }

  // Tier 3 items or unknown - skip by default
  const tier3Matches = significantItems.filter(item => TIER_3_ITEMS.includes(item));
  if (tier3Matches.length > 0) {
    return {
      shouldProcess: false,
      tier: 3,
      matchedItems: tier3Matches,
      reason: `Tier 3 items: ${tier3Matches.join(', ')} - low relevance`,
      requiresKeywordScan: false,
    };
  }

  // Unknown items - process with keyword scan to be safe
  return {
    shouldProcess: true,
    tier: 2,
    matchedItems: significantItems,
    reason: `Unknown items: ${significantItems.join(', ')} - processing with keyword scan`,
    requiresKeywordScan: true,
  };
}

/**
 * Get human-readable description of an item code
 */
export function getItemDescription(itemCode: string): string {
  const descriptions: Record<string, string> = {
    '1.01': 'Entry into Material Definitive Agreement',
    '1.02': 'Termination of Material Definitive Agreement',
    '1.03': 'Bankruptcy or Receivership',
    '1.04': 'Mine Safety Violations',
    '1.05': 'Cybersecurity Incidents',
    '2.01': 'Completion of Acquisition or Disposition of Assets',
    '2.02': 'Results of Operations and Financial Condition',
    '2.03': 'Creation of Direct Financial Obligation',
    '2.04': 'Triggering Events (Debt Acceleration)',
    '2.05': 'Exit or Disposal Costs',
    '2.06': 'Material Impairments',
    '3.01': 'Delisting Notice',
    '3.02': 'Unregistered Sales of Equity Securities',
    '3.03': 'Material Modification to Security Holder Rights',
    '4.01': 'Changes in Certifying Accountant',
    '4.02': 'Non-Reliance on Prior Financials',
    '5.01': 'Changes in Control of Registrant',
    '5.02': 'Departure/Appointment of Officers/Directors',
    '5.03': 'Amendments to Articles/Bylaws',
    '5.04': 'Employee Benefit Plan Suspension',
    '5.05': 'Code of Ethics Changes',
    '5.06': 'Change in Shell Company Status',
    '5.07': 'Shareholder Votes',
    '5.08': 'Shareholder Director Nominations',
    '6.01': 'ABS Informational Material',
    '6.02': 'ABS Servicer/Trustee Change',
    '6.03': 'ABS Credit Enhancement Change',
    '6.04': 'ABS Distribution Failure',
    '6.05': 'ABS Securities Act Updating',
    '7.01': 'Regulation FD Disclosure',
    '8.01': 'Other Events',
    '9.01': 'Financial Statements and Exhibits',
  };
  return descriptions[itemCode] || `Unknown Item ${itemCode}`;
}

/**
 * Format items for logging/display
 */
export function formatItemsForDisplay(items: string[]): string {
  return items
    .map(item => `${item} (${getItemDescription(item)})`)
    .join(', ');
}

/**
 * Crypto keywords for Tier 2 verification
 */
export const CRYPTO_KEYWORDS = [
  // Asset names
  'bitcoin', 'btc', 'ethereum', 'ether', 'eth', 'solana', 'sol',
  'cryptocurrency', 'crypto asset', 'digital asset', 'virtual currency',
  'cryptoasset', 'crypto-asset',
  
  // Treasury terms
  'treasury reserve', 'treasury strategy', 'balance sheet',
  'corporate treasury', 'reserve asset', 'treasury asset',
  
  // Transaction terms
  'acquired', 'purchased', 'acquisition of', 'purchase of',
  'holdings', 'hold', 'hodl', 'custody',
  
  // Financial instruments for crypto buys
  'convertible note', 'convertible senior', 'at-the-market', 'atm offering',
  'use of proceeds', 'net proceeds',
  
  // Specific company terms
  'microstrategy', 'saylor', // Often mentioned in copycat announcements
];

/**
 * Check if text contains crypto-relevant keywords
 */
export function containsCryptoKeywords(text: string): boolean {
  const lowerText = text.toLowerCase();
  return CRYPTO_KEYWORDS.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

/**
 * Get exhibit priority patterns for a given item type
 * Returns patterns to search for in exhibit filenames
 */
export function getExhibitPriority(items: string[]): string[] {
  const patterns: string[] = [];
  
  // Press releases are highest priority for most items
  if (items.some(i => ['7.01', '8.01', '2.01', '2.02'].includes(i))) {
    patterns.push('ex99-1', 'ex99', 'press', 'release', 'shareholder', 'letter');
  }
  
  // Material agreements
  if (items.includes('1.01') || items.includes('2.03')) {
    patterns.push('ex10-', 'ex4-', 'credit', 'agreement', 'indenture', 'note');
  }
  
  // Asset purchases
  if (items.includes('2.01')) {
    patterns.push('ex10-', 'purchase', 'acquisition');
  }
  
  return patterns;
}
