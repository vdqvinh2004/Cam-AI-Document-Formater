import JSZip from 'jszip';

export interface DocxFormattingOperation {
  nodeID: string;
  bold?: boolean;
  italic?: boolean;
}

export interface DocxFormattingPlan {
  version: number;
  operations: DocxFormattingOperation[];
  warnings?: string[];
}

const MAX_PACKAGE_BYTES = 20 * 1024 * 1024;
const MAX_XML_BYTES = 8 * 1024 * 1024;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseXml(xml: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xml, 'application/xml');
}

function serializeXml(doc: Document): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

function applyFormattingToParagraph(paragraph: Element, operations: Map<string, DocxFormattingOperation>, nodeIndex: number): void {
  const nodeID = `p${nodeIndex}`;
  const operation = operations.get(nodeID);
  if (!operation) return;

  const runs = paragraph.getElementsByTagName('w:r');
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    let rPr = run.getElementsByTagName('w:rPr')[0] as Element | undefined;
    
    if (!rPr) {
      rPr = paragraph.ownerDocument!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
      run.insertBefore(rPr, run.firstChild);
    }

    if (operation.bold !== undefined) {
      let b = rPr.getElementsByTagName('w:b')[0] as Element | undefined;
      if (operation.bold) {
        if (!b) {
          b = paragraph.ownerDocument!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:b');
          rPr.appendChild(b);
        }
      } else if (b) {
        rPr.removeChild(b);
      }
    }

    if (operation.italic !== undefined) {
      let i = rPr.getElementsByTagName('w:i')[0] as Element | undefined;
      if (operation.italic) {
        if (!i) {
          i = paragraph.ownerDocument!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:i');
          rPr.appendChild(i);
        }
      } else if (i) {
        rPr.removeChild(i);
      }
    }
  }
}

function applyFormattingToHeading(paragraph: Element, operations: Map<string, DocxFormattingOperation>, nodeIndex: number): void {
  const nodeID = `h${nodeIndex}`;
  const operation = operations.get(nodeID);
  if (!operation) return;

  const runs = paragraph.getElementsByTagName('w:r');
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    let rPr = run.getElementsByTagName('w:rPr')[0] as Element | undefined;
    
    if (!rPr) {
      rPr = paragraph.ownerDocument!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
      run.insertBefore(rPr, run.firstChild);
    }

    if (operation.bold !== undefined) {
      let b = rPr.getElementsByTagName('w:b')[0] as Element | undefined;
      if (operation.bold) {
        if (!b) {
          b = paragraph.ownerDocument!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:b');
          rPr.appendChild(b);
        }
      } else if (b) {
        rPr.removeChild(b);
      }
    }

    if (operation.italic !== undefined) {
      let i = rPr.getElementsByTagName('w:i')[0] as Element | undefined;
      if (operation.italic) {
        if (!i) {
          i = paragraph.ownerDocument!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:i');
          rPr.appendChild(i);
        }
      } else if (i) {
        rPr.removeChild(i);
      }
    }
  }
}

export async function formatDocx(source: ArrayBuffer, plan: DocxFormattingPlan): Promise<Blob> {
  if (source.byteLength === 0 || source.byteLength > MAX_PACKAGE_BYTES) {
    throw new Error('DOCX is empty or exceeds the size limit.');
  }

  try {
    const zip = await JSZip.loadAsync(source);
    const documentFile = zip.file('word/document.xml');
    
    if (!documentFile) {
      throw new Error('The DOCX package has no readable document part.');
    }

    const xml = await documentFile.async('string');
    if (xml.length > MAX_XML_BYTES) {
      throw new Error('The DOCX document part exceeds the size limit.');
    }

    const doc = parseXml(xml);
    const operations = new Map(plan.operations.map(op => [op.nodeID, op]));

    const paragraphs = doc.getElementsByTagName('w:p');
    let paragraphIndex = 0;
    let headingIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const pStyle = paragraph.getElementsByTagName('w:pStyle')[0];
      const headingLevel = pStyle?.getAttribute('w:val')?.match(/Heading([1-6])/)?.[1];
      
      if (headingLevel) {
        applyFormattingToHeading(paragraph, operations, headingIndex);
        headingIndex++;
      } else {
        applyFormattingToParagraph(paragraph, operations, paragraphIndex);
        paragraphIndex++;
      }
    }

    const updatedXml = serializeXml(doc);
    zip.file('word/document.xml', updatedXml);

    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    return blob;
  } catch (error) {
    throw new Error(`DOCX formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractDocxText(source: ArrayBuffer): Promise<string> {
  if (source.byteLength === 0 || source.byteLength > MAX_PACKAGE_BYTES) {
    return '';
  }

  try {
    const zip = await JSZip.loadAsync(source);
    const documentFile = zip.file('word/document.xml');
    
    if (!documentFile) {
      return '';
    }

    const xml = await documentFile.async('string');
    if (xml.length > MAX_XML_BYTES) {
      return '';
    }

    const doc = parseXml(xml);
    const paragraphs = doc.getElementsByTagName('w:p');
    const texts: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const textNodes = paragraph.getElementsByTagName('w:t');
      let paragraphText = '';
      
      for (let j = 0; j < textNodes.length; j++) {
        paragraphText += textNodes[j].textContent || '';
      }
      
      if (paragraphText.trim()) {
        texts.push(paragraphText.trim());
      }
    }

    return texts.join('\n');
  } catch {
    return '';
  }
}