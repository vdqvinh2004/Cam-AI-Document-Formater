import JSZip from 'jszip';

export interface DocxPreviewResult {
  html: string;
  text: string;
  featureCount: number;
  warnings: string[];
}

const MAX_PACKAGE_BYTES = 20 * 1024 * 1024;
const MAX_XML_BYTES = 8 * 1024 * 1024;

export async function renderDocxPreview(arrayBuffer: ArrayBuffer): Promise<DocxPreviewResult> {
  if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_PACKAGE_BYTES) {
    return { html: '<div class="preview-unavailable">DOCX preview unavailable: the file is empty or exceeds the preview size limit.</div>', text: '', featureCount: 0, warnings: ['The DOCX is empty or exceeds the preview size limit.'] };
  }

  const { renderAsync } = await import('docx-preview');
  const warnings: string[] = [];
  let featureCount = 0;
  let html = '';
  let text = '';
  const textParts: string[] = [];

  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = await zip.file('word/document.xml')?.async('text');

    if (!docXml) {
      warnings.push('No document.xml found in DOCX package');
      return { html: '<div class="preview-failed">Invalid DOCX: missing document.xml</div>', text: '', featureCount: 0, warnings };
    }
    if (docXml.length > MAX_XML_BYTES) {
      warnings.push('The DOCX document part exceeds the preview limit.');
      return { html: '<div class="preview-unavailable">DOCX preview unavailable: the document part exceeds the preview limit.</div>', text: '', featureCount: 0, warnings };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(docXml, 'application/xml');

    const paragraphs = doc.getElementsByTagName('w:p');
    featureCount += paragraphs.length;

    const tables = doc.getElementsByTagName('w:tbl');
    featureCount += tables.length;

    const images = doc.getElementsByTagName('w:drawing');
    featureCount += images.length;

    const hyperlinks = doc.getElementsByTagName('w:hyperlink');
    featureCount += hyperlinks.length;

    const unsupported = doc.getElementsByTagName('w:object');
    if (unsupported.length > 0) warnings.push('Some embedded DOCX objects are not rendered.');
    if (tables.length > 0) warnings.push(`${tables.length} table(s) detected`);
    if (images.length > 0) warnings.push(`${images.length} image(s) detected`);
    if (hyperlinks.length > 0) warnings.push(`${hyperlinks.length} hyperlink(s) detected`);

    for (let i = 0; i < paragraphs.length; i++) {
      const textNodes = paragraphs[i].getElementsByTagName('w:t');
      let paragraphText = '';
      for (let j = 0; j < textNodes.length; j++) {
        paragraphText += textNodes[j].textContent || '';
      }
      if (paragraphText.trim()) textParts.push(paragraphText.trim());
    }
    text = textParts.join('\n');

    const container = document.createElement('div');
    container.className = 'docx-preview-container';
    await renderAsync(arrayBuffer, container);
    html = container.innerHTML;
  } catch (error) {
    warnings.push(`DOCX preview error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    html = '<div class="preview-failed">Failed to render DOCX preview</div>';
    text = '';
    featureCount = 0;
    textParts.length = 0;
  }

  return { html, text, featureCount, warnings };
}