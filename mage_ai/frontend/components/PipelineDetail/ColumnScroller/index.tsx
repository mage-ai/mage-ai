import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  blockOutputHeights: number[];
  codeBlockHeights: number[];
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
  setStartData: (data: StartDataType) => void;
  startData?: StartDataType;
};

function ColumnScroller({
  blockOutputHeights,
  codeBlockHeights,
  mainContainerRect,
  mountedBlocks,
  refCursor,
  refCursorContainer,
  setStartData,
  startData,
}: ColumnScrollerProps) {
  const totalHeight = useMemo(() => sum(codeBlockHeights || []), [codeBlockHeights]);
  const totalHeightOutput = useMemo(() => sum(blockOutputHeights || []), [blockOutputHeights]);

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

    event.preventDefault();

    let yFinal
    const yMin = refCursorContainer?.current?.getBoundingClientRect()?.y;

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

    refCursor.current.style.top = `${yFinal}px`;
  }, [
    cursorHeight,
    height,
    refCursor,
    refCursorContainer,
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
      ref={refCursorContainer}
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
