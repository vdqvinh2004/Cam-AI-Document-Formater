import { describe, expect, it } from 'vitest';
import { BrowserFormatAdapter, createFormatAdapter } from '../../../src/web/api/format-adapter';

function bytesOf(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer;
}

function textOf(buffer: ArrayBuffer): string {
  return new TextDecoder('utf-8').decode(buffer);
}

describe('DOCX result semantics', () => {
  it('never claims formatting is available for DOCX', async () => {
    const source = bytesOf('not a real docx');
    const result = await createFormatAdapter('docx').format(source, { style: 'modern' });
    expect(result.formattingAvailable).toBe(false);
    expect(result.warnings.some((warning) => warning.includes('DOCX'))).toBe(true);
    expect(new Uint8Array(await result.blob.arrayBuffer())).toEqual(new Uint8Array(source));
  });

  it('never claims formatting is available for PDF', async () => {
    const source = bytesOf('%PDF-1.7 source');
    const result = await createFormatAdapter('pdf').format(source, { style: 'modern' });
    expect(result.formattingAvailable).toBe(false);
    expect(result.warnings.some((warning) => warning.includes('PDF'))).toBe(true);
  });

  it('returns the original DOCX bytes untouched when formatting is unavailable', async () => {
    const source = bytesOf('original bytes must round-trip');
    const result = await createFormatAdapter('docx').format(source, { style: 'academic', instructions: 'rewrite this' });
    const output = new Uint8Array(await result.blob.arrayBuffer());
    expect(output).toEqual(new Uint8Array(source));
    expect(textOf(await result.blob.arrayBuffer())).toBe('original bytes must round-trip');
  });

  it('offers formatting for TXT and Markdown', async () => {
    const txt = await createFormatAdapter('txt').format(bytesOf('Body text'), { style: 'modern' });
    expect(txt.formattingAvailable).toBe(true);
    expect(txt.warnings).toEqual([]);
    const md = await createFormatAdapter('markdown').format(bytesOf('# Heading'), { style: 'modern' });
    expect(md.formattingAvailable).toBe(true);
  });

  it('detects formats from filenames', () => {
    const adapter = createFormatAdapter('txt');
    expect(adapter.detect(bytesOf(''), 'notes.txt').format).toBe('txt');
    expect(adapter.detect(bytesOf(''), 'notes.md').format).toBe('markdown');
    expect(adapter.detect(bytesOf(''), 'notes.docx').format).toBe('docx');
    expect(adapter.detect(bytesOf(''), 'notes.pdf').format).toBe('pdf');
  });

  it('passes validation only when content survives round-trip', async () => {
    const adapter = new BrowserFormatAdapter('txt');
    expect((await adapter.validateRoundTrip('One Two', 'One Two')).status).toBe('pass');
    expect((await adapter.validateRoundTrip('One Two', 'One Two Three Four')).status).toBe('fail');
  });
});
