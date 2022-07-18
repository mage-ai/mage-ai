import React from 'react';

import FlyoutMenu, { FlyoutMenuProps } from './index';

type FlyoutMenuWrapperProps = {
  children: JSX.Element;
  onClickOutside: () => void;
} & FlyoutMenuProps;

function FlyoutMenuWrapper({
  children,
  compact,
  items,
  open,
  onClickOutside,
  parentRef,
  uuid,
}: FlyoutMenuWrapperProps) {
  return (
    <div style={{ position: 'relative' }}>
      <div ref={parentRef}>
        {children}
      </div>
      <FlyoutMenu
        items={items}
        onClickCallback={onClickOutside}
        open={open}
        parentRef={parentRef}
        uuid={uuid}
      />
    </div>
  );
}

export default FlyoutMenuWrapper;
