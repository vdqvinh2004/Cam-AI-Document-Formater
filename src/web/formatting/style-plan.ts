import { resolveBrowserStyle, type BrowserStyleName } from '../style-profiles';

export interface BrowserPresentation {
  bold?: boolean;
  italic?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

export type BrowserFormattingOperation =
  | { kind: 'set-presentation'; nodeID: string; presentation: BrowserPresentation }
  | { kind: 'move'; nodeID: string; targetIndex: number };

export interface BrowserFormattingPlan {
  version: 1;
  operations: BrowserFormattingOperation[];
  warnings?: string[];
}

export interface MarkdownBlock {
  startLine: number;
  lines: string[];
  isHeading: boolean;
  headingLevel: number;
  nodeID: string;
}

export const PRESENTATION_KEYS = new Set(['bold', 'italic', 'fontSize', 'fontFamily', 'color']);

export const MAX_FONT_SIZE = 72;
export const MAX_FONT_FAMILY_LENGTH = 64;

const markdownEmphasis: Record<Exclude<BrowserStyleName, 'custom'>, { heading: BrowserPresentation; paragraph: BrowserPresentation }> = {
  simple: { heading: { bold: true }, paragraph: {} },
  modern: { heading: { bold: true }, paragraph: { italic: true } },
  professional: { heading: { bold: true }, paragraph: { bold: true } },
  'easy-to-read': { heading: { bold: true }, paragraph: { bold: true, italic: true } },
  academic: { heading: { bold: true, italic: true }, paragraph: {} },
};

export function buildMarkdownBlocks(text: string): MarkdownBlock[] {
  const lines = text.split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let current: MarkdownBlock | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const headingMatch = line.match(/^(#{1,6})\s+/);
    const isBlank = line.trim() === '';

    if (headingMatch || isBlank) {
      if (current) {
        blocks.push(current);
        current = null;
      }
      if (headingMatch) {
        current = { startLine: i, lines: [line], isHeading: true, headingLevel: headingMatch[1].length, nodeID: `h${i}` };
      }
      continue;
    }

    if (!current) {
      const nodeID = /^#{1,6}\s/.test(line) ? `h${i}` : `p${i}`;
      current = { startLine: i, lines: [], isHeading: false, headingLevel: 0, nodeID };
    }
    current.lines.push(line);
  }

  if (current) blocks.push(current);
  return blocks;
}

function nodeIDForLine(line: string, index: number): string {
  return /^#{1,6}\s/.test(line) ? `h${index}` : `p${index}`;
}

export function markdownStylePlan(style: BrowserStyleName, text: string): BrowserFormattingPlan {
  if (style === 'custom') return markdownStylePlan('modern', text);
  const emphasis = markdownEmphasis[style];
  const operations: BrowserFormattingOperation[] = [];

  text.split(/\r?\n/).forEach((line, index) => {
    if (line.trim() === '' || hasEmphasisMarkers(line)) return;
    const presentation = emphasis[line.startsWith('#') ? 'heading' : 'paragraph'];
    if (!presentation || Object.keys(presentation).length === 0) return;
    operations.push({ kind: 'set-presentation', nodeID: nodeIDForLine(line, index), presentation: { ...presentation } });
  });

  return { version: 1, operations };
}

export function docxStylePlan(style: BrowserStyleName, paragraphNodeIDs: string[], headingNodeIDs: string[]): BrowserFormattingPlan {
  if (style === 'custom') return docxStylePlan('modern', paragraphNodeIDs, headingNodeIDs);
  const tokens = resolveBrowserStyle(style);
  const operations: BrowserFormattingOperation[] = [];

  for (const nodeID of headingNodeIDs) {
    const heading: BrowserPresentation = { bold: true };
    if (tokens.heading.fontSize) heading.fontSize = tokens.heading.fontSize as number;
    if (tokens.document.fontFamily) heading.fontFamily = tokens.document.fontFamily as string;
    operations.push({ kind: 'set-presentation', nodeID, presentation: heading });
  }
  for (const nodeID of paragraphNodeIDs) {
    const paragraph: BrowserPresentation = {};
    if (tokens.document.fontSize) paragraph.fontSize = tokens.document.fontSize as number;
    if (tokens.document.fontFamily) paragraph.fontFamily = tokens.document.fontFamily as string;
    if (Object.keys(paragraph).length === 0) continue;
    operations.push({ kind: 'set-presentation', nodeID, presentation: paragraph });
  }

  return { version: 1, operations };
}

export function hasEmphasisMarkers(line: string): boolean {
  return /\*\*|(?<!\*)\*(?!\*)/.test(line);
}

const COLOR_HEX = /^[0-9a-fA-F]{6}$/;

export function screenAiPlan(aiPlan: BrowserFormattingPlan, validNodeIDs: Set<string>, blockCount: number): { plan: BrowserFormattingPlan; warnings: string[] } {
  const operations: BrowserFormattingOperation[] = [];
  const warnings: string[] = [];

  for (const op of aiPlan.operations) {
    if (op.kind === 'set-presentation') {
      if (!validNodeIDs.has(op.nodeID)) {
        warnings.push(`Ignored presentation change for unknown node "${op.nodeID}".`);
        continue;
      }
      const presentation: BrowserPresentation = {};
      let valid = true;
      for (const [key, value] of Object.entries(op.presentation ?? {})) {
        if (!PRESENTATION_KEYS.has(key)) continue;
        if (key === 'bold' || key === 'italic') {
          if (typeof value === 'boolean') presentation[key] = value;
          else valid = false;
        } else if (key === 'fontSize') {
          if (typeof value === 'number' && value >= 6 && value <= MAX_FONT_SIZE) presentation.fontSize = value;
          else valid = false;
        } else if (key === 'fontFamily') {
          if (typeof value === 'string' && value.length > 0 && value.length <= MAX_FONT_FAMILY_LENGTH) presentation.fontFamily = value;
          else valid = false;
        } else if (key === 'color') {
          const hex = typeof value === 'string' ? value.replace(/^#/, '') : '';
          if (COLOR_HEX.test(hex)) presentation.color = hex;
          else valid = false;
        }
      }
      if (!valid) {
        warnings.push(`Ignored presentation change for "${op.nodeID}" with invalid values.`);
        continue;
      }
      if (Object.keys(presentation).length === 0) {
        warnings.push(`Ignored empty presentation change for "${op.nodeID}".`);
        continue;
      }
      operations.push({ kind: 'set-presentation', nodeID: op.nodeID, presentation });
      continue;
    }

    if (op.kind === 'move') {
      if (!validNodeIDs.has(op.nodeID)) {
        warnings.push(`Ignored move for unknown node "${op.nodeID}".`);
        continue;
      }
      if (!Number.isInteger(op.targetIndex) || op.targetIndex < 0 || op.targetIndex >= blockCount) {
        warnings.push(`Ignored move for "${op.nodeID}" with out-of-range target ${String(op.targetIndex)}.`);
        continue;
      }
      operations.push({ kind: 'move', nodeID: op.nodeID, targetIndex: op.targetIndex });
      continue;
    }

    warnings.push(`Ignored unsupported operation "${String((op as { kind?: unknown }).kind)}".`);
  }

  return { plan: { version: 1, operations, warnings: aiPlan.warnings }, warnings };
}

export function mergePlans(base: BrowserFormattingPlan, ai: BrowserFormattingPlan): BrowserFormattingPlan {
  const merged = new Map(base.operations.map((op) => [`${op.kind}:${op.nodeID}`, op]));
  for (const op of ai.operations) merged.set(`${op.kind}:${op.nodeID}`, op);
  return { version: 1, operations: [...merged.values()], warnings: [...(base.warnings ?? []), ...(ai.warnings ?? [])] };
}

export function reorderMarkdownLines(text: string, styledLines: string[], moves: Array<{ nodeID: string; targetIndex: number }>): string {
  if (moves.length === 0) return styledLines.join('\n');
  const lines = styledLines.length === 0 ? text.split(/\r?\n/) : styledLines;
  const blocks = buildMarkdownBlocks(text);
  let ordered = blocks.map((block) => ({ nodeID: block.nodeID, lines: lines.slice(block.startLine, block.startLine + block.lines.length) }));

  for (const move of moves) {
    const fromIndex = ordered.findIndex((block) => block.nodeID === move.nodeID);
    if (fromIndex === -1) continue;
    const [block] = ordered.splice(fromIndex, 1);
    const target = Math.max(0, Math.min(move.targetIndex, ordered.length));
    ordered.splice(target, 0, block);
  }

  return ordered.flatMap((block) => block.lines).join('\n');
}