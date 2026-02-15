import { useEffect } from 'react';

interface ShortcutHandlers {
  onToggleToolCards?: () => void;
  onToggleThinking?: () => void;
  onAbortRun?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key === 'o') {
        e.preventDefault();
        handlers.onToggleToolCards?.();
      } else if (mod && e.key === 't') {
        e.preventDefault();
        handlers.onToggleThinking?.();
      } else if (mod && e.key === 'x') {
        e.preventDefault();
        handlers.onAbortRun?.();
      } else if (e.key === 'Escape') {
        handlers.onEscape?.();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
