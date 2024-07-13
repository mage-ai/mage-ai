import { DEBUG } from '@mana/utils/debug';
import { useEffect, useRef } from 'react';

export type OnMountType = {
  children?: React.ReactNode;
  maxAttempts?: number;
  onMount: (ref?: React.RefObject<HTMLDivElement>) => void;
  pollInterval?: number;
  uuid?: string;
  waitUntil?: () => boolean;
};

export function WithOnMount({
  children,
  onMount,
  uuid,
  waitUntil,
  maxAttempts = 10,
  pollInterval = 100,
  withRef,
}: OnMountType & { withRef?: boolean }) {
  const phaseRef = useRef(0);
  const attemptsRef = useRef(0);
  const timeoutRef = useRef(null);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (attemptsRef.current >= maxAttempts) return;

    const check = () => {
      clearTimeout(timeoutRef.current);
      if (attemptsRef.current >= maxAttempts) return;
      attemptsRef.current += 1;

      if (phaseRef.current === 0 && onMount && (!waitUntil || waitUntil())) {
        DEBUG.hooks.withOnMount && console.log(`[WithOnMount:${uuid}:${phaseRef.current}]`);

        withRef ? onMount(ref) : onMount();
        phaseRef.current += 1;
      } else {
        timeoutRef.current = setTimeout(check, pollInterval);
      }
    };

    if (phaseRef.current === 0) {
      timeoutRef.current = setTimeout(check, pollInterval);
    }

    const timeout = timeoutRef.current;
    return () => {
      clearTimeout(timeout);
      // phaseRef.current = 0;
      timeoutRef.current = null;
      attemptsRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxAttempts, onMount, pollInterval]);


  return withRef
    ? <div ref={ref}>{children}</div>
    : <>{children}</>;
}

export default function useWithOnMount({
  children,
  onMount,
  waitUntil,
  maxAttempts = 10,
  pollInterval = 100,
}: OnMountType): React.ReactNode {
  const phaseRef = useRef(0);
  const attemptsRef = useRef(0);
  const timeoutRef = useRef(null);

  DEBUG.hooks.withOnMount && console.log('[useWithOnMount] rendering...', phaseRef?.current);

  useEffect(() => {
    if (attemptsRef.current >= maxAttempts) return;

    const check = () => {
      clearTimeout(timeoutRef.current);
      if (attemptsRef.current >= maxAttempts) return;
      attemptsRef.current += 1;

      if (phaseRef.current === 0 && onMount && (!waitUntil || waitUntil())) {
        onMount();
        phaseRef.current += 1;
      } else {
        timeoutRef.current = setTimeout(check, pollInterval);
      }
    };

    if (phaseRef.current === 0) {
      timeoutRef.current = setTimeout(check, pollInterval);
    }

    const timeout = timeoutRef.current;
    return () => {
      clearTimeout(timeout);
      phaseRef.current = 0;
      timeoutRef.current = null;
      attemptsRef.current = 0;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxAttempts, onMount, pollInterval]);

  return <>{children}</>;
}
