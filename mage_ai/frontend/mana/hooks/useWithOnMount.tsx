import { useEffect, useRef } from 'react';

export type OnMountType = {
  children?: React.ReactNode;
  onMount: (ref?: React.RefObject<HTMLDivElement>) => void;
  uuid?: string;
};

export function WithOnMount({
  children,
  onMount,
  uuid,
  withRef,
}: OnMountType & { withRef?: boolean }) {
  const phaseRef = useRef(0);
  const timeoutRef = useRef(null);

  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => {
      clearTimeout(timeoutRef.current);
      if (phaseRef.current === 0 && onMount) {
        console.log(`[WithOnMount:${uuid}:${phaseRef.current}]`);

        withRef ? onMount(ref) : onMount();
        phaseRef.current += 1;
      } else {
        timeoutRef.current = setTimeout(check, 100);
      }
    };

    if (phaseRef.current === 0) {
      timeoutRef.current = setTimeout(check, 100);
    }

    const timeout = timeoutRef.current;
    return () => {
      clearTimeout(timeout);
      // phaseRef.current = 0;
      timeoutRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMount]);


  return withRef
    ? <div ref={ref}>{children}</div>
    : <>{children}</>;
}

export default function useWithOnMount({ children, onMount }: OnMountType): React.ReactNode {
  const phaseRef = useRef(0);
  const timeoutRef = useRef(null);

  console.log('[useWithOnMount] rendering...', phaseRef?.current);

  useEffect(() => {
    const check = () => {
      clearTimeout(timeoutRef.current);
      if (phaseRef.current === 0 && onMount) {
        onMount();
        phaseRef.current += 1;
      } else {
        timeoutRef.current = setTimeout(check, 100);
      }
    };

    if (phaseRef.current === 0) {
      timeoutRef.current = setTimeout(check, 100);
    }

    const timeout = timeoutRef.current;
    return () => {
      clearTimeout(timeout);
      phaseRef.current = 0;
      timeoutRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMount]);

  return <>{children}</>;
}
