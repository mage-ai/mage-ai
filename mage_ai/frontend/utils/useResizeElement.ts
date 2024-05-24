import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import ElementType from '@interfaces/ElementType';
import { ApplicationExpansionUUIDEnum } from '@interfaces/CommandCenterType';
import { buildSetFunction } from './elements';
import { isEmptyObject, selectEntriesWithValues } from './hash';
import { pauseEvent } from '@utils/events';
import { RefType } from '@interfaces/ElementType';

export default function useResizeElement(): {
  setOnResize: (
    onResizeCallback?: (
      uuid: string,
      opts?: {
        height?: number;
        width?: number;
        x?: number;
        y?: number;
      },
    ) => void,
  ) => void;
  setOnStart: (
    onResizeCallback?: (
      uuid: string,
      opts?: {
        height?: number;
        width?: number;
        x?: number;
        y?: number;
      },
    ) => void,
  ) => void;
  setResizableObject: any;
  setResizersObjects: any;
} {
  const refOrientationMapping = useRef({});
  const refRecentValuesMapping = useRef({});
  const refHandlers = useRef({});

  const onResizeRef: RefType = useRef(null);
  function setOnResizeRef(
    onResizeCallback?: (
      uuid: string,
      opts?: {
        height?: number;
        width?: number;
        x?: number;
        y?: number;
      },
    ) => void,
  ) {
    onResizeRef.current = onResizeCallback;
  }

  const onStartRef: RefType = useRef(null);
  function setOnStartRef(
    onStartCallback?: (
      uuid: string,
      opts?: {
        height?: number;
        width?: number;
        x?: number;
        y?: number;
      },
    ) => void,
  ) {
    onStartRef.current = onStartCallback;
  }

  const [elementMapping, setElementRefState] = useState<{
    [uuid: string]: ElementType;
  }>({});
  const [resizersMapping, setResizersRefState] = useState<{
    [uuid: string]: ElementType[];
  }>({});

  const setResizableObject = buildSetFunction(setElementRefState);
  const setResizersObjects = buildSetFunction(setResizersRefState);

  useEffect(() => {
    Object.entries(elementMapping || {})?.forEach(
      ([uuid, element]: [ApplicationExpansionUUIDEnum, ElementType]) => {
        const Resize = e => {
          pauseEvent(e);

          const { height, width, x, y } = element?.getBoundingClientRect();
          const offsetLeft = element.offsetLeft;
          const offsetTop = element.offsetTop;
          const offsetBottom = offsetTop + height;
          const offsetRight = offsetLeft + width;

          if (
            !refOrientationMapping?.current?.[uuid] ||
            typeof refOrientationMapping?.current?.[uuid] === 'undefined'
          ) {
            const isLeft = Math.abs(x - e.clientX) < Math.abs(x + width - e.clientX);
            const isTop = Math.abs(y - e.clientY) < Math.abs(y + height - e.clientY);

            const isHorizontal =
              Math.abs((offsetTop + height) / 2 - e.clientY) <
              Math.abs((offsetLeft + width) / 2 - e.clientX);
            const verticalEdgePercentage = (e.clientY - offsetTop) / height;
            const horizontalEdgePercentage = (e.clientX - offsetLeft) / width;

            const isHorizontalEdge =
              horizontalEdgePercentage <= 0.05 || horizontalEdgePercentage >= 0.95;
            const isVerticalEdge = verticalEdgePercentage <= 0.05 || verticalEdgePercentage >= 0.95;
            const isCorner = isHorizontalEdge && isVerticalEdge;

            refOrientationMapping.current[uuid] = {
              isHorizontal,
              isLeft,
              isTop,
              isCorner,
            };
          }

          const { isHorizontal, isLeft, isTop, isCorner } =
            refOrientationMapping?.current?.[uuid] || {};

          let width2;
          let left2;
          let top2;
          let height2;

          const clientX = e.clientX;
          const clientY = e.clientY;

          if (isHorizontal || isCorner) {
            if (isLeft) {
              width2 = offsetRight - clientX;
              left2 = clientX;
            } else {
              width2 = clientX - offsetLeft;
            }
          }

          if (!isHorizontal || isCorner) {
            if (isTop) {
              height2 = offsetBottom - clientY;
              top2 = clientY;
            } else {
              height2 = clientY - offsetTop;
            }
          }

          const dataForCallback: {
            height?: number;
            width?: number;
            x?: number;
            y?: number;
          } = {};

          if (isHorizontal || isCorner) {
            if (isLeft) {
              // If there is no previous value
              if (
                !refRecentValuesMapping?.current?.[uuid]?.left ||
                // More than 24 or... moving to the right but pointer is on the right side of the left edge
                ((left2 >= 24 ||
                  (left2 > refRecentValuesMapping?.current?.[uuid]?.left &&
                    clientX >= offsetLeft)) &&
                  // Width more than 400 or... moving to the left while being 400 pixels away from the right side
                  (width2 >= 400 ||
                    (left2 < refRecentValuesMapping?.current?.[uuid]?.left &&
                      clientX <= offsetLeft + width2 - 400)))
              ) {
                element.style.left = `${left2}px`;
                refRecentValuesMapping.current[uuid].left = left2;
                dataForCallback.x = left2;

                // If there is no previous value
                if (
                  !refRecentValuesMapping?.current?.[uuid]?.width ||
                  // Increase width (you can only go left to increase the width) or...
                  width2 > refRecentValuesMapping?.current?.[uuid]?.width ||
                  // Decrease the width up to 400 pixels
                  (width2 < refRecentValuesMapping?.current?.[uuid]?.width && width2 >= 400)
                ) {
                  element.style.width = `${width2}px`;
                  dataForCallback.width = width2;
                }
              }
            } else {
              // Resizing from the right side
              // If there is no previous value
              if (
                !refRecentValuesMapping?.current?.[uuid]?.width ||
                // Increasing the width (by going to the right) but right edge must be 24 pixels away from the right edge of the screen...
                (width2 > refRecentValuesMapping?.current?.[uuid]?.width &&
                  offsetLeft + width2 <= window.innerWidth - 24 * 2) ||
                // or decrease the width (by going to the left) but width must be greater than 400
                (width2 < refRecentValuesMapping?.current?.[uuid]?.width && width2 >= 400)
              ) {
                element.style.width = `${width2}px`;
                dataForCallback.width = width2;
              }
            }
          }

          if (!isHorizontal || isCorner) {
            if (top2) {
              // If there is no previous value
              if (
                !refRecentValuesMapping?.current?.[uuid]?.top || // More than 24 or... moving down but pointer is on the bottom side of the top edge
                ((top2 >= 24 ||
                  (top2 > refRecentValuesMapping?.current?.[uuid]?.top && clientY >= offsetTop)) &&
                  // Height more than 300 or.. moving up while being 300 pixels away from the bottom side
                  (height2 >= 300 ||
                    (top2 < refRecentValuesMapping?.current?.[uuid]?.top &&
                      clientY <= offsetTop + height2 - 300)))
              ) {
                element.style.top = `${top2}px`;
                refRecentValuesMapping.current[uuid].top = top2;
                dataForCallback.y = top2;

                // If there is no previous value
                if (
                  !refRecentValuesMapping?.current?.[uuid]?.height ||
                  // Increasing the height (by going up) or...
                  height2 > refRecentValuesMapping?.current?.[uuid]?.height ||
                  // Decrease the height up to 300 pixels
                  (height2 < refRecentValuesMapping?.current?.[uuid]?.height && height2 >= 300)
                ) {
                  element.style.height = `${height2}px`;
                  dataForCallback.height = height2;
                }
              }
            } else {
              // Resizing from the bottom side
              // If there is no previous value
              if (
                !refRecentValuesMapping?.current?.[uuid]?.height ||
                // Increasing the height (by going down) but bottom edge must be 24 pixels away from the bottom edge of the screen
                (height2 > refRecentValuesMapping?.current?.[uuid]?.height &&
                  offsetTop + height2 <= window.innerHeight - 24 * 2) ||
                // or decrease the height (by going up) but height must be greater than 300
                (height2 < refRecentValuesMapping?.current?.[uuid]?.height && height2 >= 300)
              ) {
                element.style.height = `${height2}px`;
                dataForCallback.height = height2;
              }
            }
          }

          const onResizeCallback = onResizeRef?.current;
          if (onResizeCallback && !isEmptyObject(selectEntriesWithValues(dataForCallback))) {
            onResizeCallback?.(uuid, selectEntriesWithValues(dataForCallback));
          }

          refRecentValuesMapping.current[uuid].width = element?.getBoundingClientRect()?.width;
          refRecentValuesMapping.current[uuid].height = element?.getBoundingClientRect()?.height;
        };

        const preventSelection = event => {
          event.preventDefault();
        };

        const stopResize = e => {
          // document.removeEventListener('selectstart', preventSelection);
          refOrientationMapping.current[uuid] = null;
          window.removeEventListener('mousemove', Resize, false);
          window.removeEventListener('mouseup', stopResize, false);
        };

        const initResize = e => {
          if (e.which !== 1) {
            return;
          }

          // document.addEventListener('selectstart', preventSelection);

          const onStart = onStartRef?.current;
          if (onStart) {
            onStart?.(uuid, refRecentValuesMapping?.current?.[uuid]);
          }

          refRecentValuesMapping.current[uuid] = {};
          if (typeof window !== 'undefined') {
            window.addEventListener('mousemove', Resize, false);
            window.addEventListener('mouseup', stopResize, false);
          }
        };

        refHandlers.current[uuid] = initResize;

        const resizers = resizersMapping?.[uuid];

        resizers?.forEach(resizer => {
          resizer?.addEventListener('mousedown', initResize, false);
        });
      },
    );

    const handlers = refHandlers?.current;

    return () => {
      Object.entries(resizersMapping || {})?.forEach(([uuid, resizers]) => {
        (resizers as ElementType[])?.forEach(resizer => {
          resizer?.removeEventListener('mousedown', handlers?.[uuid]);
        });
      });
    };
  }, [elementMapping, resizersMapping]);

  return {
    setOnResize: setOnResizeRef,
    setOnStart: setOnStartRef,
    setResizableObject,
    setResizersObjects,
  };
}
