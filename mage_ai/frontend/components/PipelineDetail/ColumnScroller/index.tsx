import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  CUSTOM_EVENT_COLUMN_SCROLLER_CURSOR_MOVED,
  CUSTOM_EVENT_SYNC_COLUMN_POSITIONS,
} from '@components/PipelineDetail/constants';
import { SCROLLBAR_WIDTH } from '@oracle/styles/scrollbars';
import {
  ScrollbarContainerStyle,
  ScrollCursorStyle,
} from './index.style';
import { buildBlockRefKey } from '@components/PipelineDetail/utils';
import { calculateOffsetPercentage } from '@components/CodeBlock/utils';
import { sortByKey, sum } from '@utils/array';

export type StartDataType = {
  event: any;
  scrollTop: number;
};

type ColumnScrollerProps = {
  columnIndex: number;
  columns: number;
  cursorHeight: number;
  mainContainerRect?: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  rightAligned?: boolean;
};

function ColumnScroller({
  blocks,
  columnIndex,
  columns,
  eventNameRefsMapping,
  mainContainerRect,
  rightAligned,
  setCursorHeight,
}: ColumnScrollerProps) {
  const refCursor = useRef(null);
  const refCursorContainer = useRef(null);

  const [heights, setHeights] = useState(null);
  const [lockScroll, setLockScroll] = useState(null);
  const [mounted, setMounted] = useState(null);
  const [startData, setStartData] = useState(null);

  const dispatchEventCusorMoved = useCallback(() => {
    const evt = new CustomEvent(CUSTOM_EVENT_COLUMN_SCROLLER_CURSOR_MOVED, {
      detail: {
        columnScrolling: columnIndex,
        refCursor,
        refCursorContainer,
        refsMappings: Object.values(eventNameRefsMapping || {}),
      },
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(evt);
    }
  }, [
    columnIndex,
    eventNameRefsMapping,
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const calculateTopFromY = useCallback(({
    blockIndex,
    heights,
    y: y2,
  }: {
    blockIndex: number;
    heights: number[];
    y: number;
  }) => {
    const containerRect = refCursorContainer?.current?.getBoundingClientRect();
    const cursorRect = refCursor?.current?.getBoundingClientRect();

    const heightUpToBlockIdx = sum(heights?.slice(0, blockIndex) || []);

    const totalHeight = sum(heights || []) || 0;
    const offsetPercentage = calculateOffsetPercentage(
      heights,
      totalHeight,
      height,
    );
    const percentageMoved = (heightUpToBlockIdx - (y2 - containerRect?.y))
      / (totalHeight);
    const percentage = (percentageMoved / (1 - offsetPercentage));

    const top = (percentage * (containerRect?.height - cursorRect?.height)) + containerRect?.y;

    return top;
  }, []);

  useEffect(() => {
    // Need to clear the start data when the mouse leaves the window.
    const updateHeights = ({
      detail: {
        blockIndex,
      },
      type: eventName,
    }) => {
      const refsMappings = Object.values(eventNameRefsMapping || {});
      const heightsInner = blocks?.map((block: BlockType) => {
        const key = buildBlockRefKey(block);

        const height = Math.max(...refsMappings.map((refsMapping) => {
          const blockRef = refsMapping?.current?.[key];

          return blockRef?.current?.getBoundingClientRect()?.height || 0;
        }));

        return height;
      });

      setHeights(heightsInner);

      if (lockScroll) {
        const top = calculateTopFromY({
          ...lockScroll,
          heights: heightsInner,
        });
        updatePosition(top);
      }

      dispatchEventCusorMoved();
    }

    if (typeof window !== 'undefined') {
      Object.keys(eventNameRefsMapping || {})?.forEach((eventName: string) => {
        window.addEventListener(eventName, updateHeights);
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        Object.keys(eventNameRefsMapping || {})?.forEach((eventName: string) => {
          window.removeEventListener(eventName, updateHeights);
        });
      }
    };
  }, [
    blocks,
    calculateTopFromY,
    columnIndex,
    dispatchEventCusorMoved,
    eventNameRefsMapping,
    lockScroll,
    setHeights,
  ]);

  const {
    height,
    width,
    x,
    y,
  } = mainContainerRect || {};
  const totalHeight = useMemo(() => sum(heights || []), [heights]);
  const getCursorHeight = useCallback(() => totalHeight > height
    ? height * (height / totalHeight)
    : 0,
  [
    height,
    totalHeight,
  ]);
  const cursorHeight = useMemo(() => getCursorHeight(), [
    getCursorHeight,
  ]);
  useMemo(() => {
    setCursorHeight(cursorHeight);
  }, [
    cursorHeight,
    setCursorHeight,
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
    y,
  ]);

  useEffect(() => {
    const handleSyncColumnPositions = ({
      detail,
    }) => {
      if (columnIndex !== detail?.columnIndex) {
        return;
      }

      const top = calculateTopFromY({
        ...detail,
        heights,
      });

      updatePosition(top);
      dispatchEventCusorMoved();

      if (detail?.lockScroll) {
        setLockScroll(detail);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(CUSTOM_EVENT_SYNC_COLUMN_POSITIONS, handleSyncColumnPositions);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(CUSTOM_EVENT_SYNC_COLUMN_POSITIONS, handleSyncColumnPositions);
      }
    };
  }, [
    columnIndex,
    height,
    heights,
    setLockScroll,
    updatePosition,
    calculateTopFromY,
    y,
  ]);

  const handleWheel = useCallback((event) => {
    const {
      pageX,
      pageY,
    } = event;

    // Make sure they are scrolling on the correct half of the screen
    if (pageX >= x && pageX <= x + width && pageY >= y && pageY <= y + height) {
      const columnWidth = width / columns;

      if (pageX >= x + (columnWidth * columnIndex)) {
        if (pageX < x + (columnWidth * (columnIndex + 1))) {
          const rect = refCursor?.current?.getBoundingClientRect();
          let yFinal = (rect?.y || 0) + (event?.deltaY || 0);

          updatePosition(yFinal);
          dispatchEventCusorMoved();
          setLockScroll(null);
        }
      }
    }
  }, [
    columnIndex,
    columns,
    height,
    updatePosition,
    dispatchEventCusorMoved,
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
    let distance = 0;
    if (clientY === null) {
      const currentScrollTop = startData?.scrollTop;
      const yStart = startData?.event?.clientY;
      distance = event?.clientY - yStart;
      yFinal = currentScrollTop + distance;
    } else {
      yFinal = clientY;
    }

    updatePosition(yFinal);
    dispatchEventCusorMoved();
    setLockScroll(null);
  }, [
    dispatchEventCusorMoved,
    startData,
    updatePosition,
  ]);

  useEffect(() => {
    updatePosition(refCursor?.current?.getBoundingClientRect()?.y)
  }, [
    height,
    updatePosition,
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
    cursorHeight,
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
