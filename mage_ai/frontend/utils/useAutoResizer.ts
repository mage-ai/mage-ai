import { useCallback, useEffect, useRef, useState } from 'react';

import { ignoreKeys } from '@utils/hash';
import { KeyValueType } from '@interfaces/CommandCenterType';
import { DimensionType } from '@storage/ApplicationManager/constants';
import { RefType } from '@interfaces/ElementType';

export enum ResizeStrategy {
  PROPORTIONAL = 'PROPORTIONAL',
}

type MappingType = {
  [uuid: string]: Element;
};

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
  strategy = ResizeStrategy.PROPORTIONAL,
}: {
  strategy?: ResizeStrategy;
} = {}): {
  deregisterElementUUIDs: (uuids: string[]) => void;
  observeThenResizeElements: (opts: ResizableElements) => void;
  setOnResize: (
    onResize: (elementUUID: string, dimensions: DimensionDataType, elementRect: RectType) => void,
  ) => void;
} {
  const observerRef = useRef(null);
  const dimensionsRef = useRef(null);
  const [elementsMapping, setElementsMapping] = useState<ResizableElements>({});

  const onResizeRef: RefType = useRef(null);
  function setOnResizeRef(
    onResize: (elementUUID: string, dimensions: DimensionDataType, elementRect: RectType) => void,
  ) {
    onResizeRef.current = onResize;
  }

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

        let width = rect?.width * widthFactor;
        let height = rect?.height * heightFactor;
        let x = rect?.x * widthFactor;
        let y = rect?.y * widthFactor;

        if (!rect?.width || !rect?.height) {
          return;
        }

        if (y > dimensions?.height || y < 0) {
          y = (dimensions.height - height) / 2;
        }
        if (x > dimensions?.width || x < 0) {
          x = (dimensions.width - width) / 2;
        }
        if (width > dimensions?.width || width < 0) {
          width = dimensions.width * 0.8;
        }
        if (height > dimensions?.height || height < 0) {
          height = dimensions.height * 0.8;
        }

        element.current.style.height = `${height}px`;
        element.current.style.width = `${width}px`;
        element.current.style.left = `${x}px`;
        element.current.style.top = `${y}px`;

        const onResize = onResizeRef?.current;
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

    observerRef.current = new ResizeObserver(observedElements =>
      handleResize(observedElements, {
        ...elementsMapping,
        ...resizeElements,
      }),
    );
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
    setOnResize: setOnResizeRef,
  };
}
