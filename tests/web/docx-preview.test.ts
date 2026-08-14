import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { renderDocxPreview } from '../../src/web/preview/docx-preview-renderer';

async function docx(xml: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('word/document.xml', xml);
  return zip.generateAsync({ type: 'arraybuffer' });
}

const FIXTURES = join(__dirname, '..', 'fixtures', 'docx');
const fixture = (name: string): Buffer => readFileSync(join(FIXTURES, name));

describe('browser DOCX preview evidence', () => {
  it('extracts the rich fixture with headings, lists, tables, images, and hyperlinks', async () => {
    const preview = await renderDocxPreview(fixture('sample-rich.docx'));
    expect(['rendered', 'partial']).toContain(preview.status);
    expect(preview.text).toContain('Sample Rich Document');
    expect(preview.text).toContain('Introduction');
    expect(preview.text).toContain('hyperlink');
    expect(preview.text).toContain('Alpha');
    expect(preview.text).toContain('Beta');
    expect(preview.featureCount).toBeGreaterThan(0);
  });

  it('extracts headings and paragraphs without exposing XML or markup', async () => {
    const preview = await renderDocxPreview(await docx('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Title &amp; &lt;safe&gt;</w:t></w:r></w:p><w:p><w:r><w:t>Body</w:t></w:r></w:p></w:body></w:document>'));
    expect(preview.status).toBe('rendered');
    expect(preview.text).toContain('Title & <safe>');
    expect(preview.text).toContain('Body');
    expect(preview.text).not.toContain('<w:');
  });

  it('extracts body content from a header/footer fixture', async () => {
    const preview = await renderDocxPreview(fixture('header-footer.docx'));
    expect(preview.text).toContain('Header and Footer Document');
    expect(preview.text).toContain('Body content between header and footer.');
  });

  it('extracts nested run formatting without losing text', async () => {
    const preview = await renderDocxPreview(fixture('nested-formatting.docx'));
    expect(preview.text).toContain('Bold large run');
    expect(preview.text).toContain('italic run');
    expect(preview.text).toContain('underlined run');
    expect(preview.text).toContain('Subscript');
    expect(preview.text).toContain('Superscript');
    expect(preview.text).toContain('Colored');
  });

  it('reports unsupported embedded objects as partial with a user-safe warning', async () => {
    const preview = await renderDocxPreview(fixture('unsupported-object.docx'));
    expect(preview.status).toBe('partial');
    expect(preview.warnings.join(' ')).toContain('w:object');
    expect(preview.text).toContain('Text before the object.');
    expect(preview.text).toContain('Text after the object.');
  });

  it('fails closed for malformed or unreadable packages', async () => {
    const malformed = await renderDocxPreview(new Blob(['not a zip']).arrayBuffer());
    expect(['failed', 'unavailable']).toContain(malformed.status);
    expect(malformed.text).toBe('');
    const empty = await renderDocxPreview(new ArrayBuffer(0));
    expect(empty.status).toBe('unavailable');
  });

  it('fails closed for a tampered ZIP fixture without partial output', async () => {
    const preview = await renderDocxPreview(fixture('malformed-package.docx'));
    expect(['failed', 'unavailable']).toContain(preview.status);
    expect(preview.text).toBe('');
  });

  it('extracts a large document within the bounded preview', async () => {
    const preview = await renderDocxPreview(fixture('large-document.docx'));
    expect(preview.text).toContain('Paragraph number 0');
    expect(preview.text).toContain('Paragraph number 1599');
    expect(preview.featureCount).toBeGreaterThanOrEqual(1600);
  });

  it('reports tables and images as features with warnings', async () => {
    const preview = await renderDocxPreview(fixture('sample-rich.docx'));
    expect(preview.warnings.join(' ')).toMatch(/table/);
    expect(preview.featureCount).toBeGreaterThan(0);
  });
});