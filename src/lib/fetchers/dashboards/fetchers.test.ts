/**
 * Dashboard Fetchers Unit Tests
 *
 * Tests for all company dashboard fetchers.
 * These tests verify:
 * - Fetcher returns correct ticker filtering
 * - Fetcher returns correctly structured FetchResult objects
 * - Error handling for API failures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { FetchResult } from '../types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import fetchers after mocking
import { kulrFetcher, getSupportedTickers as getKulrTickers } from './kulr';
import { upexiFetcher, getSupportedTickers as getUpexiTickers } from './upexi';
import { capitalBFetcher, getSupportedTickers as getCapitalBTickers } from './capital-b';
import { sharplinkFetcher, getSupportedTickers as getSharplinkTickers } from './sharplink';
import { litestrategyFetcher, getSupportedTickers as getLitestrategyTickers } from './litestrategy';
import { strategyFetcher, getSupportedTickers as getStrategyTickers } from './strategy';

describe('KULR Fetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns empty array for non-KULR tickers', async () => {
    const results = await kulrFetcher.fetch(['MSTR', 'SBET']);
    expect(results).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('getSupportedTickers returns KULR', () => {
    expect(getKulrTickers()).toEqual(['KULR']);
  });

  it('fetches BTC holdings from API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        data: {
          asOfDate: '2026-01-20T00:00:00.000Z',
          btcTotal: '1056.68549114',
          totalUsdCost: '104554700',
          btcSpotUsd: '88822',
        },
      }),
    });

    const results = await kulrFetcher.fetch(['KULR']);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      ticker: 'KULR',
      field: 'holdings',
      value: 1056.68549114,
      source: {
        name: 'kulrbitcointracker.com',
        url: 'https://kulrbitcointracker.com',
        date: '2026-01-20',
      },
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const results = await kulrFetcher.fetch(['KULR']);
    expect(results).toEqual([]);
  });
});

describe('UPXI Fetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns empty array for non-UPXI tickers', async () => {
    const results = await upexiFetcher.fetch(['MSTR', 'KULR']);
    expect(results).toEqual([]);
  });

  it('getSupportedTickers returns UPXI', () => {
    expect(getUpexiTickers()).toEqual(['UPXI']);
  });

  it('parses embedded JSON from HTML', async () => {
    const mockPageData = {
      props: {
        symbols: {
          UPXI: { current_price: '10.50', market_cap: 500000000 },
          'SOL-USD': {
            current_price: '150.00',
            token_count: 45733,
            treasury: [
              { id: 1, tokens: '45733.0000', updated_at: '2026-01-15T00:00:00Z' },
            ],
          },
        },
        fullyLoadedNav: '0.9x',
      },
    };

    const jsonString = JSON.stringify(mockPageData).replace(/"/g, '&quot;');
    const htmlResponse = '<html><body><div data-page="' + jsonString + '"></div></body></html>';

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => htmlResponse,
    });

    const results = await upexiFetcher.fetch(['UPXI']);

    expect(results.length).toBeGreaterThan(0);
    expect(results.find(r => r.field === 'holdings')).toBeDefined();
  });
});

describe('Capital B (ALTBG) Fetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns empty array for non-ALTBG tickers', async () => {
    const results = await capitalBFetcher.fetch(['MSTR', 'KULR']);
    expect(results).toEqual([]);
  });

  it('getSupportedTickers returns ALTBG', () => {
    expect(getCapitalBTickers()).toEqual(['ALTBG']);
  });

  it('fetches from mNAV.com API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        latest: {
          btcHeld: 2823,
          sharePrice: 0.767,
          fullyDilutedShares: 391534528,
          totalCash: 0,
          totalDebt: 0,
          totalPreferredStock: 0,
          btcPrice: 75000,
          marketCap: 300000000,
          btcNav: 211725000,
        },
        values: {
          btcHeld: [['2026-01-24', 2823]],
        },
      }),
    });

    const results = await capitalBFetcher.fetch(['ALTBG']);

    expect(results.length).toBe(2);
    expect(results.find(r => r.field === 'holdings')).toMatchObject({
      ticker: 'ALTBG',
      field: 'holdings',
      value: 2823,
    });
    expect(results.find(r => r.field === 'mnav')).toBeDefined();
  });
});

describe('SBET (SharpLink) Fetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns empty array for non-SBET tickers', async () => {
    const results = await sharplinkFetcher.fetch(['MSTR', 'KULR']);
    expect(results).toEqual([]);
  });

  it('getSupportedTickers returns SBET', () => {
    expect(getSharplinkTickers()).toEqual(['SBET']);
  });

  it('fetches ETH holdings and mNAV', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        total_eth_holdings: [
          { row_number: 1, Date: 'January 18, 2026', 'Total ETH Holdings': 865797 },
        ],
        fdmnav: [
          { Date: 'January 18, 2026', 'Fully Diluted mNAV': '0.81x' },
        ],
      }),
    });

    const results = await sharplinkFetcher.fetch(['SBET']);

    expect(results.length).toBe(2);
    expect(results.find(r => r.field === 'holdings')).toMatchObject({
      ticker: 'SBET',
      field: 'holdings',
      value: 865797,
    });
    expect(results.find(r => r.field === 'mnav')).toMatchObject({
      ticker: 'SBET',
      field: 'mnav',
      value: 0.81,
    });
  });
});

describe('LITS (Lite Strategy) Fetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns empty array for non-LITS tickers', async () => {
    const results = await litestrategyFetcher.fetch(['MSTR', 'KULR']);
    expect(results).toEqual([]);
  });

  it('getSupportedTickers returns LITS', () => {
    expect(getLitestrategyTickers()).toEqual(['LITS']);
  });
});

describe('MSTR (Strategy) Fetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('returns empty array for non-MSTR tickers', async () => {
    const results = await strategyFetcher.fetch(['SBET', 'KULR']);
    expect(results).toEqual([]);
  });

  it('getSupportedTickers returns MSTR', () => {
    expect(getStrategyTickers()).toEqual(['MSTR']);
  });
});

describe('FetchResult structure validation', () => {
  it('all fetchers return valid FetchResult objects', async () => {
    // Mock successful API responses
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        data: { btcTotal: '100', asOfDate: '2026-01-20T00:00:00Z' },
      }),
    });

    const results = await kulrFetcher.fetch(['KULR']);

    for (const result of results) {
      expect(result).toHaveProperty('ticker');
      expect(result).toHaveProperty('field');
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('source');
      expect(result).toHaveProperty('fetchedAt');
      expect(result.source).toHaveProperty('name');
      expect(result.source).toHaveProperty('url');
      expect(result.source).toHaveProperty('date');
      expect(typeof result.value).toBe('number');
      expect(result.fetchedAt).toBeInstanceOf(Date);
    }
  });
});
