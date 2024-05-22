import { useEffect } from 'react';

export type OnMountType = {
  children: React.ReactNode;
  onMount?: () => void;
};

export default function WithOnMount({ children, onMount }: OnMountType) {
  useEffect(() => {
    if (onMount) {
      onMount?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
