import { useCallback, useEffect, useState } from 'react';

import { errorMessage } from '@/lib/data';

export type LoadState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

/**
 * Runs `load` on mount and whenever `retry` is called, and lets the caller
 * replace the loaded value after a local change (`setData`).
 */
export function useLoad<T>(load: () => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => !cancelled && setState({ status: 'ready', data }))
      .catch((err) => !cancelled && setState({ status: 'error', message: errorMessage(err) }));
    return () => {
      cancelled = true;
    };
    // `load` is expected to be a stable module function; re-running is driven by `attempt`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((n) => n + 1);
  }, []);

  const setData = useCallback((data: T) => setState({ status: 'ready', data }), []);

  return { state, retry, setData };
}
