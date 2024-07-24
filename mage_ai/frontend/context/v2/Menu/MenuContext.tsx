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
  useMenu: (kwargs?: any) => {
    contextMenu?: any;
    contextMenuRef: ContextMenuType['contextMenuRef'];
    removeContextMenu: ContextMenuType['removeContextMenu'];
    renderContextMenu: ContextMenuType['renderContextMenu'];
    shouldPassControl: ContextMenuType['shouldPassControl'];
    showMenu: ContextMenuType['showMenu'];
    hideMenu: ContextMenuType['hideMenu'];
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
  useMenu: () => ({
    contextMenu: null,
    contextMenuRef: null,
    removeContextMenu: () => null,
    renderContextMenu: () => null,
    shouldPassControl: () => null,
    showMenu: () => null,
    hideMenu: () => null,
  }),
});

export const useMenuContext = () => useContext(MenuContext);
