import React, { useContext, useEffect, useRef } from 'react';
import TooltipContent from './Content';
import dynamic from 'next/dynamic';
import {
  HideTooltipReason,
  ShowTooltipOptionsType,
  TooltipContext,
  TooltipContentType,
  TooltipLayout,
} from './Context';
import { Root, createRoot } from 'react-dom/client';
import { ThemeContext } from 'styled-components';

interface TooltipProviderProps {
  children: React.ReactNode;
  main?: boolean;
}

export const TooltipProvider: React.FC<TooltipProviderProps> = ({ children, main }) => {
  const themeContext = useContext(ThemeContext);

  const timeoutRef = useRef(null);
  const showTimeoutRef = useRef(null);
  const tooltipRenderRef = useRef<Root | null>(null);
  const tooltipRootRef = useRef<HTMLDivElement | null>(null);

  // Changes depending on what is being shown.
  const showTooltipRef = useRef<ShowTooltipOptionsType | null>(null);
  const tooltipContentRef = useRef<HTMLDivElement | null>(null);
  const tooltipVisibleRef = useRef<boolean>(false);

  function resetTimers() {
    clearTimeout(timeoutRef.current);
    clearTimeout(showTimeoutRef.current);
    timeoutRef.current = null;
    showTimeoutRef.current = null;
  }

  function showTooltip(
    content: TooltipContentType,
    layout: TooltipLayout,
    showTooltipOptions?: ShowTooltipOptionsType,
  ): void {
    resetTimers();

    const optionsPrev = showTooltipRef.current;
    showTooltipRef.current = showTooltipOptions;
    const ContextProvider = dynamic(() => import('../ContextProvider'));

    if (!tooltipRootRef?.current) {
      tooltipRootRef.current = document.createElement('div');
      tooltipRootRef.current.className = 'tooltip-root';
      tooltipRootRef.current.id = String(Number(new Date()));
      document.body.appendChild(tooltipRootRef.current);
    }

    tooltipRenderRef.current ||= createRoot(tooltipRootRef.current);

    showTimeoutRef.current = setTimeout(
      () => {
        // console.log('showTooltip');
        resetTimers();

        tooltipRenderRef.current.render(
          <ContextProvider theme={themeContext as any}>
            <TooltipContent
              layout={layout}
              options={showTooltipOptions}
              optionsPrev={optionsPrev}
              ref={tooltipContentRef}
            >
              {typeof content === 'function' ? content({} as any, {} as any) : content}
            </TooltipContent>
          </ContextProvider>,
        );
        tooltipVisibleRef.current = true;
      },
      tooltipVisibleRef.current ? 0 : 2000,
    );
  }

  function hideTooltip(delay?: number): void {
    timeoutRef.current = setTimeout(() => {
      // console.log('hideTooltip');
      resetTimers();

      if (tooltipRenderRef.current) {
        tooltipRenderRef.current.render(null);
      }

      showTooltipRef.current = null;
      tooltipContentRef.current = null;

      tooltipVisibleRef.current = false;
    }, delay ?? 1000);
  }

  useEffect(() => {
    const isInside = (event: MouseEvent): boolean => {
      const { wrapperRef } = showTooltipRef.current ?? {};
      if (!wrapperRef) return false;

      const { height, left, top, width } = wrapperRef?.current?.getBoundingClientRect() ?? {};
      const {
        height: heightt,
        left: leftt,
        top: topt,
        width: widtht,
      } = tooltipContentRef?.current?.getBoundingClientRect() ?? {};
      const { pageX, pageY } = event;

      return (
        (pageX >= left && pageX <= left + width && pageY >= top && pageY <= top + height) ||
        (pageX >= leftt && pageX <= leftt + widtht && pageY >= topt && pageY <= topt + heightt)
      );
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (
        !tooltipVisibleRef?.current ||
        !showTooltipRef?.current ||
        !showTooltipRef?.current?.hideOn?.length ||
        !showTooltipRef?.current?.hideOn?.includes(HideTooltipReason.LEAVE)
      )
        return;

      if (!isInside(event) && !timeoutRef.current) {
        // console.log('MOUSEMOVE');
        showTimeoutRef.current = null;
        hideTooltip();
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      clearTimeout(showTimeoutRef.current);

      if (
        !tooltipVisibleRef?.current ||
        !showTooltipRef?.current ||
        !showTooltipRef?.current?.hideOn?.includes(HideTooltipReason.CLICK)
      )
        return;

      if (!isInside(event)) {
        hideTooltip(0);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (
        !tooltipVisibleRef?.current ||
        !showTooltipRef?.current ||
        !showTooltipRef?.current?.hideOn?.includes(HideTooltipReason.BLUR)
      )
        return;

      const { wrapperRef } = showTooltipRef.current;

      if (
        [wrapperRef, tooltipContentRef].some(
          el => el?.current && !el?.current.contains(event.relatedTarget as Node),
        )
      ) {
        hideTooltip(0);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        !tooltipVisibleRef?.current ||
        !showTooltipRef?.current ||
        !showTooltipRef?.current?.hideOn?.includes(HideTooltipReason.ESCAPE)
      )
        return;

      if (event.key === 'Escape') {
        hideTooltip(0);
      }
    };

    document.addEventListener('focusout', handleFocusOut, true);
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    document.addEventListener('mousemove', handleMouseMove, true);

    const renderer = tooltipRenderRef.current;
    const root = tooltipRootRef.current;

    return () => {
      document.removeEventListener('focusout', handleMouseMove);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);

      if (renderer) {
        renderer.unmount();
      }
      if (root) {
        document.body.removeChild(root);
      }
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <TooltipContext.Provider value={{ hideTooltip, showTooltip }}>
      {children}
    </TooltipContext.Provider>
  );
};
