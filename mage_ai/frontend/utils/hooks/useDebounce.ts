import { useRef, useCallback } from 'react';

export type DebouncerType = <T extends (...args: any[]) => void>(
  fn: T,
  delay: number,
  ...args: Parameters<T>
) => void;
export type CancelType = () => void;

// A Hook that returns a debouncer function
function useDebounce(): [
  (fn: (...args: any[]) => void, delay: number, ...args: any[]) => void,
  () => void,
] {
  // Using a ref to store the latest timeout ID
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * The debouncer function accepts a function to debounce (fn),
   * the arguments to apply to that function (args), and the delay before execution.
   */
  const debouncer: DebouncerType = useCallback(
    <T extends (...args: any[]) => void>(fn: T, delay: number, ...args: Parameters<T>) => {
      // Clear any existing timeout to ensure only the last action is executed
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      // Set up the new timeout
      timeoutRef.current = setTimeout(() => {
        fn(...args);
      }, delay);
    },
    [],
  );

  // Optionally, provide a way to cancel the debounce
  const cancel: CancelType = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return [debouncer, cancel];
}

export default useDebounce;
