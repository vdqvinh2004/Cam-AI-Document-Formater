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

describe('browser DOCX preview', () => {
  it('renders the rich fixture with headings, lists, tables, images, and hyperlinks', async () => {
    const bytes = readFileSync(join(__dirname, '..', 'fixtures', 'docx', 'sample-rich.docx'));
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

  it('reports unsupported features as partial', async () => {
    const preview = await buildDocxPreview(await docx('<w:document><w:body><w:p><w:r><w:t>Text</w:t></w:r><w:object/></w:p></w:body></w:document>'));
    expect(preview.status).toBe('partial');
    expect(preview.warnings[0]).toContain('w:object');
  });

  it('fails closed for malformed or unreadable packages', async () => {
    await expect(buildDocxPreview(new Blob(['not a zip']))).resolves.toMatchObject({ status: 'failed', html: '' });
    await expect(buildDocxPreview(new ArrayBuffer(0))).resolves.toMatchObject({ status: 'unavailable' });
  });
});
