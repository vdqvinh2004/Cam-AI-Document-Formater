import { resolveBrowserStyle, type BrowserStyleName } from './style-profiles';
import { formatDocx, extractDocxText, inspectDocx } from './docx-formatting';
import {
  markdownStylePlan,
  docxStylePlan,
  screenAiPlan,
  mergePlans,
  buildMarkdownBlocks,
  reorderMarkdownLines,
  hasEmphasisMarkers,
  type BrowserFormattingOperation,
  type BrowserFormattingPlan,
  type BrowserPresentation,
} from './formatting/style-plan';

export { extractDocxText } from './docx-formatting';
export type { BrowserFormattingOperation, BrowserFormattingPlan, BrowserPresentation } from './formatting/style-plan';

export interface BrowserSource {
  file: File;
  format: 'txt' | 'markdown' | 'docx' | 'pdf';
  text: string;
  sourceHash: string;
}

export interface BrowserResult {
  filename: string;
  blob: Blob;
  format: BrowserSource['format'];
  sourceHash: string;
  contentPreserved: boolean;
  previewAvailable: boolean;
  warnings: string[];
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const extensionFormats: Record<string, BrowserSource['format']> = {
  '.txt': 'txt', '.md': 'markdown', '.markdown': 'markdown', '.docx': 'docx', '.pdf': 'pdf',
};

export function detectFormat(filename: string): BrowserSource['format'] | null {
  const extension = `.${filename.split('.').pop()?.toLowerCase() ?? ''}`;
  return extensionFormats[extension] ?? null;
}

export async function readSource(file: File, bytes?: ArrayBuffer): Promise<BrowserSource> {
  if (file.size === 0) throw new Error('That file is empty. Choose a readable document.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Files larger than 20 MB are not supported in the browser.');
  const format = detectFormat(file.name);
  if (!format) throw new Error('That file type is not supported. Choose TXT, Markdown, DOCX, or PDF.');
  const buffer = bytes ?? await file.arrayBuffer();
  return { file, format, text: format === 'txt' || format === 'markdown' ? new TextDecoder().decode(buffer) : '', sourceHash: await hashBytes(buffer) };
}

async function docxNodeLists(source: BrowserSource): Promise<{ paragraphNodeIDs: string[]; headingNodeIDs: string[]; blockCount: number } | null> {
  if (source.format !== 'docx') return null;
  try {
    return await inspectDocx(await source.file.arrayBuffer());
  } catch {
    return null;
  }
}

function validNodeIDsFor(source: BrowserSource, docx: { paragraphNodeIDs: string[]; headingNodeIDs: string[] } | null): Set<string> {
  if (source.format === 'docx' && docx) {
    return new Set([...docx.paragraphNodeIDs, ...docx.headingNodeIDs]);
  }
  if (source.format === 'markdown') {
    return new Set(source.text.split(/\r?\n/).map((line, index) => (/^#{1,6}\s/.test(line) ? `h${index}` : `p${index}`)));
  }
  return new Set();
}

export async function requestFormattingPlan(
  source: BrowserSource,
  style: BrowserStyleName,
  instructions: string,
  apiKey: string,
  fetcher: typeof fetch = fetch
): Promise<{ plan: BrowserFormattingPlan; warnings: string[]; aiUsed: boolean }> {
  const warnings: string[] = [];
  const docx = await docxNodeLists(source);

  let base: BrowserFormattingPlan;
  if (source.format === 'docx') {
    if (!docx) throw new Error('This DOCX package cannot be read for formatting.');
    base = docxStylePlan(style, docx.paragraphNodeIDs, docx.headingNodeIDs);
  } else if (source.format === 'markdown') {
    base = markdownStylePlan(style, source.text);
  } else {
    base = { version: 1, operations: [] };
    warnings.push('This format cannot store presentation changes in the browser; the original file was preserved.');
  }

  if (style !== 'custom') {
    return { plan: base, warnings, aiUsed: false };
  }

  const description = instructions.trim();
  if (!description) throw new Error('Describe the custom style before formatting.');
  if (!apiKey) throw new Error('Configure a Gemini API key before formatting.');

  const tokens = resolveBrowserStyle(style);
  const blockCount = source.format === 'docx' ? docx?.blockCount ?? 0 : buildMarkdownBlocks(source.text).length;
  const prompt = [
    'Return JSON only matching {"version":1,"operations":[],"warnings":[]}.',
    'Operations must be one of:',
    '- {"kind":"set-presentation","nodeID":"p3","presentation":{"bold":true,"italic":false,"fontSize":12,"fontFamily":"Georgia","color":"#000000"}}',
    '- {"kind":"move","nodeID":"h1","targetIndex":2}',
    'Use only existing node IDs: headings are h<i> (i = line or paragraph index), paragraphs are p<i>.',
    `targetIndex must be an integer in [0, ${Math.max(0, blockCount - 1)}].`,
    'You may only set bold, italic, fontSize (6-72), fontFamily, color (hex without #), or move a section to a different position.',
    'Never add, delete, or rewrite any text.',
    `Style: ${JSON.stringify(tokens)}.`,
    `Instructions: ${description.slice(0, 2000)}.`,
    `Format: ${source.format}`,
  ].join(' ');

  const response = await fetcher('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!response.ok) throw new Error('Gemini could not create a formatting plan. Check the key or try again.');

  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const rawPlan = payload.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/^```json\s*|\s*```$/g, '').trim();
  if (!rawPlan) throw new Error('Gemini returned an empty formatting plan.');

  let aiPlan: BrowserFormattingPlan;
  try {
    aiPlan = JSON.parse(rawPlan) as BrowserFormattingPlan;
  } catch {
    throw new Error('Gemini returned an invalid formatting plan.');
  }
  if (aiPlan.version !== 1 || !Array.isArray(aiPlan.operations)) throw new Error('Gemini returned an unsupported formatting plan.');

  const { plan: screened, warnings: screeningWarnings } = screenAiPlan(aiPlan, validNodeIDsFor(source, docx), blockCount);
  warnings.push(...screeningWarnings);
  const plan = mergePlans(base, screened);
  return { plan, warnings, aiUsed: true };
}

export async function formatSource(source: BrowserSource, plan: BrowserFormattingPlan): Promise<BrowserResult> {
  if (source.format === 'docx') {
    try {
      const bytes = await source.file.arrayBuffer();
      const blob = await formatDocx(bytes, plan);
      return { filename: source.file.name, blob, format: source.format, sourceHash: source.sourceHash, contentPreserved: true, previewAvailable: true, warnings: [] };
    } catch (error) {
      return {
        filename: source.file.name,
        blob: source.file,
        format: source.format,
        sourceHash: source.sourceHash,
        contentPreserved: true,
        previewAvailable: false,
        warnings: [`DOCX formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
    }
  }

  const warnings = source.format === 'markdown'
    ? []
    : ['This format cannot store presentation changes in the browser; the original file was preserved.'];
  const blob = source.format === 'markdown'
    ? new Blob([applyMarkdownPlan(source.text, plan)], { type: source.file.type || 'text/markdown' })
    : source.file;
  return { filename: source.file.name, blob, format: source.format, sourceHash: source.sourceHash, contentPreserved: true, previewAvailable: source.format === 'txt' || source.format === 'markdown', warnings };
}

export function applyMarkdownPlan(source: string, plan: BrowserFormattingPlan): string {
  const presentationOps = new Map(
    plan.operations.filter((op) => op.kind === 'set-presentation').map((op) => [op.nodeID, (op as Extract<BrowserFormattingOperation, { kind: 'set-presentation' }>).presentation])
  );

  const styled = source.split(/\r?\n/).map((line, index) => {
    if (hasEmphasisMarkers(line)) return line;
    const nodeID = /^#{1,6}\s/.test(line) ? `h${index}` : `p${index}`;
    const presentation = presentationOps.get(nodeID);
    if (!presentation) return line;
    const listMarker = line.match(/^(\s*(?:[-*+]|\d+\.)\s+)/)?.[1] ?? '';
    const content = listMarker ? line.slice(listMarker.length) : line.replace(/^(#{1,6}\s+)/, '');
    const prefix = listMarker || line.slice(0, line.length - content.length);
    const marked = presentation.bold && presentation.italic
      ? `***${content}***`
      : presentation.bold
        ? `**${content}**`
        : presentation.italic
          ? `*${content}*`
          : content;
    return `${prefix}${marked}`;
  });

  const moves = plan.operations
    .filter((op) => op.kind === 'move')
    .map((op) => ({ nodeID: op.nodeID, targetIndex: (op as Extract<BrowserFormattingOperation, { kind: 'move' }>).targetIndex }));

  return reorderMarkdownLines(source, styled, moves);
}

async function hashBytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}