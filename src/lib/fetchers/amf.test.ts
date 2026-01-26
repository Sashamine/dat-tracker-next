/**
 * Tests for AMF Fetcher
 *
 * Unit tests for parsing and API access.
 */

import { describe, it, expect } from 'vitest';
import { parseBtcHoldingsFromTitle } from './amf';

describe('AMF Fetcher', () => {
  describe('parseBtcHoldingsFromTitle', () => {
    it('should parse "total of X BTC" format', () => {
      const title = 'Capital B confirms the acquisition of 5 BTC for EUR0.4 million, the holding of a total of 2,823 BTC';
      expect(parseBtcHoldingsFromTitle(title)).toBe(2823);
    });

    it('should parse "total of X BTC" without comma', () => {
      const title = 'Company announces total of 500 BTC';
      expect(parseBtcHoldingsFromTitle(title)).toBe(500);
    });

    it('should parse "holdings to X BTC" format', () => {
      const title = 'Capital B announces the acquisition of 100 BTC bringing total holdings to 3,000 BTC';
      expect(parseBtcHoldingsFromTitle(title)).toBe(3000);
    });

    it('should parse "holding X BTC" format', () => {
      const title = 'Company now holding 1,500 BTC after latest purchase';
      expect(parseBtcHoldingsFromTitle(title)).toBe(1500);
    });

    it('should be case insensitive', () => {
      expect(parseBtcHoldingsFromTitle('TOTAL OF 100 BTC')).toBe(100);
      expect(parseBtcHoldingsFromTitle('Total of 100 btc')).toBe(100);
    });

    it('should return null for non-holdings titles', () => {
      const titles = [
        'Capital B announces new board member',
        'Quarterly financial results',
        'Company acquires 50 BTC',  // Acquisition only, no total
      ];

      for (const title of titles) {
        expect(parseBtcHoldingsFromTitle(title)).toBeNull();
      }
    });

    it('should handle large numbers with commas', () => {
      const title = 'Company reaches total of 10,000 BTC';
      expect(parseBtcHoldingsFromTitle(title)).toBe(10000);
    });
  });
});
