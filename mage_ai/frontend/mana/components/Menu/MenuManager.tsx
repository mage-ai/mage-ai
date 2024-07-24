import React, { useEffect, useContext, useRef, useState, useCallback, useMemo } from 'react';
import { MenuContext } from '@context/v2/Menu';
import { MenuItemType } from '@mana/hooks/useContextMenu';
import { createPortal } from 'react-dom';
import { getAbsoluteRect } from '@mana/shared/utils';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';

type UseMenuManagerProps = {
  contained?: boolean;
  contextMenuRef?: React.MutableRefObject<HTMLDivElement>;
  direction?: LayoutDirectionEnum;
  onClose?: (level: number) => void;
  ref?: React.RefObject<HTMLDivElement>;
  uuid: string;
};

export function useMenuManager({
  contained,
  contextMenuRef,
  direction = LayoutDirectionEnum.LEFT,
  onClose,
  ref,
  uuid,
}: UseMenuManagerProps) {
  const containerInternalRef = useRef<HTMLDivElement | null>(null);
  const containerRef = (ref || containerInternalRef) as React.RefObject<HTMLDivElement>;

  const { portalRef, useMenu } = useContext(MenuContext);
  const { contextMenu, showMenu, hideMenu } = useMenu({
    containerRef,
    uuid,
  });

  const handleToggleMenu = useCallback(
    ({
      items,
      openItems,
    }: {
      items?: MenuItemType[];
      openItems?: {
        column: number;
        row: number;
      }[];
    }) => {
      if ((items?.length ?? 0) > 0) {
        const rectAbsolute = containerRef?.current?.getBoundingClientRect();
        const {
          parents,
          // rect: rectRelative,
        } = getAbsoluteRect(containerRef?.current, { includeParents: true });
        // const parent = parents?.[0];
        // const offset = {
        //   // your absolute - parent absolute
        //   left: rectAbsolute?.left - parent?.left,
        //   top: rectAbsolute?.top - parent?.top,
        // };

        const showOptions = {
          containerRef,
          contextMenuRef,
          direction,
          onClose,
          openItems,
          position: rectAbsolute,
          rects: {
            bounding: {
              height: window.innerHeight,
              left: 0,
              top: 0,
              width: window.innerWidth,
            },
            container: rectAbsolute,
            offset: {
              left: LayoutDirectionEnum.LEFT === direction ? rectAbsolute?.width : 0,
              top: 0,
            },
          },
        };

        showMenu(items, showOptions, uuid);
      } else {
        hideMenu(uuid);
      }
    },
    [containerRef, direction, hideMenu, onClose, showMenu, uuid],
  );

  return {
    containerRef,
    contextMenu,
    handleToggleMenu,
    portalRef,
  };
}

function MenuManager(
  {
    children,
    className,
    contained,
    items,
    open: openProp,
    openItems,
    handleOpen,
    isOpen,
    ...rest
  }: UseMenuManagerProps & {
    children: React.ReactNode;
    className?: string;
    contained?: boolean;
    items?: MenuItemType[];
    open?: boolean;
    openItems?: {
      column: number;
      row: number;
    }[];
    isOpen?: boolean;
    handleOpen?: (value: boolean | ((prev: boolean) => boolean), levelToClose: number) => void;
  },
  ref: React.RefObject<HTMLDivElement>,
) {
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const [openInternal, setOpenState] = useState(openProp);
  const open = useMemo(() => isOpen ?? openInternal, [openInternal, isOpen]);

  const {
    containerRef,
    handleToggleMenu,
    portalRef,
  } = useMenuManager({
    contextMenuRef,
    onClose: (level: number) => {
      if (handleOpen) {
        handleOpen(level === 0, level);
      } else if (level === 0) {
        setOpenState(false);
      }
    },
    ref,
    ...rest,
  });

  useEffect(() => {
    handleToggleMenu({
      items: open ? items : null,
      openItems,
    });
  }, [handleToggleMenu, handleOpen, items, openItems, open]);

  const contextMenu = <div id={`menu-manager-${rest.uuid}`} ref={contextMenuRef} />;

  return (
    <>
      <div
        className={className}
        onClick={event => {
          event.preventDefault();
          if (handleOpen) {
            handleOpen(prev => !prev, 0);
          } else {
            setOpenState(prev => !prev);
          }
        }}
        ref={containerRef}
      >
        {children}
      </div>

      {contained ? createPortal(contextMenu, portalRef.current) : contextMenu}
    </>
  );
}

export default React.forwardRef(MenuManager);
