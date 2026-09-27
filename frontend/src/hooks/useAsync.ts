import { useCallback, useEffect, useRef, useState } from 'react';
import { toErrorMessage } from '@/api/client';

interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Runs an async loader on mount (and whenever `deps` change), guarding against
 * setState after unmount and against a slow response overwriting a newer one.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<AsyncState<T>>({ data: null, isLoading: true, error: null });
  const requestId = useRef(0);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await loader();
      if (id === requestId.current) setState({ data, isLoading: false, error: null });
    } catch (error) {
      if (id === requestId.current) {
        setState({ data: null, isLoading: false, error: toErrorMessage(error) });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void run();
    return () => {
      // Invalidate any in-flight request belonging to the previous deps.
      requestId.current += 1;
    };
  }, [run]);

  const setData = useCallback((updater: (current: T | null) => T | null) => {
    setState((prev) => ({ ...prev, data: updater(prev.data) }));
  }, []);

  return { ...state, reload: run, setData };
}
