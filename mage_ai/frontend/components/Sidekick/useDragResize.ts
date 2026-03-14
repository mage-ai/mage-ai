import { useCallback, useEffect, useRef, useState } from 'react';

type UseDragResizeArgs = {
  disabled?: boolean;
  graphContainerRef: React.RefObject<HTMLDivElement>;
  initialHeight: number;
  outputScrollRef: React.RefObject<HTMLDivElement>;
};

type UseDragResizeResult = {
  dragDelta: number;
  handleDragHandleMouseDown: (e: React.MouseEvent) => void;
  isDragging: boolean;
  outputHeight: number;
};

export default function useDragResize({
  disabled,
  graphContainerRef,
  initialHeight,
  outputScrollRef,
}: UseDragResizeArgs): UseDragResizeResult {
  const [outputHeight, setOutputHeight] = useState<number>(initialHeight);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragDelta, setDragDelta] = useState<number>(0);

  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const dragStartGraphHeightRef = useRef(0);
  const dragStartScrollHeightRef = useRef(0);
  const dragDeltaRef = useRef(0);

  const handleDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    isDraggingRef.current = true;
    setIsDragging(true);
    dragStartYRef.current = e.clientY;
    dragStartGraphHeightRef.current = graphContainerRef?.current?.offsetHeight || 0;
    dragStartScrollHeightRef.current = outputScrollRef?.current?.offsetHeight || 0;
  }, [disabled, graphContainerRef, outputScrollRef]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const rawDelta = dragStartYRef.current - e.clientY;
      const maxDelta = dragStartGraphHeightRef.current;
      const minDelta = -(dragStartScrollHeightRef.current);
      const delta = Math.min(maxDelta, Math.max(minDelta, rawDelta));

      setDragDelta(delta);
      dragDeltaRef.current = delta;
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        const finalDelta = dragDeltaRef.current;
        isDraggingRef.current = false;
        setIsDragging(false);
        setOutputHeight(prev => prev + finalDelta);
        setDragDelta(0);
        dragDeltaRef.current = 0;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return { dragDelta, handleDragHandleMouseDown, isDragging, outputHeight };
}
