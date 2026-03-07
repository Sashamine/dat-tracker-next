import { describe, it, expect } from 'vitest';
import { ASSUMPTIONS, ASSUMPTION_REVIEW_MAX_AGE_DAYS } from '../assumptions';
import { allCompanies } from '../companies';
import { getAllCompanyReviews } from '../integrity-review';

const validTickers = new Set(allCompanies.map(c => c.ticker));
const today = new Date();

function daysBetween(a: Date, b: Date): number {
  return Math.floor(Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24));
}

describe('Assumption Register', () => {
  it('should have at least one assumption', () => {
    expect(ASSUMPTIONS.length).toBeGreaterThan(0);
  });

  it('all tickers must reference existing companies', () => {
    const invalid = ASSUMPTIONS.filter(a => !validTickers.has(a.ticker));
    if (invalid.length > 0) {
      const list = invalid.map(a => `${a.ticker} (${a.field})`).join(', ');
      expect.fail(`Unknown tickers in assumption register: ${list}`);
    }
  });

  it('all dates must be valid ISO dates', () => {
    for (const a of ASSUMPTIONS) {
      const reviewed = new Date(a.lastReviewed);
      expect(reviewed.toString(), `${a.ticker}.${a.field} lastReviewed="${a.lastReviewed}" is not a valid date`).not.toBe('Invalid Date');
      expect(reviewed.getTime(), `${a.ticker}.${a.field} lastReviewed is in the future`).toBeLessThanOrEqual(today.getTime() + 86400000);

      if (a.resolvedDate) {
        const resolved = new Date(a.resolvedDate);
        expect(resolved.toString(), `${a.ticker}.${a.field} resolvedDate="${a.resolvedDate}" is not a valid date`).not.toBe('Invalid Date');
      }
    }
  });

  it('resolved assumptions must have resolvedDate and resolvedNotes', () => {
    const bad = ASSUMPTIONS.filter(a => a.status === 'resolved' && (!a.resolvedDate || !a.resolvedNotes));
    if (bad.length > 0) {
      const list = bad.map(a => `${a.ticker}.${a.field}`).join(', ');
      expect.fail(`Resolved assumptions missing resolvedDate/resolvedNotes: ${list}`);
    }
  });

  it(`open/monitoring assumptions must be reviewed within ${ASSUMPTION_REVIEW_MAX_AGE_DAYS} days`, () => {
    const stale = ASSUMPTIONS
      .filter(a => a.status !== 'resolved')
      .filter(a => {
        const reviewed = new Date(a.lastReviewed);
        return daysBetween(today, reviewed) > ASSUMPTION_REVIEW_MAX_AGE_DAYS;
      });

    if (stale.length > 0) {
      const list = stale.map(a => {
        const age = daysBetween(today, new Date(a.lastReviewed));
        return `${a.ticker}.${a.field} (${age}d since review)`;
      }).join('\n  ');
      expect.fail(`Assumptions overdue for review:\n  ${list}`);
    }
  });

  it('all required fields must be non-empty strings', () => {
    const requiredFields: (keyof typeof ASSUMPTIONS[0])[] = [
      'ticker', 'field', 'assumption', 'reason', 'trigger',
      'sourceNeeded', 'resolutionPath', 'sensitivity', 'materiality',
      'status', 'lastReviewed',
    ];

    for (const a of ASSUMPTIONS) {
      for (const f of requiredFields) {
        const val = a[f];
        expect(typeof val, `${a.ticker}.${a.field} missing required field "${f}"`).toBe('string');
        expect((val as string).length, `${a.ticker}.${a.field} field "${f}" is empty`).toBeGreaterThan(0);
      }
    }
  });

  it('no duplicate open assumptions for the same (ticker, field)', () => {
    const open = ASSUMPTIONS.filter(a => a.status !== 'resolved');
    const seen = new Set<string>();
    const dupes: string[] = [];

    for (const a of open) {
      const key = `${a.ticker}:${a.field}`;
      if (seen.has(key)) {
        dupes.push(key);
      }
      seen.add(key);
    }

    if (dupes.length > 0) {
      expect.fail(`Duplicate open assumptions: ${dupes.join(', ')}`);
    }
  });

  it('sensitivity must be low, medium, or high', () => {
    const valid = new Set(['low', 'medium', 'high']);
    const bad = ASSUMPTIONS.filter(a => !valid.has(a.sensitivity));
    if (bad.length > 0) {
      expect.fail(`Invalid sensitivity: ${bad.map(a => `${a.ticker}.${a.field}="${a.sensitivity}"`).join(', ')}`);
    }
  });

  it('materiality must be low, medium, or high', () => {
    const valid = new Set(['low', 'medium', 'high']);
    const bad = ASSUMPTIONS.filter(a => !valid.has(a.materiality));
    if (bad.length > 0) {
      expect.fail(`Invalid materiality: ${bad.map(a => `${a.ticker}.${a.field}="${a.materiality}"`).join(', ')}`);
    }
  });

  it('open assumptions must have non-blank resolutionPath and sourceNeeded', () => {
    const bad = ASSUMPTIONS
      .filter(a => a.status === 'open')
      .filter(a => !a.resolutionPath?.trim() || !a.sourceNeeded?.trim());

    if (bad.length > 0) {
      const list = bad.map(a => `${a.ticker}.${a.field}`).join(', ');
      expect.fail(`Open assumptions with blank resolutionPath or sourceNeeded: ${list}`);
    }
  });

  it('every low-confidence company must have an open assumption or pending merger', () => {
    const reviews = getAllCompanyReviews(allCompanies);
    const lowWithoutCoverage = reviews
      .filter(r => r.confidence === 'low')
      .filter(r => r.openAssumptions.length === 0)
      .filter(r => {
        const company = allCompanies.find(c => c.ticker === r.ticker);
        return !company?.pendingMerger;
      });

    if (lowWithoutCoverage.length > 0) {
      const list = lowWithoutCoverage.map(r =>
        `${r.ticker}: ${r.confidenceReasons.join('; ')}`
      ).join('\n  ');
      expect.fail(`Low-confidence companies with no assumption or pendingMerger:\n  ${list}`);
    }
  });
});
