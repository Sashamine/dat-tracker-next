import { describe, it, expect } from 'vitest';
import { applyD1Overlay } from './d1-overlay';
import type { Company } from './types';

/** Minimal company stub for testing divergence detection. */
function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'test',
    name: 'Test Corp',
    ticker: 'TEST',
    asset: 'BTC',
    tier: 1,
    holdings: 100,
    holdingsLastUpdated: '2026-01-01',
    holdingsSource: 'test',
    holdingsSourceUrl: '',
    datStartDate: '2025-01-01',
    sharesForMnav: 1_000_000,
    totalDebt: 500_000,
    cashReserves: 50_000,
    preferredEquity: 100_000,
    ...overrides,
  } as Company;
}

describe('D1 overlay divergence detection', () => {
  it('flags divergence >5% on shares', () => {
    const co = makeCompany({ sharesForMnav: 1_000_000 });
    const d1 = { TEST: { basic_shares: 700_000 } }; // 30% off
    const [result] = applyD1Overlay([co], d1);

    expect(result._d1Divergences).toBeDefined();
    const shareDiv = result._d1Divergences!.find(d => d.field === 'sharesForMnav');
    expect(shareDiv).toBeDefined();
    expect(shareDiv!.pct).toBeGreaterThan(5);
    expect(shareDiv!.d1).toBe(700_000);
    expect(shareDiv!.static).toBe(1_000_000);
  });

  it('does not flag divergence <=5%', () => {
    const co = makeCompany({ sharesForMnav: 1_000_000 });
    const d1 = { TEST: { basic_shares: 1_040_000 } }; // 4% off
    const [result] = applyD1Overlay([co], d1);

    const shareDiv = result._d1Divergences?.find(d => d.field === 'sharesForMnav');
    expect(shareDiv).toBeUndefined();
  });

  it('flags divergence on debt', () => {
    const co = makeCompany({ totalDebt: 500_000 });
    const d1 = { TEST: { debt_usd: 800_000 } }; // 60% off
    const [result] = applyD1Overlay([co], d1);

    const debtDiv = result._d1Divergences!.find(d => d.field === 'totalDebt');
    expect(debtDiv).toBeDefined();
    expect(debtDiv!.pct).toBe(60);
  });

  it('flags divergence on preferred equity', () => {
    const co = makeCompany({ preferredEquity: 155_000_000 });
    const d1 = { TEST: { preferred_equity_usd: 147_000_000 } }; // ~5.2% off
    const [result] = applyD1Overlay([co], d1);

    const prefDiv = result._d1Divergences!.find(d => d.field === 'preferredEquity');
    expect(prefDiv).toBeDefined();
  });

  it('flags divergence on holdings', () => {
    const co = makeCompany({ holdings: 35_102 });
    const d1 = { TEST: { holdings_native: 30_000 } }; // ~14.5% off
    const [result] = applyD1Overlay([co], d1);

    const holdDiv = result._d1Divergences!.find(d => d.field === 'holdings');
    expect(holdDiv).toBeDefined();
  });

  it('reports no divergences when D1 matches static', () => {
    const co = makeCompany({
      sharesForMnav: 1_000_000,
      totalDebt: 500_000,
      cashReserves: 50_000,
      preferredEquity: 100_000,
      holdings: 100,
    });
    const d1 = {
      TEST: {
        basic_shares: 1_000_000,
        debt_usd: 500_000,
        cash_usd: 50_000,
        preferred_equity_usd: 100_000,
        holdings_native: 100,
      },
    };
    const [result] = applyD1Overlay([co], d1);

    expect(result._d1Divergences).toBeUndefined();
  });

  it('catches the exact Metaplanet bug: 723M vs 1.167B shares', () => {
    const co = makeCompany({
      ticker: '3350.T',
      sharesForMnav: 1_166_803_340,
    });
    const d1 = { '3350.T': { basic_shares: 723_966_942 } }; // 38% off
    const [result] = applyD1Overlay([co], d1);

    const shareDiv = result._d1Divergences!.find(d => d.field === 'sharesForMnav');
    expect(shareDiv).toBeDefined();
    expect(shareDiv!.pct).toBeGreaterThanOrEqual(37);
    expect(shareDiv!.d1).toBe(723_966_942);
    expect(shareDiv!.static).toBe(1_166_803_340);
  });
});
