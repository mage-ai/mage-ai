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
  afterFooter?: any;
  afterFooterBottomOffset?: number;
  afterHeader?: any;
  afterHeaderOffset?: number;
  afterHeightOffset?: number;
  afterHidden: boolean;
  afterInnerHeightMinus?: number;
  afterMousedownActive: boolean;
  afterNavigationItems?: NavigationItem[];
  afterOverflow?: 'hidden';
  afterSubheader?: any;
  afterWidth?: number;
  before?: any;
  beforeFooter?: any;
  beforeHeader?: any;
  beforeHeaderOffset?: number;
  beforeHeightOffset?: number;
  beforeHidden?: boolean;
  beforeMousedownActive: boolean;
  beforeNavigationItems?: NavigationItem[];
  beforeWidth?: number;
  children: any;
  contained?: boolean;
  header?: any;
  headerOffset?: number;
  height?: number;
  hideAfterCompletely?: boolean;
  hideBeforeCompletely?: boolean;
  inline?: boolean;
  leftOffset?: number;
  mainContainerHeader?: any;
  mainContainerRef: any;
  navigationShowMore?: boolean;
  setAfterHidden?: (value: boolean) => void;
  setAfterMousedownActive?: (value: boolean) => void;
  setAfterWidth: (width: number) => void;
  setBeforeHidden?: (value: boolean) => void;
  setBeforeMousedownActive?: (value: boolean) => void;
  setBeforeWidth: (width: number) => void;
  uuid?: string;
};

function TripleLayout({
  after,
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
  before,
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
  header,
  headerOffset = 0,
  height: heightInlineContainer,
  hideAfterCompletely,
  hideBeforeCompletely,
  inline,
  leftOffset = 0,
  mainContainerHeader,
  mainContainerRef,
  navigationShowMore,
  setAfterHidden,
  setAfterMousedownActive,
  setAfterWidth,
  setBeforeHidden,
  setBeforeMousedownActive,
  setBeforeWidth,
  uuid,
}: TripleLayoutProps) {
  const { width } = useWindowSize();
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
    const resizeBefore = (e) => {
      const {
        x,
      } = refBeforeInner?.current?.getBoundingClientRect?.() || {};
      if (width) {
        let newWidth = e.x;
        if (newWidth + MAIN_MIN_WIDTH > width - afterWidth) {
          newWidth = (width - afterWidth) - MAIN_MIN_WIDTH;
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
  }, [
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
      const {
        x,
      } = refAfterInner?.current?.getBoundingClientRect?.() || {};

      if (width) {
        let newWidth = width - e.x;
        if (newWidth + MAIN_MIN_WIDTH > width - beforeWidth) {
          newWidth = (width - beforeWidth) - MAIN_MIN_WIDTH;
        }
        setAfterWidth(Math.max(newWidth, AFTER_MIN_WIDTH));
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
  }, [
    afterHidden,
    beforeWidth,
    refAfterInner,
    refAfterInnerDraggable,
    setAfterMousedownActive,
    setAfterWidth,
    width,
  ]);

  const shouldHideAfterWrapper = hideAfterCompletely && afterHidden;
  const afterWidthFinal = shouldHideAfterWrapper
    ? 0
    : (afterHidden ? UNIT * 4 : afterWidth);

  const shouldHideBeforeWrapper = hideBeforeCompletely && beforeHidden;
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
            <FlexContainer alignItems="center" fullHeight fullWidth>
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
            </FlexContainer>
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
    afterFooter,
    afterFooterBottomOffset,
    afterHeader,
    afterHeaderOffset,
    afterHeightOffset,
    afterHidden,
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

  const beforeContent = useMemo(() => (
    <>
      {(setBeforeHidden || beforeHeader) && (
        <AsideHeaderStyle
          contained={contained}
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
        heightOffset={beforeFooter
          ? beforeFooterRef?.current?.getBoundingClientRect()?.height
          : null
        }
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
        <BeforeStyle
          heightOffset={beforeHeightOffset}
          inline={inline}
          style={{
            left: leftOffset,
            width: beforeWidthFinal,
          }}
        >
          <DraggableStyle
            active={beforeMousedownActive}
            disabled={beforeHidden}
            ref={refBeforeInnerDraggable}
            right={0}
            top={contained ? 0 : ASIDE_HEADER_HEIGHT}
          />

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
      )}

      <MainWrapper
        inline={inline}
        style={{
          left: beforeWidthFinal + leftOffset,
          width: mainWidth,
        }}
      >
        {mainContainerHeader}

        <MainContentStyle
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
            noScrollbarTrackBackground
            ref={mainContainerRef}
          >
            {children}
          </MainContentInnerStyle>
        </MainContentStyle>
      </MainWrapper>

      {after && !shouldHideAfterWrapper && (
        <AfterStyle
          heightOffset={afterHeightOffset}
          inline={inline}
          style={{
            width: afterWidthFinal,
          }}
        >
          <DraggableStyle
            active={afterMousedownActive}
            disabled={afterHidden}
            left={0}
            ref={refAfterInnerDraggable}
            top={contained ? 0 : ASIDE_HEADER_HEIGHT}
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
      )}
    </>
  ), [
    after,
    afterContent,
    afterHeightOffset,
    afterHidden,
    afterMousedownActive,
    afterNavigationItems,
    afterWidthFinal,
    beforeContent,
    beforeHeightOffset,
    beforeHidden,
    beforeMousedownActive,
    beforeNavigationItems,
    beforeWidthFinal,
    children,
    contained,
    hasAfterNavigationItems,
    hasBeforeNavigationItems,
    header,
    headerOffset,
    inline,
    leftOffset,
    mainContainerHeader,
    mainContainerRef,
    mainWidth,
    navigationShowMore,
    refAfterInnerDraggable,
    refBeforeInnerDraggable,
    shouldHideAfterWrapper,
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
