import { useCallback, useEffect, useRef, useState } from 'react';

import { ignoreKeys } from '@utils/hash';
import { KeyValueType } from '@interfaces/CommandCenterType';
import { DimensionType } from '@storage/ApplicationManager/constants';

export enum ResizeStrategy {
  PROPORTIONAL = 'PROPORTIONAL',
}

export type DimensionDataType = {
  height?: number;
  width?: number;
  widthWithoutScrollbar?: number;
};

type ResizableElements = {
  [uuid: string]: {
    current: Element & { style: KeyValueType };
  };
};

export type RectType = {
  height?: number;
  width?: number;
  x?: number;
  y?: number;
};

export default function useAutoResizer({
  onResize,
  strategy = ResizeStrategy.PROPORTIONAL,
}: {
  onResize?: (elementUUID: string, dimensions: DimensionDataType, elementRect: RectType) => void;
  strategy?: ResizeStrategy;
} = {}): {
  deregisterElementUUIDs: (uuids: string[]) => void;
  observeThenResizeElements: (opts: ResizableElements) => void;
} {
  const observerRef = useRef(null);
  const dimensionsRef = useRef(null);
  const [elementsMapping, setElementsMapping] = useState<ResizableElements>({});

  const removeElements = useCallback((uuids: string[]) => {
    setElementsMapping(prev => ignoreKeys(prev, uuids));
  }, []);

  function getWindowDimensions(): DimensionDataType {
    return {
      height: window?.innerHeight,
      width: window?.innerWidth,
      widthWithoutScrollbar: document?.body?.clientWidth,
    };
  }

  const handleResize = useCallback((observedElements, resizeElements: ResizableElements) => {
    const dimensionsPrev = dimensionsRef?.current;
    const dimensions = getWindowDimensions();

    const widthFactor = dimensions.width / dimensionsPrev?.width;
    const heightFactor = dimensions.height / dimensionsPrev?.height;

    Object.entries(resizeElements || {})?.forEach(([uuid, element]) => {
      if (element?.current) {
        const rect = element?.current?.getBoundingClientRect();

        const width = rect?.width * widthFactor;
        const height = rect?.height * heightFactor;
        const x = rect?.x * widthFactor;
        const y = rect?.y * widthFactor;

        if (!rect?.width || !rect?.height) {
          return;
        }

        element.current.style.height = `${height}px`;
        element.current.style.width = `${width}px`;
        element.current.style.left = `${x}px`;
        element.current.style.top = `${y}px`;

        if (onResize) {
          onResize?.(uuid, dimensions, {
            height,
            width,
            x,
            y,
          });
        }
      }
    });

    dimensionsRef.current = dimensions;
  }, []);

  function observeThenResizeElements(resizeElements?: ResizableElements) {
    setElementsMapping(prev => ({
      ...prev,
      ...resizeElements,
    }));

    observerRef.current = new ResizeObserver(observedElements => handleResize(
      observedElements,
      {
        ...elementsMapping,
        ...resizeElements,
      },
    ));
    observerRef.current.observe(document.body);
    return observerRef.current;
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && !dimensionsRef?.current) {
      dimensionsRef.current = getWindowDimensions();
    }
  }, []);

  return {
    deregisterElementUUIDs: removeElements,
    observeThenResizeElements,
  };
}

