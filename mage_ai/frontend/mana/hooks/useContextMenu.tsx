import Menu, { MenuProps } from '../components/Menu';
import React, { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import useKeyboardNavigation from './useKeyboardNavigation';
import { KeyEnum } from '../events/enums';
import { MenuItemType as MenuItemTypeT } from '../components/Menu/interfaces';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';

const DEBUG = false;

export type RenderContextMenuOptions = {
  contained?: any;
  contextMenuRef?: React.MutableRefObject<HTMLDivElement>;
  containerRef?: React.MutableRefObject<HTMLDivElement>;
  direction?: any;
  handleEscape?: any;
  onClose?: any;
  openItems?: any;
  position?: any;
  rects?: any;
  reduceItems?: any;
  uuid?: string;
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
  contextMenu?: any;
  contextMenuRef: React.MutableRefObject<HTMLDivElement>;
  removeContextMenu: any;
  renderContextMenu: any;
  shouldPassControl: any;
  showMenu: (items: MenuItemType[], opts?: RenderContextMenuOptions, uuid?: string) => void;
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
  containerRef: containerRefBase,
  useAsStandardMenu,
  uuid: uuidBase,
}: ContextMenuProps): ContextMenuType {
  const activeRef = useRef<string>(null);
  const activeContainerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const renderContextMenuOptionsRef = useRef<Record<string, RenderContextMenuOptions>>({});

  const menuRefs = useRef<Record<string, React.MutableRefObject<HTMLDivElement>>>({
    [uuidBase]: contextMenuRef,
  });
  const menuRootRefs = useRef<Record<string, Root>>({
    [uuidBase]: null,
  });
  const menuItemsRefs = useRef<Record<string, MenuItemType[]>>({
    [uuidBase]: null,
  });
  const containerRefs = useRef<Record<string, React.MutableRefObject<HTMLDivElement>>>({
    [uuidBase]: containerRefBase,
  });

  const { itemsRef, registerItems, resetPosition } = useKeyboardNavigation({
    itemFilter: keyboardNavigationItemFilter,
    target: containerRefBase,
  });

  const themeContext = useContext(ThemeContext);

  const getContainer = (uuid: string) => containerRefs?.current?.[uuid]?.current ?? container;

  function isEventInContainer(event: ClientEventType, containerArg?: HTMLElement, uuid?: string): boolean {
    return event && (containerArg ?? getContainer(uuid ?? uuidBase))?.contains(event.target as Node);
  }

  function isEventInContextMenu(event: ClientEventType, contextMenu?: HTMLDivElement, uuid?: string): boolean {
    return event && (contextMenu ?? menuRefs?.current?.[uuid ?? uuidBase]?.current)?.contains(event.target as Node);
  }

  function shouldPassControl(event: ClientEventType, uuid?: string) {
    return event.button === 2 && event && isEventInContainer(event, null, uuid);
  }

  function hideMenu(uuid?: string) {
    DEBUG && console.log('HIDE', uuid, menuRootRefs?.current?.[uuid])
    menuRootRefs?.current?.[uuid ?? uuidBase]?.render([]);
  }

  function showMenu(items?: MenuItemType[], opts?: RenderContextMenuOptions, uuid?: string) {
    renderContextMenu(null, items ?? itemsRef.current, {
      ...opts,
      uuid,
    });
  }

  function removeContextMenu(event: ClientEventType, opts?: {
    conditionally?: boolean;
  }, uuid?: string) {
    const id = uuid ?? uuidBase;
    DEBUG && console.log('REMOVE', id)

    if (opts?.conditionally && event && isEventInContextMenu(event, null, id)) return;

    const menuRoot = menuRootRefs?.current?.[id];
    if (menuRoot) {
      menuRoot.render();
    }

    // DO NOT DO THIS
    // delete menuRootRefs.current[id];

    activeRef.current = null;
    activeContainerRef.current = null;

    resetPosition();
  }

  function renderContextMenu(
    event: ClientEventType,
    items: MenuItemType[],
    opts?: RenderContextMenuOptions,
  ) {
    const {
      contained,
      containerRef,
      contextMenuRef,
      handleEscape,
      openItems,
      position,
      uuid,
    } = opts ?? {};
    const id = uuid ?? uuidBase;

    activeRef.current && hideMenu(activeRef.current);
    uuid && hideMenu(uuid);
    hideMenu(uuidBase);
    activeRef.current && removeContextMenu(event, null, activeRef.current);
    uuid && removeContextMenu(event, null, uuid);
    removeContextMenu(event, null, uuidBase);

    if (uuid) {
      containerRefs.current[uuid] = containerRef;
      menuRefs.current[uuid] = contextMenuRef;
    }

    if (!contained && event && !isEventInContainer(event, null, id)) return;

    event && event?.preventDefault();

    activeRef.current = id;
    activeContainerRef.current = getContainer(id);
    renderContextMenuOptionsRef.current[id] = {
      contained,
      handleEscape,
      position,
    };

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
            uuid={id}
          />
        </ThemeProvider>,
      );

    const menuElement = menuRefs.current?.[id]?.current ?? menuRefs.current[uuidBase]?.current;

    menuRootRefs.current[id] = createRoot(menuElement as any);
    // if (!menuRootRefs.current[id]) {
    // }

    DEBUG && console.log(
      'useContextMenu.renderContextMenu',
      'id', id,
      'uuid', uuid,
      'opts', opts,
      'root', menuRootRefs.current[id],
      'contextMenuRef.current', contextMenuRef?.current,
      'menuElement', menuElement,
    )

    menuItemsRefs.current[uuid] = items;
    render(menuRootRefs.current[id]);

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

  function teardown(uuid?: string) {
    const uuids = uuid ? [uuid] : Object.keys(menuRootRefs.current);

    uuids.forEach((id) => {
      const menuRoot = menuRootRefs.current?.[id];
      menuRoot && menuRoot.unmount();

      delete containerRefs.current[id];
      delete menuItemsRefs.current[id];
      delete menuRefs.current[id];
      delete menuRootRefs.current[id];
    });
  }

  useEffect(() => {
    const handleDocumentClick = (event: any) => {
      Object.keys(menuRefs.current ?? {}).forEach(id => {
        const menuRef = menuRefs.current?.[id];
        const containerRef = containerRefs.current?.[id];
        const contained = renderContextMenuOptionsRef.current?.[id]?.contained;

        DEBUG && console.log(
          'userContextMenu.handleDocumentClick',
          'id', id,
          'contained.option', contained,
          'container', containerRef.current,
          'container contains event', containerRef.current?.contains(event.target as Node),
          'menuRef', menuRef,
          'menu contains event', menuRef?.current?.contains(event.target as Node),
        );

        if ([
          menuRef?.current,
          contained ? containerRef.current : null,
        ].filter(Boolean).every(node => !node?.contains(event.target as Node))) {
          removeContextMenu(event, null, id);
        }
      });
    };

    document?.addEventListener('click', handleDocumentClick);

    return () => {
      document?.removeEventListener('click', handleDocumentClick);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useAsStandardMenu]);

  return {
    contextMenuRef: menuRefs.current[uuidBase],
    hideMenu,
    removeContextMenu,
    renderContextMenu,
    shouldPassControl,
    showMenu,
    teardown,
  };
}
