import Menu, { MenuProps } from '../components/Menu';
import React, { useContext, useEffect, useMemo, useRef } from 'react';
import useKeyboardNavigation from './useKeyboardNavigation';
import { KeyEnum } from '../events/enums';
import { MenuItemType as MenuItemTypeT } from '../components/Menu/interfaces';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';

export type RenderContextMenuOptions = {
  contained?: any;
  direction?: any;
  handleEscape?: any;
  onClose?: any;
  openItems?: any;
  position?: any;
  rects?: any;
  reduceItems?: any;
};

export type RenderContextMenuType = (
  event: any,
  items?: any,
  opts?: any,
) => void;
export type RemoveContextMenuType = (
  event: any,
  opts?: any,
) => void;

export type MenuItemType = any;
export type ClientEventType = any;

export interface ContextMenuType {
  contextMenu: JSX.Element;
  removeContextMenu: any;
  renderContextMenu: any;
  shouldPassControl: any;
  showMenu: any;
  hideMenu: any;
  teardown: any;
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

  const { itemsRef, registerItems, resetPosition } = useKeyboardNavigation({
    itemFilter: keyboardNavigationItemFilter,
    target: contextMenuRootRef,
  });

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
    contextMenuRootRef?.current?.render([]);
  }

  function showMenu(items: MenuItemType[], opts?: RenderContextMenuOptions) {
    renderContextMenu(null, items ?? itemsRef.current, opts);
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
    const { contained, handleEscape, openItems, position } = opts ?? {};

    if (!contained && getContainer() && event && !isEventInContainer(event)) return;

    event?.preventDefault();

    // console.log(event?.pageX, event?.pageY, opts)

    const render = (root: Root) =>
      root.render(
        <ThemeProvider theme={themeContext}>
          {/* @ts-ignore */}
          <Menu
            {...opts}
            contained={contained}
            event={event}
            items={items}
            keyboardNavigationItemFilter={keyboardNavigationItemFilter}
            openItems={openItems}
            position={
              position ?? {
                left: event?.pageX,
                top: event?.pageY,
              }
            }
            small
            standardMenu={useAsStandardMenu}
            uuid={uuid}
          />
        </ThemeProvider>,
      );

    if (!contextMenuRootRef?.current) {
      contextMenuRootRef.current = createRoot(contextMenuRef.current as any);
    }
    render(contextMenuRootRef.current);

    registerItems(items, {
      ...(openItems
        ? {
            position: openItems?.map(({ row }) => row),
          }
        : {}),
      ...(handleEscape
        ? {
            commands: {
              escape: {
                handler: handleEscape,
                predicate: { key: KeyEnum.ESCAPE },
              },
            },
          }
        : {}),
    });
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
