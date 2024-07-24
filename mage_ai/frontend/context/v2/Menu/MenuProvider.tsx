import { createRef, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { MenuContext } from './MenuContext';
import useContextMenu, { ClientEventType, MenuItemType, ContextMenuType, RenderContextMenuOptions } from '@mana/hooks/useContextMenu';

export const MENU_CONTEXT_PORTAL_ID = 'menu-context-portal';

interface MenuProviderProps {
  children: React.ReactNode;
}

export const MenuProvider = ({ children }: MenuProviderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contextMenuRefs = useRef<Record<string, React.MutableRefObject<HTMLDivElement>>>({});
  const portalRef = useRef<HTMLDivElement>(null);
  const uuidShared = 'SharedMenuProvider';

  const {
    contextMenuRef,
    removeContextMenu,
    renderContextMenu,
    shouldPassControl,
    showMenu,
    hideMenu,
    teardown,
  } = useContextMenu({
    containerRef,
    useAsStandardMenu: false,
    uuid: uuidShared,
  });

  const contextMenuID = ['context-menu', uuidShared].join(':');
  const portalID = [MENU_CONTEXT_PORTAL_ID, uuidShared].join(':');
  const contextMenuNode = <div id={contextMenuID} ref={contextMenuRef} />;

  function useMenu(opts?: any) {
    const {
      containerRef,
      contextMenuRef,
      uuid,
    } = opts ?? {};

    if (uuid) {
      contextMenuRefs.current[uuid] ||= contextMenuRef ?? createRef<HTMLDivElement>();
    }

    function __renderContextMenu(
      event: ClientEventType,
      items: MenuItemType[],
      opts?: RenderContextMenuOptions,
    ) {
      renderContextMenu(event, items, {
        ...opts,
        containerRef,
        contextMenuRef: contextMenuRefs.current[uuid],
        uuid,
      });
    }

    function __removeContextMenu(
      event: ClientEventType,
      opts?: {
        conditionally?: boolean;
      },
    ) {
      removeContextMenu(event, opts, uuid);
    }

    function __teardown() {
      teardown(uuid);
    }

    function __showMenu(items: MenuItemType[], opts?: RenderContextMenuOptions) {
      showMenu(items, opts, uuid);
    }

    function __hideMenu() {
      hideMenu(uuid);
    }

    function ContextMenuPortal() {
      return <>{createPortal(contextMenuNode, portalRef.current)}</>
    }

    return {
      contextMenu: ContextMenuPortal,
      contextMenuRef: uuid
        ? contextMenuRefs.current[uuid]
        : null,
      hideMenu: __hideMenu,
      removeContextMenu: __removeContextMenu,
      renderContextMenu: __renderContextMenu,
      shouldPassControl,
      showMenu: __showMenu,
      teardown: __teardown,
    };
  }

  return (
    <MenuContext.Provider
      value={{
        contextMenuRef,
        hideMenu,
        portalID,
        portalRef,
        removeContextMenu,
        renderContextMenu,
        shouldPassControl,
        showMenu,
        teardown,
        useMenu,
      }}
    >
      <div ref={containerRef}>
        {children}
      </div>

      {contextMenuNode}
      <div id={portalID} ref={portalRef} />
    </MenuContext.Provider>
  );
};
