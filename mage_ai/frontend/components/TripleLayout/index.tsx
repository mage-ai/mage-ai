import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import NextHead from 'next/head';

import Button from '@oracle/elements/Button';
import ClientOnly from '@hocs/ClientOnly';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Tooltip from '@oracle/components/Tooltip';
import VerticalNavigation from '@components/Dashboard/VerticalNavigation';
import {
  AFTER_MIN_WIDTH,
  ALL_HEADERS_HEIGHT,
  ASIDE_HEADER_HEIGHT,
  AfterInnerStyle,
  AfterStyle,
  AsideFooterStyle,
  AsideHeaderInnerStyle,
  AsideHeaderStyle,
  AsideSubheaderStyle,
  BEFORE_MIN_WIDTH,
  BeforeInnerStyle,
  BeforeStyle,
  DRAGGABLE_WIDTH,
  DraggableStyle,
  InlineContainerStyle,
  MainContainerHeaderStyle,
  MAIN_MIN_WIDTH,
  MainContentInnerStyle,
  MainContentStyle,
  MainWrapper,
  NavigationContainerStyle,
  NavigationInnerStyle,
  NavigationStyle,
  NewHeaderStyle,
} from './index.style';
import {
  ChevronLeft,
  ChevronRight,
} from '@oracle/icons';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN,
  set,
} from '@storage/localStorage';
import { NavigationItem } from '@components/Dashboard/VerticalNavigation';
import { UNIT } from '@oracle/styles/units/spacing';
import {
  VERTICAL_NAVIGATION_WIDTH,
  VerticalNavigationStyle,
} from '@components/Dashboard/index.style';
import { useWindowSize } from '@utils/sizes';

type TripleLayoutProps = {
  after?: any;
  afterDividerContrast?: boolean;
  afterDraggableTopOffset?: number;
  afterFooter?: any;
  afterFooterBottomOffset?: number;
  afterHeader?: any;
  afterHeaderOffset?: number;
  afterHeightOffset?: number;
  afterHidden?: boolean;
  afterInnerHeightMinus?: number;
  afterMousedownActive?: boolean;
  afterNavigationItems?: NavigationItem[];
  afterOverflow?: 'hidden';
  afterSubheader?: any;
  afterWidth?: number;
  autoLayout?: boolean;
  before?: any;
  beforeContentHeightOffset?: number;
  beforeDividerContrast?: boolean;
  beforeDraggableTopOffset?: number;
  beforeFooter?: any;
  beforeHeader?: any;
  beforeHeaderOffset?: number;
  beforeHeightOffset?: number;
  beforeHidden?: boolean;
  beforeMousedownActive?: boolean;
  beforeNavigationItems?: NavigationItem[];
  beforeWidth?: number;
  children?: any;
  contained?: boolean;
  containerRef?: any;
  footerOffset?: number;
  header?: any;
  headerOffset?: number;
  height?: number;
  hideAfterCompletely?: boolean;
  hideBeforeCompletely?: boolean;
  inline?: boolean;
  leftOffset?: number;
  mainContainerFooter?: any;
  mainContainerHeader?: any;
  mainContainerRef?: any;
  navigationShowMore?: boolean;
  noBackground?: boolean;
  setAfterHidden?: (value: boolean) => void;
  setAfterMousedownActive?: (value: boolean) => void;
  setAfterWidth?: (width: number) => void;
  setBeforeHidden?: (value: boolean) => void;
  setBeforeMousedownActive?: (value: boolean) => void;
  setBeforeWidth?: (width: number) => void;
  subtractTopFromBeforeDraggableHeight?: boolean;
  uuid?: string;
};

function TripleLayout({
  after,
  afterDividerContrast,
  afterDraggableTopOffset = 0,
  afterFooter,
  afterFooterBottomOffset,
  afterHeader,
  afterHeaderOffset,
  afterHeightOffset,
  afterHidden,
  afterInnerHeightMinus,
  afterMousedownActive,
  afterNavigationItems,
  afterOverflow,
  afterSubheader,
  afterWidth = 0,
  autoLayout,
  before,
  beforeContentHeightOffset,
  beforeDividerContrast,
  beforeDraggableTopOffset = 0,
  beforeFooter,
  beforeHeader,
  beforeHeaderOffset,
  beforeHeightOffset,
  beforeHidden,
  beforeMousedownActive,
  beforeNavigationItems,
  beforeWidth = 0,
  children,
  contained,
  containerRef,
  footerOffset,
  header,
  headerOffset = 0,
  height: heightInlineContainer,
  hideAfterCompletely,
  hideBeforeCompletely,
  inline,
  leftOffset = 0,
  mainContainerFooter,
  mainContainerHeader,
  mainContainerRef,
  navigationShowMore,
  noBackground,
  setAfterHidden,
  setAfterMousedownActive,
  setAfterWidth,
  setBeforeHidden,
  setBeforeMousedownActive,
  setBeforeWidth,
  subtractTopFromBeforeDraggableHeight,
  uuid,
}: TripleLayoutProps) {
  const { width: widthWindow } = useWindowSize();
  const width = containerRef?.current
    ? containerRef?.current?.getBoundingClientRect?.()?.width
    : widthWindow;

  function getOffsetLeft() {
    return containerRef?.current ? containerRef?.current?.getBoundingClientRect?.()?.left : 0;
  }

  const refAfterInner = useRef(null);
  const refAfterInnerDraggable = useRef(null);
  const refBeforeInner = useRef(null);
  const refBeforeInnerDraggable = useRef(null);

  const toggleAfter = useCallback(() => {
    const val = !afterHidden;
    setAfterHidden?.(val);
    set(uuid || LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN, val);
  }, [
    afterHidden,
    setAfterHidden,
    uuid,
  ]);
  const toggleBefore = useCallback(() => {
    const val = !beforeHidden;
    setBeforeHidden?.(val);
    set(uuid || LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN, val);
  }, [
    beforeHidden,
    setBeforeHidden,
    uuid,
  ]);

  useEffect(() => {
    if (setBeforeWidth) {
      const resizeBefore = (e) => {
        const {
          x,
        } = refBeforeInner?.current?.getBoundingClientRect?.() || {};
        if (width) {
          let newWidth = (e.x - getOffsetLeft());
          if (newWidth + MAIN_MIN_WIDTH > width - (afterHidden ? 0 : afterWidth)) {
            newWidth = (width - (afterHidden ? 0 : afterWidth)) - MAIN_MIN_WIDTH;
          }
          // Not sure why we need to multiply by 2, but we do.
          newWidth -= (leftOffset * 2);
          setBeforeWidth(Math.max(newWidth, BEFORE_MIN_WIDTH));
        }
      };

      const addMousedown = (e) => {
        if (e.offsetX >= e.target.offsetWidth - DRAGGABLE_WIDTH
          && e.offsetX <= e.target.offsetWidth + DRAGGABLE_WIDTH
        ) {
          setBeforeMousedownActive?.(true);
          e.preventDefault();
          document?.addEventListener?.('mousemove', resizeBefore, false);
        }
      };
      const removeMousemove = () => {
        setBeforeMousedownActive?.(false);
        document?.removeEventListener?.('mousemove', resizeBefore, false);
      };
      refBeforeInnerDraggable?.current?.addEventListener?.('mousedown', addMousedown, false);
      document?.addEventListener?.('mouseup', removeMousemove, false);

      return () => {
        refBeforeInnerDraggable?.current?.removeEventListener?.('mousedown', addMousedown, false);
        document?.removeEventListener?.('mouseup', removeMousemove, false);
        removeMousemove();
      };
    }
  // getOffsetLeft intentionally left out of dependency array
  // If it was included, the before panel would not resize correctly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    afterHidden,
    afterWidth,
    beforeHidden,
    leftOffset,
    refBeforeInner,
    refBeforeInnerDraggable,
    setBeforeMousedownActive,
    setBeforeWidth,
    width,
  ]);

  useEffect(() => {
    const resizeAfter = (e) => {
      if (setAfterWidth) {
        const {
          x,
        } = refAfterInner?.current?.getBoundingClientRect?.() || {};

        if (width) {
          let newWidth = width - (e.x - getOffsetLeft());
          if (newWidth + MAIN_MIN_WIDTH > width - (beforeHidden ? 0 : beforeWidth)) {
            newWidth = (width - (beforeHidden ? 0 : beforeWidth)) - MAIN_MIN_WIDTH;
          }

          setAfterWidth?.(Math.max(newWidth, AFTER_MIN_WIDTH));
        }
      }
    };

    const addMousedown = (e) => {
      if (e.offsetX >= -1 * DRAGGABLE_WIDTH && e.offsetX <= DRAGGABLE_WIDTH) {
        setAfterMousedownActive?.(true);
        e.preventDefault();
        document?.addEventListener?.('mousemove', resizeAfter, false);
      }
    };
    const removeMousemove = () => {
      setAfterMousedownActive?.(false);
      document?.removeEventListener?.('mousemove', resizeAfter, false);
    };
    refAfterInnerDraggable?.current?.addEventListener?.('mousedown', addMousedown, false);
    document?.addEventListener?.('mouseup', removeMousemove, false);

    return () => {
      refAfterInnerDraggable?.current?.removeEventListener?.('mousedown', addMousedown, false);
      document?.removeEventListener?.('mouseup', removeMousemove, false);
      removeMousemove();
    };
  // getOffsetLeft intentionally left out of dependency array
  // If it was included, the after panel would not resize correctly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    afterHidden,
    beforeHidden,
    beforeWidth,
    refAfterInner,
    refAfterInnerDraggable,
    setAfterMousedownActive,
    setAfterWidth,
    width,
  ]);

  const shouldHideAfterWrapper = hideAfterCompletely && afterHidden !== false;
  const afterWidthFinal = shouldHideAfterWrapper
    ? 0
    : (afterHidden ? UNIT * 4 : afterWidth);

  const shouldHideBeforeWrapper = hideBeforeCompletely && beforeHidden !== false;
  const beforeWidthFinal = shouldHideBeforeWrapper
    ? 0
    : (beforeHidden ? UNIT * 4 : beforeWidth);
  const mainWidth =
    `calc(100% - ${beforeWidthFinal + afterWidthFinal + leftOffset}px)`;

  const hasAfterNavigationItems = useMemo(() => afterNavigationItems?.length >= 1, [
    afterNavigationItems,
  ]);

  const afterContent = useMemo(() => (
    <>
      {(setAfterHidden || afterHeader) && (
        <>
          <AsideHeaderStyle
            contrast={afterDividerContrast}
            inline={inline}
            style={{
              width: hasAfterNavigationItems
                // Required
                ? afterWidthFinal - (VERTICAL_NAVIGATION_WIDTH - 1)
                : afterWidthFinal,
            }}
            top={contained ? headerOffset : ASIDE_HEADER_HEIGHT}
            visible={afterHidden}
          >
            <Flex>
              <Spacing pl={afterHidden ? 1 : 2} />
              <Button
                noBackground
                noBorder
                noPadding
                onClick={() => toggleAfter()}
              >
                {afterHidden && (
                  <ChevronLeft
                    neutral
                    size={UNIT * 2}
                  />
                )}
                {!afterHidden && (
                  <ChevronRight
                    neutral
                    size={UNIT * 2}
                  />
                )}
              </Button>
            </Flex>

            {!afterHidden && afterHeader}
          </AsideHeaderStyle>

          {!afterHidden && afterSubheader && (
            <AsideSubheaderStyle
              style={{
                width: hasAfterNavigationItems
                  ? afterWidthFinal - (VERTICAL_NAVIGATION_WIDTH + 1)
                  : afterWidthFinal,
              }}
              visible={afterHidden}
            >
              {afterSubheader}
            </AsideSubheaderStyle>
          )}
        </>
      )}

      <AfterInnerStyle
        heightMinus={afterInnerHeightMinus}
        noScrollbarTrackBackground
        overflow={afterOverflow}
        ref={refAfterInner}
        verticalOffset={afterHeader
          ? afterSubheader
            ? ASIDE_HEADER_HEIGHT + afterHeightOffset
            : (afterHeaderOffset || afterHeightOffset)
          : null
        }
      >
        {!afterHidden && after}
      </AfterInnerStyle>

      {afterFooter && !afterHidden && (
        <AsideFooterStyle
          bottom={inline
            ? afterFooterBottomOffset
            : null
          }
          inline={inline}
          style={{
            overflow: afterHidden
              ? 'visible'
              : 'hidden',
            width: afterWidthFinal,
          }}
        >
          {afterFooter}
        </AsideFooterStyle>
      )}
    </>
  ), [
    after,
    afterDividerContrast,
    afterFooter,
    afterFooterBottomOffset,
    afterHeader,
    afterHeaderOffset,
    afterHeightOffset,
    afterHidden,
    afterInnerHeightMinus,
    afterOverflow,
    afterSubheader,
    afterWidthFinal,
    contained,
    hasAfterNavigationItems,
    headerOffset,
    inline,
    refAfterInner,
    setAfterHidden,
    toggleAfter,
  ]);

  const hasBeforeNavigationItems = useMemo(() => beforeNavigationItems?.length >= 1, [
    beforeNavigationItems,
  ]);

  const beforeFooterRef = useRef(null);

  const beforeContentHeightOffsetUse: number = useMemo(() => {
    let val = null;

    const hasBeforeFooter = typeof beforeFooter !== 'undefined' && beforeFooter !== null;
    const hasOffset =
      typeof beforeContentHeightOffset !== 'undefined' && beforeContentHeightOffset !== null;

    if (hasBeforeFooter || hasOffset) {
      val = 0;

      if (beforeFooter) {
        val += beforeFooterRef?.current?.getBoundingClientRect()?.height || 0;
      }

      if (hasOffset) {
        val += beforeContentHeightOffset || 0;
      }
    }

    return val;
  }, [
    beforeFooter,
    beforeContentHeightOffset,
  ]);

  const beforeContent = useMemo(() => (
    <>
      {(setBeforeHidden || beforeHeader) && (
        <AsideHeaderStyle
          contained={contained}
          contrast={beforeDividerContrast}
          inline={inline}
          style={{
            overflow: beforeHidden
              ? 'visible'
              : 'hidden',
            width: hasBeforeNavigationItems
              // Required
              ? beforeWidthFinal - (VERTICAL_NAVIGATION_WIDTH + 2)
              : beforeWidthFinal,
          }}
          top={contained ? headerOffset : ASIDE_HEADER_HEIGHT}
          visible={beforeHidden}
        >
          <FlexContainer
            alignItems="center"
            fullHeight
            fullWidth
            justifyContent="space-between"
          >
            <AsideHeaderInnerStyle noPadding>
              <Spacing pl={beforeHidden ? 1 : 0} />
              {!beforeHidden && beforeHeader}
            </AsideHeaderInnerStyle>

            <Flex>
              {setBeforeHidden && (
                <Tooltip
                  appearAbove={!beforeHidden}
                  appearBefore={!beforeHidden}
                  block
                  key={beforeHidden ? 'before-is-hidden' : 'before-is-visible'}
                  label={beforeHidden ? 'Show sidebar' : 'Hide sidebar'}
                  size={null}
                  widthFitContent
                >
                  <Button
                    noBackground
                    noBorder
                    noPadding
                    onClick={() => toggleBefore()}
                  >
                    {beforeHidden && (
                      <ChevronRight
                        neutral
                        size={UNIT * 2}
                      />
                    )}
                    {!beforeHidden && (
                      <ChevronLeft
                        neutral
                        size={UNIT * 2}
                      />
                    )}
                  </Button>
                </Tooltip>
              )}

              <Spacing pr={beforeHidden ? 1 : 2} />
            </Flex>
          </FlexContainer>
        </AsideHeaderStyle>
      )}

      <BeforeInnerStyle
        contained={contained && !inline}
        heightOffset={beforeContentHeightOffsetUse}
        noScrollbarTrackBackground
        ref={refBeforeInner}
        verticalOffset={beforeHeader
          ? (beforeHeaderOffset || beforeHeightOffset)
          : null
        }
      >
        {!beforeHidden && before}
      </BeforeInnerStyle>

      {beforeFooter && (
        <AsideFooterStyle
          contained={contained}
          ref={beforeFooterRef}
          style={{
            overflow: beforeHidden
              ? 'visible'
              : 'hidden',
            width: beforeWidthFinal,
          }}
        >
          {beforeFooter}
        </AsideFooterStyle>
      )}
    </>
  ), [
    before,
    beforeContentHeightOffsetUse,
    beforeDividerContrast,
    beforeFooter,
    beforeFooterRef,
    beforeHeader,
    beforeHeaderOffset,
    beforeHeightOffset,
    beforeHidden,
    beforeWidthFinal,
    contained,
    headerOffset,
    hasBeforeNavigationItems,
    inline,
    refBeforeInner,
    setBeforeHidden,
    toggleBefore,
  ]);

  const afterMemo = useMemo(() => {
    if (after && !shouldHideAfterWrapper) {
      return (
        <AfterStyle
          autoLayout={autoLayout}
          heightOffset={afterHeightOffset}
          inline={inline}
          style={{
            width: afterWidthFinal,
          }}
        >
          <DraggableStyle
            active={afterMousedownActive}
            contrast={afterDividerContrast}
            disabled={afterHidden}
            left={0}
            ref={refAfterInnerDraggable}
            top={contained ? (0 + afterDraggableTopOffset) : ASIDE_HEADER_HEIGHT}
            topOffset={afterDraggableTopOffset}
          />

          {hasAfterNavigationItems && (
            <NavigationStyle>
              {!afterHidden && (
                <>
                  <NavigationInnerStyle aligned="right">
                    <VerticalNavigationStyle
                      aligned="right"
                      borderless
                      showMore={navigationShowMore}
                    >
                      <VerticalNavigation
                        aligned="right"
                        navigationItems={afterNavigationItems}
                      />
                    </VerticalNavigationStyle>
                  </NavigationInnerStyle>

                  <NavigationContainerStyle
                    aligned="right"
                    fullWidth
                    heightOffset={afterHeightOffset}
                    // 1 for the border-left
                    widthOffset={VERTICAL_NAVIGATION_WIDTH + 1}
                  >
                    {afterContent}
                  </NavigationContainerStyle>
                </>
              )}

              {afterHidden && afterContent}
            </NavigationStyle>
          )}

          {!hasAfterNavigationItems && afterContent}
        </AfterStyle>
      );
    }

    return null;
  }, [
    after,
    afterContent,
    afterDividerContrast,
    afterDraggableTopOffset,
    afterHeightOffset,
    afterHidden,
    afterMousedownActive,
    afterNavigationItems,
    afterWidthFinal,
    autoLayout,
    contained,
    hasAfterNavigationItems,
    inline,
    navigationShowMore,
    shouldHideAfterWrapper,
  ]);

  const el = useMemo(() => (
    <>
      {((afterMousedownActive && !afterHidden) || (beforeMousedownActive && !beforeHidden)) && (
        <NextHead>
          <style
            dangerouslySetInnerHTML={{
              __html: `
                body {
                  cursor: col-resize;
                }
              `,
            }}
          />
        </NextHead>
      )}

      {header && (
        <NewHeaderStyle>
          {header}
        </NewHeaderStyle>
      )}

      {before && (
        <>
          <BeforeStyle
            autoLayout={autoLayout}
            heightOffset={beforeHeightOffset}
            inline={inline}
            style={{
              left: leftOffset,
              width: beforeWidthFinal,
            }}
          >
            {hasBeforeNavigationItems && (
              <NavigationStyle>
                {!beforeHidden && (
                  <>
                    <NavigationInnerStyle aligned="left">
                      <VerticalNavigationStyle
                        aligned="left"
                        borderless
                        showMore={navigationShowMore}
                      >
                        <VerticalNavigation
                          aligned="left"
                          navigationItems={beforeNavigationItems}
                        />
                      </VerticalNavigationStyle>
                    </NavigationInnerStyle>

                    <NavigationContainerStyle
                      aligned="left"
                      fullWidth
                      heightOffset={beforeHeightOffset}
                      // 1 for the border-left
                      widthOffset={VERTICAL_NAVIGATION_WIDTH + 1}
                    >
                      {beforeContent}
                    </NavigationContainerStyle>
                  </>
                )}

                {beforeHidden && beforeContent}
              </NavigationStyle>
            )}

            {!hasBeforeNavigationItems && beforeContent}
          </BeforeStyle>
          {setBeforeWidth && (
            <DraggableStyle
              active={beforeMousedownActive}
              contrast={beforeDividerContrast}
              disabled={beforeHidden}
              left={beforeWidthFinal + leftOffset}
              ref={refBeforeInnerDraggable}
              subtractTopFromHeight={subtractTopFromBeforeDraggableHeight}
              top={contained ? 0 : ASIDE_HEADER_HEIGHT}
              topOffset={beforeDraggableTopOffset}
            />
          )}
        </>
      )}

      {autoLayout && afterMemo}

      <MainWrapper
        autoLayout={autoLayout}
        inline={inline}
        noBackground={noBackground}
        style={{
          left: beforeWidthFinal + leftOffset,
          width: mainWidth,
        }}
      >
        {mainContainerHeader
          ? (
            <MainContainerHeaderStyle>
              {typeof mainContainerHeader === 'function'
                ? mainContainerHeader?.({
                  widthOffset: beforeWidthFinal + afterWidthFinal + leftOffset,
                })
                : mainContainerHeader
              }
            </MainContainerHeaderStyle>
          )
          : null
        }

        <MainContentStyle
          autoLayout={autoLayout}
          footerOffset={footerOffset}
          headerOffset={contained
            ? headerOffset
            : ((mainContainerHeader ? ALL_HEADERS_HEIGHT : ASIDE_HEADER_HEIGHT) + headerOffset)
          }
          inline={inline}
          style={{
            width: inline ? null : mainWidth,
          }}
        >
          <MainContentInnerStyle
            autoLayout={autoLayout}
            noScrollbarTrackBackground
            ref={mainContainerRef}
          >
            {children}
          </MainContentInnerStyle>

        </MainContentStyle>

        {mainContainerFooter}
      </MainWrapper>

      {!autoLayout && afterMemo}
    </>
  ), [
    afterMemo,
    afterHidden,
    afterMousedownActive,
    afterWidthFinal,
    autoLayout,
    before,
    beforeContent,
    beforeDividerContrast,
    beforeDraggableTopOffset,
    beforeHeightOffset,
    beforeHidden,
    beforeMousedownActive,
    beforeNavigationItems,
    beforeWidthFinal,
    children,
    contained,
    footerOffset,
    hasBeforeNavigationItems,
    header,
    headerOffset,
    inline,
    leftOffset,
    mainContainerFooter,
    mainContainerHeader,
    mainContainerRef,
    mainWidth,
    navigationShowMore,
    noBackground,
    refBeforeInnerDraggable,
    setBeforeWidth,
    subtractTopFromBeforeDraggableHeight,
  ]);

  return (
    <ClientOnly>
      {inline && (
        <InlineContainerStyle height={heightInlineContainer}>
          {el}
        </InlineContainerStyle>
      )}
      {!inline && el}
    </ClientOnly>
  );
}

export default TripleLayout;
