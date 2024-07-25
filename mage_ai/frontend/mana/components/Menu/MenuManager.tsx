import React, { createRef, useEffect, useContext, useRef, useState, useCallback, useMemo } from 'react';
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
  direction,
  onClose,
  ref,
  uuid,
}: UseMenuManagerProps) {
  const containerInternalRef = useRef<HTMLDivElement | null>(null);
  const containerRef = (ref || containerInternalRef) as React.RefObject<HTMLDivElement>;

  const { portalRef, useMenu } = useContext(MenuContext);
  const { contextMenu, showMenu, hideMenu, teardown } = useMenu({
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
        const rectc = containerRef?.current?.getBoundingClientRect();
        const rectAbsolute = {
          height: rectc?.height,
          left: rectc?.left,
          top: rectc?.top,
          width: rectc?.width,
        };
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

        // console.log(
        //   'MenuManager.handleToggleMenu',
        //   containerRef?.current,
        //   containerRef?.current?.getBoundingClientRect(),
        //   rectAbsolute,
        // )

        const showOptions = {
          contained,
          containerRef,
          contextMenuRef,
          direction,
          handleEscape: () => hideMenu(uuid),
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
    [contained, containerRef, direction, hideMenu, onClose, showMenu, uuid],
  );

  return {
    containerRef,
    contextMenu,
    handleToggleMenu,
    portalRef,
    teardown,
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
  const phaseRef = useRef(0);
  const [contextMenuRef, setContextMenuRef] = useState<React.MutableRefObject<HTMLDivElement | null>>(createRef());

  const {
    containerRef,
    handleToggleMenu,
    portalRef,
    teardown,
  } = useMenuManager({
    contained,
    contextMenuRef,
    ref,
    ...rest,
  });

  // useEffect(() => {
  //   const phase = phaseRef.current;

  //   if (phase === 0 && contextMenuRef.current === null) {
  //     setContextMenuRef(createRef());
  //   }

  //   phaseRef.current += 1;
  //   return () => {
  //     if (phase > 0) {
  //       console.log('MenuManager.teardown', contextMenuRef.current, rest?.uuid, phase);
  //       teardown();
  //       phaseRef.current = 0;
  //     }
  //   };
  // }, []);

  const contextMenu = <div id={`menu-manager-${rest.uuid}`} ref={contextMenuRef} style={contained ? {
    position: 'absolute',
  } : {}} />;

  return (
    <div style={{ position: 'relative' }}>
      <div
        className={className}
        onClick={event => {
          event.preventDefault();
          event.stopPropagation();
          // console.log('MenuManager.onClick', items);
          handleToggleMenu({
            items,
            openItems,
          });
        }}
        ref={containerRef}
      >
        {children}
      </div>

      {contained
        ? contextMenu
        : createPortal(contextMenu, portalRef.current)
      }
    </div>
  );
}

export default React.forwardRef(MenuManager);
