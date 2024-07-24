import React, { useContext } from 'react';
import { ContextMenuType, ContextMenuProps } from '@mana/hooks/useContextMenu';

export const MenuContext = React.createContext<{
  contextMenu?: any;
  contextMenuRef: ContextMenuType['contextMenuRef'];
  hideMenu: ContextMenuType['hideMenu'];
  portalID: string;
  portalRef: React.RefObject<HTMLDivElement>;
  removeContextMenu: ContextMenuType['removeContextMenu'];
  renderContextMenu: ContextMenuType['renderContextMenu'];
  shouldPassControl: ContextMenuType['shouldPassControl'];
  showMenu: ContextMenuType['showMenu'];
  teardown: ContextMenuType['teardown'];
  useMenu: (kwargs?: any) => {
    contextMenu?: any;
    contextMenuRef: ContextMenuType['contextMenuRef'];
    hideMenu: ContextMenuType['hideMenu'];
    removeContextMenu: ContextMenuType['removeContextMenu'];
    renderContextMenu: ContextMenuType['renderContextMenu'];
    shouldPassControl: ContextMenuType['shouldPassControl'];
    showMenu: ContextMenuType['showMenu'];
    teardown: ContextMenuType['teardown'];
  };
}>({
  contextMenu: null,
  contextMenuRef: null,
  hideMenu: () => null,
  portalID: null,
  portalRef: null,
  removeContextMenu: () => null,
  renderContextMenu: () => null,
  shouldPassControl: () => null,
  showMenu: () => null,
  teardown: () => null,
  useMenu: () => ({
    contextMenu: null,
    contextMenuRef: null,
    hideMenu: () => null,
    removeContextMenu: () => null,
    renderContextMenu: () => null,
    shouldPassControl: () => null,
    showMenu: () => null,
    teardown: () => null,
  }),
});

export const useMenuContext = () => useContext(MenuContext);
