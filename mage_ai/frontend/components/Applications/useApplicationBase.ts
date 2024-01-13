import { useEffect } from 'react';

import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';

export type ApplicationBaseType = {
  containerRef: {
    current: HTMLDivElement;
  };
  headerOffset: number;
  onMount: () => void;
  uuid: ApplicationExpansionUUIDEnum;
};

export default function useApplicationBase({
  onMount,
  ...props
}: ApplicationBaseType) {
  useEffect(() => {
    if (onMount) {
      onMount?.();
    }
  }, []);

  return {
    ...props,
  };
}
