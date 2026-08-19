import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useHotkeys } from '../../../src/web/hooks/use-hotkeys';

function fireKey(key: string, opts: Partial<KeyboardEventInit> = {}) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...opts }));
}

describe('useHotkeys', () => {
  it('calls handler when matching key is pressed', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: 'Enter', meta: true, handler }]));
    fireKey('Enter', { metaKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call handler when modifier is missing', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: 'Enter', meta: true, handler }]));
    fireKey('Enter', { metaKey: false });
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not call handler when wrong key is pressed', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: 'Enter', meta: true, handler }]));
    fireKey('a', { metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports Ctrl modifier (fallback from meta)', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: 'Enter', meta: true, handler }]));
    fireKey('Enter', { ctrlKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('supports shift modifier', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: 'r', meta: true, shift: true, handler }]));
    fireKey('r', { metaKey: true, shiftKey: true });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call handler when shift is required but missing', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: 'r', meta: true, shift: true, handler }]));
    fireKey('r', { metaKey: true, shiftKey: false });
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports multiple bindings', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    renderHook(() => useHotkeys([
      { key: '1', meta: true, handler: handler1 },
      { key: '2', meta: true, handler: handler2 },
    ]));
    fireKey('1', { metaKey: true });
    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).not.toHaveBeenCalled();
    fireKey('2', { metaKey: true });
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  it('prevents default on matched events', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: 'Enter', meta: true, handler }]));
    const event = new KeyboardEvent('keydown', { key: 'Enter', metaKey: true, bubbles: true, cancelable: true });
    const spy = vi.spyOn(event, 'preventDefault');
    window.dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
  });

  it('cleans up event listener on unmount', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useHotkeys([{ key: 'Enter', meta: true, handler }]));
    unmount();
    fireKey('Enter', { metaKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('handles key without modifiers when no modifier is specified', () => {
    const handler = vi.fn();
    renderHook(() => useHotkeys([{ key: 'Escape', handler }]));
    fireKey('Escape');
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
