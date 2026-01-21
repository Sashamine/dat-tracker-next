/**
 * mNAV Fetcher Tests
 *
 * Tests the mNAV.com API fetcher for:
 * - Successful data extraction
 * - Error handling
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mnavFetcher, getSupportedTickers } from './mnav';

// Mock fetch will be created fresh in each test
let mockFetch: ReturnType<typeof vi.fn>;

// Mock API response matching real mNAV structure
const mockMnavResponse = {
  company: {
    name: 'Strategy',
    ticker: 'MSTR',
    currency: 'USD',
  },
  latest: {
    btcHeld: 500000,
    btcPrice: 100000,
    sharePrice: 350,
    marketCap: 80000000000,
    enterpriseValue: 85000000000,
    mnav: 1.7,
    issuedShares: 200000000,
    fullyDilutedShares: 250000000,
    totalDebt: 4000000000,
    totalCash: 500000000,
    totalPreferredStock: 0,
  },
  preparedAt: '2026-01-21T12:00:00Z',
};

describe('mnavFetcher', () => {
  beforeEach(() => {
    // Create fresh mock for each test
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('fetch - successful responses', () => {
    it('should fetch holdings for a known ticker', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMnavResponse,
      } as Response);

      const results = await mnavFetcher.fetch(['MSTR']);

      // Should have called fetch with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://www.mnav.com/api/companies/strategy/prepared-chart-data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );

      // Should return holdings result
      const holdingsResult = results.find(r => r.field === 'holdings');
      expect(holdingsResult).toBeDefined();
      expect(holdingsResult?.value).toBe(500000);
      expect(holdingsResult?.ticker).toBe('MSTR');
      expect(holdingsResult?.source.name).toBe('mNAV.com');
      expect(holdingsResult?.source.date).toBe('2026-01-21');
    });

    it('should extract all available fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMnavResponse,
      } as Response);

      const results = await mnavFetcher.fetch(['MSTR']);

      // Should have holdings, shares, debt, cash (no preferred since it's 0)
      expect(results).toHaveLength(4);

      const fields = results.map(r => r.field);
      expect(fields).toContain('holdings');
      expect(fields).toContain('shares_outstanding');
      expect(fields).toContain('debt');
      expect(fields).toContain('cash');
      expect(fields).not.toContain('preferred_equity'); // 0 value, should be skipped
    });

    it('should include preferred_equity when non-zero', async () => {
      const responseWithPreferred = {
        ...mockMnavResponse,
        latest: {
          ...mockMnavResponse.latest,
          totalPreferredStock: 1000000000,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithPreferred,
      } as Response);

      const results = await mnavFetcher.fetch(['MSTR']);

      const preferredResult = results.find(r => r.field === 'preferred_equity');
      expect(preferredResult).toBeDefined();
      expect(preferredResult?.value).toBe(1000000000);
    });

    it('should fetch multiple tickers sequentially', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMnavResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            ...mockMnavResponse,
            company: { name: 'MARA', ticker: 'MARA', currency: 'USD' },
            latest: { ...mockMnavResponse.latest, btcHeld: 44000 },
          }),
        } as Response);

      const results = await mnavFetcher.fetch(['MSTR', 'MARA']);

      // Should have results for both tickers
      const mstrHoldings = results.find(r => r.ticker === 'MSTR' && r.field === 'holdings');
      const maraHoldings = results.find(r => r.ticker === 'MARA' && r.field === 'holdings');

      expect(mstrHoldings?.value).toBe(500000);
      expect(maraHoldings?.value).toBe(44000);
    });
  });

  describe('fetch - error handling', () => {
    it('should skip unknown tickers', async () => {
      const results = await mnavFetcher.fetch(['UNKNOWN_TICKER']);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(results).toHaveLength(0);
    });

    it('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response);

      const results = await mnavFetcher.fetch(['MSTR']);

      expect(results).toHaveLength(0);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const results = await mnavFetcher.fetch(['MSTR']);

      expect(results).toHaveLength(0);
    });

    it('should handle malformed API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ company: {}, latest: null }),
      } as Response);

      const results = await mnavFetcher.fetch(['MSTR']);

      expect(results).toHaveLength(0);
    });

    it('should continue fetching other tickers after one fails', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error')) // MSTR fails
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockMnavResponse,
        } as Response); // MARA succeeds

      const results = await mnavFetcher.fetch(['MSTR', 'MARA']);

      // Should only have MARA results (MSTR failed)
      expect(results.every(r => r.ticker === 'MARA')).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('fetch - data validation', () => {
    it('should use preparedAt date for source date', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMnavResponse,
      } as Response);

      const results = await mnavFetcher.fetch(['MSTR']);

      expect(results[0].source.date).toBe('2026-01-21');
    });

    it('should fallback to current date if preparedAt is missing', async () => {
      const responseWithoutDate = {
        ...mockMnavResponse,
        preparedAt: undefined,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithoutDate,
      } as Response);

      const results = await mnavFetcher.fetch(['MSTR']);

      // Should use today's date
      const today = new Date().toISOString().split('T')[0];
      expect(results[0].source.date).toBe(today);
    });

    it('should include raw data for debugging', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockMnavResponse,
      } as Response);

      const results = await mnavFetcher.fetch(['MSTR']);

      expect(results[0].raw).toEqual(mockMnavResponse.latest);
    });
  });

  describe('getSupportedTickers', () => {
    it('should return all supported tickers', () => {
      const tickers = getSupportedTickers();

      expect(tickers).toContain('MSTR');
      expect(tickers).toContain('MARA');
      expect(tickers).toContain('RIOT');
      expect(Array.isArray(tickers)).toBe(true);
    });

    it('should not include disabled tickers', () => {
      const tickers = getSupportedTickers();

      // XXI is commented out in the source
      expect(tickers).not.toContain('XXI');
    });
  });

  describe('fetcher metadata', () => {
    it('should have correct name', () => {
      expect(mnavFetcher.name).toBe('mNAV.com');
    });
  });
});
