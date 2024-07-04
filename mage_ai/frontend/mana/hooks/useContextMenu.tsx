import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';

import DeferredRenderer from '@mana/components/DeferredRenderer';
import Menu from '../components/Menu';
import useKeyboardShortcuts from './shortcuts/useKeyboardShortcuts';
import { KeyEnum } from './shortcuts/types';
import { ClientEventType as ClientEventTypeT } from '../shared/interfaces';
import { MenuItemType as MenuItemTypeT } from '../components/Menu/interfaces';
import { selectKeys } from '@utils/hash';

export type RenderContextMenuOptions = {
  boundingContainer?: DOMRect;
  container?: HTMLElement;
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
}

export type ContextMenuProps = {
  container?: HTMLDivElement;
  useAsStandardMenu?: boolean;
  uuid: string;
};

export default function useContextMenu({
  container,
  useAsStandardMenu,
  uuid,
}: ContextMenuProps): ContextMenuType {
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRootRef = useRef<Root | null>(null);
  const itemsRef = useRef<MenuItemType[]>(null);
  const positionRef = useRef<number[]>(null);
  const themeContext = useContext(ThemeContext);

  const rootID = useMemo(() => `context-menu-root-${uuid}`, [uuid]);

  const { deregisterCommands, registerCommands } = useKeyboardShortcuts({
    target: contextMenuRootRef,
  });

  function isEventInContainer(event: ClientEventType, containerArg?: HTMLElement): boolean {
    return (container || containerArg)?.contains(event.target as Node);
  }

  function isEventInContextMenu(event: ClientEventType): boolean {
    return contextMenuRef?.current?.contains(event.target as Node);
  }

  function shouldPassControl(event: ClientEventType) {
    return event.button === 2 && isEventInContainer(event);
  }

  function removeContextMenu(event: ClientEventType, opts?: { conditionally?: boolean }) {
    if (opts?.conditionally && isEventInContextMenu(event)) return;

    if (contextMenuRootRef?.current) {
      contextMenuRootRef.current.unmount();
      contextMenuRootRef.current = null;
    }

    itemsRef.current = null;
    positionRef.current = [null];
    deregisterCommands();
  }

  function filterItems(items: MenuItemType[]): MenuItemType[] {
    return items?.filter(({ divider, onClick }: MenuItemType) => !divider && onClick);
  }

  function getCurrentItem(): {
    item: MenuItemType;
    items: MenuItemType[];
  } {
    if (!itemsRef?.current) return;

    let item = null;
    let items = filterItems(itemsRef?.current ? itemsRef?.current : []);

    positionRef?.current?.forEach((y: number, x: number) => {
      if (y === null) {
        item = null;
        return;
      }

      if (x >= 1 && item?.items?.length >= 1) {
        const arr = filterItems(item?.items ?? []);
        if (arr?.length >= 1) {
          items = arr;
        }
      }
      item = items?.[y];
    });

    return {
      item,
      items,
    };
  }

  function handlePositionChange({ x, y }: { x?: number; y?: number }) {
    const { item, items } = getCurrentItem();

    if (x ?? false) {
      if (x < 0 && positionRef.current.length >= 2) {
        positionRef.current.pop();
      } else if (x > 0) {
        const ycur = positionRef.current[positionRef.current.length - 1];
        const icur = items?.[ycur];
        if (icur?.items?.length >= 1) {
          positionRef.current.push(null);
        }
      }
    }

    if (y ?? false) {
      let yNew =
        positionRef.current[positionRef.current.length - 1] ??
        (y > 0 ? -1 : item?.items?.length ?? 0);
      yNew += y;

      const count = items?.length ?? 0;
      if (yNew < 0) {
        yNew = 0;
      } else if (count >= 1 && yNew >= count) {
        yNew = count - 1;
      }

      positionRef.current[positionRef.current.length - 1] = yNew;
    }
  }

  function renderContextMenu(
    event: ClientEventType,
    items: MenuItemType[],
    opts?: RenderContextMenuOptions,
  ) {
    const {
      boundingContainer,
      container: container2,
    } = opts ?? {};

    console.log(event, items, opts, !container2, container && !isEventInContainer(event))

    if (!container2 && (container && !isEventInContainer(event))) return;

    event?.preventDefault();

    if (!contextMenuRootRef?.current && contextMenuRef.current) {
      const node = contextMenuRef.current;
      if (node) {
        contextMenuRootRef.current = createRoot(node as any);
      }
    }

    if (!contextMenuRootRef?.current) return;

    contextMenuRootRef.current.render(
      <DeferredRenderer idleTimeout={1}>
        <ThemeProvider theme={themeContext}>
          <Menu
            event={event}
            items={items}
            parentContainer={container2}
            parentItemsElementRef={contextMenuRef}
            openAtPosition={!container2
              ? {
                left: event?.pageX,
                top: event?.pageY,
              }
              : undefined
            }
            originalBoundingContainer={boundingContainer
              ?? selectKeys(container?.getBoundingClientRect() || {}, ['width', 'x', 'y'])
            }
            small
            standardMenu={useAsStandardMenu}
            uuid={uuid}
          />
        </ThemeProvider>
      </DeferredRenderer>,
    );

    itemsRef.current = items;
    positionRef.current = [null];
    registerCommands({
      down: {
        handler: () => handlePositionChange({ y: 1 }),
        predicate: { key: KeyEnum.ARROWDOWN },
      },
      enter: {
        handler: () => {
          const handle = getCurrentItem()?.item?.onClick;
          handle && handle?.();
        },
        predicate: { key: KeyEnum.ENTER },
      },
      left: {
        handler: () => handlePositionChange({ x: -1 }),
        predicate: { key: KeyEnum.ARROWLEFT },
      },
      right: {
        handler: () => handlePositionChange({ x: 1 }),
        predicate: { key: KeyEnum.ARROWRIGHT },
      },
      up: {
        handler: () => handlePositionChange({ y: -1 }),
        predicate: { key: KeyEnum.ARROWUP },
      },
    });
  }

  useEffect(() => {
    const handleDocumentClick = (event: any) => {
      const node = document.getElementById(rootID);
      if (node && !node?.contains(event.target as Node)) {
        removeContextMenu(event);
      }
    };

    document?.addEventListener('click', handleDocumentClick);

    const menuRoot = contextMenuRootRef?.current;
    return () => {
      document?.removeEventListener('click', handleDocumentClick);
      menuRoot && menuRoot.unmount();
      contextMenuRootRef.current = null;
      deregisterCommands();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useAsStandardMenu]);

  return {
    contextMenu: <div ref={contextMenuRef} />,
    removeContextMenu,
    renderContextMenu,
    shouldPassControl,
  };
}
