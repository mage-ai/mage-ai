import { useState, useRef, useCallback, useEffect } from 'react';

type FetchArgs = [string, RequestInit?]; // Example of more specific fetch arguments type

interface UseAbortableFetchReturnType<T> {
  doFetch: (...args: FetchArgs) => Promise<void>;
  data: T | null;
  isLoading: boolean;
  error: Error | null;
}

function useAbortableFetch<T>(requestFunction: (...args?: FetchArgs) => Promise<T>): UseAbortableFetchReturnType<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const doFetch = useCallback(async (...args: FetchArgs) => {
    setIsLoading(true);
    setError(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    try {
      const response = await requestFunction(...args, signal);
      setData(response);
    } catch (err) {
      const error = err as Error; // Casting for TypeScript 4.4+ with --strict catch clause
      if (error.name !== 'AbortError') {
        setError(error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [requestFunction]);

  useEffect(() => () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }, []);

  return { doFetch, data, isLoading, error };
}

export default useAbortableFetch;
