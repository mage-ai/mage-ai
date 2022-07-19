import ClickOutside from '@oracle/components/ClickOutside';
import FlyoutMenu, { FlyoutMenuProps } from './index';

type FlyoutMenuClickOutsideProps = {
  children: JSX.Element;
  onClickOutside: () => void;
} & FlyoutMenuProps;

function FlyoutMenuClickOutside({
  children,
  compact,
  items,
  open,
  onClickOutside,
  parentRef,
  uuid,
}: FlyoutMenuClickOutsideProps) {
  return (
    <ClickOutside
      onClickOutside={onClickOutside}
      open
    >
      <div style={{
        position: 'relative',
        zIndex: 100,
      }}>
        <div ref={parentRef}>
          {children}
        </div>
        <FlyoutMenu
          compact={compact}
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

export default FlyoutMenuClickOutside;
