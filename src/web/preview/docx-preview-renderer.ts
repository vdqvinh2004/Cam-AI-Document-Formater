import JSZip from 'jszip';

export interface DocxPreviewResult {
  html: string;
  text: string;
  featureCount: number;
  warnings: string[];
  status: 'rendered' | 'partial' | 'unavailable' | 'failed';
}

const MAX_PACKAGE_BYTES = 20 * 1024 * 1024;
const MAX_XML_BYTES = 8 * 1024 * 1024;

function toUint8Array(source: ArrayBuffer | Uint8Array): Uint8Array {
  return source instanceof Uint8Array ? source : new Uint8Array(source);
}

/** Text-only DOCX inspection for evidence/comparison. Visual rendering uses docx-preview in DocxPreviewPane. */
export async function renderDocxPreview(arrayBuffer: ArrayBuffer): Promise<DocxPreviewResult> {
  if (arrayBuffer.byteLength === 0 || arrayBuffer.byteLength > MAX_PACKAGE_BYTES) {
    return { html: '', text: '', featureCount: 0, warnings: ['The DOCX is empty or exceeds the preview size limit.'], status: 'unavailable' };
  }

  try {
    const zip = await JSZip.loadAsync(toUint8Array(arrayBuffer));
    const docXml = await zip.file('word/document.xml')?.async('text');

    if (!docXml) {
      return { html: '', text: '', featureCount: 0, warnings: ['No document.xml found in DOCX package'], status: 'unavailable' };
    }
    if (docXml.length > MAX_XML_BYTES) {
      return { html: '', text: '', featureCount: 0, warnings: ['The DOCX document part exceeds the preview limit.'], status: 'unavailable' };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(docXml, 'application/xml');

    const paragraphs = doc.getElementsByTagName('w:p');
    const tables = doc.getElementsByTagName('w:tbl');
    const images = doc.getElementsByTagName('w:drawing');
    const hyperlinks = doc.getElementsByTagName('w:hyperlink');
    const featureCount = paragraphs.length + tables.length + images.length + hyperlinks.length;

    const warnings: string[] = [];
    const unsupported = ['w:altChunk', 'w:object', 'w:fldSimple', 'w:smartTag'].filter((tag) => docXml.includes(`<${tag}`));
    if (unsupported.length) warnings.push(`Some DOCX features are not rendered: ${unsupported.join(', ')}.`);
    if (docXml.includes('r:embed') && !zip.file(/word\/media\/.+/).length) warnings.push('Some embedded images are missing and were omitted from preview.');
    if (tables.length > 0) warnings.push(`${tables.length} table(s) detected`);
    if (images.length > 0) warnings.push(`${images.length} image(s) detected`);
    if (hyperlinks.length > 0) warnings.push(`${hyperlinks.length} hyperlink(s) detected`);

    const textParts: string[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
      const textNodes = paragraphs[i].getElementsByTagName('w:t');
      let paragraphText = '';
      for (let j = 0; j < textNodes.length; j++) {
        paragraphText += textNodes[j].textContent || '';
      }
      if (paragraphText.trim()) textParts.push(paragraphText.trim());
    }
    const text = textParts.join('\n');

    if (!text) {
      return { html: '', text: '', featureCount: 0, warnings: ['No readable text was found in this DOCX.'], status: 'unavailable' };
    }

    return { html: '', text, featureCount, warnings, status: warnings.length ? 'partial' : 'rendered' };
  } catch {
    return { html: '', text: '', featureCount: 0, warnings: ['This DOCX package could not be safely read.'], status: 'failed' };
  }
}