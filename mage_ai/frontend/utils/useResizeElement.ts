import { useCallback, useEffect, useRef, useState } from 'react';

import { delay } from './delay';

export default function useResizeElement() {
  const refOrientation = useRef(null);
  const refRecentValues = useRef({});

  const [element, setElementRefState] = useState<Element>(null);
  const [resizers, setResizersRefState] = useState<Element[]>(null);
  function buildSetFunction(updateFunction) {
    async function setObject(nodeOrNodes, opts: {
      delay?: number;
      tries?: number;
    } = {}) {
      const valueIsArray = Array.isArray(nodeOrNodes);
      const nodes = valueIsArray ? nodeOrNodes : [nodeOrNodes];

      await Promise.all(nodes?.map(async (node) => {
        const tries = opts?.tries || 1;
        let attempt = 0;

        while (attempt < tries) {
          if (node?.current) {
            updateFunction((prev) => {
              if (valueIsArray) {
                return [...(prev || []), node?.current];
              } else {
                return node?.current;
              }
            });
            break;
          } else {
            await delay(opts?.delay || 1000);
          }
          attempt++;
        }
      }));
    }

    return setObject;
  }

  const setResizableObject = buildSetFunction(setElementRefState);
  const setResizersObjects = buildSetFunction(setResizersRefState);

  useEffect(() => {
    const Resize = (e) => {
      const {
        height,
        width,
        x,
        y,
      } = element?.getBoundingClientRect();
      const offsetLeft = element.offsetLeft;
      const offsetTop = element.offsetTop;
      const offsetBottom = offsetTop + height;
      const offsetRight = offsetLeft + width;

      if (refOrientation?.current === null) {
        const isLeft = Math.abs(x - e.clientX) < Math.abs((x + width) - e.clientX);
        const isTop = Math.abs(y - e.clientY) < Math.abs((y + height) - e.clientY);

        const isHorizontal = Math.abs(((offsetTop + height) / 2) - e.clientY) < Math.abs(((offsetLeft + width) / 2) - e.clientX);
        const verticalEdgePercentage = (e.clientY - offsetTop) / height;
        const horizontalEdgePercentage = (e.clientX - offsetLeft) / width;

        const isHorizontalEdge = horizontalEdgePercentage <= 0.01 || horizontalEdgePercentage >= 0.99;
        const isVerticalEdge = verticalEdgePercentage <= 0.01 || verticalEdgePercentage >= 0.99;
        const isCorner = isHorizontalEdge && isVerticalEdge;

        refOrientation.current = {
          isHorizontal,
          isLeft,
          isTop,
          isCorner,
        };
      }

      const {
        isHorizontal,
        isLeft,
        isTop,
        isCorner,
      } = refOrientation.current;

      let width2;
      let left2;
      let top2;
      let height2;

      const clientX = e.clientX;
      const clientY = e.clientY;

      if (isHorizontal) {
        if (isLeft) {
          width2 = offsetRight - clientX;
          left2 = clientX;
        } else {
          width2 = clientX - offsetLeft;
        }
      } else {
        if (isTop) {
          height2 = offsetBottom - clientY;
          top2 = clientY;
        } else {
          height2 = clientY - offsetTop;
        }
      }

      if (isHorizontal) {
        if (isLeft) {
          // If there is no previous value
          if (!refRecentValues?.current?.left ||
            (
              // More than 24 or... moving to the right but pointer is on the right side of the left edge
              (left2 >= 24 || (left2 > refRecentValues?.current?.left && clientX >= offsetLeft))
              &&
              // Width more than 400 or... moving to the left while being 400 pixels away from the right side
              (width2 >= 400 || (left2 < refRecentValues?.current?.left && clientX <= ((offsetLeft + width2) - 400)))
            )
          ) {
            element.style.left = `${left2}px`;
            refRecentValues.current.left = left2;

            // If there is no previous value
            if (!refRecentValues?.current?.width ||
              (
                // Increase width (you can only go left to increase the width) or...
                width2 > refRecentValues?.current?.width ||
                (
                  // Decrease the width up to 400 pixels
                  (width2 < refRecentValues?.current?.width) && width2 >= 400
                )
              )
            ) {
              element.style.width = `${width2}px`;
            }
          }
        } else {
          // Resizing from the right side
          // If there is no previous value
          if (!refRecentValues?.current?.width ||
            (
              // Increasing the width (by going to the right) but right edge must be 24 pixels away from the right edge of the screen...
              width2 > refRecentValues?.current?.width && offsetLeft + width2 <= (window.innerWidth - (24 * 2))
            )
              // or decrease the width (by going to the left) but width must be greater than 400
              || (width2 < refRecentValues?.current?.width && width2 >= 400)
          ) {
            element.style.width = `${width2}px`;
          }
        }
      } else {
        if (top2) {
          // If there is no previous value
          if (!refRecentValues?.current?.top ||
            (
              // More than 24 or... moving down but pointer is on the bottom side of the top edge
              (top2 >= 24 || (top2 > refRecentValues?.current?.top && clientY >= offsetTop))
            )
            &&
            // Height more than 300 or.. moving up while being 300 pixels away from the bottom side
            (height2 >= 300 || (top2 < refRecentValues?.current?.top && clientY <= ((offsetTop + height2) - 300)))
        ) {
            element.style.top = `${top2}px`;
            refRecentValues.current.top = top2;

            // If there is no previous value
            if (!refRecentValues?.current?.height ||
              (
                // Increasing the height (by going up) or...
                height2 > refRecentValues?.current?.height ||
                (
                  // Decrease the height up to 300 pixels
                  (height2 < refRecentValues?.current?.height) && height2 >= 300
                )
              )
            ) {
              element.style.height = `${height2}px`;
            }
          }
        } else {
          // Resizing from the bottom side
          // If there is no previous value
          if (!refRecentValues?.current?.height ||
            (
              // Increasing the height (by going down) but bottom edge must be 24 pixels away from the bottom edge of the screen
              height2 > refRecentValues?.current?.height && offsetTop + height2 <= (window.innerHeight - (24 * 2))
            )
              // or decrease the height (by going up) but height must be greater than 300
            || (height2 < refRecentValues?.current?.height && height2 >= 300)
          ) {
            element.style.height = `${height2}px`;
          }
        }
      }

      refRecentValues.current.width = element?.getBoundingClientRect()?.width;
      refRecentValues.current.height = element?.getBoundingClientRect()?.height;
    };


    const stopResize = (e) => {
      refOrientation.current = null;
      refRecentValues.current = {};
      window.removeEventListener('mousemove', Resize, false);
      window.removeEventListener('mouseup', stopResize, false);
    };

    const initResize = (e) => {
      if (typeof window !== 'undefined') {
        window.addEventListener('mousemove', Resize, false);
        window.addEventListener('mouseup', stopResize, false);
      }
    };

    resizers?.forEach((resizer) => {
      resizer?.addEventListener('mousedown', initResize, false);
    });

    return () => {
      resizers?.forEach((resizer) => {
        resizer?.removeEventListener('mousedown', initResize);
      });
    };
  }, [element, resizers]);

  return {
    setResizableObject,
    setResizersObjects,
  };
}
