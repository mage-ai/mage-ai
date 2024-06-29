import React, { useCallback, useRef } from 'react';
import { TooltipJustify, TooltipAlign, HideTooltipReason, TooltipLayout, useTooltip } from './Context';

export function TooltipWrapper({
  align,
  children,
  justify,
  position,
  showOnClick,
  showOnHover,
  style,
  tooltip,
  tooltipStyle,
}: {
  children: React.ReactNode;
  showOnClick?: boolean;
  showOnHover?: boolean;
  style?: React.CSSProperties;
  tooltip: React.ReactNode;
  tooltipStyle?: React.CSSProperties;
} & TooltipLayout) {
  const { showTooltip } = useTooltip();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleShowTooltip = useCallback((event: React.FocusEvent | React.MouseEvent) => {
    const target = event.target as Element;

    if (target instanceof HTMLElement) {
      const rect = target.getBoundingClientRect();
      const x = rect.left;
      const y = rect.top;

      const hideOn = [HideTooltipReason.BLUR, HideTooltipReason.CLICK, HideTooltipReason.ESCAPE];

      if (!showOnClick) {
        hideOn.push(HideTooltipReason.LEAVE);
      }

      showTooltip(tooltip, {
        align,
        justify,
        position: position ?? { x, y },
      }, {
        event,
        hideOn,
        style: tooltipStyle,
        wrapperRef: wrapperRef,
      });
    }
  }, [align, justify, position, showOnClick, showTooltip, tooltip, tooltipStyle]);

  return (
    <div
      onClick={showOnClick ? handleShowTooltip : undefined}
      onMouseEnter={(showOnHover || !showOnClick) ? handleShowTooltip : undefined}
      ref={wrapperRef}
      style={style}
    >
      {children}
    </div>
  );
}

export {
  TooltipAlign,
  TooltipJustify,
};

export default React.memo(TooltipWrapper);
