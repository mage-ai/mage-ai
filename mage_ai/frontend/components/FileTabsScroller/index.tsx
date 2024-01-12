import { useEffect, useState, useRef } from 'react';

import { ScrollerStyle } from './index.style';

type FileTabsScrollerProps = {
  children?: any;
  widthOffset?: number;
};

function FileTabsScroller({
  children,
  widthOffset,
}: FileTabsScrollerProps) {
  const refScroll = useRef(null);
  const refTabs = useRef(null);

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

  return (
    <ScrollerStyle ref={refScroll}>
      <div
        ref={refTabs}
        style={{
          height: '100%',
        }}
      >
        {children}
      </div>
    </ScrollerStyle>
  );
}

export default FileTabsScroller;
