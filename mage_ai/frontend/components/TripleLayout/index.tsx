import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import Divider from '@oracle/elements/Divider';
import FlexContainer from '@oracle/components/FlexContainer';
import Link from '@oracle/elements/Link';
import Spacing from '@oracle/elements/Spacing';
import {
  AFTER_DEFAULT_WIDTH,
  AFTER_MIN_WIDTH,
  AfterInnerStyle,
  AfterStyle,
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
import { PADDING_UNITS } from '@oracle/styles/units/spacing';
import { useWindowSize } from '@utils/sizes';

type TripleLayoutProps = {
  after?: any;
  before?: any;
  children: any;
  mainContentRef?: any;
};

function TripleLayout({
  after,
  before,
  children,
  mainContentRef,
}: TripleLayoutProps) {
  const { width } = useWindowSize();
  const refAfterInner = useRef(null);
  const refAfterInnerDraggable = useRef(null);
  const refBeforeInner = useRef(null);
  const refBeforeInnerDraggable = useRef(null);
  const [afterMousedownActive, setAfterMousedownActive] = useState(false);
  const [afterWidth, setAfterWidth] = useState(AFTER_DEFAULT_WIDTH);
  const [beforeWidth, setBeforeWidth] = useState(BEFORE_DEFAULT_WIDTH);
  const [beforeMousedownActive, setBeforeMousedownActive] = useState(false);

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
      document?.removeEventListener?.('mouseup', removeMousemove, false)
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
      document?.removeEventListener?.('mouseup', removeMousemove, false)
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

  return (
    <>
      {before && (
        <BeforeStyle
          style={{
            width: beforeWidth,
          }}
        >
          <DraggableStyle
            active={beforeMousedownActive}
            ref={refBeforeInnerDraggable}
            right={0}
          />

          <BeforeInnerStyle ref={refBeforeInner}>
            {before}
          </BeforeInnerStyle>
        </BeforeStyle>
      )}

      <MainContentStyle
        ref={mainContentRef}
        style={{
          left: beforeWidth,
          width: `calc(100% - ${beforeWidth + afterWidth}px)`,
        }}
      >
        <MainContentInnerStyle>
          {children}
        </MainContentInnerStyle>
      </MainContentStyle>

      {after && (
        <AfterStyle
          style={{
            width: afterWidth,
          }}
        >
          <DraggableStyle
            active={afterMousedownActive}
            left={0}
            ref={refAfterInnerDraggable}
          />

          <AfterInnerStyle ref={refAfterInner}>
            {after}
          </AfterInnerStyle>
        </AfterStyle>
      )}
    </>
  );
}

export default TripleLayout;
