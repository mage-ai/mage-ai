import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import {
  ScrollbarContainerStyle,
  ScrollCursorStyle,
} from './index.style';
import { sum } from '@utils/array';

export type StartDataType = {
  event: any;
  scrollTop: number;
};

type ColumnScrollerProps = {
  // blockOutputHeights: number[];
  heights: number[];
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
  refCursorContainer: any;
  rightAligned?: boolean;
  setStartData: (data: StartDataType) => void;
  startData?: StartDataType;
};

function ColumnScroller({
  // blockOutputHeights,
  heights,
  mainContainerRect,
  mountedBlocks,
  refCursor,
  refCursorContainer,
  rightAligned,
  setStartData,
  startData,
}: ColumnScrollerProps) {
  const totalHeight = useMemo(() => sum(heights || []), [heights]);
  // const totalHeightOutput = useMemo(() => sum(blockOutputHeights || []), [blockOutputHeights]);

  const {
    height,
    width,
    x,
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

  const updatePosition = useCallback((yFinal: number) => {
    const yMin = refCursorContainer?.current?.getBoundingClientRect()?.y;
    if (yFinal <= yMin) {
      yFinal = yMin;
    } else if ((yFinal + cursorHeight) >= (y + height)) {
      yFinal = (y + height) - cursorHeight;
    }

    if (refCursor?.current) {
      refCursor.current.style.top = `${yFinal}px`;
    }
  }, [
    cursorHeight,
    height,
    refCursor,
    refCursorContainer,
    y,
  ]);

  const handleWheel = useCallback((event) => {
    const rect = refCursor?.current?.getBoundingClientRect();
    let yFinal = (rect?.y || 0) + (event?.deltaY || 0);

    updatePosition(yFinal);
  }, [
    updatePosition,
  ]);

  const handleMouseMove = useCallback((event, clientY = null) => {
    if (!startData && clientY == null) {
      return;
    }

    event.preventDefault();

    let yFinal

    if (clientY === null) {
      const currentScrollTop = startData?.scrollTop;
      const yStart = startData?.event?.clientY;
      const distance = event?.clientY - yStart;

      yFinal = currentScrollTop + distance;
    } else {
      yFinal = clientY;
    }

    updatePosition(yFinal);
  }, [
    startData,
    updatePosition,
  ]);

  useEffect(() => {
    // Need to clear the start data when the mouse leaves the window.
    const clearStartData = () => {
      setStartData(null);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('wheel', handleWheel);
      window.addEventListener('mouseup', clearStartData);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('wheel', handleWheel);
        window.removeEventListener('mouseup', clearStartData);
      }
    };
  }, [
    handleMouseMove,
    handleWheel,
  ]);

  // Clicking a part of the container should scroll to the part.
  return (
    <ScrollbarContainerStyle
      height={height}
      ref={refCursorContainer}
      left={rightAligned ? (x + width) - SCROLLBAR_WIDTH : undefined}
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
          top={refCursorContainer?.current?.getBoundingClientRect()?.y}
        />
      )}
    </ScrollbarContainerStyle>
  );
}

export default ColumnScroller;
