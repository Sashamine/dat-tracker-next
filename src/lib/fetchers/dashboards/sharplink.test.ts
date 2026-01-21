/**
 * SharpLink Dashboard Fetcher Tests (SBET)
 *
 * Tests the official SharpLink API fetcher for:
 * - ETH holdings extraction from impact3-data endpoint
 * - Date parsing
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sharplinkFetcher, getSupportedTickers } from './sharplink';

let mockFetch: ReturnType<typeof vi.fn>;

// Mock API response matching real SharpLink structure
const mockImpact3Response = {
  total_eth_holdings: [
    {
      row_number: 1,
      Date: 'January 15, 2026',
      'Total ETH Holdings': 42500.5,
    },
    {
      row_number: 2,
      Date: 'January 18, 2026',
      'Total ETH Holdings': 42800.75,
    },
  ],
  staking_rewards: [
    { Date: 'January 18, 2026', 'Staking Rewards (ETH)': 150.25 },
  ],
  eth_nav: [
    { Date: 'January 18, 2026', 'ETH NAV': 1.25 },
  ],
};

describe('sharplinkFetcher', () => {
  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('fetch - successful responses', () => {
    it('should fetch ETH holdings from impact3-data endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpact3Response,
      } as Response);

      const results = await sharplinkFetcher.fetch(['SBET']);

      // Should have called fetch with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://sharplink-dashboard.vercel.app/api/impact3-data',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Accept': 'application/json',
          }),
        })
      );

      // Should return holdings result
      const holdingsResult = results.find(r => r.field === 'holdings');
      expect(holdingsResult).toBeDefined();
      expect(holdingsResult?.value).toBe(42800.75); // Latest data point
      expect(holdingsResult?.ticker).toBe('SBET');
      expect(holdingsResult?.source.name).toBe('sharplink.com');
    });

    it('should use the most recent data point', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpact3Response,
      } as Response);

      const results = await sharplinkFetcher.fetch(['SBET']);

      // Should use the last item in the array (most recent)
      expect(results[0].value).toBe(42800.75);
      expect(results[0].source.date).toBe('2026-01-18');
    });

    it('should parse date string correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpact3Response,
      } as Response);

      const results = await sharplinkFetcher.fetch(['SBET']);

      // "January 18, 2026" should become "2026-01-18"
      expect(results[0].source.date).toBe('2026-01-18');
    });

    it('should include raw data for debugging', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockImpact3Response,
      } as Response);

      const results = await sharplinkFetcher.fetch(['SBET']);

      expect(results[0].raw).toEqual(mockImpact3Response.total_eth_holdings[1]);
    });
  });

  describe('fetch - error handling', () => {
    it('should return empty array for non-SBET tickers', async () => {
      const results = await sharplinkFetcher.fetch(['MSTR', 'RIOT']);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(results).toHaveLength(0);
    });

    it('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const results = await sharplinkFetcher.fetch(['SBET']);

      expect(results).toHaveLength(0);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const results = await sharplinkFetcher.fetch(['SBET']);

      expect(results).toHaveLength(0);
    });

    it('should handle empty holdings array', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ total_eth_holdings: [] }),
      } as Response);

      const results = await sharplinkFetcher.fetch(['SBET']);

      expect(results).toHaveLength(0);
    });

    it('should handle missing total_eth_holdings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ staking_rewards: [] }),
      } as Response);

      const results = await sharplinkFetcher.fetch(['SBET']);

      expect(results).toHaveLength(0);
    });

    it('should handle single data point', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          total_eth_holdings: [
            {
              row_number: 1,
              Date: 'January 20, 2026',
              'Total ETH Holdings': 43000,
            },
          ],
        }),
      } as Response);

      const results = await sharplinkFetcher.fetch(['SBET']);

      expect(results).toHaveLength(1);
      expect(results[0].value).toBe(43000);
    });
  });

  describe('getSupportedTickers', () => {
    it('should return only SBET', () => {
      const tickers = getSupportedTickers();

      expect(tickers).toEqual(['SBET']);
    });
  });

  describe('fetcher metadata', () => {
    it('should have correct name', () => {
      expect(sharplinkFetcher.name).toBe('sharplink.com');
    });
  });
});
