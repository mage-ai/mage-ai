import Menu, { MenuProps } from '../components/Menu';
import React, { useContext, useEffect, useMemo, useRef } from 'react';
import useKeyboardNavigation from './useKeyboardNavigation';
import { CustomKeyboardEvent } from '../events/interfaces';
import { ClientEventType as ClientEventTypeT } from '../shared/interfaces';
import { MenuItemType as MenuItemTypeT } from '../components/Menu/interfaces';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';

export type RenderContextMenuOptions = {
  contained?: boolean;
  direction?: MenuProps['direction'];
  onClose?: MenuProps['onClose'];
  openItems?: MenuProps['openItems'];
  position?: MenuProps['position'];
  rects?: MenuProps['rects'];
};

export type RenderContextMenuType = (
  event: ClientEventTypeT,
  items?: MenuItemTypeT[],
  opts?: RenderContextMenuOptions,
) => void;
export type RemoveContextMenuType = (
  event: ClientEventTypeT,
  opts?: { conditionally?: boolean },
) => void;

export type MenuItemType = MenuItemTypeT;
export type ClientEventType = ClientEventTypeT;

export interface ContextMenuType {
  contextMenu: JSX.Element;
  removeContextMenu: RemoveContextMenuType;
  renderContextMenu: RenderContextMenuType;
  shouldPassControl: (event: ClientEventType) => boolean;
  showMenu: (items: MenuItemType[], opts?: RenderContextMenuOptions) => void;
  hideMenu: () => void;
  teardown: () => void;
}

export type ContextMenuProps = {
  container?: HTMLDivElement;
  containerRef?: React.RefObject<HTMLDivElement>;
  useAsStandardMenu?: boolean;
  uuid: string;
};

function keyboardNavigationItemFilter(item: MenuItemType): boolean {
  return !item?.divider && (!!item?.onClick || item?.items?.length >= 1);
}
export default function useContextMenu({
  container,
  containerRef,
  useAsStandardMenu,
  uuid,
}: ContextMenuProps): ContextMenuType {
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRootRef = useRef<Root | null>(null);

  const {
    itemsRef,
    registerItems,
    resetPosition,
  } = useKeyboardNavigation({
    itemFilter: keyboardNavigationItemFilter,
    target: contextMenuRootRef,
  })

  const themeContext = useContext(ThemeContext);

  const getContainer = () => containerRef?.current ?? container;

  const rootID = useMemo(() => `context-menu-root-${uuid}`, [uuid]);

  function isEventInContainer(event: ClientEventType, containerArg?: HTMLElement): boolean {
    return event && (getContainer() || containerArg)?.contains(event.target as Node);
  }

  function isEventInContextMenu(event: ClientEventType): boolean {
    return contextMenuRef?.current?.contains(event.target as Node);
  }

  function shouldPassControl(event: ClientEventType) {
    return event.button === 2 && event && isEventInContainer(event);
  }

  function hideMenu() {
    contextMenuRootRef?.current?.render([])
  }

  function showMenu(
    items: MenuItemType[],
    opts?: RenderContextMenuOptions,
  ) {
    renderContextMenu(
      null,
      items ?? itemsRef.current,
      opts,
    );
  }

  function removeContextMenu(event: ClientEventType, opts?: { conditionally?: boolean }) {
    if (opts?.conditionally && event && isEventInContextMenu(event)) return;

    if (contextMenuRootRef?.current) {
      contextMenuRootRef.current.unmount();
      contextMenuRootRef.current = null;
    }

    itemsRef.current = null;
    resetPosition();
  }

  function renderContextMenu(
    event: ClientEventType,
    items: MenuItemType[],
    opts?: RenderContextMenuOptions,
  ) {
    const {
      contained,
      position,
    } = opts ?? {};

    if (!contained && (getContainer() && event && !isEventInContainer(event))) return;

    event?.preventDefault();

    const render = (root: Root) => root.render(
      <ThemeProvider theme={themeContext}>
        {/* @ts-ignore */}
        <Menu
          {...opts}
          contained={contained}
          event={event}
          items={items}
          keyboardNavigationItemFilter={keyboardNavigationItemFilter}
          position={position ?? {
            left: event?.pageX,
            top: event?.pageY,
          }}
          small
          standardMenu={useAsStandardMenu}
          uuid={uuid}
        />
      </ThemeProvider>
    );

    if (!contextMenuRootRef?.current) {
      contextMenuRootRef.current = createRoot(contextMenuRef.current as any);
    }
    render(contextMenuRootRef.current);

    registerItems(items);
  }

  function teardown() {
    const menuRoot = contextMenuRootRef?.current;
    menuRoot && menuRoot.unmount();
    contextMenuRootRef.current = null;
  }

  useEffect(() => {
    const handleDocumentClick = (event: any) => {
      const node = document.getElementById(rootID);
      if (node && !node?.contains(event.target as Node)) {
        removeContextMenu(event);
      }
    };

    document?.addEventListener('click', handleDocumentClick);

    return () => {
      document?.removeEventListener('click', handleDocumentClick);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useAsStandardMenu]);

  return {
    contextMenu: <div ref={contextMenuRef} />,
    hideMenu,
    removeContextMenu,
    renderContextMenu,
    shouldPassControl,
    showMenu,
    teardown,
  };
}
