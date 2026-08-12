import { describe, expect, it } from 'vitest';
import { compareDocuments, normalizeContentTokens } from '../../../src/web/comparison/comparison-engine';

describe('normalizeContentTokens', () => {
  it('strips Markdown presentation markers but keeps content tokens ordered', () => {
    expect(normalizeContentTokens('# Heading\n- **bold** item\n> quote text')).toEqual(['Heading', 'bold', 'item', 'quote', 'text']);
  });

  it('collapses whitespace only', () => {
    expect(normalizeContentTokens('alpha   beta\n\tgamma')).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('is order-sensitive', () => {
    expect(normalizeContentTokens('a b c')).not.toEqual(normalizeContentTokens('c b a'));
  });
});

describe('exact content preservation', () => {
  const text = (sourceText: string, resultText: string, format: Parameters<typeof compareDocuments>[0]['sourceFormat'] = 'txt') =>
    compareDocuments({ sourceText, resultText, sourceFormat: format, resultFormat: format, validationStatus: 'pass' });

  it('flags identical text as preserved with no changes applied', () => {
    const result = text('one two three', 'one two three');
    expect(result.status).toBe('preserved');
    expect(result.noChangesApplied).toBe(true);
    expect(result.summary).toContain('preserved exactly');
  });

  it('accepts whitespace-only differences as preserved', () => {
    expect(text('one   two', 'one two').status).toBe('preserved');
  });

  it('rejects reworded content even with an identical word count', () => {
    const result = text('one two three', 'one two four');
    expect(result.status).toBe('content-changed');
    expect(result.noChangesApplied).toBe(false);
    expect(result.summary).toContain('not 100% identical');
  });

  it('rejects reordered content', () => {
    expect(text('one two three', 'three two one').status).toBe('content-changed');
  });

  it('rejects added words', () => {
    expect(text('one two', 'one two three').status).toBe('content-changed');
  });

  it('rejects case changes as content changes', () => {
    expect(text('Alpha Beta', 'alpha beta').status).toBe('content-changed');
  });

  it('treats Markdown emphasis markers as presentation, not content', () => {
    const result = text('# **Title**\nbody', '# Title\nbody', 'markdown');
    expect(result.status).toBe('preserved');
    expect(result.noChangesApplied).toBe(true);
  });

  it('reports added headings as content changes under exact rules', () => {
    const result = text('# Title\nbody', '# Title\n## Sub\nbody', 'markdown');
    expect(result.status).toBe('content-changed');
    expect(result.noChangesApplied).toBe(false);
  });

  it('applies the same exact rules to DOCX extracted text', () => {
    expect(text('a b c', 'a b c', 'docx').status).toBe('preserved');
    expect(text('a b c', 'a c b', 'docx').status).toBe('content-changed');
  });

  it('keeps PDF comparison unavailable', () => {
    const result = text('', '', 'pdf');
    expect(result.status).toBe('unavailable');
    expect(result.categories).toEqual(['unavailable']);
  });

  it('flags empty source documents as content-changed', () => {
    expect(text('', 'anything').status).toBe('content-changed');
  });
});