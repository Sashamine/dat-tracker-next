import { describe, it, expect } from 'vitest';
import { getNormalizationMultiplier, normalizeShares, normalizePrice } from './corporate-actions';

describe('corporate actions normalization (basis=current)', () => {
  it('applies split ratios after as_of when converting to current basis', () => {
    const actions = [
      { effective_date: '2024-06-01', ratio: 2 }, // 2-for-1 split
    ];

    expect(getNormalizationMultiplier(actions, '2024-05-01', 'current')).toBe(2);
    expect(normalizeShares(100, actions, '2024-05-01', 'current')).toBe(200);
    expect(normalizePrice(10, actions, '2024-05-01', 'current')).toBe(5);
  });

  it('does not apply actions on/before as_of for current basis', () => {
    const actions = [
      { effective_date: '2024-06-01', ratio: 2 },
    ];
    expect(getNormalizationMultiplier(actions, '2024-06-01', 'current')).toBe(1);
  });

  it('chains multiple actions', () => {
    const actions = [
      { effective_date: '2024-01-15', ratio: 0.1 }, // 1-for-10 reverse split
      { effective_date: '2024-06-01', ratio: 2 },   // 2-for-1 split
    ];

    // as_of before both: apply both => 0.2
    expect(getNormalizationMultiplier(actions, '2023-12-31', 'current')).toBeCloseTo(0.2);
    expect(normalizeShares(1000, actions, '2023-12-31', 'current')).toBeCloseTo(200);
    expect(normalizePrice(10, actions, '2023-12-31', 'current')).toBeCloseTo(50);
  });

  it('keeps shares*price invariant (within float tolerance)', () => {
    const actions = [
      { effective_date: '2024-06-01', ratio: 5 },
      { effective_date: '2025-01-01', ratio: 0.25 },
    ];
    const shares = 123.456;
    const price = 78.9;
    const asOf = '2024-05-01';

    const s2 = normalizeShares(shares, actions, asOf, 'current');
    const p2 = normalizePrice(price, actions, asOf, 'current');

    expect(s2 * p2).toBeCloseTo(shares * price, 10);
  });
});
