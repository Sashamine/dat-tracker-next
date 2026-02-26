import { describe, expect, it } from 'vitest';
import { hkexBasicSharesAccept } from '../llm-extract-artifacts-gates';

describe('llm-extract-artifacts gating', () => {
  it('rejects HKEX basic_shares when value too small', () => {
    const res = hkexBasicSharesAccept({
      value: 52_500_000,
      quote: 'Number of units in issue at the end of the period 52,500,000',
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toContain('value too small');
  });

  it('accepts HKEX basic_shares when value is large and quote contains unaudited', () => {
    const res = hkexBasicSharesAccept({
      value: 770_976_730,
      quote: 'At 30 September 2025 (unaudited) 770,976,730 39 301',
    });
    expect(res.ok).toBe(true);
  });
});
