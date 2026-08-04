import { describe, expect, it } from 'vitest';
import { compareDocuments } from '../../../src/web/comparison/comparison-engine';

describe('comparison categories', () => {
  it('classifies identical text as preserved content', () => {
    const result = compareDocuments({ sourceText: 'one two three', resultText: 'one two three', sourceFormat: 'txt', resultFormat: 'txt', validationStatus: 'pass' });
    expect(result.status).toBe('preserved');
    expect(result.categories).toContain('content');
    expect(result.summary).toContain('preserved');
  });

  it('separates presentation changes from content preservation', () => {
    const body = 'word '.repeat(30).trim();
    const result = compareDocuments({
      sourceText: `# Heading\n${body}`,
      resultText: `# Heading\n## New section\n${body}`,
      sourceFormat: 'markdown',
      resultFormat: 'markdown',
      validationStatus: 'pass',
    });
    expect(result.status).toBe('presentation-changed');
    expect(result.categories).toContain('structure');
    expect(result.categories).not.toContain('unavailable');
    expect(result.rows.some((row) => row.kind === 'presentation')).toBe(true);
  });

  it('flags content changes when the word count diverges', () => {
    const result = compareDocuments({
      sourceText: 'one two three four five six seven eight nine ten',
      resultText: 'one two three',
      sourceFormat: 'txt',
      resultFormat: 'txt',
      validationStatus: 'fail',
    });
    expect(result.status).toBe('content-changed');
    expect(result.rows[0].kind).toBe('content');
    expect(result.summary).toContain('review before export');
  });

  it('returns explicit unavailable for PDF instead of guessing', () => {
    const result = compareDocuments({ sourceText: '', resultText: '', sourceFormat: 'pdf', resultFormat: 'pdf', validationStatus: 'pass' });
    expect(result.status).toBe('unavailable');
    expect(result.categories).toEqual(['unavailable']);
    expect(result.rows[0].kind).toBe('unavailable');
  });

  it('compares DOCX by extracted text and forwards validation', () => {
    const preserved = compareDocuments({ sourceText: 'a b c', resultText: 'a b c', sourceFormat: 'docx', resultFormat: 'docx', validationStatus: 'pass' });
    expect(preserved.status).toBe('preserved');
    expect(preserved.validation).toBe('pass');

    const changed = compareDocuments({ sourceText: 'a b c', resultText: 'a b c d e f g h i j k', sourceFormat: 'docx', resultFormat: 'docx', validationStatus: 'fail' });
    expect(changed.status).toBe('content-changed');
    expect(changed.validation).toBe('fail');
  });

  it('exposes at least one content row for every compared document', () => {
    const result = compareDocuments({ sourceText: 'hello world', resultText: 'hello world', sourceFormat: 'markdown', resultFormat: 'markdown', validationStatus: 'not-run' });
    expect(result.rows.some((row) => row.kind === 'content')).toBe(true);
  });
});
