import { describe, expect, it } from 'vitest';
import { applyMarkdownPlan, clarifyCustomInstructions, runCustomFormatting, verifyCustomResult, type BrowserSource } from '../../../src/web/formatting';
import { compareDocuments } from '../../../src/web/comparison/comparison-engine';
import { screenAiPlan } from '../../../src/web/formatting/style-plan';
import { extractDocxText, formatDocx, inspectDocx } from '../../../src/web/docx-formatting';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function mdSource(text: string): BrowserSource {
  const file = new File([text], 'notes.md', { type: 'text/markdown' });
  return { file, format: 'markdown', text, sourceHash: 'hash' };
}

const MD_TEXT = '# Title\nFirst paragraph of the document.\n\n## Section One\nMore body text here.\n\n- list item one\n- list item two';

function stagedFetcher(stages: Array<{ when: (body: string) => boolean; text: string; consume?: boolean }>): typeof fetch {
  return (async (_url: string, init?: RequestInit) => {
    const body = String(init?.body);
    const index = stages.findIndex((stage) => stage.when(body));
    const match = index === -1 ? undefined : stages[index];
    if (match?.consume) stages.splice(index, 1);
    const text = match?.text ?? '{"version":1,"operations":[]}';
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
}

const planText = (plan: unknown) => JSON.stringify(plan);

describe('rewrite-text screening and application', () => {
  it('keeps rewrite-text operations that target known headings', () => {
    const nodes = new Set(['h0', 'h3', 'p1', 'p4']);
    const headings = new Set(['h0', 'h3']);
    const { plan, warnings } = screenAiPlan(
      { version: 1, operations: [{ kind: 'rewrite-text', nodeID: 'h3', text: '# 2.4 Section One' } as never], warnings: [] },
      nodes,
      6,
      headings
    );
    expect(warnings).toEqual([]);
    expect(plan.operations).toEqual([{ kind: 'rewrite-text', nodeID: 'h3', text: '# 2.4 Section One' }]);
  });

  it('rejects rewrite-text for paragraphs, unknown nodes, and invalid text', () => {
    const nodes = new Set(['h0', 'p1']);
    const headings = new Set(['h0']);
    const { plan, warnings } = screenAiPlan(
      {
        version: 1,
        warnings: [],
        operations: [
          { kind: 'rewrite-text', nodeID: 'p1', text: 'body rewrite' } as never,
          { kind: 'rewrite-text', nodeID: 'nope', text: 'ghost' } as never,
          { kind: 'rewrite-text', nodeID: 'h0', text: '   ' } as never,
          { kind: 'rewrite-text', nodeID: 'h0', text: 'x'.repeat(201) } as never,
        ],
      },
      nodes,
      4,
      headings
    );
    expect(warnings).toHaveLength(4);
    expect(plan.operations).toEqual([]);
  });

  it('applies rewrite-text by replacing the full Markdown heading line', () => {
    const plan = {
      version: 1,
      operations: [
        { kind: 'rewrite-text', nodeID: 'h3', text: '# 2.4 Section One' },
        { kind: 'rewrite-text', nodeID: 'h0', text: '# Renumbered Title' },
      ],
      warnings: [],
    };
    const output = applyMarkdownPlan(MD_TEXT, plan);
    expect(output).toContain('# Renumbered Title');
    expect(output).toContain('# 2.4 Section One');
    expect(output).toContain('First paragraph of the document.');
    expect(output.split(/\r?\n/)).toHaveLength(MD_TEXT.split(/\r?\n/).length);
  });

  it('rewrites a DOCX heading text while keeping the paragraph structure and body paragraphs', async () => {
    const buffer = readFileSync(join(__dirname, '..', '..', 'fixtures', 'docx', 'sample-rich.docx'));
    const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const sourceText = await extractDocxText(bytes);

    const rewriteOp = { kind: 'rewrite-text', nodeID: 'h0', text: 'Renumbered Title' };
    const blob = await formatDocx(bytes, { version: 1, operations: [rewriteOp] });
    const resultText = await extractDocxText(await blob.arrayBuffer());

    expect(resultText).toContain('Renumbered Title');
    expect(resultText).not.toContain(sourceText.split('\n')[0]);
    expect(resultText.split('\n').length).toBe(sourceText.split('\n').length);
  });
});

describe('clarifyCustomInstructions', () => {
  it('parses clarified description and content-impact flag', async () => {
    const fetcher = stagedFetcher([{
      when: () => true,
      text: JSON.stringify({ clarifiedDescription: 'Make all headings bold, 16pt, and renumber them in order', affectsContent: true, reason: 'Renumbering changes heading text' }),
    }]);
    const result = await clarifyCustomInstructions('in đậm tiêu đề và đánh số lại', 'markdown', 'key', fetcher);
    expect(result).toEqual({
      clarifiedDescription: 'Make all headings bold, 16pt, and renumber them in order',
      affectsContent: true,
      reason: 'Renumbering changes heading text',
    });
  });

  it('returns null when the AI responds with invalid JSON', async () => {
    const fetcher = stagedFetcher([{ when: () => true, text: 'not json at all' }]);
    expect(await clarifyCustomInstructions('make it nice', 'markdown', 'key', fetcher)).toBeNull();
  });
});

describe('verifyCustomResult', () => {
  it('parses a matching verification', async () => {
    const fetcher = stagedFetcher([{ when: () => true, text: JSON.stringify({ matches: true, reason: 'All requests satisfied', operations: [] }) }]);
    const result = await verifyCustomResult('bold everything', 'text', 'source', 'markdown', 'key', fetcher);
    expect(result).toEqual({ matches: true, reason: 'All requests satisfied', operations: [] });
  });

  it('parses corrective operations from a failed verification', async () => {
    const fetcher = stagedFetcher([{
      when: () => true,
      text: JSON.stringify({ matches: false, reason: 'Heading not renumbered', operations: [{ kind: 'rewrite-text', nodeID: 'h3', text: '# 2.4 Section One' }] }),
    }]);
    const result = await verifyCustomResult('renumber headings', 'text', 'source', 'markdown', 'key', fetcher);
    expect(result?.matches).toBe(false);
    expect(result?.operations).toEqual([{ kind: 'rewrite-text', nodeID: 'h3', text: '# 2.4 Section One' }]);
  });

  it('sends the source text so an unchanged result cannot be rubber-stamped', async () => {
    let requestBody = '';
    const fetcher = async (_url: string, init?: RequestInit) => {
      requestBody = String(init?.body);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"matches":true,"reason":"ok","operations":[]}' }] } }] }), { status: 200 });
    };
    await verifyCustomResult('move section two before section one', 'FIRST\nSECOND', 'FIRST\nSECOND', 'markdown', 'key', fetcher as typeof fetch);
    const promptText = JSON.parse(requestBody).contents[0].parts[0].text as string;
    expect(promptText).toContain('Source text:');
    expect(promptText).toContain('FIRST\nSECOND');
    expect(promptText).toContain('Formatted text:');
    expect(promptText).toContain('FIRST\nSECOND');
    expect(promptText).toContain('formatted text is identical to the source text, "matches" MUST be false');
  });
});

describe('runCustomFormatting', () => {
  it('repairs an empty plan when the verification stage can suggest a valid move from the node map', async () => {
    const buffer = readFileSync(join(__dirname, '..', '..', 'fixtures', 'docx', 'sample-rich.docx'));
    const bytes = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
    const file = new File([bytes], 'sample-rich.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const source: BrowserSource = { file, format: 'docx', text: '', sourceHash: 'hash' };
    const inspection = await inspectDocx(bytes);

    const fetcher = stagedFetcher([
      {
        when: (body) => body.includes('plan a document-formatting step'),
        text: JSON.stringify({ clarifiedDescription: 'Move the Introduction section to the end of the document', affectsContent: false, reason: '' }),
      },
      {
        when: (body) => body.includes('Return JSON only matching'),
        text: planText({ version: 1, operations: [], warnings: [] }),
      },
      {
        when: (body) => body.includes('verify a document-formatting'),
        text: JSON.stringify({ matches: false, reason: 'Introduction was not moved', operations: [{ kind: 'move', nodeID: 'h1', targetIndex: inspection.blockCount - 1 }] }),
        consume: true,
      },
      {
        when: (body) => body.includes('verify a document-formatting'),
        text: JSON.stringify({ matches: true, reason: 'Introduction moved to the end', operations: [] }),
        consume: true,
      },
    ]);

    const outcome = await runCustomFormatting(source, 'move the Introduction section to the end', 'key', fetcher);
    expect(outcome.refinements).toBe(1);
    expect(outcome.verificationNote).toBe('AI verified the result matches your description.');
    expect(outcome.plan.operations.some((op) => op.kind === 'move' && op.nodeID === 'h1')).toBe(true);

    const resultText = await extractDocxText(await outcome.formatted.blob.arrayBuffer());
    const sourceText = await extractDocxText(bytes);
    expect(resultText.split('\n').filter(Boolean).sort()).toEqual(sourceText.split('\n').filter(Boolean).sort());
    expect(resultText.indexOf('Introduction')).toBeGreaterThan(resultText.indexOf('End of document.'));
  });

  it('sends the node map to the verification stage so corrective operations use valid node IDs', async () => {
    let requestBody = '';
    const fetcher = async (_url: string, init?: RequestInit) => {
      requestBody = String(init?.body);
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"matches":true,"reason":"ok","operations":[]}' }] } }] }), { status: 200 });
    };
    await verifyCustomResult('move section two before section one', 'FIRST\nSECOND', 'FIRST\nSECOND', 'markdown', 'key', fetcher as typeof fetch, 'h0: "# Title"\np1: "First paragraph"');
    const promptText = JSON.parse(requestBody).contents[0].parts[0].text as string;
    expect(promptText).toContain('Document nodes:');
    expect(promptText).toContain('h0: "# Title"');
    expect(promptText).toContain('p1: "First paragraph"');
    expect(promptText).toContain('Operations must reference node IDs listed in "Document nodes"');
  });

  it('clarifies, formulates, verifies, and refines once until the result matches', async () => {
    const fetcher = stagedFetcher([
      {
        when: (body) => body.includes('plan a document-formatting step'),
        text: JSON.stringify({ clarifiedDescription: 'Move the title section down and renumber section headings', affectsContent: true, reason: 'Renumbering changes heading text' }),
      },
      {
        when: (body) => body.includes('Return JSON only matching'),
        text: planText({
          version: 1,
          operations: [
            { kind: 'move', nodeID: 'h0', targetIndex: 2 },
            { kind: 'rewrite-text', nodeID: 'h3', text: '# 2.1 Section One' },
          ],
          warnings: [],
        }),
      },
      {
        when: (body) => body.includes('verify a document-formatting'),
        text: JSON.stringify({ matches: false, reason: 'Wrong heading number', operations: [{ kind: 'rewrite-text', nodeID: 'h3', text: '# 2.4 Section One' }] }),
        consume: true,
      },
      {
        when: (body) => body.includes('verify a document-formatting'),
        text: JSON.stringify({ matches: true, reason: 'All requests satisfied', operations: [] }),
        consume: true,
      },
    ]);

    const outcome = await runCustomFormatting(mdSource(MD_TEXT), 'move the title down and renumber sections', 'key', fetcher);
    expect(outcome.refinements).toBe(1);
    expect(outcome.verificationNote).toBe('AI verified the result matches your description.');
    expect(outcome.clarificationAffectsContent).toBe(true);
    expect(outcome.warnings.some((w) => w.includes('Renumbering changes heading text'))).toBe(true);
    expect(outcome.expectedTextChanges).toEqual([{ source: '## Section One', replacement: '# 2.4 Section One' }]);

    const outputText = await outcome.formatted.blob.text();
    expect(outputText).toContain('# 2.4 Section One');
    expect(outcome.plan.operations.some((op) => op.kind === 'move')).toBe(true);
    expect(outcome.plan.operations.some((op) => op.kind === 'rewrite-text')).toBe(true);
  });

  it('caps refinement at two rounds even when the AI never reports a match', async () => {
    const fetcher = stagedFetcher([
      {
        when: (body) => body.includes('plan a document-formatting step'),
        text: JSON.stringify({ clarifiedDescription: 'Renumber all headings', affectsContent: true, reason: '' }),
      },
      {
        when: (body) => body.includes('Return JSON only matching'),
        text: planText({ version: 1, operations: [{ kind: 'rewrite-text', nodeID: 'h3', text: '# 2.1 Section One' }], warnings: [] }),
      },
      {
        when: (body) => body.includes('verify a document-formatting'),
        text: JSON.stringify({ matches: false, reason: 'Still wrong', operations: [{ kind: 'rewrite-text', nodeID: 'h3', text: '# 2.2 Section One' }] }),
      },
    ]);

    const outcome = await runCustomFormatting(mdSource(MD_TEXT), 'renumber all headings', 'key', fetcher);
    expect(outcome.refinements).toBe(2);
    expect(outcome.verificationNote).toBe('The result could not fully match your description after refinements; reviewing the last result.');
  });

  it('screens corrective operations before merging them', async () => {
    const fetcher = stagedFetcher([
      {
        when: (body) => body.includes('plan a document-formatting step'),
        text: JSON.stringify({ clarifiedDescription: 'Rename the title', affectsContent: true, reason: '' }),
      },
      {
        when: (body) => body.includes('Return JSON only matching'),
        text: planText({ version: 1, operations: [], warnings: [] }),
      },
      {
        when: (body) => body.includes('verify a document-formatting'),
        text: JSON.stringify({ matches: false, reason: 'Rewrite a paragraph', operations: [{ kind: 'rewrite-text', nodeID: 'p1', text: 'paragraph text' }] }),
      },
    ]);

    const outcome = await runCustomFormatting(mdSource(MD_TEXT), 'rename the title', 'key', fetcher);
    expect(outcome.refinements).toBe(0);
    expect(outcome.verificationNote).toBe('AI verification could not suggest corrective changes; proceeding with the current result.');
  });

  it('strips expected rewrites from content comparison so renumbering does not block export', async () => {
    const sourceText = MD_TEXT;
    const resultText = MD_TEXT.replace('## Section One', '# 2.4 Section One');

    const comparison = compareDocuments({
      sourceText,
      resultText,
      sourceFormat: 'markdown',
      resultFormat: 'markdown',
      validationStatus: 'not-run',
      appliedChanges: 1,
      allowReorder: true,
      expectedTextChanges: [{ source: '## Section One', replacement: '# 2.4 Section One' }],
    });
    expect(comparison.status).toBe('presentation-changed');
    expect(comparison.rows.some((row) => row.location === 'Rewritten headings')).toBe(true);
  });

  it('still flags content edits that were not expected', async () => {
    const comparison = compareDocuments({
      sourceText: MD_TEXT,
      resultText: MD_TEXT.replace('More body text here.', 'Replaced body text.'),
      sourceFormat: 'markdown',
      resultFormat: 'markdown',
      validationStatus: 'not-run',
      appliedChanges: 1,
      allowReorder: true,
    });
    expect(comparison.status).toBe('content-changed');
  });
});