import type { BrowserFormattingOperation, BrowserPresentation } from './formatting/style-plan';
import { inspectDocxViaWorker, formatDocxViaWorker, extractDocxTextViaWorker } from './workers/docx-worker-client';

export interface DocxInspection {
  paragraphNodeIDs: string[];
  headingNodeIDs: string[];
  blockCount: number;
  nodes: Array<{ nodeID: string; text: string }>;
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
  const val = paragraph.getElementsByTagName('w:pStyle')[0]?.getAttribute('w:val');
  return typeof val === 'string' && /Heading([1-6])/.test(val);
}

/** Mirrors the nodeID counter scheme used by the plan appliers. */
export async function inspectDocx(source: ArrayBuffer): Promise<DocxInspection> {
  return inspectDocxViaWorker(source);
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

/** A movable unit in the body: a heading section or a run of leading content. */
interface DocxBlock {
  /** nodeID of the first element in the block ('' for a bare leading table). */
  nodeID: string;
  /** All node IDs assigned while building the block, in document order. */
  nodeIDs: string[];
  /** Body children (paragraphs and tables) that move together. */
  elements: Element[];
}

/**
 * Splits body children into movable blocks that mirror the Markdown block model:
 * a block starts at a heading (or, before any heading, at a paragraph) and swallows
 * all following paragraphs and tables until the next heading. Node IDs follow the
 * same heading/paragraph counters used by inspectDocx and formatDocx so move
 * operations resolved against an inspection stay valid here.
 */
function buildBodyBlocks(body: Element): { blocks: DocxBlock[]; loose: Element[] } {
  const blocks: DocxBlock[] = [];
  const loose: Element[] = [];
  let current: DocxBlock | null = null;
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

function reorderBodyBlocks(doc: Document, moves: Array<{ nodeID: string; targetIndex: number }>): void {
  if (moves.length === 0) return;
  const body = doc.getElementsByTagName('w:body')[0];
  if (!body) return;
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

export async function formatDocx(source: ArrayBuffer, plan: { version: number; operations: BrowserFormattingOperation[] }): Promise<Blob> {
  return formatDocxViaWorker(source, plan);
}

export async function extractDocxText(source: ArrayBuffer): Promise<string> {
  return extractDocxTextViaWorker(source);
}