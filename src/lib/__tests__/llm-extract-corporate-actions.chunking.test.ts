import { describe, it, expect } from 'vitest';

function centeredChunk(text: string, centerIndex: number, radius = 8000): string {
  if (centerIndex < 0) return text.slice(0, Math.min(text.length, radius * 2));
  const start = Math.max(0, centerIndex - radius);
  const end = Math.min(text.length, centerIndex + radius);
  return text.slice(start, end);
}

function buildLlmText(text: string, primaryHitIndex: number | null): string {
  let llmText = primaryHitIndex != null ? centeredChunk(text, primaryHitIndex, 12000) : text;

  const tLower = text.toLowerCase();
  const splitAdjustedIdx = tLower.indexOf('split-adjusted');
  const splitAdjustedIdx2 = splitAdjustedIdx >= 0 ? splitAdjustedIdx : tLower.indexOf('split adjusted');
  if (splitAdjustedIdx2 >= 0) {
    const secondary = centeredChunk(text, splitAdjustedIdx2, 12000);
    if (!llmText.toLowerCase().includes('split-adjusted') && !llmText.toLowerCase().includes('split adjusted')) {
      llmText = `${llmText}\n\n---\n\n[secondary chunk: split-adjusted context]\n${secondary}`;
    }
  }

  return llmText;
}

describe('llm-extract-corporate-actions chunking', () => {
  it('includes a secondary chunk when split-adjusted appears far from the primary keyword hit', () => {
    const prefix = 'reverse stock splits '.repeat(50); // primary keyword near the start
    const middle = 'x'.repeat(60_000); // simulate long proxy doc
    const suffix = 'The Company\'s shares began trading on a split-adjusted basis on September 16, 2025 after a 1-for-200 reverse stock split.';
    const text = prefix + middle + suffix;

    // Pick a primary hit at the beginning so the primary chunk does NOT include the split-adjusted sentence.
    const llmText = buildLlmText(text, 10);
    expect(llmText).toContain('[secondary chunk: split-adjusted context]');
    expect(llmText).toContain('split-adjusted basis');
    expect(llmText).toContain('September 16, 2025');
  });

  it('does not append a secondary chunk when split-adjusted is already inside the primary chunk', () => {
    const text = 'reverse stock split 1-for-200 began trading on a split-adjusted basis on September 16, 2025';
    const llmText = buildLlmText(text, 5);
    expect(llmText).not.toContain('[secondary chunk: split-adjusted context]');
  });
});
