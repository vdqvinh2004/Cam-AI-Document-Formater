import { describe, expect, it } from 'vitest';
import { diffWords } from '../../../src/web/lib/diff';

describe('diffWords', () => {
  it('returns empty array for identical empty strings', () => {
    expect(diffWords('', '')).toEqual([]);
  });

  it('returns all-added tokens when source is empty', () => {
    const tokens = diffWords('', 'hello world');
    expect(tokens).toHaveLength(2);
    expect(tokens.every((t) => t.type === 'added')).toBe(true);
    expect(tokens.map((t) => t.text).join('')).toBe('hello world');
  });

  it('returns all-removed tokens when result is empty', () => {
    const tokens = diffWords('hello world', '');
    expect(tokens).toHaveLength(2);
    expect(tokens.every((t) => t.type === 'removed')).toBe(true);
    expect(tokens.map((t) => t.text).join('')).toBe('hello world');
  });

  it('returns all-equal tokens for identical text', () => {
    const tokens = diffWords('hello world', 'hello world');
    expect(tokens.every((t) => t.type === 'equal')).toBe(true);
    expect(tokens.map((t) => t.text).join('')).toBe('hello world');
  });

  it('detects a single word change', () => {
    const tokens = diffWords('the cat sat', 'the dog sat');
    const types = tokens.map((t) => t.type);
    expect(types).toContain('removed');
    expect(types).toContain('added');
    expect(types).toContain('equal');
    // The full texts should reconstruct correctly
    const source = tokens.filter((t) => t.type !== 'added').map((t) => t.text).join('');
    const result = tokens.filter((t) => t.type !== 'removed').map((t) => t.text).join('');
    expect(source).toBe('the cat sat');
    expect(result).toBe('the dog sat');
  });

  it('detects an added word', () => {
    const tokens = diffWords('the cat', 'the big cat');
    const source = tokens.filter((t) => t.type !== 'added').map((t) => t.text).join('');
    const result = tokens.filter((t) => t.type !== 'removed').map((t) => t.text).join('');
    expect(source).toBe('the cat');
    expect(result).toBe('the big cat');
  });

  it('detects a removed word', () => {
    const tokens = diffWords('the big cat', 'the cat');
    const source = tokens.filter((t) => t.type !== 'added').map((t) => t.text).join('');
    const result = tokens.filter((t) => t.type !== 'removed').map((t) => t.text).join('');
    expect(source).toBe('the big cat');
    expect(result).toBe('the cat');
  });

  it('preserves whitespace in tokens', () => {
    const tokens = diffWords('hello world', 'hello world');
    expect(tokens.some((t) => t.type === 'equal' && t.text === ' ')).toBe(true);
  });

  it('handles heading rewrites (expected changes)', () => {
    const source = '# Section One\nBody text.';
    const result = '# 2.4 Section One\nBody text.';
    const tokens = diffWords(source, result);
    const sourceReconstructed = tokens.filter((t) => t.type !== 'added').map((t) => t.text).join('');
    const resultReconstructed = tokens.filter((t) => t.type !== 'removed').map((t) => t.text).join('');
    expect(sourceReconstructed).toBe(source);
    expect(resultReconstructed).toBe(result);
  });

  it('handles reordered sections by falling back to line-level diff for large texts', () => {
    const sectionA = 'Section A\n'.repeat(3000);
    const sectionB = 'Section B\n'.repeat(3000);
    const source = sectionA + sectionB;
    const result = sectionB + sectionA;
    const tokens = diffWords(source, result);
    // For large texts, should still reconstruct correctly
    const sourceReconstructed = tokens.filter((t) => t.type !== 'added').map((t) => t.text).join('');
    const resultReconstructed = tokens.filter((t) => t.type !== 'removed').map((t) => t.text).join('');
    expect(sourceReconstructed).toBe(source);
    expect(resultReconstructed).toBe(result);
  });
});
