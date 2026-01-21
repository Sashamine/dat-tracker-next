/**
 * SEC Auto-Update Adapter Tests
 *
 * Tests the SEC 8-K filing detection, extraction, and auto-update flow.
 * This is critical code that modifies companies.ts and makes git commits.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as childProcess from 'child_process';

// Mock modules before importing the module under test
vi.mock('fs');
vi.mock('child_process');
vi.mock('../monitoring/sources/sec-edgar', () => ({
  searchFilingDocuments: vi.fn(),
  TICKER_TO_CIK: {
    'MSTR': '0001050446',
    'RIOT': '0001167419',
    'TEST': '0000000001',
  },
}));
vi.mock('../monitoring/parsers/llm-extractor', () => ({
  extractHoldingsFromText: vi.fn(),
  validateExtraction: vi.fn(),
  createLLMConfigFromEnv: vi.fn(),
}));

// Now import the module under test and mocked modules
import { checkTickerForSecUpdate, runSecAutoUpdate } from './index';
import { searchFilingDocuments, TICKER_TO_CIK } from '../monitoring/sources/sec-edgar';
import { extractHoldingsFromText, validateExtraction, createLLMConfigFromEnv } from '../monitoring/parsers/llm-extractor';

// Mock fetch
let mockFetch: ReturnType<typeof vi.fn>;

// Sample companies.ts content for testing
const mockCompaniesContent = `
export const companies = [
  {
    name: "Strategy",
    ticker: "MSTR",
    asset: "BTC",
    holdings: 500_000,
    holdingsLastUpdated: "2025-12-01",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://example.com/old-filing",
  },
  {
    name: "Riot Platforms",
    ticker: "RIOT",
    asset: "BTC",
    holdings: 19_287,
    holdingsLastUpdated: "2025-10-30",
    holdingsSource: "sec-filing",
    holdingsSourceUrl: "https://example.com/old-riot-filing",
  },
];
`;

// Mock SEC submissions response
const mockSECSubmissions = {
  filings: {
    recent: {
      form: ['8-K', '10-Q', '8-K', '10-K'],
      filingDate: ['2026-01-20', '2026-01-15', '2026-01-10', '2025-12-15'],
      accessionNumber: ['0001193125-26-016002', '0001193125-26-015000', '0001193125-26-010000', '0001193125-25-100000'],
    },
  },
};

describe('SEC Auto-Update Adapter', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup fetch mock
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);

    // Setup fs mocks
    vi.mocked(fs.readFileSync).mockReturnValue(mockCompaniesContent);
    vi.mocked(fs.writeFileSync).mockImplementation(() => {});

    // Setup child_process mock
    vi.mocked(childProcess.execSync).mockImplementation(() => Buffer.from(''));

    // Setup LLM config mock
    vi.mocked(createLLMConfigFromEnv).mockReturnValue({
      provider: 'anthropic',
      apiKey: 'test-key',
    });

    // Default: validateExtraction returns valid
    vi.mocked(validateExtraction).mockReturnValue({
      valid: true,
      issues: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('checkTickerForSecUpdate', () => {
    it('should return error for unknown ticker', async () => {
      const result = await checkTickerForSecUpdate('UNKNOWN');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Company not found');
    });

    it('should return error when no LLM API key configured', async () => {
      vi.mocked(createLLMConfigFromEnv).mockReturnValue(null);

      const result = await checkTickerForSecUpdate('MSTR');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No LLM API key configured');
    });

    it('should return success with no changes when no 8-K filings found', async () => {
      // Mock SEC API to return no 8-K filings
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          filings: {
            recent: {
              form: ['10-Q', '10-K'],
              filingDate: ['2026-01-15', '2025-12-15'],
              accessionNumber: ['0001193125-26-015000', '0001193125-25-100000'],
            },
          },
        }),
      } as Response);

      const result = await checkTickerForSecUpdate('MSTR', { sinceDays: 7 });

      expect(result.success).toBe(true);
      expect(result.reasoning).toContain('No recent 8-K filings');
    });

    it('should return success when 8-K found but no crypto content', async () => {
      // Mock SEC API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSECSubmissions,
      } as Response);

      // Mock searchFilingDocuments to return null (no crypto content)
      vi.mocked(searchFilingDocuments).mockResolvedValue(null);

      const result = await checkTickerForSecUpdate('MSTR', { sinceDays: 30 });

      expect(result.success).toBe(true);
      expect(result.reasoning).toContain('No recent 8-K filings with crypto content');
    });

    it('should skip update when confidence below threshold', async () => {
      // Mock SEC API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSECSubmissions,
      } as Response);

      // Mock filing with crypto content
      vi.mocked(searchFilingDocuments).mockResolvedValue({
        documentUrl: 'https://sec.gov/filing.htm',
        content: 'The company holds 550,000 BTC as of the filing date.',
      });

      // Mock LLM extraction with low confidence
      vi.mocked(extractHoldingsFromText).mockResolvedValue({
        holdings: 550000,
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.5, // Below default 0.7 threshold
        reasoning: 'Low confidence extraction',
        extractedDate: '2026-01-20',
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      });

      const result = await checkTickerForSecUpdate('MSTR', { sinceDays: 30 });

      expect(result.success).toBe(true);
      expect(result.reasoning).toContain('below threshold');
      expect(result.newHoldings).toBe(550000);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should skip update when change exceeds max threshold', async () => {
      // Mock SEC API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSECSubmissions,
      } as Response);

      // Mock filing with crypto content
      vi.mocked(searchFilingDocuments).mockResolvedValue({
        documentUrl: 'https://sec.gov/filing.htm',
        content: 'The company holds 1,000,000 BTC as of the filing date.',
      });

      // Mock LLM extraction with 100% increase (exceeds 50% default)
      vi.mocked(extractHoldingsFromText).mockResolvedValue({
        holdings: 1000000, // 100% increase from 500000
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.95,
        reasoning: 'Holdings doubled',
        extractedDate: '2026-01-20',
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      });

      const result = await checkTickerForSecUpdate('MSTR', { sinceDays: 30 });

      expect(result.success).toBe(true);
      expect(result.reasoning).toContain('exceeds threshold');
      expect(result.reasoning).toContain('manual review');
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should return unchanged when holdings match', async () => {
      // Mock SEC API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSECSubmissions,
      } as Response);

      // Mock filing with crypto content
      vi.mocked(searchFilingDocuments).mockResolvedValue({
        documentUrl: 'https://sec.gov/filing.htm',
        content: 'The company holds 500,000 BTC as of the filing date.',
      });

      // Mock LLM extraction with same holdings
      vi.mocked(extractHoldingsFromText).mockResolvedValue({
        holdings: 500000, // Same as current
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.95,
        reasoning: 'Holdings unchanged',
        extractedDate: '2026-01-20',
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      });

      const result = await checkTickerForSecUpdate('MSTR', { sinceDays: 30 });

      expect(result.success).toBe(true);
      expect(result.reasoning).toBe('Holdings unchanged');
      expect(result.previousHoldings).toBe(500000);
      expect(result.newHoldings).toBe(500000);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should update companies.ts in dry run mode without writing', async () => {
      // Mock SEC API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSECSubmissions,
      } as Response);

      // Mock filing with crypto content
      vi.mocked(searchFilingDocuments).mockResolvedValue({
        documentUrl: 'https://sec.gov/filing.htm',
        content: 'The company holds 550,000 BTC as of the filing date.',
      });

      // Mock LLM extraction with valid change
      vi.mocked(extractHoldingsFromText).mockResolvedValue({
        holdings: 550000, // 10% increase
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.95,
        reasoning: 'Holdings increased',
        extractedDate: '2026-01-20',
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      });

      const result = await checkTickerForSecUpdate('MSTR', {
        sinceDays: 30,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.previousHoldings).toBe(500000);
      expect(result.newHoldings).toBe(550000);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(childProcess.execSync).not.toHaveBeenCalled();
    });

    it('should update companies.ts and commit when valid change detected', async () => {
      // Mock SEC API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSECSubmissions,
      } as Response);

      // Mock filing with crypto content
      vi.mocked(searchFilingDocuments).mockResolvedValue({
        documentUrl: 'https://sec.gov/filing.htm',
        content: 'The company holds 550,000 BTC as of the filing date.',
      });

      // Mock LLM extraction with valid change
      vi.mocked(extractHoldingsFromText).mockResolvedValue({
        holdings: 550000,
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.95,
        reasoning: 'Holdings increased',
        extractedDate: '2026-01-20',
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      });

      const result = await checkTickerForSecUpdate('MSTR', {
        sinceDays: 30,
        dryRun: false,
        autoCommit: true,
      });

      expect(result.success).toBe(true);
      expect(result.previousHoldings).toBe(500000);
      expect(result.newHoldings).toBe(550000);
      expect(result.committed).toBe(true);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(childProcess.execSync).toHaveBeenCalledTimes(2); // git add + git commit
    });

    it('should handle transaction-based updates (sale)', async () => {
      // Mock SEC API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSECSubmissions,
      } as Response);

      // Mock filing with sale info
      vi.mocked(searchFilingDocuments).mockResolvedValue({
        documentUrl: 'https://sec.gov/filing.htm',
        content: 'The company sold 1,080 bitcoin to fund operations.',
      });

      // Mock LLM extraction with sale calculation
      vi.mocked(extractHoldingsFromText).mockResolvedValue({
        holdings: 18207, // 19287 - 1080
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.9,
        reasoning: 'Calculated from sale: 19,287 - 1,080 = 18,207',
        extractedDate: '2026-01-20',
        rawNumbers: [],
        transactionType: 'sale',
        transactionAmount: 1080,
        holdingsExplicitlyStated: false,
      });

      const result = await checkTickerForSecUpdate('RIOT', {
        sinceDays: 30,
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.previousHoldings).toBe(19287);
      expect(result.newHoldings).toBe(18207);
    });

    it('should handle SEC API errors gracefully', async () => {
      // Mock SEC API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await checkTickerForSecUpdate('MSTR', { sinceDays: 30 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('SEC API error');
    });

    it('should handle git commit failures gracefully', async () => {
      // Mock SEC API
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSECSubmissions,
      } as Response);

      // Mock filing with crypto content
      vi.mocked(searchFilingDocuments).mockResolvedValue({
        documentUrl: 'https://sec.gov/filing.htm',
        content: 'The company holds 550,000 BTC as of the filing date.',
      });

      // Mock LLM extraction
      vi.mocked(extractHoldingsFromText).mockResolvedValue({
        holdings: 550000,
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.95,
        reasoning: 'Holdings increased',
        extractedDate: '2026-01-20',
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      });

      // Mock git failure
      vi.mocked(childProcess.execSync).mockImplementation(() => {
        throw new Error('Git commit failed');
      });

      const result = await checkTickerForSecUpdate('MSTR', {
        sinceDays: 30,
        dryRun: false,
        autoCommit: true,
      });

      expect(result.success).toBe(true);
      expect(result.committed).toBe(false);
      expect(fs.writeFileSync).toHaveBeenCalled(); // File was still updated
    });
  });

  describe('runSecAutoUpdate', () => {
    it('should process multiple tickers', async () => {
      // Mock SEC API for multiple calls
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSECSubmissions,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockSECSubmissions,
        } as Response);

      // No crypto content found
      vi.mocked(searchFilingDocuments).mockResolvedValue(null);

      const results = await runSecAutoUpdate({
        tickers: ['MSTR', 'RIOT'],
        sinceDays: 30,
        dryRun: true,
      });

      expect(results).toHaveLength(2);
      expect(results[0].ticker).toBe('MSTR');
      expect(results[1].ticker).toBe('RIOT');
    });

    it('should use all tickers with CIKs when none specified', async () => {
      // Mock SEC API for all tickers
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          filings: {
            recent: {
              form: ['10-Q'],
              filingDate: ['2026-01-15'],
              accessionNumber: ['0001193125-26-015000'],
            },
          },
        }),
      } as Response);

      const results = await runSecAutoUpdate({
        sinceDays: 7,
        dryRun: true,
      });

      // Should process all tickers in TICKER_TO_CIK
      expect(results.length).toBe(Object.keys(TICKER_TO_CIK).length);
    });
  });

  describe('config options', () => {
    it('should respect custom minConfidence threshold', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSECSubmissions,
      } as Response);

      vi.mocked(searchFilingDocuments).mockResolvedValue({
        documentUrl: 'https://sec.gov/filing.htm',
        content: 'Holdings content here.',
      });

      vi.mocked(extractHoldingsFromText).mockResolvedValue({
        holdings: 550000,
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.6, // Would fail default 0.7 but pass 0.5
        reasoning: 'Extracted with moderate confidence',
        extractedDate: '2026-01-20',
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      });

      // With minConfidence: 0.5, should proceed with update
      const result = await checkTickerForSecUpdate('MSTR', {
        sinceDays: 30,
        dryRun: true,
        minConfidence: 0.5,
      });

      expect(result.success).toBe(true);
      expect(result.reasoning).not.toContain('below threshold');
    });

    it('should respect custom maxChangePct threshold', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSECSubmissions,
      } as Response);

      vi.mocked(searchFilingDocuments).mockResolvedValue({
        documentUrl: 'https://sec.gov/filing.htm',
        content: 'Holdings content here.',
      });

      vi.mocked(extractHoldingsFromText).mockResolvedValue({
        holdings: 800000, // 60% increase, exceeds 50% but not 75%
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.95,
        reasoning: 'Large increase',
        extractedDate: '2026-01-20',
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      });

      // With maxChangePct: 75, should proceed
      const result = await checkTickerForSecUpdate('MSTR', {
        sinceDays: 30,
        dryRun: true,
        maxChangePct: 75,
      });

      expect(result.success).toBe(true);
      expect(result.reasoning).not.toContain('exceeds threshold');
    });

    it('should respect autoCommit: false', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSECSubmissions,
      } as Response);

      vi.mocked(searchFilingDocuments).mockResolvedValue({
        documentUrl: 'https://sec.gov/filing.htm',
        content: 'Holdings content here.',
      });

      vi.mocked(extractHoldingsFromText).mockResolvedValue({
        holdings: 550000,
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.95,
        reasoning: 'Holdings increased',
        extractedDate: '2026-01-20',
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      });

      const result = await checkTickerForSecUpdate('MSTR', {
        sinceDays: 30,
        dryRun: false,
        autoCommit: false, // Don't commit
      });

      expect(result.success).toBe(true);
      expect(result.committed).toBe(false);
      expect(fs.writeFileSync).toHaveBeenCalled();
      expect(childProcess.execSync).not.toHaveBeenCalled();
    });
  });
});
