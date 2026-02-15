import { useRef, useEffect, useCallback } from 'react';

interface StreamAccumulator {
  append: (text: string) => void;
  flush: () => void;
  reset: () => void;
}

/**
 * Ref-based streaming text accumulator with rAF throttle (~16fps).
 * Batches rapid text deltas to avoid per-delta re-renders.
 */
export function useStreamAccumulator(
  onFlush: (accumulated: string) => void,
): StreamAccumulator {
  const bufferRef = useRef('');
  const rafRef = useRef<number | null>(null);
  const onFlushRef = useRef(onFlush);
  onFlushRef.current = onFlush;

  const flush = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (bufferRef.current) {
      const text = bufferRef.current;
      bufferRef.current = '';
      onFlushRef.current(text);
    }
  }, []);

  const append = useCallback(
    (text: string) => {
      bufferRef.current += text;
      if (rafRef.current === null) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          flush();
        });
      }
    },
    [flush],
  );

  const reset = useCallback(() => {
    bufferRef.current = '';
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Clean up rAF on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  return { append, flush, reset };
}
