import { useRef, useEffect } from 'react';

// A helper function to check if an element has a specific role in a space-separated list of roles
const hasRole = (element: HTMLElement | null, role: string): boolean =>
  element?.closest('[role]')?.getAttribute('role')?.split(' ').includes(role) ?? false;

export const useZoomPan = (
  elementRef: React.RefObject<HTMLElement>,
  opts?: {
    disabled?: boolean;
    zoomSensitivity?: number;
    minScale?: number;
    maxScale?: number;
    roles?: string[];
  },
) => {
  const { disabled = false, zoomSensitivity = 0.5, minScale = 0.01, maxScale = 4, roles } = opts;

  const scale = useRef(1);
  const originX = useRef(0);
  const originY = useRef(0);
  const startX = useRef(0);
  const startY = useRef(0);
  const isPanning = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const updateTransform = () => {
      console.log('ZoomPan transforming...');
      element.style.transform = `translate(${originX.current}px, ${originY.current}px) scale(${scale.current})`;
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

    element.addEventListener('wheel', handleWheel);
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchmove', handleTouchMove);
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [elementRef, disabled, zoomSensitivity, minScale, maxScale, roles]);
};
