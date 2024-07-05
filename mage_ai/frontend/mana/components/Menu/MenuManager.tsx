import React, { useEffect, useContext, useRef, useState, useCallback, useMemo } from 'react';
import { MenuContext } from '@context/v2/Menu';
import { MenuItemType } from '@mana/hooks/useContextMenu';
import { createPortal } from 'react-dom';
import { getAbsoluteRect } from '@mana/shared/utils';
import { LayoutDirectionEnum } from '@mana/components/Menu/types';

export default function MenuManager({
  children,
  className,
  contained,
  direction = LayoutDirectionEnum.LEFT,
  getItems,
  items,
  open: openProp,
  handleOpen,
  openState,
  uuid,
}: {
  children: React.ReactNode;
  className?: string;
  contained?: boolean;
  direction?: LayoutDirectionEnum;
  getItems?: () => MenuItemType[];
  items?: MenuItemType[];
  open?: boolean;
  openState?: boolean;
  handleOpen?: (value: boolean | ((prev: boolean) => boolean)) => void;
  uuid: string;
}) {
  const {
    portalRef,
    useMenu,
  } = useContext(MenuContext);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { contextMenu, showMenu, hideMenu } = useMenu({
    containerRef,
    uuid,
  });
  const [openInternal, setOpenState] = useState(openProp);
  const open = useMemo(() => openState ?? openInternal, [openInternal, openState]);
  const setOpen = useCallback((prev) => {
    if (handleOpen) {
      handleOpen(prev);
    } else {
      setOpenState(prev);
    }
  }, [handleOpen])

  useEffect(() => {
    if (open) {
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

      showMenu(getItems ? getItems() : items, {
        // contained,
        direction,
        onClose: (level: number) => {
          if (level === 0) {
            // setOpen(false);
            console.log('should close', level)
          }
        },
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
      });
    } else if (!open) {
      hideMenu();
    }
  }, [contained, hideMenu, open, getItems, items, showMenu, direction, setOpen]);

  return (
    <>
      {contained ? contextMenu : createPortal(contextMenu, portalRef.current)}
      <div
        className={className}
        onClick={(event) => {
          event.preventDefault();
          setOpen(prev => !prev);
        }}
        ref={containerRef}
      >
        {children}
      </div>
    </>
  );
}
