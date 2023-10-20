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
  columnIndex: number;
  columns: number;
  cursorHeight: number;
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
  setCursorHeight: (cursorHeight: number) => void;
  setStartData: (data: StartDataType) => void;
  startData?: StartDataType;
};

function ColumnScroller({
  columnIndex,
  columns,
  cursorHeight,
  heights,
  mainContainerRect,
  mountedBlocks,
  refCursor,
  refCursorContainer,
  rightAligned,
  setCursorHeight,
  setStartData,
  startData,
}: ColumnScrollerProps) {
  const totalHeight = useMemo(() => sum(heights || []), [heights]);

  const {
    height,
    width,
    x,
    y,
  } = mainContainerRect || {};

  useEffect(() => {
    setCursorHeight(totalHeight > height
      ? height * (height / totalHeight)
      : 0
    );
  }, [
    height,
    setCursorHeight,
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
    const {
      pageX,
      pageY,
    } = event;

    // Make sure they are scrolling on the correct half of the screen
    if (pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height) {
      // columnIndex
      const columnWidth = width / columns;

      if (pageX >= x + (columnWidth * columnIndex)) {
        if (pageX < x + (columnWidth * (columnIndex + 1))) {
          const rect = refCursor?.current?.getBoundingClientRect();
          let yFinal = (rect?.y || 0) + (event?.deltaY || 0);

          updatePosition(yFinal);
        }
      }
    }
  }, [
    columnIndex,
    columns,
    height,
    updatePosition,
    width,
    x,
    y,
  ]);

  const handleMouseMove = useCallback((event, clientY = null) => {
    if (!startData && clientY == null) {
      return;
    }

    if (event) {
      event?.preventDefault();
    }

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
    handleMouseMove(null, refCursor?.current?.getBoundingClientRect()?.y)
  }, [
    height,
    refCursor,
  ]);

  useEffect(() => {
    // Need to clear the start data when the mouse leaves the window.
    const clearStartData = () => {
      setStartData(null);
    };

    if (typeof window !== 'undefined' && cursorHeight) {
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

  if (!cursorHeight) {
    return <div />;
  }

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
