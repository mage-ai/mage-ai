import { useEffect, useRef } from 'react';

export type OnMountType = {
  children?: React.ReactNode;
  onMount: (ref?: React.RefObject<HTMLDivElement>) => void;
  requiredMountedChildren?: boolean;
};

export function WithOnMount({
  onMount,
  withRef,
  ...rest
}: OnMountType & { withRef?: boolean }) {
  const ref = useRef(null);

  const { children } = useWithOnMount({
    ...rest,
    onMount: () => {
      withRef ? onMount(ref) : onMount();
    },
  });

  return withRef
    ? (<div ref={ref}>{children}</div >)
    : children;
}

export default function useWithOnMount({ children, onMount }: OnMountType): {
  children: React.ReactNode;
  phaseRef: React.MutableRefObject<number>;
} {
  const phaseRef = useRef(0);
  const timeoutRef = useRef(null);

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

  return {
    children,
    phaseRef,
  };
}
