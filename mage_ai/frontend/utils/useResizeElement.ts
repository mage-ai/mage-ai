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

      if (isHorizontal) {
        if (isLeft) {
          width2 = offsetRight - e.clientX;
          left2 = e.clientX;
          // element.style.width = offsetRight - e.clientX + 'px';
          // element.style.left = `${e.clientX}px`;
        } else {
          width2 = e.clientX - offsetLeft;
          // element.style.width = e.clientX - offsetLeft + 'px';
        }
      } else {
        if (isTop) {
          height2 = offsetBottom - e.clientY;
          top2 = e.clientY;
          // element.style.height = offsetBottom - e.clientY + 'px';
          // element.style.top = `${e.clientY}px`;
        } else {
          height2 = e.clientY - offsetTop;
          // element.style.height = e.clientY - offsetTop + 'px';
        }
      }

      if (isHorizontal) {
        if (isLeft) {
          // If there is no previous value
          // -> If decreasing the size by moving to the right
          // <- If left is more than 24 pixels from the left edge
          if (!refRecentValues?.current?.left

            ||
            (
              // More than 24 or moving to the right
              (left2 >= 24 || (left2 > refRecentValues?.current?.left && e.clientX >= element.offsetLeft))
              &&
              // Width more than 400 or moving to the left while being 400 pixels away from the right
              (width2 >= 400 || (left2 < refRecentValues?.current?.left && e.clientX <= ((element.offsetLeft + width2) - 400)))
            )

          ) {
            element.style.left = `${left2}px`;
            refRecentValues.current.left = left2;

            // If there is no previous value
            // <--> Width is increasing
            // -><- Width is greater than 400
            if (!refRecentValues?.current?.width
              ||
              (
                // Increase width as long as
                (
                  width2 > refRecentValues?.current?.width
                    // && left2 + width2 < (width - (24 * 2))
                )
                  // Decrease the width up to 400 pixels
                  || (
                    (width2 < refRecentValues?.current?.width) && width2 >= 400
                  )
              )
            ) {
              element.style.width = `${width2}px`;
            }
          }
        } else {
          // If there is no previous value
          // <--> Width is increasing
          // -><- Width is greater than 400
          if (!refRecentValues?.current?.width
            ||
            (
              width2 > refRecentValues?.current?.width && element.offsetLeft + width2 <= (window.innerWidth - (24 * 2))
            )
            || (width2 < refRecentValues?.current?.width && width2 >= 400)
          ) {
            element.style.width = `${width2}px`;
          }
        }
      } else {
        if (height2) {
          if (!refRecentValues?.current?.height || (height2 > refRecentValues?.current?.height || isTop) || height2 >= 300) {
            element.style.height = `${height2}px`;

            if (top2) {
              if (!refRecentValues?.current?.top || (top2 > refRecentValues?.current?.top && e.clientY >= element.offsetTop) || top2 >= 24) {
                element.style.top = `${top2}px`;
              }
            }
          }
        }
      }

      refRecentValues.current.top = element.offsetTop;
      refRecentValues.current.width = element?.getBoundingClientRect()?.width;
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
