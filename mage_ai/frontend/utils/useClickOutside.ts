import { useCallback, useEffect, useRef, useState } from 'react';

import { BuildSetFunctionProps, buildSetFunction } from './elements';

export default function useClickOutside({
  onClick,
}: {
  onClick?: (uuid: string, isOutside: boolean, opts?: {
    group?: {
      [uuid: string]: {
        isOutside: boolean;
        isOutsides: boolean;
      };
    };
    isOutsidesInteractiveElements?: boolean[];
  }) => void;
}): {
  setElementObject: (uuid: string, nodeOrNodes: any | any[], groupUUID: string, opts?: {
  delay?: number;
  tries?: number;
}) => void;
  setInteractiveElementsObjects: (uuid: string, nodeOrNodes: any | any[], groupUUID: string, opts?: {
  delay?: number;
  tries?: number;
}) => void;
} {
  const [elementMapping, setElementRefState] = useState<{
    [uuid: string]: Element;
  }>({});
  const [interactiveElementsMapping, setInteractiveElementsRefState] = useState<{
    [uuid: string]: Element[];
  }>({});
  const [uuidToGroupMapping, setUUIDToGroupMapping] = useState<{
    [uuid: string]: string;
  }>({});

  function setElementObject(uuid, ref, groupUUID, opts) {
    buildSetFunction(setElementRefState)(uuid, ref, opts);
    if (groupUUID) {
      setUUIDToGroupMapping(prev => ({
        ...prev,
        [uuid]: groupUUID,
      }));
    }
  };

  function setInteractiveElementsObjects(uuid, ref, groupUUID, opts) {
    buildSetFunction(setInteractiveElementsRefState)(uuid, ref, opts);
    if (groupUUID) {
      setUUIDToGroupMapping(prev => ({
        ...prev,
        [uuid]: groupUUID,
      }));
    }
  };

  function calculateOutside(e: any, elementItem: any): boolean {
    let isOutside = true;
    // @ts-ignore
    if (elementItem) {
      if (elementItem?.contains?.(e.target)) {
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
        } = elementItem?.getBoundingClientRect() || {};

        isOutside = clientX > (x + width)
          || clientX < x
          || clientY > (y + height)
          || clientY < y;
      }
    }

    return isOutside;
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      const results: {
        [uuid: string]: {
          isOutside: boolean;
          isOutsides: boolean[];
        };
      } = {};
      const resultsGroup = {};

      Object.entries(elementMapping || {})?.forEach(([uuid, element]) => {
        const interactiveElements = interactiveElementsMapping?.[uuid];

        const isOutside = calculateOutside(e, element);
        const isOutsides = interactiveElements?.map((elementItem) => calculateOutside(e, elementItem));

        results[uuid] = {
          isOutside,
          isOutsides,
        };

        const groupUUID = uuidToGroupMapping?.[uuid];
        if (groupUUID) {
          resultsGroup[groupUUID] = {
            ...(resultsGroup?.[groupUUID] || {}),
            [uuid]: results[uuid],
          };
        }
      });

      if (onClick) {
        Object.entries(results)?.forEach(([uuid, {
          isOutside,
          isOutsides,
        }]) => {
          onClick?.(
            uuid,
            isOutside,
            {
              group: resultsGroup?.[uuidToGroupMapping?.[uuid]],
              isOutsidesInteractiveElements: isOutsides,
            },
          );
        });
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [elementMapping, interactiveElementsMapping, uuidToGroupMapping]);

  return {
    setElementObject,
    setInteractiveElementsObjects,
  };
}
