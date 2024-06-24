import React, { LegacyRef, useContext, useEffect, useMemo, useRef } from 'react';
import { ThemeContext, ThemeProvider } from 'styled-components';
import { createRoot, Root } from 'react-dom/client';

import DeferredRenderer from '@mana/components/DeferredRenderer';
import Menu from '../components/Menu';
import { ClientEventType } from '../shared/interfaces';
import { MenuItemType } from '../components/Menu/interfaces';
import { selectKeys } from '@utils/hash';

export default function useContextMenu({
  container,
  uuid,
}: {
  container: React.MutableRefObject<HTMLDivElement | null>;
  uuid: string;
}): {
  contextMenu: JSX.Element;
  renderContextMenu: (event: ClientEventType, items: MenuItemType[]) => void;
  removeContextMenu: (event: ClientEventType) => void;
} {
  const contextMenuRef = useRef<React.MutableRefObject<LegacyRef<HTMLDivElement>>>(null);
  const contextMenuRootRef = useRef<Root | null>(null);
  const themeContext = useContext(ThemeContext);

  const rootID = useMemo(() => `context-menu-root-${uuid}`, [uuid]);

  function removeContextMenu(_event: ClientEventType) {
    if (contextMenuRootRef?.current) {
      contextMenuRootRef.current.unmount();
      contextMenuRootRef.current = null;
    }
  }

  function renderContextMenu(event: ClientEventType, items: MenuItemType[]) {

    console.log('WTFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',!container?.current?.contains(event.target as Node), !contextMenuRootRef?.current);
    if (!container?.current || !container?.current?.contains(event.target as Node)) return;

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
        console.log('RRRRRRRRRRRRRRRRRRRRRRRRRRRRRRR');
        removeContextMenu(event);
      }
    };

    document?.addEventListener('click', handleDocumentClick);

    const menuRoot = contextMenuRootRef?.current;
    return () => {
      menuRoot && menuRoot.unmount();
      document?.removeEventListener('click', handleDocumentClick);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    contextMenu: <div ref={(contextMenuRef as unknown) as LegacyRef<HTMLDivElement>} />,
    removeContextMenu,
    renderContextMenu,
  };
}
