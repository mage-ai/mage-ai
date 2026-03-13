import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

type UseDragResizeArgs = {
  disabled?: boolean;
  dragIndicatorRef?: React.RefObject<HTMLDivElement>;
  graphContainerRef: React.RefObject<HTMLDivElement>;
  initialHeight: number;
  outputScrollRef: React.RefObject<HTMLDivElement>;
};

type UseDragResizeResult = {
  handleDragHandleMouseDown: (e: React.MouseEvent) => void;
  isDragging: boolean;
  outputHeight: number;
};

export default function useDragResize({
  disabled,
  dragIndicatorRef,
  graphContainerRef,
  initialHeight,
  outputScrollRef,
}: UseDragResizeArgs): UseDragResizeResult {
  const [outputHeight, setOutputHeight] = useState<number>(initialHeight);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartGraphHeightRef = useRef(0);
  const dragStartScrollHeightRef = useRef(0);
  const dragStartOutputHeightRef = useRef(0);
  const outputHeightRef = useRef(initialHeight);
  const rafRef = useRef<number | null>(null);
  const shouldClearStylesRef = useRef(false);
  const dragHandleInitialTopRef = useRef(0);
  const dragHandleRectRef = useRef<DOMRect | null>(null);
  const dragHandleBorderColorRef = useRef<string>('');

  if (!isDraggingRef.current) {
    outputHeightRef.current = outputHeight;
  }

  const handleDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    const handleEl = e.currentTarget as HTMLElement;
    dragHandleInitialTopRef.current = graphContainerRef?.current?.getBoundingClientRect()?.bottom || 0;
    dragHandleRectRef.current = handleEl.getBoundingClientRect();
    dragHandleBorderColorRef.current = window.getComputedStyle(handleEl).borderTopColor;
    dragStartGraphHeightRef.current = graphContainerRef?.current?.offsetHeight || 0;
    dragStartScrollHeightRef.current = outputScrollRef?.current?.offsetHeight || 0;
    dragStartOutputHeightRef.current = outputHeightRef.current;
  }, [disabled, graphContainerRef, outputScrollRef]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const rawDelta = dragStartYRef.current - e.clientY;
        const maxDelta = dragStartGraphHeightRef.current;
        const minDelta = -(dragStartScrollHeightRef.current);
        const delta = Math.min(maxDelta, Math.max(minDelta, rawDelta));

        if (graphContainerRef?.current) {
          graphContainerRef.current.style.height =
            `${dragStartGraphHeightRef.current - delta}px`;
          graphContainerRef.current.style.overflow = 'hidden';
        }
        if (outputScrollRef?.current) {
          outputScrollRef.current.style.height =
            `${dragStartScrollHeightRef.current + delta}px`;
        }

        outputHeightRef.current = dragStartOutputHeightRef.current + delta;

        if (dragIndicatorRef?.current) {
          dragIndicatorRef.current.style.top = `${dragHandleInitialTopRef.current - delta}px`;
        }

        rafRef.current = null;
      });
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        setIsDragging(false);
        shouldClearStylesRef.current = true;
        setOutputHeight(outputHeightRef.current);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [dragIndicatorRef, graphContainerRef, outputScrollRef]);

  useLayoutEffect(() => {
    if (isDragging && dragIndicatorRef?.current) {
      const rect = dragHandleRectRef.current;
      dragIndicatorRef.current.style.top = `${dragHandleInitialTopRef.current}px`;
      dragIndicatorRef.current.style.left = rect ? `${rect.left}px` : '0';
      dragIndicatorRef.current.style.right = rect ? `${window.innerWidth - rect.right}px` : '0';
      dragIndicatorRef.current.style.borderTopColor = dragHandleBorderColorRef.current;
    }
  }, [isDragging, dragIndicatorRef]);

  useLayoutEffect(() => {
    if (shouldClearStylesRef.current) {
      shouldClearStylesRef.current = false;
      if (outputScrollRef?.current) {
        outputScrollRef.current.style.height = '';
      }
    }
  }, [outputHeight, outputScrollRef]);

  useLayoutEffect(() => {
    if (disabled) {
      if (outputScrollRef?.current) {
        outputScrollRef.current.style.height = '';
      }
    }
  }, [disabled, outputScrollRef]);

  return { handleDragHandleMouseDown, isDragging, outputHeight };
}
