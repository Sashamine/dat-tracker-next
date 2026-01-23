/**
 * Confidence Scorer Tests (Phase 7c)
 *
 * Tests for confidence scoring logic that determines
 * auto-resolve vs manual review actions.
 */

import { describe, it, expect } from 'vitest';
import { calculateConfidence, formatConfidenceResult } from './confidence-scorer';
import type { VerificationResult } from './source-verifier';

describe('Confidence Scorer', () => {
  describe('calculateConfidence', () => {
    describe('verified source scenarios', () => {
      it('should return HIGH confidence when verified and external agrees', () => {
        const verification: VerificationResult = {
          status: 'verified',
          sourceUrl: 'https://sec.gov/filing',
          sourceFetchedValue: 500000,
        };
        const sourceValues = {
          'mNAV.com': { value: 500000 }, // Agrees (same value)
        };

        const result = calculateConfidence(
          verification,
          500000,
          sourceValues,
          'MSTR',
          'holdings'
        );

        expect(result.level).toBe('high');
        expect(result.action).toBe('auto_confirm');
      });

      it('should return HIGH confidence when verified and external within 5% tolerance', () => {
        const verification: VerificationResult = {
          status: 'verified',
          sourceUrl: 'https://sec.gov/filing',
          sourceFetchedValue: 500000,
        };
        const sourceValues = {
          'mNAV.com': { value: 510000 }, // 2% higher - within tolerance
        };

        const result = calculateConfidence(
          verification,
          500000,
          sourceValues,
          'MSTR',
          'holdings'
        );

        expect(result.level).toBe('high');
        expect(result.action).toBe('auto_confirm');
      });

      it('should return HIGH confidence when only known bad source disagrees', () => {
        const verification: VerificationResult = {
          status: 'verified',
          sourceUrl: 'https://sec.gov/filing',
          sourceFetchedValue: 98000000,
        };
        const sourceValues = {
          'Yahoo Finance': { value: 98000000 }, // Agrees
          'mNAV.com': { value: 447000000 }, // Known bad for GAME holdings
        };

        const result = calculateConfidence(
          verification,
          98000000,
          sourceValues,
          'GAME',
          'holdings'
        );

        expect(result.level).toBe('high');
        expect(result.action).toBe('log_external_error');
      });

      it('should return MEDIUM confidence when verified but external disagrees', () => {
        const verification: VerificationResult = {
          status: 'verified',
          sourceUrl: 'https://sec.gov/filing',
          sourceFetchedValue: 500000,
        };
        const sourceValues = {
          'mNAV.com': { value: 600000 }, // 20% higher - outside tolerance
        };

        const result = calculateConfidence(
          verification,
          500000,
          sourceValues,
          'MSTR',
          'holdings'
        );

        expect(result.level).toBe('medium');
        expect(result.action).toBe('review_conflict');
      });
    });

    describe('source drift scenarios', () => {
      it('should return LOW confidence when source shows different value', () => {
        const verification: VerificationResult = {
          status: 'source_drift',
          sourceUrl: 'https://sec.gov/filing',
          sourceFetchedValue: 550000,
          error: 'Our value 500000 differs from source value 550000',
        };
        const sourceValues = {
          'mNAV.com': { value: 550000 },
        };

        const result = calculateConfidence(
          verification,
          500000,
          sourceValues,
          'MSTR',
          'holdings'
        );

        expect(result.level).toBe('low');
        expect(result.action).toBe('review_unverified');
        expect(result.reason).toContain('different value');
      });
    });

    describe('source invalid scenarios', () => {
      it('should return LOW confidence when source URL is invalid', () => {
        const verification: VerificationResult = {
          status: 'source_invalid',
          sourceUrl: 'https://old-url.com/gone',
          error: 'Source URL returned 404',
        };
        const sourceValues = {
          'mNAV.com': { value: 500000 },
        };

        const result = calculateConfidence(
          verification,
          500000,
          sourceValues,
          'MSTR',
          'holdings'
        );

        expect(result.level).toBe('low');
        expect(result.action).toBe('review_unverified');
        expect(result.reason).toContain('invalid');
      });
    });

    describe('source available scenarios', () => {
      it('should return MEDIUM confidence when source available and external agrees', () => {
        const verification: VerificationResult = {
          status: 'source_available',
          sourceUrl: 'https://company.com/ir',
        };
        const sourceValues = {
          'mNAV.com': { value: 500000 }, // Agrees
        };

        const result = calculateConfidence(
          verification,
          500000,
          sourceValues,
          'MSTR',
          'holdings'
        );

        expect(result.level).toBe('medium');
        expect(result.action).toBe('review_conflict');
      });

      it('should return LOW confidence when source available but external disagrees', () => {
        const verification: VerificationResult = {
          status: 'source_available',
          sourceUrl: 'https://company.com/ir',
        };
        const sourceValues = {
          'mNAV.com': { value: 600000 }, // Disagrees
        };

        const result = calculateConfidence(
          verification,
          500000,
          sourceValues,
          'MSTR',
          'holdings'
        );

        expect(result.level).toBe('low');
        expect(result.action).toBe('review_unverified');
      });
    });

    describe('unverified scenarios', () => {
      it('should return LOW confidence when no sourceUrl', () => {
        const verification: VerificationResult = {
          status: 'unverified',
        };
        const sourceValues = {
          'mNAV.com': { value: 500000 },
        };

        const result = calculateConfidence(
          verification,
          500000,
          sourceValues,
          'MSTR',
          'holdings'
        );

        expect(result.level).toBe('low');
        expect(result.action).toBe('review_unverified');
        expect(result.reason).toContain('No source URL');
      });

      it('should return LOW confidence when verification is undefined', () => {
        const sourceValues = {
          'mNAV.com': { value: 500000 },
        };

        const result = calculateConfidence(
          undefined,
          500000,
          sourceValues,
          'MSTR',
          'holdings'
        );

        expect(result.level).toBe('low');
        expect(result.action).toBe('review_unverified');
      });
    });

    describe('edge cases', () => {
      it('should handle empty source values', () => {
        const verification: VerificationResult = {
          status: 'verified',
          sourceUrl: 'https://sec.gov/filing',
          sourceFetchedValue: 500000,
        };
        const sourceValues = {};

        const result = calculateConfidence(
          verification,
          500000,
          sourceValues,
          'MSTR',
          'holdings'
        );

        expect(result.level).toBe('high');
        expect(result.action).toBe('auto_confirm');
      });

      it('should handle zero values correctly', () => {
        const verification: VerificationResult = {
          status: 'verified',
          sourceUrl: 'https://sec.gov/filing',
          sourceFetchedValue: 0,
        };
        const sourceValues = {
          'mNAV.com': { value: 0 },
        };

        const result = calculateConfidence(
          verification,
          0,
          sourceValues,
          'MSTR',
          'holdings'
        );

        expect(result.level).toBe('high');
        expect(result.action).toBe('auto_confirm');
      });
    });
  });

  describe('formatConfidenceResult', () => {
    it('should format HIGH confidence correctly', () => {
      const result = formatConfidenceResult({
        level: 'high',
        action: 'auto_confirm',
        reason: 'Test reason',
      });

      expect(result).toContain('HIGH');
      expect(result).toContain('auto-confirmed');
    });

    it('should format MEDIUM confidence correctly', () => {
      const result = formatConfidenceResult({
        level: 'medium',
        action: 'review_conflict',
        reason: 'Test reason',
      });

      expect(result).toContain('MEDIUM');
      expect(result).toContain('needs review');
    });

    it('should format LOW confidence correctly', () => {
      const result = formatConfidenceResult({
        level: 'low',
        action: 'review_unverified',
        reason: 'Test reason',
      });

      expect(result).toContain('LOW');
      expect(result).toContain('needs review');
    });

    it('should format log_external_error action correctly', () => {
      const result = formatConfidenceResult({
        level: 'high',
        action: 'log_external_error',
        reason: 'External source is wrong',
      });

      expect(result).toContain('HIGH');
      expect(result).toContain('external error logged');
    });
  });
});
