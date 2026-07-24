import { describe, expect, it } from 'vitest';
import { buildPreviewSnapshot } from '../../src/web/preview';

describe('browser preview snapshots', () => {
  it('builds readable markdown diffs for presentation-only changes', () => {
    const snapshot = buildPreviewSnapshot({
      sourceText: '# Heading\nBody',
      outputText: '**# Heading**\nBody',
      available: true,
      summary: 'Preview ready',
    });

    expect(snapshot.available).toBe(true);
    expect(snapshot.summary).toContain('Preview ready');
    expect(snapshot.diffs).toEqual([
      { line: 1, before: '# Heading', after: '**# Heading**' },
    ]);
  });

  it('marks unsupported formats as unavailable without pretending to compare content', () => {
    const snapshot = buildPreviewSnapshot({
      sourceText: '',
      outputText: '',
      available: false,
      summary: 'Preview unavailable for this format.',
    });

    expect(snapshot.available).toBe(false);
    expect(snapshot.diffs).toEqual([]);
    expect(snapshot.summary).toContain('Preview unavailable');
  });
});
