import { useCallback, useEffect, useRef, useState } from 'react';

import { BuildSetFunctionProps, buildSetFunction } from './elements';

export default function useClickOutside({
  onClick,
}: {
  onClick?: (uuid: string, e: any, isOutside: boolean, opts?: {
    isOutsidesInteractiveElements?: boolean[];
  }) => void;
}): {
  setElementObject: BuildSetFunctionProps;
  setInteractiveElementsObjects: BuildSetFunctionProps;
} {
  const [elementMapping, setElementRefState] = useState<{
    [uuid: string]: Element;
  }>({});
  const [interactiveElementsMapping, setInteractiveElementsRefState] = useState<{
    [uuid: string]: Element[];
  }>({});

  const setElementObject = buildSetFunction(setElementRefState);
  const setInteractiveElementsObjects = buildSetFunction(setInteractiveElementsRefState);

  useEffect(() => {
    const handleClickOutside = (e) => {
      Object.entries(elementMapping || {})?.forEach(([uuid, element]) => {
        const calculateOutside = (e: any, elementItem: any): boolean => {
          let isOutside = true;
          // @ts-ignore
          if (elementItem?.current) {
            if (elementItem?.current?.contains?.(e.target)) {
              isOutside = false;
            } else {
              const {
                clientX,
                clientY,
              } = e;
              const {
                height,
                width,
                x,
                y,
              } = elementItem?.current?.getBoundingClientRect() || {};

              isOutside = clientX > (x + width)
                || clientX < x
                || clientY > (y + height)
                || clientY < y;
            }
          }

          return isOutside;
        };

        const interactiveElements = interactiveElementsMapping?.[uuid];

        const isOutside = calculateOutside(e, element);
        const isOutsides = interactiveElements?.map((elementItem) => calculateOutside(e, elementItem));

        if (onClick) {
          onClick?.(uuid, e, isOutside, {
            isOutsidesInteractiveElements: isOutsides,
          });
        }
      });
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [elementMapping, interactiveElementsMapping]);

  return {
    setElementObject,
    setInteractiveElementsObjects,
  };
}
