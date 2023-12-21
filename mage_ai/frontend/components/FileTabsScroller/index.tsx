import { useEffect, useState, useRef } from 'react';

import { ScrollerStyle } from './index.style';

function FileTabsScroller({
  children,
  widthOffset,
}) {
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
    <ScrollerStyle ref={refScroll} widthOffset={widthOffset}>
      <div ref={refTabs}>
        {children}
      </div>
    </ScrollerStyle>
  );
}

export default FileTabsScroller;
