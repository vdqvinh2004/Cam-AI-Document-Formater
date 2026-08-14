import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
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

  it('splits heading and paragraph node IDs correctly and reports the block count', async () => {
    const inspection = await inspectDocx(richFixture());
    expect(inspection.headingNodeIDs).toEqual(['h0', 'h1', 'h2', 'h3', 'h4']);
    expect(inspection.paragraphNodeIDs[0]).toBe('p0');
    expect(inspection.paragraphNodeIDs.length).toBeGreaterThanOrEqual(5);
    expect(inspection.blockCount).toBe(5);
  });

  it('moves a whole section (heading plus its content) without losing content', async () => {
    const source = richFixture();
    const inspection = await inspectDocx(source);
    const introduction = inspection.headingNodeIDs[1]; // h1: 'Introduction'
    const plan: BrowserFormattingPlan = {
      version: 1,
      operations: [{ kind: 'move', nodeID: introduction, targetIndex: inspection.blockCount - 1 }],
    };
    const output = await formatDocx(source, plan);
    const sourceText = await extractDocxText(source);
    const resultText = await extractDocxText(await output.arrayBuffer());

    expect(resultText.indexOf('Introduction')).toBeGreaterThan(resultText.indexOf('End of document.'));
    expect(resultText).toContain('This paragraph contains a hyperlink to an external site.');
    expect(resultText.split('\n').filter(Boolean).sort()).toEqual(sourceText.split('\n').filter(Boolean).sort());
  });

  it('moves a section including its table when the table follows the section heading', async () => {
    const source = richFixture();
    const inspection = await inspectDocx(source);
    const dataTable = inspection.headingNodeIDs[3]; // h3: 'Data Table' followed by a w:tbl
    const plan: BrowserFormattingPlan = {
      version: 1,
      operations: [{ kind: 'move', nodeID: dataTable, targetIndex: inspection.blockCount - 1 }],
    };
    const output = await formatDocx(source, plan);
    const sourceText = await extractDocxText(source);
    const resultText = await extractDocxText(await output.arrayBuffer());

    expect(resultText.indexOf('End of document.')).toBeLessThan(resultText.indexOf('Data Table'));
    expect(resultText).toContain('Name');
    expect(resultText).toContain('2');
    expect(resultText.split('\n').filter(Boolean).sort()).toEqual(sourceText.split('\n').filter(Boolean).sort());
  });

  it('fails closed and preserves the source bytes for a malformed package', async () => {
    const { formatSource, readSource } = await import('../../../src/web/formatting');
    const file = new File(['not a zip'], 'broken.docx');
    const source = await readSource(file, new TextEncoder().encode('not a zip').buffer);
    const result = await formatSource(source, { version: 1, operations: [] });
    expect(result.previewAvailable).toBe(false);
    expect(result.warnings.some((warning) => warning.includes('DOCX'))).toBe(true);
  });

  it('rewrites a heading split across many runs into the exact replacement text', async () => {
    const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Ph</w:t></w:r><w:proofErr w:type="spellStart"/><w:r><w:t>ân</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r><w:t xml:space="preserve"> tích các chỉ tiêu </w:t></w:r><w:r><w:t>tài chính</w:t></w:r></w:p>
    <w:p><w:r><w:t>Body paragraph.</w:t></w:r></w:p>
  </w:body>
</w:document>`;
    const zip = new JSZip();
    zip.file('word/document.xml', documentXml);
    zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    const bytes = await zip.generateAsync({ type: 'arraybuffer' });

    const inspection = await inspectDocx(bytes);
    expect(inspection.headingNodeIDs.length).toBe(1);

    const plan: BrowserFormattingPlan = {
      version: 1,
      operations: [{ kind: 'rewrite-text', nodeID: 'h0', text: '2.5 Phân tích các chỉ tiêu tài chính' }],
    };
    const output = await formatDocx(bytes, plan);
    const resultText = await extractDocxText(await output.arrayBuffer());
    expect(resultText.split('\n')[0]).toBe('2.5 Phân tích các chỉ tiêu tài chính');
    expect(resultText).not.toContain('chính2.5');
    expect(resultText.split('\n').length).toBe(2);
  });

  it('throws for empty sources', async () => {
    await expect(formatDocx(new ArrayBuffer(0), { version: 1, operations: [] })).rejects.toThrow('empty');
  });
});