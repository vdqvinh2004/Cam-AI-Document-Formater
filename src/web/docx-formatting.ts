import JSZip from 'jszip';
import type { BrowserFormattingOperation, BrowserPresentation } from './formatting/style-plan';

export interface DocxInspection {
  paragraphNodeIDs: string[];
  headingNodeIDs: string[];
  blockCount: number;
}

const MAX_PACKAGE_BYTES = 20 * 1024 * 1024;
const MAX_XML_BYTES = 8 * 1024 * 1024;

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
  return paragraph.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val')?.match(/Heading([1-6])/) !== null;
}

/** Mirrors the nodeID counter scheme used by the plan appliers. */
export async function inspectDocx(source: ArrayBuffer): Promise<DocxInspection> {
  const zip = await JSZip.loadAsync(toUint8Array(source));
  const documentFile = zip.file('word/document.xml');
  if (!documentFile) throw new Error('The DOCX package has no readable document part.');
  const xml = await documentFile.async('string');
  const doc = parseXml(xml);
  const paragraphs = doc.getElementsByTagName('w:p');
  const paragraphNodeIDs: string[] = [];
  const headingNodeIDs: string[] = [];
  let paragraphIndex = 0;
  let headingIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    if (isHeadingParagraph(paragraphs[i])) {
      headingNodeIDs.push(`h${headingIndex++}`);
    } else {
      paragraphNodeIDs.push(`p${paragraphIndex++}`);
    }
  }

  const body = doc.getElementsByTagName('w:body')[0];
  const blockCount = body ? Array.from(body.children).filter((child) => child.localName === 'p').length : 0;

  return { paragraphNodeIDs, headingNodeIDs, blockCount };
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

function applyPresentationToParagraph(paragraph: Element, presentation: BrowserPresentation): void {
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

function reorderBodyParagraphs(doc: Document, moves: Array<{ nodeID: string; targetIndex: number }>): void {
  if (moves.length === 0) return;
  const body = doc.getElementsByTagName('w:body')[0];
  if (!body) return;

  const allChildren = Array.from(body.children);
  const movable = allChildren.filter((child) => child.localName === 'p');

  const nodeIDs = new Map<Element, string>();
  let paragraphIndex = 0;
  let headingIndex = 0;
  for (const child of allChildren) {
    if (child.localName !== 'p') continue;
    nodeIDs.set(child, isHeadingParagraph(child) ? `h${headingIndex++}` : `p${paragraphIndex++}`);
  }

  let ordered = [...movable];
  for (const move of moves) {
    const fromIndex = ordered.findIndex((el) => nodeIDs.get(el) === move.nodeID);
    if (fromIndex === -1) continue;
    const [block] = ordered.splice(fromIndex, 1);
    const target = Math.max(0, Math.min(move.targetIndex, ordered.length));
    ordered.splice(target, 0, block);
  }

  const order = new Map<Element, Element>();
  for (const el of movable) {
    order.set(el, ordered[0] ?? el);
    const pos = ordered.indexOf(el);
    if (pos !== -1) ordered.splice(pos, 1);
  }

  body.replaceChildren(...allChildren.map((child) => (child.localName === 'p' ? order.get(child)! : child)));
}

export async function formatDocx(source: ArrayBuffer, plan: { version: number; operations: BrowserFormattingOperation[] }): Promise<Blob> {
  if (source.byteLength === 0 || source.byteLength > MAX_PACKAGE_BYTES) {
    throw new Error('DOCX is empty or exceeds the size limit.');
  }

  try {
    const zip = await JSZip.loadAsync(toUint8Array(source));
    const documentFile = zip.file('word/document.xml');
    if (!documentFile) throw new Error('The DOCX package has no readable document part.');

    const xml = await documentFile.async('string');
    if (xml.length > MAX_XML_BYTES) throw new Error('The DOCX document part exceeds the size limit.');

    const doc = parseXml(xml);
    const presentationOps = new Map(
      plan.operations.filter((op) => op.kind === 'set-presentation').map((op) => [op.nodeID, op as Extract<BrowserFormattingOperation, { kind: 'set-presentation' }>])
    );
    const moves = plan.operations.filter((op) => op.kind === 'move').map((op) => ({ nodeID: op.nodeID, targetIndex: (op as Extract<BrowserFormattingOperation, { kind: 'move' }>).targetIndex }));

    const paragraphs = doc.getElementsByTagName('w:p');
    let paragraphIndex = 0;
    let headingIndex = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      const nodeID = isHeadingParagraph(paragraph) ? `h${headingIndex++}` : `p${paragraphIndex++}`;
      const op = presentationOps.get(nodeID);
      if (!op) continue;
      applyPresentationToParagraph(paragraph, op.presentation);
    }

    reorderBodyParagraphs(doc, moves);

    const updatedXml = serializeXml(doc);
    zip.file('word/document.xml', updatedXml);

    return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  } catch (error) {
    throw new Error(`DOCX formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function extractDocxText(source: ArrayBuffer): Promise<string> {
  if (source.byteLength === 0 || source.byteLength > MAX_PACKAGE_BYTES) {
    return '';
  }

  try {
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
  } catch {
    return '';
  }
}