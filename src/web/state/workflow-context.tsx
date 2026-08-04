import { createContext, useContext, useReducer, ReactNode, useCallback, useMemo, useEffect } from 'react';
import type { WebRoute } from '../types/route';
import type { PreviewEvidence } from '../types/evidence';
import type { ComparisonEvidence } from '../types/comparison';
import type { JobStatus, JobMessage } from '../types/job';
import { createLocalStorageKeyStore } from '../api-key-storage';
import { useRouter } from '../router';
import { readSource, requestFormattingPlan, formatSource, extractDocxText } from '../formatting';
import { compareDocuments } from '../comparison/comparison-engine';
import { createSourcePreview, createResultPreview } from '../preview/preview-evidence-factory';

export interface BrowserSource {
  file: File;
  format: 'txt' | 'markdown' | 'docx' | 'pdf';
  name: string;
  size: number;
  arrayBuffer: ArrayBuffer;
}

export interface BrowserResult {
  blob: Blob;
  format: 'txt' | 'markdown' | 'docx' | 'pdf';
  name: string;
  filename?: string;
  validationStatus: 'pass' | 'fail' | 'inconclusive' | 'not-run';
  formattingAvailable: boolean;
}

export interface WorkflowState {
  currentRoute: WebRoute;
  source: BrowserSource | null;
  result: BrowserResult | null;
  sourcePreview: PreviewEvidence | null;
  resultPreview: PreviewEvidence | null;
  comparison: ComparisonEvidence | null;
  jobStatus: JobStatus;
  jobMessage: string;
  jobProgress?: number;
  style: 'simple' | 'modern' | 'professional' | 'easy-to-read' | 'academic' | 'custom';
  instructions: string;
  disclosed: boolean;
}

export type WorkflowAction =
  | { type: 'SET_ROUTE'; payload: WebRoute }
  | { type: 'SET_SOURCE'; payload: BrowserSource | null }
  | { type: 'SET_RESULT'; payload: BrowserResult | null }
  | { type: 'SET_SOURCE_PREVIEW'; payload: PreviewEvidence | null }
  | { type: 'SET_RESULT_PREVIEW'; payload: PreviewEvidence | null }
  | { type: 'SET_COMPARISON'; payload: ComparisonEvidence | null }
  | { type: 'SET_JOB_STATUS'; payload: JobMessage }
  | { type: 'SET_STYLE'; payload: WorkflowState['style'] }
  | { type: 'SET_INSTRUCTIONS'; payload: string }
  | { type: 'SET_DISCLOSED'; payload: boolean }
  | { type: 'RESET_WORKFLOW' };

export const initialState: WorkflowState = {
  currentRoute: { path: '/', label: 'Workspace', requiresDocument: false, requiresResult: false },
  source: null,
  result: null,
  sourcePreview: null,
  resultPreview: null,
  comparison: null,
  jobStatus: 'idle',
  jobMessage: '',
  style: 'modern',
  instructions: '',
  disclosed: false,
};

export function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case 'SET_ROUTE':
      return { ...state, currentRoute: action.payload };
    case 'SET_SOURCE':
      return { ...state, source: action.payload, result: null, resultPreview: null, comparison: null };
    case 'SET_RESULT':
      return { ...state, result: action.payload };
    case 'SET_SOURCE_PREVIEW':
      return { ...state, sourcePreview: action.payload };
    case 'SET_RESULT_PREVIEW':
      return { ...state, resultPreview: action.payload };
    case 'SET_COMPARISON':
      return { ...state, comparison: action.payload };
    case 'SET_JOB_STATUS':
      return { ...state, jobStatus: action.payload.status, jobMessage: action.payload.message, jobProgress: action.payload.progress };
    case 'SET_STYLE':
      return { ...state, style: action.payload };
    case 'SET_INSTRUCTIONS':
      return { ...state, instructions: action.payload };
    case 'SET_DISCLOSED':
      return { ...state, disclosed: action.payload };
    case 'RESET_WORKFLOW':
      return initialState;
    default:
      return state;
  }
}

interface WorkflowContextValue {
  state: WorkflowState;
  navigate: (route: WebRoute) => void;
  runFormatting: () => Promise<void>;
  setSource: (source: BrowserSource | null) => void;
  setResult: (result: BrowserResult | null) => void;
  setSourcePreview: (preview: PreviewEvidence | null) => void;
  setResultPreview: (preview: PreviewEvidence | null) => void;
  setComparison: (comparison: ComparisonEvidence | null) => void;
  setJobStatus: (status: JobMessage) => void;
  setStyle: (style: WorkflowState['style']) => void;
  setInstructions: (instructions: string) => void;
  setDisclosed: (disclosed: boolean) => void;
  setApiKey: (apiKey: string) => void;
  removeApiKey: () => void;
  resetWorkflow: () => void;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const router = useRouter();

  useEffect(() => {
    dispatch({ type: 'SET_ROUTE', payload: router.currentRoute });
  }, [router.currentRoute]);

  const navigate = useCallback((route: WebRoute) => {
    router.navigate(route);
    dispatch({ type: 'SET_ROUTE', payload: route });
  }, [router]);
  const setSource = useCallback((source: BrowserSource | null) => dispatch({ type: 'SET_SOURCE', payload: source }), []);
  const setResult = useCallback((result: BrowserResult | null) => dispatch({ type: 'SET_RESULT', payload: result }), []);
  const setSourcePreview = useCallback((preview: PreviewEvidence | null) => dispatch({ type: 'SET_SOURCE_PREVIEW', payload: preview }), []);
  const setResultPreview = useCallback((preview: PreviewEvidence | null) => dispatch({ type: 'SET_RESULT_PREVIEW', payload: preview }), []);
  const setComparison = useCallback((comparison: ComparisonEvidence | null) => dispatch({ type: 'SET_COMPARISON', payload: comparison }), []);
  const setJobStatus = useCallback((status: JobMessage) => dispatch({ type: 'SET_JOB_STATUS', payload: status }), []);
  const setStyle = useCallback((style: WorkflowState['style']) => dispatch({ type: 'SET_STYLE', payload: style }), []);
  const setInstructions = useCallback((instructions: string) => dispatch({ type: 'SET_INSTRUCTIONS', payload: instructions }), []);
  const setDisclosed = useCallback((disclosed: boolean) => dispatch({ type: 'SET_DISCLOSED', payload: disclosed }), []);
  const runFormatting = useCallback(async () => {
    if (!state.source) return;
    if (!state.disclosed) {
      setJobStatus({ status: 'blocked', message: 'Confirm the network disclosure before formatting.' });
      return;
    }
    const apiKey = createLocalStorageKeyStore().getKey();
    if (!apiKey) {
      setJobStatus({ status: 'blocked', message: 'Configure a Gemini API key before formatting.' });
      return;
    }
    try {
      setJobStatus({ status: 'generating', message: 'Creating a formatting plan...', progress: 20 });
      const source = await readSource(state.source.file);
      const { plan, warnings: planWarnings } = await requestFormattingPlan(source, state.style, state.instructions, apiKey);
      const warnings = [...planWarnings, 'Formatting plan applied.'];
      setJobStatus({ status: 'validating', message: 'Applying and validating the formatting plan...', progress: 65 });
      const formatted = await formatSource(source, plan);
      const formattingAvailable = formatted.previewAvailable && (formatted.format === 'markdown' || formatted.format === 'txt' || formatted.format === 'docx');
      const result: BrowserResult = {
        blob: formatted.blob,
        format: formatted.format,
        name: formatted.filename,
        filename: formatted.filename,
        validationStatus: 'not-run', // Will be updated after comparison
        formattingAvailable,
      };
      const sourceText = source.format === 'docx' ? await extractDocxText(state.source.arrayBuffer) : source.text;
      const resultText = formatted.format === 'docx' ? await extractDocxText(await formatted.blob.arrayBuffer()) : (formatted.format === 'markdown' || formatted.format === 'txt') ? await formatted.blob.text() : '';
      const [sourcePreview, resultPreview] = await Promise.all([
        createSourcePreview(state.source.arrayBuffer, source.format, state.source.name),
        createResultPreview(formatted.blob, formatted.format, formattingAvailable),
      ]);
      const comparison = compareDocuments({ sourceText, resultText, sourceFormat: source.format, resultFormat: formatted.format, validationStatus: 'not-run' });
      const validationPassed = formattingAvailable && comparison.status === 'preserved';
        const updatedResult: BrowserResult = { ...result, validationStatus: validationPassed ? 'pass' : 'fail' };
      dispatch({ type: 'SET_SOURCE_PREVIEW', payload: sourcePreview });
      dispatch({ type: 'SET_RESULT', payload: updatedResult });
      dispatch({ type: 'SET_RESULT_PREVIEW', payload: resultPreview });
      dispatch({ type: 'SET_COMPARISON', payload: { ...comparison, validation: validationPassed ? 'pass' : 'fail' } });
      setJobStatus({ status: validationPassed ? 'complete' : 'blocked', message: validationPassed ? (warnings.length ? warnings.join(' ') : 'Formatting complete.') : 'No safe browser transformation is available for this format; the original file was preserved.', progress: 100 });
      if (validationPassed) {
        navigate({ path: '/review', label: 'Review', requiresDocument: true, requiresResult: true });
      }
    } catch (error) {
      setJobStatus({ status: 'failed', message: error instanceof Error ? error.message : 'Formatting failed.' });
    }
  }, [router, setJobStatus, state.disclosed, state.instructions, state.source, state.style]);
  const setApiKey = useCallback((apiKey: string) => {
    const keyStore = createLocalStorageKeyStore();
    keyStore.setKey(apiKey);
  }, []);
  const removeApiKey = useCallback(() => {
    const keyStore = createLocalStorageKeyStore();
    keyStore.removeKey();
  }, []);
  const resetWorkflow = useCallback(() => dispatch({ type: 'RESET_WORKFLOW' }), []);

  const value = useMemo(() => ({
    state,
    navigate,
    runFormatting,
    setSource,
    setResult,
    setSourcePreview,
    setResultPreview,
    setComparison,
    setJobStatus,
    setStyle,
    setInstructions,
    setDisclosed,
    setApiKey,
    removeApiKey,
    resetWorkflow,
  }), [state, navigate, runFormatting, setSource, setResult, setSourcePreview, setResultPreview, setComparison, setJobStatus, setStyle, setInstructions, setDisclosed, setApiKey, removeApiKey, resetWorkflow]);

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('useWorkflow must be used within WorkflowProvider');
  return context;
}