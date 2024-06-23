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
  boundaryRefs: {
    bottom: React.LegacyRef<HTMLDivElement>;
    left: React.LegacyRef<HTMLDivElement>;
    right: React.LegacyRef<HTMLDivElement>;
    top: React.LegacyRef<HTMLDivElement>;
  };
  container?: React.RefObject<HTMLElement>;
  element: React.RefObject<HTMLElement>;
  panning: React.MutableRefObject<{
    active: boolean;
    direction: DirectionEnum;
  }>;
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
    onStateChange?: (state: ZoomPanStateType) => void;
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
    onStateChange,
    roles,
    zoomSensitivity = 0.5,
  } = opts;

  const originX = useRef(0);
  const originY = useRef(0);
  const panning = useRef({
    active: false,
    direction: null,
  });
  const scale = useRef(1);
  const startX = useRef(null);
  const startY = useRef(null);
  const zoom = useRef(null);
  const viewportRect = useRef<DOMRect>(null);

  const bottomMaxRef = useRef(null);
  const leftMaxRef = useRef(null);
  const rightMaxRef = useRef(null);
  const topMaxRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const container = containerRef?.current;
    const element = elementRef.current;
    if (!element) return;

    const {
      height: heightContainer,
      width: widthContainer,
    } = container?.getBoundingClientRect() ?? {};

    if (!viewportRect?.current) {
      viewportRect.current = element.getBoundingClientRect();
    }
    const {
      height: heightViewport,
      width: widthViewport,
    } = viewportRect?.current ?? {};

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

    const enforceLimits = (newX: number, newY: number, newScale: number) => {
      const element = elementRef.current;
      const container = containerRef.current;

      if (!element || !container) return { x: newX, y: newY };

      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();


      const scaledWidth = containerRect.width;
      const scaledHeight = containerRect.height;

      const xMin = (elementRect.width - scaledWidth) - 1;
      const yMin = (elementRect.height - scaledHeight) - 1;
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

    const handleZoom = (value: number) => {
      scale.current = value;
      zoom.current = value;
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

    const handleWheel = (event: WheelEvent) => {
      if (disabled || roles?.some(role => hasRole(event.target as HTMLElement, role))) return;

      event.preventDefault();

      const isZooming = event.metaKey || event.ctrlKey;
      const isPanningHorizontally = !isZooming && event.shiftKey;

      if (isZooming) {
        const delta = (-event.deltaY / 500) * zoomSensitivity;
        const oldScale = scale.current;
        const newScale = Math.min(Math.max(minScale, scale.current + delta), maxScale);
        const scaleRatio = newScale / oldScale;

        handleZoom(newScale);

        const rect = element.getBoundingClientRect();
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;

        const xNew = (cursorX - originX.current) * (scaleRatio - 1);
        const yNew = (cursorY - originY.current) * (scaleRatio - 1);
        originX.current -= xNew;
        originY.current -= yNew;

        handleDirection(xNew, yNew);

        const limited = enforceLimits(originX.current, originY.current, newScale);
        originX.current = limited.x;
        originY.current = limited.y;
      } else {
        const xNew = originX.current -= event.deltaX;
        const yNew = originY.current -= event.deltaY;
        handleDirection(xNew, yNew);

        const limited = enforceLimits(xNew, yNew, scale.current);

        if (isPanningHorizontally) {
          originX.current = limited.x;
        } else {
          originY.current = limited.y;
        }
      }

      updateTransform();
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (disabled || roles?.some(role => hasRole(event.target as HTMLElement, role))) return;
      if (event.button !== 0) return;

      event.preventDefault();
      startX.current = event.clientX - originX.current;
      startY.current = event.clientY - originY.current;
      panning.current.active = true;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (disabled || roles?.some(role => hasRole(event.target as HTMLElement, role))) return;
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
      if (disabled || roles?.some(role => hasRole(e.target as HTMLElement, role))) return;
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      startX.current = touch.clientX - originX.current;
      startY.current = touch.clientY - originY.current;
      panning.current.active = true;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (disabled || roles?.some(role => hasRole(event.target as HTMLElement, role))) return;
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

  return {
    container: containerRef,
    boundaryRefs: {
      bottom: bottomMaxRef,
      left: leftMaxRef,
      right: rightMaxRef,
      top: topMaxRef,
    },
    element: elementRef,
    panning,
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
