import { useRef, useEffect } from 'react';

export const useZoomPan = (
  elementRef: React.RefObject<HTMLElement>,
  isDraggingRef: {
    current: boolean;
  },
  zoomSensitivity = 0.5,
  minScale = 0.01,
  maxScale = 4,
) => {
  const scale = useRef(1);
  const originX = useRef(0);
  const originY = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const isPanning = useRef(false);
  const styleSheet = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    const head = document.head;

    if (!element) return;

    const updateTransform = () => {
      element.style.transform = `translate(${originX.current}px, ${originY.current}px) scale(${scale.current})`;
      const gridSize = 100 * scale.current; // Correct grid sizing based on scale

      if (!styleSheet.current) {
        styleSheet.current = document.createElement('style');
        head.appendChild(styleSheet.current);
      }

      if (!styleSheet.current.parentElement) {
        head.appendChild(styleSheet.current);
      }

      styleSheet.current.innerHTML = `
        .canvas::before, .canvas::after {
          background-size: ${gridSize}px ${gridSize}px !important;
        }
      `;
    };

    const handleWheel = (e: WheelEvent) => {
      if (isDraggingRef?.current) return; // Ignore wheel event if dragging
      e.preventDefault();
      const delta = (-e.deltaY / 500) * zoomSensitivity;
      const oldScale = scale.current;
      scale.current = Math.min(Math.max(minScale, scale.current + delta), maxScale);

      const scaleRatio = scale.current / oldScale;
      const rect = element.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      originX.current -= (cursorX - originX.current) * (scaleRatio - 1);
      originY.current -= (cursorY - originY.current) * (scaleRatio - 1);

      updateTransform();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isDraggingRef?.current) return; // Ignore mouse down event if dragging
      e.preventDefault();
      startX.current = e.clientX - originX.current;
      startY.current = e.clientY - originY.current;
      isPanning.current = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isDraggingRef?.current) return; // Ignore mouse up event if dragging
      isPanning.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef?.current) return; // Ignore mouse move event if dragging
      if (!isPanning.current) return;

      originX.current = e.clientX - startX.current;
      originY.current = e.clientY - startY.current;

      updateTransform();
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isDraggingRef?.current) return; // Ignore touch start event if dragging
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        startX.current = touch.clientX - originX.current;
        startY.current = touch.clientY - originY.current;
        isPanning.current = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (isDraggingRef?.current) return; // Ignore touch end event if dragging
      isPanning.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef?.current) return; // Ignore touch move event if dragging
      if (!isPanning.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      originX.current = touch.clientX - startX.current;
      originY.current = touch.clientY - startY.current;

      updateTransform();
    };

    if (!isDraggingRef?.current) { // Add event listeners only if not dragging
      element.addEventListener('wheel', handleWheel);
      element.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      element.addEventListener('mousemove', handleMouseMove);
      element.addEventListener('touchstart', handleTouchStart);
      element.addEventListener('touchend', handleTouchEnd);
      element.addEventListener('touchmove', handleTouchMove);
    }

    return () => {
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchmove', handleTouchMove);
      if (styleSheet.current && styleSheet.current.parentNode === head) {
        head.removeChild(styleSheet.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomSensitivity, minScale, maxScale]);
};
