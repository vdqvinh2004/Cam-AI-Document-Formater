import { describe, expect, it, vi } from 'vitest';
import { evaluateValidationGate } from '../../../src/web/validation/validation-gate';
import { createSourcePreview, createResultPreview } from '../../../src/web/preview/preview-evidence-factory';

vi.mock('dompurify', () => ({
  default: { sanitize: (html: string) => html },
}));

describe('unavailable states', () => {
  it('never permits export when formatting is unavailable', () => {
    const gate = evaluateValidationGate({ validationStatus: 'pass', formattingAvailable: false, format: 'docx' });
    expect(gate.canExport).toBe(false);
    expect(gate.reason).toBe('formatting-unavailable');
    expect(gate.userMessage).toContain('DOCX');
  });

  it('permits export only on a passing, available validation', () => {
    expect(evaluateValidationGate({ validationStatus: 'pass', formattingAvailable: true, format: 'txt' }).canExport).toBe(true);
    expect(evaluateValidationGate({ validationStatus: 'fail', formattingAvailable: true, format: 'txt' }).canExport).toBe(false);
    expect(evaluateValidationGate({ validationStatus: 'inconclusive', formattingAvailable: true, format: 'txt' }).canExport).toBe(false);
    expect(evaluateValidationGate({ validationStatus: 'not-run', formattingAvailable: true, format: 'txt' }).canExport).toBe(false);
  });

  it('marks PDF source previews as unavailable rather than pretending to render', async () => {
    const preview = await createSourcePreview(new Uint8Array([37, 80, 68, 70]).buffer, 'pdf', 'sample.pdf');
    expect(preview.status).toBe('unavailable');
    expect(preview.text).toBe('');
    expect(preview.warnings.some((warning) => warning.includes('PDF'))).toBe(true);
  });

  it('reports DOCX results as unavailable when no safe transformation exists', async () => {
    const blob = new Blob([new Uint8Array([1, 2, 3])]);
    const preview = await createResultPreview(blob, 'docx', false);
    expect(preview.status).toBe('unavailable');
    expect(preview.featureCount).toBe(0);
    expect(preview.warnings.some((warning) => warning.includes('not implemented'))).toBe(true);
  });

  it('renders result previews for available text formats', async () => {
    const preview = await createResultPreview(new Blob(['Plain body text']), 'txt', true);
    expect(preview.status).toBe('rendered');
    expect(preview.text).toContain('Plain body text');
  });
});
