import { useCallback, useEffect, useRef, useState } from 'react';

import ElementType from '@interfaces/ElementType';
import { BuildSetFunctionProps, buildSetFunction } from './elements';
import { RefMappingType, RefType } from '@interfaces/ElementType';

export default function useDraggableElement({
  onStart,
}: {
  onStart?: (
    uuid: string,
    opts?: {
      event: Event;
      x: number;
      y: number;
    },
  ) => void;
} = {}): {
  setElementObject: BuildSetFunctionProps;
  setInteractiveElementsObjects: BuildSetFunctionProps;
  setOnChange: (
    onChange?: (
      uuid: string,
      opts?: {
        event: Event;
        x: number;
        y: number;
      },
    ) => void,
  ) => void;
} {
  const refStateMapping = useRef({});
  const refRecentValuesMapping = useRef({});
  const refHandlers = useRef({});

  const elementMappingRef: RefType = useRef(null);
  const [interactiveElementsMapping, setInteractiveElementsMapping] = useState<{
    [uuid: string]: ElementType[];
  }>({});

  const onChangeRef: RefType = useRef(null);
  function setOnChangeRef(
    onChange?: (
      uuid: string,
      opts?: {
        event: Event;
        x: number;
        y: number;
      },
    ) => void,
  ) {
    onChangeRef.current = onChange;
  }

  function setElementRefState(prev: (mapping: RefMappingType) => RefMappingType | RefMappingType) {
    elementMappingRef.current =
      typeof prev === 'function' ? prev(elementMappingRef?.current || {}) : prev;
  }

  const setElementObject = buildSetFunction(setElementRefState);
  const setInteractiveElementsObjects = buildSetFunction(setInteractiveElementsMapping);

  useEffect(() => {
    Object.entries(elementMappingRef?.current || {})?.forEach(
      ([uuid, element]: [string, ElementType]) => {
        const interactiveElements = interactiveElementsMapping?.[uuid];

        const startExecution = e => {
          if (!refStateMapping?.current?.[uuid]) {
            return;
          }

          e.preventDefault();

          const x = e.clientX + refRecentValuesMapping?.current?.[uuid]?.offsetLeft;
          const y = e.clientY + refRecentValuesMapping?.current?.[uuid]?.offsetTop;
          element.style.left = `${x}px`;
          element.style.top = `${y}px`;

          if (onChangeRef?.current) {
            onChangeRef?.current?.(uuid, {
              event: e,
              x,
              y,
            });
          }
        };

        const preventSelection = event => {
          event.preventDefault();
        };

        const stopExecution = e => {
          document.removeEventListener('selectstart', preventSelection);
          refStateMapping.current[uuid] = null;
          refRecentValuesMapping.current[uuid] = {
            offsetLeft: null,
            offsetTop: null,
          };

          window.removeEventListener('mousemove', startExecution, true);
          window.removeEventListener('mouseup', stopExecution, true);
        };

        const initialize = e => {
          if (e.which !== 1) {
            return;
          }

          document.addEventListener('selectstart', preventSelection);

          if (onStart) {
            onStart?.(uuid, {
              event: e,
              ...(refRecentValuesMapping?.current?.[uuid] || {}),
            });
          }

          refStateMapping.current[uuid] = true;
          refRecentValuesMapping.current[uuid] = {
            offsetLeft: element.offsetLeft - e.clientX,
            offsetTop: element.offsetTop - e.clientY,
          };

          if (typeof window !== 'undefined') {
            window.addEventListener('mousemove', startExecution, true);
            window.addEventListener('mouseup', stopExecution, true);
          }
        };

        interactiveElements?.forEach(interactiveEl => {
          interactiveEl?.addEventListener('mousedown', initialize, true);
        });

        refHandlers.current[uuid] = initialize;
      },
    );

    const handlers = refHandlers?.current;

    return () => {
      Object.entries(interactiveElementsMapping || {})?.forEach(
        ([uuid, interactiveElements]: [string, ElementType[]]) => {
          interactiveElements?.forEach(interactiveEl => {
            interactiveEl?.removeEventListener('mousedown', handlers?.[uuid]);
          });
        },
      );
    };
  }, [interactiveElementsMapping, onStart]);

  return {
    setElementObject,
    setInteractiveElementsObjects,
    setOnChange: setOnChangeRef,
  };
}
