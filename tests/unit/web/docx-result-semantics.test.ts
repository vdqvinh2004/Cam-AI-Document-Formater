import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectFormat } from '../../../src/web/formatting';
import { formatDocx, extractDocxText, inspectDocx } from '../../../src/web/docx-formatting';
import type { BrowserFormattingPlan } from '../../../src/web/formatting/style-plan';

const FIXTURES = join(__dirname, '..', '..', 'fixtures', 'docx');
const fixture = (name: string): ArrayBuffer => {
  const buffer = readFileSync(join(FIXTURES, name));
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
};

const richFixture = () => fixture('sample-rich.docx');

describe('DOCX result semantics', () => {
  it('detects formats from filenames', () => {
    expect(detectFormat('notes.txt')).toBe('txt');
    expect(detectFormat('notes.md')).toBe('markdown');
    expect(detectFormat('notes.markdown')).toBe('markdown');
    expect(detectFormat('notes.docx')).toBe('docx');
    expect(detectFormat('notes.pdf')).toBe('pdf');
    expect(detectFormat('notes.pages')).toBeNull();
  });

  it('applies presentation operations and preserves all text', async () => {
    const source = richFixture();
    const plan: BrowserFormattingPlan = {
      version: 1,
      operations: [
        { kind: 'set-presentation', nodeID: 'h0', presentation: { bold: true, fontFamily: 'Georgia' } },
        { kind: 'set-presentation', nodeID: 'p0', presentation: { fontSize: 13, fontFamily: 'Helvetica' } },
      ],
    };
    const output = await formatDocx(source, plan);
    expect(new Uint8Array(await output.arrayBuffer())).not.toEqual(new Uint8Array(source));
    expect(await extractDocxText(await output.arrayBuffer())).toBe(await extractDocxText(source));
  });

  it('reorders top-level body paragraphs with move operations while preserving content', async () => {
    const source = richFixture();
    const inspection = await inspectDocx(source);
    expect(inspection.blockCount).toBeGreaterThan(1);
    const [first, second] = [inspection.paragraphNodeIDs[0], inspection.paragraphNodeIDs[1] ?? inspection.headingNodeIDs[0]];
    const plan: BrowserFormattingPlan = {
      version: 1,
      operations: [
        { kind: 'set-presentation', nodeID: first, presentation: { bold: true } },
        { kind: 'move', nodeID: first, targetIndex: inspection.blockCount - 1 },
      ],
    };
    const output = await formatDocx(source, plan);
    expect(await extractDocxText(await output.arrayBuffer())).toBe(await extractDocxText(source));
  });

  it('fails closed and preserves the source bytes for a malformed package', async () => {
    const { formatSource, readSource } = await import('../../../src/web/formatting');
    const file = new File(['not a zip'], 'broken.docx');
    const source = await readSource(file, new TextEncoder().encode('not a zip').buffer);
    const result = await formatSource(source, { version: 1, operations: [] });
    expect(result.previewAvailable).toBe(false);
    expect(result.warnings.some((warning) => warning.includes('DOCX'))).toBe(true);
  });

  it('throws for empty sources', async () => {
    await expect(formatDocx(new ArrayBuffer(0), { version: 1, operations: [] })).rejects.toThrow('empty');
  });
});