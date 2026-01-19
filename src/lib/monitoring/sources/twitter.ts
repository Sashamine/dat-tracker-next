/**
 * Twitter/X Monitor
 * Uses Grok API to monitor Twitter accounts for holdings announcements
 *
 * Supports two modes:
 * 1. Early Signal Detection - Announcements that precede official filings
 * 2. Holdings Update Detection - Traditional extraction for pending updates
 */

import { SocialSource, TwitterMonitorResult, SourceCheckResult, EarlySignal } from '../types';

interface GrokConfig {
  apiKey: string;
  apiUrl: string;
}

// Keywords that suggest holdings updates
const HOLDINGS_KEYWORDS = [
  'acquired',
  'purchased',
  'bought',
  'added',
  'holdings',
  'treasury',
  'total',
  'now hold',
  'position',
  'accumulated',
  'owns',
  'balance',
];

// Asset-specific keywords
const ASSET_KEYWORDS: Record<string, string[]> = {
  BTC: ['bitcoin', 'btc', '#bitcoin'],
  ETH: ['ethereum', 'eth', '#ethereum', 'ether'],
  SOL: ['solana', 'sol', '#solana'],
  HYPE: ['hyperliquid', 'hype', '$hype'],
  BNB: ['bnb', 'binance'],
  TAO: ['bittensor', 'tao', '$tao'],
  LINK: ['chainlink', 'link', '$link'],
  TRX: ['tron', 'trx', '$trx'],
  XRP: ['xrp', 'ripple', '$xrp'],
  ZEC: ['zcash', 'zec', '$zec'],
  LTC: ['litecoin', 'ltc', '$ltc'],
  SUI: ['sui', '$sui'],
  DOGE: ['dogecoin', 'doge', '$doge'],
  AVAX: ['avalanche', 'avax', '$avax'],
  ADA: ['cardano', 'ada', '$ada'],
  HBAR: ['hedera', 'hbar', '$hbar'],
};

/**
 * Search Twitter using Grok API
 * Grok has native Twitter/X access
 */
async function searchTwitterWithGrok(
  query: string,
  config: GrokConfig
): Promise<any[]> {
  try {
    // Use Grok chat completions to search Twitter
    // Grok can access real-time Twitter data
    const response = await fetch(`${config.apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [
          {
            role: 'system',
            content: `You are a Twitter search assistant. Search for recent tweets matching the query and return them as a JSON array. Each tweet should have: id, author_handle, content, posted_at (ISO string), likes, retweets. Return only valid JSON array with no markdown formatting.`,
          },
          {
            role: 'user',
            content: `Search Twitter for: ${query}. Return the 10 most recent relevant tweets as JSON array.`,
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Grok API error:', error);
      return [];
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '[]';

    // Parse the JSON response
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      return JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse Grok Twitter response:', content);
      return [];
    }
  } catch (error) {
    console.error('Twitter search error:', error);
    return [];
  }
}

/**
 * Check if tweet content might contain holdings information
 */
function containsHoldingsInfo(text: string, asset: string): boolean {
  const lowerText = text.toLowerCase();

  // Must contain asset keywords
  const assetKeywords = ASSET_KEYWORDS[asset] || [asset.toLowerCase()];
  const hasAssetKeyword = assetKeywords.some(kw => lowerText.includes(kw));
  if (!hasAssetKeyword) return false;

  // Must contain holdings-related keywords
  const hasHoldingsKeyword = HOLDINGS_KEYWORDS.some(kw => lowerText.includes(kw));

  // Or contain numbers with asset mentions (e.g., "50,000 BTC")
  const hasNumberWithAsset = /\d+[,.]?\d*\s*(btc|eth|sol|k|m|b)\b/i.test(text);

  return hasHoldingsKeyword || hasNumberWithAsset;
}

/**
 * Monitor Twitter accounts for holdings updates
 */
export async function monitorTwitterAccounts(
  accounts: SocialSource[],
  sinceDate: Date,
  config: GrokConfig
): Promise<TwitterMonitorResult[]> {
  const results: TwitterMonitorResult[] = [];

  for (const account of accounts) {
    if (!account.isActive) continue;

    try {
      // Build search query
      const handle = account.accountHandle.replace('@', '');
      const sinceStr = sinceDate.toISOString().split('T')[0];

      // Search for tweets from this account mentioning holdings-related terms
      const query = `from:${handle} (holdings OR acquired OR treasury OR purchased) since:${sinceStr}`;

      const tweets = await searchTwitterWithGrok(query, config);

      for (const tweet of tweets) {
        // Skip if no holdings-relevant content
        // Note: We'll filter further when we know the asset
        if (!tweet.content) continue;

        results.push({
          tweetId: tweet.id || `${handle}-${Date.now()}`,
          accountHandle: handle,
          companyId: account.companyId,
          content: tweet.content,
          postedAt: tweet.posted_at ? new Date(tweet.posted_at) : new Date(),
          engagement: {
            likes: tweet.likes || 0,
            retweets: tweet.retweets || 0,
            replies: tweet.replies || 0,
          },
        });
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error monitoring @${account.accountHandle}:`, error);
    }
  }

  return results;
}

/**
 * Check Twitter for holdings updates and convert to SourceCheckResults
 */
export async function checkTwitterForUpdates(
  companies: Array<{
    id: number;
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
  }>,
  socialSources: SocialSource[],
  sinceDate: Date,
  config: GrokConfig
): Promise<SourceCheckResult[]> {
  const results: SourceCheckResult[] = [];

  // Group social sources by company
  const sourcesByCompany = new Map<number, SocialSource[]>();
  for (const source of socialSources) {
    const existing = sourcesByCompany.get(source.companyId) || [];
    existing.push(source);
    sourcesByCompany.set(source.companyId, existing);
  }

  for (const company of companies) {
    const companySources = sourcesByCompany.get(company.id) || [];
    if (companySources.length === 0) continue;

    const tweets = await monitorTwitterAccounts(companySources, sinceDate, config);

    for (const tweet of tweets) {
      // Check if tweet contains holdings info for this asset
      if (!containsHoldingsInfo(tweet.content, company.asset)) continue;

      // Find the source configuration
      const source = companySources.find(s =>
        s.accountHandle.toLowerCase().includes(tweet.accountHandle.toLowerCase())
      );

      results.push({
        sourceType: 'twitter',
        companyId: company.id,
        ticker: company.ticker,
        asset: company.asset,
        // Holdings will be extracted by LLM later
        detectedHoldings: undefined,
        confidence: 0.7, // Lower confidence for social media
        sourceUrl: `https://twitter.com/${tweet.accountHandle}/status/${tweet.tweetId}`,
        sourceText: tweet.content,
        sourceDate: tweet.postedAt,
        trustLevel: source?.trustLevel || 'community',
      });
    }
  }

  return results;
}

/**
 * Search for a specific company's mentions
 */
export async function searchCompanyMentions(
  companyName: string,
  ticker: string,
  asset: string,
  config: GrokConfig
): Promise<TwitterMonitorResult[]> {
  const query = `(${companyName} OR $${ticker}) (holdings OR treasury OR ${asset}) -filter:retweets`;

  const tweets = await searchTwitterWithGrok(query, config);

  return tweets
    .filter((tweet: any) => containsHoldingsInfo(tweet.content, asset))
    .map((tweet: any) => ({
      tweetId: tweet.id || `search-${Date.now()}`,
      accountHandle: tweet.author_handle || 'unknown',
      companyId: 0,
      content: tweet.content,
      postedAt: tweet.posted_at ? new Date(tweet.posted_at) : new Date(),
      engagement: {
        likes: tweet.likes || 0,
        retweets: tweet.retweets || 0,
        replies: tweet.replies || 0,
      },
    }));
}

/**
 * Create Grok config from environment
 */
export function createGrokConfig(): GrokConfig | null {
  const apiKey = process.env.GROK_API_KEY;
  const apiUrl = process.env.GROK_API_URL || 'https://api.x.ai';

  if (!apiKey) {
    console.warn('GROK_API_KEY not set - Twitter monitoring disabled');
    return null;
  }

  return { apiKey, apiUrl };
}

// ============================================================
// EARLY SIGNAL DETECTION
// ============================================================

// Priority Twitter accounts to monitor for early signals
// These accounts frequently announce acquisitions before SEC filings
export const PRIORITY_TWITTER_ACCOUNTS: Array<{
  handle: string;
  companyTicker?: string; // If associated with a specific company
  type: 'executive' | 'company' | 'analyst' | 'news';
  description: string;
}> = [
  // Company executives known for tweeting acquisitions
  { handle: 'saylor', companyTicker: 'MSTR', type: 'executive', description: 'Michael Saylor - Strategy/MicroStrategy' },
  { handle: 'michael_saylor', companyTicker: 'MSTR', type: 'executive', description: 'Michael Saylor (alt)' },

  // Company official accounts
  { handle: 'Strategy', companyTicker: 'MSTR', type: 'company', description: 'Strategy (MicroStrategy) Official' },
  { handle: 'MARAHoldings', companyTicker: 'MARA', type: 'company', description: 'MARA Holdings Official' },
  { handle: 'RiotPlatforms', companyTicker: 'RIOT', type: 'company', description: 'Riot Platforms Official' },
  { handle: 'CleanSpark_Inc', companyTicker: 'CLSK', type: 'company', description: 'CleanSpark Official' },
  { handle: 'Aboromir_Rhett', companyTicker: 'BITM', type: 'executive', description: 'Bitmine CEO' },

  // Analysts and news sources that break BTC treasury news
  { handle: 'BitcoinMagazine', type: 'news', description: 'Bitcoin Magazine' },
  { handle: 'DocumentingBTC', type: 'analyst', description: 'Documenting Bitcoin' },
  { handle: 'BTCArchive', type: 'analyst', description: 'BTC Archive' },
];

// Keywords that indicate an acquisition announcement (not just general holdings discussion)
const ACQUISITION_KEYWORDS = [
  'acquired',
  'purchased',
  'bought',
  'added',
  'accumulated',
  'just bought',
  'now hold',
  'increased',
  'new purchase',
  'acquisition',
];

// Pattern to extract BTC amounts from tweets
const BTC_AMOUNT_PATTERNS = [
  /(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:btc|bitcoin)/i,
  /(?:acquired|purchased|bought|added)\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:btc|bitcoin)?/i,
  /\$(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)\s*(?:worth\s+of\s+)?(?:btc|bitcoin)/i,
];

/**
 * Check priority Twitter accounts for early signals
 * This is separate from the regular holdings monitoring - it specifically
 * looks for acquisition announcements that precede official filings
 */
export async function checkTwitterForEarlySignals(
  companies: Array<{
    id: number;
    ticker: string;
    name: string;
    asset: string;
    holdings: number;
  }>,
  sinceDate: Date,
  config: GrokConfig
): Promise<EarlySignal[]> {
  const signals: EarlySignal[] = [];

  // Create ticker -> company lookup
  const companyByTicker = new Map(companies.map(c => [c.ticker, c]));

  for (const account of PRIORITY_TWITTER_ACCOUNTS) {
    try {
      const handle = account.handle.replace('@', '');
      const sinceStr = sinceDate.toISOString().split('T')[0];

      // Search for acquisition-related tweets
      const query = `from:${handle} (${ACQUISITION_KEYWORDS.slice(0, 5).join(' OR ')}) (bitcoin OR btc) since:${sinceStr}`;

      console.log(`[Twitter Early Signal] Checking @${handle}...`);
      const tweets = await searchTwitterWithGrok(query, config);

      for (const tweet of tweets) {
        if (!tweet.content) continue;

        const lowerContent = tweet.content.toLowerCase();

        // Must contain acquisition keywords
        const hasAcquisitionKeyword = ACQUISITION_KEYWORDS.some(kw =>
          lowerContent.includes(kw.toLowerCase())
        );
        if (!hasAcquisitionKeyword) continue;

        // Try to extract BTC amount
        let estimatedChange: number | undefined;
        for (const pattern of BTC_AMOUNT_PATTERNS) {
          const match = tweet.content.match(pattern);
          if (match) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(amount) && amount > 0) {
              // Handle "million" suffix
              if (lowerContent.includes('million') || lowerContent.includes(' m ')) {
                // This is likely a USD amount, estimate BTC (rough: $100k per BTC)
                estimatedChange = Math.round(amount * 1_000_000 / 100_000);
              } else {
                estimatedChange = amount;
              }
              break;
            }
          }
        }

        // Determine which company this relates to
        let company = account.companyTicker ? companyByTicker.get(account.companyTicker) : undefined;

        // If no direct company association, try to find company mention in tweet
        if (!company) {
          for (const [ticker, c] of companyByTicker) {
            if (
              lowerContent.includes(ticker.toLowerCase()) ||
              lowerContent.includes(c.name.toLowerCase()) ||
              lowerContent.includes(`$${ticker.toLowerCase()}`)
            ) {
              company = c;
              break;
            }
          }
        }

        // Skip if we can't associate with a tracked company
        if (!company) continue;

        // Only create signal for BTC companies
        if (company.asset !== 'BTC') continue;

        signals.push({
          companyId: company.id,
          ticker: company.ticker,
          asset: company.asset,
          signalType: 'twitter_announcement',
          description: `@${handle} announced potential BTC acquisition`,
          estimatedChange,
          sourceUrl: `https://twitter.com/${handle}/status/${tweet.id || 'unknown'}`,
          sourceText: tweet.content.length > 500
            ? tweet.content.substring(0, 497) + '...'
            : tweet.content,
          sourceDate: tweet.posted_at ? new Date(tweet.posted_at) : new Date(),
          status: 'pending_confirmation',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 day expiry
        });
      }

      // Rate limiting between accounts
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[Twitter Early Signal] Error checking @${account.handle}:`, error);
    }
  }

  return signals;
}

/**
 * Add a priority Twitter account to monitor
 */
export function addPriorityTwitterAccount(
  handle: string,
  companyTicker: string | undefined,
  type: 'executive' | 'company' | 'analyst' | 'news',
  description: string
): void {
  PRIORITY_TWITTER_ACCOUNTS.push({ handle, companyTicker, type, description });
}
