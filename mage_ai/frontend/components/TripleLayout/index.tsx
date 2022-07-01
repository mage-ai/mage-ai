import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import NextHead from 'next/head';

import Button from '@oracle/elements/Button';
import ClientOnly from '@hocs/ClientOnly';
import FlexContainer from '@oracle/components/FlexContainer';
import KeyboardShortcutButton from '@oracle/elements/Button/KeyboardShortcutButton';
import Spacing from '@oracle/elements/Spacing';
import {
  AFTER_DEFAULT_WIDTH,
  AFTER_MIN_WIDTH,
  AfterInnerStyle,
  AfterStyle,
  AsideHeaderStyle,
  BEFORE_DEFAULT_WIDTH,
  BEFORE_MIN_WIDTH,
  BeforeInnerStyle,
  BeforeStyle,
  DRAGGABLE_WIDTH,
  DraggableStyle,
  HeaderStyle,
  MAIN_MIN_WIDTH,
  MainContentInnerStyle,
  MainContentStyle,
  TabStyle,
} from './index.style';
import {
  ChevronLeft,
  ChevronRight,
} from '@oracle/icons';
import { NAV_ICON_MAPPING, ViewKeyEnum } from '@components/Sidekick/constants';
import { UNIT } from '@oracle/styles/units/spacing';
import { useWindowSize } from '@utils/sizes';
import {
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN,
  LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN,
  get,
  set,
} from '@storage/localStorage';

type TripleLayoutProps = {
  after?: any;
  before?: any;
  children: any;
  mainContainerRef: any;
};

function TripleLayout({
  after,
  before,
  children,
  mainContainerRef,
}: TripleLayoutProps) {
  const { width } = useWindowSize();
  const refAfterInner = useRef(null);
  const refAfterInnerDraggable = useRef(null);
  const refBeforeInner = useRef(null);
  const refBeforeInnerDraggable = useRef(null);
  const [afterHidden, setAfterHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_AFTER_HIDDEN));
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [afterWidth, setAfterWidth] = useState(AFTER_DEFAULT_WIDTH);
  const [beforeHidden, setBeforeHidden] =
    useState(!!get(LOCAL_STORAGE_KEY_PIPELINE_EDITOR_BEFORE_HIDDEN));
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);
  const [beforeWidth, setBeforeWidth] = useState(BEFORE_DEFAULT_WIDTH);
  const [activeSidekickView, setActiveSidekickView] = useState(ViewKeyEnum.TREE);
  const sidekickViews = after?.props?.views || [];

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
            <Spacing
              px={beforeHidden ? 1 : 2}
              py={2}
            >
              <FlexContainer justifyContent="flex-end">
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
              </FlexContainer>
            </Spacing>
          </AsideHeaderStyle>

          <BeforeInnerStyle ref={refBeforeInner}>
            {!beforeHidden && before}
          </BeforeInnerStyle>
        </BeforeStyle>
      )}

      <MainContentStyle
        style={{
          left: beforeWidthFinal,
          width: `calc(100% - ${beforeWidthFinal + afterWidthFinal}px)`,
        }}
      >
        <MainContentInnerStyle ref={mainContainerRef}>
          {children}
        </MainContentInnerStyle>
      </MainContentStyle>

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
            <Spacing
              px={afterHidden ? 1 : 2}
              py={after ? '10.5px' : 2}
            >
              <FlexContainer>
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
                {sidekickViews.map(({ key, label }: any) => {
                  const active = key === activeSidekickView;
                  const Icon = NAV_ICON_MAPPING[key];

                  return (
                    <Spacing key={key} pl={1}>
                      <KeyboardShortcutButton
                        beforeElement={<Icon />}
                        blackBorder
                        compact
                        inline
                        onClick={() => setActiveSidekickView(key)}
                        selected={active}
                        uuid={key}
                      >
                        {label}
                      </KeyboardShortcutButton>
                    </Spacing>
                  );
                })}
              </FlexContainer>
            </Spacing>
          </AsideHeaderStyle>

          <AfterInnerStyle ref={refAfterInner}>
            {!afterHidden && React.cloneElement(after, { activeView: activeSidekickView })}
          </AfterInnerStyle>
        </AfterStyle>
      )}
    </ClientOnly>
  );
}

export default TripleLayout;
