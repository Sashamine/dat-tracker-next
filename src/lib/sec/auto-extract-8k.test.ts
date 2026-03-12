/**
 * Tests for auto-extraction module
 */

import { describe, it, expect } from 'vitest';
import { formatExtractionForDiscord, getProposedUpdates, type AutoExtractionResult } from './auto-extract-8k';

const makeResult = (overrides: Partial<AutoExtractionResult>): AutoExtractionResult => ({
  ticker: 'MSTR',
  accessionNumber: '0001193125-26-000001',
  formType: '8-K',
  filedDate: '2026-03-10',
  extracted: true,
  holdings: 738_731,
  transactionAmount: 17_994,
  type: 'total',
  asset: 'BTC',
  asOfDate: '2026-03-08',
  costUsd: 1_280_000_000,
  confidence: 0.95,
  patternName: 'table_aggregate',
  sharesOutstanding: null,
  currentHoldings: 712_647,
  holdingsDelta: 26_084,
  extractionMethod: 'regex',
  ...overrides,
});

describe('Auto-Extract 8-K', () => {
  describe('formatExtractionForDiscord', () => {
    it('should format extracted results', () => {
      const results = [makeResult({})];
      const formatted = formatExtractionForDiscord(results);
      expect(formatted).toContain('MSTR');
      expect(formatted).toContain('TOTAL');
      expect(formatted).toContain('738,731');
      expect(formatted).toContain('BTC');
      expect(formatted).toContain('95%');
      expect(formatted).toContain('Δ +26,084');
    });

    it('should return empty string when nothing extracted', () => {
      const results = [makeResult({ extracted: false, holdings: null })];
      const formatted = formatExtractionForDiscord(results);
      expect(formatted).toBe('');
    });

    it('should show cost when available', () => {
      const results = [makeResult({})];
      const formatted = formatExtractionForDiscord(results);
      expect(formatted).toContain('$1280.0M');
    });
  });

  describe('getProposedUpdates', () => {
    it('should propose high-confidence total with delta', () => {
      const results = [makeResult({ confidence: 0.85 })];
      const proposals = getProposedUpdates(results);
      expect(proposals).toHaveLength(1);
      expect(proposals[0].ticker).toBe('MSTR');
    });

    it('should NOT propose low-confidence results', () => {
      const results = [makeResult({ confidence: 0.6 })];
      const proposals = getProposedUpdates(results);
      expect(proposals).toHaveLength(0);
    });

    it('should NOT propose purchases (only totals)', () => {
      const results = [makeResult({ type: 'purchase', holdings: null })];
      const proposals = getProposedUpdates(results);
      expect(proposals).toHaveLength(0);
    });

    it('should NOT propose when delta is zero', () => {
      const results = [makeResult({ holdingsDelta: 0, holdings: 712_647, currentHoldings: 712_647 })];
      const proposals = getProposedUpdates(results);
      expect(proposals).toHaveLength(0);
    });

    it('should propose LLM results when high confidence', () => {
      const results = [makeResult({
        extractionMethod: 'llm',
        patternName: 'LLM',
        confidence: 0.9,
        holdings: 750_000,
        holdingsDelta: 37_353,
      })];
      const proposals = getProposedUpdates(results);
      expect(proposals).toHaveLength(1);
    });
  });

  describe('extractionMethod tracking', () => {
    it('should include extractionMethod in results', () => {
      const regexResult = makeResult({ extractionMethod: 'regex' });
      expect(regexResult.extractionMethod).toBe('regex');

      const llmResult = makeResult({ extractionMethod: 'llm', patternName: 'LLM' });
      expect(llmResult.extractionMethod).toBe('llm');
    });

    it('should show LLM tag in Discord formatting', () => {
      const results = [makeResult({ extractionMethod: 'llm', patternName: 'LLM' })];
      const formatted = formatExtractionForDiscord(results);
      expect(formatted).toContain('🤖');
    });

    it('should NOT show LLM tag for regex results', () => {
      const results = [makeResult({ extractionMethod: 'regex' })];
      const formatted = formatExtractionForDiscord(results);
      expect(formatted).not.toContain('🤖');
    });
  });
});
