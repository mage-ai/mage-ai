import React, {
  useCallback,
  useEffect,
  useRef,
} from 'react';
import NextHead from 'next/head';

import Button from '@oracle/elements/Button';
import ClientOnly from '@hocs/ClientOnly';
import Flex from '@oracle/components/Flex';
import FlexContainer from '@oracle/components/FlexContainer';
import Spacing from '@oracle/elements/Spacing';
import Tooltip from '@oracle/components/Tooltip';
import {
  AFTER_MIN_WIDTH,
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
import { UNIT } from '@oracle/styles/units/spacing';
import { useWindowSize } from '@utils/sizes';

type TripleLayoutProps = {
  after?: any;
  afterHeader?: any;
  afterHidden: boolean;
  afterMousedownActive: boolean;
  afterSubheader?: any;
  afterWidth: number;
  before?: any;
  beforeHeader?: any;
  beforeHidden: boolean;
  beforeMousedownActive: boolean;
  beforeWidth: number;
  children: any;
  mainContainerHeader?: any;
  mainContainerRef: any;
  setAfterHidden: (value: boolean) => void;
  setAfterMousedownActive: (value: boolean) => void;
  setAfterWidth: (width: number) => void;
  setBeforeHidden: (value: boolean) => void;
  setBeforeMousedownActive: (value: boolean) => void;
  setBeforeWidth: (width: number) => void;
};

function TripleLayout({
  after,
  afterHeader,
  afterHidden,
  afterMousedownActive,
  afterSubheader,
  afterWidth,
  before,
  beforeHeader,
  beforeHidden,
  beforeMousedownActive,
  beforeWidth,
  children,
  mainContainerHeader,
  mainContainerRef,
  setAfterHidden,
  setAfterMousedownActive,
  setAfterWidth,
  setBeforeHidden,
  setBeforeMousedownActive,
  setBeforeWidth,
}: TripleLayoutProps) {
  const { width } = useWindowSize();
  const refAfterInner = useRef(null);
  const refAfterInnerDraggable = useRef(null);
  const refBeforeInner = useRef(null);
  const refBeforeInnerDraggable = useRef(null);

  const toggleAfter = useCallback(() => {
    const val = !afterHidden;
    setAfterHidden(val);
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
        setBeforeWidth(Math.max(newWidth, BEFORE_MIN_WIDTH));
      }
    };

    const addMousedown = (e) => {
      if (e.offsetX >= e.target.offsetWidth - DRAGGABLE_WIDTH
        && e.offsetX <= e.target.offsetWidth + DRAGGABLE_WIDTH
      ) {
        setBeforeMousedownActive(true);
        e.preventDefault();
        document?.addEventListener?.('mousemove', resizeBefore, false);
      }
    };
    const removeMousemove = () => {
      setBeforeMousedownActive(false);
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
        setAfterMousedownActive(true);
        e.preventDefault();
        document?.addEventListener?.('mousemove', resizeAfter, false);
      }
    };
    const removeMousemove = () => {
      setAfterMousedownActive(false);
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
    beforeWidth,
    refAfterInner,
    refAfterInnerDraggable,
    setAfterMousedownActive,
    setAfterWidth,
    width,
  ]);

  const afterWidthFinal = afterHidden ? UNIT * 4 : afterWidth;
  const beforeWidthFinal = beforeHidden ? UNIT * 4 : beforeWidth;

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

      {before && (
        <BeforeStyle
          style={{
            width: beforeWidthFinal,
          }}
        >
          <DraggableStyle
            active={beforeMousedownActive}
            disabled={beforeHidden}
            ref={refBeforeInnerDraggable}
            right={0}
          />

          <AsideHeaderStyle
            style={{
              width: beforeWidthFinal,
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

          <BeforeInnerStyle
            noScrollbarTrackBackground
            ref={refBeforeInner}
          >
            {!beforeHidden && before}
          </BeforeInnerStyle>
        </BeforeStyle>
      )}

      <MainWrapper
        style={{
          left: beforeWidthFinal,
          width: `calc(100% - ${beforeWidthFinal + afterWidthFinal}px)`,
        }}
      >
        {mainContainerHeader}

        <MainContentStyle
          headerOffset={mainContainerHeader ? ASIDE_HEADER_HEIGHT : null}
          style={{
            width: `calc(100% - ${beforeWidthFinal + afterWidthFinal}px)`,
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

      {after && (
        <AfterStyle
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

          <AsideHeaderStyle
            style={{
              width: afterWidthFinal,
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

          <AfterInnerStyle
            noScrollbarTrackBackground
            ref={refAfterInner}
          >
            {!afterHidden && after}
          </AfterInnerStyle>
        </AfterStyle>
      )}
    </ClientOnly>
  );
}

export default TripleLayout;
