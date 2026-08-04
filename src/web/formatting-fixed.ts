import { resolveBrowserStyle, type BrowserStyleName, type BrowserStyleTokens } from './style-profiles.js';
import { formatDocx, extractDocxText } from './docx-formatting.js';

export { extractDocxText } from './docx-formatting.js';

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

interface BrowserPresentation {
  bold?: boolean;
  italic?: boolean;
}

interface BrowserFormattingOperation {
  kind: 'set-presentation';
  nodeID: string;
  presentation: BrowserPresentation;
}

interface BrowserFormattingPlan {
  version: number;
  operations: BrowserFormattingOperation[];
  warnings?: string[];
}

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const extensionFormats: Record<string, BrowserSource['format']> = {
  '.txt': 'txt', '.md': 'markdown', '.markdown': 'markdown', '.docx': 'docx', '.pdf': 'pdf',
};

export function detectFormat(filename: string): BrowserSource['format'] | null {
  const extension = `.${filename.split('.').pop()?.toLowerCase() ?? ''}`;
  return extensionFormats[extension] ?? null;
}

export async function readSource(file: File): Promise<BrowserSource> {
  if (file.size === 0) throw new Error('That file is empty. Choose a readable document.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Files larger than 20 MB are not supported in the browser.');
  const format = detectFormat(file.name);
  if (!format) throw new Error('That file type is not supported. Choose TXT, Markdown, DOCX, or PDF.');
  const bytes = await file.arrayBuffer();
  return { file, format, text: format === 'txt' || format === 'markdown' ? new TextDecoder().decode(bytes) : '', sourceHash: await hashBytes(bytes) };
}

export async function requestFormattingPlan(source: BrowserSource, style: BrowserStyleName, instructions: string, apiKey: string, fetcher: typeof fetch = fetch): Promise<{ plan: BrowserFormattingPlan; warnings: string[] }> {
  if (!apiKey) throw new Error('Configure a Gemini API key before formatting.');
  const warnings = source.format === 'txt' || source.format === 'markdown' || source.format === 'docx' ? [] : ['Preview is unavailable for this format; the original file will be preserved.'];
  const tokens = resolveBrowserStyle(style);
  const prompt = `Return JSON only matching {"version":1,"operations":[{"kind":"set-presentation","nodeID":"p0","presentation":{"bold":true,"italic":false}}],"warnings":[]}. Use only existing node IDs. Presentation fields only: bold, italic. Do not change content. Style: ${JSON.stringify(tokens)}. Instructions: ${instructions.slice(0, 2000)}. Format: ${source.format}`;
  const response = await fetcher('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!response.ok) throw new Error('Gemini could not create a formatting plan. Check the key or try again.');
  interface GeminiResponse {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  }
  const payload = await response.json() as GeminiResponse;
  if (!payload.candidates?.[0]?.content?.parts?.[0]?.text) throw new Error('Invalid response from Gemini.');
  const jsonText = payload.candidates[0].content.parts[0].text;
  const cleaned = jsonText.replace(/^```json\s*|\s*```$/g, '');
  const { version, operations, warnings: geminiWarnings } = JSON.parse(cleaned) as { version: number; operations: BrowserFormattingOperation[]; warnings?: string[] };
  return { plan: { version, operations }, warnings: [...warnings, ...(geminiWarnings ?? [])] };
}

export async function formatSource(source: BrowserSource, plan: BrowserFormattingPlan): Promise<BrowserResult> {
  if (source.format === 'docx') {
    try {
      const bytes = await source.file.arrayBuffer();
      const blob = await formatDocx(bytes, plan);
      return { filename: source.file.name, blob, format: source.format, sourceHash: source.sourceHash, contentPreserved: true, previewAvailable: true, warnings: [] };
    } catch (error) {
      // If DOCX formatting fails, return the original file preserved
      return {
        filename: source.file.name,
        blob: source.file,
        format: source.format,
        sourceHash: source.sourceHash,
        contentPreserved: true,
        previewAvailable: false,
        warnings: [`DOCX formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
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

function applyMarkdownPlan(source: string, plan: BrowserFormattingPlan): string {
  const operations = new Map(plan.operations.map((operation) => [operation.nodeID, operation]));
  return source.split(/\r?\n/).map((line, index) => {
    const nodeID = /^#{1,6}\s/.test(line) ? `h${index}` : `p${index}`;
    const presentation = operations.get(nodeID)?.presentation;
    if (!presentation) return line;
    
    const content = line.replace(/^(#{1,6}\s+)/, '');
    const prefix = line.slice(0, line.length - content.length);
    const marked = presentation.bold && presentation.italic ? `***${content}***` : presentation.bold ? `**${content}**` : presentation.italic ? `*${content}*` : content;
    return `${prefix}${marked}`;
  }).join('\n');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename.replace(/(\.[^.]+)?$/, '-formatted$1'); anchor.click();
  URL.revokeObjectURL(url);
}

async function hashBytes(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}