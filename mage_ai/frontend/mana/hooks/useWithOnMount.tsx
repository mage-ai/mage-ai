import { useEffect, useRef } from 'react';

export type OnMountType = {
  children: React.ReactNode;
  onMount?: () => void;
};

export function WithOnMount({ children, onMount }: OnMountType) {
  const phaseRef = useRef(0);
  useEffect(() => {
    if (phaseRef.current === 0 && onMount) {
      onMount?.();
    }
    phaseRef.current += 1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}

export default function useWithOnMount({ children, onMount }: OnMountType) {
  useEffect(() => {
    if (onMount) {
      onMount?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
