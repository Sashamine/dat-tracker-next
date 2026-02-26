// Shared gating logic for scripts/llm-extract-artifacts.ts
// Keeping this in src/lib allows us to unit test it.

export function hkexBasicSharesAccept(params: { value: number; quote: string }): { ok: boolean; reason?: string } {
  const { value, quote } = params;

  if (value < 100_000_000) return { ok: false, reason: `value too small for hkex (${value})` };

  const q = (quote || '').toLowerCase();

  const needles = [
    'shares in issue',
    'issued share',
    'issued shares',
    'ordinary shares',
    'weighted average',
    'weighted-average',
    'number of units in issue',
  ];

  if (q.includes('unaudited')) return { ok: true };
  if (needles.some(n => q.includes(n))) return { ok: true };

  return { ok: false, reason: 'quote lacks shares-in-issue keywords (hkex)' };
}
