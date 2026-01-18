/**
 * Company Data Source Configuration
 *
 * Maps each company to its primary and secondary data sources
 * for automated hourly monitoring.
 */

export interface CompanySource {
  ticker: string;
  name: string;
  asset: 'BTC' | 'ETH' | 'SOL' | 'HYPE' | 'DOGE' | 'OTHER';

  // SEC EDGAR (US companies)
  secCik?: string;
  secFilingPatterns?: {
    // File name patterns to search in 8-K filings
    eightK?: RegExp[];
    // File name patterns for 10-Q/10-K
    tenQ?: RegExp[];
  };

  // Company IR page
  irPageUrl?: string;
  irPressReleasePattern?: RegExp; // Pattern to find holdings in press releases

  // Direct holdings page (some companies publish real-time)
  holdingsPageUrl?: string;

  // Aggregator fallbacks
  aggregators?: {
    bitcoinTreasuries?: string; // slug on bitcointreasuries.net
    bitbo?: string; // slug on bitbo.io
    theBlock?: string; // slug on theblock.co/treasuries
    coingecko?: string; // slug on coingecko.com/treasuries
  };

  // Twitter/X handles for announcement monitoring
  twitterHandles?: string[];

  // Trust level for auto-approval
  trustLevel: 'official' | 'verified' | 'aggregator';

  // Extraction hints for LLM
  extractionHints?: string;
}

export const COMPANY_SOURCES: CompanySource[] = [
  // ========== US COMPANIES WITH SEC FILINGS ==========
  {
    ticker: 'MSTR',
    name: 'Strategy (fka MicroStrategy)',
    asset: 'BTC',
    secCik: '0001050446',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release|shareholder|letter|announce/i],
    },
    irPageUrl: 'https://www.microstrategy.com/press',
    twitterHandles: ['@Strategy'],
    aggregators: {
      bitcoinTreasuries: 'microstrategy',
      bitbo: 'microstrategy',
      theBlock: 'mstr',
    },
    trustLevel: 'official',
    extractionHints: 'Look for "holds X bitcoin" or "treasury of X BTC"',
  },
  {
    ticker: 'MARA',
    name: 'MARA Holdings',
    asset: 'BTC',
    secCik: '0001507605',
    secFilingPatterns: {
      // MARA uses shareholder letters, not just ex99
      eightK: [/ex99|ex-99|press|release|shareholder|letter|announce|earnings/i],
      tenQ: [/mara-.*\.htm$/i],
    },
    irPageUrl: 'https://ir.mara.com/news-events/press-releases',
    twitterHandles: ['@MAaboringscompany'],
    aggregators: {
      bitcoinTreasuries: 'marathon-digital',
      bitbo: 'marathon',
      theBlock: 'mara',
    },
    trustLevel: 'official',
    extractionHints: 'Look for "Bitcoin holdings" or "held X BTC" in shareholder letters. Note: stopped monthly updates Q3 2025.',
  },
  {
    ticker: 'RIOT',
    name: 'Riot Platforms',
    asset: 'BTC',
    secCik: '0001167419',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release/i],
    },
    irPageUrl: 'https://www.riotplatforms.com/news-media/press-releases',
    twitterHandles: ['@RiotPlatforms'],
    aggregators: {
      bitcoinTreasuries: 'riot-platforms',
      bitbo: 'riot-platforms',
      theBlock: 'riot',
    },
    trustLevel: 'official',
    extractionHints: 'Look for "Held X bitcoin" in press releases',
  },
  {
    ticker: 'CLSK',
    name: 'CleanSpark',
    asset: 'BTC',
    secCik: '0001834974',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release|update/i],
    },
    irPageUrl: 'https://investors.cleanspark.com/news/news-details',
    irPressReleasePattern: /Bitcoin Mining Update/i,
    twitterHandles: ['@CleanSpark_Inc'],
    aggregators: {
      bitcoinTreasuries: 'cleanspark',
      bitbo: 'cleanspark',
      theBlock: 'clsk',
    },
    trustLevel: 'official',
    extractionHints: 'Monthly mining updates with total BTC holdings. Look for "total of X bitcoin".',
  },
  {
    ticker: 'HUT',
    name: 'Hut 8',
    asset: 'BTC',
    secCik: '0001964789',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release/i],
    },
    irPageUrl: 'https://hut8.com/investors/news/',
    twitterHandles: ['@Haboringsmiining'],
    aggregators: {
      bitcoinTreasuries: 'hut-8-mining',
      bitbo: 'hut-8',
      theBlock: 'hut',
    },
    trustLevel: 'official',
    extractionHints: 'Look for "Strategic Bitcoin reserve of X Bitcoin"',
  },
  {
    ticker: 'CORZ',
    name: 'Core Scientific',
    asset: 'BTC',
    secCik: '0001878848',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release|results/i],
      tenQ: [/corz-.*\.htm$|iren-.*\.htm$/i], // Note: files may use old ticker
    },
    irPageUrl: 'https://investors.corescientific.com/news-events/press-releases',
    twitterHandles: ['@Core_Scientific'],
    aggregators: {
      bitcoinTreasuries: 'core-scientific',
      bitbo: 'core-scientific',
      theBlock: 'corz',
    },
    trustLevel: 'official',
    extractionHints: 'Pivoting to AI/HPC - may be reducing BTC holdings. Check 10-Q balance sheet.',
  },
  {
    ticker: 'BTDR',
    name: 'Bitdeer Technologies',
    asset: 'BTC',
    secCik: '0001899123',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release/i],
    },
    twitterHandles: ['@BitdeerOfficial'],
    aggregators: {
      bitcoinTreasuries: 'bitdeer-technologies-group',
      bitbo: 'bitdeer',
      theBlock: 'btdr',
      coingecko: 'bitdeer-technologies-group',
    },
    trustLevel: 'official',
    extractionHints: 'Check for BTC acquisition announcements',
  },
  {
    ticker: 'ASST',
    name: 'Strive (Strive + Semler)',
    asset: 'BTC',
    secCik: '0001920406',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release/i],
    },
    irPageUrl: 'https://ir.strive.com/news-events/press-releases',
    twitterHandles: ['@StriveFunds'],
    aggregators: {
      bitcoinTreasuries: 'strive-asset-management',
      theBlock: 'asst',
    },
    trustLevel: 'official',
    extractionHints: 'Merged with Semler Scientific Jan 2026. Look for "Strive now holds X bitcoin".',
  },
  {
    ticker: 'KULR',
    name: 'KULR Technology',
    asset: 'BTC',
    secCik: '0001662684',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release/i],
    },
    irPageUrl: 'https://kulr.ai/bitcoin/',
    holdingsPageUrl: 'https://kulrbitcointracker.com/', // Real-time tracker
    twitterHandles: ['@KULRTech'],
    aggregators: {
      bitcoinTreasuries: 'kulr-technology-group',
      bitbo: 'kulr',
    },
    trustLevel: 'official',
    extractionHints: 'Has dedicated Bitcoin tracker page. Look for "holds X BTC" or "expanded to X BTC".',
  },
  {
    ticker: 'DJT',
    name: 'Trump Media & Technology',
    asset: 'BTC',
    secCik: '0001849635',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release/i],
    },
    twitterHandles: ['@truthsocial'],
    aggregators: {
      bitcoinTreasuries: 'trump-media',
      theBlock: 'djt',
    },
    trustLevel: 'official',
    extractionHints: '$2B Bitcoin treasury strategy. Look for acquisition announcements.',
  },
  {
    ticker: 'NXTT',
    name: 'Next Technology Holding',
    asset: 'BTC',
    secCik: '0001831978',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release/i],
    },
    aggregators: {
      bitcoinTreasuries: 'next-technology-holding-inc',
      bitbo: 'next-technology-holdings',
      theBlock: 'nxtt',
      coingecko: 'next-technology-holding',
    },
    trustLevel: 'official',
    extractionHints: 'China-based, Nasdaq-listed. Filed $500M shelf for BTC purchases.',
  },
  {
    ticker: 'NAKA',
    name: 'Nakamoto Holdings (KindlyMD)',
    asset: 'BTC',
    secCik: '0001977303',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release/i],
    },
    holdingsPageUrl: 'https://nakamoto.com/',
    twitterHandles: ['@nakaboringo'],
    aggregators: {
      bitcoinTreasuries: 'kindlymd-inc',
    },
    trustLevel: 'official',
    extractionHints: 'Goal is 1M BTC ("one Nakamoto"). Check nakamoto.com for updates.',
  },
  {
    ticker: 'ABTC',
    name: 'American Bitcoin',
    asset: 'BTC',
    secCik: '0002068580',
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release/i],
    },
    holdingsPageUrl: 'https://www.abtc.com/',
    twitterHandles: ['@americanbtc'],
    aggregators: {
      bitcoinTreasuries: 'american-bitcoin-corp',
      theBlock: 'abtc',
    },
    trustLevel: 'official',
    extractionHints: '80% owned by Hut 8. Check for "strategic reserve" updates.',
  },
  {
    ticker: 'CEPO',
    name: 'BSTR Holdings (Bitcoin Standard Treasury)',
    asset: 'BTC',
    secCik: '0002027708', // Cantor Equity Partners SPAC
    secFilingPatterns: {
      eightK: [/ex99|ex-99|press|release|425/i], // 425 = merger communications
    },
    twitterHandles: ['@BSTRHoldings'],
    aggregators: {
      bitcoinTreasuries: 'bitcoin-standard-treasury-company',
      theBlock: 'cepo',
    },
    trustLevel: 'official',
    extractionHints: 'Led by Adam Back. ~30,000 BTC from Blockstream contribution.',
  },

  // ========== NON-US COMPANIES (NO SEC) ==========
  {
    ticker: 'XXI',
    name: 'Twenty One Capital',
    asset: 'BTC',
    // Now US-listed on NYSE, may file with SEC
    holdingsPageUrl: 'https://xxi.money/',
    // On-chain verification available
    twitterHandles: ['@twentyonecap'],
    aggregators: {
      bitcoinTreasuries: 'xxi',
      theBlock: 'cep', // Uses CEP slug
    },
    trustLevel: 'official',
    extractionHints: 'Backed by Tether/Bitfinex. On-chain proof at xxi.mempool.space.',
  },
  {
    ticker: '3350.T',
    name: 'Metaplanet',
    asset: 'BTC',
    // Tokyo Stock Exchange - no SEC filings
    holdingsPageUrl: 'https://metaplanet.jp/en/analytics',
    irPageUrl: 'https://metaplanet.jp/en/ir',
    twitterHandles: ['@Metaplanet_JP'],
    aggregators: {
      bitcoinTreasuries: 'metaplanet',
      bitbo: 'metaplanet',
      theBlock: '3350.t',
      coingecko: 'metaplanet',
    },
    trustLevel: 'official',
    extractionHints: 'Japan\'s largest BTC holder. Has analytics page with live holdings.',
  },
  {
    ticker: '0434.HK',
    name: 'Boyaa Interactive',
    asset: 'BTC',
    // Hong Kong Stock Exchange - no SEC filings
    twitterHandles: ['@BoyaaInt'],
    aggregators: {
      bitcoinTreasuries: 'boyaa-interactive-international',
      bitbo: 'boyaa',
      theBlock: '0434.hk',
    },
    trustLevel: 'aggregator',
    extractionHints: 'Hong Kong gaming company. Announces acquisitions via HKEX filings.',
  },
  {
    ticker: 'ALTBG',
    name: 'The Blockchain Group',
    asset: 'BTC',
    // Euronext Paris - no SEC filings
    irPageUrl: 'https://live.euronext.com/en/products/equities/company-news',
    twitterHandles: ['@TheBlockchainGr'],
    aggregators: {
      bitcoinTreasuries: 'the-blockchain-group',
      theBlock: 'altbg.pa',
    },
    trustLevel: 'aggregator',
    extractionHints: 'Europe\'s first BTC treasury company. Files on Euronext.',
  },
  {
    ticker: 'H100.ST',
    name: 'H100 Group',
    asset: 'BTC',
    // Nasdaq Stockholm - no SEC filings
    holdingsPageUrl: 'https://www.h100.group/',
    twitterHandles: ['@H100Group'],
    aggregators: {
      bitcoinTreasuries: 'h100-group',
    },
    trustLevel: 'aggregator',
    extractionHints: 'Sweden\'s first BTC treasury company. Nordic leader.',
  },
];

/**
 * Get source configuration for a company
 */
export function getCompanySource(ticker: string): CompanySource | undefined {
  return COMPANY_SOURCES.find(c => c.ticker === ticker);
}

/**
 * Get all companies that can be monitored via SEC EDGAR
 */
export function getSECMonitoredCompanies(): CompanySource[] {
  return COMPANY_SOURCES.filter(c => c.secCik);
}

/**
 * Get all companies that need aggregator fallback (no SEC)
 */
export function getAggregatorOnlyCompanies(): CompanySource[] {
  return COMPANY_SOURCES.filter(c => !c.secCik && c.aggregators);
}

/**
 * Get companies with direct holdings pages
 */
export function getDirectHoldingsCompanies(): CompanySource[] {
  return COMPANY_SOURCES.filter(c => c.holdingsPageUrl);
}
