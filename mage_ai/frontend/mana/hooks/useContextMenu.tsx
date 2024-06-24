import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';

import DeferredRenderer from '@mana/components/DeferredRenderer';
import Menu from '../components/Menu';
import { ClientEventType as ClientEventTypeT } from '../shared/interfaces';
import { MenuItemType as MenuItemTypeT } from '../components/Menu/interfaces';
import { selectKeys } from '@utils/hash';

export type CloseContextMenuType = (event: ClientEventTypeT, opts?: { conditionally?: boolean }) => void;
export type RenderContextMenuType = (event: ClientEventTypeT, items: MenuItemTypeT[]) => void;
export type RemoveContextMenuType = (event: ClientEventTypeT) => void;

export type MenuItemType = MenuItemTypeT;
export type ClientEventType = ClientEventTypeT;

export default function useContextMenu({
  container,
  uuid,
}: {
  container: React.MutableRefObject<HTMLDivElement | null>;
  uuid: string;
}): {
  closeContextMenu: CloseContextMenuType;
  contextMenu: JSX.Element;
  renderContextMenu: RenderContextMenuType;
  removeContextMenu: RemoveContextMenuType;
  shouldPassControl: (event: ClientEventType) => boolean;
} {
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const contextMenuRootRef = useRef<Root | null>(null);
  const themeContext = useContext(ThemeContext);

  const rootID = useMemo(() => `context-menu-root-${uuid}`, [uuid]);

  function isEventInContainer(event: ClientEventType): boolean {
    return container?.current?.contains(event.target as Node);
  }

  function isEventInContextMenu(event: ClientEventType): boolean {
    return contextMenuRef?.current?.contains(event.target as Node);
  }

  function shouldPassControl(event: ClientEventType) {
    return event.button === 2 && isEventInContainer(event);
  }

  function removeContextMenu(_event: ClientEventType) {
    if (contextMenuRootRef?.current) {
      contextMenuRootRef.current.unmount();
      contextMenuRootRef.current = null;
    }
  }

  function closeContextMenu(event: ClientEventType, opts?: { conditionally?: boolean }) {
    if (opts?.conditionally && isEventInContextMenu(event)) return;

    removeContextMenu(event);
  }

  function renderContextMenu(event: ClientEventType, items: MenuItemType[]) {
    if (!container?.current || !isEventInContainer(event)) return;

    event.preventDefault();

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
            boundingContainer={selectKeys(
              container?.current?.getBoundingClientRect() || {},
              ['width', 'x', 'y'],
            )}
            event={event}
            items={items}
            small
            uuid={uuid}
          />
        </ThemeProvider>
      </DeferredRenderer>,
    );
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
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    closeContextMenu,
    contextMenu: <div ref={contextMenuRef} />,
    removeContextMenu,
    renderContextMenu,
    shouldPassControl,
  };
}
