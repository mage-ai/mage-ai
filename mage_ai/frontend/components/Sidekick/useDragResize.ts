import { useCallback, useEffect, useRef, useState } from 'react';

import { DRAG_HANDLE_HEIGHT } from './index.style';

type UseDragResizeArgs = {
  availablePanelHeight: number;
  initialHeight: number;
};

type UseDragResizeResult = {
  handleDragHandleMouseDown: (e: React.MouseEvent) => void;
  outputHeight: number;
};

export default function useDragResize({
  availablePanelHeight,
  initialHeight,
}: UseDragResizeArgs): UseDragResizeResult {
  const [outputHeight, setOutputHeight] = useState<number>(initialHeight);

  const isDraggingRef = useRef<boolean>(false);
  const dragStartYRef = useRef<number>(0);
  const dragStartHeightRef = useRef<number>(initialHeight);

  const handleDragHandleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    dragStartHeightRef.current = outputHeight;
  }, [outputHeight]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = dragStartYRef.current - e.clientY;
      const maxHeight = availablePanelHeight - DRAG_HANDLE_HEIGHT - 100;
      const clamped = Math.min(maxHeight, Math.max(100, dragStartHeightRef.current + delta));
      setOutputHeight(clamped);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [availablePanelHeight]);

  return { handleDragHandleMouseDown, outputHeight };
}
