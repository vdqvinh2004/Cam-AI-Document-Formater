import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { buildDocxPreview } from '../../src/web/docx-preview';

async function docx(xml: string): Promise<ArrayBuffer> {
  const zip = new JSZip();
  zip.file('word/document.xml', xml);
  return zip.generateAsync({ type: 'arraybuffer' });
}

const FIXTURES = join(__dirname, '..', 'fixtures', 'docx');
const fixture = (name: string): Buffer => readFileSync(join(FIXTURES, name));

describe('browser DOCX preview', () => {
  it('renders the rich fixture with headings, lists, tables, images, and hyperlinks', async () => {
    const bytes = fixture('sample-rich.docx');
    const preview = await buildDocxPreview(bytes);
    expect(preview.status).toBe('rendered');
    expect(preview.html).toContain('<h1>Sample Rich Document</h1>');
    expect(preview.html).toContain('<h2>Introduction</h2>');
    expect(preview.text).toContain('Sample Rich Document');
    expect(preview.text).toContain('hyperlink');
    expect(preview.text).toContain('Alpha');
    expect(preview.text).toContain('Beta');
    expect(preview.featureCount).toBeGreaterThan(0);
  });

  it('renders headings and paragraphs without exposing XML or markup', async () => {
    const preview = await buildDocxPreview(await docx('<w:document><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>Title &amp; &lt;safe&gt;</w:t></w:r></w:p><w:p><w:r><w:t>Body</w:t></w:r></w:p></w:body></w:document>'));
    expect(preview.status).toBe('rendered');
    expect(preview.html).toContain('<h1>Title &amp; &lt;safe&gt;</h1>');
    expect(preview.html).not.toContain('<w:');
    expect(preview.text).toContain('Title & <safe>');
  });

  it('renders body content from a header/footer fixture', async () => {
    const preview = await buildDocxPreview(fixture('header-footer.docx'));
    expect(preview.status).toBe('rendered');
    expect(preview.text).toContain('Header and Footer Document');
    expect(preview.text).toContain('Body content between header and footer.');
  });

  it('renders nested run formatting without losing text', async () => {
    const preview = await buildDocxPreview(fixture('nested-formatting.docx'));
    expect(preview.status).toBe('rendered');
    expect(preview.text).toContain('Bold large run');
    expect(preview.text).toContain('italic run');
    expect(preview.text).toContain('underlined run');
    expect(preview.text).toContain('Subscript');
    expect(preview.text).toContain('Superscript');
    expect(preview.text).toContain('Colored');
  });

  it('reports unsupported embedded objects as partial with a user-safe warning', async () => {
    const preview = await buildDocxPreview(fixture('unsupported-object.docx'));
    expect(preview.status).toBe('partial');
    expect(preview.warnings.join(' ')).toContain('w:object');
    expect(preview.text).toContain('Text before the object.');
    expect(preview.text).toContain('Text after the object.');
    expect(preview.html).not.toContain('oleObject1');
  });

  it('fails closed for malformed or unreadable packages', async () => {
    await expect(buildDocxPreview(new Blob(['not a zip']))).resolves.toMatchObject({ status: 'failed', html: '' });
    await expect(buildDocxPreview(new ArrayBuffer(0))).resolves.toMatchObject({ status: 'unavailable' });
  });

  it('fails closed for a tampered ZIP fixture without partial output', async () => {
    const preview = await buildDocxPreview(fixture('malformed-package.docx'));
    expect(['failed', 'unavailable']).toContain(preview.status);
    expect(preview.html).toBe('');
    expect(preview.text).toBe('');
  });

  it('renders a large document within the bounded preview', async () => {
    const preview = await buildDocxPreview(fixture('large-document.docx'));
    expect(preview.status).toBe('rendered');
    expect(preview.text).toContain('Paragraph number 0');
    expect(preview.text).toContain('Paragraph number 1599');
    expect(preview.featureCount).toBeGreaterThanOrEqual(1600);
  });
});
