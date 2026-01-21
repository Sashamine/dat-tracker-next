/**
 * SEC XBRL Fetcher Tests
 *
 * Tests the SEC EDGAR XBRL API fetcher for:
 * - Balance sheet data extraction (shares, debt, cash, preferred)
 * - Multiple ticker support via CIK mappings
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { secXbrlFetcher, getSupportedTickers } from './sec-xbrl';

let mockFetch: ReturnType<typeof vi.fn>;

// Mock XBRL company facts response
const mockXbrlResponse = {
  entityName: 'Strategy Inc',
  cik: '0001050446',
  facts: {
    'us-gaap': {
      CommonStockSharesOutstanding: {
        units: {
          shares: [
            { val: 180000000, end: '2025-09-30', form: '10-Q', filed: '2025-11-01', fy: 2025, fp: 'Q3' },
            { val: 175000000, end: '2025-06-30', form: '10-Q', filed: '2025-08-01', fy: 2025, fp: 'Q2' },
          ],
        },
      },
      LongTermDebt: {
        units: {
          USD: [
            { val: 8000000000, end: '2025-09-30', form: '10-Q', filed: '2025-11-01', fy: 2025, fp: 'Q3' },
            { val: 7500000000, end: '2025-06-30', form: '10-Q', filed: '2025-08-01', fy: 2025, fp: 'Q2' },
          ],
        },
      },
      CashAndCashEquivalentsAtCarryingValue: {
        units: {
          USD: [
            { val: 500000000, end: '2025-09-30', form: '10-Q', filed: '2025-11-01', fy: 2025, fp: 'Q3' },
          ],
        },
      },
      TemporaryEquityCarryingAmountAttributableToParent: {
        units: {
          USD: [
            { val: 13000000000, end: '2025-09-30', form: '10-Q', filed: '2025-11-01', fy: 2025, fp: 'Q3' },
          ],
        },
      },
    },
    'dei': {
      EntityCommonStockSharesOutstanding: {
        units: {
          shares: [
            { val: 181000000, end: '2025-09-30', form: '10-Q', filed: '2025-11-01' },
          ],
        },
      },
    },
  },
};

describe('secXbrlFetcher', () => {
  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('fetch - successful responses', () => {
    it('should fetch balance sheet data for a known ticker', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockXbrlResponse,
      } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR']);

      // Should have called fetch with correct URL
      expect(global.fetch).toHaveBeenCalledWith(
        'https://data.sec.gov/api/xbrl/companyfacts/CIK0001050446.json',
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.any(String),
            'Accept': 'application/json',
          }),
        })
      );

      // Should return shares, debt, cash, preferred_equity (but NOT holdings)
      const fields = results.map(r => r.field);
      expect(fields).toContain('shares_outstanding');
      expect(fields).toContain('debt');
      expect(fields).toContain('cash');
      expect(fields).toContain('preferred_equity');
      expect(fields).not.toContain('holdings'); // XBRL doesn't have holdings
    });

    it('should extract shares outstanding from us-gaap', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockXbrlResponse,
      } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR']);

      const sharesResult = results.find(r => r.field === 'shares_outstanding');
      expect(sharesResult).toBeDefined();
      expect(sharesResult?.value).toBe(180000000);
      expect(sharesResult?.source.date).toBe('2025-09-30');
    });

    it('should extract debt from LongTermDebt', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockXbrlResponse,
      } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR']);

      const debtResult = results.find(r => r.field === 'debt');
      expect(debtResult).toBeDefined();
      expect(debtResult?.value).toBe(8000000000);
    });

    it('should extract cash', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockXbrlResponse,
      } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR']);

      const cashResult = results.find(r => r.field === 'cash');
      expect(cashResult).toBeDefined();
      expect(cashResult?.value).toBe(500000000);
    });

    it('should extract preferred equity from TemporaryEquity', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockXbrlResponse,
      } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR']);

      const preferredResult = results.find(r => r.field === 'preferred_equity');
      expect(preferredResult).toBeDefined();
      expect(preferredResult?.value).toBe(13000000000);
    });

    it('should use most recent 10-Q/10-K data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockXbrlResponse,
      } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR']);

      // Should use Q3 2025 data, not Q2
      const debtResult = results.find(r => r.field === 'debt');
      expect(debtResult?.source.date).toBe('2025-09-30');
      expect((debtResult?.raw as { form: string }).form).toBe('10-Q');
    });

    it('should include source metadata', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockXbrlResponse,
      } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR']);

      const sharesResult = results.find(r => r.field === 'shares_outstanding');
      expect(sharesResult?.source.name).toBe('SEC 10-Q');
      expect(sharesResult?.source.url).toContain('CIK=0001050446');
      expect((sharesResult?.raw as { filedDate: string }).filedDate).toBe('2025-11-01');
    });
  });

  describe('fetch - multiple tickers', () => {
    it('should fetch data for multiple tickers', async () => {
      const riotResponse = {
        ...mockXbrlResponse,
        entityName: 'Riot Platforms',
        cik: '0001167419',
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockXbrlResponse,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => riotResponse,
        } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR', 'RIOT']);

      // Should have results for both tickers
      const mstrResults = results.filter(r => r.ticker === 'MSTR');
      const riotResults = results.filter(r => r.ticker === 'RIOT');

      expect(mstrResults.length).toBeGreaterThan(0);
      expect(riotResults.length).toBeGreaterThan(0);
    });

    it('should continue fetching after one ticker fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockXbrlResponse,
        } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR', 'RIOT']);

      // Should still have results from successful ticker
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('fetch - error handling', () => {
    it('should skip tickers without CIK mapping', async () => {
      const results = await secXbrlFetcher.fetch(['UNKNOWN_TICKER']);

      expect(global.fetch).not.toHaveBeenCalled();
      expect(results).toHaveLength(0);
    });

    it('should handle HTTP errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR']);

      expect(results).toHaveLength(0);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const results = await secXbrlFetcher.fetch(['MSTR']);

      expect(results).toHaveLength(0);
    });

    it('should handle missing facts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entityName: 'Test', cik: '123' }),
      } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR']);

      expect(results).toHaveLength(0);
    });

    it('should skip fields with zero values', async () => {
      const responseWithZero = {
        ...mockXbrlResponse,
        facts: {
          'us-gaap': {
            CommonStockSharesOutstanding: {
              units: {
                shares: [
                  { val: 0, end: '2025-09-30', form: '10-Q', filed: '2025-11-01' },
                ],
              },
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithZero,
      } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR']);

      const sharesResult = results.find(r => r.field === 'shares_outstanding');
      expect(sharesResult).toBeUndefined();
    });

    it('should filter out non-quarterly forms', async () => {
      const responseWith8K = {
        ...mockXbrlResponse,
        facts: {
          'us-gaap': {
            LongTermDebt: {
              units: {
                USD: [
                  { val: 9000000000, end: '2025-10-15', form: '8-K', filed: '2025-10-16' }, // Should be ignored
                  { val: 8000000000, end: '2025-09-30', form: '10-Q', filed: '2025-11-01' },
                ],
              },
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWith8K,
      } as Response);

      const results = await secXbrlFetcher.fetch(['MSTR']);

      const debtResult = results.find(r => r.field === 'debt');
      expect(debtResult?.value).toBe(8000000000); // Should use 10-Q value
      expect((debtResult?.raw as { form: string }).form).toBe('10-Q');
    });
  });

  describe('getSupportedTickers', () => {
    it('should return all tickers with CIK mappings', () => {
      const tickers = getSupportedTickers();

      expect(tickers).toContain('MSTR');
      expect(tickers).toContain('MARA');
      expect(tickers).toContain('RIOT');
      expect(tickers).toContain('SBET');
      expect(Array.isArray(tickers)).toBe(true);
      expect(tickers.length).toBeGreaterThan(10);
    });
  });

  describe('fetcher metadata', () => {
    it('should have correct name', () => {
      expect(secXbrlFetcher.name).toBe('SEC XBRL');
    });
  });
});
