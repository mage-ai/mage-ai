import { DEBUG } from '@mana/utils/debug';
import { useEffect, useLayoutEffect, useRef } from 'react';

export type OnMountType = {
  children?: React.ReactNode;
  maxAttempts?: number;
  onMount: (ref?: React.RefObject<HTMLDivElement>) => void;
  pollInterval?: number;
  uuid?: string;
  waitUntil?: (ref?: React.RefObject<HTMLElement>) => boolean;
  strict?: boolean;
};

export function WithOnMount({
  children,
  onMount,
  uuid,
  waitUntil,
  maxAttempts = 10,
  pollInterval = 100,
  withRef,
  strict = false,
}: OnMountType & { withRef?: boolean }) {
  const phaseRef = useRef(0);
  const attemptsRef = useRef(0);
  const timeoutRef = useRef(null);

  const mountRef = useRef<HTMLDivElement>(null);

  (strict ? useLayoutEffect : useEffect)(() => {
    if (attemptsRef.current >= maxAttempts) return;

    const check = () => {
      clearTimeout(timeoutRef.current);
      attemptsRef.current += 1;

      if (attemptsRef.current >= maxAttempts) {
        DEBUG.hooks.withOnMount && console.log('[WithOnMount]: maxAttempts reached');
        return;
      }

      if (
        phaseRef.current === 0 &&
        onMount &&
        (!waitUntil || waitUntil(withRef ? mountRef : null)) &&
        (!withRef || mountRef?.current)
      ) {
        DEBUG.hooks.withOnMount && console.log(`[WithOnMount:${uuid}:${phaseRef.current}]`);

        withRef ? onMount(mountRef) : onMount();
        phaseRef.current += 1;
      } else {
        timeoutRef.current = setTimeout(check, pollInterval);
      }
    };

    DEBUG.hooks.withOnMount && console.log(`[WithOnMount:${uuid}:${phaseRef.current}]`);
    if (phaseRef.current === 0) {
      timeoutRef.current = setTimeout(check, pollInterval);
    }

    const timeout = timeoutRef.current;
    return () => {
      clearTimeout(timeout);

      attemptsRef.current = 0;
      phaseRef.current = 0;
      timeoutRef.current = null;
      // WARNING: DO NOT CLEAR mountRef.current or else anything that requires it won't work.
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxAttempts, onMount, pollInterval]);

  return withRef ? <div ref={mountRef}>{children}</div> : <>{children}</>;
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
