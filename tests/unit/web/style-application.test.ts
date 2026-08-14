import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { requestFormattingPlan, formatSource, applyMarkdownPlan, type BrowserSource } from '../../../src/web/formatting';
import { compareDocuments, normalizeContentTokens } from '../../../src/web/comparison/comparison-engine';
import { extractDocxText } from '../../../src/web/docx-formatting';
import { buildMarkdownBlocks, screenAiPlan } from '../../../src/web/formatting/style-plan';
import type { BrowserFormattingPlan } from '../../../src/web/formatting/style-plan';

const NAMED_STYLES = ['simple', 'modern', 'professional', 'easy-to-read', 'academic'] as const;

function mdSource(text: string): BrowserSource {
  const file = new File([text], 'notes.md', { type: 'text/markdown' });
  return {
    file,
    format: 'markdown',
    text,
    sourceHash: 'hash',
  };
}

const MD_TEXT = '# Title\nFirst paragraph of the document.\n\n## Section One\nMore body text here.\n\n- list item one\n- list item two';

describe('style application matrix', () => {
  it.each(NAMED_STYLES)('applies %s locally without Gemini and produces a different result', async (style) => {
    const source = mdSource(MD_TEXT);
    const { plan, aiUsed } = await requestFormattingPlan(source, style, '', '');
    expect(aiUsed).toBe(false);
    expect(plan.operations.length).toBeGreaterThan(0);

    const result = await formatSource(source, plan);
    const outputText = await result.blob.text();
    expect(outputText).not.toBe(MD_TEXT);

    const comparison = compareDocuments({
      sourceText: MD_TEXT,
      resultText: outputText,
      sourceFormat: 'markdown',
      resultFormat: 'markdown',
      validationStatus: 'not-run',
      appliedChanges: plan.operations.length,
    });
    expect(comparison.status).not.toBe('content-changed');
    expect(comparison.noChangesApplied).toBe(false);
    expect(normalizeContentTokens(outputText)).toEqual(normalizeContentTokens(MD_TEXT));
  });

  it.each(NAMED_STYLES)('formats DOCX with %s and keeps 100% of the content', async (style) => {
    const buffer = readFileSync(join(__dirname, '..', '..', 'fixtures', 'docx', 'sample-rich.docx'));
    const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const file = new File([bytes], 'sample-rich.docx');
    const source: BrowserSource = { file, format: 'docx', text: '', sourceHash: 'hash' };

    const { plan } = await requestFormattingPlan(source, style, '', '');
    expect(plan.operations.length).toBeGreaterThan(0);

    const result = await formatSource(source, plan);
    const outputBytes = await result.blob.arrayBuffer();
    expect(Buffer.from(new Uint8Array(outputBytes)).equals(buffer)).toBe(false);

    const sourceText = await extractDocxText(bytes);
    const resultText = await extractDocxText(outputBytes);
    expect(resultText).toBe(sourceText);

    const comparison = compareDocuments({
      sourceText,
      resultText,
      sourceFormat: 'docx',
      resultFormat: 'docx',
      validationStatus: 'not-run',
      appliedChanges: plan.operations.length,
    });
    expect(comparison.status).not.toBe('content-changed');
    expect(comparison.noChangesApplied).toBe(false);
  });

  it('produces distinct DOCX outputs for every named style', async () => {
    const buffer = readFileSync(join(__dirname, '..', '..', 'fixtures', 'docx', 'sample-rich.docx'));
    const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const file = new File([bytes], 'sample-rich.docx');
    const source: BrowserSource = { file, format: 'docx', text: '', sourceHash: 'hash' };

    const outputs = new Set<string>();
    for (const style of NAMED_STYLES) {
      const { plan } = await requestFormattingPlan(source, style, '', '');
      const result = await formatSource(source, plan);
      const digest = Buffer.from(new Uint8Array(await result.blob.arrayBuffer())).toString('base64');
      outputs.add(digest);
    }
    expect(outputs.size).toBe(NAMED_STYLES.length);
  });
});

describe('custom style', () => {
  it('rejects an empty description before calling Gemini', async () => {
    const source = mdSource(MD_TEXT);
    await expect(requestFormattingPlan(source, 'custom', '   ', 'test-key')).rejects.toThrow('Describe the custom style');
  });

  it('requires an API key for custom style', async () => {
    const source = mdSource(MD_TEXT);
    await expect(requestFormattingPlan(source, 'custom', 'move the intro down', '')).rejects.toThrow('API key');
  });

  it('applies AI presentation and move operations while preserving complete content', async () => {
    const source = mdSource(MD_TEXT);
    const fetcher = async () => new Response(
      JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({
        version: 1,
        operations: [
          { kind: 'move', nodeID: 'h0', targetIndex: 2 },
          { kind: 'set-presentation', nodeID: 'p2', presentation: { bold: true, fontFamily: 'Georgia' } },
        ],
      }) }] } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } }
    );
    const { plan, aiUsed } = await requestFormattingPlan(source, 'custom', 'move the title section down', 'test-key', fetcher as typeof fetch);
    expect(aiUsed).toBe(true);
    expect(plan.operations.some((op) => op.kind === 'move')).toBe(true);

    const output = applyMarkdownPlan(MD_TEXT, plan);
    expect(output).not.toBe(MD_TEXT);
    const blocks = buildMarkdownBlocks(MD_TEXT);
    expect(blocks.some((block) => block.nodeID === 'h0')).toBe(true);

    const comparison = compareDocuments({
      sourceText: MD_TEXT,
      resultText: output,
      sourceFormat: 'markdown',
      resultFormat: 'markdown',
      validationStatus: 'not-run',
      appliedChanges: plan.operations.length,
      allowReorder: true,
    });
    expect(comparison.status).toBe('presentation-changed');
    expect(comparison.noChangesApplied).toBe(false);
    expect(normalizeContentTokens(output).sort()).toEqual(normalizeContentTokens(MD_TEXT).sort());
  });

  it('screens out invalid, content-changing, and unknown AI operations', async () => {
    const nodes = new Set(['h0', 'p0', 'p1', 'p2']);
    const { plan, warnings } = screenAiPlan(
      {
        version: 1,
        operations: [
          { kind: 'rewrite', nodeID: 'p0', text: 'changed' } as never,
          { kind: 'set-presentation', nodeID: 'nope', presentation: { bold: true } } as never,
          { kind: 'move', nodeID: 'h0', targetIndex: 99 } as never,
          { kind: 'move', nodeID: 'h0', targetIndex: 0 } as never,
          { kind: 'set-presentation', nodeID: 'p1', presentation: { fontSize: 300 } } as never,
          { kind: 'set-presentation', nodeID: 'p0', presentation: { bold: true, italic: false } } as never,
        ],
      },
      nodes,
      4
    );
    expect(warnings.length).toBeGreaterThanOrEqual(4);
    expect(plan.operations).toEqual([
      { kind: 'move', nodeID: 'h0', targetIndex: 0 },
      { kind: 'set-presentation', nodeID: 'p0', presentation: { bold: true, italic: false } },
    ]);
  });

  it('honors an empty AI plan when the user asked to keep the format unchanged', async () => {
    const source = mdSource(MD_TEXT);
    const { plan, aiUsed } = await requestFormattingPlan(source, 'custom', 'giữ nguyên format, chỉ đổi vị trí các mục', 'key', async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[],"warnings":[]}' }] } }] }), { status: 200 }));
    expect(aiUsed).toBe(true);
    expect(plan.operations).toEqual([]);
    const output = applyMarkdownPlan(MD_TEXT, plan);
    expect(output).toBe(MD_TEXT);
    const comparison = compareDocuments({
      sourceText: MD_TEXT,
      resultText: output,
      sourceFormat: 'markdown',
      resultFormat: 'markdown',
      validationStatus: 'not-run',
      appliedChanges: 0,
      allowReorder: true,
    });
    expect(comparison.noChangesApplied).toBe(true);
  });

  it('sends the document node map in the Gemini prompt so the AI can target sections', async () => {
    const source = mdSource(MD_TEXT);
    let requestBody = '';
    const fetcher = async (_url: string, init?: RequestInit) => {
      requestBody = String(init?.body);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"version":1,"operations":[]}' }] } }] }), { status: 200 });
    };
    await requestFormattingPlan(source, 'custom', 'move section two before section one', 'key', fetcher as typeof fetch);
    const promptText = JSON.parse(requestBody).contents[0].parts[0].text as string;
    expect(promptText).toContain(`h0: "# Title"`);
    expect(promptText).toContain(`p1: "First paragraph`);
    expect(promptText).toContain('Instructions: move section two before section one');
    expect(promptText).toContain('Document nodes:');
    expect(promptText).not.toContain('Style: {"');
  });
});