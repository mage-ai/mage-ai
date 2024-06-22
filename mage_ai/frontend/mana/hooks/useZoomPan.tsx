import { RectType } from '@components/v2/Canvas/interfaces';
import { useRef, useEffect } from 'react';

// A helper function to check if an element has a specific role in a space-separated list of roles
const hasRole = (element: HTMLElement | null, role: string): boolean =>
  element?.closest('[role]')?.getAttribute('role')?.split(' ').includes(role) ?? false;

export type ZoomPanStateType = {
  zoom: React.MutableRefObject<number>;
  offsetRectToCenter: (rect: RectType) => RectType;
  position: {
    x: React.MutableRefObject<number>;
    y: React.MutableRefObject<number>;
    origin: {
      x: React.MutableRefObject<number>;
      y: React.MutableRefObject<number>;
    };
  };
  pan: React.MutableRefObject<boolean>;
};

export const useZoomPan = (
  elementRef: React.RefObject<HTMLElement>,
  opts?: {
    containerRef?: React.RefObject<HTMLElement>;
    disabled?: boolean;
    zoomSensitivity?: number;
    minScale?: number;
    maxScale?: number;
    roles?: string[];
  },
): ZoomPanStateType => {
  const { containerRef, disabled = false, zoomSensitivity = 0.5, minScale = 0.01, maxScale = 4, roles } = opts;

  const scale = useRef(1);
  const originX = useRef(0);
  const originY = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const isPanning = useRef(false);

  useEffect(() => {
    const container = containerRef?.current ?? window;
    const element = elementRef.current;
    if (!element) return;

    const updateTransform = () => {
      element.style.transform = `translate(${originX.current}px, ${originY.current}px) scale(${scale.current})`;
      // console.log(
      //   'scale', scale?.current,
      //   'originX', originX?.current,
      //   'originY', originY?.current,
      //   'startX', startX?.current,
      //   'startY', startY?.current,
      // );
    };

    const initializeOrigin = () => {
      const canvasRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      originX.current = (canvasRect?.width - containerRect?.width) / 2;
      originY.current = (canvasRect?.height - containerRect?.height) / 2;
      updateTransform();
    };

    const handleWheel = (e: WheelEvent) => {
      if (disabled || roles?.some(role => hasRole(e.target as HTMLElement, role))) return;
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
      if (disabled || roles?.some(role => hasRole(e.target as HTMLElement, role))) return;
      if (e.button !== 0) return;
      e.preventDefault();
      startX.current = e.clientX - originX.current;
      startY.current = e.clientY - originY.current;
      isPanning.current = true;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (disabled || roles?.some(role => hasRole(e.target as HTMLElement, role))) return;
      if (!isPanning.current) return;

      originX.current = e.clientX - startX.current;
      originY.current = e.clientY - startY.current;

      updateTransform();
    };

    const handleMouseUp = () => {
      isPanning.current = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (disabled || roles?.some(role => hasRole(e.target as HTMLElement, role))) return;
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      startX.current = touch.clientX - originX.current;
      startY.current = touch.clientY - originY.current;
      isPanning.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (disabled || roles?.some(role => hasRole(e.target as HTMLElement, role))) return;
      if (!isPanning.current || e.touches.length !== 1) return;
      const touch = e.touches[0];
      originX.current = touch.clientX - startX.current;
      originY.current = touch.clientY - startY.current;
      updateTransform();
    };

    const handleTouchEnd = () => {
      isPanning.current = false;
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
    // const containerRect = containerRef?.current.getBoundingClientRect();
    // const containerCenterX = containerRect.width / 2;
    // const containerCenterY = containerRect.height / 2;

    // const rectCenterX = (rect.width * scale.current) / 2;
    // const rectCenterY = (rect.height * scale.current) / 2;

    // Calculate the offset to center the rect
    const canvasRect = elementRef?.current?.getBoundingClientRect();
    const containerRect = containerRef?.current?.getBoundingClientRect();

    const originX = (canvasRect?.width - containerRect?.width) / 2;
    const originY = (canvasRect?.height - containerRect?.height) / 2;
    const diff = {
      left: (startX.current / scale.current) - originX,
      top: (startY.current / scale.current) - originY,
    };
    console.log('SHFTTTTTTTTTTTTTTTTT', rect?.id,
      startX.current,
      startY.current,
      originX,
      originY,
      rect, {
      ...rect,
      ...diff,
    });

    // Apply the offset and take into account the current origin and scale
    return {
      ...rect,
      ...diff,
    };
  }

  return {
    zoom: scale,
    offsetRectToCenter,
    position: {
      x: startX,
      y: startY,
      origin: {
        x: originX,
        y: originY,
      },
    },
    pan: isPanning,
  };
};
