import { useCallback, useEffect, useRef, useState } from 'react';

import { BuildSetFunctionProps, buildSetFunction } from './elements';

// var offset = [0,0];
// var divOverlay = document.getElementById ("overlay");
// var isDown = false;
// divOverlay.addEventListener('mousedown', function(e) {
//     isDown = true;
//     offset = [
//         divOverlay.offsetLeft - e.clientX,
//         divOverlay.offsetTop - e.clientY
//     ];
// }, true);
// document.addEventListener('mouseup', function() {
//     isDown = false;
// }, true);

// document.addEventListener('mousemove', function(e) {
//     event.preventDefault();
//     if (isDown) {
//         divOverlay.style.left = (e.clientX + offset[0]) + 'px';
//         divOverlay.style.top  = (e.clientY + offset[1]) + 'px';
//     }
// }, true);

export default function useDraggableElement({
  onChange,
}: {
  onChange?: (opts?: {
    x: number;
    y: number;
  }) => void;
}): {
  setElementObject: BuildSetFunctionProps;
  setInteractiveElementsObjects: BuildSetFunctionProps;
} {
  const refState = useRef(null);
  const refRecentValues = useRef({
    offsetLeft: null,
    offsetTop: null,
  });

  const [element, setElementRefState] = useState<Element>(null);
  const [interactiveElements, setInteractiveElementsRefState] = useState<Element[]>(null);

  const setElementObject = buildSetFunction(setElementRefState);
  const setInteractiveElementsObjects = buildSetFunction(setInteractiveElementsRefState);

  function startExecution(e) {
    if (!refState?.current) {
      return;
    }

    e.preventDefault();

    const x = e.clientX + refRecentValues?.current?.offsetLeft;
    const y = e.clientY + refRecentValues?.current?.offsetTop;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;

    if (onChange) {
      onChange?.({
        x,
        y,
      });
    }
  }

  useEffect(() => {
    const stopExecution = (e) => {
      refState.current = null;
      refRecentValues.current = {
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

      refState.current = true;
      refRecentValues.current = {
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

    return () => {
      interactiveElements?.forEach((interactiveEl) => {
        interactiveEl?.removeEventListener('mousedown', initalize);
      });
    };
  }, [element, interactiveElements]);

  return {
    setElementObject,
    setInteractiveElementsObjects,
  };
}
