import React, { createRef, useEffect, useMemo, useState, useRef } from 'react';

import Circle from '@oracle/elements/Circle';
import Text from '@oracle/elements/Text';
import { ChevronLeft, ChevronRight } from '@oracle/icons';
import { ArrowCount, CountInnerStyle, ScrollerStyle, ICON_SIZE } from './index.style';
import { sum } from '@utils/array';

type FileTabsScrollerProps = {
  children?: any;
  fileTabs?: JSX.Element[];
  selectedFilePathIndex?: number;
  widthOffset?: number;
};

function FileTabsScroller({
  children,
  fileTabs,
  selectedFilePathIndex,
  widthOffset,
}: FileTabsScrollerProps) {
  const refScroll = useRef(null);
  const refTabs = useRef(null);
  const refFileTabs = useRef([]);
  const countLeftRef = useRef(null);
  const countLeftTextRef = useRef(null);
  const countRightRef = useRef(null);
  const countRightTextRef = useRef(null);
  const timeoutLeftRef = useRef(null);
  const timeoutRightRef = useRef(null);
  const mouseRef = useRef(null);
  const [widths, setWidths] = useState(null);

  // TODO (dang): show arrows to scroll left and right
  useEffect(() => {
    setTimeout(() => {
      setWidths({
        scroll: refScroll?.current?.getBoundingClientRect()?.width || 0,
        tabs: refTabs?.current?.getBoundingClientRect()?.width || 0,
      });
    }, 1);
  }, []);

  const tabsCount = useMemo(() => React.Children.toArray(fileTabs)?.length || 0, [fileTabs]);

  useEffect(() => {
    if (selectedFilePathIndex >= 0) {
      const scrollValue = refScroll?.current?.scrollLeft
      let widthTotal = 0;
      let widthTotalWithoutRight = 0;
      refFileTabs?.current?.slice(0, selectedFilePathIndex + 1)?.forEach((el, idx) => {
        const val = el?.current?.getBoundingClientRect()?.width || 0;
        widthTotal += val
        if (idx <= selectedFilePathIndex - 1) {
          widthTotalWithoutRight += val;
        }
      });

      const {
        width,
      } = refScroll?.current?.getBoundingClientRect() || {
        width: null,
      }

      if (width === null) {
        return;
      }

      // Going right
      const diff = widthTotal - (width + scrollValue);
      if (diff > 0) {
        refScroll?.current?.scrollBy(diff, 0);
      } else if (scrollValue > widthTotalWithoutRight) {
        // Going left
        refScroll?.current?.scrollBy(widthTotalWithoutRight - scrollValue, 0);
      }
    }
  }, [
    selectedFilePathIndex,
    tabsCount,
  ]);

  const fileTabsMemo = useMemo(() => React.Children.toArray(fileTabs)?.map((el, idx: number) => {
    refFileTabs.current[idx] = refFileTabs?.current?.[idx] || createRef();
    const ref = refFileTabs?.current?.[idx];

    return (
      <div key={`file-tab-${idx}`} ref={ref}>
        {el}
      </div>
    );
  }), [fileTabs]);

  function isMouseOnCounts() {
    const {
      left,
      width,
    } = refScroll?.current?.getBoundingClientRect() || {
      left: 0,
      width: 0,
    };

    const isOnLeft = mouseRef?.current?.clientX <= left + (ICON_SIZE * 2);
    if (isOnLeft) {
      countLeftRef.current.style.display = 'none';
    }

    const isOnRight = mouseRef?.current?.clientX >= (left + width) - (ICON_SIZE * 2);
    if (isOnRight) {
      countRightRef.current.style.display = 'none';
    }

    return [isOnLeft, isOnRight];
  }

  function handleMove(e) {
    mouseRef.current = e;
    isMouseOnCounts();
  }

  function onScroll() {
    const {
      width,
    } = refScroll?.current?.getBoundingClientRect() || {
      width: null,
    };
    if (width === null) {
      return;
    }

    const scrollValue = refScroll?.current?.scrollLeft

    const leftItems = [];
    const middleItems = [];
    const rightItems = [];
    const arr = refFileTabs?.current.map((el, idx) => el?.current?.getBoundingClientRect()?.width || 0);

    let acc = 0;
    arr?.forEach((widthEl, idx) => {
      const leftVal = acc;
      const rightVal = acc + widthEl;

      if (rightVal < scrollValue) {
        leftItems.push(idx);
      } else if (leftVal > scrollValue + width) {
        rightItems.push(idx);
      } else {
        middleItems.push(idx);
      }

      acc += widthEl;
    });

    const leftCount = leftItems?.length || 0;
    const rightCount = rightItems?.length || 0;
    const pair = isMouseOnCounts();

    if (countLeftRef?.current) {
      if (leftCount >= 2) {
        if (!pair[0]) {
          countLeftRef.current.style.display = 'block';
        }
        countLeftTextRef.current.innerText = leftCount;
      } else {
        countLeftRef.current.style.display = 'none';
        countLeftTextRef.current.innerText = null;
      }
    }

    if (countRightRef?.current) {
      if (rightCount >= 2) {
        if (!pair[1]) {
          countRightRef.current.style.display = 'block';
        }
        countRightTextRef.current.innerText = rightCount;
      } else {
        countRightRef.current.style.display = 'none';
        countRightTextRef.current.innerText = null;
      }
    }
  }

  useEffect(() => {
    onScroll();

    if (typeof window !== 'undefined') {
      // @ts-ignore
      refScroll?.current?.addEventListener('mousemove', handleMove);
      // @ts-ignore
      refScroll?.current?.addEventListener('scroll', onScroll);
    }

    return () => {
      if (typeof window !== 'undefined') {
        // @ts-ignore
        refScroll?.current?.removeEventListener('mousemove', handleMove);
        // @ts-ignore
        refScroll?.current?.removeEventListener('scroll', onScroll);
      }
    };
  }, []);

  return (
    <>
      <ScrollerStyle ref={refScroll}>
        <ArrowCount ref={countLeftRef}>
          <CountInnerStyle className="count-inner">
            <ChevronLeft size={ICON_SIZE} warning />
            <Circle size={ICON_SIZE} warning>
              <Text bold inverted monospace ref={countLeftTextRef} />
            </Circle>
          </CountInnerStyle>
        </ArrowCount>

        <div
          ref={refTabs}
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
          }}
        >
          {fileTabsMemo}
        </div>

        <ArrowCount ref={countRightRef} right>
          <CountInnerStyle className="count-inner">
            <Circle size={ICON_SIZE} warning>
              <Text bold inverted monospace ref={countRightTextRef} />
            </Circle>
            <ChevronRight size={ICON_SIZE} warning />
          </CountInnerStyle>
        </ArrowCount>
      </ScrollerStyle>

      {children}
    </>
  );
}

export default FileTabsScroller;
