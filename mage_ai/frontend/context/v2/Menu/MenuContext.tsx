import React, { useContext } from 'react';
import { ContextMenuType, ContextMenuProps } from '@mana/hooks/useContextMenu';

export const MenuContext = React.createContext<{
  useMenu: (kwargs: ContextMenuProps) => ContextMenuType;
}>({
  useMenu: () => null,
});

export const useMenuContext = () => useContext(MenuContext);
