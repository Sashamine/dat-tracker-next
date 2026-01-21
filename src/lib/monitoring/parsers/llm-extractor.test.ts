/**
 * LLM Extractor Tests
 *
 * Tests the LLM-based holdings extraction for:
 * - Response parsing (explicit holdings, transactions)
 * - Edge cases and error handling
 * - Validation logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractHoldingsFromText,
  validateExtraction,
  createLLMConfigFromEnv,
} from './llm-extractor';
import type { ExtractionContext, ExtractionResult } from '../types';

// Mock fetch will be created fresh in each test
let mockFetch: ReturnType<typeof vi.fn>;

// Standard context for most tests
const standardContext: ExtractionContext = {
  companyName: 'Strategy',
  ticker: 'MSTR',
  asset: 'BTC',
  currentHoldings: 500000,
};

// Helper to create mock LLM response
function mockLLMResponse(result: Partial<ExtractionResult>) {
  const fullResult = {
    holdings: result.holdings ?? null,
    sharesOutstanding: result.sharesOutstanding ?? null,
    classAShares: result.classAShares ?? null,
    classBShares: result.classBShares ?? null,
    costBasis: result.costBasis ?? null,
    confidence: result.confidence ?? 0.9,
    reasoning: result.reasoning ?? 'Extracted from text',
    extractedDate: result.extractedDate ?? '2026-01-21',
    rawNumbers: result.rawNumbers ?? [],
    transactionType: result.transactionType ?? null,
    transactionAmount: result.transactionAmount ?? null,
    holdingsExplicitlyStated: result.holdingsExplicitlyStated ?? true,
  };
  return JSON.stringify(fullResult);
}

describe('LLM Extractor', () => {
  beforeEach(() => {
    // Create fresh mock for each test
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('extractHoldingsFromText - explicit holdings', () => {
    it('should extract explicitly stated holdings', async () => {
      const mockResponse = {
        holdings: 550000,
        confidence: 0.95,
        reasoning: 'Total BTC holdings stated as 550,000',
        holdingsExplicitlyStated: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: mockLLMResponse(mockResponse),
          }],
        }),
      } as Response);

      const result = await extractHoldingsFromText(
        'The company holds 550,000 BTC as of January 2026. This is confirmed in the official filing.',
        standardContext,
        { provider: 'anthropic', apiKey: 'test-key' }
      );

      expect(result.holdings).toBe(550000);
      expect(result.confidence).toBe(0.95);
      expect(result.holdingsExplicitlyStated).toBe(true);
    });

    it('should extract shares outstanding', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: mockLLMResponse({
              holdings: 550000,
              sharesOutstanding: 250000000,
              confidence: 0.9,
            }),
          }],
        }),
      } as Response);

      const result = await extractHoldingsFromText(
        'As of the filing date, holdings: 550,000 BTC. Total shares outstanding: 250,000,000.',
        standardContext,
        { provider: 'anthropic', apiKey: 'test-key' }
      );

      expect(result.holdings).toBe(550000);
      expect(result.sharesOutstanding).toBe(250000000);
    });
  });

  describe('extractHoldingsFromText - transaction-based extraction', () => {
    it('should calculate holdings from purchase transaction', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: mockLLMResponse({
              holdings: 510000, // 500000 + 10000
              transactionType: 'purchase',
              transactionAmount: 10000,
              holdingsExplicitlyStated: false,
              confidence: 0.85,
              reasoning: 'Company purchased 10,000 BTC. Calculated: 500,000 + 10,000 = 510,000',
            }),
          }],
        }),
      } as Response);

      const result = await extractHoldingsFromText(
        'The company announced that we acquired an additional 10,000 bitcoin during this quarter.',
        standardContext,
        { provider: 'anthropic', apiKey: 'test-key' }
      );

      expect(result.holdings).toBe(510000);
      expect(result.transactionType).toBe('purchase');
      expect(result.transactionAmount).toBe(10000);
      expect(result.holdingsExplicitlyStated).toBe(false);
    });

    it('should calculate holdings from sale transaction', async () => {
      const contextWithHoldings: ExtractionContext = {
        ...standardContext,
        currentHoldings: 19287, // RIOT's holdings
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: mockLLMResponse({
              holdings: 18207, // 19287 - 1080
              transactionType: 'sale',
              transactionAmount: 1080,
              holdingsExplicitlyStated: false,
              confidence: 0.9,
              reasoning: 'Company sold 1,080 BTC. Calculated: 19,287 - 1,080 = 18,207',
            }),
          }],
        }),
      } as Response);

      const result = await extractHoldingsFromText(
        'Funded entirely by the sale of approximately 1,080 bitcoin from balance sheet.',
        contextWithHoldings,
        { provider: 'anthropic', apiKey: 'test-key' }
      );

      expect(result.holdings).toBe(18207);
      expect(result.transactionType).toBe('sale');
      expect(result.transactionAmount).toBe(1080);
    });
  });

  describe('extractHoldingsFromText - dual-class shares', () => {
    it('should extract both share classes and calculate total', async () => {
      const dualClassContext: ExtractionContext = {
        ...standardContext,
        isDualClass: true,
        shareClasses: ['Class A', 'Class B'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: mockLLMResponse({
              holdings: 550000,
              classAShares: 180000000,
              classBShares: 20000000,
              sharesOutstanding: 200000000,
              confidence: 0.9,
            }),
          }],
        }),
      } as Response);

      const result = await extractHoldingsFromText(
        'As of the filing date, the company has Class A: 180M shares outstanding. Class B: 20M shares outstanding.',
        dualClassContext,
        { provider: 'anthropic', apiKey: 'test-key' }
      );

      expect(result.classAShares).toBe(180000000);
      expect(result.classBShares).toBe(20000000);
      expect(result.sharesOutstanding).toBe(200000000);
    });

    it('should calculate total shares if only classes provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              holdings: 550000,
              classAShares: 180000000,
              classBShares: 20000000,
              sharesOutstanding: null, // Not provided
              confidence: 0.9,
              reasoning: 'Extracted class shares',
            }),
          }],
        }),
      } as Response);

      const result = await extractHoldingsFromText(
        'According to the quarterly report, Class A: 180M shares and Class B: 20M shares are outstanding.',
        standardContext,
        { provider: 'anthropic', apiKey: 'test-key' }
      );

      // Should auto-calculate total
      expect(result.sharesOutstanding).toBe(200000000);
    });
  });

  describe('extractHoldingsFromText - error handling', () => {
    it('should return null holdings for text too short', async () => {
      const result = await extractHoldingsFromText(
        'Short text',
        standardContext,
        { provider: 'anthropic', apiKey: 'test-key' }
      );

      expect(result.holdings).toBeNull();
      expect(result.reasoning).toBe('Text too short for extraction');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      } as Response);

      const result = await extractHoldingsFromText(
        'This is a long enough text to trigger the API call and test error handling.',
        standardContext,
        { provider: 'anthropic', apiKey: 'test-key' }
      );

      expect(result.holdings).toBeNull();
      expect(result.confidence).toBe(0);
      expect(result.reasoning).toContain('Extraction failed');
    });

    it('should handle malformed JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: 'This is not valid JSON {{{',
          }],
        }),
      } as Response);

      const result = await extractHoldingsFromText(
        'This is a long enough text to trigger the API call and test error handling.',
        standardContext,
        { provider: 'anthropic', apiKey: 'test-key' }
      );

      expect(result.holdings).toBeNull();
      expect(result.reasoning).toContain('Failed to parse');
    });

    it('should handle markdown-wrapped JSON response', async () => {
      const jsonResponse = mockLLMResponse({ holdings: 550000 });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: '```json\n' + jsonResponse + '\n```',
          }],
        }),
      } as Response);

      const result = await extractHoldingsFromText(
        'This is a long enough text to trigger the API call and test markdown handling.',
        standardContext,
        { provider: 'anthropic', apiKey: 'test-key' }
      );

      expect(result.holdings).toBe(550000);
    });
  });

  describe('validateExtraction', () => {
    it('should validate correct extraction', () => {
      const extraction: ExtractionResult = {
        holdings: 550000,
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.9,
        reasoning: 'Extracted from text',
        extractedDate: '2026-01-21',
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      };

      const validation = validateExtraction(extraction, standardContext);

      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should flag null holdings', () => {
      const extraction: ExtractionResult = {
        holdings: null,
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.5,
        reasoning: 'Could not extract',
        extractedDate: null,
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: false,
      };

      const validation = validateExtraction(extraction, standardContext);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('No holdings extracted');
    });

    it('should flag negative holdings', () => {
      const extraction: ExtractionResult = {
        holdings: -1000,
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.9,
        reasoning: 'Test',
        extractedDate: null,
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      };

      const validation = validateExtraction(extraction, standardContext);

      expect(validation.valid).toBe(false);
      expect(validation.issues).toContain('Negative holdings value');
    });

    it('should flag unrealistically high holdings', () => {
      const extraction: ExtractionResult = {
        holdings: 1e13, // More than 10 trillion
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.9,
        reasoning: 'Test',
        extractedDate: null,
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      };

      const validation = validateExtraction(extraction, standardContext);

      expect(validation.issues).toContain('Holdings value seems unrealistically high');
    });

    it('should flag large changes from current holdings', () => {
      const extraction: ExtractionResult = {
        holdings: 1100000, // 120% increase from 500000 (triggers >100% threshold)
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.9,
        reasoning: 'Test',
        extractedDate: null,
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      };

      const validation = validateExtraction(extraction, standardContext);

      expect(validation.issues.some(i => i.includes('Large change detected'))).toBe(true);
    });

    it('should flag low confidence', () => {
      const extraction: ExtractionResult = {
        holdings: 550000,
        sharesOutstanding: null,
        classAShares: null,
        classBShares: null,
        costBasis: null,
        confidence: 0.3, // Below 0.5 threshold
        reasoning: 'Uncertain',
        extractedDate: null,
        rawNumbers: [],
        transactionType: null,
        transactionAmount: null,
        holdingsExplicitlyStated: true,
      };

      const validation = validateExtraction(extraction, standardContext);

      expect(validation.issues.some(i => i.includes('Low confidence'))).toBe(true);
    });
  });

  describe('createLLMConfigFromEnv', () => {
    it('should return null if no API key set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GROK_API_KEY;

      const config = createLLMConfigFromEnv();

      expect(config).toBeNull();
    });

    it('should use anthropic by default if key exists', () => {
      process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
      delete process.env.GROK_API_KEY;

      const config = createLLMConfigFromEnv();

      expect(config?.provider).toBe('anthropic');
      expect(config?.apiKey).toBe('test-anthropic-key');
    });

    it('should use grok if specified and key exists', () => {
      process.env.MONITORING_LLM_PROVIDER = 'grok';
      process.env.GROK_API_KEY = 'test-grok-key';

      const config = createLLMConfigFromEnv();

      expect(config?.provider).toBe('grok');
      expect(config?.apiKey).toBe('test-grok-key');

      // Cleanup
      delete process.env.MONITORING_LLM_PROVIDER;
    });
  });

  describe('Grok API integration', () => {
    it('should call Grok API with correct format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: mockLLMResponse({ holdings: 550000 }),
            },
          }],
        }),
      } as Response);

      const result = await extractHoldingsFromText(
        'This is a long enough text to trigger the API call for Grok testing.',
        standardContext,
        { provider: 'grok', apiKey: 'test-grok-key' }
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.x.ai/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-grok-key',
          }),
        })
      );
      expect(result.holdings).toBe(550000);
    });
  });
});
