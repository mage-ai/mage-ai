import React, { createRef, useEffect, useMemo, useState, useRef } from 'react';

import { ScrollerStyle } from './index.style';
import { sum } from '@utils/array';

type FileTabsScrollerProps = {
  children?: any;
  fileTabs?: React.Element[];
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

  return (
    <>
      <ScrollerStyle ref={refScroll}>
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
      </ScrollerStyle>

      {children}
    </>
  );
}

export default FileTabsScroller;
