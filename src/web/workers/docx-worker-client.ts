import type { BrowserFormattingOperation } from '../formatting/style-plan';
import type { DocxInspection } from '../docx-formatting';

let worker: Worker | null = null;
let messageId = 0;
let workerSupported = typeof Worker !== 'undefined';

interface PendingMessage {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

const pending = new Map<number, PendingMessage>();

function getWorker(): Worker | null {
  if (!workerSupported) return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('./docx-worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<{ id: number; result: unknown; error: string | null }>) => {
      const { id, result, error } = event.data;
      const entry = pending.get(id);
      if (!entry) return;
      pending.delete(id);
      if (error) {
        entry.reject(new Error(error));
      } else {
        entry.resolve(result);
      }
    };
    worker.onerror = () => {
      // If worker fails to load, disable it for future calls
      workerSupported = false;
      worker = null;
      for (const entry of pending.values()) {
        entry.reject(new Error('DOCX worker failed.'));
      }
      pending.clear();
    };
    return worker;
  } catch {
    workerSupported = false;
    return null;
  }
}

function postToWorker(type: string, source: ArrayBuffer, plan?: { version: number; operations: BrowserFormattingOperation[] }): Promise<unknown> {
  const w = getWorker();
  if (!w) {
    // Fallback: import the worker logic inline (dynamic import)
    return import('./docx-worker-fallback').then((mod) => {
      switch (type) {
        case 'inspect': return mod.inspectDocxFallback(source);
        case 'format': return mod.formatDocxFallback(source, plan!);
        case 'extract-text': return mod.extractDocxTextFallback(source);
        default: throw new Error(`Unknown worker message type: ${type}`);
      }
    });
  }

  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    // Structured clone (copy) instead of transfer — the main thread may reuse the buffer
    w.postMessage({ id, type, source, plan });
  });
}

export async function inspectDocxViaWorker(source: ArrayBuffer): Promise<DocxInspection> {
  return postToWorker('inspect', source) as Promise<DocxInspection>;
}

export async function formatDocxViaWorker(source: ArrayBuffer, plan: { version: number; operations: BrowserFormattingOperation[] }): Promise<Blob> {
  return postToWorker('format', source, plan) as Promise<Blob>;
}

export async function extractDocxTextViaWorker(source: ArrayBuffer): Promise<string> {
  return postToWorker('extract-text', source) as Promise<string>;
}

export function isWorkerAvailable(): boolean {
  return getWorker() !== null;
}
