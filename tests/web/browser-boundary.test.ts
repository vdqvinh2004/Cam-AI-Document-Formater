import { readFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { detectFormat, readSource, requestFormattingPlan } from '../../src/web/formatting.js';

describe('browser product boundary', () => {
  it('recognizes supported formats and rejects native-only inputs', () => {
    expect(detectFormat('notes.txt')).toBe('txt');
    expect(detectFormat('notes.markdown')).toBe('markdown');
    expect(detectFormat('notes.docx')).toBe('docx');
    expect(detectFormat('notes.pages')).toBeNull();
  });

  it('reads supported files in memory and records a stable source hash', async () => {
    const source = await readSource(new File(['Heading\nBody'], 'notes.txt', { type: 'text/plain' }));
    expect(source.text).toBe('Heading\nBody');
    expect(source.sourceHash).toMatch(/^[0-9a-f]{64}$/);
    await expect(readSource(new File([''], 'empty.txt'))).rejects.toThrow('empty');
  });

  it('applies named styles locally and never calls Gemini without a key', async () => {
    const fetcher = vi.fn();
    const source = await readSource(new File(['Body'], 'notes.txt'));
    const { plan, aiUsed } = await requestFormattingPlan(source, 'modern', '', '', fetcher);
    expect(aiUsed).toBe(false);
    expect(plan.operations).toEqual([]);
    expect(fetcher).not.toHaveBeenCalled();

    const mdSource = await readSource(new File(['# Title\nBody'], 'notes.md'));
    const mdPlan = await requestFormattingPlan(mdSource, 'modern', '', '', fetcher);
    expect(mdPlan.aiUsed).toBe(false);
    expect(mdPlan.plan.operations.length).toBeGreaterThan(0);
    expect(fetcher).not.toHaveBeenCalled();

    await expect(requestFormattingPlan(mdSource, 'custom', 'make it bold', '', fetcher)).rejects.toThrow('API key');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('keeps native modules out of the browser source boundary', async () => {
    const files = ['src/web/main.tsx', 'src/web/formatting.ts', 'src/web/style-profiles.ts', 'src/web/api-key-storage.ts'];
    const source = await Promise.all(files.map((file) => readFile(file, 'utf8')));
    expect(source.join('\n')).not.toMatch(/from ['"](?:electron|keytar|node:|fs|path)/);
    expect(source.join('\n')).not.toMatch(/ipcRenderer|contextBridge|window\.camDoc/);
  });
});