/**
 * Strategy.com Dashboard Fetcher Tests (MSTR)
 *
 * Tests the official Strategy.com API fetcher for:
 * - Holdings extraction from bitcoinKpis endpoint
 * - Debt and preferred equity extraction
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { strategyFetcher, getSupportedTickers } from './strategy';

let mockFetch: ReturnType<typeof vi.fn>;

// Mock API response matching real Strategy.com structure
const mockBitcoinKpisResponse = {
  timestamp: '2026-01-21T12:00:00Z',
  results: {
    latestPrice: 105000,
    prevDayPrice: 104500,
    btcHoldings: '709,715',
    btcNav: '74520.075',
    btcNavNumber: 74520.075,
    debtByBN: 10,      // $10 billion
    prefByBN: 13,      // $13 billion
    debtPrefByBN: 30.9,
  },
};

const mockMstrKpiDataResponse = {
  price: '158.52',
  marketCap: '52,338',
  enterpriseValue: '66,692',
  volume: '12345678',
  fdShares: '330000000',
  timestamp: '2026-01-21T12:00:00Z',
};

describe('strategyFetcher', () => {
  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('fetch - successful responses', () => {
    it('should fetch holdings from bitcoinKpis endpoint', async () => {
      // Mock both API calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBitcoinKpisResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMstrKpiDataResponse,
        } as Response);

      const results = await strategyFetcher.fetch(['MSTR']);

      // Should have called fetch with correct URLs
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.strategy.com/btc/bitcoinKpis',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );

      // Should return holdings result
      const holdingsResult = results.find(r => r.field === 'holdings');
      expect(holdingsResult).toBeDefined();
      expect(holdingsResult?.value).toBe(709715); // Parsed from "709,715"
      expect(holdingsResult?.ticker).toBe('MSTR');
      expect(holdingsResult?.source.name).toBe('strategy.com');
    });

    it('should extract debt in dollars (converted from billions)', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBitcoinKpisResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMstrKpiDataResponse,
        } as Response);

      const results = await strategyFetcher.fetch(['MSTR']);

      const debtResult = results.find(r => r.field === 'debt');
      expect(debtResult).toBeDefined();
      expect(debtResult?.value).toBe(10_000_000_000); // 10 billion dollars
    });

    it('should extract preferred equity in dollars', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBitcoinKpisResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMstrKpiDataResponse,
        } as Response);

      const results = await strategyFetcher.fetch(['MSTR']);

      const preferredResult = results.find(r => r.field === 'preferred_equity');
      expect(preferredResult).toBeDefined();
      expect(preferredResult?.value).toBe(13_000_000_000); // 13 billion dollars
    });

    it('should return all extracted fields', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockBitcoinKpisResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMstrKpiDataResponse,
        } as Response);

      const results = await strategyFetcher.fetch(['MSTR']);

      // Should have holdings, debt, and preferred_equity
      expect(results).toHaveLength(3);
      expect(results.map(r => r.field)).toContain('holdings');
      expect(results.map(r => r.field)).toContain('debt');
      expect(results.map(r => r.field)).toContain('preferred_equity');
    });
  });

  describe('fetch - error handling', () => {
    it('should return empty array for non-MSTR tickers', async () => {
      const results = await strategyFetcher.fetch(['RIOT', 'MARA']);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(results).toHaveLength(0);
    });

    it('should handle HTTP errors gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response);

      const results = await strategyFetcher.fetch(['MSTR']);

      expect(results).toHaveLength(0);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'));

      const results = await strategyFetcher.fetch(['MSTR']);

      expect(results).toHaveLength(0);
    });

    it('should handle partial API failure (one endpoint fails)', async () => {
      // bitcoinKpis fails but mstrKpiData succeeds (though we only use btcKpis data)
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMstrKpiDataResponse,
        } as Response);

      const results = await strategyFetcher.fetch(['MSTR']);

      // No holdings since bitcoinKpis failed
      expect(results).toHaveLength(0);
    });

    it('should handle malformed btcHoldings string', async () => {
      const malformedResponse = {
        ...mockBitcoinKpisResponse,
        results: {
          ...mockBitcoinKpisResponse.results,
          btcHoldings: 'invalid', // Not a number
        },
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => malformedResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMstrKpiDataResponse,
        } as Response);

      const results = await strategyFetcher.fetch(['MSTR']);

      // Should still get debt and preferred, but not holdings
      const holdingsResult = results.find(r => r.field === 'holdings');
      expect(holdingsResult).toBeUndefined();
    });

    it('should handle missing results object', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ timestamp: '2026-01-21T12:00:00Z' }),
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMstrKpiDataResponse,
        } as Response);

      const results = await strategyFetcher.fetch(['MSTR']);

      expect(results).toHaveLength(0);
    });
  });

  describe('getSupportedTickers', () => {
    it('should return only MSTR', () => {
      const tickers = getSupportedTickers();

      expect(tickers).toEqual(['MSTR']);
    });
  });

  describe('fetcher metadata', () => {
    it('should have correct name', () => {
      expect(strategyFetcher.name).toBe('strategy.com');
    });
  });
});
