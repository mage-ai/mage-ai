import React, { useEffect } from 'react';
import styles from '@styles/scss/components/Tooltip/TooltipContent.module.scss';
import { TooltipDirection, ShowTooltipOptionsType, TooltipJustify, TooltipAlign, TooltipLayout, TooltipContentType } from './Context';

type TooltipContentProps = {
  children: TooltipContentType;
  layout: TooltipLayout;
  options: ShowTooltipOptionsType;
  optionsPrev?: ShowTooltipOptionsType;
};

function TooltipContent({
  children,
  layout,
  options,
  optionsPrev,
}: TooltipContentProps, ref: React.MutableRefObject<HTMLDivElement>) {
  const {
    event,
    style,
    wrapperRef,
  } = options;
  const {
    align = TooltipAlign.START,
    justify = TooltipJustify.START,
    position,
    horizontalDirection = TooltipDirection.RIGHT,
    verticalDirection = TooltipDirection.UP,
  } = layout;

  useEffect(() => {
    if (ref?.current) {
      const { pageX: x, pageY: y } = (event ?? {}) as MouseEvent;
      const { height: heighte, left: lefte, top: tope, width: widthe } = ref?.current?.getBoundingClientRect();
      const { height, left, top, width } = wrapperRef?.current?.getBoundingClientRect();

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
        translateY = -heighte;
      } else if (justify === TooltipJustify.CENTER) {
        translateY = -Math.abs(height - heighte) / 2;
      } else if (justify === TooltipJustify.END) {
        translateY = height;
      }

      ref.current.style.transform = `translate(${translateX}px, ${translateY}px)`;
      ref.current.classList.remove(styles.hide);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [align, justify]);

  return (
    <div
      className={[
        styles.tooltipContent,
        styles.hide
      ].join(' ')}
      ref={ref}
      style={{
        ...style,
        left: position.x,
        top: position.y,
      }}
    >
      {children}
    </div>
  );
}

export default React.forwardRef(TooltipContent);
