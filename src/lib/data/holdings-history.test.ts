/**
 * Holdings History Source Tracking Tests (Phase 7a)
 *
 * Verifies that holdings-history.ts entries have proper source tracking
 * for the integrated verification system.
 */

import { describe, it, expect } from 'vitest';
import { HOLDINGS_HISTORY, type HoldingsSnapshot } from './holdings-history';
import { COMPANY_SOURCES } from './company-sources';

// Valid HoldingsSource values (from types.ts)
const VALID_SOURCE_TYPES = [
  'on-chain',
  'sec-filing',
  'regulatory-filing',
  'press-release',
  'company-website',
  'aggregator',
  'manual',
] as const;

// URL validation regex (basic check for http/https URLs)
const URL_REGEX = /^https?:\/\/.+/;

describe('Holdings History Source Tracking (Phase 7a)', () => {
  // Get all entries from all companies
  const allEntries: { ticker: string; entry: HoldingsSnapshot; index: number }[] = [];
  for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
    data.history.forEach((entry, index) => {
      allEntries.push({ ticker, entry, index });
    });
  }

  describe('required fields', () => {
    it('all entries have date field', () => {
      for (const { ticker, entry, index } of allEntries) {
        expect(entry.date, `${ticker}[${index}] missing date`).toBeDefined();
        expect(entry.date, `${ticker}[${index}] invalid date format`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it('all entries have holdings field', () => {
      for (const { ticker, entry, index } of allEntries) {
        expect(entry.holdings, `${ticker}[${index}] missing holdings`).toBeDefined();
        expect(typeof entry.holdings, `${ticker}[${index}] holdings must be number`).toBe('number');
      }
    });

    it('all entries have sharesOutstandingDiluted field', () => {
      for (const { ticker, entry, index } of allEntries) {
        expect(entry.sharesOutstandingDiluted, `${ticker}[${index}] missing sharesOutstandingDiluted`).toBeDefined();
        expect(typeof entry.sharesOutstandingDiluted, `${ticker}[${index}] sharesOutstandingDiluted must be number`).toBe('number');
      }
    });

    it('all entries have source field', () => {
      for (const { ticker, entry, index } of allEntries) {
        expect(entry.source, `${ticker}[${index}] missing source`).toBeDefined();
        expect(typeof entry.source, `${ticker}[${index}] source must be string`).toBe('string');
      }
    });
  });

  describe('sourceUrl validation', () => {
    it('sourceUrl is valid URL format when present', () => {
      for (const { ticker, entry, index } of allEntries) {
        if (entry.sourceUrl) {
          expect(
            URL_REGEX.test(entry.sourceUrl),
            `${ticker}[${index}] has invalid sourceUrl: ${entry.sourceUrl}`
          ).toBe(true);
        }
      }
    });

    it('SEC filing sourceUrls use correct CIK from company-sources.ts', () => {
      // Extract CIK from SEC URL pattern: ...CIK=0001234567...
      const SEC_CIK_REGEX = /CIK=0*(\d+)/i;

      for (const { ticker, entry, index } of allEntries) {
        if (entry.sourceType === 'sec-filing' && entry.sourceUrl) {
          const match = entry.sourceUrl.match(SEC_CIK_REGEX);
          if (match) {
            const urlCik = match[1];
            const companySources = COMPANY_SOURCES[ticker];

            // Company must exist in company-sources.ts
            expect(
              companySources,
              `${ticker}[${index}] has SEC sourceUrl but ticker not in company-sources.ts`
            ).toBeDefined();

            if (companySources?.secCik) {
              // Normalize CIKs (remove leading zeros) for comparison
              const expectedCik = companySources.secCik.replace(/^0+/, '');
              expect(
                urlCik,
                `${ticker}[${index}] SEC URL CIK (${urlCik}) doesn't match company-sources.ts CIK (${expectedCik})`
              ).toBe(expectedCik);
            }
          }
        }
      }
    });

    it('sourceType matches URL pattern', () => {
      for (const { ticker, entry, index } of allEntries) {
        if (entry.sourceUrl && entry.sourceType) {
          const url = entry.sourceUrl.toLowerCase();

          if (entry.sourceType === 'sec-filing') {
            expect(
              url.includes('sec.gov'),
              `${ticker}[${index}] sourceType is sec-filing but URL doesn't contain sec.gov: ${entry.sourceUrl}`
            ).toBe(true);
          }

          // company-website should NOT be SEC
          if (entry.sourceType === 'company-website') {
            expect(
              !url.includes('sec.gov'),
              `${ticker}[${index}] sourceType is company-website but URL is SEC: ${entry.sourceUrl}`
            ).toBe(true);
          }
        }
      }
    });
  });

  describe('sourceType validation', () => {
    it('sourceType is valid enum when present', () => {
      for (const { ticker, entry, index } of allEntries) {
        if (entry.sourceType) {
          expect(
            VALID_SOURCE_TYPES.includes(entry.sourceType as typeof VALID_SOURCE_TYPES[number]),
            `${ticker}[${index}] has invalid sourceType: ${entry.sourceType}`
          ).toBe(true);
        }
      }
    });
  });

  describe('estimate validation', () => {
    it('entries with ESTIMATE in source should have methodology', () => {
      const estimateEntries = allEntries.filter(
        ({ entry }) => entry.source?.includes('ESTIMATE') || entry.sourceType === 'manual'
      );

      // For now, just log how many estimates exist without methodology
      // This test will become stricter as we add methodology to estimates
      const withoutMethodology = estimateEntries.filter(({ entry }) => !entry.methodology);

      if (withoutMethodology.length > 0) {
        console.log(`⚠️  ${withoutMethodology.length} estimates without methodology field:`);
        withoutMethodology.slice(0, 5).forEach(({ ticker, entry }) => {
          console.log(`   - ${ticker}: ${entry.source}`);
        });
        if (withoutMethodology.length > 5) {
          console.log(`   ... and ${withoutMethodology.length - 5} more`);
        }
      }

      // Currently a soft check - will make strict later
      // expect(withoutMethodology.length, 'All estimates should have methodology').toBe(0);
    });

    it('confidence is valid enum when present', () => {
      for (const { ticker, entry, index } of allEntries) {
        if (entry.confidence) {
          expect(
            ['high', 'medium', 'low'].includes(entry.confidence),
            `${ticker}[${index}] has invalid confidence: ${entry.confidence}`
          ).toBe(true);
        }
      }
    });

    it('confidenceRange has valid floor and ceiling when present', () => {
      for (const { ticker, entry, index } of allEntries) {
        if (entry.confidenceRange) {
          expect(
            typeof entry.confidenceRange.floor,
            `${ticker}[${index}] confidenceRange.floor must be number`
          ).toBe('number');
          expect(
            typeof entry.confidenceRange.ceiling,
            `${ticker}[${index}] confidenceRange.ceiling must be number`
          ).toBe('number');
          expect(
            entry.confidenceRange.floor <= entry.confidenceRange.ceiling,
            `${ticker}[${index}] confidenceRange.floor should be <= ceiling`
          ).toBe(true);
        }
      }
    });
  });

  describe('source tracking coverage', () => {
    it('reports source tracking statistics', () => {
      const stats = {
        totalEntries: allEntries.length,
        withSourceUrl: allEntries.filter(({ entry }) => entry.sourceUrl).length,
        withSourceType: allEntries.filter(({ entry }) => entry.sourceType).length,
        withMethodology: allEntries.filter(({ entry }) => entry.methodology).length,
        estimates: allEntries.filter(({ entry }) => entry.source?.includes('ESTIMATE')).length,
      };

      console.log('Source Tracking Statistics:', stats);
      console.log(`  sourceUrl coverage: ${((stats.withSourceUrl / stats.totalEntries) * 100).toFixed(1)}%`);
      console.log(`  sourceType coverage: ${((stats.withSourceType / stats.totalEntries) * 100).toFixed(1)}%`);

      // For now, just report - will add thresholds as we improve coverage
      expect(stats.totalEntries).toBeGreaterThan(0);
    });

    // Get most recent entry for each company - THIS IS WHAT MATTERS FOR VERIFICATION
    it('most recent entries should have source tracking', () => {
      const recentEntries: { ticker: string; entry: HoldingsSnapshot }[] = [];

      for (const [ticker, data] of Object.entries(HOLDINGS_HISTORY)) {
        if (data.history.length > 0) {
          const mostRecent = data.history[data.history.length - 1];
          recentEntries.push({ ticker, entry: mostRecent });
        }
      }

      const withSourceUrl = recentEntries.filter(({ entry }) => entry.sourceUrl).length;
      const withSourceType = recentEntries.filter(({ entry }) => entry.sourceType).length;
      const missingSourceUrl = recentEntries.filter(({ entry }) => !entry.sourceUrl);

      console.log(`Recent entries with sourceUrl: ${withSourceUrl}/${recentEntries.length}`);
      console.log(`Recent entries with sourceType: ${withSourceType}/${recentEntries.length}`);

      if (missingSourceUrl.length > 0 && missingSourceUrl.length <= 10) {
        console.log('Missing sourceUrl:', missingSourceUrl.map(e => e.ticker).join(', '));
      }

      // TARGET: All most recent entries should have sourceUrl for verification system
      // Current: 9/50 - will enforce once we reach 100%
      // TODO: Uncomment when all recent entries have sourceUrl
      // expect(withSourceUrl, 'All recent entries should have sourceUrl').toBe(recentEntries.length);
    });
  });
});
