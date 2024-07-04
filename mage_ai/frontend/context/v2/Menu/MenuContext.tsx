import React, { useContext } from 'react';
import { ContextMenuType, ContextMenuProps } from '@mana/hooks/useContextMenu';

export const MenuContext = React.createContext<{
  portalID: string;
  portalRef: React.RefObject<HTMLDivElement>;
  useMenu: (kwargs: ContextMenuProps) => ContextMenuType;
}>({
  portalID: null,
  portalRef: null,
  useMenu: () => null,
});

export const useMenuContext = () => useContext(MenuContext);
