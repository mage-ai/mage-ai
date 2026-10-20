import { RectType } from '@components/v2/Canvas/interfaces';
import { useRef, useEffect } from 'react';

// A helper function to check if an element has a specific role in a space-separated list of roles
const hasRole = (element: HTMLElement | null, role: string): boolean =>
  element?.closest('[role]')?.getAttribute('role')?.split(' ').includes(role) ?? false;

enum DirectionEnum {
  LEFT = 'left',
  RIGHT = 'right',
  UP = 'up',
  DOWN = 'down',
}

export type ZoomPanPositionType = {
  x: React.MutableRefObject<number>;
  y: React.MutableRefObject<number>;
};

export type ZoomPanStateType = {
  container?: React.RefObject<HTMLElement>;
  disabled?: React.MutableRefObject<boolean>;
  element: React.RefObject<HTMLElement>;
  handlePanning: React.MutableRefObject<
    (
      event: MouseEvent,
      positionOverride?: {
        x?: number;
        xPercent?: number;
        y?: number;
        yPercent?: number;
      },
    ) => void
  >;
  handleZoom: React.MutableRefObject<(event: WheelEvent, scaleOverride?: number) => void>;
  originX: React.MutableRefObject<number>;
  originY: React.MutableRefObject<number>;
  phase: React.MutableRefObject<number>;
  panning: React.MutableRefObject<{
    active: boolean;
    direction: DirectionEnum;
  }>;
  scale: React.MutableRefObject<number>;
  startX: React.MutableRefObject<number>;
  startY: React.MutableRefObject<number>;
  transform: React.MutableRefObject<string>;
  zoom: React.MutableRefObject<number>;
};

export type BoundaryType = {
  bottom: React.LegacyRef<HTMLDivElement>;
  left: React.LegacyRef<HTMLDivElement>;
  right: React.LegacyRef<HTMLDivElement>;
  top: React.LegacyRef<HTMLDivElement>;
};

export const useZoomPan = (
  stateRef: React.MutableRefObject<ZoomPanStateType>,
  opts?: {
    initialPosition?: {
      x?: number;
      xPercent?: number;
      y?: number;
      yPercent?: number;
    };
    maxScale?: number;
    minScale?: number;
    onStateChange?: (state: ZoomPanStateType) => void;
    roles?: string[];
    zoomSensitivity?: number;
  },
): BoundaryType => {
  const { initialPosition, maxScale = 4, minScale = 0.01, roles, zoomSensitivity = 0.5 } = opts;

  const disabledRef = stateRef.current.disabled;
  const containerRef = stateRef.current.container;
  const elementRef = stateRef.current.element;
  const handlePanning = stateRef.current.handlePanning;
  const handleZoom = stateRef.current.handleZoom;
  const originX = stateRef.current.originX;
  const originY = stateRef.current.originY;
  const panning = stateRef?.current?.panning;
  const phaseRef = stateRef.current.phase;
  const scale = stateRef.current.scale;
  const startX = stateRef.current.startX;
  const startY = stateRef.current.startY;
  const transformRef = stateRef.current.transform;
  const zoom = stateRef.current.zoom;

  const viewportRect = useRef<RectType | null>(null);
  const bottomMaxRef = useRef(null);
  const leftMaxRef = useRef(null);
  const rightMaxRef = useRef(null);
  const topMaxRef = useRef(null);

  useEffect(() => {
    const container = containerRef?.current;
    const element = elementRef.current;
    if (!element) return;

    const { height: heightContainer, width: widthContainer } =
      container?.getBoundingClientRect() ?? {};

    if (!viewportRect?.current) {
      viewportRect.current = element.getBoundingClientRect();
    }
    const { height: heightViewport, width: widthViewport } = viewportRect?.current ?? {};

    const updateTransform = () => {
      transformRef.current = `translate(${originX.current}px, ${originY.current}px) scale(${scale.current})`;
      element.style.transform = transformRef.current;
    };

    handlePanning.current = (
      _event: MouseEvent | WheelEvent,
      positionOverride?: {
        x?: number;
        xPercent?: number;
        y?: number;
        yPercent?: number;
      },
    ) => {
      const canvasRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const { x, xPercent, y, yPercent } = positionOverride ?? {};

      originX.current = x ?? (canvasRect?.width - containerRect?.width) * (xPercent ?? 0);
      originY.current = y ?? (canvasRect?.height - containerRect?.height) * (yPercent ?? 0);
      updateTransform();
    };

    const enforceLimits = (newX: number, newY: number, newScale: number) => {
      const element = elementRef.current;
      const container = containerRef.current;

      if (!element || !container) return { x: newX, y: newY };

      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const scaledWidth = containerRect.width;
      const scaledHeight = containerRect.height;

      const xMin = elementRect.width - scaledWidth - 1;
      const yMin = elementRect.height - scaledHeight - 1;
      const xMax = 0;
      const yMax = 0;

      let x = newX;
      let y = newY;

      if (newScale === 1) {
        x = Math.max(xMin, Math.min(xMax, newX));
        y = Math.max(yMin, Math.min(yMax, newY));
      }

      return {
        x,
        y,
      };
    };

    function handleDirection(xNew: number, yNew: number) {
      if (xNew > 0) {
        panning.current.direction = DirectionEnum.LEFT;
      } else if (xNew < 0) {
        panning.current.direction = DirectionEnum.RIGHT;
      } else if (yNew > 0) {
        panning.current.direction = DirectionEnum.UP;
      } else if (yNew < 0) {
        panning.current.direction = DirectionEnum.DOWN;
      } else {
        panning.current.direction = null;
      }
    }

    handleZoom.current = (event?: WheelEvent, scaleOverride?: number) => {
      const oldScale = scale.current;

      let newScale = null;
      if (scaleOverride ?? false) {
        newScale = scaleOverride;
      } else {
        const delta = (-event.deltaY / 500) * zoomSensitivity;
        newScale = Math.min(Math.max(minScale, scale.current + delta), maxScale);
      }

      const scaleRatio = newScale / oldScale;

      scale.current = newScale;
      zoom.current = newScale;

      const rect = element.getBoundingClientRect();
      const cursorX = event ? event.clientX - rect.left : startX.current ?? 0;
      const cursorY = event ? event.clientY - rect.top : startY.current ?? 0;

      const xNew = (cursorX - originX.current) * (scaleRatio - 1);
      const yNew = (cursorY - originY.current) * (scaleRatio - 1);
      originX.current -= xNew;
      originY.current -= yNew;

      handleDirection(xNew, yNew);

      const limited = enforceLimits(originX.current, originY.current, newScale);
      originX.current = limited.x;
      originY.current = limited.y;

      updateTransform();
    };

    const handleWheel = (event: WheelEvent) => {
      if (disabledRef.current || roles?.some(role => hasRole(event.target as HTMLElement, role)))
        return;

      event.preventDefault();

      panning.current.active = false;

      const isZooming = event.metaKey || event.ctrlKey;
      const isPanningHorizontally = !isZooming && event.shiftKey;

      if (isZooming) {
        handleZoom.current(event);
      } else {
        const xNew = (originX.current -= event.deltaX);
        const yNew = (originY.current -= event.deltaY);
        handleDirection(xNew, yNew);

        const limited = enforceLimits(xNew, yNew, scale.current);

        if (isPanningHorizontally) {
          originX.current = limited.x;
        } else {
          originY.current = limited.y;
        }

        updateTransform();
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (disabledRef.current || roles?.some(role => hasRole(event.target as HTMLElement, role)))
        return;
      if (event.button !== 0) return;

      event.preventDefault();
      startX.current = event.clientX - originX.current;
      startY.current = event.clientY - originY.current;
      panning.current.active = true;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (disabledRef.current || roles?.some(role => hasRole(event.target as HTMLElement, role)))
        return;
      if (!panning.current.active) return;

      const newX = event.clientX - startX.current;
      const newY = event.clientY - startY.current;

      handleDirection(newX, newY);

      const limited = enforceLimits(newX, newY, scale.current);
      originX.current = limited.x;
      originY.current = limited.y;

      updateTransform();
    };

    const handleMouseUp = () => {
      panning.current.active = false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (disabledRef.current || roles?.some(role => hasRole(e.target as HTMLElement, role)))
        return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      startX.current = touch.clientX - originX.current;
      startY.current = touch.clientY - originY.current;
      panning.current.active = true;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (disabledRef.current || roles?.some(role => hasRole(event.target as HTMLElement, role)))
        return;
      if (!panning.current.active || event.touches.length !== 1) return;

      const touch = event.touches[0];
      originX.current = touch.clientX - startX.current;
      originY.current = touch.clientY - startY.current;
      updateTransform();
    };

    const handleTouchEnd = () => {
      panning.current.active = false;
    };

    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('touchend', handleTouchEnd);
    element.addEventListener('wheel', handleWheel);
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });

    if (phaseRef.current === 0 && initialPosition && handlePanning?.current) {
      handlePanning?.current?.(null, initialPosition);
    }

    phaseRef.current += 1;

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
  }, [zoomSensitivity, minScale, maxScale, roles]);

  return {
    bottom: bottomMaxRef,
    left: leftMaxRef,
    right: rightMaxRef,
    top: topMaxRef,
  };
};
