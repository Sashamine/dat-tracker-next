/**
 * Source Verifier Tests (Phase 7b)
 *
 * Tests for the source verification system that validates our data sources.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { verifySource, VerificationResult } from './source-verifier';

// Mock the fetchers module
vi.mock('../fetchers', () => ({
  fetchers: {
    'sec-xbrl': {
      name: 'SEC XBRL',
      fetch: vi.fn(),
    },
    'strategy-dashboard': {
      name: 'Strategy Dashboard',
      fetch: vi.fn(),
    },
  },
}));

// Mock global fetch for URL availability checks
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocks
import { fetchers } from '../fetchers';

describe('Source Verifier', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: URLs are reachable
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('verifySource', () => {
    it('should return "unverified" when no sourceUrl is provided', async () => {
      const result = await verifySource('MSTR', 'holdings', 500000);

      expect(result.status).toBe('unverified');
      expect(result.sourceUrl).toBeUndefined();
    });

    it('should return "unverified" when sourceUrl is undefined', async () => {
      const result = await verifySource('MSTR', 'holdings', 500000, undefined);

      expect(result.status).toBe('unverified');
    });

    it('should return "source_invalid" when URL returns 404', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      const result = await verifySource(
        'MSTR',
        'holdings',
        500000,
        'https://example.com/invalid',
        'company-website'
      );

      expect(result.status).toBe('source_invalid');
      expect(result.error).toContain('404');
    });

    it('should return "source_invalid" when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await verifySource(
        'MSTR',
        'holdings',
        500000,
        'https://example.com/error',
        'company-website'
      );

      expect(result.status).toBe('source_invalid');
    });

    it('should return "source_available" for non-SEC holdings URLs', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const result = await verifySource(
        'UNKNOWN',
        'holdings',
        1000,
        'https://somecompany.com/holdings',
        'company-website'
      );

      expect(result.status).toBe('source_available');
      expect(result.sourceUrl).toBe('https://somecompany.com/holdings');
    });

    describe('SEC XBRL verification', () => {
      it('should return "source_available" for SEC holdings (XBRL does not have holdings)', async () => {
        mockFetch.mockResolvedValue({ ok: true });

        const result = await verifySource(
          'MSTR',
          'holdings',
          500000,
          'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001050446&type=8-K',
          'sec-filing'
        );

        // Holdings are not in XBRL, so we just check URL availability
        expect(result.status).toBe('source_available');
      });

      it('should return "verified" when SEC shares match our value', async () => {
        const secFetcher = fetchers['sec-xbrl'];
        vi.mocked(secFetcher.fetch).mockResolvedValue([
          {
            ticker: 'MSTR',
            field: 'shares_outstanding',
            value: 200000000,
            source: { name: 'SEC XBRL', url: 'https://sec.gov/...', date: '2026-01-01' },
            fetchedAt: new Date(),
          },
        ]);

        const result = await verifySource(
          'MSTR',
          'shares_outstanding',
          200000000,
          'https://www.sec.gov/cgi-bin/browse-edgar?CIK=0001050446',
          'sec-filing'
        );

        expect(result.status).toBe('verified');
        expect(result.sourceFetchedValue).toBe(200000000);
      });

      it('should return "source_drift" when SEC shares differ at all (zero tolerance)', async () => {
        // NO TOLERANCE - any discrepancy triggers adversarial investigation
        const secFetcher = fetchers['sec-xbrl'];
        vi.mocked(secFetcher.fetch).mockResolvedValue([
          {
            ticker: 'MSTR',
            field: 'shares_outstanding',
            value: 195000000, // 2.5% lower than our 200M - still triggers drift
            source: { name: 'SEC XBRL', url: 'https://sec.gov/...', date: '2026-01-01' },
            fetchedAt: new Date(),
          },
        ]);

        const result = await verifySource(
          'MSTR',
          'shares_outstanding',
          200000000,
          'https://www.sec.gov/cgi-bin/browse-edgar?CIK=0001050446',
          'sec-filing'
        );

        // Zero tolerance: any difference = source_drift
        expect(result.status).toBe('source_drift');
        expect(result.sourceFetchedValue).toBe(195000000);
      });

      it('should return "source_drift" when SEC shares differ significantly', async () => {
        const secFetcher = fetchers['sec-xbrl'];
        vi.mocked(secFetcher.fetch).mockResolvedValue([
          {
            ticker: 'MSTR',
            field: 'shares_outstanding',
            value: 250000000, // 25% higher than our 200M
            source: { name: 'SEC XBRL', url: 'https://sec.gov/...', date: '2026-01-01' },
            fetchedAt: new Date(),
          },
        ]);

        const result = await verifySource(
          'MSTR',
          'shares_outstanding',
          200000000,
          'https://www.sec.gov/cgi-bin/browse-edgar?CIK=0001050446',
          'sec-filing'
        );

        expect(result.status).toBe('source_drift');
        expect(result.sourceFetchedValue).toBe(250000000);
        expect(result.error).toContain('differs');
      });

      it('should fall back to URL check when SEC does not have data for ticker', async () => {
        const secFetcher = fetchers['sec-xbrl'];
        vi.mocked(secFetcher.fetch).mockResolvedValue([]);
        mockFetch.mockResolvedValue({ ok: true });

        const result = await verifySource(
          'UNKNOWN',
          'shares_outstanding',
          100000,
          'https://www.sec.gov/cgi-bin/browse-edgar?CIK=0000000000',
          'sec-filing'
        );

        expect(result.status).toBe('source_available');
      });
    });

    describe('Dashboard verification', () => {
      it('should return "verified" when strategy dashboard matches', async () => {
        const strategyFetcher = fetchers['strategy-dashboard'];
        vi.mocked(strategyFetcher.fetch).mockResolvedValue([
          {
            ticker: 'MSTR',
            field: 'holdings',
            value: 500000,
            source: { name: 'Strategy Dashboard', url: 'https://strategy.com/...', date: '2026-01-01' },
            fetchedAt: new Date(),
          },
        ]);

        const result = await verifySource(
          'MSTR',
          'holdings',
          500000,
          'https://strategy.com/bitcoin',
          'company-website'
        );

        expect(result.status).toBe('verified');
        expect(result.sourceFetchedValue).toBe(500000);
      });

      it('should return "source_drift" when dashboard shows different value', async () => {
        const strategyFetcher = fetchers['strategy-dashboard'];
        vi.mocked(strategyFetcher.fetch).mockResolvedValue([
          {
            ticker: 'MSTR',
            field: 'holdings',
            value: 600000, // 20% higher
            source: { name: 'Strategy Dashboard', url: 'https://strategy.com/...', date: '2026-01-01' },
            fetchedAt: new Date(),
          },
        ]);

        const result = await verifySource(
          'MSTR',
          'holdings',
          500000,
          'https://strategy.com/bitcoin',
          'company-website'
        );

        expect(result.status).toBe('source_drift');
        expect(result.error).toContain('differs');
      });

      it('should handle fetcher errors gracefully', async () => {
        const strategyFetcher = fetchers['strategy-dashboard'];
        vi.mocked(strategyFetcher.fetch).mockRejectedValue(new Error('API error'));
        mockFetch.mockResolvedValue({ ok: true });

        const result = await verifySource(
          'MSTR',
          'holdings',
          500000,
          'https://strategy.com/bitcoin',
          'company-website'
        );

        // Falls back to URL availability check
        expect(result.status).toBe('source_available');
        expect(result.error).toContain('Fetcher error');
      });
    });
  });
});
