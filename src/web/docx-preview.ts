import JSZip from 'jszip';
import { renderAsync } from 'docx-preview';

export type DocxPreviewStatus = 'rendered' | 'partial' | 'unavailable' | 'failed';

export interface DocxPreviewModel {
  status: DocxPreviewStatus;
  html: string;
  text: string;
  warnings: string[];
  featureCount: number;
}

const MAX_PACKAGE_BYTES = 20 * 1024 * 1024;
const MAX_XML_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_CHARS = 250_000;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function xmlText(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
}

export async function renderDocxPreview(input: Blob | ArrayBuffer, container: HTMLElement): Promise<DocxPreviewModel> {
  const bytes = input instanceof ArrayBuffer ? input.byteLength : input.size;
  if (bytes === 0 || bytes > MAX_PACKAGE_BYTES) return { status: 'unavailable', html: '', text: '', warnings: ['This DOCX is empty or exceeds the preview size limit.'], featureCount: 0 };
  try {
    await renderAsync(input instanceof ArrayBuffer ? new Blob([input]) : input, container, undefined, { inWrapper: true, ignoreWidth: false, ignoreHeight: false, renderHeaders: true, renderFooters: true, renderFootnotes: true, renderEndnotes: true });
    const html = container.innerHTML;
    return { status: html ? 'rendered' : 'unavailable', html, text: container.textContent?.trim() ?? '', warnings: [], featureCount: container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, table, img').length };
  } catch {
    container.replaceChildren();
    return buildDocxPreview(input);
  }
}

export async function buildDocxPreview(input: Blob | ArrayBuffer): Promise<DocxPreviewModel> {
  const bytes = input instanceof ArrayBuffer ? input.byteLength : input.size;
  if (bytes === 0 || bytes > MAX_PACKAGE_BYTES) return { status: 'unavailable', html: '', text: '', warnings: ['This DOCX is empty or exceeds the preview size limit.'], featureCount: 0 };
  try {
    const zip = await JSZip.loadAsync(input);
    const documentFile = zip.file('word/document.xml');
    if (!documentFile) return { status: 'unavailable', html: '', text: '', warnings: ['The DOCX package has no readable document part.'], featureCount: 0 };
    const xml = await documentFile.async('string');
    if (xml.length > MAX_XML_BYTES) return { status: 'unavailable', html: '', text: '', warnings: ['The DOCX document part exceeds the preview limit.'], featureCount: 0 };
    const warnings: string[] = [];
    const unsupported = ['w:altChunk', 'w:object', 'w:fldSimple', 'w:smartTag'].filter((tag) => xml.includes(`<${tag}`));
    if (unsupported.length) warnings.push(`Some DOCX features are not rendered: ${unsupported.join(', ')}.`);
    if (xml.includes('r:embed') && !zip.file(/word\/media\/.+/).length) warnings.push('Some embedded images are missing and were omitted from preview.');
    const blocks: string[] = [];
    const paragraphs = xml.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];
    for (const paragraph of paragraphs) {
      const text = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => xmlText(match[1])).join('');
      if (!text) continue;
      const heading = paragraph.match(/w:val="Heading([1-6])"/)?.[1];
      const tag = heading ? `h${heading}` : 'p';
      blocks.push(`<${tag}>${escapeHtml(text)}</${tag}>`);
      if (blocks.join('').length > MAX_OUTPUT_CHARS) { warnings.push('Preview was truncated at the safe display limit.'); break; }
    }
    if (!blocks.length) return { status: 'unavailable', html: '', text: '', warnings: ['No readable text was found in this DOCX.'], featureCount: 0 };
    const text = blocks.map((block) => xmlText(block)).join('\n');
    return { status: warnings.length ? 'partial' : 'rendered', html: blocks.join(''), text, warnings, featureCount: paragraphs.length };
  } catch {
    return { status: 'failed', html: '', text: '', warnings: ['This DOCX package could not be safely rendered.'], featureCount: 0 };
  }
}
