import { isEventInside } from '@mana/utils/elements';
import React, { useCallback, useRef } from 'react';
import {
  TooltipDirection,
  TooltipJustify,
  TooltipAlign,
  HideTooltipReason,
  TooltipLayout,
  useTooltip,
} from './Context';

export function TooltipWrapper({
  align,
  children,
  hide,
  justify,
  position,
  showOnClick,
  showOnHover,
  style,
  tooltip,
  tooltipStyle,
  horizontalDirection,
  verticalDirection,
}: {
  children: React.ReactNode;
  hide?: boolean;
  showOnClick?: boolean;
  showOnHover?: boolean;
  style?: React.CSSProperties;
  tooltip: React.ReactNode;
  tooltipStyle?: React.CSSProperties;
} & TooltipLayout): any {
  const { hideTooltip, showTooltip } = useTooltip();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleShowTooltip = useCallback(
    (event: React.FocusEvent | React.MouseEvent) => {
      const target = event.target as Element;

      if (target instanceof HTMLElement) {
        const rect = target.getBoundingClientRect();
        const x = rect.left;
        const y = rect.top;

        const hideOn = [HideTooltipReason.BLUR, HideTooltipReason.CLICK, HideTooltipReason.ESCAPE];

        if (!showOnClick) {
          hideOn.push(HideTooltipReason.LEAVE);
        }

        showTooltip(
          // () => typeof tooltip == 'function' ? tooltip(event, { hideTooltip }) : tooltip,
          tooltip,
          {
            align,
            horizontalDirection,
            justify,
            position: position ?? { x, y },
            verticalDirection,
          },
          {
            event,
            hideOn,
            renderOnMouseMove: true,
            style: tooltipStyle,
            wrapperRef: wrapperRef,
          },
        );
      }
    },
    [
      align,
      justify,
      position,
      showOnClick,
      showTooltip,
      tooltip,
      tooltipStyle,
      horizontalDirection,
      verticalDirection,
    ],
  );

  if (hide) {
    return children;
  }

  return (
    <div
      onClick={showOnClick ? handleShowTooltip : undefined}
      onMouseEnter={showOnHover || !showOnClick ? handleShowTooltip : undefined}
      // onMouseMove={typeof content == 'function' ? handleShowTooltip : undefined}
      ref={wrapperRef}
      style={style}
    >
      {children}
    </div>
  );
}

export { TooltipAlign, TooltipDirection, TooltipJustify };

export default TooltipWrapper;
