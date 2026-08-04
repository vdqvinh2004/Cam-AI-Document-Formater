import { renderAsync } from 'docx-preview';
import JSZip from 'jszip';

export interface DocxPreviewResult {
  html: string;
  text: string;
  featureCount: number;
  warnings: string[];
}

export async function renderDocxPreview(arrayBuffer: ArrayBuffer): Promise<DocxPreviewResult> {
  const warnings: string[] = [];
  let featureCount = 0;
  let html = '';
  let text = '';

  try {
    const zip = await JSZip.loadAsync(arrayBuffer);
    const docXml = await zip.file('word/document.xml')?.async('text');
    
    if (!docXml) {
      warnings.push('No document.xml found in DOCX package');
      return { html: '<div class="preview-failed">Invalid DOCX: missing document.xml</div>', text: '', featureCount: 0, warnings };
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

    if (tables.length > 0) warnings.push(`${tables.length} table(s) detected`);
    if (images.length > 0) warnings.push(`${images.length} image(s) detected`);
    if (hyperlinks.length > 0) warnings.push(`${hyperlinks.length} hyperlink(s) detected`);

    const container = document.createElement('div');
    container.className = 'docx-preview-container';
    await renderAsync(arrayBuffer, container);
    html = container.innerHTML;

    const textNodes = doc.getElementsByTagName('w:t');
    const textParts: string[] = [];
    for (let i = 0; i < textNodes.length; i++) {
      textParts.push(textNodes[i].textContent || '');
    }
    text = textParts.join(' ').replace(/\s+/g, ' ').trim();

  } catch (error) {
    warnings.push(`DOCX preview error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    html = '<div class="preview-failed">Failed to render DOCX preview</div>';
    text = '';
    featureCount = 0;
  }

  return { html, text, featureCount, warnings };
}