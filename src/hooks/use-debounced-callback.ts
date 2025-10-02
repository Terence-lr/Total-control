import { useCallback, useEffect, useRef } from 'react';

export function useDebouncedCallback<A extends any[]>(
  callback: (...args: A) => void,
  delay: number
): (...args: A) => void {
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const debouncedCallback = useCallback(
    (...args: A) => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      timeout.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  useEffect(() => {
    // Cleanup the timeout on unmount
    return () => {
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
    };
  }, []);

  return debouncedCallback;
}
