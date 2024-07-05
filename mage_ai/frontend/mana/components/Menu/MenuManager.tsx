import React, { useEffect, useContext, useRef } from 'react';
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
  items,
  open: openProp,
  uuid,
}: {
  children: React.ReactNode;
  className?: string;
  contained?: boolean;
  direction?: LayoutDirectionEnum;
  items: MenuItemType[];
  open?: boolean;
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
  const [open, setOpen] = React.useState(openProp);

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

      showMenu(items, {
        // contained,
        direction,
        onClose: (level: number) => {
          if (level === 0) {
            hideMenu();
            setOpen(false);
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
  }, [contained, hideMenu, open, items, showMenu, direction]);

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
