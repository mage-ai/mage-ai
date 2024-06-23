import { RectType } from '@components/v2/Canvas/interfaces';
import { useRef, useEffect } from 'react';

// A helper function to check if an element has a specific role in a space-separated list of roles
const hasRole = (element: HTMLElement | null, role: string): boolean =>
  element?.closest('[role]')?.getAttribute('role')?.split(' ').includes(role) ?? false;

export type ZoomPanPositionType = {
  x: React.MutableRefObject<number>;
  y: React.MutableRefObject<number>;
};
export type ZoomPanStateType = {
  container?: React.RefObject<HTMLElement>;
  element: React.RefObject<HTMLElement>;
  offsetRectToCenter: (rect: RectType) => RectType;
  pan: React.MutableRefObject<boolean>;
  position: {
    current: ZoomPanPositionType;
    origin: ZoomPanPositionType;
  };
  scale: React.MutableRefObject<number>;
  zoom: React.MutableRefObject<number>;
};

export const useZoomPan = (
  elementRef: React.RefObject<HTMLElement>,
  opts?: {
    containerRef?: React.RefObject<HTMLElement>;
    disabled?: boolean;
    initialPosition?: {
      x?: number;
      xPercent?: number;
      y?: number;
      yPercent?: number;
    };
    maxScale?: number;
    minScale?: number;
    roles?: string[];
    zoomSensitivity?: number;
  },
): ZoomPanStateType => {
  const {
    containerRef,
    disabled = false,
    initialPosition,
    maxScale = 4,
    minScale = 0.01,
    roles,
    zoomSensitivity = 0.5,
  } = opts;

  const originX = useRef(0);
  const originY = useRef(0);
  const pan = useRef(null);
  const scale = useRef(1);
  const startX = useRef(null);
  const startY = useRef(null);
  const zoom = useRef(null);

  useEffect(() => {
    const container = containerRef?.current ?? window;
    const element = elementRef.current;
    if (!element) return;

    const updateTransform = () => {
      element.style.transform =
        `translate(${originX.current}px, ${originY.current}px) scale(${scale.current})`;
    };

    function initializeOrigin() {
      const canvasRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const {
        x,
        xPercent,
        y,
        yPercent,
      } = initialPosition ?? {};

      originX.current = x ?? (canvasRect?.width - containerRect?.width) * (xPercent ?? 0);
      originY.current = y ?? (canvasRect?.height - containerRect?.height) * (yPercent ?? 0);
      updateTransform();
    }

    const handleZoom = (value: number) => {
      scale.current = value;
      zoom.current = value;
    };

    const handleWheel = (e: WheelEvent) => {
      if (disabled || roles?.some(role => hasRole(e.target as HTMLElement, role))) return;
      e.preventDefault();
      const delta = (-e.deltaY / 500) * zoomSensitivity;
      const oldScale = scale.current;
      handleZoom(
        Math.min(Math.max(minScale, scale.current + delta), maxScale),
      );

      const scaleRatio = scale.current / oldScale;
      const rect = element.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      originX.current -= (cursorX - originX.current) * (scaleRatio - 1);
      originY.current -= (cursorY - originY.current) * (scaleRatio - 1);

      updateTransform();
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (disabled || roles?.some(role => hasRole(e.target as HTMLElement, role))) return;
      if (e.button !== 0) return;
      e.preventDefault();
      startX.current = e.clientX - originX.current;
      startY.current = e.clientY - originY.current;
      pan.current = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (disabled || roles?.some(role => hasRole(e.target as HTMLElement, role))) return;
      if (!pan.current) return;

      originX.current = e.clientX - startX.current;
      originY.current = e.clientY - startY.current;

      updateTransform();
    };

    const handleMouseUp = () => {
      pan.current = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled || roles?.some(role => hasRole(e.target as HTMLElement, role))) return;
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startX.current = touch.clientX - originX.current;
      startY.current = touch.clientY - originY.current;
      pan.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (disabled || roles?.some(role => hasRole(e.target as HTMLElement, role))) return;
      if (!pan.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      originX.current = touch.clientX - startX.current;
      originY.current = touch.clientY - startY.current;
      updateTransform();
    };

    const handleTouchEnd = () => {
      pan.current = false;
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('wheel', handleWheel);
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });

    initializeOrigin();

    return () => {
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled, zoomSensitivity, minScale, maxScale, roles]);

  function offsetRectToCenter(rect: RectType): RectType {
    // Calculate the offset to center the rect
    const canvasRect = elementRef?.current?.getBoundingClientRect();
    const containerRect = containerRef?.current?.getBoundingClientRect();

    const originX = (canvasRect?.width - containerRect?.width) / 2;
    const originY = (canvasRect?.height - containerRect?.height) / 2;
    const diff = {
      left: (startX.current / scale.current) - originX,
      top: (startY.current / scale.current) - originY,
    };

    // Apply the offset and take into account the current origin and scale
    return {
      ...rect,
      ...diff,
    };
  }

  return {
    container: containerRef,
    element: elementRef,
    offsetRectToCenter,
    pan,
    position: {
      current: {
        x: startX,
        y: startY,
      },
      origin: {
        x: originX,
        y: originY,
      },
    },
    scale,
    zoom,
  };
};
