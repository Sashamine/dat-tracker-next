/**
 * Tests for deterministic holdings regex extractor
 */

import { describe, it, expect } from 'vitest';
import { extractHoldingsRegex, getBestResult } from './holdings-regex-extractor';

describe('Holdings Regex Extractor', () => {
  describe('total holdings patterns', () => {
    it('should extract "holds X Bitcoin"', () => {
      const text = 'The Company currently holds approximately 712,647 Bitcoin.';
      const results = extractHoldingsRegex(text, 'BTC');
      const best = getBestResult(results, 'BTC');
      expect(best).not.toBeNull();
      expect(best!.holdings).toBe(712_647);
      expect(best!.asset).toBe('BTC');
      expect(best!.type).toBe('total');
    });

    it('should extract "total of X BTC"', () => {
      const text = 'bringing our total to approximately 50,631 BTC held in treasury.';
      const results = extractHoldingsRegex(text, 'BTC');
      const best = getBestResult(results, 'BTC');
      expect(best).not.toBeNull();
      expect(best!.holdings).toBe(50_631);
      expect(best!.asset).toBe('BTC');
    });

    it('should extract "aggregate holdings of X Dogecoin"', () => {
      const text = 'The Company has aggregate holdings of approximately 663,060,893 Dogecoin.';
      const results = extractHoldingsRegex(text, 'DOGE');
      const best = getBestResult(results, 'DOGE');
      expect(best).not.toBeNull();
      expect(best!.holdings).toBe(663_060_893);
      expect(best!.asset).toBe('DOGE');
    });

    it('should extract "X ETH in its treasury"', () => {
      const text = 'Brinker holds approximately 4,203 ETH in its treasury as a reserve asset.';
      const results = extractHoldingsRegex(text, 'ETH');
      const best = getBestResult(results, 'ETH');
      expect(best).not.toBeNull();
      expect(best!.holdings).toBe(4_203);
    });

    it('should extract "currently owns X Bitcoin"', () => {
      const text = 'Strategy currently owns 528,185 Bitcoin acquired for approximately $35.6 billion.';
      const results = extractHoldingsRegex(text, 'BTC');
      const best = getBestResult(results, 'BTC');
      expect(best).not.toBeNull();
      expect(best!.holdings).toBe(528_185);
    });

    it('should extract "Bitcoin holdings of X"', () => {
      const text = 'The Company reported Bitcoin holdings of 1,220 as of March 1, 2026.';
      const results = extractHoldingsRegex(text, 'BTC');
      const best = getBestResult(results, 'BTC');
      expect(best).not.toBeNull();
      expect(best!.holdings).toBe(1_220);
    });

    it('should extract holdings with "million" suffix', () => {
      const text = 'TRX treasury of approximately 677 million TRX.';
      const results = extractHoldingsRegex(text, 'TRX');
      const best = getBestResult(results, 'TRX');
      expect(best).not.toBeNull();
      expect(best!.holdings).toBe(677_000_000);
    });
  });

  describe('purchase patterns', () => {
    it('should extract "acquired X BTC for $Y"', () => {
      const text = 'The Company acquired 7,390 BTC for approximately $764.9 million in cash.';
      const results = extractHoldingsRegex(text, 'BTC');
      const purchases = results.filter(r => r.type === 'purchase');
      expect(purchases.length).toBeGreaterThanOrEqual(1);
      expect(purchases[0].transactionAmount).toBe(7_390);
      expect(purchases[0].costUsd).toBe(764_900_000);
    });

    it('should extract "purchased approximately X Bitcoin"', () => {
      const text = 'We purchased approximately 1,000 Bitcoin during the quarter.';
      const results = extractHoldingsRegex(text, 'BTC');
      const purchases = results.filter(r => r.type === 'purchase');
      expect(purchases.length).toBeGreaterThanOrEqual(1);
      expect(purchases[0].transactionAmount).toBe(1_000);
    });

    it('should extract "acquired an additional X ETH"', () => {
      const text = 'Brinker acquired an additional 500 ETH for $1.3 million.';
      const results = extractHoldingsRegex(text, 'ETH');
      const purchases = results.filter(r => r.type === 'purchase');
      expect(purchases.length).toBeGreaterThanOrEqual(1);
      expect(purchases[0].transactionAmount).toBe(500);
      expect(purchases[0].costUsd).toBe(1_300_000);
    });
  });

  describe('sale patterns', () => {
    it('should extract "sold X Bitcoin"', () => {
      const text = 'The Company sold approximately 2,000 Bitcoin during the period.';
      const results = extractHoldingsRegex(text, 'BTC');
      const sales = results.filter(r => r.type === 'sale');
      expect(sales.length).toBeGreaterThanOrEqual(1);
      expect(sales[0].transactionAmount).toBe(2_000);
    });
  });

  describe('date extraction', () => {
    it('should extract as-of date from nearby text', () => {
      const text = 'As of March 10, 2026, the Company holds approximately 712,647 Bitcoin.';
      const results = extractHoldingsRegex(text, 'BTC');
      const best = getBestResult(results, 'BTC');
      expect(best).not.toBeNull();
      expect(best!.asOfDate).toBe('2026-03-10');
    });

    it('should extract ISO date', () => {
      const text = 'Holdings as of 2026-01-15: holds 50,000 BTC in treasury.';
      const results = extractHoldingsRegex(text, 'BTC');
      const best = getBestResult(results, 'BTC');
      expect(best?.asOfDate).toBe('2026-01-15');
    });
  });

  describe('asset filtering', () => {
    it('should filter to expected asset', () => {
      const text = 'The Company holds 100 Bitcoin. It also holds 5,000 Ethereum.';
      const btcResults = extractHoldingsRegex(text, 'BTC');
      const btcBest = getBestResult(btcResults, 'BTC');
      expect(btcBest?.holdings).toBe(100);
      expect(btcBest?.asset).toBe('BTC');

      const ethResults = extractHoldingsRegex(text, 'ETH');
      const ethBest = getBestResult(ethResults, 'ETH');
      expect(ethBest?.holdings).toBe(5_000);
      expect(ethBest?.asset).toBe('ETH');
    });

    it('should return all assets when no filter', () => {
      const text = 'The Company holds 100 Bitcoin. It also holds 5,000 Ethereum.';
      const results = extractHoldingsRegex(text);
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('shares extraction', () => {
    it('should extract shares outstanding from nearby context', () => {
      const text = 'The Company holds approximately 712,647 Bitcoin. As of the date of this filing, 331,700,000 shares of common stock outstanding.';
      const results = extractHoldingsRegex(text, 'BTC');
      const best = getBestResult(results, 'BTC');
      expect(best).not.toBeNull();
      expect(best!.sharesOutstanding).toBe(331_700_000);
    });
  });

  describe('confidence and deduplication', () => {
    it('should prefer total over purchase', () => {
      const text = 'The Company acquired 7,390 BTC. It now holds 528,185 Bitcoin in total.';
      const results = extractHoldingsRegex(text, 'BTC');
      const best = getBestResult(results, 'BTC');
      expect(best!.holdings).toBe(528_185);
      expect(best!.type).toBe('total');
    });

    it('should deduplicate same number from multiple patterns', () => {
      const text = 'The Company currently holds approximately 712,647 Bitcoin, with total Bitcoin holdings of 712,647.';
      const results = extractHoldingsRegex(text, 'BTC');
      // Should deduplicate to 1 result for 712,647
      const totalResults = results.filter(r => r.type === 'total' && r.holdings === 712_647);
      expect(totalResults.length).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should return empty for irrelevant text', () => {
      const text = 'The Board of Directors appointed John Smith as Chief Executive Officer effective immediately.';
      const results = extractHoldingsRegex(text, 'BTC');
      expect(results.length).toBe(0);
    });

    it('should handle HTML entities', () => {
      const text = 'The Company holds approximately 1,000&nbsp;Bitcoin valued at $100&nbsp;million.';
      const results = extractHoldingsRegex(text, 'BTC');
      const best = getBestResult(results, 'BTC');
      expect(best?.holdings).toBe(1_000);
    });

    it('should handle "more than X" language', () => {
      const text = 'TRON now holds more than 677 million TRX in total holdings.';
      const results = extractHoldingsRegex(text, 'TRX');
      const best = getBestResult(results, 'TRX');
      expect(best).not.toBeNull();
      expect(best!.holdings).toBe(677_000_000);
    });
  });
});
