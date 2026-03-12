/**
 * Tests for D1 Proposal Management
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AutoExtractionResult } from '../sec/auto-extract-8k';

// Mock D1Client and dependencies
vi.mock('../d1', () => ({
  D1Client: vi.fn(),
}));

vi.mock('./sec-filing-holdings-native', () => ({
  writeSecFilingHoldingsNativeDatapoint: vi.fn(),
}));

vi.mock('../data/companies', () => ({
  getCompanyByTicker: vi.fn((ticker: string) => {
    if (ticker === 'MSTR') return { ticker: 'MSTR', asset: 'BTC', holdings: 712_647 };
    if (ticker === 'RIOT') return { ticker: 'RIOT', asset: 'BTC', holdings: 19_287 };
    return null;
  }),
}));

import { writeExtractionProposal, writeExtractionProposals } from './proposals';
import { writeSecFilingHoldingsNativeDatapoint } from './sec-filing-holdings-native';

const mockD1 = {
  query: vi.fn(),
} as any;

const mockWrite = vi.mocked(writeSecFilingHoldingsNativeDatapoint);

const makeExtractionResult = (overrides: Partial<AutoExtractionResult> = {}): AutoExtractionResult => ({
  ticker: 'MSTR',
  accessionNumber: '0001193125-26-016002',
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

describe('D1 Proposals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWrite.mockResolvedValue({ status: 'inserted', proposalKey: 'test-key', artifactId: 'test-artifact', runId: 'test-run' });
  });

  describe('writeExtractionProposal', () => {
    it('should write an extracted result to D1', async () => {
      const result = makeExtractionResult();
      await writeExtractionProposal(mockD1, result, 'run-123');

      expect(mockWrite).toHaveBeenCalledWith(mockD1, expect.objectContaining({
        ticker: 'MSTR',
        holdingsNative: 738_731,
        assetUnit: 'BTC',
        asOf: '2026-03-08',
        reportedAt: '2026-03-10',
        accession: '0001193125-26-016002',
        filingType: '8-K',
        confidence: 0.95,
        runId: 'run-123',
      }));
    });

    it('should skip non-extracted results', async () => {
      const result = makeExtractionResult({ extracted: false, holdings: null });
      const writeResult = await writeExtractionProposal(mockD1, result, 'run-123');

      expect(writeResult.status).toBe('skipped');
      expect(mockWrite).not.toHaveBeenCalled();
    });

    it('should include extraction metadata in flags', async () => {
      const result = makeExtractionResult({ extractionMethod: 'llm', patternName: 'LLM' });
      await writeExtractionProposal(mockD1, result, 'run-123');

      expect(mockWrite).toHaveBeenCalledWith(mockD1, expect.objectContaining({
        flags: expect.objectContaining({
          extractionMethod: 'llm',
          patternName: 'LLM',
          holdingsDelta: 26_084,
          currentHoldings: 712_647,
          source: 'auto-extract-8k',
        }),
      }));
    });

    it('should use filedDate as asOf when asOfDate missing', async () => {
      const result = makeExtractionResult({ asOfDate: null });
      await writeExtractionProposal(mockD1, result, 'run-123');

      expect(mockWrite).toHaveBeenCalledWith(mockD1, expect.objectContaining({
        asOf: '2026-03-10', // Falls back to filedDate
      }));
    });

    it('should build filing URL from accession number', async () => {
      const result = makeExtractionResult();
      await writeExtractionProposal(mockD1, result, 'run-123');

      expect(mockWrite).toHaveBeenCalledWith(mockD1, expect.objectContaining({
        filingUrl: '/filings/mstr/0001193125-26-016002',
      }));
    });
  });

  describe('writeExtractionProposals', () => {
    it('should write multiple proposals and count results', async () => {
      mockWrite
        .mockResolvedValueOnce({ status: 'inserted', proposalKey: 'key-1' })
        .mockResolvedValueOnce({ status: 'noop', proposalKey: 'key-2', reason: 'dedupe' });

      const results = [
        makeExtractionResult({ ticker: 'MSTR' }),
        makeExtractionResult({ ticker: 'RIOT', holdings: 19_500, currentHoldings: 19_287, holdingsDelta: 213 }),
      ];

      const stats = await writeExtractionProposals(mockD1, results, 'run-456');

      expect(stats.written).toBe(1);
      expect(stats.skipped).toBe(1);
      expect(stats.errors).toBe(0);
      expect(stats.details).toHaveLength(2);
    });

    it('should count errors separately', async () => {
      mockWrite.mockResolvedValueOnce({ status: 'error', error: 'D1 timeout' });

      const results = [makeExtractionResult()];
      const stats = await writeExtractionProposals(mockD1, results, 'run-789');

      expect(stats.errors).toBe(1);
      expect(stats.written).toBe(0);
    });
  });
});
