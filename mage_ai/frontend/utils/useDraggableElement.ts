import { useCallback, useEffect, useRef, useState } from 'react';

import { BuildSetFunctionProps, buildSetFunction } from './elements';

export default function useDraggableElement({
  onChange,
}: {
  onChange?: (uuid: string, opts?: {
    x: number;
    y: number;
  }) => void;
}): {
  setElementObject: BuildSetFunctionProps;
  setInteractiveElementsObjects: BuildSetFunctionProps;
} {
  const refStateMapping = useRef({});
  const refRecentValuesMapping = useRef({});
  const refHandlers = useRef({});

  const [elementMapping, setElementRefState] = useState<{
    [uuid: string]: Element;
  }>({});
  const [interactiveElementsMapping, setInteractiveElementsRefState] = useState<{
    [uuid: string]: Element[];
  }>({});

  const setElementObject = buildSetFunction(setElementRefState);
  const setInteractiveElementsObjects = buildSetFunction(setInteractiveElementsRefState);

  useEffect(() => {
    Object.entries(elementMapping || {})?.forEach(([uuid, element]) => {
      const interactiveElements = interactiveElementsMapping?.[uuid];

      const startExecution = (e) => {
        if (!refStateMapping?.current?.[uuid]) {
          return;
        }

        e.preventDefault();

        const x = e.clientX + refRecentValuesMapping?.current?.[uuid]?.offsetLeft;
        const y = e.clientY + refRecentValuesMapping?.current?.[uuid]?.offsetTop;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;

        if (onChange) {
          onChange?.(uuid, {
            x,
            y,
          });
        }
      };

      const stopExecution = (e) => {
        refStateMapping.current[uuid] = null;
        refRecentValuesMapping.current[uuid] = {
          offsetLeft: null,
          offsetTop: null,
        };

        window.removeEventListener('mousemove', startExecution, true);
        window.removeEventListener('mouseup', stopExecution, true);
      };

      const initalize = (e) => {
        if (e.which !== 1) {
          return;
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

      interactiveElements?.forEach((interactiveEl) => {
        interactiveEl?.addEventListener('mousedown', initalize, true);
      });

      refHandlers.current[uuid] = initalize;
    });

    return () => {
      Object.entries(interactiveElementsMapping || {})?.forEach(([uuid, interactiveElements]) => {
        interactiveElements?.forEach((interactiveEl) => {
          interactiveEl?.removeEventListener('mousedown', refHandlers.current[uuid]);
        });
      });
    };
  }, [elementMapping, interactiveElementsMapping]);

  return {
    setElementObject,
    setInteractiveElementsObjects,
  };
}
