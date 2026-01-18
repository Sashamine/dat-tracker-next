/**
 * Twitter/X Monitor
 * Uses Grok API to monitor Twitter accounts for holdings announcements
 */

import { SocialSource, TwitterMonitorResult, SourceCheckResult } from '../types';

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
