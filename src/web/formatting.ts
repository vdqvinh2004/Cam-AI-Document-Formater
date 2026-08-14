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
  verificationNote?: string;
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

async function docxNodeLists(source: BrowserSource): Promise<{ paragraphNodeIDs: string[]; headingNodeIDs: string[]; blockCount: number; nodes: Array<{ nodeID: string; text: string }> } | null> {
  if (source.format !== 'docx') return null;
  try {
    return await inspectDocx(await source.file.arrayBuffer());
  } catch {
    return null;
  }
}

function nodeMapLines(text: string): string[] {
  const entries: string[] = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (line.trim() === '') continue;
    const nodeID = /^#{1,6}\s/.test(line) ? `h${index}` : `p${index}`;
    entries.push(`${nodeID}: "${line.trim().slice(0, 120).replaceAll('"', '\\"')}"`);
  }
  return entries;
}

const MAX_NODE_MAP_CHARS = 24000;

/**
 * Builds the node map sent to the AI. Heading entries always come first so the
 * AI can target sections even in long documents whose paragraph entries would
 * otherwise exhaust the character budget; paragraphs fill the remaining space.
 */
function buildNodeMap(source: BrowserSource, docx: { nodes: Array<{ nodeID: string; text: string }> } | null): string {
  const entries = source.format === 'markdown'
    ? nodeMapLines(source.text)
    : source.format === 'docx' && docx
      ? docx.nodes.map((node) => `${node.nodeID}: "${node.text.slice(0, 120).replaceAll('"', '\\"')}"`)
      : [];
  if (entries.length === 0) return '(no document nodes available)';
  const headings = entries.filter((entry) => entry.startsWith('h'));
  const paragraphs = entries.filter((entry) => entry.startsWith('p'));
  const kept: string[] = [];
  let length = 0;
  for (const entry of [...headings, ...paragraphs]) {
    if (length + entry.length + 1 > MAX_NODE_MAP_CHARS) break;
    kept.push(entry);
    length += entry.length + 1;
  }
  let map = kept.join('\n');
  if (kept.length < entries.length) {
    map = `${map}\n…(remaining nodes omitted)`;
  }
  return map;
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
    '- {"kind":"rewrite-text","nodeID":"h1","text":"# 2.4 New heading"}',
    'Use only the node IDs listed in "Document nodes"; a move relocates the whole section that starts at that node — the heading plus all content (paragraphs, tables) until the next heading.',
    `targetIndex must be an integer in [0, ${Math.max(0, blockCount - 1)}].`,
    'You may only set bold, italic, fontSize (6-72), fontFamily, color (hex without #), move a section to a different position, or rewrite a heading line.',
    'rewrite-text may only target a heading node (node IDs starting with h) and replaces the ENTIRE line: keep the "#" markers for Markdown, write plain text for DOCX; 1-200 characters.',
    'Never add or delete lines, and never rewrite paragraph text.',
    'If the user asks to keep the current formatting, emit no set-presentation operations; emit only the requested move operations.',
    style === 'custom'
      ? 'Style: follow the user instructions exactly; restyle only where the instructions describe new formatting.'
      : `Style: ${JSON.stringify(tokens)}.`,
    `Instructions: ${description.slice(0, 2000)}.`,
    `Format: ${source.format}`,
    '\nDocument nodes:\n',
    buildNodeMap(source, docx),
  ].join(' ');

  const rawPlan = await geminiCall(prompt, apiKey, fetcher);

  let aiPlan: BrowserFormattingPlan;
  try {
    aiPlan = JSON.parse(rawPlan) as BrowserFormattingPlan;
  } catch {
    throw new Error('Gemini returned an invalid formatting plan.');
  }
  if (aiPlan.version !== 1 || !Array.isArray(aiPlan.operations)) throw new Error('Gemini returned an unsupported formatting plan.');

  const headingNodeIDs = style === 'custom'
    ? source.format === 'docx' && docx
      ? new Set(docx.headingNodeIDs)
      : new Set(source.text.split(/\r?\n/).map((line, index) => (/^#{1,6}\s/.test(line) ? `h${index}` : `p${index}`)).filter((id) => id.startsWith('h')))
    : undefined;
  const { plan: screened, warnings: screeningWarnings } = screenAiPlan(aiPlan, validNodeIDsFor(source, docx), blockCount, headingNodeIDs);
  warnings.push(...screeningWarnings);
  const plan = style === 'custom' ? screened : mergePlans(base, screened);
  return { plan, warnings, aiUsed: true };
}

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent';

async function geminiCall(prompt: string, apiKey: string, fetcher: typeof fetch): Promise<string> {
  const response = await fetcher(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!response.ok) throw new Error('Gemini could not create a formatting plan. Check the key or try again.');
  const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const raw = payload.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/^```json\s*|\s*```$/g, '').trim();
  if (!raw) throw new Error('Gemini returned an empty response.');
  return raw;
}

export interface CustomClarification {
  clarifiedDescription: string;
  affectsContent: boolean;
  reason: string;
}

export async function clarifyCustomInstructions(
  description: string,
  format: BrowserSource['format'],
  apiKey: string,
  fetcher: typeof fetch = fetch
): Promise<CustomClarification | null> {
  const prompt = [
    'You plan a document-formatting step for another AI. Return JSON only: {"clarifiedDescription":"...","affectsContent":true,"reason":"..."}',
    'Rephrase the user request into precise, unambiguous formatting steps (typography, spacing, section order).',
    'Set "affectsContent" to true when executing the request would change the actual text content — adding, deleting, rewording, or renumbering headings. Set it false when only typography, emphasis, or section order change.',
    `User request: ${description.slice(0, 2000)}.`,
    `Format: ${format}`,
  ].join(' ');
  try {
    const raw = await geminiCall(prompt, apiKey, fetcher);
    const parsed = JSON.parse(raw) as Partial<CustomClarification>;
    if (typeof parsed.clarifiedDescription !== 'string' || !parsed.clarifiedDescription.trim()) return null;
    return {
      clarifiedDescription: parsed.clarifiedDescription.trim().slice(0, 2000),
      affectsContent: parsed.affectsContent === true,
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 500) : '',
    };
  } catch {
    return null;
  }
}

export interface CustomVerification {
  matches: boolean;
  reason: string;
  operations: BrowserFormattingOperation[];
}

export async function verifyCustomResult(
  description: string,
  formattedText: string,
  sourceText: string,
  format: BrowserSource['format'],
  apiKey: string,
  fetcher: typeof fetch = fetch
): Promise<CustomVerification | null> {
  const prompt = [
    'You verify a document-formatting step. Return JSON only: {"matches":true,"reason":"...","operations":[]}',
    'Operations (only when "matches" is false, to correct the result) may be:',
    '- {"kind":"set-presentation","nodeID":"p3","presentation":{"bold":true}}',
    '- {"kind":"move","nodeID":"h1","targetIndex":2}',
    '- {"kind":"rewrite-text","nodeID":"h1","text":"# 2.4 New heading"} (headings only; the full replacement line)',
    'Compare the source text with the formatted text to decide whether the user request was executed.',
    'If the user request implies changes and the formatted text is identical to the source text, "matches" MUST be false.',
    'If the formatted text satisfies the user request, "matches" is true and "operations" is [].',
    `User request: ${description.slice(0, 2000)}.`,
    `Format: ${format}`,
    '\nSource text:\n',
    sourceText.slice(0, 12000),
    '\nFormatted text:\n',
    formattedText.slice(0, 12000),
  ].join(' ');
  try {
    const raw = await geminiCall(prompt, apiKey, fetcher);
    const parsed = JSON.parse(raw) as Partial<CustomVerification>;
    return {
      matches: parsed.matches === true,
      reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 500) : '',
      operations: Array.isArray(parsed.operations) ? parsed.operations : [],
    };
  } catch {
    return null;
  }
}

export const MAX_CUSTOM_REFINEMENTS = 2;

export interface CustomFormattingOutcome {
  plan: BrowserFormattingPlan;
  formatted: BrowserResult;
  expectedTextChanges?: Array<{ source: string; replacement: string }>;
  verificationNote: string | null;
  refinements: number;
  clarificationAffectsContent: boolean;
  warnings: string[];
}

async function formattedTextFor(formatted: BrowserResult): Promise<string> {
  if (formatted.format === 'markdown') return await formatted.blob.text();
  if (formatted.format === 'docx') return extractDocxText(await formatted.blob.arrayBuffer());
  return '';
}

function expectedTextChangesFor(
  plan: BrowserFormattingPlan,
  source: BrowserSource,
  docx: { nodes: Array<{ nodeID: string; text: string }> } | null
): Array<{ source: string; replacement: string }> | undefined {
  const rewrites = plan.operations.filter((op) => op.kind === 'rewrite-text') as Array<Extract<BrowserFormattingOperation, { kind: 'rewrite-text' }>>;
  if (rewrites.length === 0) return undefined;
  const changes: Array<{ source: string; replacement: string }> = [];
  for (const op of rewrites) {
    if (source.format === 'markdown') {
      const line = source.text.split(/\r?\n/)[Number(op.nodeID.slice(1))];
      if (line !== undefined) changes.push({ source: line.trim(), replacement: op.text });
    } else if (source.format === 'docx' && docx) {
      const node = docx.nodes.find((entry) => entry.nodeID === op.nodeID);
      if (node) changes.push({ source: node.text.trim(), replacement: op.text });
    }
  }
  return changes.length > 0 ? changes : undefined;
}

export interface CustomFormattingProgress {
  progress: number;
  message: string;
}

export async function runCustomFormatting(
  source: BrowserSource,
  instructions: string,
  apiKey: string,
  fetcher: typeof fetch = fetch,
  onProgress?: (stage: CustomFormattingProgress) => void
): Promise<CustomFormattingOutcome> {
  const warnings: string[] = [];
  const description = instructions.trim();
  if (!description) throw new Error('Describe the custom style before formatting.');
  if (!apiKey) throw new Error('Configure a Gemini API key before formatting.');

  let refinements = 0;
  let verificationNote: string | null = null;
  let clarificationAffectsContent = false;

  onProgress?.({ progress: 10, message: 'Analyzing the custom description…' });
  const clarification = await clarifyCustomInstructions(description, source.format, apiKey, fetcher);
  const workingDescription = clarification ? clarification.clarifiedDescription : description;
  if (clarification) {
    clarificationAffectsContent = clarification.affectsContent;
    if (clarification.affectsContent && clarification.reason) warnings.push(`Note: ${clarification.reason}`);
  }

  const docx = await docxNodeLists(source);
  onProgress?.({ progress: 20, message: 'Creating a formatting plan…' });
  let plan = (await requestFormattingPlan(source, 'custom', workingDescription, apiKey, fetcher)).plan;
  const blockCount = source.format === 'docx' ? docx?.blockCount ?? 0 : buildMarkdownBlocks(source.text).length;
  const validNodeIDs = validNodeIDsFor(source, docx);
  const headingNodeIDs = source.format === 'docx' && docx
    ? new Set(docx.headingNodeIDs)
    : new Set(source.text.split(/\r?\n/).map((line, index) => (/^#{1,6}\s/.test(line) ? `h${index}` : `p${index}`)).filter((id) => id.startsWith('h')));

  let formatted = await formatSource(source, plan);
  const sourceTextForVerify = source.format === 'markdown'
    ? source.text
    : source.format === 'docx'
      ? await extractDocxText(await source.file.arrayBuffer())
      : '';
  while (source.format === 'markdown' || source.format === 'docx') {
    onProgress?.({ progress: 65, message: 'Verifying the result matches your description…' });
    const verification = await verifyCustomResult(workingDescription, await formattedTextFor(formatted), sourceTextForVerify, source.format, apiKey, fetcher);
    if (!verification) {
      verificationNote = 'AI verification was inconclusive; proceeding with the current result.';
      break;
    }
    if (verification.matches) {
      verificationNote = 'AI verified the result matches your description.';
      break;
    }
    if (refinements >= MAX_CUSTOM_REFINEMENTS) {
      verificationNote = 'The result could not fully match your description after refinements; reviewing the last result.';
      break;
    }
    const corrective = screenAiPlan({ version: 1, operations: verification.operations, warnings: [] }, validNodeIDs, blockCount, headingNodeIDs);
    if (corrective.plan.operations.length === 0) {
      verificationNote = 'AI verification could not suggest corrective changes; proceeding with the current result.';
      break;
    }
    plan = mergePlans(plan, corrective.plan);
    warnings.push(...corrective.warnings);
    refinements += 1;
    onProgress?.({ progress: 70 + refinements * 5, message: `Refining to match your description (${refinements}/${MAX_CUSTOM_REFINEMENTS})…` });
    formatted = await formatSource(source, plan);
  }

  const expectedTextChanges = expectedTextChangesFor(plan, source, docx);
  const out: CustomFormattingOutcome = {
    plan,
    formatted,
    expectedTextChanges,
    verificationNote,
    refinements,
    clarificationAffectsContent,
    warnings,
  };
  return out;
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
  const rewrites = new Map(
    plan.operations.filter((op) => op.kind === 'rewrite-text').map((op) => [op.nodeID, (op as Extract<BrowserFormattingOperation, { kind: 'rewrite-text' }>).text])
  );

  const styled = source.split(/\r?\n/).map((line, index) => {
    if (hasEmphasisMarkers(line)) return line;
    const nodeID = /^#{1,6}\s/.test(line) ? `h${index}` : `p${index}`;
    const rewrite = rewrites.get(nodeID);
    if (rewrite) return rewrite;
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