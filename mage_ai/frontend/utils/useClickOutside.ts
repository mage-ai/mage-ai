import { useCallback, useEffect, useRef, useState } from 'react';

import { BuildSetFunctionProps, buildSetFunction } from './elements';
import { RefMappingType, RefType } from '@interfaces/ElementType';

export default function useClickOutside({
  onClick,
}: {
  onClick?: (
    uuid: string,
    isOutside: boolean,
    opts?: {
      group?: {
        [uuid: string]: {
          isOutside: boolean;
          isOutsides: boolean;
        };
      };
      isOutsidesInteractiveElements?: boolean[];
    },
  ) => void;
}): {
  setElementObject: (
    uuid: string,
    nodeOrNodes: any | any[],
    groupUUID: string,
    opts?: {
      delay?: number;
      tries?: number;
    },
  ) => void;
  setInteractiveElementsObjects: (
    uuid: string,
    nodeOrNodes: any | any[],
    groupUUID: string,
    opts?: {
      delay?: number;
      tries?: number;
    },
  ) => void;
} {
  const elementMappingRef: RefType = useRef(null);
  const interactiveElementsMappingRef: RefType = useRef(null);
  const uuidToGroupMappingRef: RefType = useRef(null);
  function setElementRefState(prev: (mapping: RefMappingType) => RefMappingType | RefMappingType) {
    elementMappingRef.current =
      typeof prev === 'function' ? prev(elementMappingRef?.current || {}) : prev;
  }
  function setInteractiveElementsRefState(
    prev: (mapping: RefMappingType) => RefMappingType | RefMappingType,
  ) {
    interactiveElementsMappingRef.current =
      typeof prev === 'function' ? prev(interactiveElementsMappingRef?.current || {}) : prev;
  }
  function setUUIDToGroupMapping(
    prev: (mapping: RefMappingType) => RefMappingType | RefMappingType,
  ) {
    uuidToGroupMappingRef.current =
      typeof prev === 'function' ? prev(uuidToGroupMappingRef?.current || {}) : prev;
  }

  function setElementObject(uuid, ref, groupUUID, opts) {
    buildSetFunction(setElementRefState)(uuid, ref, opts);
    if (groupUUID) {
      setUUIDToGroupMapping(prev => ({
        ...prev,
        [uuid]: groupUUID,
      }));
    }
  }

  function setInteractiveElementsObjects(uuid, ref, groupUUID, opts) {
    buildSetFunction(setInteractiveElementsRefState)(uuid, ref, opts);
    if (groupUUID) {
      setUUIDToGroupMapping(prev => ({
        ...prev,
        [uuid]: groupUUID,
      }));
    }
  }

  function calculateOutside(e: any, elementItem: any): boolean {
    let isOutside = true;
    // @ts-ignore
    if (elementItem) {
      const { height, width, x, y } = elementItem?.getBoundingClientRect() || {};
      if (elementItem?.contains?.(e.target)) {
        isOutside = false;
      } else {
        const { clientX, clientY } = e;

        isOutside = clientX > x + width || clientX < x || clientY > y + height || clientY < y;
      }
    }

    return isOutside;
  }

  useEffect(() => {
    const handleClickOutside = e => {
      const results: {
        [uuid: string]: {
          isOutside: boolean;
          isOutsides: boolean[];
        };
      } = {};
      const resultsGroup = {};

      Object.entries(elementMappingRef?.current || {})?.forEach(([uuid, element]) => {
        if (!element) {
          return;
        } else {
          // @ts-ignore
          const { height, width, x, y } = element?.getBoundingClientRect() || {};
          if (height === 0 && width === 0 && x === 0 && y === 0) {
            return;
          }
        }

        const interactiveElements = interactiveElementsMappingRef?.current?.[uuid];
        const isOutside = calculateOutside(e, element);
        const isOutsides = interactiveElements?.map(elementItem =>
          calculateOutside(e, elementItem),
        );

        results[uuid] = {
          isOutside,
          isOutsides,
        };

        const groupUUID = uuidToGroupMappingRef?.current?.[uuid];
        if (groupUUID) {
          resultsGroup[groupUUID] = {
            ...(resultsGroup?.[groupUUID] || {}),
            [uuid]: results[uuid],
          };
        }
      });

      if (onClick) {
        Object.entries(results)?.forEach(([uuid, { isOutside, isOutsides }]) => {
          onClick?.(uuid, isOutside, {
            group: resultsGroup?.[uuidToGroupMappingRef?.current?.[uuid]],
            isOutsidesInteractiveElements: isOutsides,
          });
        });
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClick]);

  return {
    setElementObject,
    setInteractiveElementsObjects,
  };
}
