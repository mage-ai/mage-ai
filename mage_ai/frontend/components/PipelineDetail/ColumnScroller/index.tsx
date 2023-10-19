import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ScrollbarContainerStyle,
  ScrollCursorStyle,
} from './index.style';

export type StartDataType = {
  event: any;
  scrollTop: number;
};

type ColumnScrollerProps = {
  blockRefs: any;
  mainContainerRect?: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  mountedBlocks?: {
    [key: string]: boolean;
  };
  refCursor: any;
  setStartData: (data: StartDataType) => void;
  startData?: StartDataType;
};

function getTotalHeight(blockRefs): number {
  if (blockRefs?.current) {
    return Object
      .values(blockRefs?.current || {})
      .reduce(
        (acc, ref) => acc + (ref?.current?.getBoundingClientRect?.()?.height || 0),
        0,
      );
  }

  return;
}

function ColumnScroller({
  blockRefs,
  mainContainerRect,
  mountedBlocks,
  refCursor,
  setStartData,
  startData,
}: ColumnScrollerProps) {
  const refContainer = useRef(null);

  const [totalHeight, setTotalHeight] = useState<number>(null);

  useEffect(() => {
    const arr = Object.values(mountedBlocks || {});
    if (arr?.length >= 1 && arr.every(val => val)) {
      setTotalHeight(getTotalHeight(blockRefs));
    }
  }, [
    blockRefs,
    mountedBlocks,
  ]);

  const {
    height,
    y,
  } = mainContainerRect || {};

  const cursorHeight = useMemo(() => {
    if (totalHeight <= height) {
      return null;
    }

    return height * (height / totalHeight);
  }, [
    height,
    totalHeight,
  ]);

  const handleMouseMove = useCallback((event, clientY = null) => {
    if (!startData && clientY == null) {
      return;
    }

    let yFinal
    const yMin = refContainer?.current?.getBoundingClientRect()?.y;

    if (clientY === null) {
      const currentScrollTop = startData?.scrollTop;
      const yStart = startData?.event?.clientY;
      const distance = event?.clientY - yStart;

      yFinal = currentScrollTop + distance;
    } else {
      yFinal = clientY;
    }

    if (yFinal <= yMin) {
      yFinal = yMin;
    } else if ((yFinal + cursorHeight) >= (y + height)) {
      yFinal = (y + height) - cursorHeight;
    }

    console.log(yFinal)

    refCursor.current.style.top = `${yFinal}px`;
  }, [
    cursorHeight,
    height,
    refCursor,
    setStartData,
    startData,
    y,
  ]);

  useEffect(() => {
    // Need to clear the start data when the mouse leaves the window.
    const clearStartData = () => {
      setStartData(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', clearStartData);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', clearStartData);
      }
    };
  }, [
    handleMouseMove,
  ]);

  // Clicking a part of the container should scroll to the part.
  return (
    <ScrollbarContainerStyle
      height={height}
      ref={refContainer}
    >
      {cursorHeight !== null && (
        <ScrollCursorStyle
          height={cursorHeight}
          onMouseDown={(event) => setStartData({
            event,
            scrollTop: refCursor?.current?.getBoundingClientRect()?.y,
          })}
          ref={refCursor}
          selected={!!startData}
          top={refContainer?.current?.getBoundingClientRect()?.y}
        />
      )}
    </ScrollbarContainerStyle>
  );
}

export default ColumnScroller;
