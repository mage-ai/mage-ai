import React, { createContext, useContext, ReactNode } from 'react';

export enum TooltipDirection {
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  UP = 'up',
}

export enum TooltipJustify {
  CENTER = 'center',
  END = 'end',
  START = 'start',
}

export enum TooltipAlign {
  CENTER = 'center',
  END = 'end',
  START = 'start',
}

export enum HideTooltipReason {
  BLUR = 'blur',
  CLICK = 'click',
  ESCAPE = 'escape',
  LEAVE = 'leave',
}

interface TooltipPosition {
  x: number;
  y: number;
}

export type TooltipLayout = {
  align?: TooltipAlign;
  horizontalDirection?: TooltipDirection;
  justify?: TooltipJustify;
  position?: TooltipPosition;
  verticalDirection?: TooltipDirection;
};

export type TooltipContentType = ReactNode;
export type ShowTooltipOptionsType = {
  event?: React.FocusEvent | React.MouseEvent;
  hideOn?: HideTooltipReason[];
  renderOnMouseMove?: boolean;
  style?: React.CSSProperties;
  wrapperRef?: React.MutableRefObject<HTMLElement | null>;
};

interface TooltipContextProps {
  hideTooltip: () => void;
  showTooltip: (
    content: TooltipContentType,
    layout: TooltipLayout,
    opts?: ShowTooltipOptionsType,
  ) => void;
}

export const TooltipContext = createContext<TooltipContextProps | null>(null);

export const useTooltip = (): TooltipContextProps => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }

  return context;
};
