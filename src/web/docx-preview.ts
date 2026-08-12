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

function renderParagraphBlock(block: string, out: { html: string; text: string }, limit: number): void {
  const text = [...block.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => xmlText(match[1])).join('').replace(/\s+/g, ' ').trim();
  if (!text) return;
  const heading = block.match(/w:val="Heading([1-6])"/)?.[1];
  if (heading) {
    out.html += `<h${heading}>${escapeHtml(text)}</h${heading}>`;
  } else {
    out.html += `<p>${escapeHtml(text)}</p>`;
  }
  out.text += `${text}\n`;
  if (out.html.length > limit) throw new PreviewTruncatedError();
}

function renderTableBlock(block: string, out: { html: string; text: string }, limit: number): void {
  const rows = block.match(/<w:tr(?:\s[^>]*)?>[\s\S]*?<\/w:tr>/g) ?? [];
  if (!rows.length) return;
  out.html += '<table><tbody>';
  for (const row of rows) {
    out.html += '<tr>';
    const cells = row.match(/<w:tc(?:\s[^>]*)?>[\s\S]*?<\/w:tc>/g) ?? [];
    for (const cell of cells) {
      const cellText = [...cell.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => xmlText(match[1])).join('').replace(/\s+/g, ' ').trim();
      if (cellText) {
        out.html += `<td>${escapeHtml(cellText)}</td>`;
        out.text += `${cellText}\n`;
      }
    }
    out.html += '</tr>';
  }
  out.html += '</tbody></table>';
  if (out.html.length > limit) throw new PreviewTruncatedError();
}

class PreviewTruncatedError extends Error {}

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

    const segments = xml.match(/<w:tbl(?:\s[^>]*)?>[\s\S]*?<\/w:tbl>|<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) ?? [];
    const out: { html: string; text: string } = { html: '', text: '' };
    let truncated = false;
    try {
      for (const segment of segments) {
        if (segment.startsWith('<w:tbl')) renderTableBlock(segment, out, MAX_OUTPUT_CHARS);
        else renderParagraphBlock(segment, out, MAX_OUTPUT_CHARS);
      }
    } catch (error) {
      if (error instanceof PreviewTruncatedError) truncated = true;
      else throw error;
    }
    if (truncated) warnings.push('Preview was truncated at the safe display limit.');
    const text = out.text.replace(/\n+$/, '');
    if (!text) return { status: 'unavailable', html: '', text: '', warnings: ['No readable text was found in this DOCX.'], featureCount: 0 };
    return { status: warnings.length ? 'partial' : 'rendered', html: out.html, text, warnings, featureCount: (xml.match(/<w:p(?:\s[^>]*)?>/g) ?? []).length };
  } catch {
    return { status: 'failed', html: '', text: '', warnings: ['This DOCX package could not be safely rendered.'], featureCount: 0 };
  }
}
