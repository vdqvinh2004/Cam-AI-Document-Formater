import type { WorkflowState, BrowserResult } from './workflow-context';
import type { ComparisonEvidence } from '../types/comparison';
import type { PreviewEvidence } from '../types/evidence';
import type { JobMessage } from '../types/job';
import { readSource, requestFormattingPlan, formatSource, extractDocxText } from '../formatting';
import { compareDocuments } from '../comparison/comparison-engine';
import { createSourcePreview, createResultPreview } from '../preview/preview-evidence-factory';
import { createLocalStorageKeyStore } from '../api-key-storage';

export interface FormattingFlowApi {
  setJobStatus: (status: JobMessage) => void;
  setSourcePreview: (preview: PreviewEvidence | null) => void;
  setResultPreview: (preview: PreviewEvidence | null) => void;
  setResult: (result: BrowserResult | null) => void;
  setComparison: (comparison: ComparisonEvidence | null) => void;
  setActivePanel: (panel: 'upload' | 'configure' | 'review') => void;
}

export async function runFormattingJob(state: WorkflowState, api: FormattingFlowApi): Promise<void> {
  const { setJobStatus, setSourcePreview, setResultPreview, setResult, setComparison, setActivePanel } = api;

  if (!state.source) {
    setJobStatus({ status: 'blocked', message: 'Select a document before formatting.' });
    return;
  }

  const requiresGemini = state.style === 'custom';
  if (requiresGemini) {
    if (!state.instructions.trim()) {
      setJobStatus({ status: 'blocked', message: 'Describe the custom style before formatting.' });
      return;
    }
    if (!state.disclosed) {
      setJobStatus({ status: 'blocked', message: 'Confirm the network disclosure before formatting.' });
      return;
    }
    if (!createLocalStorageKeyStore().getKey()) {
      setJobStatus({ status: 'blocked', message: 'Configure a Gemini API key before formatting.' });
      return;
    }
  }

  try {
    setJobStatus({ status: 'generating', message: requiresGemini ? 'Creating a formatting plan...' : 'Applying the style locally...', progress: 20 });
    const source = await readSource(state.source.file, state.source.arrayBuffer);
    const apiKey = requiresGemini ? createLocalStorageKeyStore().getKey() ?? '' : '';
    const { plan, warnings, aiUsed } = await requestFormattingPlan(source, state.style, state.instructions, apiKey);
    const mergedWarnings = [...warnings, aiUsed ? 'Custom style applied.' : 'Style applied locally.'];

    setJobStatus({ status: 'validating', message: 'Applying and validating the formatting plan...', progress: 65 });
    const formatted = await formatSource(source, plan);
    const formattingAvailable = formatted.previewAvailable && (formatted.format === 'markdown' || formatted.format === 'txt' || formatted.format === 'docx');
    const result: BrowserResult = {
      blob: formatted.blob,
      format: formatted.format,
      name: formatted.filename,
      filename: formatted.filename,
      validationStatus: 'not-run',
      formattingAvailable,
    };

    const sourceText = source.format === 'docx' ? await extractDocxText(state.source.arrayBuffer) : source.text;
    const resultText = formatted.format === 'docx' ? await extractDocxText(await formatted.blob.arrayBuffer()) : (formatted.format === 'markdown' || formatted.format === 'txt') ? await formatted.blob.text() : '';

    const [sourcePreview, resultPreview] = await Promise.all([
      createSourcePreview(state.source.arrayBuffer, source.format, state.source.name),
      createResultPreview(formatted.blob, formatted.format, formattingAvailable),
    ]);

    setJobStatus({ status: 'validating', message: 'Verifying that 100% of the content is preserved...', progress: 85 });
    const appliedChanges = plan.operations.length;
    const comparison = compareDocuments({
      sourceText,
      resultText,
      sourceFormat: source.format,
      resultFormat: formatted.format,
      validationStatus: 'not-run',
      appliedChanges,
      allowReorder: state.style === 'custom',
    });
    const validationPassed = formattingAvailable && comparison.status !== 'content-changed' && comparison.status !== 'unavailable';
    const updatedResult: BrowserResult = { ...result, validationStatus: validationPassed ? 'pass' : 'fail' };

    setSourcePreview(sourcePreview);
    setResult(updatedResult);
    setResultPreview(resultPreview);
    setComparison({
      ...comparison,
      validation: validationPassed ? 'pass' : 'fail',
      noChangesApplied: comparison.noChangesApplied,
    });

    const finalMessage = validationPassed
      ? comparison.noChangesApplied
        ? 'Formatting finished, but no style changes were applied — the result is identical to the source. Try another style or adjust instructions.'
        : mergedWarnings.length
          ? mergedWarnings.join(' ')
          : 'Formatting complete.'
      : comparison.noChangesApplied
        ? 'Formatting finished, but no style changes were applied — the result is identical to the source. Try another style or adjust instructions.'
        : 'Formatting changed document content; export was blocked and the original file was preserved.';

    setJobStatus({ status: validationPassed ? 'complete' : 'blocked', message: finalMessage, progress: 100 });
    if (validationPassed) {
      setActivePanel('review');
    }
  } catch (error) {
    setJobStatus({ status: 'failed', message: error instanceof Error ? error.message : 'Formatting failed.' });
  }
}