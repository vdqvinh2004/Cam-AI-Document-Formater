import { createContext, useContext, useReducer, ReactNode, useCallback, useMemo, useEffect, useState } from 'react';
import type { WebRoute } from '../types/route';
import type { PreviewEvidence } from '../types/evidence';
import type { ComparisonEvidence } from '../types/comparison';
import type { JobStatus, JobMessage } from '../types/job';
import type { DashboardPanel } from '../types/panel';
import { createLocalStorageKeyStore } from '../api-key-storage';
import { useRouter } from '../router';
import { runFormattingJob } from './formatting-flow';

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
  verificationNote?: string;
}

export interface WorkflowState {
  currentRoute: WebRoute;
  activePanel: DashboardPanel;
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
  | { type: 'SET_ACTIVE_PANEL'; payload: DashboardPanel }
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
  activePanel: 'upload',
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
    case 'SET_ACTIVE_PANEL':
      return { ...state, activePanel: action.payload };
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
  hasApiKey: boolean;
  navigate: (route: WebRoute) => void;
  setActivePanel: (panel: DashboardPanel) => void;
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
  const [keyVersion, setKeyVersion] = useState(0);
  const router = useRouter();

  useEffect(() => {
    dispatch({ type: 'SET_ROUTE', payload: router.currentRoute });
  }, [router.currentRoute]);

  const keyStore = useMemo(() => createLocalStorageKeyStore(), []);
  const hasApiKey = useMemo(() => keyStore.hasKey(), [keyStore, keyVersion]);

  const navigate = useCallback((route: WebRoute) => {
    router.navigate(route);
    dispatch({ type: 'SET_ROUTE', payload: route });
  }, [router]);
  const setActivePanel = useCallback((panel: DashboardPanel) => {
    const params = new URLSearchParams(window.location.search);
    if (panel === 'upload') params.delete('panel');
    else params.set('panel', panel);
    const query = params.toString();
    window.history.pushState(null, '', `/${query ? `?${query}` : ''}`);
    dispatch({ type: 'SET_ACTIVE_PANEL', payload: panel });
  }, []);
  const setSource = useCallback((source: BrowserSource | null) => dispatch({ type: 'SET_SOURCE', payload: source }), []);
  const setResult = useCallback((result: BrowserResult | null) => dispatch({ type: 'SET_RESULT', payload: result }), []);
  const setSourcePreview = useCallback((preview: PreviewEvidence | null) => dispatch({ type: 'SET_SOURCE_PREVIEW', payload: preview }), []);
  const setResultPreview = useCallback((preview: PreviewEvidence | null) => dispatch({ type: 'SET_RESULT_PREVIEW', payload: preview }), []);
  const setComparison = useCallback((comparison: ComparisonEvidence | null) => dispatch({ type: 'SET_COMPARISON', payload: comparison }), []);
  const setJobStatus = useCallback((status: JobMessage) => dispatch({ type: 'SET_JOB_STATUS', payload: status }), []);
  const setStyle = useCallback((style: WorkflowState['style']) => dispatch({ type: 'SET_STYLE', payload: style }), []);
  const setInstructions = useCallback((instructions: string) => dispatch({ type: 'SET_INSTRUCTIONS', payload: instructions }), []);
  const setDisclosed = useCallback((disclosed: boolean) => dispatch({ type: 'SET_DISCLOSED', payload: disclosed }), []);
  const setApiKey = useCallback((apiKey: string) => {
    keyStore.setKey(apiKey);
    setKeyVersion((version) => version + 1);
  }, [keyStore]);
  const removeApiKey = useCallback(() => {
    keyStore.removeKey();
    setKeyVersion((version) => version + 1);
  }, [keyStore]);
  const resetWorkflow = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    dispatch({ type: 'RESET_WORKFLOW' });
  }, []);
  const abortControllerRef = useState(() => ({ current: null as AbortController | null }))[0];
  const runFormatting = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    await runFormattingJob(state, {
      setJobStatus,
      setSourcePreview,
      setResultPreview,
      setResult,
      setComparison,
      setActivePanel,
    }, controller.signal);
  }, [state, setActivePanel, setComparison, setJobStatus, setResult, setResultPreview, setSourcePreview]);

  const value = useMemo(() => ({
    state,
    hasApiKey,
    navigate,
    setActivePanel,
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
  }), [state, hasApiKey, navigate, setActivePanel, runFormatting, setSource, setResult, setSourcePreview, setResultPreview, setComparison, setJobStatus, setStyle, setInstructions, setDisclosed, setApiKey, removeApiKey, resetWorkflow]);

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
}

export function useWorkflow() {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error('useWorkflow must be used within WorkflowProvider');
  return context;
}