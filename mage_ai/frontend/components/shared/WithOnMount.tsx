import { useEffect } from 'react';

export type OnMountType = {
  children: React.ReactNode;
  onMount?: () => void;
};

export default function WithOnMount({
  children,
  onMount,
}: OnMountType) {
  useEffect(() => {
    if (onMount) {
      onMount?.();
    }
  }, []);

  return children;
}
