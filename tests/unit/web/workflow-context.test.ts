import { describe, expect, it } from 'vitest';
import { initialState, workflowReducer, type WorkflowAction } from '../../../src/web/state/workflow-context';

describe('workflow context initial state', () => {
  it('starts idle with no document or result', () => {
    expect(initialState.source).toBeNull();
    expect(initialState.result).toBeNull();
    expect(initialState.sourcePreview).toBeNull();
    expect(initialState.resultPreview).toBeNull();
    expect(initialState.comparison).toBeNull();
    expect(initialState.jobStatus).toBe('idle');
    expect(initialState.jobMessage).toBe('');
    expect(initialState.disclosed).toBe(false);
  });

  it('defaults to the modern style with no custom instructions', () => {
    expect(initialState.style).toBe('modern');
    expect(initialState.instructions).toBe('');
  });

  it('starts on the workspace route', () => {
    expect(initialState.currentRoute.path).toBe('/');
    expect(initialState.currentRoute.label).toBe('Workspace');
  });
});

describe('workflow reducer transitions', () => {
  it('clears result and comparison state when a new source is set', () => {
    const state = {
      ...initialState,
      result: {} as never,
      resultPreview: {} as never,
      comparison: {} as never,
    };
    const next = workflowReducer(state, { type: 'SET_SOURCE', payload: null });
    expect(next.result).toBeNull();
    expect(next.resultPreview).toBeNull();
    expect(next.comparison).toBeNull();
  });

  it('updates job status, message, and progress together', () => {
    const next = workflowReducer(initialState, { type: 'SET_JOB_STATUS', payload: { status: 'generating', message: 'Creating a formatting plan...', progress: 20 } });
    expect(next.jobStatus).toBe('generating');
    expect(next.jobMessage).toBe('Creating a formatting plan...');
    expect(next.jobProgress).toBe(20);
  });

  it('tracks style, instructions, and disclosure selections', () => {
    let next = workflowReducer(initialState, { type: 'SET_STYLE', payload: 'academic' });
    expect(next.style).toBe('academic');
    next = workflowReducer(next, { type: 'SET_INSTRUCTIONS', payload: 'Use formal tone' });
    expect(next.instructions).toBe('Use formal tone');
    next = workflowReducer(next, { type: 'SET_DISCLOSED', payload: true });
    expect(next.disclosed).toBe(true);
  });

  it('stores a generated result', () => {
    const result = { format: 'txt', validationStatus: 'pass', formattingAvailable: true } as never;
    const next = workflowReducer(initialState, { type: 'SET_RESULT', payload: result });
    expect(next.result).toBe(result);
  });

  it('resets the workflow to its initial state', () => {
    const changed = workflowReducer(initialState, {
      type: 'SET_JOB_STATUS',
      payload: { status: 'complete', message: 'Export complete' },
    });
    const next = workflowReducer(changed, { type: 'RESET_WORKFLOW' });
    expect(next).toEqual(initialState);
  });

  it('returns the current state for unknown actions', () => {
    const next = workflowReducer(initialState, { type: 'UNKNOWN_ACTION' } as WorkflowAction);
    expect(next).toEqual(initialState);
  });
});
