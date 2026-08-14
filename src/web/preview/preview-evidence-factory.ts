import type { PreviewEvidence } from '../types/evidence';
import { renderDocxPreview } from './docx-preview-renderer';
import { renderTextPreview } from './text-preview-renderer';

export async function createSourcePreview(
  arrayBuffer: ArrayBuffer,
  format: 'txt' | 'markdown' | 'docx' | 'pdf',
  name: string
): Promise<PreviewEvidence> {
  const warnings: string[] = [];
  let html = '';
  let text = '';
  let featureCount = 0;
  let status: PreviewEvidence['status'] = 'rendered';

  switch (format) {
    case 'docx': {
      const result = await renderDocxPreview(arrayBuffer);
      status = result.status;
      html = result.html;
      text = result.text;
      featureCount = result.featureCount;
      warnings.push(...result.warnings);
      break;
    }
    case 'txt':
    case 'markdown': {
      const decoder = new TextDecoder('utf-8');
      const textContent = decoder.decode(arrayBuffer);
      const result = await renderTextPreview(textContent, format);
      html = result.html;
      text = result.text;
      featureCount = result.featureCount;
      warnings.push(...result.warnings);
      if (result.warnings.length > 0) status = 'partial';
      break;
    }
    case 'pdf': {
      status = 'unavailable';
      html = '<div class="preview-unavailable">PDF preview not available</div>';
      text = '';
      featureCount = 0;
      warnings.push('PDF preview not implemented');
      break;
    }
  }

  return { status, format, html, text, featureCount, warnings };
}

export async function createResultPreview(
  blob: Blob,
  format: 'txt' | 'markdown' | 'docx' | 'pdf',
  formattingAvailable: boolean
): Promise<PreviewEvidence> {
  const arrayBuffer = await blob.arrayBuffer();

  if (!formattingAvailable && (format === 'docx' || format === 'pdf')) {
    return {
      status: 'unavailable',
      format,
      html: `<div class="preview-unavailable">${format.toUpperCase()} formatting not available; result would be identical to source</div>`,
      text: '',
      featureCount: 0,
      warnings: [`${format.toUpperCase()} formatting not implemented`],
    };
  }

  return createSourcePreview(arrayBuffer, format, 'result');
}