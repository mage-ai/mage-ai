import ClickOutside from '@oracle/components/ClickOutside';
import FlyoutMenu, { FlyoutMenuProps } from './index';

type FlyoutMenuWrapperProps = {
  children: JSX.Element;
  onClickOutside: () => void;
} & FlyoutMenuProps;

function FlyoutMenuWrapper({
  children,
  items,
  open,
  onClickOutside,
  parentRef,
  uuid,
}: FlyoutMenuWrapperProps) {
  return (
    <ClickOutside
      onClickOutside={onClickOutside}
      open
    >
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
    </ClickOutside>
  );
}

export default FlyoutMenuWrapper;
