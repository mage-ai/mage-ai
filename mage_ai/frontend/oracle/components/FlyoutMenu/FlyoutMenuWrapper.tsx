import React from 'react';

import ClickOutside from '@oracle/components/ClickOutside';
import FlyoutMenu, { FlyoutMenuProps } from './index';

type FlyoutMenuWrapperProps = {
  children: JSX.Element;
  onClickCallback: () => void;
  onClickOutside?: () => void;
} & FlyoutMenuProps;

function FlyoutMenuWrapper({
  children,
  compact,
  items,
  open,
  onClickCallback,
  onClickOutside,
  parentRef,
  uuid,
}: FlyoutMenuWrapperProps) {
  const flyoutMenuEl = (
    <div
      style={{
        position: 'relative',
        zIndex: onClickOutside ? 3 : 2,
      }}
    >
      <div ref={parentRef}>
        {children}
      </div>
      <FlyoutMenu
        compact={compact}
        items={items}
        onClickCallback={onClickCallback}
        open={open}
        parentRef={parentRef}
        uuid={uuid}
      />
    </div>
  );

  return (onClickOutside
    ?
      <ClickOutside
        onClickOutside={onClickOutside}
        open
      >
        {flyoutMenuEl}
      </ClickOutside>
    :
      flyoutMenuEl
  );
}

export default FlyoutMenuWrapper;
