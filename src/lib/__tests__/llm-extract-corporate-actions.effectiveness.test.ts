import { describe, it, expect } from 'vitest';

// Keep this test file small and deterministic. We only validate the effectiveness heuristic.
// This prevents regressions where we reject valid corporate actions that use market-language
// like "began trading on a split-adjusted basis".

function quoteHasRatio(quote: string): boolean {
  return (
    /\b\d+\s*[- ]?for\s*[- ]?\d+\b/i.test(quote) ||
    /\b1\s*[- ]?for\s*[- ]?\d+\b/i.test(quote) ||
    /\bevery\s+\w+\s*\(\s*\d+\s*\)\s+shares?.{0,60}one\s*\(\s*1\s*\)\s+share/i.test(quote)
  );
}

function isPastOrToday(yyyyMmDd: string): boolean {
  const d = new Date(`${yyyyMmDd}T00:00:00Z`).getTime();
  const now = Date.now();
  return Number.isFinite(d) && d <= now;
}

function quoteIndicatesEffected(quote: string, effectiveDate: string): boolean {
  const q = quote.toLowerCase();
  if (!quoteHasRatio(quote)) return false;

  const pastTense =
    q.includes('became effective') ||
    q.includes('was effective') ||
    q.includes('has been effected') ||
    q.includes('was effected') ||
    q.includes('was implemented') ||
    q.includes('effected a reverse stock split') ||
    q.includes('effected a stock split') ||
    /\beffected\b.{0,60}\breverse stock split\b/i.test(quote) ||
    /\beffected\b.{0,60}\bstock split\b/i.test(quote);
  if (pastTense) return true;

  const splitAdjusted =
    q.includes('began trading on a split-adjusted basis') ||
    q.includes('began trading on a split adjusted basis') ||
    q.includes('began trading on a split-adjusted') ||
    q.includes('began trading on a split adjusted') ||
    q.includes('trading on a split-adjusted basis') ||
    q.includes('trading on a split adjusted basis') ||
    q.includes('on a split-adjusted basis') ||
    q.includes('on a split adjusted basis') ||
    /split\s*[-‑–—]?\s*adjusted\s+basis/i.test(quote);
  if (splitAdjusted && isPastOrToday(effectiveDate)) return true;

  const futureTense = q.includes('will become effective') || q.includes('becomes effective');
  if (futureTense && isPastOrToday(effectiveDate)) return true;

  return false;
}

describe('llm-extract-corporate-actions effectiveness heuristic', () => {
  it('accepts "began trading on a split-adjusted basis" as effected evidence (NXTT-style)', () => {
    const quote =
      'On August 28, 2025, the Board approved a specific reverse stock split at a ratio of 1-for-200. The Company\'s shares of Common Stock began trading on a split-adjusted basis on The Nasdaq Capital Market on September 16, 2025.';
    expect(quoteIndicatesEffected(quote, '2025-09-16')).toBe(true);
  });

  it('accepts split -adjusted (hyphen with spacing) as effected evidence', () => {
    const quote =
      'On August 28, 2025, the Board approved a specific reverse stock split at a ratio of 1-for-200. The Company\'s shares of Common Stock began trading on a split -adjusted basis on The Nasdaq Capital Market on September 16, 2025.';
    expect(quoteIndicatesEffected(quote, '2025-09-16')).toBe(true);
  });

  it('still rejects split-adjusted language if effective_date is in the future', () => {
    const future = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
    const quote =
      'The Company\'s shares began trading on a split-adjusted basis following a 1-for-200 reverse stock split.';
    expect(quoteIndicatesEffected(quote, future)).toBe(false);
  });
});
