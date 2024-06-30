import React, { useContext, useEffect, useRef } from 'react';
import TooltipContent from './Content';
import dynamic from 'next/dynamic';
import { HideTooltipReason, ShowTooltipOptionsType, TooltipContext, TooltipContentType, TooltipLayout } from './Context';
import { Root, createRoot } from 'react-dom/client';
import { ThemeContext } from 'styled-components';

interface TooltipProviderProps {
  children: React.ReactNode;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children }) => {
  const themeContext = useContext(ThemeContext);

  const timeoutRef = useRef(null);
  const showTimeoutRef = useRef(null);
  const tooltipRenderRef = useRef<Root | null>(null);
  const tooltipRootRef = useRef<HTMLDivElement | null>(null);

  // Changes depending on what is being shown.
  const showTooltipRef = useRef<ShowTooltipOptionsType | null>(null);
  const tooltipContentRef = useRef<HTMLDivElement | null>(null);
  const tooltipVisibleRef = useRef<boolean>(false);

  function showTooltip(
    content: TooltipContentType,
    layout: TooltipLayout,
    showTooltipOptions?: ShowTooltipOptionsType,
  ): void {
    clearTimeout(timeoutRef.current);
    clearTimeout(showTimeoutRef.current);

    const optionsPrev = showTooltipRef.current;
    showTooltipRef.current = showTooltipOptions;
    const ContextProvider = dynamic(() => import('../v2/ContextProvider'));

    tooltipRenderRef.current ||= createRoot(tooltipRootRef.current)

    showTimeoutRef.current = setTimeout(() => {
      tooltipRenderRef.current.render(
        <ContextProvider theme={themeContext}>
          <TooltipContent
            layout={layout}
            options={showTooltipOptions}
            optionsPrev={optionsPrev}
            ref={tooltipContentRef}
          >
            {content}
          </TooltipContent >
        </ContextProvider>
      );
      tooltipVisibleRef.current = true;
    }, tooltipVisibleRef.current ? 0 : 1000);
  }

  function hideTooltip(delay?: number): void {
    clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      showTooltipRef.current = null;
      tooltipContentRef.current = null;
      tooltipVisibleRef.current = false;

      if (tooltipRenderRef.current) {
        tooltipRenderRef.current.render(null);
      }
    }, delay ?? 500);
  }

  useEffect(() => {
    const isInside = (event: MouseEvent): boolean => {
      const { wrapperRef } = showTooltipRef.current ?? {}
      if (!wrapperRef) return false;

      const { height, left, top, width } = wrapperRef?.current?.getBoundingClientRect() ?? {};
      const { height: heightt, left: leftt, top: topt, width: widtht } =
        tooltipContentRef?.current?.getBoundingClientRect() ?? {};
      const { pageX, pageY } = event;

      return (
        pageX >= left &&
        pageX <= left + width &&
        pageY >= top &&
        pageY <= top + height
      ) || (
          pageX >= leftt &&
          pageX <= leftt + widtht &&
          pageY >= topt &&
          pageY <= topt + heightt
        );
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!tooltipVisibleRef?.current
        || !showTooltipRef?.current
        || !showTooltipRef?.current?.hideOn?.length
        || !showTooltipRef?.current?.hideOn?.includes(HideTooltipReason.LEAVE)
      ) return;

      if (!isInside(event)) {
        hideTooltip();
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      clearTimeout(showTimeoutRef.current);

      if (!tooltipVisibleRef?.current
        || !showTooltipRef?.current
        || !showTooltipRef?.current?.hideOn?.includes(HideTooltipReason.CLICK)
      ) return;

      if (!isInside(event)) {
        hideTooltip(0);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!tooltipVisibleRef?.current
        || !showTooltipRef?.current
        || !showTooltipRef?.current?.hideOn?.includes(HideTooltipReason.BLUR)
      ) return;

      const { wrapperRef } = showTooltipRef.current;

      if ([wrapperRef, tooltipContentRef].some(
        el => el?.current && !el?.current.contains(event.relatedTarget as Node)
      )) {
        hideTooltip(0);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!tooltipVisibleRef?.current
        || !showTooltipRef?.current
        || !showTooltipRef?.current?.hideOn?.includes(HideTooltipReason.ESCAPE)
      ) return;

      if (event.key === 'Escape') {
        hideTooltip(0);
      }
    };

    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove, true);

    return () => {
      document.removeEventListener('focusout', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TooltipContext.Provider value={{ hideTooltip, showTooltip }}>
      {children}
      <div ref={tooltipRootRef} />
    </TooltipContext.Provider>
  );
};
