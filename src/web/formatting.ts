import { resolveBrowserStyle, type BrowserStyleName, type BrowserStyleTokens } from './style-profiles.js';

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

export async function readSource(file: File): Promise<BrowserSource> {
  if (file.size === 0) throw new Error('That file is empty. Choose a readable document.');
  if (file.size > MAX_FILE_SIZE) throw new Error('Files larger than 20 MB are not supported in the browser.');
  const format = detectFormat(file.name);
  if (!format) throw new Error('That file type is not supported. Choose TXT, Markdown, DOCX, or PDF.');
  const bytes = await file.arrayBuffer();
  return { file, format, text: format === 'txt' || format === 'markdown' ? new TextDecoder().decode(bytes) : '', sourceHash: await hashBytes(bytes) };
}

export async function requestFormattingPlan(source: BrowserSource, style: BrowserStyleName, instructions: string, apiKey: string, fetcher: typeof fetch = fetch): Promise<{ tokens: BrowserStyleTokens; warnings: string[] }> {
  if (!apiKey) throw new Error('Configure a Gemini API key before formatting.');
  const warnings = source.format === 'txt' || source.format === 'markdown' ? [] : ['Preview is unavailable for this format; the original file will be preserved.'];
  const tokens = resolveBrowserStyle(style);
  const response = await fetcher('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: `Return JSON only with presentation-only formatting operations. Do not change content. Style: ${JSON.stringify(tokens)}. Instructions: ${instructions.slice(0, 2000)}. Format: ${source.format}` }] }] }),
  });
  if (!response.ok) throw new Error('Gemini could not create a formatting plan. Check the key or try again.');
  return { tokens, warnings };
}

export async function formatSource(source: BrowserSource): Promise<BrowserResult> {
  const blob = new Blob([await source.file.arrayBuffer()], { type: source.file.type || 'application/octet-stream' });
  return { filename: source.file.name, blob, format: source.format, sourceHash: source.sourceHash, contentPreserved: true, previewAvailable: source.format === 'txt' || source.format === 'markdown', warnings: source.format === 'txt' || source.format === 'markdown' ? [] : ['Formatting is preserved in the exported source file; rich preview is not available for this format yet.'] };
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