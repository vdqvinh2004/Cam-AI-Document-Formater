import JSZip from 'jszip';
import type { BrowserFormattingOperation } from '../formatting/style-plan';

const MAX_PACKAGE_BYTES = 20 * 1024 * 1024;
const MAX_XML_BYTES = 8 * 1024 * 1024;

interface DocxWorkerMessage {
  id: number;
  type: 'inspect' | 'format' | 'extract-text';
  source: ArrayBuffer;
  plan?: { version: number; operations: BrowserFormattingOperation[] };
}

interface DocxInspection {
  paragraphNodeIDs: string[];
  headingNodeIDs: string[];
  blockCount: number;
  nodes: Array<{ nodeID: string; text: string }>;
}

function toUint8Array(source: ArrayBuffer | Uint8Array): Uint8Array {
  return source instanceof Uint8Array ? source : new Uint8Array(source);
}

function parseXml(xml: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xml, 'application/xml');
}

function serializeXml(doc: Document): string {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
}

function isHeadingParagraph(paragraph: Element): boolean {
  const val = paragraph.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val');
  return typeof val === 'string' && /Heading([1-6])/.test(val);
}

function buildBodyBlocks(body: Element): { blocks: Array<{ nodeID: string; nodeIDs: string[]; elements: Element[] }>; loose: Element[] } {
  const blocks: Array<{ nodeID: string; nodeIDs: string[]; elements: Element[] }> = [];
  const loose: Element[] = [];
  let current: { nodeID: string; nodeIDs: string[]; elements: Element[] } | null = null;
  let paragraphIndex = 0;
  let headingIndex = 0;

  const flush = () => {
    if (current) {
      blocks.push(current);
      current = null;
    }
  };

  for (const child of Array.from(body.children)) {
    if (child.localName === 'p') {
      const isHeading = isHeadingParagraph(child);
      const nodeID = isHeading ? `h${headingIndex++}` : `p${paragraphIndex++}`;
      if (isHeading) flush();
      if (!current) current = { nodeID, nodeIDs: [], elements: [] };
      current.nodeIDs.push(nodeID);
      current.elements.push(child);
    } else if (child.localName === 'tbl') {
      if (!current) {
        flush();
        current = { nodeID: '', nodeIDs: [], elements: [child] };
      } else {
        current.elements.push(child);
      }
    } else {
      flush();
      loose.push(child);
    }
  }
  flush();
  return { blocks, loose };
}

async function inspectDocxSync(source: ArrayBuffer): Promise<DocxInspection> {
  if (source.byteLength === 0 || source.byteLength > MAX_PACKAGE_BYTES) {
    throw new Error('DOCX is empty or exceeds the size limit.');
  }
  const zip = await JSZip.loadAsync(toUint8Array(source));
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) throw new Error('The DOCX package has no readable document part.');
  const xml = await documentFile.async('string');
  if (xml.length > MAX_XML_BYTES) throw new Error('The DOCX document part exceeds the size limit.');
  const doc = parseXml(xml);
  const paragraphs = doc.getElementsByTagName('w:p');
  const paragraphNodeIDs: string[] = [];
  const headingNodeIDs: string[] = [];
  const nodes: Array<{ nodeID: string; text: string }> = [];
  let paragraphIndex = 0;
  let headingIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const isHeading = isHeadingParagraph(paragraphs[i]);
    const nodeID = isHeading ? `h${headingIndex++}` : `p${paragraphIndex++}`;
    const text = Array.from(paragraphs[i].getElementsByTagName('w:t'))
      .map((run) => run.textContent ?? '')
      .join('')
      .trim();
    if (isHeading) {
      headingNodeIDs.push(nodeID);
    } else {
      paragraphNodeIDs.push(nodeID);
    }
    nodes.push({ nodeID, text });
  }

  const body = doc.getElementsByTagName('w:body')[0];
  const blockCount = body ? buildBodyBlocks(body).blocks.length : 0;

  return { paragraphNodeIDs, headingNodeIDs, blockCount, nodes };
}

function applyPresentation(rPr: Element, operation: BrowserFormattingOperation): void {
  if (operation.kind !== 'set-presentation') return;
  const presentation = operation.presentation;
  const doc = rPr.ownerDocument!;

  if (presentation.bold !== undefined) {
    let b = rPr.getElementsByTagName('w:b')[0] as Element | undefined;
    if (presentation.bold) {
      if (!b) {
        b = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:b');
        rPr.appendChild(b);
      }
    } else if (b) {
      rPr.removeChild(b);
    }
  }

  if (presentation.italic !== undefined) {
    let i = rPr.getElementsByTagName('w:i')[0] as Element | undefined;
    if (presentation.italic) {
      if (!i) {
        i = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:i');
        rPr.appendChild(i);
      }
    } else if (i) {
      rPr.removeChild(i);
    }
  }

  if (presentation.fontSize !== undefined) {
    let sz = rPr.getElementsByTagName('w:sz')[0] as Element | undefined;
    if (!sz) {
      sz = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:sz');
      rPr.appendChild(sz);
    }
    sz.setAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:val', String(Math.round(presentation.fontSize * 2)));
  }

  if (presentation.fontFamily) {
    let fonts = rPr.getElementsByTagName('w:rFonts')[0] as Element | undefined;
    if (!fonts) {
      fonts = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rFonts');
      rPr.appendChild(fonts);
    }
    fonts.setAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:ascii', presentation.fontFamily);
    fonts.setAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:hAnsi', presentation.fontFamily);
  }

  if (presentation.color) {
    let color = rPr.getElementsByTagName('w:color')[0] as Element | undefined;
    if (!color) {
      color = doc.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:color');
      rPr.appendChild(color);
    }
    color.setAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:val', presentation.color.replace(/^#/, ''));
  }
}

function applyPresentationToParagraph(paragraph: Element, presentation: { bold?: boolean; italic?: boolean; fontSize?: number; fontFamily?: string; color?: string }): void {
  const runs = paragraph.getElementsByTagName('w:r');
  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    let rPr = run.getElementsByTagName('w:rPr')[0] as Element | undefined;
    if (!rPr) {
      rPr = paragraph.ownerDocument!.createElementNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main', 'w:rPr');
      run.insertBefore(rPr, run.firstChild);
    }
    applyPresentation(rPr, { kind: 'set-presentation', nodeID: '', presentation });
  }
}

function applyRewriteTextToParagraph(paragraph: Element, text: string): void {
  const doc = paragraph.ownerDocument!;
  const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const runs = Array.from(paragraph.getElementsByTagName('w:r'));
  for (const run of runs) paragraph.removeChild(run);
  const run = doc.createElementNS(ns, 'w:r');
  const textElement = doc.createElementNS(ns, 'w:t');
  textElement.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve');
  textElement.textContent = text;
  run.appendChild(textElement);
  paragraph.appendChild(run);
}

async function formatDocxSync(source: ArrayBuffer, plan: { version: number; operations: BrowserFormattingOperation[] }): Promise<Blob> {
  if (source.byteLength === 0 || source.byteLength > MAX_PACKAGE_BYTES) {
    throw new Error('DOCX is empty or exceeds the size limit.');
  }

  const zip = await JSZip.loadAsync(toUint8Array(source));
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) throw new Error('The DOCX package has no readable document part.');

  const xml = await documentFile.async('string');
  if (xml.length > MAX_XML_BYTES) throw new Error('The DOCX document part exceeds the size limit.');

  const doc = parseXml(xml);
  const presentationOps = new Map(
    plan.operations.filter((op) => op.kind === 'set-presentation').map((op) => [op.nodeID, op as Extract<BrowserFormattingOperation, { kind: 'set-presentation' }>])
  );
  const rewrites = new Map(
    plan.operations.filter((op) => op.kind === 'rewrite-text').map((op) => [op.nodeID, (op as Extract<BrowserFormattingOperation, { kind: 'rewrite-text' }>).text])
  );
  const moves = plan.operations.filter((op) => op.kind === 'move').map((op) => ({ nodeID: op.nodeID, targetIndex: (op as Extract<BrowserFormattingOperation, { kind: 'move' }>).targetIndex }));

  const paragraphs = doc.getElementsByTagName('w:p');
  let paragraphIndex = 0;
  let headingIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];
    const nodeID = isHeadingParagraph(paragraph) ? `h${headingIndex++}` : `p${paragraphIndex++}`;
    const rewrite = rewrites.get(nodeID);
    if (rewrite) {
      applyRewriteTextToParagraph(paragraph, rewrite);
      continue;
    }
    const op = presentationOps.get(nodeID);
    if (!op) continue;
    applyPresentationToParagraph(paragraph, op.presentation);
  }

  // Reorder blocks
  const body = doc.getElementsByTagName('w:body')[0];
  if (body) {
    const { blocks, loose } = buildBodyBlocks(body);
    let ordered = blocks.slice();
    for (const move of moves) {
      const fromIndex = ordered.findIndex((block) => block.nodeIDs.includes(move.nodeID));
      if (fromIndex === -1) continue;
      const [block] = ordered.splice(fromIndex, 1);
      const target = Math.max(0, Math.min(move.targetIndex, ordered.length));
      ordered.splice(target, 0, block);
    }
    body.replaceChildren(...ordered.flatMap((block) => block.elements), ...loose);
  }

  const updatedXml = serializeXml(doc);
  zip.file('word/document.xml', updatedXml);

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

async function extractDocxTextSync(source: ArrayBuffer): Promise<string> {
  if (source.byteLength === 0 || source.byteLength > MAX_PACKAGE_BYTES) {
    return '';
  }

  const zip = await JSZip.loadAsync(toUint8Array(source));
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) return '';

  const xml = await documentFile.async('string');
  if (xml.length > MAX_XML_BYTES) return '';

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
}

self.onmessage = async (event: MessageEvent<DocxWorkerMessage>) => {
  const { id, type, source, plan } = event.data;
  try {
    let result: unknown;
    switch (type) {
      case 'inspect':
        result = await inspectDocxSync(source);
        break;
      case 'format':
        result = await formatDocxSync(source, plan!);
        break;
      case 'extract-text':
        result = await extractDocxTextSync(source);
        break;
      default:
        throw new Error(`Unknown worker message type: ${type}`);
    }
    self.postMessage({ id, result, error: null });
  } catch (error) {
    self.postMessage({ id, result: null, error: error instanceof Error ? error.message : String(error) });
  }
};
