import React, { useEffect } from 'react';
import styles from '@styles/scss/components/Tooltip/TooltipContent.module.scss';
import {
  TooltipDirection,
  ShowTooltipOptionsType,
  TooltipJustify,
  TooltipAlign,
  TooltipLayout,
  TooltipContentType,
} from './Context';

type TooltipContentProps = {
  children: TooltipContentType;
  layout: TooltipLayout;
  offset?: {
    x: number;
    y: number;
  };
  options: ShowTooltipOptionsType;
  optionsPrev?: ShowTooltipOptionsType;
};

function getElementPageCoordinates(element: Element): {
  pageX: number;
  pageY: number;
  width: number;
  height: number;
} {
  const rect = element.getBoundingClientRect();
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const pageX = rect.left + scrollLeft;
  const pageY = rect.top + scrollTop;
  return { pageX, pageY, width: rect.width, height: rect.height };
}

function updateTooltipPosition(
  targetElement: HTMLElement,
  tooltipElement: HTMLElement,
  offsetX: number = 0,
  offsetY: number = 0,
): void {
  const { pageX, pageY, width, height } = getElementPageCoordinates(targetElement);

  let xoff = pageX;
  let yoff = pageY;

  if (xoff) {
    xoff = xoff - offsetX;
  }
  if (yoff) {
    yoff = yoff - offsetY;
  }
  const tooltipX = xoff; // Allow custom horizontal offset
  const tooltipY = yoff + height; // Allow custom vertical offset

  tooltipElement.style.position = 'absolute';
  tooltipElement.style.left = `${tooltipX}px`;
  tooltipElement.style.top = `${tooltipY}px`;
}

function showTooltip(
  targetElement: HTMLElement,
  tooltipElement: HTMLElement,
  offsetX: number = 0,
  offsetY: number = 0,
): () => void {
  // Initial positioning of the tooltip
  updateTooltipPosition(targetElement, tooltipElement, offsetX, offsetY);

  // Update the tooltip position on scroll
  const handleScroll = () => {
    updateTooltipPosition(targetElement, tooltipElement, offsetX, offsetY);
  };

  // Add event listener for scroll
  window.addEventListener('scroll', handleScroll);

  // Cleanup function to remove event listener when tooltip is hidden
  return () => {
    window.removeEventListener('scroll', handleScroll);
  };
}

function TooltipContent(
  { children, layout, offset, options, optionsPrev }: TooltipContentProps,
  ref: React.MutableRefObject<HTMLDivElement>,
) {
  const { event, style, wrapperRef } = options;
  const {
    align = TooltipAlign.START,
    justify = TooltipJustify.START,
    position,
    horizontalDirection = TooltipDirection.RIGHT,
    verticalDirection = TooltipDirection.UP,
  } = layout;

  useEffect(() => {
    if (ref?.current && wrapperRef?.current) {
      const { pageX: x, pageY: y } = (event ?? {}) as MouseEvent;
      const {
        height: heighte,
        left: lefte,
        top: tope,
        width: widthe,
      } = ref?.current?.getBoundingClientRect();
      const {
        height = 0,
        left = 0,
        top = 0,
        width = 0,
      } = wrapperRef?.current?.getBoundingClientRect() ?? {};

      const minX = 0;
      const maxX = window.innerWidth;
      const minY = 0;
      const maxY = window.innerHeight;

      let translateX = 0;
      let translateY = 0;
      if (align === TooltipAlign.START) {
        translateX = TooltipDirection.RIGHT === horizontalDirection ? 0 : -widthe;
      } else if (align === TooltipAlign.CENTER) {
        translateX = -Math.abs(width - widthe) / 2;
      } else if (align === TooltipAlign.END) {
        translateX = TooltipDirection.LEFT === horizontalDirection ? -(widthe - width) : width;
      }
      if (justify === TooltipJustify.START) {
        translateY = TooltipDirection.UP === verticalDirection ? -(heighte + height) : -heighte;
      } else if (justify === TooltipJustify.CENTER) {
        translateY = -(height + (heighte - height) / 2);
      } else if (justify === TooltipJustify.END) {
        translateY = 0;
      }

      if (position?.x + translateX < minX) {
        translateX = minX - position.x;
      } else if (position?.x + translateX > maxX) {
        translateX = maxX - position.x;
      }

      if (position?.y + translateY < minY) {
        translateY = minY - position.y;
      } else if (position?.y + translateY > maxY) {
        translateY = maxY - position.y;
      }

      showTooltip(wrapperRef.current, ref.current, offset?.x, offset?.y);
      ref.current.style.transform = `translate(${translateX}px, ${translateY}px)`;
      ref.current.classList.remove(styles.hide);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [align, justify]);
  return (
    <div
      className={[styles.tooltipContent, styles.hide].join(' ')}
      ref={ref}
      style={{
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export default React.forwardRef(TooltipContent);
