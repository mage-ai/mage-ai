import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import BlockType from '@interfaces/BlockType';
import {
  CUSTOM_EVENT_COLUMN_SCROLLER_CURSOR_MOVED,
  CUSTOM_EVENT_COLUMN_SCROLLER_RESET,
  CUSTOM_EVENT_COLUMN_SCROLLER_SCROLL_TO_BLOCK,
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
  blocks: BlockType[];
  columnIndex: number;
  columns: number;
  disabled?: boolean;
  eventNameRefsMapping: {
    [eventName: string]: {
      [blockRefKey: string]: any;
    };
  };
  invisible?: boolean;
  mainContainerRect: {
    height: number;
    width: number;
    x: number;
    y: number;
  };
  rightAligned?: boolean;
  scrollTogether?: boolean;
  setCursorHeight: (cursorHeight: number) => void;
};

function ColumnScroller({
  blocks,
  columnIndex,
  columns,
  disabled,
  eventNameRefsMapping,
  invisible,
  mainContainerRect,
  rightAligned,
  scrollTogether,
  setCursorHeight,
}: ColumnScrollerProps) {
  const refCursor = useRef(null);
  const refCursorContainer = useRef(null);

  const blockUUIDs = useMemo(() => blocks?.map(({ uuid }) => uuid), [blocks]);

  const [heights, setHeights] = useState(null);
  const [lockScroll, setLockScroll] = useState(null);
  const [mounted, setMounted] = useState(null);
  const [startData, setStartData] = useState(null);

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
    if (cursorHeight) {
      const yMin = refCursorContainer?.current?.getBoundingClientRect()?.y;
      if (yFinal <= yMin) {
        yFinal = yMin;
      } else if ((yFinal + cursorHeight) >= (y + height)) {
        yFinal = (y + height) - cursorHeight;
      }

      if (refCursor?.current) {
        refCursor.current.style.top = `${yFinal}px`;
      }
    }
  }, [
    cursorHeight,
    height,
    refCursor,
    y,
  ]);

  const dispatchEventCusorMoved = useCallback(() => {
    if (disabled) {
      return;
    }

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
    disabled,
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

  const updateHeights = useCallback(() => {
    const refsMappings = Object.values(eventNameRefsMapping || {});
    const heightsInner = blocks?.map((block: BlockType) => {
      const key = buildBlockRefKey(block);

      const height = Math.max(...refsMappings.map((refsMapping) => {
        const blockRef = refsMapping?.current?.[key];

        return blockRef?.current?.getBoundingClientRect()?.height || 0;
      }));

      return height;
    });

    if (heightsInner?.every(value => typeof value !== 'undefined' && !isNaN(value))) {
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

  }, [
    blocks,
    calculateTopFromY,
    columnIndex,
    dispatchEventCusorMoved,
    eventNameRefsMapping,
    lockScroll,
    setHeights,
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      Object.keys(eventNameRefsMapping || {})?.forEach((eventName: string) => {
        // @ts-ignore
        window.addEventListener(eventName, updateHeights);
      });
    }

    return () => {
      if (typeof window !== 'undefined') {
        Object.keys(eventNameRefsMapping || {})?.forEach((eventName: string) => {
          // @ts-ignore
          window.removeEventListener(eventName, updateHeights);
        });
      }
    };
  }, [
    eventNameRefsMapping,
    updateHeights,
  ]);

  const refresh = useCallback(() => {
    dispatchEventCusorMoved();
    updateHeights();
  }, [
    dispatchEventCusorMoved,
    updateHeights,
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.addEventListener(CUSTOM_EVENT_COLUMN_SCROLLER_RESET, refresh);
    }

    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.removeEventListener(CUSTOM_EVENT_COLUMN_SCROLLER_RESET, refresh);
      }
    };
  }, [
    refresh,
  ]);

  useEffect(() => {
    const handleScrollToBlock = ({
      detail: {
        block,
      },
    }) => {
      const blockIndex = blocks?.findIndex(({ uuid }) => uuid === block?.uuid);
      const top = calculateTopFromY({
        blockIndex,
        heights,
        y: refCursorContainer?.current?.getBoundingClientRect()?.y,
      });

      updatePosition(top);
      dispatchEventCusorMoved();

    };

    if (typeof window !== 'undefined') {
      // @ts-ignore
      window.addEventListener(CUSTOM_EVENT_COLUMN_SCROLLER_SCROLL_TO_BLOCK, handleScrollToBlock);
    }

    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.removeEventListener(CUSTOM_EVENT_COLUMN_SCROLLER_SCROLL_TO_BLOCK, handleScrollToBlock);
      }
    };
  }, [
    blocks,
    calculateTopFromY,
    dispatchEventCusorMoved,
    heights,
    updatePosition,
  ]);

  // Update everything when these values change.
  useEffect(() => {
    if (!disabled) {
      updateHeights();
    }
  }, [
    disabled,
    scrollTogether,
    updateHeights,
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
      // @ts-ignore
      window.addEventListener(CUSTOM_EVENT_SYNC_COLUMN_POSITIONS, handleSyncColumnPositions);
    }

    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
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

      if (scrollTogether
        || (
          (pageX >= x + (columnWidth * columnIndex))
            && (pageX < x + (columnWidth * (columnIndex + 1)))
        )
      ) {
        const rect = refCursor?.current?.getBoundingClientRect();
        let yFinal = (rect?.y || 0) + (event?.deltaY || 0);

        updatePosition(yFinal);
        dispatchEventCusorMoved();
        setLockScroll(null);
      }
    }
  }, [
    columnIndex,
    columns,
    dispatchEventCusorMoved,
    height,
    scrollTogether,
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
      // @ts-ignore
      window.addEventListener('mousemove', handleMouseMove);
      // @ts-ignore
      window.addEventListener('wheel', handleWheel);
      // @ts-ignore
      window.addEventListener('mouseup', clearStartData);
    }

    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        window.removeEventListener('mousemove', handleMouseMove);
        // @ts-ignore
        window.removeEventListener('wheel', handleWheel);
        // @ts-ignore
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
      invisible={invisible}
      left={rightAligned ? (x + width) - SCROLLBAR_WIDTH : undefined}
      ref={refCursorContainer}
    >
      <ScrollCursorStyle
        height={cursorHeight}
        invisible={invisible}
        onMouseDown={(event) => setStartData({
          event,
          scrollTop: refCursor?.current?.getBoundingClientRect()?.y,
        })}
        ref={refCursor}
        selected={!!startData}
        top={refCursorContainer?.current?.getBoundingClientRect()?.y}
      />
    </ScrollbarContainerStyle>
  );
}

export default ColumnScroller;
