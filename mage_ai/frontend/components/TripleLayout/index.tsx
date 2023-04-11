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
  AsideHeaderStyle,
  AsideSubheaderStyle,
  BEFORE_MIN_WIDTH,
  BeforeInnerStyle,
  BeforeStyle,
  DRAGGABLE_WIDTH,
  DraggableStyle,
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
  afterHeader?: any;
  afterHeightOffset?: number;
  afterHidden: boolean;
  afterMousedownActive: boolean;
  afterNavigationItems?: NavigationItem[];
  afterSubheader?: any;
  afterWidth?: number;
  before?: any;
  beforeHeader?: any;
  beforeHeightOffset?: number;
  beforeHidden: boolean;
  beforeMousedownActive: boolean;
  beforeNavigationItems?: NavigationItem[];
  beforeWidth?: number;
  children: any;
  header?: any;
  headerOffset?: number;
  hideAfterCompletely?: boolean;
  leftOffset?: number;
  mainContainerHeader?: any;
  mainContainerRef: any;
  setAfterHidden?: (value: boolean) => void;
  setAfterMousedownActive?: (value: boolean) => void;
  setAfterWidth: (width: number) => void;
  setBeforeHidden: (value: boolean) => void;
  setBeforeMousedownActive?: (value: boolean) => void;
  setBeforeWidth: (width: number) => void;
  uuid?: string;
};

function TripleLayout({
  after,
  afterHeader,
  afterHeightOffset,
  afterHidden,
  afterMousedownActive,
  afterNavigationItems,
  afterSubheader,
  afterWidth = 0,
  before,
  beforeHeader,
  beforeHeightOffset,
  beforeHidden,
  beforeMousedownActive,
  beforeNavigationItems,
  beforeWidth = 0,
  children,
  header,
  headerOffset = 0,
  hideAfterCompletely,
  leftOffset = 0,
  mainContainerHeader,
  mainContainerRef,
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
    set(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN, val);
  }, [
    afterHidden,
    setAfterHidden,
  ]);
  const toggleBefore = useCallback(() => {
    const val = !beforeHidden;
    setBeforeHidden(val);
    set(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN, val);
  }, [
    beforeHidden,
    setBeforeHidden,
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
  const beforeWidthFinal = beforeHidden ? UNIT * 4 : beforeWidth;
  const mainWidth =
    `calc(100% - ${beforeWidthFinal + afterWidthFinal + leftOffset}px)`;

  const hasAfterNavigationItems = useMemo(() => afterNavigationItems?.length >= 1, [
    afterNavigationItems,
  ]);
  const afterContent = useMemo(() => (
    <>
      {setAfterHidden && (
        <>
          <AsideHeaderStyle
            style={{
              width: hasAfterNavigationItems
                ? afterWidthFinal - (VERTICAL_NAVIGATION_WIDTH + 1)
                : afterWidthFinal,
            }}
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
                width: afterWidthFinal,
              }}
              visible={afterHidden}
            >
              {afterSubheader}
            </AsideSubheaderStyle>
          )}
        </>
      )}

      <AfterInnerStyle
        noScrollbarTrackBackground
        ref={refAfterInner}
        verticalOffset={afterHeightOffset}
      >
        {!afterHidden && after}
      </AfterInnerStyle>
    </>
  ), [
    after,
    afterHeader,
    afterHidden,
    afterSubheader,
    afterWidthFinal,
    hasAfterNavigationItems,
    refAfterInner,
    setAfterHidden,
    toggleAfter,
  ]);

  const hasBeforeNavigationItems = useMemo(() => beforeNavigationItems?.length >= 1, [
    beforeNavigationItems,
  ]);
  const beforeContent = useMemo(() => (
    <>
      {setBeforeHidden && (
        <AsideHeaderStyle
          style={{
            width: hasBeforeNavigationItems
              ? beforeWidthFinal - (VERTICAL_NAVIGATION_WIDTH + 1)
              : beforeWidthFinal,
          }}
          visible={beforeHidden}
        >
          <FlexContainer
            alignItems="center"
            fullHeight
            fullWidth
            justifyContent="space-between"
          >
            <Flex>
              <Spacing pl={beforeHidden ? 1 : 0} />

              {!beforeHidden && beforeHeader}
            </Flex>

            <Flex>
              <Tooltip
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

              <Spacing pr={beforeHidden ? 1 : 2} />
            </Flex>
          </FlexContainer>
        </AsideHeaderStyle>
      )}

      <BeforeInnerStyle
        noScrollbarTrackBackground
        ref={refBeforeInner}
        verticalOffset={beforeHeader ? beforeHeightOffset : null}
      >
        {!beforeHidden && before}
      </BeforeInnerStyle>
    </>
  ), [
    before,
    beforeHeader,
    beforeHeightOffset,
    beforeHidden,
    beforeWidthFinal,
    hasBeforeNavigationItems,
    refBeforeInner,
    setBeforeHidden,
    toggleBefore,
  ]);

  return (
    <ClientOnly>
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
          />

          {hasBeforeNavigationItems && (
            <NavigationStyle>
              {!beforeHidden && (
                <>
                  <NavigationInnerStyle aligned="left">
                    <VerticalNavigationStyle borderLess>
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
        style={{
          left: beforeWidthFinal + leftOffset,
          width: mainWidth,
        }}
      >
        {mainContainerHeader}

        <MainContentStyle
          headerOffset={(mainContainerHeader ? ALL_HEADERS_HEIGHT : ASIDE_HEADER_HEIGHT) + headerOffset}
          style={{
            width: mainWidth,
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
          style={{
            width: afterWidthFinal,
          }}
        >
          <DraggableStyle
            active={afterMousedownActive}
            disabled={afterHidden}
            left={0}
            ref={refAfterInnerDraggable}
          />

          {hasAfterNavigationItems && (
            <NavigationStyle>
              {!afterHidden && (
                <>
                  <NavigationInnerStyle aligned="right">
                    <VerticalNavigationStyle borderLess>
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
    </ClientOnly>
  );
}

export default TripleLayout;
