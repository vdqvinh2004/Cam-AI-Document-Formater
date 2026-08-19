import { useEffect, useCallback } from 'react';

interface HotkeyBinding {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  handler: (event: KeyboardEvent) => void;
}

export function useHotkeys(bindings: HotkeyBinding[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const binding of bindings) {
        const keyMatch = event.key.toLowerCase() === binding.key.toLowerCase();
        // For meta: treat Ctrl on Windows/Linux as equivalent to Cmd on macOS
        const hasModifier = event.ctrlKey || event.metaKey;
        const metaMatch = binding.meta === undefined || binding.meta === hasModifier;
        const ctrlMatch = binding.ctrl === undefined || binding.ctrl === hasModifier;
        const shiftMatch = binding.shift === undefined || binding.shift === event.shiftKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
          // Only trigger if modifier is required and present, or not required
          if (binding.ctrl || binding.meta) {
            if (!hasModifier) continue;
          }
          event.preventDefault();
          binding.handler(event);
          return;
        }
      }
    },
    [bindings]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
