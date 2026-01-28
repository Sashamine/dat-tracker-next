import { describe, it, expect } from 'vitest';
import { quarterFromPeriodEnd, normalizeQuarterEnd } from './earnings-data';

describe('quarterFromPeriodEnd', () => {
  it('correctly identifies Q1 (Jan-Mar)', () => {
    expect(quarterFromPeriodEnd('2025-01-31')).toEqual({ year: 2025, quarter: 1 });
    expect(quarterFromPeriodEnd('2025-02-28')).toEqual({ year: 2025, quarter: 1 });
    expect(quarterFromPeriodEnd('2025-03-31')).toEqual({ year: 2025, quarter: 1 });
  });

  it('correctly identifies Q2 (Apr-Jun)', () => {
    expect(quarterFromPeriodEnd('2025-04-30')).toEqual({ year: 2025, quarter: 2 });
    expect(quarterFromPeriodEnd('2025-05-31')).toEqual({ year: 2025, quarter: 2 });
    expect(quarterFromPeriodEnd('2025-06-30')).toEqual({ year: 2025, quarter: 2 });
  });

  it('correctly identifies Q3 (Jul-Sep)', () => {
    expect(quarterFromPeriodEnd('2025-07-31')).toEqual({ year: 2025, quarter: 3 });
    expect(quarterFromPeriodEnd('2025-08-31')).toEqual({ year: 2025, quarter: 3 });
    expect(quarterFromPeriodEnd('2025-09-30')).toEqual({ year: 2025, quarter: 3 });
  });

  it('correctly identifies Q4 (Oct-Dec)', () => {
    expect(quarterFromPeriodEnd('2025-10-31')).toEqual({ year: 2025, quarter: 4 });
    expect(quarterFromPeriodEnd('2025-11-30')).toEqual({ year: 2025, quarter: 4 });
    expect(quarterFromPeriodEnd('2025-12-31')).toEqual({ year: 2025, quarter: 4 });
  });

  it('handles different years correctly', () => {
    expect(quarterFromPeriodEnd('2022-12-31')).toEqual({ year: 2022, quarter: 4 });
    expect(quarterFromPeriodEnd('2023-12-31')).toEqual({ year: 2023, quarter: 4 });
    expect(quarterFromPeriodEnd('2024-03-31')).toEqual({ year: 2024, quarter: 1 });
  });
});

describe('normalizeQuarterEnd', () => {
  it('normalizes Q1 dates to Mar 31', () => {
    expect(normalizeQuarterEnd('2025-01-15')).toBe('2025-03-31');
    expect(normalizeQuarterEnd('2025-02-28')).toBe('2025-03-31');
    expect(normalizeQuarterEnd('2025-03-31')).toBe('2025-03-31');
  });

  it('normalizes Q2 dates to Jun 30', () => {
    expect(normalizeQuarterEnd('2025-04-15')).toBe('2025-06-30');
    expect(normalizeQuarterEnd('2025-06-30')).toBe('2025-06-30');
  });

  it('normalizes Q3 dates to Sep 30', () => {
    expect(normalizeQuarterEnd('2025-07-15')).toBe('2025-09-30');
    expect(normalizeQuarterEnd('2025-09-30')).toBe('2025-09-30');
  });

  it('normalizes Q4 dates to Dec 31', () => {
    expect(normalizeQuarterEnd('2025-10-15')).toBe('2025-12-31');
    expect(normalizeQuarterEnd('2025-12-31')).toBe('2025-12-31');
  });
});
